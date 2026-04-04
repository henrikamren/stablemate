/* ===========================================================
   [9] UI BUILDERS — Shared Helpers & Calendars
   =========================================================== */

// ── Tiny helpers used everywhere ──────────────────────────────

/** Current HH:MM string for the local clock */
function nowTimeStr(){
  return String(today.getHours()).padStart(2,'0')+':'+String(today.getMinutes()).padStart(2,'0');
}

/** Human-friendly date label: "Today" or "Wed, Mar 5" */
function friendlyDate(dateStr, opts){
  opts=opts||{weekday:'short',month:'short',day:'numeric'};
  const todayStr=fmtDate(today);
  if(dateStr===todayStr) return 'Today';
  return new Date(dateStr+'T12:00:00').toLocaleDateString('en-US',opts);
}

/** Long date label: "Wednesday, March 5" */
function friendlyDateLong(dateStr){
  return new Date(dateStr+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
}

// ── Trainer chips row ─────────────────────────────────────────

/** Renders the trainer availability chip strip for a given date */
function buildTrainerChips(dateStr){
  const dayTrainers=getTrainersForDate(dateStr);
  if(dayTrainers.length>0){
    return dayTrainers.map(s=>
      `<div class="trainer-chip available"><div class="trainer-chip-dot" style="background:${TRAINER_COLORS[s.trainer_name]||TRAINER_COLORS.default}"></div>${s.trainer_name} · ${s.start_time}–${s.end_time}</div>`
    ).join('');
  }
  return '<div class="trainer-chip unavailable"><div class="trainer-chip-dot" style="background:#ccc"></div>No trainer today</div>';
}

/** Renders trainer dots for a calendar day detail view */
function buildTrainerDetail(dateStr){
  const dayTrainers=getTrainersForDate(dateStr);
  if(dayTrainers.length>0){
    return `<div style="margin-bottom:10px">${dayTrainers.map(s=>
      `<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);margin-bottom:3px">
        <div style="width:8px;height:8px;border-radius:50%;background:${TRAINER_COLORS[s.trainer_name]||TRAINER_COLORS.default}"></div>
        ${s.trainer_name} · ${s.start_time}–${s.end_time}
      </div>`).join('')}</div>`;
  }
  return '<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">No trainer scheduled</div>';
}

// ── Next-up card ──────────────────────────────────────────────

/**
 * Renders the "▶ Next …" hero card.
 * @param {object} opts
 *   headline  – e.g. horse name or rider name
 *   label     – "Next Visit" | "Next Up" | "Next Session"
 *   detail    – second line (type · duration · arena)
 *   timeLine  – third line (date · time)
 *   style     – extra CSS for wrapper (optional)
 */
function buildNextUpCard(opts){
  if(!opts) return '';
  return `<div class="next-up-card"${opts.style?' style="'+opts.style+'"':''}>
    <div class="next-up-label">▶ ${opts.label||'Next Up'}</div>
    <div class="next-up-horse">${opts.headline}</div>
    <div class="next-up-detail">${opts.detail}</div>
    <div class="next-up-time">${opts.timeLine}</div>
  </div>`;
}

/** Convenience: build a next-up card from a booking object */
function buildNextUpFromBooking(b, opts){
  if(!b) return '';
  opts=opts||{};
  const h=getHorse(b.horse_id);
  const r=getRider(b.rider_id);
  const t=typeConfig[b.type]||{label:b.type};
  const headline=opts.showRider?(r?r.first:'Unassigned'):(h?h.name:'Unassigned');
  return buildNextUpCard({
    headline,
    label:opts.label||'Next Visit',
    detail:`${t.label} · ${fmtDur(b.duration)} · ${arenaLabel(b.arena)}${opts.showRider?'':(r?' · '+r.first:'')}`,
    timeLine:`${friendlyDate(b.date)} · ${b.time}`,
    style:opts.style||''
  });
}

// ── Schedule item (single booking row in a card) ──────────────

/**
 * Renders one schedule-item row.
 * @param {object} b       booking record
 * @param {object} opts
 *   showDate   – prepend friendly date to detail line
 *   showActions – render Edit / Cancel buttons
 *   actionEdit – onclick string for edit   (default: editBookingFromRider)
 *   actionDel  – onclick string for cancel (default: deleteAnyBooking)
 *   passed     – boolean, grey-out if true (auto-detected when omitted)
 *   dotColor   – override for the schedule-dot
 */
