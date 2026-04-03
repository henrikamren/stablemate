/* ===========================================================
   [22] SHEETS, FORMS & TIME SELECTS
   =========================================================== */
function getDefaultTimeForDate(dateStr){
  if(!dateStr)return'09:00';
  const dayTrainers=getTrainersForDate(dateStr);
  if(dayTrainers.length>0){
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
  const label=friendlyDateLong(dateStr);
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

  html+=buildTrainerDetail(dateStr);

  if(dayB.length===0){
    html+=`<div style="font-size:13px;color:var(--text-muted);text-align:center;padding:12px">No bookings this day</div>`;
  } else {
    dayB.forEach(b=>{
      const isOwn=currentRole==='staff'||(currentRole==='rider'&&meId&&parseInt(b.rider_id)===meId)||(currentRole==='parent'&&myChildIds.includes(parseInt(b.rider_id)));
      html+=buildBookingRow(b,{
        showActions:isOwn,
        actionEdit:`editBookingFromRider(${b.id})`,
        actionDel:`deleteFromWeekDay(${b.id},'${dateStr}')`
      });
    });
  }

  let container=document.getElementById('week-day-detail');
  if(!container){
    container=document.createElement('div');
    container.id='week-day-detail';
    container.style.cssText='background:var(--cream-dark);border-radius:10px;border:1px solid var(--sand);padding:14px 16px;margin-bottom:16px';
    const contentEl=currentRole==='rider'?document.getElementById('rider-content')
      :currentRole==='parent'?document.getElementById('parent-content')
      :document.getElementById('panel-home');
    if(contentEl){
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
  if(currentRole==='staff'){
    openSheet('booking');
    const bd=document.getElementById('b-date');
    if(bd){
      bd.value=dateStr;
      populateTimeSelect('b-time',getDefaultTimeForDate(dateStr));
      checkTrainer();
    }
  } else {
    openSheet('rider-booking');
    const bd=document.getElementById('rb-date');
    if(bd){
      bd.value=dateStr;
      populateTimeSelect('rb-time',getDefaultTimeForDate(dateStr));
      checkRiderTrainer();
    }
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
    const childGroup=document.getElementById('rb-child-group');
    const childSel=document.getElementById('rb-child');
    const titleEl=document.getElementById('rb-sheet-title');
    if(currentRole==='parent'){
      const myChildren=riders.filter(r=>r.parents&&r.parents.split(',').map(p=>p.trim().toLowerCase()).includes(currentUser.name.trim().toLowerCase()));
      if(childSel){
        childSel.innerHTML='<option value="">— Select child —</option>'+myChildren.map(r=>`<option value="${r.id}">${r.first}</option>`).join('');
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
      const nameLower=(currentUser?.name||'').trim().toLowerCase();
      const me=riders.find(r=>r.first.toLowerCase()===nameLower);
      let availableHorses=horses;
      if(me&&me.approved_horses&&me.approved_horses.length>0){
        availableHorses=horses.filter(h=>
          h.access==='barn'||
          (me.approved_horses&&me.approved_horses.map(Number).includes(parseInt(h.id)))
        );
      }
      availableHorses=availableHorses.filter(h=>h.access!=='owner-only');
      if(availableHorses.length===0){
        rh.innerHTML='<option value="">— No horses available —</option>';
      } else {
        rh.innerHTML='<option value="">— Trainer will assign —</option>'+availableHorses.map(h=>`<option value="${h.id}">${h.name}</option>`).join('');
      }
    }
    const warn=document.getElementById('rb-trainer-warning');if(warn)warn.className='trainer-warning';
    const ru=document.getElementById('rb-recur-until');
    if(ru){const d3m=addDays(today,90);ru.value=fmtDate(d3m);}
    const recurSel=document.getElementById('rb-recur');
    if(recurSel){recurSel.value='none';document.getElementById('rb-recur-until-group').style.display='none';}
  }
  if(name==='horse'){populateOwnerSelect('h-owner');}
  if(name==='rider-form'){
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
