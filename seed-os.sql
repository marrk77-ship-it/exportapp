-- OS社テストユーザーの作成
-- パスワード: os2024

INSERT INTO os_users (login_id, password_hash, name) VALUES 
  ('os_user1', '$2b$10$kjqftwsdJg3CDViYSUjIo.YIMylSFucVndKROZRfk8Oz5DKl/ojGy', 'OS社 担当者1');

INSERT INTO os_users (login_id, password_hash, name) VALUES 
  ('os_admin', '$2b$10$kjqftwsdJg3CDViYSUjIo.YIMylSFucVndKROZRfk8Oz5DKl/ojGy', 'OS社 管理者');
