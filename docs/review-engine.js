// Engineering Drawing Model (5-Layer EDM) + Standards-Driven Design Review Engine
// Pure ES module (runs identically in Browser and Node.js CLI). Zero external dependencies.

// 1. Official Standards Index & Rule Governance Metadata
export const STANDARDS_INDEX = {
  'GB/T 10609.1-2008': {
    code: 'GB/T 10609.1-2008',
    title: '技术制图 标题栏',
    category: '01 机械制图',
    priority: 'P0',
    sourceType: 'standard_index',
    url: 'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=0F8577CB9AB82D5819048A87920CABAB'
  },
  'GB/T 14689-2008': {
    code: 'GB/T 14689-2008',
    title: '技术制图 图纸幅面和格式',
    category: '01 机械制图',
    priority: 'P0',
    sourceType: 'standard_index',
    url: 'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=6C3BD0FCD8FFFE7CEC6404FB0180EA96'
  },
  'GB/T 4458.4-2003': {
    code: 'GB/T 4458.4-2003',
    title: '机械制图 尺寸注法',
    category: '01 机械制图',
    priority: 'P0',
    sourceType: 'standard_index',
    url: 'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=08588A5F3FE19F16B9EE8D5D87E064D5'
  },
  'GB/T 4458.5-2003': {
    code: 'GB/T 4458.5-2003',
    title: '机械制图 尺寸公差与配合注法',
    category: '01 机械制图',
    priority: 'P0',
    sourceType: 'standard_index',
    url: 'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=B3D186FBD9E19A097724C5BB61AB2C4C'
  },
  'GB/T 1182-2018': {
    code: 'GB/T 1182-2018',
    title: '产品几何技术规范(GPS) 几何公差 形状、方向、位置和跳动公差标注',
    category: '02 GPS与公差',
    priority: 'P0',
    sourceType: 'standard_index',
    url: 'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=C87A687A21B36E2F2D3A09BDF03DCA01'
  },
  'GB/T 1800.1-2020': {
    code: 'GB/T 1800.1-2020',
    title: '产品几何技术规范(GPS) 线性尺寸公差 ISO代号体系 第1部分：公差、偏差和配合的基础',
    category: '02 GPS与公差',
    priority: 'P0',
    sourceType: 'standard_index',
    url: 'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=B2EA3A6454B903DCF466A0CE16F2ED26'
  },
  'GB/T 1800.2-2020': {
    code: 'GB/T 1800.2-2020',
    title: '产品几何技术规范(GPS) 线性尺寸公差 ISO代号体系 第2部分：标准公差带代号及孔、轴的极限偏差表',
    category: '02 GPS与公差',
    priority: 'P0',
    sourceType: 'table_lookup',
    url: 'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=8450464EA932756AE6C10593E68AA1AF'
  },
  'GB/T 1804-2000': {
    code: 'GB/T 1804-2000',
    title: '一般公差 未注公差的线性和角度尺寸的公差',
    category: '02 GPS与公差',
    priority: 'P0',
    sourceType: 'table_lookup',
    url: 'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=1BF8CFBC644315488F68433EEC2F9D58'
  },
  'GB/T 1184-1996': {
    code: 'GB/T 1184-1996',
    title: '形状和位置公差 未注公差值',
    category: '02 GPS与公差',
    priority: 'P0',
    sourceType: 'standard_index',
    url: 'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=3BB9267B84AF0E621CCF04C5A055280D'
  },
  'GB/T 131-2006': {
    code: 'GB/T 131-2006',
    title: '产品几何技术规范(GPS) 技术产品文件中表面结构的表示法',
    category: '02 GPS与公差',
    priority: 'P0',
    sourceType: 'standard_index',
    url: 'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=E83E2264601B94071763C2D0537B927A'
  },
  'GB/T 1958-2017': {
    code: 'GB/T 1958-2017',
    title: '产品几何技术规范(GPS) 几何公差 检测与验证',
    category: '02 GPS与公差',
    priority: 'P0',
    sourceType: 'standard_index',
    url: 'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=7E583F4C34EDA084FBEADF506B26ECDD'
  },
  'GB/T 39568-2020': {
    code: 'GB/T 39568-2020',
    title: '驱动微电机通用技术要求',
    category: '03 电机及零部件',
    priority: 'P0',
    sourceType: 'standard_index',
    url: 'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=4EE25AD08E9A62335788F7B89CA9EFFA'
  },
  'GB/T 39566-2020': {
    code: 'GB/T 39566-2020',
    title: '微电机 轴向间隙',
    category: '03 电机及零部件',
    priority: 'P0',
    sourceType: 'standard_index',
    url: 'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=CED5C086E9B411BDD589E6670D83D198'
  },
  'GB/T 47067-2026': {
    code: 'GB/T 47067-2026',
    title: '塑料模塑件公差和验收条件',
    category: '03 电机及零部件',
    priority: 'P1',
    sourceType: 'standard_index',
    url: 'https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=B67C911CB44AD61096553E6F2EFE5EE2'
  },
  'DEMO-SPEC-001': {
    code: 'DEMO-SPEC-001',
    title: '机电零件研发评审模拟规则集（PoC 演示规则，非正式国标/企标条款）',
    category: '05 模拟专业规则',
    priority: 'P0',
    sourceType: 'demo_simulated',
    url: ''
  }
};

// Canonical 7 Review States (strictly aligned with PoC Architecture Chapter 7.2)
export const REVIEW_STATES = {
  PASS: { code: 'PASS', label: '通过', desc: '符合当前规则要求' },
  FAIL: { code: 'FAIL', label: '不通过', desc: '证据完整且明确不符合规则约束' },
  WARNING: { code: 'WARNING', label: '风险提示', desc: '存在潜在设计/工艺风险，建议工程师复核' },
  UNKNOWN: { code: 'UNKNOWN', label: '待确认/未知', desc: '缺少功能角色、跨图上下文或覆盖证据，不得等同于通过' },
  NOT_APPLICABLE: { code: 'NOT_APPLICABLE', label: '不适用', desc: '当前零件类型或工艺场景不适用该规则' },
  APPROVED_EXCEPTION: { code: 'APPROVED_EXCEPTION', label: '例外放行', desc: '已登记有效偏离批准或替代要求' },
  EXECUTION_ERROR: { code: 'EXECUTION_ERROR', label: '执行异常', desc: '规则执行器异常' }
};

export const FUNCTIONAL_ROLES = [
  { id: 'UNCONFIRMED', label: '待确认功能角色' },
  { id: 'BearingSeat', label: '轴承安装面 (BearingSeat)' },
  { id: 'SealingSurface', label: '密封配合面 (SealingSurface)' },
  { id: 'MatingInterface', label: '一般装配配合面 (MatingInterface)' },
  { id: 'LocatingInterface', label: '定位基准面 (LocatingInterface)' },
  { id: 'GeneralSurface', label: '非配合普通表面 (GeneralSurface)' }
];

// Exact integer-micrometer arithmetic helpers (avoids IEEE-754 float drift like 12 - 0.011 = 11.989000000000001)
const toUm = mm => Math.round(Number(mm) * 1000);
const fromUm = um => +(um / 1000).toFixed(4);
export function fmtMm(mm, digits = 3) {
  if (mm == null || Number.isNaN(mm)) return '—';
  const s = Number(mm).toFixed(digits).replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '.000'.slice(0, digits ? 4 : 0));
  return Number(mm).toFixed(digits);
}
export function fmtSignedMm(mm) {
  if (mm == null || Number.isNaN(mm)) return '—';
  const v = +Number(mm).toFixed(4);
  const str = Math.abs(v).toFixed(3).replace(/0+$/, '').replace(/\.$/, '.0');
  return (v > 0 ? '+' : v < 0 ? '−' : '0') + (v === 0 ? '' : str);
}

// 2. ISO 286 / GB/T 1800.2 Preferred Fit Zones Lookup Table (values in micrometers [upperUm, lowerUm])
const NOMINAL_STEPS = [
  [0, 3], [3, 6], [6, 10], [10, 18], [18, 30],
  [30, 50], [50, 80], [80, 120], [120, 180], [180, 250], [250, 315]
];
const ISO_ZONES_UM = {
  // Shafts (lowercase)
  h5:  [[0,-4], [0,-5], [0,-6], [0,-8], [0,-9], [0,-11], [0,-13], [0,-15], [0,-18], [0,-20], [0,-23]],
  h6:  [[0,-6], [0,-8], [0,-9], [0,-11], [0,-13], [0,-16], [0,-19], [0,-22], [0,-25], [0,-29], [0,-32]],
  h7:  [[0,-10],[0,-12],[0,-15],[0,-18], [0,-21], [0,-25], [0,-30], [0,-35], [0,-40], [0,-46], [0,-52]],
  h8:  [[0,-14],[0,-18],[0,-22],[0,-27], [0,-33], [0,-39], [0,-46], [0,-54], [0,-63], [0,-72], [0,-81]],
  g6:  [[-2,-8],[-4,-12],[-5,-14],[-6,-17],[-7,-20],[-9,-25],[-10,-29],[-12,-34],[-14,-39],[-15,-44],[-17,-49]],
  f7:  [[-6,-16],[-10,-22],[-13,-28],[-16,-34],[-20,-41],[-25,-50],[-30,-60],[-36,-71],[-43,-83],[-50,-96],[-56,-108]],
  js6: [[3,-3], [4,-4], [4.5,-4.5],[5.5,-5.5],[6.5,-6.5],[8,-8],[9.5,-9.5],[11,-11],[12.5,-12.5],[14.5,-14.5],[16,-16]],
  k6:  [[6,0],  [9,1],  [10,1], [12,1],  [15,2],  [18,2],  [21,2],  [25,3],  [28,3],  [33,4],  [36,4]],
  m6:  [[8,2],  [12,4], [15,6], [18,7],  [21,8],  [25,9],  [30,11], [35,13], [40,15], [46,17], [52,20]],
  n6:  [[10,4], [16,8], [19,10],[23,12], [28,15], [33,17], [39,20], [45,23], [52,27], [60,31], [66,34]],
  p6:  [[12,6], [20,12],[24,15],[29,18], [35,22], [42,26], [51,32], [59,37], [68,43], [79,50], [88,56]],
  // Holes (UPPERCASE)
  H6:  [[6,0],  [8,0],  [9,0],  [11,0],  [13,0],  [16,0],  [19,0],  [22,0],  [25,0],  [29,0],  [32,0]],
  H7:  [[10,0], [12,0], [15,0], [18,0],  [21,0],  [25,0],  [30,0],  [35,0],  [40,0],  [46,0],  [52,0]],
  H8:  [[14,0], [18,0], [22,0], [27,0],  [33,0],  [39,0],  [46,0],  [54,0],  [63,0],  [72,0],  [81,0]],
  H9:  [[25,0], [30,0], [36,0], [43,0],  [52,0],  [62,0],  [74,0],  [87,0],  [100,0], [115,0], [130,0]],
  G7:  [[12,2], [16,4], [20,5], [24,6],  [28,7],  [34,9],  [40,10], [47,12], [54,14], [61,15], [69,17]],
  F8:  [[20,6], [28,10],[35,13],[43,16], [53,20], [64,25], [76,30], [90,36], [106,43],[122,50],[137,56]],
  JS7: [[5,-5], [6,-6], [7.5,-7.5],[9,-9],[10.5,-10.5],[12.5,-12.5],[15,-15],[17.5,-17.5],[20,-20],[23,-23],[26,-26]],
  K7:  [[0,-10],[3,-9], [5,-10],[6,-12], [6,-15], [7,-18], [9,-21], [10,-25],[12,-28],[13,-33],[16,-36]],
  M7:  [[-2,-12],[0,-12],[0,-15],[0,-18],[0,-21], [0,-25], [0,-30], [0,-35], [0,-40], [0,-46], [0,-52]],
  N7:  [[-4,-14],[-4,-16],[-4,-19],[-5,-23],[-7,-28],[-8,-33],[-9,-39],[-10,-45],[-12,-52],[-14,-60],[-14,-66]],
  P7:  [[-6,-16],[-8,-20],[-9,-24],[-11,-29],[-14,-35],[-17,-42],[-21,-51],[-24,-59],[-28,-68],[-33,-79],[-36,-88]]
};

