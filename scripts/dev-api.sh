#!/usr/bin/env bash
set -euo pipefail

ARGS=(dev --listen 0.0.0.0:3000 --yes)

auth_file="${VERCEL_AUTH_FILE:-/root/.vercel/auth.json}"

if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  exec vercel "${ARGS[@]}" --token "${VERCEL_TOKEN}"
fi

if [[ ! -s "${auth_file}" ]]; then
  cat <<'EOF'
[vercel dev] 認証情報が見つかりません。以下のいずれかを実施してください:
  1. `.env` に `VERCEL_TOKEN=<your-token>` を設定し、再度 `task dev` を実行
  2. `task shell` でコンテナに入って `vercel login` を実行

※ ログイン済みの場合は `/root/.vercel/auth.json` が作成されます。
EOF
  exit 1
fi

exec vercel "${ARGS[@]}"
