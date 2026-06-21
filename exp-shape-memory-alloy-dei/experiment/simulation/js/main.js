/* global THREE */

// ============================================================
// COMMON UTILITIES
// ============================================================
function drawGrid(ctx, width, height, xMin, xMax, yMin, yMax, xLabel, yLabel) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    
    // Margins
    const mLeft = 60;
    const mRight = 20;
    const mTop = 30;
    const mBottom = 50;
    
    const plotW = width - mLeft - mRight;
    const plotH = height - mTop - mBottom;
    
    // Draw axes
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mLeft, mTop);
    ctx.lineTo(mLeft, height - mBottom);
    ctx.lineTo(width - mRight, height - mBottom);
    ctx.stroke();
    
    // Map function
    const mapX = (x) => mLeft + ((x - xMin) / (xMax - xMin)) * plotW;
    const mapY = (y) => height - mBottom - ((y - yMin) / (yMax - yMin)) * plotH;
    
    // Labels
    ctx.fillStyle = "#475569";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(xLabel, mLeft + plotW / 2, height - 15);
    
    ctx.save();
    ctx.translate(15, mTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
    
    // Tick marks and grid lines
    ctx.strokeStyle = "#f1f5f9";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    
    // Y ticks
    for (let i = 0; i <= 5; i++) {
        const yVal = yMin + (i / 5) * (yMax - yMin);
        const yPos = mapY(yVal);
        ctx.beginPath();
        ctx.moveTo(mLeft - 5, yPos);
        ctx.lineTo(width - mRight, yPos);
        ctx.stroke();
        ctx.fillText(yVal.toFixed(yVal % 1 === 0 ? 0 : 1), mLeft - 8, yPos + 3);
    }
    
    // X ticks
    ctx.textAlign = "center";
    for (let i = 0; i <= 5; i++) {
        const xVal = xMin + (i / 5) * (xMax - xMin);
        const xPos = mapX(xVal);
        ctx.beginPath();
        ctx.moveTo(xPos, height - mBottom);
        ctx.lineTo(xPos, mTop);
        ctx.stroke();
        ctx.fillText(xVal.toFixed(xVal % 1 === 0 ? 0 : 1), xPos, height - mBottom + 15);
    }
    
    return { mapX, mapY, plotW, plotH, mLeft, mRight, mTop, mBottom };
}

// ============================================================
// SUB-CALC A: DSC Machine (Differential Scanning Calorimetry)
// ============================================================
(function() {
    const atNiEl = document.getElementById('atNi');
    if (!atNiEl) return;
    
    const testTempEl = document.getElementById('testTemp');
    const valAtNiEl = document.getElementById('valAtNi');
    const valTestTempEl = document.getElementById('valTestTemp');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotCanvas = document.getElementById('plotCanvas');
    const plotCtx = plotCanvas.getContext('2d');
    
    const resMs = document.getElementById('resMs');
    const resMf = document.getElementById('resMf');
    const resAs = document.getElementById('resAs');
    const resAf = document.getElementById('resAf');
    const resHys = document.getElementById('resHys');
    const resXm = document.getElementById('resXm');
    const resXa = document.getElementById('resXa');
    const resEsma = document.getElementById('resEsma');
    const resStrains = document.getElementById('resStrains');
    const equationsContainer = document.getElementById('latexFormulaContainer');
    
    let isAnimating = false;
    let animTemp = -20;
    let animSpeed = 0.8;
    let scene, camera, renderer, smaMesh;

    // Builds the Nitinol specimen geometry. recovery = austenite fraction (1 - x_M):
    //   0 => cold martensite: the programmed shape is "lost" (wire sits deformed/crumpled)
    //   1 => hot austenite: the wire has recovered its straight "printed" shape
    // This is the defining 4D-printing behaviour: a part that changes shape on heating.
    function buildSpecimenGeometry(recovery) {
        const points = [];
        const n = 64;
        const halfLen = 1.12;
        const amp = 0.34 * (1.0 - Math.max(0, Math.min(1, recovery)));
        for (let i = 0; i <= n; i++) {
            const t = i / n;
            const x = (t - 0.5) * 2 * halfLen;
            const envelope = Math.sin(Math.PI * t); // pinned (y=0) at the clamped ends
            const y = amp * envelope * Math.sin(t * Math.PI * 3.0);
            points.push(new THREE.Vector3(x, y, 0));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        return new THREE.TubeGeometry(curve, 128, 0.05, 20, false);
    }

    function calcTemps(atNi) {
        // Duerig Empirical Formula
        const Ms = 1020 - 99.3 * (atNi - 40.91);
        const Mf = Ms - 20;
        const As = Ms + 30;
        const Af = As + 20;
        return { Ms, Mf, As, Af };
    }

    function calcXm(T, As, Af) {
        if (T < As) return 1.0;
        if (T > Af) return 0.0;
        return 0.5 * Math.cos(Math.PI * (T - As) / (Af - As)) + 0.5;
    }

    // Heat Flow calculations for DSC curves
    function calcHeatFlowHeating(T, As, Af) {
        const baseline = -0.2; // mW/mg
        if (T < As || T > Af) return baseline;
        // Endothermic peak (downwards) centered at As + (Af-As)/2
        const peakWidth = Af - As;
        const dT = T - As;
        return baseline - 1.0 * Math.sin(Math.PI * dT / peakWidth);
    }

    function calcHeatFlowCooling(T, Mf, Ms) {
        const baseline = 0.2; // mW/mg
        if (T < Mf || T > Ms) return baseline;
        // Exothermic peak (upwards) centered at Mf + (Ms-Mf)/2
        const peakWidth = Ms - Mf;
        const dT = T - Mf;
        return baseline + 1.0 * Math.sin(Math.PI * dT / peakWidth);
    }

    function updateUI() {
        const atNi = parseFloat(atNiEl.value);
        const testTemp = parseFloat(testTempEl.value);
        
        valAtNiEl.innerText = atNi.toFixed(2) + " at%";
        valTestTempEl.innerText = testTemp.toFixed(0) + " °C";
        
        const { Ms, Mf, As, Af } = calcTemps(atNi);
        const curTemp = isAnimating ? animTemp : testTemp;
        const xm = calcXm(curTemp, As, Af);
        const xa = 1.0 - xm;
        const esma = 8.0 * xa; // e_max = 8%
        
        resMs.innerText = Ms.toFixed(1) + " °C";
        resMf.innerText = Mf.toFixed(1) + " °C";
        resAs.innerText = As.toFixed(1) + " °C";
        resAf.innerText = Af.toFixed(1) + " °C";
        resHys.innerText = (Af - Ms).toFixed(1) + " °C";
        
        resXm.innerText = (xm * 100).toFixed(1) + " %";
        resXa.innerText = (xa * 100).toFixed(1) + " %";
        resEsma.innerText = esma.toFixed(2) + " %";
        
        // Recoverable strains at As + 5, 10, 15
        const esma5 = 8.0 * (1.0 - calcXm(As + 5, As, Af));
        const esma10 = 8.0 * (1.0 - calcXm(As + 10, As, Af));
        const esma15 = 8.0 * (1.0 - calcXm(As + 15, As, Af));
        resStrains.innerHTML = `5°C: <b>${esma5.toFixed(1)}%</b> | 10°C: <b>${esma10.toFixed(1)}%</b> | 15°C: <b>${esma15.toFixed(1)}%</b>`;
        
        // Update live insight
        if (curTemp < As) {
            stateLabel.innerText = "DSC Sample Temp: " + curTemp.toFixed(0) + "°C (Martensite)";
            stateLabel.style.color = "#0ea5e9";
            liveInsight.innerHTML = `<strong>DSC Insight:</strong> Chamber contains a tiny piece of Nitinol wire. Below As, Nitinol is fully in Martensite phase (B19'). Heat flow baseline is steady.`;
        } else if (curTemp > Af) {
            stateLabel.innerText = "DSC Sample Temp: " + curTemp.toFixed(0) + "°C (Austenite)";
            stateLabel.style.color = "#8A1134";
            liveInsight.innerHTML = `<strong>DSC Insight:</strong> Nitinol is fully transformed to Austenite (B2). The endothermic phase transformation peak is complete.`;
        } else {
            stateLabel.innerText = `DSC Sample Temp: ${curTemp.toFixed(0)}°C (Mixed Phase)`;
            stateLabel.style.color = "#d97706";
            liveInsight.innerHTML = `<strong>DSC Insight:</strong> Inside the transformation window (As to Af). Martensite is absorbing heat (endothermic reaction) to transform into Austenite.`;
        }
        
        drawPlots(curTemp, As, Af, Ms, Mf);
        updateThreeScene(curTemp, xm);
        updateEquations(atNi, Ms, Mf, As, Af, curTemp, xm);
    }

    function updateEquations(atNi, Ms, Mf, As, Af, T, xm) {
        equationsContainer.innerHTML = `
            <div style="margin-bottom: 8px;"><b>1. Martensite Start Temperature (Duerig Empirical Model):</b></div>
            <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; margin-bottom: 12px; color: #8A1134;">
                M_s = 1020 - 99.3 × (at% Ni - 40.91) = 1020 - 99.3 × (${atNi.toFixed(2)} - 40.91) = ${Ms.toFixed(1)} °C
            </div>
            <div style="margin-bottom: 8px;"><b>2. Cosine Phase Transformation Kinetics:</b></div>
            <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; margin-bottom: 12px; color: #1e293b;">
                x_M = 0.5 × cos[π × (T - A_s) / (A_f - A_s)] + 0.5 = ${xm.toFixed(3)}
            </div>
            <div style="margin-bottom: 8px;"><b>3. Hysteresis Window Offset:</b></div>
            <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #0ea5e9;">
                ΔT_hysteresis = A_f - M_s = ${Af.toFixed(1)} - ${Ms.toFixed(1)} = ${(Af - Ms).toFixed(1)} °C
            </div>
        `;
    }

    function drawPlots(activeTemp, As, Af, Ms, Mf) {
        // Adaptive temperature axis: transformation temps span roughly -52°C to
        // +118°C across the Ni-composition slider, so a fixed -20..100°C window
        // clipped the DSC peaks (and the active marker) at composition extremes.
        const tT = parseFloat(testTempEl.value);
        const xMin = Math.floor((Math.min(Mf, -20, tT) - 10) / 10) * 10;
        const xMax = Math.ceil((Math.max(Af, tT) + 10) / 10) * 10;
        const { mapX, mapY } = drawGrid(plotCtx, 450, 400, xMin, xMax, -1.5, 1.5, "Temperature T (°C)", "Heat Flow dH/dt (mW/mg) [ Endo Down ]");
        
        // Draw heating curve (Red line)
        plotCtx.strokeStyle = "#8A1134";
        plotCtx.lineWidth = 2.5;
        plotCtx.beginPath();
        for (let t = xMin; t <= xMax; t += 1) {
            const hf = calcHeatFlowHeating(t, As, Af);
            const xPos = mapX(t);
            const yPos = mapY(hf);
            if (t === xMin) plotCtx.moveTo(xPos, yPos);
            else plotCtx.lineTo(xPos, yPos);
        }
        plotCtx.stroke();
        
        // Draw cooling curve (Blue line)
        plotCtx.strokeStyle = "#0ea5e9";
        plotCtx.lineWidth = 2.0;
        plotCtx.beginPath();
        for (let t = xMin; t <= xMax; t += 1) {
            const hf = calcHeatFlowCooling(t, Mf, Ms);
            const xPos = mapX(t);
            const yPos = mapY(hf);
            if (t === xMin) plotCtx.moveTo(xPos, yPos);
            else plotCtx.lineTo(xPos, yPos);
        }
        plotCtx.stroke();
        
        // Draw Hysteresis Window Shaded Region at Y=0
        const Mp = (Ms + Mf) / 2;
        const Ap = (As + Af) / 2;
        plotCtx.fillStyle = "rgba(16, 185, 129, 0.15)";
        plotCtx.fillRect(mapX(Mp), mapY(0.1), mapX(Ap) - mapX(Mp), mapY(-0.1) - mapY(0.1));
        
        // Draw Hysteresis label
        plotCtx.fillStyle = "#10b981";
        plotCtx.font = "bold 9px monospace";
        plotCtx.textAlign = "center";
        plotCtx.fillText("Hysteresis Window", mapX((Mp + Ap)/2), mapY(-0.02));
        
        // Draw A_s & A_f & M_s & M_f vertical indicators
        plotCtx.strokeStyle = "#e2e8f0";
        plotCtx.lineWidth = 1;
        
        // As line
        plotCtx.beginPath();
        plotCtx.moveTo(mapX(As), mapY(-1.5));
        plotCtx.lineTo(mapX(As), mapY(1.5));
        plotCtx.stroke();
        
        // Af line
        plotCtx.beginPath();
        plotCtx.moveTo(mapX(Af), mapY(-1.5));
        plotCtx.lineTo(mapX(Af), mapY(1.5));
        plotCtx.stroke();
        
        // Label As & Af
        plotCtx.fillStyle = "#8A1134";
        plotCtx.font = "9px monospace";
        plotCtx.fillText(`As (${As.toFixed(0)}°C)`, mapX(As) - 20, mapY(-1.3));
        plotCtx.fillText(`Af (${Af.toFixed(0)}°C)`, mapX(Af) + 20, mapY(-1.3));
        
        // Active temperature vertical line & point on heating curve
        const activeX = mapX(activeTemp);
        plotCtx.strokeStyle = "#cbd5e1";
        plotCtx.setLineDash([3, 3]);
        plotCtx.beginPath();
        plotCtx.moveTo(activeX, mapY(-1.5));
        plotCtx.lineTo(activeX, mapY(1.5));
        plotCtx.stroke();
        plotCtx.setLineDash([]);
        
        const activeY = mapY(calcHeatFlowHeating(activeTemp, As, Af));
        plotCtx.fillStyle = "#d97706";
        plotCtx.beginPath();
        plotCtx.arc(activeX, activeY, 6, 0, 2 * Math.PI);
        plotCtx.fill();
        plotCtx.strokeStyle = "#ffffff";
        plotCtx.lineWidth = 2;
        plotCtx.stroke();
    }

    function init3D() {
        const container = document.getElementById('viewport3D');
        if (!container) return;
        
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xeef2f7);
        
        camera = new THREE.PerspectiveCamera(42, 450 / 400, 0.1, 100);
        camera.position.set(0.2, 1.05, 3.75);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(450, 400);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        container.appendChild(renderer.domElement);
        
        const orbit = new THREE.OrbitControls(camera, renderer.domElement);
        orbit.target.set(0, -0.25, 0);
        orbit.update();
        orbit.enableZoom = false;
        
        // ---- Lighting rig (hemisphere ambient + key/fill/rim) ----
        scene.add(new THREE.HemisphereLight(0xffffff, 0x39435a, 0.7));
        const key = new THREE.DirectionalLight(0xffffff, 1.3);
        key.position.set(3.5, 6.0, 4.0);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.camera.near = 1; key.shadow.camera.far = 24;
        key.shadow.camera.left = -4; key.shadow.camera.right = 4;
        key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
        key.shadow.bias = -0.0004;
        key.shadow.radius = 4;
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xaecbff, 0.45);
        fill.position.set(-4, 2, 1.5);
        scene.add(fill);
        const rim = new THREE.DirectionalLight(0xffffff, 0.65);
        rim.position.set(-1.5, 2.5, -5);
        scene.add(rim);
        
        // ---- Contact-shadow ground ----
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.22 }));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1.02;
        ground.receiveShadow = true;
        scene.add(ground);
        
        // ---- Materials (PBR) ----
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2b3445, metalness: 0.45, roughness: 0.55 });
        const trimMat = new THREE.MeshStandardMaterial({ color: 0x0f1623, metalness: 0.5, roughness: 0.5 });
        const platenMat = new THREE.MeshStandardMaterial({ color: 0x222b38, metalness: 0.75, roughness: 0.32 });
        const knobMat = new THREE.MeshStandardMaterial({ color: 0x9aa6b8, metalness: 0.85, roughness: 0.3 });
        const clampMat = new THREE.MeshStandardMaterial({ color: 0x9ba6b6, metalness: 0.9, roughness: 0.26 });
        const jawMat = new THREE.MeshStandardMaterial({ color: 0x39414f, metalness: 0.6, roughness: 0.42 });
        const screwMat = new THREE.MeshStandardMaterial({ color: 0xced4dd, metalness: 0.95, roughness: 0.18 });
        
        // ---- Instrument body (hot-stage controller) ----
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.6, 1.34), bodyMat);
        body.position.set(0, -0.72, 0);
        body.castShadow = true; body.receiveShadow = true;
        scene.add(body);
        // top trim lip
        const lip = new THREE.Mesh(new THREE.BoxGeometry(3.02, 0.07, 1.4), trimMat);
        lip.position.set(0, -0.405, 0);
        lip.castShadow = true; lip.receiveShadow = true;
        scene.add(lip);
        // rubber feet
        for (const sx of [-1.25, 1.25]) {
            for (const sz of [-0.5, 0.5]) {
                const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 20), trimMat);
                foot.position.set(sx, -1.0, sz);
                foot.castShadow = true;
                scene.add(foot);
            }
        }
        // front digital readout panel
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.26, 0.05), trimMat);
        panel.position.set(-0.75, -0.62, 0.69);
        scene.add(panel);
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.16), new THREE.MeshStandardMaterial({ color: 0x07343a, emissive: 0x22d3ee, emissiveIntensity: 0.9, roughness: 0.4 }));
        screen.position.set(-0.75, -0.62, 0.715);
        scene.add(screen);
        // control knobs
        for (let k = 0; k < 3; k++) {
            const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.09, 28), knobMat);
            knob.rotation.x = Math.PI / 2;
            knob.position.set(0.35 + k * 0.32, -0.62, 0.7);
            knob.castShadow = true;
            scene.add(knob);
            const tick = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.02), trimMat);
            tick.position.set(0.35 + k * 0.32, -0.55, 0.755);
            scene.add(tick);
        }
        
        // ---- Heated platen recessed into the top ----
        const platen = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.06, 0.86), platenMat);
        platen.position.set(0, -0.37, 0);
        platen.receiveShadow = true;
        scene.add(platen);
        // glowing heater coil grooves
        const coilMats = [];
        for (let i = 0; i < 7; i++) {
            const cm = new THREE.MeshStandardMaterial({ color: 0x2a1a12, emissive: 0x000000, roughness: 0.5 });
            const groove = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.012, 0.05), cm);
            groove.position.set(0, -0.335, -0.34 + i * 0.113);
            scene.add(groove);
            coilMats.push(cm);
        }
        
        // ---- Clamp posts gripping the wire ends ----
        const clampMeshes = [];
        for (const sx of [-1.12, 1.12]) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.46, 0.4), clampMat);
            post.position.set(sx, -0.11, 0);
            post.castShadow = true; post.receiveShadow = true;
            scene.add(post);
            const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.46), jawMat);
            jaw.position.set(sx, 0.06, 0);
            jaw.castShadow = true;
            scene.add(jaw);
            for (const sz of [-0.13, 0.13]) {
                const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 16), screwMat);
                screw.position.set(sx, 0.13, sz);
                screw.castShadow = true;
                scene.add(screw);
            }
            clampMeshes.push(post, jaw);
        }
        
        // ---- Nitinol specimen (starts deformed / martensite) ----
        const wireMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.55, roughness: 0.3 });
        const wire = new THREE.Mesh(buildSpecimenGeometry(0), wireMat);
        wire.castShadow = true;
        scene.add(wire);
        
        smaMesh = { wire, wireMat, platenMat, coilMats };
        
        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();
    }

    function updateThreeScene(temp, xm) {
        if (!smaMesh) return;
        
        // Austenite fraction drives the shape recovery: 0 deformed -> 1 straight
        const recovery = Math.max(0, Math.min(1, 1.0 - xm));
        smaMesh.wire.geometry.dispose();
        smaMesh.wire.geometry = buildSpecimenGeometry(recovery);
        
        // Crystalline phase colour: martensite (blue) -> austenite (red)
        smaMesh.wireMat.color.setRGB(
            0.13 + recovery * 0.74,
            0.30 - recovery * 0.18,
            0.86 - recovery * 0.74
        );
        
        // Hot specimen glows; platen + coils glow with stage temperature
        const wireGlow = Math.max(0, Math.min(1, (temp - 35) / 65));
        smaMesh.wireMat.emissive.setRGB(wireGlow * 0.55 * recovery, wireGlow * 0.07, 0.0);
        smaMesh.wireMat.emissiveIntensity = 1.0;
        
        const stageGlow = Math.max(0, Math.min(1, (temp + 20) / 120));
        smaMesh.platenMat.emissive.setRGB(stageGlow * 0.28, stageGlow * 0.06, 0.0);
        smaMesh.platenMat.emissiveIntensity = 1.0;
        smaMesh.coilMats.forEach(m => {
            m.emissive.setRGB(0.9 * stageGlow, 0.34 * stageGlow, 0.05 * stageGlow);
            m.emissiveIntensity = 1.6;
        });
    }

    btnRun.addEventListener('click', () => {
        if (isAnimating) return;
        isAnimating = true;
        btnRun.disabled = true;
        btnRun.innerText = "Heating Cycle...";
        btnRun.style.background = "#475569";
        atNiEl.disabled = true;
        testTempEl.disabled = true;
        
        const targetTemp = parseFloat(testTempEl.value);
        animTemp = -20;
        
        const interval = setInterval(() => {
            animTemp += animSpeed;
            if (animTemp >= targetTemp) {
                animTemp = targetTemp;
                isAnimating = false;
                btnRun.disabled = false;
                atNiEl.disabled = false;
                testTempEl.disabled = false;
                btnRun.innerText = "Initiate Thermal Cycle";
                btnRun.style.background = "linear-gradient(135deg, #9f1239, #8A1134)";
                document.getElementById('btnNextCalc').style.display = 'inline-block';
                clearInterval(interval);
            }
            updateUI();
        }, 30);
    });

    atNiEl.addEventListener('input', updateUI);
    testTempEl.addEventListener('input', updateUI);
    
    init3D();
    updateUI();
})();

