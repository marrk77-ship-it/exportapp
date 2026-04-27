-- OS社専用システムのテーブル

-- OS社ユーザーテーブル
CREATE TABLE IF NOT EXISTS os_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login_id TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OS社 CSVアップロード履歴
CREATE TABLE IF NOT EXISTS os_csv_uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES os_users(id) ON DELETE CASCADE
);

-- OS社 CSVデータ
CREATE TABLE IF NOT EXISTS os_csv_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  upload_id INTEGER,
  row_data TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES os_users(id) ON DELETE CASCADE,
  FOREIGN KEY (upload_id) REFERENCES os_csv_uploads(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_os_csv_data_user_id ON os_csv_data(user_id);
CREATE INDEX IF NOT EXISTS idx_os_csv_data_upload_id ON os_csv_data(upload_id);
CREATE INDEX IF NOT EXISTS idx_os_csv_uploads_user_id ON os_csv_uploads(user_id);
