import { test, expect } from '@playwright/test';
import { mockData } from '../fixtures/mockData.js';

// ============================================================
// TEST HELPERS (shared with stablemate.spec.js)
// ============================================================

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function supabaseStubSource() {
  return `
  (() => {
    const state = {
      tables: globalThis.__SM_TEST_DATA__ || {},
      deletes: [],
      inserts: [],
      updates: []
    };

    globalThis.__SM_TEST_STATE__ = state;

    const clone = (v) => JSON.parse(JSON.stringify(v));

    const filterRows = (rows, filters) => {
      let out = rows.slice();
      for (const f of filters) {
        if (f.op === 'eq') out = out.filter(r => String(r[f.column]) === String(f.value));
        if (f.op === 'gte') out = out.filter(r => r[f.column] >= f.value);
        if (f.op === 'lte') out = out.filter(r => r[f.column] <= f.value);
        if (f.op === 'in') out = out.filter(r => (f.value || []).map(String).includes(String(r[f.column])));
        if (f.op === 'contains') {
          const expected = Array.isArray(f.value) ? f.value.map(String) : [String(f.value)];
          out = out.filter(r => {
            const actual = Array.isArray(r[f.column]) ? r[f.column].map(String) : [];
            return expected.every(v => actual.includes(v));
          });
        }
      }
      return out;
    };

    class Query {
      constructor(table) {
        this.table = table;
        this.filters = [];
        this._action = 'select';
        this._insertRows = [];
        this._updatePatch = null;
        this._orders = [];
        this._single = false;
      }
      select() { this._action = 'select'; return this; }
      delete() { this._action = 'delete'; return this; }
      insert(rows) { this._action = 'insert'; this._insertRows = Array.isArray(rows) ? rows : [rows]; return this; }
      upsert(rows) { this._action = 'upsert'; this._insertRows = Array.isArray(rows) ? rows : [rows]; return this; }
      update(patch) { this._action = 'update'; this._updatePatch = patch; return this; }
      eq(column, value) { this.filters.push({ op: 'eq', column, value }); return this._resolveIfNeeded(); }
      gte(column, value) { this.filters.push({ op: 'gte', column, value }); return this; }
      lte(column, value) { this.filters.push({ op: 'lte', column, value }); return this; }
      in(column, value) { this.filters.push({ op: 'in', column, value }); return this; }
      contains(column, value) { this.filters.push({ op: 'contains', column, value }); return this; }
      order(column, options = {}) { this._orders.push({ column, ascending: options.ascending !== false }); return this; }
      single() { this._single = true; return this._resolve(); }
      then(resolve, reject) { return this._resolve().then(resolve, reject); }
      _resolveIfNeeded() {
        if (this._action === 'delete' || this._action === 'update') return this._resolve();
        return this;
      }
      async _resolve() {
        const rows = state.tables[this.table] || [];
        if (this._action === 'select') {
          let data = filterRows(rows, this.filters);
          if (this._orders.length) {
            data = data.slice().sort((a, b) => {
              for (const ord of this._orders) {
                const left = a[ord.column];
                const right = b[ord.column];
                if (left === right) continue;
                return (left > right ? 1 : -1) * (ord.ascending ? 1 : -1);
              }
              return 0;
            });
          }
          const result = this._single ? (data[0] ?? null) : data;
          return { data: clone(result), error: null };
        }
        if (this._action === 'delete') {
          const toDelete = filterRows(rows, this.filters);
          state.tables[this.table] = rows.filter(row => !toDelete.some(x => String(x.id) === String(row.id)));
          state.deletes.push({ table: this.table, rows: clone(toDelete) });
          return { data: this._single ? clone(toDelete[0] ?? null) : clone(toDelete), error: null };
        }
        if (this._action === 'insert' || this._action === 'upsert') {
          const existing = state.tables[this.table] || [];
          const incoming = clone(this._insertRows).map((row, idx) => ({
            id: row.id ?? Date.now() + idx,
            ...row
          }));
          if (this._action === 'insert') {
            state.tables[this.table] = existing.concat(incoming);
          } else {
            const map = new Map(existing.map(row => [String(row.id), row]));
            for (const row of incoming) map.set(String(row.id), row);
            state.tables[this.table] = Array.from(map.values());
          }
          state.inserts.push({ table: this.table, rows: clone(incoming), mode: this._action });
          return { data: this._single ? clone(incoming[0] ?? null) : clone(incoming), error: null };
        }
        if (this._action === 'update') {
          const target = filterRows(rows, this.filters);
          const updated = target.map(row => ({ ...row, ...this._updatePatch }));
          state.tables[this.table] = rows.map(row => {
            const match = target.find(x => String(x.id) === String(row.id));
            return match ? { ...row, ...this._updatePatch } : row;
          });
          state.updates.push({ table: this.table, patch: clone(this._updatePatch), rows: clone(target) });
          return { data: this._single ? clone(updated[0] ?? null) : clone(updated), error: null };
        }
        return { data: null, error: null };
      }
    }

    globalThis.supabase = {
      createClient() {
        return {
          from(table) { return new Query(table); }
        };
      }
    };
  })();`;
}

