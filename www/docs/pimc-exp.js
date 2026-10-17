const W = require(require("path").join(__dirname, "../js/pimcWorker.js"));
const { GallerySolitaire, mulberry32, greedyChooseMove } = W;
const inv = {0:0,2:1,3:2,1:3};
function randDeal(seed){ const r=mulberry32(seed); const d=[];
 for(let k=0;k<2;k++)for(let s=0;s<4;s++)for(let rk=1;rk<=13;rk++)d.push(inv[s]*13+rk-1);
 for(let i=d.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[d[i],d[j]]=[d[j],d[i]];} return d.join(",");}
function clone(g){const g2=new GallerySolitaire(0);g2.history=[];g2._restoreState(g._saveState());return g2;}
function det(g,r){const c=clone(g);const s=c.stock;for(let i=s.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[s[i],s[j]]=[s[j],s[i]];}return c;}
function roll(g,r){let m=0;while(m++<300){const a=greedyChooseMove(g,r);if(!a)break;g.executeMove(a,{undoable:false});}return g.calculateCurrentScore();}
function choose(g,rng,N,crn){
  let c=g.getLegalMoves(); if(!c.length)return null; if(c.length===1)return c[0];
  const seen=new Set(); c=c.filter(a=>{if(a.type!=="move_card")return true;const p=g._parseLoc(a.to);const k=a.from+"|"+JSON.stringify(g.f[p.row][p.slot]);if(seen.has(k))return false;seen.add(k);return true;});
  if(c.length===1)return c[0];
  const seeds=Array.from({length:N},()=>(rng()*2**32)>>>0);
  let best=null,bm=Infinity;
  for(const a of c){let t=0;for(let i=0;i<N;i++){const r=crn?mulberry32(seeds[i]):rng;const h=det(g,r);h.executeMove(a,{undoable:false});t+=roll(h,r);}
    const m=t/N; if(m<bm){bm=m;best=a;}}
  return best;}
function play(deal,N,crn,seed){const g=GallerySolitaire.fromDealOrder(deal);const rng=mulberry32(seed);let k=0;
  while(k++<300){const a=choose(g,rng,N,crn);if(!a)break;g.executeMove(a,{undoable:false});}return g.calculateCurrentScore();}
const [N,crn,from,to]=process.argv.slice(2).map(Number);
const out=[];const t0=Date.now();
for(let d=from;d<to;d++){out.push(play(randDeal(1000+d),N,!!crn,d+1));}
console.log(JSON.stringify({N,crn,from,to,scores:out,s:((Date.now()-t0)/1000).toFixed(0)}));
