import axios from 'axios'

import type {
  Restaurant,
  RestaurantSearchParams,
  RestaurantSummaryResponse,
  Review,
  SummaryFormat,
} from '../../types'

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8001'

const defaultConfig = {
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
} as const

export const searchRestaurants = async (
  preferences: RestaurantSearchParams,
): Promise<Restaurant[]> => {
  const response = await axios.post<Restaurant[]>('/api/restaurants/search', preferences, defaultConfig)
  return response.data
}

export const getRestaurantDetails = async (placeId: string): Promise<Restaurant> => {
  const response = await axios.get<Restaurant>(`/api/restaurants/${placeId}`, defaultConfig)
  return response.data
}

export const summarizeRestaurant = async (
  restaurantName: string,
  reviews: Review[],
  format: SummaryFormat = 'card',
): Promise<string> => {
  const response = await axios.post<RestaurantSummaryResponse>(
    '/api/restaurants/summarize',
    {
      restaurant_name: restaurantName,
      reviews,
      format,
    },
    defaultConfig,
  )
  return response.data.summary
}
