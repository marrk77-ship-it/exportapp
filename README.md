# データ台帳管理システム（ログイン機能付き）

CSVデータを取り込んで、税金・請求書・全体の台帳の3種類のスプレッドシートを出力できるWebアプリケーションです。

**ログインIDに紐づけた設定情報で、クライアントごとにカスタマイズされた操作画面を提供します。**

## 🎯 プロジェクト概要

このシステムは、各クライアントがログインして自分専用の設定とデータを管理できる台帳管理ツールです。ユーザー認証により、安全にデータを保管し、用途に応じた3種類のスプレッドシートを柔軟に出力できます。

## ✨ 主な機能

### 1. ユーザー認証機能
- **ログイン/ログアウト**: セキュアなセッション管理
- **ユーザーごとのデータ分離**: 他のクライアントのデータにアクセス不可
- **設定の永続化**: ログインIDに紐づけた設定情報を保存

### 2. データ取り込み機能（ステップ1）
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
- ログインID: `client1` / パスワード: `password123`
- ログインID: `client2` / パスワード: `password123`

### 基本的な操作フロー（2ステップ）

#### ステップ1: ファイルを選ぶ
1. 画面中央の大きな**「ファイルを選ぶ」ボタン**をクリック
2. CSVファイルを選択（またはドラッグ＆ドロップ）
3. データプレビューで内容を確認

#### ステップ2: 出力したいスプレッドシートを選ぶ
1. 3つの大きなボタンから1つを選んでクリック
   - 📊 **税金** ボタン
   - 📄 **請求書** ボタン  
   - 📚 **全体の台帳** ボタン
2. CSVファイルが自動的にダウンロードされます

### 詳細設定（必要な場合のみ）
1. 画面右上の**⚙️（歯車）アイコン**をクリック
2. タブで「税金」「請求書」「全体の台帳」を切り替え
3. 各種条件を入力
4. 「設定を保存」ボタンで保存
5. ボタン名称が変更された場合、画面上のボタンもすぐに更新されます

### ログアウト
- 画面右上の「ログアウト」ボタンをクリック

## 🗄️ データベース構造

### users テーブル
ユーザー情報を保存します。

| フィールド名 | 型 | 説明 |
|------------|-----|------|
| id | INTEGER | ユーザーID（自動生成） |
| login_id | TEXT | ログインID（ユニーク） |
| password_hash | TEXT | パスワードハッシュ（bcrypt） |
| name | TEXT | ユーザー名 |
| created_at | DATETIME | 作成日時 |
| updated_at | DATETIME | 更新日時 |

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

**バージョン**: 2.0.0（ログイン機能付き）
**最終更新**: 2026-03-11
**デプロイ状況**: ✅ ローカル開発環境で動作確認済み
