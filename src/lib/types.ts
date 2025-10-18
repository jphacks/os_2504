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
