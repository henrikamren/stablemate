// tests/afb.spec.js — Away From Barn feature tests
const { test, expect } = require('@playwright/test');
const {
  loginAsRider, loginAsParent, loginAsStaff, waitForAppReady,
  tomorrow, daysFromNow, todayStr,
  fillAfbSheet, getAfbEntries, getRiderIdByName,
  expectToast, cleanupAfb,
} = require('./helpers');

test.describe('Away From Barn', () => {

  // ── T-AFB-01: Add single all-day AFB (rider) ────────────────

  test('T-AFB-01: rider can add single all-day AFB', async ({ page }) => {
    await loginAsRider(page, page.context()._options?.riderName || 'Riley');
    await waitForAppReady(page);

    // Click the AFB button
    await page.click('text=Mark Away From Barn');
    await expect(page.locator('#sheet-afb')).toHaveClass(/open/);

    // Fill the form
    const date = daysFromNow(3);
    await fillAfbSheet(page, {
      startDate: date,
      endDate: date,
      reason: 'Dentist appointment',
    });

    // Save
    await page.click('#afb-save-btn');
    await expectToast(page, 'Away From Barn saved');

    // Verify entry exists in app state
    const entries = await getAfbEntries(page);
    const match = entries.find(a => a.start_date === date && a.reason === 'Dentist appointment');
    expect(match).toBeTruthy();
    expect(match.all_day).toBe(true);

    // Verify it shows on the rider home
    await expect(page.locator('#rider-content')).toContainText('Away From Barn');

    // Cleanup
    await cleanupAfb(page);
  });

  // ── T-AFB-02: Add partial-day AFB (rider) ───────────────────

  test('T-AFB-02: rider can add partial-day AFB', async ({ page }) => {
    await loginAsRider(page, 'Riley');
    await waitForAppReady(page);

    await page.click('text=Mark Away From Barn');
    const date = daysFromNow(4);
    await fillAfbSheet(page, {
      startDate: date,
      endDate: date,
      allDay: false,
      startTime: '08:00',
      endTime: '12:00',
      reason: 'Vet appt',
    });

    await page.click('#afb-save-btn');
    await expectToast(page, 'Away From Barn saved');

    const entries = await getAfbEntries(page);
    const match = entries.find(a => a.start_date === date);
    expect(match).toBeTruthy();
    expect(match.all_day).toBe(false);
    expect(match.start_time).toBe('08:00');
    expect(match.end_time).toBe('12:00');

    await cleanupAfb(page);
  });

  // ── T-AFB-03: Add multi-day AFB (date range) ────────────────

  test('T-AFB-03: rider can add multi-day AFB range', async ({ page }) => {
    await loginAsRider(page, 'Riley');
    await waitForAppReady(page);

    await page.click('text=Mark Away From Barn');
    const start = daysFromNow(5);
    const end = daysFromNow(9);

    await fillAfbSheet(page, {
      startDate: start,
      endDate: end,
      reason: 'Spring break',
    });

    await page.click('#afb-save-btn');
    await expectToast(page, 'Away From Barn saved');

    const entries = await getAfbEntries(page);
    const match = entries.find(a => a.start_date === start && a.end_date === end);
    expect(match).toBeTruthy();
    expect(match.all_day).toBe(true);
    expect(match.reason).toBe('Spring break');

    await cleanupAfb(page);
  });

  // ── T-AFB-04: Multi-day hides partial-day option ─────────────

  test('T-AFB-04: multi-day range hides time pickers', async ({ page }) => {
    await loginAsRider(page, 'Riley');
    await waitForAppReady(page);

    await page.click('text=Mark Away From Barn');
    const start = daysFromNow(5);
    const end = daysFromNow(7);

    await page.fill('#afb-start-date', start);
    await page.fill('#afb-end-date', end);

    // All-day group should be hidden for multi-day
    await expect(page.locator('#afb-all-day-group')).toBeHidden();
    await expect(page.locator('#afb-time-group')).toBeHidden();

    // Change back to single day — toggle should reappear
    await page.fill('#afb-end-date', start);
    await expect(page.locator('#afb-all-day-group')).toBeVisible();

    await page.click('text=Cancel');
  });

  // ── T-AFB-05: Edit existing AFB ─────────────────────────────

  test('T-AFB-05: rider can edit existing AFB', async ({ page }) => {
    await loginAsRider(page, 'Riley');
    await waitForAppReady(page);

    // Create an AFB first
    await page.click('text=Mark Away From Barn');
    const date = daysFromNow(6);
    await fillAfbSheet(page, { startDate: date, reason: 'Original reason' });
    await page.click('#afb-save-btn');
    await expectToast(page, 'Away From Barn saved');

    // Find and click the Edit button on the AFB entry
    const editBtn = page.locator('#rider-content .schedule-item').filter({ hasText: 'Away From Barn' }).locator('text=Edit').first();
    await editBtn.click();
    await expect(page.locator('#sheet-afb')).toHaveClass(/open/);

    // Change the reason
    await page.fill('#afb-reason', 'Updated reason');
    await page.click('#afb-save-btn');
    await expectToast(page, 'Away From Barn updated');

    // Verify update
    const entries = await getAfbEntries(page);
    const match = entries.find(a => a.start_date === date);
    expect(match.reason).toBe('Updated reason');

    await cleanupAfb(page);
  });

  // ── T-AFB-06: Delete AFB ────────────────────────────────────

  test('T-AFB-06: rider can delete AFB', async ({ page }) => {
    await loginAsRider(page, 'Riley');
    await waitForAppReady(page);

    // Create an AFB
    await page.click('text=Mark Away From Barn');
    const date = daysFromNow(7);
    await fillAfbSheet(page, { startDate: date, reason: 'To delete' });
    await page.click('#afb-save-btn');
    await expectToast(page, 'Away From Barn saved');

    const entriesBefore = await getAfbEntries(page);
    const countBefore = entriesBefore.length;

    // Click delete
    page.on('dialog', dialog => dialog.accept());
    const delBtn = page.locator('#rider-content .schedule-item').filter({ hasText: 'Away From Barn' }).locator('button:has-text("✕")').first();
    await delBtn.click();
    await expectToast(page, 'Away From Barn removed');

    const entriesAfter = await getAfbEntries(page);
    expect(entriesAfter.length).toBe(countBefore - 1);
  });

  // ── T-AFB-07: Parent adds AFB for child ─────────────────────

  test('T-AFB-07: parent can add AFB for child', async ({ page }) => {
    await loginAsParent(page, 'Henrik');
    await waitForAppReady(page);

    // Click into a child's schedule
    const childCard = page.locator('.child-card').first();
    await childCard.click();
    await page.waitForSelector('#child-schedule-content', { state: 'visible' });

    // Click AFB button
    const afbBtn = page.locator('button:has-text("Away From Barn")').first();
    await afbBtn.click();
    await expect(page.locator('#sheet-afb')).toHaveClass(/open/);

    // Rider selector should be visible for parents
    await expect(page.locator('#afb-rider-group')).toBeVisible();

    const date = daysFromNow(5);
    await fillAfbSheet(page, { startDate: date, endDate: daysFromNow(7), reason: 'Family vacation' });
    await page.click('#afb-save-btn');
    await expectToast(page, 'Away From Barn saved');

    await cleanupAfb(page);
  });

  // ── T-AFB-08: Staff adds AFB for any rider ──────────────────

  test('T-AFB-08: staff can add AFB for any rider', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    // Navigate to a rider's schedule via Browse
    await page.click('text=Browse');
    await page.click('text=Riders');
    await page.waitForSelector('#riders-dash-content', { state: 'visible' });

    // Click first rider
    const riderCard = page.locator('#riders-dash-content [onclick*="showRiderScheduleFromSearch"]').first();
    await riderCard.click();
    await page.waitForSelector('#child-schedule-content', { state: 'visible' });

    // Should see AFB list (may be empty)
    // The schedule view for staff doesn't have the AFB button directly,
    // but staff can use the rider dropdown in the AFB sheet
    // For now test via evaluate
    const riderId = await page.evaluate(() => {
      const r = window.riders[0];
      return r ? String(r.id) : null;
    });

    if (riderId) {
      await page.evaluate((rid) => openAfbSheet(), riderId);
      await expect(page.locator('#sheet-afb')).toHaveClass(/open/);
      await expect(page.locator('#afb-rider-group')).toBeVisible();

      await page.selectOption('#afb-rider', riderId);
      const date = daysFromNow(10);
      await fillAfbSheet(page, { startDate: date, reason: 'Staff created' });
      await page.click('#afb-save-btn');
      await expectToast(page, 'Away From Barn saved');

      await cleanupAfb(page);
    }
  });

  // ── T-AFB-12: Booking conflict — all-day AFB ────────────────

  test('T-AFB-12: booking shows conflict warning for rider with AFB', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    // Seed an AFB entry via evaluate
    const date = daysFromNow(3);
    const riderId = await page.evaluate(() => window.riders[0]?.id);
    if (!riderId) { test.skip(); return; }

    await page.evaluate(async ({ rid, dt }) => {
      await saveAfbEntry({ rider_id: rid, start_date: dt, end_date: dt, all_day: true, reason: 'Test conflict' });
    }, { rid: riderId, dt: date });

    // Open staff booking form
    await page.click('text=+ Book');
    await page.waitForSelector('#sheet-booking.open');

    // Set the date and rider
    await page.fill('#b-date', date);
    await page.selectOption('#b-rider', String(riderId));

    // Wait for conflict warning to appear
    await expect(page.locator('#b-conflict-warning')).toContainText('Away From Barn', { timeout: 3000 });

    await page.click('text=Cancel');
    await cleanupAfb(page);
  });

  // ── T-AFB-13: Booking conflict — partial day ────────────────

  test('T-AFB-13: partial-day AFB only warns during overlap', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    const date = daysFromNow(4);
    const riderId = await page.evaluate(() => window.riders[0]?.id);
    if (!riderId) { test.skip(); return; }

    // Create partial-day AFB 08:00-12:00
    await page.evaluate(async ({ rid, dt }) => {
      await saveAfbEntry({ rider_id: rid, start_date: dt, end_date: dt, all_day: false, start_time: '08:00', end_time: '12:00', reason: 'Morning off' });
    }, { rid: riderId, dt: date });

    // Open booking, set date + rider + time at 10:00 (overlap)
    await page.click('text=+ Book');
    await page.fill('#b-date', date);
    await page.selectOption('#b-rider', String(riderId));
    await page.selectOption('#b-time', '10:00');
    await expect(page.locator('#b-conflict-warning')).toContainText('Away From Barn', { timeout: 3000 });

    // Change time to 14:00 (no overlap)
    await page.selectOption('#b-time', '14:00');
    // Warning should clear
    await page.waitForTimeout(500);
    const warningText = await page.locator('#b-conflict-warning').textContent();
    expect(warningText.trim()).toBe('');

    await page.click('text=Cancel');
    await cleanupAfb(page);
  });

  // ── T-AFB-14: Calendar display — AFB badge ──────────────────

  test('T-AFB-14: week calendar shows AFB badge on affected days', async ({ page }) => {
    await loginAsRider(page, 'Riley');
    await waitForAppReady(page);

    const date = daysFromNow(2);
    const riderId = await page.evaluate(() => {
      const me = window.riders?.find(r => r.first.toLowerCase() === window.currentUser?.name?.toLowerCase());
      return me?.id;
    });
    if (!riderId) { test.skip(); return; }

    await page.evaluate(async ({ rid, dt }) => {
      await saveAfbEntry({ rider_id: rid, start_date: dt, end_date: dt, all_day: true, reason: 'Calendar test' });
    }, { rid: riderId, dt: date });

    // Re-render
    await page.evaluate(() => renderRiderHome());
    await page.waitForTimeout(500);

    // Look for AFB badge in the week calendar
    const afbBadge = page.locator('#rider-content').locator('text=AFB');
    await expect(afbBadge.first()).toBeVisible({ timeout: 3000 });

    await cleanupAfb(page);
  });

  // ── T-AFB-15: Role permissions ──────────────────────────────

  test('T-AFB-15: rider cannot edit another riders AFB', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    // Create AFB for first rider
    const riderId = await page.evaluate(() => window.riders[0]?.id);
    if (!riderId) { test.skip(); return; }

    const date = daysFromNow(5);
    await page.evaluate(async ({ rid, dt }) => {
      await saveAfbEntry({ rider_id: rid, start_date: dt, end_date: dt, all_day: true, reason: 'Permission test' });
    }, { rid: riderId, dt: date });

    // Sign out and log in as a different rider
    await page.click('text=Sign out');
    const otherRider = await page.evaluate(() => window.riders[1]?.first || 'Jordan');

    await loginAsRider(page, otherRider);
    await waitForAppReady(page);

    // Click on the day with the AFB in the week calendar
    // The AFB should be visible but no edit/delete buttons for this rider
    await page.evaluate(({ dt }) => showWeekDayDetail(dt), { dt: date });
    await page.waitForTimeout(500);

    const dayDetail = page.locator('#week-day-detail');
    if (await dayDetail.isVisible()) {
      // Should see the AFB entry but NOT edit/delete buttons for it
      const afbEntry = dayDetail.locator('text=Away From Barn');
      if (await afbEntry.count() > 0) {
        const editBtns = dayDetail.locator('.schedule-item:has-text("Away From Barn") button:has-text("Edit")');
        expect(await editBtns.count()).toBe(0);
      }
    }

    await cleanupAfb(page);
  });

  // ── T-AFB-16: Validation — date range ───────────────────────

  test('T-AFB-16: end date before start date shows error', async ({ page }) => {
    await loginAsRider(page, 'Riley');
    await waitForAppReady(page);

    await page.click('text=Mark Away From Barn');
    await page.fill('#afb-start-date', daysFromNow(5));
    await page.fill('#afb-end-date', daysFromNow(2)); // end before start
    await page.click('#afb-save-btn');
    await expectToast(page, 'End date must be on or after start date');
  });

  test('T-AFB-16b: rider cannot set past dates', async ({ page }) => {
    await loginAsRider(page, 'Riley');
    await waitForAppReady(page);

    await page.click('text=Mark Away From Barn');
    const yesterday = daysFromNow(-1);
    await page.fill('#afb-start-date', yesterday);
    await page.fill('#afb-end-date', yesterday);
    await page.click('#afb-save-btn');
    await expectToast(page, 'Cannot set dates in the past');
  });

  // ── T-AFB-17: Existing bookings warning ─────────────────────

  test('T-AFB-17: warns about existing bookings in AFB range', async ({ page }) => {
    await loginAsStaff(page, 'Sarah');
    await waitForAppReady(page);

    // Create a booking for a rider
    const riderId = await page.evaluate(() => window.riders[0]?.id);
    if (!riderId) { test.skip(); return; }

    const date = daysFromNow(8);
    await page.evaluate(async ({ rid, dt }) => {
      const nb = { horse_id: null, rider_id: rid, date: dt, time: '10:00', duration: 60, type: 'lesson', arena: 'covered', notes: '' };
      try {
        const { data } = await window.sb.from('bookings').insert(nb).select().single();
        if (data) window.bookings.push(data);
      } catch(e) { window.bookings.push({ ...nb, id: Date.now() }); }
    }, { rid: riderId, dt: date });

    // Now create AFB covering that date — should get confirm dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('existing booking');
      await dialog.dismiss(); // cancel to not save
    });

    await page.evaluate(({ rid }) => openAfbSheet(), { rid: riderId });
    await page.selectOption('#afb-rider', String(riderId));
    await fillAfbSheet(page, { startDate: date, endDate: date, reason: 'Conflict test' });
    await page.click('#afb-save-btn');

    // Clean up the test booking
    await page.evaluate(async ({ dt, rid }) => {
      const b = window.bookings.find(x => x.date === dt && x.rider_id === rid);
      if (b) {
        try { await window.sb.from('bookings').delete().eq('id', b.id); } catch(e) {}
        window.bookings = window.bookings.filter(x => x.id !== b.id);
      }
    }, { dt: date, rid: riderId });

    await cleanupAfb(page);
  });
});
