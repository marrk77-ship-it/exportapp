# データ台帳管理システム（ログイン機能 + 管理画面）

CSVデータを取り込んで、税金・請求書・全体の台帳の3種類のスプレッドシートを出力できるWebアプリケーションです。

**✨ 管理画面機能を追加しました！**  
`/admin` パスから管理者専用画面にアクセスして、ユーザー管理やデータ管理を簡単に行えます。

**ログインIDに紐づけた設定情報で、クライアントごとにカスタマイズされた操作画面を提供します。**

## 🎯 プロジェクト概要

このシステムは、各クライアントがログインして自分専用の設定とデータを管理できる台帳管理ツールです。ユーザー認証により、安全にデータを保管し、用途に応じた3種類のスプレッドシートを柔軟に出力できます。

**NEW:** 管理者権限のユーザーは、管理画面から全ユーザーの管理、データの確認・削除、操作ログの閲覧ができます。

## 🔗 本番URL

- **通常画面**: https://exportapp-tw.tech
- **管理画面**: https://exportapp-tw.tech/admin

## 📚 マニュアル

システムの使い方については、以下のマニュアルをご覧ください：

- **📱 ユーザーマニュアル**: [USER_MANUAL.md](USER_MANUAL.md) - 一般ユーザー向けの詳細な使い方ガイド
- **🔧 管理者マニュアル**: [ADMIN_MANUAL.md](ADMIN_MANUAL.md) - 管理者向けの運用・管理ガイド
- **🚀 クイックスタートガイド**: [QUICK_START.md](QUICK_START.md) - 簡易版の3ステップガイド

## ✨ 主な機能

### 1. ユーザー認証機能
- **ログイン/ログアウト**: セキュアなセッション管理
- **ユーザーごとのデータ分離**: 他のクライアントのデータにアクセス不可
- **設定の永続化**: ログインIDに紐づけた設定情報を保存
- **ロールベースアクセス制御**: 管理者と一般ユーザーを区別

### 🛡️ 2. 管理画面機能（NEW!）
管理者権限を持つユーザーのみアクセス可能：

#### システム統計ダッシュボード
- 総ユーザー数
- 総CSV件数
- データベースサイズ

#### ユーザー管理
- ユーザー一覧表示（ID、ログインID、名前、ロール、CSV件数、作成日）
- 新規ユーザー作成（ログインID、パスワード、名前、ロール）
- ユーザー削除（カスケード削除で関連データも自動削除）
- パスワードリセット

#### データ管理
- 各ユーザーのCSVデータ件数表示
- CSVデータプレビュー（最大100件表示）
- ユーザー単位でのCSVデータ削除
- **注意**: 通常画面では、ログイン時に過去のCSVデータは自動読み込みされません。アップロードしたCSVのみが表示・出力されます。過去のアップロード履歴は管理画面でのみ確認できます。

#### 操作ログ
- 管理者の操作履歴を記録・表示
- IPアドレス、日時、操作内容、対象ユーザー
- 最新100件を表示

### 3. 3種類のスプレッドシート出力（ステップ2）
- **大きな「ファイルを選ぶ」ボタン**: 一目でわかる操作
- **CSVファイルのアップロード**: ローカルのCSVファイルを簡単にアップロード
- **データプレビュー**: 取り込んだデータの最初の5件を表示して確認
- **データ永続化**: Cloudflare D1データベースに安全に保存

### 3. 3種類のスプレッドシート出力（ステップ2）
大きくわかりやすいボタンで、3つのスプレッドシートを個別に出力：

#### 📊 税金スプレッドシート
- 税金関連の情報を抽出
- ユーザーごとにカスタマイズ可能

#### 📄 請求書スプレッドシート
- 請求書関連の情報を抽出
- ユーザーごとにカスタマイズ可能

#### 📚 全体の台帳
- 全データを包括的に出力
- ユーザーごとにカスタマイズ可能

### 4. 抽出条件設定機能（詳細設定）
**右上の⚙️アイコンから設定画面を開けます**

各スプレッドシートタイプごとに以下の条件を設定可能：

- **ボタン表示名**: ボタンに表示される名称を変更可能
- **出力ファイル名**: ダウンロードされるCSVファイルの名前
- **出力する列**: カンマ区切りで指定
- **フィルター対象列**: データを絞り込む列を指定
- **フィルター値**: 指定した列の値に含まれる文字列で絞り込み
- **並び替え列**: 出力データの並び順を指定

設定はユーザーごとにCloudflare D1データベースに保存され、次回ログイン時も維持されます。

