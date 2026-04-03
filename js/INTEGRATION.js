/* ===========================================================
   INTEGRATION GUIDE — Away From Barn + Horse Not Rideable
   ===========================================================

   FILES TO ADD:
   ─────────────
   1. afb-data.js   — data layer (load BEFORE afb-ui.js)
   2. afb-ui.js     — UI layer (sheets, display builders)
   3. afb-sheets.html — HTML sheet templates (paste into index.html body)
   4. migration-afb-hnr.sql — run in Supabase SQL Editor

   SCRIPT LOAD ORDER (in index.html):
   ───────────────────────────────────
   <script src="js/ui-shared.js"></script>
   <script src="js/afb-data.js"></script>   ← NEW
   <script src="js/afb-ui.js"></script>     ← NEW
   <script src="js/ui-rider.js"></script>
   <script src="js/ui-parent.js"></script>
   <script src="js/ui-staff.js"></script>
   <script src="js/ui-browse.js"></script>
   <script src="js/sheets.js"></script>

   APP INIT — add to your startup/loadData function:
   ──────────────────────────────────────────────────
   // After loading bookings, horses, riders, shows...
   await loadAfbEntries();
   await loadHnrEntries();

   BOOKING FORM WIRING:
   ────────────────────
   In your booking save function (both staff and rider/parent),
   add conflict check BEFORE saving:

     // Staff booking form
     const {warnings, canProceed} = checkBookingConflicts(riderId, horseId, dateStr, timeStr);
     if (warnings.length > 0) {
       const msgs = warnings.map(w => w.message).join('\n');
       if (!canProceed) {
         showToast(msgs);
         return;
       }
       if (!confirm(msgs + '\n\nProceed anyway?')) return;
     }

   Also add live warnings to booking form field changes:

     // In openSheet('booking') — add after existing onchange handlers:
     document.getElementById('b-date').addEventListener('change', () => updateBookingConflictWarnings('b'));
     document.getElementById('b-rider').addEventListener('change', () => updateBookingConflictWarnings('b'));
     document.getElementById('b-horse').addEventListener('change', () => updateBookingConflictWarnings('b'));
     document.getElementById('b-time').addEventListener('change', () => updateBookingConflictWarnings('b'));

     // In openSheet('rider-booking'):
     document.getElementById('rb-date').addEventListener('change', () => updateBookingConflictWarnings('rb'));
     document.getElementById('rb-horse').addEventListener('change', () => updateBookingConflictWarnings('rb'));
     document.getElementById('rb-time').addEventListener('change', () => updateBookingConflictWarnings('rb'));

   Add a warning container div in each booking sheet HTML:
     <div id="b-conflict-warning"></div>     ← in staff booking sheet
     <div id="rb-conflict-warning"></div>    ← in rider booking sheet

   SHOW INTEGRATION:
   ─────────────────
   In your show save function, after saving the show record:

     await syncShowAfb(savedShow);

   This auto-creates AFB entries for riders added to shows
   and removes them when riders are removed.

   HTML TEMPLATES:
   ───────────────
   Copy the contents of afb-sheets.html into your index.html,
   alongside your existing sheet overlays (sheet-booking, etc.)

   =========================================================== */
