# Cloudflare Pages デプロイ手順

## 前提条件

1. Cloudflareアカウントを作成済み
2. Cloudflare API Tokenを作成済み（Deploy タブから設定）

## ステップ1: Cloudflare API キーの設定

1. **Deploy タブ**を開く
2. Cloudflare API Token を作成
3. APIキーを入力して保存

## ステップ2: D1 データベースの作成

### 2-1. 本番用D1データベースを作成

```bash
cd /home/user/webapp
npx wrangler d1 create webapp-production
```

実行すると、以下のような出力が表示されます：

```
✅ Successfully created DB 'webapp-production'

[[d1_databases]]
binding = "DB"
database_name = "webapp-production"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ← このIDをコピー
```

### 2-2. wrangler.jsonc にデータベースIDを設定

`wrangler.jsonc` を編集して、`database_id` に先ほどコピーしたIDを設定：

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "webapp",
  "compatibility_date": "2026-03-11",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": ["nodejs_compat"],
  
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "webapp-production",
      "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  // ← ここに設定
    }
  ]
}
```

### 2-3. マイグレーションを実行（本番環境）

```bash
# テーブル作成
npx wrangler d1 migrations apply webapp-production --remote

# テストユーザーを作成
npx wrangler d1 execute webapp-production --remote --file=./seed.sql
```

### 2-4. 確認

```bash
# ユーザーが作成されたか確認
npx wrangler d1 execute webapp-production --remote --command="SELECT * FROM users"
```

## ステップ3: Cloudflare Pages の設定

### 3-1. Cloudflare Pages プロジェクトを作成

Cloudflare Dashboard で:
1. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. GitHubリポジトリ `exportapp` を選択
3. ビルド設定:
   - **Framework preset**: `None` または `Hono`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (デフォルト)
   - **Deploy command**: `echo "Deploy completed"` （ダミーコマンド）

### 3-2. D1 データベースをバインド

Cloudflare Pages プロジェクトの設定で:
1. **Settings** → **Functions** → **D1 database bindings**
2. **Add binding** をクリック
3. 設定:
   - **Variable name**: `DB`
   - **D1 database**: `webapp-production` を選択
4. **Save** をクリック

### 3-3. デプロイ

GitHubにプッシュすると自動的にデプロイされます：

```bash
cd /home/user/webapp
git add .
git commit -m "Update wrangler.jsonc with D1 database ID"
git push origin main
```

または、手動でデプロイ：

```bash
npm run deploy:prod
```

## ステップ4: 動作確認

1. Cloudflare Pages のデプロイが完了したら、URLを開く（例: `https://exportapp.pages.dev`）
2. テストアカウントでログイン:
   - ID: `client1`
   - パスワード: `password123`
3. CSVアップロードと出力をテスト

## トラブルシューティング

### エラー: "Invalid database UUID ()"

- `wrangler.jsonc` の `database_id` が空欄または間違っています
- ステップ2を再確認してください

### エラー: "Authentication failed"

- Cloudflare API Token が正しく設定されていません
- Deploy タブで再設定してください

### ログインできない

- 本番環境のD1データベースにユーザーが作成されていません
- `seed.sql` を実行してください:
  ```bash
  npx wrangler d1 execute webapp-production --remote --file=./seed.sql
  ```

### D1 バインディングが見つからない

- Cloudflare Pages の設定で D1 バインディングが正しく設定されているか確認
- Variable name が `DB` になっているか確認

## よくある質問

**Q: ローカルと本番環境でデータベースは共有されますか？**
A: いいえ、別々です。ローカルは `.wrangler/state/v3/d1/` に保存され、本番は Cloudflare D1 に保存されます。

**Q: 本番環境のデータベースをバックアップしたい**
A: 
```bash
# データをエクスポート
npx wrangler d1 export webapp-production --remote --output=backup.sql
```

**Q: 本番環境のデータベースをリセットしたい**
A: 注意: すべてのデータが削除されます
```bash
# テーブルを削除
npx wrangler d1 execute webapp-production --remote --command="DROP TABLE IF EXISTS csv_data"
npx wrangler d1 execute webapp-production --remote --command="DROP TABLE IF EXISTS export_settings"
npx wrangler d1 execute webapp-production --remote --command="DROP TABLE IF EXISTS users"

# マイグレーションを再実行
npx wrangler d1 migrations apply webapp-production --remote
npx wrangler d1 execute webapp-production --remote --file=./seed.sql
```

## 参考リンク

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
