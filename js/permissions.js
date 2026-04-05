/* ===========================================================
   [12] PERMISSIONS
   =========================================================== */
function canDeleteBooking(bookingId){
  // coerce to number for safe comparison
  const bid=parseInt(bookingId);
  const b=bookings.find(x=>parseInt(x.id)===bid);
  if(!b)return false;
  if(currentRole==='staff')return true;
  if(currentRole==='rider'){
    const me=riders.find(r=>r.first.toLowerCase()===currentUser.name.trim().toLowerCase());
    return me&&parseInt(b.rider_id)===parseInt(me.id);
  }
  if(currentRole==='parent'){
    const myChildren=riders.filter(r=>r.parents&&r.parents.split(',').map(p=>p.trim().toLowerCase()).includes(currentUser.name.trim().toLowerCase()));
    return myChildren.some(ch=>parseInt(ch.id)===parseInt(b.rider_id));
  }
  if(currentRole==='owner'){
    const nameLower=currentUser.name.trim().toLowerCase();
    // Horse owner: can delete bookings on their horses
    const me=owners.find(o=>o.first.toLowerCase()===nameLower||((o.first+' '+(o.last||'')).trim().toLowerCase()===nameLower));
    if(me){
      const myHorses=horses.filter(h=>parseInt(h.owner_id)===parseInt(me.id));
      if(myHorses.some(h=>parseInt(h.id)===parseInt(b.horse_id)))return true;
    }
    // Rider identity: can delete own bookings
    const meRider=riders.find(r=>r.first.toLowerCase()===nameLower||(r.first+' '+(r.last||'')).trim().toLowerCase()===nameLower);
    if(meRider&&parseInt(b.rider_id)===parseInt(meRider.id))return true;
    // Parent identity: can delete children's bookings
    const myChildren=riders.filter(r=>r.parents&&r.parents.split(',').map(p=>p.trim().toLowerCase()).includes(nameLower));
    return myChildren.some(ch=>parseInt(ch.id)===parseInt(b.rider_id));
  }
  return false;
}

async function deleteAnyBooking(id){
  if(!canDeleteBooking(id)){showToast('You cannot delete this booking');return;}
  if(!confirm('Cancel this booking?'))return;
  try{
    const{error}=await sb.from('bookings').delete().eq('id',id);
    if(error)throw error;
  }catch(e){console.error('Delete error:',e);showToast('Error deleting booking');return;}
  const deletedB=bookings.find(b=>b.id===id);
  bookings=bookings.filter(b=>b.id!==id);
  showToast('Booking cancelled');
  // Re-render calendar if visible
  const calDays=document.getElementById('cal-days');
  if(calDays&&calDays.innerHTML)renderCalendar();
  if(deletedB){const det=document.getElementById('cal-day-detail');if(det&&det.innerHTML)showCalDay(deletedB.date);}
  // Re-render whichever screen is active
  if(currentRole==='staff'){renderDash();renderBookings();}
  else if(currentRole==='rider'){renderRiderHome();}
  else if(currentRole==='owner'){renderOwnerHome();}
  else if(currentRole==='parent'){
    if(currentChildId){showChildSchedule(currentChildId,true);}
    else{renderParentHome();}
  }
}