function buildScheduleItem(b, opts){
  opts=opts||{};
  const h=getHorse(b.horse_id);
  const r=getRider(b.rider_id);
  const t=typeConfig[b.type]||{label:b.type,dot:'#888'};
  const trs=getTrainersForDate(b.date);
  const trAvail=trs.length>0?trs.map(s=>s.trainer_name).join(', '):'No trainer';
  const todayStr=fmtDate(today);
  const passed=opts.passed!==undefined?opts.passed:(b.date<todayStr||(b.date===todayStr&&bookingEndTime(b)<=nowTimeStr()));
  const dl=opts.showDate?(friendlyDate(b.date)+' · '):'';
  const dot=opts.dotColor||t.dot;

  const editFn=opts.actionEdit||`editBookingFromRider(${b.id})`;
  const delFn=opts.actionDel||`deleteAnyBooking(${b.id})`;

  return `<div class="schedule-item" style="${passed?'opacity:0.45':''}">
    <div class="schedule-time" style="${passed?'text-decoration:line-through':''}">${b.time}</div>
    <div class="schedule-dot" style="background:${passed?'#ccc':dot}"></div>
    <div class="schedule-info" style="${passed?'text-decoration:line-through':''}">
      <div class="schedule-horse">${h?h.name:'<span class="unassigned-badge">Unassigned</span>'}${opts.showRiderName&&r?' – '+r.first:''}</div>
      <div class="schedule-detail">${dl}${t.label} · ${fmtDur(b.duration)}</div>
      <div class="schedule-rider" style="color:var(--text-muted)">${arenaLabel(b.arena)} · ${trAvail}</div>
    </div>
    ${opts.showActions&&!passed?`<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
      <button class="btn btn-secondary btn-sm" style="font-size:10px;padding:5px 8px" onclick="event.stopPropagation();${editFn}">Edit</button>
      <button class="btn-danger-sm" style="font-size:10px;padding:5px 8px" onclick="event.stopPropagation();${delFn}">Cancel</button>
    </div>`:''}
    ${opts.showDelete&&!passed?`<button class="btn-danger-sm" onclick="${delFn}">✕</button>`:''}
  </div>`;
}

// ── Booking row (compact, used in week-day detail & cal-day) ──

/**
 * Renders a compact booking-row (horse – rider, meta line, badge, actions).
 * @param {object} b       booking
 * @param {object} opts
 *   showActions – show Edit/Cancel
 *   actionEdit – onclick for edit
 *   actionDel  – onclick for cancel
 */
function buildBookingRow(b, opts){
  opts=opts||{};
  const h=getHorse(b.horse_id);
  const r=getRider(b.rider_id);
  const t=typeConfig[b.type]||{label:b.type,dot:'#888',cls:'ev-arena'};
  const todayStr=fmtDate(today);
  const passed=opts.passed!==undefined?opts.passed:(b.date<todayStr||(b.date===todayStr&&bookingEndTime(b)<=nowTimeStr()));

  return `<div class="booking-row" style="${passed?'opacity:0.5':''}">
    <div class="booking-left">
      <div class="booking-horse" style="${passed?'text-decoration:line-through':''}">${h?h.name:'Unknown'}${r?' – '+r.first:''}${!b.rider_id?'<span class="unassigned-badge" style="margin-left:6px">No rider</span>':''}</div>
      <div class="booking-meta" style="${passed?'text-decoration:line-through':''}">${b.time} – ${t.label} – ${fmtDur(b.duration)} – ${arenaLabel(b.arena)}${opts.showDateInMeta?' · '+friendlyDate(b.date):''}</div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
      <span class="ev-badge ${t.cls}">${t.label}</span>
      ${opts.showActions&&!passed?`<div style="display:flex;gap:4px">
        ${opts.actionEdit?`<button class="btn btn-secondary btn-sm" style="font-size:10px;padding:5px 8px" onclick="${opts.actionEdit}">Edit</button>`:''}
        ${opts.actionDel?`<button class="btn-danger-sm" style="font-size:10px;padding:5px 8px" onclick="${opts.actionDel}">Cancel</button>`:''}
      </div>`:''}
    </div>
  </div>`;
}

