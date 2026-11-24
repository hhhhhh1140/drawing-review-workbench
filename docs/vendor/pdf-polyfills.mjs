// Compatibility polyfills for PDF.js v5.x in Safari/WebKit and non-bleeding-edge browsers.
if (typeof ReadableStream !== 'undefined' && typeof ReadableStream.prototype[Symbol.asyncIterator] !== 'function') {
  ReadableStream.prototype.values ??= function ({ preventCancel = false } = {}) {
    const reader = this.getReader();
    return {
      async next() {
        try {
          const res = await reader.read();
          if (res.done) reader.releaseLock();
          return res;
        } catch (err) {
          reader.releaseLock();
          throw err;
        }
      },
      async return(value) {
        try {
          if (!preventCancel) await reader.cancel(value);
        } finally {
          reader.releaseLock();
        }
        return { value, done: true };
      },
      [Symbol.asyncIterator]() { return this; }
    };
  };
  ReadableStream.prototype[Symbol.asyncIterator] = ReadableStream.prototype.values;
}
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
  if (typeof Uint8Array.prototype.toBase64 !== 'function') {
    Uint8Array.prototype.toBase64 = function () {
      let bin = '';
      const chunk = 0x8000;
      for (let i = 0; i < this.length; i += chunk) {
        bin += String.fromCharCode(...this.subarray(i, i + chunk));
      }
      return btoa(bin);
    };
  }
  if (typeof Uint8Array.fromBase64 !== 'function') {
    Uint8Array.fromBase64 = function (b64) {
      const bin = atob(String(b64).replace(/\s+/g, ''));
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    };
  }
}
if (typeof Set !== 'undefined') {
  if (typeof Set.prototype.intersection !== 'function') {
    Set.prototype.intersection = function (other) {
      const out = new Set();
      for (const v of this) if (other.has(v)) out.add(v);
      return out;
    };
  }
  if (typeof Set.prototype.union !== 'function') {
    Set.prototype.union = function (other) {
      const out = new Set(this);
      for (const v of other) out.add(v);
      return out;
    };
  }
  if (typeof Set.prototype.difference !== 'function') {
    Set.prototype.difference = function (other) {
      const out = new Set();
      for (const v of this) if (!other.has(v)) out.add(v);
      return out;
    };
  }
}
if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any !== 'function') {
  AbortSignal.any = function (signals) {
    const ctrl = new AbortController();
    for (const s of signals) {
      if (s?.aborted) { ctrl.abort(s.reason); return ctrl.signal; }
    }
    for (const s of signals) {
      s?.addEventListener('abort', () => ctrl.abort(s.reason), { once: true });
    }
    return ctrl.signal;
  };
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
