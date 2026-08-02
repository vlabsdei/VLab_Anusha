/* global THREE */
/* ============================================================================
   EXP 09 - 4D-PRINTED SOFT ROBOTS
   Pneumatic bending · SMP stiffness lock · Crawling gait · Grasping ·
   Pressure-position PID control.
   Five sub-calculators, one per page, each guarded by a page-unique canvas id.
   Physics is solved live in SI units; each 3D viewport is a live solver whose
   geometry is integrated from the current slider state and can visibly fail.
   Palette: navy #1E40AF (data) · rust #E2570F (live/active).
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
// Shared 2-D plotting helper (BP namespace) - copied from the exp7 template.
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
  ctx.strokeStyle = o.axisColor || '#1E40AF'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(pl, pt); ctx.lineTo(pl, pt + h); ctx.lineTo(pl + w, pt + h); ctx.stroke();
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
BP.dashCurve = function (ctx, fr, pts, color, lw) {
  ctx.setLineDash([6, 4]); BP.curve(ctx, fr, pts, color, lw || 2); ctx.setLineDash([]);
};
BP.shadeY = function (ctx, fr, y1, y2, color) {
  ctx.fillStyle = color;
  const a = fr.gy(y2), b = fr.gy(y1);
  ctx.fillRect(fr.pl, a, fr.w, b - a);
};
BP.shadeX = function (ctx, fr, x1, x2, color) {
  ctx.fillStyle = color;
  const a = fr.gx(x1), b = fr.gx(x2);
  ctx.fillRect(a, fr.pt, b - a, fr.h);
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
  controls.enablePan = false; controls.minDistance = 3; controls.maxDistance = 10;
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

const DEG = 180 / Math.PI;

// ===========================================================================
// SUB-CALC A - PNEUMATIC SOFT ACTUATOR (PRESSURE → BENDING)
//   Moment:      M = P · A_cross · d_ecc
//   Curvature:   κ = M / (E_elast · I_eff)
//   Linear:      θ_lin = κ · L
//   Corrected:   θ = θ_lin / (1 + β·θ_lin²)   (empirical geometric stiffening)
//   Calibrated to 20 kPa → 28°, 80 kPa → 94°  (E=1 MPa, I_eff=1.82e-10 m⁴,
//   β = 0.0534 rad⁻²).
// (Guard: document.getElementById('plotCanvasBend'))
// ===========================================================================
(function () {
  const cvB = document.getElementById('plotCanvasBend');
  if (!cvB) return;
  const cvK = document.getElementById('plotCanvasBendK');
  const pIn = document.getElementById('pInput'), lIn = document.getElementById('lInput'),
    aIn = document.getElementById('aInput'), dIn = document.getElementById('dInput');
  const valP = document.getElementById('valP'), valL = document.getElementById('valL'),
    valA = document.getElementById('valA'), valD = document.getElementById('valD');
  const btnRun = document.getElementById('btnRun');

  const E_ELAST = 1.0e6;        // Pa (silicone, ~1 MPa)
  const I_EFF = 1.82e-10;       // m⁴ effective second moment of area
  const BETA = 0.0534;          // rad⁻² stiffening coefficient (calibrated)

  const moment = (Pkpa, Amm2, dmm) => (Pkpa * 1000) * (Amm2 * 1e-6) * (dmm * 1e-3); // N·m
  const kappaOf = (M) => M / (E_ELAST * I_EFF);                                       // m⁻¹
  const thetaLin = (kap, Lmm) => kap * (Lmm * 1e-3);                                  // rad
  const thetaCorr = (thL) => thL / (1 + BETA * thL * thL);                            // rad
  let P = 50, L = 50, A = 30, d = 3;

  function solve(Pk) { const M = moment(Pk, A, d), k = kappaOf(M), thL = thetaLin(k, L); return { M, k, thL, th: thetaCorr(thL) }; }

  function refresh() {
    P = parseFloat(pIn.value); L = parseFloat(lIn.value); A = parseFloat(aIn.value); d = parseFloat(dIn.value);
    BP.put(valP, P.toFixed(0) + ' kPa'); BP.put(valL, L.toFixed(0) + ' mm');
    BP.put(valA, A.toFixed(0) + ' mm²'); BP.put(valD, d.toFixed(1) + ' mm');
    const s = solve(P);

    // Main plot: θ vs P (linear prediction vs corrected)
    const F = BP.fit(cvB);
    const fr = BP.frame(F.ctx, F.w, F.h, {
      xMin: 0, xMax: 100, yMin: 0, yMax: 160, xTicks: 5, yTicks: 4, axisColor: '#1E40AF',
      xLabel: 'Drive pressure  P  (kPa)', yLabel: 'Bending angle  θ  (deg)'
    });
    BP.hLine(F.ctx, fr, 30, '#94a3b8', 'θ = 30° linear limit');
    const linPts = [], corPts = [];
    for (let pp = 0; pp <= 100; pp += 2) { const q = solve(pp); linPts.push({ x: pp, y: q.thL * DEG }); corPts.push({ x: pp, y: q.th * DEG }); }
    BP.dashCurve(F.ctx, fr, linPts, '#3E5A82', 2);
    BP.curve(F.ctx, fr, corPts, '#E2570F', 2.8);
    BP.dot(F.ctx, fr, P, Math.min(s.th * DEG, 160), '#E2570F', (s.th * DEG).toFixed(0) + '°');
    BP.legend(F.ctx, fr.pl + 14, fr.pt + 12, [
      { color: '#3E5A82', text: 'θ_lin = κL (linear)' },
      { color: '#E2570F', text: 'θ corrected (stiffening)' }
    ]);

    // Secondary: curvature vs pressure
    if (cvK) {
      const K = BP.fit(cvK);
      const kfr = BP.frame(K.ctx, K.w, K.h, { padB: 30, xMin: 0, xMax: 100, yMin: 0, yMax: Math.max(kappaOf(moment(100, A, d)) * 1.1, 5), xTicks: 5, yTicks: 4, axisColor: '#1E40AF', xLabel: 'Pressure  P  (kPa)', yLabel: 'κ  (m⁻¹)' });
      const kp = []; for (let pp = 0; pp <= 100; pp += 2) kp.push({ x: pp, y: kappaOf(moment(pp, A, d)) });
      BP.curve(K.ctx, kfr, kp, '#1E40AF', 2.4);
      BP.dot(K.ctx, kfr, P, s.k, '#E2570F', s.k.toFixed(1));
    }

    // Table: 5 pressures
    const tb = document.querySelector('#bendTable tbody');
    if (tb) {
      tb.innerHTML = [0, 25, 50, 75, 100].map((pp) => {
        const q = solve(pp), lin = q.thL * DEG, cor = q.th * DEG, nonlin = lin > 30, sel = Math.abs(pp - P) < 0.5;
        return '<tr style="' + (sel ? 'background:rgba(226,87,15,0.08);font-weight:700;' : '') + '"><td>' + pp + ' kPa</td><td>' + lin.toFixed(0) + '°</td><td>' + cor.toFixed(0) + '°</td><td style="text-align:right;color:' + (nonlin ? '#B45309' : '#15803D') + ';font-weight:600;">' + (nonlin ? 'nonlinear' : 'linear') + '</td></tr>';
      }).join('');
    }

    BP.put(document.getElementById('resMoment'), (s.M * 1000).toFixed(2) + ' mN·m');
    BP.put(document.getElementById('resKappa'), s.k.toFixed(2) + ' m⁻¹');
    BP.put(document.getElementById('resThetaLin'), (s.thL * DEG).toFixed(1) + '°');
    BP.put(document.getElementById('resTheta'), (s.th * DEG).toFixed(1) + '°', '#E2570F');
    const nonlin = s.thL * DEG > 30;
    BP.put(document.getElementById('resRegime'), nonlin ? 'nonlinear (saturating)' : 'linear', nonlin ? '#B45309' : '#15803D');

    const li = document.getElementById('liveInsight');
    if (li) li.innerHTML = '<strong>Live Insight:</strong> P = ' + P.toFixed(0) + ' kPa drives a ' + (s.M * 1000).toFixed(1) + ' mN·m moment, curving the finger to κ = ' + s.k.toFixed(1) + ' m⁻¹. The linear law predicts <strong>' + (s.thL * DEG).toFixed(0) + '°</strong>, but geometric stiffening rolls it off to <strong>' + (s.th * DEG).toFixed(0) + '°</strong>' + (nonlin ? ' - well into the nonlinear regime where equal pressure steps add ever less angle.' : ' - still in the near-linear regime.');
    updateEq(s);
  }
  function updateEq(s) {
    const box = document.getElementById('eqBox'); if (!box) return;
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Bending moment:</strong> M = P·A_cross·d_ecc = ' + (s.M * 1000).toFixed(2) + ' mN·m</div>' +
      '<div><strong>Curvature:</strong> κ = M/(E·I_eff) = ' + s.k.toFixed(2) + ' m⁻¹ &nbsp;(E = 1 MPa, I_eff = 1.82×10⁻¹⁰ m⁴)</div>' +
      '<div><strong>Linear angle:</strong> θ_lin = κ·L = ' + (s.thL * DEG).toFixed(1) + '°</div>' +
      '<div><strong>Corrected (override):</strong> θ = θ_lin/(1 + β·θ_lin²) = ' + (s.th * DEG).toFixed(1) + '° &nbsp;(β = 0.0534 rad⁻²)</div>' +
      '<div style="color:#8b929b;font-size:0.92em;">The constant-moment-arm linear model holds only for θ ≲ 30°; the rolloff term reproduces the calibrated 20 kPa to 28°, 80 kPa to 94° saturation.</div></div>';
  }
  [pIn, lIn, aIn, dIn].forEach((el) => el && el.addEventListener('input', refresh));
  window.addEventListener('resize', refresh);
  if (btnRun) btnRun.addEventListener('click', () => { refresh(); BP.playA && BP.playA(); });

  // 3D: a segmented finger whose per-segment rotation is the solved uniform
  // curvature κ·segLen. On Run the cavity pressure ramps 0 → P and the finger
  // integrates its way to the corrected θ, then holds. Because θ(P) saturates,
  // the tip curls ever slower as pressure climbs - the stiffening is shown, not
  // stated. Tiny A/d/L or P≈0 → the finger barely closes (visible failure).
  LabGate.arm(function () {
    const V = BP.three('viewport3D');
    if (V) {
      const NSEG = 16, LSC = 2.6;
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: 0x6b7686, metalness: 0.4, roughness: 0.5 }));
      base.position.set(-1.55, 0, 0); V.scene.add(base);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(5, 0.16, 3), new THREE.MeshStandardMaterial({ color: 0xe8eaee, roughness: 0.9 })); bed.position.y = -1.4; V.scene.add(bed);
      const segMat = new THREE.MeshStandardMaterial({ color: 0xE2570F, roughness: 0.5, metalness: 0.05 });
      const segs = [];
      for (let i = 0; i < NSEG; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(LSC / NSEG * 0.92, 0.34, 0.5), segMat.clone()); V.scene.add(m); segs.push(m); }
      function setFinger(thetaRad) {
        const dth = thetaRad / NSEG, seg = LSC / NSEG;
        let x = -1.3, y = 0, a = 0;
        for (let i = 0; i < NSEG; i++) {
          const cx = x + Math.cos(a) * seg / 2, cy = y + Math.sin(a) * seg / 2;
          segs[i].position.set(cx, cy, 0); segs[i].rotation.z = a;
          x += Math.cos(a) * seg; y += Math.sin(a) * seg; a += dth;
        }
      }
      let hasRun = false, pShown = 0;
      BP.playA = function () { hasRun = true; pShown = 0; };
      const raf = () => {
        requestAnimationFrame(raf);
        if (hasRun) pShown += (P - pShown) * 0.05;
        const th = hasRun ? solve(pShown).th : 0;
        setFinger(th);
        const sl = document.getElementById('stateLabel');
        if (sl) sl.textContent = !hasRun ? 'Finger at rest (press Run)' : Math.abs(P - pShown) > 1 ? 'Pressurising - curling...' : (th * DEG < 5 ? 'Barely closes (too little drive)' : 'Held at θ = ' + (th * DEG).toFixed(0) + '°');
        V.controls.update(); V.renderer.render(V.scene, V.camera);
      };
      raf();
    }
    refresh();
  });
})();

// ===========================================================================
// SUB-CALC B - SMP STIFFNESS SWITCHING (4D LOCK-AND-HOLD)
//   E(T) sigmoid between E_active (warm) and E_passive = 1.5 GPa (cold), T_g=40°C
//   SR = E_passive / E_active
//   θ_bent = min(90°, k_b·P_bend/E_active);  θ_held = R_f·θ_bent (if T<T_g locked)
//   Hold power: pneumatic = P·Q_leak (continuous), SMP-locked = 0 W.
// (Guard: document.getElementById('plotCanvasStiff'))
// ===========================================================================
(function () {
  const cvS = document.getElementById('plotCanvasStiff');
  if (!cvS) return;
  const cvC = document.getElementById('plotCanvasCycle');
  const tIn = document.getElementById('tInput'), eaIn = document.getElementById('eaInput'),
    pbIn = document.getElementById('pbInput'), rfIn = document.getElementById('rfInput');
  const valT = document.getElementById('valT'), valEa = document.getElementById('valEa'),
    valPb = document.getElementById('valPb'), valRf = document.getElementById('valRf');
  const btnRun = document.getElementById('btnRun');

  const TG = 40, W_SIG = 3, E_PASSIVE = 1500, KB = 3.75, Q_LEAK = 1e-6; // MPa, deg/(kPa/MPa), m³/s
  const Emod = (Tc, Ea) => E_PASSIVE + (Ea - E_PASSIVE) / (1 + Math.exp(-(Tc - TG) / W_SIG)); // MPa
  const thetaBent = (Pb, Ea) => Math.min(90, KB * Pb / Ea); // deg
  let Tc = 25, Ea = 3, Pb = 60, Rf = 97;

  function refresh() {
    Tc = parseFloat(tIn.value); Ea = parseFloat(eaIn.value); Pb = parseFloat(pbIn.value); Rf = parseFloat(rfIn.value);
    BP.put(valT, Tc.toFixed(0) + ' °C'); BP.put(valEa, Ea.toFixed(1) + ' MPa');
    BP.put(valPb, Pb.toFixed(0) + ' kPa'); BP.put(valRf, Rf.toFixed(0) + ' %');
    const locked = Tc < TG;                       // cooled below T_g → vitrified
    const thB = thetaBent(Pb, Ea);
    const thHeld = locked ? (Rf / 100) * thB : 0; // if still warm, springs back on release
    const SR = E_PASSIVE / Ea;
    const pPneu = (Pb * 1000) * Q_LEAK;           // W, continuous pneumatic hold

    // Main: E vs T (log modulus, T_g switch)
    const F = BP.fit(cvS);
    const fr = BP.frame(F.ctx, F.w, F.h, { logY: true, xMin: 20, xMax: 70, yMin: 0.1, yMax: 1e4, xTicks: 5, yTicks: 5, axisColor: '#1E40AF', xLabel: 'Temperature  T  (°C)', yLabel: 'Modulus  E  (MPa)', yFmt: (y) => y >= 1 ? y.toFixed(0) : y.toFixed(2) });
    BP.shadeX(F.ctx, fr, 20, TG, 'rgba(30,64,175,0.07)');   // locked (glassy) region
    const ep = []; for (let tt = 20; tt <= 70; tt += 0.5) ep.push({ x: tt, y: Emod(tt, Ea) });
    BP.curve(F.ctx, fr, ep, '#E2570F', 2.8);
    BP.vLine(F.ctx, fr, TG, '#1E40AF', 'T_g = 40°C');
    BP.dot(F.ctx, fr, Tc, Emod(Tc, Ea), '#E2570F', Emod(Tc, Ea) >= 1 ? Emod(Tc, Ea).toFixed(0) + ' MPa' : Emod(Tc, Ea).toFixed(2));
    BP.legend(F.ctx, fr.pl + 14, fr.pt + 12, [{ color: 'rgba(30,64,175,0.4)', text: 'T < T_g: glassy / locked' }]);

    // Secondary: θ across the lock cycle (bend → cool → release → held)
    if (cvC) {
      const C = BP.fit(cvC);
      const cfr = BP.frame(C.ctx, C.w, C.h, { padB: 30, padL: 46, xMin: 0, xMax: 3, yMin: 0, yMax: 100, xTicks: 3, yTicks: 4, axisColor: '#1E40AF', xLabel: 'cycle stage', yLabel: 'θ (deg)', xFmt: (x) => ['bend', 'cool', 'rel', ''][Math.round(x)] || '' });
      const cyc = [{ x: 0, y: thB }, { x: 1, y: thB }, { x: 2, y: thHeld }, { x: 3, y: thHeld }];
      BP.curve(C.ctx, cfr, cyc, locked ? '#15803D' : '#B42318', 2.6);
      BP.dot(C.ctx, cfr, 3, thHeld, locked ? '#15803D' : '#B42318', thHeld.toFixed(0) + '°');
    }

    // Table: state timeline
    const tb = document.querySelector('#stiffTable tbody');
    if (tb) {
      const rows = [
        ['Bend (warm, P on)', Ea.toFixed(1) + ' MPa', thB.toFixed(0) + '°', pPneu.toFixed(2) + ' W'],
        ['Cool below T_g', locked ? (E_PASSIVE / 1000).toFixed(1) + ' GPa' : Ea.toFixed(1) + ' MPa', thB.toFixed(0) + '°', pPneu.toFixed(2) + ' W'],
        ['Release P (hold)', locked ? (E_PASSIVE / 1000).toFixed(1) + ' GPa' : Ea.toFixed(1) + ' MPa', thHeld.toFixed(0) + '°', locked ? '0.00 W' : 'sprang back']
      ];
      tb.innerHTML = rows.map((r, i) => '<tr' + (i === 2 ? ' style="font-weight:700;color:' + (locked ? '#15803D' : '#B42318') + ';"' : '') + '><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td style="text-align:right;">' + r[3] + '</td></tr>').join('');
    }

    BP.put(document.getElementById('resEactive'), Ea.toFixed(1) + ' MPa');
    BP.put(document.getElementById('resEpassive'), (E_PASSIVE / 1000).toFixed(1) + ' GPa');
    BP.put(document.getElementById('resSR'), SR.toFixed(0) + '×');
    BP.put(document.getElementById('resThetaHeld'), thHeld.toFixed(0) + '°', locked ? '#15803D' : '#B42318');
    BP.put(document.getElementById('resEnergySaved'), locked ? pPneu.toFixed(2) + ' W to 0 W' : '0 W (not locked)', locked ? '#15803D' : '#B42318');

    const li = document.getElementById('liveInsight');
    if (li) li.innerHTML = locked
      ? '<strong>Live Insight:</strong> Cooled to <strong>' + Tc.toFixed(0) + ' °C</strong> (below T_g = 40 °C) the SMP vitrifies - E jumps ' + SR.toFixed(0) + '× to ' + (E_PASSIVE / 1000).toFixed(1) + ' GPa. Releasing pressure leaves the finger <strong>held at ' + thHeld.toFixed(0) + '°</strong> at <strong>0 W</strong>, versus ' + pPneu.toFixed(2) + ' W to hold it pneumatically. This is the genuine 4D advantage.'
      : '<strong>Live Insight:</strong> At <strong>' + Tc.toFixed(0) + ' °C</strong> the SMP is still above T_g (soft). It bends to ' + thB.toFixed(0) + '° under pressure but <strong>springs straight back when P is released</strong>, no lock. Cool below 40 °C to freeze the shape.';
    updateEq(SR, thB, thHeld, locked, pPneu);
  }
  function updateEq(SR, thB, thHeld, locked, pPneu) {
    const box = document.getElementById('eqBox'); if (!box) return;
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Stiffness switch:</strong> E(T) sigmoid, E_active = ' + Ea.toFixed(1) + ' MPa to E_passive = ' + (E_PASSIVE / 1000).toFixed(1) + ' GPa across T_g = 40 °C</div>' +
      '<div><strong>Stiffness ratio:</strong> SR = E_passive/E_active = ' + SR.toFixed(0) + '×</div>' +
      '<div><strong>Held shape:</strong> θ_held = R_f·θ_bent = ' + (Rf / 100).toFixed(2) + '·' + thB.toFixed(0) + '° = ' + thHeld.toFixed(0) + '° ' + (locked ? '<span style="color:#15803D;font-weight:700;">(locked)</span>' : '<span style="color:#B42318;font-weight:700;">(not locked)</span>') + '</div>' +
      '<div><strong>Hold power:</strong> pneumatic = P·Q_leak = ' + pPneu.toFixed(2) + ' W; SMP-locked = 0 W</div>' +
      '<div style="color:#8b929b;font-size:0.92em;">E(T) is an empirical sigmoid straddling T_g; the lock requires cooling below T_g before pressure is released.</div></div>';
  }
  [tIn, eaIn, pbIn, rfIn].forEach((el) => el && el.addEventListener('input', refresh));
  window.addEventListener('resize', refresh);
  if (btnRun) btnRun.addEventListener('click', () => { refresh(); BP.playB && BP.playB(); });

  // 3D: the finger runs the real lock cycle on Run - pressurise (curl to θ_bent),
  // cool through T_g (colour blue→dark as it stiffens), release pressure. If it
  // crossed T_g it HOLDS the bend; if it stayed warm it springs straight back.
  LabGate.arm(function () {
    const V = BP.three('viewport3D');
    if (V) {
      const NSEG = 16, LSC = 2.6;
      const baseB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: 0x6b7686, metalness: 0.4, roughness: 0.5 }));
      baseB.position.set(-1.55, 0, 0); V.scene.add(baseB);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(5, 0.16, 3), new THREE.MeshStandardMaterial({ color: 0xe8eaee, roughness: 0.9 })); bed.position.y = -1.4; V.scene.add(bed);
      const warm = new THREE.Color(0x6aa0ff), cold = new THREE.Color(0x14306e);
      const segs = [];
      for (let i = 0; i < NSEG; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(LSC / NSEG * 0.92, 0.34, 0.5), new THREE.MeshStandardMaterial({ color: 0x6aa0ff, roughness: 0.5 })); V.scene.add(m); segs.push(m); }
      function setFinger(thetaDeg, mix) {
        const thetaRad = thetaDeg / DEG, dth = thetaRad / NSEG, seg = LSC / NSEG;
        let x = -1.3, y = 0, a = 0;
        for (let i = 0; i < NSEG; i++) {
          const cx = x + Math.cos(a) * seg / 2, cy = y + Math.sin(a) * seg / 2;
          segs[i].position.set(cx, cy, 0); segs[i].rotation.z = a;
          segs[i].material.color.lerpColors(warm, cold, mix);
          x += Math.cos(a) * seg; y += Math.sin(a) * seg; a += dth;
        }
      }
      let phase = 'idle', t = 0, thNow = 0, mix = 0;
      BP.playB = function () { phase = 'press'; t = 0; thNow = 0; mix = 0; };
      const raf = () => {
        requestAnimationFrame(raf);
        const locked = Tc < TG, thB = thetaBent(Pb, Ea), thHeld = locked ? (Rf / 100) * thB : 0;
        const dt = 1 / 60;
        if (phase === 'press') { thNow += (thB - thNow) * 0.08; if (Math.abs(thB - thNow) < 0.5) { phase = 'cool'; t = 0; } }
        else if (phase === 'cool') { t += dt; mix = locked ? Math.min(1, t / 1.6) : Math.min(0.25, t / 1.6); if (t > 1.8) { phase = 'release'; t = 0; } }
        else if (phase === 'release') { thNow += (thHeld - thNow) * 0.06; }
        setFinger(phase === 'idle' ? 0 : thNow, mix);
        const sl = document.getElementById('stateLabel');
        if (sl) sl.textContent = phase === 'idle' ? 'Warm & soft (press Run)' : phase === 'press' ? 'Pressurising - bending warm...' : phase === 'cool' ? (locked ? 'Cooling below T_g - stiffening...' : 'Still warm - will not lock') : (locked ? 'Locked - holds ' + thHeld.toFixed(0) + '° at 0 W' : 'Released - sprang back');
        V.controls.update(); V.renderer.render(V.scene, V.camera);
      };
      raf();
    }
    refresh();
  });
})();

// ===========================================================================
// SUB-CALC C - CRAWLING LOCOMOTION (FRICTION-ASYMMETRY GAIT)
//   δ_ext = L_seg·ε_active
//   μ_asym = μ_back/μ_fwd
//   δ_net = δ_ext·(1 - 1/μ_asym)     (0 at μ_asym=1, <0 backward when <1)
//   v = δ_net·f
// (Guard: document.getElementById('plotCanvasCrawl'))
// ===========================================================================
(function () {
  const cvC = document.getElementById('plotCanvasCrawl');
  if (!cvC) return;
  const cvP = document.getElementById('plotCanvasPos');
  const epsIn = document.getElementById('epsInput'), mufIn = document.getElementById('mufInput'),
    mubIn = document.getElementById('mubInput'), fIn = document.getElementById('fInput');
  const valEps = document.getElementById('valEps'), valMuf = document.getElementById('valMuf'),
    valMub = document.getElementById('valMub'), valF = document.getElementById('valF');
  const btnRun = document.getElementById('btnRun');

  const L_SEG = 40; // mm segment length
  const deltaExt = (eps) => L_SEG * eps / 100;                 // mm
  const deltaNet = (eps, asym) => deltaExt(eps) * (1 - 1 / asym); // mm
  let eps = 20, muf = 0.3, mub = 0.6, f = 0.8;

  function refresh() {
    eps = parseFloat(epsIn.value); muf = parseFloat(mufIn.value); mub = parseFloat(mubIn.value); f = parseFloat(fIn.value);
    BP.put(valEps, eps.toFixed(0) + ' %'); BP.put(valMuf, muf.toFixed(2)); BP.put(valMub, mub.toFixed(2)); BP.put(valF, f.toFixed(2) + ' Hz');
    const asym = mub / muf, dExt = deltaExt(eps), dNet = deltaNet(eps, asym), v = dNet * f;
    const dir = dNet > 0.05 ? 'forward' : dNet < -0.05 ? 'backward' : 'stuck (oscillates in place)';
    const dcol = dNet > 0.05 ? '#15803D' : dNet < -0.05 ? '#B42318' : '#B45309';

    // Main: δ_net vs μ_asym
    const F = BP.fit(cvC);
    const fr = BP.frame(F.ctx, F.w, F.h, { xMin: 0.3, xMax: 4, yMin: -dExt, yMax: dExt, xTicks: 5, yTicks: 4, axisColor: '#1E40AF', xLabel: 'Friction asymmetry  μ_asym = μ_back/μ_fwd', yLabel: 'δ_net per cycle  (mm)' });
    BP.shadeY(F.ctx, fr, -dExt, 0, 'rgba(180,35,24,0.08)');    // backward region
    BP.hLine(F.ctx, fr, 0, '#94a3b8', '');
    BP.vLine(F.ctx, fr, 1, '#B45309', 'μ_asym = 1 (no motion)');
    const pts = []; for (let aa = 0.3; aa <= 4.001; aa += 0.05) pts.push({ x: aa, y: deltaNet(eps, aa) });
    BP.curve(F.ctx, fr, pts, '#E2570F', 2.8);
    BP.dot(F.ctx, fr, Math.min(Math.max(asym, 0.3), 4), Math.min(Math.max(dNet, -dExt), dExt), '#E2570F', dNet.toFixed(1) + ' mm');

    // Secondary: body position vs time (staircase over cycles)
    if (cvP) {
      const T = 10;
      const posEnd = dNet * f * T;
      const yMax = Math.max(5, posEnd, 0) * 1.15 || 5, yMin = Math.min(0, posEnd) * 1.15;
      const Pc = BP.fit(cvP);
      const pfr = BP.frame(Pc.ctx, Pc.w, Pc.h, { padB: 30, xMin: 0, xMax: T, yMin: yMin - 0.001, yMax: yMax + 0.001, xTicks: 5, yTicks: 4, axisColor: '#1E40AF', xLabel: 'Time  t  (s)', yLabel: 'position  x  (mm)' });
      BP.hLine(Pc.ctx, pfr, 0, '#94a3b8', '');
      const ppts = []; for (let t = 0; t <= T; t += T / 240) { const cyc = Math.floor(t * f); ppts.push({ x: t, y: cyc * dNet }); }
      BP.curve(Pc.ctx, pfr, ppts, '#1E40AF', 2.4);
    }

    // Table: surface types
    const tb = document.querySelector('#crawlTable tbody');
    if (tb) {
      const SURF = [['Smooth (4D print)', 0.5, 0.5], ['Textured', 0.3, 0.6], ['Angled legs', 0.2, 0.8]];
      tb.innerHTML = SURF.map((s) => {
        const as = s[2] / s[1], dn = deltaNet(eps, as), vv = dn * f;
        const c = dn > 0.05 ? '#15803D' : dn < -0.05 ? '#B42318' : '#B45309';
        return '<tr><td>' + s[0] + '</td><td>' + as.toFixed(2) + '</td><td>' + dn.toFixed(2) + ' mm</td><td style="text-align:right;color:' + c + ';font-weight:600;">' + vv.toFixed(2) + ' mm/s</td></tr>';
      }).join('');
    }

    BP.put(document.getElementById('resDeltaExt'), dExt.toFixed(2) + ' mm');
    BP.put(document.getElementById('resDeltaNet'), dNet.toFixed(2) + ' mm', dcol);
    BP.put(document.getElementById('resAsym'), asym.toFixed(2));
    BP.put(document.getElementById('resSpeed'), v.toFixed(2) + ' mm/s', dcol);
    BP.put(document.getElementById('resDir'), dir, dcol);

    const li = document.getElementById('liveInsight');
    if (li) li.innerHTML = '<strong>Live Insight:</strong> Each stroke extends ' + dExt.toFixed(1) + ' mm. With μ_asym = <strong>' + asym.toFixed(2) + '</strong> the robot nets <strong>' + dNet.toFixed(2) + ' mm/cycle</strong>, i.e. <strong>' + v.toFixed(2) + ' mm/s ' + (dNet > 0.05 ? 'forward' : dNet < -0.05 ? 'backward' : 'and just oscillates in place') + '</strong>. ' + (Math.abs(asym - 1) < 0.05 ? 'Symmetric friction gives zero net travel, the classic smooth-surface failure.' : '');
    updateEq(dExt, dNet, asym, v);
  }
  function updateEq(dExt, dNet, asym, v) {
    const box = document.getElementById('eqBox'); if (!box) return;
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Extension stroke:</strong> δ_ext = L_seg·ε_active = ' + dExt.toFixed(2) + ' mm</div>' +
      '<div><strong>Friction asymmetry:</strong> μ_asym = μ_back/μ_fwd = ' + asym.toFixed(2) + ' &nbsp;(net motion needs > 1)</div>' +
      '<div><strong>Net displacement:</strong> δ_net = δ_ext·(1 - 1/μ_asym) = ' + dNet.toFixed(2) + ' mm/cycle</div>' +
      '<div><strong>Crawl speed:</strong> v = δ_net·f = ' + v.toFixed(2) + ' mm/s</div>' +
      '<div style="color:#8b929b;font-size:0.92em;">A smooth printed surface has μ_fwd ≈ μ_back, so δ_net ≈ 0. Asymmetry requires printed features / angled legs.</div></div>';
  }
  [epsIn, mufIn, mubIn, fIn].forEach((el) => el && el.addEventListener('input', refresh));
  window.addEventListener('resize', refresh);
  if (btnRun) btnRun.addEventListener('click', () => { refresh(); BP.playC && BP.playC(); });

  // 3D: a continuous soft-body worm (TubeGeometry, not a sphere chain) that
  // TRANSLATES across the ground by the solved δ_net each cycle (peristaltic
  // extend/anchor/contract). μ_asym=1 → it just stretches and recoils with
  // zero net travel; μ_asym>1 → it inches forward; μ_asym<1 → it backs up.
  // Body base advances by δ_net·(completed cycles).
  LabGate.arm(function () {
    const V = BP.three('viewport3D');
    if (V) {
      const ground = new THREE.Mesh(new THREE.BoxGeometry(12, 0.16, 2.4), new THREE.MeshStandardMaterial({ color: 0xe0e2e6, roughness: 0.95 })); ground.position.y = -0.7; V.scene.add(ground);
      const NS = 6, SPAN = 0.42, SCALE = 0.06; // scene units per mm
      const wormMat = new THREE.MeshStandardMaterial({ color: 0xE2570F, roughness: 0.5 });
      let wormMesh = null;
      function updateWormTube(base, stretch) {
        const gap = SPAN * (1 + stretch);
        const pts = [];
        for (let i = 0; i < NS; i++) pts.push(new THREE.Vector3(base + i * gap, -0.3, 0));
        const curve = new THREE.CatmullRomCurve3(pts);
        const radius = 0.26 * (1 - stretch * 0.22); // thins slightly while stretched
        const geo = new THREE.TubeGeometry(curve, Math.max(8, NS * 4), Math.max(0.05, radius), 14, false);
        if (wormMesh) { V.scene.remove(wormMesh); wormMesh.geometry.dispose(); }
        wormMesh = new THREE.Mesh(geo, wormMat);
        V.scene.add(wormMesh);
      }
      let playing = false, tSim = 0, basePos = -2.5;
      BP.playC = function () { playing = true; tSim = 0; basePos = -2.5; };
      updateWormTube(basePos, 0);
      const raf = () => {
        requestAnimationFrame(raf);
        const asym = mub / muf, dNet = deltaNet(eps, asym);
        const dt = 1 / 60;
        let stretch = 0;
        if (playing) {
          tSim += dt * f * 1.4;                       // advance in cycles
          const cyc = Math.floor(tSim), ph = tSim - cyc;
          stretch = Math.sin(ph * Math.PI) * (eps / 100); // extend then contract within a cycle
          basePos = -2.5 + cyc * dNet * SCALE;
          if (basePos > 4 || basePos < -4.5) { tSim = 0; basePos = -2.5; }
        }
        updateWormTube(basePos, stretch);
        const sl = document.getElementById('stateLabel');
        if (sl) sl.textContent = !playing ? 'Worm at rest (press Run)' : Math.abs(dNet) < 0.05 ? 'Oscillating in place - no net motion' : dNet > 0 ? 'Crawling forward...' : 'Crawling backward (misconfigured)';
        V.controls.update(); V.renderer.render(V.scene, V.camera);
      };
      raf();
    }
    refresh();
  });
})();

// ===========================================================================
// SUB-CALC D - GRASPING FORCE & WORKSPACE
//   F_grasp = P·A_tip·cos(θ)                 (cos → 0 at θ=90°)
//   R_min = r_palm; R_max = r_palm + L·sin(θ)
//   Force closure: F_grasp·μ_contact > m·g/3  (3 fingers share the weight)
// (Guard: document.getElementById('plotCanvasGrasp'))
// ===========================================================================
(function () {
  const cvG = document.getElementById('plotCanvasGrasp');
  if (!cvG) return;
  const cvW = document.getElementById('plotCanvasWork');
  const pIn = document.getElementById('pInput'), thIn = document.getElementById('thInput'),
    mIn = document.getElementById('mInput'), muIn = document.getElementById('muInput'), lIn = document.getElementById('lInput');
  const valP = document.getElementById('valP'), valTh = document.getElementById('valTh'),
    valM = document.getElementById('valM'), valMu = document.getElementById('valMu'), valL = document.getElementById('valL');
  const btnRun = document.getElementById('btnRun');

  const A_TIP = 1e-4, R_PALM = 20, G = 9.81; // m², mm, m/s²
  const Fgrasp = (Pk, thDeg) => (Pk * 1000) * A_TIP * Math.cos(thDeg / DEG); // N
  let P = 80, th = 40, m = 200, mu = 0.6, L = 55;

  function refresh() {
    P = parseFloat(pIn.value); th = parseFloat(thIn.value); m = parseFloat(mIn.value); mu = parseFloat(muIn.value); L = parseFloat(lIn.value);
    BP.put(valP, P.toFixed(0) + ' kPa'); BP.put(valTh, th.toFixed(0) + ' °'); BP.put(valM, m.toFixed(0) + ' g'); BP.put(valMu, mu.toFixed(2)); BP.put(valL, L.toFixed(0) + ' mm');
    const F = Fgrasp(P, th);
    const Rmin = R_PALM, Rmax = R_PALM + L * Math.sin(th / DEG);
    const need = (m / 1000) * G / 3;               // per-finger tangential need
    const hold = F * mu > need;
    const maxMass = 3 * F * mu / G * 1000;          // g

    // Main: F_grasp vs θ
    const Ff = BP.fit(cvG);
    const fr = BP.frame(Ff.ctx, Ff.w, Ff.h, { xMin: 0, xMax: 90, yMin: 0, yMax: Math.max(Fgrasp(P, 0) * 1.1, 2), xTicks: 6, yTicks: 4, axisColor: '#1E40AF', xLabel: 'Finger angle  θ  (deg)', yLabel: 'Grasp force / finger  F  (N)' });
    const thr = need / mu;                           // F needed to hold
    BP.shadeY(Ff.ctx, fr, 0, thr, 'rgba(180,35,24,0.08)');
    BP.hLine(Ff.ctx, fr, thr, '#94a3b8', 'hold threshold mg/(3μ)');
    const pts = []; for (let a = 0; a <= 90; a += 1) pts.push({ x: a, y: Fgrasp(P, a) });
    BP.curve(Ff.ctx, fr, pts, '#E2570F', 2.8);
    BP.dot(Ff.ctx, fr, th, F, hold ? '#15803D' : '#B42318', F.toFixed(2) + ' N');

    // Secondary: max holdable mass vs θ
    if (cvW) {
      const Wc = BP.fit(cvW);
      const wfr = BP.frame(Wc.ctx, Wc.w, Wc.h, { padB: 30, xMin: 0, xMax: 90, yMin: 0, yMax: Math.max(3 * Fgrasp(P, 0) * mu / G * 1000 * 1.1, 100), xTicks: 6, yTicks: 4, axisColor: '#1E40AF', xLabel: 'Finger angle  θ  (deg)', yLabel: 'max mass  (g)' });
      BP.hLine(Wc.ctx, wfr, m, '#94a3b8', 'object ' + m.toFixed(0) + ' g');
      const wp = []; for (let a = 0; a <= 90; a += 1) wp.push({ x: a, y: 3 * Fgrasp(P, a) * mu / G * 1000 });
      BP.curve(Wc.ctx, wfr, wp, '#1E40AF', 2.4);
      BP.dot(Wc.ctx, wfr, th, Math.max(maxMass, 0), hold ? '#15803D' : '#B42318', '');
    }

    // Table: θ = 30/60/90
    const tb = document.querySelector('#graspTable tbody');
    if (tb) {
      tb.innerHTML = [30, 60, 90].map((a) => {
        const Fa = Fgrasp(P, a), mm = 3 * Fa * mu / G * 1000, ok = Fa * mu > need, sel = a === Math.round(th);
        return '<tr style="' + (sel ? 'background:rgba(226,87,15,0.08);font-weight:700;' : '') + '"><td>' + a + '°</td><td>' + Fa.toFixed(2) + ' N</td><td>' + mm.toFixed(0) + ' g</td><td style="text-align:right;color:' + (ok ? '#15803D' : '#B42318') + ';font-weight:600;">' + (ok ? 'HOLD' : 'DROP') + '</td></tr>';
      }).join('');
    }

    BP.put(document.getElementById('resFgrasp'), F.toFixed(2) + ' N', '#E2570F');
    BP.put(document.getElementById('resRmin'), Rmin.toFixed(0) + ' mm');
    BP.put(document.getElementById('resRmax'), Rmax.toFixed(0) + ' mm');
    BP.put(document.getElementById('resMaxMass'), Math.max(maxMass, 0).toFixed(0) + ' g');
    BP.put(document.getElementById('resClosure'), hold ? 'HOLD' : 'DROP', hold ? '#15803D' : '#B42318');

    const li = document.getElementById('liveInsight');
    if (li) li.innerHTML = hold
      ? '<strong>Live Insight:</strong> At θ = ' + th.toFixed(0) + '° each finger presses <strong>' + F.toFixed(2) + ' N</strong>; the three-finger closure holds up to <strong>' + maxMass.toFixed(0) + ' g</strong>, so the ' + m.toFixed(0) + ' g object stays. Graspable Ø spans ' + (2 * Rmin).toFixed(0) + '-' + (2 * Rmax).toFixed(0) + ' mm.'
      : '<strong>Live Insight:</strong> At θ = ' + th.toFixed(0) + '° the cosθ term cuts each finger to <strong>' + F.toFixed(2) + ' N</strong>, closure needs ' + (need / mu).toFixed(2) + ' N to hold ' + m.toFixed(0) + ' g. ' + (th > 80 ? 'As θ approaches 90° the normal force vanishes and no pressure can save the grip.' : 'The object <strong>drops</strong>.');
    updateEq(F, Rmin, Rmax, need, hold);
  }
  function updateEq(F, Rmin, Rmax, need, hold) {
    const box = document.getElementById('eqBox'); if (!box) return;
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Grasp force:</strong> F = P·A_tip·cosθ = ' + F.toFixed(2) + ' N &nbsp;(A_tip = 100 mm²)</div>' +
      '<div><strong>Workspace:</strong> R_min = r_palm = ' + Rmin.toFixed(0) + ' mm; R_max = r_palm + L·sinθ = ' + Rmax.toFixed(0) + ' mm</div>' +
      '<div><strong>Force closure:</strong> F·μ_contact ' + (hold ? '>' : '≤') + ' m·g/3 = ' + need.toFixed(2) + ' N, so ' + (hold ? '<span style="color:#15803D;font-weight:700;">HOLD</span>' : '<span style="color:#B42318;font-weight:700;">DROP</span>') + '</div>' +
      '<div style="color:#8b929b;font-size:0.92em;">cos(90°)=0: at θ=90° the normal force drops to 0, so closure fails regardless of pressure.</div></div>';
  }
  [pIn, thIn, mIn, muIn, lIn].forEach((el) => el && el.addEventListener('input', refresh));
  window.addEventListener('resize', refresh);
  if (btnRun) btnRun.addEventListener('click', () => { refresh(); BP.playD && BP.playD(); });

  // 3D: three fingers close from open to the set angle θ around a sphere sized
  // to the object. Force closure is computed live; if it holds the object stays
  // seated, if F·μ ≤ mg/3 (θ→90° or too heavy) the sphere falls out. The drop
  // is the failure.
  LabGate.arm(function () {
    const V = BP.three('viewport3D');
    if (V) {
      const palm = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 32), new THREE.MeshStandardMaterial({ color: 0x6b7686, metalness: 0.4, roughness: 0.5 }));
      palm.position.y = 1.5; V.scene.add(palm);
      const fingers = [];
      for (let i = 0; i < 3; i++) {
        const g = new THREE.Group();
        const seg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.5, 0.3), new THREE.MeshStandardMaterial({ color: 0xE2570F, roughness: 0.5 }));
        seg.position.y = -0.75; g.add(seg);
        const ang = i * 2 * Math.PI / 3;
        g.position.set(Math.cos(ang) * 0.5, 1.35, Math.sin(ang) * 0.5);
        g.rotation.z = 0; g.userData.ang = ang; V.scene.add(g); fingers.push(g);
      }
      const obj = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 20), new THREE.MeshStandardMaterial({ color: 0x1E40AF, roughness: 0.4 }));
      V.scene.add(obj);
      let playing = false, flex = 90, objY = 0, dropping = false;
      BP.playD = function () { playing = true; flex = 90; objY = 0; dropping = false; };
      const raf = () => {
        requestAnimationFrame(raf);
        const F = Fgrasp(P, th), need = (m / 1000) * G / 3, hold = F * mu > need;
        const rObj = 0.32 + 0.7 * Math.pow(m / 500, 1 / 3); // sphere size from object mass
        obj.scale.setScalar(rObj / 0.5);
        const dt = 1 / 60;
        if (playing) {
          flex += (th - flex) * 0.08;                 // close from open(90°) to θ
          if (Math.abs(th - flex) < 1) {
            if (!hold) dropping = true;
          }
          if (dropping) objY -= 0.06 + (-objY) * 0.02; // fall out under gravity
        }
        fingers.forEach((g) => {
          const a = flex / DEG;
          // splay each finger outward from vertical by the flex angle (θ=0 hugs, θ=90 splayed)
          g.rotation.z = Math.cos(g.userData.ang) * a * 0.9;
          g.rotation.x = -Math.sin(g.userData.ang) * a * 0.9;
        });
        obj.position.set(0, 0.1 + objY, 0);
        obj.visible = objY > -4;
        const sl = document.getElementById('stateLabel');
        if (sl) sl.textContent = !playing ? 'Gripper open (press Run)' : dropping ? 'Force closure failed - object dropped' : Math.abs(th - flex) > 2 ? 'Closing...' : 'Held - F·μ > mg/3';
        V.controls.update(); V.renderer.render(V.scene, V.camera);
      };
      raf();
    }
    refresh();
  });
})();

// ===========================================================================
// SUB-CALC E - PRESSURE-POSITION PID CONTROL
//   Plant:  τ_p·dy/dt = K_plant·u - y     (first order, from sub-calc A slope)
//   PID:    u = Kp·(e + (1/Ti)∫e + Td·de/dt),  e = θ_set - y, valve clamp 0-150 kPa
//   Closed-loop step response θ(t); report overshoot, settling (2%), ω_cl.
//   Targets: OS < 15 %, t_s < 2 s.
// (Guard: document.getElementById('plotCanvasPID'))
// ===========================================================================
(function () {
  const cvPID = document.getElementById('plotCanvasPID');
  if (!cvPID) return;
  const cvStep = document.getElementById('stepCanvas');
  const cvErr = document.getElementById('plotCanvasErr');
  const kpIn = document.getElementById('kpInput'), tiIn = document.getElementById('tiInput'),
    tdIn = document.getElementById('tdInput'), setIn = document.getElementById('setInput'), tauIn = document.getElementById('tauInput');
  const valKp = document.getElementById('valKp'), valTi = document.getElementById('valTi'),
    valTd = document.getElementById('valTd'), valSet = document.getElementById('valSet'), valTau = document.getElementById('valTau');
  const btnRun = document.getElementById('btnRun');

  const K_PLANT = 1.4;      // deg/kPa, dθ/dP near P=0 from sub-calc A
  const T_END = 6, DT = 0.01, N = Math.round(T_END / DT);
  let Kp = 2.5, Ti = 1.5, Td = 0.2, setP = 60, tau = 0.5;

  function simulate() {
    Kp = parseFloat(kpIn.value); Ti = parseFloat(tiIn.value); Td = parseFloat(tdIn.value); setP = parseFloat(setIn.value); tau = parseFloat(tauIn.value);
    const y = new Float64Array(N + 1), u = new Float64Array(N + 1), e = new Float64Array(N + 1);
    let yv = 0, integ = 0, ePrev = setP;
    for (let i = 0; i <= N; i++) {
      const err = setP - yv;
      integ += err * DT;
      const deriv = (err - ePrev) / DT; ePrev = err;
      let uc = Kp * (err + integ / Ti + Td * deriv);
      if (uc < 0) { uc = 0; integ -= err * DT; }        // simple anti-windup at rails
      else if (uc > 150) { uc = 150; integ -= err * DT; }
      // first-order plant: τ dy/dt = K·u - y
      yv += DT * (K_PLANT * uc - yv) / tau;
      y[i] = yv; u[i] = uc; e[i] = err;
    }
    return { y, u, e };
  }

  function metrics(sim) {
    const { y } = sim;
    const yss = setP;
    let peak = -Infinity; for (let i = 0; i <= N; i++) if (y[i] > peak) peak = y[i];
    const os = Math.max(0, (peak - yss) / yss * 100);
    const band = 0.02 * yss;
    let ts = T_END;
    for (let i = N; i >= 0; i--) { if (Math.abs(y[i] - yss) > band) { ts = (i + 1) * DT; break; } }
    if (Math.abs(y[N] - yss) > band) ts = Infinity; // never settled → unstable
    // second-order estimate for bandwidth
    let zeta, wn;
    if (os > 0.5) { const lr = Math.log(os / 100); zeta = -lr / Math.sqrt(Math.PI * Math.PI + lr * lr); }
    else zeta = 1;
    wn = isFinite(ts) && ts > 0 ? 4 / (zeta * ts) : NaN;
    return { os, ts, zeta, wcl: wn };
  }

  function drawStep(sim, prog) {
    if (!cvStep) return;
    const F = BP.fit(cvStep);
    const fr = BP.frame(F.ctx, F.w, F.h, { xMin: 0, xMax: T_END, yMin: 0, yMax: Math.max(setP * 1.6, 40), xTicks: 6, yTicks: 5, axisColor: '#1E40AF', xLabel: 'Time  t  (s)', yLabel: 'Bending angle  θ  (deg)' });
    BP.shadeY(F.ctx, fr, setP * 0.98, setP * 1.02, 'rgba(21,128,61,0.10)'); // ±2% band
    BP.hLine(F.ctx, fr, setP, '#3E5A82', 'θ_set = ' + setP.toFixed(0) + '°');
    const lim = Math.max(1, Math.floor(prog * N));
    const pts = []; for (let i = 0; i <= lim; i++) pts.push({ x: i * DT, y: sim.y[i] });
    BP.curve(F.ctx, fr, pts, '#E2570F', 2.6);
    if (prog >= 1) BP.dot(F.ctx, fr, T_END, sim.y[N], '#E2570F', '');
  }

  function refresh(prog) {
    const sim = simulate();
    BP.put(valKp, Kp.toFixed(1)); BP.put(valTi, Ti.toFixed(1) + ' s'); BP.put(valTd, Td.toFixed(2) + ' s');
    BP.put(valSet, setP.toFixed(0) + ' °'); BP.put(valTau, tau.toFixed(2) + ' s');
    const mt = metrics(sim);
    drawStep(sim, prog === undefined ? 1 : prog);

    // Right: control effort u(t)
    const U = BP.fit(cvPID);
    const ufr = BP.frame(U.ctx, U.w, U.h, { xMin: 0, xMax: T_END, yMin: 0, yMax: 160, xTicks: 6, yTicks: 4, axisColor: '#1E40AF', xLabel: 'Time  t  (s)', yLabel: 'Pressure command  u  (kPa)' });
    BP.hLine(U.ctx, ufr, 150, '#94a3b8', 'valve limit');
    const up = []; for (let i = 0; i <= N; i += 2) up.push({ x: i * DT, y: sim.u[i] });
    BP.curve(U.ctx, ufr, up, '#1E40AF', 2.2);

    // Error e(t)
    if (cvErr) {
      const Ec = BP.fit(cvErr);
      const efr = BP.frame(Ec.ctx, Ec.w, Ec.h, { padB: 30, xMin: 0, xMax: T_END, yMin: -setP, yMax: setP, xTicks: 6, yTicks: 4, axisColor: '#1E40AF', xLabel: 'Time  t  (s)', yLabel: 'error  e  (deg)' });
      BP.hLine(Ec.ctx, efr, 0, '#94a3b8', '');
      const ep = []; for (let i = 0; i <= N; i += 2) ep.push({ x: i * DT, y: sim.e[i] });
      BP.curve(Ec.ctx, efr, ep, '#E2570F', 2.2);
    }

    const tuned = mt.os < 15 && isFinite(mt.ts) && mt.ts < 2;
    // Table
    const tb = document.querySelector('#pidTable tbody');
    if (tb) {
      const rows = [
        ['Overshoot', mt.os.toFixed(0) + ' %', '< 15 %', mt.os < 15],
        ['Settling time (2%)', isFinite(mt.ts) ? mt.ts.toFixed(2) + ' s' : 'unstable', '< 2 s', isFinite(mt.ts) && mt.ts < 2],
        ['Damping ζ', mt.zeta.toFixed(2), '~0.7', mt.zeta >= 0.5 && mt.zeta <= 1.0],
        ['Steady error', Math.abs(setP - sim.y[N]).toFixed(1) + '°', '≈ 0', Math.abs(setP - sim.y[N]) < 1]
      ];
      tb.innerHTML = rows.map((r) => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td style="text-align:right;color:' + (r[3] ? '#15803D' : '#B42318') + ';font-weight:600;">' + (r[3] ? 'PASS' : 'FAIL') + '</td></tr>').join('');
    }

    BP.put(document.getElementById('resKplant'), K_PLANT.toFixed(1) + ' °/kPa');
    BP.put(document.getElementById('resTauP'), tau.toFixed(2) + ' s');
    BP.put(document.getElementById('resOvershoot'), mt.os.toFixed(0) + ' %', mt.os < 15 ? '#15803D' : '#B42318');
    BP.put(document.getElementById('resSettle'), isFinite(mt.ts) ? mt.ts.toFixed(2) + ' s' : 'unstable', (isFinite(mt.ts) && mt.ts < 2) ? '#15803D' : '#B42318');
    BP.put(document.getElementById('resBandwidth'), isFinite(mt.wcl) ? mt.wcl.toFixed(1) + ' rad/s' : '-');

    const li = document.getElementById('liveInsight');
    if (li) li.innerHTML = tuned
      ? '<strong>Live Insight: TUNED.</strong> The loop reaches θ_set = ' + setP.toFixed(0) + '° with <strong>' + mt.os.toFixed(0) + ' % overshoot</strong> and settles in <strong>' + mt.ts.toFixed(2) + ' s</strong> - both inside spec (OS < 15 %, t_s < 2 s), &omega;_cl ≈ ' + mt.wcl.toFixed(1) + ' rad/s.'
      : '<strong>Live Insight: RETUNE.</strong> Overshoot ' + mt.os.toFixed(0) + ' %, settling ' + (isFinite(mt.ts) ? mt.ts.toFixed(2) + ' s' : 'never (sustained oscillation)') + '. ' + (mt.os > 15 ? 'Lower K_p or raise T_d to damp the ringing.' : 'Raise K_p or lower T_i for a faster response.');
    updateEq(mt, tuned);
  }
  function updateEq(mt, tuned) {
    const box = document.getElementById('eqBox'); if (!box) return;
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Plant (from A):</strong> G(s) = K_plant/(τ_p·s + 1), K_plant = ' + K_PLANT.toFixed(1) + ' °/kPa, τ_p = ' + tau.toFixed(2) + ' s</div>' +
      '<div><strong>PID law:</strong> u = K_p(e + (1/T_i)∫e + T_d·de/dt), K_p = ' + Kp.toFixed(1) + ', T_i = ' + Ti.toFixed(1) + ' s, T_d = ' + Td.toFixed(2) + ' s</div>' +
      '<div><strong>Response:</strong> overshoot = ' + mt.os.toFixed(0) + ' %, t_s(2%) = ' + (isFinite(mt.ts) ? mt.ts.toFixed(2) + ' s' : 'unstable') + ', &omega;_cl ≈ ' + (isFinite(mt.wcl) ? mt.wcl.toFixed(1) + ' rad/s' : '-') + ', so ' + (tuned ? '<span style="color:#15803D;font-weight:700;">TUNED</span>' : '<span style="color:#B42318;font-weight:700;">RETUNE</span>') + '</div>' +
      '<div style="color:#8b929b;font-size:0.92em;">First-order model over-predicts for large steps (real finger is nonlinear/hysteretic) - these gains are a starting point.</div></div>';
  }
  [kpIn, tiIn, tdIn, setIn, tauIn].forEach((el) => el && el.addEventListener('input', () => refresh()));
  window.addEventListener('resize', () => refresh());
  if (btnRun) btnRun.addEventListener('click', () => { BP.playE(); });

  // "Live solver" for the 2-D viewport: on Run the step response is drawn out in
  // simulated time (a sweeping cursor). Poorly tuned gains visibly ring or, at a
  // valve-limited limit cycle, oscillate without settling.
  LabGate.arm(function () {
    let prog = 1, playing = false;
    BP.playE = function () { prog = 0; playing = true; };
    (function loop() {
      requestAnimationFrame(loop);
      if (playing) { prog += 0.02; if (prog >= 1) { prog = 1; playing = false; } refresh(prog); }
    })();
    refresh();
  });
})();
