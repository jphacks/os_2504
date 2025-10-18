# MogFinder API ステータス概況

## 1. 現在実装済みの機能

| カテゴリ | エンドポイント | 主な機能 | 備考 |
| --- | --- | --- | --- |
| ルーム | `POST /rooms` | ルーム作成＋準備ジョブ起動 | 作成直後に `status=waiting`、サンプル候補の非同期準備を開始 |
|  | `PATCH /rooms/{room_code}/settings` | 検索条件の更新と再準備 | 値変更時は `waiting` に戻り再準備をキューイング |
|  | `GET /rooms/{room_code}` | 共有情報・準備進捗の取得 | `preparation.progress / preparedCount / expectedCount` を返却 |
| メンバー | `GET /rooms/{room_code}/members` | メンバー一覧 | UI で選択肢として利用 |
|  | `POST /rooms/{room_code}/members` | メンバー追加 | 名前のみで登録 |
|  | `POST /rooms/{room_code}/members/{member_id}/session` | メンバートークン発行 | JWT 形式、投票 API で必須 |
| 候補カード | `GET /rooms/{room_code}/restaurants` | 投票カード取得 | `status=voting` 時のみ 200、`waiting` は 425 `ROOM_NOT_READY` |
| 投票 | `POST /rooms/{room_code}/likes` | いいね／良くないね記録 | `Authorization: Bearer <member_token>` が必須 |
|  | `GET /rooms/{room_code}/likes` | 投票一覧 | `member_id`／`place_id` フィルタ対応 |
|  | `DELETE /rooms/{room_code}/likes/{member_id}` | 指定メンバーの投票初期化 | `deleted_count` を返却 |
| 集計 | `GET /rooms/{room_code}/ranking` | ランキング取得 | `score = likes - dislikes`、同点は評価順 |
| 店舗詳細 | `GET /restaurants/{place_id}` | 店舗詳細の取得 | 住所・営業時間・評価など DB から返却 |
|  | `GET /restaurants/{place_id}/reviews` | レビュー一覧 | サンプルデータではレビュー ID・本文を返却 |

- サンプルデータは `task db:seed` で投入可能。`GET /restaurants/*` 系も seed 済みのモックデータに対応。
- `pnpm test:api`（または `task test:api`）で統合テストを自動実行。

## 2. 今後の実装予定・拡張

| 項目 | 概要 | 参考ドキュメント |
| --- | --- | --- |
| API バリデーション強化 | `server/routes/rooms.ts` のリクエスト体裁を zod 等で検証し `error.details` を充実させる | docs/pre-db-development-plan.md (M3.1) |
| 候補準備ジョブの高度化 | `schedulePreparation` のサービス化、再準備時のキャンセル・ログ出力、将来のキュー導入への布石 | docs/pre-db-development-plan.md (M3.2) |
| ランキング UX 強化 | 投票済みリスト表示、ランキングポーリング、トースト通知など UI 連動の改善 | docs/pre-db-development-plan.md (M3.2) |
| ログ／監視 | room_code・member_id を含む構造化ログ、運用時の監視基盤との連携 | docs/pre-db-development-plan.md (M3.2) |
| API テストの CI 化 | 既に GitHub Actions へ組み込み済み。今後は E2E (Playwright) の自動実行導入を検討 | .github/workflows/ci.yml |
| Places / LLM 実データ連携 | Google Places 取得・要約生成（LLM）を実装し、現在のモックを置換 | docs/sequence.md, docs/API.md セクション7 |
| Repository 抽象化 | Drizzle リポジトリをファイル分割し、将来の差し替えを容易にする | docs/pre-db-development-plan.md (M3.3) |
| マイグレーション運用 | `drizzle-kit` での SQL 出力、Cloud SQL 反映手順の整理 | docs/pre-db-development-plan.md (M3.3) |
| パフォーマンス／負荷試験 | k6 等のロードテスト雛形を `scripts/loadtest` に配置し、API のボトルネック確認 | docs/pre-db-development-plan.md (M3.3) |

## 3. 関連コマンド

| コマンド | 用途 |
| --- | --- |
| `task db:seed` | サンプルレストラン・レビューを DB に投入 |
| `task test:api` | PostgreSQL を起動した上で API 統合テストを実行 |
| `task test:e2e` | Playwright ベースの E2E テスト（事前に `task dev` でアプリ起動） |

本メモは `docs/API-status.md` として随時更新してください。API の契約詳細は `docs/API.md`、今後の工程・ロードマップは `docs/pre-db-development-plan.md` も参照を推奨します。
