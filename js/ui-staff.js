/* ===========================================================
   [15] BOOKING FORM HELPERS
   =========================================================== */
function onRbChildChange(){
  const childSel=document.getElementById('rb-child');
  const riderId=parseInt(childSel?.value)||null;
  if(!riderId)return;
  currentChildId=riderId;
  const child=getRider(riderId);
  if(!child)return;
  const rh=document.getElementById('rb-horse');
  if(rh){
    let availableHorses=horses.filter(h=>h.access!=='owner-only');
    if(child.approved_horses&&child.approved_horses.length>0){
      availableHorses=horses.filter(h=>
        h.access==='barn'||child.approved_horses.map(Number).includes(parseInt(h.id))
      );
    }
    rh.innerHTML='<option value="">— Trainer will assign —</option>'+
      availableHorses.map(h=>`<option value="${h.id}">${h.name}</option>`).join('');
  }
}

/* ===========================================================
   [16] SEARCH DROPDOWN
   =========================================================== */
function toggleSearchDropdown(id){
  const dd=document.getElementById(id);
  if(!dd)return;
  const isOpen=dd.classList.contains('open');
  document.querySelectorAll('.search-dropdown').forEach(d=>d.classList.remove('open'));
  if(!isOpen){
    populateSearchDropdown(id);
    dd.classList.add('open');
    dd.querySelectorAll('.search-dropdown-section-body').forEach(b=>{
      b.style.maxHeight=b.scrollHeight+'px';
    });
    setTimeout(()=>document.addEventListener('click',closeAllDropdowns,{once:true}),10);
  }
}

function toggleDDSection(bodyId){
  event.stopPropagation();
  const body=document.getElementById(bodyId);
  if(!body)return;
  const isCollapsed=body.classList.contains('collapsed');
  const arrowId=bodyId.replace('-body','-arrow');
  const arrow=document.getElementById(arrowId);
  if(isCollapsed){
    body.classList.remove('collapsed');
    body.style.maxHeight=body.scrollHeight+'px';
    if(arrow)arrow.style.transform='rotate(0deg)';
  } else {
    body.style.maxHeight=body.scrollHeight+'px';
    body.offsetHeight;
    body.style.maxHeight='0px';
    body.classList.add('collapsed');
    if(arrow)arrow.style.transform='rotate(-90deg)';
  }
}
function closeAllDropdowns(){
  document.querySelectorAll('.search-dropdown').forEach(d=>d.classList.remove('open'));
}
function populateSearchDropdown(id){
  const prefix=id.split('-')[0];
  const horsesEl=document.getElementById(prefix+'-dd-horses');
  const ridersEl=document.getElementById(prefix+'-dd-riders');

  if(horsesEl){
    if(horses.length===0){
      horsesEl.innerHTML='<div class="search-dropdown-item" style="color:var(--text-muted)">No horses yet</div>';
    } else {
      horsesEl.innerHTML=horses.map(h=>{
        const o=getOwner(h.owner_id);
        const miniWeek=buildMiniWeek({
          filterFn:(b,ds)=>parseInt(b.horse_id)===parseInt(h.id)&&b.date===ds,
          dotFn:b=>{const r=getRider(b.rider_id);return r?getRiderColor(r.id):(typeConfig[b.type]||{dot:'#888'}).dot;},
          margin:'margin-top:8px'
        });
        return`<div style="padding:12px 14px;border-bottom:1px solid var(--cream-dark);cursor:pointer" onclick="showHorseSchedule(${h.id});closeAllDropdowns()">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:2px">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--cream-dark);display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:14px;color:var(--earth);flex-shrink:0">${h.name[0]}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:500;color:var(--earth)">${h.name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${h.breed||'Unknown breed'}${h.age?' · '+h.age+' yrs':''}${o?' · '+o.first:' · Barn'}</div>
            </div>
          </div>
          ${miniWeek}
        </div>`;
      }).join('');
    }
  }

  if(ridersEl){
    ridersEl.innerHTML=riders.length===0
      ?'<div class="search-dropdown-item" style="color:var(--text-muted)">No riders yet</div>'
      :riders.map(r=>{
        const nextB=bookings.filter(b=>b.rider_id===r.id&&b.date>=fmtDate(today)).sort((a,b)=>a.date.localeCompare(b.date))[0];
        const h=nextB?getHorse(nextB.horse_id):null;
        return`<div class="search-dropdown-item" onclick="showRiderScheduleFromSearch(${r.id});closeAllDropdowns()">
          <div class="search-dropdown-icon">🏇</div>
          <div>
            <div>${r.first}</div>
            <div class="search-dropdown-sub">${r.level}</div>
            ${nextB?`<div class="search-dropdown-sub" style="color:var(--earth-light)">Next: ${friendlyDate(nextB.date)} · ${nextB.time}${h?' · '+h.name:''}</div>`:''}
          </div>
        </div>`;
      }).join('');
  }
  // Shows section
  const prefix2=id.split('-')[0];
  const showsEl=document.getElementById(prefix2+'-dd-shows');
  if(showsEl){
    const todayStr=fmtDate(today);
    const upcomingShows=shows.filter(s=>s.date>=todayStr).sort((a,b)=>a.date.localeCompare(b.date));
    let showsHtml='';
    if(currentRole==='staff'){
      showsHtml+=`<div class="search-dropdown-item" onclick="openShowSheet();closeAllDropdowns()" style="color:var(--earth-light);font-weight:500">
        <div class="search-dropdown-icon">＋</div><div>Add Show</div>
      </div>`;
    }
    if(upcomingShows.length===0){
      showsHtml+='<div class="search-dropdown-item" style="color:var(--text-muted)"><div class="search-dropdown-icon">🏆</div><div>No upcoming shows</div></div>';
    } else {
      showsHtml+=upcomingShows.map(s=>{
        const dl=friendlyDate(s.date);
        const showRiders=(s.rider_ids||[]).map(id=>getRider(id)).filter(Boolean);
        return`<div class="search-dropdown-item" onclick="showShowDetail(${s.id});closeAllDropdowns()">
          <div class="search-dropdown-icon">🏆</div>
          <div>
            <div>${s.name}</div>
            <div class="search-dropdown-sub">${dl}${s.location?' · '+s.location:''}</div>
            ${s.division?`<div class="search-dropdown-sub" style="color:var(--earth-light)">${s.division}</div>`:''}
            ${showRiders.length>0?`<div class="search-dropdown-sub">${showRiders.map(r=>r.first).join(', ')}</div>`:''}
          </div>
        </div>`;
      }).join('');
    }
    showsEl.innerHTML=showsHtml;
  }

  const ddEl=document.getElementById(id);
  if(ddEl){
    ddEl.querySelectorAll('.search-dropdown-section-body').forEach(b=>{
      if(!b.classList.contains('collapsed'))b.style.maxHeight=b.scrollHeight+'px';
    });
  }
}

