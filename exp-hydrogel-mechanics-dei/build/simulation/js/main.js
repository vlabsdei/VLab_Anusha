/* global THREE */
// ============================================================
// Combined simulator script for Exp 4 - Hydrogel Mechanics
// Five sub-calculators, one per page, selected by a unique
// canvas id present only on that page. Each module provides:
//   - rigorous physics (Flory-Rehner, Donnan, LCST, rubber
//     elasticity, Korsmeyer-Peppas) solved live
//   - an animated Three.js scene that physically responds
//   - publication-grade 2D plots (grids, shaded regimes,
//     reference lines, legends, linked live trackers)
//   - a play/pause timeline that sweeps the independent variable
//   - live governing-equation substitution + comparison tables
// ============================================================

// ============================================================
// SHARED 2D-PLOT + 3D-SCENE TOOLKIT (namespace HG)
// ============================================================
const HG = {};

// Build a plot frame: clear, paint background, draw grid + axes +
// tick labels + rotated axis titles. Returns mapping helpers.
HG.frame = function (ctx, W, H, o) {
    const pl = o.padL != null ? o.padL : 52;
    const pr = o.padR != null ? o.padR : 16;
    const pt = o.padT != null ? o.padT : 18;
    const pb = o.padB != null ? o.padB : 30;
    const w = W - pl - pr, h = H - pt - pb;
    const xMin = o.xMin, xMax = o.xMax, yMin = o.yMin, yMax = o.yMax;
    const gx = (x) => pl + (x - xMin) / (xMax - xMin) * w;
    const gy = (y) => pt + h - (y - yMin) / (yMax - yMin) * h;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = o.bg || '#ffffff';
    ctx.fillRect(0, 0, W, H);
    const nx = o.xTicks || 6, ny = o.yTicks || 5;
    ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 1;
    for (let i = 0; i <= nx; i++) { const x = pl + i / nx * w; ctx.beginPath(); ctx.moveTo(x, pt); ctx.lineTo(x, pt + h); ctx.stroke(); }
    for (let i = 0; i <= ny; i++) { const y = pt + i / ny * h; ctx.beginPath(); ctx.moveTo(pl, y); ctx.lineTo(pl + w, y); ctx.stroke(); }
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(pl, pt); ctx.lineTo(pl, pt + h); ctx.lineTo(pl + w, pt + h); ctx.stroke();
    ctx.fillStyle = '#475569'; ctx.font = '9px sans-serif';
    const xFmt = o.xFmt || ((v) => Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));
    const yFmt = o.yFmt || ((v) => Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));
    ctx.textAlign = 'center';
    for (let i = 0; i <= nx; i++) { const v = xMin + i / nx * (xMax - xMin); ctx.fillText(xFmt(v), pl + i / nx * w, pt + h + 12); }
    ctx.textAlign = 'right';
    for (let i = 0; i <= ny; i++) { const v = yMin + i / ny * (yMax - yMin); ctx.fillText(yFmt(v), pl - 5, pt + h - i / ny * h + 3); }
    if (o.xLabel) { ctx.fillStyle = o.axisColor || '#334155'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(o.xLabel, pl + w / 2, H - 3); }
    if (o.yLabel) { ctx.save(); ctx.translate(12, pt + h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillStyle = o.axisColor || '#334155'; ctx.font = 'bold 10px sans-serif'; ctx.fillText(o.yLabel, 0, 0); ctx.restore(); }
    return { gx, gy, pl, pr, pt, pb, w, h, xMin, xMax, yMin, yMax };
};

// Shade a vertical band [x1,x2]; optional diagonal hatching.
HG.shadeX = function (ctx, fr, x1, x2, color, hatch) {
    const a = fr.gx(Math.max(x1, fr.xMin)), b = fr.gx(Math.min(x2, fr.xMax));
    ctx.fillStyle = color; ctx.fillRect(a, fr.pt, b - a, fr.h);
    if (hatch) {
        ctx.save(); ctx.beginPath(); ctx.rect(a, fr.pt, b - a, fr.h); ctx.clip();
        ctx.strokeStyle = hatch; ctx.lineWidth = 1;
        for (let off = a - fr.h; off < b + fr.h; off += 11) { ctx.beginPath(); ctx.moveTo(off, fr.pt); ctx.lineTo(off + fr.h, fr.pt + fr.h); ctx.stroke(); }
        ctx.restore();
    }
};
HG.shadeYBand = function (ctx, fr, y1, y2, color) {
    const a = fr.gy(Math.min(y2, fr.yMax)), b = fr.gy(Math.max(y1, fr.yMin));
    ctx.fillStyle = color; ctx.fillRect(fr.pl, a, fr.w, b - a);
};
// Dashed vertical / horizontal reference lines with optional label.
HG.vLine = function (ctx, fr, x, color, label, top) {
    const px = fr.gx(x);
    ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(px, fr.pt); ctx.lineTo(px, fr.pt + fr.h); ctx.stroke(); ctx.setLineDash([]);
    if (label) { ctx.fillStyle = color; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(label, px + 3, fr.pt + (top || 9)); }
};
HG.hLine = function (ctx, fr, y, color, label) {
    const py = fr.gy(y);
    ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(fr.pl, py); ctx.lineTo(fr.pl + fr.w, py); ctx.stroke(); ctx.setLineDash([]);
    if (label) { ctx.fillStyle = color; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'right'; ctx.fillText(label, fr.pl + fr.w - 2, py - 3); }
};
// Plot a polyline from [{x,y}] clamped into the frame.
HG.curve = function (ctx, fr, pts, color, width) {
    ctx.strokeStyle = color; ctx.lineWidth = width || 2.4; ctx.beginPath();
    let started = false;
    pts.forEach((p) => {
        if (p == null || isNaN(p.y)) { started = false; return; }
        const x = fr.gx(p.x), y = fr.gy(Math.max(fr.yMin, Math.min(fr.yMax, p.y)));
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    });
    ctx.stroke();
};
// Live tracker dot with a faint linking vertical line + value label.
HG.tracker = function (ctx, fr, x, y, label, color) {
    const px = fr.gx(x), py = fr.gy(Math.max(fr.yMin, Math.min(fr.yMax, y)));
    ctx.strokeStyle = 'rgba(239,68,68,0.28)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, fr.pt); ctx.lineTo(px, fr.pt + fr.h); ctx.stroke();
    ctx.fillStyle = color || '#ef4444'; ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    if (label) { const right = x > (fr.xMin + fr.xMax) / 2; ctx.fillStyle = color || '#ef4444'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = right ? 'right' : 'left'; ctx.fillText(label, px + (right ? -8 : 8), py - 7); }
};
// Compact legend box.
HG.legend = function (ctx, x, y, items) {
    const wb = 156, hb = 11 + items.length * 13;
    ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.fillRect(x, y, wb, hb);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; ctx.strokeRect(x, y, wb, hb);
    items.forEach((it, i) => {
        const yy = y + 11 + i * 13;
        ctx.strokeStyle = it.color; ctx.lineWidth = 2.5;
        if (it.dash) ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(x + 8, yy - 3); ctx.lineTo(x + 24, yy - 3); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#475569'; ctx.font = '8px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(it.text, x + 30, yy);
    });
};

// Standard lit scene (camera, renderer, OrbitControls, lights, ground-less).
HG.scene3D = function (containerId, camPos) {
    const c = document.getElementById(containerId);
    if (!c) return null;
    c.innerHTML = '';
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF4F5F3);
    const camera = new THREE.PerspectiveCamera(45, c.clientWidth / c.clientHeight, 0.1, 100);
    camera.position.set(camPos[0], camPos[1], camPos[2]);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(c.clientWidth, c.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    c.appendChild(renderer.domElement);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.06;
    controls.minDistance = 1.5; controls.maxDistance = 9;
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const d = new THREE.DirectionalLight(0xffffff, 0.6); d.position.set(5, 9, 6);
    d.castShadow = true; d.shadow.mapSize.width = 1024; d.shadow.mapSize.height = 1024; scene.add(d);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.16); d2.position.set(-5, 3, -6); scene.add(d2);
    const onResize = () => {
        if (!renderer) return;
        camera.aspect = c.clientWidth / c.clientHeight; camera.updateProjectionMatrix();
        renderer.setSize(c.clientWidth, c.clientHeight);
    };
    window.addEventListener('resize', onResize);
    return { container: c, scene, camera, renderer, controls };
};
// Orient a unit-height cylinder so it spans v1->v2.
HG.placeCyl = function (cyl, v1, v2) {
    const dir = new THREE.Vector3().subVectors(v2, v1);
    const len = dir.length();
    cyl.scale.set(1, Math.max(len, 1e-4), 1);
    cyl.position.copy(v1).add(v2).multiplyScalar(0.5);
    if (len > 1e-6) cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
};
// Translucent solvent bath box with edge outline.
HG.bathBox = function (scene, sx, sy, sz, color) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: color || 0x60a5fa, transparent: true, opacity: 0.06, roughness: 0.1, transmission: 0.7, thickness: 0.2, side: THREE.DoubleSide }));
    scene.add(m);
    scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0xcbd5e1 })));
    return m;
};
// Lerp two hex colors -> THREE.Color.
HG.mix = function (a, b, t) { return new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t))); };
// Color a result span and set text.
HG.put = function (el, txt, color) { if (!el) return; el.innerText = txt; if (color) el.style.color = color; };

