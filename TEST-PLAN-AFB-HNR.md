# StableMate — Test Plan: Away From Barn + Horse Not Rideable

**Version:** 1.0  
**Feature:** AFB (Away From Barn) + HNR (Horse Not Rideable)  
**Date:** April 2026  

---

## SECTION A — Away From Barn (Rider)

### T-AFB-01: Add single all-day AFB (rider)
| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as rider | Rider home loads |
| 2 | Tap "Mark Away From Barn" button | AFB sheet opens with start/end date, all-day toggle, reason |
| 3 | Pick future date for both start and end, leave all-day on, reason "Dentist" | Fields accept input |
| 4 | Save | Toast confirms, AFB card appears in "Away From Barn" section on rider home |

### T-AFB-02: Add partial-day AFB (rider)
| Step | Action | Expected |
|------|--------|----------|
| 1 | Open AFB sheet, set same start/end date | Single day selected |
| 2 | Toggle all-day OFF | Start/end time selects appear |
| 3 | Set 08:00–12:00, reason "Vet appt" | Fields accept |
| 4 | Save | AFB shows with time range in schedule and day detail views |

### T-AFB-03: Add multi-day AFB (date range)
| Step | Action | Expected |
|------|--------|----------|
| 1 | Open AFB sheet | Form loads |
| 2 | Set start date March 15, end date March 19, reason "Spring break" | 5-day range |
| 3 | All-day toggle hidden or disabled, time pickers hidden | Multi-day forces all-day |
| 4 | Save | AFB appears on all 5 days in week calendar with AFB badge |
| 5 | View any day in range via day detail | AFB entry shown with "Mar 15 – Mar 19 · Spring break" |

### T-AFB-04: Multi-day hides partial-day option
| Step | Action | Expected |
|------|--------|----------|
| 1 | Open AFB sheet, set start March 15, end March 17 | Range spans 3 days |
| 2 | Look for all-day toggle | Toggle hidden, defaulted to all-day |
| 3 | Change end date to match start (single day) | Toggle reappears, time pickers available if toggled off |

### T-AFB-05: Edit existing AFB
| Step | Action | Expected |
|------|--------|----------|
| 1 | View rider schedule with existing AFB | Edit button visible on AFB entry |
| 2 | Tap Edit | Sheet opens pre-filled with current values |
| 3 | Extend end date by 2 days | Range updates in form |
| 4 | Save | Toast confirms, calendar updates across new range |

### T-AFB-06: Delete AFB
| Step | Action | Expected |
|------|--------|----------|
| 1 | View AFB entry, tap ✕ delete button | Confirm dialog appears |
| 2 | Confirm | All days in range cleared, toast "Away From Barn removed" |

### T-AFB-07: Parent adds AFB for child
| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as parent, view child's schedule | Child schedule loads |
| 2 | Tap "Mark [child] Away From Barn" | AFB sheet opens with child pre-selected |
| 3 | Set March 20–22, reason "Family vacation" | 3-day range for child |
| 4 | Save | AFB created for child, visible on child's schedule |

### T-AFB-08: Staff adds AFB for any rider
| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as staff | Dashboard loads |
| 2 | Navigate to a rider's schedule, or open AFB sheet from calendar | Rider dropdown shows all riders |
| 3 | Select rider, set range, save | AFB created for selected rider |

### T-AFB-09: Show auto-creates AFB
| Step | Action | Expected |
|------|--------|----------|
| 1 | Staff adds rider to show on March 25 | After save + syncShowAfb, AFB auto-created for March 25 |
| 2 | View rider's schedule | AFB visible with "Show" badge and reason "Show: [name]" |
| 3 | Edit to partial day (rider returns by 2pm) | Times saved, all-day toggled off |

### T-AFB-10: Multi-day show creates matching range
| Step | Action | Expected |
|------|--------|----------|
| 1 | Show has end_date field set to March 27 (start March 25) | AFB range = March 25–27 |
| 2 | Show is single-day (no end_date) | AFB is single day |

### T-AFB-11: Show removal cleans up AFB
| Step | Action | Expected |
|------|--------|----------|
| 1 | Remove rider from show | Auto-created AFB (matching show_id) deleted silently |
| 2 | AFB was manually edited after auto-creation | Prompt: "This was modified — delete anyway?" |

### T-AFB-12: Booking conflict — all-day range
| Step | Action | Expected |
|------|--------|----------|
| 1 | Rider has AFB March 15–19 | — |
| 2 | Attempt to book rider on March 17 | Warning: "Riley is Away From Barn Mar 15 – Mar 19 (all day)" |
| 3 | Staff confirms booking | Booking saved (staff can override) |
| 4 | Rider/parent attempts same | Blocked — cannot override |

