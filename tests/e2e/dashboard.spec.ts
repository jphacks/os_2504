import { expect, test } from '@playwright/test';

test.describe('Dashboard', () => {
  test('renders landing view and detail panel interaction', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'MogFinder プロトタイプ' })).toBeVisible();

    await page.getByRole('button', { name: 'ルームを作成' }).click();

    await page.getByPlaceholder('例: 田中 太郎').fill('テストメンバー');
    await page.getByRole('button', { name: '追加' }).click();

    await page.getByLabel('投票するメンバー').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'トークン発行' }).click();

    await page.waitForTimeout(2500);
    await page.getByRole('button', { name: 'カード取得' }).click();

    const restaurantCard = page.locator('.restaurant-card').first();
    await expect(restaurantCard).toBeVisible();
    const detailButton = restaurantCard.getByRole('button', { name: '詳細' });
    await detailButton.click();
    await expect(page.getByRole('heading', { name: '店舗詳細' })).toBeVisible();
  });
});