// ============================================================
// SUB-CALC A : THE SELF-FOLDING GRIPPER (FLORY-REHNER SWELLING)
// (Page check: document.getElementById('plotCanvasFR'))
// A flat-printed hydrogel gripper swells in water and curls its
// fingers shut. Rigorous Flory-Rehner sets the swelling ratio Q;
// Q drives a bilayer-curl fold angle. Pick a recipe that closes it.
// ============================================================
(function () {
    if (!document.getElementById('plotCanvasFR')) return;

    // ---------- UI refs ----------
    const xlinkInput = document.getElementById('xlinkInput');
    const valXlink = document.getElementById('valXlink');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotFR = document.getElementById('plotCanvasFR');
    const ctxFR = plotFR.getContext('2d');
    const plotFold = document.getElementById('plotCanvasConv');
    const ctxFold = plotFold.getContext('2d');
    const resMat = document.getElementById('resMat');
    const resQ = document.getElementById('resQ');
    const resWater = document.getElementById('resWater');
    const resFold = document.getElementById('resFold');
    const resState = document.getElementById('resState');
    const matBody = document.querySelector('#matTable tbody');
    const formula = document.getElementById('frFormulaContainer');

    const MATERIALS = [
        { name: 'Alginate', chi: 0.40 }, { name: 'PEG-DA', chi: 0.45 },
        { name: 'PNIPAM', chi: 0.48 }, { name: 'pHEMA', chi: 0.55 }
    ];
    const nameOf = (c) => { const m = MATERIALS.find((x) => Math.abs(x.chi - c) < 1e-6); return m ? m.name : 'custom'; };

    // ---------- physics: Flory-Rehner (rigorous, damped Newton + bracket) ----------
    const floryF = (vp, c, r) => Math.log(1 - vp) + vp + c * vp * vp + r * (Math.pow(vp, 1 / 3) - vp / 2);
    const floryFp = (vp, c, r) => -1 / (1 - vp) + 1 + 2 * c * vp + r * ((1 / 3) * Math.pow(vp, -2 / 3) - 0.5);
    function solveVp(c, r) {
        let lo = 1e-5, hi = 0.999, vp = 0.05;
        for (let i = 0; i < 40; i++) { const f = floryF(vp, c, r); if (f > 0) lo = vp; else hi = vp; if (Math.abs(f) < 1e-10) break; const fp = floryFp(vp, c, r); let nx = vp - f / fp; if (!isFinite(nx) || nx <= lo || nx >= hi) nx = 0.5 * (lo + hi); vp = nx; }
        return vp;
    }
    const Qof = (c, r) => 1 / solveVp(c, r);
    // swelling -> finger fold: a printed bilayer curls with the linear swelling strain
    const foldAngle = (Q) => Math.min(180, 90 * (Math.pow(Math.max(Q, 1), 1 / 3) - 1));
    function gripState(a) { return a < 30 ? { t: 'Open (stays flat)', c: '#b45309' } : a < 110 ? { t: 'Partially curling', c: '#b45309' } : a < 160 ? { t: 'Grips the object', c: '#16a34a' } : { t: 'Fully closed', c: '#16a34a' }; }

    // ---------- state ----------
    let chi = 0.40, r = parseFloat(xlinkInput.value);
    let Q = Qof(chi, r), foldT = foldAngle(Q);
    let poseProg = 0, swollenness = 0;                          // material equilibrium: wrap fraction + swell amount
    let animP = 0, swelling = false, animClock = 0, tAnim = 0;  // animP: 0 flat/dry -> 1 swollen + wrapped

    // ---------- Three.js: flat printed gripper that swells, curls, and grips a ball ----------
    let S = null, hub, object, fingers = [], bubbles = [];
    const NF = 4, NB = 10, RB = 0.42, BALLY = -0.05, FLEN = 1.15, BETA1 = 1.95;
    const BALL = new THREE.Vector3(0, BALLY, 0);
    const DIRS = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, -1)];
    function init3D() {
        S = HG.scene3D('viewport3D', [2.9, 2.2, 3.7]);
        if (!S) return;
        HG.bathBox(S.scene, 3.6, 3.0, 3.6, 0x38bdf8);
        const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.05, 40), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 }));
        floor.position.y = BALLY - RB - 0.1; floor.receiveShadow = true; S.scene.add(floor);
        hub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.14, 28), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.5 }));
        hub.position.y = BALLY - RB; hub.castShadow = true; S.scene.add(hub);
        object = new THREE.Mesh(new THREE.SphereGeometry(RB, 28, 28), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.1, emissive: 0x7c2d12, emissiveIntensity: 0.15 }));
        object.position.copy(BALL); object.castShadow = true; S.scene.add(object);
        const jg = new THREE.SphereGeometry(0.06, 12, 12), cg = new THREE.CylinderGeometry(0.06, 0.06, 1, 10);
        for (let f = 0; f < NF; f++) {
            const joints = [], segs = [];
            for (let i = 0; i <= NB; i++) { const m = new THREE.Mesh(jg, new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 })); m.castShadow = true; S.scene.add(m); joints.push(m); }
            for (let i = 0; i < NB; i++) { const m = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 })); m.castShadow = true; S.scene.add(m); segs.push(m); }
            fingers.push({ dir: DIRS[f], joints: joints, segs: segs, pts: [] });
        }
        const bg = new THREE.SphereGeometry(0.04, 8, 8), bm = new THREE.MeshStandardMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.4 });
        for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(bg, bm.clone()); m.visible = false; S.scene.add(m); bubbles.push({ mesh: m, x: (Math.random() - 0.5) * 2.4, z: (Math.random() - 0.5) * 2.4, ph: Math.random() * 1.8, spd: 0.4 + Math.random() * 0.5 }); }
    }
    // open pose  = finger lies flat, splayed radially out at the ball's equator
    // closed pose = finger wraps the ball surface from equator up over the top -> grips it
    function update3D() {
        if (!S) return;
        const pf = Math.min(animP * poseProg, 1);          // 0 open/flat -> 1 fully wrapped
        const sw = animP * swollenness;                    // 0 dry -> 1 swollen
        const col = HG.mix(0xe2e8f0, 0x1E40AF, sw);        // pale dry -> swollen blue
        const thick = 0.85 + 0.9 * sw;                     // gel fattens as it soaks up water
        const yhat = new THREE.Vector3(0, 1, 0);
        fingers.forEach((fg) => {
            const d = fg.dir, Lopen = FLEN * (0.8 + 0.4 * sw), gap = 0.05 + 0.07 * sw;
            for (let i = 0; i <= NB; i++) {
                const s = i / NB;
                const op = BALL.clone().addScaledVector(d, RB + gap + s * Lopen);    // flat, splayed outward
                const beta = s * BETA1;
                const cl = BALL.clone().addScaledVector(d, (RB + gap) * Math.cos(beta)).addScaledVector(yhat, (RB + gap) * Math.sin(beta)); // hugs the ball surface
                const p = new THREE.Vector3().lerpVectors(op, cl, pf);
                fg.pts[i] = p;
                fg.joints[i].position.copy(p); fg.joints[i].material.color.copy(col); fg.joints[i].scale.setScalar(thick);
            }
            fg.segs.forEach((seg, i) => { HG.placeCyl(seg, fg.pts[i], fg.pts[i + 1]); seg.material.color.copy(col); seg.scale.x = thick; seg.scale.z = thick; });
        });
        const gripped = pf > 0.7;
        object.material.emissiveIntensity = gripped ? 0.55 : 0.15;
        object.material.color.set(gripped ? 0xfb923c : 0xf59e0b);
        bubbles.forEach((b) => { const yy = (BALLY - RB) + ((tAnim * b.spd + b.ph) % 1.8); b.mesh.position.set(b.x, yy, b.z); b.mesh.visible = sw > 0.05; b.mesh.material.opacity = 0.35 * sw; });
    }

    // ---------- plots ----------
    function drawSwell() {
        const W = plotFR.width, H = plotFR.height;
        let qMax = 5; const pts = [];
        for (let c = 0.35; c <= 0.6001; c += 0.005) { const q = Qof(c, r); pts.push({ x: c, y: q }); if (q < 60 && q > qMax) qMax = q; }
        qMax = Math.min(Math.ceil(qMax / 10) * 10, 60);
        const fr = HG.frame(ctxFR, W, H, { xMin: 0.35, xMax: 0.6, yMin: 0, yMax: qMax, xTicks: 5, yTicks: 5, xLabel: 'Solvent affinity  chi  (lower = loves water)', yLabel: 'Swelling ratio Q', axisColor: '#E2570F', xFmt: (v) => v.toFixed(2), yFmt: (v) => v.toFixed(0) });
        HG.curve(ctxFR, fr, pts, '#E2570F', 2.6);
        MATERIALS.forEach((m) => { if (m.chi >= 0.35 && m.chi <= 0.6) { const q = Qof(m.chi, r); ctxFR.fillStyle = '#94a3b8'; ctxFR.beginPath(); ctxFR.arc(fr.gx(m.chi), fr.gy(Math.min(q, qMax)), 3, 0, 7); ctxFR.fill(); } });
        HG.tracker(ctxFR, fr, chi, Math.min(Q, qMax), nameOf(chi) + ' Q=' + Q.toFixed(1), '#ef4444');
        HG.legend(ctxFR, fr.pl + fr.w - 158, fr.pt + 6, [{ color: '#E2570F', text: 'Swelling vs material' }, { color: '#ef4444', text: 'Your material' }]);
    }
    function drawFold() {
        const W = plotFold.width, H = plotFold.height;
        const pts = [];
        for (let q = 1; q <= 30.001; q += 0.5) pts.push({ x: q, y: foldAngle(q) });
        const fr = HG.frame(ctxFold, W, H, { padT: 14, padB: 26, xMin: 1, xMax: 30, yMin: 0, yMax: 180, xTicks: 6, yTicks: 6, xLabel: 'Swelling ratio Q', yLabel: 'Fold angle (deg)', axisColor: '#1E40AF', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
        HG.hLine(ctxFold, fr, 160, '#16a34a', 'fully closed');
        HG.curve(ctxFold, fr, pts, '#1E40AF', 2.4);
        HG.tracker(ctxFold, fr, Math.min(Q, 30), foldT, foldT.toFixed(0) + ' deg', '#ef4444');
    }
    function fillTable() {
        if (!matBody) return;
        matBody.innerHTML = MATERIALS.map((m) => { const q = Qof(m.chi, r), g = gripState(foldAngle(q)), sel = Math.abs(m.chi - chi) < 1e-6; return '<tr style="' + (sel ? 'background:rgba(138,17,52,0.08);font-weight:bold;' : '') + '"><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;">' + m.name + ' (' + m.chi.toFixed(2) + ')</td><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;">' + q.toFixed(1) + '</td><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;text-align:right;color:' + g.c + ';font-weight:700;">' + g.t.split(' ')[0] + '</td></tr>'; }).join('');
    }
    function updateEq() {
        const vp = 1 / Q;
        formula.innerHTML = '<div style="line-height:1.7;color:#1e293b;font-size:15px;font-weight:bold;">' +
            '<div><strong>Step 1 - how much it swells (Flory-Rehner):</strong> ln(1-v<sub>p</sub>) + v<sub>p</sub> + &chi;v<sub>p</sub><sup>2</sup> + (V<sub>1</sub>/V<sub>e</sub>)(v<sub>p</sub><sup>1/3</sup> - v<sub>p</sub>/2) = 0</div>' +
            '<div style="margin-left:18px;font-style:italic;color:#475569;font-size:0.95em;">&chi; = ' + chi.toFixed(2) + ' (' + nameOf(chi) + '), crosslink = ' + r.toFixed(4) + ' &rArr; v<sub>p</sub> = ' + vp.toFixed(3) + ', so Q = 1/v<sub>p</sub> = ' + Q.toFixed(1) + '</div>' +
            '<div style="margin-top:6px;"><strong>Step 2 - how far it folds:</strong> a printed bilayer curls with the swelling strain; fold &asymp; 90&deg;&middot;(Q<sup>1/3</sup> - 1) = ' + foldT.toFixed(0) + '&deg;</div></div>';
    }
    function refresh() {
        Q = Qof(chi, r); foldT = foldAngle(Q);
        poseProg = Math.min(foldT / 180, 1); swollenness = Math.min((Q - 1) / 28, 1);
        const g = gripState(foldT), vp = 1 / Q;
        HG.put(resMat, nameOf(chi) + ' (' + chi.toFixed(2) + ')');
        HG.put(resQ, Q.toFixed(1) + ' x', '#E2570F');
        HG.put(resWater, ((1 - vp) * 100).toFixed(0) + '% water');
        HG.put(resFold, foldT.toFixed(0) + ' deg', g.c);
        HG.put(resState, g.t, g.c);
        if (!swelling) { const shown = animP > 0.5; stateLabel.innerText = shown ? 'Gripper: ' + g.t : 'Gripper: flat (just printed, dry)'; stateLabel.style.background = shown ? '#dbeafe' : '#f1f5f9'; stateLabel.style.color = shown ? '#1e40af' : '#475569'; }
        liveInsight.innerHTML = '<strong>Live Insight:</strong> In water the ' + nameOf(chi) + ' gripper swells to ' + Q.toFixed(1) + 'x its dry volume (' + ((1 - vp) * 100).toFixed(0) + '% water), curling each finger to ' + foldT.toFixed(0) + ' deg. ' +
            (foldT >= 160 ? 'That fully <strong>closes on the object</strong> - a working motor-free soft gripper.' : (foldT >= 110 ? 'The fingers curl enough to <strong>grip</strong>, but not fully close.' : (foldT >= 40 ? 'The fingers only partly curl - choose a more water-loving material or looser crosslinking.' : 'The gripper barely moves - this recipe is too water-shy or too tightly crosslinked.'))) +
            ' <em>Design rule: more swelling (lower &chi;, looser print) = tighter fold.</em>';
        drawSwell(); drawFold(); fillTable(); updateEq();
    }

    // ---------- submerge animation ----------
    function startRun() { if (swelling) { stopRun(); return; } swelling = true; animClock = 0; animP = 0; btnRun.innerText = 'Pause'; btnRun.style.background = '#475569'; stateLabel.innerText = 'Gripper: soaking up water...'; stateLabel.style.background = '#dbeafe'; stateLabel.style.color = '#1e40af'; }
    function stopRun(done) { swelling = false; btnRun.innerText = 'Submerge in Water'; btnRun.style.background = '#E2570F'; if (done) { animP = 1; const nx = document.getElementById('btnNextCalc'); if (nx) nx.style.display = 'block'; } refresh(); }

    // ---------- events ----------
    document.querySelectorAll('input[name="mat"]').forEach((rd) => rd.addEventListener('change', () => { if (swelling) stopRun(); chi = parseFloat(document.querySelector('input[name="mat"]:checked').value); animP = 1; refresh(); }));
    xlinkInput.addEventListener('input', () => { if (swelling) stopRun(); r = parseFloat(xlinkInput.value); valXlink.innerText = (r < 0.004 ? 'loose' : r < 0.007 ? 'medium' : 'tight') + ' (' + r.toFixed(4) + ')'; animP = 1; refresh(); });
    btnRun.addEventListener('click', startRun);

    // ---------- render loop ----------
    let last = performance.now();
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.05); last = now; tAnim += dt;
        if (swelling) { animClock += dt; animP = Math.min(animClock / 3.0, 1); if (animClock > 3.2) stopRun(true); }
        update3D();
        if (S) { S.controls.update(); S.renderer.render(S.scene, S.camera); }
    }

    // ---------- init ----------
    init3D();
    valXlink.innerText = 'loose (' + r.toFixed(4) + ')';
    animP = 0;              // starts flat & dry - click 'Submerge in Water' to swell + close
    refresh();
    requestAnimationFrame(loop);
})();

