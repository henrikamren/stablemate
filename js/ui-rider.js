/* ===========================================================
   [10] RIDER VIEW
   =========================================================== */
function renderRiderHome(){
  const name=currentUser.name;
  const todayStr=fmtDate(today);
  const nameLower=name.trim().toLowerCase();
  const rider=riders.find(r=>r.first.toLowerCase()===nameLower||(r.first+' '+(r.last||'')).toLowerCase()===nameLower);
  const nowTimeRH=String(today.getHours()).padStart(2,'0')+':'+String(today.getMinutes()).padStart(2,'0');
  const myB=rider?bookings.filter(b=>b.rider_id===rider.id&&(b.date>todayStr||(b.date===todayStr&&bookingEndTime(b)>nowTimeRH))).sort((a,b)=>a.date===b.date?a.time.localeCompare(b.time):a.date.localeCompare(b.date)):[];
  const myBIds=myB.map(b=>b.id);
  const next=myB[0];

  // Today's trainers
  const todayTrainers=getTrainersForDate(todayStr);
  const trainerHtml=todayTrainers.length>0
    ?todayTrainers.map(s=>`<div class="trainer-chip available"><div class="trainer-chip-dot" style="background:${TRAINER_COLORS[s.trainer_name]||TRAINER_COLORS.default}"></div>${s.trainer_name} · ${s.start_time}–${s.end_time}</div>`).join('')
    :'<div class="trainer-chip unavailable"><div class="trainer-chip-dot" style="background:#ccc"></div>No trainer today</div>';

  let html=`<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:2px">
    <div class="rider-greeting">Hi, ${name.split(' ')[0]} 👋</div>
    <div style="font-size:11px;color:var(--text-muted);letter-spacing:0.06em">Oasis Farm</div>
  </div>
  <div class="rider-date-sub">${today.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
  <div class="trainer-avail-row">${trainerHtml}</div>
  <div id="rider-weather"></div>`;
  fetchWeather().then(w=>renderWeatherCard(w,document.getElementById('rider-weather')));

  if(next){
    const h=getHorse(next.horse_id);const t=typeConfig[next.type]||{label:next.type};
    const dl=next.date===todayStr?'Today':new Date(next.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
    html+=`<div class="next-up-card">
      <div class="next-up-label">▶ Next Visit</div>
      <div class="next-up-horse">${h?h.name:'Unassigned'}</div>
      <div class="next-up-detail">${t.label} · ${fmtDur(next.duration)} · ${arenaLabel(next.arena)}</div>
      <div class="next-up-time">${dl} · ${next.time}</div>
    </div>`;
  }

  // Booking list header top left
  html+=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
    <div style="font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--earth)">Upcoming</div>
    <div style="font-size:11px;color:var(--text-muted)">${myB.length} scheduled</div>
  </div>`;

  const nowTimeR=String(today.getHours()).padStart(2,'0')+':'+String(today.getMinutes()).padStart(2,'0');

  if(myB.length===0){
    html+='<div class="empty" style="padding:24px 20px"><div class="empty-icon">🐴</div><div class="empty-text">No upcoming visits booked</div></div>';
  } else {
    // Show only next 3 days of bookings, with option to expand
    const threeDaysOut=fmtDate(addDays(today,3));
    const previewB=myB.filter(b=>b.date<=threeDaysOut);
    const restB=myB.filter(b=>b.date>threeDaysOut);

    html+='<div class="schedule-card" style="margin-bottom:12px">';
    html+=`<div class="schedule-header"><div class="schedule-title">Next 3 Days</div><div class="schedule-meta">${previewB.length} session${previewB.length!==1?'s':''}</div></div>`;

    function renderBookingItem(b, showDate){
      const h=getHorse(b.horse_id);const t=typeConfig[b.type]||{label:b.type,dot:'#888'};
      const trs=getTrainersForDate(b.date);
      const trAvail=trs.length>0?trs.map(s=>s.trainer_name).join(', '):'No trainer';
      const passed=b.date<todayStr||(b.date===todayStr&&bookingEndTime(b)<=nowTimeR);
      const dl=showDate?(b.date===todayStr?'Today':new Date(b.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}))+' · ':'';
      return`<div class="schedule-item" style="${passed?'opacity:0.45':''}">
        <div class="schedule-time" style="${passed?'text-decoration:line-through':''}">${b.time}</div>
        <div class="schedule-dot" style="background:${passed?'#ccc':t.dot}"></div>
        <div class="schedule-info" style="${passed?'text-decoration:line-through':''}">
          <div class="schedule-horse">${h?h.name:'<span class="unassigned-badge">Unassigned</span>'}</div>
          <div class="schedule-detail">${dl}${t.label} · ${fmtDur(b.duration)}</div>
          <div class="schedule-rider" style="color:var(--text-muted)">${arenaLabel(b.arena)} · ${trAvail}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
          ${!passed?`<button class="btn btn-secondary btn-sm" style="font-size:10px;padding:5px 8px" onclick="event.stopPropagation();editBookingFromRider(${b.id})">Edit</button>`:''}
          ${!passed?`<button class="btn-danger-sm" style="font-size:10px;padding:5px 8px" onclick="event.stopPropagation();deleteAnyBooking(${b.id})">Cancel</button>`:''}
        </div>
      </div>`;
    }

    previewB.forEach(b=>{ html+=renderBookingItem(b, true); });
    html+='</div>';

    if(restB.length>0){
      html+=`<div id="rider-more-bookings" style="display:none"><div class="schedule-card" style="margin-bottom:12px">
        <div class="schedule-header"><div class="schedule-title">Later</div><div class="schedule-meta">${restB.length} more</div></div>`;
      restB.forEach(b=>{ html+=renderBookingItem(b, true); });
      html+=`</div><button class="btn btn-secondary" style="width:100%;margin-bottom:16px;font-size:12px;padding:10px" onclick="document.getElementById('rider-more-bookings').style.display='none';document.getElementById('rider-expand-btn').style.display='block'">Collapse</button></div>`;
      html+=`<button id="rider-expand-btn" class="btn btn-secondary" style="width:100%;margin-bottom:16px;font-size:12px;padding:10px" onclick="document.getElementById('rider-more-bookings').style.display='block';this.style.display='none'">Show ${restB.length} more session${restB.length!==1?'s':''}</button>`;
    }
  }

  // Weekly calendar
  const myBIdsForWeek=myB.map(b=>parseInt(b.rider_id));
  const riderId=rider?parseInt(rider.id):null;
  const weekRiderIds=riderId?[riderId]:[];
  html+=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
    <div style="font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--earth)">This Week</div>
    <div style="font-size:11px;color:var(--text-muted)">Next 7 days</div>
  </div>
  <div style="margin-bottom:20px">${buildWeekCalendar(weekRiderIds)}</div>`;

  // Day view calendar for today
  html+=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
    <div style="font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--earth)">Today's Arena</div>
    <div style="font-size:11px;color:var(--text-muted)">${today.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
  </div>
  <div style="background:var(--white);border-radius:10px;border:1px solid var(--sand);overflow:hidden;margin-bottom:20px">
    <div id="rider-day-cal" style="overflow-y:auto;max-height:320px;position:relative;padding:0 4px 4px">
      ${buildDayCalendar(todayStr, myBIds)}
    </div>
  </div>`;

  document.getElementById('rider-content').innerHTML=html;

  // Scroll day calendar to 1PM
  const calEl=document.getElementById('rider-day-cal');
  if(calEl){
    const SLOT_H=48;
    const START_H=7;
    const scrollTo=(13-START_H)*SLOT_H - 20; // 1PM minus a little offset
    calEl.scrollTop=Math.max(0,scrollTo);
  }
}
