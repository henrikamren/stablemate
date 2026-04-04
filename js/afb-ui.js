/* ===========================================================
   [24] AWAY FROM BARN & HORSE NOT RIDEABLE — UI Layer
   =========================================================== */

// ── AFB Sheet ──────────────────────────────────────────────────

function openAfbSheet(editId){
  const isEdit=!!editId;
  const entry=isEdit?afbEntries.find(a=>a.id===editId):null;
  const sheet=document.getElementById('sheet-afb');
  if(!sheet)return;

  // Title
  const titleEl=document.getElementById('afb-sheet-title');
  if(titleEl)titleEl.textContent=isEdit?'Edit Away From Barn':'Away From Barn';

  // Rider selector — depends on role
  const riderGroup=document.getElementById('afb-rider-group');
  const riderSel=document.getElementById('afb-rider');
  if(currentRole==='staff'){
    // Staff picks any rider
    if(riderGroup)riderGroup.style.display='block';
    if(riderSel){
      riderSel.innerHTML='<option value="">— Select rider —</option>'+
        riders.map(r=>`<option value="${r.id}">${r.first}</option>`).join('');
      if(entry)riderSel.value=entry.rider_id;
    }
  } else if(currentRole==='parent'){
    // Parent picks from children
    if(riderGroup)riderGroup.style.display='block';
    const nameLower=(currentUser?.name||'').trim().toLowerCase();
    const myChildren=riders.filter(r=>r.parents&&r.parents.split(',').map(p=>p.trim().toLowerCase()).includes(nameLower));
    if(riderSel){
      riderSel.innerHTML='<option value="">— Select child —</option>'+
        myChildren.map(r=>`<option value="${r.id}">${r.first}</option>`).join('');
      if(entry)riderSel.value=entry.rider_id;
      else if(currentChildId)riderSel.value=currentChildId;
    }
  } else {
    // Rider — auto-select self
    if(riderGroup)riderGroup.style.display='none';
  }

  // Dates
  const startEl=document.getElementById('afb-start-date');
  const endEl=document.getElementById('afb-end-date');
  if(startEl)startEl.value=entry?entry.start_date:fmtDate(addDays(today,1));
  if(endEl)endEl.value=entry?entry.end_date:fmtDate(addDays(today,1));

  // All-day toggle
  const allDayEl=document.getElementById('afb-all-day');
  if(allDayEl)allDayEl.checked=entry?entry.all_day!==false:true;

  // Time pickers
  populateTimeSelect('afb-start-time',entry&&!entry.all_day?entry.start_time:'08:00');
  populateTimeSelect('afb-end-time',entry&&!entry.all_day?entry.end_time:'17:00');
  updateAfbTimeVisibility();

  // Reason
  const reasonEl=document.getElementById('afb-reason');
  if(reasonEl)reasonEl.value=entry?entry.reason:'';

  // Wire date change to auto-hide partial day for ranges
  if(startEl)startEl.onchange=updateAfbTimeVisibility;
  if(endEl)endEl.onchange=updateAfbTimeVisibility;
  if(allDayEl)allDayEl.onchange=updateAfbTimeVisibility;

  // Store edit id
  sheet.dataset.editId=editId||'';

  // Save button text
  const saveBtn=document.getElementById('afb-save-btn');
  if(saveBtn)saveBtn.textContent=isEdit?'Update':'Save';

  sheet.classList.add('open');
}

function updateAfbTimeVisibility(){
  const startDate=document.getElementById('afb-start-date')?.value;
  const endDate=document.getElementById('afb-end-date')?.value;
  const allDay=document.getElementById('afb-all-day')?.checked;
  const timeGroup=document.getElementById('afb-time-group');
  const allDayGroup=document.getElementById('afb-all-day-group');
  const isRange=startDate&&endDate&&startDate!==endDate;

  // Multi-day ranges force all-day
  if(isRange){
    if(allDayGroup)allDayGroup.style.display='none';
    if(timeGroup)timeGroup.style.display='none';
    const allDayEl=document.getElementById('afb-all-day');
    if(allDayEl)allDayEl.checked=true;
  } else {
    if(allDayGroup)allDayGroup.style.display='block';
    if(timeGroup)timeGroup.style.display=allDay?'none':'block';
  }
}

