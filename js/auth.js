/* ===========================================================
   [5] SCREEN & NAVIGATION
   =========================================================== */
function showScreen(name){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+name).classList.add('active');
  document.getElementById('loading-screen').classList.add('hidden');
}

/* ===========================================================
   [6] AUTHENTICATION — Supabase Auth
   =========================================================== */
let userProfile=null; // user_profiles row for current user

async function initAuth(){
  // Check for existing Supabase session
  const{data:{session}}=await sb.auth.getSession();

  // Load data regardless (needed for public views / dropdowns)
  await loadAll();

  if(session?.user){
    // Existing session — load profile and launch
    const profile=await loadUserProfile(session.user.id);
    if(profile){
      userProfile=profile;
      currentUser={name:profile.first_name,email:profile.email,authId:profile.auth_id};
      currentRole=profile.role;
      launchApp();
    } else {
      // Auth user exists but no profile — create one (edge case: manual signup via Supabase dashboard)
      const created=await createProfileForAuthUser(session.user);
      if(created){launchApp();}else{showScreen('splash');showToast('Account setup failed — please sign in again');}
    }
  } else {
    showScreen('splash');
  }

  document.getElementById('loading-screen').classList.add('hidden');

  // Listen for auth state changes (login, logout, token refresh)
  sb.auth.onAuthStateChange(async(event,session)=>{
    if(event==='SIGNED_IN'&&session?.user){
      const profile=await loadUserProfile(session.user.id);
      if(profile){
        userProfile=profile;
        currentUser={name:profile.first_name,email:profile.email,authId:profile.auth_id};
        currentRole=profile.role;
      }
    }
    if(event==='SIGNED_OUT'){
      userProfile=null;
      currentUser=null;
      currentRole='rider';
    }
  });
}

async function loadUserProfile(authId){
  try{
    const{data,error}=await sb.from('user_profiles').select('*').eq('auth_id',authId).maybeSingle();
    if(!error&&data)return data;
  }catch(e){}
  return null;
}

async function createProfileForAuthUser(authUser){
  const email=authUser.email||'';
  const name=authUser.user_metadata?.first_name||email.split('@')[0]||'New User';

  // Create user_profiles row
  const profile={auth_id:authUser.id,email,first_name:name,role:'rider'};
  try{
    const{data,error}=await sb.from('user_profiles').insert(profile).select().single();
    if(!error&&data){
      userProfile=data;
      currentUser={name:data.first_name,email:data.email,authId:data.auth_id};
      currentRole='rider';

      // Also create a rider record
      const riderId=await createRiderForProfile(data);
      if(riderId){
        await sb.from('user_profiles').update({rider_id:riderId}).eq('id',data.id);
        userProfile.rider_id=riderId;
      }
      return data;
    }
  }catch(e){console.error('Create profile error:',e);}
  return null;
}

async function createRiderForProfile(profile){
  // Check if a rider with this name or email already exists
  const existing=riders.find(r=>
    r.email===profile.email||
    r.first.toLowerCase()===profile.first_name.toLowerCase()
  );
  if(existing){
    // Link existing rider to auth
    try{await sb.from('riders').update({auth_id:profile.auth_id,email:profile.email}).eq('id',existing.id);}catch(e){}
    return existing.id;
  }

  // Create new rider
  const nr={first:profile.first_name,last:'',email:profile.email,phone:'',level:'beginner',parents:'',approved_horses:[],auth_id:profile.auth_id};
  try{
    const{data,error}=await sb.from('riders').insert(nr).select().single();
    if(!error&&data){
      riders.push(data);
      return data.id;
    }
  }catch(e){}
  return null;
}

// ── Sign Up ───────────────────────────────────────────────────

