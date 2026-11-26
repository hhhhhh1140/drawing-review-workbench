import {openPDF,renderPage,imageOf,extract} from './recognition.js?v=20261126b';
import {
  STANDARDS_INDEX, REVIEW_STATES, FUNCTIONAL_ROLES,
  buildEDM, runDesignReview, evaluateShaftHoleFit, runVersionDiffReview, exportReviewMarkdown, fmtMm, fmtSignedMm
} from './review-engine.js?v=20261126b';

const $=id=>document.getElementById(id);
const patterns={
  shield:'M12 3 4 6v5c0 5 4 8 8 10 4-2 8-5 8-10V6z M8 12l3 3 5-6',
  audit:'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
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
let rightMode='review',reviewFilter='issues',selectedReviewId=null;
let mateDoc=null,diffOtherDoc=null,fitPool={shafts:[],holes:[]};

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
  catch{toast('浏览器未能保存本次更改，请导出报告留存。');}
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
  const dl=$('samplePdfLink');if(dl){dl.href=SAMPLES[name].pdf;dl.hidden=false;}
  return SAMPLES[name].key;
}
function isPresetKey(k){return Object.values(SAMPLES).some(s=>s.key===k);}
function syncPresetState(docKey){
  const entry=Object.entries(SAMPLES).find(([,v])=>v.key===docKey);
  const dl=$('samplePdfLink');if(dl){if(entry){dl.href=entry[1].pdf;dl.hidden=false;}else dl.hidden=true;}
  const hint=$('demoHintBar');if(hint)hint.hidden=!entry;
  if($('samplePicker'))$('samplePicker').value=entry?entry[0]:'';
}

function setBusy(flag,msg=''){
  busy=flag;for(const id of ['recognize','upload','add','export','exportMd','samplePicker']){if($(id))$(id).disabled=flag;}
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
  $('viewModeLabel').textContent=mode==='review'?'图纸问题定位（点击右侧或下方问题自动缩放）':'图纸提取明细定位';
  paintMarks();
}
$('modeExtract').onclick=()=>switchRightMode('extract');
$('modeReview').onclick=()=>switchRightMode('review');

// Report Section Tabs
document.querySelector('.reptabs').onclick=e=>{
  const b=e.target.closest('[data-reptab]');if(!b)return;
  const tab=b.dataset.reptab;
  document.querySelectorAll('[data-reptab]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',String(x===b));});
  for(const t of ['report','edm','tools','rules'])$('tab-'+t).hidden=t!==tab;
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
  $('fileinfo').textContent=[isPDF?'PDF 工程图纸':'图纸图像',pages.length+' 页',!file&&isPresetKey(key)?'示例图纸':(file.size/1048576).toFixed(2)+' MB'].join(' · ');
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
    const rank={FAIL:0,UNKNOWN:1,WARNING:2,PASS:3,APPROVED_EXCEPTION:4,NOT_APPLICABLE:5};
    const sorted=[...revItems].sort((a,b)=>(rank[a.status]??9)-(rank[b.status]??9));
    const occupied=[],html=[];
    for(const r of sorted){
      const b=r.box,curr=selectedReviewId===r.id,cx=(b[0]+b[2]/2)*w,cy=(b[1]+b[3]/2)*h;
      const cls='rev-'+r.status;
      if(!curr&&z<1.7){
        if(r.status==='PASS'&&occupied.length>=4)continue;
        if(occupied.some(([x,y])=>Math.abs(cx-x)<w*.10&&Math.abs(cy-y)<h*.10))continue;
        occupied.push([cx,cy]);
      }
      const tag=r.ruleId.replace(/^R-/,''),attrs='data-revid="'+esc(r.id)+'" title="'+esc('['+r.status+'] '+r.title+' · '+r.actualValue)+'"';
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
    const tag=String(data.items.indexOf(item)+1).padStart(2,'0'),attrs='data-id="'+esc(item.id)+'" title="'+esc(item.label+' · '+item.value)+'"';
    if(!curr&&z<1.7)html.push('<button class="cluster" '+attrs+' style="left:'+((b[0]+b[2]/2)*100)+'%;top:'+(b[1]*100)+'%">'+tag+'</button>');
    else html.push('<button class="box '+(curr?'current':'')+'" '+attrs+' data-tag="'+esc(tag+' · '+item.label)+'" style="'+boxStyle(b)+'"></button>');
  }
  o.innerHTML=html.join('');
}

// --- Core Review Computation & Detailed Report Rendering ---
function recomputeReviewAndEDM(){
  currentEDM=buildEDM(data,preflight,roleOverrides);
  currentReview=runDesignReview(currentEDM,{exceptions:ruleExceptions});
  const pf=$('preflightBadge');
  if(pf&&data.items.length){
    const m=currentEDM.L2_Specifications.metadata;
    pf.hidden=false;
    pf.textContent=`${currentEDM.L1_Observation.primaryMode} · ${m.sheetSize||'自适应'}`;
  }else if(pf)pf.hidden=true;

  const alerts=(currentReview.counts.FAIL||0)+(currentReview.counts.WARNING||0)+(currentReview.counts.UNKNOWN||0);
  $('auditAlertCount').textContent=alerts;
  $('repDocLabel').textContent=data.name?`当前审核对象：${data.name}（提取 ${data.items.length} 项）`:'';
  $('exportMd').disabled=busy||!data.items.length;

  renderReviewPane();
  renderDetailedReport();
  renderEDMPanel();
  populateFitSelectors();
  renderDiffPanel();
}