// ============================================================
// SUB-CALC B : pH-RESPONSIVE SWELLING (DONNAN EQUILIBRIUM)
// (Page check: document.getElementById('plotCanvasPH'))
// ============================================================
(function () {
    if (!document.getElementById('plotCanvasPH')) return;

    // ---------- UI refs ----------
    const fionInput = document.getElementById('fionInput');
    const phInput = document.getElementById('phInput');
    const valFion = document.getElementById('valFion');
    const valPh = document.getElementById('valPh');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotPH = document.getElementById('plotCanvasPH');
    const ctxPH = plotPH.getContext('2d');
    const plotA = document.getElementById('plotCanvasAlpha');
    const ctxA = plotA.getContext('2d');
    const resMat = document.getElementById('resMat');
    const resAlpha = document.getElementById('resAlpha');
    const resQ = document.getElementById('resQ');
    const resOpenPh = document.getElementById('resOpenPh');
    const resRelease = document.getElementById('resRelease');
    const resWindow = document.getElementById('resWindow');
    const capsuleBody = document.querySelector('#capsuleTable tbody');
    const formula = document.getElementById('phFormulaContainer');

    const Q_NEUTRAL = 3.0;       // shell swelling when fully sealed (non-ionic)
    const BETA = 30;             // Donnan osmotic amplification factor
    const PH_MIN = 1, PH_MAX = 8;
    const POLYS = [{ name: 'PMAA', pKa: 4.3 }, { name: 'PAA', pKa: 4.8 }, { name: 'Custom', pKa: 6.0 }];
    const nameOfPka = (p) => { const m = POLYS.find((x) => Math.abs(x.pKa - p) < 1e-6); return m ? m.name : 'custom'; };
    const locationOf = (p) => p < 3.5 ? 'stomach acid' : p < 6 ? 'duodenum' : 'small intestine';

    // ---------- physics: ionisation (Henderson-Hasselbalch) + Donnan swelling ----------
    const alphaOf = (pH, pKa) => 1 / (1 + Math.pow(10, pKa - pH));                            // degree of ionisation
    const Qof = (pH, pKa, fi) => Q_NEUTRAL * Math.pow(1 + BETA * alphaOf(pH, pKa) * fi, 0.6);  // Donnan-driven swelling
    // opening fraction = swelling normalised between sealed (pH 1) and fully open (pH 8)
    const openFracOf = (pH, pKa, fi) => {
        const qLo = Qof(PH_MIN, pKa, fi), qHi = Qof(PH_MAX, pKa, fi);
        return Math.max(0, Math.min(1, (Qof(pH, pKa, fi) - qLo) / Math.max(qHi - qLo, 1e-9)));
    };
    // 10/50/90% opening window (opening monotonic in pH)
    function transitionWindow(pKa, fi) {
        const qLo = Qof(PH_MIN, pKa, fi), qHi = Qof(PH_MAX, pKa, fi), span = Math.max(qHi - qLo, 1e-9);
        const of = (p) => (Qof(p, pKa, fi) - qLo) / span;
        const find = (frac) => { for (let p = PH_MIN; p <= PH_MAX; p += 0.01) if (of(p) >= frac) return p; return PH_MAX; };
        const p10 = find(0.1), p50 = find(0.5), p90 = find(0.9);
        return { p10: p10, p50: p50, p90: p90, width: p90 - p10 };
    }
    // where in the gut does it open, judged by the opening pH (p50)
    function siteOf(p50) {
        if (p50 < 3.5) return { txt: 'Stomach (too early)', c: '#dc2626', ok: false };
        if (p50 < 5.0) return { txt: 'Upper intestine', c: '#16a34a', ok: true };
        if (p50 <= 7.4) return { txt: 'Intestine', c: '#16a34a', ok: true };
        return { txt: 'Stays shut', c: '#b45309', ok: false };
    }

    let pKa = 4.8, fion = parseFloat(fionInput.value), pH = parseFloat(phInput.value);
    let dispOpen = 0, targOpen = 0, sweeping = false, tAnim = 0;

    // ---------- Three.js: a two-piece capsule that swells open and spills drug beads ----------
    let S = null, topHalf, botHalf, shellMatTop, shellMatBot, beads = [];
    const R = 0.62, LC = 1.0, GAP = 0.85, NB = 40;
    function init3D() {
        S = HG.scene3D('viewport3D', [2.8, 1.7, 3.9]);
        if (!S) return;
        HG.bathBox(S.scene, 3.4, 3.8, 3.4, 0x60a5fa);
        shellMatTop = new THREE.MeshPhysicalMaterial({ color: 0x9ca3af, roughness: 0.35, transmission: 0.2, transparent: true, opacity: 0.72, thickness: 0.4, side: THREE.DoubleSide });
        shellMatBot = shellMatTop.clone();
        // top half = upper hemisphere cap + upper half of the body tube
        topHalf = new THREE.Group();
        const tc = new THREE.Mesh(new THREE.CylinderGeometry(R, R, LC / 2, 36, 1, true), shellMatTop);
        tc.position.y = LC / 4;
        const tcap = new THREE.Mesh(new THREE.SphereGeometry(R, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), shellMatTop);
        tcap.position.y = LC / 2;
        topHalf.add(tc, tcap); S.scene.add(topHalf);
        // bottom half mirrors it
        botHalf = new THREE.Group();
        const bc = new THREE.Mesh(new THREE.CylinderGeometry(R, R, LC / 2, 36, 1, true), shellMatBot);
        bc.position.y = -LC / 4;
        const bcap = new THREE.Mesh(new THREE.SphereGeometry(R, 36, 18, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), shellMatBot);
        bcap.position.y = -LC / 2;
        botHalf.add(bc, bcap); S.scene.add(botHalf);
        // drug beads packed inside the capsule
        const dGeom = new THREE.SphereGeometry(0.085, 12, 12);
        for (let i = 0; i < NB; i++) {
            const rr = R * 0.62 * Math.cbrt(Math.random()), th = Math.random() * Math.PI * 2;
            const home = new THREE.Vector3(Math.cos(th) * rr, (Math.random() - 0.5) * (LC + R * 0.6), Math.sin(th) * rr);
            const outDir = new THREE.Vector3(Math.cos(th), 0.2 + Math.random() * 0.5, Math.sin(th)).normalize();
            const out = home.clone().add(outDir.multiplyScalar(1.3 + Math.random() * 1.0));
            const m = new THREE.Mesh(dGeom, new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3, emissive: 0xB8410F, emissiveIntensity: 0.25 }));
            S.scene.add(m); beads.push({ mesh: m, home: home, out: out, ph: Math.random() * 6.28 });
        }
    }
    function update3D() {
        if (!S) return;
        const op = dispOpen;                            // 0 sealed -> 1 fully open
        topHalf.position.y = op * GAP;
        botHalf.position.y = -op * GAP;
        const col = HG.mix(0x9ca3af, 0x34d399, op);     // grey (sealed) -> green (swollen, open)
        shellMatTop.color.copy(col); shellMatBot.color.copy(col);
        shellMatTop.opacity = shellMatBot.opacity = 0.72 - 0.25 * op;
        const released = Math.floor(op * NB);
        beads.forEach((b, i) => {
            const j = Math.sin(tAnim * 4 + b.ph) * 0.02;
            if (i < released) {                          // escaped beads drift outward and fade
                b.mesh.position.lerpVectors(b.home, b.out, 0.4 + 0.6 * op);
                b.mesh.material.opacity = Math.max(0.2, 0.85 - 0.5 * op); b.mesh.material.transparent = true;
                b.mesh.material.color.set(0xfda4af);
            } else {
                b.mesh.position.set(b.home.x + j, b.home.y + j * 0.6, b.home.z + j * 0.4);
                b.mesh.material.opacity = 1; b.mesh.material.transparent = false; b.mesh.material.color.set(0xf43f5e);
            }
        });
    }

    // ---------- plots ----------
    function drawOpenPlot() {
        const W = plotPH.width, H = plotPH.height;
        const pts = [];
        for (let p = PH_MIN; p <= PH_MAX + 1e-6; p += 0.05) pts.push({ x: p, y: openFracOf(p, pKa, fion) * 100 });
        const fr = HG.frame(ctxPH, W, H, { xMin: PH_MIN, xMax: PH_MAX, yMin: 0, yMax: 100, xTicks: 7, yTicks: 5, xLabel: 'Surrounding pH  (stomach acid -> intestine)', yLabel: 'Capsule open (%)', axisColor: '#E2570F', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
        HG.shadeX(ctxPH, fr, 1, 3.5, 'rgba(245,158,11,0.12)');      // stomach acid zone
        HG.shadeX(ctxPH, fr, 6, 7.4, 'rgba(34,197,94,0.12)');       // intestine zone
        const tw = transitionWindow(pKa, fion);
        HG.vLine(ctxPH, fr, tw.p50, '#3E5A82', 'opens');
        HG.hLine(ctxPH, fr, 50, '#cbd5e1', '');
        HG.curve(ctxPH, fr, pts, '#E2570F', 2.6);
        const op = openFracOf(pH, pKa, fion) * 100;
        HG.tracker(ctxPH, fr, pH, op, op.toFixed(0) + '% open', '#ef4444');
        HG.legend(ctxPH, fr.pl + 8, fr.pt + fr.h - 49, [
            { color: '#f59e0b', text: 'Stomach: keep shut' },
            { color: '#22c55e', text: 'Intestine: open here' },
            { color: '#3E5A82', dash: true, text: 'Opening pH' }
        ]);
    }
    function drawAlphaPlot() {
        const W = plotA.width, H = plotA.height;
        const pts = [];
        for (let p = PH_MIN; p <= PH_MAX + 1e-6; p += 0.05) pts.push({ x: p, y: alphaOf(p, pKa) });
        const fr = HG.frame(ctxA, W, H, { padT: 14, padB: 26, xMin: PH_MIN, xMax: PH_MAX, yMin: 0, yMax: 1, xTicks: 7, yTicks: 5, xLabel: 'pH', yLabel: 'Shell charge (fraction)', axisColor: '#1E40AF', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(1) });
        HG.vLine(ctxA, fr, pKa, '#f59e0b', 'pKa');
        HG.hLine(ctxA, fr, 0.5, '#cbd5e1', 'half');
        HG.curve(ctxA, fr, pts, '#1E40AF', 2.4);
        HG.tracker(ctxA, fr, pH, alphaOf(pH, pKa), alphaOf(pH, pKa).toFixed(2), '#ef4444');
    }
    function fillTable() {
        if (!capsuleBody) return;
        capsuleBody.innerHTML = POLYS.map((m) => {
            const tw = transitionWindow(m.pKa, fion), site = siteOf(tw.p50), sel = Math.abs(m.pKa - pKa) < 1e-6;
            return '<tr style="' + (sel ? 'background:rgba(138,17,52,0.08);font-weight:bold;' : '') + '"><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;">' + m.name + ' (' + m.pKa.toFixed(1) + ')</td><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;">' + tw.p50.toFixed(1) + '</td><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;text-align:right;color:' + site.c + ';font-weight:700;">' + site.txt.split(' ')[0] + '</td></tr>';
        }).join('');
    }
    function updateEq() {
        const a = alphaOf(pH, pKa), Q = Qof(pH, pKa, fion), op = openFracOf(pH, pKa, fion);
        formula.innerHTML = '<div style="line-height:1.7;color:#1e293b;font-size:15px;font-weight:bold;">' +
            '<div><strong>Step 1 - how charged the shell is:</strong> &alpha; = 1/(1+10<sup>(pKa-pH)</sup>)</div>' +
            '<div style="margin-left:18px;font-style:italic;color:#475569;font-size:0.95em;">pKa = ' + pKa.toFixed(1) + ', pH = ' + pH.toFixed(1) + ' &rArr; &alpha; = ' + a.toFixed(3) + '</div>' +
            '<div style="margin-top:6px;"><strong>Step 2 - how much it swells (Donnan):</strong> Q = Q<sub>0</sub>(1 + &beta;&middot;&alpha;&middot;f<sub>ion</sub>)<sup>3/5</sup> = ' + Q.toFixed(2) + ', i.e. the capsule is ' + (op * 100).toFixed(0) + '% open</div></div>';
    }
    function refresh() {
        const a = alphaOf(pH, pKa), Q = Qof(pH, pKa, fion), op = openFracOf(pH, pKa, fion);
        if (!sweeping) targOpen = op;
        const tw = transitionWindow(pKa, fion), site = siteOf(tw.p50);
        HG.put(resMat, nameOfPka(pKa) + ' (pKa ' + pKa.toFixed(1) + ')');
        HG.put(resAlpha, (a * 100).toFixed(0) + '% (a=' + a.toFixed(2) + ')', a > 0.5 ? '#16a34a' : '#b45309');
        HG.put(resQ, Q.toFixed(1) + ' x', '#E2570F');
        HG.put(resOpenPh, 'pH ' + tw.p50.toFixed(1), site.c);
        HG.put(resRelease, site.txt, site.c);
        HG.put(resWindow, 'pH ' + tw.p10.toFixed(1) + ' - ' + tw.p90.toFixed(1));
        if (!sweeping) {
            const open = op > 0.5;
            stateLabel.innerText = 'Capsule: ' + (op < 0.15 ? 'sealed' : op < 0.6 ? 'starting to open' : 'open - releasing') + ' (' + locationOf(pH) + ')';
            stateLabel.style.background = open ? '#dcfce7' : '#fef3c7';
            stateLabel.style.color = open ? '#166534' : '#92400e';
        }
        liveInsight.innerHTML = '<strong>Live Insight:</strong> At pH ' + pH.toFixed(1) + ' (' + locationOf(pH) + ') the ' + nameOfPka(pKa) + ' shell is ' + (a * 100).toFixed(0) + '% charged and ' + (op * 100).toFixed(0) + '% open. ' +
            (site.ok ? 'It stays sealed in stomach acid and springs open in the <strong>intestine</strong> - drug delivered on target.' : (site.txt.indexOf('Stomach') >= 0 ? 'It already opens in <strong>stomach acid</strong> - the dose is lost too early; choose a higher pKa.' : 'It barely opens even in the intestine - add more acid groups or pick a lower pKa.')) +
            ' <em>Design rule: the capsule opens once pH climbs past its pKa, so choose the pKa to match the target organ.</em>';
        drawOpenPlot(); drawAlphaPlot(); fillTable(); updateEq();
    }

    // ---------- swallow -> stomach -> intestine journey ----------
    function startRun() {
        if (sweeping) { stopRun(); return; }
        sweeping = true; pH = PH_MIN; phInput.value = pH; valPh.innerText = pH.toFixed(1);
        btnRun.innerText = 'Pause'; btnRun.style.background = '#475569';
    }
    function stopRun(done) {
        sweeping = false; btnRun.innerText = 'Swallow the Capsule'; btnRun.style.background = '#E2570F';
        if (done) { const nx = document.getElementById('btnNextCalc'); if (nx) nx.style.display = 'block'; }
        refresh();
    }
    function stepRun(dt) {
        pH += dt * 1.1;
        if (pH >= PH_MAX) { pH = PH_MAX; phInput.value = pH; valPh.innerText = pH.toFixed(1); targOpen = openFracOf(pH, pKa, fion); stopRun(true); return; }
        phInput.value = pH; valPh.innerText = pH.toFixed(1);
        targOpen = openFracOf(pH, pKa, fion);
        stateLabel.innerText = 'Journey: ' + locationOf(pH) + ' (pH ' + pH.toFixed(1) + ')';
        stateLabel.style.background = pH < 3.5 ? '#fef3c7' : '#dcfce7';
        stateLabel.style.color = pH < 3.5 ? '#92400e' : '#166534';
        refresh();
    }

    // ---------- events ----------
    document.querySelectorAll('input[name="poly"]').forEach((rd) => rd.addEventListener('change', () => { if (sweeping) stopRun(); pKa = parseFloat(document.querySelector('input[name="poly"]:checked').value); refresh(); }));
    fionInput.addEventListener('input', () => { if (sweeping) stopRun(); fion = parseFloat(fionInput.value); valFion.innerText = fion.toFixed(2); refresh(); });
    phInput.addEventListener('input', () => { if (sweeping) stopRun(); pH = parseFloat(phInput.value); valPh.innerText = pH.toFixed(1); refresh(); });
    btnRun.addEventListener('click', startRun);

    // ---------- render loop ----------
    let last = performance.now();
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.05); last = now; tAnim += dt;
        if (sweeping) stepRun(dt);
        dispOpen += (targOpen - dispOpen) * 0.08;
        update3D();
        if (S) { S.controls.update(); S.renderer.render(S.scene, S.camera); }
    }

    // ---------- init ----------
    init3D();
    valFion.innerText = fion.toFixed(2); valPh.innerText = pH.toFixed(1);
    refresh(); dispOpen = targOpen;
    requestAnimationFrame(loop);
})();