// ── Staff schedule item (dashboard today/tomorrow list) ───────

function buildStaffScheduleItem(b){
  const h=getHorse(b.horse_id);
  const r=getRider(b.rider_id);
  const t=typeConfig[b.type]||{label:b.type,dot:'#888',cls:'ev-arena'};
  return `<div class="schedule-item">
    <div class="schedule-time">${b.time}</div>
    <div class="schedule-dot" style="background:${t.dot}"></div>
    <div class="schedule-info">
      <div class="schedule-horse">${h?h.name:'Unknown'}${!b.rider_id?'<span class="unassigned-badge">No rider</span>':''}</div>
      <div class="schedule-detail"><span class="ev-badge ${t.cls}">${t.label}</span> · ${fmtDur(b.duration)} · ${arenaLabel(b.arena)}</div>
      ${r?`<div class="schedule-rider">${r.first}</div>`:''}
    </div>
    <button class="btn-danger-sm" onclick="deleteBooking(${b.id})">✕</button>
  </div>`;
}

// ── Mini 7-day week strip ─────────────────────────────────────

/**
 * Renders a compact 7-day strip showing bookings for a single entity.
 * @param {object} opts
 *   filterFn(booking,dateStr)  – return true to include a booking on that day
 *   dotFn(booking)             – return CSS color string for the pip
 *   cellSize   – px width/height of each cell (default 24, browse uses 28)
 *   chipHeight – px height of each pip (default 5, staff cards use 4/6)
 *   chipWidth  – CSS width of pip (default '14px')
 *   maxPips    – max visible booking pips per cell (default 2)
 *   trainerBar – height of trainer-color top bar (default 2, browse uses 3)
 */
function buildMiniWeek(opts){
  opts=opts||{};
  const todayStr=fmtDate(today);
  const days7=['S','M','T','W','T','F','S'];
  const cellSz=opts.cellSize||24;
  const chipH=opts.chipHeight||5;
  const chipW=opts.chipWidth||'14px';
  const maxP=opts.maxPips||2;
  const trBar=opts.trainerBar||2;
  const filterFn=opts.filterFn||(()=>false);
  const dotFn=opts.dotFn||(b=>{const t=typeConfig[b.type]||{dot:'#888'};return t.dot;});

  let html=`<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;${opts.margin||'margin-top:8px'}">`;
  for(let i=0;i<7;i++){
    const d=addDays(today,i);
    const ds=fmtDate(d);
    const isToday=ds===todayStr;
    const dayBs=bookings.filter(b=>filterFn(b,ds));
    const hasTrainer=getTrainersForDate(ds).length>0;
    const trColor=hasTrainer?(TRAINER_COLORS[getTrainersForDate(ds)[0]?.trainer_name]||TRAINER_COLORS.default):'transparent';
    html+=`<div style="text-align:center">
      <div style="font-size:8px;color:var(--text-muted);margin-bottom:1px">${days7[d.getDay()]}</div>
      <div style="width:${cellSz}px;height:${cellSz}px;border-radius:${cellSz>24?6:5}px;margin:${cellSz>24?'2px':'0'} auto;background:${isToday?'var(--cream-dark)':'var(--cream)'};border:1px solid ${isToday?'var(--earth)':'var(--sand)'};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;overflow:hidden;position:relative${cellSz>24?';padding:2px 1px':''}">
        ${hasTrainer?`<div style="position:absolute;top:0;left:0;right:0;height:${trBar}px;background:${trColor};opacity:0.8"></div>`:''}
        ${dayBs.length>0
          ?dayBs.slice(0,maxP).map(b=>`<div style="width:${chipW};height:${chipH}px;border-radius:2px;background:${dotFn(b)}"></div>`).join('')
          :`<div style="width:${cellSz>24?5:4}px;height:${cellSz>24?5:4}px;border-radius:50%;background:var(--sand)"></div>`}
      </div>
      <div style="font-size:8px;color:var(--text-muted);margin-top:1px">${d.getDate()}</div>
    </div>`;
  }
  html+='</div>';
  return html;
}

// ── Section header ────────────────────────────────────────────

/**
 * Cormorant-styled section header with optional right-side meta text.
 *   buildSectionHeader('This Week','Next 7 days')
 */