function renderReviewPane(){
  if(!currentReview)return;
  const c=currentReview.counts;
  $('reviewSummaryBar').innerHTML=
    `<div class="rsumcell fail"><small>不通过</small><b>${c.FAIL||0}</b></div>`+
    `<div class="rsumcell warn"><small>风险提示</small><b>${c.WARNING||0}</b></div>`+
    `<div class="rsumcell unk"><small>待确认</small><b>${c.UNKNOWN||0}</b></div>`+
    `<div class="rsumcell cov"><small>覆盖率</small><b>${currentReview.autoCoveragePct}%</b></div>`;

  const all=currentReview.results;
  const issuesCnt=all.filter(r=>r.status==='FAIL'||r.status==='WARNING').length;
  const unkCnt=all.filter(r=>r.status==='UNKNOWN').length;
  const passCnt=all.filter(r=>r.status==='PASS'||r.status==='APPROVED_EXCEPTION').length;
  $('rfAll').textContent=all.length;$('rfIssues').textContent=issuesCnt;$('rfUnknown').textContent=unkCnt;$('rfPass').textContent=passCnt;
  document.querySelectorAll('[data-rfilter]').forEach(b=>b.classList.toggle('active',b.dataset.rfilter===reviewFilter));

  if(!data.items.length){
    $('reviewList').innerHTML='<div class="blank">上传 PDF 后将自动解析并列出全部审核问题。</div>';
    return;
  }
  const filtered=all.filter(r=>{
    if(reviewFilter==='issues')return r.status==='FAIL'||r.status==='WARNING';
    if(reviewFilter==='unknown')return r.status==='UNKNOWN';
    if(reviewFilter==='pass')return r.status==='PASS'||r.status==='APPROVED_EXCEPTION';
    return true;
  });
  if(!filtered.length){
    $('reviewList').innerHTML='<div class="blank">当前筛选分类下暂无问题项，可切换「全部」查看已通过规则。</div>';
    return;
  }
  $('reviewList').innerHTML=filtered.map(r=>{
    const stInfo=REVIEW_STATES[r.status]||REVIEW_STATES.UNKNOWN;
    return `<article class="rcard st-${r.status} ${selectedReviewId===r.id?'active':''}" data-revcard="${esc(r.id)}">
      <div class="rctop">
        <span class="stpill ${r.status}">${stInfo.label}</span>
        <span class="rulecode">${esc(r.ruleId)}</span>
        <strong style="font-size:13.5px;flex:1">${esc(r.title)}</strong>
      </div>
      <div class="rcgrid"><div><b>发现：</b>${esc(r.actualValue)}</div></div>
      ${r.status!=='PASS'&&r.status!=='NOT_APPLICABLE'?`<div class="rcsuggest">${esc(r.suggestion)}</div>`:''}
    </article>`;
  }).join('');
}

