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
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  const store = {
    get token() { try { return sessionStorage.getItem('library_token'); } catch { return null; } },
    set token(v) {
      try { v ? sessionStorage.setItem('library_token', v) : sessionStorage.removeItem('library_token'); } catch { /* ignore */ }
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

  const SPINE_COLORS = ['#0B7A75', '#2A4B7C', '#C98A10', '#8A3B2E', '#6B3F69', '#4F7A3A'];
  function spineColor(text) {
    let n = 0;
    for (const ch of String(text)) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
    return SPINE_COLORS[n % SPINE_COLORS.length];
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  const today = () => new Date().toISOString().slice(0, 10);

  function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }

  /* ------------------------------------------------------------------ state + api */

  const state = {
    user: null,          // { username, roles }
    authMode: 'login',   // 'login' | 'register'
    view: 'books',
    filter: '',
    loading: false,
    data: { books: [], authors: [], members: [] },
  };

  const isAdmin = () => !!state.user && state.user.roles.includes('ROLE_ADMIN');

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

    if (res.status === 401 && store.token) {
      logout('Your session ended. Log in again.');
      throw new ApiError('Session ended', 401);
    }
    if (!res.ok) {
      let data = null;
      try { data = await res.json(); } catch { /* not JSON */ }
      throw new ApiError(data?.message || data?.error || `The request failed (${res.status}).`, res.status, data?.fieldErrors);
    }
    return res.status === 204 ? null : res.json();
  }

  function toast(text, isError = false) {
    const el = h('div', { class: 'toast' + (isError ? ' error' : ''), role: isError ? 'alert' : 'status' }, text);
    $('#toasts').append(el);
    setTimeout(() => el.remove(), isError ? 7000 : 3500);
  }

  /* ------------------------------------------------------------------ entities */

  const SCHEMA = {
    books: {
      label: 'Books', singular: 'book', path: '/books', listKey: 'books',
      fields: [
        { name: 'title', label: 'Title', type: 'text', required: true, max: 200 },
        { name: 'isbn', label: 'ISBN', type: 'text', required: true, max: 20 },
        { name: 'publishedDate', label: 'Published on', type: 'date', required: true },
        { name: 'authorId', label: 'Author', type: 'author', required: true },
      ],
      name: b => b.title,
    },
    authors: {
      label: 'Authors', singular: 'author', path: '/authors', listKey: 'authors',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true, max: 100 },
        { name: 'biography', label: 'Biography', type: 'textarea', required: true, max: 5000 },
        { name: 'dob', label: 'Date of birth', type: 'date', required: false },
      ],
      name: a => a.name,
    },
    members: {
      label: 'Members', singular: 'member', path: '/members', listKey: 'members',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true, max: 100 },
        { name: 'email', label: 'Email', type: 'email', required: true, max: 150 },
        { name: 'membershipDate', label: 'Member since', type: 'date', required: true },
      ],
      name: m => m.name,
    },
  };

  async function loadAll() {
    state.loading = true;
    renderList();
    try {
      const [b, a, m] = await Promise.all([api('/books'), api('/authors'), api('/members')]);
      state.data.books = b.books || [];
      state.data.authors = a.authors || [];
      state.data.members = m.members || [];
    } catch (e) {
      if (e.status !== 401) toast(e.message, true);
    } finally {
      state.loading = false;
      if (state.user) { renderNav(); renderList(); }
    }
  }

  /* ------------------------------------------------------------------ auth */

  function logout(message) {
    store.token = null;
    state.user = null;
    state.data = { books: [], authors: [], members: [] };
    state.filter = '';
    state.view = 'books';
    state.authMode = 'login';
    render();
    if (message) toast(message);
  }

  function startSession(token) {
    const info = parseToken(token);
    if (!info) throw new ApiError('The server sent a token this page cannot read.', 0);
    store.token = token;
    state.user = { username: info.username, roles: info.roles };
    render();
    loadAll();
  }

  function authView() {
    const register = state.authMode === 'register';
    const errorBox = h('div', { class: 'form-error', role: 'alert', hidden: true });

    const form = h('form', { novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      const username = form.username.value.trim();
      const password = form.password.value;
      const email = register ? form.email.value.trim() : '';
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        if (register) await api('/users/register', { method: 'POST', body: { username, password, email } });
        const res = await api('/users/login', { method: 'POST', body: { username, password } });
        startSession(res.token);
      } catch (err) {
        let msg = err.message;
        if (err.status === 401 && !register) msg = 'Wrong username or password.';
        errorBox.replaceChildren(msg);
        if (err.fieldErrors) {
          errorBox.append(h('ul', null, Object.values(err.fieldErrors).map(t => h('li', null, t))));
        }
        errorBox.hidden = false;
        btn.disabled = false;
      }
    } },
      errorBox,
      h('div', { class: 'field' }, h('label', { for: 'username' }, 'Username'),
        h('input', { class: 'input', id: 'username', name: 'username', autocomplete: 'username', required: true })),
      register && h('div', { class: 'field' }, h('label', { for: 'email' }, 'Email'),
        h('input', { class: 'input', id: 'email', name: 'email', type: 'email', autocomplete: 'email', required: true })),
      h('div', { class: 'field' }, h('label', { for: 'password' }, 'Password'),
        h('input', { class: 'input', id: 'password', name: 'password', type: 'password',
          autocomplete: register ? 'new-password' : 'current-password', required: true }),
        register && h('span', { class: 'hint' }, 'Use at least 8 characters.')),
      h('button', { class: 'btn btn-primary', type: 'submit' }, register ? 'Create account' : 'Log in'),
    );

    const spines = SPINE_COLORS.concat(SPINE_COLORS).slice(0, 11)
      .map((c, i) => h('span', { style: `background:${c};height:${[62, 88, 74, 100, 68, 92, 80, 58, 96, 72, 84][i]}%` }));

    return h('div', { class: 'auth' },
      h('div', { class: 'auth-art' }, h('div', { class: 'brand' }, 'Library desk'), h('div', { class: 'spines', 'aria-hidden': 'true' }, spines)),
      h('div', { class: 'auth-form-wrap' },
        h('div', { class: 'auth-card' },
          h('h1', null, register ? 'Create your account' : 'Log in'),
          h('p', { class: 'lead' }, register ? 'New accounts can browse the catalog.' : 'Use your library account to open the catalog.'),
          form,
          h('p', { class: 'switch' }, register ? 'Already have an account? ' : 'No account yet? ',
            h('button', { class: 'btn-link', type: 'button', onclick: () => { state.authMode = register ? 'login' : 'register'; render(); } },
              register ? 'Log in' : 'Create one')))));
  }

  /* ------------------------------------------------------------------ app view */

  function appView() {
    return h('div', { class: 'shell' },
      h('aside', { class: 'side' },
        h('div', { class: 'brand' }, 'Library desk'),
        h('nav', { class: 'nav', id: 'nav', 'aria-label': 'Sections' }),
        h('div', { class: 'who' },
          h('strong', null, state.user.username),
          h('span', { class: 'role' }, isAdmin() ? 'Admin' : 'Member account'),
          h('div', null, h('button', { class: 'btn-link', type: 'button', onclick: () => logout() }, 'Log out')))),
      h('main', { class: 'main', id: 'main' }));
  }

  function renderNav() {
    const nav = $('#nav');
    if (!nav) return;
    nav.replaceChildren(...Object.entries(SCHEMA).map(([key, s]) =>
      h('button', { type: 'button', 'aria-current': state.view === key ? 'page' : null, onclick: () => {
        state.view = key; state.filter = ''; renderNav(); renderMain();
      } }, h('span', null, s.label), h('span', { class: 'count' }, state.data[key].length))));
  }

  function renderMain() {
    const main = $('#main');
    if (!main) return;
    const s = SCHEMA[state.view];
    document.title = `${s.label} - Library desk`;

    const search = h('input', { class: 'input', type: 'search', 'aria-label': `Search ${s.label.toLowerCase()}`,
      placeholder: `Search ${s.label.toLowerCase()}`, value: state.filter, oninput: (e) => { state.filter = e.target.value; renderList(); } });

    main.replaceChildren(
      h('div', { class: 'main-head' },
        h('div', null, h('h1', null, s.label),
          !isAdmin() && h('p', null, 'You can browse. Only admins can add, edit or delete.')),
        isAdmin() && h('button', { class: 'btn btn-primary', type: 'button', onclick: () => openForm(state.view) }, `Add ${s.singular}`)),
      h('div', { class: 'search' }, search),
      h('div', { id: 'list' }));
    renderList();
  }

  function renderList() {
    const box = $('#list');
    if (!box) { if (state.user && $('#main')) renderMain(); return; }
    const s = SCHEMA[state.view];
    if (state.loading) { box.replaceChildren(h('p', null, 'Loading...')); return; }

    const q = state.filter.trim().toLowerCase();
    const all = state.data[state.view];
    const items = !q ? all : all.filter(it => JSON.stringify(Object.values(it)).toLowerCase().includes(q));

    if (!items.length) {
      box.replaceChildren(h('div', { class: 'empty' },
        h('strong', null, q ? `No ${s.label.toLowerCase()} match "${state.filter.trim()}"` : `No ${s.label.toLowerCase()} yet`),
        q ? 'Try a different spelling.' : (isAdmin() ? `Use "Add ${s.singular}" to create the first one.` : 'An admin can add the first one.')));
      return;
    }
    box.replaceChildren(h('ul', { class: 'rows' }, items.map(it => ROW[state.view](it))));
  }

  /* ------------------------------------------------------------------ rows */

  function actions(kind, item) {
    if (!isAdmin()) return null;
    return [
      h('button', { class: 'btn-link', type: 'button', onclick: () => openForm(kind, item) }, 'Edit'),
      h('button', { class: 'btn-link danger', type: 'button', onclick: () => confirmDelete(kind, item) }, 'Delete'),
    ];
  }

  const ROW = {
    books: (b) => h('li', { class: 'row' },
      h('span', { class: 'spine', style: `background:${spineColor(b.title)}` }),
      h('div', null,
        h('div', { class: 'title' }, b.title),
        h('div', { class: 'meta' },
          h('span', null, 'by ' + (b.authorName || 'unknown author')),
          h('span', null, 'ISBN ' + b.isbn),
          b.publishedDate && h('span', null, 'Published ' + fmtDate(b.publishedDate)))),
      h('div', { class: 'side-col' },
        b.memberId ? h('span', { class: 'tag tag-loan' }, 'On loan to ' + (b.memberName || 'a member'))
                   : h('span', { class: 'tag tag-free' }, 'Available'),
        actions('books', b))),

    authors: (a) => {
      const n = state.data.books.filter(b => b.authorId === a.id).length;
      return h('li', { class: 'row' },
        h('span', { class: 'spine' }),
        h('div', null,
          h('div', { class: 'title' }, a.name),
          h('div', { class: 'meta' }, a.dob && h('span', null, 'Born ' + fmtDate(a.dob))),
          h('div', { class: 'bio' }, a.biography)),
        h('div', { class: 'side-col' }, h('span', { class: 'tag tag-plain' }, plural(n, 'book', 'books')), actions('authors', a)));
    },

    members: (m) => {
      const out = m.borrowedBooks || [];
      return h('li', { class: 'row' },
        h('span', { class: 'spine' }),
        h('div', null,
          h('div', { class: 'title' }, m.name),
          h('div', { class: 'meta' },
            h('span', null, m.email),
            m.membershipDate && h('span', null, 'Member since ' + fmtDate(m.membershipDate))),
          out.length > 0 && h('div', { class: 'bio' }, 'Has: ' + out.map(x => x.title).join(', '))),
        h('div', { class: 'side-col' },
          h('span', { class: out.length ? 'tag tag-loan' : 'tag tag-plain' }, out.length ? plural(out.length, 'book out', 'books out') : 'No books out'),
          actions('members', m)));
    },
  };

  /* ------------------------------------------------------------------ dialogs */

  function openDialog(content) {
    const dlg = h('dialog', null, h('div', { class: 'dialog-body' }, content));
    dlg.addEventListener('close', () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
    return dlg;
  }

  function openForm(kind, item) {
    const s = SCHEMA[kind];
    const editing = !!item;
    const errorBox = h('div', { class: 'form-error', role: 'alert', hidden: true });
    const noAuthors = kind === 'books' && state.data.authors.length === 0;

    const inputs = s.fields.map(f => {
      const id = `f-${kind}-${f.name}`;
      let control;
      if (f.type === 'author') {
        control = h('select', { class: 'input', id, name: f.name, required: true },
          h('option', { value: '' }, 'Choose an author'),
          state.data.authors.map(a => h('option', { value: a.id, selected: item && item.authorId === a.id }, a.name)));
      } else if (f.type === 'textarea') {
        control = h('textarea', { class: 'input', id, name: f.name, required: f.required, maxlength: f.max }, item ? item[f.name] || '' : '');
      } else {
        control = h('input', { class: 'input', id, name: f.name, type: f.type, required: f.required, maxlength: f.max,
          max: f.type === 'date' ? today() : null, value: item && item[f.name] != null ? item[f.name] : '' });
      }
      return h('div', { class: 'field' }, h('label', { for: id }, f.label + (f.required ? '' : ' (optional)')), control);
    });

    const cancel = h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'Cancel');
    const submit = h('button', { class: 'btn btn-primary', type: 'submit', disabled: noAuthors }, editing ? 'Save changes' : `Add ${s.singular}`);

    const form = h('form', { novalidate: false, onsubmit: async (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      const body = {};
      for (const f of s.fields) {
        const raw = form.elements[f.name].value.trim();
        if (raw === '') { if (!f.required) body[f.name] = null; continue; }
        body[f.name] = f.type === 'author' ? Number(raw) : raw;
      }
      submit.disabled = true;
      try {
        await api(editing ? `${s.path}/${item.id}` : s.path, { method: editing ? 'PUT' : 'POST', body });
        dlg.close();
        toast(`${editing ? 'Saved' : 'Added'} ${s.name({ ...item, ...body })}`);
        await loadAll();
      } catch (err) {
        errorBox.replaceChildren(err.message);
        if (err.fieldErrors) errorBox.append(h('ul', null, Object.values(err.fieldErrors).map(t => h('li', null, t))));
        errorBox.hidden = false;
        submit.disabled = false;
      }
    } },
      noAuthors && h('div', { class: 'form-error' }, 'Add an author first. Every book needs one.'),
      errorBox, inputs,
      h('div', { class: 'dialog-actions' }, cancel, submit));

    const dlg = openDialog([h('h2', null, editing ? `Edit ${s.singular}` : `Add ${s.singular}`), form]);
    const first = form.querySelector('input, select, textarea');
    if (first) first.focus();
  }

  function confirmDelete(kind, item) {
    const s = SCHEMA[kind];
    const label = s.name(item);
    const del = h('button', { class: 'btn btn-danger', type: 'button', onclick: async () => {
      del.disabled = true;
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
    const dlg = openDialog([
      h('h2', null, `Delete ${label}?`),
      h('p', null, 'This cannot be undone.'),
      h('div', { class: 'dialog-actions' }, h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'Keep it'), del),
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
      renderMain();
    }
  }

  const saved = store.token && parseToken(store.token);
  if (saved && (!saved.exp || saved.exp * 1000 > Date.now())) {
    state.user = { username: saved.username, roles: saved.roles };
    render();
    loadAll();
  } else {
    store.token = null;
    render();
  }
})();