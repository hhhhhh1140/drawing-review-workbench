// Source boxes use page-relative coordinates [left, top, width, height], measured from the top left.
import './vendor/pdf-polyfills.mjs?v=20261124c';
const asset = path => new URL('vendor/' + path, document.baseURI).href;
let pdfjs;

export async function openPDF(bytes) {
  pdfjs ??= await import('./vendor/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = asset('pdf.worker.shim.mjs?v=20261124c');
  return pdfjs.getDocument({
    data: bytes, cMapUrl: asset('cmaps/'), cMapPacked: true,
    standardFontDataUrl: asset('standard_fonts/'), wasmUrl: asset('wasm/'), isEvalSupported: false
  }).promise;
}

export async function renderPage(page, longest) {
  const native = page.getViewport({ scale: 1 });
  const maxAreaScale = Math.sqrt(16000000 / Math.max(1, native.width * native.height));
  const scale = Math.min(longest / Math.max(native.width, native.height), maxAreaScale);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
  const canvasContext = canvas.getContext('2d');
  await page.render({ canvas, canvasContext, viewport }).promise;
  return canvas;
}

export async function imageOf(blob) {
  const image = new Image();
  const url = URL.createObjectURL(blob);
  image.src = url;
  try { await image.decode(); return image; } catch (e) { URL.revokeObjectURL(url); throw e; }
}

function cap(n) { return Math.max(0, Math.min(1, n)); }
function normBox(x0, y0, x1, y1, W, H) {
  const l = cap(x0 / W), t = cap(y0 / H);
  return [l, t, Math.max(0.0001, cap(x1 / W) - l), Math.max(0.0001, cap(y1 / H) - t)];
}
function unionBox(a, b) {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}
function sameRegion(a, b, thr = 0.58) {
  const [x, y, w, h] = a, [X, Y, W, H] = b;
  const inter = Math.max(0, Math.min(x + w, X + W) - Math.max(x, X)) * Math.max(0, Math.min(y + h, Y + H) - Math.max(y, Y));
  return inter / Math.max(1e-10, Math.min(w * h, W * H)) > thr;
}
function boxOverlapVP(a, b) {
  const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
  const iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  return (ix * iy) / Math.max(1e-6, Math.min((a[2] - a[0]) * (a[3] - a[1]), (b[2] - b[0]) * (b[3] - b[1])));
}
function cleanKey(s) { return String(s || '').toLowerCase().replace(/[\s\u00ad]/g, ''); }

export function tidyText(raw) {
  const radMap = { '⻆': '角', '⻓': '长', '⻔': '门', '⻅': '见', '⻚': '页', '⻛': '风', '⻜': '飞', '⻝': '食', '⻥': '鱼', '⻮': '齿' };
  let s = String(raw || '').normalize('NFKC').replace(/[\u2e80-\u2eff]/g, ch => radMap[ch] || ch).replace(/\u00ad/g, '').trim().replace(/\s+/g, ' ');
  if (!s) return '';
  // Collapse spaces between CJK characters & full-width brackets/punctuation
  for (let i = 0; i < 2; i++) {
    s = s.replace(/([\u4e00-\u9fff【】（）《》、，。：；])\s+(?=[\u4e00-\u9fff【】（）《》、，。：；])/g, '$1');
  }
  s = s.replace(/([【（\[])\s+/g, '$1').replace(/\s+([】）\]])/g, '$1');
  s = s.replace(/\bM\s+A\s+X\b/g, 'MAX').replace(/\bm\s+i\s+n\b/g, 'min').replace(/\bM\s+I\s+N\b/g, 'MIN');
  s = s.replace(/\bL\s*(\d)\s*-\s*([A-Z])\b/g, 'L$1-$2').replace(/\bL\s+(\d)\b/g, 'L$1');
  s = s.replace(/\b([A-Z])\s*-\s*([A-Z])\b/g, '$1-$2');
  // Collapse spaced single digits like "5 3 . 8" -> "53.8", "+ 0 . 0 4" -> "+0.04", "【2 8】" -> "【28】"
  s = s.replace(/(^|[\s(（【\[+\-−±⌀øØΦRr×x/:|])(\d(?:\s+\d)+)(?=$|[\s)）】\].\d°MAXmin/:|])/g, (_, p, d) => p + d.replace(/\s+/g, ''));
  s = s.replace(/\bA\s+1\b/g, 'A1');
  s = s.replace(/(\d)\s*\.\s*(\d)/g, '$1.$2');
  s = s.replace(/(^|[\s(（+\-−±⌀øØΦRr×x/:|])(\d+)\s+(\d+)(?=$|[\s)）°])/g, '$1$2$3');
  s = s.replace(/(\d)\s*\.\s*(\d)/g, '$1.$2');
  s = s.replace(/([+\-−±⌀øØΦR])\s+(?=\d|\()/g, '$1');
  s = s.replace(/(\d)\s*-\s*(?=R|\(|（)/g, '$1-');
  s = s.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  s = s.replace(/(\d)\s*°/g, '$1°').replace(/(\d)\s*:\s*(\d)/g, '$1:$2');
  s = s.replace(/\|\s*(\d)/g, '|$1');
  return s.trim();
}

function classifyField(text) {
  const s = tidyText(text);
  const compact = s.replace(/\s+/g, '');
  if (/更改|修订|更改为|变更为|变更|调整为/.test(compact) && /\d/.test(compact)) return ['版本记录', '修订标注', s];
  const kv = [
    [/^(?:零件名称|品名|PART\s*NAME)(?:\s*[:：]\s*|\s+)(.+)$/i, '零件名称'],
    [/^(?:图纸编号|图号|DRAWING\s*NO\.?|DWG\s*NO\.?)(?:\s*[:：]\s*|\s+)(.+)$/i, '图纸编号'],
    [/^(?:零件编码|CODE)(?:\s*[:：]\s*|\s+)(.+)$/i, '零件编码'],
    [/^(?:材料牌号|材料|材质|MATERIAL)(?:\s*[:：]\s*|\s+)(?!S\b)(.+)$/i, '材料牌号'],
    [/^(?:比例|SCALE)(?:\s*[:：]\s*|\s+)(.+)$/i, '图纸比例'],
    [/^(?:版本|REVISION|REV\.?)(?:\s*[:：]\s*|\s+)(.+)$/i, '版本'],
    [/^(?:页次|页码|SHEET)(?:\s*[:：]\s*|\s+)(.+)$/i, '页次']
  ];
  for (const [pattern, label] of kv) {
    const m = s.match(pattern);
    if (m && m[1].trim()) return ['基本信息', label, m[1].trim()];
  }
  if (/要求|表面|毛刺|毛口|翘曲|热处理|粗糙度|不得|不可有|检验|抽样检查|镀层|盐雾|漏气|环保|未注|无指示尺寸|焊接|调质|淬火|渗碳|DEBURR|SHARP\s*EDGES|DIMENSIONS\s*IN|TOLERANCE|FINISH|CHAMFER/i.test(s) &&
      !/^(?:Ra|Rz|Ry|Rq)\s*\d/i.test(s)) {
    return ['技术要求', '要求原文', s];
  }
  if (/^(?:Ra|Rz|Ry|Rq|▽+)\s*\d+(?:\.\d+)?(?:\s*(?:μm|um|max|min))?$/i.test(s)) {
    return ['尺寸与公差', '表面粗糙度', s];
  }
  if (/^(?:HRC|HBW|HBS|HV|HRA|HRB)\s*\d+(?:\.\d+)?(?:\s*[~～\-−]\s*\d+(?:\.\d+)?)?$/i.test(s)) {
    return ['技术要求', '硬度要求', s];
  }
  if (/^(?:\d+\s*[-×xX]\s*)?[ØΦφ⌀RrMm]?\s*\d+(?:\.\d+)?\s*(?:[A-HJ-ZCDEa-hj-zcde]{1,2}\d{1,2})(?:\s*\([+\-−±\d./\s]+\))?$/.test(s)) {
    return ['尺寸与公差', '配合公差标注', s];
  }
  if (!/^\d+:\d+$/.test(compact) && !/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(compact) &&
      (/\d/.test(compact) && /^(?:min|MAX)?[\s()（）【】\[\]ØΦφ⌀±+−\-\d.RrMmCc×xX/°~:：|,⊥▱∥≡○◎⌖↗⇗Ⓜ部]+(?:min|MAX|mm|DIA)?[\d.]*$/i.test(compact) ||
       /^(?:\d+\s*[x×]\s*)?DIA\s*\d+(?:\.\d+)?$/i.test(s))) {
    return ['尺寸与公差', '尺寸标注', s];
  }
  if (/^(?:PART\s*NAME|DRAWING\s*NO\.?|DWG\s*NO\.?|WEIGHT\/?g?|MATERIAL|SCALE|CODE|SHEET|SIZE|REVISION|DRAWN|CHECKED|APPROVED|DATE)$/i.test(s)) {
    return ['基本信息', '图栏文字', s];
  }
  return ['其他标注', '图纸文字', s];
}

function makeItem(text, vpBox, W, H, page, source, index, overrideCat = null, overrideLabel = null) {
  const [c0, l0, v0] = classifyField(text);
  const category = overrideCat || c0;
  const label = overrideLabel || l0;
  const value = overrideCat ? tidyText(text) : v0;
  return {
    id: `${source}-${page}-${index}`,
    label, value, category,
    box: normBox(vpBox[0], vpBox[1], vpBox[2], vpBox[3], W, H),
    page, review: true, source, original: text, _vp: vpBox
  };
}

let ocrLib;
async function createOCRWorker() {
  ocrLib ??= new Promise((resolve, reject) => {
    if (window.Tesseract) { resolve(window.Tesseract); return; }
    const s = document.createElement('script');
    s.src = asset('tesseract.min.js');
    s.onload = () => resolve(window.Tesseract);
    s.onerror = () => { ocrLib = null; reject(Error('OCR 模块未载入')); };
    document.head.append(s);
  });
  const T = await ocrLib;
  const w = await T.createWorker('chi_sim+eng', 1, {
    workerPath: asset('worker.min.js'),
    corePath: asset('tesseract-core-lstm.wasm.js'),
    langPath: asset('').replace(/\/$/, ''),
    workerBlobURL: false
  });
  return { worker: w, PSM: T.PSM };
}

function cropFromCanvas(srcCanvas, vpBox, vpW, vpH, { rotate = 0, pad = 16, masks = [], inset = 0 } = {}) {
  const scaleX = srcCanvas.width / vpW, scaleY = srcCanvas.height / vpH;
  const sx = Math.max(0, Math.floor((vpBox[0] + inset) * scaleX));
  const sy = Math.max(0, Math.floor((vpBox[1] + inset) * scaleY));
  const sx1 = Math.min(srcCanvas.width, Math.ceil((vpBox[2] - inset) * scaleX));
  const sy1 = Math.min(srcCanvas.height, Math.ceil((vpBox[3] - inset) * scaleY));
  const sw = Math.max(1, sx1 - sx), sh = Math.max(1, sy1 - sy);

  const raw = document.createElement('canvas');
  raw.width = sw; raw.height = sh;
  const rctx = raw.getContext('2d');
  rctx.fillStyle = '#ffffff';
  rctx.fillRect(0, 0, sw, sh);
  rctx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  for (const mb of masks) {
    const mx0 = Math.floor(mb[0] * scaleX) - sx - 2;
    const my0 = Math.floor(mb[1] * scaleY) - sy - 2;
    const mw = Math.ceil((mb[2] - mb[0]) * scaleX) + 4;
    const mh = Math.ceil((mb[3] - mb[1]) * scaleY) + 4;
    rctx.fillRect(mx0, my0, mw, mh);
  }

  if (!rotate) {
    const out = document.createElement('canvas');
    out.width = sw + pad * 2; out.height = sh + pad * 2;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(raw, 0, 0, sw, sh, pad, pad, sw, sh);
    raw.width = raw.height = 0;
    return { canvas: out, sx, sy, pad, scaleX, scaleY };
  }

  // Rotate +90deg CW (to turn upward -90deg vertical text upright) or -90deg CCW
  const out = document.createElement('canvas');
  out.width = sh + pad * 2; out.height = sw + pad * 2;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.save();
  if (rotate > 0) {
    ctx.translate(pad + sh, pad);
    ctx.rotate(Math.PI / 2);
  } else {
    ctx.translate(pad, pad + sw);
    ctx.rotate(-Math.PI / 2);
  }
  ctx.drawImage(raw, 0, 0);
  ctx.restore();
  raw.width = raw.height = 0;
  return { canvas: out, sx, sy, pad, scaleX, scaleY };
}

async function extractVectors(page, vp) {
  const opList = await page.getOperatorList();
  const m = vp.transform;
  const toVP = (x, y) => [x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]];
  const hLines = [], vLines = [], slants = [], rects = [], parallelograms = [], circles = [], dashes = [], strokes = [];
  const seen = new Set();

  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] !== pdfjs.OPS.constructPath || !opList.argsArray[i][2]) continue;
    const bb = opList.argsArray[i][2];
    const p1 = toVP(bb[0], bb[1]), p2 = toVP(bb[2], bb[3]);
    const x0 = Math.min(p1[0], p2[0]), y0 = Math.min(p1[1], p2[1]);
    const x1 = Math.max(p1[0], p2[0]), y1 = Math.max(p1[1], p2[1]);
    const w = x1 - x0, h = y1 - y0;
    if (w < 0.05 && h < 0.05) continue;
    const key = `${Math.round(x0 * 2)},${Math.round(y0 * 2)},${Math.round(x1 * 2)},${Math.round(y1 * 2)},${opList.argsArray[i][1]?.[0]?.length || 0}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const buf = opList.argsArray[i][1]?.[0];
    const len = buf?.length || 0;

    if (h <= 1.8 && w >= 10) {
      hLines.push({ x0, x1, y: (y0 + y1) / 2 });
    } else if (w <= 1.8 && h >= 10) {
      vLines.push({ x: (x0 + x1) / 2, y0, y1 });
    } else if (len === 6 && buf[0] === 0 && buf[3] === 1) {
      if (w >= 6 && w <= 22 && h >= 10 && h <= 28) slants.push({ x0, y0, x1, y1, w, h });
    } else if (len >= 12 && len <= 19 && w >= 8 && h >= 8) {
      // Check if axis-aligned rectangle vs tilted parallelogram
      const pts = [];
      for (let k = 0; k + 2 < len; k += 3) if (buf[k] === 0 || buf[k] === 1) pts.push(toVP(buf[k + 1], buf[k + 2]));
      let aligned = pts.length >= 4;
      for (let k = 1; k < pts.length; k++) {
        const dx = Math.abs(pts[k][0] - pts[k - 1][0]), dy = Math.abs(pts[k][1] - pts[k - 1][1]);
        if (dx > 1.2 && dy > 1.2) { aligned = false; break; }
      }
      if (aligned) {
        rects.push({ x0, y0, x1, y1, w, h });
        if (w >= 14 && h >= 14) {
          hLines.push({ x0, x1, y: y0 }, { x0, x1, y: y1 });
          vLines.push({ x: x0, y0, y1 }, { x: x1, y0, y1 });
        }
      } else if (w >= 12 && w <= 30 && h >= 6 && h <= 18) {
        parallelograms.push({ x0, y0, x1, y1, w, h });
      }
    } else if (len >= 24 && w >= 5.8 && w <= 22 && h >= 5.8 && h <= 22 && w / h >= 0.75 && w / h <= 1.32) {
      circles.push({ x0, y0, x1, y1, w, h, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 });
    }

    if ((h <= 1.5 && w >= 2.2 && w <= 10) || (w <= 1.5 && h >= 2.2 && h <= 10) ||
        (len === 27 && w >= 2.0 && w <= 8.5 && h >= 2.0 && h <= 8.5 && Math.min(w, h) <= 4.5)) {
      dashes.push({ x0, y0, x1, y1, w, h });
    }
    if (w <= 22 && h <= 22 && !(h <= 1.5 && w > 12) && !(w <= 1.5 && h > 12)) {
      strokes.push({ x0, y0, x1, y1, w, h, used: false });
    }
  }

  // Detect revision triangles Δ (left slant + right slant + horizontal base)
  const triangles = [];
  for (let i = 0; i < slants.length; i++) {
    const a = slants[i];
    for (let j = i + 1; j < slants.length; j++) {
      const b = slants[j];
      if (Math.abs(a.y0 - b.y0) > 2.2 || Math.abs(a.y1 - b.y1) > 2.2) continue;
      const [L, R] = a.x0 < b.x0 ? [a, b] : [b, a];
      if (Math.abs(L.x1 - R.x0) > 2.5) continue;
      const tx0 = L.x0, ty0 = Math.min(L.y0, R.y0), tx1 = R.x1, ty1 = Math.max(L.y1, R.y1);
      const hasBase = hLines.some(hl => Math.abs(hl.y - ty1) <= 2.5 && Math.abs(hl.x0 - tx0) <= 3 && Math.abs(hl.x1 - tx1) <= 3);
      if (hasBase) triangles.push([tx0, ty0, tx1, ty1]);
    }
  }
  return { hLines, vLines, slants, rects, parallelograms, circles, dashes, strokes, triangles };
}

async function extractTokens(page, vp, vec) {
  const { triangles, vLines } = vec;
  const content = await page.getTextContent();
  const W = vp.width, H = vp.height;
  const rawTokens = [];
  for (const t of content.items) {
    const raw = t.str;
    if (!raw || !raw.trim()) continue;
    const text = tidyText(raw);
    if (!text) continue;
    const m = pdfjs.Util.transform(vp.transform, t.transform);
    const theta = Math.atan2(m[1], m[0]), ux = Math.cos(theta), uy = Math.sin(theta);
    const fh = Math.hypot(m[2], m[3]) || t.height || 8;
    const fw = Math.max(t.width, 1);
    const ascent = Math.min(0.92, Math.max(0.72, content.styles[t.fontName]?.ascent ?? 0.85));
    const pts = [0, fw].flatMap(dx => [-ascent * fh, (1 - ascent) * fh].map(dy => [m[4] + ux * dx - uy * dy, m[5] + uy * dx + ux * dy]));
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const vpBox = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    const cx = (vpBox[0] + vpBox[2]) / 2, cy = (vpBox[1] + vpBox[3]) / 2;

    if ((cx < 0.034 * W || cx > 0.966 * W || cy < 0.045 * H || cy > 0.955 * H) && /^(?:\d{1,2}|[A-Z])$/.test(text)) continue;
    if (/^[1-9A-Z]$/.test(text) && triangles.some(tr => cx >= tr[0] && cx <= tr[2] && cy >= tr[1] && cy <= tr[3])) continue;

    const normB = normBox(vpBox[0], vpBox[1], vpBox[2], vpBox[3], W, H);
    if (rawTokens.some(o => sameRegion(o.normBox, normB, 0.55) && cleanKey(o.text) === cleanKey(text))) continue;

    rawTokens.push({
      raw, text, vpBox, normBox: normB, cx, cy,
      bx: m[4], by: m[5], theta, ux, uy, nx: -uy, ny: ux, fh, fw, used: false
    });
  }

  // Merge adjacent horizontal font-fallback runs on the exact same baseline (e.g. CoreText splitting "52.0" + "±" + "0.1" or Kangxi radicals)
  const horiz = rawTokens.filter(t => Math.abs(t.theta) < 0.08).sort((a, b) => (Math.abs(a.by - b.by) > 2.5 ? a.by - b.by : a.vpBox[0] - b.vpBox[0]));
  const other = rawTokens.filter(t => Math.abs(t.theta) >= 0.08);
  const mergedHoriz = [];
  for (const tok of horiz) {
    const prev = mergedHoriz[mergedHoriz.length - 1];
    if (prev && Math.abs(prev.by - tok.by) <= 2.5 && Math.abs(prev.fh - tok.fh) <= 2.5 &&
        tok.vpBox[0] - prev.vpBox[2] >= -2.0 && tok.vpBox[0] - prev.vpBox[2] <= 2.5 &&
        !/^【\d+】$/.test(prev.text) && !/^【\d+】$/.test(tok.text) &&
        !vLines.some(v => v.x >= prev.vpBox[2] - 1 && v.x <= tok.vpBox[0] + 1 && v.y0 <= prev.cy && v.y1 >= prev.cy)) {
      prev.text = tidyText(prev.text + tok.text);
      prev.raw += tok.raw;
      prev.vpBox = unionBox(prev.vpBox, tok.vpBox);
      prev.fw = prev.vpBox[2] - prev.vpBox[0];
      prev.cx = (prev.vpBox[0] + prev.vpBox[2]) / 2;
      prev.cy = (prev.vpBox[1] + prev.vpBox[3]) / 2;
      prev.normBox = normBox(prev.vpBox[0], prev.vpBox[1], prev.vpBox[2], prev.vpBox[3], W, H);
    } else {
      mergedHoriz.push(tok);
    }
  }
  return [...mergedHoriz, ...other];
}

function mergeSegments(segs, isHoriz) {
  const groups = [];
  for (const s of segs) {
    const coord = isHoriz ? s.y : s.x;
    const a0 = isHoriz ? s.x0 : s.y0, a1 = isHoriz ? s.x1 : s.y1;
    let g = groups.find(x => Math.abs(x.c - coord) <= 2.0);
    if (!g) { g = { c: coord, intervals: [] }; groups.push(g); }
    g.intervals.push([a0, a1]);
  }
  const merged = [];
  for (const g of groups) {
    g.intervals.sort((a, b) => a[0] - b[0]);
    let [cur0, cur1] = g.intervals[0];
    for (let i = 1; i < g.intervals.length; i++) {
      if (g.intervals[i][0] <= cur1 + 3.0) cur1 = Math.max(cur1, g.intervals[i][1]);
      else { merged.push(isHoriz ? { y: g.c, x0: cur0, x1: cur1 } : { x: g.c, y0: cur0, y1: cur1 }); [cur0, cur1] = g.intervals[i]; }
    }
    merged.push(isHoriz ? { y: g.c, x0: cur0, x1: cur1 } : { x: g.c, y0: cur0, y1: cur1 });
  }
  return merged.sort((a, b) => (isHoriz ? a.y - b.y : a.x - b.x));
}

function markStrokesInBox(strokes, box, pad = 2) {
  for (const s of strokes) {
    if (s.x0 >= box[0] - pad && s.x1 <= box[2] + pad && s.y0 >= box[1] - pad && s.y1 <= box[3] + pad) s.used = true;
  }
}

async function parseRevisionTable(tokens, vec, canvas, W, H, pageNo, ocrRunner, outItems) {
  const hMerged = mergeSegments(vec.hLines, true);
  const vMerged = mergeSegments(vec.vLines, false);
  // Find a single horizontal header row containing >=3 revision table column headers (including CHANGE/更改/REVISION)
  const allHdrCands = tokens.filter(t => !t.used && /^(?:LOC\s*N|REVISION|REV\.?|LET|CHANGE|DN|CHK|APP|DATE|标记|处数|更改|更改文件号|签名)$/i.test(t.text));
  let hdrTokens = [];
  for (const cand of allHdrCands) {
    const band = allHdrCands.filter(o => Math.abs(o.cy - cand.cy) <= 10);
    if (band.length > hdrTokens.length && band.some(o => /^(?:CHANGE|REVISION|更改)/i.test(o.text))) hdrTokens = band;
  }
  if (hdrTokens.length < 3) return;
  const hdrY = hdrTokens.reduce((s, t) => s + t.cy, 0) / hdrTokens.length;
  // Find enclosing vertical borders around hdrTokens
  const minHx = Math.min(...hdrTokens.map(t => t.vpBox[0])), maxHx = Math.max(...hdrTokens.map(t => t.vpBox[2]));
  const leftVs = vMerged.filter(v => v.x <= minHx + 5 && v.y0 <= hdrY && v.y1 >= hdrY + 40);
  const rightVs = vMerged.filter(v => v.x >= maxHx - 5 && v.y0 <= hdrY && v.y1 >= hdrY + 40);
  if (!leftVs.length || !rightVs.length) return;
  const tx0 = leftVs[leftVs.length - 1].x, tx1 = rightVs[0].x;
  const tw = tx1 - tx0;

  const tableHLines = hMerged.filter(h => h.x0 <= tx0 + 15 && h.x1 >= tx1 - 15).map(h => h.y).sort((a, b) => a - b);
  if (tableHLines.length < 3) return;
  const ty0 = tableHLines[0], ty1 = tableHLines[tableHLines.length - 1];

  // Check banner row(s) ABOVE hdrY inside [tx0..tx1, ty0..hdrY] (e.g. DWG No. DW30204)
  const hdrTopLine = [...tableHLines].reverse().find(y => y < hdrY - 2) ?? ty0;
  if (hdrTopLine > ty0 + 8) {
    const bannerToks = tokens.filter(t => !t.used && t.cx >= tx0 && t.cx <= tx1 && t.cy >= ty0 && t.cy <= hdrTopLine);
    for (const bt of bannerToks) {
      bt.used = true;
      if (/^[A-Z]{1,4}\d{4,}[A-Z0-9-]*$/i.test(bt.text)) {
        outItems.push(makeItem(bt.text, bt.vpBox, W, H, pageNo, 'PDF', outItems.length + 1, '基本信息', '图纸编号'));
      }
    }
    markStrokesInBox(vec.strokes, [tx0, ty0, tx1, hdrTopLine]);
  }

  // Mark header row tokens used
  const hdrBotLine = tableHLines.find(y => y > hdrY + 2) ?? (hdrY + 12);
  for (const t of tokens) {
    if (!t.used && t.cx >= tx0 && t.cx <= tx1 && t.cy >= hdrTopLine - 2 && t.cy <= hdrBotLine + 2) t.used = true;
  }
  markStrokesInBox(vec.strokes, [tx0, hdrTopLine, tx1, hdrBotLine]);

  // Identify column X dividers inside the revision table
  const colVs = vMerged.filter(v => v.x >= tx0 - 2 && v.x <= tx1 + 2 && v.y0 <= hdrBotLine + 5 && v.y1 >= hdrBotLine + 20).map(v => v.x).sort((a, b) => a - b);
  const changeTok = hdrTokens.find(t => /^CHANGE|更改/i.test(t.text));
  let changeX0 = tx0 + tw * 0.25, changeX1 = tx0 + tw * 0.75;
  if (changeTok && colVs.length >= 2) {
    const L = [...colVs].reverse().find(x => x <= changeTok.cx) ?? changeX0;
    const R = colVs.find(x => x >= changeTok.cx) ?? changeX1;
    changeX0 = L; changeX1 = R;
  }

  // Iterate data rows below hdrBotLine (stop when row height jumps > 95pt, i.e., end of revision table)
  const rowYs = tableHLines.filter(y => y >= hdrBotLine - 1);
  for (let r = 0; r + 1 < rowYs.length; r++) {
    const ry0 = rowYs[r], ry1 = rowYs[r + 1];
    if (ry1 - ry0 > 95) break;
    if (ry1 - ry0 < 8) continue;
    const rToks = tokens.filter(t => !t.used && t.cx >= tx0 && t.cx <= tx1 && t.cy >= ry0 && t.cy <= ry1);
    for (const t of rToks) t.used = true;

    // Check if CHANGE cell has uncovered strokes (e.g. Rev 1.2 stroked text)
    const cellStrokes = vec.strokes.filter(s => !s.used && s.x0 >= changeX0 + 2 && s.x1 <= changeX1 - 2 && s.y0 >= ry0 + 2 && s.y1 <= ry1 - 2);
    const changeToks = rToks.filter(t => t.cx >= changeX0 && t.cx <= changeX1);
    let ocrChange = '';
    if (!changeToks.length && cellStrokes.length >= 12 && ocrRunner) {
      ocrChange = tidyText(await ocrRunner([changeX0 + 2, ry0 + 1, changeX1 - 2, ry1 - 1], 6));
    }
    markStrokesInBox(vec.strokes, [tx0, ry0, tx1, ry1]);
    if (!rToks.length && !ocrChange) continue;

    // Extract version, zone, change, author, date by column position
    const revTok = rToks.find(t => t.cx < changeX0 && /^(?:\d+\.\d+|[A-Z]\d?)$/.test(t.text));
    const zoneToks = rToks.filter(t => t !== revTok && t.cx < changeX0).sort((a, b) => a.cy - b.cy || a.cx - b.cx);
    const rightToks = rToks.filter(t => t.cx > changeX1).sort((a, b) => a.cx - b.cx || a.cy - b.cy);
    const dateParts = rightToks.filter(t => /^[\d.\-]+$/.test(t.text)).map(t => t.text).join('').replace(/-\s*/g, '');
    const authorParts = rightToks.filter(t => !/^[\d.\-]+$/.test(t.text)).map(t => t.text).join(' ');
    const changeText = changeToks.length
      ? changeToks.sort((a, b) => Math.abs(a.cy - b.cy) > 4 ? a.cy - b.cy : a.cx - b.cx).map(t => t.text).join('').replace(/-\s*/g, '')
      : ocrChange;
    const zoneText = zoneToks.map(t => t.text).join(' ');
    const ver = revTok?.text || String(r + 1);
    const meta = [dateParts, authorParts, zoneText].filter(Boolean).join(' · ');
    const val = [meta, changeText].filter(Boolean).join('。');
    if (!val) continue;
    outItems.push(makeItem(val, [tx0 + 2, ry0 + 1, tx1 - 2, ry1 - 1], W, H, pageNo, 'PDF', outItems.length + 1, '版本记录', '版本 ' + ver));
  }
}

async function parseTitleBlock(tokens, vec, canvas, W, H, pageNo, ocrLinesRunner, outItems) {
  // Exclude outer drawing border margin ticks (beyond 98% width/height) so they don't extend inner frame walls
  const hRaw = vec.hLines.filter(h => h.x1 > 0.48 * W && h.x0 < 0.978 * W && h.y > 0.48 * H && h.y < 0.975 * H)
    .map(h => ({ ...h, x1: Math.min(h.x1, 0.982 * W) }));
  const vRaw = vec.vLines.filter(v => v.x > 0.48 * W && v.x < 0.982 * W && v.y1 > 0.48 * H && v.y0 < 0.975 * H)
    .map(v => ({ ...v, y1: Math.min(v.y1, 0.975 * H) }));
  const hMerged = mergeSegments(hRaw, true);
  const vMerged = mergeSegments(vRaw, false);
  if (hMerged.length < 3 || vMerged.length < 2) return;

  // Find Title Block bounding region (bottom-right grid, excluding full-sheet border lines > 0.6*W for X0 discovery)
  const candH = hMerged.filter(h => (h.x1 - h.x0) >= 0.12 * W && (h.x1 - h.x0) <= 0.58 * W && h.y >= 0.52 * H && h.y <= 0.975 * H);
  if (candH.length < 3) return;
  const rightCandH = candH.filter(h => h.x1 > 0.82 * W);
  if (!rightCandH.length) return;
  const tbX0 = Math.min(...rightCandH.map(h => h.x0));
  // Snap tbX1 to the dominant right wall of Title Block dividers (not outer sheet border)
  const x1Counts = new Map();
  for (const h of rightCandH) { const rx = Math.round(h.x1); x1Counts.set(rx, (x1Counts.get(rx) || 0) + 1); }
  const domX1 = [...x1Counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const tbX1 = rightCandH.filter(h => Math.abs(h.x1 - domX1) <= 3).reduce((m, h) => Math.max(m, h.x1), domX1);
  const tbY0 = Math.min(...rightCandH.filter(h => h.x0 >= tbX0 - 8).map(h => h.y));
  const allBottomHs = hMerged.filter(h => h.y >= tbY0 && h.y <= 0.975 * H && h.x0 <= tbX0 + 10 && h.x1 >= tbX1 - 6);
  const tbY1 = allBottomHs.length ? Math.max(...allBottomHs.map(h => h.y)) : Math.max(...rightCandH.map(h => h.y));
  if (!(tbX1 > tbX0 + 100 && tbY1 > tbY0 + 60)) return;
  const tbHLines = hMerged
    .filter(h => h.y >= tbY0 - 3 && h.y <= tbY1 + 3 && h.x1 > tbX0 + 15 && h.x0 < tbX1 - 15)
    .map(h => ({ y: h.y, x0: Math.max(tbX0, h.x0), x1: Math.min(tbX1, h.x1) }));
  const tbVLines = vMerged
    .filter(v => v.x >= tbX0 - 3 && v.x <= tbX1 + 3 && v.y1 > tbY0 + 5 && v.y0 < tbY1 - 5)
    .map(v => ({ x: v.x, y0: Math.max(tbY0, v.y0), y1: Math.min(tbY1, v.y1) }));

  // Check if there is a Production / header text sitting immediately above tbY0 (within 35pt)
  const aboveToks = tokens.filter(t => !t.used && t.cx >= tbX0 && t.cx <= tbX1 && t.cy >= tbY0 - 36 && t.cy < tbY0);
  for (const at of aboveToks) {
    if (/^Production\b/i.test(at.text)) {
      at.used = true;
      outItems.push(makeItem(at.text, at.vpBox, W, H, pageNo, 'PDF', outItems.length + 1, '基本信息', '生产标识'));
    }
  }

  const tbToks = tokens.filter(t => !t.used && t.cx >= tbX0 - 2 && t.cx <= tbX1 + 2 && t.cy >= tbY0 - 2 && t.cy <= tbY1 + 2);
  // Check uncovered glyph strokes inside Title Block (e.g. stroked English headers / copyright text)
  const tbStrokes = vec.strokes.filter(s => !s.used && s.x0 >= tbX0 && s.x1 <= tbX1 && s.y0 >= tbY0 && s.y1 <= tbY1 &&
    !tbToks.some(t => boxOverlapVP([s.x0, s.y0, s.x1, s.y1], t.vpBox) > 0.4));

  let ocrLines = [];
  if (tbStrokes.length >= 25 && ocrLinesRunner) {
    ocrLines = await ocrLinesRunner([tbX0, tbY0, tbX1, tbY1], tbToks.map(t => t.vpBox));
  }

  // Build atomic grid cells inside [tbX0..tbX1, tbY0..tbY1]
  const xs = [...new Set([tbX0, ...tbVLines.map(v => Math.round(v.x * 2) / 2), tbX1])].sort((a, b) => a - b);
  const ys = [...new Set([tbY0, ...tbHLines.map(h => Math.round(h.y * 2) / 2), tbY1])].sort((a, b) => a - b);

  const hasHWall = (xA, xB, y) => tbHLines.some(h => Math.abs(h.y - y) <= 2.8 && Math.min(h.x1, xB) - Math.max(h.x0, xA) >= (xB - xA) * 0.65);
  const hasVWall = (yA, yB, x) => tbVLines.some(v => Math.abs(v.x - x) <= 2.8 && Math.min(v.y1, yB) - Math.max(v.y0, yA) >= (yB - yA) * 0.65);

  // Merge micro-grid intervals into actual enclosed cells using flood/union across missing walls
  const gx = xs.filter((x, i) => i === 0 || x - xs[i - 1] > 4);
  const gy = ys.filter((y, i) => i === 0 || y - ys[i - 1] > 4);
  const nC = gx.length - 1, nR = gy.length - 1;
  if (nC < 1 || nR < 1) return;
  const parent = Array.from({ length: nR * nC }, (_, i) => i);
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const unite = (a, b) => { parent[find(a)] = find(b); };

  for (let r = 0; r < nR; r++) {
    for (let c = 0; c < nC; c++) {
      const idx = r * nC + c;
      if (c + 1 < nC && !hasVWall(gy[r], gy[r + 1], gx[c + 1])) unite(idx, idx + 1);
      if (r + 1 < nR && !hasHWall(gx[c], gx[c + 1], gy[r + 1])) unite(idx, (r + 1) * nC + c);
    }
  }
  const cellMap = new Map();
  for (let r = 0; r < nR; r++) {
    for (let c = 0; c < nC; c++) {
      const root = find(r * nC + c);
      const b = [gx[c], gy[r], gx[c + 1], gy[r + 1]];
      cellMap.set(root, cellMap.has(root) ? unionBox(cellMap.get(root), b) : b);
    }
  }
  const cells = [...cellMap.values()].sort((a, b) => (Math.abs(a[1] - b[1]) > 4 ? a[1] - b[1] : a[0] - b[0]));

  const HEADER_MAP = [
    [/^PART\s*NAME|零件名称|品名$/i, '零件名称'],
    [/^(?:DRAWING\s*NO\.?|DWG\s*NO\.?|图号)$/i, '图纸编号'],
    [/^(?:CODE|零件编码|代号)$/i, '零件编码'],
    [/^(?:MATERIAL|材料|材质)$/i, '材料牌号'],
    [/^(?:WEIGHT\.?\/?g?|重量)$/i, '重量'],
    [/^(?:SCALE|比例)$/i, '图纸比例'],
    [/^(?:SIZE|图幅)$/i, '图幅'],
    [/^(?:SHEET|页次|页码)$/i, '页次'],
    [/^(?:2D\s*Rev\.?|REVISION|REV\.?|版本)$/i, '二维图版本'],
    [/^3D\s*Rev\.?$/i, '三维模型版本'],
    [/^3D\s*Sta\.?$/i, '三维模型状态'],
    [/^2D\s*Sta\.?$/i, '二维图状态'],
    [/^(?:DRAWN|制图|设计)$/i, '制图人'],
    [/^(?:CHECKED|审核)$/i, '审核栏'],
    [/^(?:MATERIALS?\s*ENG)$/i, '材料工程师'],
    [/^(?:APPROVED|批准)$/i, '批准栏'],
    [/^(?:DATE|日期)$/i, '日期']
  ];
  const matchHeader = str => {
    const s = tidyText(str).replace(/^[:：.\s]+|[:：\s]+$/g, '');
    for (const [re, label] of HEADER_MAP) if (re.test(s)) return label;
    return null;
  };

  // Populate each cell with its PDF tokens and OCR lines (also match OCR lines overlapping horizontally with cell)
  const cellObjs = cells.map(box => {
    const pToks = tbToks.filter(t => t.cx >= box[0] - 1 && t.cx <= box[2] + 1 && t.cy >= box[1] - 1 && t.cy <= box[3] + 1);
    const oToks = ocrLines.filter(o => o.cy >= box[1] - 1 && o.cy <= box[3] + 1 && Math.min(o.vpBox[2], box[2]) - Math.max(o.vpBox[0], box[0]) > 8);
    return { box, pToks, oToks, headerLabel: null, handled: false };
  });

  // Pass 1: Identify header-only thin cells (e.g. SIZE, 3D Rev., 2D Rev.) and propagate label to cell directly below
  for (const cell of cellObjs) {
    if (cell.pToks.length <= 1 && (cell.box[3] - cell.box[1]) < 32) {
      const texts = [...cell.pToks.map(t => t.text), ...cell.oToks.map(o => o.text)];
      let hLab = null;
      for (const tx of texts) {
        hLab = matchHeader(tx) ||
          (/\bSIZE\b/i.test(tx) ? '图幅' : null) ||
          (/3D\s*Rev/i.test(tx) && cell.box[0] < tbX1 - 80 ? '三维模型版本' : null) ||
          (/3D\s*Sta/i.test(tx) ? '三维模型状态' : null) ||
          (/2D\s*Rev/i.test(tx) && cell.box[0] < tbX1 - 80 ? '二维图版本' : null) ||
          (/2D\s*Sta/i.test(tx) ? '二维图状态' : null);
        if (hLab) break;
      }
      if (hLab && !cell.pToks.some(t => !matchHeader(t.text))) {
        cell.headerLabel = hLab;
        cell.handled = true;
        const below = cellObjs.find(other => !other.handled && Math.abs(other.box[0] - cell.box[0]) < 10 && Math.abs(other.box[2] - cell.box[2]) < 14 && Math.abs(other.box[1] - cell.box[3]) < 6);
        if (below && !below.inheritedLabel) below.inheritedLabel = hLab;
      }
    }
  }

  // Pass 2: Extract structured items from each cell
  let dateCounter = 0;
  const dateLabels = ['制图日期', '审核日期栏', '材料日期栏', '批准日期栏'];
  for (const cell of cellObjs) {
    if (cell.handled) continue;
    const pToks = [...cell.pToks].sort((a, b) => (Math.abs(a.cy - b.cy) > 5 ? a.cy - b.cy : a.cx - b.cx));
    const oToks = [...cell.oToks].sort((a, b) => (Math.abs(a.cy - b.cy) > 5 ? a.cy - b.cy : a.cx - b.cx));
    if (!pToks.length && !oToks.length) continue;

    const combinedOcr = oToks.map(o => o.text).join(' ');
    const combinedAll = [...pToks.map(t => t.text), ...oToks.map(o => o.text)].join(' ');

    // 1) Copyright block (split out leading "Production E" if inside same top box)
    if (/COPYRIGHT|property\s+of|must\s+not\s+be\s*copied/i.test(combinedAll)) {
      const prodIdx = pToks.findIndex(t => /^Production\b/i.test(t.text));
      let copyBox = cell.box;
      if (prodIdx >= 0) {
        const pt = pToks.splice(prodIdx, 1)[0];
        outItems.push(makeItem(pt.text, pt.vpBox, W, H, pageNo, 'PDF', outItems.length + 1, '基本信息', '生产标识'));
        copyBox = [cell.box[0], pt.vpBox[3] + 2, cell.box[2], cell.box[3]];
      }
      const val = [...pToks, ...oToks].sort((a, b) => a.cy - b.cy).map(x => x.text).join(' ');
      outItems.push(makeItem(val, copyBox, W, H, pageNo, pToks.length ? 'PDF' : 'OCR', outItems.length + 1, '其他标注', '版权及使用声明'));
      continue;
    }
    // 2) CAD DRAWING NOT TO BE MODIFIED / DO NOT SCALE
    if (/CAD\s*DRAWING\s*NOT\s*TO\s*BE|DO\s*NOT\s*SCALE/i.test(combinedAll) && !pToks.length) {
      const txt = tidyText(combinedOcr);
      const lbl = /DO\s*NOT\s*SCALE/i.test(txt) ? '量取说明' : 'CAD 图纸说明';
      outItems.push(makeItem(txt, cell.box, W, H, pageNo, 'OCR', outItems.length + 1, '其他标注', lbl));
      continue;
    }
    // 3) Projection & standard cell (3RD ANGLE PROJECTION / DRAWN TO AS 1100)
    if (/ANGLE\s*PROJECTION|DRAWN\s*TO/i.test(combinedAll)) {
      for (const o of oToks) {
        if (/3RD\s*ANGLE\s*PROJECTION/i.test(o.text)) {
          outItems.push(makeItem('3RD ANGLE PROJECTION', o.vpBox, W, H, pageNo, 'OCR', outItems.length + 1, '基本信息', '投影方式'));
        } else if (/DRAWN\s*TO\s*(.+)/i.test(o.text)) {
          const m = o.text.match(/DRAWN\s*TO\s*(.+)/i);
          outItems.push(makeItem(m[1].trim(), o.vpBox, W, H, pageNo, 'OCR', outItems.length + 1, '基本信息', '制图标准'));
        }
      }
      continue;
    }

    // 3.5) Split merged Company + Revision sub-columns if a vertical divider had a gap
    const compTok = pToks.find(t => /CO\.,?\s*LTD|公司|厂/i.test(t.text));
    if (compTok) {
      const splitX = compTok.vpBox[2] + 12;
      const rightP = pToks.filter(t => t.cx > splitX);
      const rightO = oToks.filter(o => o.vpBox[2] > splitX);
      outItems.push(makeItem(compTok.text, compTok.vpBox, W, H, pageNo, 'PDF', outItems.length + 1, '基本信息', '公司名称'));
      for (const ot of oToks) {
        if (/Add\s*[:：]?\s*(.+)/i.test(ot.text)) {
          const addr = ot.text.replace(/^.*Add\s*[:：]?\s*/i, '').trim();
          outItems.push(makeItem(addr, ot.vpBox, W, H, pageNo, 'OCR', outItems.length + 1, '基本信息', '公司地址'));
        }
      }
      // Check right-side version numbers (e.g. 3D Rev. 1.0 / 2D Rev. 2.0)
      const revNums = rightP.filter(t => /^\d+(?:\.\d+)?$/.test(t.text)).sort((a, b) => a.cy - b.cy);
      const has3D = rightO.some(o => /3D\s*Rev/i.test(o.text)) || rightP.some(t => /3D\s*Rev/i.test(t.text));
      const has2D = rightP.some(t => /2D\s*Rev/i.test(t.text)) || rightO.some(o => /2D\s*Rev/i.test(o.text));
      if (revNums.length === 2 && (has3D || has2D)) {
        outItems.push(makeItem(revNums[0].text, revNums[0].vpBox, W, H, pageNo, 'PDF', outItems.length + 1, '基本信息', '三维模型版本'));
        outItems.push(makeItem(revNums[1].text, revNums[1].vpBox, W, H, pageNo, 'PDF', outItems.length + 1, '基本信息', '二维图版本'));
      } else if (revNums.length === 1) {
        outItems.push(makeItem(revNums[0].text, revNums[0].vpBox, W, H, pageNo, 'PDF', outItems.length + 1, '基本信息', has2D ? '二维图版本' : '版本'));
      }
      continue;
    }

    // 4) Standard Header + Value cell
    // Look for header in PDF tokens (e.g. mounting-plate.pdf) or stroked OCR lines or inheritedLabel
    let label = cell.inheritedLabel || null;
    const valPdf = [];
    for (const pt of pToks) {
      const h = matchHeader(pt.text);
      if (h && !label && pToks.length > 1) label = h;
      else valPdf.push(pt);
    }
    if (!label) {
      for (const ot of oToks) {
        const h = matchHeader(ot.text) ||
          (/APPROVED/i.test(ot.text) && ot.vpBox[2] > cell.box[0] + (cell.box[2] - cell.box[0]) * 0.4 ? '批准栏' : null) ||
          (/WEIGHT|EIGH|\/g\b/i.test(ot.text) ? '重量' : null);
        if (h) { label = h; break; }
      }
    }

    if (label === '日期') {
      // Match role from cell directly above (DRAWN / CHECKED / APPROVED)
      const aboveCell = cellObjs.find(other => Math.abs(other.box[0] - cell.box[0]) < 10 && Math.abs(other.box[3] - cell.box[1]) < 6);
      if (aboveCell?.resolvedRole === '制图人') label = '制图日期';
      else if (aboveCell?.resolvedRole === '审核栏') label = '审核日期栏';
      else if (aboveCell?.resolvedRole === '批准栏') label = '批准日期栏';
      else label = dateLabels[Math.min(dateCounter++, dateLabels.length - 1)];
    }
    cell.resolvedRole = label;

    if (label) {
      if (!valPdf.length) continue; // Empty value cell (e.g. blank DATE or MATERIALS ENG cell)
      if (label === '材料牌号' && valPdf.length >= 2 && /^t\s*=/i.test(valPdf[valPdf.length - 1].text)) {
        const thickTok = valPdf.pop();
        const matVal = valPdf.map(t => t.text).join(' ');
        outItems.push(makeItem(matVal, valPdf[0].vpBox, W, H, pageNo, 'PDF', outItems.length + 1, '基本信息', '材料牌号'));
        outItems.push(makeItem(thickTok.text, thickTok.vpBox, W, H, pageNo, 'PDF', outItems.length + 1, '基本信息', '材料厚度'));
      } else {
        let vStr = valPdf.map(t => t.text).join(' ');
        if (label === '重量' && /^\d+(\.\d+)?$/.test(vStr)) vStr += ' g';
        // Use REVISION -> 版本 on simple English sheets
        const finalLabel = (label === '二维图版本' && !/2D/i.test(combinedAll)) ? '版本' : label;
        const vBox = valPdf.map(t => t.vpBox).reduce(unionBox);
        outItems.push(makeItem(vStr, vBox, W, H, pageNo, 'PDF', outItems.length + 1, '基本信息', finalLabel));
      }
      continue;
    }

    // 5) Company name / Address cell (bottom-left of Title Block)
    for (const pt of pToks) {
      if (/CO\.,?\s*LTD|公司|厂/i.test(pt.text)) {
        outItems.push(makeItem(pt.text, pt.vpBox, W, H, pageNo, 'PDF', outItems.length + 1, '基本信息', '公司名称'));
      } else {
        outItems.push(makeItem(pt.text, pt.vpBox, W, H, pageNo, 'PDF', outItems.length + 1));
      }
    }
    for (const ot of oToks) {
      if (/^Add\s*[:：]?\s*(.+)/i.test(ot.text)) {
        const addr = ot.text.replace(/^Add\s*[:：]?\s*/i, '').trim();
        outItems.push(makeItem(addr, ot.vpBox, W, H, pageNo, 'OCR', outItems.length + 1, '基本信息', '公司地址'));
      }
    }
  }

  for (const t of tbToks) t.used = true;
  markStrokesInBox(vec.strokes, [tbX0 - 2, tbY0 - 2, tbX1 + 2, tbY1 + 2]);
}

function decodeGDTSymbol(compBox, vec) {
  const [x0, y0, x1, y1] = compBox;
  const pad = 1.5;
  const inBox = b => b.x0 >= x0 + pad && b.x1 <= x1 - pad && b.y0 >= y0 + pad && b.y1 <= y1 - pad;
  const innerCircles = vec.circles.filter(inBox);
  const innerH = vec.hLines.filter(h => h.y > y0 + pad && h.y < y1 - pad && h.x0 >= x0 + pad && h.x1 <= x1 - pad && (h.x1 - h.x0) >= 8);
  const innerV = vec.vLines.filter(v => v.x > x0 + pad && v.x < x1 - pad && v.y0 >= y0 + pad && v.y1 <= y1 - pad && (v.y1 - v.y0) >= 8);
  const innerSlants = vec.slants.filter(inBox);
  const innerPara = vec.parallelograms.filter(inBox);

  if (innerCircles.length >= 2) return ['◎', '同轴度'];
  if (innerCircles.length === 1 && innerH.length >= 1 && innerV.length >= 1) return ['⌖', '位置度'];
  if (innerCircles.length === 1) return ['○', '圆度'];
  if (innerPara.length >= 1) return ['▱', '平面度'];
  if (innerH.length >= 3) return ['≡', '对称度'];
  const longSlants = innerSlants.filter(s => Math.hypot(s.w, s.h) >= 8);
  if (longSlants.length >= 2 && innerH.length >= 1) return ['⇗', '全跳动'];
  if (longSlants.length >= 2 && innerH.length === 0) return ['∥', '平行度'];
  if (innerH.length >= 1 && innerV.length >= 1) return ['⊥', '垂直度'];
  if (longSlants.length === 1 && innerV.length === 0) return ['↗', '圆跳动'];
  return null;
}

async function parseGDTFrames(tokens, vec, canvas, W, H, pageNo, ocrDigitsRunner) {
  // Candidate compartment rects (exclude tables already handled)
  const cands = vec.rects.filter(r =>
    (r.h >= 14 && r.h <= 25 && r.w >= 12 && r.w <= 95) ||
    (r.w >= 14 && r.w <= 25 && r.h >= 12 && r.h <= 95)
  );
  const usedRect = new Set();
  const gdtItems = [];

  // 1) Horizontal chains: same y0, y1 (±1.5pt), abutting x1 ≈ next.x0
  const hCands = cands.filter(r => r.h >= 14 && r.h <= 25).sort((a, b) => (Math.abs(a.y0 - b.y0) > 2 ? a.y0 - b.y0 : a.x0 - b.x0));
  for (const start of hCands) {
    if (usedRect.has(start)) continue;
    const chain = [start];
    let cur = start;
    while (true) {
      const nxt = hCands.find(r => !usedRect.has(r) && !chain.includes(r) && Math.abs(r.y0 - cur.y0) <= 1.8 && Math.abs(r.y1 - cur.y1) <= 1.8 && Math.abs(r.x0 - cur.x1) <= 2.0);
      if (!nxt) break;
      chain.push(nxt); cur = nxt;
    }
    if (chain.length < 2) continue;
    const c0 = chain[0];
    const hasTok0 = tokens.some(t => !t.used && t.cx >= c0.x0 && t.cx <= c0.x1 && t.cy >= c0.y0 && t.cy <= c0.y1);
    const decoded = !hasTok0 ? decodeGDTSymbol([c0.x0, c0.y0, c0.x1, c0.y1], vec) : null;
    if (!decoded) continue;

    chain.forEach(r => usedRect.add(r));
    const [sym, kind] = decoded;
    const c1 = chain[1];
    const tolToks = tokens.filter(t => !t.used && t.cx >= c1.x0 && t.cx <= c1.x1 && t.cy >= c1.y0 && t.cy <= c1.y1);
    tolToks.forEach(t => { t.used = true; });

    // Check for Ⓜ circle at right of c1 and ⌀ stroke cluster at left of c1
    const mCircle = vec.circles.find(c => c.x0 >= c1.x0 + c1.w * 0.45 && c.x1 <= c1.x1 && c.y0 >= c1.y0 && c.y1 <= c1.y1 && c.w >= 10);
    let tolStr = tolToks.map(t => t.text).join('');
    let hasDia = false;
    if (tolStr && !/[ØΦφ⌀]/.test(tolStr) && tolToks.length) {
      const leftBound = Math.min(...tolToks.map(t => t.vpBox[0]));
      const leadDia = vec.circles.some(c => c.x0 >= c1.x0 + 1 && c.x1 <= leftBound + 1.5 && c.y0 >= c1.y0 + 1 && c.y1 <= c1.y1 - 1) ||
        vec.strokes.filter(s => !s.used && s.x0 >= c1.x0 + 1 && s.x1 <= leftBound + 0.5 && s.y0 >= c1.y0 + 1 && s.y1 <= c1.y1 - 1).length >= 2;
      if (leadDia) tolStr = '⌀' + tolStr;
    }
    if (!tolStr && ocrDigitsRunner) {
      const st1 = vec.strokes.filter(s => !s.used && s.x0 >= c1.x0 + 2 && s.x1 <= (mCircle ? mCircle.x0 - 1 : c1.x1 - 2) && s.y0 >= c1.y0 + 2 && s.y1 <= c1.y1 - 2);
      if (st1.length) {
        const minSx = Math.min(...st1.map(s => s.x0));
        const totalH = Math.max(...st1.map(s => s.y1)) - Math.min(...st1.map(s => s.y0));
        // Detect leading ⌀ symbol (shorter ~4-6pt circle/slash cluster before full-height ~8pt digits)
        const sortedX = [...st1].sort((a, b) => a.x0 - b.x0);
        let splitX = minSx;
        for (let k = 1; k < sortedX.length; k++) {
          const leftPart = sortedX.slice(0, k);
          const prevMax = Math.max(...leftPart.map(s => s.x1));
          const leftH = Math.max(...leftPart.map(s => s.y1)) - Math.min(...leftPart.map(s => s.y0));
          if (sortedX[k].x0 - prevMax >= 2.2 && prevMax - minSx >= 3.5 && prevMax - minSx <= 8.5 && leftH < totalH * 0.82) {
            hasDia = true; splitX = sortedX[k].x0 - 1; break;
          }
        }
        const maxSx = Math.max(...st1.map(s => s.x1));
        const dig = await ocrDigitsRunner([splitX, c1.y0 + 2, maxSx + 1, c1.y1 - 2], 0);
        tolStr = (hasDia ? '⌀' : '') + dig;
      }
    }
    if (mCircle) tolStr += ' Ⓜ';

    const datums = [];
    for (let k = 2; k < chain.length; k++) {
      const ck = chain[k];
      const dToks = tokens.filter(t => !t.used && t.cx >= ck.x0 && t.cx <= ck.x1 && t.cy >= ck.y0 && t.cy <= ck.y1);
      dToks.forEach(t => { t.used = true; datums.push(t.text); });
    }
    const frameBox = [chain[0].x0, chain[0].y0, chain[chain.length - 1].x1, chain[chain.length - 1].y1];
    markStrokesInBox(vec.strokes, frameBox);
    const val = [sym + ' ' + tolStr, datums.length ? datums.join(' | ') : ''].filter(Boolean).join(' | ');
    gdtItems.push({ kind, val, vpBox: frameBox });
  }

  // 2) Vertical chains (bottom-to-top reading direction -90deg): same x0, x1 (±1.5pt), abutting y0 ≈ next.y1
  const vCands = cands.filter(r => !usedRect.has(r) && r.w >= 14 && r.w <= 25).sort((a, b) => (Math.abs(a.x0 - b.x0) > 2 ? a.x0 - b.x0 : b.y1 - a.y1));
  for (const start of vCands) {
    if (usedRect.has(start)) continue;
    const chain = [start]; // start is bottom-most compartment
    let cur = start;
    while (true) {
      const nxt = vCands.find(r => !usedRect.has(r) && !chain.includes(r) && Math.abs(r.x0 - cur.x0) <= 1.8 && Math.abs(r.x1 - cur.x1) <= 1.8 && Math.abs(r.y1 - cur.y0) <= 2.0);
      if (!nxt) break;
      chain.push(nxt); cur = nxt;
    }
    if (chain.length < 2) continue;
    const c0 = chain[0];
    const hasTok0 = tokens.some(t => !t.used && t.cx >= c0.x0 && t.cx <= c0.x1 && t.cy >= c0.y0 && t.cy <= c0.y1);
    const decoded = !hasTok0 ? decodeGDTSymbol([c0.x0, c0.y0, c0.x1, c0.y1], vec) : null;
    if (!decoded) continue;

    chain.forEach(r => usedRect.add(r));
    const [sym, kind] = decoded;
    const c1 = chain[1];
    const tolToks = tokens.filter(t => !t.used && t.cx >= c1.x0 && t.cx <= c1.x1 && t.cy >= c1.y0 && t.cy <= c1.y1);
    tolToks.forEach(t => { t.used = true; });
    const mCircle = vec.circles.find(c => c.y1 <= c1.y0 + c1.h * 0.55 && c.y0 >= c1.y0 && c.x0 >= c1.x0 && c.x1 <= c1.x1 && c.w >= 10);
    let tolStr = tolToks.map(t => t.text).join('');
    let hasDia = false;
    if (tolStr && !/[ØΦφ⌀]/.test(tolStr) && tolToks.length) {
      const leftBound = Math.min(...tolToks.map(t => t.vpBox[0]));
      const leadDia = vec.circles.some(c => c.x0 >= c1.x0 + 1 && c.x1 <= leftBound + 1.5 && c.y0 >= c1.y0 + 1 && c.y1 <= c1.y1 - 1) ||
        vec.strokes.filter(s => !s.used && s.x0 >= c1.x0 + 1 && s.x1 <= leftBound + 0.5 && s.y0 >= c1.y0 + 1 && s.y1 <= c1.y1 - 1).length >= 2;
      if (leadDia) tolStr = '⌀' + tolStr;
    }
    if (!tolStr && ocrDigitsRunner) {
      const st1 = vec.strokes.filter(s => !s.used && s.x0 >= c1.x0 + 2 && s.x1 <= c1.x1 - 2 && s.y0 >= (mCircle ? mCircle.y1 + 1 : c1.y0 + 2) && s.y1 <= c1.y1 - 2);
      if (st1.length) {
        const maxSy = Math.max(...st1.map(s => s.y1));
        const totalW = Math.max(...st1.map(s => s.x1)) - Math.min(...st1.map(s => s.x0));
        const sortedY = [...st1].sort((a, b) => b.y1 - a.y1);
        let splitY = maxSy;
        for (let k = 1; k < sortedY.length; k++) {
          const botPart = sortedY.slice(0, k);
          const prevMin = Math.min(...botPart.map(s => s.y0));
          const botW = Math.max(...botPart.map(s => s.x1)) - Math.min(...botPart.map(s => s.x0));
          if (prevMin - sortedY[k].y1 >= 2.2 && maxSy - prevMin >= 3.5 && maxSy - prevMin <= 8.5 && botW < totalW * 0.82) {
            hasDia = true; splitY = sortedY[k].y1 + 1; break;
          }
        }
        const minSy = Math.min(...st1.map(s => s.y0));
        const dig = await ocrDigitsRunner([c1.x0 + 2, minSy - 1, c1.x1 - 2, splitY], 1);
        tolStr = (hasDia ? '⌀' : '') + dig;
      }
    }
    if (mCircle) tolStr += ' Ⓜ';

    const datums = [];
    for (let k = 2; k < chain.length; k++) {
      const ck = chain[k];
      const dToks = tokens.filter(t => !t.used && t.cx >= ck.x0 && t.cx <= ck.x1 && t.cy >= ck.y0 && t.cy <= ck.y1);
      dToks.forEach(t => { t.used = true; datums.push(t.text); });
    }
    const frameBox = [c0.x0, chain[chain.length - 1].y0, c0.x1, c0.y1];
    markStrokesInBox(vec.strokes, frameBox);
    const val = [sym + ' ' + tolStr, datums.length ? datums.join(' | ') : ''].filter(Boolean).join(' | ');
    gdtItems.push({ kind, val, vpBox: frameBox });
  }

  return gdtItems;
}

async function parseMainDrawing(tokens, vec, canvas, W, H, pageNo, ocrDigitsRunner, gdtRaw, outItems) {
  // Separate standalone balloon tokens 【1】..【99】 for final pairing
  const balloonRe = /^[【\[]\s*(\d{1,3})\s*[】\]]$/;
  const balloons = [];
  for (const t of tokens) {
    if (t.used) continue;
    const m = t.text.match(balloonRe);
    if (m) { t.used = true; balloons.push({ num: +m[1], tok: t }); }
  }

  // Emit GD&T items first so balloons can pair to them
  const pairTargets = [];
  for (const g of gdtRaw) {
    const it = makeItem(g.val, g.vpBox, W, H, pageNo, 'PDF', outItems.length + 1, '尺寸与公差', g.kind);
    outItems.push(it);
    pairTargets.push(it);
  }

  // 1) Handle combined "<num> L<d>-<A>" tokens (e.g. "3 L4-A") and paired "<num>" + "L<d>-<A>" tokens
  for (const t of tokens) {
    if (t.used) continue;
    const m = t.text.match(/^(\d+(?:\.\d+)?)\s+(L\d-[A-Z])$/);
    if (m) {
      t.used = true;
      const it = makeItem(m[1], t.vpBox, W, H, pageNo, 'PDF', outItems.length + 1, '尺寸与公差', m[2] + ' 测量高度');
      outItems.push(it);
    }
  }
  for (const zTok of tokens) {
    if (zTok.used || !/^L\d-[A-Z]$/.test(zTok.text)) continue;
    const numTok = tokens.find(t => !t.used && /^\d+(?:\.\d+)?$/.test(t.text) && Math.abs(t.cy - zTok.cy) <= 6 && zTok.vpBox[0] - t.vpBox[2] >= -2 && zTok.vpBox[0] - t.vpBox[2] <= 35);
    if (numTok) {
      zTok.used = true; numTok.used = true;
      const uBox = unionBox(numTok.vpBox, zTok.vpBox);
      markStrokesInBox(vec.strokes, uBox);
      outItems.push(makeItem(numTok.text, uBox, W, H, pageNo, 'PDF', outItems.length + 1, '尺寸与公差', zTok.text + ' 测量高度'));
    }
  }

  // 2) Handle View Scale pairs: "A" / "B" / "A-A" stacked right above "5:1" / "4:1" / "2:1"
  for (const sTok of tokens) {
    if (sTok.used || !/^\d+:\d+$/.test(sTok.text)) continue;
    const head = tokens.find(t => !t.used && /^(?:[A-Z]|[A-Z]-[A-Z])$/.test(t.text) && Math.abs(t.cx - sTok.cx) <= 18 && sTok.cy > t.cy && sTok.cy - t.cy <= 36);
    if (head) {
      sTok.used = true; head.used = true;
      const uBox = unionBox(head.vpBox, sTok.vpBox);
      const lbl = head.text.includes('-') ? `剖面视图 ${head.text}` : `局部放大 ${head.text}`;
      outItems.push(makeItem('比例 ' + sTok.text, uBox, W, H, pageNo, 'PDF', outItems.length + 1, '其他标注', lbl));
    }
  }

  // 3) Handle standalone single uppercase letters: keep ONLY boxed Datum Symbols [A], [B], [C], [D]
  for (const t of tokens) {
    if (t.used || !/^[A-Z]$/.test(t.text)) continue;
    const boxRect = vec.rects.find(r => r.w >= 11 && r.w <= 28 && r.h >= 11 && r.h <= 28 && t.cx >= r.x0 && t.cx <= r.x1 && t.cy >= r.y0 && t.cy <= r.y1);
    t.used = true;
    if (boxRect) {
      const b = [boxRect.x0, boxRect.y0, boxRect.x1, boxRect.y1];
      markStrokesInBox(vec.strokes, b);
      outItems.push(makeItem(t.text, b, W, H, pageNo, 'PDF', outItems.length + 1, '其他标注', '基准 ' + t.text));
    }
  }

  // 4) Pre-merge "(" + "<num>)" with optional vector ⌀ inside (e.g. "(" + "33)" -> "(⌀33)")
  for (const openT of tokens) {
    if (openT.used || openT.text !== '(') continue;
    const closeT = tokens.find(t => !t.used && /^\d+(?:\.\d+)?\)$/.test(t.text) && Math.abs(t.theta - openT.theta) < 0.15 &&
      Math.hypot(t.cx - openT.cx, t.cy - openT.cy) <= 48);
    if (closeT) {
      openT.used = true;
      const uBox = unionBox(openT.vpBox, closeT.vpBox);
      const midStrokes = vec.strokes.filter(s => !s.used && s.x0 >= uBox[0] - 2 && s.x1 <= uBox[2] + 2 && s.y0 >= uBox[1] - 2 && s.y1 <= uBox[3] + 2);
      const hasDia = midStrokes.length >= 2;
      if (hasDia) markStrokesInBox(vec.strokes, uBox);
      closeT.text = '(' + (hasDia ? '⌀' : '') + closeT.text;
      closeT.vpBox = uBox;
    }
  }

  // Pre-merge standalone "+" with immediately following angle/tolerance (e.g. "+" + "2°" -> "+2°")
  for (const pTok of tokens) {
    if (pTok.used || pTok.text !== '+') continue;
    const nxt = tokens.find(t => !t.used && /^\d/.test(t.text) && Math.hypot(t.bx - pTok.bx, t.by - pTok.by) <= 16);
    if (nxt) {
      pTok.used = true;
      nxt.text = '+' + nxt.text;
      nxt.vpBox = unionBox(pTok.vpBox, nxt.vpBox);
    }
  }

  // Pre-merge standalone roughness/hardness prefixes ("Ra" + "0.8" -> "Ra 0.8", "HRC" + "45-50" -> "HRC 45-50")
  for (const rTok of tokens) {
    if (rTok.used || !/^(?:Ra|Rz|Ry|Rq|HRC|HBW|HV)$/i.test(rTok.text)) continue;
    const nxt = tokens.find(t => !t.used && t !== rTok && /^\d+(?:\.\d+)?(?:[~～\-−]\d+(?:\.\d+)?)?$/.test(t.text) &&
      Math.abs(t.theta - rTok.theta) < 0.15 && (() => {
        const dx = (t.vpBox[0] - rTok.vpBox[2]) * Math.cos(rTok.theta) + (t.cy - rTok.cy) * Math.sin(rTok.theta);
        const dn = Math.abs(-(t.cx - rTok.cx) * Math.sin(rTok.theta) + (t.cy - rTok.cy) * Math.cos(rTok.theta));
        return dx >= -3 && dx <= 20 && dn <= rTok.fh * 0.8;
      })());
    if (nxt) {
      rTok.used = true;
      nxt.text = `${rTok.text} ${nxt.text}`;
      nxt.vpBox = unionBox(rTok.vpBox, nxt.vpBox);
    }
  }

  // Pre-merge collinear prefix/suffix tokens ("30.8" + "MAX", "min" + "R0.8")
  for (const t of tokens) {
    if (t.used) continue;
    if (/^(?:min|MAX)$/i.test(t.text)) {
      const partner = tokens.find(o => !o.used && o !== t && Math.abs(o.theta - t.theta) < 0.12 && /\d/.test(o.text) && (() => {
        const dx = t.cx - o.cx, dy = t.cy - o.cy;
        const dn = Math.abs(dx * o.nx + dy * o.ny);
        const edgeGap = Math.max(0, Math.max(t.vpBox[0] - o.vpBox[2], o.vpBox[0] - t.vpBox[2], t.vpBox[1] - o.vpBox[3], o.vpBox[1] - t.vpBox[3]));
        return dn <= 5.5 && edgeGap <= 24;
      })());
      if (partner) {
        t.used = true;
        const du = (t.cx - partner.cx) * partner.ux + (t.cy - partner.cy) * partner.uy;
        partner.text = du < 0 ? `${t.text} ${partner.text}` : `${partner.text} ${t.text}`;
        partner.vpBox = unionBox(partner.vpBox, t.vpBox);
      }
    }
  }

  // Helper: project point (px, py) into token's local reading frame (u along baseline from start, n perpendicular)
  const localCoords = (base, px, py) => {
    const dx = px - base.bx, dy = py - base.by;
    return [dx * base.ux + dy * base.uy, dx * base.nx + dy * base.ny];
  };

  // Helper: check if a minus dash exists right before a deviation token
  const hasMinusBefore = dev => {
    if (/^[+\-−]/.test(dev.text)) return false;
    return vec.dashes.some(d => {
      const dcx = (d.x0 + d.x1) / 2, dcy = (d.y0 + d.y1) / 2;
      const [u, n] = localCoords(dev, dcx, dcy);
      return u >= -11 && u <= 1 && Math.abs(n + 0.35 * dev.fh) <= 5.5;
    });
  };

  // 5) Assemble base dimensions with stacked upper/lower deviations, leading ⌀, trailing ±, and |8
  // Exclude Chinese prose annotations (e.g. "（在L2处测量）", "【28】尺寸测量区域") so Step 6 handles them
  const dimBases = tokens.filter(t => !t.used && /\d/.test(t.text) && !/^【/.test(t.text) && !/[\u4e00-\u9fff]{2}/.test(t.text)).sort((a, b) => b.fh - a.fh);

  for (const base of dimBases) {
    if (base.used) continue;
    // Skip pure small deviation tokens if a larger base exists right before them
    const baseEndU = Math.max(...[
      localCoords(base, base.vpBox[0], base.vpBox[1])[0],
      localCoords(base, base.vpBox[2], base.vpBox[3])[0],
      localCoords(base, base.vpBox[0], base.vpBox[3])[0],
      localCoords(base, base.vpBox[2], base.vpBox[1])[0]
    ]);

    // Find stacked upper/lower deviation tokens right after baseEndU
    const devs = tokens.filter(t => !t.used && t !== base && t.fh <= base.fh * 0.85 &&
      /^[+\-−]?\d+(?:\.\d+)?°?$/.test(t.text) && Math.abs(t.theta - base.theta) < 0.18 && (() => {
        const [u, n] = localCoords(base, t.bx, t.by);
        return u >= baseEndU - 3 && u <= baseEndU + 22 && Math.abs(n) <= base.fh * 1.15;
      })());

    let curBox = [...base.vpBox];
    let valStr = base.text;
    let hasStacked = false;

    // Check adjacent collinear ISO tolerance zone token (e.g. "⌀12" + "h6" -> "⌀12 h6")
    const isoTok = tokens.find(t => !t.used && t !== base && /^(?:[A-HJ-ZCDE]{1,2}|[a-hj-zcde]{1,2})\d{1,2}$/.test(t.text) &&
      Math.abs(t.theta - base.theta) < 0.15 && (() => {
        const [u, n] = localCoords(base, t.bx, t.by);
        return u >= baseEndU - 2 && u <= baseEndU + 16 && Math.abs(n) <= base.fh * 0.55;
      })());
    if (isoTok && /^(?:\d+\s*[-×xX]\s*)?[ØΦφ⌀]?\d+(?:\.\d+)?$/.test(valStr)) {
      isoTok.used = true;
      curBox = unionBox(curBox, isoTok.vpBox);
      valStr += ` ${isoTok.text}`;
    }

    // Check if base is tightly enclosed in a theoretical exact dimension box [50]
    const exactRect = !hasStacked && /^\d+(?:\.\d+)?$/.test(valStr) && vec.rects.find(r =>
      r.w >= 14 && r.w <= 48 && r.h >= 10 && r.h <= 26 &&
      base.cx >= r.x0 + 1 && base.cx <= r.x1 - 1 && base.cy >= r.y0 + 1 && base.cy <= r.y1 - 1
    );

    if (devs.length >= 2) {
      hasStacked = true;
      // Sort by normal coordinate n (more negative n = higher visually above baseline in top-down screen frame)
      devs.sort((a, b) => localCoords(base, a.bx, a.by)[1] - localCoords(base, b.bx, b.by)[1]);
      const formatted = devs.slice(0, 2).map(d => {
        d.used = true;
        curBox = unionBox(curBox, d.vpBox);
        let dt = d.text;
        if (!/^[+\-−]/.test(dt) && hasMinusBefore(d)) dt = '−' + dt;
        return dt;
      });
      valStr += ` ${formatted[0]}/${formatted[1]}`;
    }

    // Check trailing "|8" sampling mark along +u
    const tailEndU = baseEndU + (hasStacked ? 34 : 12);
    const pipeTok = tokens.find(t => !t.used && /^\|\d+$/.test(t.text) && Math.abs(t.theta - base.theta) < 0.18 && (() => {
      const [u, n] = localCoords(base, t.bx, t.by);
      return u >= baseEndU - 2 && u <= tailEndU + 18 && Math.abs(n) <= base.fh;
    })());
    if (pipeTok) {
      pipeTok.used = true;
      curBox = unionBox(curBox, pipeTok.vpBox);
      valStr += ` ${pipeTok.text}`;
    }

    // Check leading vector ⌀ symbol right before base (u in [-15..-1], n in [-fh..0.2*fh])
    if (/^\d/.test(valStr)) {
      const leadStrokes = vec.strokes.filter(s => !s.used && (() => {
        const scx = (s.x0 + s.x1) / 2, scy = (s.y0 + s.y1) / 2;
        const [u, n] = localCoords(base, scx, scy);
        return u >= -15 && u <= -0.5 && n >= -base.fh * 1.05 && n <= base.fh * 0.25 && s.w <= 14 && s.h <= 14;
      })());
      if (leadStrokes.length >= 2) {
        const sBox = [Math.min(...leadStrokes.map(s => s.x0)), Math.min(...leadStrokes.map(s => s.y0)), Math.max(...leadStrokes.map(s => s.x1)), Math.max(...leadStrokes.map(s => s.y1))];
        const spanW = sBox[2] - sBox[0], spanH = sBox[3] - sBox[1];
        const insideRect = vec.rects.some(r => r.w < 30 && r.h < 30 && sBox[0] >= r.x0 - 1 && sBox[2] <= r.x1 + 1 && sBox[1] >= r.y0 - 1 && sBox[3] <= r.y1 + 1);
        if (!insideRect && spanW >= 3.5 && spanW <= 14 && spanH >= 3.5 && spanH <= 14) {
          leadStrokes.forEach(s => { s.used = true; });
          curBox = unionBox(curBox, sBox);
          valStr = '⌀' + valStr;
        }
      }
    }

    // Check trailing vector ± + digits right after base (only if no stacked tolerances and numeric nominal)
    if (!hasStacked && /^\d+(?:\.\d+)?$/.test(base.text) && ocrDigitsRunner) {
      const candAfter = vec.strokes.filter(s => !s.used && (() => {
        const scx = (s.x0 + s.x1) / 2, scy = (s.y0 + s.y1) / 2;
        if (vec.triangles.some(tr => scx >= tr[0] - 1 && scx <= tr[2] + 1 && scy >= tr[1] - 1 && scy <= tr[3] + 1)) return false;
        const [u, n] = localCoords(base, scx, scy);
        return u >= baseEndU + 0.5 && u <= baseEndU + 44 && n >= -base.fh * 1.0 && n <= base.fh * 0.25 && s.w <= 12 && s.h <= 12;
      })());
      if (candAfter.length >= 8) {
        // Sort by u coordinate and keep contiguous glyph run starting within 10pt of baseEndU
        const withU = candAfter.map(s => ({ s, u0: localCoords(base, (s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2)[0] })).sort((a, b) => a.u0 - b.u0);
        if (withU[0].u0 <= baseEndU + 10) {
          const run = [withU[0]];
          for (let k = 1; k < withU.length; k++) {
            if (withU[k].u0 - run[run.length - 1].u0 <= 8.5) run.push(withU[k]);
            else break;
          }
          const uSpan = run[run.length - 1].u0 - run[0].u0;
          if (run.length >= 8 && uSpan >= 12) {
            // Skip first ~8pt (the ± symbol itself) and OCR only the trailing digit strokes!
            const pmStart = run[0].u0;
            const digitStrokes = run.filter(x => x.u0 >= pmStart + 7.2).map(x => x.s);
            if (digitStrokes.length >= 4) {
              const dBox = [
                Math.min(...digitStrokes.map(s => s.x0)) - 1.5,
                Math.min(...digitStrokes.map(s => s.y0)) - 1.5,
                Math.max(...digitStrokes.map(s => s.x1)) + 1.5,
                Math.max(...digitStrokes.map(s => s.y1)) + 1.5
              ];
              const rot = base.theta < -0.7 ? 1 : (base.theta > 0.7 ? -1 : 0);
              const dig = await ocrDigitsRunner(dBox, rot);
              if (/^\d+(?:\.\d+)?$/.test(dig)) {
                run.forEach(x => { x.s.used = true; });
                const allRunBox = [
                  Math.min(...run.map(x => x.s.x0)), Math.min(...run.map(x => x.s.y0)),
                  Math.max(...run.map(x => x.s.x1)), Math.max(...run.map(x => x.s.y1))
                ];
                curBox = unionBox(curBox, allRunBox);
                valStr += ` ±${dig}`;
              }
            }
          }
        }
      }
    }

    base.used = true;
    if (exactRect) curBox = unionBox(curBox, [exactRect.x0, exactRect.y0, exactRect.x1, exactRect.y1]);
    markStrokesInBox(vec.strokes, curBox, 1);
    const it = makeItem(valStr, curBox, W, H, pageNo, 'PDF', outItems.length + 1);
    if (exactRect) it.boxedExact = true;
    outItems.push(it);
    if (it.category === '尺寸与公差') pairTargets.push(it);
  }

  // 6) Remaining unused PDF tokens (notes, labels, general annotations)
  const rem = tokens.filter(t => !t.used).sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  for (let i = 0; i < rem.length; i++) {
    const t = rem[i];
    if (t.used) continue;
    t.used = true;
    if (/^(?:GENERAL\s*NOTES|技术要求|\/)$/i.test(t.text)) continue;

    // Attach auxiliary measurement modifiers like "（在L2处测量）" or "法兰平面宽度" to adjacent dimension/GD&T item
    if (/^(?:[（(]?.*在\s*L\s*\d.*测量[)）]?|法兰平面宽度)$/.test(t.text)) {
      const edgeD = (a, b) => Math.hypot(Math.max(0, Math.max(a[0] - b[2], b[0] - a[2])), Math.max(0, Math.max(a[1] - b[3], b[1] - a[3])));
      const nearDim = pairTargets.reduce((best, cand) => {
        const d = edgeD(t.vpBox, cand._vp);
        return d < (best?.d ?? 46) ? { cand, d } : best;
      }, null)?.cand;
      if (nearDim) {
        if (t.text === '法兰平面宽度') {
          nearDim.label = t.text;
          nearDim._vp = unionBox(nearDim._vp, t.vpBox);
        } else {
          nearDim.value += '，' + t.text.replace(/^[（(]|[)）]$/g, '');
          if (edgeD(t.vpBox, nearDim._vp) <= 12) nearDim._vp = unionBox(nearDim._vp, t.vpBox);
        }
        nearDim.box = normBox(nearDim._vp[0], nearDim._vp[1], nearDim._vp[2], nearDim._vp[3], W, H);
        continue;
      }
    }

    let txt = t.text, b = [...t.vpBox];
    while (true) {
      const nxt = rem.find(o => !o.used && Math.abs(o.vpBox[0] - b[0]) <= 18 && o.vpBox[1] - b[3] >= -4 && o.vpBox[1] - b[3] <= 18 && /测量|区域|点/.test(txt + o.text));
      if (!nxt) break;
      nxt.used = true;
      txt += '，' + nxt.text;
      b = unionBox(b, nxt.vpBox);
    }
    const it = makeItem(txt, b, W, H, pageNo, 'PDF', outItems.length + 1);
    outItems.push(it);
    if (it.category === '尺寸与公差' || it.category === '技术要求') pairTargets.push(it);
  }

  return { balloons, pairTargets };
}

async function parseUncoveredStrokeBlocks(vec, tokens, balloons, canvas, W, H, pageNo, ocrBlockRunner, outItems, pairTargets) {
  if (!ocrBlockRunner) return;
  // Filter unused glyph strokes away from outer borders
  const remStrokes = vec.strokes.filter(s => !s.used && s.x0 > 0.04 * W && s.x1 < 0.96 * W && s.y0 > 0.04 * H && s.y1 < 0.95 * H && s.w <= 16 && s.h <= 16);
  if (remStrokes.length < 30) return;

  // Grid-based spatial clustering (cell size 26x14 pt) into paragraph blocks
  const cw = 26, ch = 14;
  const grid = new Map();
  for (const s of remStrokes) {
    const gx = Math.floor(((s.x0 + s.x1) / 2) / cw), gy = Math.floor(((s.y0 + s.y1) / 2) / ch);
    const k = `${gx},${gy}`;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(s);
  }
  const visited = new Set();
  for (const k of grid.keys()) {
    if (visited.has(k)) continue;
    const queue = [k]; visited.add(k);
    const cluster = [];
    while (queue.length) {
      const cur = queue.pop();
      const [gx, gy] = cur.split(',').map(Number);
      const cellStrokes = grid.get(cur) || [];
      // Only expand through cells that have glyph-like stroke density (>= 2 strokes)
      cluster.push(...cellStrokes);
      if (cellStrokes.length < 2) continue;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nk = `${gx + dx},${gy + dy}`;
          if (!visited.has(nk) && grid.has(nk)) { visited.add(nk); queue.push(nk); }
        }
      }
    }
    if (cluster.length < 80) continue;
    const bx0 = Math.min(...cluster.map(s => s.x0)), by0 = Math.min(...cluster.map(s => s.y0));
    const bx1 = Math.max(...cluster.map(s => s.x1)), by1 = Math.max(...cluster.map(s => s.y1));
    if (bx1 - bx0 < 80 || by1 - by0 < 25) continue;

    // Mask out any PDF tokens or balloons inside this block before OCR
    const masks = [
      ...tokens.map(t => t.vpBox),
      ...balloons.map(b => b.tok.vpBox)
    ].filter(mb => boxOverlapVP(mb, [bx0, by0, bx1, by1]) > 0.1);

    const lines = await ocrBlockRunner([bx0 - 4, by0 - 4, bx1 + 4, by1 + 4], masks);
    if (!lines.length) continue;

    const fullStr = lines.map(l => tidyText(l.text)).join('\n');
    const isTechNotes = /技术要求|允许差|毛口|毛刺|镀层|盐雾|壁厚|漏气|环保|抽样检查|GENERAL\s*NOTES/i.test(fullStr);
    if (!isTechNotes) continue;

    // Group lines into numbered technical requirement clauses
    const clauses = [];
    for (const ln of lines) {
      let txt = tidyText(ln.text)
        .replace(/(?<=为|差)\s*土\s*(?=\d)/g, '±')
        .replace(/\\a(?=\d)/g, '⌀')
        .replace(/^[\[r(]?\d{1,2}[\])\s]+(?=\d[、.．])/, '');
      if (!txt || /^技术要求$/i.test(txt)) continue;
      const startsNew = /^\d+\s*(?:[、.．,，]|人\s*[(.（]|(?=.*抽样检查))/.test(txt);
      if (startsNew || !clauses.length) {
        clauses.push({ text: txt.replace(/^(\d+)\s*[、.．,，]\s*/, '$1、'), vpBox: [...ln.vpBox] });
      } else {
        const prev = clauses[clauses.length - 1];
        prev.text += txt;
        prev.vpBox = unionBox(prev.vpBox, ln.vpBox);
      }
    }
    for (const cl of clauses) {
      const it = makeItem(cl.text, cl.vpBox, W, H, pageNo, 'OCR', outItems.length + 1, '技术要求', '技术要求');
      outItems.push(it);
      pairTargets.push(it);
    }
  }
}

function pairBalloons(balloons, pairTargets, W, H, pageNo, outItems) {
  const edgeDist = (a, b) => {
    const dx = Math.max(0, Math.max(a[0] - b[2], b[0] - a[2]));
    const dy = Math.max(0, Math.max(a[1] - b[3], b[1] - a[3]));
    return Math.hypot(dx, dy);
  };
  balloons.sort((a, b) => a.num - b.num);
  const claimed = new Set();
  for (const bal of balloons) {
    const bb = bal.tok.vpBox;
    // Prefer unclaimed target within tight radius first, else nearest target within 75pt
    let best = null, bestD = Infinity;
    for (const tgt of pairTargets) {
      const d = edgeDist(bb, tgt._vp) + (claimed.has(tgt) ? 18 : 0);
      if (d < bestD) { bestD = d; best = tgt; }
    }
    if (best && bestD <= 85) {
      claimed.add(best);
      if (!best.label.includes(`【${bal.num}】`)) {
        best.label = best.label.startsWith('【') ? `${best.label}·【${bal.num}】` : `【${bal.num}】${best.label}`;
      }
      if (edgeDist(bb, best._vp) <= 55) {
        best._vp = unionBox(best._vp, bb);
        best.box = normBox(best._vp[0], best._vp[1], best._vp[2], best._vp[3], W, H);
      }
    } else {
      outItems.push(makeItem(`【${bal.num}】`, bb, W, H, pageNo, 'PDF', outItems.length + 1, '其他标注', `检验号 【${bal.num}】`));
    }
  }
}

function tileStarts(size, max, overlap = 650) {
  if (size <= max) return [0];
  const steps = Math.ceil((size - max) / (max - overlap));
  return Array.from({ length: steps + 1 }, (_, i) => Math.round((size - max) * i / steps));
}

function inferSheetSize(vpW, vpH) {
  if (!vpW || !vpH) return '未知';
  const mmW = Math.max(vpW, vpH) * 25.4 / 72, mmH = Math.min(vpW, vpH) * 25.4 / 72;
  const stds = [['A0', 1189, 841], ['A1', 841, 594], ['A2', 594, 420], ['A3', 420, 297], ['A4', 297, 210]];
  let best = '自定义', bestErr = Infinity;
  for (const [name, w, h] of stds) {
    const err = Math.hypot(mmW - w, mmH - h);
    if (err < bestErr) { bestErr = err; best = name; }
  }
  return bestErr <= 65 ? best : `${Math.round(mmW)}×${Math.round(mmH)}mm`;
}

export async function extract({ pdf, img, pages, progress }) {
  const results = [];
  const preflightPages = [];
  let ocrState = null, ocrError = null, ocrCallCount = 0;

  const ensureOCR = async () => {
    if (ocrError) throw ocrError;
    ocrState ??= await createOCRWorker();
    return ocrState;
  };

  try {
    for (let n = 1; n <= pages; n++) {
      progress('读取第 ' + n + ' / ' + pages + ' 页', (n - 1) / pages);
      const page = pdf ? await pdf.getPage(n) : null;
      const vp = page?.getViewport({ scale: 1 });
      const canvas = page
        ? await renderPage(page, Math.min(5200, Math.ceil(Math.max(vp.width, vp.height) * 2.7)))
        : document.createElement('canvas');

      if (!page) {
        const ratio = Math.min(1, 6000 / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      if (page) {
        const W = vp.width, H = vp.height;
        const vec = await extractVectors(page, vp);
        const tokens = await extractTokens(page, vp, vec);

        if (tokens.length > 0) {
          progress('第 ' + n + ' / ' + pages + ' 页 · 解析图纸结构与公差', (n - 0.65) / pages);

          const ocrTextCrop = async (vpBox, psm = 6) => {
            try {
              ocrCallCount++;
              const { worker } = await ensureOCR();
              await worker.setParameters({ tessedit_pageseg_mode: String(psm), tessedit_char_whitelist: '', preserve_interword_spaces: '1' });
              const { canvas: c } = cropFromCanvas(canvas, vpBox, W, H, { pad: 16 });
              const { data } = await worker.recognize(c, {}, { blocks: true, text: true });
              c.width = c.height = 0;
              return data.text || '';
            } catch (e) { ocrError = e; return ''; }
          };

          const ocrLinesCrop = async (vpBox, masks = [], psm = 6) => {
            try {
              ocrCallCount++;
              const { worker } = await ensureOCR();
              await worker.setParameters({ tessedit_pageseg_mode: String(psm), tessedit_char_whitelist: '', preserve_interword_spaces: '1' });
              const { canvas: c, sx, sy, pad, scaleX, scaleY } = cropFromCanvas(canvas, vpBox, W, H, { pad: 18, masks });
              const { data } = await worker.recognize(c, {}, { blocks: true, text: true });
              c.width = c.height = 0;
              const out = [];
              for (const block of data.blocks ?? []) for (const para of block.paragraphs ?? []) for (const line of para.lines ?? []) {
                const str = tidyText(line.text);
                if (!str) continue;
                const b = line.bbox;
                const lx0 = (sx + Math.max(0, b.x0 - pad)) / scaleX;
                const ly0 = (sy + Math.max(0, b.y0 - pad)) / scaleY;
                const lx1 = (sx + Math.max(0, b.x1 - pad)) / scaleX;
                const ly1 = (sy + Math.max(0, b.y1 - pad)) / scaleY;
                out.push({ text: str, vpBox: [lx0, ly0, lx1, ly1], cx: (lx0 + lx1) / 2, cy: (ly0 + ly1) / 2 });
              }
              return out;
            } catch (e) { ocrError = e; return []; }
          };

          const ocrDigitsCrop = async (vpBox, rotate = 0) => {
            try {
              ocrCallCount++;
              const { worker } = await ensureOCR();
              await worker.setParameters({ tessedit_pageseg_mode: '7', tessedit_char_whitelist: '0123456789.', preserve_interword_spaces: '0' });
              const { canvas: c } = cropFromCanvas(canvas, vpBox, W, H, { rotate, pad: 18 });
              const { data } = await worker.recognize(c, {}, { blocks: true, text: true });
              c.width = c.height = 0;
              return (data.text || '').replace(/[^0-9.]/g, '').replace(/^\.+|\.+$/g, '');
            } catch (e) { ocrError = e; return ''; }
          };

          const pageItems = [];
          await parseRevisionTable(tokens, vec, canvas, W, H, n, ocrTextCrop, pageItems);
          progress('第 ' + n + ' / ' + pages + ' 页 · 识别图栏与形位公差', (n - 0.45) / pages);
          await parseTitleBlock(tokens, vec, canvas, W, H, n, (box, masks) => ocrLinesCrop(box, masks, 11), pageItems);
          const gdtRaw = await parseGDTFrames(tokens, vec, canvas, W, H, n, ocrDigitsCrop);
          const { balloons, pairTargets } = await parseMainDrawing(tokens, vec, canvas, W, H, n, ocrDigitsCrop, gdtRaw, pageItems);
          progress('第 ' + n + ' / ' + pages + ' 页 · 识别技术要求区域', (n - 0.2) / pages);
          await parseUncoveredStrokeBlocks(vec, tokens, balloons, canvas, W, H, n, (box, masks) => ocrLinesCrop(box, masks, 6), pageItems, pairTargets);
          pairBalloons(balloons, pairTargets, W, H, n, pageItems);

          for (const it of pageItems) delete it._vp;
          const pageOcrItems = pageItems.filter(i => i.source === 'OCR').length;
          preflightPages.push({
            page: n,
            mode: pageOcrItems > 0 ? 'CAD矢量+局部转曲混合PDF' : 'CAD原生矢量PDF',
            inferredSheet: inferSheetSize(W, H),
            textTokens: tokens.length,
            vectorPrimitives: vec.hLines.length + vec.vLines.length + vec.rects.length + vec.circles.length + vec.strokes.length,
            ocrCalls: ocrCallCount,
            coverageComplete: !ocrError
          });
          results.push(...pageItems);
          canvas.width = canvas.height = 0;
          continue;
        }
      }

      // Fallback full-page tiled OCR for raster images or scanned PDFs with no vector text layer
      preflightPages.push({
        page: n,
        mode: page ? '无文字层扫描/转曲PDF（切片OCR）' : '栅格图纸图像（切片OCR）',
        inferredSheet: vp ? inferSheetSize(vp.width, vp.height) : `${canvas.width}×${canvas.height}px`,
        textTokens: 0,
        vectorPrimitives: 0,
        ocrCalls: 1,
        coverageComplete: false
      });
      try {
        const { worker, PSM } = await ensureOCR();
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, tessedit_char_whitelist: '', preserve_interword_spaces: '1' });
        const tiles = tileStarts(canvas.height, 1850, 650).flatMap(y => tileStarts(canvas.width, 1850, 650).map(x => ({ x, y })));
        const pageItems = [];
        let index = 0;
        for (const [i, { x, y }] of tiles.entries()) {
          progress('第 ' + n + ' / ' + pages + ' 页 · OCR 区域 ' + (i + 1) + ' / ' + tiles.length, (n - 1 + i / tiles.length) / pages);
          const tile = document.createElement('canvas');
          tile.width = Math.min(1850, canvas.width - x);
          tile.height = Math.min(1850, canvas.height - y);
          tile.getContext('2d').drawImage(canvas, x, y, tile.width, tile.height, 0, 0, tile.width, tile.height);
          const { data } = await worker.recognize(tile, {}, { blocks: true, text: true });
          for (const block of data.blocks ?? []) for (const para of block.paragraphs ?? []) for (const line of para.lines ?? []) {
            const str = tidyText(line.text);
            if (!str) continue;
            const b = line.bbox;
            const clipped = (x > 0 && b.x0 < 4) || (y > 0 && b.y0 < 4) || (x + tile.width < canvas.width && b.x1 > tile.width - 4) || (y + tile.height < canvas.height && b.y1 > tile.height - 4);
            const vpBox = [x + b.x0, y + b.y0, x + b.x1, y + b.y1];
            const box = normBox(vpBox[0], vpBox[1], vpBox[2], vpBox[3], canvas.width, canvas.height);
            // If clipped at tile edge, still keep tentatively unless a fuller overlapping item covers it
            const existingIdx = pageItems.findIndex(f => sameRegion(f.box, box, 0.5) && (cleanKey(f.value).includes(cleanKey(str)) || cleanKey(str).includes(cleanKey(f.value))));
            if (existingIdx >= 0) {
              if (!clipped && cleanKey(str).length > cleanKey(pageItems[existingIdx].value).length) {
                pageItems[existingIdx] = makeItem(str, vpBox, canvas.width, canvas.height, n, 'OCR', ++index);
                delete pageItems[existingIdx]._vp;
              }
              continue;
            }
            const it = makeItem(str, vpBox, canvas.width, canvas.height, n, 'OCR', ++index);
            delete it._vp;
            pageItems.push(it);
          }
          tile.width = tile.height = 0;
        }
        results.push(...pageItems);
      } catch (e) { ocrError = e; }
      canvas.width = canvas.height = 0;
    }
  } finally {
    if (ocrState?.worker) await ocrState.worker.terminate();
  }
  if (ocrError && !results.length) throw Error('OCR 未完成：' + (ocrError.message || ocrError));
  return {
    items: results,
    warning: ocrError ? 'OCR 未完整完成，已保留可读取内容，可重试识别。' : '',
    preflight: {
      pages: preflightPages,
      primaryMode: preflightPages[0]?.mode || '未知',
      inferredSheet: preflightPages[0]?.inferredSheet || '未知',
      coverageComplete: preflightPages.length > 0 && preflightPages.every(p => p.coverageComplete) && !ocrError
    }
  };
}