function showHorseSchedule(horseId){
  const horse=getHorse(parseInt(horseId));if(!horse)return;
  const todayStr=fmtDate(today);
  const hBookings=bookings.filter(b=>parseInt(b.horse_id)===parseInt(horse.id)&&isFutureBooking(b))
    .sort((a,b)=>a.date===b.date?a.time.localeCompare(b.time):a.date.localeCompare(b.date));
  const o=getOwner(horse.owner_id);
  const sv=horse.services||{};
  const aMap={'barn':'Barn Owned','owner-only':'Owner Only','owner-allow':'Owner - Shared','partial-lease':'Partial Lease','full-lease':'Full Lease'};
  const next=hBookings[0];
  const upcomingRiderIds=[...new Set(hBookings.map(b=>b.rider_id).filter(Boolean).map(Number))];

  let html=`
  <!-- Header -->
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
    <div style="width:56px;height:56px;border-radius:50%;background:var(--cream-dark);display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:24px;color:var(--earth);flex-shrink:0">${horse.name[0]}</div>
    <div>
      <div class="rider-greeting" style="margin-bottom:2px">${horse.name}</div>
      <div style="font-size:13px;color:var(--text-muted)">${horse.breed||'Unknown breed'}${horse.age?' · '+horse.age+' yrs':''}${o?' · '+o.first:' · Barn horse'}</div>
      <div style="margin-top:4px"><span style="font-size:10px;padding:2px 8px;border-radius:10px;background:var(--cream-dark);color:var(--text-muted)">${aMap[horse.access]||'Barn'}</span></div>
    </div>
  </div>`;

  // Next up card
  if(next){
    html+=buildNextUpFromBooking(next,{label:'Next Session',showRider:true,style:'margin-bottom:14px'});
  }

  // 7-day calendar
  html+=buildSectionHeader('This Week');
  html+=`<div style="margin-bottom:16px">${buildWeekCalendar(upcomingRiderIds)}</div>`;

  // Services
  html+=`<div class="schedule-card" style="margin-bottom:14px">
    <div class="schedule-header"><div class="schedule-title">Services</div></div>
    <div style="display:flex;gap:8px;padding:12px 16px">
      <div style="flex:1;text-align:center;padding:8px;border-radius:8px;background:${sv.lunge?'var(--hay-light)':'var(--cream)'};border:1px solid ${sv.lunge?'var(--hay)':'var(--sand)'}">
        <div style="font-size:18px">🔄</div><div style="font-size:11px;color:var(--text-mid);margin-top:2px">Lunge</div>
        <div style="font-size:10px;color:${sv.lunge?'var(--earth-light)':'var(--text-muted)'};margin-top:2px">${sv.lunge?'Requested':'—'}</div>
      </div>
      <div style="flex:1;text-align:center;padding:8px;border-radius:8px;background:${sv.turnout?'var(--hay-light)':'var(--cream)'};border:1px solid ${sv.turnout?'var(--hay)':'var(--sand)'}">
        <div style="font-size:18px">🌿</div><div style="font-size:11px;color:var(--text-mid);margin-top:2px">Turnout</div>
        <div style="font-size:10px;color:${sv.turnout?'var(--earth-light)':'var(--text-muted)'};margin-top:2px">${sv.turnout?'Requested':'—'}</div>
      </div>
      <div style="flex:1;text-align:center;padding:8px;border-radius:8px;background:${sv.walker?'var(--hay-light)':'var(--cream)'};border:1px solid ${sv.walker?'var(--hay)':'var(--sand)'}">
        <div style="font-size:18px">⭕</div><div style="font-size:11px;color:var(--text-mid);margin-top:2px">Walker</div>
        <div style="font-size:10px;color:${sv.walker?'var(--earth-light)':'var(--text-muted)'};margin-top:2px">${sv.walker?'Requested':'—'}</div>
      </div>
    </div>
  </div>`;

  // Horse Not Rideable entries
  if(typeof buildHorseHnrList==='function')html+=buildHorseHnrList(horse.id);

  // Upcoming schedule
  html+=`<div class="schedule-card" style="margin-bottom:14px">
    <div class="schedule-header">
      <div class="schedule-title">Upcoming Schedule</div>
      <div class="schedule-meta">${hBookings.length} booking${hBookings.length!==1?'s':''}</div>
    </div>`;
  if(hBookings.length===0){
    html+='<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">No upcoming bookings</div>';
  } else {
    hBookings.forEach(b=>{
      html+=buildScheduleItem(b,{
        showDate:true,
        showRiderName:true,
        dotColor:getRider(b.rider_id)?getRiderColor(getRider(b.rider_id).id):undefined
      });
    });
  }
  html+='</div>';

  // Lunge request button for riders and parents
  if(currentRole==='rider'||currentRole==='parent'){
    const myReq=lungeRequests.find(r=>parseInt(r.horse_id)===parseInt(horse.id)&&r.status==='pending');
    html+=`<button class="lunge-request-btn ${myReq?'requested':''}" onclick="${myReq?'':'openLungeRequest('+horse.id+')'}">
      🔄 ${myReq?'Lunge Requested — Pending':'Request a Lunge'}
    </button>`;
  }

  // Not Rideable button for staff
  if(currentRole==='staff'){
    html+=`<button class="btn btn-secondary" style="width:100%;margin-top:8px;margin-bottom:8px;font-size:12px;padding:10px;display:flex;align-items:center;justify-content:center;gap:6px" onclick="openHnrSheet();setTimeout(()=>{document.getElementById('hnr-horse').value=${horse.id}},50)">
      🚫 Mark Not Rideable
    </button>`;
  }

  // Notes
  if(horse.notes){
    html+=`<div style="background:var(--white);border-radius:10px;border:1px solid var(--sand);padding:14px 16px;margin-bottom:14px;margin-top:8px">
      <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">Notes</div>
      <div style="font-size:13px;color:var(--text)">${horse.notes}</div>
    </div>`;
  }

  document.getElementById('child-schedule-content').innerHTML=html;
  document.getElementById('child-book-fab').style.display='none';
  document.getElementById('child-back-btn').onclick=()=>{
    if(currentRole==='parent')showScreen('parent-app');
    else if(currentRole==='staff')showScreen('app');
    else showScreen('rider-app');
  };
  showScreen('child-schedule');
}

