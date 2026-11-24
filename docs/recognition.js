// Source boxes use page-relative coordinates, measured from the top left.
const asset = path => new URL('vendor/' + path, document.baseURI).href;
let pdfjs;
export async function openPDF(bytes) {
  pdfjs ??= await import('./vendor/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = asset('pdf.worker.min.mjs');
  return pdfjs.getDocument({data:bytes, cMapUrl:asset('cmaps/'),cMapPacked:true,
    standardFontDataUrl:asset('standard_fonts/'),wasmUrl:asset('wasm/'),isEvalSupported:false}).promise;
}
export async function renderPage(page, longest) {
  const native=page.getViewport({scale:1});
  const viewport=page.getViewport({scale:longest/Math.max(native.width,native.height)});
  const canvas=document.createElement('canvas');
  canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  await page.render({canvas,viewport}).promise;
  return canvas;
}
export async function imageOf(blob) {
  const image=new Image();
  const url=URL.createObjectURL(blob);
  image.src=url;
  try {await image.decode();return image;} catch(e){URL.revokeObjectURL(url);throw e;}
}
function cap(n){return Math.max(0,Math.min(1,n));}
function normalize(x,y,w,h,W,H) {
  const left=cap(x/W),top=cap(y/H);
  return [left,top,Math.max(0.0001,cap((x+w)/W)-left),Math.max(0.0001,cap((y+h)/H)-top)];
}
function field(text) {
  const labels=[[/^(?:零件名称|品名|PART NAME)\s*[:：]?\s*(.+)$/i,'零件名称'],[/^(?:图号|零件编码|CODE)\s*[:：]?\s*(.+)$/i,'图号'],[/^(?:材料|材质|MATERIAL)\s*[:：]?\s*(.+)$/i,'材料'],[/^(?:比例|SCALE)\s*[:：]?\s*(.+)$/i,'比例']];
  for(const [pattern,label] of labels){const match=text.match(pattern);if(match)return ['基本信息',label,match[1]];}
  if(/更改|修订|更改为|REVISION|变更|版本/.test(text))return ['版本记录','修订标注',text];
  if(/要求|表面|毛刺|热处理|粗糙度|不得|检验|镀层|倒角|未注|焊接/.test(text))return ['技术要求','要求原文',text];
  if(/\d/.test(text)&&/^[\s()（）【】\[\]ØΦφ⌀±+−\-\d.RrMmx×X/°~:：|]+(?:\s*(?:MIN|MAX|mm))?$/i.test(text))return ['尺寸与公差','尺寸标注',text];
  if(/图号|编码|零件|材质|材料|重量|图幅|设计|审核|比例|NAME|WEIGHT|MATERIAL|SCALE|CODE/i.test(text))return ['基本信息','图栏文字',text];
  return ['其他标注','图纸文字',text];
}
function make(text,box,page,source,index){
  const [category,label,value]=field(text);
  return {id:source+'-'+page+'-'+index,label,value,category,box,page,review:true,source,original:text};
}
async function vectorItems(page,number){
  const vp=page.getViewport({scale:1});
  const content=await page.getTextContent();
  const rows=[];
  for(const t of content.items) {
    const value=t.str?.trim();if(!value)continue;
    const m=pdfjs.Util.transform(vp.transform,t.transform);
    const theta=Math.atan2(m[1],m[0]),ux=Math.cos(theta),uy=Math.sin(theta);
    const h=Math.hypot(m[2],m[3])||t.height||8,w=Math.max(t.width,1);
    const ascent=content.styles[t.fontName]?.ascent??0.85;
    const pts=[0,w].flatMap(dx=>[-ascent*h,(1-ascent)*h].map(dy=>[m[4]+ux*dx-uy*dy,m[5]+uy*dx+ux*dy]));
    const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);const x=Math.min(...xs),y=Math.min(...ys);
    rows.push(make(value,normalize(x,y,Math.max(...xs)-x,Math.max(...ys)-y,vp.width,vp.height),number,'PDF',rows.length+1));
  }
  return rows;
}
let ocrLib;
async function worker(){
  ocrLib ??= new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src=asset('tesseract.min.js');
    s.onload=()=>resolve(window.Tesseract);s.onerror=()=>{ocrLib=null;reject(Error('OCR 模块未载入'))};document.head.append(s);
  });
  const T=await ocrLib;
  const w=await T.createWorker('chi_sim+eng',1,{workerPath:asset('worker.min.js'),corePath:asset('tesseract-core-lstm.wasm.js'),langPath:asset(''),workerBlobURL:false});
  await w.setParameters({tessedit_pageseg_mode:T.PSM.SPARSE_TEXT,preserve_interword_spaces:'1'});
  return w;
}
function sameRegion(a,b){
  const [x,y,w,h]=a,[X,Y,W,H]=b;
  const overlap=Math.max(0,Math.min(x+w,X+W)-Math.max(x,X))*Math.max(0,Math.min(y+h,Y+H)-Math.max(y,Y));
  return overlap/Math.max(1e-10,Math.min(w*h,W*H))>0.58;
}
function tileStarts(size,max){
  if(size<=max)return [0];
  const steps=Math.ceil((size-max)/(max-130));
  return Array.from({length:steps+1},(_,i)=>Math.round((size-max)*i/steps));
}
export async function extract({pdf,img,pages,progress}){
  const results=[];let engine,ocrError;
  try{
    for(let n=1;n<=pages;n++){
      progress('读取第 '+n+' / '+pages+' 页',(n-1)/pages);
      const page=pdf?await pdf.getPage(n):null;
      const fields=page?await vectorItems(page,n):[];
      const vp=page?.getViewport({scale:1});
      const canvas=page?await renderPage(page,Math.min(5200,Math.ceil(Math.max(vp.width,vp.height)*2.7))):document.createElement('canvas');
      if(!page){
        const ratio=Math.min(1,6000/Math.max(img.naturalWidth,img.naturalHeight));
        canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
        const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
      }
      try{
        if(ocrError)throw ocrError;
        engine??=await worker();
        const tiles=tileStarts(canvas.height,1850).flatMap(y=>tileStarts(canvas.width,1850).map(x=>({x,y})));
        let index=0;
        const clean=s=>s.toLowerCase().replace(/[\s\u00ad]/g,'');
        for(const [i,{x,y}] of tiles.entries()){
          progress('第 '+n+' / '+pages+' 页 · OCR 区域 '+(i+1)+' / '+tiles.length,(n-1+i/tiles.length)/pages);
          const tile=document.createElement('canvas');tile.width=Math.min(1850,canvas.width-x);tile.height=Math.min(1850,canvas.height-y);
          tile.getContext('2d').drawImage(canvas,x,y,tile.width,tile.height,0,0,tile.width,tile.height);
          const {data}=await engine.recognize(tile,{},{blocks:true,text:true});
          for(const block of data.blocks??[])for(const para of block.paragraphs??[])for(const line of para.lines??[]){
            const str=line.text.trim();if(!str)continue;
            const b=line.bbox;
            // Adjacent tiles include an overlap. Avoid returning clipped edge fragments.
            if((x>0&&b.x0<4)||(y>0&&b.y0<4)||(x+tile.width<canvas.width&&b.x1>tile.width-4)||(y+tile.height<canvas.height&&b.y1>tile.height-4))continue;
            const box=normalize(x+b.x0,y+b.y0,b.x1-b.x0,b.y1-b.y0,canvas.width,canvas.height);
            if(fields.some(f=>sameRegion(f.box,box)&&(clean(f.original)===clean(str)||
              (f.source==='PDF'&&clean(f.original).includes(clean(str))))))continue;
            fields.push(make(str,box,n,'OCR',++index));
          }
          tile.width=tile.height=0;
        }
      } catch(e){ocrError=e;}
      canvas.width=canvas.height=0;results.push(...fields);
    }
  }finally{if(engine)await engine.terminate();}
  if(ocrError&&!results.length)throw Error('OCR 未完成：'+(ocrError.message||ocrError));
  return {items:results,warning:ocrError?'OCR 未完整完成，已保留可读取内容，可重试识别。':''};
}
