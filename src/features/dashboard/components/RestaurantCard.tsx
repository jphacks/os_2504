import { useState } from 'react';
import type { Restaurant } from '../../../lib/types';
import {
  buttonCircleNegative,
  buttonCirclePositive,
  buttonMuted,
  buttonSecondary,
} from '../../../lib/ui';

interface Props {
  restaurant: Restaurant;
  onLike: (placeId: string) => void;
  onDislike: (placeId: string) => void;
  onDetail: (placeId: string) => void;
}

export function RestaurantCard({ restaurant, onLike, onDislike, onDetail }: Props) {
  const photos = restaurant.photo_urls?.filter(Boolean) ?? [];
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const hasPhotos = photos.length > 0;
  const showControls = photos.length > 1;
  const currentPhoto = photos[currentPhotoIndex] ?? '';
  const tags = restaurant.types?.slice(0, 3) ?? [];

  const goPrev = () => {
    if (!showControls) return;
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const goNext = () => {
    if (!showControls) return;
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  return (
    <article className="overflow-hidden rounded-[24px] bg-white/95 shadow-[0_18px_36px_rgba(0,0,0,0.12)]">
      <div className="relative h-[210px] w-full bg-[#FFF4C6]">
        {hasPhotos ? (
          <img src={currentPhoto} alt={restaurant.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#5D5D5D]">
            画像は準備中です
          </div>
        )}

        {showControls && (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_8px_16px_rgba(0,0,0,0.15)] transition-colors hover:bg-[#FFF4C6]"
              onClick={goPrev}
              aria-label="前の写真"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.5 5L7.5 10L12.5 15" stroke="#1D1B20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_8px_16px_rgba(0,0,0,0.15)] transition-colors hover:bg-[#FFF4C6]"
              onClick={goNext}
              aria-label="次の写真"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.5 5L12.5 10L7.5 15" stroke="#1D1B20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
              {photos.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`h-2.5 rounded-full transition-all ${
                    index === currentPhotoIndex ? 'w-3 bg-white' : 'w-2.5 bg-white/70'
                  }`}
                  onClick={() => setCurrentPhotoIndex(index)}
                  aria-label={`写真${index + 1}枚目を見る`}
                />
              ))}
            </div>
          </>
        )}

        {hasPhotos && (
          <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-[16px] bg-white/90 px-3 py-1 text-xs font-bold text-[#1D1B20]">
            {currentPhotoIndex + 1}/{photos.length}
          </div>
        )}

        <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-4 py-1 text-xs font-bold text-[#EB8D00]">
          <span>★ {restaurant.rating.toFixed(1)}</span>
          <span>{restaurant.user_ratings_total} 件</span>
        </div>
      </div>

      <div className="space-y-4 px-6 py-6 text-left">
        <div className="space-y-3">
          <h3 className="text-[18px] font-bold text-[#1D1B20]">{restaurant.name}</h3>
          {restaurant.summary_simple && (
            <div className="rounded-[20px] border border-[#EB8D00]/30 bg-[#FFF4C6] px-4 py-3 text-[12px] leading-relaxed text-[#EB8D00]">
              {restaurant.summary_simple}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#5D5D5D]">
          <span className="rounded-full bg-[#FFE7DF] px-3 py-1 font-bold text-[#EB8D00]">
            レビュー {restaurant.user_ratings_total} 件
          </span>
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[#EDECEC] px-3 py-1 font-bold text-[#4A4A4A]">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className={`${buttonSecondary} px-4 py-2 text-sm`}
            onClick={() => onDetail(restaurant.place_id)}
          >
            詳細を見る
          </button>
          <button
            type="button"
            className={`${buttonMuted} px-4 py-2 text-sm`}
            onClick={() => onDetail(restaurant.place_id)}
          >
            レビューを確認
          </button>
        </div>
      </div>

      <footer className="flex items-center justify-center gap-12 px-6 pb-6">
        <button
          type="button"
          className={buttonCircleNegative}
          onClick={() => onDislike(restaurant.place_id)}
          aria-label="良くないね"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.5 7.5L7.5 16.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M7.5 7.5L16.5 16.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          className={buttonCirclePositive}
          onClick={() => onLike(restaurant.place_id)}
          aria-label="いいね"
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 20.5C11.8333 20.5 11.6667 20.4542 11.5 20.3625C8.33333 18.475 6 16.6 4.5 14.7375C3 12.875 2.25 10.95 2.25 8.9625C2.25 7.5375 2.721 6.3375 3.663 5.3625C4.605 4.3875 5.775 3.9 7.173 3.9C8.005 3.9 8.773 4.1125 9.477 4.5375C10.181 4.9625 10.75 5.55 11.184 6.3H12.816C13.25 5.55 13.819 4.9625 14.523 4.5375C15.227 4.1125 15.995 3.9 16.827 3.9C18.225 3.9 19.395 4.3875 20.337 5.3625C21.279 6.3375 21.75 7.5375 21.75 8.9625C21.75 10.95 21 12.875 19.5 14.7375C18 16.6 15.6667 18.475 12.5 20.3625C12.3333 20.4542 12.1667 20.5 12 20.5Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </footer>
    </article>
  );
}