### T-AFB-13: Booking conflict — partial day
| Step | Action | Expected |
|------|--------|----------|
| 1 | Rider has AFB on March 20, 08:00–12:00 | — |
| 2 | Book at 10:00 | Warning shown |
| 3 | Book at 14:00 | No warning (outside AFB window) |

### T-AFB-14: Calendar display — range
| Step | Action | Expected |
|------|--------|----------|
| 1 | Week calendar with AFB spanning Mon–Fri | All 5 day cells show "AFB" badge |
| 2 | Monthly calendar day detail | AFB entry listed with range + reason above bookings |
| 3 | Week day detail (click a day) | AFB panel shown with edit/delete (if owner) |

### T-AFB-15: Role permissions
| Step | Action | Expected |
|------|--------|----------|
| 1 | Rider views another rider's AFB | No edit/delete buttons |
| 2 | Parent views non-child rider's AFB | No edit/delete buttons |
| 3 | Staff views any AFB | Full edit/delete access |

### T-AFB-16: Validation — date range
| Step | Action | Expected |
|------|--------|----------|
| 1 | Set end date before start date | Toast: "End date must be on or after start date" |
| 2 | Rider sets start date in the past | Toast: "Cannot set dates in the past" |
| 3 | Staff sets start date in the past | Allowed (staff can backdate) |
| 4 | Leave reason blank | Allowed — reason is optional |

### T-AFB-17: Existing bookings warning on AFB creation
| Step | Action | Expected |
|------|--------|----------|
| 1 | Rider has 2 bookings on March 17–18 | — |
| 2 | Create AFB covering March 15–19 | Confirm dialog: "Riley has 2 existing bookings in this range. Save anyway?" |
| 3 | Confirm | AFB saved (bookings remain — user can cancel them separately) |
| 4 | Cancel | AFB not saved |

---

## SECTION B — Horse Not Rideable (HNR)

### T-HNR-01: Staff marks horse not rideable (single day)
| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as staff, view horse card in Herd panel | "Mark Not Rideable" button visible |
| 2 | Tap button | HNR sheet opens with horse pre-selected |
| 3 | Set date, reason "Lame — left front" | Fields accept |
| 4 | Save | Toast confirms, horse card shows "Currently Not Rideable" indicator |

### T-HNR-02: Staff marks horse not rideable (date range)
| Step | Action | Expected |
|------|--------|----------|
| 1 | Open HNR sheet from horse schedule page | Form loads |
| 2 | Set start March 10, end March 14, reason "Recovery — pulled shoe" | 5-day range |
| 3 | Save | HNR visible across all 5 days on horse schedule and calendar |

### T-HNR-03: Partial-day HNR
| Step | Action | Expected |
|------|--------|----------|
| 1 | Set single day, toggle all-day off | Time pickers appear |
| 2 | Set 06:00–10:00, reason "Farrier" | Morning block |
| 3 | Save | HNR shows with time range |

### T-HNR-04: Multi-day forces all-day
| Step | Action | Expected |
|------|--------|----------|
| 1 | Set start March 10, end March 12 | Range spans 3 days |
| 2 | All-day toggle hidden/disabled | Correct — time pickers hidden |

### T-HNR-05: Edit HNR
| Step | Action | Expected |
|------|--------|----------|
| 1 | View horse schedule with HNR entry | Edit button visible |
| 2 | Tap Edit, change end date and reason | Fields update |
| 3 | Save | Updated across calendar and horse cards |

### T-HNR-06: Delete HNR
| Step | Action | Expected |
|------|--------|----------|
| 1 | View HNR entry, tap ✕ | Confirm dialog |
| 2 | Confirm | Removed, toast "Horse availability restored" |

### T-HNR-07: Booking conflict — horse not rideable
| Step | Action | Expected |
|------|--------|----------|
| 1 | Horse marked not rideable March 10–14 | — |
| 2 | Staff tries to book that horse on March 12 | Warning shown, can proceed (staff override) |
| 3 | Rider/parent tries to book that horse on March 12 | Warning shown, blocked (cannot override) |

### T-HNR-08: Partial-day HNR conflict
| Step | Action | Expected |
|------|--------|----------|
| 1 | Horse HNR 06:00–10:00 on March 15 | — |
| 2 | Book at 09:00 | Warning |
| 3 | Book at 11:00 | No warning |

### T-HNR-09: Horse card indicator
| Step | Action | Expected |
|------|--------|----------|
| 1 | Horse has active HNR today | Herd panel card shows "🚫 Currently Not Rideable" |
| 2 | HNR ends tomorrow | Card shows normal "Mark Not Rideable" button today after range ends |