// ============================================================
// SUB-CALC B: Universal Testing Machine (UTM)
// ============================================================
(function() {
    const relTempEl = document.getElementById('relTemp');
    if (!relTempEl) return;
    
    const maxStrainEl = document.getElementById('maxStrain');
    const valRelTempEl = document.getElementById('valRelTemp');
    const valMaxStrainEl = document.getElementById('valMaxStrain');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotCanvas = document.getElementById('plotCanvas');
    const plotCtx = plotCanvas.getContext('2d');
    
    const resRegime = document.getElementById('resRegime');
    const resAf = document.getElementById('resAf');
    const resPlateau = document.getElementById('resPlateau');
    const resMaxStress = document.getElementById('resMaxStress');
    const resHysteresis = document.getElementById('resHysteresis');
    const resDamping = document.getElementById('resDamping');
    const resComparison = document.getElementById('resComparison');
    const equationsContainer = document.getElementById('latexFormulaContainer');
    
    let isAnimating = false;
    let simStep = 0; // 0: Idle, 1: Loading, 2: Unloading
    let simStrain = 0.0;
    let maxStrainVal = 8.0;
    let scene, camera, renderer, utm;
    
    // Nitinol Constant Properties
    const Af = 18.0; 
    const sigma0 = 150.0;
    const slope = 7.0; 
    
    // ---- Dog-bone specimen geometry (lathed Nitinol tensile coupon) ----
    // The gauge section elongates with strain; the wide grip ends are clamped by
    // the UTM jaws. STRETCH_EXAGG scales the real ~8% strain so the stretch (and
    // the permanent set retained in the Shape-Memory regime) is clearly visible.
    const GAUGE_LEN0 = 1.2, FILLET_LEN = 0.28, GRIP_LEN = 0.44, GRIP_R = 0.2, GAUGE_R = 0.078;
    const SPECIMEN_BOTTOM_Y = -1.15;
    const STRETCH_EXAGG = 2.5;
    function dogboneHalf(gaugeLen) { return gaugeLen / 2 + FILLET_LEN + GRIP_LEN; }
    function buildDogboneGeometry(gaugeLen) {
        const h = dogboneHalf(gaugeLen);
        const gStart = -gaugeLen / 2, gEnd = gaugeLen / 2;
        const filletBotStart = gStart - FILLET_LEN;
        const pts = [];
        const nF = 12;
        pts.push(new THREE.Vector2(0, -h));            // bottom cap (on axis)
        pts.push(new THREE.Vector2(GRIP_R, -h));        // bottom grip outer edge
        pts.push(new THREE.Vector2(GRIP_R, filletBotStart));
        for (let i = 0; i <= nF; i++) {                 // bottom fillet: grip -> gauge
            const t = i / nF;
            const y = filletBotStart + t * FILLET_LEN;
            const rad = GAUGE_R + (GRIP_R - GAUGE_R) * (0.5 + 0.5 * Math.cos(Math.PI * t));
            pts.push(new THREE.Vector2(rad, y));
        }
        pts.push(new THREE.Vector2(GAUGE_R, gEnd));     // straight gauge section
        for (let i = 0; i <= nF; i++) {                 // top fillet: gauge -> grip
            const t = i / nF;
            const y = gEnd + t * FILLET_LEN;
            const rad = GAUGE_R + (GRIP_R - GAUGE_R) * (0.5 - 0.5 * Math.cos(Math.PI * t));
            pts.push(new THREE.Vector2(rad, y));
        }
        pts.push(new THREE.Vector2(GRIP_R, h));         // top grip outer edge
        pts.push(new THREE.Vector2(0, h));              // top cap (on axis)
        return new THREE.LatheGeometry(pts, 48);
    }
    
    function updateUI() {
        const relTemp = parseFloat(relTempEl.value);
        const maxStrain = parseFloat(maxStrainEl.value);
        maxStrainVal = maxStrain;
        
        valRelTempEl.innerText = (relTemp > 0 ? "+" : "") + relTemp.toFixed(0) + " °C";
        valMaxStrainEl.innerText = maxStrain.toFixed(1) + " %";
        
        const testT = Af + relTemp;
        resAf.innerText = Af.toFixed(1) + " °C";
        
        let regime = "Superelasticity";
        let plateauStress = 0.0;
        
        if (relTemp < 0) {
            regime = "Shape Memory Effect";
            plateauStress = 120.0; 
        } else {
            regime = "Superelasticity";
            plateauStress = sigma0 + slope * relTemp; 
        }
        
        resRegime.innerText = regime;
        resPlateau.innerText = plateauStress.toFixed(0) + " MPa";
        
        const { currentStress, maxStressVal } = calcHysteresis(simStrain, relTemp, maxStrain);
        resMaxStress.innerText = maxStressVal.toFixed(0) + " MPa";
        
        // Enclosed hysteresis area calculations
        let wHyst = 0.0;
        let damping = 0.0;
        if (relTemp < 0) {
            wHyst = (plateauStress * (maxStrain - 1.5) * 1.1) / 100.0; 
            if (wHyst < 0) wHyst = 0;
            damping = wHyst / (Math.PI * maxStressVal * (maxStrain / 100.0));
        } else {
            const recoveryOffset = 120.0; 
            wHyst = (recoveryOffset * (maxStrain - 1.5)) / 100.0;
            if (wHyst < 0) wHyst = 0;
            damping = wHyst / (Math.PI * maxStressVal * (maxStrain / 100.0));
        }
        
        if (isNaN(damping) || damping < 0) damping = 0;
        
        resHysteresis.innerText = wHyst.toFixed(2) + " MJ/m³";
        resDamping.innerText = damping.toFixed(3);
        resComparison.innerHTML = `Steel: <b>0.001</b> | Rubber: <b>0.100</b><br><span style="color:#8a1134">Nitinol is <b>${(damping / 0.001).toFixed(0)}x</b> higher than structural steel!</span>`;
        
        if (relTemp < 0) {
            stateLabel.innerText = "UTM: Shape Memory Effect (T < Af)";
            liveInsight.innerHTML = `<strong>UTM Insight:</strong> Temperature is in the cold bath (Below Af). Specimen deforms via detwinning. Upon release, it retains a permanent strain set.`;
        } else {
            stateLabel.innerText = "UTM: Superelasticity (T >= Af)";
            liveInsight.innerHTML = `<strong>UTM Insight:</strong> Temperature is in the hot oven (Above Af). Stress-induced Austenite-Martensite transformation creates a superelastic loop, recovering completely.`;
        }
        
        drawPlots(simStrain, relTemp, maxStrain);
        updateThreeScene(simStrain, currentStress, relTemp);
        updateEquations(relTemp, testT, plateauStress, wHyst, damping, maxStressVal, maxStrain);
    }

    function updateEquations(relTemp, T, plateau, W, damping, sigMax, eMax) {
        if (relTemp < 0) {
            equationsContainer.innerHTML = `
                <div style="margin-bottom: 8px;"><b>1. Martensite Detwinning Yield Stress:</b></div>
                <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; margin-bottom: 12px; color: #0ea5e9;">
                    σ_yield ≈ 120 MPa &nbsp;&nbsp; (Detwinning critical stress)
                </div>
                <div style="margin-bottom: 8px;"><b>2. Permanent Shape Memory Strain Offset:</b></div>
                <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; margin-bottom: 12px; color: #8A1134;">
                    ε_permanent = ε_max - σ_max / E_martensite = ${eMax.toFixed(1)}% - ${(sigMax/250).toFixed(1)}% = ${(eMax - sigMax/250).toFixed(2)}%
                </div>
                <div style="margin-bottom: 8px;"><b>3. Damping Capacity:</b></div>
                <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #d97706;">
                    Q^-1 = W_hysteresis / (π × σ_max × ε_max) = ${damping.toFixed(3)}
                </div>
            `;
        } else {
            equationsContainer.innerHTML = `
                <div style="margin-bottom: 8px;"><b>1. Superelastic Transformation Stress (Clausius-Clapeyron):</b></div>
                <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; margin-bottom: 12px; color: #8A1134;">
                    σ_AM = 150 + 7 × (T - A_f) = 150 + 7 × (${relTemp.toFixed(0)}) = ${plateau.toFixed(0)} MPa
                </div>
                <div style="margin-bottom: 8px;"><b>2. Dissipated Hysteresis Work:</b></div>
                <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; margin-bottom: 12px; color: #10b981;">
                    W_hysteresis = Δσ_plateau × (ε_max - 1.5) / 100 = 120 × ${(eMax - 1.5).toFixed(1)} / 100 = ${W.toFixed(2)} MJ/m³
                </div>
                <div style="margin-bottom: 8px;"><b>3. Damping Capacity:</b></div>
                <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #d97706;">
                    Q^-1 = W_hysteresis / (π × σ_max × ε_max) = ${damping.toFixed(3)}
                </div>
            `;
        }
    }

    function calcHysteresis(strain, relTemp, maxStrain, stepOverride) {
        const activeStep = stepOverride !== undefined ? stepOverride : simStep;
        const E_A = 40.0; // GPa (Austenite modulus)
        const E_M = 25.0; // GPa (Martensite modulus)
        
        const E_start = relTemp < 0 ? E_M : E_A;
        
        // Plateau stress for loading
        let sigma_load_plat = 0.0;
        if (relTemp < 0) {
            sigma_load_plat = 120.0; // detwinning plateau
        } else {
            sigma_load_plat = 150.0 + 7.0 * relTemp; // stress-induced martensite plateau
            if (sigma_load_plat > 500.0) sigma_load_plat = 500.0; // cap at 500 MPa
        }
        
        // Elastic loading ends at strain e1
        const e1 = sigma_load_plat / (E_start * 10.0);
        
        // Plateau ends at strain e2
        const e2 = 6.0; 
        const H_load = 15.0; // hardening slope on plateau
        
        const loadStress = (eps) => {
            if (eps < e1) {
                return eps * E_start * 10.0;
            }
            if (eps <= e2) {
                return sigma_load_plat + H_load * (eps - e1);
            }
            // post-transformation elastic loading
            const sigma2 = sigma_load_plat + H_load * (e2 - e1);
            return sigma2 + E_M * 10.0 * (eps - e2);
        };
        
        const maxStressVal = loadStress(maxStrain);
        
        // Unloading Curve
        const unloadStress = (eps) => {
            if (relTemp < 0) {
                // Shape Memory Effect: purely elastic unloading to permanent set
                const elasticStrain = maxStressVal / (E_M * 10.0);
                const permSet = maxStrain - elasticStrain;
                if (eps <= permSet) return 0.0;
                return (eps - permSet) * E_M * 10.0;
            } else {
                // Superelasticity: unloading with lower plateau
                const sigma_unload_plat_base = Math.max(30.0, sigma_load_plat - 120.0);
                const H_unload = 10.0; // hardening slope on unloading plateau
                
                // Unloading plateau formula: sigma_unload_plat_base + H_unload * (eps - 1.5)
                // We find the intersection of elastic unloading line and unloading plateau:
                // maxStressVal - E_M * 10 * (maxStrain - e3) = sigma_unload_plat_base + H_unload * (e3 - 1.5)
                const denom = E_M * 10.0 - H_unload;
                const num = sigma_unload_plat_base - 1.5 * H_unload - maxStressVal + E_M * 10.0 * maxStrain;
                const e3 = num / denom;
                
                if (e3 < 1.5 || e3 > maxStrain) {
                    // fall back to pure elastic unloading if range is invalid
                    const elasticStrain = maxStressVal / (E_M * 10.0);
                    const permSet = maxStrain - elasticStrain;
                    if (eps <= permSet) return 0.0;
                    return (eps - permSet) * E_M * 10.0;
                }
                
                if (eps >= e3) {
                    return maxStressVal - E_M * 10.0 * (maxStrain - eps);
                }
                if (eps >= 1.5) {
                    return sigma_unload_plat_base + H_unload * (eps - 1.5);
                }
                // final recovery elastic line to 0
                return eps * (sigma_unload_plat_base / 1.5);
            }
        };
        
        let stress = 0.0;
        if (activeStep === 1) {
            stress = loadStress(strain);
        } else if (activeStep === 2) {
            stress = unloadStress(strain);
        } else {
            stress = 0.0;
        }
        
        return { currentStress: stress, maxStressVal };
    }

    function drawPlots(activeStrain, relTemp, maxStrain) {
        // Adaptive stress axis: the loading peak can reach ~1000 MPa once the
        // transformation plateau gives way to stiff martensite loading, so a
        // fixed 600 MPa ceiling clipped the top of the loop for most settings.
        const { maxStressVal } = calcHysteresis(maxStrain, relTemp, maxStrain, 1);
        const yMax = Math.max(300, Math.ceil((maxStressVal * 1.12) / 100) * 100);
        const { mapX, mapY } = drawGrid(plotCtx, 450, 400, 0, 10, 0, yMax, "Strain ε (%)", "Stress σ (MPa)"); 

        let limitStrain = 0.0;
        if (relTemp < 0) {
            const E = 25.0; // GPa
            const { maxStressVal } = calcHysteresis(maxStrain, relTemp, maxStrain, 1);
            limitStrain = maxStrain - maxStressVal / (E * 10);
            if (limitStrain < 0) limitStrain = 0;
        }

        const step = 0.05;

        // 1. Shading the hysteresis loop (only if relTemp >= 0 and we are in unloading phase or finished)
        if (relTemp >= 0 && (simStep === 2 || activeStrain === 0.0)) {
            plotCtx.fillStyle = "rgba(138, 17, 52, 0.08)";
            plotCtx.beginPath();
            // Draw loading path up to maxStrain
            for (let e = 0; e <= maxStrain; e += step) {
                const { currentStress } = calcHysteresis(e, relTemp, maxStrain, 1);
                const xPos = mapX(e);
                const yPos = mapY(currentStress);
                if (e === 0) plotCtx.moveTo(xPos, yPos);
                else plotCtx.lineTo(xPos, yPos);
            }
            // Draw unloading path from maxStrain down to 0
            for (let e = maxStrain; e >= 0; e -= step) {
                const { currentStress } = calcHysteresis(e, relTemp, maxStrain, 2);
                const xPos = mapX(e);
                const yPos = mapY(currentStress);
                plotCtx.lineTo(xPos, yPos);
            }
            plotCtx.closePath();
            plotCtx.fill();
        }

        // 2. Stroke the active path
        plotCtx.strokeStyle = "#8A1134";
        plotCtx.lineWidth = 3;
        plotCtx.beginPath();

        if (simStep === 1) {
            // We are loading: draw loading curve up to activeStrain
            for (let e = 0; e <= activeStrain; e += step) {
                const { currentStress } = calcHysteresis(e, relTemp, maxStrain, 1);
                const xPos = mapX(e);
                const yPos = mapY(currentStress);
                if (e === 0) plotCtx.moveTo(xPos, yPos);
                else plotCtx.lineTo(xPos, yPos);
            }
        } else if (simStep === 2) {
            // We are unloading: draw full loading curve up to maxStrain
            for (let e = 0; e <= maxStrain; e += step) {
                const { currentStress } = calcHysteresis(e, relTemp, maxStrain, 1);
                const xPos = mapX(e);
                const yPos = mapY(currentStress);
                if (e === 0) plotCtx.moveTo(xPos, yPos);
                else plotCtx.lineTo(xPos, yPos);
            }
            // and unloading curve from maxStrain down to activeStrain
            for (let e = maxStrain; e >= activeStrain; e -= step) {
                const { currentStress } = calcHysteresis(e, relTemp, maxStrain, 2);
                const xPos = mapX(e);
                const yPos = mapY(currentStress);
                plotCtx.lineTo(xPos, yPos);
            }
        } else {
            // Animation is done: draw full loading and unloading curves
            for (let e = 0; e <= maxStrain; e += step) {
                const { currentStress } = calcHysteresis(e, relTemp, maxStrain, 1);
                const xPos = mapX(e);
                const yPos = mapY(currentStress);
                if (e === 0) plotCtx.moveTo(xPos, yPos);
                else plotCtx.lineTo(xPos, yPos);
            }
            for (let e = maxStrain; e >= limitStrain; e -= step) {
                const { currentStress } = calcHysteresis(e, relTemp, maxStrain, 2);
                const xPos = mapX(e);
                const yPos = mapY(currentStress);
                plotCtx.lineTo(xPos, yPos);
            }
        }
        plotCtx.stroke();

        // 3. Draw active dot
        let currentStep = 1;
        if (simStep === 1) {
            currentStep = 1;
        } else if (simStep === 2) {
            currentStep = 2;
        } else {
            currentStep = (activeStrain > 0 && Math.abs(activeStrain - limitStrain) < 0.1) ? 2 : 1;
        }
        const { currentStress } = calcHysteresis(activeStrain, relTemp, maxStrain, currentStep);
        plotCtx.fillStyle = "#d97706";
        plotCtx.beginPath();
        plotCtx.arc(mapX(activeStrain), mapY(currentStress), 6, 0, 2 * Math.PI);
        plotCtx.fill();
        plotCtx.strokeStyle = "#ffffff";
        plotCtx.lineWidth = 2;
        plotCtx.stroke();
    }

    function init3D() {
        const container = document.getElementById('viewport3D');
        if (!container) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xeef2f7);

        camera = new THREE.PerspectiveCamera(44, 450 / 400, 0.1, 100);
        camera.position.set(1.5, 0.5, 7.4);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(450, 400);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        container.appendChild(renderer.domElement);

        const orbit = new THREE.OrbitControls(camera, renderer.domElement);
        orbit.target.set(0, 0.1, 0);
        orbit.update();
        orbit.enableZoom = false;

        // ---- Lighting rig (hemisphere ambient + key/fill/rim) ----
        scene.add(new THREE.HemisphereLight(0xffffff, 0x39435a, 0.7));
        const key = new THREE.DirectionalLight(0xffffff, 1.3);
        key.position.set(4.0, 6.5, 5.0);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.camera.near = 1; key.shadow.camera.far = 30;
        key.shadow.camera.left = -5; key.shadow.camera.right = 5;
        key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
        key.shadow.bias = -0.0004;
        key.shadow.radius = 4;
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xaecbff, 0.45);
        fill.position.set(-5, 2, 2);
        scene.add(fill);
        const rim = new THREE.DirectionalLight(0xffffff, 0.6);
        rim.position.set(-2, 3, -5);
        scene.add(rim);

        // ---- Contact-shadow ground ----
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.22 }));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2.42;
        ground.receiveShadow = true;
        scene.add(ground);

        // ---- Materials (PBR) ----
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x2b3445, metalness: 0.5, roughness: 0.5 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f1623, metalness: 0.5, roughness: 0.5 });
        const steelMat = new THREE.MeshStandardMaterial({ color: 0x9aa6b8, metalness: 0.9, roughness: 0.25 });
        const crossMat = new THREE.MeshStandardMaterial({ color: 0x3a4456, metalness: 0.55, roughness: 0.5 });
        const jawMat = new THREE.MeshStandardMaterial({ color: 0x39414f, metalness: 0.6, roughness: 0.42 });
        const screwMat = new THREE.MeshStandardMaterial({ color: 0xced4dd, metalness: 0.95, roughness: 0.18 });

        // Reusable wedge-action tensile grip (housing + clamp plates + bolts)
        function makeGrip() {
            const g = new THREE.Group();
            const housing = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.46, 0.46), jawMat);
            housing.castShadow = true; housing.receiveShadow = true;
            g.add(housing);
            for (const sz of [-0.26, 0.26]) {
                const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.06), crossMat);
                plate.position.set(0, 0, sz);
                plate.castShadow = true;
                g.add(plate);
                for (const sx of [-0.2, 0.2]) {
                    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 6), screwMat);
                    bolt.rotation.x = Math.PI / 2;
                    bolt.position.set(sx, 0, sz);
                    bolt.castShadow = true;
                    g.add(bolt);
                }
            }
            return g;
        }

        // ---- Base plate, feet, control panel ----
        const base = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.36, 1.7), frameMat);
        base.position.set(0, -2.18, 0);
        base.castShadow = true; base.receiveShadow = true;
        scene.add(base);
        const baseLip = new THREE.Mesh(new THREE.BoxGeometry(3.22, 0.06, 1.82), darkMat);
        baseLip.position.set(0, -1.99, 0);
        scene.add(baseLip);
        for (const sx of [-1.3, 1.3]) for (const sz of [-0.62, 0.62]) {
            const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 20), darkMat);
            foot.position.set(sx, -2.4, sz);
            foot.castShadow = true;
            scene.add(foot);
        }
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.24, 0.05), darkMat);
        panel.position.set(-0.95, -2.12, 0.86);
        scene.add(panel);
        const screenMat = new THREE.MeshStandardMaterial({ color: 0x07343a, emissive: 0x22d3ee, emissiveIntensity: 0.9, roughness: 0.4 });
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.15), screenMat);
        screen.position.set(-0.95, -2.12, 0.886);
        scene.add(screen);
        for (let k = 0; k < 3; k++) {
            const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.07, 24), steelMat);
            knob.rotation.x = Math.PI / 2;
            knob.position.set(0.25 + k * 0.28, -2.12, 0.88);
            knob.castShadow = true;
            scene.add(knob);
        }

        // ---- Two guide columns + collars ----
        for (const sx of [-1.18, 1.18]) {
            const col = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 4.7, 28), steelMat);
            col.position.set(sx, 0.2, -0.08);
            col.castShadow = true;
            scene.add(col);
            for (const cy of [-1.55, 2.15]) {
                const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.14, 28), crossMat);
                collar.position.set(sx, cy, -0.08);
                collar.castShadow = true;
                scene.add(collar);
            }
        }

        // ---- Top fixed head ----
        const head = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.42, 1.0), frameMat);
        head.position.set(0, 2.62, -0.08);
        head.castShadow = true; head.receiveShadow = true;
        scene.add(head);

        // ---- Lower fixed load train: table -> load cell -> stem -> grip ----
        const table = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 0.95), crossMat);
        table.position.set(0, -1.78, 0);
        table.castShadow = true; table.receiveShadow = true;
        scene.add(table);
        const loadCell = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.38, 36), steelMat);
        loadCell.position.set(0, -1.48, 0);
        loadCell.castShadow = true;
        scene.add(loadCell);
        const loadBand = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.09, 36), darkMat);
        loadBand.position.set(0, -1.48, 0);
        scene.add(loadBand);
        const lowerStem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.45, 24), steelMat);
        lowerStem.position.set(0, -1.12, 0);
        lowerStem.castShadow = true;
        scene.add(lowerStem);
        const lowerGrip = makeGrip();
        lowerGrip.position.set(0, SPECIMEN_BOTTOM_Y + GRIP_LEN / 2, 0);
        scene.add(lowerGrip);

        // ---- Environmental chamber (hot oven / cold bath) around the gauge ----
        const chamberMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.0, roughness: 0.1, transparent: true, opacity: 0.1, depthWrite: false });
        const chamber = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.9, 40, 1, true), chamberMat);
        chamber.position.set(0, 0.2, 0);
        scene.add(chamber);
        for (const cy of [-0.75, 1.15]) {
            const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.1, 40), crossMat);
            flange.position.set(0, cy, 0);
            flange.castShadow = true;
            scene.add(flange);
        }
        const coilMats = [];
        for (let i = 0; i < 3; i++) {
            const cm = new THREE.MeshStandardMaterial({ color: 0x2a1a12, emissive: 0x000000, roughness: 0.5 });
            const coil = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 10, 40), cm);
            coil.rotation.x = Math.PI / 2;
            coil.position.set(0, -0.55 + i * 0.16, 0);
            scene.add(coil);
            coilMats.push(cm);
        }

        // ---- Travel ruler + crosshead pointer ----
        const ruler = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.6, 0.06), steelMat);
        ruler.position.set(-1.95, 0.4, 0.2);
        scene.add(ruler);
        const tickMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
        for (let i = 0; i <= 18; i++) {
            const tick = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.02), tickMat);
            tick.position.set(-1.86, -1.4 + i * 0.2, 0.24);
            scene.add(tick);
        }
        const pointerBaseY = 1.8;
        const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 4), new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.3, roughness: 0.4 }));
        pointer.rotation.z = -Math.PI / 2;
        pointer.position.set(-1.82, pointerBaseY, 0.24);
        scene.add(pointer);

        // ---- Moving crosshead assembly (travels up as the specimen stretches) ----
        const moving = new THREE.Group();
        const crosshead = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.34, 0.92), frameMat);
        crosshead.position.set(0, 1.8, -0.08);
        crosshead.castShadow = true; crosshead.receiveShadow = true;
        moving.add(crosshead);
        for (const sx of [-1.18, 1.18]) {
            const bush = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 28), crossMat);
            bush.position.set(sx, 1.8, -0.08);
            bush.castShadow = true;
            moving.add(bush);
        }
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.62, 24), steelMat);
        rod.position.set(0, 1.535, 0);
        rod.castShadow = true;
        moving.add(rod);
        const upperGrip = makeGrip();
        upperGrip.position.set(0, SPECIMEN_BOTTOM_Y + 2 * dogboneHalf(GAUGE_LEN0) - GRIP_LEN / 2, 0);
        moving.add(upperGrip);
        scene.add(moving);

        // ---- Nitinol dog-bone specimen ----
        const wireMat = new THREE.MeshStandardMaterial({ color: 0x8f9bb0, metalness: 0.85, roughness: 0.26 });
        const specimen = new THREE.Mesh(buildDogboneGeometry(GAUGE_LEN0), wireMat);
        specimen.castShadow = true;
        specimen.position.y = SPECIMEN_BOTTOM_Y + dogboneHalf(GAUGE_LEN0);
        scene.add(specimen);

        utm = { specimen, wireMat, moving, chamberMat, coilMats, screenMat, pointer, pointerBaseY };

        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();
    }

    function updateThreeScene(strain, stress, relTemp) {
        if (!utm) return;

        // Gauge elongation (exaggerated so the ~8% strain & retained set are visible)
        const gaugeLen = GAUGE_LEN0 * (1 + (strain / 100) * STRETCH_EXAGG);
        utm.specimen.geometry.dispose();
        utm.specimen.geometry = buildDogboneGeometry(gaugeLen);
        utm.specimen.position.y = SPECIMEN_BOTTOM_Y + dogboneHalf(gaugeLen);
        const dL = gaugeLen - GAUGE_LEN0;
        utm.moving.position.y = dL;
        utm.pointer.position.y = utm.pointerBaseY + dL;

        const clamp = (v) => Math.max(0, Math.min(1, v));

        // Crystalline phase colour: cold martensite (blue-grey) -> hot austenite (silver)
        const coldness = clamp(-relTemp / 8);
        let r = 0.72 - coldness * 0.30;
        let g = 0.74 - coldness * 0.22;
        let b = 0.78 + coldness * 0.04;
        // Stress-induced martensite tint under load
        const sr = clamp(stress / 700);
        r = clamp(r + sr * 0.18);
        g = clamp(g - sr * 0.10);
        b = clamp(b - sr * 0.16);
        utm.wireMat.color.setRGB(r, g, b);
        utm.wireMat.emissive.setRGB(sr * 0.1, 0.0, 0.0);

        // Environmental chamber + heater glow signal the thermal regime
        if (relTemp >= 0) {
            utm.chamberMat.color.setHex(0xf97316);
            utm.chamberMat.opacity = 0.1;
            const hotness = clamp(relTemp / 30);
            utm.coilMats.forEach(m => {
                m.emissive.setRGB(0.95 * hotness, 0.34 * hotness, 0.04 * hotness);
                m.emissiveIntensity = 1.6;
            });
            utm.screenMat.emissive.setHex(0xf97316);
        } else {
            utm.chamberMat.color.setHex(0x38bdf8);
            utm.chamberMat.opacity = 0.14;
            utm.coilMats.forEach(m => { m.emissive.setRGB(0, 0, 0); });
            utm.screenMat.emissive.setHex(0x22d3ee);
        }
    }

    btnRun.addEventListener('click', () => {
        if (isAnimating) return;
        isAnimating = true;
        btnRun.disabled = true;
        btnRun.innerText = "Testing...";
        btnRun.style.background = "#475569";
        relTempEl.disabled = true;
        maxStrainEl.disabled = true;
        
        simStep = 1;
        simStrain = 0.0;
        
        const relTemp = parseFloat(relTempEl.value);
        
        const interval = setInterval(() => {
            if (simStep === 1) {
                simStrain += 0.25;
                if (simStrain >= maxStrainVal) {
                    simStrain = maxStrainVal;
                    simStep = 2; 
                }
            } else if (simStep === 2) {
                simStrain -= 0.25;
                
                let limitStrain = 0.0;
                if (relTemp < 0) {
                    const E = 25.0; 
                    const { maxStressVal } = calcHysteresis(maxStrainVal, relTemp, maxStrainVal);
                    limitStrain = maxStrainVal - maxStressVal / (E * 10);
                    if (limitStrain < 0) limitStrain = 0;
                }
                
                if (simStrain <= limitStrain) {
                    simStrain = limitStrain;
                    simStep = 0;
                    isAnimating = false;
                    btnRun.disabled = false;
                    relTempEl.disabled = false;
                    maxStrainEl.disabled = false;
                    btnRun.innerText = "Run Stress-Strain Test";
                    btnRun.style.background = "linear-gradient(135deg, #9f1239, #8A1134)";
                    document.getElementById('btnNextCalc').style.display = 'inline-block';
                    clearInterval(interval);
                }
            }
            updateUI();
        }, 40);
    });

    relTempEl.addEventListener('input', () => {
        if (!isAnimating) {
            simStrain = 0.0;
            simStep = 0;
        }
        updateUI();
    });
    maxStrainEl.addEventListener('input', () => {
        if (!isAnimating) {
            simStrain = 0.0;
            simStep = 0;
        }
        updateUI();
    });
    
    init3D();
    updateUI();
})();