function showRiderScheduleFromSearch(riderId){
  const r=getRider(parseInt(riderId));if(!r)return;
  const isMyChild=currentRole==='parent'&&r.parents&&r.parents.split(',').map(p=>p.trim().toLowerCase()).includes(currentUser.name.trim().toLowerCase());
  const todayStr=fmtDate(today);
  const myBookings=bookings.filter(b=>parseInt(b.rider_id)===parseInt(r.id)&&isFutureBooking(b))
    .sort((a,b)=>a.date===b.date?a.time.localeCompare(b.time):a.date.localeCompare(b.date));
  const next=myBookings[0];
  const rColor=getRiderColor(r.id);
  const approvedHorses=(r.approved_horses||[]).map(id=>getHorse(id)).filter(Boolean);

  let html=`
  <!-- Header -->
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
    <div style="width:56px;height:56px;border-radius:50%;background:${rColor};display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:24px;color:white;flex-shrink:0">${r.first[0]}</div>
    <div>
      <div class="rider-greeting" style="margin-bottom:2px">${r.first}</div>
      <div style="font-size:13px;color:var(--text-muted)">${r.level} rider${r.parents?' · Parents: '+r.parents:''}</div>
      ${approvedHorses.length>0?`<div style="font-size:12px;color:var(--earth-light);margin-top:3px">🐴 ${approvedHorses.map(h=>h.name).join(', ')}</div>`:''}
    </div>
  </div>`;

  // Next up
  if(next){
    html+=buildNextUpFromBooking(next,{label:'Next Visit',style:'margin-bottom:14px'});
  }

  // 7-day calendar
  html+=buildSectionHeader('This Week');
  html+=`<div style="margin-bottom:16px">${buildWeekCalendar([parseInt(r.id)])}</div>`;

  // Away From Barn entries
  if(typeof buildRiderAfbList==='function')html+=buildRiderAfbList(r.id);

  // Upcoming bookings
  html+=`<div class="schedule-card" style="margin-bottom:14px">
    <div class="schedule-header">
      <div class="schedule-title">Upcoming Visits</div>
      <div class="schedule-meta">${myBookings.length} upcoming</div>
    </div>`;
  if(myBookings.length===0){
    html+='<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">No upcoming visits</div>';
  } else {
    myBookings.forEach(b=>{
      const canDel=isMyChild||(currentRole==='staff');
      html+=buildScheduleItem(b,{
        showDate:true,
        showDelete:canDel,
        actionDel:`deleteAnyBooking(${b.id})`
      });
    });
  }
  html+='</div>';

  document.getElementById('child-schedule-content').innerHTML=html;

  const fab=document.getElementById('child-book-fab');
  const fabName=document.getElementById('child-book-name');
  if(isMyChild||currentRole==='staff'){
    currentChildId=parseInt(r.id);
    fab.style.display='block';
    if(fabName)fabName.textContent=r.first;
  } else {
    fab.style.display='none';
  }

  document.getElementById('child-back-btn').onclick=()=>{
    if(currentRole==='parent')showScreen('parent-app');
    else if(currentRole==='staff')showScreen('app');
    else showScreen('rider-app');
  };
  showScreen('child-schedule');
}

