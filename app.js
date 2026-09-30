(function(){
  // mobile nav
  var btn=document.querySelector('.menu-btn'),nav=document.querySelector('.site-header nav');
  if(btn&&nav){btn.addEventListener('click',function(){var o=nav.classList.toggle('open');btn.setAttribute('aria-expanded',o?'true':'false');});}

  // header shadow on scroll
  var header=document.querySelector('.site-header');
  if(header){var onScroll=function(){header.classList.toggle('scrolled',window.scrollY>8);};onScroll();window.addEventListener('scroll',onScroll,{passive:true});}

  // accordions
  document.querySelectorAll('.acc').forEach(function(acc){
    var head=acc.querySelector('.acc-head'),body=acc.querySelector('.acc-body');
    if(!head||!body)return;
    var open=acc.hasAttribute('data-open');
    var set=function(o){head.setAttribute('aria-expanded',o?'true':'false');body.style.maxHeight=o?body.scrollHeight+'px':'0px';};
    set(open);
    head.addEventListener('click',function(){set(head.getAttribute('aria-expanded')!=='true');});
    window.addEventListener('resize',function(){if(head.getAttribute('aria-expanded')==='true')body.style.maxHeight=body.scrollHeight+'px';});
  });

  // reveal on scroll
  var reveals=document.querySelectorAll('[data-reveal]');
  if('IntersectionObserver' in window&&reveals.length){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -8% 0px'});
    reveals.forEach(function(el){io.observe(el);});
  }else{reveals.forEach(function(el){el.classList.add('in');});}

  // waitlist form
  var SUPABASE_URL='https://rhoyyxoooajtixjkdmja.supabase.co';
  var SUPABASE_KEY='sb_publishable_3ocge4h1E2pbAgvOgu1aVw_RZR7T2jI';
  var form=document.getElementById('waitlist-form');
  if(!form)return;
  var msg=form.querySelector('.msg'),submit=form.querySelector('button[type="submit"]');
  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(form.querySelector('.hp input').value){return;}
    var first=form.first_name.value.trim(),email=form.email.value.trim(),bg=form.background.value;
    if(!first||!email){msg.className='msg err';msg.textContent='Add your first name and email address.';return;}
    submit.disabled=true;msg.className='msg';msg.textContent='Adding you\u2026';
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