// ============================================================
// SUB-CALC C: Bench Power Supply & Thermocouple
// ============================================================
(function() {
    const inputCurrentEl = document.getElementById('inputCurrent');
    if (!inputCurrentEl) return;
    
    const dwEl = document.getElementById('dw');
    const valDwEl = document.getElementById('valDw');
    const valCurrentEl = document.getElementById('valCurrent');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotCanvas = document.getElementById('plotCanvas');
    const plotCtx = plotCanvas.getContext('2d');
    
    const resTact = document.getElementById('resTact');
    const resTss = document.getElementById('resTss');
    const resStatus = document.getElementById('resStatus');
    const resRm = document.getElementById('resRm');
    const resRa = document.getElementById('resRa');
    const resPower = document.getElementById('resPower');
    const equationsContainer = document.getElementById('latexFormulaContainer');
    
    let isAnimating = false;
    let time = 0.0;
    let temp = 20.0; 
    const timePoints = [];
    const tempPoints = [];
    let scene, camera, renderer, joule;
    
    const L = 0.1; 
    const h = 25.0; 
    const Cp = 320.0; 
    const rho_density = 6450.0; 
    const rho_A = 82e-8; 
    const rho_M = 100e-8; 
    const T_amb = 20.0;
    const As = 48.0;
    const Af = 68.0;

    // ---- 3D actuation geometry (Joule-heated SMA wire) ----
    // The wire is clamped at a fixed left post; its right end rides a sprung
    // slider. As current heats it through As->Af it transforms to austenite and
    // CONTRACTS, pulling the slider left and stretching the bias spring. This is
    // the work-producing shape-memory stroke (contraction exaggerated for view).
    const WIRE_LEFT_X = -1.5;
    const WIRE_L0 = 2.5;
    const WIRE_CONTRACT = 0.18;
    const WIRE_R = 0.05;
    const SPRING_ANCHOR_X = 1.95;
    function buildJouleWire(length) {
        return new THREE.CylinderGeometry(WIRE_R, WIRE_R, length, 24, 1);
    }
    function buildCoilSpring() {
        // Unit-length helix centred on the origin, axis along +X (scaled in X to fit)
        const pts = [];
        const turns = 9, n = 220, R = 0.12;
        for (let i = 0; i <= n; i++) {
            const t = i / n;
            const a = t * Math.PI * 2 * turns;
            pts.push(new THREE.Vector3(t - 0.5, R * Math.cos(a), R * Math.sin(a)));
        }
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 300, 0.022, 9, false);
    }

    function calcResistance(dw, xM) {
        const A_wire = Math.PI * Math.pow(dw * 1e-6, 2) / 4.0;
        const Ra = rho_A * L / A_wire;
        const Rm = rho_M * L / A_wire;
        const R = Ra + (Rm - Ra) * xM;
        return { R, Ra, Rm };
    }

    function calcXM(T) {
        if (T < As) return 1.0;
        if (T > Af) return 0.0;
        return 0.5 * Math.cos(Math.PI * (T - As) / (Af - As)) + 0.5;
    }

    // Activation time obtained by integrating the SAME electro-thermal ODE that
    // drives the animation (temperature-dependent resistance R(T)). The previous
    // closed-form used a constant austenite resistance, which over-predicted
    // t_act by 8-25% relative to where the plotted curve actually crosses A_f.
    function calcActivation(dw, current) {
        const A_wire = Math.PI * Math.pow(dw * 1e-6, 2) / 4.0;
        const A_surface = Math.PI * (dw * 1e-6) * L;
        const m = rho_density * A_wire * L;
        const Ra = rho_A * L / A_wire;
        const Rm = rho_M * L / A_wire;
        const T_ss = T_amb + (Math.pow(current, 2) * Ra) / (h * A_surface);
        if (T_ss <= Af) return Infinity; // asymptotes below A_f: never actuates
        let t = 0.0;
        let T = T_amb;
        const dt = 0.01;
        const cap = 600.0;
        while (T < Af && t < cap) {
            const R = Ra + (Rm - Ra) * calcXM(T);
            const dTdt = (Math.pow(current, 2) * R - h * A_surface * (T - T_amb)) / (m * Cp);
            T += dTdt * dt;
            t += dt;
        }
        return t >= cap ? Infinity : t;
    }

    function updateUI() {
        const dw = parseFloat(dwEl.value);
        const current = parseFloat(inputCurrentEl.value);
        
        valDwEl.innerText = dw.toFixed(0) + " μm";
        valCurrentEl.innerText = current.toFixed(2) + " A";
        
        const xm = calcXM(temp);
        const { R, Ra, Rm } = calcResistance(dw, xm);
        
        resRm.innerText = Rm.toFixed(2) + " Ω";
        resRa.innerText = Ra.toFixed(2) + " Ω";
        
        // Peak power is generated cold, when the wire is fully martensite and
        // its resistance R_M is highest (R drops ~20% once it becomes austenite).
        const power = Math.pow(current, 2) * Rm;
        resPower.innerText = power.toFixed(2) + " W";
        
        const A_surface = Math.PI * (dw * 1e-6) * L;
        const deltaTss = (Math.pow(current, 2) * Ra) / (h * A_surface);
        const T_ss = T_amb + deltaTss;
        
        resTss.innerText = T_ss.toFixed(1) + " °C";
        
        let tActVal = calcActivation(dw, current);
        const m = rho_density * (Math.PI * Math.pow(dw * 1e-6, 2) / 4.0) * L;
        
        if (!isFinite(tActVal)) {
            tActVal = Infinity;
            resTact.innerText = "Never Actuates (Too cold)";
            resStatus.innerText = "Insufficient Current";
            resStatus.style.color = "#ef4444";
        } else {
            resTact.innerText = tActVal.toFixed(2) + " s";
            
            if (T_ss > 150.0) {
                resStatus.innerText = "Danger: Oxidation / Training Loss";
                resStatus.style.color = "#ef4444";
            } else {
                resStatus.innerText = "Safe Actuation Regime";
                resStatus.style.color = "#10b981";
            }
        }
        
        if (isAnimating) {
            stateLabel.innerText = `Wire Temp: ${temp.toFixed(1)}°C`;
            if (temp < As) {
                stateLabel.style.color = "#0ea5e9";
                liveInsight.innerHTML = `<strong>Joule Actuation Insight:</strong> Wire temperature is below As. Low current heating.`;
            } else if (temp > Af) {
                stateLabel.style.color = "#8A1134";
                liveInsight.innerHTML = `<strong>Joule Actuation Insight:</strong> Wire temperature is above Af. Austenite transformation is complete.`;
            } else {
                stateLabel.style.color = "#d97706";
                liveInsight.innerHTML = `<strong>Joule Actuation Insight:</strong> Inside phase transformation window. Resistance is changing.`;
            }
        } else {
            stateLabel.innerText = "System: Room Temp (20°C)";
            stateLabel.style.color = "#64748b";
            liveInsight.innerHTML = `<strong>Joule Actuation Insight:</strong> Apply electric current to heat the Nitinol wire. Austenite transformation starts at As and finishes at Af, causing a 20% drop in resistance.`;
        }
        
        drawPlots();
        updateThreeScene(temp);
        updateEquations(current, R, dw, m, A_surface, T_ss, tActVal);
    }

    function updateEquations(I, R, dw, m, A_surf, T_ss, tAct) {
        equationsContainer.innerHTML = `
            <div style="margin-bottom: 8px;"><b>1. Joule Heating ODE (Resistance Dependent):</b></div>
            <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; margin-bottom: 12px; color: #8A1134;">
                dT/dt = [ I² × R(T) - h × A_surf × (T - T_amb) ] / (m × C_p)
            </div>
            <div style="margin-bottom: 8px;"><b>2. Steady-State Temperature (Austenite):</b></div>
            <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; margin-bottom: 12px; color: #1e293b;">
                T_ss = T_amb + (I² × R_A) / (h × A_surf) = ${T_ss.toFixed(1)} °C
            </div>
            <div style="margin-bottom: 8px;"><b>3. Time to Actuate (Reach Af = 68°C):</b></div>
            <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #0ea5e9;">
                t_act = ${tAct === Infinity ? "Infinity (T_ss <= Af)" : tAct.toFixed(3) + " seconds"}
            </div>
        `;
    }

    function drawPlots() {
        const { mapX, mapY, plotW, plotH, mLeft, mTop } = drawGrid(plotCtx, 450, 400, 0, 10, 0, 180, "Time t (s)", "Temperature T (°C)");
        
        plotCtx.strokeStyle = "#cbd5e1";
        plotCtx.lineWidth = 1;
        plotCtx.setLineDash([3, 3]);
        
        plotCtx.beginPath();
        plotCtx.moveTo(mapX(0), mapY(As));
        plotCtx.lineTo(mapX(10), mapY(As));
        plotCtx.stroke();
        
        plotCtx.beginPath();
        plotCtx.moveTo(mapX(0), mapY(Af));
        plotCtx.lineTo(mapX(10), mapY(Af));
        plotCtx.stroke();
        plotCtx.setLineDash([]);
        
        plotCtx.fillStyle = "#64748b";
        plotCtx.font = "9px monospace";
        plotCtx.fillText(`As (${As}°C)`, mapX(0.5), mapY(As) - 4);
        plotCtx.fillText(`Af (${Af}°C)`, mapX(0.5), mapY(Af) - 4);
        
        // Clip drawing to grid area
        plotCtx.save();
        plotCtx.beginPath();
        plotCtx.rect(mLeft, mTop, plotW, plotH);
        plotCtx.clip();
        
        plotCtx.strokeStyle = "#8A1134";
        plotCtx.lineWidth = 3;
        plotCtx.beginPath();
        for (let i = 0; i < timePoints.length; i++) {
            const xPos = mapX(timePoints[i]);
            const yPos = mapY(tempPoints[i]);
            if (i === 0) plotCtx.moveTo(xPos, yPos);
            else plotCtx.lineTo(xPos, yPos);
        }
        plotCtx.stroke();
        
        if (timePoints.length > 0) {
            const lastTime = timePoints[timePoints.length - 1];
            const lastTemp = tempPoints[tempPoints.length - 1];
            
            // Draw active dot
            plotCtx.fillStyle = "#d97706";
            plotCtx.beginPath();
            plotCtx.arc(mapX(lastTime), mapY(lastTemp), 6, 0, 2 * Math.PI);
            plotCtx.fill();
            plotCtx.strokeStyle = "#ffffff";
            plotCtx.lineWidth = 2;
            plotCtx.stroke();
        }
        plotCtx.restore();
    }

    function init3D() {
        const container = document.getElementById('viewport3D');
        if (!container) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xeef2f7);

        camera = new THREE.PerspectiveCamera(45, 450 / 400, 0.1, 100);
        camera.position.set(1.2, 1.0, 5.3);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(450, 400);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        container.appendChild(renderer.domElement);

        const orbit = new THREE.OrbitControls(camera, renderer.domElement);
        orbit.target.set(0, -0.15, -0.1);
        orbit.update();
        orbit.enableZoom = false;

        // ---- Lighting rig ----
        scene.add(new THREE.HemisphereLight(0xffffff, 0x39435a, 0.7));
        const key = new THREE.DirectionalLight(0xffffff, 1.25);
        key.position.set(3.5, 6, 4.5);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.camera.near = 1; key.shadow.camera.far = 26;
        key.shadow.camera.left = -5; key.shadow.camera.right = 5;
        key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
        key.shadow.bias = -0.0004; key.shadow.radius = 4;
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xaecbff, 0.45);
        fill.position.set(-4, 2, 3); scene.add(fill);
        const rim = new THREE.DirectionalLight(0xffffff, 0.6);
        rim.position.set(-2, 3, -5); scene.add(rim);

        // ---- Contact-shadow ground ----
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.22 }));
        ground.rotation.x = -Math.PI / 2; ground.position.y = -1.12; ground.receiveShadow = true;
        scene.add(ground);

        // ---- Materials (PBR) ----
        const psuBodyMat = new THREE.MeshStandardMaterial({ color: 0x2b3445, metalness: 0.5, roughness: 0.5 });
        const psuPanelMat = new THREE.MeshStandardMaterial({ color: 0x141b27, metalness: 0.5, roughness: 0.5 });
        const knobMat = new THREE.MeshStandardMaterial({ color: 0x9aa6b8, metalness: 0.85, roughness: 0.3 });
        const railMat = new THREE.MeshStandardMaterial({ color: 0x1b2230, metalness: 0.6, roughness: 0.45 });
        const benchMat = new THREE.MeshStandardMaterial({ color: 0x3a4250, metalness: 0.2, roughness: 0.8 });
        const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xe8ecf2, metalness: 0.0, roughness: 0.5 });
        const clampMat = new THREE.MeshStandardMaterial({ color: 0xc9a23a, metalness: 0.9, roughness: 0.3 });
        const screwMat = new THREE.MeshStandardMaterial({ color: 0xced4dd, metalness: 0.95, roughness: 0.18 });
        const wireMat = new THREE.MeshStandardMaterial({ color: 0x6b7687, metalness: 0.6, roughness: 0.35 });
        const springMat = new THREE.MeshStandardMaterial({ color: 0xb9c0cc, metalness: 0.9, roughness: 0.28 });
        const dispVMat = new THREE.MeshStandardMaterial({ color: 0x06222b, emissive: 0x22d3ee, emissiveIntensity: 1.1, roughness: 0.4 });
        const dispIMat = new THREE.MeshStandardMaterial({ color: 0x2a1a06, emissive: 0xf59e0b, emissiveIntensity: 1.1, roughness: 0.4 });
        const beadMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3, emissive: 0x000000 });
        const readoutMat = new THREE.MeshStandardMaterial({ color: 0x222b38, metalness: 0.3, roughness: 0.6 });
        const readoutScreenMat = new THREE.MeshStandardMaterial({ color: 0x06280f, emissive: 0x22c55e, emissiveIntensity: 1.0, roughness: 0.4 });

        function makeCable(p0, p1, mat) {
            const mid = new THREE.Vector3((p0.x + p1.x) / 2, Math.min(p0.y, p1.y) - 0.45, (p0.z + p1.z) / 2 + 0.12);
            const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, mid, p1]), 40, 0.034, 10, false), mat);
            m.castShadow = true;
            return m;
        }
        function makePost(x) {
            const g = new THREE.Group();
            const insl = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.78, 24), ceramicMat);
            insl.position.y = -0.4; insl.castShadow = true; g.add(insl);
            const clamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 20), clampMat);
            clamp.position.y = 0.02; clamp.castShadow = true; g.add(clamp);
            const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.26, 12), screwMat);
            screw.rotation.z = Math.PI / 2; screw.position.y = 0.02; screw.castShadow = true; g.add(screw);
            g.position.set(x, 0, 0.2);
            return g;
        }

        // ---- Lab bench top ----
        const bench = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 1.9), benchMat);
        bench.position.set(0, -1.02, 0);
        bench.receiveShadow = true; bench.castShadow = true;
        scene.add(bench);

        // ---- Bench DC power supply ----
        const psu = new THREE.Group();
        const psuBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.15, 1.0), psuBodyMat);
        psuBody.castShadow = true; psuBody.receiveShadow = true; psu.add(psuBody);
        const psuFace = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.05, 0.04), psuPanelMat);
        psuFace.position.set(0, 0, 0.5); psu.add(psuFace);
        const dispV = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.34), dispVMat);
        dispV.position.set(-0.55, 0.22, 0.525); psu.add(dispV);
        const dispI = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.34), dispIMat);
        dispI.position.set(0.35, 0.22, 0.525); psu.add(dispI);
        for (let k = 0; k < 3; k++) {
            const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.1, 28), knobMat);
            knob.rotation.x = Math.PI / 2; knob.position.set(-0.6 + k * 0.5, -0.28, 0.54);
            knob.castShadow = true; psu.add(knob);
        }
        const termRed = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 18), new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.4, roughness: 0.4 }));
        termRed.rotation.x = Math.PI / 2; termRed.position.set(0.7, -0.28, 0.55); psu.add(termRed);
        const termBlk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 18), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.4, roughness: 0.4 }));
        termBlk.rotation.x = Math.PI / 2; termBlk.position.set(0.95, -0.28, 0.55); psu.add(termBlk);
        psu.position.set(0, -0.32, -1.35);
        scene.add(psu);

        // ---- Mounting rail ----
        const rail = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.12, 0.5), railMat);
        rail.position.set(0, -0.86, 0.2);
        rail.castShadow = true; rail.receiveShadow = true;
        scene.add(rail);

        // ---- Fixed left post + right anchor post ----
        scene.add(makePost(WIRE_LEFT_X));
        scene.add(makePost(SPRING_ANCHOR_X));

        // ---- Sprung slider carrying the wire's right end ----
        const slider = new THREE.Group();
        const sliderBase = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.4), new THREE.MeshStandardMaterial({ color: 0x556070, metalness: 0.7, roughness: 0.35 }));
        sliderBase.position.y = -0.8; sliderBase.castShadow = true; slider.add(sliderBase);
        const sliderCol = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.78, 20), new THREE.MeshStandardMaterial({ color: 0x6b7687, metalness: 0.8, roughness: 0.3 }));
        sliderCol.position.y = -0.4; sliderCol.castShadow = true; slider.add(sliderCol);
        const sliderClamp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 20), clampMat);
        sliderClamp.position.y = 0.0; sliderClamp.castShadow = true; slider.add(sliderClamp);
        slider.position.set(WIRE_LEFT_X + WIRE_L0, 0, 0.2);
        scene.add(slider);

        // ---- Bias spring (helix scaled along X) ----
        const spring = new THREE.Mesh(buildCoilSpring(), springMat);
        spring.position.set(0, 0, 0.2);
        spring.castShadow = true;
        scene.add(spring);

        // ---- Nitinol wire ----
        const wire = new THREE.Mesh(buildJouleWire(WIRE_L0), wireMat);
        wire.rotation.z = Math.PI / 2;
        wire.position.set(WIRE_LEFT_X + WIRE_L0 / 2, 0, 0.2);
        wire.castShadow = true;
        scene.add(wire);

        // ---- Thermocouple bead + readout box ----
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 18), beadMat);
        bead.position.set(WIRE_LEFT_X + WIRE_L0 / 2, 0.06, 0.2);
        scene.add(bead);
        const readout = new THREE.Group();
        const rbody = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.5), readoutMat);
        rbody.castShadow = true; readout.add(rbody);
        const rscreen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.22), readoutScreenMat);
        rscreen.position.set(0, 0.04, 0.255); readout.add(rscreen);
        readout.position.set(1.2, -0.55, 0.95);
        scene.add(readout);

        // ---- Cables (current path + thermocouple lead) ----
        scene.add(makeCable(new THREE.Vector3(0.7, -0.6, -0.8), new THREE.Vector3(WIRE_LEFT_X, -0.1, 0.2), new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.2, roughness: 0.6 })));
        scene.add(makeCable(new THREE.Vector3(0.95, -0.6, -0.8), new THREE.Vector3(SPRING_ANCHOR_X, -0.1, 0.2), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.2, roughness: 0.6 })));
        scene.add(makeCable(new THREE.Vector3(-0.2, 0.06, 0.22), new THREE.Vector3(1.2, -0.42, 0.95), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.2, roughness: 0.6 })));

        joule = { wire, wireMat, slider, spring, bead, beadMat, dispVMat, dispIMat };

        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();
    }

    function updateThreeScene(temperature) {
        if (!joule) return;
        const clamp01 = (v) => Math.max(0, Math.min(1, v));

        // Austenite fraction drives the contraction stroke (cold=0 -> hot=1)
        const recovery = clamp01(1 - calcXM(temperature));
        const length = WIRE_L0 * (1 - recovery * WIRE_CONTRACT);
        const xRight = WIRE_LEFT_X + length;

        joule.wire.geometry.dispose();
        joule.wire.geometry = buildJouleWire(length);
        joule.wire.position.x = WIRE_LEFT_X + length / 2;
        joule.bead.position.x = WIRE_LEFT_X + length / 2;
        joule.slider.position.x = xRight;
        const span = Math.max(0.05, SPRING_ANCHOR_X - xRight);
        joule.spring.scale.x = span;
        joule.spring.position.x = (xRight + SPRING_ANCHOR_X) / 2;

        // Temperature colour + incandescent glow
        const normTemp = clamp01((temperature - 20.0) / 130.0);
        const isOxidized = temperature > 150.0;
        const r = isOxidized ? 0.16 : (0.30 + normTemp * 0.68);
        const g = isOxidized ? 0.16 : (0.34 - normTemp * 0.10);
        const b = isOxidized ? 0.16 : (0.42 - normTemp * 0.34);
        joule.wireMat.color.setRGB(r, g, b);
        if (temperature > As) {
            const glow = clamp01((temperature - As) / (180.0 - As));
            joule.wireMat.emissive.setRGB(glow * 0.9, glow * 0.28, 0.0);
            joule.wireMat.emissiveIntensity = 1.4;
            joule.beadMat.emissive.setRGB(glow * 0.7, glow * 0.2, 0.0);
        } else {
            joule.wireMat.emissive.setRGB(0, 0, 0);
            joule.beadMat.emissive.setRGB(0, 0, 0);
        }
    }

    btnRun.addEventListener('click', () => {
        if (isAnimating) return;
        isAnimating = true;
        btnRun.disabled = true;
        btnRun.innerText = "Actuating...";
        btnRun.style.background = "#475569";
        dwEl.disabled = true;
        inputCurrentEl.disabled = true;
        
        time = 0.0;
        temp = 20.0;
        timePoints.length = 0;
        tempPoints.length = 0;
        
        const dw = parseFloat(dwEl.value);
        const current = parseFloat(inputCurrentEl.value);
        const A_surface = Math.PI * (dw * 1e-6) * L;
        const m = rho_density * (Math.PI * Math.pow(dw * 1e-6, 2) / 4.0) * L;
        const dt = 0.05; 
        
        const interval = setInterval(() => {
            time += dt;
            const xm = calcXM(temp);
            const { R } = calcResistance(dw, xm);
            const heatInput = Math.pow(current, 2) * R;
            const heatLoss = h * A_surface * (temp - T_amb);
            const dTdt = (heatInput - heatLoss) / (m * Cp);
            
            temp += dTdt * dt;
            
            timePoints.push(time);
            tempPoints.push(temp);
            
            updateUI();
            
            if (time >= 10.0) {
                isAnimating = false;
                btnRun.disabled = false;
                dwEl.disabled = false;
                inputCurrentEl.disabled = false;
                btnRun.innerText = "Run Electrical Actuation";
                btnRun.style.background = "linear-gradient(135deg, #9f1239, #8A1134)";
                document.getElementById('btnNextCalc').style.display = 'inline-block';
                clearInterval(interval);
            }
        }, 35);
    });

    dwEl.addEventListener('input', () => {
        if (!isAnimating) {
            timePoints.length = 0;
            tempPoints.length = 0;
            temp = 20.0;
            time = 0.0;
        }
        updateUI();
    });
    inputCurrentEl.addEventListener('input', () => {
        if (!isAnimating) {
            timePoints.length = 0;
            tempPoints.length = 0;
            temp = 20.0;
            time = 0.0;
        }
        updateUI();
    });
    
    init3D();
    updateUI();
})();

