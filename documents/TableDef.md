# テーブルの定義
User :
    id, PK
    google_sub, unique
    email, unique
    name, not null
    created_at, not null
    updated_at, not null

Setting :
    id, PK
    user_id, FK -> User.id, unique, not null
    latitude, not null (default: 東京都の緯度)
    longitude, not null (default: 東京都の経度)
    radius, not null (default: 1000)
    min_price_level, not null (default: 1)
    max_price_level, not null (default: 4)
    types, not null