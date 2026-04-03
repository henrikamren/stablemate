/* ===========================================================
   [23] CRUD — Save Operations
   =========================================================== */
function isHorseDoubleBooked(horseId, date, time, duration, excludeId){
  if(!horseId)return false;
  const dur=parseInt(duration)||60;
  const [h,m]=time.split(':').map(Number);
  const startMin=h*60+m;
  const endMin=startMin+dur;
  return bookings.some(b=>{
    if(excludeId&&b.id===excludeId)return false;
    if(parseInt(b.horse_id)!==parseInt(horseId)||b.date!==date)return false;
    const [bh,bm]=b.time.split(':').map(Number);
    const bStart=bh*60+bm;
    const bEnd=bStart+(parseInt(b.duration)||60);
    return startMin<bEnd&&endMin>bStart;
  });
}

function editBookingFromRider(bookingId){
  const b=bookings.find(x=>x.id===bookingId);
  if(!b)return;
  openSheet('rider-booking');
  setTimeout(()=>{
    const bd=document.getElementById('rb-date');if(bd)bd.value=b.date;
    populateTimeSelect('rb-time',b.time);
    const bdur=document.getElementById('rb-duration');if(bdur)bdur.value=b.duration||60;
    const bh=document.getElementById('rb-horse');if(bh)bh.value=b.horse_id||'';
    const bt=document.getElementById('rb-type');if(bt)bt.value=b.type||'lesson';
    const ba=document.getElementById('rb-arena');if(ba)ba.value=b.arena||'covered';
    const bn=document.getElementById('rb-notes');if(bn)bn.value=b.notes||'';
    // Hide recur for edits
    const recurSel=document.getElementById('rb-recur');
    if(recurSel){recurSel.value='none';document.getElementById('rb-recur-until-group').style.display='none';}
    // Store edit id
    document.getElementById('sheet-rider-booking').dataset.editId=bookingId;
    checkRiderTrainer();
  },50);
}

async function saveBooking(){
  const horseId=parseInt(document.getElementById('b-horse').value)||null;
  const riderId=parseInt(document.getElementById('b-rider').value)||null;
  const date=document.getElementById('b-date').value;
  const time=document.getElementById('b-time').value;
  const duration=parseInt(document.getElementById('b-duration').value)||60;
  const type=document.getElementById('b-type').value;
  const arena=document.getElementById('b-arena').value||'covered';
  const notes=document.getElementById('b-notes').value;
  if(!date){showToast('Please select a date');return;}
  const editId=document.getElementById('sheet-booking')?.dataset.editId?parseInt(document.getElementById('sheet-booking').dataset.editId):null;
  if(isHorseDoubleBooked(horseId,date,time,duration,editId)){showToast('This horse is already booked at that time');return;}
  const nb={id:Date.now(),horse_id:horseId,rider_id:riderId,date,time,duration,type,arena,notes};
  try{
    const{data,error}=await sb.from('bookings').insert({horse_id:horseId,rider_id:riderId,date,time,duration,type,arena,notes}).select().single();
    if(!error&&data)bookings.push(data);else bookings.push(nb);
  }catch(e){bookings.push(nb);}
  // If editing an existing booking, delete the old one first
  const sheetEl=document.getElementById('sheet-booking');
  const editDate=sheetEl?.dataset.editDate;
  if(editId){
    try{await sb.from('bookings').delete().eq('id',editId);}catch(e){}
    bookings=bookings.filter(b=>b.id!==editId);
    delete sheetEl.dataset.editId;
    delete sheetEl.dataset.editDate;
  }
  closeSheet('booking');document.getElementById('b-notes').value='';
  renderDash();
  renderCalendar();
  if(editDate){showCalDay(editDate);}
  showToast(editId?'Booking updated':'Booking saved');
}

