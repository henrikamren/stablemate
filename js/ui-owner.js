/* ===========================================================
   [15] OWNER / LESSEE VIEW
   =========================================================== */

function getOwnerRecord(){
  const nameLower=currentUser.name.trim().toLowerCase();
  return owners.find(o=>
    o.first.toLowerCase()===nameLower||
    (o.first+' '+(o.last||'')).trim().toLowerCase()===nameLower
  )||null;
}

function getMyHorses(){
  const me=getOwnerRecord();
  if(!me)return horses; // fallback: show all if no match
  return horses.filter(h=>parseInt(h.owner_id)===parseInt(me.id));
}

function renderOwnerHome(){
  const me=getOwnerRecord();
  const myHorses=getMyHorses();
  const todayStr=fmtDate(today);
  const nameLower=currentUser.name.trim().toLowerCase();
  const now=nowTimeStr();

  // Rider identity (owner may also be a rider)
  const meRider=riders.find(r=>r.first.toLowerCase()===nameLower||(r.first+' '+(r.last||'')).trim().toLowerCase()===nameLower);
  // Children (owner may also be a parent)
  const myChildren=riders.filter(r=>r.parents&&r.parents.split(',').map(p=>p.trim().toLowerCase()).includes(nameLower));

  let html=`<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:2px">
    <div class="rider-greeting">Hi, ${currentUser.name.split(' ')[0]} 👋</div>
    <div style="font-size:11px;color:var(--text-muted);letter-spacing:0.06em">Oasis Farm</div>
  </div>
  <div class="rider-date-sub">${today.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
  <div class="trainer-avail-row">${buildTrainerChips(todayStr)}</div>
  <div id="owner-weather"></div>`;

  // Own upcoming bookings (rider perspective)
  if(meRider){
    const myB=bookings.filter(b=>b.rider_id===meRider.id&&(b.date>todayStr||(b.date===todayStr&&bookingEndTime(b)>now))).sort((a,b)=>a.date===b.date?a.time.localeCompare(b.time):a.date.localeCompare(b.date));
    const next=myB[0];
    if(next){html+=buildNextUpFromBooking(next,{label:'Next Visit'});}
    // AFB entries and quick-add
    if(typeof buildRiderAfbList==='function')html+=buildRiderAfbList(meRider.id);
    html+=`<button class="btn btn-secondary" style="width:100%;margin-bottom:16px;font-size:12px;padding:10px;display:flex;align-items:center;justify-content:center;gap:6px" onclick="openAfbSheet()">
      🏠 Mark Away From Barn
    </button>`;
  }

  // Children (parent perspective)
  if(myChildren.length>0){
    html+=`<div class="section-label">Your Children</div>`;
    myChildren.forEach(child=>{
      html+=buildChildCard(child,{onclick:`showChildSchedule(${child.id},true)`});
    });
  }

  if(myHorses.length===0){
    html+='<div class="empty"><div class="empty-icon">🐴</div><div class="empty-text">No horses linked to your account</div></div>';
  } else {
    html+=buildSectionHeader('Your Horse'+(myHorses.length!==1?'s':''),`${myHorses.length} at ${BARN_NAME}`);
    myHorses.forEach(h=>{
      const hBookings=bookings.filter(b=>parseInt(b.horse_id)===parseInt(h.id)&&isFutureBooking(b))
        .sort((a,b)=>a.date.localeCompare(b.date));
      const next=hBookings[0];
      const nextR=next?getRider(next.rider_id):null;
      const nextT=next?(typeConfig[next.type]||{label:next.type}):null;
      const sv=h.services||{};
      const serviceIcons=[sv.lunge?'🔄':'',sv.turnout?'🌿':'',sv.walker?'⭕':''].filter(Boolean).join(' ');
      const aMap={'barn':'Barn','owner-only':'Owner Only','owner-allow':'Owner+','partial-lease':'Partial','full-lease':'Lease'};

      const miniWeek=buildMiniWeek({
        filterFn:(b,ds)=>parseInt(b.horse_id)===parseInt(h.id)&&b.date===ds&&isFutureBooking(b),
        dotFn:b=>{const r=getRider(b.rider_id);return r?getRiderColor(r.id):(typeConfig[b.type]||{dot:'#888'}).dot;},
        cellSize:28,chipHeight:6,chipWidth:'18px',trainerBar:3,margin:'margin-top:8px'
      });

      html+=`<div style="background:var(--white);border-radius:12px;border:1px solid var(--sand);padding:14px 16px;margin-bottom:12px;cursor:pointer" onclick="showOwnerHorseDetail(${h.id})">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <div style="width:44px;height:44px;border-radius:50%;background:var(--cream-dark);display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:20px;color:var(--earth);flex-shrink:0">${h.name[0]}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:16px;font-weight:500;color:var(--earth)">${h.name}</div>
            <div style="font-size:12px;color:var(--text-muted)">${h.breed||'Unknown breed'}${h.age?' · '+h.age+' yrs':''}</div>
            <div style="display:flex;gap:6px;margin-top:4px;align-items:center">
              <span style="font-size:10px;padding:2px 7px;border-radius:8px;background:var(--cream-dark);color:var(--text-muted)">${aMap[h.access]||'Barn'}</span>
              ${serviceIcons?`<span style="font-size:12px">${serviceIcons}</span>`:''}
            </div>
          </div>
          ${next?`<div style="text-align:right;flex-shrink:0">
            <div style="font-size:11px;color:var(--earth-light);font-weight:500">${friendlyDate(next.date)}</div>
            <div style="font-size:11px;color:var(--text-muted)">${next.time}${nextR?' · '+nextR.first:''}</div>
          </div>`:'<div style="font-size:11px;color:var(--text-muted)">No upcoming</div>'}
        </div>
        ${miniWeek}
      </div>`;
    });
  }

  document.getElementById('owner-content').innerHTML=html;
  fetchWeather().then(w=>renderWeatherCard(w,document.getElementById('owner-weather')));
}

