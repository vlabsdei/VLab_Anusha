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
    let scene, camera, renderer, dscFurnaceMesh;

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
        camera.position.set(0, 1.8, 4);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(450, 400);
        container.appendChild(renderer.domElement);
        
        const orbit = new THREE.OrbitControls(camera, renderer.domElement);
        orbit.enableZoom = false;
        
        // Lights
        const light1 = new THREE.DirectionalLight(0xffffff, 1.2);
        light1.position.set(5, 5, 5);
        scene.add(light1);
        scene.add(new THREE.AmbientLight(0x505050));
        
        // Build DSC Chamber
        const furnaceBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32), new THREE.MeshPhongMaterial({ color: 0x334155, shininess: 30 }));
        furnaceBase.position.set(0, -0.6, 0);
        scene.add(furnaceBase);
        
        const furnaceChamber = new THREE.Mesh(
            new THREE.CylinderGeometry(1.4, 1.4, 0.8, 32, 1, true), 
            new THREE.MeshPhongMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
        );
        furnaceChamber.position.set(0, -0.2, 0);
        scene.add(furnaceChamber);
        
        // Pedestals
        const pedL = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 16), new THREE.MeshPhongMaterial({ color: 0xe2e8f0 }));
        pedL.position.set(-0.55, -0.4, 0);
        scene.add(pedL);
        
        const pedR = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 16), new THREE.MeshPhongMaterial({ color: 0xe2e8f0 }));
        pedR.position.set(0.55, -0.4, 0);
        scene.add(pedR);
        
        // Reference Pan (Plain silver aluminum)
        const panRef = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 16), new THREE.MeshPhongMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.2 }));
        panRef.position.set(0.55, -0.14, 0);
        scene.add(panRef);
        
        // Sample Pan (Aluminum pan with sample)
        const panSampleMat = new THREE.MeshPhongMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.2 });
        const panSample = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 16), panSampleMat);
        panSample.position.set(-0.55, -0.14, 0);
        scene.add(panSample);
        
        // Nitinol wire piece inside/on the sample pan
        const wireCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-0.1, 0.08, 0),
            new THREE.Vector3(0, 0.16, 0.08),
            new THREE.Vector3(0.1, 0.08, 0)
        );
        const wireGeo = new THREE.TubeGeometry(wireCurve, 16, 0.02, 8, false);
        const wireMat = new THREE.MeshPhongMaterial({ color: 0x475569 });
        const wirePiece = new THREE.Mesh(wireGeo, wireMat);
        panSample.add(wirePiece);
        
        dscFurnaceMesh = { panSample, panSampleMat, wirePiece, wireMat };
        
        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();
    }

    function updateThreeScene(temp, xm) {
        if (!dscFurnaceMesh) return;
        
        // Temperature heat glow (from -20°C (normal) to 100°C (glowing orange-red))
        const glowRatio = Math.max(0.0, Math.min(1.0, (temp - 20) / 80));
        
        // Sample pan glows red based on temperature
        dscFurnaceMesh.panSampleMat.emissive.setRGB(glowRatio * 0.5, glowRatio * 0.1, 0.0);
        
        // Nitinol wire changes color to reflect phase (Austenite is red, Martensite is dark grey)
        const austeniteRatio = 1.0 - xm;
        dscFurnaceMesh.wireMat.color.setRGB(0.28 + austeniteRatio * 0.5, 0.33 - austeniteRatio * 0.15, 0.41 - austeniteRatio * 0.25);
        dscFurnaceMesh.wireMat.emissive.setRGB(glowRatio * 0.3 * austeniteRatio, 0.0, 0.0);
    }

    btnRun.addEventListener('click', () => {
        if (isAnimating) return;
        isAnimating = true;
        btnRun.disabled = true;
        btnRun.innerText = "Heating Cycle...";
        btnRun.style.background = "#475569";
        
        const targetTemp = parseFloat(testTempEl.value);
        animTemp = -20;
        
        const interval = setInterval(() => {
            animTemp += animSpeed;
            if (animTemp >= targetTemp) {
                animTemp = targetTemp;
                isAnimating = false;
                btnRun.disabled = false;
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
    let scene, camera, renderer, dogboneMesh;
    
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
            wHyst = plateauStress * (maxStrain - 1.5) * 1.1; 
            if (wHyst < 0) wHyst = 0;
            damping = wHyst / (Math.PI * maxStressVal * maxStrain);
        } else {
            const recoveryOffset = 120.0; 
            wHyst = recoveryOffset * (maxStrain - 1.5);
            if (wHyst < 0) wHyst = 0;
            damping = wHyst / (Math.PI * maxStressVal * maxStrain);
        }
        
        if (isNaN(damping) || damping < 0) damping = 0;
        
        resHysteresis.innerText = wHyst.toFixed(1) + " MJ/m³";
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
                    W_hysteresis = Δσ_plateau × (ε_max - 1.5) = 120 × ${(eMax - 1.5).toFixed(1)} = ${W.toFixed(1)} MJ/m³
                </div>
                <div style="margin-bottom: 8px;"><b>3. Damping Capacity:</b></div>
                <div style="font-size: 1.15em; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #d97706;">
                    Q^-1 = W_hysteresis / (π × σ_max × ε_max) = ${damping.toFixed(3)}
                </div>
            `;
        }
    }

    function calcHysteresis(strain, relTemp, maxStrain) {
        let plateau = relTemp < 0 ? 120.0 : 150.0 + 7.0 * relTemp;
        let stress = 0;
        const E = relTemp < 0 ? 25.0 : 35.0; // GPa
        
        // Loading Curve
        const loadStress = (eps) => {
            if (eps < 1.5) return eps * E * 10; 
            if (eps <= maxStrain - 1.0) {
                const slopePart = (eps - 1.5) * 15.0;
                return plateau + slopePart;
            }
            const plateauEnd = plateau + (maxStrain - 2.5) * 15.0;
            return plateauEnd + (eps - (maxStrain - 1.0)) * E * 10 * 0.8;
        };
        
        const maxStressVal = loadStress(maxStrain);
        
        // Unloading Curve
        const unloadStress = (eps) => {
            if (relTemp < 0) {
                const elasticStrain = maxStressVal / (E * 10);
                const permSet = maxStrain - elasticStrain;
                if (eps < permSet) return 0;
                return (eps - permSet) * E * 10;
            } else {
                const recPlateau = plateau - 120.0 > 50.0 ? plateau - 120.0 : 50.0;
                if (eps > maxStrain - 1.0) {
                    return maxStressVal - (maxStrain - eps) * E * 10 * 0.8;
                }
                if (eps >= 1.0) {
                    const slopePart = (eps - 1.0) * 10.0;
                    return recPlateau + slopePart;
                }
                return eps * recPlateau;
            }
        };
        
        if (simStep === 1) { 
            stress = loadStress(strain);
        } else if (simStep === 2) { 
            stress = unloadStress(strain);
        } else {
            stress = 0;
        }
        
        return { currentStress: stress, maxStressVal };
    }

    function drawPlots(activeStrain, relTemp, maxStrain) {
        const { mapX, mapY } = drawGrid(plotCtx, 450, 400, 0, 10, 0, 600, "Strain ε (%)", "Stress σ (MPa)");
        
        if (simStep === 0 && activeStrain === 0.0) return; 
        
        // Plot full path up to activeStrain
        plotCtx.strokeStyle = "#8A1134";
        plotCtx.lineWidth = 3;
        plotCtx.beginPath();
        
        // Draw loading path
        const step = 0.05;
        const limit = simStep === 1 ? activeStrain : maxStrain;
        for (let e = 0; e <= limit; e += step) {
            simStep = 1;
            const { currentStress } = calcHysteresis(e, relTemp, maxStrain);
            const xPos = mapX(e);
            const yPos = mapY(currentStress);
            if (e === 0) plotCtx.moveTo(xPos, yPos);
            else plotCtx.lineTo(xPos, yPos);
        }
        
        // Draw unloading path
        let limitStrain = 0.0;
        if (relTemp < 0) {
            const E = 25.0; 
            const { maxStressVal } = calcHysteresis(maxStrain, relTemp, maxStrain);
            limitStrain = maxStrain - maxStressVal / (E * 10);
            if (limitStrain < 0) limitStrain = 0;
        }
        
        if (simStep === 2 || activeStrain < maxStrain) {
            const startStrain = maxStrain;
            const endStrain = Math.max(limitStrain, activeStrain);
            for (let e = startStrain; e >= endStrain; e -= step) {
                simStep = 2;
                const { currentStress } = calcHysteresis(e, relTemp, maxStrain);
                const xPos = mapX(e);
                const yPos = mapY(currentStress);
                plotCtx.lineTo(xPos, yPos);
            }
        }
        
        // Shading inside loop
        if (relTemp >= 0 && (simStep === 2 || activeStrain === 0.0)) {
            plotCtx.fillStyle = "rgba(138, 17, 52, 0.08)";
            plotCtx.closePath();
            plotCtx.fill();
        }
        
        // Restore step state
        if (activeStrain === maxStrain) {
            simStep = 1;
        } else if (activeStrain < maxStrain && activeStrain > limitStrain) {
            simStep = 2;
        } else {
            simStep = 0;
        }
        
        plotCtx.stroke();
        
        // Draw active dot
        const stateForDot = activeStrain === maxStrain ? 1 : (activeStrain < maxStrain && activeStrain > limitStrain ? 2 : 1);
        simStep = stateForDot;
        const { currentStress } = calcHysteresis(activeStrain, relTemp, maxStrain);
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
        camera.position.set(0, 0, 7);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(450, 400);
        container.appendChild(renderer.domElement);
        
        const orbit = new THREE.OrbitControls(camera, renderer.domElement);
        orbit.enableZoom = false;
        
        // Lights
        const light1 = new THREE.DirectionalLight(0xffffff, 1);
        light1.position.set(2, 2, 5);
        scene.add(light1);
        scene.add(new THREE.AmbientLight(0x505050));
        
        // UTM Grips
        const gripTop = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 0.8), new THREE.MeshPhongMaterial({ color: 0x475569, shininess: 40 }));
        gripTop.position.set(0, 1.8, 0);
        scene.add(gripTop);
        
        const gripBottom = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 0.8), new THREE.MeshPhongMaterial({ color: 0x475569, shininess: 40 }));
        gripBottom.position.set(0, -1.8, 0);
        scene.add(gripBottom);
        
        const wireGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.2, 16);
        const wireMat = new THREE.MeshPhongMaterial({ color: 0x94a3b8, shininess: 80 });
        const wire = new THREE.Mesh(wireGeo, wireMat);
        scene.add(wire);
        
        // Transparent Fluid/Chamber container
        const chamberMat = new THREE.MeshPhongMaterial({
            color: 0x0ea5e9,
            transparent: true,
            opacity: 0.15,
            depthWrite: false
        });
        const chamber = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.0, 1.8), chamberMat);
        chamber.position.set(0, 0, 0);
        scene.add(chamber);
        
        dogboneMesh = { wire, gripTop, gripBottom, chamber, chamberMat };
        
        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();
    }

    function updateThreeScene(strain, stress, relTemp) {
        if (!dogboneMesh) return;
        
        // Fluid color bath changes
        if (relTemp < 0) {
            dogboneMesh.chamberMat.color.setHex(0x38bdf8);
            dogboneMesh.chamberMat.opacity = 0.22;
        } else {
            dogboneMesh.chamberMat.color.setHex(0xf97316);
            dogboneMesh.chamberMat.opacity = 0.12;
        }
        
        // Strain stretches specimen
        const scaleFactor = 1.0 + (strain / 8.0) * 0.3;
        dogboneMesh.wire.scale.y = scaleFactor;
        dogboneMesh.wire.position.y = (scaleFactor - 1.0) * 1.6;
        dogboneMesh.gripTop.position.y = 1.8 + (scaleFactor - 1.0) * 3.2;
        
        // Stress changes wire color
        const stressRatio = Math.min(1.0, stress / 500.0);
        const r = 0.58 + stressRatio * 0.35;
        const g = 0.64 - stressRatio * 0.45;
        const b = 0.72 - stressRatio * 0.55;
        dogboneMesh.wire.material.color.setRGB(r, g, b);
    }

    btnRun.addEventListener('click', () => {
        if (isAnimating) return;
        isAnimating = true;
        btnRun.disabled = true;
        btnRun.innerText = "Testing...";
        btnRun.style.background = "#475569";
        
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
                    btnRun.innerText = "Run Stress-Strain Test";
                    btnRun.style.background = "linear-gradient(135deg, #9f1239, #8A1134)";
                    document.getElementById('btnNextCalc').style.display = 'inline-block';
                    clearInterval(interval);
                }
            }
            updateUI();
        }, 40);
    });

    relTempEl.addEventListener('input', updateUI);
    maxStrainEl.addEventListener('input', updateUI);
    
    init3D();
    updateUI();
})();

// ============================================================
// SUB-CALC C: Bench Power Supply & Thermocouple
// ============================================================
(function() {
    const dwEl = document.getElementById('dw');
    if (!dwEl) return;
    
    const inputCurrentEl = document.getElementById('inputCurrent');
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
        const { mapX, mapY } = drawGrid(plotCtx, 450, 400, 0, 10, 0, 180, "Time t (s)", "Temperature T (°C)");
        
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
    }

    function init3D() {
        const container = document.getElementById('viewport3D');
        if (!container) return;
        
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xfafbfc);
        
        camera = new THREE.PerspectiveCamera(45, 450 / 400, 0.1, 100);
        camera.position.set(0, 0.4, 4.5);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(450, 400);
        container.appendChild(renderer.domElement);
        
        const orbit = new THREE.OrbitControls(camera, renderer.domElement);
        orbit.enableZoom = false;
        
        // Terminals
        const termL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.4), new THREE.MeshPhongMaterial({ color: 0xb87333 }));
        termL.position.set(-1.6, 0, 0);
        scene.add(termL);
        
        const termR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.4), new THREE.MeshPhongMaterial({ color: 0xb87333 }));
        termR.position.set(1.6, 0, 0);
        scene.add(termR);
        
        // Wire
        const wireGeo = new THREE.CylinderGeometry(0.05, 0.05, 3.2, 16);
        const wireMat = new THREE.MeshPhongMaterial({ color: 0x475569, shininess: 80 });
        const wire = new THREE.Mesh(wireGeo, wireMat);
        wire.rotation.z = Math.PI / 2;
        scene.add(wire);
        
        // Fine thermocouple bead
        const tcBead = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), new THREE.MeshPhongMaterial({ color: 0xffd700, shininess: 100 }));
        tcBead.position.set(0, 0, 0.06);
        scene.add(tcBead);
        
        // Lead wires
        const tcWire1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.8, 8), new THREE.MeshPhongMaterial({ color: 0xef4444 }));
        tcWire1.position.set(-0.25, 0.8, -0.2);
        tcWire1.rotation.z = -0.25;
        tcWire1.rotation.x = -0.2;
        scene.add(tcWire1);
        
        const tcWire2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.8, 8), new THREE.MeshPhongMaterial({ color: 0x3b82f6 }));
        tcWire2.position.set(0.25, 0.8, -0.2);
        tcWire2.rotation.z = 0.25;
        tcWire2.rotation.x = -0.2;
        scene.add(tcWire2);
        
        wireMesh = wire;
        
        scene.add(new THREE.DirectionalLight(0xffffff, 1.2));
        scene.add(new THREE.AmbientLight(0x505050));
        
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
                btnRun.innerText = "Run Electrical Actuation";
                btnRun.style.background = "linear-gradient(135deg, #9f1239, #8A1134)";
                document.getElementById('btnNextCalc').style.display = 'inline-block';
                clearInterval(interval);
            }
        }, 35);
    });

    dwEl.addEventListener('input', updateUI);
    inputCurrentEl.addEventListener('input', updateUI);
    
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
    let scene, camera, renderer, gripperMesh;
    
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

    function init3D() {
        const container = document.getElementById('viewport3D');
        if (!container) return;
        
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xfafbfc);
        
        camera = new THREE.PerspectiveCamera(45, 450 / 400, 0.1, 100);
        camera.position.set(0, 1.2, 5);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(450, 400);
        container.appendChild(renderer.domElement);
        
        const orbit = new THREE.OrbitControls(camera, renderer.domElement);
        orbit.enableZoom = false;
        
        const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.2, 1.2), new THREE.MeshPhongMaterial({ color: 0x475569 }));
        base.position.set(0, -1.0, 0);
        scene.add(base);
        
        const uprightL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.8), new THREE.MeshPhongMaterial({ color: 0x64748b }));
        uprightL.position.set(-2.0, -0.4, 0);
        scene.add(uprightL);
        
        const uprightR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.8), new THREE.MeshPhongMaterial({ color: 0x64748b }));
        uprightR.position.set(2.0, -0.4, 0);
        scene.add(uprightR);
        
        const loadCell = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshPhongMaterial({ color: 0xe2e8f0 }));
        loadCell.position.set(-1.8, 0, 0);
        scene.add(loadCell);
        
        const ruler = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 0.2), new THREE.MeshPhongMaterial({ color: 0x94a3b8 }));
        ruler.position.set(0, -0.8, 0.4);
        scene.add(ruler);
        
        const tickGeo = new THREE.BoxGeometry(0.02, 0.04, 0.02);
        const tickMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
        for (let i = -18; i <= 18; i++) {
            const tick = new THREE.Mesh(tickGeo, tickMat);
            tick.position.set(i * 0.1, -0.76, 0.5);
            scene.add(tick);
        }
        
        const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.6), new THREE.MeshPhongMaterial({ color: 0x334155 }));
        clamp.position.set(1.5, 0, 0);
        scene.add(clamp);
        
        const rodGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.8, 16);
        const rod = new THREE.Mesh(rodGeo, new THREE.MeshPhongMaterial({ color: 0xcbd5e1, metalness: 0.9 }));
        rod.rotation.z = Math.PI / 2;
        rod.position.set(0, -0.4, 0);
        scene.add(rod);
        
        const wireGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 16);
        const wireMat = new THREE.MeshPhongMaterial({ color: 0x8a1134, shininess: 80 });
        const wire = new THREE.Mesh(wireGeo, wireMat);
        wire.rotation.z = Math.PI / 2;
        scene.add(wire);
        
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
        
        const maxStrokeOffset = 1.2;
        const offset = progress * maxStrokeOffset;
        
        gripperMesh.clamp.position.x = 1.5 - offset;
        
        const wireLength = (1.5 - offset) - (-1.55);
        gripperMesh.wire.scale.y = wireLength;
        gripperMesh.wire.position.x = -1.55 + wireLength / 2;
        
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
        
        simProgress = 0.0;
        
        const interval = setInterval(() => {
            simProgress += 0.02;
            if (simProgress >= 1.0) {
                simProgress = 1.0;
                isAnimating = false;
                btnRun.disabled = false;
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
    let scene, camera, renderer, wireMesh;
    
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
        const bendHeight = (strainVal / 8.0) * 0.45;
        const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-1.3, 0, 0),
            new THREE.Vector3(0, bendHeight, 0),
            new THREE.Vector3(1.3, 0.08, 0)
        );
        return new THREE.TubeGeometry(curve, 32, 0.04, 8, false);
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
        
        const chuckL = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.6, 16), new THREE.MeshPhongMaterial({ color: 0x475569 }));
        chuckL.rotation.z = Math.PI / 2;
        chuckL.position.set(-1.6, 0, 0);
        scene.add(chuckL);
        
        const chuckR = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 16), new THREE.MeshPhongMaterial({ color: 0x475569 }));
        chuckR.rotation.z = Math.PI / 2;
        chuckR.position.set(1.6, 0.08, 0);
        scene.add(chuckR);
        
        const initialStrain = parseFloat(appliedStrainEl.value);
        const wireGeo = createWireGeometry(initialStrain);
        const wireMat = new THREE.MeshPhongMaterial({ color: 0x8a1134, shininess: 80 });
        const wire = new THREE.Mesh(wireGeo, wireMat);
        scene.add(wire);
        
        wireMesh = { chuckL, chuckR, wire, wireMat };
        
        scene.add(new THREE.DirectionalLight(0xffffff, 1.2));
        scene.add(new THREE.AmbientLight(0x505050));
        
        function animate() {
            requestAnimationFrame(animate);
            if (isAnimating && wireMesh) {
                wireMesh.wire.rotation.x += 0.22;
                wireMesh.chuckL.rotation.x += 0.22;
                wireMesh.chuckR.rotation.x += 0.22;
            }
            renderer.render(scene, camera);
        }
        animate();
    }

    function updateThreeScene(strain) {
        if (!wireMesh) return;
        
        wireMesh.wire.geometry.dispose();
        wireMesh.wire.geometry = createWireGeometry(strain);
        
        if (!isAnimating) {
            wireMesh.wire.rotation.x = 0;
            wireMesh.chuckL.rotation.x = 0;
            wireMesh.chuckR.rotation.x = 0;
        }
    }

    btnRun.addEventListener('click', () => {
        if (isAnimating) return;
        isAnimating = true;
        btnRun.disabled = true;
        btnRun.innerText = "Cycling...";
        btnRun.style.background = "#475569";
        
        animCycle = 0;
        
        const interval = setInterval(() => {
            animCycle += 200;
            
            if (animCycle >= 10000) {
                animCycle = 10000;
                isAnimating = false;
                btnRun.disabled = false;
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