async function saveRiderBooking(){
  const date=document.getElementById('rb-date').value;
  const time=document.getElementById('rb-time').value;
  const duration=parseInt(document.getElementById('rb-duration').value)||60;
  const horseId=parseInt(document.getElementById('rb-horse').value)||null;
  const type=document.getElementById('rb-type').value;
  const arena=document.getElementById('rb-arena').value||'covered';
  const notes=document.getElementById('rb-notes').value;
  const recur=document.getElementById('rb-recur').value;
  const recurUntil=document.getElementById('rb-recur-until').value;
  if(!date){showToast('Please select a date');return;}

  // Check for edit mode
  const sheetEl=document.getElementById('sheet-rider-booking');
  const editId=sheetEl?.dataset.editId?parseInt(sheetEl.dataset.editId):null;

  // Double-booking check
  if(isHorseDoubleBooked(horseId,date,time,duration,editId)){showToast('This horse is already booked at that time');return;}

  let riderId=null;
  if(currentRole==='parent'){
    // Use child selector value
    const childSel=document.getElementById('rb-child');
    const selChildId=parseInt(childSel?.value)||null;
    riderId=selChildId||currentChildId||null;
    if(!riderId){showToast('Please select a child');return;}
    currentChildId=riderId;
  } else if(currentChildId){
    riderId=currentChildId;
  } else {
    const rider=riders.find(r=>r.first===currentUser.name||r.first+' '+(r.last||'').trim()===currentUser.name);
    riderId=rider?rider.id:null;
  }

  // Build list of dates to book
  const dates=[date];
  if(recur!=='none'&&recurUntil&&recurUntil>date){
    const intervalDays=recur==='weekly'?7:recur==='biweekly'?14:28;
    let cur=new Date(date+'T12:00:00');
    const until=new Date(recurUntil+'T12:00:00');
    while(true){
      cur.setDate(cur.getDate()+intervalDays);
      if(cur>until)break;
      dates.push(fmtDate(cur));
    }
  }

  let saved=0;
  for(const d of dates){
    const nb={id:Date.now()+saved,horse_id:horseId,rider_id:riderId,date:d,time,duration,type,arena,notes};
    try{
      const{data,error}=await sb.from('bookings').insert({horse_id:horseId,rider_id:riderId,date:d,time,duration,type,arena,notes}).select().single();
      if(!error&&data)bookings.push(data);else bookings.push(nb);
    }catch(e){bookings.push(nb);}
    saved++;
  }

  // If editing an existing booking, delete the old one
  if(editId){
    try{await sb.from('bookings').delete().eq('id',editId);}catch(e){}
    bookings=bookings.filter(b=>b.id!==editId);
    delete sheetEl.dataset.editId;
  }

  closeSheet('rider-booking');
  document.getElementById('rb-notes').value='';
  document.getElementById('rb-recur').value='none';
  document.getElementById('rb-recur-until-group').style.display='none';

  if(currentChildId){
    const child=getRider(currentChildId);
    if(child)showChildSchedule(currentChildId,true);
    currentChildId=null;
  } else {
    renderRiderHome();
  }
  renderCalendar();
  showToast(editId?'Booking updated':saved===1?'Visit booked!':saved+' visits booked!');
}

async function saveHorse(){
  const name=document.getElementById('h-name').value.trim();
  const breed=document.getElementById('h-breed').value.trim();
  const age=parseInt(document.getElementById('h-age').value)||null;
  const owner_id=parseInt(document.getElementById('h-owner').value)||null;
  const access=document.getElementById('h-access').value;
  const notes=document.getElementById('h-notes').value.trim();
  if(!name){showToast('Please enter a horse name');return;}
  const nh={id:Date.now(),name,breed,age,owner_id,access,notes,services:{}};
  try{const{data,error}=await sb.from('horses').insert({name,breed,age,owner_id,access,notes}).select().single();if(!error&&data)horses.push({...data,services:{}});else horses.push(nh);}catch(e){horses.push(nh);}
  closeSheet('horse');['h-name','h-breed','h-age','h-notes'].forEach(id=>document.getElementById(id).value='');
  renderHorses();renderDash();showToast(name+' added');
}

function populateRiderHorseSelect(selectedIds){
  const el=document.getElementById('r-horses');if(!el)return;
  el.innerHTML=horses.map(h=>`<option value="${h.id}" ${(selectedIds||[]).map(Number).includes(parseInt(h.id))?'selected':''}>${h.name}</option>`).join('');
}