async function saveAfb(){
  const sheet=document.getElementById('sheet-afb');
  const editId=sheet?.dataset.editId?parseInt(sheet.dataset.editId):null;

  // Resolve rider id
  let riderId;
  if(currentRole==='staff'||currentRole==='parent'){
    riderId=parseInt(document.getElementById('afb-rider')?.value);
    if(!riderId){showToast('Please select a rider');return;}
  } else {
    const nameLower=(currentUser?.name||'').trim().toLowerCase();
    const me=riders.find(r=>r.first.toLowerCase()===nameLower);
    if(!me){showToast('Could not find your rider profile');return;}
    riderId=me.id;
  }

  const startDate=document.getElementById('afb-start-date')?.value;
  const endDate=document.getElementById('afb-end-date')?.value||startDate;
  if(!startDate){showToast('Please select a start date');return;}
  if(endDate<startDate){showToast('End date must be on or after start date');return;}

  // Only staff can backdate
  const todayStr=fmtDate(today);
  if(startDate<todayStr&&currentRole!=='staff'){showToast('Cannot set dates in the past');return;}

  const allDay=document.getElementById('afb-all-day')?.checked!==false;
  const startTime=allDay?null:document.getElementById('afb-start-time')?.value;
  const endTime=allDay?null:document.getElementById('afb-end-time')?.value;
  const reason=document.getElementById('afb-reason')?.value?.trim()||'';

  if(!allDay&&startTime&&endTime&&endTime<=startTime){
    showToast('End time must be after start time');return;
  }

  // Warn about existing bookings
  const conflicts=findConflictingBookings_AFB(riderId, startDate, endDate);
  if(conflicts.length>0){
    const r=getRider(riderId);
    const proceed=confirm(`${r?r.first:'Rider'} has ${conflicts.length} existing booking${conflicts.length!==1?'s':''} in this range. Save anyway?`);
    if(!proceed)return;
  }

  const payload={rider_id:riderId,start_date:startDate,end_date:endDate,all_day:allDay,start_time:startTime,end_time:endTime,reason};

  if(editId){
    await updateAfbEntry(editId,payload);
    showToast('Away From Barn updated');
  } else {
    await saveAfbEntry(payload);
    showToast('Away From Barn saved');
  }

  closeSheet('afb');
  refreshCurrentView();
}

async function deleteAfb(id){
  const entry=afbEntries.find(a=>a.id===id);
  if(!entry)return;
  if(!confirm('Delete this Away From Barn entry?'))return;
  await deleteAfbEntry(id);
  showToast('Away From Barn removed');
  refreshCurrentView();
}

// ── HNR Sheet ──────────────────────────────────────────────────

function openHnrSheet(editId){
  const isEdit=!!editId;
  const entry=isEdit?hnrEntries.find(h=>h.id===editId):null;
  const sheet=document.getElementById('sheet-hnr');
  if(!sheet)return;

  const titleEl=document.getElementById('hnr-sheet-title');
  if(titleEl)titleEl.textContent=isEdit?'Edit Horse Availability':'Horse Not Rideable';

  // Horse selector
  const horseSel=document.getElementById('hnr-horse');
  if(horseSel){
    horseSel.innerHTML='<option value="">— Select horse —</option>'+
      horses.map(h=>`<option value="${h.id}">${h.name}</option>`).join('');
    if(entry)horseSel.value=entry.horse_id;
  }
  // Only staff can create HNR
  if(currentRole!=='staff'){
    showToast('Only staff can mark horses as not rideable');
    return;
  }

  const startEl=document.getElementById('hnr-start-date');
  const endEl=document.getElementById('hnr-end-date');
  if(startEl)startEl.value=entry?entry.start_date:fmtDate(today);
  if(endEl)endEl.value=entry?entry.end_date:fmtDate(today);

  const allDayEl=document.getElementById('hnr-all-day');
  if(allDayEl)allDayEl.checked=entry?entry.all_day!==false:true;

  populateTimeSelect('hnr-start-time',entry&&!entry.all_day?entry.start_time:'08:00');
  populateTimeSelect('hnr-end-time',entry&&!entry.all_day?entry.end_time:'17:00');
  updateHnrTimeVisibility();

  const reasonEl=document.getElementById('hnr-reason');
  if(reasonEl)reasonEl.value=entry?entry.reason:'';

  if(startEl)startEl.onchange=updateHnrTimeVisibility;
  if(endEl)endEl.onchange=updateHnrTimeVisibility;
  if(allDayEl)allDayEl.onchange=updateHnrTimeVisibility;

  sheet.dataset.editId=editId||'';
  const saveBtn=document.getElementById('hnr-save-btn');
  if(saveBtn)saveBtn.textContent=isEdit?'Update':'Save';

  sheet.classList.add('open');
}