async function authSignUp(){
  const email=document.getElementById('signup-email').value.trim();
  const password=document.getElementById('signup-password').value;
  const confirmPw=document.getElementById('signup-confirm').value;
  const firstName=document.getElementById('signup-name').value.trim();

  // Validation
  if(!firstName){showToast('Please enter your name');return;}
  if(!email){showToast('Please enter your email');return;}
  if(!password||password.length<6){showToast('Password must be at least 6 characters');return;}
  if(password!==confirmPw){showToast('Passwords do not match');return;}

  showAuthLoading(true);

  const{data,error}=await sb.auth.signUp({
    email,
    password,
    options:{data:{first_name:firstName}}
  });

  if(error){
    showAuthLoading(false);
    showToast(error.message);
    return;
  }

  if(data?.user){
    // If email confirmation is required, show a message
    if(!data.session){
      showAuthLoading(false);
      showToast('Check your email to confirm your account');
      showScreen('login');
      return;
    }

    // Auto-confirmed — create profile and launch
    await loadAll();
    await createProfileForAuthUser(data.user);
    showAuthLoading(false);
    launchApp();
  }
}

// ── Sign In ───────────────────────────────────────────────────

async function authSignIn(){
  const email=document.getElementById('login-email').value.trim();
  const password=document.getElementById('login-password').value;

  if(!email){showToast('Please enter your email');return;}
  if(!password){showToast('Please enter your password');return;}

  showAuthLoading(true);

  const{data,error}=await sb.auth.signInWithPassword({email,password});

  if(error){
    showAuthLoading(false);
    if(error.message.includes('Invalid login')){
      showToast('Invalid email or password');
    } else if(error.message.includes('Email not confirmed')){
      showToast('Please confirm your email first — check your inbox');
    } else {
      showToast(error.message);
    }
    return;
  }

  if(data?.user){
    await loadAll();
    const profile=await loadUserProfile(data.user.id);
    if(profile){
      userProfile=profile;
      currentUser={name:profile.first_name,email:profile.email,authId:profile.auth_id};
      currentRole=profile.role;
    } else {
      await createProfileForAuthUser(data.user);
    }
    showAuthLoading(false);
    launchApp();
  }
}

// ── Password Reset ────────────────────────────────────────────

async function authResetPassword(){
  const email=document.getElementById('reset-email').value.trim();
  if(!email){showToast('Please enter your email');return;}

  showAuthLoading(true);
  const{error}=await sb.auth.resetPasswordForEmail(email,{
    redirectTo:window.location.origin
  });
  showAuthLoading(false);

  if(error){
    showToast(error.message);
  } else {
    showToast('Password reset email sent — check your inbox');
    showScreen('login');
  }
}

// ── Sign Out ──────────────────────────────────────────────────

async function signOut(){
  await sb.auth.signOut();
  userProfile=null;
  currentUser=null;
  currentRole='rider';
  currentChildId=null;
  horses=[];owners=[];riders=[];bookings=[];schedules=[];shows=[];lungeRequests=[];
  if(typeof afbEntries!=='undefined')afbEntries=[];
  if(typeof hnrEntries!=='undefined')hnrEntries=[];
  showScreen('splash');
}

// ── Launch App (post-auth) ────────────────────────────────────

function launchApp(){
  if(currentRole==='staff'){setupStaffUI();showScreen('app');}
  else if(currentRole==='rider'){setupRiderUI();showScreen('rider-app');}
  else if(currentRole==='parent'){setupParentUI();showScreen('parent-app');}
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
function setupStaffUI(){
  document.getElementById('topbar-avatar').textContent=initials(currentUser.name);
  document.getElementById('topbar-role').textContent=currentUser.name;
  renderDash();
}

// ── UI Helpers ────────────────────────────────────────────────

function showAuthLoading(show){
  const btns=document.querySelectorAll('.auth-submit-btn');
  btns.forEach(b=>{
    if(show){b.dataset.origText=b.textContent;b.textContent='Loading...';b.disabled=true;}
    else{b.textContent=b.dataset.origText||b.textContent;b.disabled=false;}
  });
}

// ── Role Management (staff only) ──────────────────────────────

async function changeUserRole(profileId, newRole){
  if(currentRole!=='staff'){showToast('Only staff can change roles');return;}
  try{
    await sb.from('user_profiles').update({role:newRole}).eq('id',profileId);
    showToast('Role updated to '+newRole);
  }catch(e){showToast('Failed to update role');}
}