function buildSectionHeader(title, meta, style){
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;${style||''}">
    <div style="font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--earth)">${title}</div>
    ${meta?`<div style="font-size:11px;color:var(--text-muted)">${meta}</div>`:''}
  </div>`;
}

// ── Child / rider card (parent "Your Children", "All Riders") ─

/**
 * A compact card for a rider showing avatar, name, next booking.
 * @param {object} rider  – rider record
 * @param {object} opts
 *   onclick     – click handler string
 *   showBadge   – extra badge html (e.g. "Your child")
 *   style       – extra CSS for the card wrapper
 */
function buildChildCard(rider, opts){
  opts=opts||{};
  const todayStr=fmtDate(today);
  const now=nowTimeStr();
  const cb=bookings.filter(b=>b.rider_id===rider.id&&(b.date>todayStr||(b.date===todayStr&&bookingEndTime(b)>now)))
    .sort((a,b)=>a.date===b.date?a.time.localeCompare(b.time):a.date.localeCompare(b.date));
  const next=cb[0];
  const h=next?getHorse(next.horse_id):null;
  const t=next?(typeConfig[next.type]||{label:next.type}):null;

  return `<div class="child-card" onclick="${opts.onclick||''}"${opts.style?' style="'+opts.style+'"':''}>
    <div class="child-avatar">${rider.first[0]}</div>
    <div class="child-info">
      <div class="child-name">${rider.first}${opts.showBadge||''}</div>
      ${next
        ?`<div class="child-next-hl">Next: ${friendlyDate(next.date)} · ${next.time}</div>
           <div class="child-next">${h?h.name:'Unassigned'} · ${t?t.label:''}</div>`
        :'<div class="child-next">No upcoming visits</div>'}
    </div>
    <div class="child-chevron">›</div>
  </div>`;
}


/* ===========================================================
   [9b] UI BUILDERS — Calendars
   =========================================================== */
function buildWeekCalendar(highlightRiderIds, weekOffset){
  if(typeof weekOffset==='undefined')weekOffset=currentWeekOffset||0;
  const todayStr=fmtDate(today);
  const days7=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const startDate=addDays(today,weekOffset*7);

  // Build legend for highlighted riders
  let legendHtml='';
  if(highlightRiderIds.length>0){
    legendHtml='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">';
    highlightRiderIds.forEach(rid=>{
      const r=getRider(rid);if(!r)return;
      const color=getRiderColor(rid);
      legendHtml+=`<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-muted)">
        <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>${r.first}
      </div>`;
    });
    legendHtml+='</div>';
  }

  // Nav arrows
  const rangeStart=addDays(today,weekOffset*7);
  const rangeEnd=addDays(today,weekOffset*7+6);
  const rangeLabel=rangeStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' - '+rangeEnd.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  let navHtml=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
    <button onclick="changeWeekOffset(-1)" style="background:none;border:1px solid var(--sand);border-radius:6px;width:28px;height:28px;cursor:pointer;color:var(--text-muted);font-size:14px;display:flex;align-items:center;justify-content:center">${weekOffset>0?'<':'<'}</button>
    <div style="font-size:12px;color:var(--text-muted)">${rangeLabel}</div>
    <button onclick="changeWeekOffset(1)" style="background:none;border:1px solid var(--sand);border-radius:6px;width:28px;height:28px;cursor:pointer;color:var(--text-muted);font-size:14px;display:flex;align-items:center;justify-content:center">></button>
  </div>`;

  let html=navHtml+legendHtml+'<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">';

  for(let i=0;i<7;i++){
    const d=addDays(startDate,i);
    const ds=fmtDate(d);
    const isToday=ds===todayStr;
    const dayTrainers=getTrainersForDate(ds);
    const hasTrainer=dayTrainers.length>0;
    const trainerNames=[...new Set(dayTrainers.map(s=>s.trainer_name))];
    const myBookings=bookings.filter(b=>b.date===ds&&highlightRiderIds.includes(parseInt(b.rider_id)));
    const allBookings=bookings.filter(b=>b.date===ds);
    const trainerColor=hasTrainer?(TRAINER_COLORS[trainerNames[0]]||TRAINER_COLORS.default):'transparent';

    html+=`<div style="background:var(--white);border-radius:8px;border:1px solid ${isToday?'var(--earth)':'var(--sand)'};overflow:hidden;${isToday?'box-shadow:0 0 0 2px var(--earth)':''}cursor:pointer" onclick="showWeekDayDetail('${ds}')">
      <div style="height:4px;background:${trainerColor};opacity:${hasTrainer?0.85:0}"></div>
      <div style="padding:4px 4px 2px;text-align:center">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.06em;color:${isToday?'var(--earth)':'var(--text-muted)'};font-weight:${isToday?'500':'400'}">${days7[d.getDay()]}</div>
        <div style="font-size:13px;font-weight:${isToday?'600':'500'};width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:50%;margin:1px auto;${isToday?'background:var(--earth);color:var(--white)':'color:var(--text-muted)'}">${d.getDate()}</div>
      </div>
      <div style="padding:2px 4px 5px;display:flex;flex-direction:column;gap:2px;min-height:24px">
        ${typeof buildAfbIndicator==='function'?buildAfbIndicator(ds,highlightRiderIds):''}
        ${typeof buildHnrIndicator==='function'?buildHnrIndicator(ds,[]):''}
        ${myBookings.map(b=>{
          const rColor=getRiderColor(b.rider_id);
          const r=getRider(b.rider_id);
          const h=getHorse(b.horse_id);
          return`<div style="background:${rColor};border-radius:3px;padding:2px 3px;font-size:9px;color:white;line-height:1.3">
            <div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r?r.first:b.time}</div>
            ${h?`<div style="opacity:0.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h.name}</div>`:''}
          </div>`;
        }).join('')}
        ${allBookings.length>0&&myBookings.length===0?`<div style="width:6px;height:6px;border-radius:50%;background:var(--sand);margin:2px auto"></div>`:''}
      </div>
      ${hasTrainer?`<div style="padding:0 3px 4px;text-align:center"><div style="font-size:8px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${trainerNames.join('/')}</div></div>`:''}
    </div>`;
  }
  html+='</div>';
  return html;
}

function changeWeekOffset(dir){
  currentWeekOffset+=dir;
  if(currentWeekOffset<0)currentWeekOffset=0;
  if(currentRole==='rider')renderRiderHome();
  else if(currentRole==='parent')renderParentHome();
  else if(currentRole==='staff'){renderDash();}
}

// -- RIDER DAY VIEW CALENDAR --
function buildDayCalendar(dateStr, myBookingIds){
  const SLOT_H=48;
  const START_H=7, END_H=18;
  const totalH=END_H-START_H;
  const dayTrainers=getTrainersForDate(dateStr);
  const dayBookings=bookings.filter(b=>b.date===dateStr).sort((a,b)=>a.time.localeCompare(b.time));

  const canBook=currentRole==='rider'||currentRole==='parent'||currentRole==='staff';
  let rows='';
  for(let h=START_H;h<=END_H;h++){
    const label=h===0?'12am':h<12?h+'am':h===12?'12pm':(h-12)+'pm';
    const timeStr=String(h).padStart(2,'0')+':00';
    const slotClick=canBook?`onclick="openBookingAtTime('${dateStr}','${timeStr}')"`:' ';
    const slotCursor=canBook?'cursor:pointer;':'';
    rows+=`<div style="display:flex;align-items:flex-start;min-height:${SLOT_H}px;border-top:1px solid var(--cream-dark);position:relative">
      <div style="width:44px;font-size:10px;color:var(--text-muted);padding-top:3px;flex-shrink:0">${label}</div>
      <div ${slotClick} style="${slotCursor}flex:1;position:relative;min-height:${SLOT_H}px" id="cal-slot-${h}"></div>
    </div>`;
  }

  let trainerBg='';
  dayTrainers.forEach(s=>{
    const sh=parseInt(s.start_time.split(':')[0]);
    const sm=parseInt(s.start_time.split(':')[1]);
    const eh=parseInt(s.end_time.split(':')[0]);
    const em=parseInt(s.end_time.split(':')[1]);
    const top=((sh-START_H)+(sm/60))*SLOT_H;
    const height=((eh-sh)+((em-sm)/60))*SLOT_H;
    if(top>=0&&height>0){
      trainerBg+=`<div style="position:absolute;left:44px;right:0;top:${top}px;height:${height}px;background:${TRAINER_COLORS[s.trainer_name]||TRAINER_COLORS.default};opacity:0.08;pointer-events:none;z-index:0"></div>`;
    }
  });

  let bookingBlocks='';
  dayBookings.forEach(b=>{
    const [bh,bm]=b.time.split(':').map(Number);
    const top=((bh-START_H)+(bm/60))*SLOT_H;
    const height=((b.duration||60)/60)*SLOT_H;
    if(top<0||top>(totalH*SLOT_H))return;
    const h=getHorse(b.horse_id);const r=getRider(b.rider_id);const t=typeConfig[b.type]||{dot:'#888',label:b.type};
    const isMe=myBookingIds.includes(b.id);
    const canAct=currentRole==='staff'||isMe;
    const bg=isMe?t.dot:'var(--sand)';
    const textColor=isMe?'white':'var(--text-muted)';
    bookingBlocks+=`<div onclick="${canAct?`showBookingPopup(${b.id},event)`:''}" style="position:absolute;left:44px;right:4px;top:${top}px;height:${Math.max(height-2,20)}px;background:${bg};border-radius:6px;padding:3px 6px;overflow:hidden;z-index:1;display:flex;align-items:flex-start;justify-content:space-between;${canAct?'cursor:pointer':''}">
      <div style="min-width:0;overflow:hidden">
        <div style="font-size:11px;font-weight:500;color:${textColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h?h.name:(r?r.first:'Booking')}</div>
        ${height>30?`<div style="font-size:10px;color:${textColor};opacity:0.85">${t.label}${r?' · '+r.first:''}</div>`:''}
      </div>
    </div>`;
  });

  return `<div style="position:relative;overflow:hidden">
    ${trainerBg}
    ${rows}
    ${bookingBlocks}
  </div>`;
}

function showBookingPopup(bookingId, event){
  event.stopPropagation();
  dismissBookingPopup();
  const b=bookings.find(x=>x.id===bookingId);
  if(!b)return;
  const h=getHorse(b.horse_id);const r=getRider(b.rider_id);const t=typeConfig[b.type]||{label:b.type};
  const todayStr=fmtDate(today);
  const passed=b.date<todayStr||(b.date===todayStr&&bookingEndTime(b)<=nowTimeStr());

  const popup=document.createElement('div');
  popup.id='booking-popup';
  popup.style.cssText='position:fixed;inset:0;z-index:150;display:flex;align-items:center;justify-content:center;background:rgba(20,8,4,0.4)';
  popup.onclick=function(e){if(e.target===popup)dismissBookingPopup();};
  popup.innerHTML=`<div style="background:var(--white);border-radius:14px;padding:20px;width:calc(100% - 48px);max-width:340px;box-shadow:0 8px 30px rgba(0,0,0,0.15)">
    <div style="font-family:'Cormorant Garamond',serif;font-size:20px;color:var(--earth);margin-bottom:12px">${h?h.name:'Booking'}</div>
    <div style="font-size:13px;color:var(--text);margin-bottom:4px">${friendlyDate(b.date)} at ${b.time} · ${fmtDur(b.duration)}</div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">${t.label} · ${arenaLabel(b.arena)}</div>
    ${r?`<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Rider: ${r.first}</div>`:''}
    ${b.notes?`<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Notes: ${b.notes}</div>`:''}
    ${passed?'<div style="font-size:12px;color:var(--text-muted);font-style:italic;margin-bottom:12px">This session has ended</div>':''}
    <div style="display:flex;gap:8px;margin-top:14px">
      ${!passed?`<button class="btn btn-secondary" style="flex:1;font-size:13px;padding:12px" onclick="dismissBookingPopup();editBookingFromRider(${b.id})">Edit</button>`:''}
      ${!passed?`<button class="btn-danger-sm" style="flex:1;font-size:13px;padding:12px;border-radius:8px" onclick="dismissBookingPopup();deleteAnyBooking(${b.id})">Cancel</button>`:''}
      <button class="btn btn-secondary" style="${passed?'flex:1;':''}font-size:13px;padding:12px" onclick="dismissBookingPopup()">Close</button>
    </div>
  </div>`;
  document.body.appendChild(popup);
}

function dismissBookingPopup(){
  const el=document.getElementById('booking-popup');
  if(el)el.remove();
}
