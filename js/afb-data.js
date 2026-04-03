/* ===========================================================
   [23] AWAY FROM BARN & HORSE NOT RIDEABLE — Data Layer
   =========================================================== */

// ── Global arrays (loaded alongside bookings, horses, riders) ──
let afbEntries=[];    // away_from_barn records
let hnrEntries=[];    // horse_unavailable records

// ── Load from Supabase ─────────────────────────────────────────

async function loadAfbEntries(){
  try{
    const{data,error}=await sb.from('away_from_barn').select('*').order('start_date',{ascending:true});
    if(!error&&data)afbEntries=data;
  }catch(e){console.error('Failed to load AFB entries',e);}
}

async function loadHnrEntries(){
  try{
    const{data,error}=await sb.from('horse_unavailable').select('*').order('start_date',{ascending:true});
    if(!error&&data)hnrEntries=data;
  }catch(e){console.error('Failed to load HNR entries',e);}
}

// ── CRUD — Away From Barn ──────────────────────────────────────

async function saveAfbEntry(entry){
  // entry: {rider_id, start_date, end_date, all_day, start_time, end_time, reason, show_id, created_by}
  const payload={
    rider_id:entry.rider_id,
    start_date:entry.start_date,
    end_date:entry.end_date||entry.start_date,
    all_day:entry.all_day!==false,
    start_time:entry.all_day!==false?null:entry.start_time,
    end_time:entry.all_day!==false?null:entry.end_time,
    reason:entry.reason||'',
    show_id:entry.show_id||null,
    created_by:entry.created_by||currentUser?.name||'Unknown'
  };
  try{
    const{data,error}=await sb.from('away_from_barn').insert(payload).select().single();
    if(!error&&data){afbEntries.push(data);return data;}
  }catch(e){}
  // Fallback for offline
  const local={...payload,id:Date.now(),created_at:new Date().toISOString()};
  afbEntries.push(local);
  return local;
}

async function updateAfbEntry(id, updates){
  // Ensure time fields are null when all_day
  if(updates.all_day){updates.start_time=null;updates.end_time=null;}
  try{
    await sb.from('away_from_barn').update(updates).eq('id',id);
  }catch(e){}
  afbEntries=afbEntries.map(a=>a.id===id?{...a,...updates}:a);
}

async function deleteAfbEntry(id){
  try{await sb.from('away_from_barn').delete().eq('id',id);}catch(e){}
  afbEntries=afbEntries.filter(a=>a.id!==id);
}

// ── CRUD — Horse Not Rideable ──────────────────────────────────

async function saveHnrEntry(entry){
  const payload={
    horse_id:entry.horse_id,
    start_date:entry.start_date,
    end_date:entry.end_date||entry.start_date,
    all_day:entry.all_day!==false,
    start_time:entry.all_day!==false?null:entry.start_time,
    end_time:entry.all_day!==false?null:entry.end_time,
    reason:entry.reason||'',
    created_by:entry.created_by||currentUser?.name||'Unknown'
  };
  try{
    const{data,error}=await sb.from('horse_unavailable').insert(payload).select().single();
    if(!error&&data){hnrEntries.push(data);return data;}
  }catch(e){}
  const local={...payload,id:Date.now(),created_at:new Date().toISOString()};
  hnrEntries.push(local);
  return local;
}

async function updateHnrEntry(id, updates){
  if(updates.all_day){updates.start_time=null;updates.end_time=null;}
  try{await sb.from('horse_unavailable').update(updates).eq('id',id);}catch(e){}
  hnrEntries=hnrEntries.map(h=>h.id===id?{...h,...updates}:h);
}

async function deleteHnrEntry(id){
  try{await sb.from('horse_unavailable').delete().eq('id',id);}catch(e){}
  hnrEntries=hnrEntries.filter(h=>h.id!==id);
}

// ── Query helpers ──────────────────────────────────────────────

/** Get all AFB entries that cover a specific date for a given rider */
function getAfbForRiderOnDate(riderId, dateStr){
  return afbEntries.filter(a=>
    parseInt(a.rider_id)===parseInt(riderId)&&
    a.start_date<=dateStr&&a.end_date>=dateStr
  );
}

/** Get all AFB entries for a rider that overlap any date in a range */
function getAfbForRiderInRange(riderId, startDate, endDate){
  return afbEntries.filter(a=>
    parseInt(a.rider_id)===parseInt(riderId)&&
    a.start_date<=endDate&&a.end_date>=startDate
  );
}

/** Get all HNR entries that cover a specific date for a given horse */
function getHnrForHorseOnDate(horseId, dateStr){
  return hnrEntries.filter(h=>
    parseInt(h.horse_id)===parseInt(horseId)&&
    h.start_date<=dateStr&&h.end_date>=dateStr
  );
}

/** Get all HNR entries for a horse that overlap any date in a range */
function getHnrForHorseInRange(horseId, startDate, endDate){
  return hnrEntries.filter(h=>
    parseInt(h.horse_id)===parseInt(horseId)&&
    h.start_date<=endDate&&h.end_date>=startDate
  );
}

/** Get all AFB entries active on a given date (any rider) */
function getAfbOnDate(dateStr){
  return afbEntries.filter(a=>a.start_date<=dateStr&&a.end_date>=dateStr);
}

/** Get all HNR entries active on a given date (any horse) */
function getHnrOnDate(dateStr){
  return hnrEntries.filter(h=>h.start_date<=dateStr&&h.end_date>=dateStr);
}

/** Check if a rider is away at a specific date+time */
function isRiderAway(riderId, dateStr, timeStr){
  const entries=getAfbForRiderOnDate(riderId, dateStr);
  if(entries.length===0)return{away:false};
  for(const a of entries){
    if(a.all_day)return{away:true,entry:a};
    // Partial day — check time overlap
    if(timeStr&&a.start_time&&a.end_time){
      if(timeStr>=a.start_time&&timeStr<a.end_time)return{away:true,entry:a};
    }
  }
  return{away:false};
}

