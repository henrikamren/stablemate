/* ===========================================================
   [13] BROWSE VIEWS (shared across roles)
   =========================================================== */
function getBackScreen(){
  if(currentRole==='parent')return'parent-app';
  if(currentRole==='staff')return'app';
  if(currentRole==='owner')return'owner-app';
  return'rider-app';
}

function showHorsesDash(){
  const html=buildHorsesDashHtml();
  // Staff uses separate screen; rider/parent/owner use inline panels
  if(currentRole==='staff'){
    document.getElementById('horses-dash-content').innerHTML=html;
    document.getElementById('horses-dash-back').onclick=()=>showScreen(getBackScreen());
    showScreen('horses-dash');
  } else if(currentRole==='rider'){
    showRiderPanel('horses');
  } else if(currentRole==='parent'){
    showParentPanel('horses');
  } else if(currentRole==='owner'){
    showOwnerPanel('horses');
  }
}

function renderInlineHorsesDash(el){
  el.innerHTML=buildHorsesDashHtml();
}

function buildHorsesDashHtml(){
  const todayStr=fmtDate(today);
  let html=`<div class="rider-greeting">The Herd</div>
  <div class="rider-date-sub" style="margin-bottom:20px">${horses.length} horse${horses.length!==1?'s':''} at ${BARN_NAME}</div>`;

  if(horses.length===0){
    html+='<div class="empty"><div class="empty-icon">🐴</div><div class="empty-text">No horses registered yet</div></div>';
  } else {
    horses.forEach(h=>{
      const o=getOwner(h.owner_id);
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

      html+=`<div style="background:var(--white);border-radius:12px;border:1px solid var(--sand);padding:14px 16px;margin-bottom:12px;cursor:pointer" onclick="showHorseSchedule(${h.id})">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <div style="width:44px;height:44px;border-radius:50%;background:var(--cream-dark);display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:20px;color:var(--earth);flex-shrink:0">${h.name[0]}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:16px;font-weight:500;color:var(--earth)">${h.name}</div>
            <div style="font-size:12px;color:var(--text-muted)">${h.breed||'Unknown breed'}${h.age?' · '+h.age+' yrs':''}${o?' · '+o.first:' · Barn'}</div>
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
  return html;
}

function showRidersDash(){
  const html=buildRidersDashHtml();
  if(currentRole==='staff'){
    document.getElementById('riders-dash-content').innerHTML=html;
    document.getElementById('riders-dash-back').onclick=()=>showScreen(getBackScreen());
    showScreen('riders-dash');
  } else if(currentRole==='rider'){
    showRiderPanel('riders');
  } else if(currentRole==='parent'){
    showParentPanel('riders');
  } else if(currentRole==='owner'){
    showOwnerPanel('riders');
  }
}

function renderInlineRidersDash(el){
  el.innerHTML=buildRidersDashHtml();
}

function buildRidersDashHtml(){
  const todayStr=fmtDate(today);
  let html=`<div class="rider-greeting">Riders</div>
  <div class="rider-date-sub" style="margin-bottom:20px">${riders.length} rider${riders.length!==1?'s':''} at ${BARN_NAME}</div>`;

  if(riders.length===0){
    html+='<div class="empty"><div class="empty-icon">🏇</div><div class="empty-text">No riders registered yet</div></div>';
  } else {
    riders.forEach(r=>{
      const rColor=getRiderColor(r.id);
      const myB=bookings.filter(b=>parseInt(b.rider_id)===parseInt(r.id)&&isFutureBooking(b))
        .sort((a,b)=>a.date===b.date?a.time.localeCompare(b.time):a.date.localeCompare(b.date));
      const next=myB[0];
      const nextH=next?getHorse(next.horse_id):null;
      const approvedH=(r.approved_horses||[]).map(id=>getHorse(id)).filter(Boolean);

      const miniWeek=buildMiniWeek({
        filterFn:(b,ds)=>parseInt(b.rider_id)===parseInt(r.id)&&b.date===ds&&isFutureBooking(b),
        dotFn:()=>rColor,
        cellSize:28,chipHeight:6,chipWidth:'18px',trainerBar:3,margin:'margin-top:8px'
      });

      const isMyChild=currentRole==='parent'&&r.parents&&r.parents.split(',').map(p=>p.trim().toLowerCase()).includes(currentUser.name.trim().toLowerCase());

      html+=`<div style="background:var(--white);border-radius:12px;border:1px solid var(--sand);padding:14px 16px;margin-bottom:12px;cursor:pointer" onclick="showRiderScheduleFromSearch(${r.id})">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <div style="width:44px;height:44px;border-radius:50%;background:${rColor};display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:20px;color:white;flex-shrink:0">${r.first[0]}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:16px;font-weight:500;color:var(--earth)">${r.first}${isMyChild?` <span style="font-size:10px;background:var(--hay-light);color:var(--earth);padding:2px 6px;border-radius:8px">Your child</span>`:''}</div>
            <div style="font-size:12px;color:var(--text-muted)">${r.level}${approvedH.length>0?' · '+approvedH.map(h=>h.name).join(', '):''}</div>
            ${r.parents?`<div style="font-size:11px;color:var(--text-muted);margin-top:2px">👨‍👧 ${r.parents}</div>`:''}
          </div>
          ${next?`<div style="text-align:right;flex-shrink:0">
            <div style="font-size:11px;color:var(--earth-light);font-weight:500">${friendlyDate(next.date)}</div>
            <div style="font-size:11px;color:var(--text-muted)">${next.time}${nextH?' · '+nextH.name:''}</div>
          </div>`:'<div style="font-size:11px;color:var(--text-muted)">No upcoming</div>'}
        </div>
        ${miniWeek}
      </div>`;
    });
  }
  return html;
}

function showShowsDash(){
  const html=buildShowsDashHtml();
  if(currentRole==='staff'){
    document.getElementById('shows-dash-content').innerHTML=html;
    document.getElementById('shows-dash-back').onclick=()=>showScreen(getBackScreen());
    const fab=document.getElementById('shows-add-fab');
    if(fab)fab.style.display='none';
    showScreen('shows-dash');
  } else if(currentRole==='rider'){
    showRiderPanel('shows');
  } else if(currentRole==='parent'){
    showParentPanel('shows');
  } else if(currentRole==='owner'){
    showOwnerPanel('shows');
  }
}

function renderInlineShowsDash(el){
  el.innerHTML=buildShowsDashHtml();
}

function buildShowsDashHtml(){
  const todayStr=fmtDate(today);
  const upcoming=shows.filter(s=>s.date>=todayStr).sort((a,b)=>a.date.localeCompare(b.date));
  const past=shows.filter(s=>s.date<todayStr).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);

  let html=`<div class="rider-greeting">Shows</div>
  <div class="rider-date-sub" style="margin-bottom:20px">${upcoming.length} upcoming · ${BARN_NAME}</div>`;

  if(currentRole==='staff'){
    html+=`<button class="btn btn-secondary btn-sm" style="margin-bottom:16px;width:100%" onclick="openShowSheet()">+ Add Show</button>`;
  }

  function browseShowCard(s, isPast){
    const d=new Date(s.date+'T12:00:00');
    const dl=d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
    const showRiders=(s.rider_ids||[]).map(id=>getRider(id)).filter(Boolean);
    const showHorses=(s.horse_ids||[]).map(id=>getHorse(id)).filter(Boolean);
    const daysUntil=Math.ceil((d-today)/86400000);
    const countdownTxt=daysUntil===0?'Today!':daysUntil===1?'Tomorrow':daysUntil>0?`In ${daysUntil} days`:'';
    return`<div style="background:var(--white);border-radius:12px;border:1px solid var(--sand);padding:16px;margin-bottom:12px;cursor:pointer;${isPast?'opacity:0.6':''}" onclick="showShowDetail(${s.id})">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
        <div>
          <div style="font-size:16px;font-weight:500;color:var(--earth)">${s.name}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${dl}${s.location?' · '+s.location:''}</div>
          ${s.division?`<div style="margin-top:4px"><span class="ev-badge ev-competition">${s.division}</span></div>`:''}
        </div>
        ${countdownTxt?`<div style="background:var(--earth);color:var(--white);padding:4px 10px;border-radius:20px;font-size:11px;font-weight:500;flex-shrink:0">${countdownTxt}</div>`:''}
      </div>
      ${showRiders.length>0?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
        ${showRiders.map(r=>`<div style="display:flex;align-items:center;gap:4px;background:var(--cream);border-radius:20px;padding:3px 8px">
          <div style="width:8px;height:8px;border-radius:50%;background:${getRiderColor(r.id)}"></div>
          <span style="font-size:12px;color:var(--text)">${r.first}</span>
        </div>`).join('')}
      </div>`:''}
      ${showHorses.length>0?`<div style="font-size:12px;color:var(--text-muted)">🐴 ${showHorses.map(h=>h.name).join(', ')}</div>`:''}
    </div>`;
  }

  if(upcoming.length===0){
    html+='<div class="empty" style="padding:32px 20px"><div class="empty-icon">🏆</div><div class="empty-text">No upcoming shows</div></div>';
  } else {
    html+=upcoming.map(s=>browseShowCard(s,false)).join('');
  }

  if(past.length>0){
    html+=`<div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin:20px 0 10px">Past Shows</div>`;
    html+=past.map(s=>browseShowCard(s,true)).join('');
  }
  return html;
}

/* ===========================================================
   [14] LUNGE REQUESTS
   =========================================================== */
function openLungeRequest(horseId){
  const h=getHorse(horseId);if(!h)return;
  document.getElementById('lr-horse-id').value=horseId;
  document.getElementById('lr-horse-name').textContent='🔄 Lunge request for '+h.name;
  const ld=document.getElementById('lr-date');if(ld)ld.value=fmtDate(addDays(today,1));
  populateTimeSelect('lr-time',getDefaultTimeForDate(fmtDate(addDays(today,1))));
  document.getElementById('lr-notes').value='';
  document.getElementById('sheet-lunge-request').classList.add('open');
}

async function saveLungeRequest(){
  const horseId=parseInt(document.getElementById('lr-horse-id').value);
  const date=document.getElementById('lr-date').value;
  const time=document.getElementById('lr-time').value;
  const notes=document.getElementById('lr-notes').value.trim();
  if(!horseId||!date){showToast('Please select a date');return;}

  let requestedBy=currentUser?.name||'Unknown';
  let riderId=null;
  if(currentRole==='rider'){
    const me=riders.find(r=>r.first.toLowerCase()===requestedBy.toLowerCase());
    if(me)riderId=me.id;
  } else if(currentRole==='parent'&&currentChildId){
    riderId=currentChildId;
    const child=getRider(currentChildId);
    if(child)requestedBy+=` (for ${child.first})`;
  }

  const nr={id:Date.now(),horse_id:horseId,rider_id:riderId,requested_by:requestedBy,date,time,notes,status:'pending',created_at:new Date().toISOString()};
  try{
    const{data,error}=await sb.from('lunge_requests').insert({horse_id:horseId,rider_id:riderId,requested_by:requestedBy,date,time,notes,status:'pending'}).select().single();
    if(!error&&data)lungeRequests.unshift(data);else lungeRequests.unshift(nr);
  }catch(e){lungeRequests.unshift(nr);}
  closeSheet('lunge-request');
  showToast('Lunge request sent!');
}

async function acceptLungeRequest(id){
  const req=lungeRequests.find(r=>r.id===id||parseInt(r.id)===parseInt(id));
  if(!req)return;
  const nb={id:Date.now(),horse_id:req.horse_id,rider_id:req.rider_id,date:req.date,time:req.time,duration:60,type:'lunge',arena:'covered',notes:'Lunge: '+req.requested_by+(req.notes?' · '+req.notes:'')};
  try{
    const{data,error}=await sb.from('bookings').insert({horse_id:req.horse_id,rider_id:req.rider_id,date:req.date,time:req.time,duration:60,type:'lunge',arena:'covered',notes:nb.notes}).select().single();
    if(!error&&data)bookings.push(data);else bookings.push(nb);
    await sb.from('lunge_requests').update({status:'accepted'}).eq('id',id);
  }catch(e){bookings.push(nb);}
  lungeRequests=lungeRequests.map(r=>parseInt(r.id)===parseInt(id)?{...r,status:'accepted'}:r);
  renderDash();renderCalendar();
  renderLungeRequests();
  showToast('Lunge accepted and booked!');
}

async function declineLungeRequest(id){
  if(!confirm('Decline this lunge request?'))return;
  try{await sb.from('lunge_requests').update({status:'declined'}).eq('id',id);}catch(e){}
  lungeRequests=lungeRequests.map(r=>parseInt(r.id)===parseInt(id)?{...r,status:'declined'}:r);
  renderLungeRequests();
  showToast('Request declined');
}

function renderLungeRequests(){
  const el=document.getElementById('lunge-requests-list');if(!el)return;
  const pending=lungeRequests.filter(r=>r.status==='pending');
  const recent=lungeRequests.filter(r=>r.status!=='pending').slice(0,5);
  if(lungeRequests.length===0){
    el.innerHTML='<div class="empty"><div class="empty-icon">🔄</div><div class="empty-text">No lunge requests</div></div>';
    return;
  }
  let html='';
  if(pending.length>0){
    html+=`<div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">Pending (${pending.length})</div>`;
    pending.forEach(req=>{
      const h=getHorse(req.horse_id);
      const d=friendlyDate(req.date);
      html+=`<div class="request-card">
        <div class="request-card-header">
          <div>
            <div class="request-card-name">🔄 ${h?h.name:'Unknown horse'}</div>
            <div class="request-card-meta">${d} · ${req.time} · Requested by ${req.requested_by}</div>
            ${req.notes?`<div class="request-card-meta" style="margin-top:2px;font-style:italic">"${req.notes}"</div>`:''}
          </div>
          <span class="lunge-badge pending">Pending</span>
        </div>
        <div class="request-actions">
          <button class="btn btn-primary" style="flex:1;padding:10px" onclick="acceptLungeRequest(${req.id})">✓ Accept & Book</button>
          <button class="btn-danger-sm" style="flex:1;padding:10px" onclick="declineLungeRequest(${req.id})">✕ Decline</button>
        </div>
      </div>`;
    });
  }
  if(recent.length>0){
    html+=`<div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin:16px 0 10px">Recent</div>`;
    recent.forEach(req=>{
      const h=getHorse(req.horse_id);
      const d=friendlyDate(req.date);
      html+=`<div class="request-card" style="opacity:0.7">
        <div class="request-card-header">
          <div>
            <div class="request-card-name">🔄 ${h?h.name:'Unknown horse'}</div>
            <div class="request-card-meta">${d} · ${req.time} · ${req.requested_by}</div>
          </div>
          <span class="lunge-badge ${req.status}">${req.status.charAt(0).toUpperCase()+req.status.slice(1)}</span>
        </div>
      </div>`;
    });
  }
  el.innerHTML=html;
}