/* ===========================================================
   [17] TRAINER AVAILABILITY CHECKS
   =========================================================== */
function checkTrainer(){
  const type=document.getElementById('b-type')?.value;
  const date=document.getElementById('b-date')?.value;
  const time=document.getElementById('b-time')?.value;
  const warn=document.getElementById('trainer-warning');
  const saveBtn=document.getElementById('b-save-btn');
  if(!warn)return;
  if(date&&time){
    const{available,trainers}=isTrainerAvailable(date,time);
    const t=typeConfig[type];
    if(available){
      warn.textContent='✓ '+trainers.join(' & ')+' available at this time.';
      warn.className='trainer-warning show ok';
      if(saveBtn){saveBtn.style.opacity='1';saveBtn.style.filter='';}
    } else {
      const msg=t&&t.supervised?'⚠️ No trainer scheduled — this session requires a trainer. Booking allowed but arrange coverage.':'ℹ️ No trainer scheduled at this time — booking allowed.';
      warn.textContent=msg;
      warn.className='trainer-warning show warn';
      if(saveBtn){saveBtn.style.opacity='0.65';saveBtn.style.filter='grayscale(20%)';}
    }
  } else {
    warn.className='trainer-warning';
    if(saveBtn){saveBtn.style.opacity='1';saveBtn.style.filter='';}
  }
}

function checkRiderTrainer(){
  const date=document.getElementById('rb-date')?.value;
  const time=document.getElementById('rb-time')?.value;
  const warn=document.getElementById('rb-trainer-warning');
  if(!warn||!date||!time)return;
  const{available,trainers}=isTrainerAvailable(date,time);
  if(available){
    warn.textContent='✓ '+trainers.join(' & ')+' will be available.';
    warn.className='trainer-warning show ok';
  } else {
    warn.textContent='ℹ️ No trainer scheduled at this time — staff will follow up.';
    warn.className='trainer-warning show warn';
  }
}

/* ===========================================================
   [18] STAFF DASHBOARD
   =========================================================== */
function renderDash(){
  const todayStr=fmtDate(today);
  const todayB=bookings.filter(b=>b.date===todayStr&&isFutureBooking(b)).sort((a,b)=>a.time.localeCompare(b.time));
  const weekEnd=fmtDate(addDays(today,7));
  document.getElementById('stat-horses').textContent=horses.length;
  document.getElementById('stat-today').textContent=todayB.length;
  document.getElementById('stat-week').textContent=bookings.filter(b=>isFutureBooking(b)&&b.date<=weekEnd).length;
  document.getElementById('stat-riders').textContent=riders.length;
  const pendingLunge=lungeRequests.filter(r=>r.status==='pending').length;
  const statLunge=document.getElementById('stat-lunge');if(statLunge)statLunge.textContent=pendingLunge;
  document.getElementById('dash-date').textContent=today.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

  // Trainer info card for today
  const todayTrainers=getTrainersForDate(todayStr);
  const trainerInfoEl=document.getElementById('today-trainer-info');
  if(todayTrainers.length>0){
    trainerInfoEl.innerHTML=`<div class="trainer-info-card">
      <div class="trainer-info-title">Trainers Today</div>
      ${todayTrainers.map(s=>`<div class="trainer-row">
        <div class="trainer-dot" style="background:${TRAINER_COLORS[s.trainer_name]||TRAINER_COLORS.default}"></div>
        <div><div class="trainer-name">${s.trainer_name}</div><div class="trainer-days">${s.start_time} – ${s.end_time}</div></div>
      </div>`).join('')}
    </div>`;
    document.getElementById('today-trainer-status').textContent='';
  } else {
    trainerInfoEl.innerHTML='';
    document.getElementById('today-trainer-status').textContent='No trainer today';
  }

  // Next up
  const now=nowTimeStr();
  const nextB=todayB.find(b=>bookingEndTime(b)>now);
  const nextArea=document.getElementById('next-up-area');
  if(nextB){
    const h=getHorse(nextB.horse_id);const r=getRider(nextB.rider_id);const t=typeConfig[nextB.type]||{label:nextB.type};
    nextArea.innerHTML=buildNextUpCard({
      headline:h?h.name:'Unassigned',
      label:'Next Up',
      detail:`${t.label} · ${fmtDur(nextB.duration)} · ${arenaLabel(nextB.arena)}${r?' · '+r.first:' · <span style="opacity:0.6">Rider unassigned</span>'}`,
      timeLine:nextB.time
    });
  } else nextArea.innerHTML='';

  const list=document.getElementById('today-list');
  const activeToday=todayB.filter(b=>bookingEndTime(b)>now);
  const tomStr=fmtDate(addDays(today,1));
  const tomB=bookings.filter(b=>b.date===tomStr).sort((a,b)=>a.time.localeCompare(b.time));

  if(activeToday.length===0&&tomB.length===0){
    list.innerHTML='<div class="empty"><div class="empty-icon">◫</div><div class="empty-text">No upcoming bookings today or tomorrow</div></div>';
  } else {
    let html='';
    if(activeToday.length>0){
      html+=activeToday.map(b=>buildStaffScheduleItem(b)).join('');
    }
    if(tomB.length>0){
      html+=`<div style="padding:8px 16px 4px;font-size:11px;color:var(--earth);font-weight:500;letter-spacing:0.06em;${activeToday.length>0?'border-top:1px solid var(--cream-dark)':''}">TOMORROW</div>`;
      html+=tomB.map(b=>buildStaffScheduleItem(b)).join('');
    }
    list.innerHTML=html||'<div class="empty"><div class="empty-icon">◫</div><div class="empty-text">No bookings</div></div>';
  }
  populateHorseSelect();populateRiderSelect();
}

