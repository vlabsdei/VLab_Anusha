/* global THREE */
/* ============================================================================
   EXP 08 — 4D PRINT PROCESS ENGINEERING
   Layer Bonding · Crystallisation · Residual Stress & Warpage · Print
   Anisotropy · Dimensional Accuracy (Cpk / tolerance stack-up)
   Five sub-calculators, one per page, each guarded by a page-unique canvas id.
   Physics is solved live in SI units with literature-grade constants; formulas
   overridden for accuracy where the source document is only qualitatively right.
   Palette: navy #1E40AF (data) · rust #E2570F (live/active).
   ============================================================================ */

// ---------------------------------------------------------------------------
// Shared 2-D plotting helper (BP namespace) — copied from exp7 verbatim
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
  if (label) {
    ctx.fillStyle = color; ctx.font = '700 11px "IBM Plex Mono", monospace';
    ctx.textAlign = X > fr.pl + fr.w * 0.7 ? 'right' : 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText(label, X + (X > fr.pl + fr.w * 0.7 ? -8 : 8), Y - 6);
  }
};
BP.legend = function (ctx, x, y, items) {
  ctx.font = '600 10px "IBM Plex Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  let yy = y;
  items.forEach((it) => {
    ctx.fillStyle = it.color; ctx.fillRect(x, yy - 4, 12, 8);
    ctx.fillStyle = '#55606f'; ctx.fillText(it.text, x + 17, yy);
    yy += 15;
  });
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
// SUB-CALC A — NECK GROWTH & INTER-LAYER BONDING  (guard: plotCanvasNeck)
//   Polymer weld healing by reptation (NOT metallic sintering):
//     t_avail = L_h / v_print            (mm / (mm/s) = s)
//     t_rep(T) = t0 · exp(Ea/R·(1/Tk − 1/Tref))   Ea=60 kJ/mol, Tref=503.15 K
//     D_b = min(1, (t_avail / t_rep)^(1/4))        (reptation ¼-power law)
//     σ_bond = D_b · σ_bulk,  σ_bulk = 47 MPa (PLA)
//   Calibrated: (230°C,30mm/s,L_h0.20)→D_b≈0.82,σ≈38.5; (190°C,60mm/s)→0.51,24.
// ===========================================================================
(function () {
  const cvNeck = document.getElementById('plotCanvasNeck');
  if (!cvNeck) return;
  const cvBond = document.getElementById('plotCanvasBond');
  const tempIn = document.getElementById('tempInput'), lhIn = document.getElementById('lhInput'), vIn = document.getElementById('vInput');
  const valTemp = document.getElementById('valTemp'), valLh = document.getElementById('valLh'), valV = document.getElementById('valV');
  const btnRun = document.getElementById('btnRun');

  const R_GAS = 8.314, Ea = 60000, Tref = 503.15, t0 = 0.0148, SIGMA_BULK = 47;
  const tRep = (Tc) => t0 * Math.exp(Ea / R_GAS * (1 / (Tc + 273.15) - 1 / Tref)); // s
  const tAvail = (Lh, v) => (Lh) / (v);                                            // mm/(mm/s)=s
  const Db = (Lh, v, Tc) => Math.min(1, Math.pow(tAvail(Lh, v) / tRep(Tc), 0.25));
  const COMBOS = [{ T: 230, v: 30 }, { T: 210, v: 50 }, { T: 190, v: 60 }];
  let Tc = 230, Lh = 0.20, v = 30;

  function refresh() {
    Tc = parseFloat(tempIn.value); Lh = parseFloat(lhIn.value); v = parseFloat(vIn.value);
    BP.put(valTemp, Tc.toFixed(0) + ' °C'); BP.put(valLh, Lh.toFixed(2) + ' mm'); BP.put(valV, v.toFixed(0) + ' mm/s');
    const db = Db(Lh, v, Tc), sig = db * SIGMA_BULK, tav = tAvail(Lh, v), trep = tRep(Tc);

    // Main plot: D_b vs print temperature (at current L_h, v)
    const F = BP.fit(cvNeck);
    const fr = BP.frame(F.ctx, F.w, F.h, {
      xMin: 190, xMax: 240, yMin: 0, yMax: 1, xTicks: 5, yTicks: 5, axisColor: '#1E40AF',
      xLabel: 'Print temperature  T  (°C)', yLabel: 'Bonding degree  D_b  (–)'
    });
    BP.shadeY(F.ctx, fr, 0.8, 1, 'rgba(21,128,61,0.10)');
    BP.hLine(F.ctx, fr, 0.8, '#94a3b8', 'isotropic  D_b ≥ 0.80');
    const pts = []; for (let T = 190; T <= 240.001; T += 1) pts.push({ x: T, y: Db(Lh, v, T) });
    BP.curve(F.ctx, fr, pts, '#E2570F', 2.6);
    BP.dot(F.ctx, fr, Tc, db, '#1E40AF', 'D_b = ' + db.toFixed(2));
    BP.legend(F.ctx, fr.pl + 14, fr.pt + 14, [{ color: '#E2570F', text: 'D_b = (t_avail/t_rep)^¼' }, { color: 'rgba(21,128,61,0.6)', text: 'isotropic window' }]);

    // Secondary: neck half-width growth vs diffusion time (∝ t^¼, capped at D_b)
    if (cvBond) {
      const G = BP.fit(cvBond);
      const gfr = BP.frame(G.ctx, G.w, G.h, { padB: 30, xMin: 0, xMax: Math.max(tav * 1.3, 0.004), yMin: 0, yMax: 1, xTicks: 5, yTicks: 4, axisColor: '#1E40AF', xLabel: 'Diffusion time  t  (s)', yLabel: 'Neck width / bulk (–)' });
      const gpts = []; const N = 120;
      for (let i = 0; i <= N; i++) { const t = gfr.xMax * i / N; gpts.push({ x: t, y: Math.min(1, Math.pow(t / trep, 0.25)) }); }
      BP.curve(G.ctx, gfr, gpts, '#1E40AF', 2.4);
      BP.vLine(G.ctx, gfr, tav, '#E2570F', 't_avail');
      BP.dot(G.ctx, gfr, tav, db, '#E2570F', db.toFixed(2));
    }

    // Table: 3 temp × speed combos → isotropy verdict
    const tb = document.querySelector('#neckTable tbody');
    if (tb) {
      tb.innerHTML = COMBOS.map((c) => {
        const d = Db(Lh, c.v, c.T), s = d * SIGMA_BULK, iso = d >= 0.8;
        const sel = Math.abs(c.T - Tc) < 0.5 && Math.abs(c.v - v) < 0.5;
        return '<tr style="' + (sel ? 'background:rgba(226,87,15,0.08);font-weight:700;' : '') + '"><td>' + c.T + ' °C · ' + c.v + ' mm/s</td><td>' + d.toFixed(2) + '</td><td>' + s.toFixed(1) + '</td><td style="text-align:right;color:' + (iso ? '#15803D' : '#B45309') + ';font-weight:600;">' + (iso ? 'isotropic' : 'anisotropic') + '</td></tr>';
      }).join('');
    }

    BP.put(document.getElementById('resTavail'), (tav * 1000).toFixed(2) + ' ms');
    BP.put(document.getElementById('resTrep'), (trep * 1000).toFixed(2) + ' ms');
    BP.put(document.getElementById('resDb'), db.toFixed(2), '#E2570F');
    BP.put(document.getElementById('resSigma'), sig.toFixed(1) + ' MPa', '#E2570F');
    BP.put(document.getElementById('resBulkPct'), (db * 100).toFixed(0) + ' % of bulk');

    const li = document.getElementById('liveInsight');
    if (li) li.innerHTML = '<strong>Live Insight:</strong> At <strong>' + Tc.toFixed(0) + ' °C</strong> the reptation time is ' + (trep * 1000).toFixed(1) + ' ms while the interface only has ' + (tav * 1000).toFixed(1) + ' ms to diffuse, giving D_b = <strong>' + db.toFixed(2) + '</strong> and a weld strength of <strong>' + sig.toFixed(1) + ' MPa</strong> (' + (db * 100).toFixed(0) + '% of the 47 MPa bulk). ' + (db >= 0.8 ? 'The layers are near-fully healed &mdash; the part reads as isotropic.' : 'The weld is incomplete &mdash; the part is anisotropic and weak across layers.');
    updateEq(tav, trep, db, sig);
  }
  function updateEq(tav, trep, db, sig) {
    const box = document.getElementById('eqBox'); if (!box) return;
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Diffusion time available:</strong> t_avail = L_h / v_print = ' + Lh.toFixed(2) + ' / ' + v.toFixed(0) + ' = ' + (tav * 1000).toFixed(2) + ' ms</div>' +
      '<div><strong>Reptation time (Arrhenius):</strong> t_rep = t₀·exp[Ea/R·(1/T − 1/T_ref)] = ' + (trep * 1000).toFixed(2) + ' ms &nbsp;(Ea = 60 kJ/mol, T_ref = 230 °C)</div>' +
      '<div><strong>Healing degree (¼-power law):</strong> D_b = min(1, (t_avail/t_rep)<sup>1/4</sup>) = ' + db.toFixed(2) + '</div>' +
      '<div><strong>Weld strength:</strong> σ_bond = D_b·σ_bulk = ' + db.toFixed(2) + '·47 = ' + sig.toFixed(1) + ' MPa</div>' +
      '<div style="color:#8b929b;font-size:0.92em;">Reptation chain interdiffusion, not surface-diffusion sintering — the source exponent is only qualitatively correct.</div></div>';
  }
  [tempIn, lhIn, vIn].forEach((el) => el && el.addEventListener('input', refresh));
  if (btnRun) btnRun.addEventListener('click', refresh);
  window.addEventListener('resize', () => refresh());
  if (btnRun) btnRun.addEventListener('click', () => BP.playA && BP.playA());

  // 3D SOLVER: cross-section of two stacked deposited roads (cylinders). A neck
  // between them grows over simulated diffusion time toward width ∝ D_b. Low D_b
  // leaves a visible crack/notch (translucent, un-fused). D_b→1 fully coalesces.
  LabGate.arm(function () {
  const V = BP.three('viewport3D');
  if (V) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.16, 2.4), new THREE.MeshStandardMaterial({ color: 0xe8eaee, roughness: 0.9 }));
    bed.position.y = -1.05; V.scene.add(bed);
    const ROAD_R = 0.62, GAP = ROAD_R * 0.92;
    const matBot = new THREE.MeshStandardMaterial({ color: 0x1E40AF, roughness: 0.5 });
    const matTop = new THREE.MeshStandardMaterial({ color: 0xE2570F, roughness: 0.5 });
    const roadBot = new THREE.Mesh(new THREE.CylinderGeometry(ROAD_R, ROAD_R, 3.2, 40), matBot);
    roadBot.rotation.z = Math.PI / 2; roadBot.position.set(0, -ROAD_R * 0.55, 0); V.scene.add(roadBot);
    const roadTop = new THREE.Mesh(new THREE.CylinderGeometry(ROAD_R, ROAD_R, 3.2, 40), matTop);
    roadTop.rotation.z = Math.PI / 2; roadTop.position.set(0, ROAD_R * 0.55, 0); V.scene.add(roadTop);
    // the neck: a growing box bridging the two roads at the interface
    const neckMat = new THREE.MeshStandardMaterial({ color: 0xE2570F, roughness: 0.5, transparent: true, opacity: 1 });
    const neck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.02, 0.1), neckMat);
    neck.position.set(0, 0, 0); V.scene.add(neck);
    // crack overlay (thin dark plane) shows the unhealed interface for low D_b
    const crackMat = new THREE.MeshBasicMaterial({ color: 0x101820, transparent: true, opacity: 0.0, side: THREE.DoubleSide });
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(3.2, ROAD_R * 1.4), crackMat);
    crack.rotation.x = -Math.PI / 2; crack.position.set(0, 0.001, 0); V.scene.add(crack);

    let simFrac = 0, playing = false;
    BP.playA = function () { simFrac = 0; playing = true; };
    const raf = () => {
      requestAnimationFrame(raf);
      const dbTarget = Db(Lh, v, Tc);
      if (playing) { simFrac += 1 / 90; if (simFrac >= 1) { simFrac = 1; playing = false; } }
      // neck half-width follows the ¼-power growth toward the computed D_b
      const dbNow = dbTarget * Math.pow(Math.min(1, simFrac), 0.25);
      const neckW = Math.max(0.02, dbNow * ROAD_R * 1.7);   // full width when D_b→1
      neck.scale.set(1, neckW / 0.02, 1);
      neck.material.color.setHex(dbTarget >= 0.8 ? 0xE2570F : 0xB45309);
      neck.material.opacity = 0.55 + 0.45 * dbNow;
      // roads pull together slightly as they coalesce
      const merge = dbNow;
      roadBot.position.y = -ROAD_R * 0.55 + ROAD_R * 0.18 * merge;
      roadTop.position.y = ROAD_R * 0.55 - ROAD_R * 0.18 * merge;
      // residual crack: strongly visible when weld is weak
      crackMat.opacity = Math.max(0, 0.85 * (1 - dbTarget)) * (0.4 + 0.6 * simFrac);
      const sl = document.getElementById('stateLabel');
      if (sl) sl.textContent = playing ? 'Diffusing… neck ' + (dbNow * 100).toFixed(0) + '%' : dbTarget >= 0.8 ? 'Fully coalesced weld (' + (dbTarget * 100).toFixed(0) + '%)' : 'Weak weld — crack remains (' + (dbTarget * 100).toFixed(0) + '%)';
      V.controls.update(); V.renderer.render(V.scene, V.camera);
    };
    raf();
  }
  refresh();
  });
})();