// Detailed Issue Report Right Below the Workspace (100% focused on current drawing!)
function renderDetailedReport(){
  const banner=$('reportBanner'),body=$('reportDetailBody');
  if(!banner||!body)return;
  if(!data.items.length||!currentReview){
    banner.innerHTML='<div class="blank">尚未解析当前图纸。请点击上方 <b>「上传 PDF / 图纸」</b> 或 <b>「AI 解析与审核」</b>，解析完成后将在此处展开完整的审核问题报告。</div>';
    body.innerHTML='';
    return;
  }

  const m=currentEDM.L2_Specifications.metadata;
  const c=currentReview.counts;
  const gateMap={
    REJECT_NEEDS_FIX:['fail','🔴 存在必改阻断问题（FAIL），建议整改后再签审'],
    PENDING_ENGINEER_REVIEW:['warn','🟠 存在风险预警或待人工确认项，请逐项复核'],
    READY_FOR_SIGN_OFF:['pass','🟢 常规自动化规范检查已全部通过']
  };
  const [gCls,gTxt]=gateMap[currentReview.overallGate]||gateMap.PENDING_ENGINEER_REVIEW;

  banner.innerHTML=`
    <div class="repbanner-top">
      <div>
        <h2>${esc(data.name)} — 智能审核问题报告</h2>
        <div class="repmeta">
          <span>零件名称：<b>${esc(m.partName||'未提取')}</b></span>
          <span>图号/编码：<b>${esc(m.drawingNo||m.partCode||'未提取')}</b></span>
          <span>材料：<b>${esc(m.material||'未提取')}</b></span>
          <span>现行版本：<b>${esc(m.revision||'未提取')}</b></span>
          <span>零件语义域：<b>${esc(currentEDM.L5_Context.partFamilyLabel)}</b></span>
          <span>解析模式：<b>${esc(currentEDM.L1_Observation.primaryMode)}</b></span>
        </div>
      </div>
      <span class="gatebadge ${gCls}">${gTxt}</span>
    </div>
    <div class="repkpis">
      <div class="repkpi k-fail"><small>必改不通过 (FAIL)</small><strong>${c.FAIL||0}</strong></div>
      <div class="repkpi k-warn"><small>风险与工艺预警 (WARNING)</small><strong>${c.WARNING||0}</strong></div>
      <div class="repkpi k-unk"><small>待人工确认 (UNKNOWN)</small><strong>${c.UNKNOWN||0}</strong></div>
      <div class="repkpi k-pass"><small>已通过项 (PASS)</small><strong>${c.PASS||0}</strong></div>
      <div class="repkpi"><small>规则自动覆盖率</small><strong>${currentReview.autoCoveragePct}%</strong></div>
    </div>`;

  const renderIssueBox=(r,idx)=>{
    const stInfo=REVIEW_STATES[r.status]||REVIEW_STATES.UNKNOWN;
    const stdTag=r.standard.url
      ? `<a class="stdtag" href="${esc(r.standard.url)}" target="_blank" rel="noopener">${esc(r.standard.code)} · ${esc(r.standard.title)} ↗</a>`
      : `<span class="stdtag demo">${esc(r.standard.code)} · 模拟专业规则</span>`;

    const evBtns=(r.evidenceItems?.length?r.evidenceItems:(r.box?[{id:r.evidenceId,label:r.evidenceLabel,box:r.box,page:r.page}]:[]))
      .filter(ev=>ev.box)
      .slice(0,5)
      .map(ev=>`<button class="locbtn" data-loc-rev="${esc(r.id)}" data-loc-item="${esc(ev.id||'')}" title="点击回到画布放大定位该处">📍 定位原图：${esc((ev.label||'')+(ev.value?' '+ev.value:'')).slice(0,26)}</button>`)
      .join('');

    let ctrlHtml='';
    if(r.confirmTarget){
      const opts=FUNCTIONAL_ROLES.map(fr=>`<option value="${fr.id}" ${fr.id===r.confirmTarget.currentRole?'selected':''}>${esc(fr.label)}</option>`).join('');
      ctrlHtml+=`<label style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:#234f82;font-weight:600">确认表面工程功能角色：<select data-role-item="${esc(r.confirmTarget.itemId)}" style="padding:4px 8px;border:1px solid #9dbce0;border-radius:5px;background:#fff">${opts}</select></label>`;
    }
    if(r.status==='FAIL'||r.status==='WARNING'){
      ctrlHtml+=`<button class="locbtn sec" data-approve-exc="${esc(r.ruleId)}">登记偏离放行</button>`;
    }else if(r.status==='APPROVED_EXCEPTION'){
      ctrlHtml+=`<button class="locbtn sec" data-clear-exc="${esc(r.ruleId)}">撤销偏离放行</button>`;
    }

    return `<article class="issuebox st-${r.status}">
      <div class="issuehead">
        <div class="issuehead-left">
          <span class="stpill ${r.status}">${stInfo.label} (${r.status})</span>
          <span class="rulecode">${esc(r.ruleId)} · ${esc(r.dimension)}</span>
          <h4>${idx+1}. ${esc(r.title)}</h4>
        </div>
        ${stdTag}
      </div>
      <div class="issuecols">
        <div class="issuefield"><b>原图实际检测发现</b>${esc(r.actualValue)}</div>
        <div class="issuefield"><b>规范与规则约束要求</b>${esc(r.requiredValue)}</div>
        <div class="issuefield risk"><b>潜在工程 / 制造 / 质量风险</b>${esc(r.risk)}</div>
        <div class="issuefield fix"><b>具体整改与处理建议</b>${esc(r.suggestion)}</div>
      </div>
      <div class="issuefoot">
        ${evBtns||'<span style="font-size:12px;color:#667569">全图综合判定项（无单一坐标框）</span>'}
        ${ctrlHtml}
      </div>
    </article>`;
  };

  const fails=currentReview.results.filter(r=>r.status==='FAIL');
  const warns=currentReview.results.filter(r=>r.status==='WARNING');
  const unks=currentReview.results.filter(r=>r.status==='UNKNOWN');
  const excs=currentReview.results.filter(r=>r.status==='APPROVED_EXCEPTION');
  const passes=currentReview.results.filter(r=>r.status==='PASS'||r.status==='NOT_APPLICABLE');

  const chunks=[];
  if(fails.length){
    chunks.push(`<div class="repsec"><h3 class="repsec-title"><span class="secnum fail">FAIL · ${fails.length} 项</span>一、必改问题（有充分证据判定不合规）</h3>${fails.map(renderIssueBox).join('')}</div>`);
  }
  if(warns.length){
    chunks.push(`<div class="repsec"><h3 class="repsec-title"><span class="secnum warn">WARNING · ${warns.length} 项</span>二、风险预警与制图/工艺提示</h3>${warns.map(renderIssueBox).join('')}</div>`);
  }
  if(unks.length){
    chunks.push(`<div class="repsec"><h3 class="repsec-title"><span class="secnum unk">UNKNOWN · ${unks.length} 项</span>三、信息不足与待工程师确认项（UNKNOWN 不等同于通过）</h3>${unks.map(renderIssueBox).join('')}</div>`);
  }
  if(excs.length){
    chunks.push(`<div class="repsec"><h3 class="repsec-title"><span class="secnum pass">EXCEPTION · ${excs.length} 项</span>四、已登记偏离批准放行项</h3>${excs.map(renderIssueBox).join('')}</div>`);
  }
  if(!fails.length&&!warns.length&&!unks.length){
    chunks.push(`<div class="issuebox"><h4>未发现必改问题或风险项</h4><p style="margin:0;font-size:13.5px;color:#3d5342">当前图纸已通过全部 ${passes.length} 项自动化常规规范核验。</p></div>`);
  }
  if(passes.length){
    chunks.push(`<details class="passfold"><summary><span class="secnum pass">PASS · ${passes.length} 项</span>展开查看全部已通过的规范核验明细 ▾</summary><div class="passgrid">${passes.map(r=>`<div class="passcard"><b>[${esc(r.ruleId)}] ${esc(r.title)}</b><small>${esc(r.actualValue)}</small></div>`).join('')}</div></details>`);
  }
  body.innerHTML=chunks.join('');
}

