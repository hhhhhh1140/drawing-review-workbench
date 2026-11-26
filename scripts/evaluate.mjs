#!/usr/bin/env node
/**
 * 图析 (drawing-review-workbench) 离线自动化评测脚本
 *
 * 用法：
 *   1) 无标准答案模式（内生锚点 + 健康度自检，适用于任意新图纸）：
 *      node scripts/evaluate.mjs <图纸路径.pdf|png|jpg|webp> [--out 结果.json]
 *
 *   2) 标准答案对比模式（计算 Precision / Recall / F1 / Box IoU + 漏检误检清单）：
 *      node scripts/evaluate.mjs <图纸路径.pdf|png|jpg|webp> <标准答案.json> [--out 结果.json]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const docsDir = path.join(repoRoot, 'docs');

// --- 1. Minimal Browser & Canvas/Tesseract Shim for Node.js ---
Promise.try ??= (fn, ...a) => new Promise(r => r(fn(...a)));
Uint8Array.prototype.toHex ??= function () { return Buffer.from(this).toString('hex'); };
Uint8Array.fromHex ??= h => new Uint8Array(Buffer.from(h, 'hex'));
Map.prototype.getOrInsertComputed ??= function (k, fn) {
  if (!this.has(k)) this.set(k, fn(k));
  return this.get(k);
};
globalThis.DOMMatrix ??= class DOMMatrix {
  constructor(i = [1, 0, 0, 1, 0, 0]) {
    [this.a, this.b, this.c, this.d, this.e, this.f] = i;
  }
};

class NodeContext2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.fillStyle = '#ffffff';
    this._stack = [];
    this._m = [1, 0, 0, 1, 0, 0];
  }
  save() { this._stack.push([...this._m]); }
  restore() { this._m = this._stack.pop() || [1, 0, 0, 1, 0, 0]; }
  resetTransform() { this._m = [1, 0, 0, 1, 0, 0]; }
  translate(tx, ty) {
    const [a, b, c, d, e, f] = this._m;
    this._m = [a, b, c, d, a * tx + c * ty + e, b * tx + d * ty + f];
  }
  rotate(rad) {
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const [a, b, c, d, e, f] = this._m;
    this._m = [a * cos + c * sin, b * cos + d * sin, a * -sin + c * cos, b * -sin + d * cos, e, f];
  }
  fillRect(x, y, w, h) {
    this.canvas._ensureBuffer();
    const W = this.canvas.width, H = this.canvas.height, buf = this.canvas._rgba;
    const v = /white|#fff/i.test(String(this.fillStyle)) ? 255 : 0;
    const [a, b, c, d, e, f] = this._m;
    const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py]) => [a * px + c * py + e, b * px + d * py + f]);
    const x0 = Math.max(0, Math.floor(Math.min(...pts.map(p => p[0]))));
    const y0 = Math.max(0, Math.floor(Math.min(...pts.map(p => p[1]))));
    const x1 = Math.min(W, Math.ceil(Math.max(...pts.map(p => p[0]))));
    const y1 = Math.min(H, Math.ceil(Math.max(...pts.map(p => p[1]))));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const idx = (py * W + px) * 4;
        buf[idx] = v; buf[idx + 1] = v; buf[idx + 2] = v; buf[idx + 3] = 255;
      }
    }
  }
  drawImage(src, ...args) {
    this.canvas._ensureBuffer();
    src._ensureBuffer?.();
    const sW = src.width || src.naturalWidth, sH = src.height || src.naturalHeight, sBuf = src._rgba;
    if (!sBuf || !sW || !sH) return;
    let sx = 0, sy = 0, sw = sW, sh = sH, dx = 0, dy = 0, dw = sW, dh = sH;
    if (args.length === 2) [dx, dy] = args;
    else if (args.length === 4) [dx, dy, dw, dh] = args;
    else if (args.length >= 8) [sx, sy, sw, sh, dx, dy, dw, dh] = args;
    if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return;

    const dW = this.canvas.width, dH = this.canvas.height, dBuf = this.canvas._rgba;
    const [a, b, c, d, e, f] = this._m;
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-8) return;
    const corners = [[dx, dy], [dx + dw, dy], [dx, dy + dh], [dx + dw, dy + dh]].map(([px, py]) => [a * px + c * py + e, b * px + d * py + f]);
    const x0 = Math.max(0, Math.floor(Math.min(...corners.map(p => p[0]))));
    const y0 = Math.max(0, Math.floor(Math.min(...corners.map(p => p[1]))));
    const x1 = Math.min(dW, Math.ceil(Math.max(...corners.map(p => p[0]))));
    const y1 = Math.min(dH, Math.ceil(Math.max(...corners.map(p => p[1]))));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const rx = px + 0.5 - e, ry = py + 0.5 - f;
        const lx = (d * rx - c * ry) / det, ly = (-b * rx + a * ry) / det;
        if (lx < dx || lx >= dx + dw || ly < dy || ly >= dy + dh) continue;
        const spx = Math.min(sW - 1, Math.max(0, Math.floor(sx + ((lx - dx) / dw) * sw)));
        const spy = Math.min(sH - 1, Math.max(0, Math.floor(sy + ((ly - dy) / dh) * sh)));
        const sIdx = (spy * sW + spx) * 4, dIdx = (py * dW + px) * 4;
        dBuf[dIdx] = sBuf[sIdx]; dBuf[dIdx + 1] = sBuf[sIdx + 1]; dBuf[dIdx + 2] = sBuf[sIdx + 2]; dBuf[dIdx + 3] = 255;
      }
    }
  }
}

class NodeCanvas {
  constructor(w = 0, h = 0) {
    this._w = w; this._h = h; this._rgba = null;
    this._ctx = new NodeContext2D(this);
  }
  get width() { return this._w; }
  set width(v) { this._w = v | 0; this._rgba = null; this._ctx?.resetTransform(); }
  get height() { return this._h; }
  set height(v) { this._h = v | 0; this._rgba = null; this._ctx?.resetTransform(); }
  _ensureBuffer() {
    if (!this._rgba && this._w > 0 && this._h > 0) this._rgba = Buffer.alloc(this._w * this._h * 4, 255);
  }
  getContext() { return this._ctx; }
  toBMP() {
    this._ensureBuffer();
    const w = this._w, h = this._h, src = this._rgba;
    const stride = (w * 3 + 3) & ~3, pixelBytes = stride * h;
    const buf = Buffer.alloc(54 + pixelBytes);
    buf.write('BM', 0); buf.writeUInt32LE(54 + pixelBytes, 2); buf.writeUInt32LE(54, 10);
    buf.writeUInt32LE(40, 14); buf.writeInt32LE(w, 18); buf.writeInt32LE(-h, 22);
    buf.writeUInt16LE(1, 26); buf.writeUInt16LE(24, 28); buf.writeUInt32LE(pixelBytes, 34);
    for (let y = 0; y < h; y++) {
      const rOff = 54 + y * stride;
      for (let x = 0; x < w; x++) {
        const si = (y * w + x) * 4, di = rOff + x * 3;
        buf[di] = src[si + 2]; buf[di + 1] = src[si + 1]; buf[di + 2] = src[si];
      }
    }
    return buf;
  }
}

function setupEnvironment() {
  const tessDir = path.join(os.tmpdir(), 'drawing-workbench-tessdata');
  fs.mkdirSync(tessDir, { recursive: true });
  for (const lang of ['chi_sim', 'eng']) {
    const dst = path.join(tessDir, `${lang}.traineddata`);
    const gz = path.join(docsDir, 'vendor', `${lang}.traineddata.gz`);
    if (!fs.existsSync(dst) && fs.existsSync(gz)) fs.writeFileSync(dst, zlib.gunzipSync(fs.readFileSync(gz)));
  }

  const PSM = {
    OSD_ONLY: '0', AUTO_OSD: '1', AUTO_ONLY: '2', AUTO: '3', SINGLE_COLUMN: '4',
    SINGLE_BLOCK_VERT_TEXT: '5', SINGLE_BLOCK: '6', SINGLE_LINE: '7', SINGLE_WORD: '8',
    CIRCLE_WORD: '9', SINGLE_CHAR: '10', SPARSE_TEXT: '11', SPARSE_TEXT_OSD: '12', RAW_LINE: '13'
  };

  globalThis.window = globalThis;
  globalThis.Tesseract = {
    PSM,
    async createWorker(langs = 'chi_sim+eng') {
      let params = {};
      return {
        async setParameters(p) { Object.assign(params, p); },
        async recognize(canvas) {
          if (!canvas.width || !canvas.height) return { data: { text: '', blocks: [] } };
          const psm = String(params.tessedit_pageseg_mode ?? '11');
          const args = ['stdin', 'stdout', '--tessdata-dir', tessDir, '-l', langs, '--oem', '1', '--psm', psm, '-c', 'tessedit_create_tsv=1'];
          if (params.preserve_interword_spaces) args.push('-c', `preserve_interword_spaces=${params.preserve_interword_spaces}`);
          if (params.tessedit_char_whitelist) args.push('-c', `tessedit_char_whitelist=${params.tessedit_char_whitelist}`);
          const res = spawnSync('tesseract', args, { input: canvas.toBMP(), maxBuffer: 32 * 1024 * 1024 });
          const out = res.stdout?.toString('utf8') || '';
          const linesMap = new Map(), lineBoxes = new Map();
          for (const row of out.split(/\r?\n/).slice(1)) {
            const p = row.split('\t');
            if (p.length < 12) continue;
            const level = +p[0], key = `${p[2]}_${p[3]}_${p[4]}`;
            const lx = +p[6], ly = +p[7], lw = +p[8], lh = +p[9], txt = p[11];
            if (level === 4) {
              lineBoxes.set(key, { x0: lx, y0: ly, x1: lx + lw, y1: ly + lh });
              if (!linesMap.has(key)) linesMap.set(key, []);
            } else if (level === 5 && txt.trim()) {
              if (!linesMap.has(key)) linesMap.set(key, []);
              linesMap.get(key).push(txt);
              if (!lineBoxes.has(key)) lineBoxes.set(key, { x0: lx, y0: ly, x1: lx + lw, y1: ly + lh });
            }
          }
          const lines = [], fullText = [];
          for (const [k, words] of linesMap.entries()) {
            const text = words.join(' ').trim();
            if (!text) continue;
            lines.push({ text, bbox: lineBoxes.get(k) });
            fullText.push(text);
          }
          return { data: { text: fullText.join('\n'), blocks: [{ paragraphs: [{ lines }] }] } };
        },
        async terminate() {}
      };
    }
  };

  globalThis.document = {
    baseURI: pathToFileURL(docsDir + '/').href,
    head: { append(el) { if (el.tagName === 'SCRIPT') queueMicrotask(() => el.onload?.()); } },
    createElement(tag) {
      return String(tag).toLowerCase() === 'canvas' ? new NodeCanvas() : { tagName: String(tag).toUpperCase() };
    }
  };
}

function wrapPdfRenderer(pdf, pdfPath) {
  const origGetPage = pdf.getPage.bind(pdf);
  const cache = new Map();
  const swiftScript = path.join(os.tmpdir(), 'drawing_workbench_pdf_render.swift');
  if (!fs.existsSync(swiftScript)) {
    fs.writeFileSync(swiftScript, `
import Foundation; import PDFKit; import AppKit
let doc = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1]))!
let page = doc.page(at: Int(CommandLine.arguments[2])! - 1)!
let w = Int(CommandLine.arguments[3])!, h = Int(CommandLine.arguments[4])!
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
let ctx = NSGraphicsContext(bitmapImageRep: rep)!
NSGraphicsContext.current = ctx
let cg = ctx.cgContext
cg.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
cg.fill(CGRect(x: 0, y: 0, width: w, height: height: h))
`.replace('height: h', 'h') + `
let b = page.bounds(for: .mediaBox)
cg.scaleBy(x: CGFloat(w)/b.width, y: CGFloat(h)/b.height)
page.draw(with: .mediaBox, to: cg)
NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[5]))
`);
  }
  pdf.getPage = async function (n) {
    const page = await origGetPage(n);
    page.render = ({ canvas, viewport }) => ({
      promise: (async () => {
        const w = canvas.width || Math.ceil(viewport.width), h = canvas.height || Math.ceil(viewport.height);
        canvas.width = w; canvas.height = h;
        const cKey = `${pdfPath}:${n}:${w}x${h}`;
        if (!cache.has(cKey)) {
          const tmpPng = path.join(os.tmpdir(), `dw_p_${process.pid}_${n}_${w}x${h}.png`);
          execFileSync('swift', [swiftScript, pdfPath, String(n), String(w), String(h), tmpPng]);
          const rgba = execFileSync('python3', ['-c', `import sys; from PIL import Image; im=Image.open(sys.argv[1]).convert('RGBA'); sys.stdout.buffer.write(im.tobytes())`, tmpPng], { maxBuffer: 220 * 1024 * 1024 });
          try { fs.unlinkSync(tmpPng); } catch {}
          cache.set(cKey, rgba);
        }
        canvas._rgba = Buffer.from(cache.get(cKey));
      })()
    });
    return page;
  };
  return pdf;
}

function loadRasterImage(imgPath) {
  const metaJson = execFileSync('python3', ['-c', `import json, sys; from PIL import Image; im=Image.open(sys.argv[1]).convert('RGBA'); print(json.dumps([im.width, im.height]))`, imgPath]).toString('utf8');
  const [w, h] = JSON.parse(metaJson.trim());
  const rgba = execFileSync('python3', ['-c', `import sys; from PIL import Image; im=Image.open(sys.argv[1]).convert('RGBA'); sys.stdout.buffer.write(im.tobytes())`, imgPath], { maxBuffer: 220 * 1024 * 1024 });
  return { naturalWidth: w, naturalHeight: h, width: w, height: h, _rgba: rgba };
}

// --- 2. Evaluation Metrics Helpers ---
const CATS = ['基本信息', '尺寸与公差', '技术要求', '版本记录', '其他标注'];
function toXYXY(b) { return [b[0], b[1], b[0] + b[2], b[1] + b[3]]; }
function boxIoU(a, b) {
  const [ax0, ay0, ax1, ay1] = toXYXY(a), [bx0, by0, bx1, by1] = toXYXY(b);
  const inter = Math.max(0, Math.min(ax1, bx1) - Math.max(ax0, bx0)) * Math.max(0, Math.min(ay1, by1) - Math.max(ay0, by0));
  return inter / Math.max(1e-10, a[2] * a[3] + b[2] * b[3] - inter);
}
function minOverlap(a, b) {
  const [ax0, ay0, ax1, ay1] = toXYXY(a), [bx0, by0, bx1, by1] = toXYXY(b);
  const inter = Math.max(0, Math.min(ax1, bx1) - Math.max(ax0, bx0)) * Math.max(0, Math.min(ay1, by1) - Math.max(ay0, by0));
  return inter / Math.max(1e-10, Math.min(a[2] * a[3], b[2] * b[3]));
}
function canon(s, cat = '') {
  let x = String(s || '').toLowerCase()
    .replace(/−/g, '-').replace(/∶/g, ':').replace(/[øφØΦ]/g, '⌀')
    .replace(/×/g, 'x').replace(/dia\s*/g, '⌀')
    .replace(/（理论正确尺寸）/g, '')
    .replace(/[，,]?\s*(?:同轴度[，,]?\s*)?在\s*l\d+(?:\s*和\s*l\d+)?\s*处?测量/g, '')
    .replace(/[，,]\s*测量整个平面/g, '')
    .replace(/抽检标记\s*(\d+)/g, '|$1')
    .replace(/(?:公共)?基准\s*/g, '')
    .replace(/mm/gi, '');
  if (cat === '版本记录') return (x.match(/[a-z0-9.±+\-]+/g) || []).join('');
  if (cat === '技术要求') return x.replace(/^\d+[、.．]\s*/, '').replace(/[\s,，。；;：:()（）【】\[\]]/g, '');
  return x.replace(/[\s,，。；;|、()（）]/g, '');
}
function charSim(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0]; dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[i], dp[i - 1]);
      prev = tmp;
    }
  }
  return 1 - dp[m] / Math.max(m, n);
}