// ===========================================================================
// SUB-CALC B — CRYSTALLISATION DURING PRINTING  (guard: plotCanvasCryst)
//   τ_cool = m·Cp/(h·A) = ρ·d·Cp/(4·h_conv)   → T(t)=T_amb+(T_pr−T_amb)e^(−t/τ)
//   t_x = τ_cool·ln((T_m−T_amb)/(T_g−T_amb))   (dwell in T_g..T_m growth window)
//   X_c = X_c_max·(1 − e^(−(t_x/t_half)^n))    true Avrami form, X_c_max=0.45, T_g=60, T_m=170
//   E   = E_amorphous·(1 + k_stiff·X_c)
//   Calibrated: T_amb 25°C→X_c≈12%; chamber 50°C→X_c≈28%; E rises ≈24%.
// ===========================================================================
(function () {
  const cvC = document.getElementById('plotCanvasCryst');
  if (!cvC) return;
  const cvX = document.getElementById('plotCanvasXc');
  const tpIn = document.getElementById('tprintInput'), taIn = document.getElementById('tambInput'), dIn = document.getElementById('dInput');
  const valTp = document.getElementById('valTprint'), valTa = document.getElementById('valTamb'), valD = document.getElementById('valD');
  const btnRun = document.getElementById('btnRun');

  const RHO = 1240, CP = 1800, H0 = 40, DT_REF = 195;   // SI: kg/m³, J/kgK, W/m²K
  const TG = 60, TM = 170, XC_MAX = 0.45, T_HALF = 14.55, N_AVRAMI = 1.93, K_STIFF = 1.83, E_AMORPH = 2.0; // GPa
  const hConv = (Tp, Ta) => H0 * Math.pow(Math.max(0.2, (Tp - Ta) / DT_REF), 0.25);
  const tauCool = (d_mm, Tp, Ta) => RHO * (d_mm / 1000) * CP / (4 * hConv(Tp, Ta)); // s
  const tX = (tau, Ta) => {
    // floor (T_g − T_amb) at 5 °C: as ambient nears T_g the road never fully
    // exits the window, so dwell saturates smoothly instead of diverging.
    const num = Math.max(TM - Ta, 5), den = Math.max(TG - Ta, 5);
    return tau * Math.log(num / den);
  };
  // True Avrami kinetics (X_c = X_c_max(1 − e^(−(t_x/t_half)^n))): the prior n=1
  // (pure first-order) fit undershot the hot-chamber case because it can't match
  // both the 25 °C and 50 °C anchors with one time-constant. n≈1.93 (close to the
  // textbook spherulitic-growth exponent n=2) plus a retuned t_half hits both.
  const Xc = (d, Tp, Ta) => XC_MAX * (1 - Math.exp(-Math.pow(tX(tauCool(d, Tp, Ta), Ta) / T_HALF, N_AVRAMI)));
  const Emod = (xc) => E_AMORPH * (1 + K_STIFF * xc);
  const recovery = (xc) => Math.max(60, 95 - 55 * xc);   // % — crystalline domains pin the network
  let Tp = 220, Ta = 25, d = 0.40;

  function refresh() {
    Tp = parseFloat(tpIn.value); Ta = parseFloat(taIn.value); d = parseFloat(dIn.value);
    BP.put(valTp, Tp.toFixed(0) + ' °C'); BP.put(valTa, Ta.toFixed(0) + ' °C'); BP.put(valD, d.toFixed(2) + ' mm');
    const tau = tauCool(d, Tp, Ta), tx = tX(tau, Ta), xc = Xc(d, Tp, Ta), E = Emod(xc), rr = recovery(xc);

    // Main: T(t) cooling curve with T_g..T_m window shaded
    const F = BP.fit(cvC);
    const tMax = Math.max(tau * 5, 8);
    const fr = BP.frame(F.ctx, F.w, F.h, { xMin: 0, xMax: tMax, yMin: 20, yMax: 250, xTicks: 6, yTicks: 5, axisColor: '#1E40AF', xLabel: 'Time after deposit  t  (s)', yLabel: 'Road temperature  T  (°C)' });
    BP.shadeY(F.ctx, fr, TG, TM, 'rgba(226,87,15,0.10)');
    BP.hLine(F.ctx, fr, TM, '#94a3b8', 'T_m = 170 °C'); BP.hLine(F.ctx, fr, TG, '#94a3b8', 'T_g = 60 °C');
    const pts = []; for (let i = 0; i <= 200; i++) { const t = tMax * i / 200; pts.push({ x: t, y: Ta + (Tp - Ta) * Math.exp(-t / tau) }); }
    BP.curve(F.ctx, fr, pts, '#E2570F', 2.6);
    if (tx > 0 && (TG - Ta) > 0) BP.vLine(F.ctx, fr, tx, '#1E40AF', 't_x = ' + tx.toFixed(1) + ' s');

    // Secondary: X_c vs chamber temperature
    if (cvX) {
      const X = BP.fit(cvX);
      const xfr = BP.frame(X.ctx, X.w, X.h, { padB: 30, xMin: 20, xMax: 80, yMin: 0, yMax: 45, xTicks: 6, yTicks: 3, axisColor: '#1E40AF', xLabel: 'Chamber temperature  T_amb  (°C)', yLabel: 'X_c (%)' });
      const xpts = []; for (let TA = 20; TA <= 80; TA += 1) xpts.push({ x: TA, y: 100 * Xc(d, Tp, TA) });
      BP.curve(X.ctx, xfr, xpts, '#1E40AF', 2.4);
      BP.dot(X.ctx, xfr, Ta, 100 * xc, '#E2570F', (100 * xc).toFixed(0) + '%');
    }

    // Table: 3 chamber temps
    const tb = document.querySelector('#crystTable tbody');
    if (tb) {
      tb.innerHTML = [25, 50, 70].map((TA) => {
        const x = Xc(d, Tp, TA), E2 = Emod(x), r2 = recovery(x), sel = Math.abs(TA - Ta) < 0.5;
        return '<tr style="' + (sel ? 'background:rgba(226,87,15,0.08);font-weight:700;' : '') + '"><td>' + TA + ' °C</td><td>' + (100 * x).toFixed(0) + ' %</td><td>' + E2.toFixed(2) + '</td><td style="text-align:right;">' + r2.toFixed(0) + ' %</td></tr>';
      }).join('');
    }

    BP.put(document.getElementById('resTauCool'), tau.toFixed(2) + ' s');
    BP.put(document.getElementById('resTx'), tx.toFixed(2) + ' s');
    BP.put(document.getElementById('resXc'), (100 * xc).toFixed(0) + ' %', '#E2570F');
    BP.put(document.getElementById('resE'), E.toFixed(2) + ' GPa', '#E2570F');
    BP.put(document.getElementById('resRecoveryPenalty'), '−' + (95 - rr).toFixed(0) + ' % R_r → ' + rr.toFixed(0) + ' %');

    const li = document.getElementById('liveInsight');
    if (li) li.innerHTML = '<strong>Live Insight:</strong> The road cools with τ_cool = <strong>' + tau.toFixed(1) + ' s</strong> and lingers <strong>' + tx.toFixed(1) + ' s</strong> in the 60&ndash;170 °C growth window, reaching X_c = <strong>' + (100 * xc).toFixed(0) + '%</strong>. That stiffens it to <strong>' + E.toFixed(2) + ' GPa</strong> (+' + (100 * (E / E_AMORPH - 1)).toFixed(0) + '%) but pins the network, cutting shape-memory recovery to ' + rr.toFixed(0) + '%.';
    updateEq(tau, tx, xc, E);
  }
  function updateEq(tau, tx, xc, E) {
    const box = document.getElementById('eqBox'); if (!box) return;
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Newtonian cooling:</strong> τ_cool = ρ·d·Cp/(4·h_conv) = ' + tau.toFixed(2) + ' s;&nbsp; T(t) = T_amb + (T_pr−T_amb)e<sup>−t/τ</sup></div>' +
      '<div><strong>Dwell in growth window:</strong> t_x = τ_cool·ln[(T_m−T_amb)/(T_g−T_amb)] = ' + tx.toFixed(2) + ' s</div>' +
      '<div><strong>Crystallinity:</strong> X_c = X_c,max(1 − e<sup>−(t_x/t_half)^1.93</sup>) = ' + (100 * xc).toFixed(0) + ' % &nbsp;(X_c,max = 45%)</div>' +
      '<div><strong>Stiffening:</strong> E = E_amorphous(1 + 1.83·X_c) = ' + E.toFixed(2) + ' GPa</div>' +
      '<div style="color:#8b929b;font-size:0.92em;">h_conv scales with (ΔT)<sup>¼</sup> (natural convection); Avrami exponent n≈1.93 fit to the 25 °C/50 °C calibration anchors.</div></div>';
  }
  [tpIn, taIn, dIn].forEach((el) => el && el.addEventListener('input', refresh));
  if (btnRun) btnRun.addEventListener('click', refresh);
  window.addEventListener('resize', () => refresh());
  if (btnRun) btnRun.addEventListener('click', () => BP.playB && BP.playB());

  // 3D SOLVER: a deposited road cools (colour hot→cold along the real T(t)) and
  // spherulites nucleate & grow inside it; the on-screen crystallite volume
  // fraction equals the computed X_c. Slow cooling seeds many/large crystallites,
  // rapid cooling few. Gated by Run; settles at the computed X_c.
  LabGate.arm(function () {
  const V = BP.three('viewport3D');
  if (V) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, 2.6), new THREE.MeshStandardMaterial({ color: 0xe8eaee, roughness: 0.9 }));
    bed.position.y = -0.95; V.scene.add(bed);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0xff5a1f, roughness: 0.45, transparent: true, opacity: 0.55 });
    const road = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 3.4, 40), roadMat);
    road.rotation.z = Math.PI / 2; road.position.y = -0.15; V.scene.add(road);
    const spher = [];
    for (let i = 0; i < 40; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 12), new THREE.MeshStandardMaterial({ color: 0x14306e, roughness: 0.6 }));
      s.position.set((Math.random() - 0.5) * 3.0, -0.15 + (Math.random() - 0.5) * 1.1, (Math.random() - 0.5) * 1.1);
      s.userData.max = 0.14 + Math.random() * 0.16; s.scale.setScalar(0.001); s.visible = false; road.parent.add(s); V.scene.add(s); spher.push(s);
    }
    const hot = new THREE.Color(0xff5a1f), cold = new THREE.Color(0x2b3f66);
    let simT = 0, playing = false;
    BP.playB = function () { simT = 0; playing = true; };
    const raf = () => {
      requestAnimationFrame(raf);
      const tau = tauCool(d, Tp, Ta), xc = Xc(d, Tp, Ta);
      const animSpan = Math.max(tau * 5, 8);
      if (playing) { simT += (1 / 60) * (animSpan / 6); if (simT >= animSpan) { simT = animSpan; playing = false; } }
      const Tnow = Ta + (Tp - Ta) * Math.exp(-simT / tau);
      const coolFrac = Math.min(1, (Tp - Tnow) / Math.max(1, Tp - Ta));
      roadMat.color.lerpColors(hot, cold, coolFrac);
      // spherulite volume fraction on screen tracks X_c · progress
      const grown = xc * Math.min(1, simT / (animSpan * 0.9));
      const nShow = Math.round(spher.length * (grown / XC_MAX));
      spher.forEach((s, i) => {
        if (i < nShow) { s.visible = true; const sc = s.userData.max * Math.min(1, (simT) / (animSpan * 0.6)); s.scale.setScalar(Math.max(0.02, sc)); }
        else { s.visible = false; }
      });
      const sl = document.getElementById('stateLabel');
      if (sl) sl.textContent = playing ? 'Cooling ' + Tnow.toFixed(0) + ' °C · X_c ' + (100 * grown).toFixed(0) + '%' : 'Solidified · X_c = ' + (100 * xc).toFixed(0) + '%';
      V.controls.update(); V.renderer.render(V.scene, V.camera);
    };
    raf();
  }
  refresh();
  });
})();

