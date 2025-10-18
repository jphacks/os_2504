# Fullstack Starter: Vite + React 19 + Tailwind v4 + Cloud Run API + Drizzle (PostgreSQL)

- Frontend: Vite + React 19 + Tailwind CSS v4 (Zero-config)
- API: Express + Node.js を Cloud Run 上で実行（`/api/*`）
- DB: PostgreSQL（ローカル: Docker、プロダクション: Cloud SQL for PostgreSQL）
- ORM: Drizzle ORM + drizzle-kit
- Dev: Taskfile + Docker (`task dev` でホスト差分を最小化)
- CI/CD: GitHub Actions（PR時: lint/typecheck/test/build、main: Cloud Run へ自動デプロイ）

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
5. API サーバーは `pnpm dev:server` で Express をホットリロードしています。`.env` の `DATABASE_URL` が PostgreSQL（Docker コンテナ）を向くように維持してください。
6. DBマイグレーション等のコマンドは Task 経由で実行（`task db:migrate` など）。Drizzle Studio を開きたい場合は `task db:studio`。
7. ブラウザとツール類
   - Web: `http://localhost:5173`
   - Functions(API): `http://localhost:3000/api/health`, `http://localhost:3000/api/todos`
   - Adminer(DB GUI): `http://localhost:8080`

## SPA Routes (Pre-DB MogFinder Prototype)
- `/` : 幹事向けダッシュボード。ルーム作成・共有リンク発行・メンバー管理・投票カード配布・ランキング確認。
- `/r/:roomCode` : 参加者向けビュー。共有URLからアクセスし、既存メンバー選択または新規登録→トークン発行→1枚ずつ表示されるカードへのスワイプ投票→暫定ランキング確認という順序で遷移。
- 開発環境では共有URLが `http://localhost:5173/r/<ROOM_CODE>` 形式で生成されます。`APP_SHARE_BASE_URL` を設定すると本番用ドメインに切り替えられます。

## ローカルCIチェック
- PR 前に CI 相当のチェックを走らせたい場合は `task ci` を実行すると、Docker 上で `lint`/`typecheck`/`test`/`build` が一括で行われます。
- 実行後は自動的にコンテナが停止／クリーンアップされます（既に `task dev` 実行中の場合は停止されるため注意してください）。

## 本番ビルドの簡易検証
- `task prod:test` を実行すると、ローカルで `pnpm build` を行ったうえで `dist/server/index.js` を直接起動し、`http://127.0.0.1:8080/api/health` に対してヘルスチェックを行います。
- `DATABASE_URL` が未設定の場合は `postgresql://postgres:postgres@localhost:5432/app?sslmode=disable` が利用されるため、別途PostgreSQLが起動していることを確認してください。

停止は `task stop`、ボリュームごと破棄する場合は `task clean` を使用してください。ログのみ追いたい場合は `task logs`。

> `task dev` は Docker 内で `pnpm dev` を実行し、Vite(5173) と Express サーバー(3000) を同時に提供します。Vite 側は `/api/*` を 3000 にプロキシするため、フロントからの API 呼び出しは同一オリジンで完結します。

## データモデル
- `db/schema.ts` に Drizzle ORM のスキーマを定義しています。
- `server/routes/todos.ts` は Drizzle ORM 経由で PostgreSQL にアクセスし、初回リクエスト時にテーブルを自動作成します（本番ではマイグレーション適用が推奨です）。

## デプロイ（Cloud Run）

### リソース準備（1回限り）
1. Cloud SQL for PostgreSQL インスタンスを用意し、データベースとユーザーを作成します。
2. Cloud Run サービス用プロジェクトを決め、Artifact Registry に Docker リポジトリを作成します（例: `asia-northeast1-docker.pkg.dev/<PROJECT_ID>/fullstack/app`）。
3. サービスアカウントを作成し、以下のロールを付与します。
   - `roles/run.admin`
   - `roles/iam.serviceAccountUser`
   - `roles/artifactregistry.writer`
   - Cloud SQL 利用時は `roles/cloudsql.client`
