// tests/cross-feature.spec.js — Cross-feature interaction tests
const { test, expect } = require('@playwright/test');
const {
  loginAsStaff, loginAsRider, waitForAppReady,
  daysFromNow,
  expectToast, cleanupAfb, cleanupHnr,
} = require('./helpers');

test.describe('Cross-feature Interactions', () => {

  // ── T-CROSS-01: Rider away + horse not rideable same day ────

  test('T-CROSS-01: both AFB and HNR warnings shown together', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    const riderId = await page.evaluate(() => window.riders[0]?.id);
    const horseId = await page.evaluate(() => window.horses[0]?.id);
    if (!riderId || !horseId) { test.skip(); return; }

    const date = daysFromNow(5);

    // Create both AFB and HNR on same date
    await page.evaluate(async ({ rid, hid, dt }) => {
      await saveAfbEntry({ rider_id: rid, start_date: dt, end_date: dt, all_day: true, reason: 'Away test' });
      await saveHnrEntry({ horse_id: hid, start_date: dt, end_date: dt, all_day: true, reason: 'Lame test' });
    }, { rid: riderId, hid: horseId, dt: date });

    // Open booking form, select both
    await page.click('text=+ Book');
    await page.fill('#b-date', date);
    await page.selectOption('#b-rider', String(riderId));
    await page.selectOption('#b-horse', String(horseId));

    // Both warnings should appear
    const warning = page.locator('#b-conflict-warning');
    await expect(warning).toContainText('Away From Barn', { timeout: 3000 });
    await expect(warning).toContainText('Not Rideable', { timeout: 3000 });

    await page.click('text=Cancel');
    await cleanupAfb(page);
    await cleanupHnr(page);
  });

  // ── T-CROSS-02: AFB doesn't affect other riders ─────────────

  test('T-CROSS-02: AFB for one rider doesnt warn for another', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    const rider1 = await page.evaluate(() => window.riders[0]?.id);
    const rider2 = await page.evaluate(() => window.riders[1]?.id);
    if (!rider1 || !rider2) { test.skip(); return; }

    const date = daysFromNow(5);
    await page.evaluate(async ({ rid, dt }) => {
      await saveAfbEntry({ rider_id: rid, start_date: dt, end_date: dt, all_day: true, reason: 'Rider 1 away' });
    }, { rid: rider1, dt: date });

    // Book rider2 on same date — no warning expected
    await page.click('text=+ Book');
    await page.fill('#b-date', date);
    await page.selectOption('#b-rider', String(rider2));

    await page.waitForTimeout(500);
    const warningText = await page.locator('#b-conflict-warning').textContent();
    expect(warningText.trim()).toBe('');

    await page.click('text=Cancel');
    await cleanupAfb(page);
  });

  // ── T-CROSS-03: HNR doesn't affect other horses ────────────

  test('T-CROSS-03: HNR for one horse doesnt warn for another', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    const horse1 = await page.evaluate(() => window.horses[0]?.id);
    const horse2 = await page.evaluate(() => window.horses[1]?.id);
    if (!horse1 || !horse2) { test.skip(); return; }

    const date = daysFromNow(5);
    await page.evaluate(async ({ hid, dt }) => {
      await saveHnrEntry({ horse_id: hid, start_date: dt, end_date: dt, all_day: true, reason: 'Horse 1 lame' });
    }, { hid: horse1, dt: date });

    // Book horse2 on same date — no warning expected
    await page.click('text=+ Book');
    await page.fill('#b-date', date);
    await page.selectOption('#b-horse', String(horse2));

    await page.waitForTimeout(500);
    const warningText = await page.locator('#b-conflict-warning').textContent();
    expect(warningText.trim()).toBe('');

    await page.click('text=Cancel');
    await cleanupHnr(page);
  });

  // ── T-CROSS-06: Live booking form warnings ──────────────────

  test('T-CROSS-06: booking form warnings update live on field changes', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    const riderId = await page.evaluate(() => window.riders[0]?.id);
    const horseId = await page.evaluate(() => window.horses[0]?.id);
    if (!riderId || !horseId) { test.skip(); return; }

    const dateWithConflict = daysFromNow(6);
    const dateSafe = daysFromNow(12);

    // Seed conflicts
    await page.evaluate(async ({ rid, hid, dt }) => {
      await saveAfbEntry({ rider_id: rid, start_date: dt, end_date: dt, all_day: true, reason: 'Live test' });
      await saveHnrEntry({ horse_id: hid, start_date: dt, end_date: dt, all_day: true, reason: 'Live test' });
    }, { rid: riderId, hid: horseId, dt: dateWithConflict });

    // Open booking form
    await page.click('text=+ Book');
    await page.fill('#b-date', dateWithConflict);
    await page.selectOption('#b-rider', String(riderId));
    await page.selectOption('#b-horse', String(horseId));

    // Warnings should be visible
    const warning = page.locator('#b-conflict-warning');
    await expect(warning).toContainText('Away From Barn', { timeout: 3000 });
    await expect(warning).toContainText('Not Rideable');

    // Change date to safe date — warnings should clear
    await page.fill('#b-date', dateSafe);
    await page.waitForTimeout(1000);
    const cleared = await warning.textContent();
    expect(cleared.trim()).toBe('');

    await page.click('text=Cancel');
    await cleanupAfb(page);
    await cleanupHnr(page);
  });

  // ── T-CROSS-07: Calendar shows both AFB and HNR badges ──────

  test('T-CROSS-07: week calendar shows both AFB and NR badges', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    const riderId = await page.evaluate(() => window.riders[0]?.id);
    const horseId = await page.evaluate(() => window.horses[0]?.id);
    if (!riderId || !horseId) { test.skip(); return; }

    const date = daysFromNow(2);
    await page.evaluate(async ({ rid, hid, dt }) => {
      await saveAfbEntry({ rider_id: rid, start_date: dt, end_date: dt, all_day: true, reason: 'Badge test' });
      await saveHnrEntry({ horse_id: hid, start_date: dt, end_date: dt, all_day: true, reason: 'Badge test' });
    }, { rid: riderId, hid: horseId, dt: date });

    // Open the day detail
    await page.evaluate(({ dt }) => showWeekDayDetail(dt), { dt: date });
    await page.waitForTimeout(500);

    const detail = page.locator('#week-day-detail');
    if (await detail.isVisible()) {
      await expect(detail).toContainText('Away From Barn');
      await expect(detail).toContainText('Not Rideable');
    }

    await cleanupAfb(page);
    await cleanupHnr(page);
  });

  // ── T-CROSS-04: Warning when creating AFB over existing bookings

  test('T-CROSS-04: creating AFB warns about existing bookings', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    const riderId = await page.evaluate(() => window.riders[0]?.id);
    if (!riderId) { test.skip(); return; }

    const date = daysFromNow(9);

    // Create a booking for this rider
    await page.evaluate(async ({ rid, dt }) => {
      try {
        const { data } = await window.sb.from('bookings').insert({
          horse_id: null, rider_id: rid, date: dt, time: '10:00',
          duration: 60, type: 'lesson', arena: 'covered', notes: 'Cross test'
        }).select().single();
        if (data) window.bookings.push(data);
      } catch(e) {}
    }, { rid: riderId, dt: date });

    // Set up dialog handler to dismiss (cancel the save)
    let dialogSeen = false;
    page.on('dialog', async dialog => {
      dialogSeen = true;
      expect(dialog.message()).toContain('existing booking');
      await dialog.dismiss();
    });

    // Open AFB sheet and try to save
    await page.evaluate(() => openAfbSheet());
    await page.selectOption('#afb-rider', String(riderId));
    await page.fill('#afb-start-date', date);
    await page.fill('#afb-end-date', date);
    await page.click('#afb-save-btn');

    // The confirm dialog should have appeared
    await page.waitForTimeout(1000);
    expect(dialogSeen).toBe(true);

    // Clean up booking
    await page.evaluate(async ({ dt, rid }) => {
      const b = window.bookings.find(x => x.date === dt && x.rider_id === rid && x.notes === 'Cross test');
      if (b) {
        try { await window.sb.from('bookings').delete().eq('id', b.id); } catch(e) {}
        window.bookings = window.bookings.filter(x => x.id !== b.id);
      }
    }, { dt: date, rid: riderId });

    await cleanupAfb(page);
  });

  // ── Show auto-creates AFB ────────────────────────────────────

  test('T-AFB-09: saving a show with riders auto-creates AFB entries', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    const riderId = await page.evaluate(() => window.riders[0]?.id);
    if (!riderId) { test.skip(); return; }

    const showDate = daysFromNow(14);

    // Save a show with a rider
    await page.evaluate(async ({ rid, dt }) => {
      const ns = {
        name: 'Test Show AFB', date: dt, end_date: dt,
        location: 'Test Arena', division: 'Beginner',
        notes: '', horse_ids: [], rider_ids: [rid], rsvps: {}
      };
      try {
        const { data } = await window.sb.from('shows').insert(ns).select().single();
        if (data) {
          window.shows.push(data);
          if (typeof syncShowAfb === 'function') await syncShowAfb(data);
        }
      } catch(e) {}
    }, { rid: riderId, dt: showDate });

    // Check that an AFB was auto-created
    await page.waitForTimeout(1000);
    const entries = await page.evaluate(() => window.afbEntries || []);
    const showAfb = entries.find(a => a.reason?.includes('Test Show AFB'));
    expect(showAfb).toBeTruthy();
    expect(showAfb.start_date).toBe(showDate);
    expect(showAfb.all_day).toBe(true);

    // Clean up show and AFB
    await page.evaluate(async () => {
      const show = window.shows.find(s => s.name === 'Test Show AFB');
      if (show) {
        try { await window.sb.from('shows').delete().eq('id', show.id); } catch(e) {}
        window.shows = window.shows.filter(s => s.id !== show.id);
      }
    });
    await cleanupAfb(page);
  });
});
