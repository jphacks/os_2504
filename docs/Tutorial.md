# Fullstack Starter: Vite + React 19 + Tailwind v4 + Vercel Functions + Drizzle (PostgreSQL)

- Frontend: Vite + React 19 + Tailwind CSS v4 (Zero-config)
- API: Vercel Functions (Node.js runtime, `/api`)
- DB: PostgreSQL (local: Docker, prod: Vercel Postgres / Neon)
- ORM: Drizzle ORM + drizzle-kit
- Dev: Taskfile + Docker (`task dev`でホスト差分を最小化)
- CI/CD: GitHub Actions（PR時: lint/typecheck/test/build、main: 自動デプロイ）

## Quick Start (Taskfile + Docker)
1. 前提ツール
   - Docker / Docker Compose v2
   - [Task](https://taskfile.dev) CLI（例: `brew install go-task/tap/go-task`）
2. `.env` を用意
   ```bash
   cp .env.example .env
   ```
3. 開発環境の起動
   ```bash
   task dev
   ```
   - バックグラウンド起動したい場合は `task dev:detach`
4. 初回起動時は依存関係のインストールが実行されるので完了まで待つ
5. API 用の Vercel CLI 認証
   - `VERCEL_TOKEN` を `.env` に設定する（Personal Token を [Vercel Dashboard](https://vercel.com/account/tokens) で発行）
   - もしくは `task shell` でコンテナに入り `vercel login` を実行（メールリンクで認証）
6. DBマイグレーション等のコマンドは Task 経由で実行（`task db:migrate` など）。Drizzle Studio を開きたい場合は `task db:studio`。
7. ブラウザとツール類
   - Web: `http://localhost:5173`
   - Functions(API): `http://localhost:3000/api/health`, `http://localhost:3000/api/todos`
   - Adminer(DB GUI): `http://localhost:8080`

## ローカルCIチェック
- PR 前に CI 相当のチェックを走らせたい場合は `task ci` を実行すると、Docker 上で `lint`/`typecheck`/`test`/`build` が一括で行われます。
- 実行後は自動的にコンテナが停止／クリーンアップされます（既に `task dev` 実行中の場合は停止されるため注意してください）。

停止は `task stop`、ボリュームごと破棄する場合は `task clean` を使用してください。ログのみ追いたい場合は `task logs`。

> `task dev` は Docker 内で `pnpm dev` を実行し、Vite(5173)と `vercel dev`(3000) を同時に提供します。Vite 側は `/api/*` を 3000 にプロキシします。認証済みでない場合は上記ステップ5を参照してください。

## データモデル
- `db/schema.ts` に Drizzle ORM のスキーマを定義しています。
- `api/todos.ts` は Drizzle ORM 経由で PostgreSQL にアクセスし、初回リクエスト時にテーブルを自動作成します（本番ではマイグレーション適用が推奨です）。

## デプロイ（Vercel）
- Vercel プロジェクトにこのリポジトリを接続
- 環境変数を設定
  - `DATABASE_URL`: Vercel Postgres や Neon などの接続文字列
  - GitHub に以下の Secrets を設定（Actions からデプロイする場合）
  - `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- main にマージすると Actions により `vercel build/deploy` が実行されます。

## Notes
- Node は 22 LTS 固定（10/21/2025 までは現行 LTS）。Node 24 LTS 昇格後に上げる場合は `engines` と CI の node-version を更新してください。
- Tailwind v4 はゼロコンフィグ。必要があれば `tailwind.config.ts` を追加可能です。
- API 関数は Fetch Web 標準の `GET/POST/PATCH` エクスポートで実装し、Drizzle を通じて Postgres を更新します。
