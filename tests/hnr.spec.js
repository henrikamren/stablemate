// tests/hnr.spec.js — Horse Not Rideable feature tests
const { test, expect } = require('@playwright/test');
const {
  loginAsRider, loginAsStaff, waitForAppReady,
  daysFromNow,
  fillHnrSheet, getHnrEntries, getHorseIdByName,
  expectToast, cleanupHnr,
} = require('./helpers');

test.describe('Horse Not Rideable', () => {

  // ── T-HNR-01: Staff marks horse not rideable (single day) ───

  test('T-HNR-01: staff can mark horse not rideable single day', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    const horseId = await page.evaluate(() => String(window.horses[0]?.id));
    if (!horseId) { test.skip(); return; }

    // Open HNR sheet
    await page.evaluate(() => openHnrSheet());
    await expect(page.locator('#sheet-hnr')).toHaveClass(/open/);

    const date = daysFromNow(3);
    await fillHnrSheet(page, {
      horse: horseId,
      startDate: date,
      reason: 'Lame — left front',
    });

    await page.click('#hnr-save-btn');
    await expectToast(page, 'Horse marked as Not Rideable');

    const entries = await getHnrEntries(page);
    const match = entries.find(h => h.start_date === date);
    expect(match).toBeTruthy();
    expect(match.all_day).toBe(true);
    expect(match.reason).toBe('Lame — left front');

    await cleanupHnr(page);
  });

  // ── T-HNR-02: Staff marks horse not rideable (date range) ───

  test('T-HNR-02: staff can mark horse not rideable for date range', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    const horseId = await page.evaluate(() => String(window.horses[0]?.id));
    if (!horseId) { test.skip(); return; }

    await page.evaluate(() => openHnrSheet());
    const start = daysFromNow(5);
    const end = daysFromNow(9);

    await fillHnrSheet(page, {
      horse: horseId,
      startDate: start,
      endDate: end,
      reason: 'Recovery — pulled shoe',
    });

    await page.click('#hnr-save-btn');
    await expectToast(page, 'Horse marked as Not Rideable');

    const entries = await getHnrEntries(page);
    const match = entries.find(h => h.start_date === start && h.end_date === end);
    expect(match).toBeTruthy();
    expect(match.all_day).toBe(true);

    await cleanupHnr(page);
  });

  // ── T-HNR-03: Partial-day HNR ──────────────────────────────

  test('T-HNR-03: staff can create partial-day HNR', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    const horseId = await page.evaluate(() => String(window.horses[0]?.id));
    if (!horseId) { test.skip(); return; }

    await page.evaluate(() => openHnrSheet());
    const date = daysFromNow(4);

    await fillHnrSheet(page, {
      horse: horseId,
      startDate: date,
      allDay: false,
      startTime: '06:00',
      endTime: '10:00',
      reason: 'Farrier',
    });

    await page.click('#hnr-save-btn');
    await expectToast(page, 'Horse marked as Not Rideable');

    const entries = await getHnrEntries(page);
    const match = entries.find(h => h.start_date === date);
    expect(match).toBeTruthy();
    expect(match.all_day).toBe(false);
    expect(match.start_time).toBe('06:00');
    expect(match.end_time).toBe('10:00');

    await cleanupHnr(page);
  });

  // ── T-HNR-04: Multi-day forces all-day ─────────────────────

  test('T-HNR-04: multi-day range hides time pickers', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    await page.evaluate(() => openHnrSheet());

    await page.fill('#hnr-start-date', daysFromNow(5));
    await page.fill('#hnr-end-date', daysFromNow(7));

    await expect(page.locator('#hnr-all-day-group')).toBeHidden();
    await expect(page.locator('#hnr-time-group')).toBeHidden();

    // Single day — toggle reappears
    await page.fill('#hnr-end-date', daysFromNow(5));
    await expect(page.locator('#hnr-all-day-group')).toBeVisible();

    await page.click('text=Cancel');
  });

  // ── T-HNR-05: Edit HNR ─────────────────────────────────────

  test('T-HNR-05: staff can edit HNR', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    const horseId = await page.evaluate(() => window.horses[0]?.id);
    if (!horseId) { test.skip(); return; }

    // Create HNR
    const date = daysFromNow(6);
    await page.evaluate(async ({ hid, dt }) => {
      await saveHnrEntry({ horse_id: hid, start_date: dt, end_date: dt, all_day: true, reason: 'Original' });
    }, { hid: horseId, dt: date });

    // Navigate to horse schedule
    await page.evaluate(({ hid }) => showHorseSchedule(hid), { hid: horseId });
    await page.waitForTimeout(500);

    // Click Edit on the HNR entry
    const editBtn = page.locator('#child-schedule-content .schedule-item').filter({ hasText: 'Not Rideable' }).locator('text=Edit').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page.locator('#sheet-hnr')).toHaveClass(/open/);
      await page.fill('#hnr-reason', 'Updated reason');
      await page.click('#hnr-save-btn');
      await expectToast(page, 'Horse availability updated');

      const entries = await getHnrEntries(page);
      const match = entries.find(h => h.start_date === date);
      expect(match.reason).toBe('Updated reason');
    }

    await cleanupHnr(page);
  });

  // ── T-HNR-06: Delete HNR ───────────────────────────────────

  test('T-HNR-06: staff can delete HNR', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    const horseId = await page.evaluate(() => window.horses[0]?.id);
    if (!horseId) { test.skip(); return; }

    const date = daysFromNow(7);
    await page.evaluate(async ({ hid, dt }) => {
      await saveHnrEntry({ horse_id: hid, start_date: dt, end_date: dt, all_day: true, reason: 'To delete' });
    }, { hid: horseId, dt: date });

    const before = await getHnrEntries(page);
    const countBefore = before.length;

    // Navigate to horse schedule and delete
    await page.evaluate(({ hid }) => showHorseSchedule(hid), { hid: horseId });
    await page.waitForTimeout(500);

    page.on('dialog', dialog => dialog.accept());
    const delBtn = page.locator('#child-schedule-content .schedule-item').filter({ hasText: 'Not Rideable' }).locator('button:has-text("✕")').first();
    if (await delBtn.isVisible()) {
      await delBtn.click();
      await expectToast(page, 'Horse availability restored');
      const after = await getHnrEntries(page);
      expect(after.length).toBe(countBefore - 1);
    }
  });

  // ── T-HNR-07: Booking conflict — horse not rideable ─────────

  test('T-HNR-07: booking shows conflict for unavailable horse', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    const horseId = await page.evaluate(() => window.horses[0]?.id);
    if (!horseId) { test.skip(); return; }

    const date = daysFromNow(3);
    await page.evaluate(async ({ hid, dt }) => {
      await saveHnrEntry({ horse_id: hid, start_date: dt, end_date: dt, all_day: true, reason: 'Lame' });
    }, { hid: horseId, dt: date });

    // Open booking form
    await page.click('text=+ Book');
    await page.waitForSelector('#sheet-booking.open');

    await page.fill('#b-date', date);
    await page.selectOption('#b-horse', String(horseId));

    // Should see HNR warning
    await expect(page.locator('#b-conflict-warning')).toContainText('Not Rideable', { timeout: 3000 });

    await page.click('text=Cancel');
    await cleanupHnr(page);
  });

  // ── T-HNR-08: Partial-day HNR conflict ─────────────────────

  test('T-HNR-08: partial-day HNR only warns during overlap', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    const horseId = await page.evaluate(() => window.horses[0]?.id);
    if (!horseId) { test.skip(); return; }

    const date = daysFromNow(4);
    await page.evaluate(async ({ hid, dt }) => {
      await saveHnrEntry({ horse_id: hid, start_date: dt, end_date: dt, all_day: false, start_time: '06:00', end_time: '10:00', reason: 'Farrier' });
    }, { hid: horseId, dt: date });

    await page.click('text=+ Book');
    await page.fill('#b-date', date);
    await page.selectOption('#b-horse', String(horseId));
    await page.selectOption('#b-time', '09:00');
    await expect(page.locator('#b-conflict-warning')).toContainText('Not Rideable', { timeout: 3000 });

    // Time outside range — no warning
    await page.selectOption('#b-time', '11:00');
    await page.waitForTimeout(500);
    const warning = await page.locator('#b-conflict-warning').textContent();
    expect(warning.trim()).toBe('');

    await page.click('text=Cancel');
    await cleanupHnr(page);
  });

  // ── T-HNR-09: Horse card shows active indicator ─────────────

  test('T-HNR-09: horse card shows Currently Not Rideable when active', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    const horseId = await page.evaluate(() => window.horses[0]?.id);
    if (!horseId) { test.skip(); return; }

    // Create HNR for today
    const today = await page.evaluate(() => fmtDate(today));
    await page.evaluate(async ({ hid, dt }) => {
      await saveHnrEntry({ horse_id: hid, start_date: dt, end_date: dt, all_day: true, reason: 'Rest day' });
    }, { hid: horseId, dt: today });

    // Go to Herd panel
    await page.click('#nav-horses');
    await page.waitForTimeout(500);

    // Should see "Currently Not Rideable" on the horse card
    await expect(page.locator('#horses-dash')).toContainText('Currently Not Rideable');

    await cleanupHnr(page);
  });

  // ── T-HNR-12: Role permissions — riders can't create HNR ───

  test('T-HNR-12: rider cannot create HNR', async ({ page }) => {
    await loginAsRider(page, 'Riley');
    await waitForAppReady(page);

    // Try to open HNR sheet
    await page.evaluate(() => openHnrSheet());
    await expectToast(page, 'Only staff can mark horses as not rideable');

    // Sheet should NOT be open
    const sheet = page.locator('#sheet-hnr');
    await expect(sheet).not.toHaveClass(/open/);
  });

  // ── T-HNR-13: Validation ───────────────────────────────────

  test('T-HNR-13: end date before start shows error', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    await page.evaluate(() => openHnrSheet());
    const horseId = await page.evaluate(() => String(window.horses[0]?.id));
    await page.selectOption('#hnr-horse', horseId);
    await page.fill('#hnr-start-date', daysFromNow(5));
    await page.fill('#hnr-end-date', daysFromNow(2));
    await page.click('#hnr-save-btn');
    await expectToast(page, 'End date must be on or after start date');
  });

  test('T-HNR-13b: no horse selected shows error', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    await page.evaluate(() => openHnrSheet());
    await page.fill('#hnr-start-date', daysFromNow(3));
    await page.click('#hnr-save-btn');
    await expectToast(page, 'Please select a horse');
  });
});
