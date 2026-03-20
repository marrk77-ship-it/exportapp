export type Bindings = {
  DB: D1Database;
}

export type User = {
  id: number;
  login_id: string;
  password_hash: string;
  name: string | null;
  role?: string;
  created_at: string;
  updated_at: string;
}

export type CSVData = {
  id: number;
  user_id: number;
  row_data: string;
  row_number: number;
  created_at: string;
  updated_at: string;
}

export type ExportSettings = {
  id: number;
  user_id: number;
  export_type: 'tax' | 'invoice' | 'ledger';
  button_name: string;
  file_prefix: string;
  columns: string | null;
  filter_column: string | null;
  filter_value: string | null;
  sort_column: string | null;
  created_at: string;
  updated_at: string;
}

export type Session = {
  user_id: number;
  login_id: string;
  name: string | null;
  role?: string;
  expires_at: number;
}

export type AdminLog = {
  id: number;
  admin_user_id: number;
  action: string;
  target_user_id: number | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}