/** Check if a horse is not rideable at a specific date+time */
function isHorseUnavailable(horseId, dateStr, timeStr){
  const entries=getHnrForHorseOnDate(horseId, dateStr);
  if(entries.length===0)return{unavailable:false};
  for(const h of entries){
    if(h.all_day)return{unavailable:true,entry:h};
    if(timeStr&&h.start_time&&h.end_time){
      if(timeStr>=h.start_time&&timeStr<h.end_time)return{unavailable:true,entry:h};
    }
  }
  return{unavailable:false};
}

// ── Booking conflict checker ───────────────────────────────────

/**
 * Check a proposed booking for AFB/HNR conflicts.
 * Returns {warnings:[], canProceed:boolean}
 */
function checkBookingConflicts(riderId, horseId, dateStr, timeStr){
  const warnings=[];
  let canProceed=true;

  // Check rider away
  if(riderId){
    const riderCheck=isRiderAway(riderId, dateStr, timeStr);
    if(riderCheck.away){
      const r=getRider(riderId);
      const a=riderCheck.entry;
      const rangeLabel=a.start_date===a.end_date
        ?friendlyDate(a.start_date)
        :`${friendlyDate(a.start_date)} – ${friendlyDate(a.end_date)}`;
      const timeLabel=a.all_day?'all day':`${a.start_time}–${a.end_time}`;
      warnings.push({
        type:'afb',
        message:`${r?r.first:'Rider'} is Away From Barn ${rangeLabel} (${timeLabel})${a.reason?' — '+a.reason:''}`,
        entry:a
      });
      // Riders/parents can't override, staff can
      if(currentRole!=='staff')canProceed=false;
    }
  }

  // Check horse unavailable
  if(horseId){
    const horseCheck=isHorseUnavailable(horseId, dateStr, timeStr);
    if(horseCheck.unavailable){
      const h=getHorse(horseId);
      const hn=horseCheck.entry;
      const rangeLabel=hn.start_date===hn.end_date
        ?friendlyDate(hn.start_date)
        :`${friendlyDate(hn.start_date)} – ${friendlyDate(hn.end_date)}`;
      const timeLabel=hn.all_day?'all day':`${hn.start_time}–${hn.end_time}`;
      warnings.push({
        type:'hnr',
        message:`${h?h.name:'Horse'} is Not Rideable ${rangeLabel} (${timeLabel})${hn.reason?' — '+hn.reason:''}`,
        entry:hn
      });
      if(currentRole!=='staff')canProceed=false;
    }
  }

  return{warnings,canProceed};
}

// ── Show integration ───────────────────────────────────────────

/**
 * Auto-create AFB entries when a rider is added to a show.
 * Call this after saving a show with rider_ids.
 */
async function syncShowAfb(show){
  if(!show||!show.id)return;
  const showRiderIds=(show.rider_ids||[]).map(Number);
  const showDate=show.date;
  // For single-day shows (current model). If show has end_date, use it.
  const showEndDate=show.end_date||showDate;

  // Find existing auto-created AFBs for this show
  const existingAfbs=afbEntries.filter(a=>parseInt(a.show_id)===parseInt(show.id));
  const existingRiderIds=existingAfbs.map(a=>parseInt(a.rider_id));

  // Add AFB for new riders
  for(const rid of showRiderIds){
    if(!existingRiderIds.includes(rid)){
      const r=getRider(rid);
      await saveAfbEntry({
        rider_id:rid,
        start_date:showDate,
        end_date:showEndDate,
        all_day:true,
        reason:`Show: ${show.name}`,
        show_id:show.id,
        created_by:currentUser?.name||'Staff'
      });
    }
  }

  // Remove AFB for riders no longer in the show
  for(const afb of existingAfbs){
    const rid=parseInt(afb.rider_id);
    if(!showRiderIds.includes(rid)){
      // Check if user modified the auto-AFB
      const wasModified=!afb.all_day||afb.start_date!==showDate||afb.end_date!==showEndDate;
      if(wasModified){
        if(confirm(`Away From Barn for ${getRider(rid)?.first||'rider'} was modified. Delete anyway?`)){
          await deleteAfbEntry(afb.id);
        }
      } else {
        await deleteAfbEntry(afb.id);
      }
    }
  }
}

// ── Existing bookings warning ──────────────────────────────────

/**
 * Check if there are existing bookings that conflict with a new AFB/HNR range.
 * Returns array of conflicting bookings.
 */
function findConflictingBookings_AFB(riderId, startDate, endDate){
  return bookings.filter(b=>
    parseInt(b.rider_id)===parseInt(riderId)&&
    b.date>=startDate&&b.date<=endDate&&
    isFutureBooking(b)
  );
}

function findConflictingBookings_HNR(horseId, startDate, endDate){
  return bookings.filter(b=>
    parseInt(b.horse_id)===parseInt(horseId)&&
    b.date>=startDate&&b.date<=endDate&&
    isFutureBooking(b)
  );
}

// ── Date range helper ──────────────────────────────────────────

/** Get number of days in a range (inclusive) */
function rangeDayCount(startDate, endDate){
  const s=new Date(startDate+'T12:00:00');
  const e=new Date(endDate+'T12:00:00');
  return Math.round((e-s)/(1000*60*60*24))+1;
}

/** Format a date range for display */
function fmtDateRange(startDate, endDate){
  if(startDate===endDate)return friendlyDate(startDate);
  return `${friendlyDate(startDate)} – ${friendlyDate(endDate)}`;
}
