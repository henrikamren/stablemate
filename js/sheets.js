/* ===========================================================
   [22] SHEETS, FORMS & TIME SELECTS
   =========================================================== */
function getDefaultTimeForDate(dateStr){
  // Returns trainer start time if trainer is scheduled that day, else 09:00
  if(!dateStr)return'09:00';
  const dayTrainers=getTrainersForDate(dateStr);
  if(dayTrainers.length>0){
    // Pick the earliest trainer start time
    const times=dayTrainers.map(s=>s.start_time).sort();
    return times[0];
  }
  return'09:00';
}

function populateTimeSelect(id,def='09:00'){
  const sel=document.getElementById(id);if(!sel)return;sel.innerHTML='';
  for(let h=6;h<=21;h++)for(let m=0;m<60;m+=15){
    const v=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    const o=document.createElement('option');o.value=v;o.textContent=v;if(v===def)o.selected=true;sel.appendChild(o);
  }
}

// -- WEEK CALENDAR DAY DETAIL --
function showWeekDayDetail(dateStr){
  const dayB=bookings.filter(b=>b.date===dateStr&&isFutureBooking(b)).sort((a,b)=>a.time.localeCompare(b.time));
  const label=new Date(dateStr+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  const dayTrainers=getTrainersForDate(dateStr);
  const todayStr=fmtDate(today);
  const nowTime=String(today.getHours()).padStart(2,'0')+':'+String(today.getMinutes()).padStart(2,'0');
  const nameLower=(currentUser?.name||'').trim().toLowerCase();
  const me=riders.find(r=>r.first.toLowerCase()===nameLower);
  const myChildren=currentRole==='parent'?riders.filter(r=>r.parents&&r.parents.split(',').map(p=>p.trim().toLowerCase()).includes(nameLower)):[];
  const myChildIds=myChildren.map(c=>parseInt(c.id));
  const meId=me?parseInt(me.id):null;

  let html=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
    <div style="font-size:13px;font-weight:500;color:var(--earth)">${label}</div>
    <div style="display:flex;gap:6px">
      <button class="btn btn-secondary btn-sm" onclick="bookFromWeekCal('${dateStr}')">+ Book</button>
      <button class="btn btn-secondary btn-sm" onclick="closeWeekDayDetail()">Close</button>
    </div>
  </div>`;

  if(dayTrainers.length>0){
    html+=`<div style="margin-bottom:10px">${dayTrainers.map(s=>`<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);margin-bottom:3px">
      <div style="width:8px;height:8px;border-radius:50%;background:${TRAINER_COLORS[s.trainer_name]||TRAINER_COLORS.default}"></div>
      ${s.trainer_name} -- ${s.start_time}--${s.end_time}
    </div>`).join('')}</div>`;
  } else {
    html+=`<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">No trainer scheduled</div>`;
  }

  if(dayB.length===0){
    html+=`<div style="font-size:13px;color:var(--text-muted);text-align:center;padding:12px">No bookings this day</div>`;
  } else {
    dayB.forEach(b=>{
      const h=getHorse(b.horse_id);const r=getRider(b.rider_id);const t=typeConfig[b.type]||{label:b.type,dot:'#888',cls:'ev-arena'};
      const passed=b.date<todayStr||(b.date===todayStr&&bookingEndTime(b)<=nowTime);
      const isOwn=currentRole==='staff'||(currentRole==='rider'&&meId&&parseInt(b.rider_id)===meId)||(currentRole==='parent'&&myChildIds.includes(parseInt(b.rider_id)));
      html+=`<div class="booking-row" style="${passed?'opacity:0.5':''}">
        <div class="booking-left">
          <div class="booking-horse" style="${passed?'text-decoration:line-through':''}">${h?h.name:'Unknown'}${r?' -- '+r.first:''}</div>
          <div class="booking-meta" style="${passed?'text-decoration:line-through':''}">${b.time} -- ${t.label} -- ${fmtDur(b.duration)} -- ${arenaLabel(b.arena)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <span class="ev-badge ${t.cls}">${t.label}</span>
          ${isOwn&&!passed?`<div style="display:flex;gap:4px">
            <button class="btn btn-secondary btn-sm" style="font-size:10px;padding:5px 8px" onclick="editBookingFromRider(${b.id})">Edit</button>
            <button class="btn-danger-sm" style="font-size:10px;padding:5px 8px" onclick="deleteFromWeekDay(${b.id},'${dateStr}')">Cancel</button>
          </div>`:''}
        </div>
      </div>`;
    });
  }

  // Insert into the appropriate content area
  let container=document.getElementById('week-day-detail');
  if(!container){
    container=document.createElement('div');
    container.id='week-day-detail';
    container.style.cssText='background:var(--cream-dark);border-radius:10px;border:1px solid var(--sand);padding:14px 16px;margin-bottom:16px';
    // Find the week calendar container and insert after it
    const contentEl=currentRole==='rider'?document.getElementById('rider-content')
      :currentRole==='parent'?document.getElementById('parent-content')
      :document.getElementById('panel-home');
    if(contentEl){
      // Try to find existing detail, or append
      const existing=contentEl.querySelector('#week-day-detail');
      if(existing){existing.innerHTML=html;return;}
      contentEl.appendChild(container);
    }
  }
  container.innerHTML=html;
  container.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function closeWeekDayDetail(){
  const el=document.getElementById('week-day-detail');
  if(el)el.remove();
}

async function deleteFromWeekDay(id, dateStr){
  if(!canDeleteBooking(id)){showToast('You cannot cancel this booking');return;}
  if(!confirm('Cancel this booking?'))return;
  try{await sb.from('bookings').delete().eq('id',id);}catch(e){}
  bookings=bookings.filter(b=>b.id!==id);
  showWeekDayDetail(dateStr);
  if(currentRole==='staff'){renderDash();renderBookings();}
  else if(currentRole==='rider'){renderRiderHome();}
  else if(currentRole==='parent'){renderParentHome();}
  showToast('Booking cancelled');
}

// -- BOOK FROM WEEK CALENDAR --
function bookFromWeekCal(dateStr){
  // Open the appropriate booking sheet for the current role
  if(currentRole==='staff'){
    openSheet('booking');
    const bd=document.getElementById('b-date');
    if(bd){
      bd.value=dateStr;
      populateTimeSelect('b-time',getDefaultTimeForDate(dateStr));
      checkTrainer();
    }
  } else {
    // rider or parent
    openSheet('rider-booking');
    const bd=document.getElementById('rb-date');
    if(bd){
      bd.value=dateStr;
      populateTimeSelect('rb-time',getDefaultTimeForDate(dateStr));
      checkRiderTrainer();
    }
    // If parent, set currentChildId if viewing a specific child
    // (currentChildId already set if coming from child schedule)
  }
}

// -- SHEETS --
function openSheet(name){
  if(name==='booking'){
    populateHorseSelect();populateRiderSelect();
    const bd=document.getElementById('b-date');if(bd)bd.value=fmtDate(today);
    populateTimeSelect('b-time',getDefaultTimeForDate(fmtDate(today)));
    const warn=document.getElementById('trainer-warning');if(warn)warn.className='trainer-warning';
    const saveBtn=document.getElementById('b-save-btn');if(saveBtn){saveBtn.style.opacity='1';saveBtn.style.filter='';}
    // Update time when date changes
    const dateEl=document.getElementById('b-date');
    if(dateEl){
      dateEl.onchange=function(){
        populateTimeSelect('b-time',getDefaultTimeForDate(this.value));
        checkTrainer();
      };
    }
  }
  if(name==='rider-booking'){
    const bd=document.getElementById('rb-date');if(bd)bd.value=fmtDate(today);
    populateTimeSelect('rb-time',getDefaultTimeForDate(fmtDate(today)));
    const rdateEl=document.getElementById('rb-date');
    if(rdateEl){
      rdateEl.onchange=function(){
        populateTimeSelect('rb-time',getDefaultTimeForDate(this.value));
        checkRiderTrainer();
      };
    }
    // Show child selector for parents, hide for riders
    const childGroup=document.getElementById('rb-child-group');
    const childSel=document.getElementById('rb-child');
    const titleEl=document.getElementById('rb-sheet-title');
    if(currentRole==='parent'){
      const myChildren=riders.filter(r=>r.parents&&r.parents.split(',').map(p=>p.trim().toLowerCase()).includes(currentUser.name.trim().toLowerCase()));
      if(childSel){
        childSel.innerHTML='<option value="">— Select child —</option>'+myChildren.map(r=>`<option value="${r.id}">${r.first}</option>`).join('');
        // Pre-select if currentChildId is set
        if(currentChildId)childSel.value=currentChildId;
      }
      if(childGroup)childGroup.style.display='block';
      if(titleEl)titleEl.textContent='Book a Visit';
    } else {
      if(childGroup)childGroup.style.display='none';
      if(titleEl)titleEl.textContent='Book a Visit';
    }
    const rh=document.getElementById('rb-horse');
    if(rh){
      // Find the current rider's approved horses
      const nameLower=(currentUser?.name||'').trim().toLowerCase();
      const me=riders.find(r=>r.first.toLowerCase()===nameLower);
      // Show all barn horses + horses approved for this rider
      // If no rider profile found, show all horses
      let availableHorses=horses;
      if(me&&me.approved_horses&&me.approved_horses.length>0){
        availableHorses=horses.filter(h=>
          h.access==='barn'||
          (me.approved_horses&&me.approved_horses.map(Number).includes(parseInt(h.id)))
        );
      }
      // Also exclude owner-only horses unless this rider is the owner
      availableHorses=availableHorses.filter(h=>h.access!=='owner-only');
      if(availableHorses.length===0){
        rh.innerHTML='<option value="">— No horses available —</option>';
      } else {
        rh.innerHTML='<option value="">— Trainer will assign —</option>'+availableHorses.map(h=>`<option value="${h.id}">${h.name}</option>`).join('');
      }
    }
    const warn=document.getElementById('rb-trainer-warning');if(warn)warn.className='trainer-warning';
    // Set default recur-until to 3 months from now
    const ru=document.getElementById('rb-recur-until');
    if(ru){const d3m=addDays(today,90);ru.value=fmtDate(d3m);}
    // Reset recur select
    const recurSel=document.getElementById('rb-recur');
    if(recurSel){recurSel.value='none';document.getElementById('rb-recur-until-group').style.display='none';}
  }
  if(name==='horse'){populateOwnerSelect('h-owner');}
  if(name==='rider-form'){
    // Populate horse select for new rider (edit mode populates separately)
    const sheetEl=document.getElementById('sheet-rider-form');
    if(!sheetEl?.dataset.editId){
      populateRiderHorseSelect([]);
      document.getElementById('rider-form-title').textContent='Add Rider';
      document.getElementById('rider-form-save-btn').textContent='Add Rider';
    }
  }
  document.getElementById('sheet-'+name).classList.add('open');
}
function closeSheet(name){document.getElementById('sheet-'+name).classList.remove('open');}
document.querySelectorAll('.sheet-overlay').forEach(s=>{s.addEventListener('click',e=>{if(e.target===s)s.classList.remove('open');});});
