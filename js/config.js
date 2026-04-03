/* ===========================================================
   [1] CONFIGURATION
   =========================================================== */
const BARN_NAME='Oasis Farm';
const SUPABASE_URL='https://rdyktbwkrcepojkiunwb.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkeWt0YndrcmNlcG9qa2l1bndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NDk4NzgsImV4cCI6MjA5MDIyNTg3OH0.fkttT72Y9LzwcTPhgu3jZ6nD9dL5Jqc0KOhn9sgU44g';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

const ARENAS=[
  {value:'covered',label:'Covered Arena',default:true},
  {value:'lunging',label:'Lunging Arena',default:false},
];


/* ===========================================================
   [2] APPLICATION STATE
   =========================================================== */
const today=new Date();
let calMonth=today.getMonth(),calYear=today.getFullYear();
let horses=[],owners=[],riders=[],bookings=[],schedules=[],shows=[],lungeRequests=[];
let currentUser=null,currentRole='rider';
let currentChildId=null;
let currentWeekOffset=0;

// Trainer colors for calendar bands
const TRAINER_COLORS={
  'Colin':'#2d6a4f',
  'Janeen':'#0c447c',
  'default':'#8b6914'
};

// Rider colors for week calendar
const RIDER_PALETTE=['#c0392b','#8e44ad','#2980b9','#16a085','#d35400','#27ae60','#2c3e50','#f39c12'];
function getRiderColor(riderId){
  const idx=riders.findIndex(r=>parseInt(r.id)===parseInt(riderId));
  return RIDER_PALETTE[idx>=0?idx%RIDER_PALETTE.length:0];
}

const typeConfig={
  'lesson':{label:'Riding Lesson',cls:'ev-lesson',dot:'#3b6d11',supervised:true},
  'arena-supervised':{label:'Arena - Supervised',cls:'ev-arena',dot:'#6b4c35',supervised:true},
  'arena-independent':{label:'Arena - Independent',cls:'ev-arena',dot:'#8b6914',supervised:false},
  'vet':{label:'Vet Appointment',cls:'ev-vet',dot:'#8b2020',supervised:false},
  'farrier':{label:'Farrier',cls:'ev-farrier',dot:'#0c447c',supervised:false},
  'competition':{label:'Competition',cls:'ev-competition',dot:'#633806',supervised:false},
  'lunge':{label:'Lunging',cls:'ev-lunge',dot:'#5b2d8e',supervised:false},
  'turnout':{label:'Turnout',cls:'ev-turnout',dot:'#1a5c35',supervised:false},
  'walker':{label:'Walker',cls:'ev-walker',dot:'#8c4a00',supervised:false},
};