// ============================================================
// SUB-CALC C : PNIPAM THERMORESPONSIVE COLLAPSE (LCST)
// (Page check: document.getElementById('plotCanvasLCST'))
// ============================================================
(function () {
    if (!document.getElementById('plotCanvasLCST')) return;

    // ---------- UI refs ----------
    const qswInput = document.getElementById('qswInput');
    const widthInput = document.getElementById('widthInput');
    const tempInput = document.getElementById('tempInput');
    const valQsw = document.getElementById('valQsw');
    const valWidth = document.getElementById('valWidth');
    const valTemp = document.getElementById('valTemp');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotL = document.getElementById('plotCanvasLCST');
    const ctxL = plotL.getContext('2d');
    const plotD = document.getElementById('plotCanvasDQ');
    const ctxD = plotD.getContext('2d');
    const resQt = document.getElementById('resQt');
    const resStroke = document.getElementById('resStroke');
    const resVcr = document.getElementById('resVcr');
    const resFWHM = document.getElementById('resFWHM');
    const resState = document.getElementById('resState');
    const valveBody = document.querySelector('#valveTable tbody');
    const formula = document.getElementById('lcstFormulaContainer');

    const LCST = 32, Q_COL = 1.3;
    // ---------- physics (PNIPAM LCST collapse) ----------
    const phiOf = (T, w) => 1 / (1 + Math.exp((T - LCST) / w));      // swelling fraction (1 swollen -> 0 collapsed)
    const Qof = (T, Qsw, w) => Q_COL + (Qsw - Q_COL) * phiOf(T, w);
    const dQdT = (T, Qsw, w) => { const h = 0.05; return (Qof(T + h, Qsw, w) - Qof(T - h, Qsw, w)) / (2 * h); };
    const VCRof = (Qsw) => Qsw / Q_COL;
    const epsAct = (Qsw) => (Math.pow(Qsw, 1 / 3) - Math.pow(Q_COL, 1 / 3)) / Math.pow(Qsw, 1 / 3);
    // numeric FWHM of |dQ/dT| peak (the switch window)
    function fwhm(Qsw, w) {
        let peak = 0, Tpk = LCST;
        for (let T = 10; T <= 50; T += 0.05) { const d = Math.abs(dQdT(T, Qsw, w)); if (d > peak) { peak = d; Tpk = T; } }
        const half = peak / 2; let lo = Tpk, hi = Tpk;
        for (let T = Tpk; T >= 10; T -= 0.05) { if (Math.abs(dQdT(T, Qsw, w)) <= half) { lo = T; break; } }
        for (let T = Tpk; T <= 50; T += 0.05) { if (Math.abs(dQdT(T, Qsw, w)) <= half) { hi = T; break; } }
        return hi - lo;
    }

    let Qsw = parseFloat(qswInput.value), w = parseFloat(widthInput.value), T = parseFloat(tempInput.value);
    let dispPhi = 1, targPhi = 1, sweeping = false, tAnim = 0;

    // ---------- Three.js: soft-muscle valve (gel posts lift a lid off its seat) ----------
    let S = null, posts = [], postMats = [], lid, seat, pipe, flow = [];
    const NP = 4, NF = 46, RING_R = 0.72, SEAT_R = 0.98, SEAT_H = 0.1;
    function init3D() {
        S = HG.scene3D('viewport3D', [3.1, 2.2, 3.9]);
        if (!S) return;
        HG.bathBox(S.scene, 3.6, 3.8, 3.6, 0x60a5fa);
        // feed pipe that brings fluid up to the valve seat
        pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.5, 28, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x93c5fd, roughness: 0.1, transmission: 0.6, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
        pipe.position.y = -0.75; S.scene.add(pipe);
        // fixed valve seat (the outlet sits at its centre)
        seat = new THREE.Mesh(new THREE.CylinderGeometry(SEAT_R, SEAT_R, SEAT_H, 40), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6, metalness: 0.2 }));
        seat.receiveShadow = true; S.scene.add(seat);
        // gel posts = the soft muscle that lifts the lid when it swells
        const pGeom = new THREE.CylinderGeometry(1, 1, 1, 18);
        for (let i = 0; i < NP; i++) {
            const ang = (i / NP) * Math.PI * 2 + Math.PI / NP;
            const mat = new THREE.MeshStandardMaterial({ color: 0x1E40AF, roughness: 0.4 });
            const m = new THREE.Mesh(pGeom, mat); m.castShadow = true; m.userData.ang = ang;
            S.scene.add(m); posts.push(m); postMats.push(mat);
        }
        // rigid lid the posts raise (open) or let drop (shut)
        lid = new THREE.Mesh(new THREE.CylinderGeometry(SEAT_R, SEAT_R, 0.1, 40), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.5 }));
        lid.castShadow = true; S.scene.add(lid);
        // fluid particles travelling up the pipe and out under the lid
        const fGeom = new THREE.SphereGeometry(0.06, 10, 10);
        for (let i = 0; i < NF; i++) {
            const m = new THREE.Mesh(fGeom, new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, transparent: true }));
            S.scene.add(m); flow.push({ mesh: m, p: Math.random(), th: Math.random() * Math.PI * 2, spd: 0.5 + Math.random() * 0.6 });
        }
    }
    function update3D() {
        if (!S) return;
        const phi = dispPhi;                          // 1 swollen/open -> 0 collapsed/shut
        const strokeH = 0.08 + 0.82 * phi;            // post height = actuation stroke
        const rPost = 0.1 + 0.06 * phi;
        const col = HG.mix(0xf59e0b, 0x1E40AF, phi);  // amber (collapsed) -> blue (swollen)
        const seatTop = SEAT_H / 2;
        posts.forEach((m, i) => {
            m.scale.set(rPost, strokeH, rPost);
            m.position.set(Math.cos(m.userData.ang) * RING_R, seatTop + strokeH / 2, Math.sin(m.userData.ang) * RING_R);
            postMats[i].color.copy(col);
        });
        const lidY = seatTop + strokeH + 0.05;
        lid.position.y = lidY;
        flow.forEach((f) => {
            f.p += f.spd * 0.012 * (0.12 + 0.88 * phi);
            if (f.p >= 1) f.p -= 1;
            let x, y, z, op = 1;
            if (f.p < 0.5) {                           // rising up the centre of the pipe
                const fr = f.p / 0.5; const r = 0.1;
                y = -1.4 + fr * 1.4; x = Math.cos(f.th) * r; z = Math.sin(f.th) * r;
            } else {                                    // escaping radially under the lifted lid
                if (phi < 0.18) f.p = 0.5;             // shut: fluid stalls at the seat
                const fr = (f.p - 0.5) / 0.5; const r = 0.1 + fr * 1.25;
                y = seatTop + 0.04 + Math.sin(fr * Math.PI) * Math.min(strokeH * 0.5, 0.35);
                x = Math.cos(f.th) * r; z = Math.sin(f.th) * r; op = 1 - fr * 0.7;
            }
            f.mesh.position.set(x, y, z); f.mesh.material.opacity = op;
        });
    }

    // ---------- plots ----------
    function drawLCSTPlot() {
        const W = plotL.width, H = plotL.height;
        const yMax = Math.ceil(Qsw / 10) * 10;
        const pts = [];
        for (let t = 10; t <= 50.001; t += 0.25) pts.push({ x: t, y: Qof(t, Qsw, w) });
        const fr = HG.frame(ctxL, W, H, { xMin: 10, xMax: 50, yMin: 0, yMax: yMax, xTicks: 8, yTicks: 5, xLabel: 'Temperature  T (C)', yLabel: 'How swollen (Q, g/g)', axisColor: '#E2570F', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
        HG.shadeX(ctxL, fr, 10, LCST, 'rgba(37,99,235,0.08)');
        HG.shadeX(ctxL, fr, LCST, 50, 'rgba(245,158,11,0.10)', 'rgba(245,158,11,0.14)');
        HG.vLine(ctxL, fr, LCST, '#dc2626', 'switch 32C');
        HG.vLine(ctxL, fr, 37, '#16a34a', 'body 37C', 20);
        HG.curve(ctxL, fr, pts, '#E2570F', 2.6);
        HG.tracker(ctxL, fr, T, Qof(T, Qsw, w), 'Q=' + Qof(T, Qsw, w).toFixed(1), '#ef4444');
        HG.legend(ctxL, fr.pl + fr.w - 158, fr.pt + 6, [
            { color: '#1E40AF', text: 'Cool: swollen -> OPEN' },
            { color: '#f59e0b', text: 'Warm: collapsed -> SHUT' },
            { color: '#dc2626', dash: true, text: 'Switch at 32 C' }
        ]);
    }
    function drawDQPlot() {
        const W = plotD.width, H = plotD.height;
        let peak = 0; for (let t = 10; t <= 50; t += 0.1) { const d = Math.abs(dQdT(t, Qsw, w)); if (d > peak) peak = d; }
        const yMax = Math.ceil(peak / 5) * 5 || 5;
        const pts = [];
        for (let t = 10; t <= 50.001; t += 0.2) pts.push({ x: t, y: Math.abs(dQdT(t, Qsw, w)) });
        const fr = HG.frame(ctxD, W, H, { padT: 14, padB: 26, xMin: 10, xMax: 50, yMin: 0, yMax: yMax, xTicks: 8, yTicks: 4, xLabel: 'T (C)', yLabel: 'Switch rate |dQ/dT|', axisColor: '#7c3aed', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
        const fw = fwhm(Qsw, w);
        HG.shadeX(ctxD, fr, LCST - fw / 2, LCST + fw / 2, 'rgba(124,58,237,0.12)');
        HG.vLine(ctxD, fr, LCST, '#dc2626', '');
        HG.curve(ctxD, fr, pts, '#7c3aed', 2.4);
        ctxD.fillStyle = '#7c3aed'; ctxD.font = 'bold 9px sans-serif'; ctxD.textAlign = 'center';
        ctxD.fillText('switch window = ' + fw.toFixed(1) + ' C', fr.gx(LCST), fr.pt + 10);
        HG.tracker(ctxD, fr, T, Math.abs(dQdT(T, Qsw, w)), '', '#ef4444');
    }
    const VTEMPS = [20, 30, 34, 37];
    function fillValve() {
        if (!valveBody) return;
        valveBody.innerHTML = VTEMPS.map((t) => {
            const q = Qof(t, Qsw, w), open = t < LCST, sel = Math.abs(t - T) < 1.0;
            return '<tr style="' + (sel ? 'background:rgba(138,17,52,0.08);font-weight:bold;' : '') + '"><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;">' + t + ' C' + (t === 37 ? ' (body)' : '') + '</td><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;">' + q.toFixed(1) + '</td><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;text-align:right;color:' + (open ? '#16a34a' : '#b45309') + ';font-weight:700;">' + (open ? 'OPEN' : 'SHUT') + '</td></tr>';
        }).join('');
    }
    function updateEq() {
        formula.innerHTML = '<div style="line-height:1.7;color:#1e293b;font-size:15px;font-weight:bold;">' +
            '<div><strong>How swollen vs temperature:</strong> Q(T) = Q<sub>col</sub> + (Q<sub>sw</sub>-Q<sub>col</sub>)/(1+e<sup>(T-32)/w</sup>)</div>' +
            '<div style="margin-left:18px;font-style:italic;color:#475569;font-size:0.95em;">Q<sub>sw</sub> = ' + Qsw.toFixed(0) + ', w = ' + w.toFixed(2) + ', T = ' + T.toFixed(1) + ' C &rArr; Q = ' + Qof(T, Qsw, w).toFixed(2) + '</div>' +
            '<div style="margin-top:6px;"><strong>Size change:</strong> Q<sub>sw</sub>/Q<sub>col</sub> = ' + VCRof(Qsw).toFixed(1) + 'x &nbsp;|&nbsp; <strong>Valve stroke:</strong> &epsilon; = 1 - (Q<sub>col</sub>/Q<sub>sw</sub>)<sup>1/3</sup> = ' + (epsAct(Qsw) * 100).toFixed(1) + '%</div></div>';
    }
    function refresh() {
        const Q = Qof(T, Qsw, w);
        if (!sweeping) targPhi = phiOf(T, w);
        const fw = fwhm(Qsw, w), open = T < LCST;
        HG.put(resQt, Q.toFixed(2) + ' g/g');
        HG.put(resStroke, (epsAct(Qsw) * 100).toFixed(1) + ' %', '#E2570F');
        HG.put(resVcr, VCRof(Qsw).toFixed(1) + ' x', '#E2570F');
        HG.put(resFWHM, fw.toFixed(1) + ' C', fw <= 5 ? '#16a34a' : '#b45309');
        HG.put(resState, open ? 'OPEN (flowing)' : 'SHUT (blocked)', open ? '#16a34a' : '#b45309');
        if (!sweeping) {
            stateLabel.innerText = open ? 'Valve: open (cool, swollen)' : 'Valve: shut (warm, collapsed)';
            stateLabel.style.background = open ? '#dbeafe' : '#fde68a';
            stateLabel.style.color = open ? '#1e40af' : '#92400e';
        }
        liveInsight.innerHTML = '<strong>Live Insight:</strong> At ' + T.toFixed(1) + ' C the gel sits at Q = ' + Q.toFixed(1) + ' g/g, so the valve is <strong>' + (open ? 'OPEN' : 'SHUT') + '</strong>. ' +
            (open ? 'Below 32 C the swollen gel props the lid up and fluid flows through.' : 'Warmed past 32 C the gel collapses, the lid drops and the flow stops.') +
            ' The switch is ' + (fw <= 5 ? 'sharp' : 'gradual') + ' (window ' + fw.toFixed(1) + ' C) with a ' + VCRof(Qsw).toFixed(1) + 'x size change and a ' + (epsAct(Qsw) * 100).toFixed(0) + '% stroke. ' +
            '<em>Design rule: it snaps shut right at body temperature - a self-regulating valve or drug switch.</em>';
        drawLCSTPlot(); drawDQPlot(); fillValve(); updateEq();
    }

    // ---------- warm-to-body-temperature sweep ----------
    function startRun() { if (sweeping) { stopRun(); return; } sweeping = true; T = 10; tempInput.value = T; valTemp.innerText = T.toFixed(1) + ' C'; btnRun.innerText = 'Pause'; btnRun.style.background = '#475569'; }
    function stopRun(done) { sweeping = false; btnRun.innerText = 'Warm to Body Temp'; btnRun.style.background = '#E2570F'; if (done) { const nx = document.getElementById('btnNextCalc'); if (nx) nx.style.display = 'block'; } refresh(); }
    function stepRun(dt) {
        T += dt * 7;
        if (T >= 50) { T = 50; tempInput.value = T; valTemp.innerText = T.toFixed(1) + ' C'; targPhi = phiOf(T, w); stopRun(true); return; }
        tempInput.value = T; valTemp.innerText = T.toFixed(1) + ' C'; targPhi = phiOf(T, w);
        stateLabel.innerText = 'Warming: ' + T.toFixed(1) + ' C - valve ' + (T < LCST ? 'OPEN' : 'SHUT');
        stateLabel.style.background = T < LCST ? '#dbeafe' : '#fde68a';
        stateLabel.style.color = T < LCST ? '#1e40af' : '#92400e';
        refresh();
    }

    // ---------- events ----------
    qswInput.addEventListener('input', () => { if (sweeping) stopRun(); Qsw = parseFloat(qswInput.value); valQsw.innerText = Qsw.toFixed(0) + ' g/g'; refresh(); });
    widthInput.addEventListener('input', () => { if (sweeping) stopRun(); w = parseFloat(widthInput.value); valWidth.innerText = w.toFixed(2) + ' C'; refresh(); });
    tempInput.addEventListener('input', () => { if (sweeping) stopRun(); T = parseFloat(tempInput.value); valTemp.innerText = T.toFixed(1) + ' C'; refresh(); });
    btnRun.addEventListener('click', startRun);

    // ---------- render loop ----------
    let last = performance.now();
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.05); last = now; tAnim += dt;
        if (sweeping) stepRun(dt);
        dispPhi += (targPhi - dispPhi) * 0.08;
        update3D();
        if (S) { S.controls.update(); S.renderer.render(S.scene, S.camera); }
    }

    // ---------- init ----------
    init3D();
    valQsw.innerText = Qsw.toFixed(0) + ' g/g'; valWidth.innerText = w.toFixed(2) + ' C'; valTemp.innerText = T.toFixed(1) + ' C';
    refresh(); dispPhi = targPhi;
    requestAnimationFrame(loop);
})();