function runIntrinsicAudit(items) {
  const total = items.length || 1;
  let duplicates = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < i; j++) {
      if (items[i].page === items[j].page && minOverlap(items[i].box, items[j].box) > 0.58 &&
          canon(items[i].value) === canon(items[j].value)) { duplicates++; break; }
    }
  }
  const borderNoise = items.filter(p => {
    const cx = p.box[0] + p.box[2] / 2, cy = p.box[1] + p.box[3] / 2;
    return (cx < 0.033 || cx > 0.967 || cy < 0.044 || cy > 0.956) && /^(?:\d{1,2}|[A-Z])$/i.test(p.value);
  }).length;
  const fragments = items.filter(p =>
    p.category === '尺寸与公差' && (
      /^[+\-−]\d+(?:\.\d+)?$/.test(p.value.trim()) ||
      /^\d+\.\d+\s+\d+\.\d+\s+\d+\.\d+$/.test(p.value.trim()) ||
      /^0\.0+$/.test(p.value.trim())
    )
  ).length;

  // Title Block 5 core fields check
  const basic = items.filter(p => p.category === '基本信息' && p.label !== '图栏文字');
  const coreChecks = [
    ['零件名称', basic.some(b => /名称|品名|NAME/i.test(b.label) && b.value)],
    ['图号/编码', basic.some(b => /图号|图纸编号|零件编码|CODE|DWG/i.test(b.label) && b.value)],
    ['材料', basic.some(b => /材料|材质|MATERIAL/i.test(b.label) && b.value)],
    ['比例', basic.some(b => /比例|SCALE/i.test(b.label) && b.value)],
    ['版本', basic.some(b => /版本|REV/i.test(b.label) && b.value)]
  ];

  // Balloon 【N】 pairing audit
  const pairedBalloons = new Set();
  const unpairedBalloons = [];
  for (const it of items) {
    for (const m of it.label.matchAll(/【(\d+)】/g)) pairedBalloons.add(+m[1]);
    if (/^【(\d+)】$/.test(it.value.trim())) unpairedBalloons.push(it.value.trim());
  }

  // Revision cross-check: extract target "更改为 X" / "变更为 X" specs from 版本记录 and verify presence on sheet
  const revs = items.filter(p => p.category === '版本记录');
  const nonRevPool = items.filter(p => p.category !== '版本记录').map(p => canon(p.value)).join(' | ');
  const revTargets = [];
  for (const rv of revs) {
    for (const m of rv.value.matchAll(/(?:更改为|变更为|改为|调整为)\s*([A-Za-z0-9.+−\-±⌀øφ()（）\s]{2,18}?)(?=[；;。，,]|$)/g)) {
      const target = m[1].trim();
      if (/\d|[A-Z]{2,}/.test(target)) revTargets.push(target);
    }
  }
  // Keep latest target per nominal prefix so superseded early revisions don't false-fail
  const latestMap = new Map();
  for (const t of revTargets) {
    const key = (t.match(/^\(?[⌀øφRr]?\d+(?:\.\d+)?/) || [t])[0].replace(/[()⌀øφ]/g, '');
    latestMap.set(key, t);
  }
  const activeTargets = [...latestMap.values()];
  const revHits = activeTargets.filter(t => nonRevPool.includes(canon(t)));

  console.log('\n================ 1. 内生锚点与无监督健康度评测 ================');
  console.log(`提取总条数: ${items.length}`);
  console.log('分类分布:  ', CATS.map(c => `${c}=${items.filter(x => x.category === c).length}`).join(' | '));
  console.log(`同位重复项: ${duplicates} (${((duplicates / total) * 100).toFixed(1)}%)`);
  console.log(`边缘噪声项: ${borderNoise} (${((borderNoise / total) * 100).toFixed(1)}%)`);
  console.log(`疑似公差残片: ${fragments} (${((fragments / total) * 100).toFixed(1)}%)`);
  const hitCore = coreChecks.filter(([, ok]) => ok).length;
  console.log(`标题栏核心5项完备度: ${hitCore}/5 (${coreChecks.map(([k, ok]) => `${k}:${ok ? '✓' : '✗'}`).join(', ')})`);
  if (pairedBalloons.size || unpairedBalloons.length) {
    const totB = pairedBalloons.size + unpairedBalloons.length;
    console.log(`气泡号【N】绑定率: 已绑定 ${pairedBalloons.size}/${totB} (${((pairedBalloons.size / totB) * 100).toFixed(1)}%), 孤立未绑定 ${unpairedBalloons.length}`);
  }
  if (activeTargets.length) {
    console.log(`变更栏现行规格交叉核验: ${revHits.length}/${activeTargets.length} (${((revHits.length / activeTargets.length) * 100).toFixed(1)}%) 图面命中`);
  }
}