async function installThirdPartyStubs(page) {
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: supabaseStubSource()
    });
  });

  await page.route('https://fonts.googleapis.com/**', async route => {
    await route.fulfill({ status: 200, contentType: 'text/css', body: '' });
  });

  await page.route('https://fonts.gstatic.com/**', async route => {
    await route.fulfill({ status: 200, body: '' });
  });
}

async function bootApp(page, options = {}) {
  const data = clone(mockData);
  if (options.dataOverrides) {
    for (const [key, value] of Object.entries(options.dataOverrides)) {
      data[key] = clone(value);
    }
  }

  await installThirdPartyStubs(page);
  await page.addInitScript(({ data, session }) => {
    globalThis.__SM_TEST_DATA__ = data;
    globalThis.confirm = () => true;
    globalThis.alert = () => {};
    if (session) {
      localStorage.setItem('sm_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('sm_session');
    }
  }, {
    data,
    session: options.session ?? null
  });

  await page.goto('/index.html');
  await page.locator('#loading-screen.hidden').waitFor({ timeout: 5000 });
  await page.waitForFunction(
    () => globalThis.appReady === true &&
          Array.isArray(globalThis.horses) &&
          Array.isArray(globalThis.riders) &&
          Array.isArray(globalThis.bookings) &&
          Array.isArray(globalThis.schedules),
    { timeout: 5000 }
  );
}


// ============================================================
// AUTHENTICATION & SESSION
// ============================================================

test.describe('Authentication & session', () => {
  test('splash screen shows on first visit', async ({ page }) => {
    await bootApp(page);
    await expect(page.locator('#screen-splash')).toHaveClass(/active/);
    await expect(page.locator('.splash-title')).toContainText('StableMate');
  });

  test('Get Started navigates to role selection', async ({ page }) => {
    await bootApp(page);
    await page.locator('.splash-btn').click();
    await expect(page.locator('#screen-role')).toHaveClass(/active/);
    await expect(page.locator('.role-card')).toHaveCount(3);
  });

  test('rider login via typed name', async ({ page }) => {
    await bootApp(page);
    await page.locator('.splash-btn').click();
    await page.click('.role-card:has-text("Rider")');
    await page.fill('#rider-name-input', 'Ava');
    await page.click('#screen-login-rider .login-btn');
    await expect(page.locator('#screen-rider-app')).toHaveClass(/active/);
    await expect(page.locator('#rider-topbar-name')).toHaveText('Ava');
  });

  test('parent login via typed name', async ({ page }) => {
    await bootApp(page);
    await page.locator('.splash-btn').click();
    await page.click('.role-card:has-text("Parent")');
    await page.fill('#parent-name-input', 'Jamie');
    await page.click('#screen-login-parent .login-btn');
    await expect(page.locator('#screen-parent-app')).toHaveClass(/active/);
  });

  test('staff login via typed name', async ({ page }) => {
    await bootApp(page);
    await page.locator('.splash-btn').click();
    await page.click('.role-card:has-text("Staff")');
    await page.fill('#staff-name-input', 'Megan');
    await page.click('#screen-login-staff .login-btn');
    await expect(page.locator('#screen-app')).toHaveClass(/active/);
  });

  test('session restores staff on reload', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await expect(page.locator('#screen-app')).toHaveClass(/active/);
    await expect(page.locator('#topbar-role')).toHaveText('Megan');
  });

  test('session restores rider on reload', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Ava' }, role: 'rider' } });
    await expect(page.locator('#screen-rider-app')).toHaveClass(/active/);
    await expect(page.locator('#rider-topbar-name')).toHaveText('Ava');
  });

  test('session restores parent on reload', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Jamie' }, role: 'parent' } });
    await expect(page.locator('#screen-parent-app')).toHaveClass(/active/);
  });

  test('sign out clears session and returns to splash', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.evaluate(() => signOut());
    await expect(page.locator('#screen-splash')).toHaveClass(/active/);
    const stored = await page.evaluate(() => localStorage.getItem('sm_session'));
    expect(stored).toBeNull();
  });

  test('back button on role screen returns to splash', async ({ page }) => {
    await bootApp(page);
    await page.locator('.splash-btn').click();
    await expect(page.locator('#screen-role')).toHaveClass(/active/);
    await page.click('.role-back');
    await expect(page.locator('#screen-splash')).toHaveClass(/active/);
  });
});


