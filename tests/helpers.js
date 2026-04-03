// tests/helpers.js — Shared test helpers for StableMate Playwright tests

const { expect } = require('@playwright/test');

// ── Login helpers ──────────────────────────────────────────────

/** Login as a rider by name */
async function loginAsRider(page, name) {
  await page.goto('/');
  await page.click('text=Get Started');
  await page.click('text=I am a Rider');
  // Try dropdown first, fall back to text input
  const select = page.locator('#rider-select');
  const hasOption = await select.locator(`option[value="${name}"]`).count();
  if (hasOption > 0) {
    await select.selectOption(name);
  } else {
    await page.fill('#rider-name-input', name);
  }
  await page.click('text=Enter Stable');
  await page.waitForSelector('#rider-content', { state: 'visible' });
}

/** Login as a parent by name */
async function loginAsParent(page, name) {
  await page.goto('/');
  await page.click('text=Get Started');
  await page.click('text=I am a Parent');
  const select = page.locator('#parent-select');
  const hasOption = await select.locator(`option[value="${name}"]`).count();
  if (hasOption > 0) {
    await select.selectOption(name);
  } else {
    await page.fill('#parent-name-input', name);
  }
  await page.click('text=View Schedule');
  await page.waitForSelector('#parent-content', { state: 'visible' });
}

/** Login as staff by name */
async function loginAsStaff(page, name) {
  await page.goto('/');
  await page.click('text=Get Started');
  await page.click('text=I am Staff');
  const select = page.locator('#staff-select');
  const hasOption = await select.locator(`option[value="${name}"]`).count();
  if (hasOption > 0) {
    await select.selectOption(name);
  } else {
    await page.fill('#staff-name-input', name);
  }
  await page.click('text=Enter Stable');
  await page.waitForSelector('#panel-home', { state: 'visible' });
}

// ── Wait for app data to load ──────────────────────────────────

async function waitForAppReady(page) {
  await page.waitForFunction(() => window.appReady === true, null, { timeout: 15000 });
}

// ── Date helpers ───────────────────────────────────────────────

/** Get tomorrow's date as YYYY-MM-DD */
function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

/** Get a date N days from today as YYYY-MM-DD */
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/** Get today's date as YYYY-MM-DD */
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ── AFB sheet helpers ──────────────────────────────────────────

/** Open the AFB sheet and fill it out */
async function fillAfbSheet(page, opts) {
  // opts: { startDate, endDate, allDay, startTime, endTime, reason, rider? }
  await page.fill('#afb-start-date', opts.startDate);
  await page.fill('#afb-end-date', opts.endDate || opts.startDate);

  if (opts.allDay === false) {
    const checkbox = page.locator('#afb-all-day');
    if (await checkbox.isChecked()) await checkbox.uncheck();
    if (opts.startTime) await page.selectOption('#afb-start-time', opts.startTime);
    if (opts.endTime) await page.selectOption('#afb-end-time', opts.endTime);
  }

  if (opts.reason) await page.fill('#afb-reason', opts.reason);
  if (opts.rider) await page.selectOption('#afb-rider', opts.rider);
}

/** Open the HNR sheet and fill it out */
async function fillHnrSheet(page, opts) {
  // opts: { horse, startDate, endDate, allDay, startTime, endTime, reason }
  if (opts.horse) await page.selectOption('#hnr-horse', opts.horse);
  await page.fill('#hnr-start-date', opts.startDate);
  await page.fill('#hnr-end-date', opts.endDate || opts.startDate);

  if (opts.allDay === false) {
    const checkbox = page.locator('#hnr-all-day');
    if (await checkbox.isChecked()) await checkbox.uncheck();
    if (opts.startTime) await page.selectOption('#hnr-start-time', opts.startTime);
    if (opts.endTime) await page.selectOption('#hnr-end-time', opts.endTime);
  }

  if (opts.reason) await page.fill('#hnr-reason', opts.reason);
}

// ── Data access via page evaluate ──────────────────────────────

/** Get AFB entries from the running app */
async function getAfbEntries(page) {
  return page.evaluate(() => window.afbEntries || []);
}

/** Get HNR entries from the running app */
async function getHnrEntries(page) {
  return page.evaluate(() => window.hnrEntries || []);
}

/** Get a rider id by name */
async function getRiderIdByName(page, name) {
  return page.evaluate((n) => {
    const r = window.riders?.find(r => r.first.toLowerCase() === n.toLowerCase());
    return r ? String(r.id) : null;
  }, name);
}

/** Get a horse id by name */
async function getHorseIdByName(page, name) {
  return page.evaluate((n) => {
    const h = window.horses?.find(h => h.name.toLowerCase() === n.toLowerCase());
    return h ? String(h.id) : null;
  }, name);
}

// ── Toast assertions ───────────────────────────────────────────

async function expectToast(page, text) {
  const toast = page.locator('#toast');
  await expect(toast).toContainText(text, { timeout: 5000 });
}

// ── Cleanup helpers ────────────────────────────────────────────

/** Delete all AFB entries created during test (call in afterEach) */
async function cleanupAfb(page) {
  await page.evaluate(async () => {
    for (const a of (window.afbEntries || [])) {
      try { await window.sb.from('away_from_barn').delete().eq('id', a.id); } catch(e) {}
    }
    window.afbEntries = [];
  });
}

/** Delete all HNR entries created during test */
async function cleanupHnr(page) {
  await page.evaluate(async () => {
    for (const h of (window.hnrEntries || [])) {
      try { await window.sb.from('horse_unavailable').delete().eq('id', h.id); } catch(e) {}
    }
    window.hnrEntries = [];
  });
}

module.exports = {
  loginAsRider,
  loginAsParent,
  loginAsStaff,
  waitForAppReady,
  tomorrow,
  daysFromNow,
  todayStr,
  fillAfbSheet,
  fillHnrSheet,
  getAfbEntries,
  getHnrEntries,
  getRiderIdByName,
  getHorseIdByName,
  expectToast,
  cleanupAfb,
  cleanupHnr,
};