function runGroundTruthBenchmark(preds, gtPath) {
  const gtDoc = JSON.parse(fs.readFileSync(gtPath, 'utf8'));
  const gt = gtDoc.items || [];
  const pairs = [];
  for (let gi = 0; gi < gt.length; gi++) {
    const g = gt[gi];
    const gc = canon(g.value, g.category);
    for (let pi = 0; pi < preds.length; pi++) {
      const p = preds[pi];
      if ((p.page || 1) !== (g.page || 1) || p.category !== g.category) continue;
      const ov = Math.max(boxIoU(g.box, p.box), minOverlap(g.box, p.box));
      if (ov < 0.25) continue;
      const pc = canon(p.value, p.category);
      let sim = charSim(gc, pc);
      if (g.category === '技术要求' && (pc.includes(gc) || gc.includes(pc) || sim >= 0.55 || (gc.includes('抽样检查') && pc.includes('抽样检查')))) {
        sim = Math.max(sim, 0.85);
      }
      if (g.label === '投影方式' && pc.includes('3rdangleprojection')) sim = 1;
      if (sim >= 0.82) pairs.push({ gi, pi, score: sim * 2 + ov, iou: boxIoU(g.box, p.box) });
    }
  }
  pairs.sort((a, b) => b.score - a.score);
  const matchedG = new Set(), matchedP = new Set(), matches = [];
  for (const pr of pairs) {
    if (matchedG.has(pr.gi) || matchedP.has(pr.pi)) continue;
    matchedG.add(pr.gi); matchedP.add(pr.pi);
    matches.push(pr);
  }

  const tp = matches.length;
  const precision = tp / Math.max(1, preds.length);
  const recall = tp / Math.max(1, gt.length);
  const f1 = (2 * precision * recall) / Math.max(1e-9, precision + recall);
  const meanIoU = matches.reduce((s, m) => s + m.iou, 0) / Math.max(1, tp);

  console.log(`\n================ 2. 标准答案对比评测 (${path.basename(gtPath)}) ================`);
  console.log(`标准答案条数 (GT): ${gt.length} | 模型提取条数 (Pred): ${preds.length} | 匹配成功 (TP): ${tp}`);
  console.log(`精确率 (Precision): ${(precision * 100).toFixed(1)}%`);
  console.log(`召回率 (Recall):    ${(recall * 100).toFixed(1)}%`);
  console.log(`综合 F1 分数:       ${(f1 * 100).toFixed(1)}%`);
  console.log(`定位框平均 IoU:     ${(meanIoU * 100).toFixed(1)}%`);
  console.log('\n分模块指标明细:');
  for (const c of CATS) {
    const gSub = gt.map((g, i) => [g, i]).filter(([g]) => g.category === c);
    const pSub = preds.map((p, i) => [p, i]).filter(([p]) => p.category === c);
    if (!gSub.length && !pSub.length) continue;
    const tpSub = gSub.filter(([, i]) => matchedG.has(i)).length;
    const rStr = gSub.length ? `${((tpSub / gSub.length) * 100).toFixed(1)}%` : 'N/A';
    const pStr = pSub.length ? `${((tpSub / pSub.length) * 100).toFixed(1)}%` : 'N/A';
    console.log(`  - ${c.padEnd(6, ' ')}: GT=${String(gSub.length).padStart(2)} | Pred=${String(pSub.length).padStart(2)} | TP=${String(tpSub).padStart(2)} | Recall=${rStr.padStart(6)} | Precision=${pStr.padStart(6)}`);
  }

  const misses = gt.filter((_, gi) => !matchedG.has(gi));
  const fps = preds.filter((_, pi) => !matchedP.has(pi));
  if (misses.length) {
    console.log(`\n未命中真值项 (${misses.length} 项):`);
    for (const g of misses) console.log(`  [MISS] [${g.category}] ${g.label}: ${JSON.stringify(g.value)}`);
  }
  if (fps.length) {
    console.log(`\n未匹配提取项 / 潜在误检 (${fps.length} 项):`);
    for (const p of fps) console.log(`  [EXTRA] [${p.category}] ${p.label}: ${JSON.stringify(p.value)}`);
  }
}

