#!/bin/bash
# ユーザー追加スクリプト

cd /home/user/webapp

echo "================================"
echo "新規ユーザー追加"
echo "================================"
echo ""

# 環境を選択
echo "追加先の環境を選択してください:"
echo "1. ローカル環境（開発・テスト用）"
echo "2. 本番環境（https://exportapp-tw.tech）"
echo ""
read -p "選択 (1 or 2): " env_choice

if [ "$env_choice" = "1" ]; then
  ENV_FLAG="--local"
  ENV_NAME="ローカル環境"
elif [ "$env_choice" = "2" ]; then
  ENV_FLAG="--remote"
  ENV_NAME="本番環境"
  export CLOUDFLARE_API_TOKEN="JU1CQgSrphiV2_KjW6qZlHpEfxKH8TQImJO5c-jj"
else
  echo "❌ 無効な選択です"
  exit 1
fi

echo ""
echo "📝 新規ユーザー情報を入力してください"
echo ""

# ログインID入力
read -p "ログインID（例: client3）: " login_id
if [ -z "$login_id" ]; then
  echo "❌ ログインIDは必須です"
  exit 1
fi

# パスワード入力
read -sp "パスワード: " password
echo ""
if [ -z "$password" ]; then
  echo "❌ パスワードは必須です"
  exit 1
fi

# 名前入力
read -p "ユーザー名（例: 新規クライアント3）: " name
if [ -z "$name" ]; then
  echo "❌ ユーザー名は必須です"
  exit 1
fi

echo ""
echo "================================"
echo "📋 入力内容の確認"
echo "================================"
echo "環境      : $ENV_NAME"
echo "ログインID: $login_id"
echo "パスワード: ********"
echo "ユーザー名: $name"
echo ""
read -p "この内容でユーザーを追加しますか？ (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo ""
  echo "❌ キャンセルしました"
  exit 0
fi

echo ""
echo "🔐 パスワードハッシュを生成中..."

# SQLを生成
SQL=$(node add-user.js "$login_id" "$password" "$name" 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ エラー: パスワードハッシュの生成に失敗しました"
  echo "$SQL"
  exit 1
fi

# ユーザー追加SQL抽出
USER_SQL=$(echo "$SQL" | grep "INSERT INTO users" | head -1)
SETTINGS_SQL=$(echo "$SQL" | grep -A 2 "INSERT INTO export_settings")

echo ""
echo "👤 ユーザーを追加中..."

# ユーザー追加を実行
npx wrangler d1 execute webapp-production $ENV_FLAG --command="$USER_SQL"

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ エラー: ユーザーの追加に失敗しました"
  echo "既に同じログインIDが存在する可能性があります"
  exit 1
fi

echo ""
echo "⚙️  デフォルトのエクスポート設定を追加中..."

# エクスポート設定を1行ずつ追加
SETTINGS_SQL_SINGLE="INSERT INTO export_settings (user_id, export_type, button_name, file_prefix, columns, filter_column, filter_value, sort_column) VALUES ((SELECT id FROM users WHERE login_id='${login_id}'), 'tax', '税金', '税金スプレッドシート', '', '', '', ''), ((SELECT id FROM users WHERE login_id='${login_id}'), 'invoice', '請求書', '請求書スプレッドシート', '', '', '', ''), ((SELECT id FROM users WHERE login_id='${login_id}'), 'ledger', '全体の台帳', '完全台帳', '', '', '', '');"

npx wrangler d1 execute webapp-production $ENV_FLAG --command="$SETTINGS_SQL_SINGLE"

if [ $? -ne 0 ]; then
  echo ""
  echo "⚠️  警告: エクスポート設定の追加に失敗しました"
  echo "ユーザーは追加されましたが、設定は手動で追加する必要があります"
fi

echo ""
echo "================================"
echo "✅ ユーザー追加完了！"
echo "================================"
echo ""
echo "📋 追加されたユーザー情報:"
echo "ログインID: $login_id"
echo "パスワード: $password"
echo "ユーザー名: $name"
echo "環境      : $ENV_NAME"
echo ""
echo "🌐 ログインURL:"
if [ "$env_choice" = "2" ]; then
  echo "https://exportapp-tw.tech"
else
  echo "http://localhost:3000"
fi
echo ""

# 追加されたユーザーを確認
echo "📊 ユーザー一覧を表示:"
npx wrangler d1 execute webapp-production $ENV_FLAG --command="SELECT id, login_id, name, created_at FROM users ORDER BY id"

echo ""
echo "✨ 完了しました！"
