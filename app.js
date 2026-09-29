(function(){
  // mobile nav
  var btn=document.querySelector('.menu-btn'),links=document.querySelector('.links');
  if(btn&&links){btn.addEventListener('click',function(){var o=links.classList.toggle('open');btn.setAttribute('aria-expanded',o?'true':'false');});}

  // waitlist
  var SUPABASE_URL='https://rhoyyxoooajtixjkdmja.supabase.co';
  var SUPABASE_KEY='sb_publishable_3ocge4h1E2pbAgvOgu1aVw_RZR7T2jI';
  var form=document.getElementById('waitlist-form');
  if(!form)return;
  var msg=form.querySelector('.msg'),submit=form.querySelector('button');
  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(form.querySelector('.hp input').value){return;}
    var first=form.first_name.value.trim(),email=form.email.value.trim(),bg=form.background.value;
    if(!first||!email){msg.className='msg err';msg.textContent='Add your first name and email address.';return;}
    submit.disabled=true;msg.className='msg';msg.textContent='Adding you…';
    fetch(SUPABASE_URL+'/rest/v1/ai_engineer_waitlist',{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Prefer':'return=minimal'},
      body:JSON.stringify({first_name:first,email:email,background:bg||null,source:location.pathname})
    }).then(function(r){
      if(r.ok){msg.className='msg ok';msg.textContent='You\u2019re on the list, '+first+'. We\u2019ll email you when enrolment opens.';form.reset();}
      else if(r.status===409){msg.className='msg ok';msg.textContent='That email is already on the list \u2014 you\u2019re covered.';}
      else{throw new Error('status '+r.status);}
    }).catch(function(){
      msg.className='msg err';msg.textContent='Something went wrong. Please try again in a moment.';
    }).finally(function(){submit.disabled=false;});
  });
})();
