import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RestaurantDetailPanel } from '../RestaurantDetailPanel';

const detail = {
  place_id: 'sample-1',
  name: 'テスト居酒屋',
  address: '東京都千代田区',
  summary_simple: 'テスト概要',
  summary_detail: '詳細',
  rating: 4.2,
  user_ratings_total: 20,
  photo_urls: [],
  types: ['izakaya'],
  google_maps_url: 'https://maps.google.com/',
  phone_number: '03-0000-0000',
  website: 'https://example.com',
  opening_hours: { weekday_text: ['Mon: 17:00-23:00'] },
};

const reviews = [
  {
    id: 'review-1',
    author_name: '太郎',
    rating: 5,
    text: '最高でした',
    time: '2025-10-01T12:00:00Z',
  },
];

describe('RestaurantDetailPanel', () => {
  it('renders detail information when open', () => {
    render(
      <RestaurantDetailPanel
        isOpen
        isLoading={false}
        error={null}
        detail={detail}
        reviews={reviews}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('テスト居酒屋')).toBeVisible();
    expect(screen.getByText('最高でした')).toBeVisible();
    expect(screen.getByText('電話する')).toBeVisible();
  });

  it('shows loading state', () => {
    render(
      <RestaurantDetailPanel
        isOpen
        isLoading
        error={null}
        detail={null}
        reviews={[]}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText('詳細を読み込み中です…')).toBeVisible();
  });
});