// ===========================================================================
// SUB-CALC C — RESIDUAL STRESS & WARPAGE  (guard: plotCanvasWarp)
//   ε_mis = α·(T_print − T_bed)
//   σ_res = E·α·(T_print − T_bed)/(1 − ν)   ← constrained biaxial (/(1−ν), override)
//   δ_warp = C·ε_mis·L²/(2h)·f_relax(T_bed) (empirical constraint × relaxation)
//   Delamination when σ_res_eff > σ_bond (30 MPa reference).
//   α=70e-6/°C, E=3 GPa, ν=0.35. Calibrated: unheated δ≈2.8mm; 60°C bed δ≈0.6mm.
// ===========================================================================
(function () {
  const cvW = document.getElementById('plotCanvasWarp');
  if (!cvW) return;
  const cvS = document.getElementById('plotCanvasStress');
  const tpIn = document.getElementById('tprintInput'), tbIn = document.getElementById('tbedInput'), hIn = document.getElementById('hInput'), lIn = document.getElementById('lenInput');
  const valTp = document.getElementById('valTprint'), valTb = document.getElementById('valTbed'), valH = document.getElementById('valH'), valL = document.getElementById('valLen');
  const btnRun = document.getElementById('btnRun');

  const ALPHA = 70e-6, E_MOD = 3e9, NU = 0.35, SIGMA_BOND = 30e6; // SI
  const C_WARP = 0.023, T_STAR = 30.6;                            // empirical calibration
  const fRelax = (Tb) => Math.min(1, Math.exp(-(Tb - 20) / T_STAR));
  const eps = (Tp, Tb) => ALPHA * (Tp - Tb);
  const sigmaRes = (Tp, Tb) => E_MOD * ALPHA * (Tp - Tb) / (1 - NU) * fRelax(Tb);      // Pa (relaxed)
  const warp = (Tp, Tb, h, L) => C_WARP * eps(Tp, Tb) * (L * L) / (2 * h) * fRelax(Tb); // mm
  let Tp = 210, Tb = 25, h = 0.20, L = 60;

  function refresh() {
    Tp = parseFloat(tpIn.value); Tb = parseFloat(tbIn.value); h = parseFloat(hIn.value); L = parseFloat(lIn.value);
    BP.put(valTp, Tp.toFixed(0) + ' °C'); BP.put(valTb, Tb.toFixed(0) + ' °C'); BP.put(valH, h.toFixed(2) + ' mm'); BP.put(valL, L.toFixed(0) + ' mm');
    const e = eps(Tp, Tb), sr = sigmaRes(Tp, Tb), d = warp(Tp, Tb, h, L), delam = sr > SIGMA_BOND;
    const dNoBed = warp(Tp, 20, h, L);
    const reduction = dNoBed > 0 ? Math.max(0, 100 * (1 - d / dNoBed)) : 0;

    // Main: warpage δ vs bed temperature
    const F = BP.fit(cvW);
    const dMax = Math.max(warp(Tp, 20, h, L) * 1.15, 1);
    const fr = BP.frame(F.ctx, F.w, F.h, { xMin: 20, xMax: 80, yMin: 0, yMax: dMax, xTicks: 6, yTicks: 5, axisColor: '#1E40AF', xLabel: 'Bed temperature  T_bed  (°C)', yLabel: 'Corner warpage  δ  (mm)' });
    const pts = []; for (let tb2 = 20; tb2 <= 80; tb2 += 1) pts.push({ x: tb2, y: warp(Tp, tb2, h, L) });
    BP.curve(F.ctx, fr, pts, '#E2570F', 2.6);
    BP.dot(F.ctx, fr, Tb, d, '#1E40AF', d.toFixed(2) + ' mm');
    BP.legend(F.ctx, fr.pl + fr.w - 150, fr.pt + 12, [{ color: '#E2570F', text: 'δ = C·ε·L²/(2h)·f_relax' }]);

    // Secondary: σ_res vs bed temperature with bond limit
    if (cvS) {
      const S = BP.fit(cvS);
      const sMax = Math.max(sigmaRes(Tp, 20) / 1e6 * 1.1, 40);
      const sfr = BP.frame(S.ctx, S.w, S.h, { padB: 30, xMin: 20, xMax: 80, yMin: 0, yMax: sMax, xTicks: 6, yTicks: 4, axisColor: '#1E40AF', xLabel: 'Bed temperature  T_bed  (°C)', yLabel: 'σ_res (MPa)' });
      BP.hLine(S.ctx, sfr, SIGMA_BOND / 1e6, '#B42318', 'bond limit 30 MPa');
      const spts = []; for (let tb2 = 20; tb2 <= 80; tb2 += 1) spts.push({ x: tb2, y: sigmaRes(Tp, tb2) / 1e6 });
      BP.curve(S.ctx, sfr, spts, '#1E40AF', 2.4);
      BP.dot(S.ctx, sfr, Tb, sr / 1e6, '#E2570F', '');
    }

    // Table: 3 bed temps
    const tb = document.querySelector('#warpTable tbody');
    if (tb) {
      tb.innerHTML = [20, 40, 60].map((TB) => {
        const s2 = sigmaRes(Tp, TB), d2 = warp(Tp, TB, h, L), del2 = s2 > SIGMA_BOND, sel = Math.abs(TB - Tb) < 0.5;
        return '<tr style="' + (sel ? 'background:rgba(226,87,15,0.08);font-weight:700;' : '') + '"><td>' + TB + ' °C</td><td>' + (s2 / 1e6).toFixed(1) + '</td><td>' + d2.toFixed(2) + '</td><td style="text-align:right;color:' + (del2 ? '#B42318' : '#15803D') + ';font-weight:600;">' + (del2 ? 'DELAMINATED' : 'bonded') + '</td></tr>';
      }).join('');
    }

    BP.put(document.getElementById('resEps'), (100 * e).toFixed(2) + ' %');
    BP.put(document.getElementById('resSigmaRes'), (sr / 1e6).toFixed(1) + ' MPa', '#E2570F');
    BP.put(document.getElementById('resWarp'), d.toFixed(2) + ' mm', '#E2570F');
    BP.put(document.getElementById('resDelam'), delam ? 'DELAMINATED (>30 MPa)' : 'bonded (<30 MPa)', delam ? '#B42318' : '#15803D');
    BP.put(document.getElementById('resBedEffect'), reduction.toFixed(0) + ' % vs unheated');

    const li = document.getElementById('liveInsight');
    if (li) li.innerHTML = '<strong>Live Insight:</strong> Constrained cooling of ΔT = ' + (Tp - Tb).toFixed(0) + ' °C locks in σ_res = <strong>' + (sr / 1e6).toFixed(1) + ' MPa</strong> and curls the corners <strong>' + d.toFixed(2) + ' mm</strong>. ' + (delam ? 'That beats the 30 MPa inter-layer bond &mdash; <strong style="color:#B42318;">the plate peels off the bed.</strong>' : 'A ' + Tb.toFixed(0) + ' °C bed relaxes stress and cuts warpage ' + reduction.toFixed(0) + '% vs an unheated bed.');
    updateEq(e, sr, d);
  }
  function updateEq(e, sr, d) {
    const box = document.getElementById('eqBox'); if (!box) return;
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Mismatch strain:</strong> ε_mis = α·(T_print − T_bed) = ' + (100 * e).toFixed(2) + ' %</div>' +
      '<div><strong>Constrained residual stress:</strong> σ_res = E·α·ΔT/(1 − ν) = ' + (sr / 1e6).toFixed(1) + ' MPa &nbsp;(override: /(1−ν), not ×(1−ν))</div>' +
      '<div><strong>Corner warpage:</strong> δ = ε_mis·L²/(2h), curvature κ = ε/h = ' + d.toFixed(2) + ' mm (after constraint/relaxation)</div>' +
      '<div><strong>Delamination:</strong> σ_res &gt; σ_bond (30 MPa) ⇒ ' + (sr > SIGMA_BOND ? '<span style="color:#B42318;font-weight:700;">peels off bed</span>' : '<span style="color:#15803D;font-weight:700;">stays bonded</span>') + '</div>' +
      '<div style="color:#8b929b;font-size:0.92em;">Empirical constraint C and near-T_g relaxation f_relax calibrated to 2.8 mm unheated → 0.6 mm at 60 °C bed.</div></div>';
  }
  [tpIn, tbIn, hIn, lIn].forEach((el) => el && el.addEventListener('input', refresh));
  if (btnRun) btnRun.addEventListener('click', refresh);
  window.addEventListener('resize', () => refresh());
  if (btnRun) btnRun.addEventListener('click', () => BP.playC && BP.playC());

  // 3D SOLVER: a printed rectangular plate on the bed curls up at the corners
  // with the real computed curvature κ = ε/h. If σ_res > σ_bond the plate peels
  // free of the bed (lifts off) — a distinct failure state, not just more curl.
  LabGate.arm(function () {
  const V = BP.three('viewport3D');
  if (V) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 4), new THREE.MeshStandardMaterial({ color: 0xdfe2e6, roughness: 0.95 }));
    bed.position.y = -0.6; V.scene.add(bed);
    const PW = 3.4, PH = 2.4, segX = 40, segZ = 28;
    const geo = new THREE.PlaneGeometry(PW, PH, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xE2570F, roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide });
    const plate = new THREE.Mesh(geo, mat); plate.position.y = -0.49; V.scene.add(plate);
    const base = geo.attributes.position.array.slice();
    let simFrac = 0, playing = false;
    BP.playC = function () { simFrac = 0; playing = true; };
    const raf = () => {
      requestAnimationFrame(raf);
      const e = eps(Tp, Tb), sr = sigmaRes(Tp, Tb), delam = sr > SIGMA_BOND;
      const dWarp = warp(Tp, Tb, h, L);                 // mm
      if (playing) { simFrac += 1 / 100; if (simFrac >= 1) { simFrac = 1; playing = false; } }
      const amt = simFrac;
      // curl amplitude scaled from real warpage; corners rise most (∝ r²)
      const curlAmp = Math.min(1.5, dWarp / 2.8 * 1.2) * amt;
      const lift = delam ? 0.9 * amt : 0;               // whole plate peels off when bond fails
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x0 = base[i * 3], z0 = base[i * 3 + 2];
        const r2 = (x0 / (PW / 2)) * (x0 / (PW / 2)) + (z0 / (PH / 2)) * (z0 / (PH / 2));
        pos.setXYZ(i, x0, base[i * 3 + 1] + curlAmp * r2 + lift, z0);
      }
      pos.needsUpdate = true; geo.computeVertexNormals();
      plate.position.y = -0.49 + (delam ? lift * 0.25 : 0);
      mat.color.setHex(delam ? 0xB42318 : 0xE2570F);
      const sl = document.getElementById('stateLabel');
      if (sl) sl.textContent = playing ? 'Cooling & contracting…' : delam ? 'Delaminated — peeled off the bed' : dWarp > 0.4 ? 'Warped — corners curled ' + dWarp.toFixed(1) + ' mm' : 'Flat — stays on the bed';
      V.controls.update(); V.renderer.render(V.scene, V.camera);
    };
    raf();
  }
  refresh();
  });
})();