## 🚀 使い方

### ログイン
1. ログイン画面でログインIDとパスワードを入力
2. 「ログイン」ボタンをクリック

**テストアカウント:**
- **管理者**: ログインID: `admin` / パスワード: `admin2024`
- 一般ユーザー: `client1` / パスワード: `password123`
- 一般ユーザー: `client2` / パスワード: `password123`

### 基本的な操作フロー（2ステップ）

#### ステップ1: ファイルを選ぶ
1. 画面中央の大きな**「ファイルを選ぶ」ボタン**をクリック
2. CSVファイルを選択（またはドラッグ＆ドロップ）
3. データプレビューで内容を確認（最初の5件を表示）

#### ステップ2: 出力したいスプレッドシートを選ぶ
1. 3つの大きなボタンから1つを選んでクリック
   - 📊 **税金** ボタン
   - 📄 **請求書** ボタン  
   - 📚 **全体の台帳** ボタン
2. CSVファイルが自動的にダウンロードされます

**重要:**
- ログイン直後は出力ボタンはグレーアウト（無効）状態です
- CSVファイルをアップロードすると、プレビューが表示され、出力ボタンが有効になります
- 出力されるデータは、**その時にアップロードしたCSVデータのみ**です
- ログアウトまたはページをリロードすると、プレビューは消え、出力ボタンは再度グレーアウトします
- 過去にアップロードしたCSVデータは、管理画面で履歴として確認できます

### 詳細設定（必要な場合のみ）
1. 画面右上の**⚙️（歯車）アイコン**をクリック
2. タブで「税金」「請求書」「全体の台帳」を切り替え
3. 各種条件を入力
4. 「設定を保存」ボタンで保存
5. ボタン名称が変更された場合、画面上のボタンもすぐに更新されます

### ログアウト
- 画面右上の「ログアウト」ボタンをクリック

### 管理画面の使い方（管理者のみ）

#### アクセス方法
1. 管理者アカウントでログイン（`admin` / `admin2024`）
2. 通常画面の右上に表示される「管理画面」ボタンをクリック
3. または直接 https://exportapp-tw.tech/admin にアクセス

#### ユーザー管理
- **新規ユーザー作成**: 「新規ユーザー」ボタンをクリックし、ログインID、パスワード、名前、ロールを入力
- **パスワードリセット**: 🔑アイコンをクリックし、新しいパスワードを入力
- **ユーザー削除**: ❌アイコンをクリックし、確認後削除（関連データも自動削除）

#### データ管理
- **CSVデータ表示**: 👁アイコンをクリックし、ユーザーのCSVデータをプレビュー
- **CSVデータ削除**: 🗑アイコンをクリックし、確認後削除

#### 操作ログ
- 画面下部の「操作ログ」セクションで、最新100件の管理操作を確認
- 操作者、操作内容、対象ユーザー、IPアドレス、日時が記録されます

## 🗄️ データベース構造

### users テーブル
ユーザー情報を保存します。

| フィールド名 | 型 | 説明 |
|------------|-----|------|
| id | INTEGER | ユーザーID（自動生成） |
| login_id | TEXT | ログインID（ユニーク） |
| password_hash | TEXT | パスワードハッシュ（bcrypt） |
| name | TEXT | ユーザー名 |
| role | TEXT | ロール（'admin' or 'user'、デフォルト: 'user'） |
| created_at | DATETIME | 作成日時 |
| updated_at | DATETIME | 更新日時 |

### admin_logs テーブル（NEW!）
管理者の操作ログを保存します。

| フィールド名 | 型 | 説明 |
|------------|-----|------|
| id | INTEGER | ログID（自動生成） |
| admin_user_id | INTEGER | 操作した管理者のユーザーID |
| action | TEXT | 操作種別（create_user, delete_user, reset_password, delete_csv） |
| target_user_id | INTEGER | 対象ユーザーのID |
| details | TEXT | 操作の詳細情報 |
| ip_address | TEXT | 操作元のIPアドレス |
| created_at | DATETIME | 操作日時 |

### csv_data テーブル
CSVから取り込んだデータを保存します。

| フィールド名 | 型 | 説明 |
|------------|-----|------|
| id | INTEGER | レコードID（自動生成） |
| user_id | INTEGER | ユーザーID |
| row_data | TEXT | CSV1行分のデータ（JSON形式） |
| row_number | INTEGER | 行番号 |
| created_at | DATETIME | 作成日時 |
| updated_at | DATETIME | 更新日時 |

