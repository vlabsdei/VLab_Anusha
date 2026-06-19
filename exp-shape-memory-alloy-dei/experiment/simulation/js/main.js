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
    let scene, camera, renderer, dscFurnaceMesh, cellLid;

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
        const { mapX, mapY } = drawGrid(plotCtx, 450, 400, -20, 100, -1.5, 1.5, "Temperature T (°C)", "Heat Flow dH/dt (mW/mg) [ Endo Down ]");
        
        // Draw heating curve (Red line)
        plotCtx.strokeStyle = "#8A1134";
        plotCtx.lineWidth = 2.5;
        plotCtx.beginPath();
        for (let t = -20; t <= 100; t += 1) {
            const hf = calcHeatFlowHeating(t, As, Af);
            const xPos = mapX(t);
            const yPos = mapY(hf);
            if (t === -20) plotCtx.moveTo(xPos, yPos);
            else plotCtx.lineTo(xPos, yPos);
        }
        plotCtx.stroke();
        
        // Draw cooling curve (Blue line)
        plotCtx.strokeStyle = "#0ea5e9";
        plotCtx.lineWidth = 2.0;
        plotCtx.beginPath();
        for (let t = -20; t <= 100; t += 1) {
            const hf = calcHeatFlowCooling(t, Mf, Ms);
            const xPos = mapX(t);
            const yPos = mapY(hf);
            if (t === -20) plotCtx.moveTo(xPos, yPos);
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
        scene.background = new THREE.Color(0xfafbfc);
        
        camera = new THREE.PerspectiveCamera(45, 450 / 400, 0.1, 100);
        camera.position.set(0, 2.5, 3.2); // angled top-down view
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(450, 400);
        container.appendChild(renderer.domElement);
        
        const orbit = new THREE.OrbitControls(camera, renderer.domElement);
        orbit.enableZoom = false;
        
        // Lights
        const light1 = new THREE.DirectionalLight(0xffffff, 1.2);
        light1.position.set(2, 5, 2);
        scene.add(light1);
        scene.add(new THREE.AmbientLight(0x606060));
        
        // DSC Cell Body (horizontal plate block)
        const cellBlock = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 2.0), new THREE.MeshPhongMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 }));
        cellBlock.position.set(0, -0.4, 0);
        scene.add(cellBlock);
        
        // Left Well (Sample)
        const wellL = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.02, 32), new THREE.MeshPhongMaterial({ color: 0x0f172a }));
        wellL.position.set(-0.7, -0.24, 0);
        scene.add(wellL);
        
        // Right Well (Reference)
        const wellR = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.02, 32), new THREE.MeshPhongMaterial({ color: 0x0f172a }));
        wellR.position.set(0.7, -0.24, 0);
        scene.add(wellR);
        
        // Left Sensor (Thermopile)
        const sensorL = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.01, 32), new THREE.MeshPhongMaterial({ color: 0xd97706, metalness: 0.5 }));
        sensorL.position.set(-0.7, -0.23, 0);
        scene.add(sensorL);
        
        // Right Sensor (Thermopile)
        const sensorR = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.01, 32), new THREE.MeshPhongMaterial({ color: 0xd97706, metalness: 0.5 }));
        sensorR.position.set(0.7, -0.23, 0);
        scene.add(sensorR);
        
        // Reference Pan (Aluminum)
        const panRef = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 16), new THREE.MeshPhongMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.2 }));
        panRef.position.set(0.7, -0.19, 0);
        scene.add(panRef);
        
        // Reference Pan Lid
        const panRefLid = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.02, 16), new THREE.MeshPhongMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.2 }));
        panRefLid.position.set(0, 0.05, 0);
        panRef.add(panRefLid);
        
        // Sample Pan (Aluminum)
        const panSampleMat = new THREE.MeshPhongMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.2 });
        const panSample = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 16), panSampleMat);
        panSample.position.set(-0.7, -0.19, 0);
        scene.add(panSample);
        
        // Sample Pan Lid (tilted to see inside)
        const panSampleLid = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.02, 16), panSampleMat);
        panSampleLid.position.set(0.08, 0.06, 0);
        panSampleLid.rotation.z = 0.35;
        panSample.add(panSampleLid);
        
        // Nitinol sample inside sample pan
        const wireCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-0.12, 0.01, 0),
            new THREE.Vector3(0, 0.08, 0.04),
            new THREE.Vector3(0.12, 0.01, 0)
        );
        const wireGeo = new THREE.TubeGeometry(wireCurve, 16, 0.025, 8, false);
        const wireMat = new THREE.MeshPhongMaterial({ color: 0x475569 });
        const wirePiece = new THREE.Mesh(wireGeo, wireMat);
        panSample.add(wirePiece);
        
        // Purge Gas Inlet Line
        const purgePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), new THREE.MeshPhongMaterial({ color: 0xb87333 }));
        purgePipe.position.set(0, -0.25, -0.9);
        purgePipe.rotation.x = Math.PI / 2;
        scene.add(purgePipe);
        
        // Cooling Plates / Heat Sink Rim
        const coolingFinL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 1.8), new THREE.MeshPhongMaterial({ color: 0x94a3b8 }));
        coolingFinL.position.set(-1.6, -0.4, 0);
        scene.add(coolingFinL);
        
        const coolingFinR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 1.8), new THREE.MeshPhongMaterial({ color: 0x94a3b8 }));
        coolingFinR.position.set(1.6, -0.4, 0);
        scene.add(coolingFinR);
        
        // Removable Lid (Slides back)
        cellLid = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.06, 32), new THREE.MeshPhongMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.4 }));
        cellLid.position.set(0, -0.1, 0);
        scene.add(cellLid);
        
        dscFurnaceMesh = { panSample, panSampleMat, wirePiece, wireMat };
        
        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();
    }

    function updateThreeScene(temp, xm) {
        if (!dscFurnaceMesh) return;
        
        // Lid slides away during first 20°C of heating (-20 to 0)
        const lidProgress = Math.max(0.0, Math.min(1.0, (temp + 20) / 20));
        cellLid.position.z = -lidProgress * 1.8;
        cellLid.position.x = -lidProgress * 0.5;
        
        // Temperature heat glow (from -20°C to 100°C)
        const glowRatio = Math.max(0.0, Math.min(1.0, (temp - 20) / 80));
        dscFurnaceMesh.panSampleMat.emissive.setRGB(glowRatio * 0.5, glowRatio * 0.1, 0.0);
        
        // Nitinol wire phase color
        const austeniteRatio = 1.0 - xm;
        dscFurnaceMesh.wireMat.color.setRGB(0.28 + austeniteRatio * 0.5, 0.33 - austeniteRatio * 0.15, 0.41 - austeniteRatio * 0.25);
        dscFurnaceMesh.wireMat.emissive.setRGB(glowRatio * 0.3 * austeniteRatio, 0.0, 0.0);
        
        // Lathe/Pan pulses during phase transformation (latent heat visualization)
        if (xm > 0.01 && xm < 0.99) {
            const pulse = 1.0 + 0.05 * Math.sin(Date.now() * 0.015) * (xm * (1.0 - xm) * 4.0);
            dscFurnaceMesh.panSample.scale.set(pulse, pulse, pulse);
        } else {
            dscFurnaceMesh.panSample.scale.set(1.0, 1.0, 1.0);
        }
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
    let scene, camera, renderer, dogboneMesh, arrow, gaugeCenter, shoulderTop, shoulderBottom;
    
    // Nitinol Constant Properties
    const Af = 18.0; 
    const sigma0 = 150.0;
    const slope = 7.0; 
    
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
        const { mapX, mapY } = drawGrid(plotCtx, 450, 400, 0, 10, 0, 600, "Strain ε (%)", "Stress σ (MPa)"); 

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
        scene.background = new THREE.Color(0xfafbfc);
        
        camera = new THREE.PerspectiveCamera(45, 450 / 400, 0.1, 100);
        camera.position.set(0, 0, 6.2);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(450, 400);
        container.appendChild(renderer.domElement);
        
        const orbit = new THREE.OrbitControls(camera, renderer.domElement);
        orbit.enableZoom = false;
        
        // Lights
        const light1 = new THREE.DirectionalLight(0xffffff, 1.2);
        light1.position.set(2, 2, 5);
        scene.add(light1);
        scene.add(new THREE.AmbientLight(0x606060));
        
        // Load Cell Block (silver cylinder at top)
        const loadCellBlock = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16), new THREE.MeshPhongMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 }));
        loadCellBlock.position.set(0, 2.2, 0);
        scene.add(loadCellBlock);
        
        // Upper Wedge Grip Jaw (textured grey block)
        const gripTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.6), new THREE.MeshPhongMaterial({ color: 0x475569, shininess: 30 }));
        gripTop.position.set(0, 1.8, 0);
        scene.add(gripTop);
        
        // Lower Wedge Grip Jaw (textured grey block)
        const gripBottom = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.6), new THREE.MeshPhongMaterial({ color: 0x475569, shininess: 30 }));
        gripBottom.position.set(0, -1.8, 0);
        scene.add(gripBottom);
        
        // Double-walled transparent Environmental Chamber
        const chamberMat = new THREE.MeshPhongMaterial({
            color: 0x0ea5e9,
            transparent: true,
            opacity: 0.12,
            depthWrite: false
        });
        const chamberOuter = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.6, 32, 1, true), chamberMat);
        chamberOuter.position.set(0, 0, 0);
        scene.add(chamberOuter);
        
        // Chamber steel rings
        const ringTop = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.08, 32), new THREE.MeshPhongMaterial({ color: 0x64748b }));
        ringTop.position.set(0, 1.3, 0);
        scene.add(ringTop);
        
        const ringBottom = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.08, 32), new THREE.MeshPhongMaterial({ color: 0x64748b }));
        ringBottom.position.set(0, -1.3, 0);
        scene.add(ringBottom);
        
        // Heater Coils at the base
        for (let i = 0; i < 3; i++) {
            const coil = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.03, 8, 24), new THREE.MeshPhongMaterial({ color: 0xd97706 }));
            coil.rotation.x = Math.PI / 2;
            coil.position.set(0, -1.1 + i * 0.12, 0);
            scene.add(coil);
        }
        
        // K-type Thermocouple Probe
        const tcProbe = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 8), new THREE.MeshPhongMaterial({ color: 0x94a3b8, metalness: 0.8 }));
        tcProbe.position.set(0.65, 0, 0);
        tcProbe.rotation.z = Math.PI / 2;
        scene.add(tcProbe);
        
        // Vertical travel scale rule
        const ruler = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.8, 0.1), new THREE.MeshPhongMaterial({ color: 0x94a3b8 }));
        ruler.position.set(-1.8, 0, 0);
        scene.add(ruler);
        
        // Tick marks on ruler
        const tickGeo = new THREE.BoxGeometry(0.03, 0.02, 0.02);
        const tickMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
        for (let i = -18; i <= 18; i++) {
            const tick = new THREE.Mesh(tickGeo, tickMat);
            tick.position.set(-1.75, i * 0.1, 0.06);
            scene.add(tick);
        }
        
        // Moving crosshead arrow
        arrow = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 4), new THREE.MeshPhongMaterial({ color: 0xef4444 }));
        arrow.rotation.z = -Math.PI / 2;
        arrow.position.set(-1.66, 1.8, 0);
        scene.add(arrow);
        
        // Dog-bone Specimen Assembly
        const wireMat = new THREE.MeshPhongMaterial({ color: 0x94a3b8, shininess: 80 });
        
        shoulderTop = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.4, 16), wireMat);
        shoulderTop.position.set(0, 1.35, 0);
        scene.add(shoulderTop);
        
        shoulderBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.4, 16), wireMat);
        shoulderBottom.position.set(0, -1.35, 0);
        scene.add(shoulderBottom);
        
        gaugeCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.3, 16), wireMat);
        gaugeCenter.position.set(0, 0, 0);
        scene.add(gaugeCenter);
        
        dogboneMesh = { wire: gaugeCenter, gripTop, gripBottom, chamber: chamberOuter, chamberMat, wireMat };
        
        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();
    }

    function updateThreeScene(strain, stress, relTemp) {
        if (!dogboneMesh) return;
        
        // Environmental Chamber color based on temperature
        if (relTemp < 0) {
            dogboneMesh.chamberMat.color.setHex(0x38bdf8);
            dogboneMesh.chamberMat.opacity = 0.18;
        } else {
            dogboneMesh.chamberMat.color.setHex(0xf97316);
            dogboneMesh.chamberMat.opacity = 0.12;
        }
        
        // Strain stretching specimen: gaugeCenter scale
        const scaleFactor = 1.0 + (strain / 8.0) * 0.25;
        gaugeCenter.scale.y = scaleFactor;
        gaugeCenter.position.y = (scaleFactor - 1.0) * 1.15;
        
        // Top shoulder and top grip follow displacement
        const gripOffset = (scaleFactor - 1.0) * 2.3;
        shoulderTop.position.y = 1.35 + gripOffset;
        dogboneMesh.gripTop.position.y = 1.8 + gripOffset;
        
        // Move travel indicator arrow on ruler
        arrow.position.y = 1.8 + gripOffset;
        
        // Stress changes specimen color
        const stressRatio = Math.min(1.0, stress / 500.0);
        const r = 0.58 + stressRatio * 0.35;
        const g = 0.64 - stressRatio * 0.45;
        const b = 0.72 - stressRatio * 0.55;
        dogboneMesh.wireMat.color.setRGB(r, g, b);
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
    let scene, camera, renderer, wireMesh;
    
    const L = 0.1; 
    const h = 25.0; 
    const Cp = 320.0; 
    const rho_density = 6450.0; 
    const rho_A = 82e-8; 
    const rho_M = 100e-8; 
    const T_amb = 20.0;
    const As = 48.0;
    const Af = 68.0;

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

    function updateUI() {
        const dw = parseFloat(dwEl.value);
        const current = parseFloat(inputCurrentEl.value);
        
        valDwEl.innerText = dw.toFixed(0) + " μm";
        valCurrentEl.innerText = current.toFixed(2) + " A";
        
        const xm = calcXM(temp);
        const { R, Ra, Rm } = calcResistance(dw, xm);
        
        resRm.innerText = Rm.toFixed(2) + " Ω";
        resRa.innerText = Ra.toFixed(2) + " Ω";
        
        const power = Math.pow(current, 2) * R;
        resPower.innerText = power.toFixed(2) + " W";
        
        const A_surface = Math.PI * (dw * 1e-6) * L;
        const deltaTss = (Math.pow(current, 2) * Ra) / (h * A_surface);
        const T_ss = T_amb + deltaTss;
        
        resTss.innerText = T_ss.toFixed(1) + " °C";
        
        let tActVal = 0.0;
        const m = rho_density * (Math.PI * Math.pow(dw * 1e-6, 2) / 4.0) * L;
        const tau = (m * Cp) / (h * A_surface);
        
        if (T_ss <= Af) {
            tActVal = Infinity;
            resTact.innerText = "Never Actuates (Too cold)";
            resStatus.innerText = "Insufficient Current";
            resStatus.style.color = "#ef4444";
        } else {
            const fraction = (Af - T_amb) / deltaTss;
            tActVal = -tau * Math.log(1.0 - fraction);
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
        scene.background = new THREE.Color(0xfafbfc);
        
        camera = new THREE.PerspectiveCamera(45, 450 / 400, 0.1, 100);
        camera.position.set(0, 0.6, 4.2);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(450, 400);
        container.appendChild(renderer.domElement);
        
        const orbit = new THREE.OrbitControls(camera, renderer.domElement);
        orbit.enableZoom = false;
        
        // Lights
        scene.add(new THREE.DirectionalLight(0xffffff, 1.2));
        scene.add(new THREE.AmbientLight(0x606060));
        
        // Bench Power Supply Unit (PSU) box in background
        const psuBox = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 1.2), new THREE.MeshPhongMaterial({ color: 0x1e293b }));
        psuBox.position.set(0, 0.7, -1.3);
        scene.add(psuBox);
        
        // PSU LED Screen
        const psuScreen = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.02), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
        psuScreen.position.set(0, 0.9, -0.69);
        scene.add(psuScreen);
        
        // PSU Knobs
        const knob1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 12), new THREE.MeshPhongMaterial({ color: 0x64748b }));
        knob1.position.set(-0.5, 0.5, -0.65);
        knob1.rotation.x = Math.PI / 2;
        scene.add(knob1);
        
        const knob2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 12), new THREE.MeshPhongMaterial({ color: 0x64748b }));
        knob2.position.set(-0.25, 0.5, -0.65);
        knob2.rotation.x = Math.PI / 2;
        scene.add(knob2);
        
        // PSU Output Terminals (Red and Black pins)
        const psuTermRed = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), new THREE.MeshPhongMaterial({ color: 0xef4444 }));
        psuTermRed.position.set(0.3, 0.5, -0.65);
        psuTermRed.rotation.x = Math.PI / 2;
        scene.add(psuTermRed);
        
        const psuTermBlack = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), new THREE.MeshPhongMaterial({ color: 0x0f172a }));
        psuTermBlack.position.set(0.55, 0.5, -0.65);
        psuTermBlack.rotation.x = Math.PI / 2;
        scene.add(psuTermBlack);
        
        // Horizontal black anodized mounting rail
        const rail = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 0.4), new THREE.MeshPhongMaterial({ color: 0x111827 }));
        rail.position.set(0, -0.7, 0);
        scene.add(rail);
        
        // Ceramic standoffs (white cylinders supporting terminals)
        const standL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.4, 16), new THREE.MeshPhongMaterial({ color: 0xf1f5f9, roughness: 0.1 }));
        standL.position.set(-1.6, -0.5, 0);
        scene.add(standL);
        
        const standR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.4, 16), new THREE.MeshPhongMaterial({ color: 0xf1f5f9, roughness: 0.1 }));
        standR.position.set(1.6, -0.5, 0);
        scene.add(standR);
        
        // Coloured Binding Posts (Red L, Black R)
        const termL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.4, 16), new THREE.MeshPhongMaterial({ color: 0xef4444 }));
        termL.position.set(-1.6, -0.3, 0);
        scene.add(termL);
        
        const termR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.4, 16), new THREE.MeshPhongMaterial({ color: 0x0f172a }));
        termR.position.set(1.6, -0.3, 0);
        scene.add(termR);
        
        // Nitinol Wire
        const wireGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.2, 16);
        const wireMat = new THREE.MeshPhongMaterial({ color: 0x475569, shininess: 80 });
        const wire = new THREE.Mesh(wireGeo, wireMat);
        wire.rotation.z = Math.PI / 2;
        scene.add(wire);
        
        // Thermocouple Bead junction welded at the center
        const tcBead = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), new THREE.MeshPhongMaterial({ color: 0xffd700, shininess: 100 }));
        tcBead.position.set(0, 0, 0.06);
        scene.add(tcBead);
        
        // Readout Box (grey plastic block)
        const readoutBox = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), new THREE.MeshPhongMaterial({ color: 0x334155 }));
        readoutBox.position.set(1.3, -0.45, 0.7);
        scene.add(readoutBox);
        
        const readoutScreen = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.02), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
        readoutScreen.position.set(1.3, -0.35, 1.01);
        scene.add(readoutScreen);
        
        // Lead wires from bead to readout box
        const tcWire1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 8), new THREE.MeshPhongMaterial({ color: 0xef4444 }));
        tcWire1.position.set(0.65, -0.22, 0.38);
        tcWire1.rotation.z = -0.45;
        tcWire1.rotation.y = 0.5;
        scene.add(tcWire1);
        
        const tcWire2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 8), new THREE.MeshPhongMaterial({ color: 0x3b82f6 }));
        tcWire2.position.set(0.65, -0.22, 0.33);
        tcWire2.rotation.z = -0.45;
        tcWire2.rotation.y = 0.55;
        scene.add(tcWire2);
        
        wireMesh = wire;
        
        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();
    }

    function updateThreeScene(temperature) {
        if (!wireMesh) return;
        
        const normTemp = Math.min(1.0, Math.max(0.0, (temperature - 20.0) / 130.0));
        const isOxidized = temperature > 150.0;
        
        const r = isOxidized ? 0.15 : (0.28 + normTemp * 0.72);
        const g = isOxidized ? 0.15 : (0.33 - normTemp * 0.15);
        const b = isOxidized ? 0.15 : (0.41 - normTemp * 0.35);
        wireMesh.material.color.setRGB(r, g, b);
        
        if (temperature > As) {
            const glow = (temperature - As) / (160.0 - As);
            wireMesh.material.emissive.setRGB(glow * 0.6, glow * 0.15, 0.0);
        } else {
            wireMesh.material.emissive.setRGB(0, 0, 0);
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
    let scene, camera, renderer, gripperMesh, spring, pointer;
    
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
        scene.background = new THREE.Color(0xfafbfc);
        
        camera = new THREE.PerspectiveCamera(45, 450 / 400, 0.1, 100);
        camera.position.set(0, 1.2, 5.0);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(450, 400);
        container.appendChild(renderer.domElement);
        
        const orbit = new THREE.OrbitControls(camera, renderer.domElement);
        orbit.enableZoom = false;
        
        // Base plate
        const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 1.2), new THREE.MeshPhongMaterial({ color: 0x475569 }));
        base.position.set(0, -1.0, 0);
        scene.add(base);
        
        // Fixed wall anchor left
        const uprightL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.8), new THREE.MeshPhongMaterial({ color: 0x64748b }));
        uprightL.position.set(-2.0, -0.4, 0);
        scene.add(uprightL);
        
        // Fixed wall anchor right
        const uprightR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.8), new THREE.MeshPhongMaterial({ color: 0x64748b }));
        uprightR.position.set(2.0, -0.4, 0);
        scene.add(uprightR);
        
        // Load Cell Block with Wheatstone bridge circuit decal representation
        const loadCell = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshPhongMaterial({ color: 0xe2e8f0, metalness: 0.7 }));
        loadCell.position.set(-1.8, 0, 0);
        scene.add(loadCell);
        
        // Wheatstone bridge indicator LED (green)
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
        led.position.set(-1.55, 0.12, 0.1);
        scene.add(led);
        
        // BNC output cable from load cell
        const bncCable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 8), new THREE.MeshPhongMaterial({ color: 0x0f172a }));
        bncCable.position.set(-1.8, -0.5, 0.1);
        bncCable.rotation.x = 0.4;
        scene.add(bncCable);
        
        // Ruler
        const ruler = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 0.2), new THREE.MeshPhongMaterial({ color: 0x94a3b8 }));
        ruler.position.set(0, -0.8, 0.4);
        scene.add(ruler);
        
        // Scale tick marks
        const tickGeo = new THREE.BoxGeometry(0.02, 0.04, 0.02);
        const bigTickGeo = new THREE.BoxGeometry(0.03, 0.08, 0.02);
        const tickMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
        const bigTickMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        
        for (let i = -18; i <= 18; i++) {
            const isBig = i % 9 === 0;
            const tick = new THREE.Mesh(isBig ? bigTickGeo : tickGeo, isBig ? bigTickMat : tickMat);
            tick.position.set(i * 0.1, isBig ? -0.74 : -0.76, 0.5);
            scene.add(tick);
        }
        
        // Slider clamp
        const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.6), new THREE.MeshPhongMaterial({ color: 0x334155 }));
        clamp.position.set(0.8, 0, 0);
        scene.add(clamp);
        
        // Slider rod
        const rodGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.8, 16);
        const rod = new THREE.Mesh(rodGeo, new THREE.MeshPhongMaterial({ color: 0xcbd5e1, metalness: 0.9 }));
        rod.rotation.z = Math.PI / 2;
        rod.position.set(0, -0.4, 0);
        scene.add(rod);
        
        // SMA Wire
        const wireGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 16);
        const wireMat = new THREE.MeshPhongMaterial({ color: 0x8a1134, shininess: 80 });
        const wire = new THREE.Mesh(wireGeo, wireMat);
        wire.rotation.z = Math.PI / 2;
        scene.add(wire);
        
        // Tension Bias Spring on the right
        const springMat = new THREE.MeshPhongMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.1 });
        spring = new THREE.Mesh(createSpringGeometry(1.2, 10, 0.14), springMat);
        spring.rotation.z = Math.PI / 2;
        scene.add(spring);
        
        // Red cursor pointer pointing at the ruler
        pointer = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), new THREE.MeshPhongMaterial({ color: 0xef4444 }));
        pointer.rotation.x = Math.PI;
        pointer.position.set(0.8, -0.7, 0.4);
        scene.add(pointer);
        
        gripperMesh = { clamp, wire, wireMat };
        
        scene.add(new THREE.DirectionalLight(0xffffff, 1.2));
        scene.add(new THREE.AmbientLight(0x505050));
        
        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();
    }

    function updateThreeScene(progress) {
        if (!gripperMesh) return;
        
        const maxStrokeOffset = 1.0;
        const offset = progress * maxStrokeOffset;
        
        // Clamp moves left
        gripperMesh.clamp.position.x = 0.8 - offset;
        
        // Wire contracts: scale and position updated
        const wireLength = (0.8 - offset) - (-1.55);
        gripperMesh.wire.scale.y = wireLength;
        gripperMesh.wire.position.x = -1.55 + wireLength / 2;
        
        // Red cursor pointer tracks clamp position
        pointer.position.x = gripperMesh.clamp.position.x;
        
        // Spring stretches (between clamp and right wall at x = 2.0)
        const springLength = 2.0 - gripperMesh.clamp.position.x;
        spring.geometry.dispose();
        spring.geometry = createSpringGeometry(springLength, 10, 0.14);
        spring.position.x = (gripperMesh.clamp.position.x + 2.0) / 2;
        
        // Wire color and emissive glow
        const r = 0.28 + progress * 0.72;
        const g = 0.33 - progress * 0.13;
        const b = 0.41 - progress * 0.31;
        gripperMesh.wireMat.color.setRGB(r, g, b);
        
        if (progress > 0.1) {
            const glow = progress * 0.4;
            gripperMesh.wireMat.emissive.setRGB(glow * 0.8, glow * 0.2, 0.0);
        } else {
            gripperMesh.wireMat.emissive.setRGB(0, 0, 0);
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
    let scene, camera, renderer, wireMesh, sleeveL, sleeveR, crack, spindle, collar, weightCable, weight;
    
    function updateUI() {
        const strain = parseFloat(appliedStrainEl.value);
        valAppliedStrainEl.innerText = strain.toFixed(1) + " %";
        
        const strainFraction = strain / 100.0;
        const cycles = 1000.0 / Math.pow(strainFraction, 2);
        
        resCycles.innerText = cycles.toLocaleString(undefined, { maximumFractionDigits: 0 }) + " cycles";
        
        if (cycles > 200000) {
            resStatus.innerText = "Safe Design Limit (Long-life)";
            resStatus.style.color = "#10b981";
        } else {
            resStatus.innerText = "High Strain / Low Cycle Fatigue";
            resStatus.style.color = "#ef4444";
        }
        
        const finalStrain = strain * Math.exp(-0.00001 * 10000);
        resDegstrain.innerText = finalStrain.toFixed(2) + " %";
        
        const loss = ((strain - finalStrain) / strain) * 100.0;
        resLoss.innerText = loss.toFixed(1) + " %";
        
        const curCycle = isAnimating ? animCycle : 0;
        stateLabel.innerText = `Counter: ${curCycle.toLocaleString()} cycles`;
        
        if (isAnimating) {
            liveInsight.innerHTML = `<strong>Fatigue Insight:</strong> Bending specimen rotates under load, accumulating mechanical fatigue cycles.`;
        } else {
            liveInsight.innerHTML = `<strong>Fatigue Insight:</strong> Set the strain amplitude. Higher strains drastically decrease fatigue cycle life.`;
        }
        
        drawPlots(strain);
        updateThreeScene(strain);
        updateEquations(strain, strainFraction, cycles, finalStrain, loss);
    }

    function updateEquations(eps, eFrac, N, eRec, loss) {
        equationsContainer.innerHTML = `
            <div style="margin-bottom: 8px;"><b>1. Coffin-Manson Bending Fatigue Model:</b></div>
            <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; margin-bottom: 12px; color: #8A1134;">
                N_cycles = C / ε_applied² = 1000 / ${eFrac.toFixed(4)}² = ${N.toLocaleString(undefined, { maximumFractionDigits: 0 })} cycles
            </div>
            <div style="margin-bottom: 8px;"><b>2. Crystalline Training Loss (after 10,000 cycles):</b></div>
            <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; margin-bottom: 12px; color: #1e293b;">
                ε_recoverable = ε_applied × exp(-10^-5 × 10,000) = ${eRec.toFixed(2)} %
            </div>
            <div style="margin-bottom: 8px;"><b>3. Functional Capacity Loss:</b></div>
            <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #0ea5e9;">
                Loss = ((ε_applied - ε_rec) / ε_applied) × 100% = ${loss.toFixed(1)} %
            </div>
        `;
    }

    function drawPlots(activeStrain) {
        const { mapX } = drawGrid(plotCtx, 450, 400, 1, 10, 1e4, 1e7, "Strain Amplitude ε (%)", "Cycle Life N (Log scale)");
        
        const mapLogY = (y) => {
            const logMin = Math.log10(1e4);
            const logMax = Math.log10(1e7);
            const logY = Math.log10(y);
            const plotH = 400 - 30 - 50;
            return 400 - 50 - ((logY - logMin) / (logMax - logMin)) * plotH;
        };
        
        plotCtx.strokeStyle = "#8A1134";
        plotCtx.lineWidth = 2.5;
        plotCtx.beginPath();
        for (let e = 1.0; e <= 9.0; e += 0.1) {
            const eFrac = e / 100.0;
            const N = 1000.0 / Math.pow(eFrac, 2);
            const xPos = mapX(e);
            const yPos = mapLogY(N);
            if (e === 1.0) plotCtx.moveTo(xPos, yPos);
            else plotCtx.lineTo(xPos, yPos);
        }
        plotCtx.stroke();
        
        const eFrac = activeStrain / 100.0;
        const activeN = 1000.0 / Math.pow(eFrac, 2);
        plotCtx.fillStyle = "#d97706";
        plotCtx.beginPath();
        plotCtx.arc(mapX(activeStrain), mapLogY(activeN), 6, 0, 2 * Math.PI);
        plotCtx.fill();
        plotCtx.strokeStyle = "#ffffff";
        plotCtx.lineWidth = 2;
        plotCtx.stroke();
    }

    function createWireGeometry(strainVal) {
        const points = [];
        const length = 2.6;
        const segments = 40;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const yVal = (t - 0.5) * length;
            // Hourglass shape: narrow in middle, wide at ends
            const r = 0.06 + 0.12 * Math.pow(yVal / 1.3, 2);
            points.push(new THREE.Vector2(r, yVal));
        }
        const geom = new THREE.LatheGeometry(points, 32);
        
        const bendHeight = (strainVal / 8.0) * 0.35;
        
        const position = geom.attributes.position;
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const y = position.getY(i);
            const z = position.getZ(i);
            
            // Linear offset from left (0) to right (0.08)
            const baseline = (y / 2.6 + 0.5) * 0.08;
            const factor = 1.0 - Math.pow(y / 1.3, 2);
            const disp = bendHeight * factor + baseline;
            
            position.setXYZ(i, y, x + disp, z);
        }
        geom.computeVertexNormals();
        return geom;
    }

    function init3D() {
        const container = document.getElementById('viewport3D');
        if (!container) return;
        
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xfafbfc);
        
        camera = new THREE.PerspectiveCamera(45, 450 / 400, 0.1, 100);
        camera.position.set(0, 0.8, 3.8);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(450, 400);
        container.appendChild(renderer.domElement);
        
        const orbit = new THREE.OrbitControls(camera, renderer.domElement);
        orbit.enableZoom = false;
        
        // Base plate
        const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.15, 1.2), new THREE.MeshPhongMaterial({ color: 0x334155 }));
        baseMesh.position.set(0, -0.9, 0);
        scene.add(baseMesh);
        
        // Motor block on the left
        const motorMat = new THREE.MeshPhongMaterial({ color: 0x1e293b, metalness: 0.5 });
        const motor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), motorMat);
        motor.position.set(-2.2, 0, 0);
        scene.add(motor);
        
        // Motor Spindle Disc
        spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 12), new THREE.MeshPhongMaterial({ color: 0x94a3b8 }));
        spindle.position.set(-2.55, 0, 0);
        spindle.rotation.z = Math.PI / 2;
        scene.add(spindle);
        
        // Rotation indicator blades on spindle
        const bladeL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.02), new THREE.MeshPhongMaterial({ color: 0xef4444 }));
        bladeL.position.set(0, 0, 0);
        spindle.add(bladeL);
        
        // Bearing Blocks supporting the chucks
        const bearingL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.5), new THREE.MeshPhongMaterial({ color: 0x475569, metalness: 0.7 }));
        bearingL.position.set(-1.6, -0.1, 0);
        scene.add(bearingL);
        
        const bearingR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.5), new THREE.MeshPhongMaterial({ color: 0x475569, metalness: 0.7 }));
        bearingR.position.set(1.6, -0.02, 0);
        scene.add(bearingR);
        
        // Chucks
        const chuckL = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.6, 16), new THREE.MeshPhongMaterial({ color: 0x475569, metalness: 0.8 }));
        chuckL.rotation.z = Math.PI / 2;
        chuckL.position.set(-1.6, 0, 0);
        scene.add(chuckL);
        
        const chuckR = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.6, 16), new THREE.MeshPhongMaterial({ color: 0x475569, metalness: 0.8 }));
        chuckR.rotation.z = Math.PI / 2;
        chuckR.position.set(1.6, 0.08, 0);
        scene.add(chuckR);
        
        // Tapered sleeves on the chucks
        sleeveL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.3, 16), new THREE.MeshPhongMaterial({ color: 0x64748b, metalness: 0.8 }));
        sleeveL.rotation.z = Math.PI / 2;
        sleeveL.position.set(-1.4, 0, 0);
        scene.add(sleeveL);
        
        sleeveR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.3, 16), new THREE.MeshPhongMaterial({ color: 0x64748b, metalness: 0.8 }));
        sleeveR.rotation.z = Math.PI / 2;
        sleeveR.position.set(1.4, 0.08, 0);
        scene.add(sleeveR);
        
        // Specimen
        const initialStrain = parseFloat(appliedStrainEl.value);
        const wireGeo = createWireGeometry(initialStrain);
        const wireMat = new THREE.MeshPhongMaterial({ color: 0x8a1134, shininess: 80 });
        const wire = new THREE.Mesh(wireGeo, wireMat);
        scene.add(wire);
        
        // Central stationary collar
        collar = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 24), new THREE.MeshPhongMaterial({ color: 0x64748b, metalness: 0.8 }));
        const initBendHeight = (initialStrain / 8.0) * 0.35;
        collar.position.set(0, 0.04 + initBendHeight, 0);
        scene.add(collar);
        
        // Hanging rod
        weightCable = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8), new THREE.MeshPhongMaterial({ color: 0x475569 }));
        weightCable.position.set(0, -0.16 + initBendHeight, 0);
        scene.add(weightCable);
        
        // Suspended Weight Block
        weight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshPhongMaterial({ color: 0x0f172a, metalness: 0.5 }));
        weight.position.set(0, -0.51 + initBendHeight, 0);
        scene.add(weight);
        
        // Red Crack Torus inside specimen
        crack = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 8, 24), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        crack.rotation.y = Math.PI / 2;
        crack.position.set(0, 0.04 + initBendHeight, 0);
        wire.add(crack);
        crack.visible = false;
        
        wireMesh = { chuckL, chuckR, wire, wireMat };
        
        scene.add(new THREE.DirectionalLight(0xffffff, 1.2));
        scene.add(new THREE.AmbientLight(0x505050));
        
        function animate() {
            requestAnimationFrame(animate);
            if (isAnimating && wireMesh) {
                wireMesh.wire.rotation.x += 0.22;
                wireMesh.chuckL.rotation.x += 0.22;
                wireMesh.chuckR.rotation.x += 0.22;
                sleeveL.rotation.x += 0.22;
                sleeveR.rotation.x += 0.22;
                spindle.rotation.y += 0.22;
            }
            renderer.render(scene, camera);
        }
        animate();
    }

    function updateThreeScene(strain) {
        if (!wireMesh) return;
        
        wireMesh.wire.geometry.dispose();
        wireMesh.wire.geometry = createWireGeometry(strain);
        
        const bendHeight = (strain / 8.0) * 0.35;
        collar.position.y = 0.04 + bendHeight;
        weightCable.position.y = -0.16 + bendHeight;
        weight.position.y = -0.51 + bendHeight;
        
        crack.position.y = 0.04 + bendHeight;
        
        const curCycle = isAnimating ? animCycle : 0;
        if (curCycle > 4000) {
            crack.visible = true;
            const crackProgress = (curCycle - 4000) / 6000;
            crack.scale.set(1 + crackProgress * 0.4, 1 + crackProgress * 0.4, 1 + crackProgress * 0.4);
            crack.material.color.setRGB(0.9, 0.1 * (1 - crackProgress), 0.1 * (1 - crackProgress));
        } else {
            crack.visible = false;
        }
        
        if (!isAnimating) {
            wireMesh.wire.rotation.x = 0;
            wireMesh.chuckL.rotation.x = 0;
            wireMesh.chuckR.rotation.x = 0;
            sleeveL.rotation.x = 0;
            sleeveR.rotation.x = 0;
            spindle.rotation.y = 0;
        }
    }

    btnRun.addEventListener('click', () => {
        if (isAnimating) return;
        isAnimating = true;
        btnRun.disabled = true;
        btnRun.innerText = "Cycling...";
        btnRun.style.background = "#475569";
        appliedStrainEl.disabled = true;
        
        animCycle = 0;
        
        const interval = setInterval(() => {
            animCycle += 200;
            
            if (animCycle >= 10000) {
                animCycle = 10000;
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
        updateThreeScene(strain);
        updateUI();
    });
    
    init3D();
    updateUI();
})();