function updateHnrTimeVisibility(){
  const startDate=document.getElementById('hnr-start-date')?.value;
  const endDate=document.getElementById('hnr-end-date')?.value;
  const allDay=document.getElementById('hnr-all-day')?.checked;
  const timeGroup=document.getElementById('hnr-time-group');
  const allDayGroup=document.getElementById('hnr-all-day-group');
  const isRange=startDate&&endDate&&startDate!==endDate;

  if(isRange){
    if(allDayGroup)allDayGroup.style.display='none';
    if(timeGroup)timeGroup.style.display='none';
    const allDayEl=document.getElementById('hnr-all-day');
    if(allDayEl)allDayEl.checked=true;
  } else {
    if(allDayGroup)allDayGroup.style.display='block';
    if(timeGroup)timeGroup.style.display=allDay?'none':'block';
  }
}

async function saveHnr(){
  const sheet=document.getElementById('sheet-hnr');
  const editId=sheet?.dataset.editId?parseInt(sheet.dataset.editId):null;

  const horseId=parseInt(document.getElementById('hnr-horse')?.value);
  if(!horseId){showToast('Please select a horse');return;}

  const startDate=document.getElementById('hnr-start-date')?.value;
  const endDate=document.getElementById('hnr-end-date')?.value||startDate;
  if(!startDate){showToast('Please select a start date');return;}
  if(endDate<startDate){showToast('End date must be on or after start date');return;}

  const allDay=document.getElementById('hnr-all-day')?.checked!==false;
  const startTime=allDay?null:document.getElementById('hnr-start-time')?.value;
  const endTime=allDay?null:document.getElementById('hnr-end-time')?.value;
  const reason=document.getElementById('hnr-reason')?.value?.trim()||'';

  if(!allDay&&startTime&&endTime&&endTime<=startTime){
    showToast('End time must be after start time');return;
  }

  // Warn about existing bookings
  const conflicts=findConflictingBookings_HNR(horseId, startDate, endDate);
  if(conflicts.length>0){
    const h=getHorse(horseId);
    const proceed=confirm(`${h?h.name:'Horse'} has ${conflicts.length} existing booking${conflicts.length!==1?'s':''} in this range. Save anyway?`);
    if(!proceed)return;
  }

  const payload={horse_id:horseId,start_date:startDate,end_date:endDate,all_day:allDay,start_time:startTime,end_time:endTime,reason};

  if(editId){
    await updateHnrEntry(editId,payload);
    showToast('Horse availability updated');
  } else {
    await saveHnrEntry(payload);
    showToast('Horse marked as Not Rideable');
  }

  closeSheet('hnr');
  refreshCurrentView();
}

async function deleteHnr(id){
  const entry=hnrEntries.find(h=>h.id===id);
  if(!entry)return;
  if(!confirm('Delete this Not Rideable entry?'))return;
  await deleteHnrEntry(id);
  showToast('Horse availability restored');
  refreshCurrentView();
}

// ── View refresh helper ────────────────────────────────────────

function refreshCurrentView(){
  if(currentRole==='staff'){renderDash();renderCalendar();}
  else if(currentRole==='rider'){renderRiderHome();}
  else if(currentRole==='parent'){renderParentHome();}
}

// ── Display builders ───────────────────────────────────────────

/** AFB badge for calendar cells */
function buildAfbIndicator(dateStr, riderIds){
  const dayAfbs=afbEntries.filter(a=>
    a.start_date<=dateStr&&a.end_date>=dateStr&&
    (riderIds.length===0||riderIds.includes(parseInt(a.rider_id)))
  );
  if(dayAfbs.length===0)return'';
  return `<div style="background:var(--earth-light);color:white;border-radius:3px;padding:1px 3px;font-size:7px;line-height:1.2;text-align:center;opacity:0.85" title="Away From Barn">AFB</div>`;
}