// ===========================================================================
// SUB-CALC D — PRINT ANISOTROPY (RASTER ANGLE)  (guard: plotCanvasAniso)
//   Tsai-Hill off-axis strength (unidirectional lamina):
//     σ_θ = [cos⁴θ/σ_L² + (1/τ_LT² − 1/σ_L²)sin²θcos²θ + sin⁴θ/σ_T²]^(−1/2)
//   σ_L along road, σ_T across inter-road bond (from A), τ_LT shear.
//   AR = σ_L/σ_T > 1 always for FDM; strength minimum near θ ≈ 45–55° (PLA ~53°).
// ===========================================================================
(function () {
  const cvA = document.getElementById('plotCanvasAniso');
  if (!cvA) return;
  const cvP = document.getElementById('plotCanvasPolar');
  const thIn = document.getElementById('thetaInput'), loadIn = document.getElementById('loadInput');
  const valTh = document.getElementById('valTheta'), valLoad = document.getElementById('valLoad');
  const btnRun = document.getElementById('btnRun');
  const MATS = {
    PLA:  { sL: 47, sT: 24, tLT: 11.7, c: '#1E40AF' },
    ABS:  { sL: 35, sT: 14, tLT: 8.0,  c: '#B45309' },
    PETG: { sL: 50, sT: 28, tLT: 14.0, c: '#15803D' }
  };
  const sigTheta = (th, M) => {
    const r = th * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    const inv2 = Math.pow(c, 4) / (M.sL * M.sL) + (1 / (M.tLT * M.tLT) - 1 / (M.sL * M.sL)) * s * s * c * c + Math.pow(s, 4) / (M.sT * M.sT);
    return 1 / Math.sqrt(inv2);
  };
  const thetaMin = (M) => { let best = 0, bv = 1e9; for (let t = 0; t <= 90; t += 0.5) { const v = sigTheta(t, M); if (v < bv) { bv = v; best = t; } } return { th: best, sig: bv }; };
  let theta = 45, load = 25, mat = 'PLA';

  function refresh() {
    theta = parseFloat(thIn.value); load = parseFloat(loadIn.value);
    const sel = document.querySelector('input[name="mat"]:checked'); mat = sel ? sel.value : 'PLA';
    const M = MATS[mat];
    BP.put(valTh, theta.toFixed(0) + ' °'); BP.put(valLoad, load.toFixed(0) + ' MPa');
    const sTh = sigTheta(theta, M), AR = M.sL / M.sT, tm = thetaMin(M);

    // Cartesian σ(θ)
    const F = BP.fit(cvA);
    const fr = BP.frame(F.ctx, F.w, F.h, { padB: 40, xMin: 0, xMax: 90, yMin: 0, yMax: M.sL * 1.1, xTicks: 6, yTicks: 5, axisColor: '#1E40AF', xLabel: 'Raster angle  θ  (°)', yLabel: 'Strength  σ_θ  (MPa)' });
    BP.hLine(F.ctx, fr, load, '#B42318', 'applied ' + load.toFixed(0) + ' MPa');
    const pts = []; for (let t = 0; t <= 90; t += 1) pts.push({ x: t, y: sigTheta(t, M) });
    BP.curve(F.ctx, fr, pts, M.c, 2.6);
    BP.vLine(F.ctx, fr, tm.th, '#E2570F', 'θ_min ' + tm.th.toFixed(0) + '°');
    BP.dot(F.ctx, fr, theta, sTh, '#E2570F', sTh.toFixed(0));

    // Polar plot of σ(θ) — drawn manually (quarter sweep mirrored)
    if (cvP) {
      const P = BP.fit(cvP); const ctx = P.ctx, W = P.w, H = P.h;
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H - 22, Rmax = Math.max(8, Math.min(W / 2 - 20, H - 40)), sMaxP = M.sL;
      // radial grid rings
      ctx.strokeStyle = '#eef1f4'; ctx.lineWidth = 1;
      [0.25, 0.5, 0.75, 1].forEach((f) => { ctx.beginPath(); ctx.arc(cx, cy, Rmax * f, Math.PI, 2 * Math.PI); ctx.stroke(); });
      ctx.strokeStyle = '#e4e4de';
      [0, 45, 90].forEach((a) => { const rad = Math.PI + a * Math.PI / 180; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Rmax * Math.cos(rad), cy + Rmax * Math.sin(rad)); ctx.stroke(); });
      // σ(θ) curve
      ctx.strokeStyle = M.c; ctx.lineWidth = 2.6; ctx.beginPath();
      for (let a = 0; a <= 90; a += 1) { const rr = sigTheta(a, M) / sMaxP * Rmax; const rad = Math.PI + a * Math.PI / 180; const X = cx + rr * Math.cos(rad), Y = cy + rr * Math.sin(rad); a === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
      ctx.stroke();
      // current θ marker
      const rrC = sTh / sMaxP * Rmax, radC = Math.PI + theta * Math.PI / 180;
      ctx.fillStyle = '#E2570F'; ctx.beginPath(); ctx.arc(cx + rrC * Math.cos(radC), cy + rrC * Math.sin(radC), 4.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#8b929b'; ctx.font = '10px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('0° (along road)', cx + Rmax - 14, cy + 4); ctx.textAlign = 'left'; ctx.fillText('90°', cx - Rmax, cy + 4);
      ctx.fillStyle = '#55606f'; ctx.font = '600 10px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText('σ_θ (MPa), radius = ' + sMaxP + ' MPa full-scale', cx, 4);
    }

    // Table 0/45/90
    const tb = document.querySelector('#anisoTable tbody');
    if (tb) {
      tb.innerHTML = [0, 45, 90].map((t) => {
        const s = sigTheta(t, M), ok = s >= load, sel = Math.abs(t - theta) < 0.5;
        return '<tr style="' + (sel ? 'background:rgba(226,87,15,0.08);font-weight:700;' : '') + '"><td>' + t + ' °</td><td>' + s.toFixed(1) + '</td><td>' + load.toFixed(0) + ' MPa</td><td style="text-align:right;color:' + (ok ? '#15803D' : '#B42318') + ';font-weight:600;">' + (ok ? 'survives' : 'FRACTURES') + '</td></tr>';
      }).join('');
    }

    BP.put(document.getElementById('resSigmaTheta'), sTh.toFixed(1) + ' MPa', sTh >= load ? '#15803D' : '#B42318');
    BP.put(document.getElementById('resSigmaL'), M.sL.toFixed(0) + ' MPa');
    BP.put(document.getElementById('resSigmaT'), M.sT.toFixed(0) + ' MPa');
    BP.put(document.getElementById('resAR'), AR.toFixed(2));
    BP.put(document.getElementById('resThetaMin'), tm.th.toFixed(0) + ' ° (' + tm.sig.toFixed(1) + ' MPa)', '#E2570F');

    const li = document.getElementById('liveInsight');
    if (li) li.innerHTML = '<strong>Live Insight:</strong> ' + mat + ' is ' + AR.toFixed(1) + '× stronger along the road (σ_L = ' + M.sL + ' MPa) than across it (σ_T = ' + M.sT + ' MPa). At θ = ' + theta.toFixed(0) + '° the off-axis strength is <strong>' + sTh.toFixed(1) + ' MPa</strong>, ' + (sTh >= load ? 'above' : 'below') + ' the ' + load.toFixed(0) + ' MPa load. The weakest angle is <strong>θ_min = ' + tm.th.toFixed(0) + '°</strong> — where roads shear apart, not at 90°.';
    updateEq(sTh, AR, tm);
  }
  function updateEq(sTh, AR, tm) {
    const box = document.getElementById('eqBox'); if (!box) return;
    const M = MATS[mat];
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Tsai-Hill off-axis:</strong> σ_θ = [cos⁴θ/σ_L² + (1/τ_LT² − 1/σ_L²)sin²θcos²θ + sin⁴θ/σ_T²]<sup>−½</sup></div>' +
      '<div><strong>Lamina strengths:</strong> σ_L = ' + M.sL + ', σ_T = ' + M.sT + ', τ_LT = ' + M.tLT + ' MPa &nbsp;(' + mat + ')</div>' +
      '<div><strong>Anisotropy ratio:</strong> AR = σ_L/σ_T = ' + AR.toFixed(2) + ' &nbsp;(&gt; 1 for all FDM)</div>' +
      '<div><strong>Weakest plane:</strong> θ_min = ' + tm.th.toFixed(0) + '° ⇒ σ = ' + tm.sig.toFixed(1) + ' MPa &nbsp;(shear-dominated, not 90°)</div>' +
      '<div style="color:#8b929b;font-size:0.92em;">σ_T inherits the inter-road weld strength from sub-calc A; idealised unidirectional lamina.</div></div>';
  }
  [thIn, loadIn].forEach((el) => el && el.addEventListener('input', refresh));
  document.querySelectorAll('input[name="mat"]').forEach((r) => r.addEventListener('change', refresh));
  if (btnRun) btnRun.addEventListener('click', refresh);
  window.addEventListener('resize', () => refresh());
  if (btnRun) btnRun.addEventListener('click', () => BP.playD && BP.playD());

  // 3D SOLVER: a tensile bar with visible raster lines at angle θ. On Run the
  // applied load ramps; where σ_applied ≥ σ_θ the bar fractures along the road
  // interfaces (a plane at angle θ). At 0° the roads carry load (survives high
  // load); near θ_min it shears apart at low load. Failure is drawn from physics.
  LabGate.arm(function () {
  const V = BP.three('viewport3D');
  if (V) {
    const barMat = new THREE.MeshStandardMaterial({ color: 0x1E40AF, roughness: 0.5 });
    const barGeo = new THREE.BoxGeometry(1.1, 3, 0.5);
    const half1 = new THREE.Mesh(barGeo.clone(), barMat.clone());
    const half2 = new THREE.Mesh(barGeo.clone(), barMat.clone());
    // Represent as two halves that separate along the fracture plane
    const grp = new THREE.Group(); V.scene.add(grp);
    grp.add(half1); grp.add(half2);
    // raster lines drawn as thin tubes on the front face
    const rasterGrp = new THREE.Group(); grp.add(rasterGrp);
    function buildRaster(th) {
      rasterGrp.children.slice().forEach((c) => { rasterGrp.remove(c); c.geometry.dispose(); c.material.dispose(); });
      const rad = th * Math.PI / 180, m = new THREE.MeshStandardMaterial({ color: 0x9fb4d8, roughness: 0.6 });
      for (let i = -5; i <= 5; i++) {
        const line = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.2, 8), m.clone());
        line.rotation.z = rad; line.position.set(i * 0.18, 0, 0.26);
        rasterGrp.add(line);
      }
    }
    let simFrac = 0, playing = false, fractured = false;
    BP.playD = function () { simFrac = 0; playing = true; fractured = false; };
    const raf = () => {
      requestAnimationFrame(raf);
      const M = MATS[mat]; const sTh = sigTheta(theta, M);
      buildRaster(theta);
      if (playing) {
        simFrac += 1 / 90;
        const applied = load * Math.min(1, simFrac);   // ramp load to the slider value
        if (!fractured && applied >= sTh) fractured = true;
        if (simFrac >= 1) playing = false;
      }
      const willFracture = load >= sTh;
      const sep = fractured ? Math.min(0.7, (simFrac) * 0.7) : 0;
      // fracture plane inclined at θ: offset the two halves apart perpendicular to load
      const rad = theta * Math.PI / 180;
      half1.position.set(-sep * Math.cos(rad), sep * 0.4, 0);
      half2.position.set(sep * Math.cos(rad), -sep * 0.4, 0);
      half1.rotation.z = -sep * 0.2; half2.rotation.z = sep * 0.2;
      const col = fractured ? 0xB42318 : (willFracture ? 0xE2570F : 0x1E40AF);
      half1.material.color.setHex(col); half2.material.color.setHex(col);
      // stretch slightly under load before failure
      const strain = playing && !fractured ? 1 + 0.04 * simFrac : 1;
      grp.scale.set(1, strain, 1);
      const sl = document.getElementById('stateLabel');
      if (sl) sl.textContent = fractured ? 'Fractured along θ = ' + theta.toFixed(0) + '° plane (σ_θ = ' + sTh.toFixed(0) + ' MPa)' : playing ? 'Pulling… ' + (load * Math.min(1, simFrac)).toFixed(0) + ' / ' + sTh.toFixed(0) + ' MPa' : willFracture ? 'Will fail: load ≥ σ_θ' : 'Holds: σ_θ = ' + sTh.toFixed(0) + ' MPa > load';
      V.controls.update(); V.renderer.render(V.scene, V.camera);
    };
    raf();
  }
  refresh();
  });
})();