/* ===========================================================
   [19] MONTHLY CALENDAR
   =========================================================== */
function renderCalendar(){
  document.getElementById('cal-label').textContent=new Date(calYear,calMonth,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});

  const trainers=getUniqueTrainers();
  const legendEl=document.getElementById('cal-legend');
  if(legendEl){
    legendEl.innerHTML=trainers.map(t=>`<div class="cal-legend-item">
      <div class="cal-legend-band" style="background:${TRAINER_COLORS[t]||TRAINER_COLORS.default}"></div>${t}
    </div>`).join('')+'<div class="cal-legend-item"><div class="cal-legend-band" style="background:var(--sand)"></div>No trainer</div>';
  }

  const firstDay=new Date(calYear,calMonth,1).getDay();
  const dim=new Date(calYear,calMonth+1,0).getDate();
  const dip=new Date(calYear,calMonth,0).getDate();
  const todayStr=fmtDate(today);
  let html='';

  for(let i=0;i<firstDay;i++)html+=`<div class="cal-day other-month"><div class="cal-day-num">${dip-firstDay+1+i}</div></div>`;

  for(let d=1;d<=dim;d++){
    const ds=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isT=ds===todayStr;
    const dayTrainers=getTrainersForDate(ds);
    const dots=bookings.filter(b=>b.date===ds).slice(0,4).map(b=>`<div class="cal-dot" style="background:${(typeConfig[b.type]||{dot:'#888'}).dot}"></div>`).join('');

    let bandHtml='';
    if(dayTrainers.length>0){
      const uniqueT=[...new Set(dayTrainers.map(s=>s.trainer_name))];
      bandHtml=`<div class="trainer-band">${uniqueT.map(t=>`<div class="trainer-band-seg" style="background:${TRAINER_COLORS[t]||TRAINER_COLORS.default}"></div>`).join('')}</div>`;
    } else {
      bandHtml=`<div class="trainer-band"><div style="height:6px"></div></div>`;
    }

    html+=`<div class="cal-day${isT?' today':''}" onclick="showCalDay('${ds}')">
      ${bandHtml}
      <div class="cal-day-num">${d}</div>
      <div class="cal-dot-row">${dots}</div>
    </div>`;
  }

  const rem=(7-(firstDay+dim)%7)%7;
  for(let i=1;i<=rem;i++)html+=`<div class="cal-day other-month"><div class="cal-day-num">${i}</div></div>`;

  document.getElementById('cal-days').innerHTML=html;
  document.getElementById('cal-day-detail').innerHTML='';
}