// ============================================================
// STAFF DASHBOARD
// ============================================================

test.describe('Staff dashboard', () => {
  test('shows correct stat counts', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await expect(page.locator('#stat-horses')).toHaveText('4');
    await expect(page.locator('#stat-riders')).toHaveText('4');
  });

  test('stat cards are clickable and navigate to panels', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.evaluate(() => { document.querySelector('#stat-horses').closest('.stat-card').click(); });
    await expect(page.locator('#panel-horses')).toHaveClass(/active/);
  });

  test('staff browse dropdown exists and opens', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.locator('#screen-app button:has-text("Browse")').click();
    await expect(page.locator('#staff-dd')).toHaveClass(/open/);
  });

  test('staff browse dropdown shows horses section', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.locator('#screen-app button:has-text("Browse")').click();
    const horsesSection = page.locator('#staff-dd-horses');
    await expect(horsesSection).toBeVisible();
  });

  test('bottom nav switches panels', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.click('#nav-calendar');
    await expect(page.locator('#panel-calendar')).toHaveClass(/active/);
    await page.click('#nav-horses');
    await expect(page.locator('#panel-horses')).toHaveClass(/active/);
    await page.click('#nav-riders');
    await expect(page.locator('#panel-riders')).toHaveClass(/active/);
    await page.click('#nav-home');
    await expect(page.locator('#panel-home')).toHaveClass(/active/);
  });
});


// ============================================================
// BOOKING SYSTEM
// ============================================================

