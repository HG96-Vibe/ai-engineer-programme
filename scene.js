// Home page background: a 3D neural network the camera flies through as you scroll.
// The sky is dark behind the hero and the closing dark block, light everywhere else.
(function(){
  var canvas=document.createElement('canvas');
  canvas.className='scene';
  canvas.setAttribute('aria-hidden','true');
  var gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'});
  if(!gl)return;

  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small=window.innerWidth<760;
  var NODES=small?170:320, SPARKS=small?26:56, DEPTH=90, SPREAD_X=15, SPREAD_Y=10;

  // ---------- shaders ----------
  var DARK_FN=
    'uniform vec4 uZones;uniform vec2 uRes;uniform float uFeather;'+
    'float band(float y,float t,float b){return smoothstep(t-uFeather,t+uFeather,y)*(1.0-smoothstep(b-uFeather,b+uFeather,y));}'+
    'float darkness(){float y=uRes.y-gl_FragCoord.y;return max(band(y,uZones.x,uZones.y),band(y,uZones.z,uZones.w));}';

  var BG_VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';
  var BG_FS='precision mediump float;'+DARK_FN+
    'uniform vec2 uGlow1;uniform vec2 uGlow2;'+
    'void main(){'+
    ' vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);'+
    ' float k=clamp((px.x/uRes.x)*0.35+(px.y/uRes.y)*0.65,0.0,1.0);'+
    ' vec3 dark=mix(vec3(0.192,0.180,0.506),vec3(0.118,0.106,0.294),k);'+
    ' float g1=1.0-smoothstep(0.0,1.0,length((px-uGlow1)/(vec2(900.0,520.0)*uFeather/90.0)));'+
    ' float g2=1.0-smoothstep(0.0,1.0,length((px-uGlow2)/(vec2(900.0,520.0)*uFeather/90.0)));'+
    ' dark=mix(dark,vec3(0.310,0.275,0.898),0.55*max(g1,g2));'+
    ' vec3 light=mix(vec3(0.988,0.988,1.0),vec3(0.937,0.945,1.0),0.5+0.5*sin(px.y/uRes.y*3.14159));'+
    ' gl_FragColor=vec4(mix(light,dark,darkness()),1.0);}';

  var PT_VS='attribute vec3 p;attribute float s;'+
    'uniform mat4 uProj;uniform vec3 uCam;uniform float uRot;uniform float uTime;uniform float uDpr;uniform float uSize;'+
    'varying float vA;'+
    'void main(){'+
    ' float c=cos(uRot),sn=sin(uRot);vec3 q=vec3(c*p.x-sn*p.y,sn*p.x+c*p.y,p.z)-uCam;'+
    ' gl_Position=uProj*vec4(q,1.0);float d=-q.z;'+
    ' vA=smoothstep(0.8,4.0,d)*(1.0-smoothstep(20.0,38.0,d))*(0.7+0.3*sin(uTime*1.3+s*40.0));'+
    ' gl_PointSize=clamp((uSize+uSize*1.4*s)*uDpr*16.0/d,1.0,46.0*uDpr);}';
  var PT_FS='precision mediump float;'+DARK_FN+
    'uniform vec3 uOnDark;uniform vec3 uOnLight;uniform float uLightA;varying float vA;'+
    'void main(){float r=length(gl_PointCoord-0.5);float a=smoothstep(0.5,0.0,r);a=a*a+smoothstep(0.18,0.08,r)*0.6;'+
    ' float dk=darkness();gl_FragColor=vec4(mix(uOnLight,uOnDark,dk),a*vA*mix(uLightA,1.0,dk));}';

  var LN_VS='attribute vec3 p;uniform mat4 uProj;uniform vec3 uCam;uniform float uRot;varying float vA;'+
    'void main(){float c=cos(uRot),sn=sin(uRot);vec3 q=vec3(c*p.x-sn*p.y,sn*p.x+c*p.y,p.z)-uCam;'+
    ' gl_Position=uProj*vec4(q,1.0);float d=-q.z;vA=smoothstep(2.5,7.0,d)*(1.0-smoothstep(16.0,32.0,d));}';
  var LN_FS='precision mediump float;'+DARK_FN+
    'uniform vec3 uOnDark;uniform vec3 uOnLight;varying float vA;'+
    'void main(){float dk=darkness();gl_FragColor=vec4(mix(uOnLight,uOnDark,dk),vA*mix(0.12,0.22,dk));}';

  function compile(vs,fs){
    var pr=gl.createProgram();
    [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]].forEach(function(x){
      var sh=gl.createShader(x[0]);gl.shaderSource(sh,x[1]);gl.compileShader(sh);gl.attachShader(pr,sh);
    });
    gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return null;
    var u={},n=gl.getProgramParameter(pr,gl.ACTIVE_UNIFORMS);
    for(var i=0;i<n;i++){var nm=gl.getActiveUniform(pr,i).name;u[nm]=gl.getUniformLocation(pr,nm);}
    return {p:pr,u:u};
  }
  var bgP=compile(BG_VS,BG_FS),ptP=compile(PT_VS,PT_FS),lnP=compile(LN_VS,LN_FS);
  if(!bgP||!ptP||!lnP)return;

  // ---------- network ----------
  var rnd=(function(seed){return function(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};})(7);
  var pos=new Float32Array(NODES*3),seedA=new Float32Array(NODES);
  for(var i=0;i<NODES;i++){
    // denser towards the corridor's centre, a few strays out wide
    var r=Math.pow(rnd(),0.8),a=rnd()*Math.PI*2;
    pos[i*3]=Math.cos(a)*r*SPREAD_X;pos[i*3+1]=Math.sin(a)*r*SPREAD_Y;pos[i*3+2]=6-rnd()*(DEPTH+30);
    seedA[i]=rnd();
  }
  var edges=[],adj=[];for(i=0;i<NODES;i++)adj.push([]);
  for(i=0;i<NODES;i++){
    var near=[];
    for(var j=0;j<NODES;j++){if(j===i)continue;
      var dx=pos[i*3]-pos[j*3],dy=pos[i*3+1]-pos[j*3+1],dz=pos[i*3+2]-pos[j*3+2],d=dx*dx+dy*dy+dz*dz;
      if(d<42)near.push([d,j]);}
    near.sort(function(x,y){return x[0]-y[0];});
    for(var k=0;k<Math.min(3,near.length);k++){j=near[k][1];
      if(adj[i].indexOf(j)<0){adj[i].push(j);adj[j].push(i);edges.push(i,j);}}
  }
  var linePos=new Float32Array(edges.length*3);
  for(i=0;i<edges.length;i++){linePos.set(pos.subarray(edges[i]*3,edges[i]*3+3),i*3);}

  function buf(data,usage){var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,usage||gl.STATIC_DRAW);return b;}
  var bgBuf=buf(new Float32Array([-1,-1,3,-1,-1,3])),nodeBuf=buf(pos),seedBuf=buf(seedA),lineBuf=buf(linePos);

  // sparks travel node to node along edges, like signals
  var sparks=[],sparkPos=new Float32Array(SPARKS*3),sparkSeed=new Float32Array(SPARKS);
  function hop(sp,from){
    var nb=adj[from];if(!nb.length){from=Math.floor(rnd()*NODES);nb=adj[from];}
    sp.a=from;sp.b=nb.length?nb[Math.floor(rnd()*nb.length)]:from;sp.t=0;sp.dur=0.9+rnd()*1.6;
  }
  for(i=0;i<SPARKS;i++){var sp={};hop(sp,Math.floor(rnd()*NODES));sp.t=rnd();sparks.push(sp);sparkSeed[i]=0.6+rnd()*0.4;}
  var sparkBuf=buf(sparkPos,gl.DYNAMIC_DRAW),sparkSeedBuf=buf(sparkSeed);

  // ---------- page wiring ----------
  var hero=document.querySelector('.hero'),darkEls=[].slice.call(document.querySelectorAll('.hero,.dark-block'));
  var dpr=1,W=0,H=0,proj=new Float32Array(16);
  function resize(){
    dpr=Math.min(window.devicePixelRatio||1,1.75);W=window.innerWidth;H=window.innerHeight;
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);gl.viewport(0,0,canvas.width,canvas.height);
    var f=1/Math.tan(30*Math.PI/180),nf=1/(0.1-100);
    proj.fill(0);proj[0]=f/(W/H);proj[5]=f;proj[10]=(100+0.1)*nf;proj[11]=-1;proj[14]=2*100*0.1*nf;
  }
  var mx=0,my=0,cx=0,cy=0,camZ=null;
  window.addEventListener('pointermove',function(e){mx=e.clientX/W*2-1;my=e.clientY/H*2-1;},{passive:true});
  window.addEventListener('resize',function(){resize();if(reduced)requestAnimationFrame(frame);});
  // with reduced motion the scene is a still image, redrawn only when the page scrolls
  if(reduced)window.addEventListener('scroll',function(){requestAnimationFrame(frame);},{passive:true});
  canvas.addEventListener('webglcontextlost',function(e){e.preventDefault();document.documentElement.classList.remove('has-scene');canvas.remove();});

  function attr(prog,name,b,size){var l=gl.getAttribLocation(prog.p,name);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,size,gl.FLOAT,false,0,0);return l;}
  function common(prog,zones,cam,rot,t){
    var u=prog.u;
    gl.uniform4fv(u.uZones,zones);gl.uniform2f(u.uRes,canvas.width,canvas.height);gl.uniform1f(u.uFeather,90*dpr);
    if(u.uProj){gl.uniformMatrix4fv(u.uProj,false,proj);gl.uniform3fv(u.uCam,cam);gl.uniform1f(u.uRot,rot);}
    if(u.uTime)gl.uniform1f(u.uTime,t);
  }

  var start=performance.now(),last=start;
  function frame(now){
    var t=reduced?0:(now-start)/1000,dt=Math.min(0.05,(now-last)/1000);last=now;
    var max=Math.max(1,document.documentElement.scrollHeight-H),prog=window.scrollY/max;
    var target=reduced?0:-prog*DEPTH;camZ=camZ===null?target:camZ+(target-camZ)*0.07;
    cx+=(mx*1.4-cx)*0.04;cy+=(-my*0.9-cy)*0.04;
    var cam=[reduced?0:cx,reduced?0:cy,camZ+5],rot=t*0.02;

    // the (at most two) dark sections on screen; the hero's top edge is never shown as a light band
    var hr=hero.getBoundingClientRect(),zones=[1e5,1e5,1e5,1e5],n=0;
    for(var z=0;z<darkEls.length&&n<2;z++){var r=darkEls[z].getBoundingClientRect();
      if(r.bottom>-200&&r.top<H+200){zones[n*2]=(darkEls[z]===hero?-1e5:r.top*dpr);zones[n*2+1]=r.bottom*dpr;n++;}}

    gl.disable(gl.BLEND);
    gl.useProgram(bgP.p);common(bgP,zones);
    gl.uniform2f(bgP.u.uGlow1,0.15*canvas.width,hr.top*dpr);gl.uniform2f(bgP.u.uGlow2,0.85*canvas.width,n>1||zones[0]>-1e4?(n>1?zones[2]:zones[0]):-1e5);
    attr(bgP,'p',bgBuf,2);gl.drawArrays(gl.TRIANGLES,0,3);

    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(lnP.p);common(lnP,zones,cam,rot,t);
    gl.uniform3f(lnP.u.uOnDark,0.65,0.70,0.99);gl.uniform3f(lnP.u.uOnLight,0.39,0.40,0.95);
    attr(lnP,'p',lineBuf,3);gl.drawArrays(gl.LINES,0,edges.length);

    gl.useProgram(ptP.p);common(ptP,zones,cam,rot,t);gl.uniform1f(ptP.u.uDpr,dpr);
    gl.uniform3f(ptP.u.uOnDark,0.78,0.82,1.0);gl.uniform3f(ptP.u.uOnLight,0.31,0.27,0.90);
    gl.uniform1f(ptP.u.uSize,2.2);gl.uniform1f(ptP.u.uLightA,0.6);
    attr(ptP,'p',nodeBuf,3);attr(ptP,'s',seedBuf,1);gl.drawArrays(gl.POINTS,0,NODES);

    if(!reduced){
      for(var i=0;i<SPARKS;i++){var sp=sparks[i];sp.t+=dt/sp.dur;if(sp.t>=1)hop(sp,sp.b);
        var e=sp.t*sp.t*(3-2*sp.t);
        for(var c=0;c<3;c++)sparkPos[i*3+c]=pos[sp.a*3+c]+(pos[sp.b*3+c]-pos[sp.a*3+c])*e;}
      gl.bindBuffer(gl.ARRAY_BUFFER,sparkBuf);gl.bufferSubData(gl.ARRAY_BUFFER,0,sparkPos);
      gl.uniform3f(ptP.u.uOnDark,0.98,0.62,0.20);gl.uniform3f(ptP.u.uOnLight,0.85,0.47,0.02);
      gl.uniform1f(ptP.u.uSize,3.4);gl.uniform1f(ptP.u.uLightA,0.85);
      attr(ptP,'p',sparkBuf,3);attr(ptP,'s',sparkSeedBuf,1);gl.drawArrays(gl.POINTS,0,SPARKS);
    }
    if(!reduced)requestAnimationFrame(frame);
  }

  resize();
  document.body.insertBefore(canvas,document.body.firstChild);
  document.documentElement.classList.add('has-scene');
  requestAnimationFrame(frame);
})();
