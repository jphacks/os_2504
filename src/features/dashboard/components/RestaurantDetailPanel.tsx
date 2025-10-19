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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6 pt-12">
      <div className="relative flex w-full max-w-[420px] flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
        <button
          type="button"
          className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#EB8D00] shadow"
          onClick={onClose}
        >
          閉じる
        </button>

        {isLoading && (
          <div className="flex flex-1 items-center justify-center px-6 py-20 text-sm text-[#5D5D5D]">
            詳細を読み込み中です…
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-1 items-center justify-center px-6 py-20 text-sm text-[#B42318]">
            {error}
          </div>
        )}

        {!isLoading && !error && detail && (
          <div className="max-h-[85vh] overflow-y-auto">
            {detail.photo_urls[0] && (
              <img
                src={detail.photo_urls[0]}
                alt={detail.name}
                className="h-[220px] w-full object-cover"
                loading="lazy"
              />
            )}

            <div className="space-y-5 px-6 py-6">
              <div className="space-y-2 text-left">
                <h3 className="text-xl font-bold text-[#1D1B20]">{detail.name}</h3>
                {detail.summary_simple && (
                  <p className="text-sm leading-relaxed text-[#5D5D5D]">{detail.summary_simple}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#5D5D5D]">
                  {detail.rating !== null && (
                    <span className="rounded-full bg-[#FFE7DF] px-3 py-1 font-bold text-[#EB8D00]">
                      ★ {detail.rating.toFixed(1)}
                    </span>
                  )}
                  {detail.user_ratings_total !== null && <span>{detail.user_ratings_total} 件のレビュー</span>}
                  {detail.types?.slice(0, 3).map((type) => (
                    <span key={type} className="rounded-full bg-[#EDECEC] px-3 py-1 font-bold">
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              {detail.address && (
                <div className="rounded-[16px] bg-[#FFF4C6] p-4 text-sm text-[#1D1B20]">
                  <p className="font-bold text-[#EB8D00]">住所</p>
                  <p className="mt-1 text-[#333]">{detail.address}</p>
                </div>
              )}

              {(detail.phone_number || detail.website || detail.google_maps_url) && (
                <div className="flex flex-wrap gap-3">
                  {detail.phone_number && (
                    <a href={`tel:${detail.phone_number}`} className={`${buttonSecondary} px-4 py-2 text-xs`}>
                      電話する
                    </a>
                  )}
                  {detail.website && (
                    <a
                      href={detail.website}
                      target="_blank"
                      rel="noreferrer"
                      className={`${buttonMuted} px-4 py-2 text-xs`}
                    >
                      公式サイト
                    </a>
                  )}
                  {detail.google_maps_url && (
                    <a
                      href={detail.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className={`${buttonMuted} px-4 py-2 text-xs`}
                    >
                      Google Maps
                    </a>
                  )}
                </div>
              )}

              {detail.opening_hours?.weekday_text && detail.opening_hours.weekday_text.length > 0 && (
                <div className="rounded-[16px] bg-[#E8F8ED] p-4 text-sm text-[#0F7A39]">
                  <p className="font-bold">営業時間</p>
                  <ul className="mt-2 space-y-1">
                    {detail.opening_hours.weekday_text.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#1D1B20]">レビュー</h4>
                {reviews.length === 0 && (
                  <p className="rounded-[12px] bg-[#FFF4C6] px-4 py-3 text-xs text-[#5D5D5D]">
                    まだレビューがありません。
                  </p>
                )}
                {reviews.map((review) => (
                  <article key={review.id} className="space-y-2 rounded-[16px] border border-[#E4E4E4] px-4 py-3">
                    <header className="flex items-center justify-between text-xs text-[#5D5D5D]">
                      <span className="font-bold text-[#1D1B20]">{review.author_name ?? '匿名'}</span>
                      <span className="flex gap-2">
                        {review.rating !== null && <span>★ {review.rating.toFixed(1)}</span>}
                        {review.time && <span>{new Date(review.time).toLocaleString()}</span>}
                      </span>
                    </header>
                    {review.text && <p className="text-sm leading-relaxed text-[#333] whitespace-pre-line">{review.text}</p>}
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