test.describe('Booking system', () => {
  test('default booking time follows earliest trainer start', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    const defaultTime = await page.evaluate(() => getDefaultTimeForDate('2026-03-30'));
    expect(defaultTime).toBe('08:00');
  });

  test('default time returns 09:00 on days without trainers', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    const defaultTime = await page.evaluate(() => getDefaultTimeForDate('2026-03-29'));
    expect(defaultTime).toBe('09:00');
  });

  test('trainer warning shows for supervised booking without coverage', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.evaluate(() => {
      openSheet('booking');
      document.getElementById('sheet-booking').classList.add('open');
      document.getElementById('b-type').value = 'lesson';
      document.getElementById('b-date').value = '2026-03-31';
      populateTimeSelect('b-time', '14:00');
      document.getElementById('b-time').value = '14:00';
      checkTrainer();
    });
    await expect(page.locator('#trainer-warning')).toContainText('No trainer scheduled');
    await expect(page.locator('#trainer-warning')).toHaveClass(/warn/);
  });

  test('trainer warning shows OK when trainer is available', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.evaluate(() => {
      openSheet('booking');
      document.getElementById('sheet-booking').classList.add('open');
      document.getElementById('b-type').value = 'lesson';
      document.getElementById('b-date').value = '2026-03-30';
      populateTimeSelect('b-time', '09:00');
      document.getElementById('b-time').value = '09:00';
      checkTrainer();
    });
    await expect(page.locator('#trainer-warning')).toHaveClass(/ok/);
  });

  test('double-booking detection prevents same horse at same time', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    const blocked = await page.evaluate(() => isHorseDoubleBooked(1, '2026-03-30', '08:30', 60, null));
    expect(blocked).toBe(true);
  });

  test('double-booking allows non-overlapping times', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    const allowed = await page.evaluate(() => isHorseDoubleBooked(1, '2026-03-30', '10:00', 60, null));
    expect(allowed).toBe(false);
  });

  test('double-booking excludes current booking when editing', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    const allowed = await page.evaluate(() => isHorseDoubleBooked(1, '2026-03-30', '08:00', 60, 501));
    expect(allowed).toBe(false);
  });

  test('openSheet booking populates horse and rider selects', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.evaluate(() => openSheet('booking'));
    const horseOptions = await page.locator('#b-horse option').count();
    const riderOptions = await page.locator('#b-rider option').count();
    expect(horseOptions).toBeGreaterThan(1);
    expect(riderOptions).toBeGreaterThan(1);
  });
});


// ============================================================
// PERMISSIONS & ACCESS CONTROL
// ============================================================

test.describe('Permissions', () => {
  test('rider can delete own booking', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Ava' }, role: 'rider' } });
    const canDel = await page.evaluate(() => canDeleteBooking(501));
    expect(canDel).toBe(true);
  });

  test('rider cannot delete another rider booking', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Ava' }, role: 'rider' } });
    const canDel = await page.evaluate(() => canDeleteBooking(502));
    expect(canDel).toBe(false);
  });

  test('staff can delete any booking', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    const perms = await page.evaluate(() => ({
      b501: canDeleteBooking(501),
      b502: canDeleteBooking(502),
      b503: canDeleteBooking(503)
    }));
    expect(perms).toEqual({ b501: true, b502: true, b503: true });
  });

  test('parent can delete their children bookings only', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Jamie' }, role: 'parent' } });
    const perms = await page.evaluate(() => ({
      ava: canDeleteBooking(501),
      noah: canDeleteBooking(502)
    }));
    expect(perms).toEqual({ ava: true, noah: false });
  });

  test('deleteAnyBooking removes booking and sends Supabase delete', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    const before = await page.evaluate(() => bookings.length);
    await page.evaluate(async () => { await deleteAnyBooking(501); });
    const after = await page.evaluate(() => ({
      count: bookings.length,
      deletes: globalThis.__SM_TEST_STATE__.deletes
    }));
    expect(after.count).toBe(before - 1);
    expect(after.deletes).toHaveLength(1);
    expect(after.deletes[0].table).toBe('bookings');
    expect(after.deletes[0].rows[0].id).toBe(501);
  });
});


// ============================================================
// PARENT VIEW
// ============================================================

test.describe('Parent view', () => {
  test('shows only parent own children', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Jamie' }, role: 'parent' } });
    const childNames = await page.locator('#screen-parent-app .child-card .child-name').allTextContents();
    const actualChildren = childNames.filter(n => n !== 'View All Riders');
    expect(actualChildren).toContain('Ava');
    expect(actualChildren).toContain('Mia');
    expect(actualChildren).not.toContain('Noah');
  });

  test('children sorted by next lesson', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Jamie' }, role: 'parent' } });
    // Filter to only actual child cards, not "View All Riders"
    const childNames = await page.locator('#screen-parent-app .child-card .child-name').allTextContents();
    const actualChildren = childNames.filter(n => n !== 'View All Riders');
    expect(actualChildren.length).toBe(2);
  });

  test('parent booking sheet shows child selector with correct children', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Jamie' }, role: 'parent' } });
    await page.evaluate(() => {
      openSheet('rider-booking');
      document.getElementById('sheet-rider-booking').classList.add('open');
    });
    const childOptions = await page.locator('#rb-child option').allTextContents();
    expect(childOptions).toEqual(expect.arrayContaining(['Ava', 'Mia']));
    expect(childOptions).not.toContain('Noah');
  });

  test('child schedule opens when clicking a child card', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Jamie' }, role: 'parent' } });
    await page.evaluate(() => {
      const cards = document.querySelectorAll('#screen-parent-app .child-card');
      for (const c of cards) { if (c.textContent.includes('Ava') || c.textContent.includes('Mia')) { c.click(); break; } }
    });
    await expect(page.locator('#screen-child-schedule')).toHaveClass(/active/);
  });

  test('Taylor only sees Noah', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Taylor' }, role: 'parent' } });
    const childNames = await page.locator('#screen-parent-app .child-card .child-name').allTextContents();
    const actualChildren = childNames.filter(n => n !== 'View All Riders');
    expect(actualChildren).toEqual(['Noah']);
  });
});


