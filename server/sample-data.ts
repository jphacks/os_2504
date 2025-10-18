export interface SampleReview {
  author_name: string;
  rating: number;
  text: string;
  time: string;
}

export interface SampleRestaurant {
  place_id: string;
  name: string;
  address: string;
  rating: number;
  user_ratings_total: number;
  photo_urls: string[];
  types: string[];
  latitude: number;
  longitude: number;
  summary_simple: string;
  summary_detail: string;
  google_maps_url: string;
  phone_number?: string;
  website?: string;
  opening_hours?: Record<string, unknown>;
  reviews?: SampleReview[];
}

export const sampleRestaurants: SampleRestaurant[] = [
  {
    place_id: 'sample-izakaya-1',
    name: 'トリキン 神田店',
    address: '東京都千代田区内神田1-1-1',
    rating: 4.2,
    user_ratings_total: 230,
    photo_urls: ['https://picsum.photos/seed/izakaya1/640/480'],
    types: ['izakaya', 'japanese'],
    latitude: 35.691,
    longitude: 139.768,
    summary_simple: '焼き鳥が人気・0.3km',
    summary_detail: 'コスパの良い焼き鳥が楽しめる居酒屋。少人数の飲み会に最適。',
    google_maps_url: 'https://maps.google.com/?cid=sample-izakaya-1',
    phone_number: '03-1111-1111',
    website: 'https://torikin.example.jp',
    opening_hours: { weekday_text: ['Mon-Fri: 17:00-23:00', 'Sat-Sun: 16:00-22:00'] },
    reviews: [
      {
        author_name: '美優',
        rating: 5,
        text: '焼き鳥の種類が豊富でコスパ最高。幹事として毎回助かっています。',
        time: '2025-09-20T11:00:00Z',
      },
      {
        author_name: '陽介',
        rating: 4,
        text: '駅近で集合しやすい。少し騒がしいけど盛り上がる。',
        time: '2025-08-12T14:30:00Z',
      },
    ],
  },
  {
    place_id: 'sample-bistro-1',
    name: 'Bistro Sakura',
    address: '東京都千代田区鍛冶町2-2-2',
    rating: 4.5,
    user_ratings_total: 120,
    photo_urls: ['https://picsum.photos/seed/bistro1/640/480'],
    types: ['bistro', 'western'],
    latitude: 35.689,
    longitude: 139.77,
    summary_simple: '女子会向け・0.5km',
    summary_detail: 'ワインと創作料理が楽しめるビストロ。雰囲気重視の会におすすめ。',
    google_maps_url: 'https://maps.google.com/?cid=sample-bistro-1',
    phone_number: '03-2222-2222',
    website: 'https://bistro-sakura.example.jp',
    opening_hours: { weekday_text: ['Mon-Sun: 17:30-23:30'] },
    reviews: [
      {
        author_name: 'さき',
        rating: 5,
        text: '女子会で利用。ワインと前菜のペアリングが最高でリピート確定。',
        time: '2025-09-05T10:45:00Z',
      },
      {
        author_name: 'りょう',
        rating: 4,
        text: '少人数で落ち着いて話せる。メイン料理のポーションがやや少なめ。',
        time: '2025-07-28T09:20:00Z',
      },
    ],
  },
  {
    place_id: 'sample-ramen-1',
    name: '拉麺 龍神',
    address: '東京都千代田区外神田3-3-3',
    rating: 4.0,
    user_ratings_total: 540,
    photo_urls: ['https://picsum.photos/seed/ramen1/640/480'],
    types: ['ramen'],
    latitude: 35.7,
    longitude: 139.77,
    summary_simple: '深夜営業・1.0km',
    summary_detail: '濃厚魚介スープが人気のラーメン店。二次会の締めにもぴったり。',
    google_maps_url: 'https://maps.google.com/?cid=sample-ramen-1',
    phone_number: '03-3333-3333',
    website: 'https://ryujinramen.example.jp',
    opening_hours: { weekday_text: ['Mon-Sun: 11:00-02:00'] },
    reviews: [
      {
        author_name: 'しゅん',
        rating: 5,
        text: '〆の一杯に最高。魚介スープの旨味がクセになる。',
        time: '2025-08-30T15:15:00Z',
      },
      {
        author_name: '麻衣',
        rating: 3,
        text: '美味しいけど並ぶ。深夜帯は比較的空いているので狙い目。',
        time: '2025-07-10T13:05:00Z',
      },
    ],
  },
];
