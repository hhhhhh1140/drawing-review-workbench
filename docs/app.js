import {openPDF,renderPage,imageOf,extract} from './recognition.js?v=20261126a';
import {
  STANDARDS_INDEX, REVIEW_STATES, FUNCTIONAL_ROLES,
  buildEDM, runDesignReview, evaluateShaftHoleFit, runVersionDiffReview, fmtMm, fmtSignedMm
} from './review-engine.js?v=20261126a';

const $=id=>document.getElementById(id);
const patterns={
  shield:'M12 3 4 6v5c0 5 4 8 8 10 4-2 8-5 8-10V6z M8 12l3 3 5-6',
  audit:'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  chart:'M4 19h16M7 16V9m5 7V5m5 11v-5',
  upload:'M12 16V3m-5 5 5-5 5 5 M4 15v5h16v-5',
  download:'M12 3v13m-5-5 5 5 5-5 M4 16v5h16v-5',
  scan:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5 M7 12h10 M12 7v10',
  file:'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6m-6 4h6',
  expand:'M4 9V4h5M4 4l6 6m10 5v5h-5m5 0-6-6',
  fit:'M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4 M8 9h8v6H8z',
  minus:'M5 12h14',
  plus:'M12 5v14M5 12h14',
  list:'M8 5h13M8 12h13M8 19h13M3 5h.1M3 12h.1M3 19h.1',
  search:'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  target:'M12 2v4m10 6h-4m-6 10v-4M2 12h4 M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0 M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0',
  chevron:'m6 9 6 6 6-6',
  ruler:'m3 15 12-12 6 6L9 21z M12 6l3 3m-6 0 2 2m-5 1 3 3',
  notes:'M5 3h14v18H5z M8 8h8m-8 4h8m-8 4h5',
  history:'M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v5l4 2',
  tag:'M3 3h8l10 10-8 8L3 11z M7 7h.1',
  check:'m4 12 5 5L20 6',
  close:'m6 6 12 12M6 18 18 6'
};
const icon=k=>'<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+patterns[k]+'"/></svg>';
document.querySelectorAll('[data-icon]').forEach(el=>el.replaceWith(fragment(icon(el.dataset.icon))));
function fragment(s){const t=document.createElement('template');t.innerHTML=s;return t.content;}

const cats=['基本信息','尺寸与公差','技术要求','版本记录','其他标注'];
const catIcons=['file','ruler','notes','history','tag'];
const catColors=['#356844','#689f38','#2e7d8a','#c6842f','#75877a'];

const SAMPLES={
  flange:{key:'6b6c28e529942e8c735645da36d74424a0db9b76846d86dc030f59a652f565c0',json:'sample/flange-housing.json',pdf:'sample/flange-housing.pdf'},
  shaftV1:{key:'19cc4b650beb47395303ab96e0c9d5f627af44f6d77851b040c71f5132ed9a6a',json:'sample/motor-shaft-v1.json',pdf:'sample/motor-shaft-v1.pdf'},
  shaftV2:{key:'11e7007e59f5fb9cbac5e8842778610c20ba447185fb031efb4c49c3376fc346',json:'sample/motor-shaft-v2.json',pdf:'sample/motor-shaft-v2.pdf'},
  bore:{key:'eb8b6f4e48fe607d99bf71a2f33bfd5b7f4fb4a27d2dd91623b464f498ba2b65',json:'sample/bearing-bore.json',pdf:'sample/bearing-bore.pdf'},
  plate:{key:'907531414b5ec8f6b5d9e9cc832bc5080add7e390609f005e42f10a9734f18f7',json:'sample/sample.json',pdf:'sample/mounting-plate.pdf'}
};
const sampleCache=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let data={name:'',pages:[],items:[]},sample,key='',pdf=null,img=null,fileBlob=null,removed=new Set(),fileURLs=[],busy=false;
let preflight=null,currentEDM=null,currentReview=null;
let roleOverrides={},ruleExceptions={};
let rightMode='extract',reviewFilter='all',selectedReviewId=null;
let customDiffDoc=null;

let page=1,selected=null,filter='all',opened=new Set([cats[0],cats[1]]),limits={},marks=true,boxing=false,drag=null;
let z=1,dx=0,dy=0,base=1,pageSeq=0,docSeq=0,showTimer;

