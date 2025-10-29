# テーブル定義

本アプリのグループ機能は MySQL で永続化する。文字コードは UTF8MB4、タイムゾーンは UTC を前提とする。

## groups

| 列名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | VARCHAR(32) | PK | 招待リンクなどで利用するグループID |
| group_name | VARCHAR(50) | NULL 可 | グループ名（任意入力） |
| organizer_id | VARCHAR(64) | NOT NULL | グループ作成者のメンバーID |
| latitude | DOUBLE | NOT NULL | 検索基準となる緯度 |
| longitude | DOUBLE | NOT NULL | 検索基準となる経度 |
| radius | INT | NOT NULL | Google Places 検索半径（メートル単位） |
| min_price | TINYINT | NULL 可 | Places API の `minprice`（0〜4） |
| max_price | TINYINT | NULL 可 | Places API の `maxprice`（0〜4） |
| types | JSON | NULL 可 | レストラン種別の配列（例: `["restaurant","cafe"]`） |
| status | VARCHAR(20) | NOT NULL, default `'voting'` | グループ状態。`voting` / `finished` を保持 |
| created_at | DATETIME | NOT NULL, default CURRENT_TIMESTAMP | 作成日時（UTC） |

**インデックス・備考**
- 主キー `PRIMARY KEY (id)`
- 検索条件や状態管理はアプリケーションコード側で実施する

## group_members

| 列名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT | PK, AUTO_INCREMENT | 内部識別子 |
| group_id | VARCHAR(32) | NOT NULL, FK -> groups.id ON DELETE CASCADE | 紐付くグループID |
| member_id | VARCHAR(64) | NOT NULL | 参加者のメンバーID |
| joined_at | DATETIME | NOT NULL, default CURRENT_TIMESTAMP | 参加日時（UTC） |

**インデックス・備考**
- ユニーク制約 `UNIQUE KEY uq_group_member (group_id, member_id)`
- `KEY idx_group_members_group_id (group_id)`

## group_restaurants

| 列名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT | PK, AUTO_INCREMENT | 内部識別子 |
| group_id | VARCHAR(32) | NOT NULL, FK -> groups.id ON DELETE CASCADE | 紐付くグループID |
| place_id | VARCHAR(128) | NOT NULL | Google Place の ID |
| position | INT | NOT NULL | レストラン候補の表示順 |
| name | VARCHAR(255) | NOT NULL | 店名 |
| address | VARCHAR(255) | NULL 可 | 住所 |
| rating | DOUBLE | NULL 可 | Google 評価 |
| price_level | TINYINT | NULL 可 | Google price_level |
| photo_url | TEXT | NULL 可 | 代表写真の URL |
| photo_urls | JSON | NULL 可 | 最大5件の写真 URL 配列 |
| lat | DOUBLE | NOT NULL | 店舗緯度 |
| lng | DOUBLE | NOT NULL | 店舗経度 |
| types | JSON | NULL 可 | Google types 配列 |
| reviews | JSON | NULL 可 | 取得したレビュー配列（author, rating, text, time） |
| phone_number | VARCHAR(64) | NULL 可 | 電話番号 |
| website | VARCHAR(255) | NULL 可 | 公式サイト URL |
| google_maps_url | VARCHAR(255) | NULL 可 | Google Maps URL |
| user_ratings_total | INT | NULL 可 | 総レビュー件数 |
| opening_hours | JSON | NULL 可 | `opening_hours` オブジェクト |
| summary | TEXT | NULL 可 | AI による要約 |

**インデックス・備考**
- ユニーク制約 `UNIQUE KEY uq_group_restaurant (group_id, place_id)`
- `KEY idx_group_restaurants_group_id (group_id)`
- JSON カラムには UTF8MB4 でシリアライズした配列/オブジェクトを保存する

## group_votes

| 列名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT | PK, AUTO_INCREMENT | 内部識別子 |
| group_id | VARCHAR(32) | NOT NULL, FK -> groups.id ON DELETE CASCADE | 紐付くグループID |
| member_id | VARCHAR(64) | NOT NULL | 投票したメンバーID |
| place_id | VARCHAR(128) | NOT NULL | 対象レストランの Place ID |
| value | VARCHAR(10) | NOT NULL | 投票値。`like` もしくは `dislike` |
| created_at | DATETIME | NOT NULL, default CURRENT_TIMESTAMP | 投票日時（UTC） |

**インデックス・備考**
- ユニーク制約 `UNIQUE KEY uq_group_vote (group_id, member_id, place_id)`
- `KEY idx_group_votes_group_id (group_id)`
- `value` の許容値はアプリケーションでバリデーションする

## リレーションまとめ
- `groups` 1 : n `group_members`
- `groups` 1 : n `group_restaurants`
- `groups` 1 : n `group_votes`
- すべての子テーブルは `ON DELETE CASCADE` により、グループ削除で関連データも自動削除される