function openEditRider(riderId){
  const r=riders.find(x=>parseInt(x.id)===parseInt(riderId));
  if(!r)return;
  document.getElementById('rider-form-title').textContent='Edit Rider';
  document.getElementById('rider-form-save-btn').textContent='Save Changes';
  document.getElementById('r-first').value=r.first||'';
  document.getElementById('r-email').value=r.email||'';
  document.getElementById('r-phone').value=r.phone||'';
  document.getElementById('r-level').value=r.level||'beginner';
  document.getElementById('r-parents').value=r.parents||'';
  populateRiderHorseSelect(r.approved_horses||[]);
  document.getElementById('sheet-rider-form').dataset.editId=riderId;
  openSheet('rider-form');
}

async function saveRider(){
  const first=document.getElementById('r-first').value.trim();
  const email=document.getElementById('r-email').value.trim();
  const phone=document.getElementById('r-phone').value.trim();
  const level=document.getElementById('r-level').value;
  const parents=document.getElementById('r-parents').value.trim();
  const approved_horses=Array.from(document.getElementById('r-horses').selectedOptions).map(o=>parseInt(o.value));
  if(!first){showToast('Please enter a name');return;}

  const sheetEl=document.getElementById('sheet-rider-form');
  const editId=sheetEl?.dataset.editId?parseInt(sheetEl.dataset.editId):null;

  if(editId){
    // Update existing rider
    const patch={first,email,phone,level,parents,approved_horses};
    try{await sb.from('riders').update(patch).eq('id',editId);}catch(e){console.error('Update rider:',e);}
    const idx=riders.findIndex(r=>parseInt(r.id)===editId);
    if(idx>=0)riders[idx]={...riders[idx],...patch};
    delete sheetEl.dataset.editId;
    closeSheet('rider-form');
    renderRiders();renderDash();showToast(first+' updated');
  } else {
    // Add new rider
    const nr={id:Date.now(),first,last:'',email,phone,level,parents,approved_horses};
    try{const{data,error}=await sb.from('riders').insert({first,last:'',email,phone,level,parents,approved_horses}).select().single();if(!error&&data)riders.push(data);else riders.push(nr);}catch(e){riders.push(nr);}
    closeSheet('rider-form');
    renderRiders();renderDash();showToast(first+' added');
  }
  ['r-first','r-email','r-phone','r-parents'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('rider-form-title').textContent='Add Rider';
  document.getElementById('rider-form-save-btn').textContent='Add Rider';
  populateLoginDropdowns();
}

async function saveOwner(){
  const first=document.getElementById('o-first').value.trim();
  const email=document.getElementById('o-email').value.trim();
  const phone=document.getElementById('o-phone').value.trim();
  const level=document.getElementById('o-level').value;
  const notes=document.getElementById('o-notes').value.trim();
  const allowed_days=level==='partial-lease'?Array.from(document.querySelectorAll('#o-days-check input:checked')).map(c=>c.value):null;
  if(!first){showToast('Please enter a name');return;}
  const no={id:Date.now(),first,last:'',email,phone,level,notes,allowed_days};
  try{const{data,error}=await sb.from('owners').insert({first,last:'',email,phone,level,notes,allowed_days}).select().single();if(!error&&data)owners.push(data);else owners.push(no);}catch(e){owners.push(no);}
  closeSheet('owner');['o-first','o-email','o-phone','o-notes'].forEach(id=>document.getElementById(id).value='');
  renderOwners();renderDash();showToast(first+' added');
}

/* ===========================================================
   [24] SHOWS — CRUD & RSVP
   =========================================================== */
async function saveShow(){
  const name=document.getElementById('sh-name').value.trim();
  const date=document.getElementById('sh-date').value;
  const endDate=document.getElementById('sh-end-date').value||date;
  const location=document.getElementById('sh-location').value.trim();
  const division=document.getElementById('sh-class').value.trim();
  const notes=document.getElementById('sh-notes').value.trim();
  const horseIds=Array.from(document.getElementById('sh-horses').selectedOptions).map(o=>parseInt(o.value));
  const riderIds=Array.from(document.getElementById('sh-riders').selectedOptions).map(o=>parseInt(o.value));
  if(!name||!date){showToast('Please enter a name and date');return;}
  // rsvps starts as empty object -- riders respond yes/no/maybe
  const ns={id:Date.now(),name,date,end_date:endDate,location,division,notes,horse_ids:horseIds,rider_ids:riderIds,rsvps:{}};
  try{
    const{data,error}=await sb.from('shows').insert({name,date,end_date:endDate,location,division,notes,horse_ids:horseIds,rider_ids:riderIds,rsvps:{}}).select().single();
    if(!error&&data)shows.push(data);else shows.push(ns);
  }catch(e){shows.push(ns);}
  closeSheet('show');
  ['sh-name','sh-date','sh-end-date','sh-location','sh-class','sh-notes'].forEach(id=>document.getElementById(id).value='');
  showToast(name+' added');
}

async function deleteShow(id){
  if(!confirm('Remove this show?'))return;
  try{await sb.from('shows').delete().eq('id',id);}catch(e){}
  shows=shows.filter(s=>s.id!==id);
  showToast('Show removed');
}

function openShowSheet(){
  const hEl=document.getElementById('sh-horses');
  const rEl=document.getElementById('sh-riders');
  if(hEl)hEl.innerHTML=horses.map(h=>`<option value="${h.id}">${h.name}</option>`).join('');
  if(rEl)rEl.innerHTML=riders.map(r=>`<option value="${r.id}">${r.first}</option>`).join('');
  const sd=document.getElementById('sh-date');if(sd)sd.value=fmtDate(addDays(today,7));
  const sed=document.getElementById('sh-end-date');if(sed)sed.value='';
  document.getElementById('sheet-show').classList.add('open');
}

async function rsvpShow(showId, response){
  // response: 'yes' | 'no' | 'maybe'
  const show=shows.find(s=>parseInt(s.id)===parseInt(showId));
  if(!show)return;
  if(!show.rsvps)show.rsvps={};

  // Find the current rider
  let riderKey=currentUser.name;
  if(currentRole==='parent'&&currentChildId){
    const child=getRider(currentChildId);
    if(child)riderKey=child.first+'_'+child.id;
  } else if(currentRole==='rider'){
    const me=riders.find(r=>r.first.toLowerCase()===currentUser.name.toLowerCase());
    if(me)riderKey=me.first+'_'+me.id;
  }

  show.rsvps[riderKey]=response;
  try{
    await sb.from('shows').update({rsvps:show.rsvps}).eq('id',showId);
  }catch(e){}
  showToast(response==='yes'?'Confirmed! See you at the show 🏆':response==='no'?'RSVP: Not attending':'RSVP: Maybe');
  showShowDetail(showId);
}

function getRsvpStatus(show){
  if(!show.rsvps)return null;
  let riderKey=null;
  if(currentRole==='parent'&&currentChildId){
    const child=getRider(currentChildId);
    if(child)riderKey=child.first+'_'+child.id;
  } else if(currentRole==='rider'){
    const me=riders.find(r=>r.first.toLowerCase()===currentUser.name.toLowerCase());
    if(me)riderKey=me.first+'_'+me.id;
  }
  return riderKey?show.rsvps[riderKey]:null;
}

function showShowDetail(showId){
  const show=shows.find(s=>s.id===showId||parseInt(s.id)===parseInt(showId));
  if(!show)return;
  const showHorses=(show.horse_ids||[]).map(id=>getHorse(id)).filter(Boolean);
  const showRiders=(show.rider_ids||[]).map(id=>getRider(id)).filter(Boolean);
  const rsvps=show.rsvps||{};

  // Date display - multi-day support
  const d1=new Date(show.date+'T12:00:00');
  const endDate=show.end_date&&show.end_date!==show.date?show.end_date:null;
  const d2=endDate?new Date(endDate+'T12:00:00'):null;
  const dateLabel=d2
    ?d1.toLocaleDateString('en-US',{month:'long',day:'numeric'})+' – '+d2.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})
    :d1.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

  const todayStr=fmtDate(today);
  const isFuture=show.date>=todayStr;
  const daysUntil=Math.ceil((d1-today)/86400000);
  const countdown=isFuture?(daysUntil===0?'Today!':daysUntil===1?'Tomorrow':`In ${daysUntil} days`):'Past show';

  let html=`<div class="rider-greeting">${show.name}</div>
  <div class="rider-date-sub">${dateLabel}${show.location?' · '+show.location:''}</div>
  <div style="margin:8px 0 16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
    ${show.division?`<span class="ev-badge ev-competition">${show.division}</span>`:''}
    <span style="background:var(--earth);color:var(--white);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500">${countdown}</span>
  </div>`;

  // -- RSVP section for riders/parents --
  if((currentRole==='rider'||currentRole==='parent')&&isFuture){
    const myStatus=getRsvpStatus(show);
    const riderName=currentRole==='parent'&&currentChildId?getRider(currentChildId)?.first:currentUser.name;
    html+=`<div style="background:var(--white);border-radius:10px;border:1px solid var(--sand);padding:14px 16px;margin-bottom:14px">
      <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">
        ${riderName?riderName+"'s RSVP":'Your RSVP'}
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="rsvpShow(${show.id},'yes')" style="flex:1;padding:10px;border-radius:8px;border:2px solid ${myStatus==='yes'?'#2d6a4f':'var(--sand)'};background:${myStatus==='yes'?'#e8f4ed':'var(--white)'};color:${myStatus==='yes'?'#2d6a4f':'var(--text-muted)'};font-weight:500;cursor:pointer;font-family:inherit;font-size:13px">
          ✓ Going
        </button>
        <button onclick="rsvpShow(${show.id},'maybe')" style="flex:1;padding:10px;border-radius:8px;border:2px solid ${myStatus==='maybe'?'var(--hay)':'var(--sand)'};background:${myStatus==='maybe'?'var(--hay-light)':'var(--white)'};color:${myStatus==='maybe'?'var(--hay-dark)':'var(--text-muted)'};font-weight:500;cursor:pointer;font-family:inherit;font-size:13px">
          ? Maybe
        </button>
        <button onclick="rsvpShow(${show.id},'no')" style="flex:1;padding:10px;border-radius:8px;border:2px solid ${myStatus==='no'?'#c0392b':'var(--sand)'};background:${myStatus==='no'?'#fdecea':'var(--white)'};color:${myStatus==='no'?'#c0392b':'var(--text-muted)'};font-weight:500;cursor:pointer;font-family:inherit;font-size:13px">
          ✕ Can't go
        </button>
      </div>
    </div>`;
  }

  // -- RSVP summary for staff --
  if(currentRole==='staff'&&showRiders.length>0){
    const going=showRiders.filter(r=>{const k=r.first+'_'+r.id;return rsvps[k]==='yes';});
    const maybe=showRiders.filter(r=>{const k=r.first+'_'+r.id;return rsvps[k]==='maybe';});
    const notGoing=showRiders.filter(r=>{const k=r.first+'_'+r.id;return rsvps[k]==='no';});
    const noResponse=showRiders.filter(r=>{const k=r.first+'_'+r.id;return !rsvps[k];});
    html+=`<div class="schedule-card" style="margin-bottom:14px">
      <div class="schedule-header"><div class="schedule-title">RSVP Status</div><div class="schedule-meta">${showRiders.length} invited</div></div>
      ${going.length>0?`<div style="padding:8px 16px 4px;font-size:11px;font-weight:500;color:#2d6a4f;letter-spacing:0.06em">✓ GOING (${going.length})</div>
      ${going.map(r=>`<div class="schedule-item"><div class="schedule-dot" style="background:${getRiderColor(r.id)}"></div><div class="schedule-info"><div class="schedule-horse">${r.first}</div><div class="schedule-detail">${r.level}</div></div></div>`).join('')}`:''}
      ${maybe.length>0?`<div style="padding:8px 16px 4px;font-size:11px;font-weight:500;color:var(--hay-dark);letter-spacing:0.06em">? MAYBE (${maybe.length})</div>
      ${maybe.map(r=>`<div class="schedule-item"><div class="schedule-dot" style="background:${getRiderColor(r.id)}"></div><div class="schedule-info"><div class="schedule-horse">${r.first}</div><div class="schedule-detail">${r.level}</div></div></div>`).join('')}`:''}
      ${notGoing.length>0?`<div style="padding:8px 16px 4px;font-size:11px;font-weight:500;color:#c0392b;letter-spacing:0.06em">✕ NOT GOING (${notGoing.length})</div>
      ${notGoing.map(r=>`<div class="schedule-item" style="opacity:0.6"><div class="schedule-dot" style="background:#ccc"></div><div class="schedule-info"><div class="schedule-horse">${r.first}</div><div class="schedule-detail">${r.level}</div></div></div>`).join('')}`:''}
      ${noResponse.length>0?`<div style="padding:8px 16px 4px;font-size:11px;color:var(--text-muted);letter-spacing:0.06em">NO RESPONSE (${noResponse.length})</div>
      ${noResponse.map(r=>`<div class="schedule-item" style="opacity:0.5"><div class="schedule-dot" style="background:var(--sand)"></div><div class="schedule-info"><div class="schedule-horse">${r.first}</div></div></div>`).join('')}`:''}
    </div>`;
  }

  // Horses
  html+=`<div class="schedule-card" style="margin-bottom:14px">
    <div class="schedule-header"><div class="schedule-title">Horses Entered</div></div>
    ${showHorses.length===0?'<div style="padding:12px 16px;font-size:13px;color:var(--text-muted)">None assigned</div>'
      :showHorses.map(h=>`<div class="schedule-item">
        <div class="schedule-dot" style="background:var(--hay)"></div>
        <div class="schedule-info"><div class="schedule-horse">${h.name}</div>
        <div class="schedule-detail">${h.breed||''}${h.age?' · '+h.age+' yrs':''}</div></div>
      </div>`).join('')}
  </div>`;

  // Notes
  if(show.notes){
    html+=`<div style="background:var(--white);border-radius:10px;border:1px solid var(--sand);padding:14px 16px;margin-bottom:14px">
      <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">Notes</div>
      <div style="font-size:13px;color:var(--text)">${show.notes}</div>
    </div>`;
  }

  if(currentRole==='staff'){
    html+=`<button class="btn btn-secondary" style="width:100%;margin-top:4px" onclick="deleteShow(${show.id});showScreen('app')">Remove Show</button>`;
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

/* ===========================================================
   [25] DELETE OPERATIONS
   =========================================================== */
async function deleteBooking(id){
  if(!confirm('Remove this booking?'))return;
  const b=bookings.find(x=>x.id===id);
  try{await sb.from('bookings').delete().eq('id',id);}catch(e){}
  bookings=bookings.filter(x=>x.id!==id);
  renderDash();
  renderBookings();
  // Re-render calendar dots and refresh day detail if open
  const calDays=document.getElementById('cal-days');
  if(calDays&&calDays.innerHTML)renderCalendar();
  if(b){
    const det=document.getElementById('cal-day-detail');
    if(det&&det.innerHTML)showCalDay(b.date);
  }
  showToast('Booking removed');
}
async function deleteHorse(id){if(!confirm('Remove this horse?'))return;try{await sb.from('horses').delete().eq('id',id);}catch(e){console.error('Delete horse:',e)}horses=horses.filter(h=>h.id!==id);renderHorses();renderDash();showToast('Horse removed');}
async function deleteRider(id){if(!confirm('Remove this rider?'))return;try{await sb.from('riders').delete().eq('id',id);}catch(e){console.error('Delete rider:',e)}riders=riders.filter(r=>r.id!==id);renderRiders();renderDash();showToast('Rider removed');populateLoginDropdowns();}
async function deleteOwner(id){if(!confirm('Remove this owner?'))return;try{await sb.from('owners').delete().eq('id',id);}catch(e){console.error('Delete owner:',e)}owners=owners.filter(o=>o.id!==id);renderOwners();renderDash();showToast('Owner removed');}