### export_settings テーブル
出力設定を保存します。

| フィールド名 | 型 | 説明 |
|------------|-----|------|
| id | INTEGER | 設定ID（自動生成） |
| user_id | INTEGER | ユーザーID |
| export_type | TEXT | 出力タイプ（tax/invoice/ledger） |
| button_name | TEXT | ボタンに表示する名称 |
| file_prefix | TEXT | 出力ファイル名の接頭辞 |
| columns | TEXT | 出力する列名（カンマ区切り） |
| filter_column | TEXT | フィルター対象列名 |
| filter_value | TEXT | フィルター値 |
| sort_column | TEXT | 並び替え列名 |
| created_at | DATETIME | 作成日時 |
| updated_at | DATETIME | 更新日時 |

## 📁 プロジェクト構造

```
webapp/
├── src/
│   ├── index.tsx         # メインアプリケーション（Hono）
│   ├── middleware.ts     # 認証ミドルウェア
│   ├── types.ts          # TypeScript型定義
│   └── utils.ts          # ユーティリティ関数
├── public/
│   └── static/
│       └── app.js        # フロントエンドJavaScript
├── migrations/
│   └── 0001_initial_schema.sql  # データベースマイグレーション
├── seed.sql              # テストデータ
├── ecosystem.config.cjs  # PM2設定
├── wrangler.jsonc        # Cloudflare設定
├── package.json          # 依存関係とスクリプト
└── README.md             # このファイル
```

## 🛠️ 技術仕様

### バックエンド
- **フレームワーク**: Hono (Cloudflare Workers)
- **データベース**: Cloudflare D1 (SQLite)
- **認証**: bcryptjs (パスワードハッシュ化)
- **セッション管理**: HTTP-only Cookie (Base64エンコード)

### フロントエンド
- **HTML5, CSS3, JavaScript (ES6+)**
- **ライブラリ**: 
  - PapaParse 5.4.1（CSV解析）
  - Axios 1.6.0（HTTP クライアント）
  - Font Awesome 6.4.0（アイコン）
  - Tailwind CSS（スタイリング）
  - Google Fonts（Noto Sans JP）

### デプロイ
- **プラットフォーム**: Cloudflare Pages
- **エッジランタイム**: Cloudflare Workers
- **文字エンコーディング**: UTF-8（入出力とも）

## 🔧 開発環境セットアップ

### 必要なツール
- Node.js 18以上
- npm または yarn
- Wrangler CLI

### インストール手順

1. **リポジトリのクローン**
```bash
git clone <repository-url>
cd webapp
```

2. **依存関係のインストール**
```bash
npm install
```

3. **D1データベースのセットアップ（ローカル）**
```bash
# マイグレーション実行
npm run db:migrate:local

# テストデータの投入
npm run db:seed
```

4. **ビルド**
```bash
npm run build
```

5. **開発サーバーの起動**
```bash
# PM2で起動（推奨）
pm2 start ecosystem.config.cjs

# または直接起動
npm run dev:sandbox
```

6. **ブラウザでアクセス**
```
http://localhost:3000
```

## 🚀 本番デプロイ

### 事前準備

1. **Cloudflare D1データベースの作成**
```bash
npx wrangler d1 create webapp-production
```

2. **wrangler.jsonc の更新**
生成された `database_id` を `wrangler.jsonc` に設定します。

3. **マイグレーションの実行（本番）**
```bash
npm run db:migrate:prod
```

4. **テストユーザーの作成（本番）**
```bash
# seed.sqlを本番環境で実行
npx wrangler d1 execute webapp-production --file=./seed.sql
```

### デプロイ

```bash
# ビルドとデプロイ
npm run deploy:prod
```

デプロイ後、Cloudflare Pages のURLでアクセスできます。

## 🌐 公開URL

- **開発環境**: https://3000-iguqoisbr4aual0c9ips6-18e660f9.sandbox.novita.ai
- **本番環境**: （デプロイ後に表示されます）

## 📋 npm スクリプト

```bash
# 開発
npm run dev                    # Vite開発サーバー
npm run dev:sandbox            # Wranglerローカル開発サーバー（D1付き）

# ビルド
npm run build                  # プロダクションビルド

# デプロイ
npm run deploy                 # Cloudflare Pagesへデプロイ
npm run deploy:prod            # 本番環境へデプロイ

# データベース
npm run db:migrate:local       # ローカルD1マイグレーション
npm run db:migrate:prod        # 本番D1マイグレーション
npm run db:seed                # テストデータ投入（ローカル）
npm run db:reset               # ローカルD1リセット
npm run db:console:local       # ローカルD1コンソール
npm run db:console:prod        # 本番D1コンソール

# ユーティリティ
npm run clean-port             # ポート3000をクリーンアップ
```

