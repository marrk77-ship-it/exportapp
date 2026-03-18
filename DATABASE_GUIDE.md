# データベース管理ガイド

## 📊 現在のデータ状況（本番環境）

### ユーザー情報
- **client1** (ID: 1) - テストクライアント1
  - CSVデータ: **476行**
  - 作成日時: 2026-03-18 06:48:50
  
- **client2** (ID: 2) - テストクライアント2
  - CSVデータ: **0行**
  - 作成日時: 2026-03-18 06:48:50

### CSVデータの内容（client1の例）

データには以下のような情報が含まれています：
- 伝票番号
- 交付番号
- 整理番号
- 何次
- 交付年月日
- 排出事業者名
- その他の関連情報

---

## 🛠️ データベース管理の使い方

### 方法1: 対話型メニュー（最も簡単）

#### 本番環境のデータを確認:
```bash
cd /home/user/webapp
./db-menu-prod.sh
```

#### ローカル環境のデータを確認:
```bash
cd /home/user/webapp
./db-menu-local.sh
```

### 選択できるメニュー:

1. **ユーザー一覧を表示**
   - 全ユーザーのID、ログインID、名前、作成日時を表示

2. **CSVデータ件数を表示**
   - ユーザーごとのCSVデータ行数を表示

3. **特定ユーザーのCSVデータを表示**
   - ログインIDを入力すると、そのユーザーのCSVデータを表示
   - 表示件数も指定可能（デフォルト: 10件）

4. **特定ユーザーのエクスポート設定を表示**
   - ログインIDを入力すると、エクスポート設定（税金、請求書、全体の台帳）を表示

5. **特定ユーザーのCSVデータを削除**
   - ⚠️ 注意: 削除すると元に戻せません
   - 確認メッセージが表示されます

6. **SQLクエリを実行**
   - 任意のSQLコマンドを実行可能（上級者向け）

---

## 📝 よく使うコマンド例

### 本番環境のユーザー確認:
```bash
cd /home/user/webapp
./run-db-command.sh
```

### client1のCSVデータを3件表示:
```bash
cd /home/user/webapp
export CLOUDFLARE_API_TOKEN="JU1CQgSrphiV2_KjW6qZlHpEfxKH8TQImJO5c-jj"
npx wrangler d1 execute webapp-production --remote --command="SELECT * FROM csv_data WHERE user_id = 1 LIMIT 3"
```

### 特定の伝票番号を検索:
```bash
cd /home/user/webapp
export CLOUDFLARE_API_TOKEN="JU1CQgSrphiV2_KjW6qZlHpEfxKH8TQImJO5c-jj"
npx wrangler d1 execute webapp-production --remote --command="SELECT * FROM csv_data WHERE user_id = 1 AND row_data LIKE '%19741%' LIMIT 5"
```

---

## 🔒 セキュリティ注意事項

- パスワードはbcryptでハッシュ化されて保存されています
- 実際のパスワードは誰も見ることができません
- データベースはユーザーごとに完全に分離されています
- 本番環境のデータ操作には Cloudflare API トークンが必要です

---

## 📚 詳細情報

- プロジェクトのREADME: `/home/user/webapp/README.md`
- デプロイガイド: `/home/user/webapp/DEPLOYMENT.md`
- GitHub: https://github.com/marrk77-ship-it/exportapp
- 本番サイト: https://exportapp-tw.tech
