# DBテーブル

### Room

| カラム名 | 型 | 制約 | 備考 |
| --- | --- | --- | --- |
| id | UUID | PK |  |
| room_name | str | NN |  |
| room_url | str | NN | roomから生成 |
| status | Enum | NN | waiting, voting (準備中、投票受付中) |

### Setting

| カラム名 | 型 | 制約 | 備考 |
| --- | --- | --- | --- |
| room_id | UUID | PK, FK : Room.id |  |
| radius | float | NN, default = 3.0 | km |
| latitude | float | NN, default 東京千代田区 |  |
| longitude | float | NN, defalut 東京千代田区 |  |
| min_price_level | int | NN |  |
| max_price_level | int | NN |  |

### Member

| カラム名 | 型 | 制約 | 備考 |
| --- | --- | --- | --- |
| room_id | UUID | PK : Room.id, NN |  |
| member_name | str | NN |  |
| id | UUID | PK, NN |  |

制約の詳細、Memberはid, room_idによる複合主キー

### Like

| カラム名 | 型 | 制約 | 備考 |
| --- | --- | --- | --- |
| member_id | UUID | FK : Member.id, NN |  |
| place_id | str | FK : Restaurant.id, NN |  |
| room_id | UUID | FK : Room.id |  |
| is_liked | bool | NN |  |

別ルームへの誤投票を防ぐため、**Like テーブルに `room_id` を追加**し、

- `UNIQUE(room_id, member_id, place_id)`
- `FK (room_id, member_id) → Member(room_id, id)`
- `FK (room_id, place_id) → Room_Restaurant(room_id, place_id)`
を付与（API も `room_code`/`room_id` を必須にして常に同一ルームで完結させる）。

### Room_Restaurant

RoomとRestaurantの中間テーブル

| カラム名 | 型 | 制約 | 備考 |
| --- | --- | --- | --- |
| room_id | UUID | PK : Room.id, NN |  |
| place_id | str | PK : Restaurant.id, NN |  |

制約の詳細：Room_Restaurantはroom_idとplace_idの複合主キー

### Restaurant

| カラム名 | 型 | 制約 | 備考 |
| --- | --- | --- | --- |
| place_id | str | PK |  |
| name | str | NN |  |
| address | str |  |  |
| rating | float |  |  |
| photo_urls | List[str] |  | 写真のurls |
| latitude | float | NN |  |
| longitude | float | NN |  |
| types | List[str] |  | お店カテゴリ保存 |
| phone_number | str |  |  |
| website | str |  |  |
| google_maps_url | str |  |  |
| user_ratings_total | int |  | ユーザのレビュー数 |
| opening_hours | Dict  |  | 営業時間保存用 |
| summary_simple | str |  | スワイプ時のレビュー保存場所 |
| summary_detail | str |  | 詳細ページのレビュー保存場所 |

### Rating

レビュー5件保存場所

| カラム名 | 型 | 制約 | 備考 |
| --- | --- | --- | --- |
| id | UUID | PK |  |
| place_id | str | FK : Restaurant.id, NN |  |
| author_name | str |  |  |
| rating | int |  |  |
| text | str |  |  |
| time | datetime |  |  |