function showCalDay(dateStr){
  const dayB=bookings.filter(b=>b.date===dateStr&&isFutureBooking(b)).sort((a,b)=>a.time.localeCompare(b.time));
  const label=friendlyDateLong(dateStr);
  const todayStr=fmtDate(today);
  const isFuture=dateStr>=todayStr;

  let html=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
    <div style="font-size:13px;font-weight:500;color:var(--earth)">${label}</div>
    ${isFuture?`<button class="btn btn-secondary btn-sm" onclick="bookFromWeekCal('${dateStr}')">+ Book</button>`:''}
  </div>`;

  html+=buildTrainerDetail(dateStr);

  // AFB and HNR entries for this day
  if(typeof buildAfbDayDetail==='function')html+=buildAfbDayDetail(dateStr);
  if(typeof buildHnrDayDetail==='function')html+=buildHnrDayDetail(dateStr);

  if(dayB.length===0){
  } else {
    dayB.forEach(b=>{
      const passed=b.date<todayStr||(b.date===todayStr&&bookingEndTime(b)<=nowTimeStr());
      html+=buildBookingRow(b,{
        passed,
        showActions:!passed,
        actionDel:`deleteFromCal(${b.id},'${dateStr}')`,
        actionEdit:`editFromCal(${b.id},'${dateStr}')`
      });
    });
  }
  document.getElementById('cal-day-detail').innerHTML=html;
}

async function deleteFromCal(id, dateStr){
  if(!confirm('Cancel this booking?'))return;
  try{await sb.from('bookings').delete().eq('id',id);}catch(e){}
  bookings=bookings.filter(b=>b.id!==id);
  renderCalendar();
  showCalDay(dateStr);
  renderDash();
  showToast('Booking cancelled');
}

function editFromCal(id, dateStr){
  const b=bookings.find(x=>x.id===id);
  if(!b)return;
  openSheet('booking');
  setTimeout(()=>{
    const bd=document.getElementById('b-date');if(bd)bd.value=b.date;
    populateTimeSelect('b-time',b.time);
    const bh=document.getElementById('b-horse');if(bh)bh.value=b.horse_id||'';
    const br=document.getElementById('b-rider');if(br)br.value=b.rider_id||'';
    const bdur=document.getElementById('b-duration');if(bdur)bdur.value=b.duration||60;
    const bt=document.getElementById('b-type');if(bt)bt.value=b.type||'lesson';
    const ba=document.getElementById('b-arena');if(ba)ba.value=b.arena||'covered';
    const bn=document.getElementById('b-notes');if(bn)bn.value=b.notes||'';
    document.getElementById('sheet-booking').dataset.editId=id;
    document.getElementById('sheet-booking').dataset.editDate=dateStr;
    checkTrainer();
  },50);
}

function changeMonth(dir){
  calMonth+=dir;
  if(calMonth>11){calMonth=0;calYear++;}
  if(calMonth<0){calMonth=11;calYear--;}
  renderCalendar();
}

/* ===========================================================
   [20] STAFF PANELS — Herd, Riders, Shows, Owners, Bookings
   =========================================================== */
function renderHorses(){
  const count=horses.length;
  document.getElementById('horses-sub').textContent=count===0?'No horses yet':`${count} horse${count!==1?'s':''} in the stable`;
  const container=document.getElementById('horses-dash');
  if(!container)return;
  if(count===0){container.innerHTML='<div class="empty"><div class="empty-icon">◈</div><div class="empty-text">No horses yet</div></div>';return;}
  const todayStr=fmtDate(today);
  container.innerHTML=horses.map(h=>{
    const o=getOwner(h.owner_id);
    const sv=h.services||{};
    const hBookings=bookings.filter(b=>parseInt(b.horse_id)===parseInt(h.id)&&isFutureBooking(b))
      .sort((a,b)=>a.date===b.date?a.time.localeCompare(b.time):a.date.localeCompare(b.date));
    const next=hBookings[0];
    const nextR=next?getRider(next.rider_id):null;
    const nextT=next?(typeConfig[next.type]||{label:next.type}):null;
    const aMap={'barn':'Barn','owner-only':'Owner Only','owner-allow':'Shared','partial-lease':'Part Lease','full-lease':'Full Lease'};

    const miniWeek=buildMiniWeek({
      filterFn:(b,ds)=>parseInt(b.horse_id)===parseInt(h.id)&&b.date===ds,
      dotFn:b=>{const r=getRider(b.rider_id);return r?getRiderColor(r.id):(typeConfig[b.type]||{dot:'#888'}).dot;},
      chipHeight:4,chipWidth:'90%',margin:'margin:10px 0 4px'
    });

    return`<div class="horse-card" onclick="showHorseSchedule(${h.id})" style="cursor:pointer">
      <div class="horse-card-top">
        <div class="horse-avatar">${h.name[0]}</div>
        <div style="flex:1;min-width:0">
          <div class="horse-name">${h.name}</div>
          <div class="horse-detail">${h.breed||'?'}${h.age?' · '+h.age+' yrs':''}${o?' · '+o.first:' · Barn'}</div>
          <span class="horse-badge badge-barn" style="margin-top:3px">${aMap[h.access]||'Barn'}</span>
        </div>
        <div class="horse-actions" onclick="event.stopPropagation()">
          <button class="btn btn-secondary btn-sm" onclick="quickBook(${h.id})">Book</button>
          <button class="btn-danger-sm" onclick="deleteHorse(${h.id})">✕</button>
        </div>
      </div>
      ${miniWeek}
      ${next?`<div style="background:var(--cream);border-radius:6px;padding:6px 10px;font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;align-items:center">
        <span>Next: <strong style="color:var(--earth)">${nextR?nextR.first:'Unassigned'}</strong> · ${nextT?nextT.label:''}</span>
        <span style="color:var(--earth-light)">${friendlyDate(next.date)} ${next.time}</span>
      </div>`:''}\
      <div class="service-row" style="margin-top:10px" onclick="event.stopPropagation()">
        <button class="service-btn ${sv.lunge?'requested':''}" onclick="toggleService(${h.id},'lunge')"><span class="service-btn-icon">🔄</span>Lunge</button>
        <button class="service-btn ${sv.turnout?'requested':''}" onclick="toggleService(${h.id},'turnout')"><span class="service-btn-icon">🌿</span>Turnout</button>
        <button class="service-btn ${sv.walker?'requested':''}" onclick="toggleService(${h.id},'walker')"><span class="service-btn-icon">⭕</span>Walker</button>
      </div>
      ${(typeof getHnrForHorseOnDate==='function'&&getHnrForHorseOnDate(h.id,todayStr).length>0)
        ?`<div style="margin-top:8px;padding:6px 10px;background:rgba(192,57,43,0.08);border-radius:6px;border-left:3px solid #c0392b;font-size:11px;color:#c0392b" onclick="event.stopPropagation()">🚫 Currently Not Rideable</div>`
        :`<button class="btn btn-secondary" style="width:100%;margin-top:8px;font-size:11px;padding:8px;display:flex;align-items:center;justify-content:center;gap:4px" onclick="event.stopPropagation();openHnrSheet();document.getElementById('hnr-horse').value=${h.id}">🚫 Mark Not Rideable</button>`}
    </div>`;
  }).join('');
}

async function toggleService(horseId,svc){
  const h=horses.find(x=>x.id===horseId);if(!h)return;
  if(!h.services)h.services={};
  h.services[svc]=!h.services[svc];
  try{await sb.from('horses').update({services:h.services}).eq('id',horseId);}catch(e){}
  showToast(`${svc.charAt(0).toUpperCase()+svc.slice(1)} ${h.services[svc]?'requested':'cancelled'} for ${h.name}`);
  renderHorses();
}

function renderRiders(){
  const count=riders.length;
  document.getElementById('riders-sub').textContent=count===0?'No riders yet':`${count} rider${count!==1?'s':''} registered`;
  const container=document.getElementById('riders-dash');
  if(!container)return;
  if(count===0){container.innerHTML='<div class="empty"><div class="empty-icon">🏇</div><div class="empty-text">No riders yet</div></div>';return;}
  const todayStr=fmtDate(today);
  container.innerHTML=riders.map(r=>{
    const myH=(r.approved_horses||[]).map(id=>getHorse(id)).filter(Boolean);
    const rColor=getRiderColor(r.id);
    const myBookings=bookings.filter(b=>parseInt(b.rider_id)===parseInt(r.id)&&isFutureBooking(b))
      .sort((a,b)=>a.date===b.date?a.time.localeCompare(b.time):a.date.localeCompare(b.date));
    const next=myBookings[0];
    const nextH=next?getHorse(next.horse_id):null;
    const nextT=next?(typeConfig[next.type]||{label:next.type}):null;

    const miniWeek=buildMiniWeek({
      filterFn:(b,ds)=>parseInt(b.rider_id)===parseInt(r.id)&&b.date===ds,
      dotFn:()=>rColor,
      chipHeight:6,chipWidth:'80%',margin:'margin:10px 0 4px'
    });

    return`<div class="person-card" onclick="showRiderScheduleFromSearch(${r.id})" style="cursor:pointer">
      <div class="person-header">
        <div class="person-avatar" style="background:${rColor};color:white">${r.first.substring(0,2).toUpperCase()}</div>
        <div style="flex:1">
          <div class="person-name">${r.first}</div>
          <div class="person-sub">${r.level}${myH.length?' · '+myH.map(h=>h.name).join(', '):''}</div>
          ${r.parents?`<div class="person-sub">Parents: ${r.parents}</div>`:''}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="btn btn-secondary btn-sm" style="font-size:10px;padding:5px 8px" onclick="event.stopPropagation();openEditRider(${r.id})">Edit</button>
          <button class="btn-danger-sm" onclick="event.stopPropagation();deleteRider(${r.id})">✕</button>
        </div>
      </div>
      ${miniWeek}
      ${next?`<div style="background:var(--cream);border-radius:6px;padding:6px 10px;font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;align-items:center">
        <span>Next: <strong style="color:var(--earth)">${nextH?nextH.name:'Unassigned'}</strong> · ${nextT?nextT.label:''}</span>
        <span style="color:var(--earth-light)">${friendlyDate(next.date)} ${next.time}</span>
      </div>`:'<div style="background:var(--cream);border-radius:6px;padding:6px 10px;font-size:11px;color:var(--text-muted);text-align:center">No upcoming visits</div>'}
    </div>`;
  }).join('');
}

function renderShows(){
  const count=shows.length;
  const todayStr=fmtDate(today);
  const upcomingShows=shows.filter(s=>s.date>=todayStr).sort((a,b)=>a.date.localeCompare(b.date));
  const pastShows=shows.filter(s=>s.date<todayStr).sort((a,b)=>b.date.localeCompare(a.date));
  const showsSubEl=document.getElementById('shows-sub');
  if(showsSubEl)showsSubEl.textContent=count===0?'No shows yet':`${upcomingShows.length} upcoming · ${pastShows.length} past`;
  const container=document.getElementById('shows-dash');
  if(!container)return;
  if(count===0){
    container.innerHTML='<div class="empty"><div class="empty-icon">🏆</div><div class="empty-text">No shows added yet</div></div>';
    return;
  }
  let html='';
  if(upcomingShows.length>0){
    html+='<div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">Upcoming</div>';
    html+=upcomingShows.map(s=>showCard(s,false)).join('');
  }
  if(pastShows.length>0){
    html+=`<div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin:16px 0 10px">Past Shows</div>`;
    html+=pastShows.map(s=>showCard(s,true)).join('');
  }
  container.innerHTML=html;
}

