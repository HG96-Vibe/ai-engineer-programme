// Site background: a calm grid of dots that swells around the cursor (or a finger on touch screens).
// Nothing moves on its own; the grid only redraws when the pointer moves or the page scrolls.
(function(){
  var canvas=document.createElement('canvas');
  canvas.className='signal-bg';
  canvas.setAttribute('aria-hidden','true');
  var c=canvas.getContext('2d');
  if(!c)return;

  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W=0,H=0,dpr=1,gap=24;
  var px=0,py=0,target=0,swell=0,queued=false;

  function resize(){
    dpr=Math.min(window.devicePixelRatio||1,2);W=window.innerWidth;H=window.innerHeight;
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);c.setTransform(dpr,0,0,dpr,0,0);
    gap=W<760?22:Math.max(24,W/60);
  }

  function draw(){
    c.clearRect(0,0,W,H);
    // the grid drifts gently with scroll so it feels attached to the page
    var oy=-(window.scrollY*0.15)%gap,reach=gap*gap*16;
    c.fillStyle='#a5b4fc';
    for(var y=gap/2+oy;y<H+gap;y+=gap){
      for(var x=gap/2;x<W;x+=gap){
        var dx=x-px,dy=y-py,lift=swell*Math.exp(-(dx*dx+dy*dy)/reach);
        c.globalAlpha=.16+lift*.6;
        c.beginPath();c.arc(x,y,1.1+lift*2.6,0,6.2832);c.fill();
      }
    }
    c.globalAlpha=1;
  }

  // ease the swell in and out, then stop drawing once it has settled
  function frame(){
    queued=false;
    swell+=(target-swell)*0.18;
    if(Math.abs(target-swell)<0.01)swell=target;
    draw();
    if(swell!==target)request();
  }
  function request(){if(!queued){queued=true;requestAnimationFrame(frame);}}

  window.addEventListener('resize',function(){resize();request();});
  window.addEventListener('scroll',request,{passive:true});
  if(!reduced){
    window.addEventListener('pointermove',function(e){px=e.clientX;py=e.clientY;target=1;request();},{passive:true});
    window.addEventListener('pointerdown',function(e){px=e.clientX;py=e.clientY;target=1;request();},{passive:true});
    window.addEventListener('pointerup',function(e){if(e.pointerType!=='mouse'){target=0;request();}},{passive:true});
    document.documentElement.addEventListener('pointerleave',function(){target=0;request();});
  }

  resize();
  document.body.insertBefore(canvas,document.body.firstChild);
  request();
})();
