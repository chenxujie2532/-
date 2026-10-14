/* Procedural battlefield materials. No external images or gameplay RNG consumption. */
'use strict';
window.FrontlineTerrain=(()=>{
const W=1440,H=960,TAU=Math.PI*2;
const TYPES=Object.freeze({
normal:{name:'坚实地面',speed:1,drag:18,color:'#576854',hint:'标准机动'},
road:{name:'硬化道路',speed:1.12,drag:18,color:'#626a65',hint:'移动速度 +12%'},
bridge:{name:'木制栈桥',speed:1.08,drag:18,color:'#a79168',hint:'可穿越水域 · 速度 +8%'},
sand:{name:'松软沙地',speed:.84,drag:12,color:'#ad9564',hint:'移动速度 −16%'},
mud:{name:'积水泥地',speed:.70,drag:10,color:'#655745',hint:'移动速度 −30%'},
grass:{name:'高草隐蔽区',speed:.90,drag:16,cover:.60,color:'#557648',hint:'速度 −10% · 被发现距离 −40%'},
ice:{name:'光滑冰面',speed:1.02,drag:3,color:'#92b9c3',hint:'惯性增加 · 小心侧滑'},
rubble:{name:'碎石废墟',speed:.82,drag:13,color:'#8b8c80',hint:'移动速度 −18%'}
});
const PALETTES={
'荒漠':{base:'#6b694d',light:'#a28b5c',dark:'#4e5540',road:'#454f48',grass:'#747e43',water:'#31575a',edge:'#aa9b73'},
'丘陵':{base:'#405e49',light:'#617b52',dark:'#2e493b',road:'#43514c',grass:'#507a3e',water:'#315c59',edge:'#73966b'},
'雪原':{base:'#a7b9b5',light:'#d2dfd5',dark:'#839c99',road:'#627778',grass:'#6b8972',water:'#376474',edge:'#dce9e0'},
'港湾':{base:'#485d60',light:'#637878',dark:'#344d52',road:'#35494d',grass:'#58775b',water:'#275c72',edge:'#8aabaa'}
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function rim(z,a){const phase=z.x*.013+z.y*.017;return .87+.075*Math.sin(a*3+phase)+.045*Math.cos(a*5-phase);}
function contains(z,x,y){if(z.shape!=='ellipse')return x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h;const nx=(x-z.x-z.w/2)/(z.w/2),ny=(y-z.y-z.h/2)/(z.h/2);return Math.hypot(nx,ny)<=rim(z,Math.atan2(ny,nx));}
function at(scene,x,y){if(scene)for(let i=scene.zones.length-1;i>=0;i--)if(contains(scene.zones[i],x,y))return TYPES[scene.zones[i].kind];return TYPES.normal;}
// Cut real gaps in water collision rectangles; the bridge deck is not just decorative.
function bridgeWater(walls){
const decks=[],next=[];
for(const w of walls){
if(w.kind!=='water'||Math.max(w.w,w.h)<240){next.push(w);continue;}
const vertical=w.h>=w.w,origin=vertical?w.y:w.x,length=vertical?w.h:w.w;
const middle=clamp((Math.floor((origin+length/2)/48)+.5)*48,origin+96,origin+length-96),a=middle-72,b=middle+72;
if(vertical){next.push({...w,h:a-w.y},{...w,y:b,h:w.y+w.h-b});decks.push({x:w.x-14,y:a,w:w.w+28,h:144,axis:'x'});}
else{next.push({...w,w:a-w.x},{...w,x:b,w:w.x+w.w-b});decks.push({x:a,y:w.y-14,w:144,h:w.h+28,axis:'y'});}
}
walls.splice(0,walls.length,...next);return decks;
}
function build(level,biome,walls,decks=[]){
const palette=PALETTES[biome],zones=[],rr=random(41071+level*971),add=(kind,x,y,w,h,shape='ellipse')=>zones.push({kind,x,y,w,h,shape});
// Every operation gets its own arrangements of off-road routes and concealment.
const layouts=[
[['sand',85,190,280,175],['sand',1020,525,300,190],['grass',112,570,220,165],['grass',1070,195,220,180],['rubble',490,170,230,140]],
[['mud',110,355,290,195],['mud',980,595,290,175],['grass',350,125,285,185],['grass',800,135,260,180],['grass',270,605,290,200]],
[['sand',360,225,265,175],['rubble',875,545,210,170],['mud',905,240,210,180],['grass',90,655,180,130]],
[['ice',65,360,320,200],['ice',1030,540,305,230],['ice',475,220,270,170],['rubble',920,230,200,160],['grass',360,650,235,135]],
[['mud',280,560,270,190],['mud',880,530,260,175],['grass',345,120,280,145],['grass',790,125,300,150],['rubble',100,735,210,135]],
[['sand',90,160,300,210],['sand',905,560,350,230],['mud',915,170,290,190],['grass',160,640,285,145],['rubble',480,345,200,160]],
[['rubble',105,360,300,220],['rubble',925,125,290,200],['mud',965,625,285,180],['grass',355,140,245,180],['grass',385,645,225,190]],
[['ice',455,190,245,200],['ice',785,600,290,180],['ice',1070,120,260,195],['grass',100,645,215,160],['rubble',1130,630,200,190]],
[['sand',105,545,310,205],['sand',1000,550,300,235],['rubble',440,220,240,170],['rubble',780,210,240,165],['grass',1015,115,265,170]],
[['mud',435,175,280,200],['grass',835,150,270,185],['rubble',330,570,255,180],['rubble',865,580,260,175],['mud',105,515,210,160]]
];
for(const z of layouts[level])add(...z);
// Roads have priority over soft-ground patches; decks override both.
const roadY=[450,430,450,470,445,420,445,465,440,455][level];
add('road',662,0,116,H,'rect');add('road',0,roadY,W,92,'rect');
if(level%3===1)add('road',1160,roadY+80,76,330,'rect');
if(level%3===2)add('road',220,roadY+70,76,330,'rect');
for(const d of decks)add('bridge',d.x,d.y,d.w,d.h,'rect');
const decor=[];
for(let i=0;i<150;i++){
const x=35+rr()*(W-70),y=35+rr()*(H-70);
if(walls.some(w=>x>w.x-15&&x<w.x+w.w+15&&y>w.y-15&&y<w.y+w.h+15)||Math.hypot(x-720,y-780)<65||Math.hypot(x-720,y-884)<60)continue;
if(at({zones},x,y)===TYPES.road||at({zones},x,y)===TYPES.bridge)continue;
decor.push({x,y,r:3+rr()*8,a:rr()*TAU,kind:i%3===0?'scrub':'stones'});
}
const scene={level,biome,palette,zones,decks,decor,walls,costs:new Float32Array(600)};
for(let i=0;i<600;i++)scene.costs[i]=1/at(scene,(i%30+.5)*48,(Math.floor(i/30)+.5)*48).speed;
return scene;
}
function shape(c,z){c.beginPath();if(z.shape==='ellipse'){for(let i=0;i<=64;i++){const a=i/64*TAU,r=rim(z,a),x=z.x+z.w/2+Math.cos(a)*z.w/2*r,y=z.y+z.h/2+Math.sin(a)*z.h/2*r;if(i===0)c.moveTo(x,y);else c.lineTo(x,y);}c.closePath();}else c.rect(z.x,z.y,z.w,z.h);}
function patch(c,z,p,rr){
c.save();shape(c,z);c.clip();
const colors={sand:['#ad925d','#d1b67b'],mud:['#4c4940','#71634b'],grass:[p.grass,'#92a963'],ice:['#79a3b3','#c9e4e5'],rubble:['#74796c','#aaa891']};
const [base,light]=colors[z.kind];c.fillStyle=base;c.fillRect(z.x,z.y,z.w,z.h);
const g=c.createRadialGradient(z.x+z.w*.42,z.y+z.h*.38,5,z.x+z.w*.5,z.y+z.h*.5,z.w*.7);g.addColorStop(0,light+'60');g.addColorStop(1,base+'00');c.fillStyle=g;c.fillRect(z.x,z.y,z.w,z.h);
if(z.kind==='sand'){
for(let y=z.y-10;y<z.y+z.h+30;y+=17){c.beginPath();c.moveTo(z.x,y);c.bezierCurveTo(z.x+z.w*.3,y-22,z.x+z.w*.62,y+30,z.x+z.w,y-4);c.strokeStyle='#ddc18b45';c.lineWidth=3;c.stroke();c.translate(0,3);c.strokeStyle='#655c4240';c.lineWidth=1;c.stroke();c.translate(0,-3);}
}else if(z.kind==='mud'){
for(let i=0;i<14;i++){const x=z.x+rr()*z.w,y=z.y+rr()*z.h;c.fillStyle=i%2?'#354c4d99':'#302e2680';c.beginPath();c.ellipse(x,y,12+rr()*33,5+rr()*12,-.18,0,TAU);c.fill();c.strokeStyle='#a7b5a230';c.stroke();}
c.strokeStyle='#2e2a2580';c.lineWidth=5;for(let i=0;i<2;i++){c.beginPath();c.moveTo(z.x+20,z.y+45+i*23);c.bezierCurveTo(z.x+z.w*.4,z.y+z.h*.8+i*23,z.x+z.w*.5,z.y+i*23,z.x+z.w,z.y+z.h*.5+i*23);c.stroke();}
}else if(z.kind==='grass'){
for(let i=0;i<210;i++){const x=z.x+rr()*z.w,y=z.y+rr()*z.h,h=5+rr()*13;c.strokeStyle=i%3?'#a3b47180':'#263f2d99';c.lineWidth=1.5;c.beginPath();c.moveTo(x-4,y-2);c.lineTo(x,y-h);c.lineTo(x+1,y+2);c.moveTo(x,y);c.lineTo(x+5,y-h*.7);c.stroke();}
}else if(z.kind==='ice'){
c.strokeStyle='#e5ffff77';c.lineWidth=1.3;for(let i=0;i<9;i++){let x=z.x+rr()*z.w,y=z.y+rr()*z.h;c.beginPath();c.moveTo(x,y);for(let j=0;j<4;j++){x+=(rr()-.3)*40;y+=rr()*22;c.lineTo(x,y);}c.stroke();}c.fillStyle='#efffff20';c.beginPath();c.ellipse(z.x+z.w*.4,z.y+z.h*.35,z.w*.32,12,-.25,0,TAU);c.fill();
}else{
for(let i=0;i<90;i++){const x=z.x+rr()*z.w,y=z.y+rr()*z.h,r=3+rr()*7;c.fillStyle='#1a252847';c.fillRect(x+3,y+4,r*1.7,r);c.fillStyle=i%3?'#b0b0a0':'#586768';c.beginPath();c.moveTo(x-r,y);c.lineTo(x,y-r*.6);c.lineTo(x+r,y-r*.2);c.lineTo(x+r*.6,y+r*.5);c.closePath();c.fill();}
}
c.restore();shape(c,z);c.strokeStyle=light+'3a';c.lineWidth=2;c.stroke();
}
function road(c,z,p){
c.fillStyle='#14232335';c.fillRect(z.x-5,z.y-5,z.w+10,z.h+10);c.fillStyle=p.road;c.fillRect(z.x,z.y,z.w,z.h);
c.strokeStyle='#c6c8a944';c.lineWidth=1.5;c.strokeRect(z.x+5,z.y+5,z.w-10,z.h-10);
c.strokeStyle='#ded8ac60';c.lineWidth=2;c.setLineDash([19,27]);c.beginPath();if(z.w>z.h){c.moveTo(z.x,z.y+z.h/2);c.lineTo(z.x+z.w,z.y+z.h/2);}else{c.moveTo(z.x+z.w/2,z.y);c.lineTo(z.x+z.w/2,z.y+z.h);}c.stroke();c.setLineDash([]);
}
function deck(c,d){
c.fillStyle='#112a2b99';c.fillRect(d.x+6,d.y+9,d.w,d.h);c.fillStyle='#87724f';c.fillRect(d.x,d.y,d.w,d.h);
const horizontal=d.axis==='x';c.strokeStyle='#3b382a';c.lineWidth=2;
for(let k=0;k<(horizontal?d.w:d.h);k+=12){c.beginPath();if(horizontal){c.moveTo(d.x+k,d.y);c.lineTo(d.x+k,d.y+d.h);}else{c.moveTo(d.x,d.y+k);c.lineTo(d.x+d.w,d.y+k);}c.stroke();}
c.fillStyle='#c0aa78';if(horizontal){c.fillRect(d.x,d.y+4,d.w,6);c.fillRect(d.x,d.y+d.h-10,d.w,6);}else{c.fillRect(d.x+4,d.y,6,d.h);c.fillRect(d.x+d.w-10,d.y,6,d.h);}
c.fillStyle='#343831';for(let k=8;k<(horizontal?d.w:d.h);k+=24){if(horizontal){c.fillRect(d.x+k,d.y+5,3,3);c.fillRect(d.x+k,d.y+d.h-9,3,3);}else{c.fillRect(d.x+5,d.y+k,3,3);c.fillRect(d.x+d.w-9,d.y+k,3,3);}}
}
function obstacle(c,w,scene,index,rr){
const p=scene.palette;
if(w.hp<=0){c.fillStyle='#1a252260';c.fillRect(w.x,w.y,w.w,w.h);for(let i=0;i<30;i++){c.fillStyle=i%2?'#8a8770':'#505647';c.fillRect(w.x+rr()*w.w,w.y+rr()*w.h,4+rr()*12,3+rr()*7);}return;}
c.fillStyle='#06141a65';c.fillRect(w.x+7,w.y+10,w.w,w.h);
if(w.kind==='water'){
const g=c.createLinearGradient(w.x,w.y,w.x+w.w,w.y+w.h);g.addColorStop(0,p.water);g.addColorStop(.5,'#173f50');g.addColorStop(1,p.water);c.fillStyle=g;c.fillRect(w.x,w.y,w.w,w.h);c.strokeStyle=p.edge+'a0';c.lineWidth=6;c.strokeRect(w.x+1,w.y+1,w.w-2,w.h-2);c.strokeStyle='#a2e2dd30';c.lineWidth=1;for(let y=w.y+12;y<w.y+w.h-6;y+=16){c.beginPath();c.moveTo(w.x+7,y);c.quadraticCurveTo(w.x+w.w*.5,y+4,w.x+w.w-7,y-1);c.stroke();}return;
}
if(w.kind==='steel'&&(scene.biome==='荒漠'||scene.biome==='雪原')){
c.fillStyle=scene.biome==='雪原'?'#83999d':'#737963';c.fillRect(w.x,w.y,w.w,w.h);for(let y=w.y;y<w.y+w.h;y+=48)for(let x=w.x;x<w.x+w.w;x+=48){c.fillStyle=scene.biome==='雪原'?'#adbfbd':'#92947c';c.beginPath();c.moveTo(x+2,y+8);c.lineTo(x+25,y+2);c.lineTo(x+45,y+13);c.lineTo(x+38,y+34);c.lineTo(x+12,y+42);c.lineTo(x+1,y+25);c.closePath();c.fill();c.strokeStyle='#293b3b77';c.lineWidth=3;c.stroke();c.beginPath();c.moveTo(x+25,y+2);c.lineTo(x+22,y+21);c.lineTo(x+38,y+34);c.stroke();}return;
}
if(w.kind==='steel'&&scene.biome==='港湾'){
const colors=['#627f78','#95695a','#75899b'];c.fillStyle=colors[index%3];c.fillRect(w.x,w.y,w.w,w.h);c.fillStyle='#cad6c230';c.fillRect(w.x,w.y,w.w,5);c.strokeStyle='#112d3e80';c.lineWidth=3;for(let x=w.x+8;x<w.x+w.w;x+=12){c.beginPath();c.moveTo(x,w.y+7);c.lineTo(x,w.y+w.h-7);c.stroke();}c.fillStyle='#d5d6b980';c.font='bold 10px monospace';c.fillText('F / '+String(index+1).padStart(2,'0'),w.x+10,w.y+22);return;
}
c.fillStyle=w.kind==='steel'?'#677873':'#8f8466';c.fillRect(w.x,w.y,w.w,w.h);c.fillStyle='#d7ccaa50';c.fillRect(w.x,w.y,w.w,5);c.fillStyle='#283a3c80';c.fillRect(w.x,w.y+w.h-6,w.w,6);
for(let y=w.y;y<w.y+w.h;y+=24)for(let x=w.x;x<w.x+w.w;x+=48){c.strokeStyle='#28363588';c.lineWidth=2;c.strokeRect(x+2,y+2,44,20);c.fillStyle='#c5c7a747';c.fillRect(x+5,y+5,36,3);if(w.kind==='steel'){c.fillStyle='#354643';c.fillRect(x+12,y+10,23,6);}}
if(scene.biome==='雪原'){c.fillStyle='#e3ebe0';c.fillRect(w.x,w.y,w.w,7);}
}
function paint(c,scene,walls){
const p=scene.palette,rr=random(8101+scene.level*2137);c.fillStyle=p.base;c.fillRect(0,0,W,H);
// Large, soft soil variations avoid a flat checkerboard surface.
for(let i=0;i<95;i++){const x=rr()*W,y=rr()*H,r=50+rr()*160,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,(i%2?p.light:p.dark)+'50');g.addColorStop(1,p.base+'00');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
for(let i=0;i<6000;i++){c.fillStyle=i%2?'#ffffff13':'#122b2a15';c.fillRect(rr()*W,rr()*H,1+rr()*5,1+rr()*2);}
for(const z of scene.zones)if(z.kind!=='road'&&z.kind!=='bridge')patch(c,z,p,rr);
for(const z of scene.zones)if(z.kind==='road')road(c,z,p);
for(const d of scene.decor){c.save();c.translate(d.x,d.y);c.rotate(d.a);if(d.kind==='stones'){c.fillStyle='#24333040';c.beginPath();c.ellipse(3,3,d.r,d.r*.5,0,0,TAU);c.fill();c.fillStyle=scene.biome==='雪原'?'#d2dcd1':p.light;c.beginPath();c.ellipse(0,0,d.r,d.r*.45,0,0,TAU);c.fill();}else{c.strokeStyle=scene.biome==='雪原'?'#677f6b':p.grass;c.lineWidth=2;for(let a=0;a<6;a++){c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*d.r,Math.sin(a)*d.r);c.stroke();}}c.restore();}
// Floor-only outpost marking: decorative, never an invisible obstacle.
c.save();c.translate(1275,800);c.strokeStyle=p.edge+'4a';c.lineWidth=3;c.setLineDash([9,6]);c.beginPath();c.arc(0,0,54,0,TAU);c.stroke();c.setLineDash([]);c.font='28px monospace';c.textAlign='center';c.fillStyle=p.edge+'66';c.fillText('H',0,10);c.font='10px monospace';c.fillText('SUPPLY / '+String(scene.level+1).padStart(2,'0'),0,74);c.restore();
walls.forEach((w,i)=>obstacle(c,w,scene,i,rr));for(const d of scene.decks)deck(c,d);
c.strokeStyle=p.edge+'60';c.lineWidth=3;c.strokeRect(15,15,W-30,H-30);
for(let y=55;y<H-25;y+=100){c.fillStyle='#a8d1b35a';c.fillRect(13,y,5,16);c.fillRect(W-18,y,5,16);}
}
function animate(c,scene,time){
c.save();c.lineWidth=1;c.strokeStyle='#b1e5e82a';
for(const w of scene.walls)if(w.kind==='water'&&w.hp>0){c.save();c.beginPath();c.rect(w.x+5,w.y+5,w.w-10,w.h-10);c.clip();for(let i=0;i<3;i++){const y=w.y+((time*12+i*w.h/3)%w.h);c.beginPath();c.moveTo(w.x+9,y);c.quadraticCurveTo(w.x+w.w*.45,y+Math.sin(time+i)*5,w.x+w.w-9,y-3);c.stroke();}c.restore();}
c.restore();
}
function paintObstacles(c,scene,walls){const rr=random(9211+scene.level*127);walls.forEach((w,i)=>obstacle(c,w,scene,i,rr));for(const d of scene.decks)deck(c,d);}
return Object.freeze({TYPES,build,at,bridgeWater,paint,paintObstacles,animate,trace:shape});
})();
