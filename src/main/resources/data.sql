INSERT INTO roles (name) VALUES ('ROLE_USER')  ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ROLE_ADMIN') ON CONFLICT (name) DO NOTHING;
INSERT INTO authors (name, biography, dob) VALUES
('George Orwell', 'English novelist and essayist.', '1903-06-25'),
('Jane Austen', 'English novelist known for her romances.', '1775-12-16');
INSERT INTO members (name, email, membership_date) VALUES
('Sara Ali', 'sara@example.com', '2024-01-15'),
('Omar Hassan', 'omar@example.com', '2024-03-02');
INSERT INTO books (title, isbn, published_date, author_id, member_id) VALUES
('1984', '9780451524935', '1949-06-08',
    (SELECT id FROM authors WHERE name = 'George Orwell'), NULL),
('Animal Farm', '9780451526342', '1945-08-17',
    (SELECT id FROM authors WHERE name = 'George Orwell'),
    (SELECT id FROM members WHERE email = 'sara@example.com')),
('Pride and Prejudice', '9780141439518', '1813-01-28',
    (SELECT id FROM authors WHERE name = 'Jane Austen'), NULL);