export type RoomStatus = 'waiting' | 'voting';
export type StepId = 'create' | 'members' | 'voting';

export type RoomSummary = {
  room_code: string;
  room_name: string;
  share_url: string;
  status: RoomStatus;
  preparation: { progress: number; preparedCount: number; expectedCount: number };
};

export type Member = { member_id: string; member_name: string };

export type Restaurant = {
  place_id: string;
  name: string;
  summary_simple: string;
  rating: number;
  user_ratings_total: number;
  photo_urls: string[];
  types?: string[];
};

export type RestaurantDetail = {
  place_id: string;
  name: string;
  address: string | null;
  summary_simple: string | null;
  summary_detail: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  photo_urls: string[];
  types?: string[];
  google_maps_url: string | null;
  phone_number: string | null;
  website: string | null;
  opening_hours?: { weekday_text?: string[] } | null;
};

export type RestaurantReview = {
  id: string;
  author_name: string | null;
  rating: number | null;
  text: string | null;
  time: string | null;
};

export type RankingItem = {
  rank: number;
  place_id: string;
  name: string;
  score: number;
  like_count: number;
  dislike_count: number;
  rating: number;
  user_ratings_total: number;
  google_maps_url: string;
};