/** HNR badge for calendar cells */
function buildHnrIndicator(dateStr, horseIds){
  const dayHnrs=hnrEntries.filter(h=>
    h.start_date<=dateStr&&h.end_date>=dateStr&&
    (horseIds.length===0||horseIds.includes(parseInt(h.horse_id)))
  );
  if(dayHnrs.length===0)return'';
  return `<div style="background:#c0392b;color:white;border-radius:3px;padding:1px 3px;font-size:7px;line-height:1.2;text-align:center;opacity:0.85" title="Not Rideable">NR</div>`;
}

/** Render AFB entries in a day detail panel */
function buildAfbDayDetail(dateStr){
  const dayAfbs=getAfbOnDate(dateStr);
  if(dayAfbs.length===0)return'';

  let html='<div style="margin-bottom:10px">';
  dayAfbs.forEach(a=>{
    const r=getRider(a.rider_id);
    const rangeLabel=fmtDateRange(a.start_date,a.end_date);
    const timeLabel=a.all_day?'All day':`${a.start_time}–${a.end_time}`;
    const canEdit=currentRole==='staff'||
      (currentRole==='rider'&&r&&r.first.toLowerCase()===(currentUser?.name||'').trim().toLowerCase())||
      (currentRole==='parent'&&r&&r.parents&&r.parents.split(',').map(p=>p.trim().toLowerCase()).includes((currentUser?.name||'').trim().toLowerCase()));

    html+=`<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(139,90,43,0.08);border-radius:8px;border-left:3px solid var(--earth-light);margin-bottom:6px">
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:500;color:var(--earth)">🏠 ${r?r.first:'Unknown'} — Away From Barn</div>
        <div style="font-size:11px;color:var(--text-muted)">${rangeLabel} · ${timeLabel}${a.reason?' · '+a.reason:''}</div>
      </div>
      ${canEdit?`<div style="display:flex;gap:4px;flex-shrink:0">
        <button class="btn btn-secondary btn-sm" style="font-size:10px;padding:4px 8px" onclick="openAfbSheet(${a.id})">Edit</button>
        <button class="btn-danger-sm" style="font-size:10px;padding:4px 8px" onclick="deleteAfb(${a.id})">✕</button>
      </div>`:''}
    </div>`;
  });
  html+='</div>';
  return html;
}

/** Render HNR entries in a day detail panel */
function buildHnrDayDetail(dateStr){
  const dayHnrs=getHnrOnDate(dateStr);
  if(dayHnrs.length===0)return'';

  let html='<div style="margin-bottom:10px">';
  dayHnrs.forEach(h=>{
    const horse=getHorse(h.horse_id);
    const rangeLabel=fmtDateRange(h.start_date,h.end_date);
    const timeLabel=h.all_day?'All day':`${h.start_time}–${h.end_time}`;
    const canEdit=currentRole==='staff';

    html+=`<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(192,57,43,0.08);border-radius:8px;border-left:3px solid #c0392b;margin-bottom:6px">
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:500;color:#c0392b">🚫 ${horse?horse.name:'Unknown'} — Not Rideable</div>
        <div style="font-size:11px;color:var(--text-muted)">${rangeLabel} · ${timeLabel}${h.reason?' · '+h.reason:''}</div>
      </div>
      ${canEdit?`<div style="display:flex;gap:4px;flex-shrink:0">
        <button class="btn btn-secondary btn-sm" style="font-size:10px;padding:4px 8px" onclick="openHnrSheet(${h.id})">Edit</button>
        <button class="btn-danger-sm" style="font-size:10px;padding:4px 8px" onclick="deleteHnr(${h.id})">✕</button>
      </div>`:''}
    </div>`;
  });
  html+='</div>';
  return html;
}

