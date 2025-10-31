USE `railway`;
-- MySQL schema for Biblioteca Virtual (updated roles, refresh tokens)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash CHAR(60),
  provider ENUM('local','google') NOT NULL DEFAULT 'local',
  role ENUM('BIBLIOTECARIO','AUTOR','USUARIO') NOT NULL DEFAULT 'USUARIO',
  photo_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  author_id INT NOT NULL,
  title VARCHAR(160) NOT NULL,
  description VARCHAR(800),
  cover_url VARCHAR(255),
  content_type ENUM('TEXT','PDF','DOCX') NOT NULL DEFAULT 'TEXT',
  content_url VARCHAR(255),
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_books_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS book_pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  book_id INT NOT NULL,
  page_number INT NOT NULL,
  text MEDIUMTEXT NOT NULL,
  CONSTRAINT fk_pages_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_page (book_id, page_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Refresh tokens (hash stored, rotate on refresh)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_token (user_id, token_hash),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_title ON books(title);

-- Seeder (ejemplo) bibliotecario
-- password: 123456 (bcrypt cost 12)
-- Cambia el email si querés otro dominio
INSERT IGNORE INTO users (name,email,password_hash,provider,role)
VALUES ('Bibliotecario','bibliotecario@gmail.com','$2a$12$1R9Y5t5o.4yVf4a4dSz2iu8jXJ9n1f8G1Zc7qDHtqf0E1D0BtQm1S','local','BIBLIOTECARIO');