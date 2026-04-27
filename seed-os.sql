-- OS社テストユーザーの作成
-- パスワード: os2024

INSERT OR IGNORE INTO os_users (login_id, password_hash, name) VALUES 
  ('os_user1', '$2a$10$YHqV.Zy8V9HVvZ8pLVkYJ.8xRSxO9d4k6E0qQRj8vPvX2OGKNm8yG', 'OS社 担当者1'),
  ('os_admin', '$2a$10$YHqV.Zy8V9HVvZ8pLVkYJ.8xRSxO9d4k6E0qQRj8vPvX2OGKNm8yG', 'OS社 管理者');