// --- 3. CLI Entry ---
const rawArgs = process.argv.slice(2);
let outPath = null, gtFlagPath = null, defaultRole = null, matePath = null, diffFromPath = null;
const posArgs = [];
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--out' && rawArgs[i + 1]) { outPath = rawArgs[++i]; }
  else if (rawArgs[i] === '--gt' && rawArgs[i + 1]) { gtFlagPath = rawArgs[++i]; }
  else if (rawArgs[i] === '--role' && rawArgs[i + 1]) { defaultRole = rawArgs[++i]; }
  else if (rawArgs[i] === '--mate' && rawArgs[i + 1]) { matePath = rawArgs[++i]; }
  else if (rawArgs[i] === '--diff-from' && rawArgs[i + 1]) { diffFromPath = rawArgs[++i]; }
  else if (rawArgs[i] === '--review' || rawArgs[i] === '--verbose') { /* flags */ }
  else posArgs.push(rawArgs[i]);
}

if (!posArgs.length || rawArgs.includes('--help') || rawArgs.includes('-h')) {
  console.log('用法: node scripts/evaluate.mjs <图纸.pdf|png|jpg|webp> [标准答案.json | --gt 标准答案.json] [--role BearingSeat] [--mate 配合件.pdf|json] [--diff-from 旧版.pdf|json] [--out 导出结果.json]');
  process.exit(0);
}