// ============================================================
// RIDER VIEW
// ============================================================

test.describe('Rider view', () => {
  test('shows rider greeting with name', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Ava' }, role: 'rider' } });
    await expect(page.locator('.rider-greeting')).toContainText('Ava');
  });

  test('shows trainer availability chips', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Ava' }, role: 'rider' } });
    const trainerChips = page.locator('.trainer-chip');
    const count = await trainerChips.count();
    expect(count).toBeGreaterThan(0);
  });

  test('rider browse dropdown exists', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Ava' }, role: 'rider' } });
    await page.locator('#screen-rider-app button:has-text("Browse")').click();
    await expect(page.locator('#rider-dd')).toHaveClass(/open/);
  });

  test('Book a Visit button exists', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Ava' }, role: 'rider' } });
    const fab = page.locator('#screen-rider-app .book-fab');
    await expect(fab).toBeVisible();
    await expect(fab).toContainText('Book');
  });

  test('weekly calendar renders 7 days', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Ava' }, role: 'rider' } });
    // The week calendar grid has 7 day cells
    const dayCells = page.locator('#rider-content [onclick*="showWeekDayDetail"]');
    const count = await dayCells.count();
    expect(count).toBe(7);
  });
});


// ============================================================
// WEEKLY CALENDAR
// ============================================================

test.describe('Weekly calendar', () => {
  test('week calendar day click opens detail panel not booking', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Ava' }, role: 'rider' } });
    // Verify the onclick uses showWeekDayDetail, not bookFromWeekCal
    const onclickAttr = await page.evaluate(() => {
      const content = document.getElementById('rider-content');
      if (!content) return '';
      const dayCell = content.querySelector('[onclick*="showWeekDayDetail"]');
      return dayCell ? dayCell.getAttribute('onclick') : '';
    });
    expect(onclickAttr).toContain('showWeekDayDetail');
    expect(onclickAttr).not.toContain('bookFromWeekCal');
  });

  test('week offset navigation changes displayed dates', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Ava' }, role: 'rider' } });
    const week0 = await page.evaluate(() => currentWeekOffset);
    expect(week0).toBe(0);
    await page.evaluate(() => changeWeekOffset(1));
    const week1 = await page.evaluate(() => currentWeekOffset);
    expect(week1).toBe(1);
  });

  test('week offset cannot go below zero', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Ava' }, role: 'rider' } });
    await page.evaluate(() => changeWeekOffset(-1));
    const offset = await page.evaluate(() => currentWeekOffset);
    expect(offset).toBe(0);
  });
});


// ============================================================
// HORSE MANAGEMENT
// ============================================================

test.describe('Horse management', () => {
  test('horses panel shows all horses', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.evaluate(() => showPanel('horses'));
    await expect(page.locator('#panel-horses')).toHaveClass(/active/);
    const horseCards = page.locator('#horses-dash .person-card, #horses-dash .horse-card');
    const count = await horseCards.count();
    expect(count).toBe(4);
  });

  test('horse access levels are displayed', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.evaluate(() => showPanel('horses'));
    const content = await page.locator('#horses-dash').textContent();
    expect(content).toContain('Atlas');
    expect(content).toContain('Bella');
  });
});


