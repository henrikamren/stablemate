/* ===========================================================
   [11] PARENT VIEW
   =========================================================== */
function renderParentHome(){
  const name=currentUser.name;
  const todayStr=fmtDate(today);
  const myChildren=riders.filter(r=>r.parents&&r.parents.split(',').map(p=>p.trim().toLowerCase()).includes(name.trim().toLowerCase()));

  // Today's trainers
  const todayTrainers=getTrainersForDate(todayStr);
  const trainerHtml=todayTrainers.length>0
    ?todayTrainers.map(s=>`<div class="trainer-chip available"><div class="trainer-chip-dot" style="background:${TRAINER_COLORS[s.trainer_name]||TRAINER_COLORS.default}"></div>${s.trainer_name} · ${s.start_time}–${s.end_time}</div>`).join('')
    :'<div class="trainer-chip unavailable"><div class="trainer-chip-dot" style="background:#ccc"></div>No trainer today</div>';

  let html=`<div class="rider-greeting">Hi, ${name.split(' ')[0]} 👋</div>
  <div class="rider-date-sub">${today.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
  <div class="trainer-avail-row">${trainerHtml}</div>
  <div id="parent-weather"></div>`;

  // Weekly calendar highlighting all my children
  const myChildIds=myChildren.map(ch=>parseInt(ch.id));
  html+=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
    <div style="font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--earth)">This Week</div>
    <div style="font-size:11px;color:var(--text-muted)">Your children's schedule</div>
  </div>
  <div style="margin-bottom:20px">${buildWeekCalendar(myChildIds)}</div>`;

  if(myChildren.length>0){
    html+=`<div class="section-label">Your Children</div>`;
    const nowTimePH=String(today.getHours()).padStart(2,'0')+':'+String(today.getMinutes()).padStart(2,'0');
    // Sort children by next lesson: earliest first, no upcoming last
    const childrenSorted=myChildren.slice().sort((a,b)=>{
      const aNext=bookings.filter(bk=>bk.rider_id===a.id&&(bk.date>todayStr||(bk.date===todayStr&&bookingEndTime(bk)>nowTimePH))).sort((x,y)=>x.date===y.date?x.time.localeCompare(y.time):x.date.localeCompare(y.date))[0];
      const bNext=bookings.filter(bk=>bk.rider_id===b.id&&(bk.date>todayStr||(bk.date===todayStr&&bookingEndTime(bk)>nowTimePH))).sort((x,y)=>x.date===y.date?x.time.localeCompare(y.time):x.date.localeCompare(y.date))[0];
      if(!aNext&&!bNext)return 0;
      if(!aNext)return 1;
      if(!bNext)return -1;
      if(aNext.date!==bNext.date)return aNext.date.localeCompare(bNext.date);
      return aNext.time.localeCompare(bNext.time);
    });
    childrenSorted.forEach(child=>{
      const cb=bookings.filter(b=>b.rider_id===child.id&&(b.date>todayStr||(b.date===todayStr&&bookingEndTime(b)>nowTimePH))).sort((a,b)=>a.date.localeCompare(b.date));
      const next=cb[0];const h=next?getHorse(next.horse_id):null;const t=next?(typeConfig[next.type]||{label:next.type}):null;
      html+=`<div class="child-card" onclick="showChildSchedule(${child.id},true)">
        <div class="child-avatar">${child.first[0]}</div>
        <div class="child-info">
          <div class="child-name">${child.first}</div>
          ${next
            ?`<div class="child-next-hl">Next: ${next.date===todayStr?'Today':new Date(next.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} · ${next.time}</div>
             <div class="child-next">${h?h.name:'Unassigned'} · ${t?t.label:''}</div>`
            :'<div class="child-next">No upcoming visits</div>'}
        </div>
        <div class="child-chevron">›</div>
      </div>`;
    });
  }

  // All riders section
  html+=`<div class="section-label" style="margin-top:20px">All Riders at ${BARN_NAME}</div>
  <div class="child-card" onclick="showAllRiders()" style="background:var(--cream-dark)">
    <div class="child-avatar" style="background:var(--sand)">◉</div>
    <div class="child-info">
      <div class="child-name">View All Riders</div>
      <div class="child-next">${riders.length} riders · tap to browse schedules</div>
    </div>
    <div class="child-chevron">›</div>
  </div>`;

  document.getElementById('parent-content').innerHTML=html;
  // Fetch weather AFTER html is in DOM
  fetchWeather().then(w=>renderWeatherCard(w,document.getElementById('parent-weather')));
}

function showAllRiders(){
  const todayStr=fmtDate(today);
  let html=`<div class="rider-greeting">All Riders</div>
  <div class="rider-date-sub" style="margin-bottom:20px">${BARN_NAME}</div>`;
  if(riders.length===0){
    html+='<div class="empty"><div class="empty-icon">🏇</div><div class="empty-text">No riders registered yet</div></div>';
  } else {
    riders.forEach(r=>{
      const nowTimeAR=String(today.getHours()).padStart(2,'0')+':'+String(today.getMinutes()).padStart(2,'0');
      const cb=bookings.filter(b=>b.rider_id===r.id&&(b.date>todayStr||(b.date===todayStr&&bookingEndTime(b)>nowTimeAR))).sort((a,b)=>a.date.localeCompare(b.date));
      const next=cb[0];const h=next?getHorse(next.horse_id):null;const t=next?(typeConfig[next.type]||{label:next.type}):null;
      html+=`<div class="child-card" onclick="showChildSchedule(${r.id},false)">
        <div class="child-avatar">${r.first[0]}</div>
        <div class="child-info">
          <div class="child-name">${r.first}</div>
          ${next
            ?`<div class="child-next-hl">Next: ${next.date===todayStr?'Today':new Date(next.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} · ${next.time}</div>
             <div class="child-next">${h?h.name:'Unassigned'} · ${t?t.label:''}</div>`
            :'<div class="child-next">No upcoming visits</div>'}
        </div>
        <div class="child-chevron">›</div>
      </div>`;
    });
  }
  document.getElementById('all-riders-content').innerHTML=html;
  showScreen('all-riders');
}

function showChildSchedule(riderId,canBook){
  const child=getRider(riderId);if(!child)return;
  currentChildId=riderId;
  const todayStr=fmtDate(today);
  const nowTime=String(today.getHours()).padStart(2,'0')+':'+String(today.getMinutes()).padStart(2,'0');
  // Only show future and currently-active bookings
  const cb=bookings.filter(b=>b.rider_id===child.id&&(b.date>todayStr||(b.date===todayStr&&bookingEndTime(b)>nowTime))).sort((a,b)=>a.date===b.date?a.time.localeCompare(b.time):a.date.localeCompare(b.date));

  let html=`<div class="rider-greeting">${child.first}</div>
  <div class="rider-date-sub" style="margin-bottom:20px">${child.level} rider · ${BARN_NAME}</div>`;

  if(cb.length===0){
    html+='<div class="empty"><div class="empty-icon">◫</div><div class="empty-text">No upcoming visits</div></div>';
  } else {
    html+='<div class="schedule-card"><div class="schedule-header"><div class="schedule-title">Upcoming Visits</div></div>';
    cb.forEach(b=>{
      const h=getHorse(b.horse_id);const t=typeConfig[b.type]||{label:b.type,dot:'#888'};
      const dl=b.date===todayStr?'Today':new Date(b.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
      const trs=getTrainersForDate(b.date);
      const trAvail=trs.length>0?trs.map(s=>s.trainer_name).join(', '):'No trainer';
      const showActions=canBook;
      html+=`<div class="schedule-item">
        <div class="schedule-time">${b.time}</div>
        <div class="schedule-dot" style="background:${t.dot}"></div>
        <div class="schedule-info">
          <div class="schedule-horse">${h?h.name:'Unassigned'}</div>
          <div class="schedule-detail">${dl} · ${t.label} · ${fmtDur(b.duration)}</div>
          <div class="schedule-rider" style="color:var(--text-muted)">${arenaLabel(b.arena)} · ${trAvail}</div>
        </div>
        ${showActions?`<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
          <button class="btn btn-secondary btn-sm" style="font-size:10px;padding:5px 8px" onclick="editBookingFromRider(${b.id})">Edit</button>
          <button class="btn-danger-sm" style="font-size:10px;padding:5px 8px" onclick="deleteAnyBooking(${b.id})">Cancel</button>
        </div>`:''}
      </div>`;
    });
    html+='</div>';
  }

  document.getElementById('child-schedule-content').innerHTML=html;

  const fab=document.getElementById('child-book-fab');
  const fabName=document.getElementById('child-book-name');
  if(canBook){fab.style.display='block';if(fabName)fabName.textContent=child.first;}
  else{fab.style.display='none';}

  showScreen('child-schedule');
}

function openChildBooking(){
  openSheet('rider-booking');
  // Pre-populate horse dropdown for this child's approved horses
  if(currentChildId){
    const child=getRider(currentChildId);
    const rh=document.getElementById('rb-horse');
    if(rh&&child){
      let availableHorses=horses.filter(h=>h.access!=='owner-only');
      if(child.approved_horses&&child.approved_horses.length>0){
        availableHorses=horses.filter(h=>
          h.access==='barn'||
          child.approved_horses.map(Number).includes(parseInt(h.id))
        );
      }
      rh.innerHTML='<option value="">— Trainer will assign —</option>'+
        availableHorses.map(h=>`<option value="${h.id}">${h.name}</option>`).join('');
    }
  }
}
