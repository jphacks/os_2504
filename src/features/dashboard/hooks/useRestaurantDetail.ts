import { useCallback, useState } from 'react';
import { api } from '../../../lib/api';
import type { RestaurantDetail, RestaurantReview } from '../../../lib/types';

interface UseRestaurantDetailState {
  selectedPlaceId: string | null;
  detail: RestaurantDetail | null;
  reviews: RestaurantReview[];
  isLoading: boolean;
  error: string | null;
}

interface UseRestaurantDetailReturn extends UseRestaurantDetailState {
  loadDetail: (placeId: string) => Promise<void>;
  reset: () => void;
}

export function useRestaurantDetail(): UseRestaurantDetailReturn {
  const [state, setState] = useState<UseRestaurantDetailState>({
    selectedPlaceId: null,
    detail: null,
    reviews: [],
    isLoading: false,
    error: null,
  });

  const loadDetail = useCallback(async (placeId: string) => {
    setState((prev) => ({ ...prev, selectedPlaceId: placeId, isLoading: true, error: null }));
    try {
      const [detailRes, reviewsRes] = await Promise.all([
        api<{ ok: boolean; data: RestaurantDetail }>(`/api/restaurants/${placeId}`),
        api<{ ok: boolean; data: RestaurantReview[] }>(`/api/restaurants/${placeId}/reviews`),
      ]);

      setState({
        selectedPlaceId: placeId,
        detail: detailRes.ok ? detailRes.data : null,
        reviews: reviewsRes.ok ? reviewsRes.data : [],
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState({
        selectedPlaceId: placeId,
        detail: null,
        reviews: [],
        isLoading: false,
        error: (error as Error).message,
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ selectedPlaceId: null, detail: null, reviews: [], isLoading: false, error: null });
  }, []);

  return {
    ...state,
    loadDetail,
    reset,
  };
}