/** Render AFB list for a rider's schedule view */
function buildRiderAfbList(riderId){
  const todayStr=fmtDate(today);
  const riderAfbs=afbEntries.filter(a=>
    parseInt(a.rider_id)===parseInt(riderId)&&a.end_date>=todayStr
  ).sort((a,b)=>a.start_date.localeCompare(b.start_date));

  if(riderAfbs.length===0)return'';

  const canEdit=currentRole==='staff'||
    (currentRole==='rider'&&getRider(riderId)?.first.toLowerCase()===(currentUser?.name||'').trim().toLowerCase())||
    (currentRole==='parent');

  let html=`<div class="schedule-card" style="margin-bottom:14px">
    <div class="schedule-header">
      <div class="schedule-title">Away From Barn</div>
      <div class="schedule-meta">${riderAfbs.length} upcoming</div>
    </div>`;

  riderAfbs.forEach(a=>{
    const rangeLabel=fmtDateRange(a.start_date,a.end_date);
    const days=rangeDayCount(a.start_date,a.end_date);
    const timeLabel=a.all_day?'All day':`${a.start_time}–${a.end_time}`;
    const isShow=!!a.show_id;

    html+=`<div class="schedule-item">
      <div class="schedule-time" style="font-size:10px;min-width:50px">${rangeLabel}</div>
      <div class="schedule-dot" style="background:var(--earth-light)"></div>
      <div class="schedule-info">
        <div class="schedule-horse">🏠 Away From Barn${isShow?' <span style="font-size:10px;background:var(--hay-light);color:var(--earth);padding:1px 6px;border-radius:8px">Show</span>':''}</div>
        <div class="schedule-detail">${timeLabel} · ${days} day${days!==1?'s':''}${a.reason?' · '+a.reason:''}</div>
      </div>
      ${canEdit?`<div style="display:flex;gap:4px;flex-shrink:0">
        <button class="btn btn-secondary btn-sm" style="font-size:10px;padding:4px 8px" onclick="openAfbSheet(${a.id})">Edit</button>
        <button class="btn-danger-sm" style="font-size:10px;padding:4px 8px" onclick="deleteAfb(${a.id})">✕</button>
      </div>`:''}
    </div>`;
  });

  html+='</div>';
  return html;
}

/** Render HNR list for a horse's schedule view */
function buildHorseHnrList(horseId){
  const todayStr=fmtDate(today);
  const horseHnrs=hnrEntries.filter(h=>
    parseInt(h.horse_id)===parseInt(horseId)&&h.end_date>=todayStr
  ).sort((a,b)=>a.start_date.localeCompare(b.start_date));

  if(horseHnrs.length===0)return'';

  let html=`<div class="schedule-card" style="margin-bottom:14px">
    <div class="schedule-header">
      <div class="schedule-title">Not Rideable</div>
      <div class="schedule-meta">${horseHnrs.length} upcoming</div>
    </div>`;

  horseHnrs.forEach(h=>{
    const rangeLabel=fmtDateRange(h.start_date,h.end_date);
    const days=rangeDayCount(h.start_date,h.end_date);
    const timeLabel=h.all_day?'All day':`${h.start_time}–${h.end_time}`;

    html+=`<div class="schedule-item">
      <div class="schedule-time" style="font-size:10px;min-width:50px">${rangeLabel}</div>
      <div class="schedule-dot" style="background:#c0392b"></div>
      <div class="schedule-info">
        <div class="schedule-horse">🚫 Not Rideable</div>
        <div class="schedule-detail">${timeLabel} · ${days} day${days!==1?'s':''}${h.reason?' · '+h.reason:''}</div>
      </div>
      ${currentRole==='staff'?`<div style="display:flex;gap:4px;flex-shrink:0">
        <button class="btn btn-secondary btn-sm" style="font-size:10px;padding:4px 8px" onclick="openHnrSheet(${h.id})">Edit</button>
        <button class="btn-danger-sm" style="font-size:10px;padding:4px 8px" onclick="deleteHnr(${h.id})">✕</button>
      </div>`:''}
    </div>`;
  });

  html+='</div>';
  return html;
}