// ============================================================
// SUB-CALC D : SHEAR & YOUNG'S MODULUS vs CROSSLINK DENSITY
// (Page check: document.getElementById('plotCanvasMod'))
// ============================================================
(function () {
    if (!document.getElementById('plotCanvasMod')) return;

    // ---------- UI refs ----------
    const nuInput = document.getElementById('nuInput');
    const qInput = document.getElementById('qInput');
    const tInput = document.getElementById('tInput');
    const valNu = document.getElementById('valNu');
    const valQ = document.getElementById('valQ');
    const valT = document.getElementById('valT');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotM = document.getElementById('plotCanvasMod');
    const ctxM = plotM.getContext('2d');
    const plotT = document.getElementById('plotCanvasTissue');
    const ctxT = plotT.getContext('2d');
    const resNu = document.getElementById('resNu');
    const resEdry = document.getElementById('resEdry');
    const resE = document.getElementById('resE');
    const resMatch = document.getElementById('resMatch');
    const resWindow = document.getElementById('resWindow');
    const tissueBody = document.querySelector('#tissueTable tbody');
    const formula = document.getElementById('modFormulaContainer');

    const KB = 1.380649e-23;
    const tissues = [
        { name: 'Brain', lo: 0.001, hi: 0.01, color: '#a78bfa' },
        { name: 'Muscle', lo: 0.01, hi: 0.1, color: '#f472b6' },
        { name: 'Cartilage', lo: 0.1, hi: 1.0, color: '#34d399' },
        { name: 'Skin', lo: 0.1, hi: 2.0, color: '#fbbf24' }
    ];
    // ---------- physics (rubber elasticity) ----------
    const Gdry = (nu, Tc) => nu * KB * (Tc + 273.15);            // Pa
    const Gsw = (nu, Tc, Q) => Gdry(nu, Tc) * Math.pow(1 / Q, 1 / 3); // Pa
    const Ymod = (G) => 3 * G;                                    // incompressible
    function fmtMod(pa) { return pa >= 1e6 ? (pa / 1e6).toFixed(2) + ' MPa' : (pa >= 1e3 ? (pa / 1e3).toFixed(1) + ' kPa' : pa.toFixed(0) + ' Pa'); }
    function closestTissue(eMPa) {
        const hit = tissues.find((t) => eMPa >= t.lo && eMPa <= t.hi);
        if (hit) return hit;
        let best = tissues[0], bd = 1e9;
        tissues.forEach((t) => { const mid = Math.sqrt(t.lo * t.hi), d = Math.abs(Math.log10(Math.max(eMPa, 1e-6)) - Math.log10(mid)); if (d < bd) { bd = d; best = t; } });
        return best;
    }

    let logNu = parseFloat(nuInput.value), Q = parseFloat(qInput.value), Tc = parseFloat(tInput.value);
    const nuOf = () => Math.pow(10, logNu);
    let dispDent = 0.05, targDent = 0.05, tAnim = 0;

    // ---------- Three.js: a probe presses a printed scaffold (indentation test) ----------
    let S = null, surf, surfWire, surf0, indenter, body;
    const SEG = 26, SP = 2.0;
    function init3D() {
        S = HG.scene3D('viewport3D', [2.6, 2.0, 3.2]);
        if (!S) return;
        // scaffold block
        body = new THREE.Mesh(new THREE.BoxGeometry(SP, 0.6, SP), new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.5, transparent: true, opacity: 0.45 }));
        body.position.y = -0.3; S.scene.add(body);
        // printed-lattice cage around the block
        const cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(SP, 0.6, SP)), new THREE.LineBasicMaterial({ color: 0x1E40AF, transparent: true, opacity: 0.4 }));
        cage.position.y = -0.3; S.scene.add(cage);
        // deformable top surface (the scaffold mesh that the probe dents)
        const g = new THREE.PlaneGeometry(SP, SP, SEG, SEG);
        g.rotateX(-Math.PI / 2);
        surf = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x1E40AF, roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide }));
        surf.receiveShadow = true; S.scene.add(surf);
        // lattice wireframe drawn on the same deforming surface
        surfWire = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x1E40AF, wireframe: true, transparent: true, opacity: 0.22 }));
        S.scene.add(surfWire);
        surf0 = g.attributes.position.array.slice();
        // rigid spherical probe
        indenter = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 24), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.25, metalness: 0.6 }));
        indenter.castShadow = true; S.scene.add(indenter);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 12), new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 }));
        stem.position.y = 1.0; indenter.add(stem);
    }
    function update3D() {
        if (!S) return;
        const d = dispDent;                       // indentation depth
        const sigma = 0.42;
        const pos = surf.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = surf0[3 * i], z = surf0[3 * i + 2];
            const r2 = x * x + z * z;
            pos.array[3 * i + 1] = -d * Math.exp(-r2 / (2 * sigma * sigma));
        }
        pos.needsUpdate = true; surf.geometry.computeVertexNormals();
        // colour by stiffness: soft (deep dent) blue -> stiff slate
        const stiffT = 1 - Math.min(d / 0.32, 1);
        surf.material.color.copy(HG.mix(0x1E40AF, 0x94a3b8, stiffT));
        // probe rests in the dimple, with a gentle measuring oscillation
        const wobble = Math.sin(tAnim * 1.6) * 0.015;
        indenter.position.set(0, -d + 0.32 + wobble, 0);
    }

    // ---------- plots ----------
    function drawModPlot() {
        const W = plotM.width, H = plotM.height;
        const nu = nuOf();
        const eMaxMPa = Ymod(Gsw(nu, Tc, 1)) / 1e6;
        const yMax = Math.max(0.05, Math.ceil(eMaxMPa * 20) / 20);
        const pts = [];
        for (let q = 1; q <= 60.001; q += 0.5) pts.push({ x: q, y: Ymod(Gsw(nu, Tc, q)) / 1e6 });
        const fr = HG.frame(ctxM, W, H, { xMin: 1, xMax: 60, yMin: 0, yMax: yMax, xTicks: 6, yTicks: 5, xLabel: 'Swelling ratio Q  (more swollen ->)', yLabel: "Stiffness E (MPa)", axisColor: '#E2570F', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(2) });
        if (yMax > 0.1) HG.shadeYBand(ctxM, fr, 0.1, Math.min(1.0, yMax), 'rgba(16,185,129,0.12)');   // cartilage window
        if (0.1 <= yMax) HG.hLine(ctxM, fr, 0.1, '#16a34a', 'cartilage 0.1');
        if (1.0 <= yMax) HG.hLine(ctxM, fr, 1.0, '#16a34a', 'cartilage 1.0');
        HG.curve(ctxM, fr, pts, '#E2570F', 2.6);
        HG.tracker(ctxM, fr, Q, Ymod(Gsw(nu, Tc, Q)) / 1e6, 'E=' + (Ymod(Gsw(nu, Tc, Q)) / 1e6).toFixed(2), '#ef4444');
        HG.legend(ctxM, fr.pl + fr.w - 158, fr.pt + 6, [
            { color: '#E2570F', text: 'Stiffness vs swelling' },
            { color: '#16a34a', text: 'Cartilage window' },
            { color: '#ef4444', text: 'Your scaffold' }
        ]);
    }
    function drawTissuePlot() {
        const W = plotT.width, H = plotT.height, ctx = ctxT;
        ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        const pl = 20, pr = 16, pt = 16, pb = 26, w = W - pl - pr, h = H - pt - pb;
        const lx = (mpa) => pl + (Math.log10(mpa) - (-3)) / (1 - (-3)) * w; // log axis 1e-3..10 MPa
        // axis
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(pl, pt + h); ctx.lineTo(pl + w, pt + h); ctx.stroke();
        ctx.fillStyle = '#475569'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
        [0.001, 0.01, 0.1, 1, 10].forEach((v) => { const x = lx(v); ctx.strokeStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(x, pt); ctx.lineTo(x, pt + h); ctx.stroke(); ctx.fillStyle = '#475569'; ctx.fillText(v < 1 ? v.toString() : v.toFixed(0), x, pt + h + 12); });
        ctx.fillStyle = '#334155'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('Which tissue does it match?  E (MPa, log scale)', pl + w / 2, H - 2);
        // tissue bands
        const rowH = (h - 6) / tissues.length;
        tissues.forEach((tis, i) => {
            const y = pt + 3 + i * rowH, a = lx(tis.lo), b = lx(tis.hi);
            ctx.fillStyle = tis.color; ctx.globalAlpha = 0.5; ctx.fillRect(a, y, b - a, rowH - 4); ctx.globalAlpha = 1;
            ctx.strokeStyle = tis.color; ctx.lineWidth = 1; ctx.strokeRect(a, y, b - a, rowH - 4);
            ctx.fillStyle = '#1e293b'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(tis.name, a + 3, y + rowH / 2);
        });
        // current scaffold marker
        const eMPa = Ymod(Gsw(nuOf(), Tc, Q)) / 1e6;
        const mx = Math.max(pl, Math.min(pl + w, lx(eMPa)));
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(mx, pt); ctx.lineTo(mx, pt + h); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#ef4444'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = mx > pl + w * 0.7 ? 'right' : 'left'; ctx.fillText('scaffold ' + fmtMod(Ymod(Gsw(nuOf(), Tc, Q))), mx + (mx > pl + w * 0.7 ? -4 : 4), pt + 8);
    }
    function fillTissue() {
        if (!tissueBody) return;
        const eMPa = Ymod(Gsw(nuOf(), Tc, Q)) / 1e6;
        tissueBody.innerHTML = tissues.map((t) => {
            const match = eMPa >= t.lo && eMPa <= t.hi;
            return '<tr style="' + (match ? 'background:rgba(16,185,129,0.10);font-weight:bold;' : '') + '"><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;">' + t.name + '</td><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;">' + t.lo + ' - ' + t.hi + '</td><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;text-align:right;"><span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:' + (match ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)') + ';color:' + (match ? '#047857' : '#64748b') + ';">' + (match ? 'Match' : '-') + '</span></td></tr>';
        }).join('');
    }
    function updateEq() {
        const nu = nuOf();
        formula.innerHTML = '<div style="line-height:1.7;color:#1e293b;font-size:15px;font-weight:bold;">' +
            '<div><strong>Rubber elasticity:</strong> G = &nu;<sub>e</sub> k<sub>B</sub> T &nbsp;|&nbsp; G<sub>swollen</sub> = G<sub>dry</sub> Q<sup>-1/3</sup> &nbsp;|&nbsp; E = 3G</div>' +
            '<div style="margin-left:18px;font-style:italic;color:#475569;font-size:0.95em;">Substitution: &nu;<sub>e</sub> = ' + nu.toExponential(2) + ', T = ' + (Tc + 273.15).toFixed(0) + ' K, Q = ' + Q.toFixed(0) + ' &rArr; G<sub>sw</sub> = ' + fmtMod(Gsw(nu, Tc, Q)) + '</div>' +
            '<div style="margin-top:6px;"><strong>Stiffness in the body (swollen):</strong> E = 3G<sub>sw</sub> = ' + fmtMod(Ymod(Gsw(nu, Tc, Q))) + '</div></div>';
    }
    function refresh() {
        const nu = nuOf(), Gd = Gdry(nu, Tc), Gs = Gsw(nu, Tc, Q), Es = Ymod(Gs), Ed = Ymod(Gd);
        const logEs = Math.log10(Math.max(Es, 1));
        if (!sweeping) { const norm = Math.max(0, Math.min(1, (logEs - 2) / 4)); targDent = 0.04 + 0.28 * (1 - norm); }
        const eMPa = Es / 1e6, inCart = eMPa >= 0.1 && eMPa <= 1.0, near = closestTissue(eMPa);
        HG.put(valNu, '10^' + logNu.toFixed(2));
        HG.put(resNu, nu.toExponential(2) + ' /m3');
        HG.put(resEdry, fmtMod(Ed));
        HG.put(resE, fmtMod(Es), '#E2570F');
        HG.put(resMatch, near.name, near.name === 'Cartilage' ? '#16a34a' : '#1e293b');
        HG.put(resWindow, inCart ? 'Yes - matches cartilage' : 'No', inCart ? '#16a34a' : '#dc2626');
        stateLabel.innerText = 'Scaffold stiffness: ' + fmtMod(Es);
        stateLabel.style.background = inCart ? '#dcfce7' : '#e0f2fe';
        stateLabel.style.color = inCart ? '#166534' : '#075985';
        liveInsight.innerHTML = '<strong>Live Insight:</strong> With this crosslinking at Q = ' + Q.toFixed(0) +
            ', the scaffold is <strong>' + fmtMod(Es) + '</strong> stiff once swollen in the body. ' +
            (inCart ? 'That sits right in the <strong>cartilage window</strong> (0.1-1 MPa) - the probe dents it just like real cartilage.' : 'That feels most like <strong>' + near.name + '</strong>, ' + (eMPa < 0.1 ? 'too soft' : 'too stiff') + ' for cartilage.') +
            ' A more swollen gel (higher Q) dents deeper because E falls as Q<sup>-1/3</sup>. <em>Design rule: tighten the crosslinking until E lands between 0.1 and 1 MPa.</em>';
        drawModPlot(); drawTissuePlot(); fillTissue(); updateEq();
    }

    // ---------- swelling sweep (scaffold softens as it swells) ----------
    let sweeping = false;
    function startRun() { if (sweeping) { stopRun(); return; } sweeping = true; Q = 1; btnRun.innerText = 'Pause'; btnRun.style.background = '#475569'; }
    function stopRun(done) { sweeping = false; btnRun.innerText = 'Press the Scaffold'; btnRun.style.background = '#E2570F'; if (done) { const nx = document.getElementById('btnNextCalc'); if (nx) nx.style.display = 'block'; } }
    function stepRun(dt) {
        Q += dt * 12;
        const logEs = Math.log10(Math.max(Ymod(Gsw(nuOf(), Tc, Q)), 1));
        const norm = Math.max(0, Math.min(1, (logEs - 2) / 4)); targDent = 0.04 + 0.28 * (1 - norm);
        if (Q >= 60) { Q = 60; qInput.value = Q; valQ.innerText = Q.toFixed(0); refresh(); stopRun(true); return; }
        qInput.value = Q; valQ.innerText = Q.toFixed(0); refresh();
    }

    // ---------- events ----------
    nuInput.addEventListener('input', () => { if (sweeping) stopRun(); logNu = parseFloat(nuInput.value); refresh(); });
    qInput.addEventListener('input', () => { if (sweeping) stopRun(); Q = parseFloat(qInput.value); valQ.innerText = Q.toFixed(0); refresh(); });
    tInput.addEventListener('input', () => { if (sweeping) stopRun(); Tc = parseFloat(tInput.value); valT.innerText = Tc.toFixed(0) + ' C'; refresh(); });
    btnRun.addEventListener('click', startRun);

    // ---------- render loop ----------
    let last = performance.now();
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.05); last = now; tAnim += dt;
        if (sweeping) stepRun(dt);
        dispDent += (targDent - dispDent) * 0.08;
        update3D();
        if (S) { S.controls.update(); S.renderer.render(S.scene, S.camera); }
    }

    // ---------- init ----------
    init3D();
    valNu.innerText = '10^' + logNu.toFixed(2); valQ.innerText = Q.toFixed(0); valT.innerText = Tc.toFixed(0) + ' C';
    refresh(); dispDent = targDent;
    requestAnimationFrame(loop);
})();