// ===========================================================================
// SUB-CALC E — DIMENSIONAL ACCURACY & TOLERANCE STACK-UP  (guard: plotCanvasCpk)
//   δ_mean = k_shrink·L·ΔT_cool           (systematic shrinkage, ΔT_cool fixed)
//   σ_proc = k_vib·v_print + k_temp·ΔT_nozzle   (random process spread)
//   Stack of 3 features: δ_RSS = √(δ1²+δ2²+δ3²)  vs  δ_WC = δ1+δ2+δ3
//   Cpk = (USL − μ)/(3σ_proc); target ≥ 1.33. Flag RSS-capable-but-WC-not.
//   2-D process-distribution viewport (no THREE): bell curve vs USL/LSL.
// ===========================================================================
(function () {
  const cvCpk = document.getElementById('plotCanvasCpk');
  if (!cvCpk) return;
  const cvDist = document.getElementById('distCanvas');
  const cvStack = document.getElementById('plotCanvasStack');
  const vIn = document.getElementById('vInput'), dtnIn = document.getElementById('dtnInput'), lIn = document.getElementById('lenInput'), uslIn = document.getElementById('uslInput');
  const valV = document.getElementById('valV'), valDtn = document.getElementById('valDtn'), valL = document.getElementById('valLen'), valUsl = document.getElementById('valUsl');
  const btnRun = document.getElementById('btnRun');

  const K_SHRINK = 1.62e-5, DT_COOL = 185, K_VIB = 5e-4, K_TEMP = 3e-3; // SI-ish, mm
  const FEAT = [1.0, 0.6, 1.4];        // three feature length multipliers
  const CPK_TARGET = 1.33;
  const dMean = (L) => K_SHRINK * L * DT_COOL;                 // mm
  const sProc = (v, dtn) => K_VIB * v + K_TEMP * dtn;          // mm
  let v = 60, dtn = 5, L = 30, USL = 0.25;

  function refresh() {
    v = parseFloat(vIn.value); dtn = parseFloat(dtnIn.value); L = parseFloat(lIn.value); USL = parseFloat(uslIn.value);
    BP.put(valV, v.toFixed(0) + ' mm/s'); BP.put(valDtn, dtn.toFixed(1) + ' °C'); BP.put(valL, L.toFixed(0) + ' mm'); BP.put(valUsl, USL.toFixed(2) + ' mm');
    const mu = dMean(L), sig = sProc(v, dtn);
    const di = FEAT.map((f) => dMean(L * f));
    const dRSS = Math.sqrt(di.reduce((a, b) => a + b * b, 0));
    const dWC = di.reduce((a, b) => a + b, 0);
    const cpk = (USL - mu) / (3 * sig);
    const cpkRSS = (USL - dRSS) / (3 * Math.sqrt(3) * sig);
    const cpkWC = (USL - dWC) / (3 * 3 * sig);
    const flag = cpkRSS >= CPK_TARGET && cpkWC < CPK_TARGET;

    // Left: process-distribution bell curve vs USL/LSL (LSL = −USL about nominal 0)
    if (cvDist) {
      const D = BP.fit(cvDist);
      const xW = Math.max(USL * 1.6, mu + 4 * sig, 0.2);
      const dfr = BP.frame(D.ctx, D.w, D.h, { padB: 44, xMin: -xW, xMax: xW, yMin: 0, yMax: 1.08, xTicks: 6, yTicks: 4, axisColor: '#1E40AF', xLabel: 'Dimensional error  x  (mm)', yLabel: 'Probability density (norm.)' });
      const pk = 1;
      const gauss = (x) => Math.exp(-0.5 * Math.pow((x - mu) / sig, 2));
      // shade out-of-spec tails
      D.ctx.fillStyle = 'rgba(180,35,24,0.16)';
      for (let x = -xW; x <= xW; x += (2 * xW) / 240) {
        if (x < -USL || x > USL) { const X = dfr.gx(x), Y = dfr.gy(pk * gauss(x)); D.ctx.fillRect(X, Y, Math.max(1, dfr.w / 240 + 1), dfr.gy(0) - Y); }
      }
      const gpts = []; for (let x = -xW; x <= xW; x += (2 * xW) / 240) gpts.push({ x, y: pk * gauss(x) });
      BP.curve(D.ctx, dfr, gpts, '#E2570F', 2.6);
      BP.vLine(D.ctx, dfr, -USL, '#B42318', 'LSL'); BP.vLine(D.ctx, dfr, USL, '#B42318', 'USL');
      BP.vLine(D.ctx, dfr, mu, '#1E40AF', 'μ');
    }

    // Right-top: Cpk vs process σ (guard canvas)
    const F = BP.fit(cvCpk);
    const sMax = Math.max(sig * 2.2, 0.08);
    const fr = BP.frame(F.ctx, F.w, F.h, { xMin: 0.005, xMax: sMax, yMin: 0, yMax: 3, xTicks: 5, yTicks: 6, axisColor: '#1E40AF', xLabel: 'Process σ_proc  (mm)', yLabel: 'Capability  Cpk  (–)' });
    BP.shadeY(F.ctx, fr, CPK_TARGET, 3, 'rgba(21,128,61,0.10)');
    BP.hLine(F.ctx, fr, CPK_TARGET, '#94a3b8', 'target Cpk ≥ 1.33');
    const cpts = []; for (let s = 0.005; s <= sMax; s += sMax / 160) cpts.push({ x: s, y: Math.max(0, (USL - mu) / (3 * s)) });
    BP.curve(F.ctx, fr, cpts, '#E2570F', 2.6);
    BP.dot(F.ctx, fr, sig, Math.max(0, Math.min(3, cpk)), '#1E40AF', 'Cpk ' + cpk.toFixed(2));

    // Right-bottom: RSS vs WC stack deviation bars
    if (cvStack) {
      const S = BP.fit(cvStack); const ctx = S.ctx, W = S.w, H = S.h;
      const sfr = BP.frame(ctx, W, H, { padB: 34, xMin: 0, xMax: 3, yMin: 0, yMax: Math.max(dWC * 1.25, USL * 1.25, 0.1), xTicks: 3, yTicks: 4, axisColor: '#1E40AF', xLabel: 'stack model', yLabel: 'Deviation (mm)' });
      BP.hLine(ctx, sfr, USL, '#B42318', 'USL ' + USL.toFixed(2));
      const bar = (cx, val, col, lbl) => {
        const bw = sfr.w * 0.18; const X = sfr.gx(cx); const Y = sfr.gy(val); const Y0 = sfr.gy(0);
        ctx.fillStyle = col; ctx.fillRect(X - bw / 2, Y, bw, Y0 - Y);
        ctx.fillStyle = '#55606f'; ctx.font = '600 10px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(lbl, X, Y - 3);
      };
      bar(1, dRSS, '#1E40AF', 'RSS ' + dRSS.toFixed(3));
      bar(2, dWC, '#E2570F', 'WC ' + dWC.toFixed(3));
    }

    // Table: RSS vs WC
    const tb = document.querySelector('#cpkTable tbody');
    if (tb) {
      const rows = [
        ['RSS (independent)', dRSS, cpkRSS],
        ['Worst-case (correlated)', dWC, cpkWC]
      ];
      tb.innerHTML = rows.map((r) => {
        const ok = r[2] >= CPK_TARGET;
        return '<tr><td>' + r[0] + '</td><td>' + r[1].toFixed(3) + '</td><td>' + r[2].toFixed(2) + '</td><td style="text-align:right;color:' + (ok ? '#15803D' : '#B42318') + ';font-weight:600;">' + (ok ? 'CAPABLE' : 'not capable') + '</td></tr>';
      }).join('');
    }

    BP.put(document.getElementById('resDeltaMean'), (1000 * mu).toFixed(0) + ' µm');
    BP.put(document.getElementById('resSigmaProc'), (1000 * sig).toFixed(0) + ' µm');
    BP.put(document.getElementById('resRSS'), (1000 * dRSS).toFixed(0) + ' µm');
    BP.put(document.getElementById('resWC'), (1000 * dWC).toFixed(0) + ' µm');
    BP.put(document.getElementById('resCpk'), cpk.toFixed(2) + (cpk >= CPK_TARGET ? '  PASS' : '  FAIL'), cpk >= CPK_TARGET ? '#15803D' : '#B42318');

    const li = document.getElementById('liveInsight');
    if (li) {
      if (flag) li.innerHTML = '<strong>⚠ Contradiction flagged:</strong> RSS says the stack is capable (Cpk = ' + cpkRSS.toFixed(2) + ') but the worst-case bound is <strong>' + cpkWC.toFixed(2) + '</strong> &lt; 1.33. In 4D printing the thermal/vibration errors are correlated, so <strong>worst-case is the honest verdict — not capable.</strong>';
      else li.innerHTML = '<strong>Live Insight:</strong> Mean shrinkage shifts the feature ' + (1000 * mu).toFixed(0) + ' µm with σ_proc = <strong>' + (1000 * sig).toFixed(0) + ' µm</strong>, giving Cpk = <strong>' + cpk.toFixed(2) + '</strong> (' + (cpk >= CPK_TARGET ? 'capable' : 'not capable') + '). The three-feature stack is ' + (1000 * dRSS).toFixed(0) + ' µm by RSS vs ' + (1000 * dWC).toFixed(0) + ' µm worst-case.';
    }
    updateEq(mu, sig, dRSS, dWC, cpk);
  }
  function updateEq(mu, sig, dRSS, dWC, cpk) {
    const box = document.getElementById('eqBox'); if (!box) return;
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Systematic shrinkage:</strong> δ_mean = k_shrink·L·ΔT_cool = ' + (1000 * mu).toFixed(0) + ' µm</div>' +
      '<div><strong>Random spread:</strong> σ_proc = k_vib·v + k_temp·ΔT_nozzle = ' + (1000 * sig).toFixed(0) + ' µm</div>' +
      '<div><strong>Stack-up:</strong> δ_RSS = √(δ₁²+δ₂²+δ₃²) = ' + (1000 * dRSS).toFixed(0) + ' µm &nbsp;vs&nbsp; δ_WC = Σδᵢ = ' + (1000 * dWC).toFixed(0) + ' µm</div>' +
      '<div><strong>Capability:</strong> Cpk = (USL − μ)/(3σ_proc) = ' + cpk.toFixed(2) + ' &nbsp;(target ≥ 1.33)</div>' +
      '<div style="color:#8b929b;font-size:0.92em;">RSS assumes independent errors; correlated 4D errors ⇒ worst-case is the honest bound.</div></div>';
  }
  [vIn, dtnIn, lIn, uslIn].forEach((el) => el && el.addEventListener('input', refresh));
  if (btnRun) btnRun.addEventListener('click', refresh);
  window.addEventListener('resize', () => refresh());
  LabGate.arm(function () {
    refresh();
  });
})();