async function focusReviewIssue(revId,move=true,specificItemId=''){
  if(!currentReview)return;
  const r=currentReview.results.find(x=>x.id===revId);if(!r)return;
  selectedReviewId=revId;
  const evItem=specificItemId?data.items.find(i=>i.id===specificItemId):null;
  const tgtPage=evItem?.page||r.page||1;
  const tgtBox=evItem?.box||r.box;
  if(page!==tgtPage)await showPage(tgtPage);
  if(move&&tgtBox){
    const p=data.pages[page-1],b=tgtBox,v=$('viewport');
    marks=true;$('marks').setAttribute('aria-checked','true');
    z=Math.max(1.5,Math.min(7.5,(v.clientWidth*.52)/(b[2]*base*p.width),(v.clientHeight*.40)/(b[3]*base*p.height)));
    dx=(.5-b[0]-b[2]/2)*base*p.width*z;dy=(.5-b[1]-b[3]/2)*base*p.height*z;layout();
  }
  renderReviewPane();paintMarks();
}

// Event delegation for both right-side review pane AND bottom detailed report!
document.querySelector('.revtabs').onclick=e=>{
  const b=e.target.closest('[data-rfilter]');if(!b)return;
  reviewFilter=b.dataset.rfilter;renderReviewPane();
};
function handleAuditActions(e){
  const loc=e.target.closest('[data-loc-rev]');
  if(loc){
    switchRightMode('review');
    focusReviewIssue(loc.dataset.locRev,true,loc.dataset.locItem||'');
    $('viewport')?.scrollIntoView({behavior:'smooth',block:'center'});
    return;
  }
  const excBtn=e.target.closest('[data-approve-exc]');
  if(excBtn){
    const rid=excBtn.dataset.approveExc;
    const note=prompt(`请输入规则 ${rid} 的偏离批准单号或专家签审说明：`,'ECN-2026-偏离放行');
    if(note&&note.trim()){ruleExceptions[rid]=note.trim();recomputeReviewAndEDM();persist();toast(`已登记 ${rid} 偏离放行`);}
    return;
  }
  const clrBtn=e.target.closest('[data-clear-exc]');
  if(clrBtn){delete ruleExceptions[clrBtn.dataset.clearExc];recomputeReviewAndEDM();persist();return;}
  const card=e.target.closest('[data-revcard]');
  if(card)focusReviewIssue(card.dataset.revcard,true);
}
$('reviewList').onclick=handleAuditActions;
$('reportDetailBody').onclick=handleAuditActions;
$('reportDetailBody').onchange=e=>{
  const sel=e.target.closest('[data-role-item]');if(!sel)return;
  roleOverrides[sel.dataset.roleItem]=sel.value;
  recomputeReviewAndEDM();persist();
  toast('已更新表面功能角色并自动重新判定审核结论');
};

// --- Tab 2: EDM Panel for Current Drawing ---
function renderEDMPanel(){
  const el=$('edmPanel');if(!el||!currentEDM)return;
  const {L1_Observation:obs,L2_Specifications:spec,L3_Features:feats,L5_Context:ctx}=currentEDM;
  if(!obs.totalItems){el.innerHTML='<div class="blank">上传并解析图纸后，这里会展示当前图纸的结构化尺寸极限表、公差带查表与形位公差关联关系。</div>';return;}
  const gtStr=spec.generalTolerance
    ?(spec.generalTolerance.type==='standard'?`${spec.generalTolerance.standard}-${spec.generalTolerance.grade}`:`全局 ±${spec.generalTolerance.explicitMm} mm`)
    :'未声明未注公差';
  const rowsHtml=feats.map(f=>{
    const d=f.dim;
    const lim=(d.minLimit!=null&&d.maxLimit!=null)?`[${fmtMm(d.minLimit)} ~ ${fmtMm(d.maxLimit)}]`:(d.tolType==='theoretical'?'理论精确框':(d.tolType==='reference'?'参考尺寸':'继承未注公差'));
    const rels=[...f.linkedGDTs.map(g=>`${g.symbol}${g.value}`),...f.linkedRoughness.map(r=>`${r.param}${r.value}`)].join(' · ')||'—';
    return `<tr data-edm-item="${esc(d.id)}" title="点击在原图中定位该特征">
      <td><code>${f.featureId}</code></td>
      <td>${esc(f.featureType.replace('Cylindrical','圆柱').replace('PatternHoles','孔组').replace('LinearDimension','线性尺寸').replace('FilletOrRadius','圆角半径').replace('ChamferOrAngle','倒角/角度'))}</td>
      <td><b>${esc(d.raw)}</b></td>
      <td style="font-family:ui-monospace,monospace">${esc(lim)}</td>
      <td>${esc(rels)}</td>
    </tr>`;
  }).join('');

  el.innerHTML=`<div class="edmlayers">
    <div class="edmlayer"><span>L1 · 观测预检</span><b>${esc(obs.primaryMode)}</b><small>共 ${obs.totalItems} 项（PDF ${obs.pdfItems} / OCR ${obs.ocrItems}）</small></div>
    <div class="edmlayer"><span>L2 · 规格汇总</span><b>尺寸 ${spec.dimensions.length} · GD&amp;T ${spec.gdts.length} · 粗糙度 ${spec.roughness.length}</b><small>基准：[${spec.datumsDefined.map(d=>d.letter).join(', ')||'无'}] · 未注公差：${esc(gtStr)}</small></div>
    <div class="edmlayer"><span>L3 · 几何特征</span><b>已恢复 ${feats.length} 个特征</b><small>点击下方任意行自动缩放定位到原图</small></div>
    <div class="edmlayer"><span>L4/L5 · 零件上下文</span><b>${esc(ctx.partFamilyLabel)}</b><small>材料：${esc(spec.metadata.material||'未标')} · 版本：${esc(spec.metadata.revision||'未标')}</small></div>
  </div>
  <div class="featlist"><table class="feattable">
    <thead><tr><th>特征ID</th><th>几何类型</th><th>原始标注</th><th>解析极限尺寸 (mm)</th><th>邻近绑定公差/粗糙度</th></tr></thead>
    <tbody>${rowsHtml||'<tr><td colspan="5">当前图纸暂无可结构化尺寸特征</td></tr>'}</tbody>
  </table></div>`;
}
$('edmPanel').onclick=e=>{
  const tr=e.target.closest('[data-edm-item]');
  if(tr){selectItem(tr.dataset.edmItem,true);$('viewport')?.scrollIntoView({behavior:'smooth',block:'center'});}
};

