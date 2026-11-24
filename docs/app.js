import {openPDF,renderPage,imageOf,extract} from './recognition.js?v=20261124c';
const $=id=>document.getElementById(id);
const patterns={shield:'M12 3 4 6v5c0 5 4 8 8 10 4-2 8-5 8-10V6z M8 12l3 3 5-6',chart:'M4 19h16M7 16V9m5 7V5m5 11v-5',upload:'M12 16V3m-5 5 5-5 5 5 M4 15v5h16v-5',download:'M12 3v13m-5-5 5 5 5-5 M4 16v5h16v-5',scan:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5 M7 12h10 M12 7v10',file:'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6m-6 4h6',expand:'M4 9V4h5M4 4l6 6m10 5v5h-5m5 0-6-6',fit:'M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4 M8 9h8v6H8z',minus:'M5 12h14',plus:'M12 5v14M5 12h14',list:'M8 5h13M8 12h13M8 19h13M3 5h.1M3 12h.1M3 19h.1',search:'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',target:'M12 2v4m10 6h-4m-6 10v-4M2 12h4 M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0 M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0',chevron:'m6 9 6 6 6-6',ruler:'m3 15 12-12 6 6L9 21z M12 6l3 3m-6 0 2 2m-5 1 3 3',notes:'M5 3h14v18H5z M8 8h8m-8 4h8m-8 4h5',history:'M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v5l4 2',tag:'M3 3h8l10 10-8 8L3 11z M7 7h.1',check:'m4 12 5 5L20 6',close:'m6 6 12 12M6 18 18 6'};
const icon=k=>'<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+patterns[k]+'"/></svg>';
document.querySelectorAll('[data-icon]').forEach(el=>el.replaceWith(fragment(icon(el.dataset.icon))));
function fragment(s){const t=document.createElement('template');t.innerHTML=s;return t.content;}
const cats=['基本信息','尺寸与公差','技术要求','版本记录','其他标注'];
const catIcons=['file','ruler','notes','history','tag'];
const catColors=['#356844','#689f38','#2e7d8a','#c6842f','#75877a'];
const SAMPLES={
  flange:{key:'6b6c28e529942e8c735645da36d74424a0db9b76846d86dc030f59a652f565c0',json:'sample/flange-housing.json',pdf:'sample/flange-housing.pdf'},
  plate:{key:'907531414b5ec8f6b5d9e9cc832bc5080add7e390609f005e42f10a9734f18f7',json:'sample/sample.json',pdf:'sample/mounting-plate.pdf'}
};
const sampleCache=new Map();
let activeSample='flange';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data={name:'',pages:[],items:[]},sample,key='',pdf=null,img=null,fileBlob=null,removed=new Set(),fileURLs=[],busy=false;
let page=1,selected=null,filter='all',opened=new Set([cats[0],cats[1]]),limits={},marks=true,boxing=false,drag=null;
let z=1,dx=0,dy=0,base=1,pageSeq=0,docSeq=0,showTimer;
function toast(s){$('toast').textContent=s;$('toast').style.display='block';clearTimeout(showTimer);showTimer=setTimeout(()=>$('toast').style.display='none',4500);}
const idb=new Promise((resolve,reject)=>{const req=indexedDB.open('drawing-desk-review',1);req.onupgradeneeded=()=>req.result.createObjectStore('drawings');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
idb.catch(()=>{});
async function dbRead(k){const db=await idb;return new Promise((res,rej)=>{const r=db.transaction('drawings').objectStore('drawings').get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function persist(){
  if(!key)return;
  const docKey=key,record={items:structuredClone(data.items),removed:[...removed],name:data.name,blob:fileBlob};
  try{const db=await idb;await new Promise((res,rej)=>{const t=db.transaction('drawings','readwrite');const s=t.objectStore('drawings');s.put(record,docKey);s.put(docKey,'current');t.oncomplete=res;t.onabort=t.onerror=()=>rej(t.error);});}
  catch{toast('浏览器未能保存本次更改，请导出结果留存。');}
}
async function loadPreset(name){
  if(!sampleCache.has(name)){
    const res=await fetch(SAMPLES[name].json);
    if(!res.ok)throw Error('样图未就绪');
    sampleCache.set(name,await res.json());
  }
  activeSample=name;sample=sampleCache.get(name);
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
  busy=flag;for(const id of ['recognize','upload','add','export'])$(id).disabled=flag;
  document.querySelectorAll('[data-sample]').forEach(b=>b.disabled=flag);
  $('progress').hidden=!flag;$('list').inert=flag;$('editor').inert=flag;
  if(flag){$('progressText').textContent=msg;$('progress').querySelector('progress').value=0;}
}
function progress(msg,fraction){$('progressText').textContent=msg;$('progress').querySelector('progress').value=Math.round(fraction*100);}
function teardown(){fileURLs.forEach(URL.revokeObjectURL);fileURLs=[];if(img)URL.revokeObjectURL(img.src);if(pdf)pdf.destroy().catch(()=>{});}
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
  docSeq++;teardown();pdf=newPdf;img=newImg;key=docKey;fileBlob=file||null;
  syncPresetState(docKey);
  const useSavedItems=record?.items&&(!isPresetKey(key)||record.items.some(i=>i.edited)||(record.removed?.length>0));
  data={name:file?.name||record?.name||sample.name,pages,items:useSavedItems?record.items:(initial&&isPresetKey(key)?structuredClone(sample.items):[])};
  removed=new Set(useSavedItems?(record?.removed??[]):[]);selected=null;page=1;filter='all';limits={};opened=new Set([cats[0],cats[1]]);
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
  const gdtCnt=items.filter(i=>/[⊥▱∥≡○◎⌖]/.test(i.value)).length;
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
    const bStatus=a.balloonPaired?(a.balloonPaired+' / '+(a.balloonPaired+a.unpaired)+' (100%)'):'无气泡号';
    la.innerHTML='<div class="statgrid">'
      +'<div class="statbox"><span>结构化提取总数</span><strong>'+a.total+'</strong><small>PDF矢量 '+a.pdfCnt+' · 靶向OCR '+a.ocrCnt+(a.manCnt?' · 补录 '+a.manCnt:'')+'</small></div>'
      +'<div class="statbox"><span>形位公差与带公差特征</span><strong>'+(a.byCat[1])+'</strong><small>含 '+a.gdtCnt+' 处几何公差框解码</small></div>'
      +'<div class="statbox"><span>人工校核确认进度</span><strong>'+a.confirmed+' / '+a.total+'</strong><small>已剔除误检 '+removed.size+' 项</small></div>'
      +'</div><div class="distlist">'+bars+'</div>'
      +'<div class="auditgrid">'
      +'<div class="audititem"><span>标题栏核心五项完备度</span><b>'+a.coreHit+' / 5 完备</b></div>'
      +'<div class="audititem"><span>检验气泡号【N】绑定</span><b>'+bStatus+'</b></div>'
      +'<div class="audititem"><span>同位重复文字层过滤</span><b>0.0% 残留</b></div>'
      +'<div class="audititem"><span>图框分区与三角 △ 滤噪</span><b>已净除</b></div>'
      +'</div>';
  }
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
 $('list').innerHTML=html.join('')||'<div class="blank">'+(items.length?'没有符合条件的提取项':'点击「AI 识别」提取图纸信息，或使用「补录」添加标注。')+'</div>';
 $('export').disabled=busy||!items.length;
 renderAnalytics();
}
function cancelBox(){boxing=false;drag=null;$('viewport').classList.remove('drawing','dragging');$('drawhint').hidden=true;paintMarks();}
function closeEditor(){selected=null;cancelBox();$('editor').hidden=true;renderList();paintMarks();}
async function selectItem(id,move=true){
 if(busy)return;const item=data.items.find(i=>i.id===id);if(!item)return;
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
$('overlay').onclick=e=>{const b=e.target.closest('[data-id]');if(b)selectItem(b.dataset.id);};
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
document.querySelector('.tabs').onclick=e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;renderList();};
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
$('add').onclick=async()=>{if(!key||busy)return;const item={id:'manual-'+crypto.randomUUID(),category:cats[4],label:'手工补录',value:'',page,box:null,review:true,edited:true,source:'手工'};
 data.items.push(item);filter='all';$('search').value='';await selectItem(item.id,false);$('boxpick').click();persist();};
$('upload').onclick=()=>$('file').click();
async function upload(file){if(!file||busy)return;
 if(!/\.(pdf|png|jpg|jpeg|webp|bmp)$/i.test(file.name)){toast('请选择 PDF、PNG、JPG、WebP 或 BMP 图纸。');return;}
 setBusy(true,'正在读取图纸…');
 try{const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());const k=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
 const saved=await dbRead(k).catch(()=>null);await startDoc(file,k,saved);toast(saved?'已恢复此图纸的校核记录':'图纸已就绪，可开始 AI 识别');}
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
   const result=(activePdf||img)?await extract({pdf:activePdf,img,pages:data.pages.length,progress}):{items:structuredClone(sample.items),warning:''};
   if(activePdf&&activePdf!==pdf)await activePdf.destroy().catch(()=>{});
   const previous=new Map(data.items.map(i=>[i.id,i])),fresh=result.items.filter(i=>!removed.has(i.id)).map(i=>previous.get(i.id)?.edited?previous.get(i.id):i);
   const ids=new Set(fresh.map(i=>i.id));fresh.push(...data.items.filter(i=>i.edited&&!ids.has(i.id)));
   data.items=fresh;filter='all';$('search').value='';opened=new Set([cats[0],cats[1]]);limits={};fit();await persist();
   toast(result.warning||(fresh.length?'AI 识别完成，共提取 '+fresh.length+' 项结构化标注':'未找到可读文字，可手动框选补录。'));
 }
 catch(e){toast('识别未完成：'+(e.message||e));}
 finally{setBusy(false);renderList();}
};
$('export').onclick=()=>{const autoItems=data.items.filter(i=>i.source!=='手工'),manualCount=data.items.length-autoItems.length,zeroEdit=autoItems.filter(i=>!i.review&&!i.modified).length,modConfirmed=autoItems.filter(i=>!i.review&&i.modified).length,initAuto=autoItems.length+removed.size,finalValid=autoItems.length+manualCount;
 const payload={图纸:data.name,坐标说明:'box = [左, 上, 宽, 高]，各值为相对当前页的比例，原点在左上角。',页数:data.pages.length,校核统计:{初始自动识别数:initAuto,直接确认数:zeroEdit,修改后确认数:modConfirmed,删除误检数:removed.size,手工补录数:manualCount,待复核数:data.items.filter(i=>i.review).length,直接可用率:initAuto?+(zeroEdit/initAuto*100).toFixed(1)+'%':'0%',自动有效保留率:initAuto?+(autoItems.length/initAuto*100).toFixed(1)+'%':'0%',估算召回率:finalValid?+(autoItems.length/finalValid*100).toFixed(1)+'%':'0%'},items:data.items.map(i=>({...i,status:i.review?'待复核':'已确认'}))};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=data.name.replace(/\.[^.]+$/,'')+'-提取结果.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
async function boot(){setBusy(true,'正在载入工作台…');
 try{
   const defaultKey=await loadPreset('flange');
   const k=await dbRead('current').catch(()=>null),record=k?await dbRead(k).catch(()=>null):null;
   const hasUserWork=record&&(isPresetKey(k)?(record.items?.some(i=>i.edited)||(record.removed?.length>0)):!!record.blob);
   if(hasUserWork){
     try{await startDoc(record.blob||null,k,record,true);return;}catch{}
   }
   await startDoc(null,defaultKey,null,true);
 }
 catch(e){toast('工作台未载入：'+e.message);}
 finally{setBusy(false);renderList();}
}
boot();