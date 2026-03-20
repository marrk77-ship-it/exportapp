-- Update first user (client1) to admin
UPDATE users SET role = 'admin' WHERE login_id = 'client1';

-- Insert admin user if not exists (password: admin2024)
INSERT OR IGNORE INTO users (login_id, password_hash, name, role) 
VALUES ('admin', '$2b$10$w/vFc5ToLyhK7ZDjPZQX6e9IAMzm.nMwsYuC8tAUHs./5GIDaRkGi', '管理者', 'admin');

-- Add default settings for admin
INSERT OR IGNORE INTO export_settings (user_id, export_type, button_name, file_prefix, columns, filter_column, filter_value, sort_column)
SELECT 
  u.id,
  es.export_type,
  es.button_name,
  es.file_prefix,
  es.columns,
  es.filter_column,
  es.filter_value,
  es.sort_column
FROM users u
CROSS JOIN (
  SELECT 'tax' as export_type, '税金' as button_name, '税金スプレッドシート' as file_prefix, '' as columns, '' as filter_column, '' as filter_value, '' as sort_column
  UNION ALL
  SELECT 'invoice', '請求書', '請求書スプレッドシート', '', '', '', ''
  UNION ALL
  SELECT 'ledger', '全体の台帳', '完全台帳', '', '', '', ''
) es
WHERE u.login_id = 'admin'
AND NOT EXISTS (
  SELECT 1 FROM export_settings 
  WHERE user_id = u.id AND export_type = es.export_type
);