/** Build horse availability warning for booking dropdowns */
function buildHorseAvailabilityNote(horseId, dateStr){
  if(!horseId||!dateStr)return'';
  const check=isHorseUnavailable(horseId,dateStr);
  if(!check.unavailable)return'';
  const h=check.entry;
  return `<div style="background:rgba(192,57,43,0.1);border:1px solid rgba(192,57,43,0.3);border-radius:8px;padding:8px 12px;margin-top:6px;font-size:12px;color:#c0392b">
    🚫 This horse is marked Not Rideable${h.reason?' ('+h.reason+')':''}${h.start_date!==h.end_date?' · '+fmtDateRange(h.start_date,h.end_date):''}
  </div>`;
}

/** Build rider availability warning for booking forms */
function buildRiderAvailabilityNote(riderId, dateStr){
  if(!riderId||!dateStr)return'';
  const check=isRiderAway(riderId,dateStr);
  if(!check.away)return'';
  const a=check.entry;
  return `<div style="background:rgba(139,90,43,0.1);border:1px solid rgba(139,90,43,0.3);border-radius:8px;padding:8px 12px;margin-top:6px;font-size:12px;color:var(--earth)">
    🏠 This rider is Away From Barn${a.reason?' ('+a.reason+')':''}${a.start_date!==a.end_date?' · '+fmtDateRange(a.start_date,a.end_date):''}
  </div>`;
}

// ── Booking conflict integration ───────────────────────────────

/**
 * Show conflict warnings in booking form.
 * Call this when date/rider/horse changes in booking sheet.
 */
function updateBookingConflictWarnings(prefix){
  // prefix: 'b' for staff booking, 'rb' for rider booking
  const dateEl=document.getElementById(prefix+'-date');
  const timeEl=document.getElementById(prefix+'-time');
  const horseEl=document.getElementById(prefix+'-horse');
  const warningEl=document.getElementById(prefix+'-conflict-warning');
  if(!warningEl)return;

  const dateStr=dateEl?.value;
  const timeStr=timeEl?.value;
  const horseId=parseInt(horseEl?.value)||null;

  // Determine rider
  let riderId=null;
  if(prefix==='b'){
    riderId=parseInt(document.getElementById('b-rider')?.value)||null;
  } else {
    if(currentRole==='parent'){
      riderId=parseInt(document.getElementById('rb-child')?.value)||currentChildId||null;
    } else {
      const nameLower=(currentUser?.name||'').trim().toLowerCase();
      const me=riders.find(r=>r.first.toLowerCase()===nameLower);
      riderId=me?me.id:null;
    }
  }

  if(!dateStr){warningEl.innerHTML='';return;}

  // Get duration and editId for double-booking check
  const durEl=document.getElementById(prefix==='b'?'b-duration':'rb-duration');
  const duration=parseInt(durEl?.value)||60;
  const sheetEl=document.getElementById(prefix==='b'?'sheet-booking':'sheet-rider-booking');
  const editId=sheetEl?.dataset?.editId?parseInt(sheetEl.dataset.editId):null;

  let allWarnings=[];

  // Double-booking check (horse + rider)
  if(typeof checkDoubleBooking==='function'&&dateStr&&timeStr){
    const dbCheck=checkDoubleBooking(horseId,riderId,dateStr,timeStr,duration,editId);
    if(!dbCheck.ok){
      allWarnings.push({type:'double',message:dbCheck.message});
    }
  }

  // AFB/HNR conflict check
  const{warnings}=checkBookingConflicts(riderId,horseId,dateStr,timeStr);
  allWarnings=allWarnings.concat(warnings);

  if(allWarnings.length===0){
    warningEl.innerHTML='';
    return;
  }

  warningEl.innerHTML=allWarnings.map(w=>{
    const isDouble=w.type==='double';
    const bg=isDouble?'rgba(231,76,60,0.1)':w.type==='afb'?'rgba(139,90,43,0.1)':'rgba(192,57,43,0.1)';
    const border=isDouble?'rgba(231,76,60,0.3)':w.type==='afb'?'rgba(139,90,43,0.3)':'rgba(192,57,43,0.3)';
    const color=isDouble?'#e74c3c':w.type==='afb'?'var(--earth)':'#c0392b';
    const icon=isDouble?'⚠️':w.type==='afb'?'🏠':'🚫';
    return `<div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:8px 12px;margin-top:6px;font-size:12px;color:${color}">
      ${icon} ${w.message}
    </div>`;
  }).join('');
}
