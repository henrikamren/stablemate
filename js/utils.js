/* ===========================================================
   [3] UTILITIES
   =========================================================== */
const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function fmtDate(d){return d.toISOString().split('T')[0]}
function addDays(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r}
function getHorse(id){return horses.find(h=>h.id===id)}
function getOwner(id){return owners.find(o=>o.id===id)}
function getRider(id){return riders.find(r=>r.id===id)}
function bookingEndTime(b){
  // Returns end time as HH:MM string
  const[h,m]=b.time.split(':').map(Number);
  const dur=parseInt(b.duration)||60;
  const endMins=h*60+m+dur;
  return String(Math.floor(endMins/60)%24).padStart(2,'0')+':'+String(endMins%60).padStart(2,'0');
}
function fmtDur(min){if(!min)return'';if(min<60)return min+'min';const h=Math.floor(min/60),m=min%60;return m?h+'h '+m+'min':h+'h'}
function isFutureBooking(b){
  const todayStr=fmtDate(today);
  if(b.date>todayStr)return true;
  if(b.date<todayStr)return false;
  const now=String(today.getHours()).padStart(2,'0')+':'+String(today.getMinutes()).padStart(2,'0');
  return bookingEndTime(b)>now;
}
function initials(name){return(name||'?').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();}
function arenaLabel(val){const a=ARENAS.find(x=>x.value===val);return a?a.label:val||'Covered Arena';}

/* ===========================================================
   [4] TRAINER HELPERS
   =========================================================== */
function getTrainersForDate(dateStr){
  if(!dateStr)return[];
  const dayName=days[new Date(dateStr+'T12:00:00').getDay()];
  return schedules.filter(s=>s.day_of_week===dayName);
}
function isTrainerAvailable(dateStr,timeStr){
  if(!dateStr||!timeStr)return{available:false,trainers:[]};
  const dayName=days[new Date(dateStr+'T12:00:00').getDay()];
  const av=schedules.filter(s=>s.day_of_week===dayName&&timeStr>=s.start_time&&timeStr<s.end_time);
  return{available:av.length>0,trainers:[...new Set(av.map(s=>s.trainer_name))]};
}
function getUniqueTrainers(){return[...new Set(schedules.map(s=>s.trainer_name))];}
