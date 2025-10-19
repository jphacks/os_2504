import { useEffect, useState } from 'react';
import type { RestaurantDetail, RestaurantReview } from '../../../lib/types';
import { buttonMuted, buttonSecondary } from '../../../lib/ui';

interface Props {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  detail: RestaurantDetail | null;
  reviews: RestaurantReview[];
  onClose: () => void;
}

export function RestaurantDetailPanel({ isOpen, isLoading, error, detail, reviews, onClose }: Props) {
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    setPhotoIndex(0);
  }, [detail?.place_id]);

  if (!isOpen) return null;

  const photos = detail?.photo_urls ?? [];
  const hasPhotos = photos.length > 0;
  const showControls = photos.length > 1;
  const currentPhoto = hasPhotos ? photos[photoIndex] : '';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6 pt-12">
      <div className="relative flex w-full max-w-[440px] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
        <button
          type="button"
          className="absolute right-4 top-4 rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-[#EB8D00] shadow"
          onClick={onClose}
        >
          閉じる
        </button>

        {isLoading && (
          <div className="flex flex-1 items-center justify-center px-6 py-24 text-sm text-[#5D5D5D]">
            詳細を読み込み中です…
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-1 items-center justify-center px-6 py-24 text-sm text-[#B42318]">
            {error}
          </div>
        )}

        {!isLoading && !error && detail && (
          <div className="max-h-[86vh] overflow-y-auto">
            <div className="relative bg-[#FFF4C6]">
              {hasPhotos ? (
                <img src={currentPhoto} alt={detail.name} className="h-[240px] w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-[240px] items-center justify-center text-sm text-[#5D5D5D]">
                  画像は準備中です
                </div>
              )}

              {showControls && (
                <>
                  <button
                    type="button"
                    className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_8px_16px_rgba(0,0,0,0.18)] transition-colors hover:bg-[#FFF4C6]"
                    onClick={() => setPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)}
                    aria-label="前の画像"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.5 5L7.5 10L12.5 15" stroke="#1D1B20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_8px_16px_rgba(0,0,0,0.18)] transition-colors hover:bg-[#FFF4C6]"
                    onClick={() => setPhotoIndex((prev) => (prev + 1) % photos.length)}
                    aria-label="次の画像"
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
                        className={`h-2.5 rounded-full transition-all ${index === photoIndex ? 'w-3 bg-white' : 'w-2.5 bg-white/70'}`}
                        aria-label={`画像${index + 1}枚目を見る`}
                        onClick={() => setPhotoIndex(index)}
                      />
                    ))}
                  </div>
                </>
              )}

              {hasPhotos && (
                <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/90 px-4 py-1 text-xs font-bold text-[#1D1B20]">
                  {photoIndex + 1}/{photos.length}
                </div>
              )}

              <div className="absolute right-5 top-[140px] flex flex-col gap-2">
                {detail.phone_number && (
                  <a
                    href={`tel:${detail.phone_number}`}
                    className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#FF8B8B] text-white shadow-[0_6px_12px_rgba(255,139,139,0.4)]"
                    aria-label="電話する"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M6.62 10.79C8.06 13.62 10.38 15.94 13.21 17.38L15.41 15.18C15.69 14.9 16.11 14.82 16.47 14.95C17.52 15.34 18.66 15.55 19.83 15.55C20.46 15.55 21 16.09 21 16.72V20.5C21 21.13 20.46 21.67 19.83 21.67C10.61 21.67 3 14.06 3 4.83C3 4.2 3.54 3.66 4.17 3.66H7.95C8.58 3.66 9.12 4.2 9.12 4.83C9.12 6 9.33 7.14 9.72 8.19C9.85 8.55 9.77 8.97 9.49 9.25L7.29 11.45L6.62 10.79Z"
                        fill="white"
                      />
                    </svg>
                  </a>
                )}
                {detail.website && (
                  <a
                    href={detail.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#FF8B8B] text-white shadow-[0_6px_12px_rgba(255,139,139,0.4)]"
                    aria-label="公式サイトを開く"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M10 17L15 12L10 7"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>
                )}
                {detail.google_maps_url && (
                  <a
                    href={detail.google_maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#FF8B8B] text-white shadow-[0_6px_12px_rgba(255,139,139,0.4)]"
                    aria-label="地図を開く"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 21C12 21 5 13.85 5 9C5 6.79086 5.84285 4.67157 7.34315 3.17157C8.84344 1.67157 10.9627 0.828613 13.1719 0.828613C15.381 0.828613 17.5003 1.67157 19.0006 3.17157C20.5009 4.67157 21.3437 6.79086 21.3437 9C21.3437 13.85 14.3437 21 14.3437 21H12Z"
                        fill="white"
                      />
                    </svg>
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-6 px-6 py-8">
              <header className="space-y-2 text-left">
                <h3 className="text-[20px] font-bold text-[#1D1B20]">{detail.name}</h3>
                {detail.summary_simple && (
                  <p className="text-[13px] leading-relaxed text-[#5D5D5D]">{detail.summary_simple}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#5D5D5D]">
                  {detail.rating !== null && (
                    <span className="rounded-full bg-[#FFE7DF] px-3 py-1 font-bold text-[#EB8D00]">
                      ★ {detail.rating.toFixed(1)}
                    </span>
                  )}
                  {detail.user_ratings_total !== null && <span>{detail.user_ratings_total} 件のレビュー</span>}
                  {detail.types?.slice(0, 3).map((type) => (
                    <span key={type} className="rounded-full bg-[#EDECEC] px-3 py-1 font-bold text-[#4A4A4A]">
                      {type}
                    </span>
                  ))}
                </div>
              </header>

              {detail.address && (
                <div className="flex items-start gap-3 rounded-[20px] bg-[#FFF4C6] px-5 py-4 text-sm text-[#1D1B20]">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-1 flex-shrink-0">
                    <path
                      d="M10 11.6667C11.3807 11.6667 12.5 10.5474 12.5 9.16667C12.5 7.78596 11.3807 6.66667 10 6.66667C8.61929 6.66667 7.5 7.78596 7.5 9.16667C7.5 10.5474 8.61929 11.6667 10 11.6667Z"
                      fill="#EB8D00"
                    />
                    <path
                      d="M10 1.66669C6.31812 1.66669 3.33337 4.65144 3.33337 8.33335C3.33337 11.3167 5.70004 14.8834 10.4334 19.0334C10.7684 19.3275 11.2317 19.3275 11.5667 19.0334C16.3 14.8834 18.6667 11.3167 18.6667 8.33335C18.6667 4.65144 15.6819 1.66669 12 1.66669H10Z"
                      stroke="#EB8D00"
                      strokeWidth="1.3"
                    />
                  </svg>
                  <div>
                    <p className="text-xs font-bold text-[#EB8D00]">住所</p>
                    <p className="mt-1 text-sm text-[#333]">{detail.address}</p>
                  </div>
                </div>
              )}

              {detail.opening_hours?.weekday_text && detail.opening_hours.weekday_text.length > 0 && (
                <div className="rounded-[20px] bg-[#E8F8ED] px-5 py-4 text-sm text-[#0F7A39]">
                  <p className="font-bold">営業時間</p>
                  <ul className="mt-2 space-y-1">
                    {detail.opening_hours.weekday_text.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.summary_detail && (
                <div className="rounded-[20px] border border-[#FFD59A] bg-[#FFF9E0] px-5 py-4 text-sm leading-relaxed text-[#5D5D5D] whitespace-pre-line">
                  {detail.summary_detail}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-[#1D1B20]">レビュー</h4>
                  {detail.google_maps_url && (
                    <a
                      href={detail.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className={`${buttonSecondary} px-4 py-1 text-xs`}
                    >
                      Googleで読む
                    </a>
                  )}
                </div>
                {reviews.length === 0 && (
                  <p className="rounded-[16px] bg-[#FFF4C6] px-4 py-3 text-xs text-[#5D5D5D]">
                    まだレビューがありません。
                  </p>
                )}
                {reviews.map((review) => (
                  <article key={review.id} className="space-y-2 rounded-[20px] border border-[#E4E4E4] px-5 py-4">
                    <header className="flex items-center justify-between text-xs text-[#5D5D5D]">
                      <span className="font-bold text-[#1D1B20]">{review.author_name ?? '匿名'}</span>
                      <span className="flex gap-3">
                        {review.rating !== null && <span>★ {review.rating.toFixed(1)}</span>}
                        {review.time && <span>{new Date(review.time).toLocaleString()}</span>}
                      </span>
                    </header>
                    {review.text && (
                      <p className="text-sm leading-relaxed text-[#333] whitespace-pre-line">{review.text}</p>
                    )}
                  </article>
                ))}
              </div>

              <div className="pt-2 text-right">
                <button type="button" className={`${buttonMuted} px-5 py-2 text-xs`} onClick={onClose}>
                  戻る
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
