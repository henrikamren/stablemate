/* ===========================================================
   [9] UI BUILDERS — Calendars
   =========================================================== */
function buildWeekCalendar(highlightRiderIds, weekOffset){
  if(typeof weekOffset==='undefined')weekOffset=currentWeekOffset||0;
  const todayStr=fmtDate(today);
  const days7=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const startDate=addDays(today,weekOffset*7);

  // Build legend for highlighted riders
  let legendHtml='';
  if(highlightRiderIds.length>0){
    legendHtml='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">';
    highlightRiderIds.forEach(rid=>{
      const r=getRider(rid);if(!r)return;
      const color=getRiderColor(rid);
      legendHtml+=`<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-muted)">
        <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>${r.first}
      </div>`;
    });
    legendHtml+='</div>';
  }

  // Nav arrows
  const rangeStart=addDays(today,weekOffset*7);
  const rangeEnd=addDays(today,weekOffset*7+6);
  const rangeLabel=rangeStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' - '+rangeEnd.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  let navHtml=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
    <button onclick="changeWeekOffset(-1)" style="background:none;border:1px solid var(--sand);border-radius:6px;width:28px;height:28px;cursor:pointer;color:var(--text-muted);font-size:14px;display:flex;align-items:center;justify-content:center">${weekOffset>0?'<':'<'}</button>
    <div style="font-size:12px;color:var(--text-muted)">${rangeLabel}</div>
    <button onclick="changeWeekOffset(1)" style="background:none;border:1px solid var(--sand);border-radius:6px;width:28px;height:28px;cursor:pointer;color:var(--text-muted);font-size:14px;display:flex;align-items:center;justify-content:center">></button>
  </div>`;

  let html=navHtml+legendHtml+'<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">';

  for(let i=0;i<7;i++){
    const d=addDays(startDate,i);
    const ds=fmtDate(d);
    const isToday=ds===todayStr;
    const dayTrainers=getTrainersForDate(ds);
    const hasTrainer=dayTrainers.length>0;
    const trainerNames=[...new Set(dayTrainers.map(s=>s.trainer_name))];
    const myBookings=bookings.filter(b=>b.date===ds&&highlightRiderIds.includes(parseInt(b.rider_id)));
    const allBookings=bookings.filter(b=>b.date===ds);
    const trainerColor=hasTrainer?(TRAINER_COLORS[trainerNames[0]]||TRAINER_COLORS.default):'transparent';

    html+=`<div style="background:var(--white);border-radius:8px;border:1px solid ${isToday?'var(--earth)':'var(--sand)'};overflow:hidden;${isToday?'box-shadow:0 0 0 2px var(--earth)':''}cursor:pointer" onclick="showWeekDayDetail('${ds}')">
      <div style="height:4px;background:${trainerColor};opacity:${hasTrainer?0.85:0}"></div>
      <div style="padding:4px 4px 2px;text-align:center">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.06em;color:${isToday?'var(--earth)':'var(--text-muted)'};font-weight:${isToday?'500':'400'}">${days7[d.getDay()]}</div>
        <div style="font-size:13px;font-weight:${isToday?'600':'500'};width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:50%;margin:1px auto;${isToday?'background:var(--earth);color:var(--white)':'color:var(--text-muted)'}">${d.getDate()}</div>
      </div>
      <div style="padding:2px 4px 5px;display:flex;flex-direction:column;gap:2px;min-height:24px">
        ${myBookings.map(b=>{
          const rColor=getRiderColor(b.rider_id);
          const r=getRider(b.rider_id);
          const h=getHorse(b.horse_id);
          return`<div style="background:${rColor};border-radius:3px;padding:2px 3px;font-size:9px;color:white;line-height:1.3">
            <div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r?r.first:b.time}</div>
            ${h?`<div style="opacity:0.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h.name}</div>`:''}
          </div>`;
        }).join('')}
        ${allBookings.length>0&&myBookings.length===0?`<div style="width:6px;height:6px;border-radius:50%;background:var(--sand);margin:2px auto"></div>`:''}
      </div>
      ${hasTrainer?`<div style="padding:0 3px 4px;text-align:center"><div style="font-size:8px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${trainerNames.join('/')}</div></div>`:''}
    </div>`;
  }
  html+='</div>';
  return html;
}

function changeWeekOffset(dir){
  currentWeekOffset+=dir;
  if(currentWeekOffset<0)currentWeekOffset=0;
  // Re-render the current view
  if(currentRole==='rider')renderRiderHome();
  else if(currentRole==='parent')renderParentHome();
  else if(currentRole==='staff'){renderDash();}
}

// -- RIDER DAY VIEW CALENDAR --
function buildDayCalendar(dateStr, myBookingIds){
  const SLOT_H=48; // px per hour
  const START_H=7, END_H=18;
  const totalH=END_H-START_H;
  const dayTrainers=getTrainersForDate(dateStr);
  const dayBookings=bookings.filter(b=>b.date===dateStr).sort((a,b)=>a.time.localeCompare(b.time));

  let rows='';
  for(let h=START_H;h<=END_H;h++){
    const label=h===0?'12am':h<12?h+'am':h===12?'12pm':(h-12)+'pm';
    rows+=`<div style="display:flex;align-items:flex-start;min-height:${SLOT_H}px;border-top:1px solid var(--cream-dark);position:relative">
      <div style="width:44px;font-size:10px;color:var(--text-muted);padding-top:3px;flex-shrink:0">${label}</div>
      <div style="flex:1;position:relative;min-height:${SLOT_H}px" id="cal-slot-${h}"></div>
    </div>`;
  }

  // Build trainer band behind slots
  let trainerBg='';
  dayTrainers.forEach(s=>{
    const sh=parseInt(s.start_time.split(':')[0]);
    const sm=parseInt(s.start_time.split(':')[1]);
    const eh=parseInt(s.end_time.split(':')[0]);
    const em=parseInt(s.end_time.split(':')[1]);
    const top=((sh-START_H)+(sm/60))*SLOT_H;
    const height=((eh-sh)+((em-sm)/60))*SLOT_H;
    if(top>=0&&height>0){
      trainerBg+=`<div style="position:absolute;left:44px;right:0;top:${top}px;height:${height}px;background:${TRAINER_COLORS[s.trainer_name]||TRAINER_COLORS.default};opacity:0.08;pointer-events:none;z-index:0"></div>`;
    }
  });

  // Build booking blocks
  let bookingBlocks='';
  dayBookings.forEach(b=>{
    const [bh,bm]=b.time.split(':').map(Number);
    const top=((bh-START_H)+(bm/60))*SLOT_H;
    const height=((b.duration||60)/60)*SLOT_H;
    if(top<0||top>(totalH*SLOT_H))return;
    const h=getHorse(b.horse_id);const r=getRider(b.rider_id);const t=typeConfig[b.type]||{dot:'#888',label:b.type};
    const isMe=myBookingIds.includes(b.id);
    const canAct=currentRole==='staff'||isMe;
    const bg=isMe?t.dot:'var(--sand)';
    const textColor=isMe?'white':'var(--text-muted)';
    bookingBlocks+=`<div onclick="${canAct?`showBookingPopup(${b.id},event)`:''}" style="position:absolute;left:44px;right:4px;top:${top}px;height:${Math.max(height-2,20)}px;background:${bg};border-radius:6px;padding:3px 6px;overflow:hidden;z-index:1;display:flex;align-items:flex-start;justify-content:space-between;${canAct?'cursor:pointer':''}">
      <div style="min-width:0;overflow:hidden">
        <div style="font-size:11px;font-weight:500;color:${textColor};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h?h.name:(r?r.first:'Booking')}</div>
        ${height>30?`<div style="font-size:10px;color:${textColor};opacity:0.85">${t.label}${r?' · '+r.first:''}</div>`:''}
      </div>
    </div>`;
  });

  return `<div style="position:relative;overflow:hidden">
    ${trainerBg}
    ${rows}
    ${bookingBlocks}
  </div>`;
}

function showBookingPopup(bookingId, event){
  event.stopPropagation();
  // Remove any existing popup
  dismissBookingPopup();
  const b=bookings.find(x=>x.id===bookingId);
  if(!b)return;
  const h=getHorse(b.horse_id);const r=getRider(b.rider_id);const t=typeConfig[b.type]||{label:b.type};
  const todayStr=fmtDate(today);
  const nowTime=String(today.getHours()).padStart(2,'0')+':'+String(today.getMinutes()).padStart(2,'0');
  const passed=b.date<todayStr||(b.date===todayStr&&bookingEndTime(b)<=nowTime);
  const dl=b.date===todayStr?'Today':new Date(b.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});

  const popup=document.createElement('div');
  popup.id='booking-popup';
  popup.style.cssText='position:fixed;inset:0;z-index:150;display:flex;align-items:center;justify-content:center;background:rgba(20,8,4,0.4)';
  popup.onclick=function(e){if(e.target===popup)dismissBookingPopup();};
  popup.innerHTML=`<div style="background:var(--white);border-radius:14px;padding:20px;width:calc(100% - 48px);max-width:340px;box-shadow:0 8px 30px rgba(0,0,0,0.15)">
    <div style="font-family:'Cormorant Garamond',serif;font-size:20px;color:var(--earth);margin-bottom:12px">${h?h.name:'Booking'}</div>
    <div style="font-size:13px;color:var(--text);margin-bottom:4px">${dl} at ${b.time} · ${fmtDur(b.duration)}</div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">${t.label} · ${arenaLabel(b.arena)}</div>
    ${r?`<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Rider: ${r.first}</div>`:''}
    ${b.notes?`<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Notes: ${b.notes}</div>`:''}
    ${passed?'<div style="font-size:12px;color:var(--text-muted);font-style:italic;margin-bottom:12px">This session has ended</div>':''}
    <div style="display:flex;gap:8px;margin-top:14px">
      ${!passed?`<button class="btn btn-secondary" style="flex:1;font-size:13px;padding:12px" onclick="dismissBookingPopup();editBookingFromRider(${b.id})">Edit</button>`:''}
      ${!passed?`<button class="btn-danger-sm" style="flex:1;font-size:13px;padding:12px;border-radius:8px" onclick="dismissBookingPopup();deleteAnyBooking(${b.id})">Cancel</button>`:''}
      <button class="btn btn-secondary" style="${passed?'flex:1;':''}font-size:13px;padding:12px" onclick="dismissBookingPopup()">Close</button>
    </div>
  </div>`;
  document.body.appendChild(popup);
}

function dismissBookingPopup(){
  const el=document.getElementById('booking-popup');
  if(el)el.remove();
}
