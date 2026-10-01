// Site background: a calm grid of dots that swells around the cursor,
// with pulses rippling across it like signals. Sits behind every page.
(function(){
  var canvas=document.createElement('canvas');
  canvas.className='signal-bg';
  canvas.setAttribute('aria-hidden','true');
  var c=canvas.getContext('2d');
  if(!c)return;

  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W=0,H=0,dpr=1,gap=24;
  var mouse={x:0,y:0,on:false},rings=[],nextRing=0;
  var seed=11;function rnd(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646;}

  function resize(){
    dpr=Math.min(window.devicePixelRatio||1,2);W=window.innerWidth;H=window.innerHeight;
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);c.setTransform(dpr,0,0,dpr,0,0);
    gap=W<760?22:Math.max(24,W/60);
  }

  function draw(t){
    c.clearRect(0,0,W,H);
    // the grid drifts gently with scroll so it feels attached to the page
    var oy=-(window.scrollY*0.15)%gap;
    // with no cursor, a soft swell wanders on its own
    var px=mouse.on?mouse.x:W*(.62+.22*Math.sin(t*.21)),py=mouse.on?mouse.y:H*(.45+.25*Math.sin(t*.16+1)),swell=mouse.on?1:.55;
    if(reduced)swell=0;
    var reach=gap*gap*16;
    for(var y=gap/2+oy;y<H+gap;y+=gap){
      for(var x=gap/2;x<W;x+=gap){
        var dx=x-px,dy=y-py,lift=swell*Math.exp(-(dx*dx+dy*dy)/reach),ring=0;
        for(var i=0;i<rings.length;i++){
          var r=rings[i],age=t-r.t0,dd=Math.abs(Math.sqrt((x-r.x)*(x-r.x)+(y-r.y)*(y-r.y))-age*gap*7);
          if(dd<gap*2.5)ring=Math.max(ring,Math.exp(-dd*dd/(gap*gap*.55))*(1-age/r.life));
        }
        var hot=ring>.3&&ring>lift;
        c.globalAlpha=Math.min(.95,.16+lift*.6+ring*.55);
        c.fillStyle=hot?'#fbbf24':'#a5b4fc';
        c.beginPath();c.arc(x,y,1.1+lift*2.6+ring*1.8,0,6.2832);c.fill();
      }
    }
    c.globalAlpha=1;
  }

  var start=performance.now();
  function frame(now){
    var t=(now-start)/1000;
    if(t>nextRing){rings.push({x:rnd()*W,y:rnd()*H,t0:t,life:3+rnd()*.8});nextRing=t+1.1+rnd()*1.2;}
    rings=rings.filter(function(r){return t-r.t0<r.life;});
    draw(t);
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize',function(){resize();if(reduced)draw(0);});
  if(reduced){
    // a still grid, redrawn only when the page scrolls
    window.addEventListener('scroll',function(){requestAnimationFrame(function(){draw(0);});},{passive:true});
  }else{
    window.addEventListener('pointermove',function(e){if(e.pointerType==='mouse'){mouse.x=e.clientX;mouse.y=e.clientY;mouse.on=true;}},{passive:true});
    document.documentElement.addEventListener('pointerleave',function(){mouse.on=false;});
  }

  resize();
  document.body.insertBefore(canvas,document.body.firstChild);
  if(reduced)draw(0);else requestAnimationFrame(frame);
})();