// ============================================================
// SUB-CALC E : DRUG-RELEASE KINETICS (KORSMEYER-PEPPAS)
// (Page check: document.getElementById('plotCanvasKP'))
// ============================================================
(function () {
    if (!document.getElementById('plotCanvasKP')) return;

    // ---------- UI refs ----------
    const kInput = document.getElementById('kInput');
    const nInput = document.getElementById('nInput');
    const valK = document.getElementById('valK');
    const valN = document.getElementById('valN');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotK = document.getElementById('plotCanvasKP');
    const ctxK = plotK.getContext('2d');
    const plotLg = document.getElementById('plotCanvasLog');
    const ctxLg = plotLg.getContext('2d');
    const resK = document.getElementById('resK');
    const resN = document.getElementById('resN');
    const resMech = document.getElementById('resMech');
    const resT50 = document.getElementById('resT50');
    const resDuration = document.getElementById('resDuration');
    const mechBody = document.querySelector('#mechTable tbody');
    const formula = document.getElementById('kpFormulaContainer');

    const CUTOFF = 0.6;   // Korsmeyer-Peppas validity limit
    // ---------- physics (Korsmeyer-Peppas) ----------
    const Mt = (t, k, n) => Math.min(k * Math.pow(Math.max(t, 0), n), 1);  // fractional release
    const tForFrac = (f, k, n) => Math.pow(f / k, 1 / n);                   // time to reach fraction f
    function mechanism(n) {
        if (n < 0.45) return { txt: 'Quasi-Fickian (n<0.45)', row: 0 };
        if (n <= 0.55) return { txt: 'Diffusion (Fickian, n~0.5)', row: 0 };
        if (n < 0.99) return { txt: 'Mixed / anomalous', row: 1 };
        if (n <= 1.01) return { txt: 'Steady / zero-order (n=1)', row: 2 };
        return { txt: 'Burst (super case II, n>1)', row: 3 };
    }

    let k = parseFloat(kInput.value), n = parseFloat(nInput.value);
    let tEnd = 30, tau = 0, running = false, dispFrac = 0, targFrac = 0, tAnim = 0;

    // ---------- Three.js: a printed implant slab slowly releasing drug particles ----------
    let S = null, matrix, drugs = [];
    const ND = 64, MX = 1.9, MY = 0.7, MZ = 1.25;
    function init3D() {
        S = HG.scene3D('viewport3D', [3.0, 1.9, 3.4]);
        if (!S) return;
        HG.bathBox(S.scene, 3.6, 3.4, 3.6, 0x60a5fa);
        matrix = new THREE.Mesh(new THREE.BoxGeometry(MX, MY, MZ), new THREE.MeshPhysicalMaterial({ color: 0x8b5cf6, roughness: 0.4, transmission: 0.4, transparent: true, opacity: 0.42, thickness: 0.6 }));
        S.scene.add(matrix);
        S.scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(MX, MY, MZ)), new THREE.LineBasicMaterial({ color: 0x7c3aed })));
        const dGeom = new THREE.SphereGeometry(0.06, 12, 12);
        for (let i = 0; i < ND; i++) {
            const home = new THREE.Vector3((Math.random() - 0.5) * (MX - 0.2), (Math.random() - 0.5) * (MY - 0.15), (Math.random() - 0.5) * (MZ - 0.2));
            const dir = new THREE.Vector3(home.x, home.y * 0.4, home.z).normalize();
            const out = home.clone().add(dir.multiplyScalar(1.3 + Math.random() * 0.9));
            const m = new THREE.Mesh(dGeom, new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3, emissive: 0xB8410F, emissiveIntensity: 0.2 }));
            S.scene.add(m); drugs.push({ mesh: m, home: home, out: out, ph: Math.random() * 6.28, order: Math.random() });
        }
        drugs.sort((a, b) => a.order - b.order); // release order
    }
    function update3D() {
        if (!S) return;
        const fr = dispFrac;
        const released = Math.floor(fr * ND);
        drugs.forEach((d, i) => {
            const j = Math.sin(tAnim * 5 + d.ph) * 0.02;
            if (i < released) {                       // escaped: drift outward and fade
                d.mesh.position.lerpVectors(d.home, d.out, 0.85);
                d.mesh.material.opacity = 0.25; d.mesh.material.transparent = true; d.mesh.material.color.set(0xfda4af);
            } else {
                d.mesh.position.set(d.home.x + j, d.home.y + j * 0.7, d.home.z + j * 0.5);
                d.mesh.material.opacity = 1; d.mesh.material.transparent = false; d.mesh.material.color.set(0xf43f5e);
            }
        });
        matrix.material.opacity = 0.42 - 0.18 * fr; // implant depletes
    }

    // ---------- plots ----------
    function drawKPPlot(curT) {
        const W = plotK.width, H = plotK.height;
        const fr = HG.frame(ctxK, W, H, { xMin: 0, xMax: tEnd, yMin: 0, yMax: 1, xTicks: 6, yTicks: 5, xLabel: 'Time t (h)', yLabel: 'Drug released (fraction)', axisColor: '#E2570F', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(1) });
        HG.shadeYBand(ctxK, fr, CUTOFF, 1, 'rgba(239,68,68,0.08)');
        HG.hLine(ctxK, fr, CUTOFF, '#dc2626', '60% - model limit');
        const t50 = tForFrac(0.5, k, n);
        if (t50 <= tEnd) HG.vLine(ctxK, fr, t50, '#3E5A82', 'half dose');
        // valid (<=0.6) solid, beyond model (>0.6) dashed
        const solid = [], dashed = [];
        for (let t = 0; t <= tEnd + 1e-6; t += tEnd / 240) { const y = Mt(t, k, n); (y <= CUTOFF ? solid : dashed).push({ x: t, y: y }); }
        HG.curve(ctxK, fr, solid, '#E2570F', 2.6);
        ctxK.setLineDash([5, 4]); HG.curve(ctxK, fr, dashed, '#9ca3af', 2); ctxK.setLineDash([]);
        const ct = curT == null ? tEnd : curT;
        HG.tracker(ctxK, fr, Math.min(ct, tEnd), Mt(ct, k, n), (Mt(ct, k, n) * 100).toFixed(0) + '%', '#ef4444');
        HG.legend(ctxK, fr.pl + 8, fr.pt + 6, [
            { color: '#E2570F', text: 'Trustworthy (below 60%)' },
            { color: '#9ca3af', dash: true, text: 'Beyond model limit' },
            { color: '#dc2626', dash: true, text: '60% cutoff' }
        ]);
    }
    function drawLogPlot() {
        const W = plotLg.width, H = plotLg.height;
        const xMax = Math.log10(tEnd);
        const fr = HG.frame(ctxLg, W, H, { padT: 14, padB: 26, xMin: -1, xMax: xMax, yMin: -2, yMax: 0, xTicks: 5, yTicks: 4, xLabel: 'log10 t', yLabel: 'log10(fraction)', axisColor: '#1E40AF', xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(1) });
        const tCut = tForFrac(CUTOFF, k, n);
        const solid = [], dashed = [];
        for (let lt = -1; lt <= xMax + 1e-6; lt += (xMax + 1) / 160) { const t = Math.pow(10, lt); const y = Math.log10(Mt(t, k, n)); (t <= tCut ? solid : dashed).push({ x: lt, y: y }); }
        HG.curve(ctxLg, fr, solid, '#1E40AF', 2.4);
        ctxLg.setLineDash([5, 4]); HG.curve(ctxLg, fr, dashed, '#9ca3af', 1.8); ctxLg.setLineDash([]);
        if (tCut > 0.1 && Math.log10(tCut) < xMax) HG.vLine(ctxLg, fr, Math.log10(tCut), '#dc2626', '60%');
        ctxLg.fillStyle = '#1E40AF'; ctxLg.font = 'bold 9px sans-serif'; ctxLg.textAlign = 'left';
        ctxLg.fillText('slope = shape n = ' + n.toFixed(2), fr.pl + 8, fr.pt + 12);
    }
    function fillMech() {
        if (!mechBody) return;
        const m = mechanism(n);
        const rows = [['n = 0.5', 'Diffusion (Fickian)'], ['0.5 < n < 1', 'Mixed (anomalous)'], ['n = 1', 'Steady (zero-order)'], ['n > 1', 'Burst (super case II)']];
        mechBody.innerHTML = rows.map((r, i) => '<tr style="' + (i === m.row ? 'background:rgba(138,17,52,0.08);font-weight:bold;' : '') + '"><td style="padding:8px 4px;border-bottom:1px solid #e2e8f0;">' + r[0] + '</td><td style="padding:8px 4px;border-bottom:1px solid #e2e8f0;text-align:right;color:' + (i === m.row ? '#E2570F' : '#475569') + ';font-weight:' + (i === m.row ? '700' : '400') + ';">' + r[1] + '</td></tr>').join('');
    }
    function updateEq() {
        const t50 = tForFrac(0.5, k, n);
        formula.innerHTML = '<div style="line-height:1.7;color:#1e293b;font-size:15px;font-weight:bold;">' +
            '<div><strong>Korsmeyer-Peppas:</strong> M<sub>t</sub>/M<sub>inf</sub> = k t<sup>n</sup> &nbsp;(trustworthy while released &lt; 60%)</div>' +
            '<div style="margin-left:18px;font-style:italic;color:#475569;font-size:0.95em;">Substitution: k = ' + k.toFixed(2) + ', n = ' + n.toFixed(2) + ' &rArr; half dose t<sub>50</sub> = (0.5/k)<sup>1/n</sup> = ' + t50.toFixed(1) + ' h</div>' +
            '<div style="margin-top:6px;"><strong>Log-log form:</strong> log(M<sub>t</sub>/M<sub>inf</sub>) = log k + n&middot;log t &nbsp;(slope = shape n = ' + n.toFixed(2) + ')</div></div>';
    }
    function refresh(curT) {
        tEnd = Math.max(8, Math.min(tForFrac(0.99, k, n), 60));
        const t50 = tForFrac(0.5, k, n), t90 = tForFrac(0.9, k, n), tcut = tForFrac(CUTOFF, k, n), m = mechanism(n);
        const dur = t90 >= 100 ? t90.toFixed(0) : t90.toFixed(1);
        HG.put(resK, k.toFixed(2));
        HG.put(resN, n.toFixed(2));
        HG.put(resMech, m.txt, '#E2570F');
        HG.put(resT50, t50.toFixed(1) + ' h');
        HG.put(resDuration, dur + ' h', '#E2570F');
        const pct = Math.round(dispFrac * 100);
        if (!running && dispFrac < 0.01) { stateLabel.innerText = 'Implant: loaded with drug'; stateLabel.style.background = '#ede9fe'; stateLabel.style.color = '#5b21b6'; }
        else { stateLabel.innerText = (running ? 'Releasing: ' : 'Released: ') + pct + '%'; stateLabel.style.background = '#fee2e2'; stateLabel.style.color = '#b91c1c'; }
        liveInsight.innerHTML = '<strong>Live Insight:</strong> With release speed k = ' + k.toFixed(2) + ' and shape n = ' + n.toFixed(2) + ', the implant releases by <strong>' + m.txt + '</strong>. ' +
            'Half the dose is out by ' + t50.toFixed(1) + ' h, and the dose lasts about ' + dur + ' h. ' +
            (n <= 0.55 ? 'Near n=0.5 the drug just <strong>diffuses</strong> out - quick at first, then tailing off.' : (n >= 0.99 ? 'At n=1 the release is <strong>steady (zero-order)</strong> - a near-constant dose, ideal for an implant.' : 'In between, diffusion and polymer swelling mix (anomalous release).')) +
            ' <em>Design rule: pick the shape n through the implant geometry for steady dosing, and trust the curve only up to 60% released (t = ' + tcut.toFixed(1) + ' h).</em>';
        drawKPPlot(curT); drawLogPlot(); fillMech(); updateEq();
    }

    // ---------- time-release animation ----------
    function startRun() { if (running) { stopRun(); return; } running = true; tau = 0; dispFrac = 0; btnRun.innerText = 'Pause'; btnRun.style.background = '#475569'; }
    function stopRun(done) { running = false; btnRun.innerText = 'Run the Release'; btnRun.style.background = '#E2570F'; if (done) { const nx = document.getElementById('btnRestart'); if (nx) nx.style.display = 'block'; } }
    function stepRun(dt) {
        tau += dt * (tEnd / 6);
        targFrac = Mt(tau, k, n);
        if (tau >= tEnd) { tau = tEnd; targFrac = Mt(tEnd, k, n); refresh(tau); stopRun(true); return; }
        refresh(tau);
    }

    // ---------- events ----------
    kInput.addEventListener('input', () => { if (running) stopRun(); k = parseFloat(kInput.value); valK.innerText = k.toFixed(2); refresh(); });
    nInput.addEventListener('input', () => { if (running) stopRun(); n = parseFloat(nInput.value); valN.innerText = n.toFixed(2); refresh(); });
    btnRun.addEventListener('click', startRun);

    // ---------- render loop ----------
    let last = performance.now();
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.05); last = now; tAnim += dt;
        if (running) stepRun(dt);
        dispFrac += (targFrac - dispFrac) * 0.1;
        update3D();
        if (S) { S.controls.update(); S.renderer.render(S.scene, S.camera); }
    }

    // ---------- init ----------
    init3D();
    valK.innerText = k.toFixed(2); valN.innerText = n.toFixed(2);
    refresh();
    requestAnimationFrame(loop);
})();