### T-HNR-10: Horse schedule HNR list
| Step | Action | Expected |
|------|--------|----------|
| 1 | View horse schedule with upcoming HNR entries | "Not Rideable" card shown with date range, reason, days count |
| 2 | Staff sees edit/delete buttons | Present |
| 3 | Rider/parent views same horse | No edit/delete buttons on HNR entries |

### T-HNR-11: Calendar display — horse
| Step | Action | Expected |
|------|--------|----------|
| 1 | Week calendar cell on a day with HNR horse | "NR" badge visible in cell |
| 2 | Day detail panel | HNR entry with red border shown above bookings |

### T-HNR-12: Role permissions for HNR
| Step | Action | Expected |
|------|--------|----------|
| 1 | Rider tries to open HNR sheet | Toast: "Only staff can mark horses as not rideable" |
| 2 | Parent tries | Same block |
| 3 | Staff | Full access |

### T-HNR-13: Validation
| Step | Action | Expected |
|------|--------|----------|
| 1 | End date before start date | Toast error |
| 2 | No horse selected | Toast: "Please select a horse" |
| 3 | Partial day: end time before start time | Toast error |
| 4 | Reason blank | Allowed |

### T-HNR-14: Existing bookings warning on HNR creation
| Step | Action | Expected |
|------|--------|----------|
| 1 | Horse has 3 bookings in March 10–14 | — |
| 2 | Create HNR for March 10–14 | Confirm: "Dusty has 3 existing bookings in this range. Save anyway?" |
| 3 | Confirm | HNR saved |

---

## SECTION C — Cross-feature Interactions

### T-CROSS-01: Rider away + horse not rideable same day
| Step | Action | Expected |
|------|--------|----------|
| 1 | Rider has AFB March 15, horse has HNR March 15 | — |
| 2 | Staff books that rider on that horse | Both warnings shown in conflict panel |

### T-CROSS-02: AFB doesn't affect other riders
| Step | Action | Expected |
|------|--------|----------|
| 1 | Riley has AFB March 15–19 | — |
| 2 | Book Jordan on March 17 | No AFB warning |

### T-CROSS-03: HNR doesn't affect other horses
| Step | Action | Expected |
|------|--------|----------|
| 1 | Dusty has HNR March 10–14 | — |
| 2 | Book Star on March 12 | No HNR warning |

### T-CROSS-04: Existing bookings when AFB created over them
| Step | Action | Expected |
|------|--------|----------|
| 1 | Rider has booking on March 17 | — |
| 2 | Create AFB March 15–19 | Warning: "1 existing booking in this range" |
| 3 | Save anyway | AFB saved, booking remains (user must cancel separately) |

### T-CROSS-05: Existing bookings when HNR created over them
| Step | Action | Expected |
|------|--------|----------|
| 1 | Horse has 2 bookings March 10–14 | — |
| 2 | Create HNR March 10–14 | Warning: "2 bookings in this range" |

### T-CROSS-06: Live booking form warnings
| Step | Action | Expected |
|------|--------|----------|
| 1 | Open staff booking form | No warnings initially |
| 2 | Select a rider who has AFB on the selected date | AFB warning appears below form fields |
| 3 | Select a horse with HNR on that date | HNR warning appears too |
| 4 | Change date to one without conflicts | Warnings disappear |

### T-CROSS-07: Calendar shows both AFB and HNR on same day
| Step | Action | Expected |
|------|--------|----------|
| 1 | Day has rider AFB and horse HNR | — |
| 2 | View week calendar cell | Both "AFB" and "NR" badges visible |
| 3 | View day detail panel | Both AFB and HNR entries listed above bookings |

---

## SECTION D — Data Integrity

### T-DATA-01: Supabase persistence
| Step | Action | Expected |
|------|--------|----------|
| 1 | Create AFB, refresh page | AFB still present after reload |
| 2 | Create HNR, refresh page | HNR still present after reload |
| 3 | Edit AFB, refresh | Updated values persist |
| 4 | Delete HNR, refresh | Entry gone |

### T-DATA-02: Cascade delete — rider removed
| Step | Action | Expected |
|------|--------|----------|
| 1 | Rider has 2 AFB entries | — |
| 2 | Delete the rider | AFB entries cascade-deleted (ON DELETE CASCADE) |

### T-DATA-03: Cascade delete — horse removed
| Step | Action | Expected |
|------|--------|----------|
| 1 | Horse has HNR entry | — |
| 2 | Delete the horse | HNR entry cascade-deleted |

### T-DATA-04: Show deleted with auto-AFB
| Step | Action | Expected |
|------|--------|----------|
| 1 | Show has auto-created AFB entries | — |
| 2 | Delete the show | show_id set to NULL on AFBs (ON DELETE SET NULL), entries remain |
| 3 | User can manually delete orphaned AFBs | Edit/delete still functional |