## 🔒 セキュリティ

- **パスワード**: bcryptjsで10ラウンドのハッシュ化
- **セッション**: HTTP-only, Secure, SameSite=Strict Cookie
- **データ分離**: ユーザーIDによる完全なデータ分離
- **SQLインジェクション対策**: プリペアドステートメント使用

## 💾 データの保存場所

### ローカル開発環境

**データベースファイルの場所:**
```
/home/user/webapp/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite
```

**データベースの内容:**
1. **users テーブル**: ログインID、パスワードハッシュ、ユーザー名
2. **csv_data テーブル**: アップロードされたCSVデータ（ユーザーごと）
3. **export_settings テーブル**: 各ユーザーの出力設定（税金、請求書、全体の台帳）

### データベースの直接確認

```bash
# ユーザー一覧を表示
npx wrangler d1 execute webapp-production --local --command="SELECT id, login_id, name FROM users"

# CSVデータの件数を確認
npx wrangler d1 execute webapp-production --local --command="SELECT user_id, COUNT(*) as count FROM csv_data GROUP BY user_id"

# エクスポート設定を確認
npx wrangler d1 execute webapp-production --local --command="SELECT user_id, export_type, button_name, file_prefix FROM export_settings"
```

### 本番環境

本番環境では、Cloudflare D1に保存されます。確認方法:

```bash
# 本番データベースのユーザー一覧
npx wrangler d1 execute webapp-production --remote --command="SELECT id, login_id, name FROM users"
```

## 👤 ユーザー管理

### 既存のテストユーザー

現在、以下の2つのテストアカウントが登録されています（`seed.sql`で作成）:

- **client1** / password123 / テストクライアント1
- **client2** / password123 / テストクライアント2

### データベース管理ツール (db-admin.js)

データベースの確認・管理用のCLIツールを用意しています。

#### 🎯 簡単な使い方（対話型メニュー）

**本番環境の管理:**
```bash
cd /home/user/webapp
./db-menu-prod.sh
```

**ローカル環境の管理:**
```bash
cd /home/user/webapp
./db-menu-local.sh
```

対話型メニューで以下の操作ができます:
1. ユーザー一覧を表示
2. CSVデータ件数を表示
3. 特定ユーザーのCSVデータを表示
4. 特定ユーザーのエクスポート設定を表示
5. 特定ユーザーのCSVデータを削除
6. SQLクエリを実行

#### 📋 コマンドラインからの使い方

```bash
# ヘルプ表示
npm run db:admin -- --help

# ユーザー一覧表示（ローカル）
npm run db:users

# ユーザー一覧表示（本番環境）
npm run db:users:prod

# CSVデータ件数表示（ローカル）
npm run db:count

# CSVデータ件数表示（本番環境）
npm run db:count:prod

# 特定ユーザーのCSVデータ表示（ローカル）
npm run db:admin show-csv client1

# 特定ユーザーのCSVデータ表示（本番環境、最大20件）
npm run db:admin show-csv client1 --remote --limit 20

# 特定ユーザーのエクスポート設定表示
npm run db:admin show-settings client1

# 特定ユーザーのエクスポート設定表示（本番環境）
npm run db:admin show-settings client1 --remote

# 特定ユーザーのCSVデータ削除（注意: 元に戻せません）
npm run db:admin delete-csv client1

# 任意のSQLクエリを実行
npm run db:admin sql "SELECT COUNT(*) FROM users"

# 本番環境でSQLクエリを実行
npm run db:admin sql "SELECT COUNT(*) FROM users" --remote
```

#### すべてのコマンド

| コマンド | 説明 | オプション |
|---------|------|-----------|
| `list-users` | 全ユーザーを表示 | `-r, --remote` |
| `count-csv` | ユーザーごとのCSVデータ件数を表示 | `-r, --remote` |
| `show-csv <login_id>` | 特定ユーザーのCSVデータを表示 | `-r, --remote`<br>`-l, --limit <number>` |
| `delete-csv <login_id>` | 特定ユーザーのCSVデータを削除 | `-r, --remote` |
| `show-settings <login_id>` | 特定ユーザーのエクスポート設定を表示 | `-r, --remote` |
| `sql <query>` | 任意のSQLクエリを実行 | `-r, --remote` |

### 新しいユーザーの追加

