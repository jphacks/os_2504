import type { RestaurantDetail, RestaurantReview } from '../../../lib/types';
import { buttonSecondary } from '../../../lib/ui';

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
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>店舗詳細</h2>
          <p>投票候補の情報と最新レビューを確認できます。</p>
        </div>
        <button className={buttonSecondary} onClick={onClose}>
          閉じる
        </button>
      </div>
      <div className="panel__body panel__body--spaced">
        {isLoading && <p className="placeholder-box">読み込み中です…</p>}
        {error && <p className="notice notice--error">{error}</p>}
        {!isLoading && !error && detail && (
          <div className="detail-panel">
            <div className="detail-panel__header">
              <h3>{detail.name}</h3>
              {detail.summary_simple && <p>{detail.summary_simple}</p>}
              <div className="detail-panel__meta">
                {detail.rating !== null && <span>★ {detail.rating.toFixed(1)}</span>}
                {detail.user_ratings_total !== null && <span>{detail.user_ratings_total} 件</span>}
                {detail.types && detail.types.length > 0 && <span>{detail.types.join(', ')}</span>}
              </div>
            </div>
            <dl className="detail-panel__list">
              {detail.address && (
                <div>
                  <dt>住所</dt>
                  <dd>{detail.address}</dd>
                </div>
              )}
              {detail.phone_number && (
                <div>
                  <dt>電話</dt>
                  <dd>{detail.phone_number}</dd>
                </div>
              )}
              {detail.website && (
                <div>
                  <dt>公式サイト</dt>
                  <dd>
                    <a href={detail.website} target="_blank" rel="noreferrer">
                      {detail.website}
                    </a>
                  </dd>
                </div>
              )}
              {detail.google_maps_url && (
                <div>
                  <dt>Google Maps</dt>
                  <dd>
                    <a href={detail.google_maps_url} target="_blank" rel="noreferrer">
                      マップで開く
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            {detail.opening_hours?.weekday_text && (
              <div className="detail-panel__hours">
                <h4>営業時間</h4>
                <ul>
                  {detail.opening_hours.weekday_text.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="detail-panel__reviews">
              <h4>レビュー</h4>
              {reviews.length === 0 && <p className="placeholder-box">レビューがまだありません。</p>}
              <ul>
                {reviews.map((review) => (
                  <li key={review.id} className="detail-panel__review">
                    <p className="detail-panel__review-meta">
                      <span>{review.author_name ?? '匿名'}</span>
                      {review.rating !== null && <span>★ {review.rating}</span>}
                      {review.time && <span>{new Date(review.time).toLocaleString()}</span>}
                    </p>
                    {review.text && <p>{review.text}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