// --- Tab 3: On-Demand Cross-Drawing Fit & Version Diff (Current Drawing First!) ---
function populateFitSelectors(){
  const sSel=$('fitShaftSel'),hSel=$('fitHoleSel');if(!sSel||!hSel)return;
  const shafts=[],holes=[];
  const collect=(edm,tag)=>{
    if(!edm)return;
    for(const f of edm.L3_Features){
      const d=f.dim;
      if(d.prefix==='⌀'&&d.minLimit!=null&&d.maxLimit!=null){
        const entry={label:`[${tag}] ${d.raw} ([${fmtMm(d.minLimit)}~${fmtMm(d.maxLimit)}])`,dim:d};
        if(d.isoLookup?.isHole||f.featureType==='CylindricalHole'||f.featureType==='PatternHoles')holes.push(entry);
        else shafts.push(entry);
      }
    }
  };
  collect(currentEDM,'当前图纸');
  if(mateDoc)collect(buildEDM(mateDoc),'配合件图纸');
  fitPool={shafts,holes};
  sSel.innerHTML=shafts.length?shafts.map((x,i)=>`<option value="${i}">${esc(x.label)}</option>`).join(''):'<option value="">当前图无带公差外径（可上传配合件或点演示）</option>';
  hSel.innerHTML=holes.length?holes.map((x,i)=>`<option value="${i}">${esc(x.label)}</option>`).join(''):'<option value="">当前图无带公差内孔（可上传配合件或点演示）</option>';
  recalcFitUI();
}
function recalcFitUI(){
  const box=$('fitResultBox');if(!box)return;
  const s=fitPool.shafts[+$('fitShaftSel').value]?.dim,h=fitPool.holes[+$('fitHoleSel').value]?.dim;
  const minA=parseFloat($('fitMinInput').value)||0,maxA=parseFloat($('fitMaxInput').value)||0.030;
  const res=evaluateShaftHoleFit(s,h,{minAllowedMm:minA,maxAllowedMm:maxA});
  if(res.status==='UNKNOWN'){box.innerHTML=`<div style="color:#5c6c60">${esc(res.message)}</div>`;return;}
  box.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
      <div><span class="stpill ${res.status}">${res.status==='PASS'?'配合合格 (PASS)':'配合异常 (FAIL)'}</span> <b style="margin-left:6px">${esc(res.fitType)}</b></div>
      <span class="stdtag demo">允许间隙 [${fmtMm(minA)} ~ ${fmtMm(maxA)}] mm</span>
    </div>
    <div class="fitkpis">
      <div class="fitkpi"><small>轴极限 (${esc(res.shaftRaw)})</small><b>${fmtMm(res.shaftLimits[0])} ~ ${fmtMm(res.shaftLimits[1])} mm</b></div>
      <div class="fitkpi"><small>孔极限 (${esc(res.holeRaw)})</small><b>${fmtMm(res.holeLimits[0])} ~ ${fmtMm(res.holeLimits[1])} mm</b></div>
      <div class="fitkpi"><small>极限间隙 (孔 − 轴)</small><b style="color:${res.status==='PASS'?'#265d2d':'#b82e1f'}">${fmtSignedMm(res.minClearanceMm)} ~ ${fmtSignedMm(res.maxClearanceMm)} mm</b></div>
    </div><div>${esc(res.conclusion)}</div>`;
}
['fitShaftSel','fitHoleSel','fitMinInput','fitMaxInput'].forEach(id=>$(id)?.addEventListener('input',recalcFitUI));

async function parseAuxiliaryFile(file){
  if(/\.json$/i.test(file.name)){const j=JSON.parse(await file.text());return {name:file.name,items:j.items||[]};}
  const p=await openPDF(new Uint8Array(await file.arrayBuffer()));
  const r=await extract({pdf:p,img:null,pages:p.numPages,progress});
  await p.destroy();
  return {name:file.name,items:r.items};
}
$('mateUploadBtn').onclick=()=>$('mateUploadInput').click();
$('mateUploadInput').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  setBusy(true,'正在解析配合件图纸…');
  try{mateDoc=await parseAuxiliaryFile(f);populateFitSelectors();toast(`已载入配合件：${f.name}`);}
  catch(err){toast('配合件解析失败：'+err.message);}
  finally{setBusy(false);e.target.value='';}
};
$('fitDemoBtn').onclick=async()=>{
  const s2=await fetchPresetJson('shaftV2'),bore=await fetchPresetJson('bore');
  const edmS=buildEDM(s2),edmB=buildEDM(bore);
  fitPool={
    shafts:edmS.L2_Specifications.dimensions.filter(d=>d.prefix==='⌀'&&d.minLimit!=null).map(d=>({label:`[示例电机轴V2] ${d.raw}`,dim:d})),
    holes:edmB.L2_Specifications.dimensions.filter(d=>d.prefix==='⌀'&&d.minLimit!=null).map(d=>({label:`[示例配合孔座] ${d.raw}`,dim:d}))
  };
  $('fitShaftSel').innerHTML=fitPool.shafts.map((x,i)=>`<option value="${i}">${esc(x.label)}</option>`).join('');
  $('fitHoleSel').innerHTML=fitPool.holes.map((x,i)=>`<option value="${i}">${esc(x.label)}</option>`).join('');
  const si=fitPool.shafts.findIndex(x=>x.dim.isoZone==='h6');if(si>=0)$('fitShaftSel').value=String(si);
  recalcFitUI();
};

function renderDiffPanel(demoPair=null){
  const panel=$('diffPanel');if(!panel)return;
  const doc1=demoPair?demoPair[0]:data;
  const doc2=demoPair?demoPair[1]:diffOtherDoc;
  if(!doc2){
    panel.innerHTML='<div class="blank" style="padding:22px 10px">点击上方 <b>「上传另一版本 PDF 对比当前图」</b>，自动执行跨版本语义差异对比与受影响规则复审。</div>';
    return;
  }
  const withRole=doc=>{const tmp=buildEDM(doc);const ov={...roleOverrides};if(tmp.L5_Context.partFamily==='motor_shaft')for(const r of tmp.L2_Specifications.roughness)if(!ov[r.id])ov[r.id]='BearingSeat';return buildEDM(doc,null,ov);};
  const edm1=withRole(doc1),rev1=runDesignReview(edm1);
  const edm2=withRole(doc2),rev2=runDesignReview(edm2);
  let fitCheck=null;
  if(demoPair?.[2]){
    const edmB=buildEDM(demoPair[2]);
    const sDim=edm2.L2_Specifications.dimensions.find(d=>d.isoZone==='h6');
    const hDim=edmB.L2_Specifications.dimensions.find(d=>d.isoZone==='H7');
    if(sDim&&hDim)fitCheck=evaluateShaftHoleFit(sDim,hDim);
  }
  const diff=runVersionDiffReview(edm1,rev1,edm2,rev2,fitCheck);
  panel.innerHTML=`<div style="font-size:13px;color:#3c5040"><b>${esc(diff.v1Name)}</b> → <b>${esc(diff.v2Name)}</b>：修改 ${diff.modified.length} 项 · 新增 ${diff.added.length} 项 · 删除 ${diff.removed.length} 项</div>`
    +diff.modified.map(m=>`<div class="diffitem"><div><b>${esc(m.label)}</b>：<del>${esc(m.oldVal)}</del>→<ins>${esc(m.newVal)}</ins></div>${m.impactRules.length?`<small style="color:#556859">触发重检：${esc(m.impactRules.join('、'))}</small>`:''}</div>`).join('')
    +diff.resolvedIssues.map(r=>`<div class="diffitem" style="border-left:3px solid #2e7d41"><div><span class="stpill PASS">建议关闭 (${r.from}→${r.to})</span> <b>${esc(r.ruleId)} ${esc(r.title)}</b></div><small>${esc(r.detail)}</small></div>`).join('')
    +diff.regressedIssues.map(r=>`<div class="diffitem" style="border-left:3px solid #c93829"><div><span class="stpill FAIL">新增风险 (${r.from}→${r.to})</span> <b>${esc(r.ruleId)} ${esc(r.title)}</b></div><small>${esc(r.detail)}</small></div>`).join('');
}
$('diffUploadBtn').onclick=()=>$('diffUploadInput').click();
$('diffUploadInput').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  setBusy(true,'正在解析对比版本图纸…');
  try{diffOtherDoc=await parseAuxiliaryFile(f);renderDiffPanel();toast('已完成跨版本差异复审');}
  catch(err){toast('对比版本解析失败：'+err.message);}
  finally{setBusy(false);e.target.value='';}
};
$('diffDemoBtn').onclick=async()=>{
  const [v1,v2,bore]=await Promise.all([fetchPresetJson('shaftV1'),fetchPresetJson('shaftV2'),fetchPresetJson('bore')]);
  renderDiffPanel([v1,v2,bore]);
};

// --- Tab 4: Rule Catalog ---
function renderRuleCatalog(){
  const el=$('ruleCatalogPanel');if(!el)return;
  const rows=[
    ['R-DOC-01','完整性及版本','GB/T 10609.1-2008','标题栏核心五项（名称/图号/材料/比例/版本）完备度核验'],
    ['R-DOC-02','完整性及版本','GB/T 14689-2008','拦截 #SH#/#PZ# 等未签审 CAD 模板占位符，核验审签链、图幅与投影声明'],
    ['R-DOC-03','完整性及版本','GB/T 10609.1-2008','修订履历表最新版本号与现行图栏交叉一致性校验'],
    ['R-DOC-04','跨文档及版本','GB/T 10609.1-2008','核查标题栏 2D 图纸版本与关联 3D 数模版本是否同步升版'],
    ['R-DIM-01','尺寸与公差','GB/T 4458.5-2003','校验所有双行极限偏差数学合法性（上偏差 ES > 下偏差 EI，防止漏负号）'],
    ['R-DIM-02','制造与检验','GB/T 1800.1-2020','识别公差带宽 < 0.008 mm 的 IT5 级超精密加工与检测风险预警'],
    ['R-DIM-03','制图规范','GB/T 4458.4-2003','校验括弧参考尺寸 (X) 不得带公差、方框理论正确尺寸 [X] 须配公差框'],
    ['R-TOL-01','尺寸与公差','GB/T 1800.2-2020','ISO 孔大写/轴小写代号核验与内置常用公差带微米级查表校验'],
    ['R-TOL-02','尺寸与公差','GB/T 1804-2000','检查自由尺寸是否被《技术要求》或图栏未注公差（如 GB/T 1804-m / ±0.15）覆盖'],
    ['R-GDT-01','尺寸与公差','GB/T 1182-2018','几何公差有序基准引用完整性校验，自动检出图面漏标基准框的悬空引用 FAIL'],
    ['R-GDT-02','尺寸与公差','GB/T 1182-2018','形状公差（○/▱）不得引基准；方向/同轴度/跳动公差（⊥/∥/◎/↗/⇗）必须引基准'],
    ['R-GDT-03','尺寸与公差','GB/T 1182-2018','孔轴中心位置度/同轴度未标圆柱公差带直径符 ⌀ 的歧义提示'],
    ['R-SURF-01','材料与工艺','GB/T 131-2006','精密配合圆柱面粗糙度标注完整性与 Ra 优先数列校验'],
    ['R-FUNC-01','功能设计','DEMO-SPEC-001','功能角色驱动规则：未确认角色时输出 UNKNOWN；确认为轴承安装面后执行 Ra ≤ 0.8 μm'],
    ['R-MAT-01/02','材料与风险','GB/T 39568-2020','核查去毛刺/未注圆角、电机轴热处理硬度区间及壳体防腐/RoHS 环保条款'],
    ['R-INSP-01','制造与检验','GB/T 1958-2017','FAI 检验气泡号【1~N】连号完整性、断号跳号与孤立气泡检查'],
    ['R-FIT-01','功能设计','DEMO-SPEC-001','跨图轴—孔极限间隙/过盈微米级工程计算与跨版本失配干涉检出']
  ];
  el.innerHTML=`<table class="catatable">
    <thead><tr><th>规则ID</th><th>评审维度</th><th>规范依据（点击打开官方入口）</th><th>审核逻辑说明</th></tr></thead>
    <tbody>${rows.map(([id,dim,code,desc])=>{
      const s=STANDARDS_INDEX[code];
      const link=s?.url?`<a class="stdtag" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(code)} ↗</a>`:`<span class="stdtag demo">${esc(code)} (模拟)</span>`;
      return `<tr><td><span class="rulecode">${esc(id)}</span></td><td>${esc(dim)}</td><td>${link}</td><td>${esc(desc)}</td></tr>`;
    }).join('')}</tbody>
  </table>`;
}

// --- Extraction List & Manual Editor ---
function renderMiniViz(){
  const mv=$('miniViz'),items=data.items;if(!mv)return;
  if(!items.length){mv.hidden=true;return;}
  mv.hidden=false;
  const byCat=cats.map(c=>items.filter(i=>i.category===c).length);
  const segs=byCat.map((n,i)=>n?'<i style="flex:'+n+';background:'+catColors[i]+'" title="'+cats[i]+' '+n+' 项"></i>':'').join('');
  const chips=byCat.map((n,i)=>n?'<button class="mchip" data-jumpcat="'+cats[i]+'"><span class="dot" style="background:'+catColors[i]+'"></span>'+cats[i]+' <b>'+n+'</b></button>':'').join('');
  mv.innerHTML='<div class="segbar">'+segs+'</div><div class="minichips">'+chips+'</div>';
}
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
  $('list').innerHTML=html.join('')||'<div class="blank">'+(items.length?'没有符合条件的提取项':'上传 PDF 后将自动提取全部标注信息。')+'</div>';
  $('export').disabled=busy||!items.length;
  renderMiniViz();
  recomputeReviewAndEDM();
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
  $('boxpick').onclick=()=>{boxing=true;$('viewport').classList.add('drawing');$('drawhint').hidden=false;paintMarks();};
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
$('samplePicker').onchange=async e=>{
  const name=e.target.value;if(!name||busy)return;
  setBusy(true,'正在加载示例图纸…');
  try{const sKey=await loadPreset(name);const saved=await dbRead(sKey).catch(()=>null);await startDoc(null,sKey,saved,true);switchRightMode('review');}
  catch(err){toast('示例载入失败：'+err.message);}
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

// Unified Extraction + Automated Engineering Review Pipeline
async function runExtractAndAudit(scrollToReport=false){
  if(!key||busy)return;
  closeEditor();setBusy(true,'正在解析图纸矢量与公差…');
  try{
    let activePdf=pdf;
    const presetEntry=Object.entries(SAMPLES).find(([,v])=>v.key===key);
    if(!activePdf&&!img&&presetEntry){
      progress('正在读取图纸 PDF 矢量流…',0.05);
      const res=await fetch(presetEntry[1].pdf);
      if(res.ok)activePdf=await openPDF(new Uint8Array(await res.arrayBuffer()));
    }
    const result=(activePdf||img)?await extract({pdf:activePdf,img,pages:data.pages.length,progress}):{items:structuredClone(sample.items),warning:'',preflight:null};
    preflight=result.preflight||null;
    if(activePdf&&activePdf!==pdf)await activePdf.destroy().catch(()=>{});
    const previous=new Map(data.items.map(i=>[i.id,i])),fresh=result.items.filter(i=>!removed.has(i.id)).map(i=>previous.get(i.id)?.edited?previous.get(i.id):i);
    const ids=new Set(fresh.map(i=>i.id));fresh.push(...data.items.filter(i=>i.edited&&!ids.has(i.id)));
    data.items=fresh;filter='all';$('search').value='';opened=new Set([cats[0],cats[1]]);limits={};fit();await persist();
    switchRightMode('review');
    renderList();
    const rc=currentReview?.counts||{};
    toast(result.warning||(fresh.length?`解析审核完成：提取 ${fresh.length} 项，检出 ${rc.FAIL||0} 项必改问题 / ${rc.WARNING||0} 项风险 / ${rc.UNKNOWN||0} 项待确认`:'未找到可读文字，可手动框选补录。'));
    if(scrollToReport&&fresh.length){
      document.querySelector('[data-reptab="report"]')?.click();
      setTimeout(()=>$('reportSection')?.scrollIntoView({behavior:'smooth',block:'start'}),180);
    }
  }
  catch(e){toast('解析审核未完成：'+(e.message||e));}
  finally{setBusy(false);renderList();}
}

$('upload').onclick=()=>$('file').click();
async function upload(file){
  if(!file||busy)return;
  if(!/\.(pdf|png|jpg|jpeg|webp|bmp)$/i.test(file.name)){toast('请选择 PDF、PNG、JPG、WebP 或 BMP 图纸。');return;}
  setBusy(true,'正在读取图纸并准备自动解析审核…');
  let shouldAutoRun=false;
  try{
    const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
    const k=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
    const saved=await dbRead(k).catch(()=>null);
    await startDoc(file,k,saved);
    if(saved?.items?.length){
      switchRightMode('review');
      toast('已恢复该图纸的历史解析与审核记录');
    }else{
      shouldAutoRun=true;
    }
  }
  catch(e){toast('无法打开图纸：'+e.message);}
  finally{setBusy(false);$('file').value='';renderList();}
  if(shouldAutoRun)await runExtractAndAudit(true);
}
$('file').onchange=e=>upload(e.target.files[0]);
for(const event of ['dragover','drop'])document.addEventListener(event,e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();if(event==='drop')upload(e.dataTransfer.files[0]);}});
$('recognize').onclick=()=>runExtractAndAudit(true);

$('exportMd').onclick=()=>{
  if(!currentEDM||!currentReview)return;
  const md=exportReviewMarkdown(currentEDM,currentReview);
  const url=URL.createObjectURL(new Blob([md],{type:'text/markdown;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=data.name.replace(/\.[^.]+$/,'')+'-审核问题报告.md';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('export').onclick=()=>{
  const autoItems=data.items.filter(i=>i.source!=='手工'),manualCount=data.items.length-autoItems.length,zeroEdit=autoItems.filter(i=>!i.review&&!i.modified).length,modConfirmed=autoItems.filter(i=>!i.review&&i.modified).length,initAuto=autoItems.length+removed.size,finalValid=autoItems.length+manualCount;
  const payload={
    图纸:data.name,页数:data.pages.length,
    校核统计:{初始自动识别数:initAuto,直接确认数:zeroEdit,修改后确认数:modConfirmed,删除误检数:removed.size,手工补录数:manualCount,待复核数:data.items.filter(i=>i.review).length},
    智能评审报告:currentReview?{门禁结论:currentReview.overallGate,自动化覆盖率:currentReview.autoCoveragePct+'%',状态统计:currentReview.counts,角色确认:roleOverrides,偏离放行:ruleExceptions,逐条结论:currentReview.results}:null,
    items:data.items.map(i=>({...i,status:i.review?'待复核':'已确认'}))
  };
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=data.name.replace(/\.[^.]+$/,'')+'-提取与审核结果.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};

async function boot(){
  renderRuleCatalog();
  setBusy(true,'正在载入工作台…');
  try{
    const defaultKey=await loadPreset('flange');
    const k=await dbRead('current').catch(()=>null),record=k?await dbRead(k).catch(()=>null):null;
    const hasUserWork=record&&(!isPresetKey(k)&&!!record.blob);
    if(hasUserWork){
      try{await startDoc(record.blob,k,record,true);return;}catch{}
    }
    await startDoc(null,defaultKey,null,true);
  }
  catch(e){toast('工作台未载入：'+e.message);}
  finally{setBusy(false);switchRightMode('review');renderList();}
}
boot();
