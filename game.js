(() => {
  'use strict';
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const cover = document.getElementById('screenCover');
  const mainButton = document.getElementById('mainButton');
  const mainButtonText = document.getElementById('mainButtonText');
  const pauseBadge = document.getElementById('pauseBadge');
  const statusText = document.getElementById('statusText');
  const statusPip = document.getElementById('statusPip');
  const scoreValue = document.getElementById('scoreValue');
  const bestScore = document.getElementById('bestScore');
  const scoreMessage = document.getElementById('scoreMessage');
  const paceValue = document.getElementById('paceValue');
  const paceMeter = document.getElementById('paceMeter');
  const N = 15, TILE_W = 38, TILE_H = 19, BASE_X = 450, BASE_Y = 96;
  const dirs = {up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
  let state = 'ready', head = {x:7,y:12}, dir = 'up', queuedDir = 'up';
  let walls = new Set(), orb = {x:7,y:5}, score = 0, best = 0, lastStep = 0;
  let width = 0, height = 0, scale = 1, frame = 0, tickTimer = null;
  let audioOn = false, audioCtx = null, pointerStart = null;
  const stars = Array.from({length:48}, (_,i) => ({x:(i*173+43)%900,y:(i*97+21)%520,r:.5+(i%3)*.35,a:.18+(i%5)*.045}));
  try { best = Number(localStorage.getItem('neonTraceBest')) || 0; } catch (_) {}
  bestScore.textContent = String(best).padStart(2,'0');

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width; height = rect.height;
    canvas.width = Math.max(1, Math.round(width*dpr));
    canvas.height = Math.max(1, Math.round(height*dpr));
    scale = Math.min(width/900, height/520);
  }
  window.addEventListener('resize', resize, {passive:true});
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  resize();

  function cellKey(x,y) { return `${x},${y}`; }
  function center(x,y) { return {x:BASE_X+(x-y)*TILE_W/2,y:BASE_Y+(x+y)*TILE_H/2}; }
  function setStatus(text,mode='') { statusText.textContent=text; statusPip.className='status-pip'+(mode?' '+mode:''); }
  function updateHud() {
    scoreValue.textContent=String(score).padStart(2,'0');
    paceValue.textContent=(1+score*.08).toFixed(1);
    paceMeter.style.width=`${Math.min(100,18+score*5)}%`;
    if(state==='running') scoreMessage.textContent=score===0?'FIND THE GLOW':score===1?'NICE. KEEP MOVING':'TRAIL LOCKED IN';
  }
  function placeOrb() {
    const open=[];
    for(let y=0;y<N;y++) for(let x=0;x<N;x++) if(!walls.has(cellKey(x,y)) && (head.x!==x||head.y!==y)) open.push({x,y});
    if(!open.length) { finish(true); return; }
    orb=open[Math.floor(Math.random()*open.length)];
  }
  function begin() {
    if(state==='over'||state==='ready') {
      head={x:7,y:12};dir='up';queuedDir='up';walls=new Set();score=0;placeOrb();updateHud();
    }
    state='running'; cover.classList.add('hidden');pauseBadge.hidden=true;setStatus('RUN IN PROGRESS','running');
    lastStep=performance.now(); if(tickTimer) clearInterval(tickTimer); tickTimer=setInterval(step,30);
  }
  function step() {
    if(state!=='running') return;
    const delay=Math.max(86,250/(1+score*.08));
    const now=performance.now();
    if(now-lastStep<delay) return;
    lastStep=now;
    if(queuedDir!==opposite(dir)) dir=queuedDir;
    const d=dirs[dir], next={x:head.x+d.x,y:head.y+d.y};
    if(next.x<0||next.y<0||next.x>=N||next.y>=N||walls.has(cellKey(next.x,next.y))) { finish(false);return; }
    walls.add(cellKey(head.x,head.y));head=next;
    if(head.x===orb.x&&head.y===orb.y){score++;if(score>best){best=score;bestScore.textContent=String(best).padStart(2,'0');try{localStorage.setItem('neonTraceBest',String(best));}catch(_){}}placeOrb();tone(660,.11);}
    updateHud();
  }
  function opposite(d) { return ({up:'down',down:'up',left:'right',right:'left'})[d]; }
  function setDirection(next) {
    if(!dirs[next])return;
    if(state==='ready'||state==='over'){begin();}
    if(state!=='running')return;
    if(next!==opposite(dir))queuedDir=next;
    document.querySelectorAll('.dir-btn').forEach(b=>b.classList.toggle('active',b.dataset.dir===next));
    window.setTimeout(()=>document.querySelectorAll('.dir-btn').forEach(b=>b.classList.remove('active')),120);
  }
  function finish(won) {
    state='over';if(tickTimer)clearInterval(tickTimer);tickTimer=null;
    setStatus(won?'GRID CLEARED':'RUN ENDED');pauseBadge.hidden=true;
    document.getElementById('coverKicker').textContent=won?'PERFECT CIRCUIT':'TRAIL COMPLETE';
    document.getElementById('coverTitle').innerHTML=won?'You own<br><span>the grid.</span>':'One more<br><span>run?</span>';
    document.getElementById('coverCopy').textContent=won?'Every tile claimed. Beautifully done.':score?`You scored ${score} ${score===1?'point':'points'}. The trail caught up.`:'The trail caught up. Find a new route.';
    mainButtonText.textContent='PLAY AGAIN';cover.classList.remove('hidden');scoreMessage.textContent=won?'GRID CLEARED':'TRAIL COMPLETE';tone(185,.22);
  }
  function togglePause() {
    if(state==='ready'||state==='over') { begin();return; }
    if(state==='running'){state='paused';setStatus('RUN PAUSED','paused');pauseBadge.hidden=false;document.getElementById('pauseButton').querySelector('span').textContent='▶';}
    else{state='running';setStatus('RUN IN PROGRESS','running');pauseBadge.hidden=true;lastStep=performance.now();document.getElementById('pauseButton').querySelector('span').textContent='Ⅱ';}
  }
  function reset() {
    if(tickTimer)clearInterval(tickTimer);tickTimer=null;state='ready';head={x:7,y:12};dir='up';queuedDir='up';walls=new Set();score=0;placeOrb();updateHud();setStatus('READY TO RUN');pauseBadge.hidden=true;
    document.getElementById('pauseButton').querySelector('span').textContent='Ⅱ';
    document.getElementById('coverKicker').textContent='THE GRID IS YOURS';document.getElementById('coverTitle').innerHTML='Ready to<br><span>leave a trace?</span>';document.getElementById('coverCopy').textContent='Collect light. Don’t cross your own path.';mainButtonText.textContent='START RUN';cover.classList.remove('hidden');
  }
  mainButton.addEventListener('click',()=>{if(state==='paused')togglePause();else begin();});
  document.getElementById('pauseButton').addEventListener('click',togglePause);
  document.getElementById('restartButton').addEventListener('click',reset);
  document.querySelectorAll('.dir-btn').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();setDirection(b.dataset.dir);}));
  const keyMap={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};
  window.addEventListener('keydown',e=>{if(keyMap[e.key]){e.preventDefault();setDirection(keyMap[e.key]);}else if(e.key===' '||e.key==='Escape'){e.preventDefault();togglePause();}else if(e.key==='r'||e.key==='R')reset();});
  canvas.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY};});
  canvas.addEventListener('pointerup',e=>{if(!pointerStart)return;const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;pointerStart=null;if(Math.max(Math.abs(dx),Math.abs(dy))>24)setDirection(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='running')togglePause();});

  function tone(freq,duration) {
    if(!audioOn)return;
    try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.035,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+duration);}catch(_){}
  }
  document.getElementById('soundButton').addEventListener('click',()=>{audioOn=!audioOn;document.getElementById('soundButton').classList.toggle('sound-on',audioOn);tone(520,.08);});

  function polygon(points,fill,stroke,lineWidth=1){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}}
  function drawTile(x,y,lit=false) {
    const {x:px,y:py}=center(x,y), a=TILE_W/2,b=TILE_H/2;
    const points=[[px,py],[px+a,py+b],[px,py+TILE_H],[px-a,py+b]];
    let fill=lit?'#173447':((x+y)%2?'#10273a':'#112a3d');
    polygon(points,fill,lit?'#2b5966':'#1a3549',.8);
    if(lit){ctx.strokeStyle='#48dfc212';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px-a+4,py+b);ctx.lineTo(px,py+TILE_H-3);ctx.lineTo(px+a-4,py+b);ctx.stroke();}
  }
  function drawBlock(x,y,kind='wall',lift=15) {
    const {x:px,y:py}=center(x,y),a=TILE_W/2,b=TILE_H/2;
    const top=[[px,py-lift],[px+a,py+b-lift],[px,py+TILE_H-lift],[px-a,py+b-lift]];
    const left=[top[3],[px-a,py+b],[px,py+TILE_H],[top[2][0],top[2][1]]];
    const right=[top[1],[px+a,py+b],[px,py+TILE_H],[top[2][0],top[2][1]]];
    if(kind==='wall'){
      polygon(left,'#127b78','#36d9b866',.8);polygon(right,'#0d575e','#32cbb866',.8);polygon(top,'#49e7c4','#9affdf',.9);
      ctx.save();ctx.globalAlpha=.32;ctx.strokeStyle='#c1fff0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px-a+5,py+b-lift+3);ctx.lineTo(px,py+TILE_H-lift-3);ctx.stroke();ctx.restore();
      ctx.save();ctx.shadowColor='#44edc8';ctx.shadowBlur=10;ctx.fillStyle='#56f2d0';ctx.fillRect(px-2,py+b-lift+1,4,1.5);ctx.restore();
    }else{
      polygon(left,'#128d90','#aaffea',1);polygon(right,'#12626f','#aaffea',1);polygon(top,'#8effdc','#e2fff0',1.2);
      ctx.save();ctx.shadowColor='#84ffdc';ctx.shadowBlur=13;ctx.fillStyle='#e7fff5';ctx.beginPath();ctx.arc(px,py+b-lift+2,2.4,0,Math.PI*2);ctx.fill();ctx.restore();
      const eyes=dir==='left'?[-4,0]:dir==='right'?[4,0]:dir==='up'?[0,-2]:[0,3];
      ctx.fillStyle='#092b31';ctx.beginPath();ctx.arc(px+eyes[0]-3,py+b-lift+2+eyes[1],1.2,0,Math.PI*2);ctx.arc(px+eyes[0]+3,py+b-lift+2+eyes[1],1.2,0,Math.PI*2);ctx.fill();
    }
  }
  function drawOrb(time) {
    const p=center(orb.x,orb.y),pulse=1+Math.sin(time/230)*.14;
    ctx.save();ctx.translate(p.x,p.y-4);
    const glow=ctx.createRadialGradient(0,0,2,0,0,26*pulse);glow.addColorStop(0,'#d7ff8f88');glow.addColorStop(1,'#b9ff6400');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,26*pulse,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#d3ff7b55';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,13*pulse,time/500,time/500+Math.PI*1.35);ctx.stroke();
    ctx.fillStyle='#d7ff8e';ctx.shadowColor='#d7ff8e';ctx.shadowBlur=17;ctx.beginPath();ctx.arc(0,0,4.2*pulse,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function draw(time) {
    frame++;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(canvas.width/width*scale,0,0,canvas.height/height*scale,(width-900*scale)/2*canvas.width/width,(height-520*scale)/2*canvas.height/height);
    for(const s of stars){ctx.globalAlpha=s.a*(.78+.22*Math.sin(time/900+s.x));ctx.fillStyle='#b8d5e8';ctx.fillRect(s.x,s.y,s.r,s.r);}ctx.globalAlpha=1;
    // Soft pool of light beneath the floating board.
    const shadow=ctx.createRadialGradient(450,277,25,450,277,300);shadow.addColorStop(0,'#020a10a6');shadow.addColorStop(1,'#020a1000');ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(450,279,310,140,0,0,Math.PI*2);ctx.fill();
    // Isometric floor, rendered from the far corner toward the viewer.
    for(let sum=0;sum<=2*(N-1);sum++)for(let y=0;y<N;y++){const x=sum-y;if(x>=0&&x<N)drawTile(x,y, (x+y)%4===0);}
    const border=[center(0,0),center(N-1,0),center(N-1,N-1),center(0,N-1)];
    ctx.beginPath();ctx.moveTo(border[0].x,border[0].y);for(let i=1;i<border.length;i++)ctx.lineTo(border[i].x,border[i].y);ctx.closePath();ctx.strokeStyle='#50dabe56';ctx.lineWidth=1.2;ctx.stroke();
    // Walls sit on top of the tiles; sort by depth so near blocks overlap distant ones.
    const ordered=Array.from(walls,k=>k.split(',').map(Number)).sort((a,b)=>(a[0]+a[1])-(b[0]+b[1]));
    for(const [x,y] of ordered)drawBlock(x,y,'wall');
    drawOrb(time);
    drawBlock(head.x,head.y,'head',19);
    // A small directional glint makes the leading edge easy to read.
    const c=center(head.x,head.y),d=dirs[dir];ctx.save();ctx.fillStyle='#e4fff5';ctx.shadowColor='#a5ffe3';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(c.x+d.x*5,c.y+d.y*4-12,1.6,0,Math.PI*2);ctx.fill();ctx.restore();
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
