(() => {
  'use strict';

  /* ------------------------------------------------------------------ helpers */

  const $ = (sel, root = document) => root.querySelector(sel);

  // Builds elements with textContent only, so nothing from the server is ever parsed as HTML.
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  // The login token lives only for this browser tab. Layout and theme are remembered per browser.
  const store = {
    get token() { try { return sessionStorage.getItem('library_token'); } catch { return null; } },
    set token(v) {
      try { v ? sessionStorage.setItem('library_token', v) : sessionStorage.removeItem('library_token'); } catch { /* ignore */ }
    },
    get layout() { try { return localStorage.getItem('library_layout') === 'list' ? 'list' : 'shelf'; } catch { return 'shelf'; } },
    set layout(v) { try { localStorage.setItem('library_layout', v); } catch { /* ignore */ } },
    get theme() {
      try { const t = localStorage.getItem('library_theme'); return t === 'light' || t === 'dark' ? t : 'system'; } catch { return 'system'; }
    },
    set theme(v) {
      try { v === 'system' ? localStorage.removeItem('library_theme') : localStorage.setItem('library_theme', v); } catch { /* ignore */ }
    },
  };

  function parseToken(token) {
    try {
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const p = JSON.parse(new TextDecoder().decode(bytes));
      return { username: p.sub, roles: Array.isArray(p.roles) ? p.roles : [], exp: p.exp };
    } catch { return null; }
  }

  const SPINE_COLORS = ['#1D5A49', '#2F4B7C', '#8C3B2E', '#6A3F6B', '#8F6212', '#3F6E78', '#55603A', '#7A4A2B'];
  function hash(text) {
    let n = 0;
    for (const ch of String(text)) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
    return n;
  }
  const spineColor = t => SPINE_COLORS[hash(t) % SPINE_COLORS.length];
  const spineHeight = t => 150 + (hash(t + 'h') % 5) * 14;
  const spineWidth = t => 44 + (hash(t + 'w') % 3) * 6;

  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  const fmtTime = d => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  // Dates in the browser's own time zone, as YYYY-MM-DD.
  const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => isoDay(new Date());
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return isoDay(d); };

  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const cmpText = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), undefined, { sensitivity: 'base', numeric: true });
  const byText = get => (a, b) => cmpText(get(a), get(b));

  // Wraps every match of q in <mark>, still as text nodes only.
  function hl(text, q) {
    const s = String(text ?? '');
    if (!q) return s;
    const lower = s.toLowerCase();
    const out = [];
    let i = 0, j;
    while ((j = lower.indexOf(q, i)) !== -1) {
      if (j > i) out.push(s.slice(i, j));
      out.push(h('mark', null, s.slice(j, j + q.length)));
      i = j + q.length;
    }
    if (i < s.length) out.push(s.slice(i));
    return out;
  }

  // ISBN-10 / ISBN-13 check digit test. Only used for a friendly hint, never to block saving.
  function isbnValid(raw) {
    const s = String(raw).replace(/[\s-]/g, '').toUpperCase();
    if (/^\d{9}[\dX]$/.test(s)) {
      let sum = 0;
      for (let i = 0; i < 10; i++) sum += (s[i] === 'X' ? 10 : +s[i]) * (10 - i);
      return sum % 11 === 0;
    }
    if (/^\d{13}$/.test(s)) {
      let sum = 0;
      for (let i = 0; i < 13; i++) sum += +s[i] * (i % 2 ? 3 : 1);
      return sum % 10 === 0;
    }
    return false;
  }

  function passwordLevel(p) {
    if (!p) return [0, 'Use at least 8 characters.'];
    if (p.length < 8) return [1, 'Too short'];
    let score = 0;
    if (p.length >= 12) score++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score <= 1 ? [2, 'Weak'] : score === 2 ? [3, 'Fair'] : [4, 'Strong'];
  }

  function downloadCsv(filename, columns, rows) {
    const cell = (v) => {
      let s = v == null ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;   // stops spreadsheet apps from running it as a formula
      return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [columns.map(c => cell(c[0])), ...rows.map(r => columns.map(c => cell(c[1](r))))];
    const blob = new Blob(['﻿' + lines.map(l => l.join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: filename, hidden: true });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ------------------------------------------------------------------ state + api */

  const VIEWS = {
    desk:    { label: 'Desk', key: '1' },
    books:   { label: 'Books', key: '2' },
    authors: { label: 'Authors', key: '3' },
    members: { label: 'Members', key: '4' },
    users:   { label: 'Users', key: '5', adminOnly: true },
    account: { label: 'Your account', hidden: true },
  };

  const state = {
    user: null,            // { username, roles, exp }
    authMode: 'login',     // 'login' | 'register'
    view: 'desk',
    filter: '',
    status: 'all',         // books: all | free | out, members: all | with | none
    layout: store.layout,  // books: shelf | list
    theme: store.theme,    // system | light | dark
    sort: { books: 'title', authors: 'name', members: 'name', users: 'name' },
    loaded: false,
    loading: false,
    refreshing: false,
    animate: false,        // play the shelf animation once, not on every keystroke
    updatedAt: null,
    next: null,            // { filter, status } to apply on the next route change
    data: { books: [], authors: [], members: [], users: [], me: null },
  };
  const timers = { end: 0, warn: 0 };

  const isAdmin = () => !!state.user && state.user.roles.includes('ROLE_ADMIN');
  const query = () => state.filter.trim().toLowerCase();
  const booksBy = id => state.data.books.filter(b => b.authorId === id).length;
  const outCount = m => (m.borrowedBooks || []).length;
  const isAdminUser = u => (u.roles || []).includes('ROLE_ADMIN');

  class ApiError extends Error {
    constructor(message, status, fieldErrors) {
      super(message);
      this.status = status;
      this.fieldErrors = fieldErrors || null;
    }
  }

  async function api(path, { method = 'GET', body } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (store.token) headers.Authorization = 'Bearer ' + store.token;

    let res;
    try {
      res = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch {
      throw new ApiError('Cannot reach the server. Check that the app is running.', 0);
    }

    if (res.status === 401 && store.token && !path.startsWith('/users/login')) {
      logout('Your session ended. Log in again.');
      throw new ApiError('Session ended', 401);
    }
    if (!res.ok) {
      let data = null;
      try { data = await res.json(); } catch { /* not JSON */ }
      let msg = data?.message || data?.error || `The request failed (${res.status}).`;
      if (res.status === 403) msg = 'Your account is not allowed to do that.';
      throw new ApiError(msg, res.status, data?.fieldErrors);
    }
    return res.status === 204 ? null : res.json();
  }

  function toast(text, isError = false, action = null) {
    const el = h('div', { class: 'toast' + (isError ? ' error' : ''), role: isError ? 'alert' : 'status' },
      h('span', null, text),
      action && h('button', { class: 'toast-action', type: 'button', onclick: () => { el.remove(); action.run(); } }, action.label),
      h('button', { class: 'toast-close', type: 'button', 'aria-label': 'Dismiss', onclick: () => el.remove() }, '×'));
    $('#toasts').append(el);
    setTimeout(() => el.remove(), action ? 9000 : isError ? 7000 : 3500);
  }

  /* ------------------------------------------------------------------ theme */

  const THEMES = ['system', 'light', 'dark'];
  const THEME_LABEL = { system: 'Match system', light: 'Light', dark: 'Dark' };

  function applyTheme(t) {
    state.theme = t;
    store.theme = t;
    if (t === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  }

  function cycleTheme() {
    applyTheme(THEMES[(THEMES.indexOf(state.theme) + 1) % THEMES.length]);
    renderTools();
    if (state.view === 'account') renderMain();
  }

  /* ------------------------------------------------------------------ schema */

  const SCHEMA = {
    books: {
      label: 'Books', singular: 'book', path: '/books',
      fields: [
        { name: 'title', label: 'Title', type: 'text', required: true, max: 200 },
        { name: 'isbn', label: 'ISBN', type: 'text', required: true, max: 20 },
        { name: 'publishedDate', label: 'Published on', type: 'date', required: true },
        { name: 'authorId', label: 'Author', type: 'author', required: true },
      ],
      name: b => b.title,
    },
    authors: {
      label: 'Authors', singular: 'author', path: '/authors',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true, max: 100 },
        { name: 'biography', label: 'Biography', type: 'textarea', required: true, max: 5000 },
        { name: 'dob', label: 'Date of birth', type: 'date', required: false, past: true },
      ],
      name: a => a.name,
    },
    members: {
      label: 'Members', singular: 'member', path: '/members',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true, max: 100 },
        { name: 'email', label: 'Email', type: 'email', required: true, max: 150 },
        { name: 'membershipDate', label: 'Member since', type: 'date', required: true },
      ],
      name: m => m.name,
    },
    users: { label: 'Users', singular: 'user', path: '/users', name: u => u.username },
  };

  const STATUS = {
    books: [['all', 'All', () => true], ['free', 'Available', b => !b.memberId], ['out', 'On loan', b => !!b.memberId]],
    members: [['all', 'All', () => true], ['with', 'Has books', m => outCount(m) > 0], ['none', 'No books', m => outCount(m) === 0]],
  };

  const SORTS = {
    books: {
      title: ['Title, A to Z', (a, b) => cmpText(a.title, b.title)],
      author: ['Author', (a, b) => cmpText(a.authorName, b.authorName) || cmpText(a.title, b.title)],
      newest: ['Newest first', (a, b) => cmpText(b.publishedDate, a.publishedDate)],
      oldest: ['Oldest first', (a, b) => cmpText(a.publishedDate || '9999', b.publishedDate || '9999')],
    },
    authors: {
      name: ['Name, A to Z', (a, b) => cmpText(a.name, b.name)],
      books: ['Most books', (a, b) => booksBy(b.id) - booksBy(a.id) || cmpText(a.name, b.name)],
      born: ['Born earliest', (a, b) => cmpText(a.dob || '9999', b.dob || '9999')],
    },
    members: {
      name: ['Name, A to Z', (a, b) => cmpText(a.name, b.name)],
      books: ['Most books out', (a, b) => outCount(b) - outCount(a) || cmpText(a.name, b.name)],
      joined: ['Newest members', (a, b) => cmpText(b.membershipDate, a.membershipDate)],
    },
    users: {
      name: ['Name, A to Z', (a, b) => cmpText(a.username, b.username)],
      admins: ['Admins first', (a, b) => isAdminUser(b) - isAdminUser(a) || cmpText(a.username, b.username)],
    },
  };

  const HAYSTACK = {
    books: b => [b.title, b.authorName, b.isbn, b.memberName],
    authors: a => [a.name, a.biography],
    members: m => [m.name, m.email, ...(m.borrowedBooks || []).map(b => b.title)],
    users: u => [u.username, u.email],
  };

  const CSV = {
    books: [['Title', b => b.title], ['Author', b => b.authorName], ['ISBN', b => b.isbn], ['Published', b => b.publishedDate],
      ['Status', b => b.memberId ? 'On loan' : 'Available'], ['Borrower', b => b.memberName]],
    authors: [['Name', a => a.name], ['Born', a => a.dob], ['Books', a => booksBy(a.id)], ['Biography', a => a.biography]],
    members: [['Name', m => m.name], ['Email', m => m.email], ['Member since', m => m.membershipDate], ['Books out', outCount],
      ['Titles', m => (m.borrowedBooks || []).map(b => b.title).join('; ')]],
    users: [['Username', u => u.username], ['Email', u => u.email], ['Roles', u => (u.roles || []).join(' ')]],
  };

  /* ------------------------------------------------------------------ loading */

  async function loadAll() {
    const first = !state.loaded;
    if (first) { state.loading = true; renderMain(); }

    const requests = { books: api('/books'), authors: api('/authors'), members: api('/members'), me: api('/users/me') };
    if (isAdmin()) requests.users = api('/users');
    const keys = Object.keys(requests);
    const results = await Promise.allSettled(Object.values(requests));
    if (!state.user) return;   // logged out while waiting

    let failed = null;
    results.forEach((r, i) => {
      const k = keys[i];
      if (r.status === 'fulfilled') state.data[k] = k === 'me' ? r.value : (r.value[k] || []);
      else if (r.reason.status !== 401 && !failed) failed = r.reason;
    });
    if (failed) toast(failed.message, true);

    state.loading = false;
    state.loaded = true;
    state.updatedAt = new Date();
    state.animate = first;
    renderNav();
    renderTools();
    renderMain();
  }

  async function refresh() {
    if (state.refreshing || !state.user) return;
    state.refreshing = true;
    renderTools();
    try { await loadAll(); toast('Catalog refreshed'); } finally { state.refreshing = false; renderTools(); }
  }

  /* ------------------------------------------------------------------ navigation */

  function viewFromHash() {
    const key = (location.hash.match(/^#\/(\w+)/) || [])[1];
    const v = VIEWS[key];
    return v && (!v.adminOnly || isAdmin()) ? key : 'desk';
  }

  // Go to a section, optionally with the search box or a filter already set.
  function go(view, opts = {}) {
    state.next = opts;
    if (location.hash === `#/${view}`) onRoute();
    else location.hash = `#/${view}`;
  }

  function onRoute() {
    if (!state.user) return;
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    state.view = viewFromHash();
    const next = state.next || {};
    state.filter = next.filter || '';
    state.status = next.status || 'all';
    state.next = null;
    state.animate = true;
    renderNav();
    renderMain();
    window.scrollTo(0, 0);
    const main = $('#main');
    if (main) main.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------ session */

  function armSession(exp) {
    clearTimeout(timers.end);
    clearTimeout(timers.warn);
    if (!exp) return;
    const ms = exp * 1000 - Date.now();
    if (ms <= 0) { logout('Your session expired. Log in again.'); return; }
    timers.end = setTimeout(() => logout('Your session expired. Log in again.'), Math.min(ms, 2147483647));
    if (ms > 120000) timers.warn = setTimeout(() => toast('Your session ends in 2 minutes. Finish what you are typing, then log in again.'), ms - 120000);
  }

  function logout(message) {
    clearTimeout(timers.end);
    clearTimeout(timers.warn);
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    store.token = null;
    state.user = null;
    state.loaded = false;
    state.data = { books: [], authors: [], members: [], users: [], me: null };
    state.filter = '';
    state.status = 'all';
    state.view = 'desk';
    state.authMode = 'login';
    if (location.hash) history.replaceState(null, '', location.pathname);
    render();
    if (message) toast(message);
  }

  function startSession(token) {
    const info = parseToken(token);
    if (!info) throw new ApiError('The server sent a token this page cannot read.', 0);
    store.token = token;
    state.user = info;
    state.loaded = false;
    armSession(info.exp);
    state.view = viewFromHash();
    render();
    loadAll();
  }

  /* ------------------------------------------------------------------ form helpers */

  function field(id, label, control, ...extra) {
    return h('div', { class: 'field' }, h('label', { for: id }, label), control, extra);
  }

  function passwordInput(id, autocomplete) {
    const input = h('input', { class: 'input', id, name: id, type: 'password', autocomplete, required: true, maxlength: 72 });
    const toggle = h('button', { class: 'reveal', type: 'button', 'aria-pressed': 'false', 'aria-controls': id, onclick: () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggle.setAttribute('aria-pressed', String(show));
      toggle.textContent = show ? 'Hide' : 'Show';
    } }, 'Show');
    return { wrap: h('div', { class: 'pw' }, input, toggle), input };
  }

  function strengthMeter(input) {
    const text = h('span', { class: 'hint', 'aria-live': 'polite' });
    const el = h('div', { class: 'meter' }, h('span', { class: 'meter-track', 'aria-hidden': 'true' }, h('span', { class: 'meter-bar' })), text);
    const update = () => {
      const [level, label] = passwordLevel(input.value);
      el.dataset.level = level;
      text.textContent = label;
    };
    input.addEventListener('input', update);
    update();
    return el;
  }

  function clearFieldErrors(form) {
    form.querySelectorAll('.field-error').forEach(x => x.remove());
    form.querySelectorAll('[aria-invalid]').forEach(x => { x.removeAttribute('aria-invalid'); x.removeAttribute('aria-describedby'); });
  }

  // Removes a field's error as soon as the person edits it.
  function watchFields(form) {
    form.addEventListener('input', (e) => {
      const f = e.target.closest && e.target.closest('.field');
      if (!f) return;
      f.querySelectorAll('.field-error').forEach(x => x.remove());
      e.target.removeAttribute('aria-invalid');
    });
    return form;
  }

  function fieldError(form, name, msg) {
    const el = form.elements[name];
    if (!(el instanceof HTMLElement)) return false;
    const f = el.closest('.field');
    if (!f) return false;
    const id = `${el.id || name}-error`;
    el.setAttribute('aria-invalid', 'true');
    el.setAttribute('aria-describedby', id);
    f.append(h('span', { class: 'field-error', id }, msg));
    return true;
  }

  // Shows server (or local) errors: next to each field where possible, the rest in the box on top.
  function showErrors(box, err, form) {
    if (form) clearFieldErrors(form);
    let fieldErrors = err.fieldErrors;
    // A 409 names the clashing value in its message ("...this ISBN already exists"). Point at that field.
    if (!fieldErrors && err.status === 409 && form) {
      const clash = ['isbn', 'email', 'username'].find(n => form.elements[n] && err.message.toLowerCase().includes(n));
      if (clash) fieldErrors = { [clash]: err.message };
    }
    const rest = [];
    let placed = 0;
    for (const [name, msg] of Object.entries(fieldErrors || {})) {
      if (form && fieldError(form, name, msg)) placed++;
      else rest.push(msg);
    }
    box.replaceChildren(placed ? 'Check the fields marked below.' : (err.message || 'Something went wrong.'));
    if (rest.length) box.append(h('ul', null, rest.map(t => h('li', null, t))));
    box.hidden = false;
    const bad = form && form.querySelector('[aria-invalid="true"]');
    if (bad) bad.focus();
    else box.scrollIntoView({ block: 'nearest' });
  }

  const errorBoxEl = () => h('div', { class: 'form-error', role: 'alert', hidden: true });
  const cancelBtn = dlg => h('button', { class: 'btn', type: 'button', onclick: () => dlg().close() }, 'Cancel');

  function busy(btn, on, label) {
    btn.disabled = on;
    if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || 'Working...'; }
    else if (btn.dataset.label) btn.textContent = btn.dataset.label;
  }

  /* ------------------------------------------------------------------ auth */

  function authView() {
    const register = state.authMode === 'register';
    const errorBox = errorBoxEl();
    const pw = passwordInput('password', register ? 'new-password' : 'current-password');
    const pw2 = register && passwordInput('password2', 'new-password');
    const submit = h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, register ? 'Create account' : 'Log in');

    const form = watchFields(h('form', { novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      clearFieldErrors(form);
      const username = form.elements.username.value.trim();
      const password = pw.input.value;
      const email = register ? form.elements.email.value.trim() : '';

      const local = {};
      if (!username) local.username = 'Enter your username.';
      if (register && !email) local.email = 'Enter your email.';
      else if (register && !form.elements.email.checkValidity()) local.email = 'This does not look like an email address.';
      if (!password) local.password = 'Enter your password.';
      else if (register && password.length < 8) local.password = 'Use at least 8 characters.';
      if (register && password && password !== pw2.input.value) local.password2 = 'The two passwords do not match.';
      if (Object.keys(local).length) { showErrors(errorBox, new ApiError('', 0, local), form); return; }

      busy(submit, true, register ? 'Creating account...' : 'Logging in...');
      try {
        if (register) await api('/users/register', { method: 'POST', body: { username, password, email } });
        const res = await api('/users/login', { method: 'POST', body: { username, password } });
        startSession(res.token);
        if (register) toast(`Welcome, ${username}. Your account is ready.`);
      } catch (err) {
        if (err.status === 401 && !register) err = new ApiError('Wrong username or password.', 401);
        showErrors(errorBox, err, form);
        busy(submit, false);
      }
    } },
      errorBox,
      field('username', 'Username',
        h('input', { class: 'input', id: 'username', name: 'username', autocomplete: 'username', required: true, maxlength: 50, autocapitalize: 'none', spellcheck: 'false' }),
        register && h('span', { class: 'hint' }, 'Letters, digits, dots, dashes and underscores.')),
      register && field('email', 'Email', h('input', { class: 'input', id: 'email', name: 'email', type: 'email', autocomplete: 'email', required: true, maxlength: 150 })),
      field('password', 'Password', pw.wrap, register && strengthMeter(pw.input)),
      register && field('password2', 'Repeat password', pw2.wrap),
      submit));

    const heights = [62, 88, 74, 100, 68, 92, 80, 58, 96, 72, 84];
    const spines = heights.map((p, i) =>
      h('span', { style: `background:${SPINE_COLORS[i % SPINE_COLORS.length]};height:${p}%;--i:${i}` }));

    return h('div', { class: 'auth' },
      h('div', { class: 'auth-art' },
        h('div', null,
          h('div', { class: 'brand' }, 'Library desk'),
          h('p', { class: 'tagline' }, 'Books, authors and members in one place.'),
          h('ul', { class: 'perks' },
            h('li', null, 'See what is on the shelf and who has the rest'),
            h('li', null, 'Lend and take back books in two clicks'),
            h('li', null, 'Search, sort and export the whole catalog'))),
        h('div', { class: 'auth-shelf', 'aria-hidden': 'true' }, h('div', { class: 'spines' }, spines), h('div', { class: 'plank' }))),
      h('div', { class: 'auth-form-wrap' },
        h('div', { class: 'auth-card' },
          h('h1', null, register ? 'Create your account' : 'Welcome back'),
          h('p', { class: 'lead' }, register ? 'New accounts can browse the whole catalog.' : 'Log in with your library account.'),
          form,
          h('p', { class: 'switch' }, register ? 'Already have an account? ' : 'No account yet? ',
            h('button', { class: 'btn-link', type: 'button', onclick: () => { state.authMode = register ? 'login' : 'register'; render(); } },
              register ? 'Log in' : 'Create one')))));
  }

  /* ------------------------------------------------------------------ shell */

  function appView() {
    return h('div', { class: 'shell' },
      h('header', { class: 'rail' },
        h('a', { class: 'brand', href: '#/desk' }, 'Library desk'),
        h('nav', { class: 'nav', id: 'nav', 'aria-label': 'Sections' }),
        h('div', { class: 'rail-tools', id: 'tools' }),
        h('div', { class: 'who' },
          h('a', { class: 'who-name', href: '#/account', title: 'Your account' }, state.user.username),
          h('span', { class: 'role' }, isAdmin() ? 'Admin' : 'Reader'),
          state.user.exp && h('span', { class: 'role session' }, 'Signed in until ' + fmtTime(new Date(state.user.exp * 1000))),
          h('div', null, h('button', { class: 'btn-link', type: 'button', onclick: () => logout('You are logged out.') }, 'Log out')))),
      h('main', { class: 'main', id: 'main', tabindex: '-1' }),
      h('nav', { class: 'tabbar', id: 'tabbar', 'aria-label': 'Sections' }));
  }

  function renderNav() {
    const keys = Object.keys(VIEWS).filter(k => !VIEWS[k].hidden && (!VIEWS[k].adminOnly || isAdmin()));
    const link = (k, withCount) => h('a', { href: `#/${k}`, 'aria-current': state.view === k ? 'page' : null, title: `${VIEWS[k].label} (press ${VIEWS[k].key})` },
      h('span', null, VIEWS[k].label),
      withCount && k !== 'desk' && h('span', { class: 'count' }, (state.data[k] || []).length));
    const nav = $('#nav'), tabs = $('#tabbar');
    if (nav) nav.replaceChildren(...keys.map(k => link(k, true)));
    if (tabs) tabs.replaceChildren(...keys.map(k => link(k, false)), h('a', { href: '#/account', 'aria-current': state.view === 'account' ? 'page' : null }, 'You'));
  }

  function renderTools() {
    const box = $('#tools');
    if (!box) return;
    box.replaceChildren(
      h('button', { class: 'tool', type: 'button', onclick: refresh, disabled: state.refreshing, title: 'Load everything again from the server (press R)' },
        state.refreshing ? 'Refreshing...' : 'Refresh',
        state.updatedAt && h('span', { class: 'tool-sub' }, 'Updated ' + fmtTime(state.updatedAt))),
      h('button', { class: 'tool', type: 'button', onclick: cycleTheme, title: 'Change the colour theme' },
        'Theme', h('span', { class: 'tool-sub' }, THEME_LABEL[state.theme])),
      h('button', { class: 'tool', type: 'button', onclick: openHelp, title: 'Keyboard shortcuts (press ?)' },
        'Shortcuts', h('span', { class: 'tool-sub' }, 'Press ?')));
  }

  function renderMain() {
    const main = $('#main');
    if (!main || !state.user) return;
    document.title = `${VIEWS[state.view].label} - Library desk`;

    if (state.loading) { main.replaceChildren(skeleton()); return; }
    const builders = { desk: deskView, books: booksView, authors: listView, members: listView, users: listView, account: accountView };
    main.replaceChildren(...builders[state.view](state.view).filter(Boolean));
    if (['books', 'authors', 'members', 'users'].includes(state.view)) renderList();
  }

  function skeleton() {
    return h('div', { class: 'skeleton', role: 'status', 'aria-label': 'Loading the catalog' },
      h('div', { class: 'sk sk-title' }),
      h('div', { class: 'stats' }, [1, 2, 3, 4].map(() => h('div', { class: 'sk sk-card' }))),
      [1, 2, 3, 4, 5].map(() => h('div', { class: 'sk sk-row' })));
  }

  function head(title, sub, ...actions) {
    return h('div', { class: 'main-head' },
      h('div', null, h('h1', null, title), sub && h('p', null, sub)),
      actions.some(Boolean) && h('div', { class: 'head-actions' }, actions));
  }

  const addButton = (kind, primary = true) =>
    isAdmin() && h('button', { class: 'btn' + (primary ? ' btn-primary' : ''), type: 'button', title: primary ? 'Shortcut: N' : null,
      onclick: () => kind === 'users' ? openUserForm() : openForm(kind) }, `Add ${SCHEMA[kind].singular}`);

  const readOnlyNote = what => isAdmin() ? null : `You can browse ${what}. Only admins can make changes.`;

  /* ------------------------------------------------------------------ desk */

  function greeting() {
    const hr = new Date().getHours();
    return `${hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'}, ${state.user.username}.`;
  }

  function deskView() {
    const { books, authors, members, users } = state.data;
    const out = books.filter(b => b.memberId);
    const holders = new Set(out.map(b => b.memberId)).size;
    const pct = books.length ? Math.round(out.length / books.length * 100) : 0;

    const stat = (label, value, sub, onclick, tone) =>
      h('button', { class: 'stat' + (tone ? ' stat-' + tone : ''), type: 'button', onclick },
        h('span', { class: 'stat-value' }, value), h('span', { class: 'stat-label' }, label), sub && h('span', { class: 'stat-sub' }, sub));

    const stats = h('div', { class: 'stats' },
      stat('Books', books.length, plural(authors.length, 'author', 'authors'), () => go('books')),
      stat('On the shelf', books.length - out.length, 'ready to lend', () => go('books', { status: 'free' }), 'free'),
      stat('On loan', out.length, `${pct}% of the catalog`, () => go('books', { status: 'out' }), 'out'),
      stat('Members', members.length, `${holders} holding books`, () => go('members')),
      isAdmin() && stat('Accounts', users.length, plural(users.filter(isAdminUser).length, 'admin', 'admins'), () => go('users')));

    const usage = books.length > 0 && h('div', { class: 'usage-wrap' },
      h('div', { class: 'usage', role: 'img', 'aria-label': `${out.length} of ${books.length} books are on loan` },
        h('span', { style: `width:${pct}%` })),
      h('div', { class: 'usage-legend' }, h('span', { class: 'dot dot-out' }), `On loan ${out.length}`,
        h('span', { class: 'dot dot-free' }), `On the shelf ${books.length - out.length}`));

    const loans = out.slice().sort(byText(b => b.memberName || ''));
    const shown = loans.slice(0, 8);
    const loansSection = h('section', { class: 'panel' },
      h('div', { class: 'panel-head' }, h('h2', null, 'Out on loan'),
        loans.length > 0 && h('button', { class: 'btn-link', type: 'button', onclick: () => go('books', { status: 'out' }) }, 'See all')),
      loans.length
        ? [h('ul', { class: 'rows rows-flat' }, shown.map(loanRow)),
           loans.length > shown.length && h('p', { class: 'hint pad' }, `Showing ${shown.length} of ${loans.length}.`)]
        : h('div', { class: 'empty' }, h('strong', null, 'Nothing is on loan'),
            isAdmin() ? 'Open a book and choose "Lend this book" to start a loan.' : 'Every book is on the shelf.'));

    const readers = members.filter(m => outCount(m) > 0).sort(SORTS.members.books[1]).slice(0, 5);
    const shelves = authors.map(a => ({ a, n: booksBy(a.id) })).filter(x => x.n > 0).sort((x, y) => y.n - x.n || cmpText(x.a.name, y.a.name)).slice(0, 5);
    const maxShelf = shelves.length ? shelves[0].n : 1;

    const side = h('div', { class: 'desk-side' },
      h('section', { class: 'panel' },
        h('div', { class: 'panel-head' }, h('h2', null, 'Busiest readers')),
        readers.length
          ? h('ol', { class: 'mini-list' }, readers.map(m => h('li', null,
              h('span', { class: 'mono mono-sm', style: `--c:${spineColor(m.name)}`, 'aria-hidden': 'true' }, initials(m.name)),
              h('button', { class: 'link-plain', type: 'button', onclick: () => openMember(m) }, m.name),
              h('span', { class: 'mini-n' }, plural(outCount(m), 'book', 'books')))))
          : h('p', { class: 'hint pad' }, 'No member has a book right now.')),
      h('section', { class: 'panel' },
        h('div', { class: 'panel-head' }, h('h2', null, 'Biggest shelves')),
        shelves.length
          ? h('ol', { class: 'mini-list' }, shelves.map(({ a, n }) => h('li', null,
              h('button', { class: 'link-plain', type: 'button', onclick: () => openAuthor(a) }, a.name),
              h('span', { class: 'mini-bar', 'aria-hidden': 'true' }, h('span', { style: `width:${Math.round(n / maxShelf * 100)}%;--c:${spineColor(a.name)}` })),
              h('span', { class: 'mini-n' }, n))))
          : h('p', { class: 'hint pad' }, 'No books yet.')));

    return [
      head('Desk', greeting(),
        isAdmin() && h('button', { class: 'btn btn-primary', type: 'button', onclick: () => openLend(), title: 'Shortcut: L' }, 'Lend a book'),
        addButton('books', false), addButton('authors', false), addButton('members', false)),
      stats,
      usage,
      h('div', { class: 'desk-grid' }, loansSection, side),
    ];
  }

  function loanRow(b) {
    return h('li', { class: 'row' },
      h('span', { class: 'mark', style: `--c:${spineColor(b.title)}` }),
      h('div', null,
        h('div', { class: 'title' }, h('button', { type: 'button', onclick: () => openBook(b) }, b.title)),
        h('div', { class: 'meta' }, h('span', null, 'by ' + (b.authorName || 'unknown author')),
          h('span', { class: 'tag tag-out' }, 'With ' + (b.memberName || 'a member')))),
      h('div', { class: 'side-col' },
        isAdmin() && h('button', { class: 'btn btn-small', type: 'button', onclick: () => giveBack(b) }, 'Mark returned')));
  }

  /* ------------------------------------------------------------------ list views */

  function toolbar(view) {
    const parts = [searchBox(`Search ${VIEWS[view].label.toLowerCase()}`)];
    if (STATUS[view]) {
      parts.push(h('div', { class: 'chips', role: 'group', 'aria-label': 'Show' }, STATUS[view].map(([key, label, test]) =>
        h('button', { class: 'chip', type: 'button', 'aria-pressed': String(state.status === key),
          onclick: () => { state.status = key; renderMain(); } },
          label, h('span', { class: 'n' }, state.data[view].filter(test).length)))));
    }
    parts.push(h('label', { class: 'sort' }, h('span', null, 'Sort'),
      h('select', { class: 'input input-small', onchange: (e) => { state.sort[view] = e.target.value; state.animate = true; renderList(); } },
        Object.entries(SORTS[view]).map(([k, [label]]) => h('option', { value: k, selected: state.sort[view] === k }, label)))));
    if (view === 'books') {
      const layoutBtn = (key, label) => h('button', { type: 'button', 'aria-pressed': String(state.layout === key),
        onclick: () => { state.layout = key; store.layout = key; state.animate = true; renderMain(); } }, label);
      parts.push(h('div', { class: 'seg', role: 'group', 'aria-label': 'Layout' }, layoutBtn('shelf', 'Shelves'), layoutBtn('list', 'List')));
    }
    parts.push(h('button', { class: 'btn btn-small', type: 'button', title: 'Download the rows you see as a spreadsheet file',
      onclick: () => exportCsv(view) }, 'Export CSV'));
    return [h('div', { class: 'toolbar' }, parts), h('p', { class: 'result-count', id: 'count', 'aria-live': 'polite' })];
  }

  function searchBox(label) {
    return h('div', { class: 'search' },
      h('input', { class: 'input', id: 'search', type: 'search', 'aria-label': label, placeholder: label, autocomplete: 'off',
        value: state.filter,
        oninput: (e) => { state.filter = e.target.value; renderList(); },
        onkeydown: (e) => { if (e.key === 'Escape' && e.target.value) { e.preventDefault(); e.target.value = ''; state.filter = ''; renderList(); } } }),
      h('kbd', { class: 'search-key', 'aria-hidden': 'true' }, '/'));
  }

  function booksView() {
    return [
      head('Books', readOnlyNote('the catalog'), isAdmin() && h('button', { class: 'btn', type: 'button', onclick: () => openLend() }, 'Lend a book'), addButton('books')),
      ...toolbar('books'),
      h('div', { id: 'list' }),
    ];
  }

  function listView(view) {
    const sub = view === 'users' ? 'Accounts that can log in. Accounts you add here can be given the admin role.' : readOnlyNote(view);
    return [head(VIEWS[view].label, sub, addButton(view)), ...toolbar(view), h('div', { id: 'list' })];
  }

  function visibleItems(view) {
    const q = query();
    const status = (STATUS[view] || []).find(s => s[0] === state.status);
    const items = state.data[view].filter(it => (!status || status[2](it)) &&
      (!q || HAYSTACK[view](it).some(v => v != null && String(v).toLowerCase().includes(q))));
    const sort = SORTS[view][state.sort[view]] || Object.values(SORTS[view])[0];
    return items.sort(sort[1]);
  }

  function exportCsv(view) {
    const items = visibleItems(view);
    if (!items.length) { toast('There is nothing to export with these filters.', true); return; }
    downloadCsv(`${view}-${today()}.csv`, CSV[view], items);
    toast(`Exported ${plural(items.length, 'row', 'rows')}`);
  }

  function renderList() {
    const box = $('#list');
    if (!box) return;
    const view = state.view;
    const animate = state.animate;
    state.animate = false;

    const q = query();
    const items = visibleItems(view);
    const total = state.data[view].length;
    const what = VIEWS[view].label.toLowerCase();
    const count = $('#count');
    if (count) count.textContent = items.length === total ? plural(total, SCHEMA[view].singular, what) : `Showing ${items.length} of ${total} ${what}`;

    if (!items.length) {
      const filtered = q || state.status !== 'all';
      let line = isAdmin() ? `Use "Add ${SCHEMA[view].singular}" to create the first one.` : 'An admin can add the first one.';
      if (filtered) line = q ? `Nothing matches "${state.filter.trim()}".` : 'Nothing fits this filter right now.';
      box.replaceChildren(h('div', { class: 'empty' },
        h('strong', null, filtered ? `No ${what} found` : `No ${what} yet`), line,
        filtered && h('div', { class: 'empty-actions' }, h('button', { class: 'btn btn-small', type: 'button',
          onclick: () => { state.filter = ''; state.status = 'all'; renderMain(); } }, 'Clear filters'))));
      return;
    }

    if (view === 'books' && state.layout === 'shelf') { box.replaceChildren(shelfList(items, animate)); return; }
    const ROW = { books: bookRow, authors: authorRow, members: memberRow, users: userRow };
    box.replaceChildren(h('ul', { class: 'rows' + (animate ? ' enter' : '') }, items.map((it, i) => {
      const li = ROW[view](it, q);
      li.style.setProperty('--i', Math.min(i, 20));
      return li;
    })));
  }

  /* ------------------------------------------------------------------ rows */

  function spine(b, i) {
    const out = !!b.memberId;
    return h('button', {
      class: 'spine' + (out ? ' out' : ''), type: 'button',
      style: `--c:${spineColor(b.title)};--w:${spineWidth(b.title)}px;--h:${spineHeight(b.title)}px;--i:${Math.min(i, 24)}`,
      'aria-label': `${b.title}, by ${b.authorName || 'unknown author'}, ${out ? 'on loan to ' + (b.memberName || 'a member') : 'available'}`,
      title: out ? `${b.title} (on loan to ${b.memberName || 'a member'})` : b.title,
      onclick: () => openBook(b),
    },
      h('span', { class: 'spine-title' }, b.title),
      out ? h('span', { class: 'spine-stamp', 'aria-hidden': 'true' }, initials(b.memberName)) : h('span', { class: 'spine-end' }));
  }

  // One shelf per author. Books keep the order chosen in "Sort".
  function shelfList(items, animate) {
    const groups = new Map();
    for (const b of items) {
      if (!groups.has(b.authorId)) groups.set(b.authorId, { id: b.authorId, name: b.authorName || 'Unknown author', books: [] });
      groups.get(b.authorId).books.push(b);
    }
    let i = 0;
    return h('div', { class: 'shelves' + (animate ? ' enter' : '') },
      [...groups.values()].sort(byText(g => g.name)).map(g => {
        const author = state.data.authors.find(a => a.id === g.id);
        return h('section', { class: 'shelf', 'aria-label': 'Books by ' + g.name },
          h('div', { class: 'shelf-books' }, g.books.map(b => spine(b, i++))),
          h('div', { class: 'plank' },
            author ? h('button', { class: 'plank-link', type: 'button', onclick: () => openAuthor(author) }, g.name) : h('span', null, g.name),
            h('span', null, plural(g.books.length, 'book', 'books'))));
      }));
  }

  function bookRow(b, q) {
    const out = !!b.memberId;
    return h('li', { class: 'row' },
      h('span', { class: 'mark', style: `--c:${spineColor(b.title)}` }),
      h('div', null,
        h('div', { class: 'title' }, h('button', { type: 'button', onclick: () => openBook(b) }, hl(b.title, q))),
        h('div', { class: 'meta' },
          h('span', null, 'by ', hl(b.authorName || 'unknown author', q)),
          h('span', null, 'ISBN ', hl(b.isbn, q)),
          b.publishedDate && h('span', null, 'Published ' + fmtDate(b.publishedDate)))),
      h('div', { class: 'side-col' },
        out ? h('span', { class: 'tag tag-out' }, 'With ', hl(b.memberName || 'a member', q)) : h('span', { class: 'tag tag-free' }, 'Available'),
        isAdmin() && (out
          ? h('button', { class: 'btn btn-small', type: 'button', onclick: () => giveBack(b) }, 'Return')
          : h('button', { class: 'btn btn-small', type: 'button', onclick: () => openLend({ book: b }) }, 'Lend')),
        isAdmin() && h('button', { class: 'btn-link', type: 'button', onclick: () => openForm('books', b) }, 'Edit')));
  }

  function authorRow(a, q) {
    const mine = state.data.books.filter(b => b.authorId === a.id).sort(byText(b => b.title));
    return h('li', { class: 'row' },
      h('span', { class: 'mono', style: `--c:${spineColor(a.name)}`, 'aria-hidden': 'true' }, initials(a.name)),
      h('div', null,
        h('div', { class: 'title' }, h('button', { type: 'button', onclick: () => openAuthor(a) }, hl(a.name, q))),
        a.dob && h('div', { class: 'meta' }, h('span', null, 'Born ' + fmtDate(a.dob))),
        h('div', { class: 'bio' }, hl(a.biography, q)),
        mine.length > 0 && h('div', { class: 'pills' }, mine.map(b =>
          h('button', { class: 'pill' + (b.memberId ? ' pill-out' : ''), type: 'button', title: b.memberId ? 'On loan' : 'Available', onclick: () => openBook(b) }, b.title)))),
      h('div', { class: 'side-col' },
        h('span', { class: 'tag tag-plain' }, plural(mine.length, 'book', 'books')),
        isAdmin() && h('button', { class: 'btn-link', type: 'button', onclick: () => openForm('authors', a) }, 'Edit'),
        isAdmin() && h('button', { class: 'btn-link danger', type: 'button', onclick: () => confirmDelete('authors', a) }, 'Delete')));
  }

  function memberRow(m, q) {
    const have = m.borrowedBooks || [];
    return h('li', { class: 'row' },
      h('span', { class: 'mono', style: `--c:${spineColor(m.name)}`, 'aria-hidden': 'true' }, initials(m.name)),
      h('div', null,
        h('div', { class: 'title' }, h('button', { type: 'button', onclick: () => openMember(m) }, hl(m.name, q))),
        h('div', { class: 'meta' }, h('span', null, hl(m.email, q)), m.membershipDate && h('span', null, 'Member since ' + fmtDate(m.membershipDate))),
        have.length > 0 && h('div', { class: 'pills' }, have.map(x =>
          h('button', { class: 'pill pill-out', type: 'button', title: 'Open this book', onclick: () => openBook(fullBook(x, m)) }, hl(x.title, q))))),
      h('div', { class: 'side-col' },
        h('span', { class: have.length ? 'tag tag-out' : 'tag tag-plain' }, have.length ? plural(have.length, 'book out', 'books out') : 'No books out'),
        isAdmin() && h('button', { class: 'btn btn-small', type: 'button', onclick: () => openLend({ member: m }) }, 'Lend a book'),
        isAdmin() && h('button', { class: 'btn-link', type: 'button', onclick: () => openForm('members', m) }, 'Edit'),
        isAdmin() && h('button', { class: 'btn-link danger', type: 'button', onclick: () => confirmDelete('members', m) }, 'Delete')));
  }

  function userRow(u, q) {
    const me = u.username === state.user.username;
    return h('li', { class: 'row' },
      h('span', { class: 'mono', style: `--c:${spineColor(u.username)}`, 'aria-hidden': 'true' }, initials(u.username)),
      h('div', null,
        h('div', { class: 'title' }, hl(u.username, q), me && h('span', { class: 'you' }, 'you')),
        h('div', { class: 'meta' }, h('span', null, hl(u.email, q)))),
      h('div', { class: 'side-col' },
        (u.roles || []).slice().sort().map(r => h('span', { class: r === 'ROLE_ADMIN' ? 'tag tag-out' : 'tag tag-plain' }, r === 'ROLE_ADMIN' ? 'Admin' : 'Reader')),
        h('button', { class: 'btn-link', type: 'button', onclick: () => me ? go('account') : openUserForm(u) }, me ? 'Your account' : 'Edit'),
        !me && h('button', { class: 'btn-link danger', type: 'button', onclick: () => confirmDelete('users', u) }, 'Delete')));
  }

  // A member's borrowed book only has id, title and isbn. Use the full book when we have it.
  const fullBook = (x, m) => state.data.books.find(b => b.id === x.id) || { ...x, memberId: m.id, memberName: m.name };

  /* ------------------------------------------------------------------ dialogs */

  function openDialog(content, cls) {
    const opener = document.activeElement;
    const dlg = h('dialog', { class: cls || null }, h('div', { class: 'dialog-body' }, content));
    dlg.addEventListener('close', () => {
      dlg.remove();
      if (opener && opener.isConnected && !document.querySelector('dialog[open]')) opener.focus();
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });   // click on the dim area closes it
    document.body.append(dlg);
    dlg.showModal();
    return dlg;
  }

  // Close this dialog, then run the next step (often opening another dialog).
  const then = (dlg, fn) => () => { dlg.close(); fn(); };

  function factRow(label, value) { return [h('dt', null, label), h('dd', null, value)]; }

  function openBook(b) {
    const out = !!b.memberId;
    const author = state.data.authors.find(a => a.id === b.authorId);
    const member = out && state.data.members.find(m => m.id === b.memberId);
    const others = state.data.books.filter(x => x.authorId === b.authorId && x.id !== b.id).sort(byText(x => x.title));

    let dlg;
    const del = isAdmin() && h('button', { class: 'btn btn-quiet-danger', type: 'button', disabled: out,
      title: out ? 'Return the book before deleting it' : null, onclick: () => then(dlg, () => confirmDelete('books', b))() }, 'Delete');

    dlg = openDialog([
      h('div', { class: 'band', style: `--c:${spineColor(b.title)}` }),
      h('h2', null, b.title),
      h('p', { class: 'byline' }, 'by ',
        author ? h('button', { class: 'btn-link', type: 'button', onclick: () => then(dlg, () => openAuthor(author))() }, author.name)
               : (b.authorName || 'unknown author')),
      h('dl', { class: 'facts' },
        factRow('ISBN', b.isbn),
        b.publishedDate && factRow('Published', fmtDate(b.publishedDate)),
        factRow('Status', out
          ? h('span', null, h('span', { class: 'tag tag-out' }, 'On loan'), ' to ',
              member ? h('button', { class: 'btn-link', type: 'button', onclick: () => then(dlg, () => openMember(member))() }, member.name)
                     : (b.memberName || 'a member'))
          : h('span', { class: 'tag tag-free' }, 'Available'))),
      others.length > 0 && h('div', { class: 'more' },
        h('h3', { class: 'mini-title' }, `More by ${b.authorName || 'this author'}`),
        h('div', { class: 'pills' }, others.map(x => h('button', { class: 'pill' + (x.memberId ? ' pill-out' : ''), type: 'button',
          onclick: () => then(dlg, () => openBook(x))() }, x.title)))),
      isAdmin()
        ? [out && h('p', { class: 'dialog-note' }, 'A book on loan cannot be deleted until it is returned.'),
           h('div', { class: 'dialog-actions' },
             del,
             h('button', { class: 'btn', type: 'button', onclick: () => then(dlg, () => openForm('books', b))() }, 'Edit'),
             out ? h('button', { class: 'btn btn-primary', type: 'button', onclick: async (e) => { busy(e.target, true); if (await giveBack(b)) dlg.close(); else busy(e.target, false); } }, 'Mark as returned')
                 : h('button', { class: 'btn btn-primary', type: 'button', onclick: () => then(dlg, () => openLend({ book: b }))() }, 'Lend this book'))]
        : [h('p', { class: 'dialog-note' }, out ? 'This book is out on loan right now.' : 'Ask a librarian at the desk to borrow this book.'),
           h('div', { class: 'dialog-actions' }, h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'Close'))],
    ], 'dialog-wide');
  }

  function openAuthor(a) {
    const mine = state.data.books.filter(b => b.authorId === a.id).sort(byText(b => b.title));
    const out = mine.filter(b => b.memberId).length;
    let dlg;
    dlg = openDialog([
      h('div', { class: 'band', style: `--c:${spineColor(a.name)}` }),
      h('h2', null, a.name),
      h('p', { class: 'byline' }, [a.dob && 'Born ' + fmtDate(a.dob), plural(mine.length, 'book', 'books') + ' in the catalog', out && `${out} on loan`].filter(Boolean).join('  ·  ')),
      h('p', { class: 'bio-full' }, a.biography),
      h('h3', { class: 'mini-title' }, 'Books'),
      mine.length
        ? h('ul', { class: 'rows rows-compact' }, mine.map(b => h('li', { class: 'row' },
            h('span', { class: 'mark', style: `--c:${spineColor(b.title)}` }),
            h('div', null, h('div', { class: 'title' }, h('button', { type: 'button', onclick: () => then(dlg, () => openBook(b))() }, b.title)),
              b.publishedDate && h('div', { class: 'meta' }, fmtDate(b.publishedDate))),
            h('div', { class: 'side-col' }, b.memberId ? h('span', { class: 'tag tag-out' }, 'On loan') : h('span', { class: 'tag tag-free' }, 'Available')))))
        : h('p', { class: 'hint' }, 'No books by this author yet.'),
      isAdmin()
        ? [mine.length > 0 && h('p', { class: 'dialog-note' }, 'An author with books cannot be deleted. Delete or move the books first.'),
           h('div', { class: 'dialog-actions' },
             h('button', { class: 'btn btn-quiet-danger', type: 'button', disabled: mine.length > 0, onclick: () => then(dlg, () => confirmDelete('authors', a))() }, 'Delete'),
             h('button', { class: 'btn', type: 'button', onclick: () => then(dlg, () => openForm('authors', a))() }, 'Edit'),
             h('button', { class: 'btn btn-primary', type: 'button', onclick: () => then(dlg, () => openForm('books', null, { authorId: a.id }))() }, 'Add a book by this author'))]
        : h('div', { class: 'dialog-actions' }, h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'Close')),
    ], 'dialog-wide');
  }

  function openMember(m) {
    const have = (m.borrowedBooks || []).map(x => fullBook(x, m)).sort(byText(b => b.title));
    let dlg;
    dlg = openDialog([
      h('div', { class: 'band', style: `--c:${spineColor(m.name)}` }),
      h('h2', null, m.name),
      h('dl', { class: 'facts' },
        factRow('Email', h('a', { href: 'mailto:' + m.email }, m.email)),
        m.membershipDate && factRow('Member since', fmtDate(m.membershipDate)),
        factRow('Books out', String(have.length))),
      have.length > 0 && [h('h3', { class: 'mini-title' }, 'Has these books'),
        h('ul', { class: 'rows rows-compact' }, have.map(b => h('li', { class: 'row' },
          h('span', { class: 'mark', style: `--c:${spineColor(b.title)}` }),
          h('div', null, h('div', { class: 'title' }, h('button', { type: 'button', onclick: () => then(dlg, () => openBook(b))() }, b.title)),
            b.authorName && h('div', { class: 'meta' }, 'by ' + b.authorName)),
          h('div', { class: 'side-col' }, isAdmin() && h('button', { class: 'btn btn-small', type: 'button',
            onclick: async (e) => { busy(e.target, true); if (await giveBack(b)) dlg.close(); else busy(e.target, false); } }, 'Return')))))],
      isAdmin()
        ? [have.length > 0 && h('p', { class: 'dialog-note' }, 'A member who still has books cannot be deleted.'),
           h('div', { class: 'dialog-actions' },
             h('button', { class: 'btn btn-quiet-danger', type: 'button', disabled: have.length > 0, onclick: () => then(dlg, () => confirmDelete('members', m))() }, 'Delete'),
             h('button', { class: 'btn', type: 'button', onclick: () => then(dlg, () => openForm('members', m))() }, 'Edit'),
             h('button', { class: 'btn btn-primary', type: 'button', onclick: () => then(dlg, () => openLend({ member: m }))() }, 'Lend a book'))]
        : h('div', { class: 'dialog-actions' }, h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'Close')),
    ], 'dialog-wide');
  }

  // Lend: pick the book, the member, or both.
  function openLend({ book = null, member = null } = {}) {
    const free = state.data.books.filter(b => !b.memberId).sort(byText(b => b.title));
    const members = state.data.members.slice().sort(byText(m => m.name));
    const errorBox = errorBoxEl();

    const bookSel = !book && h('select', { class: 'input', id: 'lend-book', name: 'book', required: true },
      h('option', { value: '' }, free.length ? 'Choose a book' : 'No book is available'),
      free.map(b => h('option', { value: b.id }, `${b.title} - ${b.authorName || 'unknown author'}`)));
    const memberSel = !member && h('select', { class: 'input', id: 'lend-member', name: 'member', required: true },
      h('option', { value: '' }, members.length ? 'Choose a member' : 'No members yet'),
      members.map(m => h('option', { value: m.id }, `${m.name} (${m.email})${outCount(m) ? ' - has ' + outCount(m) : ''}`)));

    const blocked = !book && !free.length ? 'Every book is already on loan.'
      : !member && !members.length ? 'Add a member first. A book can only be lent to a member.' : null;
    const submit = h('button', { class: 'btn btn-primary', type: 'submit', disabled: !!blocked }, 'Lend book');

    let dlg;
    const form = watchFields(h('form', { novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      const b = book || free.find(x => String(x.id) === bookSel.value);
      const m = member || members.find(x => String(x.id) === memberSel.value);
      const local = {};
      if (!b) local.book = 'Choose a book.';
      if (!m) local.member = 'Choose a member.';
      if (!b || !m) { showErrors(errorBox, new ApiError('', 0, local), form); return; }
      busy(submit, true, 'Lending...');
      try { await lend(b, m); dlg.close(); } catch (err) { showErrors(errorBox, err, form); busy(submit, false); }
    } },
      blocked && h('div', { class: 'form-error' }, blocked),
      errorBox,
      book ? h('dl', { class: 'facts' }, factRow('Book', book.title), factRow('Author', book.authorName || 'unknown')) : field('lend-book', 'Book', bookSel),
      member ? h('dl', { class: 'facts' }, factRow('Member', member.name), factRow('Has now', plural(outCount(member), 'book', 'books'))) : field('lend-member', 'Lend to', memberSel),
      h('div', { class: 'dialog-actions' }, cancelBtn(() => dlg), submit)));

    const title = book ? `Lend "${book.title}"` : member ? `Lend a book to ${member.name}` : 'Lend a book';
    dlg = openDialog([h('h2', null, title), form]);
    (bookSel || memberSel || submit).focus();
  }

  async function lend(b, m) {
    await api(`/books/${b.id}/borrow/${m.id}`, { method: 'POST' });
    toast(`Lent ${b.title} to ${m.name}`, false, { label: 'Undo', run: () => giveBack({ ...b, memberId: null }, true) });
    await loadAll();
  }

  async function giveBack(b, undo = false) {
    try {
      await api(`/books/${b.id}/return`, { method: 'POST' });
      if (undo) toast(`Undone. ${b.title} is back on the shelf.`);
      else toast(`${b.title} is back on the shelf`, false, b.memberId ? { label: 'Undo', run: () => relend(b) } : null);
      await loadAll();
      return true;
    } catch (err) {
      toast(err.message, true);
      return false;
    }
  }

  async function relend(b) {
    try {
      await api(`/books/${b.id}/borrow/${b.memberId}`, { method: 'POST' });
      toast(`Undone. ${b.title} is with ${b.memberName || 'the member'} again.`);
      await loadAll();
    } catch (err) { toast(err.message, true); }
  }

  // Add / edit form for books, authors and members. "preset" fills in a new item (e.g. the author).
  function openForm(kind, item = null, preset = {}) {
    const s = SCHEMA[kind];
    const editing = !!item;
    const values = item || preset;
    const errorBox = errorBoxEl();
    const noAuthors = kind === 'books' && state.data.authors.length === 0;

    const inputs = s.fields.map(f => {
      const id = `f-${kind}-${f.name}`;
      const v = values[f.name];
      let control, extra = null;
      if (f.type === 'author') {
        control = h('select', { class: 'input', id, name: f.name, required: true },
          h('option', { value: '' }, 'Choose an author'),
          state.data.authors.slice().sort(byText(a => a.name)).map(a => h('option', { value: a.id, selected: v === a.id }, a.name)));
      } else if (f.type === 'textarea') {
        control = h('textarea', { class: 'input', id, name: f.name, required: f.required, maxlength: f.max }, v || '');
        const counter = h('span', { class: 'hint counter' });
        const update = () => { counter.textContent = `${control.value.length} / ${f.max}`; };
        control.addEventListener('input', update);
        update();
        extra = counter;
      } else {
        control = h('input', { class: 'input', id, name: f.name, type: f.type, required: f.required, maxlength: f.max,
          max: f.type === 'date' ? (f.past ? yesterday() : today()) : null, value: v ?? '' });
      }
      if (f.name === 'isbn') {
        extra = h('span', { class: 'hint hint-warn', 'aria-live': 'polite' });
        control.addEventListener('input', () => {
          const val = control.value.trim();
          extra.textContent = val.length >= 10 && !isbnValid(val) ? 'Check this ISBN: its check digit does not match. You can still save it.' : '';
        });
      }
      return field(id, f.label + (f.required ? '' : ' (optional)'), control, extra);
    });

    const submit = h('button', { class: 'btn btn-primary', type: 'submit', disabled: noAuthors }, editing ? 'Save changes' : `Add ${s.singular}`);

    let dlg;
    const form = watchFields(h('form', { novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      clearFieldErrors(form);
      const body = {};
      const local = {};
      for (const f of s.fields) {
        const el = form.elements[f.name];
        const raw = el.value.trim();
        if (raw === '') {
          if (f.required) local[f.name] = `${f.label} is required.`;
          else body[f.name] = null;
          continue;
        }
        if (!el.checkValidity()) local[f.name] = f.type === 'email' ? 'This does not look like an email address.'
          : f.type === 'date' ? (f.past ? 'Pick a date in the past.' : 'The date cannot be in the future.') : el.validationMessage;
        body[f.name] = f.type === 'author' ? Number(raw) : raw;
      }
      if (Object.keys(local).length) { showErrors(errorBox, new ApiError('', 0, local), form); return; }

      busy(submit, true, 'Saving...');
      try {
        await api(editing ? `${s.path}/${item.id}` : s.path, { method: editing ? 'PUT' : 'POST', body });
        dlg.close();
        toast(`${editing ? 'Saved' : 'Added'} ${s.name({ ...item, ...body })}`);
        await loadAll();
      } catch (err) { showErrors(errorBox, err, form); busy(submit, false); }
    } },
      noAuthors && h('div', { class: 'form-error' }, 'Add an author first. Every book needs one.'),
      errorBox, inputs,
      h('div', { class: 'dialog-actions' }, cancelBtn(() => dlg), submit)));

    dlg = openDialog([h('h2', null, editing ? `Edit ${s.singular}` : `Add ${s.singular}`), form]);
    const first = form.querySelector('input, select, textarea');
    if (first) first.focus();
  }

  // Add a user with chosen roles, or edit another user's details (admin only).
  function openUserForm(u = null) {
    if (u && u.username === state.user.username) { go('account'); return; }
    const editing = !!u;
    const errorBox = errorBoxEl();
    const pw = passwordInput('password', 'new-password');
    const submit = h('button', { class: 'btn btn-primary', type: 'submit' }, editing ? 'Save changes' : 'Add user');
    const text = (id, label, props, hint) => field(id, label,
      h('input', { class: 'input', id, name: id, required: true, value: u ? u[id] : null, ...props }), hint && h('span', { class: 'hint' }, hint));

    let dlg;
    const form = watchFields(h('form', { novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      clearFieldErrors(form);
      const username = form.elements.username.value.trim();
      const email = form.elements.email.value.trim();
      const password = pw.input.value;
      const roles = editing ? null : ['ROLE_USER', 'ROLE_ADMIN'].filter(r => form.elements[r].checked);

      const local = {};
      if (!username) local.username = 'Enter a username.';
      if (!email) local.email = 'Enter an email.';
      else if (!form.elements.email.checkValidity()) local.email = 'This does not look like an email address.';
      if (password.length < 8) local.password = 'Use at least 8 characters.';
      if (roles && !roles.length) local.ROLE_USER = 'Choose at least one role.';
      if (Object.keys(local).length) { showErrors(errorBox, new ApiError('', 0, local), form); return; }

      busy(submit, true, 'Saving...');
      try {
        if (editing) await api(`/users/${u.id}`, { method: 'PUT', body: { username, email, password } });
        else await api('/users', { method: 'POST', body: { username, email, password, roles } });
        dlg.close();
        toast(`${editing ? 'Saved' : 'Added'} user ${username}`);
        await loadAll();
      } catch (err) { showErrors(errorBox, err, form); busy(submit, false); }
    } },
      errorBox,
      text('username', 'Username', { autocomplete: 'off', maxlength: 50, autocapitalize: 'none', spellcheck: 'false' }, 'Letters, digits, dots, dashes and underscores.'),
      text('email', 'Email', { type: 'email', autocomplete: 'off', maxlength: 150 }),
      field('password', editing ? 'New password' : 'Password', pw.wrap, strengthMeter(pw.input),
        editing && h('span', { class: 'hint' }, 'The server needs a password with every change, so set one here and share it with the person.')),
      editing
        ? h('div', { class: 'field' }, h('span', { class: 'label' }, 'Roles'),
            h('div', null, (u.roles || []).map(r => h('span', { class: r === 'ROLE_ADMIN' ? 'tag tag-out' : 'tag tag-plain' }, r === 'ROLE_ADMIN' ? 'Admin' : 'Reader'), ' ')),
            h('span', { class: 'hint' }, 'Roles are set when an account is created and cannot be changed here.'))
        : h('fieldset', { class: 'field fieldset' }, h('legend', { class: 'label' }, 'Roles'),
            h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'ROLE_USER', id: 'ROLE_USER', checked: true }), 'Reader: can browse the catalog'),
            h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'ROLE_ADMIN', id: 'ROLE_ADMIN' }), 'Admin: can lend, add, edit and delete')),
      h('div', { class: 'dialog-actions' }, cancelBtn(() => dlg), submit)));
    dlg = openDialog([h('h2', null, editing ? `Edit ${u.username}` : 'Add user'), form]);
    form.elements.username.focus();
  }

  function deleteBlocker(kind, item) {
    if (kind === 'books' && item.memberId) return `${item.title} is on loan to ${item.memberName || 'a member'}. Mark it as returned first.`;
    if (kind === 'authors' && booksBy(item.id)) return `${item.name} still has ${plural(booksBy(item.id), 'book', 'books')} in the catalog. Delete those books or give them another author first.`;
    if (kind === 'members' && outCount(item)) return `${item.name} still has ${plural(outCount(item), 'book', 'books')}. Mark them as returned first.`;
    return null;
  }

  function confirmDelete(kind, item) {
    const s = SCHEMA[kind];
    const label = s.name(item);
    let dlg;
    const blocker = deleteBlocker(kind, item);
    if (blocker) {
      dlg = openDialog([h('h2', null, `${label} cannot be deleted yet`), h('p', null, blocker),
        h('div', { class: 'dialog-actions' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => dlg.close() }, 'OK'))]);
      return;
    }
    const keep = h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'Keep it');
    const del = h('button', { class: 'btn btn-danger', type: 'button', onclick: async () => {
      busy(del, true, 'Deleting...');
      try {
        await api(`${s.path}/${item.id}`, { method: 'DELETE' });
        dlg.close();
        toast(`Deleted ${label}`);
        await loadAll();
      } catch (err) {
        dlg.close();
        toast(err.message, true);
      }
    } }, `Delete ${s.singular}`);
    dlg = openDialog([
      h('h2', null, `Delete ${label}?`),
      h('p', null, kind === 'users' ? 'This account will no longer be able to log in. This cannot be undone.' : 'This cannot be undone.'),
      h('div', { class: 'dialog-actions' }, keep, del),
    ]);
    keep.focus();
  }

  /* ------------------------------------------------------------------ account */

  function accountView() {
    const me = state.data.me || { username: state.user.username, email: '', roles: state.user.roles };
    const errorBox = errorBoxEl();
    const pw = passwordInput('password', 'new-password');
    const pw2 = passwordInput('password2', 'new-password');
    const submit = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Save changes');

    const form = watchFields(h('form', { class: 'card', novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      clearFieldErrors(form);
      const username = form.elements.username.value.trim();
      const email = form.elements.email.value.trim();
      const password = pw.input.value;
      const local = {};
      if (!username) local.username = 'Enter a username.';
      if (!email) local.email = 'Enter an email.';
      else if (!form.elements.email.checkValidity()) local.email = 'This does not look like an email address.';
      if (password.length < 8) local.password = 'Use at least 8 characters.';
      else if (password !== pw2.input.value) local.password2 = 'The two passwords do not match.';
      if (Object.keys(local).length) { showErrors(errorBox, new ApiError('', 0, local), form); return; }

      busy(submit, true, 'Saving...');
      try {
        await api('/users/me', { method: 'PUT', body: { username, email, password } });
        // A new username makes the old token useless, so log in again with the new details.
        const res = await api('/users/login', { method: 'POST', body: { username, password } });
        startSession(res.token);
        toast('Your account was updated');
      } catch (err) { showErrors(errorBox, err, form); busy(submit, false); }
    } },
      h('h2', null, 'Profile'),
      h('p', { class: 'hint' }, 'The server asks for a password every time you save. Type your current password to keep it, or a new one to change it.'),
      errorBox,
      field('username', 'Username', h('input', { class: 'input', id: 'username', name: 'username', value: me.username, required: true, maxlength: 50, autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false' })),
      field('email', 'Email', h('input', { class: 'input', id: 'email', name: 'email', type: 'email', value: me.email || '', required: true, maxlength: 150, autocomplete: 'email' })),
      field('password', 'Password', pw.wrap, strengthMeter(pw.input)),
      field('password2', 'Repeat password', pw2.wrap),
      h('div', { class: 'dialog-actions' }, submit)));

    const themeCard = h('section', { class: 'card' },
      h('h2', null, 'Appearance'),
      h('div', { class: 'seg seg-wide', role: 'group', 'aria-label': 'Colour theme' }, THEMES.map(t =>
        h('button', { type: 'button', 'aria-pressed': String(state.theme === t), onclick: () => { applyTheme(t); renderTools(); renderMain(); } }, THEME_LABEL[t]))),
      h('p', { class: 'hint' }, 'Saved in this browser.'));

    const infoCard = h('section', { class: 'card' },
      h('h2', null, 'Access'),
      h('dl', { class: 'facts' },
        factRow('Roles', h('span', null, (me.roles || []).map(r => h('span', { class: r === 'ROLE_ADMIN' ? 'tag tag-out' : 'tag tag-plain' }, r === 'ROLE_ADMIN' ? 'Admin' : 'Reader'), ' '))),
        state.user.exp && factRow('Session ends', fmtTime(new Date(state.user.exp * 1000)))),
      h('p', { class: 'hint' }, isAdmin() ? 'You can lend books and add, edit or delete anything.' : 'You can browse everything. Ask an admin if you need to lend or change books.'));

    const dangerCard = h('section', { class: 'card card-danger' },
      h('h2', null, 'Delete your account'),
      h('p', null, 'You will be logged out and will not be able to log in again with this account.'),
      h('div', { class: 'dialog-actions' }, h('button', { class: 'btn btn-quiet-danger', type: 'button', onclick: confirmDeleteMe }, 'Delete my account')));

    return [
      head('Your account', `Logged in as ${me.username}.`),
      h('div', { class: 'account-grid' }, form, h('div', { class: 'account-side' }, infoCard, themeCard, dangerCard)),
    ];
  }

  function confirmDeleteMe() {
    const name = state.user.username;
    const input = h('input', { class: 'input', id: 'confirm-name', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' });
    const del = h('button', { class: 'btn btn-danger', type: 'submit', disabled: true }, 'Delete my account');
    input.addEventListener('input', () => { del.disabled = input.value.trim() !== name; });
    let dlg;
    const form = h('form', { onsubmit: async (e) => {
      e.preventDefault();
      if (input.value.trim() !== name) return;
      busy(del, true, 'Deleting...');
      try {
        await api('/users/me', { method: 'DELETE' });
        dlg.close();
        logout('Your account was deleted.');
      } catch (err) { dlg.close(); toast(err.message, true); }
    } },
      h('p', null, 'This cannot be undone.'),
      field('confirm-name', `Type ${name} to confirm`, input),
      h('div', { class: 'dialog-actions' }, cancelBtn(() => dlg), del));
    dlg = openDialog([h('h2', null, 'Delete your account?'), form]);
    input.focus();
  }

  /* ------------------------------------------------------------------ help */

  function openHelp() {
    const rows = [
      ['/', 'Jump to the search box'],
      ['Esc', 'Clear the search, or close a window'],
      ['1 to 5', 'Go to Desk, Books, Authors, Members, Users'],
      ['R', 'Refresh from the server'],
      isAdmin() && ['N', 'Add a new item in this section'],
      isAdmin() && ['L', 'Lend a book'],
      ['?', 'Show this list'],
    ].filter(Boolean);
    let dlg;
    dlg = openDialog([
      h('h2', null, 'Keyboard shortcuts'),
      h('dl', { class: 'facts keys' }, rows.map(([k, t]) => factRow(h('kbd', null, k), t))),
      h('div', { class: 'dialog-actions' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => dlg.close() }, 'Got it')),
    ]);
  }

  /* ------------------------------------------------------------------ boot */

  function render() {
    const app = $('#app');
    if (!state.user) {
      document.title = 'Log in - Library desk';
      app.replaceChildren(authView());
      const u = $('#username'); if (u) u.focus();
    } else {
      app.replaceChildren(appView());
      renderNav();
      renderTools();
      renderMain();
    }
  }

  window.addEventListener('hashchange', onRoute);

  document.addEventListener('keydown', (e) => {
    if (!state.user || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('dialog[open]')) return;
    const el = document.activeElement;
    if (el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)) return;

    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === '/') { const box = $('#search'); if (box) { e.preventDefault(); box.focus(); box.select(); } return; }
    if (key === '?') { e.preventDefault(); openHelp(); return; }
    if (key === 'r') { e.preventDefault(); refresh(); return; }
    if (key === 'n' && isAdmin()) {
      if (['books', 'authors', 'members'].includes(state.view)) { e.preventDefault(); openForm(state.view); }
      else if (state.view === 'users') { e.preventDefault(); openUserForm(); }
      return;
    }
    if (key === 'l' && isAdmin()) { e.preventDefault(); openLend(); return; }
    const view = Object.keys(VIEWS).find(k => VIEWS[k].key === key && (!VIEWS[k].adminOnly || isAdmin()));
    if (view) { e.preventDefault(); go(view); }
  });

  applyTheme(state.theme);
  const saved = store.token && parseToken(store.token);
  if (saved && (!saved.exp || saved.exp * 1000 > Date.now())) {
    state.user = saved;
    armSession(saved.exp);
    state.view = viewFromHash();
    render();
    loadAll();
  } else {
    store.token = null;
    render();
  }
})();
