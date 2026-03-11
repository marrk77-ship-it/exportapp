-- Insert test users
-- Password: "password123" (hashed with bcrypt)
INSERT OR IGNORE INTO users (login_id, password_hash, name) VALUES 
  ('client1', '$2b$10$tDsPq3AAK4HHWfrOzmfGluoTh9IXYTkPi51l79rnLAArTJ7YW9F5i', 'テストクライアント1'),
  ('client2', '$2b$10$Pvz12RicqZb7ACn.B9yUsu7s9Pqt7Ao324ODIxW4mYExm78ON9FVK', 'テストクライアント2');

-- Insert default export settings for client1 (user_id=1)
INSERT OR IGNORE INTO export_settings (user_id, export_type, button_name, file_prefix, columns, filter_column, filter_value, sort_column) VALUES 
  (1, 'tax', '税金', '税金スプレッドシート', '', '', '', ''),
  (1, 'invoice', '請求書', '請求書スプレッドシート', '', '', '', ''),
  (1, 'ledger', '全体の台帳', '完全台帳', '', '', '', '');

-- Insert default export settings for client2 (user_id=2)
INSERT OR IGNORE INTO export_settings (user_id, export_type, button_name, file_prefix, columns, filter_column, filter_value, sort_column) VALUES 
  (2, 'tax', '税金', '税金スプレッドシート', '', '', '', ''),
  (2, 'invoice', '請求書', '請求書スプレッドシート', '', '', '', ''),
  (2, 'ledger', '全体の台帳', '完全台帳', '', '', '', '');
