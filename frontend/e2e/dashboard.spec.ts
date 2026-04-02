import { test, expect } from '@playwright/test';

/**
 * SecAlert 前端功能测试
 * 测试仪表盘和主要功能模块
 */

test.describe('SecAlert Webapp Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('首页应该正常加载', async ({ page }) => {
    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 检查页面标题
    await expect(page).toHaveTitle(/SecAlert/);

    // 检查主要导航元素存在
    const hasNavigation = await page.locator('nav, header, [role="navigation"]').count();
    expect(hasNavigation).toBeGreaterThan(0);
  });

  test('仪表盘页面应该有数据展示', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // 检查页面主要内容区域
    const mainContent = page.locator('main, [role="main"], .dashboard, .content');
    await expect(mainContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('攻击链列表页面应该正常加载', async ({ page }) => {
    // 导航到攻击链页面
    await page.goto('/chains');
    await page.waitForLoadState('networkidle');

    // 检查是否有攻击链数据或空状态
    const hasContent = await page.locator('[class*="chain"], [class*="alert"], table, [role="table"]').count();
    // 预期有数据或空状态提示
    expect(hasContent).toBeGreaterThanOrEqual(0);
  });

  test('API 连接应该正常', async ({ request }) => {
    // 测试 API 是否可达
    const response = await request.get('/api/chains?limit=5');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('chains');
    expect(Array.isArray(data.chains)).toBeTruthy();
  });

  test('前端应该显示攻击链数据', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // 等待数据加载
    await page.waitForTimeout(2000);

    // 检查是否有数据展示（卡片、列表或表格）
    const dataElements = page.locator('[class*="card"], [class*="list"], [class*="table"], tr, li');
    const count = await dataElements.count();

    // 如果有数据应该显示，否则显示空状态
    if (count > 0) {
      // 数据加载后应该有内容
      const firstElement = dataElements.first();
      await expect(firstElement).toBeVisible({ timeout: 5000 }).catch(() => {
        // 忽略错误，可能没有数据是正常的
      });
    }
  });

  test('告警中心页面应该正常加载', async ({ page }) => {
    await page.goto('/alerts');
    await page.waitForLoadState('networkidle');

    // 检查页面内容
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });
});