export function lookupISOTolerance(nominalMm, zoneCode) {
  if (!nominalMm || nominalMm <= 0 || !zoneCode) return null;
  const code = String(zoneCode).trim();
  const isHole = /^[A-Z]/.test(code);
  const stepIdx = NOMINAL_STEPS.findIndex(([lo, hi]) => (lo === 0 ? nominalMm > 0 && nominalMm <= hi : nominalMm > lo && nominalMm <= hi));
  const row = ISO_ZONES_UM[code];
  if (stepIdx < 0 || !row) {
    const validSyntax = /^(?:[A-HJ-ZCDE]{1,2}|[a-hj-zcde]{1,2})(?:01|0|[1-9]|1[0-8])$/.test(code);
    return { supported: false, validSyntax, isHole, zoneCode: code };
  }
  const [esUm, eiUm] = row[stepIdx];
  const nomUm = toUm(nominalMm);
  return {
    supported: true,
    validSyntax: true,
    isHole,
    zoneCode: code,
    upperDevMm: +(esUm / 1000).toFixed(4),
    lowerDevMm: +(eiUm / 1000).toFixed(4),
    maxLimitMm: +((nomUm + esUm) / 1000).toFixed(4),
    minLimitMm: +((nomUm + eiUm) / 1000).toFixed(4),
    bandwidthMm: +((esUm - eiUm) / 1000).toFixed(4)
  };
}

// GB/T 1804-2000 General Linear Tolerance Table (± mm)
export function lookupGeneralLinearTol(nominalMm, grade = 'm') {
  const g = String(grade || 'm').toLowerCase();
  const table = {
    f: [[0.5,3,0.05],[3,6,0.05],[6,30,0.1],[30,120,0.15],[120,400,0.2],[400,1000,0.3],[1000,2000,0.5]],
    m: [[0.5,3,0.1], [3,6,0.1], [6,30,0.2],[30,120,0.3], [120,400,0.5],[400,1000,0.8],[1000,2000,1.2]],
    c: [[0.5,3,0.2], [3,6,0.3], [6,30,0.5],[30,120,0.8], [120,400,1.2],[400,1000,2.0],[1000,2000,3.0]],
    v: [[0.5,3,null],[3,6,0.5], [6,30,1.0],[30,120,1.5], [120,400,2.5],[400,1000,4.0],[1000,2000,6.0]]
  }[g];
  if (!table || !nominalMm) return null;
  const hit = table.find(([lo, hi]) => (lo === 0.5 ? nominalMm >= 0.5 && nominalMm <= hi : nominalMm > lo && nominalMm <= hi));
  return hit ? hit[2] : null;
}

// 3. Structured Annotation Parsers (L1 -> L2/L3/L4/L5 EDM)
function parseBalloonNums(str) {
  const nums = [];
  for (const m of String(str || '').matchAll(/【(\d+)】/g)) nums.push(+m[1]);
  return nums;
}