function showCard(s,isPast){
  const d=new Date(s.date+'T12:00:00');
  const dateLabel=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
  const showHorses=(s.horse_ids||[]).map(id=>getHorse(id)).filter(Boolean);
  const showRiders=(s.rider_ids||[]).map(id=>getRider(id)).filter(Boolean);
  const daysUntil=Math.ceil((d-today)/(1000*60*60*24));
  const countdown=!isPast&&daysUntil>=0?daysUntil===0?'Today':daysUntil===1?'Tomorrow':`In ${daysUntil} days`:'';
  return`<div class="person-card" onclick="showShowDetail(${s.id})" style="cursor:pointer;${isPast?'opacity:0.65':''}">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
      <div>
        <div style="font-size:16px;font-weight:500;color:var(--earth);margin-bottom:2px">${s.name}</div>
        <div style="font-size:12px;color:var(--text-muted)">${dateLabel}${s.location?' · '+s.location:''}</div>
        ${s.division?`<div style="margin-top:4px"><span class="ev-badge ev-competition">${s.division}</span></div>`:''}
      </div>
      ${countdown?`<div style="background:var(--earth);color:var(--hay);border-radius:8px;padding:4px 10px;font-size:11px;font-weight:500;white-space:nowrap">${countdown}</div>`:''}
    </div>
    ${showRiders.length>0||showHorses.length>0?`
    <div style="display:flex;gap:16px;padding-top:8px;border-top:1px solid var(--cream-dark)">
      ${showHorses.length>0?`<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:4px">Horses</div>
        <div style="font-size:12px;color:var(--text)">${showHorses.map(h=>`<div style="display:flex;align-items:center;gap:5px;margin-bottom:2px"><div style="width:6px;height:6px;border-radius:50%;background:var(--hay)"></div>${h.name}</div>`).join('')}</div>
      </div>`:''}\
      ${showRiders.length>0?`<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:4px">Riders</div>
        <div style="font-size:12px;color:var(--text)">${showRiders.map(r=>`<div style="display:flex;align-items:center;gap:5px;margin-bottom:2px"><div style="width:6px;height:6px;border-radius:50%;background:${getRiderColor(r.id)}"></div>${r.first}</div>`).join('')}</div>
      </div>`:''}
    </div>`:''}\
    ${s.notes?`<div style="margin-top:8px;font-size:11px;color:var(--text-muted);font-style:italic">${s.notes}</div>`:''}
  </div>`;
}

