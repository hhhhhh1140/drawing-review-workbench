// Compatibility polyfills for PDF.js v5.x in browsers without ES2025/ES2026 Stage-3 built-ins
// (e.g., Safari < 26, Chrome < 145, Edge, Arc, Firefox < 134).
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new this((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}
if (typeof Promise.try !== 'function') {
  Promise.try = function (fn, ...args) {
    return new this(resolve => resolve(fn(...args)));
  };
}
if (typeof Map.prototype.getOrInsertComputed !== 'function') {
  Map.prototype.getOrInsertComputed = function (key, cb) {
    if (this.has(key)) return this.get(key);
    const val = cb(key);
    this.set(key, val);
    return val;
  };
}
if (typeof Map.prototype.getOrInsert !== 'function') {
  Map.prototype.getOrInsert = function (key, defaultValue) {
    if (this.has(key)) return this.get(key);
    this.set(key, defaultValue);
    return defaultValue;
  };
}
if (typeof WeakMap !== 'undefined') {
  if (typeof WeakMap.prototype.getOrInsertComputed !== 'function') {
    WeakMap.prototype.getOrInsertComputed = function (key, cb) {
      if (this.has(key)) return this.get(key);
      const val = cb(key);
      this.set(key, val);
      return val;
    };
  }
  if (typeof WeakMap.prototype.getOrInsert !== 'function') {
    WeakMap.prototype.getOrInsert = function (key, defaultValue) {
      if (this.has(key)) return this.get(key);
      this.set(key, defaultValue);
      return defaultValue;
    };
  }
}
if (typeof Uint8Array !== 'undefined') {
  if (typeof Uint8Array.prototype.toHex !== 'function') {
    Uint8Array.prototype.toHex = function () {
      let out = '';
      for (let i = 0; i < this.length; i++) out += this[i].toString(16).padStart(2, '0');
      return out;
    };
  }
  if (typeof Uint8Array.fromHex !== 'function') {
    Uint8Array.fromHex = function (hex) {
      const clean = String(hex).replace(/\s+/g, '');
      const len = Math.floor(clean.length / 2);
      const out = new Uint8Array(len);
      for (let i = 0; i < len; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0;
      return out;
    };
  }
}
if (typeof URL !== 'undefined' && typeof URL.parse !== 'function') {
  URL.parse = function (url, base) {
    try { return base !== undefined ? new URL(url, base) : new URL(url); } catch { return null; }
  };
}
if (typeof Array.prototype.toSorted !== 'function') {
  Array.prototype.toSorted = function (cmp) { return [...this].sort(cmp); };
}
if (typeof Array.prototype.toReversed !== 'function') {
  Array.prototype.toReversed = function () { return [...this].reverse(); };
}
