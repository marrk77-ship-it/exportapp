#!/bin/bash
# ローカル環境のデータベース管理スクリプト

cd /home/user/webapp

echo "================================"
echo "データベース管理メニュー（ローカル環境）"
echo "================================"
echo ""
echo "1. ユーザー一覧を表示"
echo "2. CSVデータ件数を表示"
echo "3. 特定ユーザーのCSVデータを表示"
echo "4. 特定ユーザーのエクスポート設定を表示"
echo "5. 特定ユーザーのCSVデータを削除"
echo "6. SQLクエリを実行"
echo ""
echo "0. 終了"
echo ""
read -p "選択してください (0-6): " choice

case $choice in
  1)
    echo ""
    echo "📋 ローカル環境のユーザー一覧を取得中..."
    npm run db:users
    ;;
  2)
    echo ""
    echo "📊 ローカル環境のCSVデータ件数を取得中..."
    npm run db:count
    ;;
  3)
    echo ""
    read -p "ログインID（例: client1）: " login_id
    read -p "表示件数（デフォルト: 10）: " limit
    limit=${limit:-10}
    echo ""
    echo "📄 ${login_id} のCSVデータを取得中..."
    npm run db:admin show-csv $login_id --limit $limit
    ;;
  4)
    echo ""
    read -p "ログインID（例: client1）: " login_id
    echo ""
    echo "⚙️  ${login_id} のエクスポート設定を取得中..."
    npm run db:admin show-settings $login_id
    ;;
  5)
    echo ""
    read -p "ログインID（例: client1）: " login_id
    echo ""
    echo "⚠️  警告: ${login_id} の全CSVデータを削除します！"
    read -p "本当に削除しますか？ (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
      npm run db:admin delete-csv $login_id
      echo ""
      echo "✅ 削除完了"
    else
      echo ""
      echo "❌ キャンセルしました"
    fi
    ;;
  6)
    echo ""
    read -p "SQLクエリを入力: " query
    echo ""
    echo "🔍 SQLクエリを実行中..."
    npm run db:admin sql "$query"
    ;;
  0)
    echo ""
    echo "👋 終了します"
    exit 0
    ;;
  *)
    echo ""
    echo "❌ 無効な選択です"
    exit 1
    ;;
esac

echo ""
read -p "Enterキーを押して終了..."