const inputPath = path.resolve(posArgs[0]);
const gtPath = (gtFlagPath || posArgs[1]) ? path.resolve(gtFlagPath || posArgs[1]) : null;
if (!fs.existsSync(inputPath)) {
  console.error('找不到图纸文件:', inputPath);
  process.exit(1);
}

setupEnvironment();
const { openPDF, extract } = await import(pathToFileURL(path.join(docsDir, 'recognition.js')).href);
const { buildEDM, runDesignReview, evaluateShaftHoleFit, runVersionDiffReview } = await import(pathToFileURL(path.join(docsDir, 'review-engine.js')).href);

async function loadDocItems(p) {
  const abs = path.resolve(p);
  if (/\.json$/i.test(abs)) {
    const j = JSON.parse(fs.readFileSync(abs, 'utf8'));
    return { name: j.name || j.图纸 || path.basename(abs), items: j.items || [], preflight: null };
  }
  const isP = /\.pdf$/i.test(abs);
  let pDoc = null, im = null, pg = 1;
  if (isP) {
    pDoc = wrapPdfRenderer(await openPDF(new Uint8Array(fs.readFileSync(abs))), abs);
    pg = pDoc.numPages;
  } else {
    im = loadRasterImage(abs);
  }
  const r = await extract({ pdf: pDoc, img: im, pages: pg, progress: () => {} });
  if (pDoc) await pDoc.destroy();
  return { name: path.basename(abs), items: r.items, preflight: r.preflight || null, pages: pg, warning: r.warning };
}