function parseSignedNum(s) {
  if (s == null) return null;
  const clean = String(s).trim().replace(/−/g, '-').replace(/°/g, '');
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

export function parseDimensionSpec(item) {
  const raw = String(item.value || '').trim();
  const balloons = parseBalloonNums(item.label);
  const baseObj = {
    id: item.id,
    item,
    raw,
    label: item.label,
    page: item.page,
    box: item.box,
    source: item.source || 'PDF',
    balloons
  };

  // Reference dimension in parentheses: e.g. "(⌀48.0)", "(33)"
  const refMatch = raw.match(/^[（(]\s*([ØΦφ⌀RrMm])?\s*(\d+(?:\.\d+)?)\s*(°|mm)?\s*(.*)[)）]$/i);
  if (refMatch) {
    const hasExtraTol = /[±+\-−/]/.test(refMatch[4] || '');
    return {
      ...baseObj,
      kind: 'dimension',
      prefix: refMatch[1] ? (/[ØΦφ⌀]/.test(refMatch[1]) ? '⌀' : refMatch[1].toUpperCase()) : '',
      nominal: +refMatch[2],
      unit: refMatch[3] === '°' ? 'deg' : 'mm',
      isAngular: refMatch[3] === '°',
      tolType: 'reference',
      hasInvalidRefTol: hasExtraTol
    };
  }

  // Strip auxiliary trailing clause like "，在L2处测量" or "|8"
  const cleaned = raw.replace(/，.*$/, '').replace(/\s*\|\d+\s*$/, '').trim();

  // Check boxed theoretical exact dimension: [50] or item.boxedExact
  const boxTxtMatch = cleaned.match(/^\[\s*([ØΦφ⌀Rr])?\s*(\d+(?:\.\d+)?)\s*\]$/);
  if (boxTxtMatch || (item.boxedExact && /^\d+(?:\.\d+)?$/.test(cleaned))) {
    const nom = boxTxtMatch ? +boxTxtMatch[2] : +cleaned;
    return {
      ...baseObj,
      kind: 'dimension',
      prefix: boxTxtMatch?.[1] ? '⌀' : '',
      nominal: nom,
      unit: 'mm',
      isAngular: false,
      tolType: 'theoretical',
      minLimit: nom,
      maxLimit: nom
    };
  }

  // Quantity prefix: "4-⌀8.5", "4×⌀3", "2 x R3"
  let rest = cleaned;
  let quantity = 1;
  const qm = rest.match(/^(\d{1,2})\s*(?:[-×xX]\s*)(?=[ØΦφ⌀RrMmCc\d]|DIA)/);
  if (qm) {
    quantity = +qm[1];
    rest = rest.slice(qm[0].length).trim();
  }
  rest = rest.replace(/^DIA\s*/i, '⌀');

  // Prefix: ⌀, R, M, C
  let prefix = '';
  const pm = rest.match(/^([ØΦφ⌀RrMmCc])\s*(?=\d)/);
  if (pm) {
    const ch = pm[1];
    prefix = /[ØΦφ⌀]/.test(ch) ? '⌀' : ch.toUpperCase();
    rest = rest.slice(pm[0].length).trim();
  }

  // Extract nominal value & optional degree symbol
  const nm = rest.match(/^(\d+(?:\.\d+)?)\s*(°)?\s*(.*)$/);
  if (!nm) return null;
  const nominal = +nm[1];
  const isAngular = nm[2] === '°';
  const unit = isAngular ? 'deg' : 'mm';
  const tail = (nm[3] || '').trim();

  // Case A: Symmetric tolerance ±val (e.g. "±0.05", "± 0.1 mm")
  const sym = tail.match(/^±\s*(\d+(?:\.\d+)?)°?(?:\s*mm)?$/i);
  if (sym) {
    const t = +sym[1];
    return {
      ...baseObj, kind: 'dimension', quantity, prefix, nominal, unit, isAngular,
      tolType: 'symmetric', upperDev: t, lowerDev: -t,
      maxLimit: isAngular ? +(nominal + t).toFixed(4) : fromUm(toUm(nominal) + toUm(t)),
      minLimit: isAngular ? +(nominal - t).toFixed(4) : fromUm(toUm(nominal) - toUm(t)),
      bandwidth: +(2 * t).toFixed(4)
    };
  }

  // Case B: Asymmetric stacked deviations "+0.04/−0.08", "(+0.04 / -0.08)", "−0.02/−0.05", "+1°/−0°"
  const asym = tail.match(/^\(?\s*([+\-−]?\d+(?:\.\d+)?)°?\s*\/\s*([+\-−]?\d+(?:\.\d+)?)°?\s*\)?$/);
  if (asym) {
    const up = parseSignedNum(asym[1]);
    const lo = parseSignedNum(asym[2]);
    const validOrder = up != null && lo != null && up > lo;
    return {
      ...baseObj, kind: 'dimension', quantity, prefix, nominal, unit, isAngular,
      tolType: 'asymmetric', upperDev: up, lowerDev: lo,
      upperRaw: asym[1], lowerRaw: asym[2],
      validOrder,
      maxLimit: up != null ? (isAngular ? +(nominal + up).toFixed(4) : fromUm(toUm(nominal) + toUm(up))) : null,
      minLimit: lo != null ? (isAngular ? +(nominal + lo).toFixed(4) : fromUm(toUm(nominal) + toUm(lo))) : null,
      bandwidth: (up != null && lo != null) ? +((toUm(up) - toUm(lo)) / 1000).toFixed(4) : null
    };
  }

  // Case C: ISO Tolerance Zone Code: e.g. "h6", "H7", "H7 (+0.018/0)"
  const iso = tail.match(/^([A-HJ-ZCDE]{1,2}\d{1,2}|[a-hj-zcde]{1,2}\d{1,2})(?:\s*\(([+\-−]?\d+(?:\.\d+)?)\s*\/\s*([+\-−]?\d+(?:\.\d+)?)\))?$/);
  if (iso) {
    const zoneCode = iso[1];
    const isoLookup = !isAngular ? lookupISOTolerance(nominal, zoneCode) : null;
    const explicitUp = iso[2] != null ? parseSignedNum(iso[2]) : null;
    const explicitLo = iso[3] != null ? parseSignedNum(iso[3]) : null;
    const up = isoLookup?.supported ? isoLookup.upperDevMm : explicitUp;
    const lo = isoLookup?.supported ? isoLookup.lowerDevMm : explicitLo;
    return {
      ...baseObj, kind: 'dimension', quantity, prefix, nominal, unit, isAngular,
      tolType: 'iso_zone', isoZone: zoneCode, isoLookup,
      explicitUp, explicitLo,
      upperDev: up, lowerDev: lo,
      maxLimit: up != null ? fromUm(toUm(nominal) + toUm(up)) : null,
      minLimit: lo != null ? fromUm(toUm(nominal) + toUm(lo)) : null,
      bandwidth: (up != null && lo != null) ? +((toUm(up) - toUm(lo)) / 1000).toFixed(4) : null
    };
  }

  // Case D: Single limit MAX / min (e.g. "R3.5 MAX", "6.0 min")
  const lim = tail.match(/^(MAX|min|MIN)(?:\s*mm)?$/);
  if (lim || /^(?:min|MAX)\s+/i.test(cleaned)) {
    const isMax = /max/i.test(lim ? lim[1] : cleaned);
    return {
      ...baseObj, kind: 'dimension', quantity, prefix, nominal, unit, isAngular,
      tolType: isMax ? 'limit_max' : 'limit_min',
      maxLimit: isMax ? nominal : null,
      minLimit: isMax ? null : nominal
    };
  }

  // Case E: Basic untoleranced dimension (e.g. "120 mm", "80", "R0.5")
  if (!tail || /^mm$/i.test(tail)) {
    return {
      ...baseObj, kind: 'dimension', quantity, prefix, nominal, unit, isAngular,
      tolType: 'none'
    };
  }

  return null;
}

export function parseGDTSpec(item) {
  const raw = String(item.value || '').trim();
  const m = raw.match(/^([⊥▱∥≡○◎⌖↗⇗])\s*(.*)$/);
  if (!m) return null;
  const symbol = m[1];
  const gdtMap = {
    '▱': { name: '平面度', cls: 'form' },
    '○': { name: '圆度', cls: 'form' },
    '⊥': { name: '垂直度', cls: 'orientation' },
    '∥': { name: '平行度', cls: 'orientation' },
    '⌖': { name: '位置度', cls: 'location' },
    '◎': { name: '同轴度', cls: 'location' },
    '≡': { name: '对称度', cls: 'location' },
    '↗': { name: '圆跳动', cls: 'runout' },
    '⇗': { name: '全跳动', cls: 'runout' }
  };
  // Strip trailing Chinese measurement notes (e.g. "，在L2处测量", "，同轴度,在L3和L4测量") before parsing datum letters
  const coreBody = m[2].replace(/[，,]\s*(?:在\s*L|同轴度|测量|局部|全长).*$/i, '').trim();
  const parts = coreBody.split(/\||，(?:公共)?基准\s*/).map(s => s.trim()).filter(Boolean);
  const tolSeg = parts[0] || '';
  const zoneDiameter = /[ØΦφ⌀]/.test(tolSeg);
  const modifier = /Ⓜ|\bM\b/.test(tolSeg) ? 'M' : (/Ⓛ/.test(tolSeg) ? 'L' : '');
  const vm = tolSeg.match(/(\d+(?:\.\d+)?)/);
  const value = vm ? +vm[1] : null;
  const datums = [];
  for (const seg of parts.slice(1)) {
    // Only extract standalone uppercase datum letters (A-Z, excluding measurement zone codes like L2/L3)
    const cleanSeg = seg.replace(/\bL\d+(?:-[A-Z])?\b/g, '');
    for (const dm of cleanSeg.matchAll(/\b([A-Z])\b|([A-Z])(?=-)|(?<=-)([A-Z])/g)) {
      const ch = dm[1] || dm[2] || dm[3];
      if (ch && !datums.includes(ch)) datums.push(ch);
    }
  }
  return {
    id: item.id,
    item,
    raw,
    symbol,
    name: gdtMap[symbol]?.name || '几何公差',
    gdtClass: gdtMap[symbol]?.cls || 'other',
    zoneDiameter,
    modifier,
    value,
    datums,
    balloons: parseBalloonNums(item.label),
    page: item.page,
    box: item.box
  };
}

export function parseRoughnessSpec(item) {
  const raw = String(item.value || '').trim();
  const m = raw.match(/^(Ra|Rz|Ry|Rq|▽+)\s*(\d+(?:\.\d+)?)\s*(?:μm|um)?/i);
  if (!m && !/粗糙度/.test(item.label)) return null;
  const vm = m || raw.match(/()(^\d+(?:\.\d+)?)/);
  if (!vm) return null;
  const param = (!vm[1] || /^▽/.test(vm[1])) ? 'Ra' : vm[1][0].toUpperCase() + vm[1].slice(1).toLowerCase();
  return {
    id: item.id,
    item,
    raw,
    param,
    value: +vm[2],
    unit: 'μm',
    page: item.page,
    box: item.box,
    balloons: parseBalloonNums(item.label)
  };
}

function boxEdgeDist(a, b) {
  if (!a || !b) return Infinity;
  const dx = Math.max(0, Math.max(a[0] - (b[0] + b[2]), b[0] - (a[0] + a[2])));
  const dy = Math.max(0, Math.max(a[1] - (b[1] + b[3]), b[1] - (a[1] + a[3])));
  return Math.hypot(dx, dy);
}

// Build 5-Layer Engineering Drawing Model (EDM)
export function buildEDM(doc, preflight = null, roleOverrides = {}) {
  const items = doc?.items || [];
  const basic = items.filter(i => i.category === '基本信息');
  const revItems = items.filter(i => i.category === '版本记录');
  const noteItems = items.filter(i => i.category === '技术要求');

  const findBasic = re => basic.find(b => re.test(b.label) && String(b.value || '').trim())?.value?.trim() || '';
  const findBasicItem = re => basic.find(b => re.test(b.label) && String(b.value || '').trim()) || null;

  const metadata = {
    docName: doc?.name || '',
    partName: findBasic(/零件名称|品名|PART\s*NAME/i),
    partNameItem: findBasicItem(/零件名称|品名|PART\s*NAME/i),
    drawingNo: findBasic(/图纸编号|图号|DWG|DRAWING/i),
    drawingNoItem: findBasicItem(/图纸编号|图号|DWG|DRAWING/i),
    partCode: findBasic(/零件编码|CODE/i),
    material: findBasic(/材料|材质|MATERIAL/i),
    materialItem: findBasicItem(/材料|材质|MATERIAL/i),
    scale: findBasic(/比例|SCALE/i),
    scaleItem: findBasicItem(/比例|SCALE/i),
    revision: findBasic(/2D\s*版本|^版本$|REVISION|2D\s*REV/i) || findBasic(/版本|REV/i),
    revisionItem: findBasicItem(/2D\s*版本|^版本$|REVISION|2D\s*REV/i) || findBasicItem(/版本|REV/i),
    rev3D: findBasic(/3D\s*版本|3D\s*REV/i),
    rev3DItem: findBasicItem(/3D\s*版本|3D\s*REV/i),
    titleGenTol: findBasic(/未注.*公差|无指示.*公差|一般公差|GENERAL\s*TOL/i),
    titleGenTolItem: findBasicItem(/未注.*公差|无指示.*公差|一般公差|GENERAL\s*TOL/i),
    placeholderItems: basic.filter(b => /#[A-Za-z0-9_]+#|待定|TBD|\?\?\?/i.test(b.value)),
    sheetSize: findBasic(/图幅|SIZE/i) || preflight?.inferredSheet || '',
    projection: findBasic(/投影|视角|PROJECTION/i) || (items.find(i => /PROJECTION|视角|第一角|第三角/i.test(i.value))?.value || ''),
    drawnBy: findBasic(/制图人|设计|DRAWN/i),
    checkedBy: findBasic(/审核人?|CHECKED/i),
    approvedBy: findBasic(/批准人?|APPROVED/i),
    weight: findBasic(/重量|质量|WEIGHT/i),
    revisions: revItems.map(r => {
      const vm = (r.label + ' ' + r.value).match(/(?:版本|Rev\.?)\s*([A-Z0-9.]+)/i);
      return { id: r.id, rev: vm ? vm[1] : '', label: r.label, text: r.value, item: r };
    })
  };

  // L2 Specifications
  const dimensions = [];
  const gdts = [];
  const roughness = [];
  const datumsDefined = [];

  for (const it of items) {
    if (/^基准\s*[A-Z]$/.test(it.label) || (/^[A-Z]$/.test(it.value) && /基准/.test(it.label))) {
      const dm = (it.value || it.label).match(/([A-Z])$/);
      if (dm) datumsDefined.push({ letter: dm[1], id: it.id, item: it });
      continue;
    }
    const g = parseGDTSpec(it);
    if (g) { gdts.push(g); continue; }
    const r = parseRoughnessSpec(it);
    if (r) { roughness.push(r); continue; }
    if (it.category === '尺寸与公差') {
      const d = parseDimensionSpec(it);
      if (d) dimensions.push(d);
    }
  }

  // Parse Global General Tolerance from Technical Requirements OR Title Block
  const allNotesText = noteItems.map(n => n.value).join(' ； ');
  let generalTolerance = null;
  const gbt1804 = (allNotesText + ' ' + metadata.titleGenTol).match(/(?:GB\/?T\s*1804|ISO\s*2768)\s*[-—:：]?\s*([fmcvFMCV])(?:\s*([HKL]))?/);
  const explicitGenPm = allNotesText.match(/(?:未注|无指示|一般)[^。；\n]{0,20}(?:公差|允许差)[^±\d。；\n]{0,14}±\s*(\d+(?:\.\d+)?)\s*(?:mm)?/) ||
    allNotesText.match(/尺寸(?:公差|允许差)[^±\d。；\n]{0,12}±\s*(\d+(?:\.\d+)?)\s*(?:mm)?/) ||
    metadata.titleGenTol.match(/±\s*(\d+(?:\.\d+)?)/);
  if (gbt1804) {
    generalTolerance = { type: 'standard', standard: gbt1804[0].toUpperCase().includes('ISO') ? 'ISO 2768' : 'GB/T 1804', grade: gbt1804[1].toLowerCase(), geomGrade: gbt1804[2] || null };
  } else if (explicitGenPm) {
    generalTolerance = { type: 'explicit_pm', standard: metadata.titleGenTol ? '标题栏无指示尺寸公差' : '技术要求明示未注公差', explicitMm: +explicitGenPm[1] };
  }
  const hasGeneralFilletChamfer = /未注(?:圆角|倒角)|SHARP\s*EDGES\s*\d|CHAMFER|R\s*\d+(?:\.\d+)?/i.test(allNotesText);
  const hasBurrClause = /毛刺|毛口|飞边|锐边|DEBURR|SHARP\s*EDGES/i.test(allNotesText);

  // L5 Part Family Inference
  const nameAndMat = `${metadata.docName} ${metadata.partName} ${metadata.material}`;
  let partFamily = 'general_machined';
  if (/轴(?!承座|承端盖)|SHAFT|SPINDLE|ROTOR/i.test(metadata.partName || metadata.docName)) partFamily = 'motor_shaft';
  else if (/轴承座|端盖|机壳|壳体|HOUSING|BRACKET|COVER|FLANGE/i.test(metadata.partName || metadata.docName)) partFamily = 'housing_cover';
  else if (/齿轮|蜗轮|蜗杆|GEAR|PINION|WORM/i.test(metadata.partName || metadata.docName)) partFamily = 'gear';
  else if (/PA66|PBT|POM|ABS|PC|PP|PEEK|注塑|塑料/i.test(nameAndMat)) partFamily = 'plastic_molded';
  else if (/板|支架|PLATE|MOUNT/i.test(metadata.partName || metadata.docName)) partFamily = 'plate_bracket';

  // L3 Geometric Feature Occurrence Recovery & Annotation-Feature Binding
  const features = dimensions.map((d, idx) => {
    const fid = `F${String(idx + 1).padStart(2, '0')}`;
    let featureType = 'LinearDimension';
    if (d.prefix === '⌀') {
      if (d.isoLookup) featureType = d.isoLookup.isHole ? 'CylindricalHole' : 'CylindricalShaft';
      else if (d.quantity > 1) featureType = 'PatternHoles';
      else if (partFamily === 'motor_shaft') featureType = 'CylindricalShaft';
      else if (/孔|BORE|HOLE/i.test(d.label)) featureType = 'CylindricalHole';
      else if (d.tolType === 'asymmetric' && d.upperDev <= 0 && partFamily !== 'housing_cover') featureType = 'CylindricalShaft';
      else featureType = partFamily === 'housing_cover' ? 'CylindricalFeature' : 'CylindricalFeature';
    } else if (d.prefix === 'R') featureType = 'FilletOrRadius';
    else if (d.prefix === 'M') featureType = 'ThreadFeature';
    else if (d.prefix === 'C' || d.isAngular) featureType = 'ChamferOrAngle';

    const defaultRole = roleOverrides[d.id] || 'UNCONFIRMED';
    return {
      featureId: fid,
      featureType,
      dim: d,
      functionalRole: defaultRole,
      linkedGDTs: [],
      linkedRoughness: []
    };
  });

  // Bind GD&T & Roughness annotations to nearest plausible geometric feature on same page (L3 refersToFeature)
  const cylFeatures = features.filter(f => f.featureType.startsWith('Cylindrical') || f.featureType === 'PatternHoles');
  for (const g of gdts) {
    const cands = (cylFeatures.length ? cylFeatures : features).filter(f => f.dim.page === g.page);
    let best = null, bestD = Infinity;
    for (const f of cands) {
      const d = boxEdgeDist(g.box, f.dim.box);
      if (d < bestD) { bestD = d; best = f; }
    }
    if (best && bestD <= 0.22) {
      best.linkedGDTs.push(g);
      g.targetFeatureId = best.featureId;
    }
  }
  for (const r of roughness) {
    // General surface roughness sits near top-right or notes; local roughness sits near feature/leader
    const cands = (cylFeatures.length ? cylFeatures : features).filter(f => f.dim.page === r.page);
    let best = null, bestD = Infinity;
    for (const f of cands) {
      const d = boxEdgeDist(r.box, f.dim.box);
      if (d < bestD) { bestD = d; best = f; }
    }
    const overrideRole = roleOverrides[r.id] || (best ? roleOverrides[best.dim.id] : null) || 'UNCONFIRMED';
    r.functionalRole = overrideRole;
    if (best && bestD <= 0.26) {
      best.linkedRoughness.push(r);
      r.targetFeature = best;
    }
  }

  const pdfCnt = items.filter(i => (i.source || 'PDF') === 'PDF').length;
  const ocrCnt = items.filter(i => i.source === 'OCR').length;
  const coverageComplete = preflight ? preflight.coverageComplete : (items.length > 0 && (pdfCnt > 0 || ocrCnt > 3));

  return {
    L1_Observation: {
      totalItems: items.length,
      pdfItems: pdfCnt,
      ocrItems: ocrCnt,
      manualItems: items.filter(i => i.source === '手工').length,
      confirmedItems: items.filter(i => !i.review).length,
      primaryMode: preflight?.primaryMode || (pdfCnt > 0 ? 'CAD矢量解析' : '图像OCR解析'),
      coverageComplete
    },
    L2_Specifications: {
      metadata,
      dimensions,
      gdts,
      roughness,
      datumsDefined,
      generalTolerance,
      hasGeneralFilletChamfer,
      hasBurrClause,
      techNotes: noteItems
    },
    L3_Features: features,
    L5_Context: {
      partFamily,
      partFamilyLabel: {
        motor_shaft: '电机轴类零件',
        housing_cover: '壳体/端盖/轴承座类零件',
        gear: '齿轮传动件',
        plastic_molded: '塑料模塑件',
        plate_bracket: '板类/安装支架零件',
        general_machined: '通用机加工零件'
      }[partFamily]
    },
    rawDoc: doc
  };
}

// 4. Deterministic Engineering Review Rule Engine (16 Core Rules across 6 Dimensions)
export function runDesignReview(edm, { exceptions = {} } = {}) {
  const results = [];
  const { L1_Observation: obs, L2_Specifications: spec, L3_Features: features, L5_Context: ctx } = edm;
  const meta = spec.metadata;

  const pushIssue = ({
    ruleId, title, dimension, priority = 'P0', standardCode, status,
    actualValue, requiredValue, risk, suggestion, evidenceItem = null, evidenceItems = null,
    confirmTarget = null
  }) => {
    const finalStatus = exceptions[ruleId] ? 'APPROVED_EXCEPTION' : status;
    const std = STANDARDS_INDEX[standardCode] || STANDARDS_INDEX['DEMO-SPEC-001'];
    const evList = (evidenceItems && evidenceItems.length ? evidenceItems : (evidenceItem ? [evidenceItem] : [])).filter(Boolean);
    const primaryEv = evidenceItem || evList[0] || null;
    results.push({
      id: `${ruleId}-${results.length + 1}`,
      ruleId,
      title,
      dimension,
      priority,
      standard: std,
      status: finalStatus,
      actualValue,
      requiredValue,
      risk,
      suggestion: finalStatus === 'APPROVED_EXCEPTION' ? `已按批准偏离放行（备注：${exceptions[ruleId]}）` : suggestion,
      page: primaryEv?.page || 1,
      box: primaryEv?.box || null,
      evidenceId: primaryEv?.id || null,
      evidenceLabel: primaryEv ? `${primaryEv.label}: ${primaryEv.value}` : '全图范围核查',
      evidenceItems: evList.map(it => ({ id: it.id, label: it.label, value: it.value, page: it.page, box: it.box })),
      confirmTarget
    });
  };

  // --- Dimension 1: 完整性及版本治理 ---
  // R-DOC-01: Title block mandatory 5 fields
  const reqFields = [
    ['零件名称', meta.partName],
    ['图号/编码', meta.drawingNo || meta.partCode],
    ['材料牌号', meta.material],
    ['比例/页次', meta.scale || (edm.rawDoc?.items?.some(i => /页次/.test(i.label)) ? '1/1' : '')],
    ['版本号', meta.revision]
  ];
  const missingFields = reqFields.filter(([, v]) => !v).map(([k]) => k);
  pushIssue({
    ruleId: 'R-DOC-01',
    title: '标题栏核心五项完整性校验',
    dimension: '完整性及版本',
    priority: 'P0',
    standardCode: 'GB/T 10609.1-2008',
    status: missingFields.length === 0 ? 'PASS' : (obs.coverageComplete ? 'FAIL' : 'UNKNOWN'),
    actualValue: missingFields.length === 0
      ? `5/5 齐全（${meta.partName} · ${meta.drawingNo || meta.partCode} · ${meta.material} · Rev ${meta.revision}）`
      : `缺失 ${missingFields.length} 项：${missingFields.join('、')}`,
    requiredValue: '标题栏须具备零件名称、图号、材料牌号、比例/页次及现行版本号',
    risk: '元数据残缺会导致投产错版、ERP/BOM 建档失败或错用材料',
    suggestion: missingFields.length === 0 ? '无需整改' : `请在标题栏补齐：${missingFields.join('、')}（若系转曲未识别可在工作台补录确认）`,
    evidenceItem: meta.partNameItem || meta.drawingNoItem
  });

  // R-DOC-02: Approval signatures, template placeholders (#SH#/#PZ#) & sheet/projection declaration
  const hasPlaceholders = meta.placeholderItems.length > 0;
  const validCheck = meta.checkedBy && !/#/.test(meta.checkedBy);
  const validApprove = meta.approvedBy && !/#/.test(meta.approvedBy);
  const hasSign = !!(meta.drawnBy && (validCheck || validApprove) && !hasPlaceholders);
  const hasProjOrSheet = !!(meta.projection || meta.sheetSize);
  pushIssue({
    ruleId: 'R-DOC-02',
    title: '审签责任链、CAD模板占位符与投影声明校验',
    dimension: '完整性及版本',
    priority: 'P0',
    standardCode: 'GB/T 14689-2008',
    status: hasPlaceholders ? 'FAIL' : ((hasSign && hasProjOrSheet) ? 'PASS' : 'WARNING'),
    actualValue: hasPlaceholders
      ? `发现未替换 CAD 模板宏占位符：${meta.placeholderItems.map(p => `${p.label}="${p.value}"`).join('、')}`
      : `签署:${meta.drawnBy || '—'}/${meta.checkedBy || '—'}/${meta.approvedBy || '—'} · 图幅:${meta.sheetSize || '未标'} · 投影:${meta.projection || '未明示'}`,
    requiredValue: '正式受控图样不得残留 #SH#/#PZ#/TBD 等模板占位符，须具备完整审签责任人及第一角/第三角投影声明',
    risk: hasPlaceholders ? '审批栏残留模板宏占位符说明图纸未经正式校审流程直接导出，违反受控文件放行要求' : '缺少投影视角声明在外协加工时易导致镜像报废',
    suggestion: hasPlaceholders ? `请在 PDM/CAD 图栏属性中完成审核/批准电子签章，清除 ${meta.placeholderItems.map(p => p.value).join('/')} 占位符` : ((hasSign && hasProjOrSheet) ? '无需整改' : '建议补全制图/审核/批准签署及视角投影符号声明'),
    evidenceItem: meta.placeholderItems[0] || meta.scaleItem || meta.drawingNoItem,
    evidenceItems: meta.placeholderItems.length ? meta.placeholderItems : [meta.scaleItem || meta.drawingNoItem]
  });

  // R-DOC-04: 2D vs 3D revision sync check (if both exist in title block)
  if (meta.rev3D && meta.revision && meta.rev3D.replace(/^V/i, '') !== meta.revision.replace(/^V/i, '')) {
    pushIssue({
      ruleId: 'R-DOC-04',
      title: '标题栏 2D 图纸版本与 3D 数模版本同步核查',
      dimension: '跨文档及版本',
      priority: 'P1',
      standardCode: 'GB/T 10609.1-2008',
      status: 'WARNING',
      actualValue: `2D 图纸版本为 ${meta.revision}，但标题栏关联 3D 数模版本仍为 ${meta.rev3D}`,
      requiredValue: '涉及几何结构或配合尺寸修改时，2D 工程图与 3D 数模版本宜保持同步并在 PDM 中建立明确映射',
      risk: '若仅修改 2D 图纸尺寸而未同步更新 3D 数模，模具 CNC 编程/CAM 加工与装配干涉检查将沿用旧数模导致零件报废',
      suggestion: `请核实本次 2D 升版（${meta.revision}）是否涉及 3D 几何变动；若涉及请同步升版 3D 数模并更新图栏 3D 版本号`,
      evidenceItem: meta.rev3DItem,
      evidenceItems: [meta.revisionItem, meta.rev3DItem]
    });
  }

  // R-DOC-03: Revision table vs current Title Block cross-validation
  if (meta.revisions.length > 0) {
    const latest = meta.revisions[meta.revisions.length - 1];
    const revMatch = !meta.revision || !latest.rev || meta.revision.replace(/^V/i, '') === latest.rev.replace(/^V/i, '');
    // Also check if latest revision mentions material/code change and verify against title block
    let contentConsistent = true;
    let mismatchDetail = '';
    const matChange = latest.text.match(/材料(?:更改|变更)为\s*([A-Za-z0-9\s\-]+)/);
    if (matChange && meta.material) {
      const normA = matChange[1].replace(/[\s\-]/g, '').toUpperCase();
      const normB = meta.material.replace(/[\s\-]/g, '').toUpperCase();
      if (!normB.includes(normA.slice(0, 5)) && !normA.includes(normB.slice(0, 5))) {
        contentConsistent = false;
        mismatchDetail = `变更栏声明材料为 ${matChange[1].trim()}，但标题栏现行材料为 ${meta.material}`;
      }
    }
    pushIssue({
      ruleId: 'R-DOC-03',
      title: '版本履历表与现行图栏交叉一致性',
      dimension: '完整性及版本',
      priority: 'P0',
      standardCode: 'GB/T 10609.1-2008',
      status: (revMatch && contentConsistent) ? 'PASS' : 'FAIL',
      actualValue: mismatchDetail || `变更表最新行 Rev ${latest.rev || '—'} vs 标题栏版本 ${meta.revision || '—'}`,
      requiredValue: '修订栏最新版本号及变更内容（材料/编码/关键尺寸）须与图面现行标注严格自洽',
      risk: '改图未改版号或变更栏与图面实际参数脱节，易引发新旧版本混产',
      suggestion: (revMatch && contentConsistent) ? '无需整改' : '请同步更新标题栏版本号与变更表最新记录，核对变更点是否已在图面全部落地',
      evidenceItem: latest.item || meta.revisionItem
    });
  } else {
    pushIssue({
      ruleId: 'R-DOC-03',
      title: '版本履历表与现行图栏交叉一致性',
      dimension: '完整性及版本',
      priority: 'P1',
      standardCode: 'GB/T 10609.1-2008',
      status: /^1\.0$|^A$|^V?1\.0$/i.test(meta.revision) ? 'PASS' : 'WARNING',
      actualValue: `当前版本 ${meta.revision || '未标注'}，图面未提取到多行修订履历表`,
      requiredValue: '非首版图纸（如 B版 / V2.0）应保留历史变更记录说明',
      risk: '缺少变更履历会导致复审时无法追溯历史受影响特征',
      suggestion: /^1\.0$|^A$|^V?1\.0$/i.test(meta.revision) ? '首版图纸正常' : '非首版图纸建议补充修订记录表或在 PLM 关联变更单',
      evidenceItem: meta.revisionItem
    });
  }

  // --- Dimension 2: 尺寸与极限偏差逻辑 (GB/T 4458.4 / 4458.5) ---
  const asymDims = spec.dimensions.filter(d => d.tolType === 'asymmetric');
  const invalidAsym = asymDims.filter(d => !d.validOrder);
  if (invalidAsym.length > 0) {
    for (const bad of invalidAsym) {
      pushIssue({
        ruleId: 'R-DIM-01',
        title: '极限偏差上下限数学合法性检查',
        dimension: '尺寸与几何公差',
        priority: 'P0',
        standardCode: 'GB/T 4458.5-2003',
        status: 'FAIL',
        actualValue: `${bad.raw}（上偏差 ${bad.upperDev} ≤ 下偏差 ${bad.lowerDev}）`,
        requiredValue: '上极限偏差 ES/es 必须严格大于下极限偏差 EI/ei（公差带宽 T > 0）',
        risk: '上下偏差颠倒或漏标负号会导致公差带为空集，车间与三坐标无法执行加工与判定',
        suggestion: `请核对 ${bad.raw} 的正负号（例如下偏差是否遗漏负号 −）或修正上下偏差位置`,
        evidenceItem: bad.item
      });
    }
  } else {
    pushIssue({
      ruleId: 'R-DIM-01',
      title: '极限偏差上下限数学合法性检查',
      dimension: '尺寸与几何公差',
      priority: 'P0',
      standardCode: 'GB/T 4458.5-2003',
      status: 'PASS',
      actualValue: asymDims.length > 0 ? `已核验全部 ${asymDims.length} 处双行上下偏差，均满足上偏差 > 下偏差` : '无双行不对称偏差标注（均采用对称公差或公差带代号）',
      requiredValue: '所有双行极限偏差必须满足 ES > EI 且正负号明确',
      risk: '无异常',
      suggestion: '无需整改',
      evidenceItem: asymDims[0]?.item || spec.dimensions[0]?.item
    });
  }

  // R-DIM-02: Ultra-tight tolerance manufacturability warning (< 0.008 mm)
  const tightDims = spec.dimensions.filter(d => !d.isAngular && d.bandwidth != null && d.bandwidth > 0 && d.bandwidth < 0.008);
  pushIssue({
    ruleId: 'R-DIM-02',
    title: '尺寸公差带宽可制造性（IT5级超严公差预警）',
    dimension: '制造与检验',
    priority: 'P1',
    standardCode: 'GB/T 1800.1-2020',
    status: tightDims.length > 0 ? 'WARNING' : 'PASS',
    actualValue: tightDims.length > 0
      ? `发现 ${tightDims.length} 处极窄公差带：${tightDims.map(d => `${d.raw} (T=${d.bandwidth}mm)`).join('；')}`
      : `共校验 ${spec.dimensions.filter(d => d.bandwidth != null).length} 处公差尺寸，最小公差带宽合理`,
    requiredValue: '常规机加工/磨削公差带一般 ≥ 0.008 mm；超窄公差需确认精密磨削/珩磨与检具能力',
    risk: '公差过严会显著推高加工报废率与三坐标/气动量仪检测成本',
    suggestion: tightDims.length > 0 ? '请与工艺/质量确认超严公差是否确属功能必需及现有产线 Cpk 能力' : '无需整改',
    evidenceItem: tightDims[0]?.item || spec.dimensions[0]?.item
  });

  // R-DIM-03: Reference & Theoretical Exact Dimensions syntax
  const refDims = spec.dimensions.filter(d => d.tolType === 'reference');
  const theoDims = spec.dimensions.filter(d => d.tolType === 'theoretical');
  const badRef = refDims.find(d => d.hasInvalidRefTol);
  const orphanTheo = theoDims.length > 0 && spec.gdts.filter(g => g.gdtClass === 'location' || g.gdtClass === 'orientation').length === 0;
  pushIssue({
    ruleId: 'R-DIM-03',
    title: '理论正确尺寸 [X] 与参考尺寸 (X) 标注规范',
    dimension: '制图规范',
    priority: 'P0',
    standardCode: 'GB/T 4458.4-2003',
    status: badRef ? 'FAIL' : (orphanTheo ? 'WARNING' : 'PASS'),
    actualValue: `理论框尺寸 ${theoDims.length} 处 · 括弧参考尺寸 ${refDims.length} 处`,
    requiredValue: '括弧参考尺寸仅作信息参考不得带公差；方框理论正确尺寸不得附公差且须配合位置/方向公差框使用',
    risk: '参考尺寸带公差会导致尺寸链封闭冲突；孤立理论框尺寸会导致加工无公差依据',
    suggestion: badRef ? `请移除参考尺寸 ${badRef.raw} 内的公差或去掉括弧` : (orphanTheo ? '理论正确尺寸框应补充配套的位置度或轮廓度公差框' : '无需整改'),
    evidenceItem: badRef?.item || theoDims[0]?.item || refDims[0]?.item
  });

  // --- Dimension 3: ISO 公差带代号查表 & 未注公差覆盖 ---
  // R-TOL-01: ISO Tolerance Zone Validation & Table Lookup (GB/T 1800.2-2020)
  const isoDims = spec.dimensions.filter(d => d.tolType === 'iso_zone');
  if (isoDims.length > 0) {
    for (const d of isoDims) {
      const lk = d.isoLookup;
      const labelHole = /孔|BORE|HOLE/i.test(d.label);
      const labelShaft = /轴(?!承座)|SHAFT/i.test(d.label) || ctx.partFamily === 'motor_shaft';
      const caseMismatch = (lk?.isHole && labelShaft && !labelHole) || (lk && !lk.isHole && labelHole);
      let explicitMismatch = false;
      if (lk?.supported && d.explicitUp != null && d.explicitLo != null) {
        if (Math.abs(d.explicitUp - lk.upperDevMm) > 0.0005 || Math.abs(d.explicitLo - lk.lowerDevMm) > 0.0005) {
          explicitMismatch = true;
        }
      }
      if (!lk?.validSyntax || caseMismatch || explicitMismatch) {
        pushIssue({
          ruleId: 'R-TOL-01',
          title: `ISO 公差带代号及查表核验 (${d.raw})`,
          dimension: '尺寸与几何公差',
          priority: 'P0',
          standardCode: 'GB/T 1800.2-2020',
          status: 'FAIL',
          actualValue: caseMismatch
            ? `${d.raw}（孔/轴大小写代号与特征属性反向）`
            : (explicitMismatch ? `${d.raw} 括号偏差与查表值 (${fmtSignedMm(lk.upperDevMm)}/${fmtSignedMm(lk.lowerDevMm)}) 不一致` : `非法公差带代号 ${d.isoZone}`),
          requiredValue: '内孔特征须采用大写基本偏差代号（如 H7），外圆轴须采用小写代号（如 h6），且极限偏差须与 GB/T 1800.2 一致',
          risk: '孔轴代号大小写混淆或括号偏差查表抄错会直接造成过盈抱死或松旷失效',
          suggestion: caseMismatch ? `请核实特征为外圆轴还是内孔，修正 ${d.isoZone} 的大小写` : '请按 GB/T 1800.2-2020 修正公差带代号或括号极限偏差',
          evidenceItem: d.item
        });
      } else if (!lk.supported) {
        pushIssue({
          ruleId: 'R-TOL-01',
          title: `ISO 公差带代号查表核验 (${d.raw})`,
          dimension: '尺寸与几何公差',
          priority: 'P0',
          standardCode: 'GB/T 1800.2-2020',
          status: 'UNKNOWN',
          actualValue: `${d.raw}（非常用公差带或超出内置常用表范围，未内置极限偏差值）`,
          requiredValue: '需对照完整授权 GB/T 1800.2-2020 表格核验极限偏差',
          risk: '非常用公差带若不附注极限偏差值，车间需人工查表易出错',
          suggestion: '建议在图纸上并列附注括号极限偏差值或导入完整企业授权公差表',
          evidenceItem: d.item
        });
      } else {
        pushIssue({
          ruleId: 'R-TOL-01',
          title: `ISO 公差带代号及查表核验 (${d.raw})`,
          dimension: '尺寸与几何公差',
          priority: 'P0',
          standardCode: 'GB/T 1800.2-2020',
          status: 'PASS',
          actualValue: `${d.raw} → 偏差 ${fmtSignedMm(lk.upperDevMm)}/${fmtSignedMm(lk.lowerDevMm)} mm，极限尺寸 [${fmtMm(lk.minLimitMm)} ~ ${fmtMm(lk.maxLimitMm)}] mm`,
          requiredValue: '符合 GB/T 1800.2 标准公差带代号语法及孔轴大小写规范',
          risk: '无异常',
          suggestion: '无需整改',
          evidenceItem: d.item
        });
      }
    }
  }

  // R-TOL-02: Untoleranced dimensions & General Tolerance coverage (GB/T 1804-2000)
  const freeDims = spec.dimensions.filter(d => d.tolType === 'none' && d.prefix !== 'M');
  if (freeDims.length > 0 && !spec.generalTolerance) {
    pushIssue({
      ruleId: 'R-TOL-02',
      title: '未注线性/角度尺寸一般公差覆盖检查',
      dimension: '尺寸与几何公差',
      priority: 'P0',
      standardCode: 'GB/T 1804-2000',
      status: obs.coverageComplete ? 'FAIL' : 'UNKNOWN',
      actualValue: `发现 ${freeDims.length} 处未单独注公差的线性/圆角尺寸（如 ${freeDims.slice(0, 3).map(d => d.raw).join('、')}），且图面未见未注公差标准声明`,
      requiredValue: '凡存在未单独注出公差的线性或角度尺寸，须在技术要求或标题栏声明 GB/T 1804 等级（如 GB/T 1804-m）或全局允许偏差',
      risk: '缺少未注公差约束将导致自由尺寸在来料检验与供应商争议时缺乏法定验收依据',
      suggestion: '请在《技术要求》或标题栏补充“未注尺寸公差按 GB/T 1804-m 执行”（或对应精密/粗级标准）',
      evidenceItem: freeDims[0]?.item
    });
  } else {
    const gtDesc = spec.generalTolerance
      ? (spec.generalTolerance.type === 'standard'
          ? `已声明 ${spec.generalTolerance.standard}-${spec.generalTolerance.grade} 级（覆盖 ${freeDims.length} 处自由尺寸）`
          : `已声明全局未注允许差 ±${spec.generalTolerance.explicitMm} mm（覆盖 ${freeDims.length} 处自由尺寸）`)
      : '全部尺寸均已单独注出显式公差，无自由尺寸遗漏';
    pushIssue({
      ruleId: 'R-TOL-02',
      title: '未注线性/角度尺寸一般公差覆盖检查',
      dimension: '尺寸与几何公差',
      priority: 'P0',
      standardCode: 'GB/T 1804-2000',
      status: 'PASS',
      actualValue: gtDesc,
      requiredValue: '所有尺寸均须由局部显式公差或全局未注公差条款完整覆盖',
      risk: '无异常',
      suggestion: '无需整改',
      evidenceItem: spec.techNotes[0] || freeDims[0]?.item
    });
  }

  // --- Dimension 4: 几何公差 GD&T 与基准引用完整性 (GB/T 1182-2018) ---
  const definedSet = new Set(spec.datumsDefined.map(d => d.letter));
  if (spec.gdts.length > 0) {
    // R-GDT-01: Dangling / Undefined Datum Reference Check!
    const danglingGDTs = [];
    for (const g of spec.gdts) {
      const missingDatums = g.datums.filter(d => !definedSet.has(d));
      if (missingDatums.length > 0) danglingGDTs.push({ g, missingDatums });
    }
    if (danglingGDTs.length > 0) {
      for (const { g, missingDatums } of danglingGDTs) {
        pushIssue({
          ruleId: 'R-GDT-01',
          title: `几何公差基准引用完整性（悬空基准 ${missingDatums.join('、')}）`,
          dimension: '尺寸与几何公差',
          priority: 'P0',
          standardCode: 'GB/T 1182-2018',
          status: obs.coverageComplete ? 'FAIL' : 'UNKNOWN',
          actualValue: `公差框「${g.raw}」引用了基准 ${g.datums.join('、')}，但图面仅定义了基准 [${[...definedSet].join(', ') || '无'}]，缺失基准 [${missingDatums.join(', ')}]`,
          requiredValue: '几何公差框引用的每一级有序基准字母（第一/第二/第三基准），必须在相应视图特征上明确标注对应的基准符号框',
          risk: '悬空未定义的基准使检测坐标系无法建立，三坐标测量（CMM）与检具设计无法执行',
          suggestion: `请在图纸对应定位面/轴线上补充基准符号框 [${missingDatums.join(']、[')}]，或修正公差框「${g.raw}」内的基准字母`,
          evidenceItem: g.item
        });
      }
    } else {
      pushIssue({
        ruleId: 'R-GDT-01',
        title: '几何公差基准引用完整性校验',
        dimension: '尺寸与几何公差',
        priority: 'P0',
        standardCode: 'GB/T 1182-2018',
        status: 'PASS',
        actualValue: `共核验 ${spec.gdts.length} 处几何公差框，所引用的基准 [${[...new Set(spec.gdts.flatMap(g => g.datums))].join(', ') || '无'}] 在图面均有明确定义`,
        requiredValue: '所有几何公差引用的基准必须在图面完整定义且无悬空引用',
        risk: '无异常',
        suggestion: '无需整改',
        evidenceItem: spec.datumsDefined[0]?.item || spec.gdts[0]?.item
      });
    }

    // R-GDT-02: Form vs Orientation/Location/Runout datum & value syntax
    const syntaxBad = spec.gdts.find(g =>
      (g.value == null || g.value <= 0) ||
      (g.gdtClass === 'form' && g.datums.length > 0) ||
      ((g.gdtClass === 'orientation' || g.gdtClass === 'runout' || g.symbol === '◎') && g.datums.length === 0)
    );
    pushIssue({
      ruleId: 'R-GDT-02',
      title: '几何公差框语法（形状/方向/跳动基准约束）',
      dimension: '尺寸与几何公差',
      priority: 'P0',
      standardCode: 'GB/T 1182-2018',
      status: syntaxBad ? 'FAIL' : 'PASS',
      actualValue: syntaxBad ? `公差框「${syntaxBad.raw}」语法不合规` : `全部 ${spec.gdts.length} 处几何公差框符号、公差值与基准格结构合规`,
      requiredValue: '平面度/圆度等形状公差不得引用基准；垂直度/平行度/同轴度/跳动公差必须关联基准且公差值 > 0',
      risk: '几何公差语法错误会导致图纸语义歧义与检验标准冲突',
      suggestion: syntaxBad ? `请按 GB/T 1182-2018 修正公差框「${syntaxBad.raw}」的基准格或公差数值` : '无需整改',
      evidenceItem: syntaxBad?.item || spec.gdts[0]?.item
    });

    // R-GDT-03: Position / Coaxiality cylindrical tolerance zone ⌀ symbol warning
    const noDiaLoc = spec.gdts.filter(g => (g.symbol === '⌖' || g.symbol === '◎') && !g.zoneDiameter);
    if (noDiaLoc.length > 0) {
      pushIssue({
        ruleId: 'R-GDT-03',
        title: '位置度/同轴度圆柱公差带直径符 ⌀ 规范提示',
        dimension: '尺寸与几何公差',
        priority: 'P1',
        standardCode: 'GB/T 1182-2018',
        status: 'WARNING',
        actualValue: `${noDiaLoc.map(g => `「${g.raw}」`).join('、')} 公差值前未标注直径符号 ⌀`,
        requiredValue: '孔轴轴线位置度与同轴度公差带为圆柱区域时，公差值前应加注符号 ⌀（如 ⌖ ⌀0.12 | A | B）',
        risk: '漏标 ⌀ 会使圆柱形公差带退化为两平行平面间的单向公差带，导致正交方向失控或检具理解偏差',
        suggestion: `请确认受控要素是否为圆柱轴线/孔组中心，若是请在公差值前补注 ⌀`,
        evidenceItem: noDiaLoc[0].item
      });
    }
  }

  // --- Dimension 5: 表面粗糙度与功能面专业规则 (GB/T 131-2006 + DEMO-SPEC-001) ---
  const precisionCyl = features.filter(f =>
    f.dim.prefix === '⌀' &&
    (f.dim.tolType === 'iso_zone' || (f.dim.bandwidth != null && f.dim.bandwidth <= 0.06))
  );
  const preferredRa = [0.025, 0.05, 0.1, 0.2, 0.4, 0.8, 1.6, 3.2, 6.3, 12.5, 25, 50];

  if (spec.roughness.length === 0 && precisionCyl.length > 0) {
    pushIssue({
      ruleId: 'R-SURF-01',
      title: '精密配合圆柱面表面粗糙度标注检查',
      dimension: '材料与工艺',
      priority: 'P0',
      standardCode: 'GB/T 131-2006',
      status: 'WARNING',
      actualValue: `图面含 ${precisionCyl.length} 处精密直径特征（如 ${precisionCyl.slice(0, 2).map(f => f.dim.raw).join('、')}），未提取到 Ra/Rz 表面粗糙度标注`,
      requiredValue: 'IT6/IT7 级配合孔轴表面应明确标注表面粗糙度参数（如 Ra 0.8 / Ra 1.6）或在右上角声明其余表面粗糙度',
      risk: '缺少粗糙度约束会导致精密配合面刀纹过深，初期运行磨损后配合间隙超差或密封渗漏',
      suggestion: '请核实原图是否存在转曲粗糙度符号（可手工补录），或在配合孔/轴表面补充 Ra 粗糙度要求',
      evidenceItem: precisionCyl[0].dim.item
    });
  } else if (spec.roughness.length > 0) {
    const nonStdRa = spec.roughness.find(r => r.param === 'Ra' && !preferredRa.some(p => Math.abs(p - r.value) < 0.005));
    pushIssue({
      ruleId: 'R-SURF-01',
      title: '表面结构表示法与 Ra 优先值序列检查',
      dimension: '材料与工艺',
      priority: 'P0',
      standardCode: 'GB/T 131-2006',
      status: nonStdRa ? 'WARNING' : 'PASS',
      actualValue: `已识别 ${spec.roughness.length} 处粗糙度标注：${spec.roughness.map(r => `${r.param} ${r.value} μm`).join('、')}`,
      requiredValue: 'Ra 参数值宜选用 GB/T 131 优先数列（0.2, 0.4, 0.8, 1.6, 3.2, 6.3, 12.5 μm）',
      risk: nonStdRa ? '非优先系列粗糙度数值不利于工艺标准化与粗糙度样块比对' : '无异常',
      suggestion: nonStdRa ? `建议将 ${nonStdRa.raw} 调整为标准优先值序列` : '无需整改',
      evidenceItem: (nonStdRa || spec.roughness[0]).item
    });

    // R-FUNC-01: Functional Role Driven Rule — Bearing Seat Roughness Ra <= 0.8 um (DEMO-SHAFT-002)
    for (const r of spec.roughness) {
      const role = r.functionalRole || 'UNCONFIRMED';
      const targetDesc = r.targetFeature ? `（关联特征 ${r.targetFeature.featureId}: ${r.targetFeature.dim.raw}）` : '';
      if (role === 'UNCONFIRMED') {
        pushIssue({
          ruleId: 'R-FUNC-01',
          title: `轴承安装面粗糙度规则核验 ${targetDesc}`,
          dimension: '功能设计',
          priority: 'P0',
          standardCode: 'DEMO-SPEC-001',
          status: 'UNKNOWN',
          actualValue: `${r.param} ${r.value} μm ${targetDesc} · 当前目标表面功能角色未确认`,
          requiredValue: '模拟规则 DEMO-SHAFT-002：若该圆柱面功能角色为轴承安装面 (BearingSeat)，则须满足 Ra ≤ 0.8 μm；未确认角色前不得武断误判 FAIL 或默认放行 PASS',
          risk: '若该表面实际装配滚动轴承且 Ra > 0.8 μm，微观峰谷被压平后会引起轴承内圈松动、微动磨损与异响',
          suggestion: '请在下方点击确认该表面的真实工程功能角色（轴承安装面 / 密封面 / 普通非轴承表面），确认后自动重新计算结论',
          evidenceItem: r.item,
          confirmTarget: { itemId: r.id, currentRole: role }
        });
      } else if (role === 'BearingSeat') {
        const ok = r.value <= 0.8 + 1e-6;
        pushIssue({
          ruleId: 'R-FUNC-01',
          title: `轴承安装面粗糙度上限核验 ${targetDesc}`,
          dimension: '功能设计',
          priority: 'P0',
          standardCode: 'DEMO-SPEC-001',
          status: ok ? 'PASS' : 'FAIL',
          actualValue: `已确认功能角色：轴承安装面 (BearingSeat) · 实标 ${r.param} = ${r.value} μm`,
          requiredValue: '模拟规则 DEMO-SHAFT-002：轴承安装面粗糙度须满足 Ra ≤ 0.8 μm（特殊工况须持有批准偏离单）',
          risk: ok ? '符合轴承安装面粗糙度上限要求' : `实标 Ra ${r.value} μm > 允许上限 0.8 μm，存在轴承配合面早期磨损、跑圈与 NVH 噪声风险`,
          suggestion: ok ? '无需整改' : `请将轴承安装面粗糙度由 Ra ${r.value} 加严至 Ra 0.8（磨削加工），或登记有效偏离批准`,
          evidenceItem: r.item,
          confirmTarget: { itemId: r.id, currentRole: role }
        });
      } else if (role === 'SealingSurface') {
        const ok = r.value <= 0.8 + 1e-6;
        pushIssue({
          ruleId: 'R-FUNC-01',
          title: `密封配合面粗糙度上限核验 ${targetDesc}`,
          dimension: '功能设计',
          priority: 'P0',
          standardCode: 'DEMO-SPEC-001',
          status: ok ? 'PASS' : 'FAIL',
          actualValue: `已确认功能角色：密封配合面 (SealingSurface) · 实标 ${r.param} = ${r.value} μm`,
          requiredValue: '模拟规则 DEMO-SEAL-001：动态油封/O型圈密封面宜满足 Ra ≤ 0.8 μm',
          risk: ok ? '符合密封表面粗糙度要求' : `Ra ${r.value} μm 过粗易划伤唇形油封导致早期漏油/漏气失效`,
          suggestion: ok ? '无需整改' : `建议将密封配合面粗糙度加严至 Ra 0.8 或 Ra 0.4`,
          evidenceItem: r.item,
          confirmTarget: { itemId: r.id, currentRole: role }
        });
      } else {
        pushIssue({
          ruleId: 'R-FUNC-01',
          title: `轴承安装面粗糙度上限核验 ${targetDesc}`,
          dimension: '功能设计',
          priority: 'P0',
          standardCode: 'DEMO-SPEC-001',
          status: 'NOT_APPLICABLE',
          actualValue: `已确认功能角色：${FUNCTIONAL_ROLES.find(x => x.id === role)?.label || role}（非轴承/密封精密面）`,
          requiredValue: 'DEMO-SHAFT-002 仅适用于轴承安装面 (BearingSeat)',
          risk: '不适用该条轴承安装面专项阈值约束',
          suggestion: '无需执行轴承面上限约束',
          evidenceItem: r.item,
          confirmTarget: { itemId: r.id, currentRole: role }
        });
      }
    }
  }

  // --- Dimension 6: 材料工艺与检验气泡可追溯性 ---
  // R-MAT-01: Deburr / Sharp edge & Process specification check
  pushIssue({
    ruleId: 'R-MAT-01',
    title: '去毛刺/未注圆角及工艺技术要求完整性',
    dimension: '材料与工艺',
    priority: 'P1',
    standardCode: ctx.partFamily === 'plastic_molded' ? 'GB/T 47067-2026' : 'GB/T 39568-2020',
    status: (spec.hasBurrClause && spec.hasGeneralFilletChamfer) ? 'PASS' : (spec.hasBurrClause || spec.hasGeneralFilletChamfer ? 'WARNING' : (spec.techNotes.length === 0 ? 'WARNING' : 'WARNING')),
    actualValue: `技术要求共 ${spec.techNotes.length} 条 · 去毛刺/飞边说明:${spec.hasBurrClause ? '有' : '未见'} · 未注圆角/倒角:${spec.hasGeneralFilletChamfer ? '有' : '未见'}`,
    requiredValue: '机电零件图纸应明确去毛刺/飞边清理要求及未注圆角/倒角过渡规范，避免应力集中与装配划伤',
    risk: '电机壳体/轴类残留毛刺脱落进入气隙会导致定转子擦碰、绕组击穿或轴承卡滞',
    suggestion: (spec.hasBurrClause && spec.hasGeneralFilletChamfer) ? '无需整改' : '建议在《技术要求》中补充“未注圆角/倒角 R0.3~R0.5，去净毛刺飞边”等工艺条款',
    evidenceItem: spec.techNotes[0]
  });

  // R-MAT-02: Motor shaft heat treatment / Housing corrosion & RoHS compliance check
  const allNotesJoined = spec.techNotes.map(n => n.value).join('；');
  if (ctx.partFamily === 'motor_shaft') {
    const hm = allNotesJoined.match(/(?:HRC|HBW|HV)\s*(\d+(?:\.\d+)?)\s*(?:[~～\-−]\s*(\d+(?:\.\d+)?))?/i) ||
      (edm.rawDoc?.items || []).map(i => i.value).join(' ').match(/(?:HRC|HBW|HV)\s*(\d+(?:\.\d+)?)\s*(?:[~～\-−]\s*(\d+(?:\.\d+)?))?/i);
    const span = (hm && hm[2]) ? Math.abs(+hm[2] - +hm[1]) : 0;
    pushIssue({
      ruleId: 'R-MAT-02',
      title: '电机轴热处理硬度区间规范性检查',
      dimension: '材料与工艺',
      priority: 'P1',
      standardCode: 'GB/T 39568-2020',
      status: !hm ? 'WARNING' : (span > 10 ? 'WARNING' : 'PASS'),
      actualValue: hm ? `已声明硬度要求：${hm[0]}（带宽 ${span || 0}）` : `材料 ${meta.material || '钢轴'} 未提取到调质/高频淬火硬度区间`,
      requiredValue: '合金钢/碳钢电机轴应明确调质或表面感应淬火硬度区间（如 HRC 28~32，常规控制带宽 ≤ 8 HRC）',
      risk: '轴类缺少热处理硬度要求会导致输出轴扭转屈服、键槽挤压变形或轴承位磨损',
      suggestion: !hm ? '建议在技术要求中明确热处理工艺与硬度区间（如 HRC 28~32）' : (span > 10 ? '硬度允许跨度偏宽，建议收窄至 4~6 HRC 以稳定机械性能' : '无需整改'),
      evidenceItem: spec.techNotes.find(n => /HRC|HBW|HV|热处理|调质|淬火/i.test(n.value)) || meta.materialItem
    });
  } else if (ctx.partFamily === 'housing_cover') {
    const hasEnvOrSurface = /RoHS|REACH|禁用物质|盐雾|氧化|电泳|钝化|镀|防腐/i.test(allNotesJoined);
    pushIssue({
      ruleId: 'R-MAT-02',
      title: '壳体/端盖表面防护与环保法规（RoHS/禁用物质）承接',
      dimension: '客户及风险',
      priority: 'P1',
      standardCode: 'GB/T 39568-2020',
      status: hasEnvOrSurface ? 'PASS' : 'WARNING',
      actualValue: hasEnvOrSurface ? '已包含表面防腐/盐雾或 RoHS/REACH 环保合规条款' : '技术要求未见表面防腐/盐雾或禁用物质环保条款',
      requiredValue: '机壳/端盖零件宜明确表面防护要求（如阳极氧化/钝化/盐雾试验）及环保禁用物质要求（GB/T 30512 / RoHS）',
      risk: '缺少防腐与禁用物质条款可能导致车载/工业环境早期锈蚀或主机厂 PPAP 环保合规拒收',
      suggestion: hasEnvOrSurface ? '无需整改' : '建议根据下游客户协议补充表面防腐等级与环保禁用物质条款',
      evidenceItem: spec.techNotes[spec.techNotes.length - 1] || meta.materialItem
    });
  }

  // R-INSP-01: Inspection Balloon Continuity & Orphan Check (FAI / GB/T 1958)
  const allBalloons = [];
  let orphanBalloonItem = null;
  for (const it of edm.rawDoc?.items || []) {
    const nums = parseBalloonNums(it.label);
    allBalloons.push(...nums);
    if (/^【\d+】$/.test(String(it.value || '').trim())) orphanBalloonItem = it;
  }
  if (allBalloons.length > 0) {
    const uniq = [...new Set(allBalloons)].sort((a, b) => a - b);
    const maxNo = uniq[uniq.length - 1];
    const missingNos = [];
    for (let k = 1; k <= maxNo; k++) if (!uniq.includes(k)) missingNos.push(k);
    pushIssue({
      ruleId: 'R-INSP-01',
      title: '首件检验气泡号【1~N】连号与绑定核验',
      dimension: '制造与检验',
      priority: 'P1',
      standardCode: 'GB/T 1958-2017',
      status: (missingNos.length === 0 && !orphanBalloonItem) ? 'PASS' : 'WARNING',
      actualValue: `最大气泡号 【${maxNo}】，已提取 ${uniq.length} 个唯一编号${missingNos.length ? `，断号：【${missingNos.join('】【')}】` : '（1~' + maxNo + ' 连续无断号）'}${orphanBalloonItem ? '，含未绑定孤立气泡' : ''}`,
      requiredValue: 'FAI 检验气泡号应从 1 连续编排且逐一明确指向受控尺寸、公差或技术要求条款',
      risk: '气泡断号或孤立悬浮会导致首件检验报告（FAIR / PPAP）漏检关键尺寸',
      suggestion: (missingNos.length === 0 && !orphanBalloonItem) ? '无需整改' : `请复核断号气泡【${missingNos.slice(0, 6).join('】【')}】对应特征是否漏标或跳号`,
      evidenceItem: orphanBalloonItem
    });
  }

  // Summary Metrics (Strictly separating Coverage vs Accuracy / Pass Rate per Chapter 9.2!)
  const counts = { PASS: 0, FAIL: 0, WARNING: 0, UNKNOWN: 0, NOT_APPLICABLE: 0, APPROVED_EXCEPTION: 0, EXECUTION_ERROR: 0 };
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  const applicableTotal = results.length - counts.NOT_APPLICABLE;
  const autoResolved = applicableTotal - counts.UNKNOWN - counts.EXECUTION_ERROR;
  const autoCoveragePct = applicableTotal > 0 ? Math.round((autoResolved / applicableTotal) * 100) : 100;

  return {
    results,
    counts,
    applicableTotal,
    autoResolved,
    autoCoveragePct,
    overallGate: counts.FAIL > 0 ? 'REJECT_NEEDS_FIX' : (counts.UNKNOWN > 0 || counts.WARNING > 0 ? 'PENDING_ENGINEER_REVIEW' : 'READY_FOR_SIGN_OFF')
  };
}

// 5. Cross-Drawing Shaft-Hole Mating Fit Calculator (Exact Micrometer Precision)
export function evaluateShaftHoleFit(shaftDim, holeDim, { minAllowedMm = 0.0, maxAllowedMm = 0.030 } = {}) {
  if (!shaftDim || !holeDim) {
    return { status: 'UNKNOWN', message: '请选择需要校核的轴外径特征与配合孔内径特征' };
  }
  if (shaftDim.minLimit == null || shaftDim.maxLimit == null || holeDim.minLimit == null || holeDim.maxLimit == null) {
    return {
      status: 'UNKNOWN',
      shaftRaw: shaftDim.raw,
      holeRaw: holeDim.raw,
      message: '轴或孔缺少显式极限偏差（或非常用公差带），无法直接计算极限配合间隙，请补充公差后计算'
    };
  }
  const sMinUm = toUm(shaftDim.minLimit), sMaxUm = toUm(shaftDim.maxLimit);
  const hMinUm = toUm(holeDim.minLimit), hMaxUm = toUm(holeDim.maxLimit);

  // Clearance = Hole - Shaft (negative clearance = interference!)
  const minClearanceUm = hMinUm - sMaxUm;
  const maxClearanceUm = hMaxUm - sMinUm;
  const minClearanceMm = fromUm(minClearanceUm);
  const maxClearanceMm = fromUm(maxClearanceUm);

  let fitType = '过渡配合 (Transition Fit)';
  if (minClearanceUm >= 0) fitType = '间隙配合 (Clearance Fit)';
  else if (maxClearanceUm <= 0) fitType = '过盈配合 (Interference Fit)';

  const nominalMismatch = Math.abs(shaftDim.nominal - holeDim.nominal) >= 0.5;
  const inWindow = minClearanceUm >= toUm(minAllowedMm) && maxClearanceUm <= toUm(maxAllowedMm);

  let status = inWindow ? 'PASS' : 'FAIL';
  let conclusion = '';
  if (nominalMismatch) {
    status = 'FAIL';
    conclusion = `公称直径失配！轴公称直径 ⌀${shaftDim.nominal} mm 与配合孔 ⌀${holeDim.nominal} mm 相差 ${Math.abs(shaftDim.nominal - holeDim.nominal).toFixed(3)} mm（计算间隙 ${fmtMm(minClearanceMm)} ~ ${fmtMm(maxClearanceMm)} mm），存在跨版本改轴未改孔的装配干涉/失配错误！`;
  } else if (inWindow) {
    conclusion = `${fitType}，极限间隙 [${fmtMm(minClearanceMm)} ~ ${fmtMm(maxClearanceMm)}] mm 落在目标允许区间 [${fmtMm(minAllowedMm)} ~ ${fmtMm(maxAllowedMm)}] mm 内，满足配合设计要求。`;
  } else {
    conclusion = `${fitType}，极限间隙 [${fmtMm(minClearanceMm)} ~ ${fmtMm(maxClearanceMm)}] mm 超出目标允许区间 [${fmtMm(minAllowedMm)} ~ ${fmtMm(maxAllowedMm)}] mm，需调整公差带或确认过盈压装工艺。`;
  }

  return {
    status,
    fitType,
    nominalMismatch,
    shaftRaw: shaftDim.raw,
    holeRaw: holeDim.raw,
    shaftLimits: [shaftDim.minLimit, shaftDim.maxLimit],
    holeLimits: [holeDim.minLimit, holeDim.maxLimit],
    minClearanceMm,
    maxClearanceMm,
    fitToleranceMm: fromUm(maxClearanceUm - minClearanceUm),
    allowedRange: [minAllowedMm, maxAllowedMm],
    standard: STANDARDS_INDEX['DEMO-SPEC-001'],
    conclusion
  };
}

// 6. Cross-Version Semantic Diff & Impacted Rule Re-review Engine (Chapter 8.2 / 9.1)
function semanticSignature(item, idxInCat) {
  const bNums = parseBalloonNums(item.label);
  if (bNums.length > 0) return `${item.category}::B${bNums.join('_')}`;
  if (item.category === '基本信息') return `BASIC::${item.label}`;
  if (item.category === '版本记录') return `REV::${item.label}`;
  if (/粗糙度/.test(item.label) || /^(?:Ra|Rz)/i.test(item.value)) return `SURF::${idxInCat}`;
  if (/^基准/.test(item.label)) return `DATUM::${item.value}`;
  if (/[⊥▱∥≡○◎⌖↗⇗]/.test(item.value)) return `GDT::${item.value[0]}::${idxInCat}`;
  if (item.category === '技术要求') {
    const cm = String(item.value).match(/^(\d+)[、.．]/);
    return `NOTE::${cm ? cm[1] : idxInCat}`;
  }
  // Spatial + prefix fallback for unballooned dimensions
  const pm = String(item.value).match(/^(?:\d+[-×xX])?[ØΦφ⌀RrMmCc]?/);
  const qx = item.box ? Math.round(item.box[0] * 8) : 0;
  const qy = item.box ? Math.round(item.box[1] * 8) : 0;
  return `DIM::${pm ? pm[0] : ''}::${qx}_${qy}::${idxInCat}`;
}

export function runVersionDiffReview(edmV1, reviewV1, edmV2, reviewV2, fitCheckV2 = null) {
  const items1 = edmV1.rawDoc?.items || [];
  const items2 = edmV2.rawDoc?.items || [];

  const buildMap = list => {
    const catCounters = {};
    const map = new Map();
    for (const it of list) {
      catCounters[it.category] = (catCounters[it.category] || 0) + 1;
      const sig = semanticSignature(it, catCounters[it.category]);
      map.set(sig, it);
    }
    return map;
  };

  const m1 = buildMap(items1);
  const m2 = buildMap(items2);

  const modified = [];
  const added = [];
  const removed = [];
  let unchangedCount = 0;

  for (const [sig, it2] of m2.entries()) {
    const it1 = m1.get(sig);
    if (!it1) {
      added.push({ sig, v2: it2 });
    } else if (String(it1.value).trim() !== String(it2.value).trim()) {
      const impactRules = [];
      if (/粗糙度/.test(it2.label) || /^(?:Ra|Rz)/i.test(it2.value)) impactRules.push('R-SURF-01', 'R-FUNC-01 (轴承/密封功能面粗糙度重检)');
      if (it2.category === '尺寸与公差' && !/粗糙度/.test(it2.label)) impactRules.push('R-DIM-01', 'R-TOL-01', '跨图轴孔配合间隙重算');
      if (it2.category === '基本信息') impactRules.push('R-DOC-01', 'R-DOC-03');
      modified.push({ sig, label: it2.label, oldVal: it1.value, newVal: it2.value, v1: it1, v2: it2, impactRules });
    } else {
      unchangedCount++;
    }
  }
  for (const [sig, it1] of m1.entries()) {
    if (!m2.has(sig)) removed.push({ sig, v1: it1 });
  }

  // Compare rule states V1 -> V2 to identify Suggested Closures vs Newly Introduced Issues
  const r1ByKey = new Map(reviewV1.results.map(r => [`${r.ruleId}::${r.title.replace(/（.*?）/g, '')}`, r]));
  const resolvedIssues = [];
  const regressedIssues = [];

  for (const r2 of reviewV2.results) {
    const k = `${r2.ruleId}::${r2.title.replace(/（.*?）/g, '')}`;
    const r1 = r1ByKey.get(k);
    if (r1 && (r1.status === 'FAIL' || r1.status === 'WARNING') && r2.status === 'PASS') {
      resolvedIssues.push({ ruleId: r2.ruleId, title: r2.title, from: r1.status, to: r2.status, detail: `${r1.actualValue} → ${r2.actualValue}`, v2Issue: r2 });
    } else if (r2.status === 'FAIL' && (!r1 || r1.status !== 'FAIL')) {
      regressedIssues.push({ ruleId: r2.ruleId, title: r2.title, from: r1?.status || 'NEW', to: r2.status, detail: r2.actualValue, v2Issue: r2 });
    }
  }

  if (fitCheckV2 && fitCheckV2.status === 'FAIL') {
    regressedIssues.push({
      ruleId: 'R-FIT-01',
      title: '跨图关联重检：轴—孔配合间隙失配风险',
      from: 'PASS',
      to: 'FAIL',
      detail: fitCheckV2.conclusion,
      v2Issue: null
    });
  }

  return {
    v1Name: edmV1.L2_Specifications.metadata.docName,
    v2Name: edmV2.L2_Specifications.metadata.docName,
    v1Rev: edmV1.L2_Specifications.metadata.revision || 'V1',
    v2Rev: edmV2.L2_Specifications.metadata.revision || 'V2',
    modified,
    added,
    removed,
    unchangedCount,
    resolvedIssues,
    regressedIssues
  };
}

// 7. Export Human-Readable Markdown Audit Report for Current Drawing
export function exportReviewMarkdown(edm, review) {
  const m = edm.L2_Specifications.metadata;
  const c = review.counts;
  const gateText = {
    REJECT_NEEDS_FIX: '🔴 存在阻断性问题（FAIL），建议整改后再签审',
    PENDING_ENGINEER_REVIEW: '🟠 存在风险提示或待确认项，需工程师复核确认',
    READY_FOR_SIGN_OFF: '🟢 常规自动化规则全部通过'
  }[review.overallGate] || review.overallGate;

  const lines = [
    `# CAD 工程图纸智能审核问题报告`,
    ``,
    `- **图纸文件**：${m.docName || '未命名图纸'}`,
    `- **零件信息**：${m.partName || '未标'} ｜ 图号：${m.drawingNo || m.partCode || '未标'} ｜ 材料：${m.material || '未标'} ｜ 版本：${m.revision || '未标'}`,
    `- **解析预检**：${edm.L1_Observation.primaryMode} ｜ 推断图幅：${m.sheetSize || '未知'} ｜ 提取条目：${edm.L1_Observation.totalItems} 项 ｜ 零件类型：${edm.L5_Context.partFamilyLabel}`,
    `- **综合门禁结论**：${gateText}`,
    `- **审核统计**：不通过 (FAIL) **${c.FAIL}** 项 ｜ 风险提示 (WARNING) **${c.WARNING}** 项 ｜ 待人工确认 (UNKNOWN) **${c.UNKNOWN}** 项 ｜ 通过 (PASS) **${c.PASS}** 项 ｜ 自动化规则覆盖率 **${review.autoCoveragePct}%**`,
    ``
  ];

  const sections = [
    ['一、必改问题（不通过 · FAIL）', review.results.filter(r => r.status === 'FAIL')],
    ['二、风险提示与工艺预警（WARNING）', review.results.filter(r => r.status === 'WARNING')],
    ['三、信息缺失与待人工确认项（UNKNOWN）', review.results.filter(r => r.status === 'UNKNOWN')],
    ['四、例外放行项（APPROVED_EXCEPTION）', review.results.filter(r => r.status === 'APPROVED_EXCEPTION')],
    ['五、已通过的规范审核项（PASS）', review.results.filter(r => r.status === 'PASS')]
  ];

  for (const [heading, list] of sections) {
    if (!list.length) continue;
    lines.push(`## ${heading}（${list.length} 项）`, ``);
    for (const [idx, r] of list.entries()) {
      lines.push(`### ${idx + 1}. [${r.ruleId}] ${r.title}`);
      lines.push(`- **审核维度**：${r.dimension} ｜ **依据规范**：${r.standard.code}（${r.standard.title}）`);
      lines.push(`- **实际设计值**：${r.actualValue}`);
      lines.push(`- **规范/规则要求**：${r.requiredValue}`);
      if (r.status !== 'PASS') {
        lines.push(`- **潜在工程风险**：${r.risk}`);
        lines.push(`- **整改建议**：${r.suggestion}`);
      }
      lines.push(``);
    }
  }
  return lines.join('\n');
}