function showOwnerHorseDetail(horseId){
  const h=getHorse(horseId);if(!h)return;
  const todayStr=fmtDate(today);
  const hBookings=bookings.filter(b=>parseInt(b.horse_id)===parseInt(h.id)&&isFutureBooking(b))
    .sort((a,b)=>a.date===b.date?a.time.localeCompare(b.time):a.date.localeCompare(b.date));

  let html=`<div class="rider-greeting">${h.name}</div>
  <div class="rider-date-sub" style="margin-bottom:20px">${h.breed||'Unknown breed'}${h.age?' · '+h.age+' yrs':''} · ${BARN_NAME}</div>`;

  // Horse not rideable entries
  if(typeof buildHorseHnrList==='function')html+=buildHorseHnrList(h.id);

  if(hBookings.length===0){
    html+='<div class="empty"><div class="empty-icon">◫</div><div class="empty-text">No upcoming visits</div></div>';
  } else {
    html+='<div class="schedule-card"><div class="schedule-header"><div class="schedule-title">Upcoming Schedule</div><div class="schedule-meta">'+hBookings.length+' session'+(hBookings.length!==1?'s':'')+'</div></div>';
    hBookings.forEach(b=>{
      html+=buildScheduleItem(b,{showDate:true,showActions:false});
    });
    html+='</div>';
  }

  // Week mini calendar
  html+=buildSectionHeader('This Week','Next 7 days');
  html+=`<div style="margin-bottom:20px">${buildMiniWeek({
    filterFn:(b,ds)=>parseInt(b.horse_id)===parseInt(h.id)&&b.date===ds&&isFutureBooking(b),
    dotFn:b=>{const r=getRider(b.rider_id);return r?getRiderColor(r.id):(typeConfig[b.type]||{dot:'#888'}).dot;},
    cellSize:40,chipHeight:8,chipWidth:'24px',trainerBar:4,margin:'margin-top:10px'
  })}</div>`;

  showOwnerDetailPanel(html);
}

// ── Owner bottom nav panel switcher ──────────────────────────

let _lastOwnerPanel='home';

function showOwnerPanel(name){
  _lastOwnerPanel=name;
  const backBtn=document.getElementById('owner-back-btn');
  const logo=document.getElementById('owner-topbar-logo');
  if(backBtn)backBtn.style.display='none';
  if(logo)logo.style.display='';

  document.querySelectorAll('#owner-bottom-nav .nav-tab').forEach(t=>t.classList.remove('active'));
  const tab=document.getElementById('onav-'+name);
  if(tab)tab.classList.add('active');

  ['owner-content','owner-horses-content','owner-shows-content','owner-riders-content','owner-detail-content'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display='none';
  });

  if(name==='home'){
    document.getElementById('owner-content').style.display='';
    renderOwnerHome();
  } else if(name==='horses'){
    const el=document.getElementById('owner-horses-content');
    el.style.display='';
    renderInlineHorsesDash(el);
  } else if(name==='shows'){
    const el=document.getElementById('owner-shows-content');
    el.style.display='';
    renderInlineShowsDash(el);
  } else if(name==='riders'){
    const el=document.getElementById('owner-riders-content');
    el.style.display='';
    renderInlineRidersDash(el);
  }
}

function showOwnerDetailPanel(html){
  ['owner-content','owner-horses-content','owner-shows-content','owner-riders-content'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display='none';
  });
  const el=document.getElementById('owner-detail-content');
  el.innerHTML=html;
  el.style.display='';
  const backBtn=document.getElementById('owner-back-btn');
  const logo=document.getElementById('owner-topbar-logo');
  if(logo)logo.style.display='none';
  if(backBtn){
    backBtn.style.display='';
    backBtn.onclick=()=>showOwnerPanel(_lastOwnerPanel||'home');
  }
}