4. 作成したサービスアカウントの JSON キーを GitHub Secrets（例: `GCP_SERVICE_ACCOUNT_KEY`）として登録します。
5. GitHub Secrets または Variables に以下を設定します。
   - `GCP_PROJECT_ID`
   - `GCP_REGION`（例: `asia-northeast1`）
   - `CLOUD_RUN_SERVICE`（例: `fullstack-app`）
   - `ARTIFACT_REPOSITORY`（Artifact Registry のリポジトリ名。例: `fullstack`）
   - `CLOUD_SQL_CONNECTION`（Cloud SQL Auth Proxy を使う場合: `<PROJECT_ID>:<REGION>:<INSTANCE_NAME>`。未使用なら空文字のままで可）
   - `DATABASE_URL`（Cloud SQL 用接続文字列。Private IP や Proxy 経由など環境に応じて設定）
   - `DB_SSL`, `DB_SSL_STRICT`, `DB_MAX_CONNECTIONS`（必要に応じて）

### ローカルからのデプロイ例

```bash
# イメージをビルドして Artifact Registry に push
gcloud auth login
gcloud config set project <PROJECT_ID>
gcloud auth configure-docker asia-northeast1-docker.pkg.dev
docker build -t asia-northeast1-docker.pkg.dev/<PROJECT_ID>/fullstack/app:latest .
docker push asia-northeast1-docker.pkg.dev/<PROJECT_ID>/fullstack/app:latest

# Cloud Run へデプロイ
gcloud run deploy <CLOUD_RUN_SERVICE> \
  --image=asia-northeast1-docker.pkg.dev/<PROJECT_ID>/fullstack/app:latest \
  --region=asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=<your-connection-string>" \
  --set-env-vars "DB_SSL=true,DB_SSL_STRICT=false" \
  --min-instances=0 --max-instances=3
```

Cloud SQL の Private IP を使う場合は `--vpc-connector` でServerless VPC Access Connector を指定し、Public IP を使う場合は Cloud SQL Auth Proxy（`--add-cloudsql-instances`）を設定してください。

### GitHub Actions による自動デプロイ

main ブランチへ push されたときに GitHub Actions がビルドと Cloud Run デプロイを実行します（`.github/workflows/ci.yml`）。以下の Secrets / Variables をリポジトリに登録してください。

| 名前 | 必須 | 説明 |
| ---- | ---- | ---- |
| `GCP_SERVICE_ACCOUNT_KEY` | ✅ | `cloud-run-sa` などデプロイ権限を持つサービスアカウントの JSON キー |
| `GCP_PROJECT_ID` | ✅ | 例: `mogufinder` |
| `GCP_REGION` | ✅ | 例: `asia-northeast2` |
| `CLOUD_RUN_SERVICE` | ✅ | 例: `mogufinder-api` |
| `ARTIFACT_REPOSITORY` | ✅ | Artifact Registry のリポジトリ名（例: `mogu-finder-image`） |
| `CLOUD_SQL_CONNECTION` | ✅ | 例: `mogufinder:asia-northeast2:mogufinder-db` |
| `DATABASE_URL` | 任意 | 直接接続する場合の接続文字列。Cloud SQL Proxy を使う場合は空でも可 |
| `DB_USER` / `DB_NAME` / `DB_HOST` / `DB_SSL` / `DB_SSL_STRICT` / `DB_MAX_CONNECTIONS` | 任意 | 未設定時はスクリプト側のデフォルトを利用 |
| `DB_PASSWORD_SECRET` | 任意 | Secret Manager の指定 (`secret-name:latest`) を `gcloud run deploy --set-secrets` に付与 |
| `CLOUD_RUN_IMAGE_NAME` | 任意 | イメージ名を変えたい場合（デフォルトは `mogufinder-apiatest`） |
| `CLOUD_RUN_SERVICE_ACCOUNT` | 任意 | Cloud Run 実行時に使うサービスアカウント。未指定なら `cloud-run-sa@<PROJECT_ID>.iam.gserviceaccount.com` |
| `VPC_CONNECTOR` / `VPC_EGRESS` | 任意 | Serverless VPC Access を利用する場合に指定 |

Workflow 内では `scripts/build-and-push.sh` と `scripts/deploy-cloud-run.sh` を呼び出しています。ローカルでも同じスクリプトを使えば手作業と CI/CD の整合性を保てます。

## Notes
- Node は 22 LTS 固定（10/21/2025 までは現行 LTS）。Node 24 LTS 昇格後に上げる場合は `engines` と CI の node-version を更新してください。
- Tailwind v4 はゼロコンフィグ。必要があれば `tailwind.config.ts` を追加可能です。
- API 関数は Fetch Web 標準の `GET/POST/PATCH` エクスポートで実装し、Drizzle を通じて Postgres を更新します。
