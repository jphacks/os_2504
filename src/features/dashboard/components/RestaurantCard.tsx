import type { Restaurant } from '../../../lib/types';
import { buttonDanger, buttonMuted, buttonSecondary } from '../../../lib/ui';

interface Props {
  restaurant: Restaurant;
  onLike: (placeId: string) => void;
  onDislike: (placeId: string) => void;
  onDetail: (placeId: string) => void;
}

export function RestaurantCard({ restaurant, onLike, onDislike, onDetail }: Props) {
  return (
    <article className="restaurant-card">
      <div>
        <h3>{restaurant.name}</h3>
        <p>{restaurant.summary_simple}</p>
      </div>
      {restaurant.photo_urls[0] && (
        <img
          src={restaurant.photo_urls[0]}
          alt={restaurant.name}
          className="restaurant-card__image"
          loading="lazy"
        />
      )}
      <div className="restaurant-card__meta">
        <span>★ {restaurant.rating.toFixed(1)}</span>
        <span>{restaurant.user_ratings_total} 件</span>
      </div>
      <div className="restaurant-card__actions">
        <button className={buttonSecondary} onClick={() => onDislike(restaurant.place_id)}>
          良くないね
        </button>
        <button className={buttonDanger} onClick={() => onLike(restaurant.place_id)}>
          いいね
        </button>
        <button className={buttonMuted} onClick={() => onDetail(restaurant.place_id)}>
          詳細
        </button>
      </div>
    </article>
  );
}
