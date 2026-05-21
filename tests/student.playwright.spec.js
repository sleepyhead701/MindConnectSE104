const { test, expect } = require('@playwright/test');

const appUrl = process.env.MINDCONNECT_STUDENT_URL || 'http://127.0.0.1:5500/student.html';

async function openStudentPage(page) {
  await page.addInitScript(() => {
    window.alert = () => {};
    window.confirm = () => true;
  });

  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#student-main-content');
}

async function goToTab(page, index) {
  await page.locator(`.nav-icon[data-nav-index="${index}"]`).click();
  await page.waitForTimeout(200);
}

async function ensureBackendReady(page) {
  await page.evaluate(() => {
    if (typeof window.setBackendReadyState === 'function') {
      window.setBackendReadyState(true);
    }
  });
}

test.describe('MindConnect student page', () => {
  test.beforeEach(async ({ page }) => {
    await openStudentPage(page);
  });

  test('renders Home feed by default', async ({ page }) => {
    await expect(page.locator('#student-main-content')).toBeVisible();
    await expect(page.locator('.nav-icon[data-nav-index="0"]')).toHaveClass(/active/);
    await expect(page.locator('.mc-feed-card').first()).toBeVisible();
  });

  test('creates a feed post with tags', async ({ page }) => {
    await goToTab(page, 0);

    await page.locator('#feed-post-content').fill('Bài test tự động cho Home feed');
    await page.locator('#feed-tag-input').fill('automation, test');
    await page.getByRole('button', { name: '+ Tag' }).click();
    await page.getByRole('button', { name: 'Đăng lên Home' }).click();

    await expect(page.locator('.mc-feed-card').first()).toContainText('Bài test tự động cho Home feed');
    await expect(page.locator('.mc-feed-card').first()).toContainText('#automation');
  });

  test('saves a private diary entry', async ({ page }) => {
    await goToTab(page, 1);

    await page.locator('#diary-title').fill('Test diary');
    await page.locator('#diary-content').fill('Nội dung diary để test automation.');
    await page.locator('#diary-tag-input').fill('stress, học tập');
    await page.getByRole('button', { name: '+ Tag' }).click();
    await page.locator('.mood-card').nth(1).click();
    await page.getByRole('button', { name: 'Lưu nhật ký riêng tư' }).click();

    await expect(page.locator('.mc-recent-entry').first()).toContainText('Test diary');
  });

  test('filters and imports resources', async ({ page }) => {
    await goToTab(page, 2);

    await page.getByRole('button', { name: 'Video' }).click();
    await expect(page.locator('.mc-resource-card').first()).toBeVisible();

    await page.locator('#resource-url').fill('https://example.com/sample.pdf');
    await page.locator('#resource-title').fill('Sample PDF');
    await page.locator('#resource-type').selectOption('Tự nhận diện');
    await page.getByRole('button', { name: 'Import' }).click();

    await expect(page.locator('.mc-resource-card').first()).toContainText('Sample PDF');
  });

  test('renders chat and sends a message when backend is ready', async ({ page }) => {
    await ensureBackendReady(page);
    await goToTab(page, 4);

    await page.locator('#chat-input').fill('Mình đang căng thẳng vì deadline');
    await page.getByRole('button', { name: 'Gửi tin nhắn' }).click();

    await expect(page.locator('#chat-box')).toContainText('Mình đang căng thẳng vì deadline');
  });

  test('opens booking modal from stats', async ({ page }) => {
    await goToTab(page, 3);

    const bookingButton = page.getByRole('button', { name: 'Đặt lịch tư vấn' });
    if (await bookingButton.count()) {
      await bookingButton.click();
      await expect(page.locator('#booking-modal')).toBeVisible();
    }
  });

  test('shows today insight on stats', async ({ page }) => {
    await goToTab(page, 3);

    await expect(page.locator('#today-ai-insight')).toBeVisible();
    await expect(page.locator('.mc-chart-bar').first()).toBeVisible();
  });
});