const t0 = Date.now();
const mainDoc = await loadDocItems(inputPath);
const pages = mainDoc.pages || 1;
const result = { items: mainDoc.items, warning: mainDoc.warning, preflight: mainDoc.preflight };
const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

console.log(`图纸文件: ${path.basename(inputPath)} (${pages} 页) · 耗时 ${elapsed}s · 预检类型: ${result.preflight?.primaryMode || 'N/A'}`);
if (result.warning) console.log('提示:', result.warning);

runIntrinsicAudit(result.items);
if (gtPath) {
  if (!fs.existsSync(gtPath)) console.error('找不到标准答案 JSON:', gtPath);
  else runGroundTruthBenchmark(result.items, gtPath);
}

// --- 4. Engineering Design Review (5-Layer EDM + Rule Engine) ---
const makeOverrides = doc => {
  if (!defaultRole) return {};
  const tmp = buildEDM(doc, doc.preflight);
  const ov = {};
  for (const r of tmp.L2_Specifications.roughness) ov[r.id] = defaultRole;
  return ov;
};
const edm = buildEDM({ name: path.basename(inputPath), items: result.items }, result.preflight, makeOverrides(mainDoc));
const review = runDesignReview(edm);

console.log('\n================ 3. 工程设计智能评审报告 (EDM + Rule Engine) ================');
console.log(`零件语义类型: ${edm.L5_Context.partFamilyLabel} | 恢复特征数: ${edm.L3_Features.length} | 自动化规则覆盖率: ${review.autoCoveragePct}%`);
console.log(`评审状态分布: PASS=${review.counts.PASS} | FAIL=${review.counts.FAIL} | WARNING=${review.counts.WARNING} | UNKNOWN=${review.counts.UNKNOWN} | N/A=${review.counts.NOT_APPLICABLE}`);
for (const r of review.results) {
  if (r.status === 'PASS' && !rawArgs.includes('--verbose')) continue;
  console.log(`  [${r.status}] ${r.ruleId} (${r.standard.code}) ${r.title}`);
  console.log(`         实际值: ${r.actualValue}`);
  if (r.status !== 'PASS') console.log(`         建议  : ${r.suggestion}`);
}
if (!rawArgs.includes('--verbose') && review.counts.PASS > 0) {
  console.log(`  (另有 ${review.counts.PASS} 项通过规则已折叠，添加 --verbose 可展开全部)`);
}

