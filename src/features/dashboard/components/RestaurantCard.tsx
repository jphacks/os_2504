import type { Restaurant } from '../../../lib/types';
import { buttonDanger, buttonMuted, buttonSecondary } from '../../../lib/ui';

interface Props {
  restaurant: Restaurant;
  onLike: (placeId: string) => void;
  onDislike: (placeId: string) => void;
  onDetail: (placeId: string) => void;
}

export function RestaurantCard({ restaurant, onLike, onDislike, onDetail }: Props) {
  const photoUrl = restaurant.photo_urls[0] ?? '';
  const tags = restaurant.types?.slice(0, 3) ?? [];

  return (
    <article className="overflow-hidden rounded-[20px] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
      <div className="relative h-[200px] w-full">
        {photoUrl ? (
          <img src={photoUrl} alt={restaurant.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#FFF4C6] text-sm text-[#5D5D5D]">
            画像は準備中です
          </div>
        )}
        <button
          type="button"
          className={`${buttonSecondary} absolute right-4 top-4 px-3 py-1 text-xs`}
          onClick={() => onDetail(restaurant.place_id)}
        >
          詳細を見る
        </button>
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#EB8D00]">
          ★ {restaurant.rating.toFixed(1)} / {restaurant.user_ratings_total}件
        </div>
      </div>

      <div className="space-y-4 px-5 py-6">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-[#1D1B20]">{restaurant.name}</h3>
          {restaurant.summary_simple && (
            <p className="text-sm leading-relaxed text-[#5D5D5D]">{restaurant.summary_simple}</p>
          )}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-[#5D5D5D]">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-[#EDECEC] px-3 py-1 font-bold">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            type="button"
            className={`${buttonMuted} w-full max-w-[140px] px-4 py-2 text-sm`}
            onClick={() => onDislike(restaurant.place_id)}
          >
            良くないね
          </button>
          <button
            type="button"
            className={`${buttonDanger} w-full max-w-[140px] px-4 py-2 text-sm`}
            onClick={() => onLike(restaurant.place_id)}
          >
            いいね
          </button>
        </div>
      </div>
    </article>
  );
}