function toast(s){$('toast').textContent=s;$('toast').style.display='block';clearTimeout(showTimer);showTimer=setTimeout(()=>$('toast').style.display='none',4500);}
const idb=new Promise((resolve,reject)=>{const req=indexedDB.open('drawing-desk-review',1);req.onupgradeneeded=()=>req.result.createObjectStore('drawings');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
idb.catch(()=>{});
async function dbRead(k){const db=await idb;return new Promise((res,rej)=>{const r=db.transaction('drawings').objectStore('drawings').get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function persist(){
  if(!key)return;
  const docKey=key,record={items:structuredClone(data.items),removed:[...removed],name:data.name,blob:fileBlob,roleOverrides,ruleExceptions};
  try{const db=await idb;await new Promise((res,rej)=>{const t=db.transaction('drawings','readwrite');const s=t.objectStore('drawings');s.put(record,docKey);s.put(docKey,'current');t.oncomplete=res;t.onabort=t.onerror=()=>rej(t.error);});}
  catch{toast('浏览器未能保存本次更改，请导出结果留存。');}
}

async function fetchPresetJson(name){
  if(!sampleCache.has(name)){
    const res=await fetch(SAMPLES[name].json);
    if(!res.ok)throw Error('样图未就绪');
    sampleCache.set(name,await res.json());
  }
  return sampleCache.get(name);
}
async function loadPreset(name){
  sample=await fetchPresetJson(name);
  document.querySelectorAll('[data-sample]').forEach(b=>b.classList.toggle('active',b.dataset.sample===name));
  const dl=$('samplePdfLink');if(dl){dl.href=SAMPLES[name].pdf;dl.hidden=false;}
  return SAMPLES[name].key;
}
function isPresetKey(k){return Object.values(SAMPLES).some(s=>s.key===k);}
function syncPresetState(docKey){
  const entry=Object.entries(SAMPLES).find(([,v])=>v.key===docKey);
  document.querySelectorAll('[data-sample]').forEach(b=>b.classList.toggle('active',entry?.[0]===b.dataset.sample));
  const dl=$('samplePdfLink');if(dl){if(entry){dl.href=entry[1].pdf;dl.hidden=false;}else dl.hidden=true;}
}

function setBusy(flag,msg=''){
  busy=flag;for(const id of ['recognize','upload','add','export','runAuditBtn'])$(id).disabled=flag;
  document.querySelectorAll('[data-sample]').forEach(b=>b.disabled=flag);
  $('progress').hidden=!flag;$('list').inert=flag;$('editor').inert=flag;$('reviewList').inert=flag;
  if(flag){$('progressText').textContent=msg;$('progress').querySelector('progress').value=0;}
}
function progress(msg,fraction){$('progressText').textContent=msg;$('progress').querySelector('progress').value=Math.round(fraction*100);}
function teardown(){fileURLs.forEach(URL.revokeObjectURL);fileURLs=[];if(img)URL.revokeObjectURL(img.src);if(pdf)pdf.destroy().catch(()=>{});}

function switchRightMode(mode){
  rightMode=mode;
  $('modeExtract').classList.toggle('active',mode==='extract');
  $('modeExtract').setAttribute('aria-selected',String(mode==='extract'));
  $('modeReview').classList.toggle('active',mode==='review');
  $('modeReview').setAttribute('aria-selected',String(mode==='review'));
  $('extractPane').hidden=mode!=='extract';
  $('reviewPane').hidden=mode!=='review';
  $('add').hidden=mode!=='extract';
  $('viewModeLabel').textContent=mode==='review'?'评审问题与原图证据定位':'图纸矢量预览与定位';
  paintMarks();
}
$('modeExtract').onclick=()=>switchRightMode('extract');
$('modeReview').onclick=()=>switchRightMode('review');
$('runAuditBtn').onclick=()=>{
  recomputeReviewAndEDM();
  switchRightMode('review');
  const firstIssue=currentReview?.results.find(r=>r.status==='FAIL'||r.status==='UNKNOWN'||r.status==='WARNING');
  if(firstIssue)focusReviewIssue(firstIssue.id,true);
  toast(`已完成 ${currentReview?.results.length||0} 项工程规则审核：不通过 ${currentReview?.counts.FAIL||0} · 风险 ${currentReview?.counts.WARNING||0} · 待确认 ${currentReview?.counts.UNKNOWN||0}`);
};

async function startDoc(file,docKey,record,initial=false){
  let newPdf=null,newImg=null,pages=[];
  const presetEntry=Object.entries(SAMPLES).find(([,v])=>v.key===docKey);
  if(presetEntry&&!file){
    await loadPreset(presetEntry[0]);
    pages=structuredClone(sample.pages);
  }else if(!file){
    throw Error('历史缓存图纸已失效，请重新上传');
  }else if(file.type==='application/pdf'||/\.pdf$/i.test(file.name??record?.name)){
    newPdf=await openPDF(new Uint8Array(await file.arrayBuffer()));
    try{for(let i=1;i<=newPdf.numPages;i++){const p=await newPdf.getPage(i),v=p.getViewport({scale:1});pages.push({width:v.width,height:v.height});}}
    catch(e){await newPdf.destroy();throw e;}
  }else{newImg=await imageOf(file);pages=[{width:newImg.naturalWidth,height:newImg.naturalHeight,image:newImg.src}];}
  docSeq++;teardown();pdf=newPdf;img=newImg;key=docKey;fileBlob=file||null;preflight=null;
  syncPresetState(docKey);
  const useSavedItems=record?.items&&(!isPresetKey(key)||record.items.some(i=>i.edited)||(record.removed?.length>0));
  data={name:file?.name||record?.name||sample.name,pages,items:useSavedItems?record.items:(initial&&isPresetKey(key)?structuredClone(sample.items):[])};
  removed=new Set(useSavedItems?(record?.removed??[]):[]);
  roleOverrides=record?.roleOverrides||{};
  ruleExceptions=record?.ruleExceptions||{};
  selected=null;selectedReviewId=null;page=1;filter='all';limits={};opened=new Set([cats[0],cats[1]]);
  $('search').value='';$('editor').hidden=true;cancelBox();$('filename').textContent=data.name;
  const isPDF=isPresetKey(key)||!!pdf;
  $('fileinfo').textContent=[isPDF?'PDF 工程图纸':'图纸图像',pages.length+' 页',!file&&isPresetKey(key)?'内置样图':(file.size/1048576).toFixed(2)+' MB'].join('  ·  ');
  await showPage(1);renderList();await persist();
}

async function showPage(n){
  if(!data.pages[n-1])return;
  page=n;const seq=++pageSeq,p=data.pages[n-1];$('pageno').textContent=n+' / '+data.pages.length;
  $('prev').disabled=n===1;$('next').disabled=n===data.pages.length;
  if(!p.image&&pdf){
    const canvas=await renderPage(await pdf.getPage(n),3800);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));canvas.width=canvas.height=0;
    if(seq!==pageSeq)return;
    p.image=URL.createObjectURL(blob);fileURLs.push(p.image);
  }
  if(seq!==pageSeq)return;
  $('paper').src=p.image;fit();
}
function fit(){z=1;dx=dy=0;layout();}
function layout(){
  const p=data.pages[page-1];if(!p)return;
  const v=$('viewport'),s=$('sheet');
  base=Math.min((v.clientWidth-36)/p.width,(v.clientHeight-76)/p.height);
  if(base<=0)return;
  const w=p.width*base*z,h=p.height*base*z;
  dx=Math.max(-w/2,Math.min(w/2,dx));dy=Math.max(-h/2,Math.min(h/2,dy));
  s.style.width=w+'px';s.style.height=h+'px';s.style.left=((v.clientWidth-w)/2+dx)+'px';s.style.top=((v.clientHeight-h)/2+dy)+'px';
  $('zoom').textContent=Math.round(z*100)+'%';$('less').disabled=z<=.5;$('more').disabled=z>=20;
  paintMarks();
}
function zoomTo(value,point){
  const v=$('viewport'),ratio=Math.min(20,Math.max(.5,value))/z;
  const x=point?point[0]-v.clientWidth/2:0,y=point?point[1]-v.clientHeight/2:0;
  dx=x-(x-dx)*ratio;dy=y-(y-dy)*ratio;z*=ratio;layout();
}
function boxStyle(b){return 'left:'+b[0]*100+'%;top:'+b[1]*100+'%;width:'+b[2]*100+'%;height:'+b[3]*100+'%';}

function paintMarks(){
  const o=$('overlay');if(!marks||boxing){o.replaceChildren();return;}
  const w=$('sheet').offsetWidth,h=$('sheet').offsetHeight;
  if(rightMode==='review'&&currentReview){
    const revItems=currentReview.results.filter(r=>r.page===page&&r.box);
    // Prioritize FAIL / UNKNOWN / WARNING markers on canvas
    const rank={FAIL:0,UNKNOWN:1,WARNING:2,PASS:3,APPROVED_EXCEPTION:4,NOT_APPLICABLE:5};
    const sorted=[...revItems].sort((a,b)=>(rank[a.status]??9)-(rank[b.status]??9));
    const occupied=[],html=[];
    for(const r of sorted){
      const b=r.box,curr=selectedReviewId===r.id,cx=(b[0]+b[2]/2)*w,cy=(b[1]+b[3]/2)*h;
      const cls='rev-'+r.status;
      if(!curr&&z<1.7){
        if(r.status==='PASS'&&occupied.length>=6)continue;
        if(occupied.some(([x,y])=>Math.abs(cx-x)<w*.11&&Math.abs(cy-y)<h*.11))continue;
        occupied.push([cx,cy]);
      }
      const tag=r.ruleId.replace(/^R-/,''),attrs='data-revid="'+esc(r.id)+'" title="'+esc('['+r.status+'] '+r.title+' · '+r.actualValue)+'" aria-label="'+esc('定位评审项 '+r.title)+'"';
      if(!curr&&z<1.7)html.push('<button class="cluster '+cls+'" '+attrs+' style="left:'+((b[0]+b[2]/2)*100)+'%;top:'+(b[1]*100)+'%">'+esc(tag)+'</button>');
      else html.push('<button class="box '+cls+' '+(curr?'current':'')+'" '+attrs+' data-tag="'+esc(r.status+' · '+r.ruleId+' '+r.title)+'" style="'+boxStyle(b)+'"></button>');
    }
    o.innerHTML=html.join('');
    return;
  }

  const ordered=data.items.filter(i=>i.page===page&&i.box),occupied=[];
  const html=[];for(const item of ordered){
    const b=item.box,curr=selected===item.id,cx=(b[0]+b[2]/2)*w,cy=(b[1]+b[3]/2)*h;
    if(!curr&&z<1.7){
      if(occupied.some(([x,y])=>Math.abs(cx-x)<w*.13&&Math.abs(cy-y)<h*.13)||occupied.length>=14)continue;
      occupied.push([cx,cy]);
    }
    const tag=String(data.items.indexOf(item)+1).padStart(2,'0'),attrs='data-id="'+esc(item.id)+'" title="'+esc(item.label+' · '+item.value)+'" aria-label="'+esc('定位 '+item.label+' '+item.value)+'"';
    if(!curr&&z<1.7)html.push('<button class="cluster" '+attrs+' style="left:'+((b[0]+b[2]/2)*100)+'%;top:'+(b[1]*100)+'%">'+tag+'</button>');
    else html.push('<button class="box '+(curr?'current':'')+'" '+attrs+' data-tag="'+esc(tag+' · '+item.label)+'" style="'+boxStyle(b)+'"></button>');
  }
  o.innerHTML=html.join('');
}

function computeAudit(items){
  const total=items.length;
  const byCat=cats.map(c=>items.filter(i=>i.category===c).length);
  const basic=items.filter(i=>i.category==='基本信息'&&i.label!=='图栏文字');
  const core=[
    ['名称',basic.some(b=>/名称|品名|NAME/i.test(b.label)&&b.value)],
    ['图号',basic.some(b=>/图号|编号|编码|CODE|DWG/i.test(b.label)&&b.value)],
    ['材料',basic.some(b=>/材料|材质|MATERIAL/i.test(b.label)&&b.value)],
    ['比例',basic.some(b=>/比例|SCALE|页次|SHEET/i.test(b.label)&&b.value)],
    ['版本',basic.some(b=>/版本|REV/i.test(b.label)&&b.value)]
  ];
  const coreHit=core.filter(([,ok])=>ok).length;
  const balloons=new Set();let unpaired=0;
  for(const it of items){
    for(const m of String(it.label).matchAll(/【(\d+)】/g))balloons.add(m[1]);
    if(/^【\d+】$/.test(String(it.value).trim()))unpaired++;
  }
  const pdfCnt=items.filter(i=>i.source==='PDF'||!i.source).length;
  const ocrCnt=items.filter(i=>i.source==='OCR').length;
  const manCnt=items.filter(i=>i.source==='手工').length;
  const confirmed=items.filter(i=>!i.review).length;
  const gdtCnt=items.filter(i=>/[⊥▱∥≡○◎⌖↗⇗]/.test(i.value)).length;
  return {total,byCat,core,coreHit,balloonPaired:balloons.size,unpaired,pdfCnt,ocrCnt,manCnt,confirmed,gdtCnt};
}

function renderAnalytics(){
  const a=computeAudit(data.items);
  const mv=$('miniViz'),la=$('liveAnalytics'),tag=$('liveDocTag');
  if(tag)tag.textContent=data.name+' · 共 '+a.total+' 项';
  if(!a.total){
    if(mv)mv.hidden=true;
    if(la)la.innerHTML='<div class="blank">暂无提取项，请点击上方「AI 识别」提取当前图纸数据。</div>';
    return;
  }
  if(mv){
    mv.hidden=false;
    const segs=a.byCat.map((n,i)=>n?'<i style="flex:'+n+';background:'+catColors[i]+'" title="'+cats[i]+' '+n+' 项"></i>':'').join('');
    const chips=a.byCat.map((n,i)=>n?'<button class="mchip" data-jumpcat="'+cats[i]+'"><span class="dot" style="background:'+catColors[i]+'"></span>'+cats[i]+' <b>'+n+'</b></button>':'').join('');
    const bTxt=a.balloonPaired?'<span class="mpill">气泡号 '+a.balloonPaired+' 项已绑定</span>':'';
    mv.innerHTML='<div class="segbar">'+segs+'</div><div class="minichips">'+chips+'<span class="mpill">图栏核心 '+a.coreHit+'/5</span>'+bTxt+'</div>';
  }
  if(la){
    const bars=cats.map((c,i)=>{
      const n=a.byCat[i],pct=Math.round(n/a.total*100);
      return '<div class="distrow"><span>'+c+'</span><div class="disttrack"><i style="width:'+pct+'%;background:'+catColors[i]+'"></i></div><b>'+n+' ('+pct+'%)</b></div>';
    }).join('');
    const bStatus=a.balloonPaired?(a.balloonPaired+' / '+(a.balloonPaired+a.unpaired)+(a.unpaired?'':' (100%)')):'无气泡号';
    la.innerHTML='<div class="statgrid">'
      +'<div class="statbox"><span>结构化提取总数</span><strong>'+a.total+'</strong><small>PDF矢量 '+a.pdfCnt+' · 靶向OCR '+a.ocrCnt+(a.manCnt?' · 补录 '+a.manCnt:'')+'</small></div>'
      +'<div class="statbox"><span>形位公差与尺寸公差</span><strong>'+(a.byCat[1])+'</strong><small>含 '+a.gdtCnt+' 处几何公差框解码</small></div>'
      +'<div class="statbox"><span>人工校核确认进度</span><strong>'+a.confirmed+' / '+a.total+'</strong><small>已剔除误检 '+removed.size+' 项</small></div>'
      +'</div><div class="distlist">'+bars+'</div>'
      +'<div class="auditgrid">'
      +'<div class="audititem"><span>标题栏核心五项完备度</span><b>'+a.coreHit+' / 5 完备</b></div>'
      +'<div class="audititem"><span>检验气泡号【N】绑定</span><b>'+bStatus+'</b></div>'
      +'<div class="audititem"><span>智能规则审核问题数</span><b>'+(currentReview?`${currentReview.counts.FAIL} 不通过 / ${currentReview.counts.WARNING} 风险`:'0')+'</b></div>'
      +'<div class="audititem"><span>自动化审核覆盖率</span><b>'+(currentReview?`${currentReview.autoCoveragePct}%`:'—')+'</b></div>'
      +'</div>';
  }
}

// --- Engineering Review & 5-Layer EDM Studio Rendering ---
function recomputeReviewAndEDM(){
  currentEDM=buildEDM(data,preflight,roleOverrides);
  currentReview=runDesignReview(currentEDM,{exceptions:ruleExceptions});
  const pf=$('preflightBadge');
  if(pf){
    const m=currentEDM.L2_Specifications.metadata;
    pf.textContent=`${currentEDM.L1_Observation.primaryMode} · 图幅 ${m.sheetSize||'自适应'}`;
  }
  const alerts=(currentReview.counts.FAIL||0)+(currentReview.counts.WARNING||0)+(currentReview.counts.UNKNOWN||0);
  $('auditAlertCount').textContent=alerts;
  renderReviewPane();
  renderEDMPanel();
  populateFitSelectors();
  renderVersionDiffPanel();
}

function renderReviewPane(){
  if(!currentReview)return;
  const c=currentReview.counts;
  $('reviewSummaryBar').innerHTML=
    `<div class="rsumcell fail"><small>不通过 FAIL</small><b>${c.FAIL||0}</b></div>`+
    `<div class="rsumcell warn"><small>风险提示 WARN</small><b>${c.WARNING||0}</b></div>`+
    `<div class="rsumcell unk"><small>待确认 UNKNOWN</small><b>${c.UNKNOWN||0}</b></div>`+
    `<div class="rsumcell cov"><small>自动覆盖率</small><b>${currentReview.autoCoveragePct}%</b></div>`;

  const all=currentReview.results;
  const issuesCnt=all.filter(r=>r.status==='FAIL'||r.status==='WARNING').length;
  const unkCnt=all.filter(r=>r.status==='UNKNOWN').length;
  const passCnt=all.filter(r=>r.status==='PASS'||r.status==='APPROVED_EXCEPTION').length;
  $('rfAll').textContent=all.length;
  $('rfIssues').textContent=issuesCnt;
  $('rfUnknown').textContent=unkCnt;
  $('rfPass').textContent=passCnt;
  document.querySelectorAll('[data-rfilter]').forEach(b=>b.classList.toggle('active',b.dataset.rfilter===reviewFilter));

  const filtered=all.filter(r=>{
    if(reviewFilter==='issues')return r.status==='FAIL'||r.status==='WARNING';
    if(reviewFilter==='unknown')return r.status==='UNKNOWN';
    if(reviewFilter==='pass')return r.status==='PASS'||r.status==='APPROVED_EXCEPTION';
    return true;
  });

  if(!data.items.length){
    $('reviewList').innerHTML='<div class="blank">当前图纸尚未提取数据，请先点击上方「AI 识别」再执行智能审核。</div>';
    return;
  }
  if(!filtered.length){
    $('reviewList').innerHTML='<div class="blank">当前筛选条件下没有对应的规则项。</div>';
    return;
  }

  $('reviewList').innerHTML=filtered.map(r=>{
    const stInfo=REVIEW_STATES[r.status]||REVIEW_STATES.UNKNOWN;
    const isDemo=r.standard.sourceType==='demo_simulated';
    const stdHtml=r.standard.url
      ? `<a class="stdtag" href="${esc(r.standard.url)}" target="_blank" rel="noopener" title="${esc(r.standard.title)}" onclick="event.stopPropagation()">${esc(r.standard.code)} ↗</a>`
      : `<span class="stdtag demo" title="${esc(r.standard.title)}">${esc(r.standard.code)} · 模拟规则</span>`;

    let actionHtml='';
    if(r.confirmTarget){
      const opts=FUNCTIONAL_ROLES.map(fr=>`<option value="${fr.id}" ${fr.id===r.confirmTarget.currentRole?'selected':''}>${esc(fr.label)}</option>`).join('');
      actionHtml+=`<div class="rcactions" onclick="event.stopPropagation()">
        <span style="font-size:11.5px;color:#39557a;font-weight:600">工程语义确认：</span>
        <select data-role-item="${esc(r.confirmTarget.itemId)}" aria-label="确认目标表面功能角色">${opts}</select>
      </div>`;
    }
    if(r.status==='FAIL'||r.status==='WARNING'){
      actionHtml+=`<div class="rcactions" onclick="event.stopPropagation()">
        <button data-approve-exc="${esc(r.ruleId)}">登记偏离批准 (Exception)</button>
        ${r.evidenceId?`<button class="pri" data-jump-item="${esc(r.evidenceId)}">跳转校核原条目</button>`:''}
      </div>`;
    }else if(r.status==='APPROVED_EXCEPTION'){
      actionHtml+=`<div class="rcactions" onclick="event.stopPropagation()">
        <button data-clear-exc="${esc(r.ruleId)}">撤销偏离放行</button>
      </div>`;
    }

    return `<article class="rcard st-${r.status} ${selectedReviewId===r.id?'active':''}" data-revcard="${esc(r.id)}">
      <div class="rctop">
        <span class="stpill ${r.status}">${stInfo.label} (${r.status})</span>
        <span class="rulecode">${esc(r.ruleId)} · ${esc(r.dimension)}</span>
        ${stdHtml}
      </div>
      <strong style="font-size:14px;color:#1d2d22">${esc(r.title)}</strong>
      <div class="rcgrid">
        <div><b>实际设计值：</b>${esc(r.actualValue)}</div>
        <div><b>规范/规则约束：</b>${esc(r.requiredValue)}</div>
        ${r.status!=='PASS'&&r.status!=='NOT_APPLICABLE'?`<div><b>潜在工程风险：</b>${esc(r.risk)}</div>`:''}
      </div>
      ${r.status!=='PASS'&&r.status!=='NOT_APPLICABLE'?`<div class="rcsuggest"><b>整改/处理建议：</b>${esc(r.suggestion)}</div>`:''}
      ${actionHtml}
    </article>`;
  }).join('');
}

async function focusReviewIssue(revId,move=true){
  if(!currentReview)return;
  const r=currentReview.results.find(x=>x.id===revId);if(!r)return;
  selectedReviewId=revId;
  if(r.page&&page!==r.page)await showPage(r.page);
  if(move&&r.box){
    const p=data.pages[page-1],b=r.box,v=$('viewport');
    marks=true;$('marks').setAttribute('aria-checked','true');
    z=Math.max(1.5,Math.min(7.5,(v.clientWidth*.52)/(b[2]*base*p.width),(v.clientHeight*.40)/(b[3]*base*p.height)));
    dx=(.5-b[0]-b[2]/2)*base*p.width*z;dy=(.5-b[1]-b[3]/2)*base*p.height*z;layout();
  }
  renderReviewPane();paintMarks();
}

document.querySelector('.revtabs').onclick=e=>{
  const b=e.target.closest('[data-rfilter]');if(!b)return;
  reviewFilter=b.dataset.rfilter;renderReviewPane();
};
$('reviewList').onclick=e=>{
  const excBtn=e.target.closest('[data-approve-exc]');
  if(excBtn){
    const rid=excBtn.dataset.approveExc;
    const note=prompt(`请输入规则 ${rid} 的偏离批准单号或专家签审说明：`,'ECN-2026-偏离批准');
    if(note&&note.trim()){ruleExceptions[rid]=note.trim();recomputeReviewAndEDM();renderAnalytics();persist();toast(`已登记 ${rid} 偏离放行`);}
    return;
  }
  const clrBtn=e.target.closest('[data-clear-exc]');
  if(clrBtn){
    delete ruleExceptions[clrBtn.dataset.clearExc];
    recomputeReviewAndEDM();renderAnalytics();persist();return;
  }
  const jumpBtn=e.target.closest('[data-jump-item]');
  if(jumpBtn){
    switchRightMode('extract');selectItem(jumpBtn.dataset.jumpItem,true);return;
  }
  const card=e.target.closest('[data-revcard]');
  if(card&&!e.target.closest('select,a,button'))focusReviewIssue(card.dataset.revcard,true);
};
$('reviewList').onchange=e=>{
  const sel=e.target.closest('[data-role-item]');
  if(!sel)return;
  roleOverrides[sel.dataset.roleItem]=sel.value;
  recomputeReviewAndEDM();renderAnalytics();persist();
  toast('已更新表面工程功能角色并重新执行规则计算');
};

function renderEDMPanel(){
  const el=$('edmPanel'),tag=$('edmPartTag');
  if(!el||!currentEDM)return;
  const {L1_Observation:obs,L2_Specifications:spec,L3_Features:feats,L5_Context:ctx}=currentEDM;
  if(tag)tag.textContent=`${ctx.partFamilyLabel} · 特征 ${feats.length} 项`;
  if(!obs.totalItems){
    el.innerHTML='<div class="blank">等待提取图纸事实后构建五层 EDM 模型。</div>';return;
  }
  const gtStr=spec.generalTolerance
    ?(spec.generalTolerance.type==='standard'?`${spec.generalTolerance.standard}-${spec.generalTolerance.grade}`:`全局 ±${spec.generalTolerance.explicitMm} mm`)
    :'未声明未注公差';
  const rowsHtml=feats.slice(0,18).map(f=>{
    const d=f.dim;
    const lim=(d.minLimit!=null&&d.maxLimit!=null)?`[${fmtMm(d.minLimit)} ~ ${fmtMm(d.maxLimit)}]`:(d.tolType==='theoretical'?'理论精确框':(d.tolType==='reference'?'参考尺寸':'继承未注公差'));
    const rels=[
      ...f.linkedGDTs.map(g=>`${g.symbol}${g.value}`),
      ...f.linkedRoughness.map(r=>`${r.param}${r.value}`)
    ].join(' · ')||'—';
    return `<tr data-edm-item="${esc(d.id)}" title="点击在原图中定位该工程特征">
      <td><code>${f.featureId}</code></td>
      <td>${esc(f.featureType.replace('Cylindrical','圆柱').replace('PatternHoles','孔组').replace('LinearDimension','线性尺寸').replace('FilletOrRadius','圆角半径').replace('ChamferOrAngle','倒角/角度'))}</td>
      <td><b>${esc(d.raw)}</b></td>
      <td style="font-family:ui-monospace,monospace">${esc(lim)}</td>
      <td>${esc(rels)}</td>
    </tr>`;
  }).join('');

  el.innerHTML=`<div class="edmlayers">
    <div class="edmlayer"><span>L1 · 原始观测与覆盖预检</span><b>${esc(obs.primaryMode)}</b><small>观测条目 ${obs.totalItems}（PDF ${obs.pdfItems} / OCR ${obs.ocrItems}）· 覆盖完整度：${obs.coverageComplete?'完整可读':'局部待人工核实'}</small></div>
    <div class="edmlayer"><span>L2 · 标准化工程规格</span><b>尺寸 ${spec.dimensions.length} · 形位公差 ${spec.gdts.length} · 粗糙度 ${spec.roughness.length}</b><small>已定义基准：[${spec.datumsDefined.map(d=>d.letter).join(', ')||'无'}] · 默认公差：${esc(gtStr)}</small></div>
    <div class="edmlayer"><span>L3 · 几何特征与关联绑定</span><b>恢复 ${feats.length} 个特征实例</b><small>自动建立尺寸 ↔ 形位公差框 ↔ 粗糙度空间邻近约束</small></div>
    <div class="edmlayer"><span>L4/L5 · 功能角色与零件域</span><b>${esc(ctx.partFamilyLabel)}</b><small>材料：${esc(spec.metadata.material||'未标')} · 支持工程师确认轴承安装面/密封面角色</small></div>
  </div>
  <div class="featlist">
    <table class="feattable">
      <thead><tr><th>特征ID</th><th>几何类型</th><th>原始标注</th><th>解析极限尺寸 (mm)</th><th>绑定公差/粗糙度</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </div>`;
}
$('edmPanel')?.addEventListener('click',e=>{
  const tr=e.target.closest('[data-edm-item]');
  if(tr){selectItem(tr.dataset.edmItem,true);$('viewport')?.scrollIntoView({behavior:'smooth',block:'center'});}
});

// --- Cross-Drawing Shaft-Hole Fit Calculator ---
let fitPool={shafts:[],holes:[]};
async function populateFitSelectors(presetMode=null){
  const shaftSel=$('fitShaftSel'),holeSel=$('fitHoleSel');
  if(!shaftSel||!holeSel)return;
  const s1=await fetchPresetJson('shaftV1').catch(()=>null);
  const s2=await fetchPresetJson('shaftV2').catch(()=>null);
  const bore=await fetchPresetJson('bore').catch(()=>null);
  const flange=await fetchPresetJson('flange').catch(()=>null);

  const shafts=[],holes=[];
  // Add current doc cylindrical dimensions first!
  if(currentEDM){
    for(const f of currentEDM.L3_Features){
      const d=f.dim;
      if(d.prefix==='⌀'&&d.minLimit!=null&&d.maxLimit!=null){
        if(f.featureType==='CylindricalHole'||f.featureType==='PatternHoles')holes.push({key:`cur::${d.id}`,label:`[当前图纸] ${d.raw} ([${fmtMm(d.minLimit)}~${fmtMm(d.maxLimit)}])`,dim:d});
        else shafts.push({key:`cur::${d.id}`,label:`[当前图纸] ${d.raw} ([${fmtMm(d.minLimit)}~${fmtMm(d.maxLimit)}])`,dim:d});
      }
    }
  }
  const addFromPreset=(docJson,tag,wantHole)=>{
    if(!docJson)return;
    const edm=buildEDM(docJson);
    for(const d of edm.L2_Specifications.dimensions){
      if(d.prefix==='⌀'&&d.minLimit!=null&&d.maxLimit!=null){
        const isH=d.isoLookup?d.isoLookup.isHole:wantHole;
        const entry={key:`${tag}::${d.id}`,label:`[${tag}] ${d.raw} ([${fmtMm(d.minLimit)}~${fmtMm(d.maxLimit)}])`,dim:d};
        if(isH)holes.push(entry);else shafts.push(entry);
      }
    }
  };
  addFromPreset(s1,'电机轴V1',false);
  addFromPreset(s2,'电机轴V2',false);
  addFromPreset(bore,'端盖配合孔',true);
  addFromPreset(flange,'法兰座孔',true);

  fitPool={shafts,holes};
  const prevS=shaftSel.value,prevH=holeSel.value;
  shaftSel.innerHTML=shafts.map((s,i)=>`<option value="${i}">${esc(s.label)}</option>`).join('');
  holeSel.innerHTML=holes.map((h,i)=>`<option value="${i}">${esc(h.label)}</option>`).join('');

  if(presetMode==='v1'){
    const si=shafts.findIndex(s=>s.label.includes('电机轴V1')&&s.dim.isoZone==='h6');
    const hi=holes.findIndex(h=>h.label.includes('端盖配合孔')&&h.dim.isoZone==='H7');
    if(si>=0)shaftSel.value=String(si);if(hi>=0)holeSel.value=String(hi);
  }else if(presetMode==='v2'){
    const si=shafts.findIndex(s=>s.label.includes('电机轴V2')&&s.dim.isoZone==='h6');
    const hi=holes.findIndex(h=>h.label.includes('端盖配合孔')&&h.dim.isoZone==='H7');
    if(si>=0)shaftSel.value=String(si);if(hi>=0)holeSel.value=String(hi);
  }else{
    // Default smart pairing: match nominal diameter if possible
    const si=shafts.findIndex(s=>s.dim.nominal===12);
    const hi=holes.findIndex(h=>h.dim.nominal===12);
    if(prevS&&shafts[+prevS])shaftSel.value=prevS;else if(si>=0)shaftSel.value=String(si);
    if(prevH&&holes[+prevH])holeSel.value=prevH;else if(hi>=0)holeSel.value=String(hi);
  }
  recalcFitUI();
}

function recalcFitUI(){
  const box=$('fitResultBox');if(!box)return;
  const s=fitPool.shafts[+$('fitShaftSel').value]?.dim;
  const h=fitPool.holes[+$('fitHoleSel').value]?.dim;
  const minA=parseFloat($('fitMinInput').value)||0;
  const maxA=parseFloat($('fitMaxInput').value)||0.030;
  const res=evaluateShaftHoleFit(s,h,{minAllowedMm:minA,maxAllowedMm:maxA});
  if(res.status==='UNKNOWN'){
    box.innerHTML=`<div><span class="stpill UNKNOWN">待补充公差</span> ${esc(res.message)}</div>`;return;
  }
  box.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
      <div><span class="stpill ${res.status}">${res.status==='PASS'?'配合合格 (PASS)':'配合异常 (FAIL)'}</span> <b style="margin-left:6px">${esc(res.fitType)}</b></div>
      <span class="stdtag demo">模拟配合阈值 [${fmtMm(minA)} ~ ${fmtMm(maxA)}] mm</span>
    </div>
    <div class="fitkpis">
      <div class="fitkpi"><small>轴极限尺寸 (${esc(res.shaftRaw)})</small><b>${fmtMm(res.shaftLimits[0])} ~ ${fmtMm(res.shaftLimits[1])} mm</b></div>
      <div class="fitkpi"><small>孔极限尺寸 (${esc(res.holeRaw)})</small><b>${fmtMm(res.holeLimits[0])} ~ ${fmtMm(res.holeLimits[1])} mm</b></div>
      <div class="fitkpi"><small>计算极限间隙 (孔 − 轴)</small><b style="color:${res.status==='PASS'?'#265d2d':'#b82e1f'}">${fmtSignedMm(res.minClearanceMm)} ~ ${fmtSignedMm(res.maxClearanceMm)} mm</b></div>
    </div>
    <div style="color:#36473a;line-height:1.45">${esc(res.conclusion)}</div>`;
}
['fitShaftSel','fitHoleSel','fitMinInput','fitMaxInput'].forEach(id=>$(id)?.addEventListener('input',recalcFitUI));
$('fitPresetV1')?.addEventListener('click',()=>populateFitSelectors('v1'));
$('fitPresetV2')?.addEventListener('click',()=>populateFitSelectors('v2'));

// --- Cross-Version Semantic Diff & Impacted Re-Review ---
async function resolveDiffDoc(selVal){
  if(selVal==='current')return data;
  if(selVal==='uploaded'&&customDiffDoc)return customDiffDoc;
  return await fetchPresetJson(selVal).catch(()=>data);
}
async function renderVersionDiffPanel(){
  const panel=$('diffPanel');if(!panel)return;
  const v1Doc=await resolveDiffDoc($('diffV1Sel').value);
  const v2Doc=await resolveDiffDoc($('diffV2Sel').value);
  if(!v1Doc||!v2Doc)return;

  // Apply BearingSeat role to roughness on motor shaft demos so V1->V2 closure & regression show clearly!
  const buildWithDemoRole=doc=>{
    const tmp=buildEDM(doc);
    const ov={...roleOverrides};
    if(tmp.L5_Context.partFamily==='motor_shaft'){
      for(const r of tmp.L2_Specifications.roughness)if(!ov[r.id])ov[r.id]='BearingSeat';
    }
    return buildEDM(doc,null,ov);
  };
  const edm1=buildWithDemoRole(v1Doc),rev1=runDesignReview(edm1);
  const edm2=buildWithDemoRole(v2Doc),rev2=runDesignReview(edm2);

  // If V2 is motor shaft, check mating boreBH108-V1 automatically!
  let fitCheckV2=null;
  if(edm2.L5_Context.partFamily==='motor_shaft'){
    const boreDoc=await fetchPresetJson('bore').catch(()=>null);
    if(boreDoc){
      const edmB=buildEDM(boreDoc);
      const sDim=edm2.L2_Specifications.dimensions.find(d=>d.isoZone==='h6');
      const hDim=edmB.L2_Specifications.dimensions.find(d=>d.isoZone==='H7');
      if(sDim&&hDim)fitCheckV2=evaluateShaftHoleFit(sDim,hDim);
    }
  }
  const diff=runVersionDiffReview(edm1,rev1,edm2,rev2,fitCheckV2);

  const modHtml=diff.modified.length
    ? diff.modified.map(m=>`<div class="diffitem">
        <div><b>${esc(m.label)}</b>：<del>${esc(m.oldVal)}</del> → <ins>${esc(m.newVal)}</ins></div>
        ${m.impactRules.length?`<small style="color:#536657">触发重检规则：${esc(m.impactRules.join('、'))}</small>`:''}
      </div>`).join('')
    : '<div class="diffitem">两版本间无字段数值差异（共 '+diff.unchangedCount+' 项一致）。</div>';

  const resHtml=diff.resolvedIssues.map(r=>`<div class="diffitem" style="border-left:3px solid #2e7d41">
    <div><span class="stpill PASS">建议关闭 (${r.from}→${r.to})</span> <b>${esc(r.ruleId)} ${esc(r.title)}</b></div>
    <small>${esc(r.detail)}</small>
  </div>`).join('');

  const regHtml=diff.regressedIssues.map(r=>`<div class="diffitem" style="border-left:3px solid #c93829">
    <div><span class="stpill FAIL">新增风险 (${r.from}→${r.to})</span> <b>${esc(r.ruleId)} ${esc(r.title)}</b></div>
    <small>${esc(r.detail)}</small>
  </div>`).join('');

  panel.innerHTML=`<div class="diffcol">
      <h4>语义级差异对比（Rev ${esc(diff.v1Rev)} → Rev ${esc(diff.v2Rev)}）· 修改 ${diff.modified.length} / 新增 ${diff.added.length} / 删除 ${diff.removed.length}</h4>
      ${modHtml}
    </div>
    <div class="diffcol">
      <h4>版本复审结论联动（已关闭缺陷 ${diff.resolvedIssues.length} · 新增关联风险 ${diff.regressedIssues.length}）</h4>
      ${resHtml||''}
      ${regHtml||''}
      ${(!resHtml&&!regHtml)?'<div class="diffitem">未发现跨版本规则结论状态跳变。</div>':''}
    </div>`;
}
$('diffV1Sel')?.addEventListener('change',renderVersionDiffPanel);
$('diffV2Sel')?.addEventListener('change',renderVersionDiffPanel);
$('diffUploadBtn')?.addEventListener('click',()=>$('diffUploadInput').click());
$('diffUploadInput')?.addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  setBusy(true,'正在解析对比版本图纸…');
  try{
    if(/\.json$/i.test(f.name)){
      const j=JSON.parse(await f.text());
      customDiffDoc={name:f.name,items:j.items||[]};
    }else{
      const p=await openPDF(new Uint8Array(await f.arrayBuffer()));
      const r=await extract({pdf:p,img:null,pages:p.numPages,progress});
      await p.destroy();
      customDiffDoc={name:f.name,items:r.items};
    }
    const s2=$('diffV2Sel');
    if(![...s2.options].some(o=>o.value==='uploaded'))s2.add(new Option(`上传对比图: ${f.name}`,'uploaded'));
    else [...s2.options].find(o=>o.value==='uploaded').textContent=`上传对比图: ${f.name}`;
    $('diffV1Sel').value='current';s2.value='uploaded';
    await renderVersionDiffPanel();
    toast('已完成跨版本语义对比与受影响规则复审');
  }catch(err){toast('对比版本读取失败：'+err.message);}
  finally{setBusy(false);e.target.value='';}
});

// --- Rule Catalog Table ---
function renderRuleCatalog(){
  const el=$('ruleCatalogPanel');if(!el)return;
  const rows=[
    ['R-DOC-01','完整性及版本','GB/T 10609.1-2008','确定性存在性规则','检查标题栏五项核心字段（名称/图号/材料/比例/版本），结合 L1 覆盖度区分缺失 FAIL 与待核实 UNKNOWN'],
    ['R-DOC-02','完整性及版本','GB/T 14689-2008','模板占位符+制图检查','拦截 #SH#/#PZ#/TBD 等未签审 CAD 宏占位符，核验审签链、图幅与第一/第三角投影声明'],
    ['R-DOC-03','完整性及版本','GB/T 10609.1-2008','跨区交叉核验','核对修订栏最新版本号、材料/编码变更描述是否与现行标题栏及图面自洽'],
    ['R-DIM-01','尺寸与几何公差','GB/T 4458.5-2003','精确十进制不等式','逐项校验双行极限偏差数学关系（上偏差 ES > 下偏差 EI，公差带宽 T > 0），抓出漏负号与上下颠倒'],
    ['R-DIM-02','制造与检验','GB/T 1800.1-2020','工艺能力阈值预警','识别公差带宽 < 0.008 mm 的超精密特征，提示磨削/珩磨与检具 Cpk 复核'],
    ['R-DIM-03','制图规范','GB/T 4458.4-2003','标注语法校验','检查括弧参考尺寸 (X) 不得带公差、方框理论正确尺寸 [X] 须配位置/方向公差框'],
    ['R-TOL-01','尺寸与几何公差','GB/T 1800.2-2020','ISO公差带微米查表','核验孔大写(H7)/轴小写(h6)匹配性，自动查表还原微米级极限尺寸并校验并列括号偏差'],
    ['R-TOL-02','尺寸与几何公差','GB/T 1804-2000','有效规格继承解析','检查自由尺寸是否被《技术要求》或图栏中的 GB/T 1804-m / 全局允许差完整覆盖'],
    ['R-GDT-01','尺寸与几何公差','GB/T 1182-2018','基准引用图完整性','遍历公差框有序基准字母 A/B/C，自动检出图面漏标基准框的悬空基准引用 FAIL'],
    ['R-GDT-02','尺寸与几何公差','GB/T 1182-2018','GD&T框格语法规则','形状公差(○/▱)不得引基准；方向/同轴度/跳动公差(⊥/∥/◎/↗/⇗)必须关联有效基准'],
    ['R-GDT-03','尺寸与几何公差','GB/T 1182-2018','公差带形状提示','孔轴中心位置度/同轴度未加注直径符 ⌀ 时的单向平面公差带退化预警'],
    ['R-SURF-01','材料与工艺','GB/T 131-2006','优先数列与完整性','检查 IT6/IT7 精密配合圆柱面是否标注粗糙度，以及 Ra 参数值是否符合优先系列'],
    ['R-FUNC-01','功能设计','DEMO-SPEC-001','Ontology角色+数值约束','演示规则：未确认表面角色时返回 UNKNOWN；确认为轴承安装面后执行 Ra ≤ 0.8 μm 判定'],
    ['R-MAT-01/02','材料与工艺','GB/T 39568-2020','行业工艺规则','核查去毛刺/未注圆角、电机轴热处理硬度区间 (HRC) 及壳体防腐/RoHS 环保法规承接'],
    ['R-INSP-01','制造与检验','GB/T 1958-2017','FAI气泡连号校验','检查首件检验气泡号【1~N】连续性、断号跳号与孤立未绑定气泡'],
    ['R-FIT-01','功能设计','DEMO-SPEC-001','跨图微米级配合计算','联立轴外径与配合孔极限尺寸计算最小/最大间隙，复审跨版本改轴未改孔干涉风险']
  ];
  el.innerHTML=`<table class="catatable">
    <thead><tr><th>规则ID</th><th>评审维度</th><th>依据标准 / 官方入口</th><th>执行机制</th><th>审核逻辑与工程语义说明</th></tr></thead>
    <tbody>${rows.map(([id,dim,code,mech,desc])=>{
      const s=STANDARDS_INDEX[code];
      const link=s?.url?`<a class="stdtag" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(code)} ↗</a>`:`<span class="stdtag demo">${esc(code)} (模拟)</span>`;
      return `<tr><td><span class="rulecode">${esc(id)}</span></td><td>${esc(dim)}</td><td>${link}</td><td>${esc(mech)}</td><td>${esc(desc)}</td></tr>`;
    }).join('')}</tbody>
  </table>`;
}

// --- Original Extraction List & Editor ---
function renderList(){
  const q=$('search').value.trim().toLowerCase(),items=data.items;
  const done=items.filter(f=>!f.review).length;$('count').textContent=items.length;$('pending').textContent=items.length-done;$('done').textContent=done;
  document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter===filter);b.setAttribute('aria-pressed',String(b.dataset.filter===filter));});
  const result=items.filter(f=>(filter==='all'||(filter==='pending'&&f.review)||(filter==='done'&&!f.review))&&(!q||[f.category,f.label,f.value].some(s=>s.toLowerCase().includes(q))));
  const html=[];for(const [i,category] of cats.entries()){
    const rows=result.filter(r=>r.category===category);if(!rows.length)continue;
    const open=q.length>0||opened.has(category),limit=limits[category]||6;
    html.push('<section class="group '+(open?'open':'')+'"><button class="grouphead" data-group="'+category+'" aria-expanded="'+open+'">'+icon(catIcons[i])+category+'<span class="groupcount">'+rows.length+'</span><span class="caret">'+icon('chevron')+'</span></button>');
    if(open){for(const row of rows.slice(0,limit)){
      const idx=String(items.indexOf(row)+1).padStart(2,'0');
      html.push('<button class="row '+(selected===row.id?'selected':'')+'" data-id="'+esc(row.id)+'"><span class="idx">'+idx+'</span><span class="rowmain"><small>'+esc(row.label)+'</small><b>'+esc(row.value||'尚未填写')+'</b></span><span class="target">'+icon(row.review?'target':'check')+'</span></button>');
    }if(rows.length>limit)html.push('<button class="morebtn" data-more="'+category+'">显示更多（剩余 '+(rows.length-limit)+' 项）</button>');}
    html.push('</section>');
  }
  $('list').innerHTML=html.join('')||'<div class="blank">'+(items.length?'没有符合条件的提取项':'点击「AI 识别」提取图纸信息，或使用「补录」添加标注。')+'</div>';
  $('export').disabled=busy||!items.length;
  recomputeReviewAndEDM();
  renderAnalytics();
}

function cancelBox(){boxing=false;drag=null;$('viewport').classList.remove('drawing','dragging');$('drawhint').hidden=true;paintMarks();}
function closeEditor(){selected=null;cancelBox();$('editor').hidden=true;renderList();paintMarks();}
async function selectItem(id,move=true){
  if(busy)return;const item=data.items.find(i=>i.id===id);if(!item)return;
  if(rightMode!=='extract')switchRightMode('extract');
  cancelBox();selected=id;
  if(page!==item.page)await showPage(item.page);if(selected!==id)return;
  if(move&&item.box){const p=data.pages[page-1],b=item.box,v=$('viewport');marks=true;$('marks').setAttribute('aria-checked','true');
    z=Math.max(1.5,Math.min(8,(v.clientWidth*.53)/(b[2]*base*p.width),(v.clientHeight*.40)/(b[3]*base*p.height)));
    dx=(.5-b[0]-b[2]/2)*base*p.width*z;dy=(.5-b[1]-b[3]/2)*base*p.height*z;layout();
  }
  opened.add(item.category);renderList();renderEditor(item);paintMarks();
}
function renderEditor(item){
  const e=$('editor');e.hidden=false;
  e.innerHTML='<div class="edtop"><b>校核提取项</b><small>'+esc(item.review?'待复核':'已确认')+' · 第 '+item.page+' 页</small><button id="edclose" title="关闭校核" aria-label="关闭校核">'+icon('close')+'</button></div><div class="edfields"><label>字段名称<input id="edlabel" value="'+esc(item.label)+'"></label><label>分类<select id="edcat">'+cats.map(c=>'<option '+(c===item.category?'selected':'')+'>'+c+'</option>').join('')+'</select></label><label class="wide">提取内容<textarea id="edvalue" rows="2">'+esc(item.value)+'</textarea></label></div><div class="edactions"><button id="boxpick">'+(item.box?'重框位置':'框选位置')+'</button><button id="discard">删除此项</button><button id="edconfirm" class="confirm">'+icon('check')+'确认此项</button></div>';
  $('edclose').onclick=closeEditor;
  function change(){item.originalCategory??=item.category;item.originalBox??=item.box;item.label=$('edlabel').value;item.category=$('edcat').value;item.value=$('edvalue').value;item.review=true;item.edited=true;item.modified=true;opened.add(item.category);e.querySelector('small').textContent='待复核 · 第 '+item.page+' 页';renderList();paintMarks();persist();}
  $('edlabel').oninput=$('edvalue').oninput=$('edcat').onchange=change;
  $('boxpick').onclick=()=>{boxing=true;$('viewport').classList.add('drawing');$('drawhint').hidden=false;paintMarks();if(innerWidth<=700)$('viewport').scrollIntoView({block:'center'});};
  $('discard').onclick=()=>{if(!confirm('删除这条提取项？'))return;removed.add(item.id);data.items=data.items.filter(i=>i.id!==item.id);closeEditor();persist();};
  $('edconfirm').onclick=()=>{if(!item.label.trim()||!item.value.trim()||!item.box){toast('请填写字段名称、提取内容，并框选原图位置。');return;}item.review=false;item.edited=true;closeEditor();persist();toast('已确认并保存');};
}

$('overlay').onclick=e=>{
  const rb=e.target.closest('[data-revid]');if(rb){focusReviewIssue(rb.dataset.revid,true);return;}
  const b=e.target.closest('[data-id]');if(b)selectItem(b.dataset.id);
};
$('list').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.id)selectItem(b.dataset.id);
  else if(b.dataset.group){const c=b.dataset.group;if(opened.has(c))opened.delete(c);else opened.add(c);renderList();}
  else if(b.dataset.more){limits[b.dataset.more]=(limits[b.dataset.more]||6)+30;renderList();}};
$('miniViz').onclick=e=>{const b=e.target.closest('[data-jumpcat]');if(!b)return;const c=b.dataset.jumpcat;opened.add(c);renderList();const g=document.querySelector('[data-group="'+c+'"]');g?.scrollIntoView({behavior:'smooth',block:'nearest'});};
document.querySelector('.samples').onclick=async e=>{
  const b=e.target.closest('[data-sample]');if(!b||busy)return;
  const name=b.dataset.sample;
  setBusy(true,'正在切换样图…');
  try{const sKey=await loadPreset(name);const saved=await dbRead(sKey).catch(()=>null);await startDoc(null,sKey,saved,true);}
  catch(err){toast('样图载入失败：'+err.message);}
  finally{setBusy(false);renderList();}
};
$('search').oninput=renderList;
document.querySelector('#extractPane .tabs').onclick=e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;renderList();};
$('more').onclick=()=>zoomTo(z*1.5);$('less').onclick=()=>zoomTo(z/1.5);$('fit').onclick=fit;
$('expand').onclick=()=>{const expanded=document.querySelector('.viewer').classList.toggle('enlarged');$('expand').title=expanded?'退出放大预览':'放大预览';$('expand').setAttribute('aria-label',$('expand').title);};
$('marks').onclick=()=>{marks=!marks;$('marks').setAttribute('aria-checked',marks);paintMarks();};
$('prev').onclick=()=>{closeEditor();showPage(page-1).catch(e=>toast(e.message));};$('next').onclick=()=>{closeEditor();showPage(page+1).catch(e=>toast(e.message));};
$('cancelBox').onclick=cancelBox;

const viewport=$('viewport');new ResizeObserver(layout).observe(viewport);
viewport.onwheel=e=>{e.preventDefault();const r=viewport.getBoundingClientRect();zoomTo(z*Math.exp(-e.deltaY*.0015),[e.clientX-r.left,e.clientY-r.top]);};
function relativePoint(e){const r=$('sheet').getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];}
viewport.onpointerdown=e=>{
  if(!data.pages.length||e.button!==0||(!boxing&&e.target.closest('button')))return;
  if(boxing&&!$('sheet').contains(e.target))return;
  drag={x:e.clientX,y:e.clientY,dx,dy,start:relativePoint(e),pointer:e.pointerId};viewport.setPointerCapture(e.pointerId);
  if(!boxing)viewport.classList.add('dragging');
};
viewport.onpointermove=e=>{if(!drag||drag.pointer!==e.pointerId)return;
  if(boxing){const [x,y]=relativePoint(e),[a,b]=drag.start;drag.box=[Math.min(a,x),Math.min(b,y),Math.abs(x-a),Math.abs(y-b)];
  $('overlay').innerHTML='<div class="box preview" style="'+boxStyle(drag.box)+'"></div>';}
  else{dx=drag.dx+e.clientX-drag.x;dy=drag.dy+e.clientY-drag.y;layout();}
};
viewport.onpointerup=e=>{if(!drag||drag.pointer!==e.pointerId)return;
  if(boxing&&drag.box&&drag.box[2]*$('sheet').offsetWidth>3&&drag.box[3]*$('sheet').offsetHeight>3){
  const item=data.items.find(i=>i.id===selected);if(item){item.originalBox??=item.box;item.box=drag.box;item.page=page;item.review=true;item.edited=true;item.modified=true;cancelBox();renderEditor(item);renderList();persist();toast('定位框已更新');}
  }drag=null;viewport.classList.remove('dragging');
};
viewport.onpointercancel=()=>{drag=null;viewport.classList.remove('dragging');paintMarks();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(boxing)cancelBox();else if(document.querySelector('.viewer.enlarged'))$('expand').click();else if(selected)closeEditor();}});

$('add').onclick=async()=>{if(!key||busy)return;switchRightMode('extract');const item={id:'manual-'+crypto.randomUUID(),category:cats[4],label:'手工补录',value:'',page,box:null,review:true,edited:true,source:'手工'};
  data.items.push(item);filter='all';$('search').value='';await selectItem(item.id,false);$('boxpick').click();persist();};
$('upload').onclick=()=>$('file').click();
async function upload(file){if(!file||busy)return;
  if(!/\.(pdf|png|jpg|jpeg|webp|bmp)$/i.test(file.name)){toast('请选择 PDF、PNG、JPG、WebP 或 BMP 图纸。');return;}
  setBusy(true,'正在读取图纸…');
  try{const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());const k=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
  const saved=await dbRead(k).catch(()=>null);await startDoc(file,k,saved);toast(saved?'已恢复此图纸的校核与审核记录':'图纸已就绪，请点击「AI 识别」提取并审核');}
  catch(e){toast('无法打开图纸：'+e.message);}
  finally{setBusy(false);$('file').value='';renderList();}
}
$('file').onchange=e=>upload(e.target.files[0]);
for(const event of ['dragover','drop'])document.addEventListener(event,e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();if(event==='drop')upload(e.dataTransfer.files[0]);}});

$('recognize').onclick=async()=>{if(!key||busy)return;closeEditor();setBusy(true,'正在读取图纸…');
  try{
    let activePdf=pdf;
    const presetEntry=Object.entries(SAMPLES).find(([,v])=>v.key===key);
    if(!activePdf&&!img&&presetEntry){
      progress('正在读取内置样图 PDF 矢量流…',0.05);
      const res=await fetch(presetEntry[1].pdf);
      if(res.ok)activePdf=await openPDF(new Uint8Array(await res.arrayBuffer()));
    }
    const result=(activePdf||img)?await extract({pdf:activePdf,img,pages:data.pages.length,progress}):{items:structuredClone(sample.items),warning:'',preflight:null};
    preflight=result.preflight||null;
    if(activePdf&&activePdf!==pdf)await activePdf.destroy().catch(()=>{});
    const previous=new Map(data.items.map(i=>[i.id,i])),fresh=result.items.filter(i=>!removed.has(i.id)).map(i=>previous.get(i.id)?.edited?previous.get(i.id):i);
    const ids=new Set(fresh.map(i=>i.id));fresh.push(...data.items.filter(i=>i.edited&&!ids.has(i.id)));
    data.items=fresh;filter='all';$('search').value='';opened=new Set([cats[0],cats[1]]);limits={};fit();await persist();
    recomputeReviewAndEDM();
    const rc=currentReview?.counts||{};
    toast(result.warning||(fresh.length?`AI 识别完成：提取 ${fresh.length} 项，智能审核检出 ${rc.FAIL||0} 项不通过 / ${rc.WARNING||0} 项风险`:'未找到可读文字，可手动框选补录。'));
  }
  catch(e){toast('识别未完成：'+(e.message||e));}
  finally{setBusy(false);renderList();}
};

$('export').onclick=()=>{
  const autoItems=data.items.filter(i=>i.source!=='手工'),manualCount=data.items.length-autoItems.length,zeroEdit=autoItems.filter(i=>!i.review&&!i.modified).length,modConfirmed=autoItems.filter(i=>!i.review&&i.modified).length,initAuto=autoItems.length+removed.size,finalValid=autoItems.length+manualCount;
  const payload={
    图纸:data.name,
    坐标说明:'box = [左, 上, 宽, 高]，各值为相对当前页的比例，原点在左上角。',
    页数:data.pages.length,
    校核统计:{
      初始自动识别数:initAuto,直接确认数:zeroEdit,修改后确认数:modConfirmed,删除误检数:removed.size,手工补录数:manualCount,
      待复核数:data.items.filter(i=>i.review).length,
      直接可用率:initAuto?+(zeroEdit/initAuto*100).toFixed(1)+'%':'0%',
      自动有效保留率:initAuto?+(autoItems.length/initAuto*100).toFixed(1)+'%':'0%',
      估算召回率:finalValid?+(autoItems.length/finalValid*100).toFixed(1)+'%':'0%'
    },
    工程事实摘要_EDM:currentEDM?{
      零件类型:currentEDM.L5_Context.partFamilyLabel,
      观测模式:currentEDM.L1_Observation.primaryMode,
      覆盖完整度:currentEDM.L1_Observation.coverageComplete,
      已定义基准:currentEDM.L2_Specifications.datumsDefined.map(d=>d.letter),
      未注公差声明:currentEDM.L2_Specifications.generalTolerance,
      恢复特征数:currentEDM.L3_Features.length
    }:null,
    智能评审报告_ReviewResultPackage:currentReview?{
      评审门禁状态:currentReview.overallGate,
      自动化覆盖率:currentReview.autoCoveragePct+'%',
      状态统计:currentReview.counts,
      人工角色确认记录:roleOverrides,
      偏离放行记录:ruleExceptions,
      逐条审核结论:currentReview.results.map(r=>({
        ruleId:r.ruleId,title:r.title,dimension:r.dimension,priority:r.priority,
        standard:r.standard.code,sourceType:r.standard.sourceType,status:r.status,
        actualValue:r.actualValue,requiredValue:r.requiredValue,risk:r.risk,suggestion:r.suggestion,
        page:r.page,box:r.box,evidenceLabel:r.evidenceLabel
      }))
    }:null,
    items:data.items.map(i=>({...i,status:i.review?'待复核':'已确认'}))
  };
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=data.name.replace(/\.[^.]+$/,'')+'-提取与评审报告.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};

async function boot(){
  renderRuleCatalog();
  setBusy(true,'正在载入工作台…');
  try{
    const defaultKey=await loadPreset('flange');
    const k=await dbRead('current').catch(()=>null),record=k?await dbRead(k).catch(()=>null):null;
    const hasUserWork=record&&(isPresetKey(k)?(record.items?.some(i=>i.edited)||(record.removed?.length>0)||Object.keys(record.roleOverrides||{}).length>0||Object.keys(record.ruleExceptions||{}).length>0):!!record.blob);
    if(hasUserWork){
      try{await startDoc(record.blob||null,k,record,true);return;}catch{}
    }
    await startDoc(null,defaultKey,null,true);
  }
  catch(e){toast('工作台未载入：'+e.message);}
  finally{setBusy(false);renderList();}
}
boot();