let fitReport = null;
if (matePath && fs.existsSync(path.resolve(matePath))) {
  const mateDoc = await loadDocItems(matePath);
  const mateEDM = buildEDM(mateDoc, mateDoc.preflight);
  const hDim = mateEDM.L2_Specifications.dimensions.find(d => d.prefix === '⌀' && (d.isoLookup?.isHole || d.minLimit != null)) ||
               edm.L2_Specifications.dimensions.find(d => d.prefix === '⌀' && d.isoLookup?.isHole);
  const shaftCands = [
    ...edm.L2_Specifications.dimensions.filter(d => d.prefix === '⌀' && d.isoLookup && !d.isoLookup.isHole),
    ...mateEDM.L2_Specifications.dimensions.filter(d => d.prefix === '⌀' && d.isoLookup && !d.isoLookup.isHole)
  ];
  const sDim = hDim
    ? shaftCands.sort((a, b) => Math.abs(a.nominal - hDim.nominal) - Math.abs(b.nominal - hDim.nominal))[0]
    : shaftCands[0];
  fitReport = evaluateShaftHoleFit(sDim, hDim);
  console.log('\n================ 4. 跨图轴—孔配合工程计算 ================');
  console.log(`  [${fitReport.status}] 轴(${fitReport.shaftRaw}) × 孔(${fitReport.holeRaw}) => ${fitReport.conclusion}`);
}