// ============================================================
// SUB-CALC D: Actuator Rig with Load Cell
// ============================================================
(function() {
    const wireLenEl = document.getElementById('wireLen');
    if (!wireLenEl) return;
    
    const dwEl = document.getElementById('dw');
    const preStrainEl = document.getElementById('preStrain');
    const valWireLenEl = document.getElementById('valWireLen');
    const valDwEl = document.getElementById('valDw');
    const valPreStrainEl = document.getElementById('valPreStrain');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotCanvas = document.getElementById('plotCanvas');
    const plotCtx = plotCanvas.getContext('2d');
    
    const resStroke = document.getElementById('resStroke');
    const resForce = document.getElementById('resForce');
    const resWork = document.getElementById('resWork');
    const resSpecWork = document.getElementById('resSpecWork');
    const resComparison = document.getElementById('resComparison');
    const equationsContainer = document.getElementById('latexFormulaContainer');
    
    let isAnimating = false;
    let simProgress = 0.0; 
    let scene, camera, renderer, rig;

    // ---- Scissor-gripper actuator geometry ----
    // Two crossed arms pivot at a central joint. The SMA wire spans the two rear
    // handles; on heating it contracts, pulling the handles together which (via
    // the scissor action) drives the front jaws closed onto the work-piece. An
    // antagonist bias spring across the handles re-opens the jaws as it cools.
    const PIVOT_X = 0.4, PIVOT_Y = 0.15;   // central scissor pivot (world)
    const HANDLE_LEN = 1.0;                 // rear handle arm length
    const JAW_LEN = 1.42;                   // front jaw arm length
    const THETA_OPEN = 0.42;                // half-splay angle when open
    const THETA_CLOSED = 0.06;              // half-splay angle when closed
    
    function updateUI() {
        const wireLen = parseFloat(wireLenEl.value);
        const dw = parseFloat(dwEl.value);
        const preStrain = parseFloat(preStrainEl.value);
        
        valWireLenEl.innerText = wireLen.toFixed(0) + " mm";
        valDwEl.innerText = dw.toFixed(0) + " μm";
        valPreStrainEl.innerText = preStrain.toFixed(1) + " %";
        
        const stroke = (preStrain / 100.0) * wireLen; 
        const sigmaRecovery = 400.0; 
        const A_wire = Math.PI * Math.pow(dw * 1e-3, 2) / 4.0; 
        const force = sigmaRecovery * A_wire; 
        
        const work = (force * (stroke * 1e-3)) / 2.0; 
        const rho_density = 6450.0; 
        const vol_m3 = (A_wire * 1e-6) * (wireLen * 1e-3);
        const mass = rho_density * vol_m3;
        const specWork = work / mass;
        
        resStroke.innerText = stroke.toFixed(2) + " mm";
        resForce.innerText = force.toFixed(2) + " N";
        resWork.innerText = (work * 1000).toFixed(1) + " mJ";
        resSpecWork.innerText = specWork.toFixed(0) + " J/kg";
        
        resComparison.innerHTML = `SMP: <b>5 J/kg</b> | Pneumatic: <b>100 J/kg</b> | Hydraulic: <b>1000 J/kg</b><br><span style="color:#8a1134">Nitinol specific work is <b>${(specWork / 100.0).toFixed(0)}x</b> higher than Pneumatics!</span>`;
        
        if (isAnimating) {
            const curStroke = stroke * simProgress;
            const curForce = force * simProgress;
            stateLabel.innerText = `Rig Actuating: Stroke = ${curStroke.toFixed(1)} mm, Force = ${curForce.toFixed(2)} N`;
            stateLabel.style.color = "#8A1134";
            liveInsight.innerHTML = `<strong>Actuator Insight:</strong> Wire is heated and contracting, generating stroke and pulling against the load cell.`;
        } else {
            stateLabel.innerText = "Actuator Rig Status: Idle";
            stateLabel.style.color = "#64748b";
            liveInsight.innerHTML = `<strong>Actuator Insight:</strong> Set wire length and diameter. Pre-strain determines stroke capacity.`;
        }
        
        drawPlots(simProgress, stroke, force);
        updateThreeScene(simProgress);
        updateEquations(preStrain, wireLen, stroke, sigmaRecovery, A_wire, force, work, mass, specWork);
    }

    function updateEquations(eps, L, d, sigma, A, F, W, m, w_sp) {
        equationsContainer.innerHTML = `
            <div style="margin-bottom: 8px;"><b>1. Wire Actuator Contraction Stroke:</b></div>
            <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; margin-bottom: 12px; color: #8A1134;">
                d_stroke = ε_pre × L_wire = ${(eps/100).toFixed(3)} × ${L.toFixed(0)} mm = ${d.toFixed(2)} mm
            </div>
            <div style="margin-bottom: 8px;"><b>2. Maximum Blocking Force (Fully Constrained):</b></div>
            <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; margin-bottom: 12px; color: #1e293b;">
                F_block = σ_recovery × A_wire = ${sigma.toFixed(0)} MPa × ${A.toFixed(4)} mm² = ${F.toFixed(2)} N
            </div>
            <div style="margin-bottom: 8px;"><b>3. Mechanical Actuation Specific Work:</b></div>
            <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #0ea5e9;">
                w_sp = ( (F_block × d_stroke) / 2 ) / m_wire = ${w_sp.toFixed(0)} J/kg
            </div>
        `;
    }

    function drawPlots(progress, maxStroke, maxForce) {
        const { mapX, mapY } = drawGrid(plotCtx, 450, 400, 0, maxStroke * 1.2, 0, maxForce * 1.2, "Contraction stroke d (mm)", "Force F (N)");
        
        plotCtx.strokeStyle = "#8A1134";
        plotCtx.lineWidth = 2.5;
        plotCtx.beginPath();
        plotCtx.moveTo(mapX(0), mapY(0));
        plotCtx.lineTo(mapX(maxStroke), mapY(maxForce));
        plotCtx.stroke();
        
        plotCtx.fillStyle = "rgba(138, 17, 52, 0.08)";
        plotCtx.beginPath();
        plotCtx.moveTo(mapX(0), mapY(0));
        plotCtx.lineTo(mapX(maxStroke * progress), mapY(maxForce * progress));
        plotCtx.lineTo(mapX(maxStroke * progress), mapY(0));
        plotCtx.closePath();
        plotCtx.fill();
        
        plotCtx.fillStyle = "#d97706";
        plotCtx.beginPath();
        plotCtx.arc(mapX(maxStroke * progress), mapY(maxForce * progress), 6, 0, 2 * Math.PI);
        plotCtx.fill();
        plotCtx.strokeStyle = "#ffffff";
        plotCtx.lineWidth = 2;
        plotCtx.stroke();
    }

    function createSpringGeometry(length, turns, radius) {
        const points = [];
        const steps = turns * 24;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const angle = t * turns * Math.PI * 2;
            const x = (t - 0.5) * length;
            const y = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius;
            points.push(new THREE.Vector3(x, y, z));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        return new THREE.TubeGeometry(curve, 48, 0.02, 6, false);
    }

    function init3D() {
        const container = document.getElementById('viewport3D');
        if (!container) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xeef2f7);

        camera = new THREE.PerspectiveCamera(45, 450 / 400, 0.1, 100);
        camera.position.set(1.7, 0.95, 5.2);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(450, 400);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        container.appendChild(renderer.domElement);

        const orbit = new THREE.OrbitControls(camera, renderer.domElement);
        orbit.target.set(0.5, 0.0, 0);
        orbit.update();
        orbit.enableZoom = false;

        // ---- Lighting rig ----
        scene.add(new THREE.HemisphereLight(0xffffff, 0x39435a, 0.7));
        const key = new THREE.DirectionalLight(0xffffff, 1.25);
        key.position.set(3.5, 6, 5); key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.camera.near = 1; key.shadow.camera.far = 30;
        key.shadow.camera.left = -6; key.shadow.camera.right = 6; key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
        key.shadow.bias = -0.0004; key.shadow.radius = 4;
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xaecbff, 0.45); fill.position.set(-5, 2, 3); scene.add(fill);
        const rim = new THREE.DirectionalLight(0xffffff, 0.6); rim.position.set(-2, 3, -5); scene.add(rim);

        const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.22 }));
        ground.rotation.x = -Math.PI / 2; ground.position.y = -1.12; ground.receiveShadow = true; scene.add(ground);

        // ---- Materials (PBR) ----
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x2b3445, metalness: 0.5, roughness: 0.5 });
        const steelMat = new THREE.MeshStandardMaterial({ color: 0x9aa6b8, metalness: 0.9, roughness: 0.25 });
        const armMat = new THREE.MeshStandardMaterial({ color: 0x59647a, metalness: 0.75, roughness: 0.35 });
        const padMat = new THREE.MeshStandardMaterial({ color: 0x1f2632, metalness: 0.2, roughness: 0.85 });
        const springMat = new THREE.MeshStandardMaterial({ color: 0xb9c0cc, metalness: 0.9, roughness: 0.28 });
        const wireMat = new THREE.MeshStandardMaterial({ color: 0x8a1134, metalness: 0.5, roughness: 0.35 });
        const objMat = new THREE.MeshStandardMaterial({ color: 0x1f9d6b, metalness: 0.25, roughness: 0.5 });
        const screenMat = new THREE.MeshStandardMaterial({ color: 0x07343a, emissive: 0x22d3ee, emissiveIntensity: 0.9, roughness: 0.4 });

        // ---- Bench + control box with readout ----
        const bench = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.2, 1.7), new THREE.MeshStandardMaterial({ color: 0x3a4250, metalness: 0.2, roughness: 0.8 }));
        bench.position.set(0.4, -1.02, 0); bench.receiveShadow = true; bench.castShadow = true; scene.add(bench);
        const ctrl = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), frameMat);
        ctrl.position.set(-1.55, -0.66, 0.2); ctrl.castShadow = true; scene.add(ctrl);
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.26), screenMat);
        screen.position.set(-1.55, -0.6, 0.505); scene.add(screen);
        for (let k = 0; k < 2; k++) {
            const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.07, 20), steelMat);
            knob.rotation.x = Math.PI / 2; knob.position.set(-1.78 + k * 0.22, -0.84, 0.5); scene.add(knob);
        }

        // ---- Pivot support post + pin ----
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.2, 0.4), frameMat);
        post.position.set(PIVOT_X, PIVOT_Y - 0.72, -0.12); post.castShadow = true; post.receiveShadow = true; scene.add(post);
        const pivotPin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 24), steelMat);
        pivotPin.rotation.x = Math.PI / 2; pivotPin.position.set(PIVOT_X, PIVOT_Y, 0); pivotPin.castShadow = true; scene.add(pivotPin);

        // ---- Scissor arm builder (bar from -HANDLE_LEN..+JAW_LEN, pivot at origin) ----
        function makeArm(padSign) {
            const g = new THREE.Group();
            const total = HANDLE_LEN + JAW_LEN;
            const bar = new THREE.Mesh(new THREE.BoxGeometry(total, 0.14, 0.16), armMat);
            bar.position.set((JAW_LEN - HANDLE_LEN) / 2, 0, 0); bar.castShadow = true; g.add(bar);
            const pad = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.2), padMat);
            pad.position.set(JAW_LEN - 0.22, padSign * 0.1, 0); g.add(pad);
            const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 18), steelMat);
            knob.position.set(-HANDLE_LEN, 0, 0); knob.castShadow = true; g.add(knob);
            return g;
        }
        const arm1 = makeArm(+1);   // lower jaw (rotated -theta), pad faces up
        const arm2 = makeArm(-1);   // upper jaw (rotated +theta), pad faces down
        arm1.position.set(PIVOT_X, PIVOT_Y, 0.06);
        arm2.position.set(PIVOT_X, PIVOT_Y, -0.06);
        scene.add(arm1); scene.add(arm2);

        // ---- Work-piece (green can held by the jaws) ----
        const obj = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.55, 28), objMat);
        body.castShadow = true; obj.add(body);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.07, 20), steelMat);
        cap.position.y = 0.31; obj.add(cap);
        obj.position.set(PIVOT_X + JAW_LEN * Math.cos(THETA_CLOSED), PIVOT_Y, 0);
        scene.add(obj);

        // ---- SMA wire across the handles (vertical; scaled/positioned per frame) ----
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 16), wireMat);
        wire.castShadow = true; scene.add(wire);

        // ---- Antagonist bias spring across the handles (z-offset) ----
        const spring = new THREE.Mesh(createSpringGeometry(1, 9, 0.1), springMat);
        spring.rotation.z = Math.PI / 2; spring.castShadow = true; scene.add(spring);

        rig = { arm1, arm2, wire, wireMat, spring };

        function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); }
        animate();
    }

    function updateThreeScene(progress) {
        if (!rig) return;
        const p = Math.max(0, Math.min(1, progress));
        const theta = THETA_OPEN + (THETA_CLOSED - THETA_OPEN) * p;

        rig.arm1.rotation.z = -theta;   // lower jaw
        rig.arm2.rotation.z = +theta;   // upper jaw

        const handleX = PIVOT_X - HANDLE_LEN * Math.cos(theta);
        const handleSpan = 2 * HANDLE_LEN * Math.sin(theta);

        // SMA wire across the handles contracts as the jaws close
        rig.wire.scale.y = Math.max(0.02, handleSpan);
        rig.wire.position.set(handleX, PIVOT_Y, 0);

        // bias spring across the handles (compressed as the wire contracts)
        rig.spring.geometry.dispose();
        rig.spring.geometry = createSpringGeometry(Math.max(0.05, handleSpan), 9, 0.1);
        rig.spring.position.set(handleX, PIVOT_Y, 0.28);

        // wire heat colour + incandescent glow
        const r = 0.54 + p * 0.42, g = 0.10 + p * 0.45, b = 0.20 - p * 0.14;
        rig.wireMat.color.setRGB(Math.min(1, r), Math.min(1, g), Math.max(0, b));
        if (p > 0.05) {
            rig.wireMat.emissive.setRGB(p * 0.85, p * 0.28, 0.0);
            rig.wireMat.emissiveIntensity = 1.3;
        } else {
            rig.wireMat.emissive.setRGB(0, 0, 0);
        }
    }

    btnRun.addEventListener('click', () => {
        if (isAnimating) return;
        isAnimating = true;
        btnRun.disabled = true;
        btnRun.innerText = "Actuating...";
        btnRun.style.background = "#475569";
        wireLenEl.disabled = true;
        dwEl.disabled = true;
        preStrainEl.disabled = true;
        
        simProgress = 0.0;
        
        const interval = setInterval(() => {
            simProgress += 0.02;
            if (simProgress >= 1.0) {
                simProgress = 1.0;
                isAnimating = false;
                btnRun.disabled = false;
                wireLenEl.disabled = false;
                dwEl.disabled = false;
                preStrainEl.disabled = false;
                btnRun.innerText = "Execute Actuator Sizing";
                btnRun.style.background = "linear-gradient(135deg, #9f1239, #8A1134)";
                document.getElementById('btnNextCalc').style.display = 'inline-block';
                clearInterval(interval);
            }
            updateUI();
        }, 30);
    });

    wireLenEl.addEventListener('input', updateUI);
    dwEl.addEventListener('input', updateUI);
    preStrainEl.addEventListener('input', updateUI);
    
    init3D();
    updateUI();
})();

