/* ===========================================================
   [5] SCREEN & NAVIGATION
   =========================================================== */
function showScreen(name){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+name).classList.add('active');
  document.getElementById('loading-screen').classList.add('hidden');
}

/* ===========================================================
   [6] AUTHENTICATION
   =========================================================== */
function initAuth(){
  const saved=localStorage.getItem('sm_session');
  // Always preload data immediately so dropdowns are ready
  loadAll().then(()=>{
    if(saved){
      try{
        const s=JSON.parse(saved);
        currentUser=s.user;currentRole=s.role;
        launchApp();
      }catch(e){showScreen('splash');}
    } else {
      showScreen('splash');
    }
    document.getElementById('loading-screen').classList.add('hidden');
  });
}

function launchApp(){
  if(currentRole==='staff'){setupStaffUI();showScreen('app');}
  else if(currentRole==='rider'){setupRiderUI();showScreen('rider-app');}
  else if(currentRole==='parent'){setupParentUI();showScreen('parent-app');}
  else if(currentRole==='owner'){setupOwnerUI();showScreen('owner-app');}
}

function saveSession(){localStorage.setItem('sm_session',JSON.stringify({user:currentUser,role:currentRole}));}

function enterRider(){
  const sel=document.getElementById('rider-select').value;
  const typed=document.getElementById('rider-name-input').value.trim();
  const name=typed||sel;
  if(!name){showToast('Please select or enter your name');return;}
  currentUser={name};currentRole='rider';saveSession();
  if(riders.length===0){
    loadAll().then(()=>{setupRiderUI();showScreen('rider-app');});
  } else {
    setupRiderUI();showScreen('rider-app');
  }
}
function enterParent(){
  const sel=document.getElementById('parent-select').value;
  const typed=document.getElementById('parent-name-input').value.trim();
  const name=typed||sel;
  if(!name){showToast('Please select or enter your name');return;}
  currentUser={name};currentRole='parent';saveSession();
  if(riders.length===0){
    loadAll().then(()=>{setupParentUI();showScreen('parent-app');});
  } else {
    setupParentUI();showScreen('parent-app');
  }
}
function enterStaff(){
  const sel=document.getElementById('staff-select').value;
  const typed=document.getElementById('staff-name-input').value.trim();
  const name=typed||sel;
  if(!name){showToast('Please select or enter your name');return;}
  currentUser={name};currentRole='staff';saveSession();
  if(horses.length===0){
    loadAll().then(()=>{setupStaffUI();showScreen('app');});
  } else {
    setupStaffUI();showScreen('app');
  }
}
function enterOwner(){
  const sel=document.getElementById('owner-select').value;
  const typed=document.getElementById('owner-name-input').value.trim();
  const name=typed||sel;
  if(!name){showToast('Please select or enter your name');return;}
  currentUser={name};currentRole='owner';saveSession();
  if(owners.length===0){
    loadAll().then(()=>{setupOwnerUI();showScreen('owner-app');});
  } else {
    setupOwnerUI();showScreen('owner-app');
  }
}
function signOut(){
  localStorage.removeItem('sm_session');
  currentUser=null;currentRole='rider';
  horses=[];owners=[];riders=[];bookings=[];schedules=[];
  showScreen('splash');
}

function setupRiderUI(){
  document.getElementById('rider-avatar').textContent=initials(currentUser.name);
  document.getElementById('rider-topbar-name').textContent=currentUser.name;
  renderRiderHome();
}
function setupParentUI(){
  document.getElementById('parent-avatar').textContent=initials(currentUser.name);
  document.getElementById('parent-topbar-name').textContent=currentUser.name;
  renderParentHome();
}
function setupOwnerUI(){
  document.getElementById('owner-avatar').textContent=initials(currentUser.name);
  document.getElementById('owner-topbar-name').textContent=currentUser.name;
  renderOwnerHome();
}
function setupStaffUI(){
  document.getElementById('topbar-avatar').textContent=initials(currentUser.name);
  document.getElementById('topbar-role').textContent=currentUser.name;
  renderDash();
}