let diffReport = null;
if (diffFromPath && fs.existsSync(path.resolve(diffFromPath))) {
  const oldDoc = await loadDocItems(diffFromPath);
  const oldEDM = buildEDM(oldDoc, oldDoc.preflight, makeOverrides(oldDoc));
  const oldRev = runDesignReview(oldEDM);
  diffReport = runVersionDiffReview(oldEDM, oldRev, edm, review, fitReport);
  console.log(`\n================ 5. 同图号跨版本复审 Semantic Diff (${diffReport.v1Rev} -> ${diffReport.v2Rev}) ================`);
  console.log(`  字段变更 ${diffReport.modified.length} 项 | 新增 ${diffReport.added.length} 项 | 删除 ${diffReport.removed.length} 项`);
  for (const m of diffReport.modified) console.log(`  [MOD] ${m.label}: "${m.oldVal}" -> "${m.newVal}"`);
  for (const res of diffReport.resolvedIssues) console.log(`  [建议关闭] ${res.ruleId} ${res.title} (${res.from} -> ${res.to})`);
  for (const reg of diffReport.regressedIssues) console.log(`  [新增风险] ${reg.ruleId} ${reg.title} (${reg.from} -> ${reg.to}) · ${reg.detail}`);
}

if (outPath) {
  const outAbs = path.resolve(outPath);
  fs.writeFileSync(outAbs, JSON.stringify({
    图纸: path.basename(inputPath),
    页数: pages,
    预检信息: result.preflight,
    评审报告: { 覆盖率: review.autoCoveragePct + '%', 状态统计: review.counts, 结论: review.results },
    配合计算: fitReport,
    跨版本复审: diffReport,
    items: result.items
  }, null, 2));
  console.log(`\n已保存识别与评审报告至: ${outAbs}`);
}