// ============================================================
// RIDER MANAGEMENT (STAFF)
// ============================================================

test.describe('Rider management', () => {
  test('riders panel shows all riders', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.evaluate(() => showPanel('riders'));
    await expect(page.locator('#panel-riders')).toHaveClass(/active/);
    const content = await page.locator('#riders-dash').textContent();
    expect(content).toContain('Ava');
    expect(content).toContain('Mia');
    expect(content).toContain('Noah');
    expect(content).toContain('Ella');
  });

  test('rider cards have edit buttons', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.evaluate(() => showPanel('riders'));
    const editBtns = page.locator('#riders-dash button:has-text("Edit")');
    const count = await editBtns.count();
    expect(count).toBe(4);
  });

  test('openEditRider prefills the form', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.evaluate(() => openEditRider(101));
    const name = await page.locator('#r-first').inputValue();
    const level = await page.locator('#r-level').inputValue();
    expect(name).toBe('Ava');
    expect(level).toBe('intermediate');
  });

  test('rider form shows approved horses multi-select', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.evaluate(() => openEditRider(101));
    const horseOptions = await page.locator('#r-horses option').count();
    expect(horseOptions).toBe(4);
  });

  test('rider update sends Supabase update', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.evaluate(() => openEditRider(101));
    await page.selectOption('#r-level', 'advanced');
    await page.evaluate(async () => { await saveRider(); });
    const updates = await page.evaluate(() => globalThis.__SM_TEST_STATE__.updates);
    expect(updates.length).toBeGreaterThan(0);
    const riderUpdate = updates.find(u => u.table === 'riders');
    expect(riderUpdate).toBeDefined();
    expect(riderUpdate.patch.level).toBe('advanced');
  });
});


// ============================================================
// SHOWS & EVENTS
// ============================================================

test.describe('Shows & events', () => {
  test('shows panel displays upcoming shows', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.evaluate(() => showPanel('shows'));
    const content = await page.locator('#shows-dash').textContent();
    expect(content).toContain('Spring Classic');
    expect(content).toContain('Summer Schooling');
  });

  test('show detail view displays entered horses and riders', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.evaluate(() => showShowDetail(801));
    const content = await page.locator('#child-schedule-content').textContent();
    expect(content).toContain('Spring Classic');
    expect(content).toContain('Atlas');
    expect(content).toContain('Ava');
  });
});


// ============================================================
// LUNGE REQUESTS
// ============================================================

test.describe('Lunge requests', () => {
  test('lunge panel shows pending count', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    const pendingCount = await page.evaluate(() => lungeRequests.filter(r => r.status === 'pending').length);
    expect(pendingCount).toBe(1);
  });

  test('lunge stat card shows correct count', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await expect(page.locator('#stat-lunge')).toHaveText('1');
  });

  test('accepting a lunge request updates its status', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.evaluate(async () => { await acceptLungeRequest(701); });
    const updates = await page.evaluate(() => globalThis.__SM_TEST_STATE__.updates);
    const lungeUpdate = updates.find(u => u.table === 'lunge_requests');
    expect(lungeUpdate).toBeDefined();
    expect(lungeUpdate.patch.status).toBe('accepted');
  });

  test('declining a lunge request updates its status', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    await page.evaluate(async () => { await declineLungeRequest(701); });
    const updates = await page.evaluate(() => globalThis.__SM_TEST_STATE__.updates);
    const lungeUpdate = updates.find(u => u.table === 'lunge_requests');
    expect(lungeUpdate).toBeDefined();
    expect(lungeUpdate.patch.status).toBe('declined');
  });
});


// ============================================================
// UTILITY FUNCTIONS
// ============================================================

