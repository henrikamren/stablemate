/* ===========================================================
   [7] DATA LAYER
   =========================================================== */
async function loadAll(){
  try{
    const[ob,hb,rb,bb,sc,sh,lr]=await Promise.all([
      sb.from('owners').select('*').order('first'),
      sb.from('horses').select('*').order('name'),
      sb.from('riders').select('*').order('first'),
      sb.from('bookings').select('*').order('date').order('time'),
      sb.from('trainer_schedules').select('*'),
      sb.from('shows').select('*').order('date'),
      sb.from('lunge_requests').select('*').order('created_at',{ascending:false}),
    ]);
    if(ob.error)throw ob.error;
    if(hb.error)throw hb.error;
    if(rb.error)throw rb.error;
    if(bb.error)throw bb.error;
    if(sc.error)throw sc.error;
    if(sh.error)throw sh.error;
    if(lr.error)throw lr.error;

    owners=ob.data||[];
    horses=(hb.data||[]).map(h=>({...h,services:h.services||{}}));
    riders=rb.data||[];
    bookings=bb.data||[];
    schedules=sc.data||[];
    shows=sh.data||[];
    lungeRequests=lr.data||[];

    // Load Away From Barn and Horse Not Rideable entries
    if(typeof loadAfbEntries==='function')await loadAfbEntries();
    if(typeof loadHnrEntries==='function')await loadHnrEntries();

    // Mirror onto globalThis for test introspection and console access
    globalThis.owners=owners;
    globalThis.horses=horses;
    globalThis.riders=riders;
    globalThis.bookings=bookings;
    globalThis.schedules=schedules;
    globalThis.shows=shows;
    globalThis.lungeRequests=lungeRequests;
    globalThis.afbEntries=typeof afbEntries!=='undefined'?afbEntries:[];
    globalThis.hnrEntries=typeof hnrEntries!=='undefined'?hnrEntries:[];
    globalThis.appReady=true;
  }catch(e){
    console.error('Load error:',e);
    globalThis.appReady=false;
    globalThis.loadError=String(e?.message||e);
    showToast('Connection error');
  }
}
