/* ===========================================================
   [11] PARENT VIEW
   =========================================================== */
function renderParentHome(){
  const name=currentUser.name;
  const todayStr=fmtDate(today);
  const myChildren=riders.filter(r=>r.parents&&r.parents.split(',').map(p=>p.trim().toLowerCase()).includes(name.trim().toLowerCase()));

  let html=`<div class="rider-greeting">Hi, ${name.split(' ')[0]} 👋</div>
  <div class="rider-date-sub">${today.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
  <div class="trainer-avail-row">${buildTrainerChips(todayStr)}</div>
  <div id="parent-weather"></div>`;

  // Weekly calendar highlighting all my children
  const myChildIds=myChildren.map(ch=>parseInt(ch.id));
  html+=buildSectionHeader('This Week',"Your children's schedule");
  html+=`<div style="margin-bottom:20px">${buildWeekCalendar(myChildIds)}</div>`;

  if(myChildren.length>0){
    html+=`<div class="section-label">Your Children</div>`;
    const now=nowTimeStr();
    // Sort children by next lesson: earliest first, no upcoming last
    const childrenSorted=myChildren.slice().sort((a,b)=>{
      const aNext=bookings.filter(bk=>bk.rider_id===a.id&&(bk.date>todayStr||(bk.date===todayStr&&bookingEndTime(bk)>now))).sort((x,y)=>x.date===y.date?x.time.localeCompare(y.time):x.date.localeCompare(y.date))[0];
      const bNext=bookings.filter(bk=>bk.rider_id===b.id&&(bk.date>todayStr||(bk.date===todayStr&&bookingEndTime(bk)>now))).sort((x,y)=>x.date===y.date?x.time.localeCompare(y.time):x.date.localeCompare(y.date))[0];
      if(!aNext&&!bNext)return 0;
      if(!aNext)return 1;
      if(!bNext)return -1;
      if(aNext.date!==bNext.date)return aNext.date.localeCompare(bNext.date);
      return aNext.time.localeCompare(bNext.time);
    });
    childrenSorted.forEach(child=>{
      html+=buildChildCard(child,{onclick:`showChildSchedule(${child.id},true)`});
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
  fetchWeather().then(w=>renderWeatherCard(w,document.getElementById('parent-weather')));
}

function showAllRiders(){
  let html=`<div class="rider-greeting">All Riders</div>
  <div class="rider-date-sub" style="margin-bottom:20px">${BARN_NAME}</div>`;
  if(riders.length===0){
    html+='<div class="empty"><div class="empty-icon">🏇</div><div class="empty-text">No riders registered yet</div></div>';
  } else {
    riders.forEach(r=>{
      html+=buildChildCard(r,{onclick:`showChildSchedule(${r.id},false)`});
    });
  }
  document.getElementById('all-riders-content').innerHTML=html;
  showScreen('all-riders');
}

function showChildSchedule(riderId,canBook){
  const child=getRider(riderId);if(!child)return;
  currentChildId=riderId;
  const todayStr=fmtDate(today);
  const now=nowTimeStr();
  const cb=bookings.filter(b=>b.rider_id===child.id&&(b.date>todayStr||(b.date===todayStr&&bookingEndTime(b)>now))).sort((a,b)=>a.date===b.date?a.time.localeCompare(b.time):a.date.localeCompare(b.date));

  let html=`<div class="rider-greeting">${child.first}</div>
  <div class="rider-date-sub" style="margin-bottom:20px">${child.level} rider · ${BARN_NAME}</div>`;

  // Away From Barn entries for this child
  if(typeof buildRiderAfbList==='function')html+=buildRiderAfbList(child.id);

  // AFB button for parents
  if(canBook){
    html+=`<button class="btn btn-secondary" style="width:100%;margin-bottom:16px;font-size:12px;padding:10px;display:flex;align-items:center;justify-content:center;gap:6px" onclick="currentChildId=${child.id};openAfbSheet()">
      🏠 Mark ${child.first} Away From Barn
    </button>`;
  }

  if(cb.length===0){
    html+='<div class="empty"><div class="empty-icon">◫</div><div class="empty-text">No upcoming visits</div></div>';
  } else {
    html+='<div class="schedule-card"><div class="schedule-header"><div class="schedule-title">Upcoming Visits</div></div>';
    cb.forEach(b=>{
      html+=buildScheduleItem(b,{
        showDate:true,
        showActions:canBook,
        actionEdit:`editBookingFromRider(${b.id})`,
        actionDel:`deleteAnyBooking(${b.id})`
      });
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

// ── Parent bottom nav panel switcher ─────────────────────────

function showParentPanel(name){
  // Update active tab
  document.querySelectorAll('#parent-bottom-nav .nav-tab').forEach(t=>t.classList.remove('active'));
  const tab=document.getElementById('pnav-'+name);
  if(tab)tab.classList.add('active');

  if(name==='home'){
    showScreen('parent-app');
    renderParentHome();
  } else if(name==='horses'){
    showHorsesDash();
  } else if(name==='shows'){
    showShowsDash();
  } else if(name==='riders'){
    showRidersDash();
  }
}
