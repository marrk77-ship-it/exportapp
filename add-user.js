import bcrypt from 'bcryptjs';

// 使い方: node add-user.js <login_id> <password> <name>
// 例: node add-user.js client3 mypassword テストクライアント3

const args = process.argv.slice(2);

if (args.length !== 3) {
  console.error('使い方: node add-user.js <login_id> <password> <name>');
  console.error('例: node add-user.js client3 mypassword テストクライアント3');
  process.exit(1);
}

const [login_id, password, name] = args;

async function generateUserSQL() {
  const hash = await bcrypt.hash(password, 10);
  
  console.log('\n=== 新しいユーザーを追加するSQL ===\n');
  console.log(`-- ユーザー情報: ${login_id} / ${password} / ${name}`);
  console.log(`INSERT INTO users (login_id, password_hash, name) VALUES ('${login_id}', '${hash}', '${name}');`);
  console.log('');
  console.log('-- デフォルトのエクスポート設定（user_idは実際のIDに置き換えてください）');
  console.log(`INSERT INTO export_settings (user_id, export_type, button_name, file_prefix, columns, filter_column, filter_value, sort_column) VALUES`);
  console.log(`  ((SELECT id FROM users WHERE login_id='${login_id}'), 'tax', '税金', '税金スプレッドシート', '', '', '', ''),`);
  console.log(`  ((SELECT id FROM users WHERE login_id='${login_id}'), 'invoice', '請求書', '請求書スプレッドシート', '', '', '', ''),`);
  console.log(`  ((SELECT id FROM users WHERE login_id='${login_id}'), 'ledger', '全体の台帳', '完全台帳', '', '', '', '');`);
  console.log('\n=== 実行方法 ===\n');
  console.log('ローカル環境:');
  console.log(`npx wrangler d1 execute webapp-production --local --command="上記のSQL"`);
  console.log('\n本番環境:');
  console.log(`npx wrangler d1 execute webapp-production --command="上記のSQL"`);
  console.log('');
}

generateUserSQL();
