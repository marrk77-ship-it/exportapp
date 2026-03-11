-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login_id TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CSV data table
CREATE TABLE IF NOT EXISTS csv_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  row_data TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Export settings table
CREATE TABLE IF NOT EXISTS export_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  export_type TEXT NOT NULL,
  button_name TEXT NOT NULL,
  file_prefix TEXT NOT NULL,
  columns TEXT,
  filter_column TEXT,
  filter_value TEXT,
  sort_column TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, export_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_csv_data_user_id ON csv_data(user_id);
CREATE INDEX IF NOT EXISTS idx_export_settings_user_id ON export_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_users_login_id ON users(login_id);
