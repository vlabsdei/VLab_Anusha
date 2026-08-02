/* global THREE */
/* ============================================================================
   EXP 10 - INTEGRATED 4D DESIGN REVIEW (CAPSTONE)
   Ashby Materials Selection · Transformation Verification · Energy Budget ·
   Scalability · TRL Assessment.
   Five sub-calculators, one per page, each guarded by a page-unique canvas id.
   Physics solved live in SI units. Palette: navy #1E40AF (data) · rust #E2570F.
   Capstone: values inherited from Exp 1 (SMP R_f/R_r/T_g), Exp 2 (Timoshenko),
   Exp 7 (bioprinting) are labelled inherited.
   ============================================================================ */

/* =====================================================================
   CANONICAL SNIPPET - paste verbatim near the top of every
   expN/simulation/js/main.js (before any drawing code that uses it).
   Do not edit it per-experiment; every copy must stay identical.
   ===================================================================== */

/* Collapsible chart legend.
   Everything that labels a plot now lives in a header bar above the canvas -
   the chart's name on the left, the Legend toggle on the right - so nothing
   sits on top of the curves. The legend body drops down from the button,
   closed by default; click to open, click again to close. */
window.LabLegend = (function () {
  var boxes = new WeakMap();
  var heads = new WeakMap();
  var styled = false;

  function addStyle() {
    if (styled) return;
    styled = true;
    var s = document.createElement('style');
    s.textContent =
      /* the strip above the plot */
      '.lg-head{display:flex;align-items:center;justify-content:space-between;gap:10px;' +
      'flex:0 0 auto;position:relative;z-index:12;padding:5px 10px;background:#fff;' +
      'border-bottom:1px solid #e2e8f0}' +
      /* one line only: the strip is stealing height from the plot, and a wrapped
         caption squeezes the axis ticks together. Full text is on the tooltip. */
      '.lg-head .sim-label{position:static;top:auto;left:auto;right:auto;bottom:auto;' +
      'z-index:auto;background:none;backdrop-filter:none;border:0;box-shadow:none;' +
      'border-radius:0;padding:0!important;margin:0;flex:1 1 auto;min-width:0;' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' +
      'font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10.5px;font-weight:500;' +
      'line-height:1.5;color:#334155}' +
      /* the canvas gives up the header's height instead of being covered by it */
      '.lg-chart{display:flex;flex-direction:column}' +
      '.lg-chart>canvas.lg-canvas{flex:1 1 auto;min-height:0;display:block;' +
      'width:100%!important;height:auto!important}' +
      /* legend chip, anchored in the header */
      '.lg-legend{position:relative;flex:0 0 auto;line-height:0;' +
      'font-family:"IBM Plex Mono",ui-monospace,monospace}' +
      '.lg-toggle{display:inline-flex;align-items:center;gap:5px;' +
      'background:#fff;border:1px solid #cbd5e1;border-radius:4px;' +
      'color:#475569;font:600 9px/1 "IBM Plex Mono",ui-monospace,monospace;' +
      'letter-spacing:.04em;text-transform:uppercase;padding:4px 7px;cursor:pointer}' +
      '.lg-toggle:hover{background:#f8fafc;border-color:#94a3b8;color:#1e293b}' +
      '.lg-toggle::after{content:"+";font-size:11px;line-height:1;color:#E2570F}' +
      '.lg-legend.lg-open .lg-toggle::after{content:"\\2212"}' +
      '.lg-body{display:none;position:absolute;top:calc(100% + 5px);right:0;z-index:30;' +
      'width:max-content;max-width:230px;text-align:left;background:rgba(255,255,255,.98);' +
      'border:1px solid #cbd5e1;border-radius:4px;padding:6px 8px;' +
      'box-shadow:0 6px 16px rgba(15,23,42,.12)}' +
      '.lg-legend.lg-open .lg-body{display:block}' +
      '.lg-row{display:flex;align-items:center;gap:6px;font:500 9px/1.5 "IBM Plex Mono",ui-monospace,monospace;color:#55606f}' +
      '.lg-row+.lg-row{margin-top:3px}' +
      '.lg-swatch{flex:0 0 14px;height:8px;border-radius:1px}' +
      '.lg-swatch.lg-dash{height:0;border-top:2px dashed currentColor;background:none!important}';
    document.head.appendChild(s);
  }

  /* The header strip for one plot: created just above the canvas, with the
     caption that used to float over the plot moved into it. */
  function head(canvas) {
    if (!canvas || !canvas.parentElement) return null;
    var el = heads.get(canvas);
    if (el && el.parentElement) return el;
    addStyle();

    var host = canvas.parentElement;
    host.classList.add('lg-chart');
    canvas.classList.add('lg-canvas');

    el = document.createElement('div');
    el.className = 'lg-head';
    host.insertBefore(el, canvas);

    /* Pull in the caption sitting over this plot, if the page has one. */
    var label = null;
    Array.prototype.some.call(host.children, function (sib) {
      if (sib !== el && sib.classList && sib.classList.contains('sim-label')) {
        label = sib;
        return true;
      }
      return false;
    });
    if (label) {
      if (!label.title) label.title = label.textContent.trim();
      el.appendChild(label);
    } else {
      el.appendChild(document.createElement('span'));
    }

    heads.set(canvas, el);
    return el;
  }

  /* items: [{ color, text, dash }]   corner: kept for call-site compatibility */
  function attach(canvas, items, corner) {
    if (!canvas || !canvas.parentElement || !items || !items.length) return;
    var bar = head(canvas);
    if (!bar) return;

    var el = boxes.get(canvas);
    if (!el || !el.parentElement) {
      el = document.createElement('div');
      el.className = 'lg-legend';
      el.innerHTML = '<button type="button" class="lg-toggle">Legend</button><div class="lg-body"></div>';
      el.querySelector('.lg-toggle').addEventListener('click', function () {
        el.classList.toggle('lg-open');
      });
      bar.appendChild(el);
      boxes.set(canvas, el);
    }

    var rows = items.map(function (it) {
      var c = it.color || '#475569';
      var sw = it.dash
        ? '<span class="lg-swatch lg-dash" style="color:' + c + '"></span>'
        : '<span class="lg-swatch" style="background:' + c + '"></span>';
      return '<div class="lg-row">' + sw + '<span>' + it.text + '</span></div>';
    }).join('');
    el.querySelector('.lg-body').innerHTML = rows;
  }

  /* Existing call sites pass the x/y they used to paint the old canvas box.
     The chip has a fixed home in the header now, so the point is ignored. */
  function fromPoint(ctx, x, y, items) {
    attach(ctx.canvas, items);
  }

  /* ---- marker labels ------------------------------------------------------
     Several plots drop three or four markers close together and label each one,
     which used to print the names on top of each other. Every label goes
     through here instead: it remembers what it has already put on this canvas
     this frame and takes the first offset that lands clear. */
  var marks = new WeakMap();

  function slots(canvas) {
    var a = marks.get(canvas);
    if (!a) { a = []; marks.set(canvas, a); }
    return a;
  }

  function resetLabels(ctx) {
    if (ctx && ctx.canvas) marks.set(ctx.canvas, []);
  }

  /* candidates: [dx, dy, textAlign, textBaseline], tried in order */
  var SPOTS = [
    [9, -6, 'left', 'bottom'], [-9, -6, 'right', 'bottom'],
    [9, 8, 'left', 'top'], [-9, 8, 'right', 'top'],
    [0, -9, 'center', 'bottom'], [0, 11, 'center', 'top'],
    [9, -20, 'left', 'bottom'], [-9, -20, 'right', 'bottom'],
    [0, -22, 'center', 'bottom'], [0, 24, 'center', 'top'],
    [0, -35, 'center', 'bottom'], [0, 37, 'center', 'top']
  ];

  function boxOf(x, y, w, h, align, base) {
    var l = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    var t = base === 'bottom' ? y - h : base === 'top' ? y : y - h / 2;
    return { l: l, t: t, r: l + w, b: t + h };
  }

  function clashes(a, b) {
    return !(a.r + 2 < b.l || a.l > b.r + 2 || a.b + 2 < b.t || a.t > b.b + 2);
  }

  /* opts: { font, color, size, bounds:{l,t,r,b}, gap } */
  function label(ctx, x, y, text, opts) {
    if (!text) return;
    opts = opts || {};
    ctx.font = opts.font || '700 11px "IBM Plex Mono", monospace';
    var w = ctx.measureText(text).width;
    var h = opts.size || 11;
    var gap = opts.gap || 0;                 // marker radius to clear
    var taken = slots(ctx.canvas);
    var lim = opts.bounds;
    var pick = null, fallback = null, least = Infinity;

    for (var i = 0; i < SPOTS.length && !pick; i++) {
      var s = SPOTS[i];
      var dy = s[1] < 0 ? s[1] - gap : s[1] + gap;
      var bx = x + s[0], by = y + dy;
      var box = boxOf(bx, by, w, h, s[2], s[3]);
      var spot = { x: bx, y: by, align: s[2], base: s[3], box: box };
      var cost = 0;
      if (lim) {
        cost += Math.max(0, lim.l - box.l) + Math.max(0, box.r - lim.r) +
                Math.max(0, lim.t - box.t) + Math.max(0, box.b - lim.b);
      }
      for (var j = 0; j < taken.length; j++) {
        if (clashes(box, taken[j])) cost += 100;
      }
      if (cost === 0) pick = spot;
      else if (cost < least) { least = cost; fallback = spot; }
    }
    /* Nothing was completely clear, so take the least crowded spot rather than
       dropping a label the reader may be relying on. */
    pick = pick || fallback;
    if (!pick) return;

    taken.push(pick.box);
    if (opts.color) ctx.fillStyle = opts.color;
    ctx.textAlign = pick.align;
    ctx.textBaseline = pick.base;
    ctx.fillText(text, pick.x, pick.y);
  }

  /* Frames start a new plot, so what was on the old one no longer blocks. */
  var proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (proto && !proto.__lgReset) {
    var rawClear = proto.clearRect;
    proto.clearRect = function () {
      marks.set(this.canvas, []);
      return rawClear.apply(this, arguments);
    };
    proto.__lgReset = true;
  }

  /* Charts without a legend still have a caption to lift off the plot. */
  function hoistCaptions() {
    var labels = document.querySelectorAll('.sim-label');
    Array.prototype.forEach.call(labels, function (label) {
      var host = label.parentElement;
      if (!host || label.closest('.lg-head')) return;
      var canvas = null;
      Array.prototype.some.call(host.children, function (sib) {
        if (sib.tagName === 'CANVAS') { canvas = sib; return true; }
        return false;
      });
      if (canvas) head(canvas);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hoistCaptions);
  } else {
    hoistCaptions();
  }

  return { attach: attach, fromPoint: fromPoint, label: label, resetLabels: resetLabels };
})();

// ---------------------------------------------------------------------------
// Shared 2-D plotting helper (BP namespace) - copied verbatim from exp7
// ---------------------------------------------------------------------------
const BP = {};
BP.dpr = Math.min(window.devicePixelRatio || 1, 2);
BP.fit = function (canvas) {
  const r = canvas.getBoundingClientRect();
  const w = Math.max(2, r.width | 0), h = Math.max(2, r.height | 0);
  if (canvas.width !== w * BP.dpr || canvas.height !== h * BP.dpr) {
    canvas.width = w * BP.dpr; canvas.height = h * BP.dpr;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(BP.dpr, 0, 0, BP.dpr, 0, 0);
  return { ctx, w, h };
};
BP.frame = function (ctx, W, H, o) {
  LabLegend.resetLabels(ctx);
  const pl = o.padL ?? 52, pr = o.padR ?? 14, pt = o.padT ?? 16, pb = o.padB ?? 40;
  const w = W - pl - pr, h = H - pt - pb;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  const logX = !!o.logX, logY = !!o.logY;
  const lx = (v) => logX ? Math.log10(v) : v;
  const ly = (v) => logY ? Math.log10(v) : v;
  const xMin = lx(o.xMin), xMax = lx(o.xMax), yMin = ly(o.yMin), yMax = ly(o.yMax);
  const gx = (v) => pl + (lx(v) - xMin) / (xMax - xMin) * w;
  const gy = (v) => pt + h - (ly(v) - yMin) / (yMax - yMin) * h;
  // grid + ticks
  ctx.strokeStyle = '#eef1f4'; ctx.fillStyle = '#8b929b';
  ctx.lineWidth = 1; ctx.font = '10px "IBM Plex Mono", monospace';
  const xt = o.xTicks || 5, yt = o.yTicks || 5;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let i = 0; i <= xt; i++) {
    const fx = pl + w * i / xt, vv = xMin + (xMax - xMin) * i / xt;
    ctx.beginPath(); ctx.moveTo(fx, pt); ctx.lineTo(fx, pt + h); ctx.stroke();
    const val = logX ? Math.pow(10, vv) : vv;
    ctx.fillText(o.xFmt ? o.xFmt(val) : (Math.abs(val) >= 100 ? val.toFixed(0) : val.toFixed(val < 1 && val !== 0 ? 2 : 1)), fx, pt + h + 6);
  }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= yt; i++) {
    const fy = pt + h - h * i / yt, vv = yMin + (yMax - yMin) * i / yt;
    ctx.beginPath(); ctx.moveTo(pl, fy); ctx.lineTo(pl + w, fy); ctx.stroke();
    const val = logY ? Math.pow(10, vv) : vv;
    ctx.fillText(o.yFmt ? o.yFmt(val) : (Math.abs(val) >= 100 ? val.toFixed(0) : val.toFixed(val < 1 && val !== 0 ? 2 : 1)), pl - 6, fy);
  }
  // axis lines
  ctx.strokeStyle = o.axisColor || '#1E40AF'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(pl, pt); ctx.lineTo(pl, pt + h); ctx.lineTo(pl + w, pt + h); ctx.stroke();
  // labels
  ctx.fillStyle = '#55606f'; ctx.font = '600 11px "IBM Plex Mono", monospace';
  if (o.xLabel) { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(o.xLabel, pl + w / 2, H - 2); }
  if (o.yLabel) { ctx.save(); ctx.translate(11, pt + h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(o.yLabel, 0, 0); ctx.restore(); }
  return { pl, pt, w, h, gx, gy, xMin, xMax, yMin, yMax };
};
BP.curve = function (ctx, fr, pts, color, lw) {
  ctx.strokeStyle = color; ctx.lineWidth = lw || 2.4; ctx.lineJoin = 'round';
  ctx.beginPath();
  let started = false;
  pts.forEach((p) => {
    if (!isFinite(p.x) || !isFinite(p.y)) { started = false; return; }
    const X = fr.gx(p.x), Y = fr.gy(p.y);
    if (!started) { ctx.moveTo(X, Y); started = true; } else ctx.lineTo(X, Y);
  });
  ctx.stroke();
};
BP.shadeY = function (ctx, fr, y1, y2, color) {
  ctx.fillStyle = color;
  const a = fr.gy(y2), b = fr.gy(y1);
  ctx.fillRect(fr.pl, a, fr.w, b - a);
};
BP.hLine = function (ctx, fr, y, color, label) {
  ctx.strokeStyle = color; ctx.lineWidth = 1.3; ctx.setLineDash([5, 4]);
  const Y = fr.gy(y); ctx.beginPath(); ctx.moveTo(fr.pl, Y); ctx.lineTo(fr.pl + fr.w, Y); ctx.stroke();
  ctx.setLineDash([]);
  if (label) { ctx.fillStyle = color; ctx.font = '600 10px "IBM Plex Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(label, fr.pl + 4, Y - 2); }
};
BP.vLine = function (ctx, fr, x, color, label) {
  ctx.strokeStyle = color; ctx.lineWidth = 1.3; ctx.setLineDash([5, 4]);
  const X = fr.gx(x); ctx.beginPath(); ctx.moveTo(X, fr.pt); ctx.lineTo(X, fr.pt + fr.h); ctx.stroke();
  ctx.setLineDash([]);
  if (label) { ctx.fillStyle = color; ctx.font = '600 10px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(label, X, fr.pt + 2); }
};
BP.dot = function (ctx, fr, x, y, color, label) {
  const X = fr.gx(x), Y = fr.gy(y);
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(X, Y, 4.5, 0, 7); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, 4.5, 0, 7); ctx.stroke();
  // Markers often sit close together, so the label finds its own clear spot.
  LabLegend.label(ctx, X, Y, label, {
    color: color, gap: 5, size: 11,
    bounds: { l: fr.pl, t: fr.pt, r: fr.pl + fr.w, b: fr.pt + fr.h }
  });
};
// Legends now live in a collapsible chip over the plot instead of being
// painted on it, so they can no longer sit on top of the curves.
BP.legend = function (ctx, x, y, items) {
  LabLegend.fromPoint(ctx, x, y, items);
};
BP.put = function (el, txt, color) { if (el) { el.textContent = txt; if (color) el.style.color = color; } };

// Shared THREE bootstrap → returns {scene,camera,renderer,controls,resize}
BP.three = function (mountId) {
  const mount = document.getElementById(mountId);
  if (!mount || typeof THREE === 'undefined') return null;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xF4F5F3);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(3.4, 2.2, 4.2);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(BP.dpr);
  mount.appendChild(renderer.domElement);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enablePan = false; controls.minDistance = 3; controls.maxDistance = 9;
  scene.add(new THREE.AmbientLight(0xffffff, 0.72));
  const key = new THREE.DirectionalLight(0xffffff, 0.85); key.position.set(4, 6, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0x99b3ff, 0.35); fill.position.set(-4, 2, -3); scene.add(fill);
  function resize() {
    const r = mount.getBoundingClientRect();
    const w = Math.max(2, r.width | 0), h = Math.max(2, r.height | 0);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(mount);
  return { scene, camera, renderer, controls, resize };
};

// Local helper: simple horizontal ranked bar chart (custom, not an x-y plot)
BP.rankBars = function (ctx, W, H, rows, opts) {
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  const pl = opts.padL ?? 96, pr = opts.padR ?? 40, pt = opts.padT ?? 18, pb = opts.padB ?? 34;
  const w = W - pl - pr, h = H - pt - pb;
  const maxV = Math.max(opts.max || 0, ...rows.map((r) => r.v), 1e-9);
  const n = rows.length, gap = 8, bh = (h - gap * (n - 1)) / n;
  ctx.font = '600 11px "IBM Plex Mono", monospace';
  rows.forEach((r, i) => {
    const y = pt + i * (bh + gap);
    const bw = Math.max(1, w * r.v / maxV);
    ctx.fillStyle = r.c; ctx.fillRect(pl, y, bw, bh);
    ctx.fillStyle = '#16223a'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(r.name, pl - 8, y + bh / 2);
    ctx.fillStyle = '#55606f'; ctx.textAlign = 'left';
    ctx.fillText(r.label, pl + bw + 6, y + bh / 2);
  });
  ctx.strokeStyle = '#1E40AF'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(pl, pt); ctx.lineTo(pl, pt + h); ctx.lineTo(pl + w, pt + h); ctx.stroke();
  ctx.fillStyle = '#55606f'; ctx.font = '600 11px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  if (opts.xLabel) ctx.fillText(opts.xLabel, pl + w / 2, H - 2);
};

/* ---- LabGate: gate the whole experiment behind a Start click ---- */
window.LabGate = (function () {
  let armed = false;
  function disableControls() {
    document.querySelectorAll('.dock input, .dock button#btnRun')
      .forEach(el => { el.disabled = true; });
  }
  function enableControls() {
    document.querySelectorAll('.dock input, .dock button#btnRun')
      .forEach(el => { el.disabled = false; });
  }
  // startFn = the deferred init sequence for the active sub-calc module.
  function arm(startFn) {
    if (armed) return; armed = true;
    const host = document.getElementById('viewport3D')
              || document.querySelector('.sim-viewport-fluid');
    disableControls();
    const ov = document.createElement('div');
    ov.className = 'labgate';
    ov.innerHTML =
      '<div class="labgate__panel">' +
      '<div class="labgate__title">Experiment idle</div>' +
      '<div class="labgate__sub">Set parameters, then start the simulation.</div>' +
      '<button type="button" class="labgate__btn">Start Experiment</button>' +
      '</div>';
    const anchor = host.closest('.sim-viewport-fluid > div') || host;
    anchor.style.position = anchor.style.position || 'relative';
    anchor.appendChild(ov);
    ov.querySelector('.labgate__btn').addEventListener('click', () => {
      ov.remove();
      enableControls();
      startFn();
    });
  }
  return { arm: arm };   // modules call LabGate.arm(...)
})();

// ===========================================================================
// SUB-CALC A - ASHBY MATERIALS SELECTION
//   Performance indices (maximize):
//     M1 = √E / ρ          (bending-actuator stiffness)
//     M2 = σ_recovery / ρ  (recovery/actuation per mass)
//     M3 = η_SMP·E_stored / Q_trigger  (thermal-trigger efficiency)
//   Each min-max normalized to [0,1] across candidates → M̂.
//   Weighted score: M_total = w1·M̂1 + w2·M̂2 + w3·M̂3 (weights auto-normalize).
//   The winner CHANGES with the weighting - no universally optimal material.
// (Page guard: document.getElementById('plotCanvasAshby'))
// ===========================================================================
(function () {
  const cvA = document.getElementById('plotCanvasAshby');
  if (!cvA) return;
  const cvS = document.getElementById('plotCanvasScore');
  const w1In = document.getElementById('w1Input'), w2In = document.getElementById('w2Input'), w3In = document.getElementById('w3Input');
  const valW1 = document.getElementById('valW1'), valW2 = document.getElementById('valW2'), valW3 = document.getElementById('valW3');
  const btnRun = document.getElementById('btnRun');

  // Real-ish 4D-active-material properties (SI).
  const MATS = [
    { id: 'PLA', name: 'SMP-PLA', E: 2.5e9, rho: 1250, sigRec: 3e6, eta: 0.85, Est: 8, Qt: 10, c: '#1E40AF' },
    { id: 'PU', name: 'SMP-PU', E: 0.5e9, rho: 1150, sigRec: 2e6, eta: 0.90, Est: 6, Qt: 4, c: '#3E5A82' },
    { id: 'NiTi', name: 'SMA (NiTi)', E: 30e9, rho: 6450, sigRec: 500e6, eta: 0.30, Est: 20, Qt: 60, c: '#B45309' },
    { id: 'PAA', name: 'PAA hydrogel', E: 5e4, rho: 1050, sigRec: 5e4, eta: 0.30, Est: 1, Qt: 3, c: '#15803D' },
    { id: 'PNI', name: 'PNIPAM', E: 3e4, rho: 1010, sigRec: 2e4, eta: 0.45, Est: 1.5, Qt: 2, c: '#8B929B' }
  ];
  MATS.forEach((m) => { m.M1 = Math.sqrt(m.E) / m.rho; m.M2 = m.sigRec / m.rho; m.M3 = m.eta * m.Est / m.Qt; });
  function normHat(key) {
    const vs = MATS.map((m) => m[key]); const lo = Math.min(...vs), hi = Math.max(...vs);
    MATS.forEach((m) => { m[key + 'h'] = hi > lo ? (m[key] - lo) / (hi - lo) : 0; });
  }
  normHat('M1'); normHat('M2'); normHat('M3');

  let w1 = 15, w2 = 55, w3 = 30;
  function readW() {
    w1 = parseFloat(w1In.value); w2 = parseFloat(w2In.value); w3 = parseFloat(w3In.value);
    const s = w1 + w2 + w3 || 1;
    return { n1: w1 / s, n2: w2 / s, n3: w3 / s };
  }
  function preset(a, b, c) { w1In.value = a; w2In.value = b; w3In.value = c; refresh(); }

  function refresh() {
    const W = readW();
    BP.put(valW1, (W.n1 * 100).toFixed(0) + ' %'); BP.put(valW2, (W.n2 * 100).toFixed(0) + ' %'); BP.put(valW3, (W.n3 * 100).toFixed(0) + ' %');
    MATS.forEach((m) => { m.score = W.n1 * m.M1h + W.n2 * m.M2h + W.n3 * m.M3h; });
    const ranked = MATS.slice().sort((a, b) => b.score - a.score);
    const winner = ranked[0], runner = ranked[1];

    // Left: Ashby bubble chart - M1 (x) vs M2 (y), log-log, bubble ∝ M̂3, winner rust
    const F = BP.fit(cvA);
    const fr = BP.frame(F.ctx, F.w, F.h, {
      logX: true, logY: true, xMin: 0.1, xMax: 100, yMin: 10, yMax: 1e5,
      xTicks: 3, yTicks: 4, axisColor: '#1E40AF',
      xLabel: 'M₁ = √E/ρ  (Pa^½·m³·kg⁻¹)', yLabel: 'M₂ = σ_rec/ρ  (Pa·m³·kg⁻¹)',
      xFmt: (x) => x >= 1 ? x.toFixed(0) : x.toFixed(1), yFmt: (y) => y >= 1000 ? (y / 1000).toFixed(0) + 'k' : y.toFixed(0)
    });
    MATS.forEach((m) => {
      const X = fr.gx(Math.min(Math.max(m.M1, 0.1), 100)), Y = fr.gy(Math.min(Math.max(m.M2, 10), 1e5));
      const isWin = m.id === winner.id;
      const rad = 7 + 16 * m.M3h;
      F.ctx.fillStyle = isWin ? 'rgba(226,87,15,0.22)' : 'rgba(30,64,175,0.12)';
      F.ctx.beginPath(); F.ctx.arc(X, Y, rad, 0, 7); F.ctx.fill();
      F.ctx.strokeStyle = isWin ? '#E2570F' : m.c; F.ctx.lineWidth = isWin ? 3 : 1.5;
      F.ctx.beginPath(); F.ctx.arc(X, Y, rad, 0, 7); F.ctx.stroke();
      // Bubbles overlap, so each name is placed where it does not hit another.
      LabLegend.label(F.ctx, X, Y, m.name, {
        color: isWin ? '#9A3412' : '#16223a', size: 10, gap: rad + 2,
        font: (isWin ? '700 ' : '600 ') + '10px "IBM Plex Mono", monospace',
        bounds: { l: fr.pl, t: fr.pt, r: fr.pl + fr.w, b: fr.pt + fr.h }
      });
    });
    BP.legend(F.ctx, fr.pl + 8, fr.pt + 12, [{ color: '#E2570F', text: 'weighted winner' }, { color: '#1E40AF', text: 'bubble ∝ trigger-eff M̂₃' }]);

    // Right: ranked M_total bars, re-ranking live, winner rust
    if (cvS) {
      const S = BP.fit(cvS);
      BP.rankBars(S.ctx, S.w, S.h, ranked.map((m) => ({
        name: m.name, v: m.score, label: m.score.toFixed(2), c: m.id === winner.id ? '#E2570F' : m.c
      })), { max: 1, xLabel: 'Weighted score  M_total  (0-1)' });
    }

    // Table
    const tb = document.querySelector('#ashbyTable tbody');
    if (tb) {
      tb.innerHTML = ranked.map((m, i) => '<tr style="' + (i === 0 ? 'background:rgba(226,87,15,0.08);font-weight:700;' : '') + '"><td>' + (i + 1) + '</td><td style="color:' + m.c + ';font-weight:600;">' + m.name + '</td><td>' + m.M1.toFixed(1) + '</td><td>' + (m.M2 / 1000).toFixed(1) + 'k</td><td>' + m.M3.toFixed(2) + '</td><td style="text-align:right;color:' + (i === 0 ? '#15803D' : '#55606f') + ';font-weight:600;">' + m.score.toFixed(3) + '</td></tr>').join('');
    }

    // Readouts
    const spread = winner.score - runner.score;
    BP.put(document.getElementById('resWinner'), winner.name, '#E2570F');
    BP.put(document.getElementById('resScore'), winner.score.toFixed(3));
    BP.put(document.getElementById('resRunnerUp'), runner.name);
    BP.put(document.getElementById('resSpread'), spread.toFixed(3));
    const dom = W.n1 >= W.n2 && W.n1 >= W.n3 ? 'stiffness M₁' : (W.n2 >= W.n3 ? 'recovery M₂' : 'trigger-efficiency M₃');
    BP.put(document.getElementById('resNote'), dom + '-led');

    const li = document.getElementById('liveInsight');
    if (li) li.innerHTML = '<strong>Live Insight:</strong> With this weighting (' + dom + ' dominant) the winner is <strong>' + winner.name + '</strong> (M_total = ' + winner.score.toFixed(2) + '), ' + (spread < 0.06 ? 'only ' : '') + spread.toFixed(2) + ' ahead of ' + runner.name + '. Re-weight toward σ_recovery and NiTi takes the stent; toward stiffness and SMP-PLA takes the gripper - <em>the ranking is a function of the application, not the material</em>.';
    updateEq(W, winner);
  }
  function updateEq(W, winner) {
    const box = document.getElementById('eqBox'); if (!box) return;
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Indices (maximize):</strong> M₁ = √E/ρ, &nbsp; M₂ = σ_recovery/ρ, &nbsp; M₃ = η·E_stored/Q_trigger</div>' +
      '<div><strong>Normalize:</strong> M̂ᵢ = (Mᵢ - M_min)/(M_max - M_min) ∈ [0,1] across the 5 candidates</div>' +
      '<div><strong>Weighted score:</strong> M_total = ' + W.n1.toFixed(2) + '·M̂₁ + ' + W.n2.toFixed(2) + '·M̂₂ + ' + W.n3.toFixed(2) + '·M̂₃ &rArr; winner <span style="color:#9A3412;font-weight:700;">' + winner.name + '</span></div>' +
      '<div style="color:#8b929b;font-size:0.92em;">Screening tool. Property values are literature order-of-magnitude for 4D-active materials.</div></div>';
  }
  [w1In, w2In, w3In].forEach((el) => el && el.addEventListener('input', refresh));
  const pS = document.getElementById('presetStent'), pG = document.getElementById('presetGripper'), pD = document.getElementById('presetDeploy');
  if (pS) pS.addEventListener('click', () => preset(15, 55, 30));
  if (pG) pG.addEventListener('click', () => preset(70, 15, 15));
  if (pD) pD.addEventListener('click', () => preset(34, 33, 33));
  if (btnRun) btnRun.addEventListener('click', refresh);
  window.addEventListener('resize', refresh);
  LabGate.arm(function () {
    refresh();
  });
})();

// ===========================================================================
// SUB-CALC B - TRANSFORMATION VERIFICATION: PREDICTED vs SIMULATED
//   κ_pred = 1/R_target   (design intent - the shape you asked for)
//   κ_sim  = the curvature the finite-strain simulation actually produces,
//            = κ_pred·(1 + nonlinear correction) from the model source.
//   ε_shape = |κ_sim - κ_pred|/κ_pred × 100 %;  acceptance ε_shape < 10 %.
//   Timoshenko back-solves the bilayer thickness h (Exp 2).
// (Page guard: document.getElementById('plotCanvasShape'))
// ===========================================================================
(function () {
  const cvE = document.getElementById('plotCanvasShape');
  if (!cvE) return;
  const rIn = document.getElementById('rInput'), mIn = document.getElementById('mInput'), epsIn = document.getElementById('epsInput'), nIn = document.getElementById('nInput');
  const valR = document.getElementById('valR'), valM = document.getElementById('valM'), valEps = document.getElementById('valEps'), valN = document.getElementById('valN');
  const btnRun = document.getElementById('btnRun');
  const R_R_INH = 92;  // inherited SMP shape-recovery ratio R_r (%) from Exp 1

  const phiOf = (m, n) => 3 * Math.pow(1 + m, 2) + (1 + m * n) * (m * m + 1 / (m * n));
  // nonlinear correction factor: (κ_sim / κ_pred)
  function simFactor(model, epsF, m, n) {
    if (model === 'smp') {
      // Exp 7 SMP recovery: incomplete recovery (R_r<100%) pulls κ_sim below target,
      // finite strain then over-shoots - the two compete.
      return (R_R_INH / 100) * (1 + 3.0 * epsF + 0.02 * Math.pow(m - 1, 2));
    }
    // Timoshenko small-strain: linear theory under-predicts at finite Δε and extreme m/n
    return 1 + 2.5 * epsF + 0.04 * Math.pow(m - 1, 2) + 0.03 * Math.abs(Math.log(n));
  }
  let R = 9, m = 0.33, epsF = 0.02, n = 1, model = 'timo';

  function solve() {
    R = parseFloat(rIn.value); m = parseFloat(mIn.value); epsF = parseFloat(epsIn.value) / 100; n = parseFloat(nIn.value);
    const sel = document.querySelector('input[name="model"]:checked'); model = sel ? sel.value : 'timo';
    const kPred = 1 / (R / 1000);                 // m⁻¹
    const kSim = kPred * simFactor(model, epsF, m, n);
    const err = Math.abs(kSim - kPred) / kPred * 100;
    const phi = phiOf(m, n);
    const hTot = 6 * epsF * Math.pow(1 + m, 2) / (kPred * phi) * 1000;  // mm (Timoshenko back-solve)
    return { kPred, kSim, err, phi, hTot };
  }
  function culprit(s) {
    if (s.err < 10) return ' - (within tolerance)';
    const epsT = 2.5 * epsF, mT = 0.04 * Math.pow(m - 1, 2), nT = 0.03 * Math.abs(Math.log(n));
    if (model === 'smp') return 'SMP incomplete recovery R_r=' + R_R_INH + '% (Exp 1) + finite Δε';
    if (mT >= epsT && mT >= nT) return 'extreme thickness ratio m - constant moment-arm assumption';
    if (nT >= epsT) return 'large E-ratio n - neutral-axis shift ignored';
    return 'Timoshenko small-strain assumption (Δε too large)';
  }

  function refresh() {
    const s = solve();
    BP.put(valR, R.toFixed(1) + ' mm'); BP.put(valM, m.toFixed(2)); BP.put(valEps, (epsF * 100).toFixed(1) + ' %'); BP.put(valN, n.toFixed(2));
    const pass = s.err < 10;

    // Analytics: ε_shape vs Δε with 10% acceptance line and current dot
    const F = BP.fit(cvE);
    const fr = BP.frame(F.ctx, F.w, F.h, { xMin: 0.5, xMax: 15, yMin: 0, yMax: 40, xTicks: 5, yTicks: 4, axisColor: '#1E40AF', xLabel: 'Mismatch strain  Δε  (%)', yLabel: 'Shape error  ε_shape  (%)' });
    BP.shadeY(F.ctx, fr, 0, 10, 'rgba(21,128,61,0.10)');
    BP.hLine(F.ctx, fr, 10, '#B42318', 'acceptance ε_shape < 10 %');
    const pts = [];
    for (let e = 0.5; e <= 15.001; e += 0.25) { const ef = e / 100; const f = simFactor(model, ef, m, n); pts.push({ x: e, y: Math.min(Math.abs(f - 1) * 100, 40) }); }
    BP.curve(F.ctx, fr, pts, '#E2570F', 2.6);
    BP.dot(F.ctx, fr, epsF * 100, Math.min(s.err, 40), pass ? '#15803D' : '#B42318', s.err.toFixed(1) + '%');

    // Table: ε_shape at representative Δε
    const tb = document.querySelector('#shapeTable tbody');
    if (tb) {
      tb.innerHTML = [1, 2, 5, 10].map((e) => {
        const f = simFactor(model, e / 100, m, n); const er = Math.abs(f - 1) * 100; const ok = er < 10; const selr = Math.abs(e - epsF * 100) < 0.3;
        return '<tr style="' + (selr ? 'background:rgba(226,87,15,0.08);font-weight:700;' : '') + '"><td>' + e.toFixed(0) + ' %</td><td>' + (1 / (R / 1000) * f).toFixed(0) + ' m⁻¹</td><td>' + er.toFixed(1) + ' %</td><td style="text-align:right;color:' + (ok ? '#15803D' : '#B42318') + ';font-weight:600;">' + (ok ? 'ACCEPT' : 'REJECT') + '</td></tr>';
      }).join('');
    }

    BP.put(document.getElementById('resKpred'), s.kPred.toFixed(0) + ' m⁻¹');
    BP.put(document.getElementById('resKsim'), s.kSim.toFixed(0) + ' m⁻¹', '#E2570F');
    BP.put(document.getElementById('resError'), s.err.toFixed(1) + ' %', pass ? '#15803D' : '#B42318');
    BP.put(document.getElementById('resVerdict'), pass ? 'ACCEPT (<10%)' : 'REJECT (>10%)', pass ? '#15803D' : '#B42318');
    BP.put(document.getElementById('resCulprit'), culprit(s));

    const li = document.getElementById('liveInsight');
    if (li) {
      if (pass) li.innerHTML = '<strong>Live Insight:</strong> Predicted κ_pred = ' + s.kPred.toFixed(0) + ' m⁻¹ (design 1/R), simulated κ_sim = ' + s.kSim.toFixed(0) + ' m⁻¹ - a <strong>' + s.err.toFixed(1) + '%</strong> shape error, <strong>inside</strong> the 10% acceptance band. The ' + (model === 'smp' ? 'SMP-recovery' : 'Timoshenko bilayer (Exp 2)') + ' model is validated for these parameters.';
      else li.innerHTML = '<strong>Verification Failed:</strong> κ_sim = ' + s.kSim.toFixed(0) + ' m⁻¹ vs κ_pred = ' + s.kPred.toFixed(0) + ' m⁻¹, ε_shape = <strong>' + s.err.toFixed(1) + '%</strong> exceeds 10%. Likely culprit: <strong>' + culprit(s) + '</strong>. Reduce Δε back into the small-strain range or bring m toward 1.';
    }
    updateEq(s, pass);
  }
  function updateEq(s, pass) {
    const box = document.getElementById('eqBox'); if (!box) return;
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Predicted (design):</strong> κ_pred = 1/R_target = ' + s.kPred.toFixed(0) + ' m⁻¹</div>' +
      '<div><strong>Timoshenko bilayer (Exp 2):</strong> κ = 6Δε(1+m)²/(h·φ), φ = ' + s.phi.toFixed(2) + ' &rArr; h = ' + s.hTot.toFixed(2) + ' mm</div>' +
      '<div><strong>Simulated (finite-strain):</strong> κ_sim = ' + s.kSim.toFixed(0) + ' m⁻¹</div>' +
      '<div><strong>Shape error:</strong> ε_shape = |κ_sim - κ_pred|/κ_pred = ' + s.err.toFixed(1) + '% &rArr; ' + (pass ? '<span style="color:#15803D;font-weight:700;">ACCEPT</span>' : '<span style="color:#B42318;font-weight:700;">REJECT</span>') + '</div>' +
      '<div style="color:#8b929b;font-size:0.92em;">Timoshenko is small-strain/linear (κ ∝ Δε); it diverges from the sim as Δε grows or m,n leave the calibrated band. R_r=' + R_R_INH + '% inherited from Exp 1.</div></div>';
  }
  [rIn, mIn, epsIn, nIn].forEach((el) => el && el.addEventListener('input', refresh));
  document.querySelectorAll('input[name="model"]').forEach((r) => r.addEventListener('change', refresh));
  if (btnRun) btnRun.addEventListener('click', refresh);
  window.addEventListener('resize', refresh);

  // 3D (real THREE): the bilayer strip FOLDS to κ_sim and holds; a ghost arc marks
  // the κ_pred target. Divergence between the two = the visible ε_shape. Push Δε or
  // m out of range and the strip visibly overshoots the target → red verdict.
  if (btnRun) btnRun.addEventListener('click', () => BP.playB && BP.playB());
  LabGate.arm(function () {
    const V = BP.three('viewport3D');
    if (V) {
      const Wd = 3.4, Hh = 1.5, segs = 60;
      const geo = new THREE.PlaneGeometry(Wd, Hh, segs, 1);
      const mat = new THREE.MeshStandardMaterial({ color: 0xE2570F, roughness: 0.45, metalness: 0.05, side: THREE.DoubleSide });
      const strip = new THREE.Mesh(geo, mat); V.scene.add(strip);
      const base = geo.attributes.position.array.slice();
      // ghost target arc (κ_pred) - a thin torus-segment traced as a line
      let ghost = null;
      function buildGhost(kScenePred) {
        if (ghost) { V.scene.remove(ghost); ghost.geometry.dispose(); ghost.material.dispose(); }
        const gpts = [];
        for (let i = 0; i <= segs; i++) {
          const sx = (i / segs - 0.5) * Wd; const ang = kScenePred * sx;
          gpts.push(new THREE.Vector3(Math.sin(ang) / kScenePred, 0, (1 - Math.cos(ang)) / kScenePred));
        }
        const g = new THREE.BufferGeometry().setFromPoints(gpts);
        ghost = new THREE.Line(g, new THREE.LineDashedMaterial({ color: 0x8b929b, dashSize: 0.12, gapSize: 0.08 }));
        ghost.computeLineDistances(); V.scene.add(ghost);
      }
      let f = 0, playing = false;
      BP.playB = function () { f = 0; playing = true; };
      const raf = () => {
        requestAnimationFrame(raf);
        const s = solve(); const pass = s.err < 10;
        const kScenePred = 0.55;                       // reference scene curvature for κ_pred
        const kSceneSim = kScenePred * (s.kSim / s.kPred);
        buildGhost(kScenePred);
        if (playing) { f = Math.min(1, f + 1 / 90); if (f >= 1) playing = false; }
        const k = Math.max(1e-3, kSceneSim * f);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x0 = base[i * 3], y0 = base[i * 3 + 1];
          const ang = k * x0;
          const x = f < 0.02 ? x0 : Math.sin(ang) / k;
          const z = f < 0.02 ? 0 : (1 - Math.cos(ang)) / k;
          pos.setXYZ(i, x, y0, z);
        }
        pos.needsUpdate = true; geo.computeVertexNormals();
        strip.rotation.y += 0.004; if (ghost) ghost.rotation.y = strip.rotation.y;
        mat.color.setHex(pass ? 0xE2570F : 0xB42318);
        const sl = document.getElementById('stateLabel');
        if (sl) sl.textContent = f < 0.02 ? 'Flat strip (unfolded)' : playing ? 'Folding to κ_sim...' : pass ? 'Folded - matches κ_pred target (' + s.err.toFixed(1) + '%)' : 'Overshot target - ε_shape ' + s.err.toFixed(1) + '% > 10%';
        V.controls.update(); V.renderer.render(V.scene, V.camera);
      };
      raf();
    }
    refresh();
  });
})();

// ===========================================================================
// SUB-CALC C - ENERGY BUDGET OF A COMPLETE 4D CYCLE
//   E_print   = P_printer · t_print
//   E_program = m·Cp·(T_program - T_amb)
//   E_trigger depends on mechanism: body-heat ≈ 0 (free) · Joule I²Rt · photo Q
//   E_4D(N)   = E_print + E_program + E_trigger·N     (one printed part, cycled N×)
//   E_conv(N) = E_mould + E_actuator·N                (moulded part + powered actuator)
//   Break-even N where the two totals cross.
// (Page guard: document.getElementById('plotCanvasEnergy'))
// ===========================================================================
(function () {
  const cvE = document.getElementById('plotCanvasEnergy');
  if (!cvE) return;
  const cvB = document.getElementById('plotCanvasEnergyBar');
  const nIn = document.getElementById('nCyclesInput'), massIn = document.getElementById('massInput'), powIn = document.getElementById('powerInput');
  const valN = document.getElementById('valN'), valMass = document.getElementById('valMass'), valPow = document.getElementById('valPower');
  const btnRun = document.getElementById('btnRun');
  const CP = 1800, DT_PROG = 35;            // J/(kg·K) PLA, ΔT amb→Tg (25→60 °C)
  const E_ACT = 100;                        // J/cycle, efficient conventional electric actuator
  const TRIG = { body: 0, joule: 200, photo: 500 };  // J/cycle by mechanism
  const RHO_PLA = 1.24, VRATE_C = 4;        // g/cm³, mm³/s volumetric FDM rate - same rate as Sub-Calc D
  let N = 100, massG = 30, P = 150, trig = 'body';

  function model() {
    N = Math.round(Math.pow(10, parseFloat(nIn.value))); massG = parseFloat(massIn.value); P = parseFloat(powIn.value);
    const sel = document.querySelector('input[name="trig"]:checked'); trig = sel ? sel.value : 'body';
    const tPrint = (massG / RHO_PLA) * 1000 / VRATE_C;  // s: mass→volume(cm³)→mm³ / volumetric rate
    const Eprint = P * tPrint;                       // J
    const Eprog = (massG / 1000) * CP * DT_PROG;     // J
    const Etrig = TRIG[trig];                        // J/cycle
    const Emould = 6e5 + massG * 5e3;                // J, one-off tooling embodied energy
    const F4D = Eprint + Eprog;
    const E4D = (n) => F4D + Etrig * n;
    const Econv = (n) => Emould + E_ACT * n;
    let nBreak = Infinity;
    if (Etrig > E_ACT) nBreak = (Emould - F4D) / (Etrig - E_ACT);  // conventional overtakes 4D
    return { tPrint, Eprint, Eprog, Etrig, Emould, F4D, E4D, Econv, nBreak };
  }

  function refresh() {
    const M = model();
    BP.put(valN, N.toLocaleString()); BP.put(valMass, massG.toFixed(0) + ' g'); BP.put(valPow, P.toFixed(0) + ' W');

    // Left: E_total vs N (log x), two crossing lines, shade winning regime
    const F = BP.fit(cvE);
    const yMax = Math.max(M.E4D(1e4), M.Econv(1e4)) / 1e6 * 1.05;
    const fr = BP.frame(F.ctx, F.w, F.h, {
      logX: true, xMin: 1, xMax: 1e4, yMin: 0, yMax: yMax, xTicks: 4, yTicks: 5, axisColor: '#1E40AF',
      xLabel: 'Actuation cycles  N', yLabel: 'Lifecycle energy  E_total  (MJ)',
      xFmt: (x) => x >= 1000 ? (x / 1000) + 'k' : x.toFixed(0), yFmt: (y) => y.toFixed(1)
    });
    if (isFinite(M.nBreak) && M.nBreak >= 1 && M.nBreak <= 1e4) {
      BP.vLine(F.ctx, fr, M.nBreak, '#94a3b8', 'N_break');
    }
    const p4 = [], pc = [];
    for (let lg = 0; lg <= 4.001; lg += 0.05) { const n = Math.pow(10, lg); p4.push({ x: n, y: M.E4D(n) / 1e6 }); pc.push({ x: n, y: M.Econv(n) / 1e6 }); }
    BP.curve(F.ctx, fr, pc, '#3E5A82', 2.4);
    BP.curve(F.ctx, fr, p4, '#E2570F', 2.6);
    BP.dot(F.ctx, fr, N, M.E4D(N) / 1e6, '#E2570F', '');
    BP.legend(F.ctx, fr.pl + 12, fr.pt + 12, [{ color: '#E2570F', text: '4D-print (' + trig + ' trigger)' }, { color: '#3E5A82', text: 'mould + actuator' }]);

    // Right: stacked energy breakdown at current N
    if (cvB) {
      const S = BP.fit(cvB);
      const parts4 = [{ v: M.Eprint, c: '#1E40AF', n: 'E_print' }, { v: M.Eprog, c: '#3E5A82', n: 'E_program' }, { v: M.Etrig * N, c: '#E2570F', n: 'E_trig·N' }];
      const partsC = [{ v: M.Emould, c: '#8B929B', n: 'E_mould' }, { v: E_ACT * N, c: '#B45309', n: 'E_act·N' }];
      drawStacks(S.ctx, S.w, S.h, [{ name: '4D', parts: parts4 }, { name: 'Conv', parts: partsC }], N);
    }

    // Table: winner by mechanism
    const tb = document.querySelector('#energyTable tbody');
    if (tb) {
      tb.innerHTML = ['body', 'joule', 'photo'].map((tm) => {
        const et = TRIG[tm]; const nb = et > E_ACT ? (M.Emould - M.F4D) / (et - E_ACT) : Infinity;
        const win4d = M.F4D + et * N < M.Emould + E_ACT * N; const selr = tm === trig;
        const nbTxt = isFinite(nb) ? nb.toFixed(0) : '4D ∀N';
        return '<tr style="' + (selr ? 'background:rgba(226,87,15,0.08);font-weight:700;' : '') + '"><td>' + tm + '</td><td>' + et + ' J</td><td>' + nbTxt + '</td><td style="text-align:right;color:' + (win4d ? '#15803D' : '#B42318') + ';font-weight:600;">' + (win4d ? '4D wins' : 'mould wins') + '</td></tr>';
      }).join('');
    }

    const win4d = M.E4D(N) < M.Econv(N);
    BP.put(document.getElementById('resEprint'), (M.Eprint / 1000).toFixed(1) + ' kJ');
    BP.put(document.getElementById('resEtrigger'), M.Etrig + ' J/cycle');
    BP.put(document.getElementById('resEtotal'), (M.E4D(N) / 1e6).toFixed(2) + ' MJ', '#E2570F');
    BP.put(document.getElementById('resBreakeven'), isFinite(M.nBreak) ? Math.round(M.nBreak).toLocaleString() + ' cycles' : '4D wins ∀N');
    BP.put(document.getElementById('resWinner'), win4d ? '4D-print' : 'mould + actuator', win4d ? '#15803D' : '#B42318');

    const li = document.getElementById('liveInsight');
    if (li) {
      if (M.Etrig === 0) li.innerHTML = '<strong>Live Insight:</strong> A <strong>body-heat</strong> trigger costs 0 J per cycle, so the 4D part (flat at ' + (M.F4D / 1e6).toFixed(2) + ' MJ) stays below the moulded part + powered actuator at <strong>every N</strong> - the free biological trigger is the decisive advantage.';
      else li.innerHTML = '<strong>Live Insight:</strong> With a <strong>' + trig + '</strong> trigger (' + M.Etrig + ' J/cycle) the 4D part starts cheaper but its per-cycle cost lets the efficient moulded actuator catch up at <strong>N_break ≈ ' + (isFinite(M.nBreak) ? Math.round(M.nBreak).toLocaleString() : '∞') + '</strong>. At N = ' + N.toLocaleString() + ', ' + (win4d ? '4D-print still wins' : 'the moulded route wins') + '.';
    }
    updateEq(M, win4d);
  }
  function drawStacks(ctx, W, H, cols, N) {
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    const pl = 50, pr = 14, pt = 18, pb = 34, w = W - pl - pr, h = H - pt - pb;
    const maxV = Math.max(...cols.map((c) => c.parts.reduce((a, p) => a + p.v, 0)), 1);
    const bw = Math.min(70, w / cols.length * 0.5), gap = w / cols.length;
    ctx.font = '600 10px "IBM Plex Mono", monospace';
    cols.forEach((c, i) => {
      const cx = pl + gap * (i + 0.5); let yb = pt + h;
      c.parts.forEach((p) => {
        const ph = h * p.v / maxV; yb -= ph;
        ctx.fillStyle = p.c; ctx.fillRect(cx - bw / 2, yb, bw, ph);
      });
      ctx.fillStyle = '#16223a'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(c.name, cx, pt + h + 6);
      const tot = c.parts.reduce((a, p) => a + p.v, 0);
      ctx.fillStyle = '#55606f'; ctx.textBaseline = 'bottom';
      ctx.fillText((tot / 1e6).toFixed(2) + ' MJ', cx, pt + h - h * tot / maxV - 4);
    });
    ctx.strokeStyle = '#1E40AF'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(pl, pt); ctx.lineTo(pl, pt + h); ctx.lineTo(pl + w, pt + h); ctx.stroke();
    ctx.save(); ctx.translate(11, pt + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = '#55606f';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = '600 11px "IBM Plex Mono", monospace';
    ctx.fillText('Energy  E  (MJ) @ N=' + N.toLocaleString(), 0, 0); ctx.restore();
  }
  function updateEq(M, win4d) {
    const box = document.getElementById('eqBox'); if (!box) return;
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Print:</strong> E_print = P·t_print = ' + (M.Eprint / 1000).toFixed(1) + ' kJ &nbsp;|&nbsp; <strong>Program:</strong> E_program = m·Cp·ΔT = ' + (M.Eprog / 1000).toFixed(1) + ' kJ</div>' +
      '<div><strong>Trigger (mechanism-dependent):</strong> body-heat ≈ 0 · Joule I²Rt = 200 J · photo Q = 500 J per cycle</div>' +
      '<div><strong>Lifecycle:</strong> E_4D(N) = E_print + E_program + E_trigger·N &nbsp;vs&nbsp; E_conv(N) = E_mould + E_actuator·N</div>' +
      '<div><strong>Break-even:</strong> N_break = (E_mould - E_print - E_program)/(E_trigger - E_actuator) = ' + (isFinite(M.nBreak) ? Math.round(M.nBreak).toLocaleString() : '∞ (4D wins ∀N)') + '</div>' +
      '<div style="color:#8b929b;font-size:0.92em;">E_mould is a one-off tooling embodied-energy assumption; E_actuator=100 J/cycle. The trigger mechanism decides the winner.</div></div>';
  }
  [nIn, massIn, powIn].forEach((el) => el && el.addEventListener('input', refresh));
  document.querySelectorAll('input[name="trig"]').forEach((r) => r.addEventListener('change', refresh));
  if (btnRun) btnRun.addEventListener('click', refresh);
  window.addEventListener('resize', refresh);
  LabGate.arm(function () {
    refresh();
  });
})();

// ===========================================================================
// SUB-CALC D - SCALABILITY: LAB → MANUFACTURING
//   t_print = V_part / (A_layer·v_print·h_layer)   (volumetric print rate)
//   4D-print cost/part ≈ machine-time + material  (flat - no economy of scale)
//   Injection-mould cost/part = C_mould/N + C_material + C_labour  (drops with N)
//   Break-even N_break = C_mould / (C_4D - C_inj_marginal)
// (Page guard: document.getElementById('plotCanvasScale'))
// ===========================================================================
(function () {
  const cvS = document.getElementById('plotCanvasScale');
  if (!cvS) return;
  const cvT = document.getElementById('plotCanvasScaleT');
  const volIn = document.getElementById('volInput'), nIn = document.getElementById('nInput'), mouldIn = document.getElementById('mouldInput'), rateIn = document.getElementById('rateInput');
  const valVol = document.getElementById('valVol'), valN = document.getElementById('valN'), valMould = document.getElementById('valMould'), valRate = document.getElementById('valRate');
  const btnRun = document.getElementById('btnRun');
  const VRATE = 4;            // mm³/s volumetric FDM rate (0.4mm·0.2mm·50mm/s)
  const RHO = 1.24;          // g/cm³ PLA
  const MAT_PRICE = 0.025;   // $/g
  const C_INJ_MARG = 0.40;   // $/part injection marginal (material + labour)
  let volCm3 = 10, N = 100, Cmould = 8000, rate = 30;

  function model() {
    volCm3 = parseFloat(volIn.value); N = Math.round(Math.pow(10, parseFloat(nIn.value))); Cmould = parseFloat(mouldIn.value); rate = parseFloat(rateIn.value);
    const tPrint = (volCm3 * 1000) / VRATE;            // s
    const cMat = volCm3 * RHO * MAT_PRICE;             // $
    const C4D = rate * (tPrint / 3600) + cMat;         // $/part (flat)
    const Cinj = (n) => Cmould / n + C_INJ_MARG;       // $/part
    const nBreak = C4D > C_INJ_MARG ? Cmould / (C4D - C_INJ_MARG) : Infinity;
    return { tPrint, cMat, C4D, Cinj, nBreak };
  }

  function refresh() {
    const M = model();
    BP.put(valVol, volCm3.toFixed(0) + ' cm³'); BP.put(valN, N.toLocaleString()); BP.put(valMould, '$' + Cmould.toLocaleString()); BP.put(valRate, '$' + rate.toFixed(0) + '/hr');

    // Left: cost/part vs N (log-log), crossing at N_break
    const F = BP.fit(cvS);
    const yMax = Math.max(M.Cinj(1), M.C4D) * 1.2;
    const fr = BP.frame(F.ctx, F.w, F.h, {
      logX: true, logY: true, xMin: 1, xMax: 1e4, yMin: 0.1, yMax: Math.max(yMax, 10), xTicks: 4, yTicks: 4, axisColor: '#1E40AF',
      xLabel: 'Production volume  N  (parts)', yLabel: 'Cost per part  C  ($)',
      xFmt: (x) => x >= 1000 ? (x / 1000) + 'k' : x.toFixed(0), yFmt: (y) => y >= 1 ? y.toFixed(0) : y.toFixed(1)
    });
    if (isFinite(M.nBreak) && M.nBreak >= 1 && M.nBreak <= 1e4) BP.vLine(F.ctx, fr, M.nBreak, '#94a3b8', 'N_break');
    const p4 = [], pi = [];
    for (let lg = 0; lg <= 4.001; lg += 0.05) { const n = Math.pow(10, lg); p4.push({ x: n, y: M.C4D }); pi.push({ x: n, y: M.Cinj(n) }); }
    BP.curve(F.ctx, fr, pi, '#3E5A82', 2.4);
    BP.curve(F.ctx, fr, p4, '#E2570F', 2.6);
    BP.dot(F.ctx, fr, N, M.Cinj(N) < M.C4D ? M.Cinj(N) : M.C4D, '#E2570F', '');
    BP.legend(F.ctx, fr.pl + 12, fr.pt + 12, [{ color: '#E2570F', text: '4D-print (flat)' }, { color: '#3E5A82', text: 'injection mould' }]);

    // Right: print time vs part volume
    if (cvT) {
      const T = BP.fit(cvT);
      const tfr = BP.frame(T.ctx, T.w, T.h, { padB: 30, xMin: 1, xMax: 100, yMin: 0, yMax: (100 * 1000 / VRATE) / 3600 * 1.05, yTicks: 4, xTicks: 5, axisColor: '#1E40AF', xLabel: 'Part volume  V  (cm³)', yLabel: 't_print (hr)' });
      const tp = []; for (let v = 1; v <= 100; v += 2) tp.push({ x: v, y: (v * 1000 / VRATE) / 3600 });
      BP.curve(T.ctx, tfr, tp, '#1E40AF', 2.4);
      BP.dot(T.ctx, tfr, volCm3, M.tPrint / 3600, '#E2570F', (M.tPrint / 3600).toFixed(1) + ' hr');
    }

    // Table: cost at decade volumes
    const tb = document.querySelector('#scaleTable tbody');
    if (tb) {
      tb.innerHTML = [10, 100, 1000, 10000].map((nn) => {
        const ci = M.Cinj(nn); const win4d = M.C4D < ci; const selr = Math.abs(nn - N) < nn * 0.25;
        return '<tr style="' + (selr ? 'background:rgba(226,87,15,0.08);font-weight:700;' : '') + '"><td>' + nn.toLocaleString() + '</td><td>$' + M.C4D.toFixed(2) + '</td><td>$' + ci.toFixed(2) + '</td><td style="text-align:right;color:' + (win4d ? '#15803D' : '#B42318') + ';font-weight:600;">' + (win4d ? '4D-print' : 'mould') + '</td></tr>';
      }).join('');
    }

    const win4d = M.C4D < M.Cinj(N);
    BP.put(document.getElementById('resTprint'), (M.tPrint / 3600).toFixed(2) + ' hr');
    BP.put(document.getElementById('resC10'), '$' + M.Cinj(10).toFixed(2));
    BP.put(document.getElementById('resC10000'), '$' + M.Cinj(1e4).toFixed(2));
    BP.put(document.getElementById('resNbreak'), isFinite(M.nBreak) ? Math.round(M.nBreak).toLocaleString() + ' parts' : 'n/a');
    BP.put(document.getElementById('resVerdict'), win4d ? '4D-print wins' : 'injection mould wins', win4d ? '#15803D' : '#B42318');

    const li = document.getElementById('liveInsight');
    if (li) li.innerHTML = '<strong>Live Insight:</strong> 4D-printing is flat at <strong>$' + M.C4D.toFixed(2) + '/part</strong> (no tooling, but no economy of scale). Injection moulding amortizes its $' + Cmould.toLocaleString() + ' mould, dropping from $' + M.Cinj(10).toFixed(0) + '/part at N=10 to $' + M.Cinj(1e4).toFixed(2) + ' at N=10⁴. They cross at <strong>N_break ≈ ' + (isFinite(M.nBreak) ? Math.round(M.nBreak).toLocaleString() : '∞') + '</strong> - 4D wins for customised/low-volume work below it.';
    updateEq(M);
  }
  function updateEq(M) {
    const box = document.getElementById('eqBox'); if (!box) return;
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Print time:</strong> t_print = V_part/(A_layer·v_print·h_layer) = ' + (M.tPrint / 3600).toFixed(2) + ' hr</div>' +
      '<div><strong>4D cost/part (flat):</strong> C_4D = rate·t_print + C_material = $' + M.C4D.toFixed(2) + '</div>' +
      '<div><strong>Injection cost/part:</strong> C_inj(N) = C_mould/N + C_material + C_labour</div>' +
      '<div><strong>Break-even:</strong> N_break = C_mould/(C_4D - C_inj_marginal) = ' + (isFinite(M.nBreak) ? Math.round(M.nBreak).toLocaleString() : '∞') + ' parts</div>' +
      '<div style="color:#8b929b;font-size:0.92em;">Volumetric FDM rate ≈ ' + VRATE + ' mm³/s; C_inj_marginal = $' + C_INJ_MARG.toFixed(2) + '/part (material + labour). Labour/amortization lumped.</div></div>';
  }
  [volIn, nIn, mouldIn, rateIn].forEach((el) => el && el.addEventListener('input', refresh));
  if (btnRun) btnRun.addEventListener('click', refresh);
  window.addEventListener('resize', refresh);
  LabGate.arm(function () {
    refresh();
  });
})();

// ===========================================================================
// SUB-CALC E - FUTURE ROADMAP: TRL ASSESSMENT
//   NASA/ISRO TRL 1-9. Each 4D application maps to a current TRL, the barrier
//   blocking the next rung, and the earlier sub-calc contradiction responsible.
//   TRL is qualitative/contested - cite it as a reference, not a fact.
// (Page guard: document.getElementById('plotCanvasTRL'))
// ===========================================================================
(function () {
  const cvT = document.getElementById('plotCanvasTRL');
  if (!cvT) return;
  const cvB = document.getElementById('plotCanvasTRLbar');
  const tgtIn = document.getElementById('targetInput'), valTgt = document.getElementById('valTarget');
  const btnRun = document.getElementById('btnRun');
  const APPS = {
    stent: { name: 'Biomedical stent', trl: 6, c: '#B45309', barrier: 'In-vivo cell-viability & long-term biocompatibility unproven at scale', source: 'Exp 7C shear-kill uncertainty · Exp 10B ε_shape gate', proposal: 'GLP animal trials; tie κ tolerance to the <10% shape-error gate' },
    aero: { name: 'Aerospace morphing', trl: 5, c: '#1E40AF', barrier: 'Composite anisotropy & fatigue in the relevant flight environment', source: 'Tsai-Hill anisotropy · Exp 10C energy budget', proposal: 'Thermal-vacuum qualification of the morphing skin' },
    soft: { name: 'Soft robotics', trl: 4, c: '#3E5A82', barrier: 'Actuation friction-asymmetry & repeatability of self-folding', source: 'Exp 10A trigger mechanism · Exp 10B κ repeatability', proposal: 'Characterise cyclic hysteresis over 10⁴ cycles' },
    consumer: { name: 'Consumer 4D goods', trl: 3, c: '#8B929B', barrier: 'Cost & scalability vs injection moulding at volume', source: 'Exp 10D scalability N_break · Exp 10C energy', proposal: 'Target customised niches below N_break' }
  };
  const BANDS = [{ lo: 1, hi: 3, name: 'Basic / analytical', c: 'rgba(139,146,155,0.14)' }, { lo: 4, hi: 6, name: 'Lab to relevant env', c: 'rgba(30,64,175,0.10)' }, { lo: 7, hi: 9, name: 'System / flight', c: 'rgba(21,128,61,0.12)' }];
  let app = 'stent', target = 7;

  function refresh() {
    const sel = document.querySelector('input[name="app"]:checked'); app = sel ? sel.value : 'stent';
    target = parseFloat(tgtIn.value);
    const A = APPS[app]; const next = Math.min(9, A.trl + 1);
    BP.put(valTgt, 'TRL ' + target.toFixed(0));

    // Left: TRL ladder 1-9, band shading, marker at current TRL, gap to next/target
    const F = BP.fit(cvT);
    const ctx = F.ctx, W = F.w, H = F.h;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    const pl = 44, pr = 14, pt = 16, pb = 30, w = W - pl - pr, h = H - pt - pb;
    const yOf = (trl) => pt + h - (trl - 0.5) / 9 * h;
    BANDS.forEach((b) => { const y1 = yOf(b.hi + 0.5), y2 = yOf(b.lo - 0.5); ctx.fillStyle = b.c; ctx.fillRect(pl, y1, w, y2 - y1); });
    ctx.font = '10px "IBM Plex Mono", monospace';
    for (let t = 1; t <= 9; t++) {
      const y = yOf(t);
      ctx.strokeStyle = '#e4e4de'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pl, y); ctx.lineTo(pl + w, y); ctx.stroke();
      ctx.fillStyle = '#8b929b'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('TRL ' + t, pl - 6, y);
    }
    // gap current → target (highlight)
    const gTop = yOf(Math.max(A.trl, target)), gBot = yOf(Math.min(A.trl, target));
    ctx.fillStyle = 'rgba(226,87,15,0.10)'; ctx.fillRect(pl + w * 0.34, gTop, w * 0.32, gBot - gTop);
    // current marker
    const yc = yOf(A.trl);
    ctx.fillStyle = A.c; ctx.beginPath(); ctx.arc(pl + w * 0.5, yc, 8, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(pl + w * 0.5, yc, 8, 0, 7); ctx.stroke();
    ctx.fillStyle = '#9A3412'; ctx.font = '700 11px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(A.name + ' - TRL ' + A.trl, pl + w * 0.5, yc - 12);
    // next rung marker (target)
    const yt = yOf(target);
    ctx.strokeStyle = '#E2570F'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(pl, yt); ctx.lineTo(pl + w, yt); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#E2570F'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('target TRL ' + target.toFixed(0), pl + w - 4, yt - 2);
    // Band captions used to be painted inside the ladder, where they could sit
    // under the target line and the marker. They are a collapsible chip now.
    LabLegend.attach(cvT, BANDS.map((b) => ({ color: b.c, text: 'TRL ' + b.lo + '-' + b.hi + ': ' + b.name })), 'bl');
    ctx.strokeStyle = '#1E40AF'; ctx.lineWidth = 1.4; ctx.strokeRect(pl, pt, w, h);
    ctx.fillStyle = '#55606f'; ctx.font = '600 11px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('Technology Readiness Level (NASA/ISRO 1-9)', pl + w / 2, H - 1);

    // Right: TRL comparison bars across applications
    if (cvB) {
      const S = BP.fit(cvB);
      BP.rankBars(S.ctx, S.w, S.h, Object.keys(APPS).sort((a, b) => APPS[b].trl - APPS[a].trl).map((k) => ({
        name: APPS[k].name, v: APPS[k].trl, label: 'TRL ' + APPS[k].trl, c: k === app ? '#E2570F' : APPS[k].c
      })), { max: 9, padL: 130, xLabel: 'Current TRL (1-9)' });
    }

    // Table
    const tb = document.querySelector('#trlTable tbody');
    if (tb) {
      tb.innerHTML = Object.keys(APPS).map((k) => {
        const a = APPS[k]; const selr = k === app;
        return '<tr style="' + (selr ? 'background:rgba(226,87,15,0.08);font-weight:700;' : '') + '"><td style="color:' + a.c + ';font-weight:600;">' + a.name + '</td><td>TRL ' + a.trl + '</td><td>' + a.barrier + '</td><td style="text-align:right;">' + a.source + '</td></tr>';
      }).join('');
    }

    BP.put(document.getElementById('resTRL'), 'TRL ' + A.trl);
    BP.put(document.getElementById('resNext'), 'TRL ' + next, '#E2570F');
    BP.put(document.getElementById('resBarrier'), A.barrier);
    BP.put(document.getElementById('resSource'), A.source);
    BP.put(document.getElementById('resProposal'), A.proposal);

    const li = document.getElementById('liveInsight');
    if (li) li.innerHTML = '<strong>Live Insight:</strong> <strong>' + A.name + '</strong> sits at <strong>TRL ' + A.trl + '</strong> (' + (A.trl <= 3 ? 'basic/analytical' : A.trl <= 6 ? 'lab to relevant environment' : 'system/flight') + '). The gap to TRL ' + next + ' is blocked by: <strong>' + A.barrier + '</strong>, which traces back to ' + A.source + '. ' + (target > A.trl ? 'Reaching TRL ' + target.toFixed(0) + ' needs ' + (target - A.trl) + ' more rung(s).' : '');
    updateEq(A, next);
  }
  function updateEq(A, next) {
    const box = document.getElementById('eqBox'); if (!box) return;
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>TRL scale:</strong> 1-3 basic principles / analytical proof · 4-6 lab to relevant-environment validation · 7-9 system prototype / operational / flight-proven</div>' +
      '<div><strong>Current:</strong> ' + A.name + ' = TRL ' + A.trl + ' &rArr; next rung TRL ' + next + '</div>' +
      '<div><strong>Blocking barrier:</strong> ' + A.barrier + '</div>' +
      '<div><strong>Responsible contradiction:</strong> ' + A.source + '</div>' +
      '<div style="color:#8b929b;font-size:0.92em;">TRL is a qualitative, contested assessment - cite it as a reference, not a measured fact. Values are illustrative literature positions.</div></div>';
  }
  document.querySelectorAll('input[name="app"]').forEach((r) => r.addEventListener('change', refresh));
  if (tgtIn) tgtIn.addEventListener('input', refresh);
  if (btnRun) btnRun.addEventListener('click', refresh);
  window.addEventListener('resize', refresh);
  LabGate.arm(function () {
    refresh();
  });
})();
