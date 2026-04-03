import { test, expect } from '@playwright/test';
import { mockData } from '../fixtures/mockData.js';

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


test.describe('StableMate regression suite', () => {
  test('boots to splash for a first-time visitor', async ({ page }) => {
    await bootApp(page);

    await expect(page.locator('#screen-splash')).toHaveClass(/active/);
    await expect(page.locator('.splash-title')).toContainText('StableMate');
  });

  test('restores a staff session directly into the dashboard', async ({ page }) => {
    await bootApp(page, {
      session: { user: { name: 'Megan' }, role: 'staff' }
    });

    await expect(page.locator('#screen-app')).toHaveClass(/active/);
    await expect(page.locator('#topbar-role')).toHaveText('Megan');
    await expect(page.locator('#stat-horses')).toHaveText(String(mockData.horses.length));
  });

  test('rider login takes the user into the rider app and shows their name', async ({ page }) => {
    await bootApp(page);

    await page.locator('#screen-splash .splash-btn').click();
    await page.click('.role-card:has-text("Rider")');
    await page.fill('#rider-name-input', 'Ava');
    await page.click('#screen-login-rider .login-btn');

    await expect(page.locator('#screen-rider-app')).toHaveClass(/active/);
    await expect(page.locator('#rider-topbar-name')).toHaveText('Ava');
  });

  test('parent rider-booking sheet shows only that parent\u2019s children', async ({ page }) => {
    await bootApp(page, {
      session: { user: { name: 'Jamie' }, role: 'parent' }
    });

    await page.evaluate(() => {
      openSheet('rider-booking');
      document.getElementById('sheet-rider-booking').classList.add('open');
    });

    const childOptions = await page.locator('#rb-child option').allTextContents();
    expect(childOptions).toEqual(['\u2014 Select child \u2014', 'Ava', 'Mia']);
  });

  test('default booking time follows the earliest trainer start on that day', async ({ page }) => {
    await bootApp(page, {
      session: { user: { name: 'Megan' }, role: 'staff' }
    });

    const defaultTime = await page.evaluate(() => getDefaultTimeForDate('2026-03-30'));
    expect(defaultTime).toBe('08:00');
  });

  test('trainer warning shows when a supervised session has no trainer coverage', async ({ page }) => {
    await bootApp(page, {
      session: { user: { name: 'Megan' }, role: 'staff' }
    });

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

  test('permission helper allows a rider to delete only their own booking', async ({ page }) => {
    await bootApp(page, {
      session: { user: { name: 'Ava' }, role: 'rider' }
    });

    const permissions = await page.evaluate(() => ({
      own: canDeleteBooking(501),
      other: canDeleteBooking(502)
    }));

    expect(permissions).toEqual({ own: true, other: false });
  });

  test('deleteAnyBooking removes the booking from client state and sends one delete to Supabase', async ({ page }) => {
    await bootApp(page, {
      session: { user: { name: 'Megan' }, role: 'staff' }
    });

    const before = await page.evaluate(() => bookings.length);
    expect(before).toBe(mockData.bookings.length);

    await page.evaluate(async () => {
      await deleteAnyBooking(501);
    });

    const after = await page.evaluate(() => ({
      count: bookings.length,
      deletes: globalThis.__SM_TEST_STATE__.deletes
    }));

    expect(after.count).toBe(mockData.bookings.length - 1);
    expect(after.deletes).toHaveLength(1);
    expect(after.deletes[0].table).toBe('bookings');
    expect(after.deletes[0].rows[0].id).toBe(501);
  });

  test('sign out clears the saved session and returns to splash', async ({ page }) => {
    await bootApp(page, {
      session: { user: { name: 'Megan' }, role: 'staff' }
    });

    await page.evaluate(() => signOut());

    await expect(page.locator('#screen-splash')).toHaveClass(/active/);
    const stored = await page.evaluate(() => localStorage.getItem('sm_session'));
    expect(stored).toBeNull();
  });
});
