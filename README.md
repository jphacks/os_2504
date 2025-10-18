# Fullstack Starter (Vite × Cloud Run × Cloud SQL)

シンプルな ToDo アプリで、下記のスタックを利用したフルスタック開発／本番運用フローを検証できます。

- フロントエンド: Vite + React 19 + Tailwind CSS v4
- バックエンド: Express (TypeScript) を Cloud Run 上で稼働
- データベース: PostgreSQL（ローカル Docker / 本番 Cloud SQL）
- ORM: Drizzle ORM
- CI/CD: GitHub Actions → Artifact Registry → Cloud Run

## ローカル開発

```bash
cp .env.example .env
task dev
```

- Web: http://localhost:5173
- API: http://localhost:3000/api/health
- DB GUI: http://localhost:8080 (Adminer)

`task dev`（= Docker Compose）で Vite・Express・PostgreSQL をまとめて起動します。`.env` の `DATABASE_URL` は Docker 内の Postgres を指すようにしてください。

## 本番デプロイ（概要）

1. Cloud SQL for PostgreSQL を作成し、接続ユーザーを準備。
2. Artifact Registry にリポジトリ（例: `fullstack`）を作成。
3. Cloud Run サービス用のサービスアカウントを作成し、`run.admin` / `iam.serviceAccountUser` / `artifactregistry.writer` / `cloudsql.client` など必要ロールを付与。
4. GitHub Secrets に以下を設定。
   - `GCP_PROJECT_ID`, `GCP_REGION`, `CLOUD_RUN_SERVICE`, `ARTIFACT_REPOSITORY`
   - `GCP_SERVICE_ACCOUNT_KEY`（手順3の JSON キー）
   - `DATABASE_URL`, `DB_SSL`, `DB_SSL_STRICT`, `DB_MAX_CONNECTIONS`
   - `CLOUD_SQL_CONNECTION`（Cloud SQL Auth Proxy/Connector を使う場合。不要なら空文字）
5. `main` にマージすると GitHub Actions が Docker ビルド → Artifact Registry push → Cloud Run デプロイを実行します。

詳細なセットアップ手順は `docs/Tutorial.md` を参照してください。

## スクリプト

- `pnpm dev` : Vite + Express サーバーを同時起動
- `pnpm build` : フロント（`dist/client`）とサーバー（`dist/server`）をビルド
- `pnpm start` : ビルド済み成果物を起動（Cloud Run と同等）
- `pnpm db:*` : Drizzle ORM 用のユーティリティ
- `task prod:test` : 本番ビルドを生成し、ローカルポート8080でヘルスチェック

## ライセンス

MIT
