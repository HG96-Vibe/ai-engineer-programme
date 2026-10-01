// Home page scroll story: each chapter's headline word is spelled out in dots.
// As the visitor scrolls, the word dissolves into noise and reassembles as the next one.
// It is driven by scroll only, so nothing moves while the page is still.
(function(){
  var section=document.querySelector('.story');
  if(!section)return;
  var canvas=section.querySelector('.story-canvas'),c=canvas.getContext('2d');
  if(!c)return;
  var chapters=[].slice.call(section.querySelectorAll('.story-ch'));
  var words=chapters.map(function(ch){return ch.getAttribute('data-word');});
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W=0,H=0,dpr=1,targets=[],drift=[],queued=false,mx=-1e4,my=-1e4,fontReady=false;

  function ease(t){t=t<0?0:t>1?1:t;return t*t*(3-2*t);}

  // sample each word on a fine grid; every word gets the same number of points so dots can travel between them
  function build(){
    dpr=Math.min(window.devicePixelRatio||1,2);W=canvas.clientWidth;H=canvas.clientHeight;
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);c.setTransform(dpr,0,0,dpr,0,0);
    var o=document.createElement('canvas');o.width=Math.round(W);o.height=Math.round(H);var x=o.getContext('2d');
    var font='800 100px "Source Sans 3",-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
    x.font=font;var widest=Math.max.apply(null,words.map(function(w){return x.measureText(w).width;}));
    var size=Math.min(H*(W<760?.2:.27),100*W*.88/widest),cy=H*(W<760?.3:.33);
    var step=Math.max(4,size/15),sets=[];
    words.forEach(function(w){
      x.clearRect(0,0,o.width,o.height);x.fillStyle='#000';x.font=font.replace('100px',size+'px');x.textAlign='center';x.textBaseline='middle';x.fillText(w,W/2,cy);
      var d=x.getImageData(0,0,o.width,o.height).data,pts=[];
      for(var yy=step/2;yy<H;yy+=step)for(var xx=step/2;xx<W;xx+=step)if(d[(Math.round(yy)*o.width+Math.round(xx))*4+3]>110)pts.push([xx,yy]);
      sets.push(pts.length?pts:[[W/2,cy]]);
    });
    var n=Math.min(1600,Math.max.apply(null,sets.map(function(s){return s.length;})));
    // shuffle each set with a fixed seed so dots take crossing paths when the word changes
    var seed=7;function rnd(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
    targets=sets.map(function(s){var a=s.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}var r=[];for(i=0;i<n;i++)r.push(a[i%a.length]);return r;});
    drift=[];for(var i=0;i<n;i++)drift.push([rnd()-.5,rnd()-.5]);
  }

  function progress(){
    var r=section.getBoundingClientRect(),span=r.height-H;
    var p=span>0?-r.top/span:0;return p<0?0:p>1?1:p;
  }

  function draw(){
    queued=false;
    c.clearRect(0,0,W,H);
    var r=section.getBoundingClientRect();if(r.bottom<0||r.top>H)return;
    var chf=progress()*(words.length-1),a=Math.min(words.length-2,Math.floor(chf)),k=ease((chf-a-.3)/.45);
    if(chf>=words.length-1){a=words.length-2;k=1;}
    if(reduced)k=k<.5?0:1;
    var A=targets[a],B=targets[a+1],burst=Math.sin(Math.PI*k),bx=burst*W*.55,by=burst*H*.35;
    var last=a+1===words.length-1&&k>.9,reach=600;
    c.fillStyle=last?'#fbbf24':'#ffffff';
    for(var i=0;i<A.length;i++){
      var x=A[i][0]+(B[i][0]-A[i][0])*k+drift[i][0]*bx,y=A[i][1]+(B[i][1]-A[i][1])*k+drift[i][1]*by;
      var dx=x-mx,dy=y-my,lift=Math.exp(-(dx*dx+dy*dy)/(reach*12));
      c.globalAlpha=.92-.45*burst;
      c.beginPath();c.arc(x,y,1.5+lift*1.8,0,6.2832);c.fill();
    }
    c.globalAlpha=1;
  }
  function request(){if(!queued){queued=true;requestAnimationFrame(draw);}}

  window.addEventListener('scroll',request,{passive:true});
  window.addEventListener('resize',function(){build();request();});
  if(!reduced)window.addEventListener('pointermove',function(e){var r=canvas.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top;request();},{passive:true});

  section.classList.add('is-live');
  build();request();
  // rebuild once the display font has loaded so the dots trace the real letterforms
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){build();request();});
})();
