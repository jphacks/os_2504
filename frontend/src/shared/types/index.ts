export interface Coordinates {
  latitude: number
  longitude: number
}

export interface StoredPreferences {
  radius: number
  min_price: number
  max_price: number
  cuisine: string
}

export interface RestaurantSearchParams extends StoredPreferences {
  latitude: number
  longitude: number
}

export interface GroupPreferences {
  latitude: number
  longitude: number
  radius: number
  min_price: number
  max_price: number
  types?: string[]
}

export interface GroupCreateParams extends GroupPreferences {
  group_name?: string | null
}

export interface GroupCreateResponse {
  group_id: string
  invite_url: string
  organizer_id: string
  organizer_join_url: string
  group_name?: string | null
}

export interface GroupInfo {
  group_id: string
  status: string
  organizer_id: string
  members: string[]
  created_at: string
  preferences: GroupPreferences
  group_name?: string | null
}

export type VoteValue = 'like' | 'dislike'

export interface GroupVoteRequest {
  candidate_id: string
  value: VoteValue
}

export interface CandidateResultSummary {
  restaurant: Restaurant
  score: number
  likes: number
  dislikes: number
}

export interface GroupResultsResponse {
  group_id: string
  status: string
  results: CandidateResultSummary[]
}

export interface Review {
  author_name: string
  rating: number
  text: string
  time: string
}

export interface OpeningHoursPeriodBoundary {
  day?: number
  time?: string
}

export interface OpeningHoursPeriod {
  open?: OpeningHoursPeriodBoundary
  close?: OpeningHoursPeriodBoundary
}

export interface OpeningHours {
  open_now?: boolean
  weekday_text?: string[]
  periods?: OpeningHoursPeriod[]
  [key: string]: unknown
}

export interface Restaurant {
  place_id: string
  name: string
  address: string
  lat: number
  lng: number
  types: string[]
  rating?: number | null
  price_level?: number | null
  photo_url?: string | null
  photo_urls?: string[]
  reviews?: Review[]
  phone_number?: string | null
  website?: string | null
  google_maps_url?: string | null
  user_ratings_total?: number | null
  opening_hours?: OpeningHours | null
  summary?: string | null
}

export interface RestaurantSummaryResponse {
  summary: string
}

export type SummaryFormat = 'card' | 'detail'
