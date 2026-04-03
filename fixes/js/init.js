/* ===========================================================
   [26] FORM POPULATION HELPERS
   =========================================================== */
function populateHorseSelect(){const el=document.getElementById('b-horse');if(!el)return;el.innerHTML='<option value="">— No horse —</option>'+horses.map(h=>`<option value="${h.id}">${h.name}</option>`).join('');}
function populateRiderSelect(){const el=document.getElementById('b-rider');if(!el)return;el.innerHTML='<option value="">— Unassigned —</option>'+riders.map(r=>`<option value="${r.id}">${r.first}</option>`).join('');}
function populateOwnerSelect(id){const el=document.getElementById(id);if(!el)return;el.innerHTML='<option value="">Barn owned</option>'+owners.map(o=>`<option value="${o.id}">${o.first}</option>`).join('');}
function quickBook(horseId){
  populateHorseSelect();populateRiderSelect();populateTimeSelect('b-time');
  document.getElementById('b-horse').value=horseId;
  const bd=document.getElementById('b-date');if(bd)bd.value=fmtDate(today);
  const warn=document.getElementById('trainer-warning');if(warn)warn.className='trainer-warning';
  document.getElementById('sheet-booking').classList.add('open');
}

const ownerLevelEl=document.getElementById('o-level');
if(ownerLevelEl){
  ownerLevelEl.addEventListener('change',function(){
    const daysGroup=document.getElementById('o-days-group');
    if(daysGroup){
      daysGroup.style.display=this.value==='partial-lease'?'block':'none';
    }
  });
}

function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);}

initAuth();
