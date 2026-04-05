/* ===========================================================
   [10] RIDER VIEW
   =========================================================== */
function renderRiderHome(){
  const name=currentUser.name;
  const todayStr=fmtDate(today);
  const nameLower=name.trim().toLowerCase();
  const rider=riders.find(r=>r.first.toLowerCase()===nameLower||(r.first+' '+(r.last||'')).toLowerCase()===nameLower);
  const now=nowTimeStr();
  const myB=rider?bookings.filter(b=>b.rider_id===rider.id&&(b.date>todayStr||(b.date===todayStr&&bookingEndTime(b)>now))).sort((a,b)=>a.date===b.date?a.time.localeCompare(b.time):a.date.localeCompare(b.date)):[];
  const myBIds=myB.map(b=>b.id);
  const next=myB[0];

  let html=`<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:2px">
    <div class="rider-greeting">Hi, ${name.split(' ')[0]} 👋</div>
    <div style="font-size:11px;color:var(--text-muted);letter-spacing:0.06em">Oasis Farm</div>
  </div>
  <div class="rider-date-sub">${today.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
  <div class="trainer-avail-row">${buildTrainerChips(todayStr)}</div>
  <div id="rider-weather"></div>`;
  fetchWeather().then(w=>renderWeatherCard(w,document.getElementById('rider-weather')));

  if(next){
    html+=buildNextUpFromBooking(next,{label:'Next Visit'});
  }

  // Away From Barn entries for this rider
  if(rider&&typeof buildRiderAfbList==='function'){
    html+=buildRiderAfbList(rider.id);
  }

  // Away From Barn quick-add button
  html+=`<button class="btn btn-secondary" style="width:100%;margin-bottom:16px;font-size:12px;padding:10px;display:flex;align-items:center;justify-content:center;gap:6px" onclick="openAfbSheet()">
    🏠 Mark Away From Barn
  </button>`;

  // Booking list header
  html+=buildSectionHeader('Upcoming',`${myB.length} scheduled`);

  if(myB.length===0){
    html+='<div class="empty" style="padding:24px 20px"><div class="empty-icon">🐴</div><div class="empty-text">No upcoming visits booked</div></div>';
  } else {
    const threeDaysOut=fmtDate(addDays(today,3));
    const previewB=myB.filter(b=>b.date<=threeDaysOut);
    const restB=myB.filter(b=>b.date>threeDaysOut);

    html+='<div class="schedule-card" style="margin-bottom:12px">';
    html+=`<div class="schedule-header"><div class="schedule-title">Next 3 Days</div><div class="schedule-meta">${previewB.length} session${previewB.length!==1?'s':''}</div></div>`;

    previewB.forEach(b=>{
      html+=buildScheduleItem(b,{showDate:true,showActions:true});
    });
    html+='</div>';

    if(restB.length>0){
      html+=`<div id="rider-more-bookings" style="display:none"><div class="schedule-card" style="margin-bottom:12px">
        <div class="schedule-header"><div class="schedule-title">Later</div><div class="schedule-meta">${restB.length} more</div></div>`;
      restB.forEach(b=>{
        html+=buildScheduleItem(b,{showDate:true,showActions:true});
      });
      html+=`</div><button class="btn btn-secondary" style="width:100%;margin-bottom:16px;font-size:12px;padding:10px" onclick="document.getElementById('rider-more-bookings').style.display='none';document.getElementById('rider-expand-btn').style.display='block'">Collapse</button></div>`;
      html+=`<button id="rider-expand-btn" class="btn btn-secondary" style="width:100%;margin-bottom:16px;font-size:12px;padding:10px" onclick="document.getElementById('rider-more-bookings').style.display='block';this.style.display='none'">Show ${restB.length} more session${restB.length!==1?'s':''}</button>`;
    }
  }

  // Weekly calendar
  const riderId=rider?parseInt(rider.id):null;
  const weekRiderIds=riderId?[riderId]:[];
  html+=buildSectionHeader('This Week','Next 7 days');
  html+=`<div style="margin-bottom:20px">${buildWeekCalendar(weekRiderIds)}</div>`;

  // Day view calendar for today
  html+=buildSectionHeader("Today's Arena",today.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}));
  html+=`<div style="background:var(--white);border-radius:10px;border:1px solid var(--sand);overflow:hidden;margin-bottom:20px">
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
    const scrollTo=(13-START_H)*SLOT_H - 20;
    calEl.scrollTop=Math.max(0,scrollTo);
  }
}

// ── Rider bottom nav panel switcher ──────────────────────────

let _lastRiderPanel='home';

function showRiderPanel(name){
  _lastRiderPanel=name;
  // Hide back button, show logo
  const backBtn=document.getElementById('rider-back-btn');
  const logo=document.getElementById('rider-topbar-logo');
  if(backBtn)backBtn.style.display='none';
  if(logo)logo.style.display='';

  // Update active tab
  document.querySelectorAll('#rider-bottom-nav .nav-tab').forEach(t=>t.classList.remove('active'));
  const tab=document.getElementById('rnav-'+name);
  if(tab)tab.classList.add('active');

  // Hide all content panels
  ['rider-content','rider-horses-content','rider-riders-content','rider-shows-content','rider-detail-content'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.style.display='none';
  });

  if(name==='home'){
    document.getElementById('rider-content').style.display='';
    renderRiderHome();
  } else if(name==='horses'){
    const el=document.getElementById('rider-horses-content');
    el.style.display='';
    renderInlineHorsesDash(el);
  } else if(name==='shows'){
    const el=document.getElementById('rider-shows-content');
    el.style.display='';
    renderInlineShowsDash(el);
  } else if(name==='riders'){
    const el=document.getElementById('rider-riders-content');
    el.style.display='';
    renderInlineRidersDash(el);
  }
}

/** Show detail content (horse schedule, rider schedule, show detail) inside rider app */
function showRiderDetailPanel(html){
  ['rider-content','rider-horses-content','rider-riders-content','rider-shows-content'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display='none';
  });
  const el=document.getElementById('rider-detail-content');
  el.innerHTML=html;
  el.style.display='';
  // Show back button, hide logo
  const backBtn=document.getElementById('rider-back-btn');
  const logo=document.getElementById('rider-topbar-logo');
  if(logo)logo.style.display='none';
  if(backBtn){
    backBtn.style.display='';
    backBtn.onclick=()=>showRiderPanel(_lastRiderPanel||'home');
  }
}