// ============================================================
// SUB-CALC E: Fatigue Rig (Rotating Bending)
// ============================================================
(function() {
    const appliedStrainEl = document.getElementById('appliedStrain');
    if (!appliedStrainEl) return;
    
    const valAppliedStrainEl = document.getElementById('valAppliedStrain');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotCanvas = document.getElementById('plotCanvas');
    const plotCtx = plotCanvas.getContext('2d');
    
    const resCycles = document.getElementById('resCycles');
    const resStatus = document.getElementById('resStatus');
    const resDegstrain = document.getElementById('resDegstrain');
    const resLoss = document.getElementById('resLoss');
    const equationsContainer = document.getElementById('latexFormulaContainer');
    
    let isAnimating = false;
    let animCycle = 0;
    let scene, camera, renderer, controls, rig;

    // --- R.R. Moore rotating-beam rig constants ---
    const SPEC_LEN   = 2.4;    // specimen length along the X (rotation) axis
    const SPEC_R_END = 0.17;   // shoulder radius
    const SPEC_R_MID = 0.072;  // gauge (waist) radius
    const ROT_SPEED  = 0.22;   // spin speed (rad/frame)
    const LOAD_X     = 0.52;   // |x| of the two inner loading bearings

    // --- Fatigue model parameters (Sub-Calc E) ---
    const FATIGUE_C      = 8.0;     // Coffin-Manson fit constant; N = C / e^2 (slope -2, c = -0.5)
    const SAFE_THRESHOLD = 4000;    // N above this = durable finite-life; below = low-cycle fatigue
    const DEG_K0         = 1.2e-6;  // base per-cycle functional-fatigue rate
    const DEG_N          = 1.8;     // strain-amplitude sensitivity exponent for functional fatigue
    const DEG_CYCLES     = 10000;   // reference cycle count for recoverable-strain evaluation

    // Structural fatigue life N from applied bending-strain amplitude.
    // Shared by the readouts, the S-N plot and the 3D animation so all three stay consistent.
    function fatigueLife(strainPercent) {
        const eFrac = strainPercent / 100.0;
        return FATIGUE_C / Math.pow(eFrac, 2);
    }
    
    function updateUI() {
        const strain = parseFloat(appliedStrainEl.value);
        valAppliedStrainEl.innerText = strain.toFixed(1) + " %";
        
        const strainFraction = strain / 100.0;
        const cycles = fatigueLife(strain);
        
        resCycles.innerText = cycles.toLocaleString(undefined, { maximumFractionDigits: 0 }) + " cycles";
        
        if (cycles > SAFE_THRESHOLD) {
            resStatus.innerText = "Durable (finite-life range)";
            resStatus.style.color = "#10b981";
        } else {
            resStatus.innerText = "Low-cycle fatigue (high strain)";
            resStatus.style.color = "#ef4444";
        }
        
        const kDeg = DEG_K0 * Math.pow(strain, DEG_N);
        const finalStrain = strain * Math.exp(-kDeg * DEG_CYCLES);
        resDegstrain.innerText = finalStrain.toFixed(2) + " %";
        
        const loss = ((strain - finalStrain) / strain) * 100.0;
        resLoss.innerText = loss.toFixed(1) + " %";
        
        const curCycle = animCycle;
        if (!isAnimating && curCycle > 0) {
            stateLabel.innerText = `Fractured at ${curCycle.toLocaleString()} cycles`;
        } else {
            stateLabel.innerText = `Counter: ${curCycle.toLocaleString()} cycles`;
        }
        
        if (isAnimating) {
            const pct = Math.min((curCycle / cycles) * 100, 100);
            liveInsight.innerHTML = `<strong>Fatigue Insight:</strong> ${pct.toFixed(0)}% of fatigue life consumed &mdash; ${curCycle.toLocaleString()} of ~${cycles.toLocaleString(undefined, { maximumFractionDigits: 0 })} cycles.`;
        } else if (curCycle > 0) {
            liveInsight.innerHTML = `<strong>Fatigue Insight:</strong> Specimen fractured at its predicted life of ~${cycles.toLocaleString(undefined, { maximumFractionDigits: 0 })} cycles (crack initiates near 70% of life).`;
        } else {
            liveInsight.innerHTML = `<strong>Fatigue Insight:</strong> Set the strain amplitude. Higher strains drastically decrease fatigue cycle life.`;
        }
        
        drawPlots(strain);
        updateThreeScene(strain);
        updateEquations(strain, strainFraction, cycles, finalStrain, loss);
    }

    function updateEquations(eps, eFrac, N, eRec, loss) {
        const kDeg = DEG_K0 * Math.pow(eps, DEG_N);
        equationsContainer.innerHTML = `
            <div style="margin-bottom: 8px;"><b>1. Coffin-Manson Bending Fatigue Model (slope -2, c = -0.5):</b></div>
            <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; margin-bottom: 12px; color: #8A1134;">
                N_cycles = C / ε_applied² = ${FATIGUE_C} / ${eFrac.toFixed(4)}² = ${N.toLocaleString(undefined, { maximumFractionDigits: 0 })} cycles
            </div>
            <div style="margin-bottom: 8px;"><b>2. Functional Fatigue (strain-dependent recoverable-strain decay):</b></div>
            <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; margin-bottom: 12px; color: #1e293b;">
                k = k₀·ε^${DEG_N} = ${DEG_K0.toExponential(1)} × ${eps.toFixed(1)}^${DEG_N} = ${kDeg.toExponential(2)} /cycle<br>
                ε_recoverable = ε_applied × exp(-k·N_ref) = ${eps.toFixed(1)} × exp(-${kDeg.toExponential(2)} × ${DEG_CYCLES.toLocaleString()}) = ${eRec.toFixed(2)} %
            </div>
            <div style="margin-bottom: 8px;"><b>3. Functional Capacity Loss @ ${DEG_CYCLES.toLocaleString()} cycles:</b></div>
            <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #0ea5e9;">
                Loss = ((ε_applied - ε_rec) / ε_applied) × 100% = ${loss.toFixed(1)} %
            </div>
            <div style="margin-top: 10px; font-size: 0.85em; color: #64748b; line-height: 1.5;">
                Note: structural fatigue life (N_cycles to fracture) and functional fatigue (loss of recoverable strain) are distinct mechanisms; both worsen as strain amplitude rises.
            </div>
        `;
    }

    function drawPlots(activeStrain) {
        const { mapX } = drawGrid(plotCtx, 450, 400, 1, 10, 1e2, 1e6, "Strain Amplitude ε (%)", "Cycle Life N (Log scale)");
        
        const mapLogY = (y) => {
            const logMin = Math.log10(1e2);
            const logMax = Math.log10(1e6);
            const logY = Math.log10(y);
            const plotH = 400 - 30 - 50;
            return 400 - 50 - ((logY - logMin) / (logMax - logMin)) * plotH;
        };
        
        plotCtx.strokeStyle = "#8A1134";
        plotCtx.lineWidth = 2.5;
        plotCtx.beginPath();
        for (let e = 1.0; e <= 9.0; e += 0.1) {
            const eFrac = e / 100.0;
            const N = FATIGUE_C / Math.pow(eFrac, 2);
            const xPos = mapX(e);
            const yPos = mapLogY(N);
            if (e === 1.0) plotCtx.moveTo(xPos, yPos);
            else plotCtx.lineTo(xPos, yPos);
        }
        plotCtx.stroke();
        
        const eFrac = activeStrain / 100.0;
        const activeN = FATIGUE_C / Math.pow(eFrac, 2);
        plotCtx.fillStyle = "#d97706";
        plotCtx.beginPath();
        plotCtx.arc(mapX(activeStrain), mapLogY(activeN), 6, 0, 2 * Math.PI);
        plotCtx.fill();
        plotCtx.strokeStyle = "#ffffff";
        plotCtx.lineWidth = 2;
        plotCtx.stroke();
    }

    // Specimen radius profile (continuous-radius hourglass beam)
    function specRadius(x) {
        const u = Math.min(Math.abs(x) / (SPEC_LEN * 0.5), 1);
        return SPEC_R_MID + (SPEC_R_END - SPEC_R_MID) * Math.pow(u, 1.7);
    }

    // Straight hourglass specimen, long axis along world X (so it can spin about X)
    function createWireGeometry() {
        const points = [];
        const segments = 64;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const xAxis = (t - 0.5) * SPEC_LEN;
            points.push(new THREE.Vector2(specRadius(xAxis), xAxis));
        }
        const geom = new THREE.LatheGeometry(points, 56);
        // Lathe builds around Y; remap so the long axis lies along world X.
        const pos = geom.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const rad = pos.getX(i);    // radial component
            const axis = pos.getY(i);   // along-length component
            const z = pos.getZ(i);
            pos.setXYZ(i, axis, rad, z);
        }
        geom.computeVertexNormals();
        return geom;
    }

    // Helical witness stripe so the spin is clearly visible
    function createStripeGeometry() {
        const pts = [];
        const segs = 200, turns = 6;
        for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            const x = (t - 0.5) * SPEC_LEN;
            const r = specRadius(x) + 0.006;
            const a = t * turns * Math.PI * 2;
            pts.push(new THREE.Vector3(x, Math.cos(a) * r, Math.sin(a) * r));
        }
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, 0.012, 8, false);
    }

    function init3D() {
        const container = document.getElementById('viewport3D');
        if (!container) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xeef2f7);

        camera = new THREE.PerspectiveCamera(45, 450 / 400, 0.1, 100);
        camera.position.set(0.5, 1.0, 5.1);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(450, 400);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        container.appendChild(renderer.domElement);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableZoom = false;
        controls.target.set(0, -0.28, 0);
        controls.update();

        // ---- lighting rig ----
        scene.add(new THREE.HemisphereLight(0xffffff, 0x39435a, 0.7));
        const key = new THREE.DirectionalLight(0xffffff, 1.05);
        key.position.set(3.5, 5.2, 4.0);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.bias = -0.0004;
        key.shadow.radius = 4;
        key.shadow.camera.near = 0.5;
        key.shadow.camera.far = 25;
        key.shadow.camera.left = -7; key.shadow.camera.right = 7;
        key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xaecbff, 0.45);
        fill.position.set(-4.5, 2.2, -2.5);
        scene.add(fill);
        const rim = new THREE.DirectionalLight(0xffffff, 0.6);
        rim.position.set(0, 3.0, -5.5);
        scene.add(rim);

        // ---- ground shadow catcher ----
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.ShadowMaterial({ opacity: 0.22 }));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1.05;
        ground.receiveShadow = true;
        scene.add(ground);

        // ---- shared materials ----
        const matBed    = new THREE.MeshStandardMaterial({ color: 0x2b3442, metalness: 0.6, roughness: 0.5 });
        const matMotor  = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.55, roughness: 0.45 });
        const matSteel  = new THREE.MeshStandardMaterial({ color: 0x9aa6b4, metalness: 0.85, roughness: 0.3 });
        const matSteelD = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.35 });
        const matBrass  = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.8, roughness: 0.35 });
        const matSpec   = new THREE.MeshStandardMaterial({ color: 0xcfd6de, metalness: 0.92, roughness: 0.26 });
        const matWeight = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.5, roughness: 0.55 });

        const addShadow = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

        // ---- machine base slab (open center lets the load hang freely) ----
        const base = addShadow(new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.16, 1.5), matBed));
        base.position.set(0, -1.0, 0);
        scene.add(base);
        const rail = addShadow(new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.16, 0.16), matBed));
        rail.position.set(0, -0.78, -0.66);
        scene.add(rail);

        // ---- drive motor (left) ----
        const motorGrp = new THREE.Group();
        const motorBody = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 28), matMotor));
        motorBody.rotation.z = Math.PI / 2;
        motorGrp.add(motorBody);
        for (let i = 0; i < 7; i++) {
            const fin = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.02, 28), matMotor));
            fin.rotation.z = Math.PI / 2;
            fin.position.x = -0.4 + i * 0.13;
            motorGrp.add(fin);
        }
        const motorFace = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 24), matSteelD));
        motorFace.rotation.z = Math.PI / 2;
        motorFace.position.x = 0.52;
        motorGrp.add(motorFace);
        motorGrp.position.set(-2.05, 0, 0);
        scene.add(motorGrp);
        const mount = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.62, 0.95), matSteelD));
        mount.position.set(-2.05, -0.71, 0);
        scene.add(mount);

        // ---- drive coupling (spins) ----
        const drive = new THREE.Group();
        const couple = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.22, 20), matSteel));
        couple.rotation.z = Math.PI / 2;
        drive.add(couple);
        const keyMark = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.05),
            new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.3, roughness: 0.5 })));
        keyMark.position.set(0, 0.16, 0);
        drive.add(keyMark);
        drive.position.set(-1.5, 0, 0);
        scene.add(drive);

        // ---- pillow-block bearings (stationary supports) ----
        function pillowBlock(px) {
            const g = new THREE.Group();
            const ped = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.74, 0.5), matSteelD));
            ped.position.y = -0.55;
            g.add(ped);
            const cap = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 20), matSteel));
            cap.rotation.z = Math.PI / 2;
            g.add(cap);
            const bolt1 = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), matSteel));
            bolt1.position.set(0, 0.16, 0.18); g.add(bolt1);
            const bolt2 = bolt1.clone(); bolt2.position.z = -0.18; g.add(bolt2);
            g.position.set(px, 0, 0);
            scene.add(g);
            return g;
        }
        pillowBlock(-1.4);
        pillowBlock(1.4);

        // ---- collets / chucks (spin with specimen) ----
        function collet(px, flip) {
            const g = new THREE.Group();
            const body = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.42, 20), matSteelD));
            body.rotation.z = Math.PI / 2;
            g.add(body);
            for (let i = 0; i < 3; i++) {
                const jaw = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.04), matSteel));
                const a = (i / 3) * Math.PI * 2;
                jaw.position.set(0, Math.cos(a) * 0.2, Math.sin(a) * 0.2);
                jaw.rotation.x = a;
                g.add(jaw);
            }
            const nose = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.22, 20), matSteel));
            nose.rotation.z = Math.PI / 2;
            nose.position.x = flip ? -0.28 : 0.28;
            g.add(nose);
            g.position.set(px, 0, 0);
            scene.add(g);
            return g;
        }
        const chuckL = collet(-1.02, false);
        const chuckR = collet(1.02, true);

        // ---- specimen (Nitinol hourglass, spins about X) ----
        const spec = addShadow(new THREE.Mesh(createWireGeometry(), matSpec));
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0x8a1134, metalness: 0.5, roughness: 0.4, emissive: 0x3a0713, emissiveIntensity: 0.25 });
        const stripe = addShadow(new THREE.Mesh(createStripeGeometry(), stripeMat));
        spec.add(stripe);
        scene.add(spec);

        // ---- fatigue crack at the gauge (rotates with specimen) ----
        const crackMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d, emissiveIntensity: 0.5, metalness: 0.2, roughness: 0.7 });
        const crack = new THREE.Mesh(new THREE.TorusGeometry(specRadius(0) + 0.004, 0.016, 10, 32), crackMat);
        crack.rotation.y = Math.PI / 2;       // wrap the ring around the X axis
        crack.visible = false;
        spec.add(crack);
        const notch = new THREE.Mesh(new THREE.BoxGeometry(0.03, specRadius(0) * 1.2, 0.05), crackMat);
        notch.position.set(0, specRadius(0) * 0.6, 0);
        notch.visible = false;
        spec.add(notch);

        // ---- loading assembly: two inner bearings + yoke + weight stack (stationary) ----
        const loadAssembly = new THREE.Group();
        function loadBearing(px) {
            const g = new THREE.Group();
            const collar = addShadow(new THREE.Mesh(new THREE.TorusGeometry(specRadius(px) + 0.05, 0.04, 12, 28), matBrass));
            collar.rotation.y = Math.PI / 2;
            g.add(collar);
            const housing = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.3), matSteelD));
            housing.position.y = -(specRadius(px) + 0.13);
            g.add(housing);
            g.position.set(px, 0, 0);
            return g;
        }
        loadAssembly.add(loadBearing(-LOAD_X));
        loadAssembly.add(loadBearing(LOAD_X));
        const yoke = addShadow(new THREE.Mesh(new THREE.BoxGeometry(LOAD_X * 2 + 0.2, 0.07, 0.14), matSteelD));
        yoke.position.y = -0.34;
        loadAssembly.add(yoke);
        const hanger = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.18, 10), matSteel));
        hanger.position.y = -0.46;
        loadAssembly.add(hanger);
        const hook = addShadow(new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 8, 16), matSteel));
        hook.position.y = -0.55;
        loadAssembly.add(hook);
        // weight stack (radius scales with applied load in updateThreeScene)
        const weights = new THREE.Group();
        for (let i = 0; i < 3; i++) {
            const wdisc = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 24), matWeight));
            wdisc.position.y = -0.62 - i * 0.13;
            weights.add(wdisc);
        }
        loadAssembly.add(weights);
        scene.add(loadAssembly);

        rig = { spec, stripe, chuckL, chuckR, drive, crack, crackMat, notch, loadAssembly, weights };

        function animate() {
            requestAnimationFrame(animate);
            if (isAnimating && rig) {
                rig.spec.rotation.x += ROT_SPEED;
                rig.chuckL.rotation.x += ROT_SPEED;
                rig.chuckR.rotation.x += ROT_SPEED;
                rig.drive.rotation.x += ROT_SPEED;
            }
            if (controls) controls.update();
            renderer.render(scene, camera);
        }
        animate();

        updateThreeScene(parseFloat(appliedStrainEl.value));
    }

    function updateThreeScene(strain) {
        if (!rig) return;

        // visualise applied load magnitude via the hanging weight mass (radius only, no clipping)
        const loadF = (strain - 2) / 6;            // 0..1 across slider range
        const wScale = 0.8 + loadF * 0.8;
        rig.weights.scale.set(wScale, 1, wScale);

        // progressive fatigue crack at the gauge section, keyed to the *computed* life N
        // (crack initiates near 70% of life and fully fractures at 100% - same fractions at every strain)
        const curCycle = animCycle;
        const lifeN = fatigueLife(strain);
        const lifeFrac = lifeN > 0 ? curCycle / lifeN : 0;   // fraction of fatigue life consumed
        const CRACK_INIT = 0.7;
        if (lifeFrac > CRACK_INIT) {
            const p = Math.min((lifeFrac - CRACK_INIT) / (1 - CRACK_INIT), 1);
            rig.crack.visible = true;
            rig.notch.visible = true;
            rig.crack.scale.setScalar(1 + p * 0.7);
            rig.notch.scale.set(1 + p * 2.0, 1 + p * 0.6, 1 + p * 2.0);
            rig.crackMat.color.setRGB(0.9, 0.12 * (1 - p), 0.12 * (1 - p));
            rig.crackMat.emissiveIntensity = 0.4 + p * 0.4;
        } else {
            rig.crack.visible = false;
            rig.notch.visible = false;
        }

        if (!isAnimating) {
            rig.spec.rotation.x = 0;
            rig.chuckL.rotation.x = 0;
            rig.chuckR.rotation.x = 0;
            rig.drive.rotation.x = 0;
        }
    }

    btnRun.addEventListener('click', () => {
        if (isAnimating) return;
        isAnimating = true;
        btnRun.disabled = true;
        btnRun.innerText = "Cycling...";
        btnRun.style.background = "#475569";
        appliedStrainEl.disabled = true;
        
        // run to the *computed* fatigue life N over a fixed wall-clock, so the counter always
        // ends at the true predicted life (short, high-strain lives no longer finish instantly)
        const lifeN = fatigueLife(parseFloat(appliedStrainEl.value));
        const TOTAL_FRAMES = 100;        // ~5 s at 50 ms/frame, independent of strain
        let frame = 0;
        animCycle = 0;
        
        const interval = setInterval(() => {
            frame++;
            const progress = frame / TOTAL_FRAMES;     // 0..1 of fatigue life
            animCycle = Math.round(progress * lifeN);
            
            if (frame >= TOTAL_FRAMES) {
                animCycle = Math.round(lifeN);
                isAnimating = false;
                btnRun.disabled = false;
                appliedStrainEl.disabled = false;
                btnRun.innerText = "Initiate Fatigue Cycling";
                btnRun.style.background = "linear-gradient(135deg, #9f1239, #8A1134)";
                clearInterval(interval);
            }
            updateUI();
        }, 50);
    });

    appliedStrainEl.addEventListener('input', () => {
        const strain = parseFloat(appliedStrainEl.value);
        animCycle = 0;   // fresh specimen when the strain amplitude changes
        updateThreeScene(strain);
        updateUI();
    });
    
    init3D();
    updateUI();
})();