#### 🎯 簡単な方法（対話型スクリプト・推奨）

```bash
cd /home/user/webapp
./add-new-user.sh
```

スクリプトが以下を対話的に質問します：
1. 追加先の環境（ローカル or 本番）
2. ログインID（例: client3）
3. パスワード
4. ユーザー名（例: 新規クライアント3）
5. 確認

入力後、自動的に以下を実行：
- ✅ パスワードのハッシュ化
- ✅ ユーザーの追加
- ✅ デフォルトのエクスポート設定を追加（税金、請求書、全体の台帳）
- ✅ 追加されたユーザーの表示

#### 📋 手動で追加する方法（上級者向け）

**方法1: add-user.jsスクリプトを使用（推奨）**

```bash
# SQLを生成
node add-user.js <login_id> <password> <name>

# 例: client3というユーザーを追加
node add-user.js client3 mypassword123 テストクライアント3

# 生成されたSQLをコピーして実行
npx wrangler d1 execute webapp-production --local --command="生成されたSQL"
```

**方法2: 手動でSQLを作成**

1. パスワードハッシュを生成:
```bash
node generate-hashes.js
```

2. SQLファイルを作成（例: `add-client3.sql`）:
```sql
-- ユーザーを追加
INSERT INTO users (login_id, password_hash, name) 
VALUES ('client3', 'ここにハッシュ値', 'テストクライアント3');

-- デフォルトのエクスポート設定を追加
INSERT INTO export_settings (user_id, export_type, button_name, file_prefix, columns, filter_column, filter_value, sort_column) VALUES
  ((SELECT id FROM users WHERE login_id='client3'), 'tax', '税金', '税金スプレッドシート', '', '', '', ''),
  ((SELECT id FROM users WHERE login_id='client3'), 'invoice', '請求書', '請求書スプレッドシート', '', '', '', ''),
  ((SELECT id FROM users WHERE login_id='client3'), 'ledger', '全体の台帳', '完全台帳', '', '', '', '');
```

3. SQLを実行:
```bash
# ローカル環境
npx wrangler d1 execute webapp-production --local --file=./add-client3.sql

# 本番環境
npx wrangler d1 execute webapp-production --remote --file=./add-client3.sql
```

### ユーザーの削除

```bash
# ユーザーとそのデータを完全に削除（注意: 元に戻せません）
npx wrangler d1 execute webapp-production --local --command="
DELETE FROM csv_data WHERE user_id = (SELECT id FROM users WHERE login_id='client3');
DELETE FROM export_settings WHERE user_id = (SELECT id FROM users WHERE login_id='client3');
DELETE FROM users WHERE login_id='client3';
"
```

### パスワードの変更

```bash
# 1. 新しいパスワードハッシュを生成
node -e "import('bcryptjs').then(bcrypt => bcrypt.default.hash('新しいパスワード', 10).then(hash => console.log(hash)))"

# 2. パスワードハッシュを更新
npx wrangler d1 execute webapp-production --local --command="
UPDATE users SET password_hash='新しいハッシュ値' WHERE login_id='client1';
"
```

## 🐛 トラブルシューティング

### ログインできない場合
1. データベースにテストユーザーが作成されているか確認
2. コンソールのエラーメッセージを確認
3. Cookie が有効になっているか確認

### CSVファイルが読み込めない場合
- ファイルにヘッダー行があることを確認
- UTF-8エンコーディングを推奨
- ファイルサイズが大きすぎないか確認（推奨: 10MB以下）

### データが表示されない場合
1. ログインしているか確認
2. CSVファイルをアップロードしたか確認
3. ブラウザのコンソールでエラーを確認

## 🎨 デザイン特徴

- **シンプルで清潔なデザイン**: 白背景に大きな文字とボタン
- **ステップバイステップ**: 迷わず操作できる2段階の流れ
- **大きなボタン**: タップしやすい、押しやすいサイズ
- **目立たない設定**: 右上の小さな⚙️アイコンで必要な時だけアクセス
- **レスポンシブデザイン**: スマートフォン、タブレット、PCに対応
- **通知システム**: 操作結果をわかりやすく表示

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

---

**バージョン**: 2.1.0（CSVアップロード仕様変更）
**最終更新**: 2026-03-20
**デプロイ状況**: ✅ ローカル開発環境で動作確認済み

**変更履歴**:
- **v2.1.0** (2026-03-20): アップロードCSVのみ表示・出力する仕様に変更、管理画面でCSV履歴表示
- **v2.0.0** (2026-03-11): ログイン機能と管理画面を追加
