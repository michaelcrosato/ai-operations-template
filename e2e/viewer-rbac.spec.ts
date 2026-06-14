/**
 * F-0024: Viewer RBAC E2E spec
 *
 * Exercises F-0021's viewer persona gating on the demo canvas (Operations Center).
 * - Viewer persona: palette buttons disabled, read-only notice on node selection.
 * - Owner persona: palette buttons enabled, no read-only notice.
 */
import { test, expect } from '@playwright/test';

/**
 * Scroll the workflow canvas into view, then click the first ReactFlow node.
 *
 * ReactFlow's onNodeClick handler fires from native click events on the node
 * element. We scroll the node into viewport, ensure it is within the canvas
 * bounds, and fire a native click via page.evaluate so no Playwright intercept
 * checks can block it.
 */
async function selectFirstCanvasNode(page: import('@playwright/test').Page) {
  const canvasWrapper = page.getByTestId('workflow-canvas');
  await canvasWrapper.waitFor({ state: 'visible' });
  await canvasWrapper.scrollIntoViewIfNeeded();

  // Wait for at least one RF node to be rendered inside the canvas
  const firstNode = canvasWrapper.locator('.react-flow__node').first();
  await firstNode.waitFor({ state: 'visible', timeout: 15_000 });

  // Dispatch a native click directly on the element via the DOM.
  // This bypasses Playwright's pointer-intercept check (which fires when
  // another element is at the same screen coords) while still triggering
  // ReactFlow's internal click handler, which listens for 'click' events.
  await firstNode.evaluate((el) => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

test.describe('Viewer RBAC — demo canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo');
    // Wait for the page to hydrate (persona select is a reliable hydration signal)
    await page.getByTestId('persona-select').waitFor({ state: 'visible' });
  });

  test('Viewer persona: palette buttons disabled and read-only notice on node selection', async ({ page }) => {
    // Switch to Viewer persona
    await page.getByTestId('persona-select').selectOption('viewer');

    // Navigate to Operations Center (may already be there; click to be sure)
    await page.getByTestId('view-ops').click();

    // Palette buttons must be disabled for viewers
    await expect(page.getByTestId('btn-add-agent')).toBeDisabled();
    await expect(page.getByTestId('btn-add-tool')).toBeDisabled();

    // Also verify the canvas prompt input is disabled
    await expect(page.getByTestId('canvas-prompt-input')).toBeDisabled();

    // Click a node in the canvas to trigger the properties panel
    await selectFirstCanvasNode(page);

    // The read-only notice must appear in the properties panel
    await expect(page.getByTestId('viewer-readonly-notice')).toBeVisible();
  });

  test('Owner persona: palette buttons enabled and no read-only notice', async ({ page }) => {
    // Switch to Owner persona
    await page.getByTestId('persona-select').selectOption('owner');

    // Navigate to Operations Center
    await page.getByTestId('view-ops').click();

    // Palette buttons must be enabled for owner
    await expect(page.getByTestId('btn-add-agent')).toBeEnabled();
    await expect(page.getByTestId('btn-add-tool')).toBeEnabled();

    // The canvas prompt input must be enabled
    await expect(page.getByTestId('canvas-prompt-input')).toBeEnabled();

    // Click a node in the canvas
    await selectFirstCanvasNode(page);

    // The read-only notice must NOT be present for owners
    await expect(page.getByTestId('viewer-readonly-notice')).not.toBeVisible();
  });
});
