-- Create csv_uploads table for upload history
CREATE TABLE IF NOT EXISTS csv_uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add upload_id to csv_data table
ALTER TABLE csv_data ADD COLUMN upload_id INTEGER REFERENCES csv_uploads(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_csv_uploads_user_id ON csv_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_csv_data_upload_id ON csv_data(upload_id);