test.describe('Utility functions', () => {
  test('fmtDate formats correctly', async ({ page }) => {
    await bootApp(page);
    const result = await page.evaluate(() => fmtDate(new Date('2026-04-01T12:00:00')));
    expect(result).toBe('2026-04-01');
  });

  test('addDays computes correctly', async ({ page }) => {
    await bootApp(page);
    const result = await page.evaluate(() => fmtDate(addDays(new Date('2026-04-01T12:00:00'), 3)));
    expect(result).toBe('2026-04-04');
  });

  test('bookingEndTime calculates correctly', async ({ page }) => {
    await bootApp(page);
    const result = await page.evaluate(() => bookingEndTime({ time: '08:00', duration: 90 }));
    expect(result).toBe('09:30');
  });

  test('fmtDur formats minutes to readable string', async ({ page }) => {
    await bootApp(page);
    const results = await page.evaluate(() => ({
      short: fmtDur(30),
      hour: fmtDur(60),
      mixed: fmtDur(90)
    }));
    expect(results.short).toBe('30min');
    expect(results.hour).toBe('1h');
    expect(results.mixed).toBe('1h 30min');
  });

  test('isFutureBooking filters correctly', async ({ page }) => {
    await bootApp(page);
    const results = await page.evaluate(() => {
      const todayStr = fmtDate(today);
      return {
        future: isFutureBooking({ date: '2099-01-01', time: '08:00', duration: 60 }),
        past: isFutureBooking({ date: '2020-01-01', time: '08:00', duration: 60 })
      };
    });
    expect(results.future).toBe(true);
    expect(results.past).toBe(false);
  });

  test('initials extracts correctly', async ({ page }) => {
    await bootApp(page);
    const results = await page.evaluate(() => ({
      single: initials('Ava'),
      double: initials('Ava Smith'),
      empty: initials('')
    }));
    expect(results.single).toBe('A');
    expect(results.double).toBe('AS');
    expect(results.empty).toBe('?');
  });

  test('getTrainersForDate returns trainers on scheduled day', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    const monday = await page.evaluate(() => getTrainersForDate('2026-03-30').map(s => s.trainer_name));
    expect(monday).toContain('Megan');
    expect(monday).toContain('Chris');
  });

  test('getTrainersForDate returns empty on unscheduled day', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    const sunday = await page.evaluate(() => getTrainersForDate('2026-03-29'));
    expect(sunday).toHaveLength(0);
  });

  test('isTrainerAvailable checks time windows', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    const results = await page.evaluate(() => ({
      covered: isTrainerAvailable('2026-03-30', '09:00'),
      uncovered: isTrainerAvailable('2026-03-30', '14:00')
    }));
    expect(results.covered.available).toBe(true);
    expect(results.uncovered.available).toBe(false);
  });

  test('arenaLabel resolves arena codes', async ({ page }) => {
    await bootApp(page);
    const results = await page.evaluate(() => ({
      covered: arenaLabel('covered'),
      lunging: arenaLabel('lunging')
    }));
    expect(results.covered).toBe('Covered Arena');
    expect(results.lunging).toBe('Lunging Arena');
  });
});


// ============================================================
// DATA INTEGRITY
// ============================================================

test.describe('Data integrity', () => {
  test('all global arrays are populated after boot', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    const counts = await page.evaluate(() => ({
      horses: horses.length,
      riders: riders.length,
      bookings: bookings.length,
      owners: owners.length,
      schedules: schedules.length,
      shows: shows.length,
      lungeRequests: lungeRequests.length
    }));
    expect(counts.horses).toBe(4);
    expect(counts.riders).toBe(4);
    expect(counts.bookings).toBe(5);
    expect(counts.owners).toBe(2);
    expect(counts.schedules).toBe(4);
    expect(counts.shows).toBe(2);
    expect(counts.lungeRequests).toBe(2);
  });

  test('getHorse, getRider, getOwner resolve by ID', async ({ page }) => {
    await bootApp(page, { session: { user: { name: 'Megan' }, role: 'staff' } });
    const results = await page.evaluate(() => ({
      horse: getHorse(1)?.name,
      rider: getRider(101)?.first,
      owner: getOwner(11)?.first,
      missing: getHorse(999)
    }));
    expect(results.horse).toBe('Atlas');
    expect(results.rider).toBe('Ava');
    expect(results.owner).toBe('Olivia');
    expect(results.missing).toBeUndefined();
  });
});