function renderOwners(){
  const c=owners.length;
  document.getElementById('owners-sub').textContent=c===0?'No owners yet':`${c} owner${c!==1?'s':''} registered`;
  if(c===0){document.getElementById('owners-list').innerHTML='<div class="empty"><div class="empty-icon">◉</div><div class="empty-text">No owners yet</div></div>';return;}
  const lLbl={'owner':'Owner','full-lease':'Full Lessee','partial-lease':'Partial Lessee'};
  document.getElementById('owners-list').innerHTML=owners.map(o=>{
    const myH=horses.filter(h=>h.owner_id===o.id);
    return`<div class="person-card">
      <div class="person-header">
        <div class="person-avatar">${o.first.substring(0,2).toUpperCase()}</div>
        <div style="flex:1"><div class="person-name">${o.first}</div><div class="person-sub">${myH.map(h=>h.name).join(', ')||'No horse assigned'}</div></div>
        <button class="btn-danger-sm" onclick="deleteOwner(${o.id})">✕</button>
      </div>
      <div class="person-field"><span class="person-field-label">Email</span><span class="person-field-val">${o.email||'—'}</span></div>
      <div class="person-field"><span class="person-field-label">Phone</span><span class="person-field-val">${o.phone||'—'}</span></div>
      <div class="person-field"><span class="person-field-label">Access</span><span class="person-field-val">${lLbl[o.level]||o.level}${o.allowed_days?(' · '+o.allowed_days.join(', ')):''}</span></div>
    </div>`;
  }).join('');
}

function renderBookings(){
  const futureBookings=bookings.filter(b=>isFutureBooking(b));
  const sorted=[...futureBookings].sort((a,b)=>a.date===b.date?a.time.localeCompare(b.time):a.date.localeCompare(b.date));
  document.getElementById('bookings-sub').textContent=`${sorted.length} upcoming`;
  if(sorted.length===0){document.getElementById('bookings-list').innerHTML='<div class="empty"><div class="empty-icon">◷</div><div class="empty-text">No upcoming bookings</div></div>';return;}
  document.getElementById('bookings-list').innerHTML=sorted.map(b=>{
    const h=getHorse(b.horse_id);const r=getRider(b.rider_id);const t=typeConfig[b.type]||{label:b.type,cls:'ev-arena'};
    const ds=friendlyDate(b.date);
    return`<div class="booking-row">
      <div class="booking-left">
        <div class="booking-horse">${h?h.name:'Unknown'}${!b.rider_id?'<span class="unassigned-badge" style="margin-left:6px">No rider</span>':''}</div>
        <div class="booking-meta">${ds} · ${b.time} · ${fmtDur(b.duration)} · ${arenaLabel(b.arena)}${r?' · '+r.first:''}</div>
      </div>
      <div class="booking-right">
        <span class="ev-badge ${t.cls}">${t.label}</span>
        <button class="btn-danger-sm" onclick="deleteBooking(${b.id})">Remove</button>
      </div>
    </div>`;
  }).join('');
}

/* ===========================================================
   [21] PANEL SWITCHER
   =========================================================== */
function showPanel(name){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(n=>n.classList.remove('active'));
  document.getElementById('panel-'+name).classList.add('active');
  document.getElementById('nav-'+name).classList.add('active');
  if(name==='calendar')renderCalendar();
  if(name==='horses')renderHorses();
  if(name==='riders')renderRiders();
  if(name==='shows')renderShows();
  if(name==='owners')renderOwners();
  if(name==='bookings')renderBookings();
  if(name==='lunge'){renderLungeRequests();const s=document.getElementById('lunge-sub');if(s)s.textContent=lungeRequests.filter(r=>r.status==='pending').length+' pending';}
  if(name==='home')renderDash();
}
