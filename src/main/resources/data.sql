-- ============ Roles (the app needs these) ============
INSERT INTO roles (name) VALUES ('ROLE_USER')  ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ROLE_ADMIN') ON CONFLICT (name) DO NOTHING;

-- ============ Authors ============
INSERT INTO authors (name, biography, dob)
SELECT v.name, v.biography, v.dob::date
FROM (VALUES
  ('Victor Hugo',          'French poet and novelist, author of Les Miserables and The Hunchback of Notre-Dame.', '1802-02-26'),
  ('Fyodor Dostoevsky',    'Russian novelist who explored guilt, faith and human psychology.', '1821-11-11'),
  ('Mark Twain',           'American writer and humorist, creator of Tom Sawyer and Huckleberry Finn.', '1835-11-30'),
  ('Charles Dickens',      'English novelist who wrote about Victorian life and social problems.', '1812-02-07'),
  ('Ernest Hemingway',     'American novelist known for short, direct sentences and a Nobel Prize in 1954.', '1899-07-21'),
  ('F. Scott Fitzgerald',  'American novelist who captured the Jazz Age in The Great Gatsby.', '1896-09-24'),
  ('Virginia Woolf',       'English writer and a leading figure of modernist literature.', '1882-01-25'),
  ('Albert Camus',         'French-Algerian author and philosopher, Nobel Prize winner in 1957.', '1913-11-07'),
  ('Khaled Hosseini',      'Afghan-American novelist, author of The Kite Runner.', '1965-03-04'),
  ('Tayeb Salih',          'Sudanese novelist, best known for Season of Migration to the North.', '1929-07-12')
) AS v(name, biography, dob)
WHERE NOT EXISTS (SELECT 1 FROM authors a WHERE a.name = v.name);

-- ============ Books ============
INSERT INTO books (title, isbn, published_date, author_id)
SELECT v.title, v.isbn, v.pub::date, a.id
FROM (VALUES
  ('Les Miserables',                      '9781000000011', '1862-04-03', 'Victor Hugo'),
  ('The Hunchback of Notre-Dame',         '9781000000028', '1831-01-14', 'Victor Hugo'),
  ('Crime and Punishment',                '9781000000035', '1866-01-01', 'Fyodor Dostoevsky'),
  ('The Brothers Karamazov',              '9781000000042', '1880-11-01', 'Fyodor Dostoevsky'),
  ('The Adventures of Tom Sawyer',        '9781000000059', '1876-06-01', 'Mark Twain'),
  ('Adventures of Huckleberry Finn',      '9781000000066', '1884-12-10', 'Mark Twain'),
  ('Great Expectations',                  '9781000000073', '1861-08-01', 'Charles Dickens'),
  ('A Tale of Two Cities',                '9781000000080', '1859-04-30', 'Charles Dickens'),
  ('The Old Man and the Sea',             '9781000000097', '1952-09-01', 'Ernest Hemingway'),
  ('A Farewell to Arms',                  '9781000000103', '1929-09-27', 'Ernest Hemingway'),
  ('The Great Gatsby',                    '9781000000110', '1925-04-10', 'F. Scott Fitzgerald'),
  ('Tender Is the Night',                 '9781000000127', '1934-04-12', 'F. Scott Fitzgerald'),
  ('Mrs Dalloway',                        '9781000000134', '1925-05-14', 'Virginia Woolf'),
  ('To the Lighthouse',                   '9781000000141', '1927-05-05', 'Virginia Woolf'),
  ('The Stranger',                        '9781000000158', '1942-01-01', 'Albert Camus'),
  ('The Plague',                          '9781000000165', '1947-06-10', 'Albert Camus'),
  ('The Kite Runner',                     '9781000000172', '2003-05-29', 'Khaled Hosseini'),
  ('A Thousand Splendid Suns',            '9781000000189', '2007-05-22', 'Khaled Hosseini'),
  ('Season of Migration to the North',    '9781000000196', '1966-01-01', 'Tayeb Salih')
) AS v(title, isbn, pub, author_name)
JOIN authors a ON a.name = v.author_name
ON CONFLICT (isbn) DO NOTHING;

-- ============ Members ============
INSERT INTO members (name, email, membership_date) VALUES
  ('Mona Farouk',   'mona.farouk@mail.test',   '2024-02-11'),
  ('Tariq Zayed',   'tariq.zayed@mail.test',   '2024-04-25'),
  ('Reem Alharbi',  'reem.alharbi@mail.test',  '2024-06-30'),
  ('Bilal Qasim',   'bilal.qasim@mail.test',   '2024-10-05'),
  ('Dina Haddad',   'dina.haddad@mail.test',   '2025-02-18'),
  ('Saad Mutlaq',   'saad.mutlaq@mail.test',   '2025-06-09'),
  ('Lina Barakat',  'lina.barakat@mail.test',  '2025-09-27')
ON CONFLICT (email) DO NOTHING;

-- ============ Loans ============
UPDATE books SET member_id = (SELECT id FROM members WHERE email = 'mona.farouk@mail.test')
 WHERE isbn = '9781000000110' AND member_id IS NULL;
UPDATE books SET member_id = (SELECT id FROM members WHERE email = 'mona.farouk@mail.test')
 WHERE isbn = '9781000000097' AND member_id IS NULL;
UPDATE books SET member_id = (SELECT id FROM members WHERE email = 'tariq.zayed@mail.test')
 WHERE isbn = '9781000000035' AND member_id IS NULL;
UPDATE books SET member_id = (SELECT id FROM members WHERE email = 'reem.alharbi@mail.test')
 WHERE isbn = '9781000000172' AND member_id IS NULL;
UPDATE books SET member_id = (SELECT id FROM members WHERE email = 'dina.haddad@mail.test')
 WHERE isbn = '9781000000158' AND member_id IS NULL;
UPDATE books SET member_id = (SELECT id FROM members WHERE email = 'lina.barakat@mail.test')
 WHERE isbn = '9781000000196' AND member_id IS NULL;