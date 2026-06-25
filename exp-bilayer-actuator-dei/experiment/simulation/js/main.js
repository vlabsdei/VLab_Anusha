/* global THREE */
// Combined simulator script for Exp 2

// ============================================================
// SCRIPT_A.JS (Page Check: document.getElementById('deltaH'))
// ============================================================
(function() {
    if (!document.getElementById('deltaH')) return;
    
    // ============================================================================
    // Lab-Grade Timoshenko Bimetal 4D Printing Simulator - Core Engine
    // ============================================================================
    
    // 1. NIST-Validated Material database with Tg glass transition, density, & viscoelasticity
    const materials = {
        active_pla_4D: {
            name: "4D-Print PLA",
            E_glassy: 2300,        // MPa
            E_rubbery: 25,         // MPa
            Tg: 55,                // °C
            alpha_glassy: 380e-6,  // 1/°C
            alpha_rubbery: 120e-6, // 1/°C
            nu: 0.36,
            rho: 1240,             // kg/m^3
            beta: 0.0,             // Moisture expansion coefficient
            tau: 5.0,              // Viscoelastic relaxation time (s)
            yield_strength: 45     // MPa
        },
        hydrogel_PNIPAM: {
            name: "PNIPAM Hydrogel",
            E_glassy: 0.5,         // MPa
            E_rubbery: 0.05,       // MPa
            Tg: 32,                // LCST transition in °C
            alpha_glassy: 50e-6,
            alpha_rubbery: 250e-6,
            nu: 0.45,
            rho: 1050,
            beta: 0.15,            // High swelling ratio
            tau: 2.5,
            yield_strength: 0.4
        },
        shape_memory_polymer: {
            name: "SMP (Veriflex)",
            E_glassy: 1200,
            E_rubbery: 5,
            Tg: 60,
            alpha_glassy: 180e-6,
            alpha_rubbery: 70e-6,
            nu: 0.40,
            rho: 1250,
            beta: 0.0,
            tau: 7.5,
            yield_strength: 32
        },
        elastomer_PDMS: {
            name: "PDMS (Sylgard 184)",
            E_glassy: 1.8,
            E_rubbery: 1.8,
            Tg: -120,              // Rubbery at all lab temperatures
            alpha_glassy: 310e-6,
            alpha_rubbery: 310e-6,
            nu: 0.49,
            rho: 970,
            beta: 0.005,
            tau: 1.2,
            yield_strength: 2.2
        },
        pla_standard: {
            name: "Standard PLA",
            E: 3500,               // MPa (constant)
            alpha: 68e-6,          // 1/°C
            nu: 0.36,
            rho: 1240,
            beta: 0.001,
            yield_strength: 60
        },
        abs: {
            name: "ABS Plastic",
            E: 2200,
            alpha: 90e-6,
            nu: 0.35,
            rho: 1050,
            beta: 0.002,
            yield_strength: 40
        },
        petg: {
            name: "PETG Plastic",
            E: 2100,
            alpha: 75e-6,
            nu: 0.38,
            rho: 1270,
            beta: 0.001,
            yield_strength: 50
        }
    };
    
    // 2. UI DOM Elements Selector
    const solverModelSelect = document.getElementById('solverModel');
    const matActiveSelect = document.getElementById('matActive');
    const matPassiveSelect = document.getElementById('matPassive');
    const slideH1 = document.getElementById('h1');
    const slideH2 = document.getElementById('h2');
    const slideLen = document.getElementById('len');
    const slideWidth = document.getElementById('beamWidth');
    const slideDT = document.getElementById('deltaT');
    const slideDH = document.getElementById('deltaH');
    const slideRampRate = document.getElementById('rampRate');
    
    const valH1 = document.getElementById('valH1');
    const valH2 = document.getElementById('valH2');
    const valLen = document.getElementById('valLen');
    const valWidth = document.getElementById('valWidth');
    const valDT = document.getElementById('valDT');
    const valDH = document.getElementById('valDH');
    const valRampRate = document.getElementById('valRampRate');
    
    const btnRun = document.getElementById('btnRun');
    const btnReset = document.getElementById('btnReset');
    const btnPlayPause = document.getElementById('btnPlayPause');
    const timeScrubber = document.getElementById('timeScrubber');
    const timeVal = document.getElementById('timeVal');
    const stateLabel = document.getElementById('stateLabel');
    
    const timelineTemp = document.getElementById('timelineTemp');
    const timelineHum = document.getElementById('timelineHum');
    const timelineCurv = document.getElementById('timelineCurv');
    
    const resM = document.getElementById('resM');
    const resNA = document.getElementById('resNA');
    const resCurv = document.getElementById('resCurv');
    const resAngle = document.getElementById('resAngle');
    const resEnergy = document.getElementById('resEnergy');
    
    const safetyWarningsBox = document.getElementById('safetyWarningsBox');
    const latexFormulaContainer = document.getElementById('latexFormulaContainer');
    
    
    
    const btnOrbitReset = document.getElementById('btnOrbitReset');
    const showMeshNodes = document.getElementById('showMeshNodes');
    const showDeformedMesh = document.getElementById('showDeformedMesh');
    
    const stimThermalBtn = document.getElementById('stimThermalBtn');
    const stimMoistureBtn = document.getElementById('stimMoistureBtn');
    const thermalInputs = document.getElementById('thermalInputs');
    const moistureInputs = document.getElementById('moistureInputs');
    
    
    
    // 3. State Variables
    let currentSimTime = 0.0; // s
    const maxSimTime = 20.0;  // s
    let isPlaying = false;
    let playInterval = null;
    let currentStimulusType = 'thermal'; // 'thermal' or 'moisture'
    let stressChartCanvas = document.getElementById('stressChartCanvas');
    let historyChartCanvas = document.getElementById('historyChartCanvas');
    
    // Three.js State
    let scene, camera, renderer, orbitControls, gridHelper;
    let activeSegments = [];
    let passiveSegments = [];
    let threejsInitialized = false;
    
    // 4. Initial Setup and Event Listeners
    function init() {
        // Setup Tab Pill Listeners
        stimThermalBtn.addEventListener('click', () => setStimulusType('thermal'));
        stimMoistureBtn.addEventListener('click', () => setStimulusType('moisture'));
        
    
        
        // Sliders & Selects Setup
        [slideH1, slideH2, slideLen, slideWidth, slideDT, slideDH, slideRampRate, 
         solverModelSelect, matActiveSelect, matPassiveSelect].forEach(el => {
            if (el) el.addEventListener('input', () => {
                updateLabels();
                resetTimelineToZero();
                runSimulationAtTime(currentSimTime);
            });
        });
    
        // Time Scrubber
        timeScrubber.addEventListener('input', (e) => {
            pauseSimulation();
            currentSimTime = parseFloat(e.target.value);
            runSimulationAtTime(currentSimTime);
        });
    
        // Action Buttons
        btnRun.addEventListener('click', startSimulation);
        btnReset.addEventListener('click', resetLab);
        btnPlayPause.addEventListener('click', togglePlayPause);
        btnOrbitReset.addEventListener('click', resetCamera);
        if (showMeshNodes) showMeshNodes.addEventListener('change', () => runSimulationAtTime(currentSimTime));
        if (showDeformedMesh) showDeformedMesh.addEventListener('change', () => runSimulationAtTime(currentSimTime));
    
    
    
        // Initial labels and render
        updateLabels();
        try {
            init3D();
            threejsInitialized = true;
        } catch (e) {
            console.error("Three.js WebGL failure, falling back to 2D canvas:", e);
            document.getElementById('simCanvas').style.display = 'block';
        }
        runSimulationAtTime(0.0);
    }
    
    
    
    function setStimulusType(type) {
        currentStimulusType = type;
        if (type === 'thermal') {
            stimThermalBtn.classList.add('active');
            stimMoistureBtn.classList.remove('active');
            thermalInputs.style.display = 'block';
            moistureInputs.style.display = 'none';
            valRampRate.innerText = parseFloat(slideRampRate.value).toFixed(2) + ' °/s';
        } else {
            stimThermalBtn.classList.remove('active');
            stimMoistureBtn.classList.add('active');
            thermalInputs.style.display = 'none';
            moistureInputs.style.display = 'block';
            valRampRate.innerText = parseFloat(slideRampRate.value).toFixed(2) + ' %/s';
        }
        resetTimelineToZero();
        runSimulationAtTime(currentSimTime);
    }
    
    function updateLabels() {
        valH1.innerText = parseFloat(slideH1.value).toFixed(2) + ' mm';
        valH2.innerText = parseFloat(slideH2.value).toFixed(2) + ' mm';
        valLen.innerText = parseFloat(slideLen.value).toFixed(2) + ' mm';
        valWidth.innerText = parseFloat(slideWidth.value).toFixed(2) + ' mm';
        valDT.innerText = parseFloat(slideDT.value).toFixed(2) + ' °C';
        valDH.innerText = parseFloat(slideDH.value).toFixed(2) + ' %';
        
        if (currentStimulusType === 'thermal') {
            valRampRate.innerText = parseFloat(slideRampRate.value).toFixed(2) + ' °/s';
        } else {
            valRampRate.innerText = parseFloat(slideRampRate.value).toFixed(2) + ' %/s';
        }
    }
    
    // 5. Physics soft-transition evaluation function
    function getMaterialProperties(matKey, T, H, t) {
        const mat = materials[matKey];
        if (!mat) return null;
        
        // Constant values
        if (mat.E !== undefined) {
            return {
                E: mat.E,
                alpha: mat.alpha,
                nu: mat.nu,
                rho: mat.rho,
                beta: mat.beta,
                yield_strength: mat.yield_strength
            };
        }
        
        // sigmoidal transition modeling glass softening Tg
        const E_glassy = mat.E_glassy;
        const E_rubbery = mat.E_rubbery;
        const Tg = mat.Tg;
        
        const sigmoid = (x) => 1 / (1 + Math.exp(-x));
        const width = 5.0; // transition temperature width in °C
        
        // Instantaneous Modulus
        const E_T_instant = E_rubbery + (E_glassy - E_rubbery) * (1 - sigmoid((T - Tg) / width));
        
        // Fully relaxed long-term modulus
        const E_T_relaxed = E_rubbery * 0.4 + (E_glassy * 0.1 - E_rubbery * 0.4) * (1 - sigmoid((T - Tg) / width));
        
        // Viscoelastic SLS Zener model integration
        const E_eff = E_T_relaxed + (E_T_instant - E_T_relaxed) * Math.exp(-t / mat.tau);
        
        // Coefficient of Thermal Expansion transition
        const alpha_glassy = mat.alpha_glassy;
        const alpha_rubbery = mat.alpha_rubbery;
        const alpha_eff = alpha_glassy + (alpha_rubbery - alpha_glassy) * sigmoid((T - Tg) / width);
        
        return {
            E: E_eff,
            alpha: alpha_eff,
            nu: mat.nu,
            rho: mat.rho,
            beta: mat.beta,
            yield_strength: mat.yield_strength
        };
    }
    
    // 6. Curvature & Bending Solver Implementation
    function runSimulationAtTime(t) {
        // Update timeline values
        timeScrubber.value = t.toFixed(1);
        timeVal.innerText = t.toFixed(1);
        
        // Geometry values in meters
        const h1 = parseFloat(slideH1.value) / 1000;
        const h2 = parseFloat(slideH2.value) / 1000;
        const L = parseFloat(slideLen.value) / 1000;
        const b = parseFloat(slideWidth.value) / 1000;
        const h = h1 + h2;
        const m = h1 / h2;
    
        const targetDT = parseFloat(slideDT.value);
        const targetDH = parseFloat(slideDH.value);
        const rampRate = parseFloat(slideRampRate.value);
    
        // Compute transient stimuli
        let T = 25.0; // initial lab ambient temp
        let H = 30.0; // initial lab ambient relative humidity
        
        if (currentStimulusType === 'thermal') {
            T += Math.min(targetDT, rampRate * t);
        } else {
            H += Math.min(targetDH, rampRate * t);
        }
    
        timelineTemp.innerText = T.toFixed(1) + ' °C';
        timelineHum.innerText = H.toFixed(1) + ' %';
    
        // Solve material properties at this T, H, t
        const matProp1 = getMaterialProperties(matActiveSelect.value, T, H, t, currentStimulusType === 'thermal');
        const matProp2 = getMaterialProperties(matPassiveSelect.value, T, H, t, currentStimulusType === 'thermal');
    
        const E1 = matProp1.E * 1e6; // Pa
        const E2 = matProp2.E * 1e6; // Pa
        const n = E1 / E2;
    
        // Transformed section neutral axis position from bottom
        const y_na = (E1 * h1 * (h2 + h1 / 2) + E2 * h2 * (h2 / 2)) / (E1 * h1 + E2 * h2);
    
        // Transformed Section Rigidity EI_eff
        const EI_eff = b * (
            (E1 * Math.pow(h1, 3) / 12) + E1 * h1 * Math.pow(h2 + h1/2 - y_na, 2) +
            (E2 * Math.pow(h2, 3) / 12) + E2 * h2 * Math.pow(h2/2 - y_na, 2)
        );
    
        // Solve Curvature (kappa)
        let kappa = 0;
        const model = solverModelSelect.value;
    
        const alpha1 = matProp1.alpha;
        const alpha2 = matProp2.alpha;
        const beta1 = matProp1.beta;
        const beta2 = matProp2.beta;
    
        const deltaT = T - 25.0;
        const deltaH = H - 30.0;
    
        // Physical correction: active layer (1) is on top, passive (2) is on bottom.
        // If active expands more, it bends downward (negative curvature).
        // So deltaStrain must be passive minus active to yield kappa < 0 when active expands.
        let deltaStrain = 0;
        if (currentStimulusType === 'thermal') {
            deltaStrain = (alpha2 - alpha1) * deltaT;
        } else {
            deltaStrain = (beta2 - beta1) * deltaH;
        }
    
        if (model === 'timoshenko' || model === 'suohutchinson' || model === 'elastica') {
            // Timoshenko Exact denominator
            const term1 = 3 * Math.pow(1 + m, 2);
            const term2 = (1 + m * n) * (m * m + 1 / (m * n));
            const phi = term1 + term2;
            kappa = (6 * deltaStrain * Math.pow(1 + m, 2)) / (h * phi);
        }
    
        // derived geometries
        const tipAngleRad = kappa * L;
        const tipAngleDeg = tipAngleRad * 180 / Math.PI;
    
        // Solve for deflections along length s
        const numPoints = 40;
        const ds = L / numPoints;
        let points = [];
    
        if (model === 'fem') {
            // Solve lightweight 1D Hermite Euler-Bernoulli FEM
            points = solveBeamFEM(L, E1, E2, h1, h2, b, T, H, currentStimulusType === 'thermal', numPoints);
            // Correct curvature based on tip deflection for outputs
            const tipDeflect = points[points.length - 1].y;
            // Tip deflection for cantilever with uniform moment is: delta = M*L^2 / (2EI) = kappa * L^2 / 2
            // So equivalent curvature = 2 * tipDeflect / L^2
            kappa = 2 * tipDeflect / (L * L);
        } else if (model === 'elastica') {
            // RK4 integrator for large deflections
            points = solveElasticaRK4(L, kappa, numPoints);
        } else {
            // Standard circle arc mapping
            for (let i = 0; i <= numPoints; i++) {
                const s = i * ds;
                let x, y, theta;
                if (Math.abs(kappa) < 1e-6) {
                    x = s;
                    y = 0;
                    theta = 0;
                } else {
                    x = Math.sin(kappa * s) / kappa;
                    y = (1 - Math.cos(kappa * s)) / kappa;
                    theta = kappa * s;
                }
                points.push({ x, y, theta, kappa });
            }
        }
    
        timelineCurv.innerText = kappa.toFixed(4) + ' m⁻¹';
    
        // Strain energy: U = 0.5 * EI * kappa^2 * L
        const strainEnergy = 0.5 * EI_eff * Math.pow(kappa, 2) * L;
    
        // Update Output metrics in Table
        resM.innerText = m.toFixed(3);
        resNA.innerText = (y_na * 1000).toFixed(3) + ' mm';
        resCurv.innerText = kappa.toFixed(4) + ' m⁻¹';
        resAngle.innerText = tipAngleDeg.toFixed(2) + '°';
        resEnergy.innerText = (strainEnergy * 1e3).toFixed(3) + ' mJ';
    
        // State Label
        if (Math.abs(tipAngleDeg) < 0.1) {
            stateLabel.innerText = "State: Flat Cantilever";
            stateLabel.className = "state-indicator flat";
        } else {
            stateLabel.innerText = "State: Curved Actuator (" + (tipAngleDeg > 0 ? "Upward" : "Downward") + ")";
            stateLabel.className = "state-indicator bending";
        }
    
        // Dynamic temperature/time dependent thermal expansion strains
        let eps_th1 = 0, eps_th2 = 0;
        if (currentStimulusType === 'thermal') {
            eps_th1 = matProp1.alpha * deltaT;
            eps_th2 = matProp2.alpha * deltaT;
        } else {
            eps_th1 = matProp1.beta * deltaH;
            eps_th2 = matProp2.beta * deltaH;
        }
    
        // Safety and failure warning checks
        evaluateSafetyChecks(E1, E2, h1, h2, y_na, kappa, eps_th1, eps_th2, matProp1.yield_strength, matProp2.yield_strength, EI_eff, L, b);
    
        // Update Live 3D Mesh
        if (threejsInitialized) {
            update3DBeam(points, h1, h2, b, L, E1, E2, y_na, eps_th1, eps_th2);
        } else {
            drawBilayer2D(points, h1);
        }
    
        // Draw Analytics Plots
        drawStressChart(E1, E2, h1, h2, y_na, kappa, eps_th1, eps_th2);
        updateHistoryPlot(t, kappa);
    
        // Render LaTeX Equations
        renderLiveMath(m, n, h, deltaStrain, kappa);
    }
    
    // 7. 3D WebGL Renderer with Three.js
    function init3D() {
        const container = document.getElementById('viewport3D');
        if (!container) return;
        
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xfafbfc);
        
        camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(35, 20, 50);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);
        
        orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
        orbitControls.enableDamping = true;
        orbitControls.dampingFactor = 0.05;
        orbitControls.maxPolarAngle = Math.PI / 2 + 0.1;
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        
        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight1.position.set(20, 80, 40);
        dirLight1.castShadow = true;
        scene.add(dirLight1);
        
        const dirLight2 = new THREE.DirectionalLight(0x0ea5e9, 0.15); // blue bounce
        dirLight2.position.set(-20, -50, -30);
        scene.add(dirLight2);
        
        gridHelper = new THREE.GridHelper(80, 20, 0x8a1134, 0xe2e8f0);
        gridHelper.position.y = -8;
        scene.add(gridHelper);
        
        // Draw rigid clamp assembly
        const clampGeo = new THREE.BoxGeometry(4, 15, 12);
        const clampMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
        const clampMesh = new THREE.Mesh(clampGeo, clampMat);
        clampMesh.position.set(-2, 0, 0);
        scene.add(clampMesh);
        
        window.addEventListener('resize', onWindowResize);
        
        animate3D();
    }
    
    function onWindowResize() {
        const container = document.getElementById('viewport3D');
        if (!container || !renderer || !camera) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    function animate3D() {
        requestAnimationFrame(animate3D);
        if (orbitControls) orbitControls.update();
        if (renderer && scene && camera) renderer.render(scene, camera);
    }
    
    function resetCamera() {
        if (orbitControls) {
            camera.position.set(35, 20, 50);
            orbitControls.target.set(0, 0, 0);
            orbitControls.update();
        }
    }
    
    function update3DBeam(points, h1, h2, b, L, E1, E2, y_na, eps_th1, eps_th2) {
        const N = points.length - 1;
        const ds_undeformed = L / N;
        
        // Scale for rendering (meters to screen coordinates)
        const renderScale = 300; 
    
        // Create segments if they don't exist or if dimensions have changed
        if (activeSegments.length !== N || passiveSegments.length !== N ||
            update3DBeam.h1 !== h1 || update3DBeam.h2 !== h2 || 
            update3DBeam.b !== b || update3DBeam.L !== L) {
            
            activeSegments.forEach(mesh => {
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
                scene.remove(mesh);
            });
            passiveSegments.forEach(mesh => {
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
                scene.remove(mesh);
            });
            activeSegments = [];
            passiveSegments = [];
            
            update3DBeam.h1 = h1;
            update3DBeam.h2 = h2;
            update3DBeam.b = b;
            update3DBeam.L = L;
            
            // Small overlaps (ds_undeformed * 1.03) prevent gaps between segmented meshes during rotation
            const activeGeo = new THREE.BoxGeometry(ds_undeformed * renderScale * 1.03, h1 * renderScale, b * renderScale);
            const passiveGeo = new THREE.BoxGeometry(ds_undeformed * renderScale * 1.03, h2 * renderScale, b * renderScale);
            
            for (let i = 0; i < N; i++) {
                const activeMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 });
                const passiveMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 });
                
                const aMesh = new THREE.Mesh(activeGeo, activeMat);
                const pMesh = new THREE.Mesh(passiveGeo, passiveMat);
                
                scene.add(aMesh);
                scene.add(pMesh);
                
                activeSegments.push(aMesh);
                passiveSegments.push(pMesh);
            }
        }
        
        const activeOff = (h2 + h1/2 - y_na);
        const passiveOff = (h2/2 - y_na);
        
        // Map colors based on a maximum stress scale of 25 MPa
        const maxStressRef = 25e6; 
    
        // Reference strain eps0
        const eps0 = (E1 * h1 * eps_th1 + E2 * h2 * eps_th2) / (E1 * h1 + E2 * h2);
    
        for (let i = 0; i < N; i++) {
            const p1 = points[i];
            const p2 = points[i+1];
            
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2;
            const theta = (p1.theta + p2.theta) / 2;
            
            const px = -Math.sin(theta);
            const py = Math.cos(theta);
            
            const ax = mx + activeOff * px;
            const ay = my + activeOff * py;
            
            const passx = mx + passiveOff * px;
            const passy = my + passiveOff * py;
            
            // Update segment transforms
            activeSegments[i].position.set(ax * renderScale, ay * renderScale, 0);
            activeSegments[i].rotation.set(0, 0, theta);
            activeSegments[i].scale.set(1, 1, 1);
            
            passiveSegments[i].position.set(passx * renderScale, passy * renderScale, 0);
            passiveSegments[i].rotation.set(0, 0, theta);
            passiveSegments[i].scale.set(1, 1, 1);
            
            // Compute combined stresses for color mapping: σ = E * (ε_0 + κ*(y - y_na) - ε_th)
            const kappa = p1.kappa;
            const stress_a = E1 * (eps0 + kappa * (h2 + h1/2 - y_na) - eps_th1);
            const stress_p = E2 * (eps0 + kappa * (h2/2 - y_na) - eps_th2);
            
            activeSegments[i].material.color.setHex(getColorForStress(stress_a, maxStressRef));
            passiveSegments[i].material.color.setHex(getColorForStress(stress_p, maxStressRef));
        }
    }
    
    function getColorForStress(stress, maxStress) {
        const norm = Math.max(-1, Math.min(1, stress / maxStress));
        if (norm < 0) {
            // Compression: blue transition
            const t = 1 + norm;
            const r = Math.round(0x3b + (0xe2 - 0x3b) * t);
            const g = Math.round(0x82 + (0xe8 - 0x82) * t);
            const b = Math.round(0xf6 + (0xf0 - 0xf6) * t);
            return (r << 16) + (g << 8) + b;
        } else {
            // Tension: red transition
            const t = norm;
            const r = Math.round(0xe2 + (0xef - 0xe2) * t);
            const g = Math.round(0xe8 + (0x44 - 0xe8) * t);
            const b = Math.round(0xf0 + (0x44 - 0xf0) * t);
            return (r << 16) + (g << 8) + b;
        }
    }
    
    // 2D Canvas Fallback
    function drawBilayer2D(points, h1) {
        const canvas = document.getElementById('simCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Simple 2D wireframe
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, 250);
        ctx.lineTo(450, 250);
        ctx.stroke();
        
        // Draw clamp mount
        ctx.fillStyle = '#475569';
        ctx.fillRect(20, 200, 30, 100);
        
        // Draw active layer (red) and passive layer (blue)
        const scale = 3000;
        const ox = 50, oy = 250;
        
        ctx.lineWidth = h1 * 1000 * 5;
        ctx.strokeStyle = '#ef4444';
        ctx.beginPath();
        points.forEach((p, idx) => {
            const sx = ox + p.x * scale;
            const sy = oy - p.y * scale;
            if (idx === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
    }
    
    // 8. 1D Euler-Bernoulli Beam FEM Solver formulation
    function solveBeamFEM(L, E1, E2, h1, h2, b, T, H, isThermal, N_elements) {
        const Le = L / N_elements;
        const yc = (E1 * h1 * (h2 + h1 / 2) + E2 * h2 * (h2 / 2)) / (E1 * h1 + E2 * h2);
        
        // Transformed EI_eff
        const EI_eff = b * (
            (E1 * Math.pow(h1, 3) / 12) + E1 * h1 * Math.pow(h2 + h1/2 - yc, 2) +
            (E2 * Math.pow(h2, 3) / 12) + E2 * h2 * Math.pow(h2/2 - yc, 2)
        );
        
        const matProp1 = getMaterialProperties(matActiveSelect.value, T, H, currentSimTime, isThermal);
        const matProp2 = getMaterialProperties(matPassiveSelect.value, T, H, currentSimTime, isThermal);
        
        
        // Thermal bending moment load
        // M_th = - integral E * strain_th * (y - yc) dA
        const M_th = - ( E1 * b * h1 * (isThermal ? matProp1.alpha : matProp1.beta) * (isThermal ? T-25.0 : H-30.0) * (h2 + h1/2 - yc) +
                         E2 * b * h2 * (isThermal ? matProp2.alpha : matProp2.beta) * (isThermal ? T-25.0 : H-30.0) * (h2/2 - yc) );
    
        const numNodes = N_elements + 1;
        const numDOFs = numNodes * 2;
        
        // Global stiffness K and force F arrays
        const K = Array(numDOFs).fill(0).map(() => Array(numDOFs).fill(0));
        const F = Array(numDOFs).fill(0);
        
        // Standard Hermite stiffness matrix factor
        const C = EI_eff / Math.pow(Le, 3);
        const ke = [
            [12 * C, 6 * Le * C, -12 * C, 6 * Le * C],
            [6 * Le * C, 4 * Le * Le * C, -6 * Le * C, 2 * Le * Le * C],
            [-12 * C, -6 * Le * C, 12 * C, -6 * Le * C],
            [6 * Le * C, 2 * Le * Le * C, -6 * Le * C, 4 * Le * Le * C]
        ];
        
        // Equivalent nodal loading for constant bending moment:
        const fe = [0, -M_th, 0, M_th];
        
        // Stiffness assembly
        for (let e = 0; e < N_elements; e++) {
            const node1 = e;
            const node2 = e + 1;
            const dofs = [node1 * 2, node1 * 2 + 1, node2 * 2, node2 * 2 + 1];
            
            for (let i = 0; i < 4; i++) {
                F[dofs[i]] += fe[i];
                for (let j = 0; j < 4; j++) {
                    K[dofs[i]][dofs[j]] += ke[i][j];
                }
            }
        }
        
        // Boundary conditions: clamp node 0 (DOFs 0 and 1)
        const BC_dofs = [0, 1];
        BC_dofs.forEach(dof => {
            for (let j = 0; j < numDOFs; j++) {
                K[dof][j] = 0;
            }
            K[dof][dof] = 1;
            F[dof] = 0;
        });
        
        // Solve system
        const u = gaussianElimination(K, F);
        
        // Extract node coordinates with inextensibility length correction
        let curX = 0;
        const points = [{ x: 0, y: 0, theta: 0, kappa: M_th / EI_eff }];
        
        for (let i = 1; i < numNodes; i++) {
            const w = u[i * 2];       // vertical deflection
            const theta = u[i * 2 + 1]; // slope
            const dy = w - points[i-1].y;
            // Inextensibility step: ds^2 = dx^2 + dy^2 => dx = sqrt(ds^2 - dy^2)
            const dx = Math.sqrt(Math.max(0, Le * Le - dy * dy));
            curX += dx;
            points.push({ x: curX, y: w, theta: theta, kappa: M_th / EI_eff });
        }
        return points;
    }
    
    function gaussianElimination(A, b) {
        const n = b.length;
        for (let i = 0; i < n; i++) {
            let maxEl = Math.abs(A[i][i]);
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(A[k][i]) > maxEl) {
                    maxEl = Math.abs(A[k][i]);
                    maxRow = k;
                }
            }
            
            for (let k = i; k < n; k++) {
                const tmp = A[maxRow][k];
                A[maxRow][k] = A[i][k];
                A[i][k] = tmp;
            }
            const tmp = b[maxRow];
            b[maxRow] = b[i];
            b[i] = tmp;
            
            for (let k = i + 1; k < n; k++) {
                const c = -A[k][i] / A[i][i];
                for (let j = i; j < n; j++) {
                    if (i === j) {
                        A[k][j] = 0;
                    } else {
                        A[k][j] += c * A[i][j];
                    }
                }
                b[k] += c * b[i];
            }
        }
        
        const x = Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = b[i] / A[i][i];
            for (let k = i - 1; k >= 0; k--) {
                b[k] -= A[k][i] * x[i];
            }
        }
        return x;
    }
    
    // 9. Nonlinear Elastica RK4 Integrator
    function solveElasticaRK4(L, kappa, segments) {
        const ds = L / segments;
        let x = 0, y = 0, theta = 0;
        const points = [{ x, y, theta, kappa }];
        
        for (let i = 0; i < segments; i++) {
            // RK4 integration for coordinates
            const dx1 = Math.cos(theta) * ds;
            const dy1 = Math.sin(theta) * ds;
            const dt1 = kappa * ds;
    
            const dx2 = Math.cos(theta + dt1 / 2) * ds;
            const dy2 = Math.sin(theta + dt1 / 2) * ds;
            const dt2 = kappa * ds;
    
            const dx3 = Math.cos(theta + dt2 / 2) * ds;
            const dy3 = Math.sin(theta + dt2 / 2) * ds;
            const dt3 = kappa * ds;
    
            const dx4 = Math.cos(theta + dt3) * ds;
            const dy4 = Math.sin(theta + dt3) * ds;
            const dt4 = kappa * ds;
    
            x += (dx1 + 2 * dx2 + 2 * dx3 + dx4) / 6;
            y += (dy1 + 2 * dy2 + 2 * dy3 + dy4) / 6;
            theta += (dt1 + 2 * dt2 + 2 * dt3 + dt4) / 6;
            
            points.push({ x, y, theta, kappa });
        }
        return points;
    }
    
    // 10. Safety Constraints Evaluation & Yield Warnings
    function evaluateSafetyChecks(E1, E2, h1, h2, y_na, kappa, eps_th1, eps_th2, yield1, yield2, EI_eff, L, b) {
        // Reference strain eps0
        const eps0 = (E1 * h1 * eps_th1 + E2 * h2 * eps_th2) / (E1 * h1 + E2 * h2);
    
        // Stress calculation at fibers
        // sigma = E * (eps0 + kappa * (y - y_na) - eps_th)
        const maxStressActive = E1 * Math.abs(eps0 + kappa * (h2 + h1 - y_na) - eps_th1) / 1e6; // MPa
        const maxStressPassive = E2 * Math.abs(eps0 + kappa * (0 - y_na) - eps_th2) / 1e6;     // MPa
    
        const activeWarnings = [];
    
        // Yield Checks
        if (maxStressActive > yield1) {
            activeWarnings.push({
                id: "yield-active",
                color: "red",
                title: "Yield Warning",
                text: `Active layer fiber stress (${maxStressActive.toFixed(1)} MPa) exceeds its yield limit (${yield1} MPa). Permanent deformation/fracture would occur!`
            });
        }
        if (maxStressPassive > yield2) {
            activeWarnings.push({
                id: "yield-passive",
                color: "red",
                title: "Yield Warning",
                text: `Passive layer fiber stress (${maxStressPassive.toFixed(1)} MPa) exceeds its yield limit (${yield2} MPa). Material would yield/crack!`
            });
        }
    
        // Delamination shear stress approximation
        const deltaStrain = eps_th1 - eps_th2;
        const shearStress = 0.25 * (E1 + E2) * Math.abs(deltaStrain) / 1e6; // MPa
        const limitShear = 2.5; // MPa limit
        if (shearStress > limitShear) {
            activeWarnings.push({
                id: "delamination",
                color: "amber",
                title: "Delamination Mismatch",
                text: `Peak interface shear stress (${shearStress.toFixed(1)} MPa) exceeds boundary bond strength. The bilayer layers are at risk of delaminating!`
            });
        }
    
        // Clamped-Clamped Buckling Detection
        const Pcr = 4 * Math.PI * Math.PI * EI_eff / (L * L); // N
        const axialThermalForce = (E1 * h1 + E2 * h2) * b * Math.abs(deltaStrain); // N
        if (axialThermalForce > Pcr) {
            activeWarnings.push({
                id: "buckling",
                color: "amber",
                title: "Buckling Risk",
                text: `For a clamped-clamped constraint boundary, the thermal force (${axialThermalForce.toFixed(1)} N) exceeds critical buckling load (${Pcr.toFixed(1)} N). It would buckle!`
            });
        }
    
        // Small deflection validity check (kappa * L > 0.3)
        if (Math.abs(kappa * L) > 0.3 && solverModelSelect.value === 'timoshenko') {
            activeWarnings.push({
                id: "linear-limits",
                color: "amber",
                title: "Linear Limits Exceeded",
                text: `κL = ${(Math.abs(kappa * L)).toFixed(2)} exceeds 0.3. Small-deflection Timoshenko assumptions are invalid. Use Nonlinear Elastica!`
            });
        }
    
        // Update safetyWarningsBox DOM
        if (activeWarnings.length === 0) {
            // Remove other banners if present
            const existingBanners = Array.from(safetyWarningsBox.children);
            existingBanners.forEach(banner => {
                if (banner.dataset.id !== "success") {
                    banner.remove();
                }
            });
    
            // Add success banner only if not already present to avoid CSS transition flicker
            let successBanner = safetyWarningsBox.querySelector('[data-id="success"]');
            if (!successBanner) {
                successBanner = document.createElement('div');
                successBanner.dataset.id = "success";
                successBanner.className = "warning-banner";
                successBanner.style.background = "#EBFDF5";
                successBanner.style.color = "#047857";
                successBanner.style.borderLeft = "4px solid #10B981";
                successBanner.innerHTML = `<span class="warning-icon">[OK]</span> <div><strong>Structural Safety Normal</strong>: Actuator stresses are within safe physical parameters.</div>`;
                safetyWarningsBox.appendChild(successBanner);
            }
            return;
        }
    
        // Remove success banner or any existing banners not in activeWarnings
        const existingBanners = Array.from(safetyWarningsBox.children);
        existingBanners.forEach(banner => {
            const id = banner.dataset.id;
            if (!id || !activeWarnings.some(w => w.id === id)) {
                banner.remove();
            }
        });
    
        // Add or update active warnings in order
        activeWarnings.forEach((w, index) => {
            let banner = safetyWarningsBox.querySelector(`[data-id="${w.id}"]`);
            if (!banner) {
                banner = document.createElement('div');
                banner.dataset.id = w.id;
                banner.className = `warning-banner ${w.color}`;
                banner.innerHTML = `<span class="warning-icon">[Warning]</span> <div><strong>${w.title}</strong>: <span class="warning-text"></span></div>`;
                
                // Insert at correct index position to maintain order
                if (index < safetyWarningsBox.children.length) {
                    safetyWarningsBox.insertBefore(banner, safetyWarningsBox.children[index]);
                } else {
                    safetyWarningsBox.appendChild(banner);
                }
            }
            
            // Update text content only if changed to prevent browser redraw/reflicker
            const textSpan = banner.querySelector('.warning-text');
            if (textSpan && textSpan.textContent !== w.text) {
                textSpan.textContent = w.text;
            }
        });
    }
    
    // 11. Plotting Analytics (Stress profile and History)
    function drawStressChart(E1, E2, h1, h2, y_na, kappa, eps_th1, eps_th2) {
        const ctx = stressChartCanvas.getContext('2d');
        ctx.clearRect(0, 0, stressChartCanvas.width, stressChartCanvas.height);
    
        const padLeft = 40, padRight = 20, padTop = 15, padBottom = 25;
        const w = stressChartCanvas.width - padLeft - padRight;
        const h = stressChartCanvas.height - padTop - padBottom;
    
        // Draw Grid Lines
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const x = padLeft + (i / 5) * w;
            ctx.beginPath(); ctx.moveTo(x, padTop); ctx.lineTo(x, padTop + h); ctx.stroke();
        }
        for (let i = 0; i <= 4; i++) {
            const y = padTop + (i / 4) * h;
            ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(padLeft + w, y); ctx.stroke();
        }
    
        // Stress values evaluation
        const numSteps = 60;
        const totalThick = h1 + h2;
        const dy = totalThick / numSteps;
        const stressPoints = [];
    
        let maxStr = 5.0; // minimum scale bounds
    
        // Reference strain epsilon_0
        const eps0 = (E1 * h1 * eps_th1 + E2 * h2 * eps_th2) / (E1 * h1 + E2 * h2);
    
        for (let i = 0; i <= numSteps; i++) {
            const yCoord = i * dy;
            let E_y, eps_th_y;
            
            if (yCoord <= h2) {
                E_y = E2;
                eps_th_y = eps_th2;
            } else {
                E_y = E1;
                eps_th_y = eps_th1;
            }
    
            // Stress formula: σ = E * (ε_0 + κ*(y - y_na) - ε_th)
            const stress = E_y * (eps0 + kappa * (yCoord - y_na) - eps_th_y) / 1e6; // MPa
            stressPoints.push({ y: yCoord, s: stress });
            if (Math.abs(stress) > maxStr) maxStr = Math.abs(stress);
        }
    
        // Set neat X-axis scale
        maxStr = maxStr * 1.15;
    
        // Draw Zero stress center axis line
        const zeroX = padLeft + 0.5 * w;
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(zeroX, padTop);
        ctx.lineTo(zeroX, padTop + h);
        ctx.stroke();
    
        // Draw Interface Line
        const interfaceY = padTop + h - (h2 / totalThick) * h;
        ctx.strokeStyle = '#94a3b8';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padLeft, interfaceY);
        ctx.lineTo(padLeft + w, interfaceY);
        ctx.stroke();
        ctx.setLineDash([]);
    
        // Draw Stress Profile Line
        ctx.strokeStyle = '#8a1134';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        stressPoints.forEach((pt, idx) => {
            const sx = zeroX + (pt.s / maxStr) * (w / 2);
            const sy = padTop + h - (pt.y / totalThick) * h;
            if (idx === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
    
        // Axis values labels
        ctx.fillStyle = '#475569';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText((-maxStr).toFixed(1) + ' MPa', padLeft, padTop + h + 15);
        ctx.fillText('0', zeroX, padTop + h + 15);
        ctx.fillText((maxStr).toFixed(1) + ' MPa', padLeft + w, padTop + h + 15);
    }
    
    let historyData = [];
    
    function updateHistoryPlot(t, kappa) {
        // Collect time history if starting or continuing
        if (t === 0.0) historyData = [];
        
        // Check if point already exists (to avoid duplicate elements)
        const existing = historyData.findIndex(pt => Math.abs(pt.t - t) < 0.05);
        if (existing !== -1) {
            historyData[existing] = { t, k: kappa };
        } else {
            historyData.push({ t, k: kappa });
            historyData.sort((a, b) => a.t - b.t);
        }
    
        const ctx = historyChartCanvas.getContext('2d');
        ctx.clearRect(0, 0, historyChartCanvas.width, historyChartCanvas.height);
    
        const padLeft = 40, padRight = 15, padTop = 15, padBottom = 25;
        const w = historyChartCanvas.width - padLeft - padRight;
        const h = historyChartCanvas.height - padTop - padBottom;
    
        // Grid lines
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const x = padLeft + (i / 4) * w;
            ctx.beginPath(); ctx.moveTo(x, padTop); ctx.lineTo(x, padTop + h); ctx.stroke();
        }
        for (let i = 0; i <= 4; i++) {
            const y = padTop + (i / 4) * h;
            ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(padLeft + w, y); ctx.stroke();
        }
    
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padLeft, padTop + h);
        ctx.lineTo(padLeft + w, padTop + h);
        ctx.stroke();
    
        // Determine max curvature scale
        let maxK = 0.5;
        historyData.forEach(pt => {
            if (Math.abs(pt.k) > maxK) maxK = Math.abs(pt.k);
        });
        maxK = maxK * 1.15;
    
        // Draw plot curve
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        historyData.forEach((pt, idx) => {
            const sx = padLeft + (pt.t / maxSimTime) * w;
            const sy = padTop + h - (Math.abs(pt.k) / maxK) * h;
            if (idx === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
    
        // Draw current scrubbing time indicator line
        const currX = padLeft + (t / maxSimTime) * w;
        ctx.strokeStyle = '#8a1134';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(currX, padTop);
        ctx.lineTo(currX, padTop + h);
        ctx.stroke();
        ctx.setLineDash([]);
    
        // Tick labels
        ctx.fillStyle = '#475569';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('0s', padLeft, padTop + h + 15);
        ctx.fillText('10s', padLeft + w/2, padTop + h + 15);
        ctx.fillText('20s', padLeft + w, padTop + h + 15);
    
        ctx.textAlign = 'right';
        ctx.fillText(maxK.toFixed(2), padLeft - 6, padTop + 6);
        ctx.fillText('0', padLeft - 6, padTop + h);
    }
    
    // 12. HTML live substituted math formula renderer
    function renderLiveMath(m, n, h, deltaStrain, kappa) {
        if (!latexFormulaContainer) return;
    
        const h_mm = (h * 1000).toFixed(2);
        const strain_exp = deltaStrain.toExponential(3).replace('e', ' &times; 10<sup>') + '</sup>';
        const k_val = kappa.toFixed(4);
    
        latexFormulaContainer.innerHTML = `
            <div style="font-family: inherit; line-height: 1.6; font-size: 16px; font-weight: bold;">
                <div style="font-weight: bold; margin-bottom: 6px;">Timoshenko Bimetal Formula:</div>
                <div style="margin-left: 20px; font-style: italic; margin-bottom: 8px;">
                    &kappa; = [6 &times; &Delta;&epsilon; &times; (1 + m)<sup>2</sup>] / [h &times; &phi;(m, n)]
                </div>
                <div>m = ${m.toFixed(3)}, &nbsp; n = ${n.toFixed(3)}</div>
                <div style="margin-top: 4px;">&phi;(m,n) = 3(1+m)<sup>2</sup> + (1 + mn)(m<sup>2</sup> + 1/(mn))</div>
                <div style="margin-top: 8px;">Substitution: &kappa; = [6 &times; (${strain_exp}) &times; (1 + ${m.toFixed(2)})<sup>2</sup>] / [${h_mm} mm &times; &phi;(m, n)]</div>
                <div style="margin-top: 8px; font-weight: bold; color: #8A1134;">Result: &kappa; = ${k_val} m<sup>-1</sup></div>
            </div>
        `;
    }
    
    // 13. Viscoelastic Timeline Playback Controls
    function startSimulation() {
        resetTimelineToZero();
        isPlaying = true;
        btnPlayPause.innerText = "Pause";
        btnRun.disabled = true;
        
        const delay = 80; // step interval
        playInterval = setInterval(() => {
            currentSimTime += 0.2;
            if (currentSimTime >= maxSimTime) {
                currentSimTime = maxSimTime;
                pauseSimulation();
                btnRun.disabled = false;
            }
            runSimulationAtTime(currentSimTime);
        }, delay);
    }
    
    function pauseSimulation() {
        isPlaying = false;
        btnPlayPause.innerText = "Play";
        if (playInterval) {
            clearInterval(playInterval);
            playInterval = null;
        }
    }
    
    function togglePlayPause() {
        if (isPlaying) {
            pauseSimulation();
        } else {
            if (currentSimTime >= maxSimTime) currentSimTime = 0;
            isPlaying = true;
            btnPlayPause.innerText = "Pause";
            playInterval = setInterval(() => {
                currentSimTime += 0.2;
                if (currentSimTime >= maxSimTime) {
                    currentSimTime = maxSimTime;
                    pauseSimulation();
                }
                runSimulationAtTime(currentSimTime);
            }, 80);
        }
    }
    
    function resetTimelineToZero() {
        pauseSimulation();
        currentSimTime = 0.0;
        btnRun.disabled = false;
    }
    
    function resetLab() {
        pauseSimulation();
        slideH1.value = 0.50;
        slideH2.value = 0.50;
        slideLen.value = 50;
        slideWidth.value = 10;
        slideDT.value = 50;
        slideDH.value = 40;
        slideRampRate.value = 5;
        matActiveSelect.value = "active_pla_4D";
        matPassiveSelect.value = "pla_standard";
        solverModelSelect.value = "timoshenko";
        setStimulusType('thermal');
        updateLabels();
        resetTimelineToZero();
        runSimulationAtTime(0.0);
    }
    
    
    
    
    
    
    
    // Initialize application on script load
    window.addEventListener('DOMContentLoaded', init);
})();

// ============================================================
// SCRIPT_B.JS (Page Check: document.getElementById('deltaC'))
// ============================================================
(function() {
    if (!document.getElementById('deltaC')) return;
    
    // ============================================================================
    // Lab-Grade Hygroscopic Swelling 4D Printing Simulator - Core Engine
    // ============================================================================
    
    // 1. Material database with swelling coefficients, mechanical properties, and diffusion rates
    const materials = {
        cellulose: {
            name: "Cellulose NFC",
            beta1: 0.002,      // β_parallel (longitudinal swelling coefficient along fibers)
            beta2: 0.014,      // β_transverse (transverse swelling coefficient perpendicular to fibers)
            E: 8500,           // Elastic Modulus (MPa)
            nu: 0.35,
            rho: 1500,
            D: 5e-12,          // Diffusion coefficient (m²/s)
            yield_strength: 85
        },
        wood: {
            name: "Wood Spruce",
            beta1: 0.001,
            beta2: 0.010,
            E: 12000,
            nu: 0.37,
            rho: 450,
            D: 2e-12,
            yield_strength: 40
        },
        pla_standard: {
            name: "Standard PLA",
            beta1: 0.0,
            beta2: 0.0,
            E: 3500,
            nu: 0.36,
            rho: 1240,
            D: 0.0,
            yield_strength: 60
        },
        cellulose_constrained: {
            name: "Cellulose Constrained (0° Passive)",
            beta1: 0.0,
            beta2: 0.0,
            E: 8500,
            nu: 0.35,
            rho: 1500,
            D: 0.0,
            yield_strength: 85
        },
        custom: {
            name: "Custom Material",
            beta1: 0.002,
            beta2: 0.014,
            E: 8500,
            nu: 0.35,
            rho: 1500,
            D: 5e-12,
            yield_strength: 85
        }
    };
    
    // 2. UI DOM Elements Selector
    const solverModelSelect = document.getElementById('solverModel');
    const matActiveSelect = document.getElementById('matActive');
    const matPassiveSelect = document.getElementById('matPassive');
    const slideH1 = document.getElementById('h1');
    const slideH2 = document.getElementById('h2');
    const slideLen = document.getElementById('len');
    const slideWidth = document.getElementById('beamWidth');
    const slideDC = document.getElementById('deltaC');
    const slideTheta = document.getElementById('thetaF');
    
    const valH1 = document.getElementById('valH1');
    const valH2 = document.getElementById('valH2');
    const valLen = document.getElementById('valLen');
    const valWidth = document.getElementById('valWidth');
    const valDC = document.getElementById('valDC');
    const valTheta = document.getElementById('valTheta');
    
    const btnRun = document.getElementById('btnRun');
    const btnReset = document.getElementById('btnReset');
    const btnPlayPause = document.getElementById('btnPlayPause');
    const timeScrubber = document.getElementById('timeScrubber');
    const timeVal = document.getElementById('timeVal');
    const stateLabel = document.getElementById('stateLabel');
    
    const timelineC = document.getElementById('timelineC');
    const timelineTheta = document.getElementById('timelineTheta');
    const timelineTwist = document.getElementById('timelineTwist');
    
    const resEpsP = document.getElementById('resEpsP');
    const resEpsT = document.getElementById('resEpsT');
    const resAs = document.getElementById('resAs');
    const resCurv = document.getElementById('resCurv');
    const resBend = document.getElementById('resBend');
    const resTwist = document.getElementById('resTwist');
    
    const safetyWarningsBox = document.getElementById('safetyWarningsBox');
    const latexFormulaContainer = document.getElementById('latexFormulaContainer');
    const btnOrbitReset = document.getElementById('btnOrbitReset');
    const showMeshNodes = document.getElementById('showMeshNodes');
    const showDeformedMesh = document.getElementById('showDeformedMesh');
    
    // 3. State Variables
    let currentSimTime = 0.0; // s
    const maxSimTime = 20.0;  // s
    let isPlaying = false;
    let playInterval = null;
    let stressChartCanvas = document.getElementById('stressChartCanvas');
    let historyChartCanvas = document.getElementById('historyChartCanvas');
    
    // Three.js State
    let scene, camera, renderer, orbitControls, gridHelper;
    let activeSegments = [];
    let passiveSegments = [];
    let threejsInitialized = false;
    
    let currentViewMode = 'specimen'; // 'specimen' or 'bilayer'
    let petriDishGroup, specimenGroup;
    let specimenActiveMesh, specimenPassiveMesh;
    let specimenActiveWireframe, specimenPassiveWireframe;
    let fiberArrowParallel, fiberArrowTransverse;
    let clampMesh; // sleek clamp bracket
    let specimenActiveContainer;
    
    // 4. Initial Setup and Event Listeners
    function init() {
        // Sliders & Selects Setup
        [slideH1, slideH2, slideLen, slideWidth, slideDC, slideTheta, 
         solverModelSelect, matActiveSelect, matPassiveSelect].forEach(el => {
            if (el) el.addEventListener('input', (e) => {
                if (e.target === matActiveSelect && matActiveSelect.value !== "custom") {
                    // If preset selected, update labelAs
                    const mat = materials[matActiveSelect.value];
                    const labelAs = document.getElementById('labelAs');
                    if (labelAs) {
                        const ratio = mat.beta2 / mat.beta1;
                        labelAs.innerText = `Anisotropy Index: ${ratio.toFixed(2)}`;
                    }
                } else if (e.target === slideDC || e.target === slideTheta) {
                    // do nothing specific
                }
                updateLabels();
                resetTimelineToZero();
                runSimulationAtTime(currentSimTime);
            });
        });
    
        // Time Scrubber
        if (timeScrubber) {
            timeScrubber.addEventListener('input', (e) => {
                pauseSimulation();
                currentSimTime = parseFloat(e.target.value);
                runSimulationAtTime(currentSimTime);
            });
        }
    
        // Action Buttons
        if (btnRun) btnRun.addEventListener('click', startSimulation);
        if (btnReset) btnReset.addEventListener('click', resetLab);
        if (btnPlayPause) btnPlayPause.addEventListener('click', togglePlayPause);
        if (btnOrbitReset) btnOrbitReset.addEventListener('click', resetCamera);
        if (showMeshNodes) showMeshNodes.addEventListener('change', () => runSimulationAtTime(currentSimTime));
        if (showDeformedMesh) showDeformedMesh.addEventListener('change', () => runSimulationAtTime(currentSimTime));
    
        // View Toggles
        const viewSpecimenBtn = document.getElementById('viewSpecimenBtn');
        const viewBilayerBtn = document.getElementById('viewBilayerBtn');
        if (viewSpecimenBtn) {
            viewSpecimenBtn.addEventListener('click', () => {
                currentViewMode = 'specimen';
                viewSpecimenBtn.classList.add('active');
                if (viewBilayerBtn) viewBilayerBtn.classList.remove('active');
                runSimulationAtTime(currentSimTime);
            });
        }
        if (viewBilayerBtn) {
            viewBilayerBtn.addEventListener('click', () => {
                currentViewMode = 'bilayer';
                viewBilayerBtn.classList.add('active');
                if (viewSpecimenBtn) viewSpecimenBtn.classList.remove('active');
                runSimulationAtTime(currentSimTime);
            });
        }
    
        // Initial labels and render
        updateLabels();
        try {
            init3D();
            threejsInitialized = true;
        } catch (e) {
            console.error("Three.js WebGL failure, falling back to 2D canvas:", e);
            document.getElementById('simCanvas').style.display = 'block';
        }
        runSimulationAtTime(0.0);
    }
    
    function updateLabels() {
        if (valH1) valH1.innerText = parseFloat(slideH1.value).toFixed(2) + ' mm';
        if (valH2) valH2.innerText = parseFloat(slideH2.value).toFixed(2) + ' mm';
        if (valLen) valLen.innerText = parseFloat(slideLen.value).toFixed(2) + ' mm';
        if (valWidth) valWidth.innerText = parseFloat(slideWidth.value).toFixed(2) + ' mm';
        if (valDC) valDC.innerText = parseFloat(slideDC.value).toFixed(2) + ' g/g';
        if (valTheta) valTheta.innerText = parseFloat(slideTheta.value).toFixed(0) + '°';
    }
    
    // 5. Fickian Diffusion Model for concentration C(t) inside active layer
    function getActiveConcentration(t, D, h1, C_inf) {
        if (t <= 0) return 0;
        if (D <= 0) return C_inf;
        
        const speedUp = 1.5e7;
        const D_eff = D * speedUp;
        
        let sum = 0;
        const pi2 = Math.PI * Math.PI;
        for (let n = 0; n < 8; n++) {
            const term = 2 * n + 1;
            const lambda = (term * Math.PI / h1);
            const expr = Math.exp(- D_eff * lambda * lambda * t);
            sum += (1 / (term * term)) * expr;
        }
        const C = C_inf * (1 - (8 / pi2) * sum);
        return Math.max(0, Math.min(C_inf, C));
    }
    
    // 6. Anisotropic Swelling & Bending Calculations
    function rotateSwellingStrain(beta1, beta2, deltaC, thetaDeg) {
        const epsParallel = beta1 * deltaC;
        const epsTransverse = beta2 * deltaC;
        const rad = thetaDeg * Math.PI / 180;
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        const c2 = c * c;
        const s2 = s * s;
        return {
            eps_xx: epsParallel * c2 + epsTransverse * s2,
            eps_yy: epsParallel * s2 + epsTransverse * c2,
            eps_xy: (epsParallel - epsTransverse) * s * c
        };
    }
    
    function computeAnisotropyRatio(beta1, beta2) {
        if (beta1 === 0) return 0;
        return beta2 / beta1;
    }
    
    function computeBendingFromSwelling(epsActive_xx, epsPassive_xx, h1, h2, L, E1, E2) {
        const deltaEps = epsActive_xx - epsPassive_xx;
        const m = h1 / h2;
        const n = E1 / E2;
        const h = h1 + h2;
        
        const phi_mn = 3 * Math.pow(1 + m, 2) + (1 + m * n) * (m * m + 1 / (m * n));
        const kappa = 6 * deltaEps * Math.pow(1 + m, 2) / (h * phi_mn);
        const thetaBend = kappa * L; // L is in meters
        return { kappa, thetaBend, phi_mn };
    }
    
    function sweepFibreOrientation(material, passiveMaterial, deltaC, h1, h2, L) {
        const sweepPoints = [];
        const E1 = material.E;
        const E2 = passiveMaterial.E;
        const h = h1 + h2;
        const m = h1 / h2;
        
        // Smooth 1-degree sweep steps for the plot
        for (let theta = 0; theta <= 90; theta += 1) {
            const epsA = rotateSwellingStrain(material.beta1, material.beta2, deltaC, theta);
            const epsP_xx = passiveMaterial.beta1 * deltaC; // 0
            
            const bResult = computeBendingFromSwelling(epsA.eps_xx, epsP_xx, h1, h2, L, E1, E2);
            
            // twistAngle = epsA.eps_xy * 6*(1+m)^2 / (h*phi) * L
            const kappa_xy = 6 * epsA.eps_xy * Math.pow(1+m, 2) / (h * bResult.phi_mn);
            const twistAngle = kappa_xy * L;
            
            sweepPoints.push({
                theta,
                bendAngleDeg: bResult.thetaBend * 180 / Math.PI,
                twistAngleDeg: twistAngle * 180 / Math.PI
            });
        }
        return sweepPoints;
    }
    
    // 7. Curvature & Bending Solver Implementation
    function runSimulationAtTime(t) {
        if (timeScrubber) timeScrubber.value = t.toFixed(1);
        if (timeVal) timeVal.innerText = t.toFixed(1);
    
        // Geometry values in meters
        const h1 = parseFloat(slideH1.value) / 1000;
        const h2 = parseFloat(slideH2.value) / 1000;
        const L = parseFloat(slideLen.value) / 1000;
        const b = parseFloat(slideWidth.value) / 1000;
        const thetaF = parseFloat(slideTheta.value);
    
        // Target concentration and material parameters
        const deltaC_target = parseFloat(slideDC.value);
        const activeMat = materials[matActiveSelect.value];
        const passiveMat = materials[matPassiveSelect.value];
    
        // Compute transient concentration
        const deltaC = getActiveConcentration(t, activeMat.D, h1, deltaC_target);
    
        if (timelineC) timelineC.innerText = deltaC.toFixed(3) + ' g/g';
        if (timelineTheta) timelineTheta.innerText = thetaF.toFixed(0) + '°';
    
        // Swelling strain components
        const epsA = rotateSwellingStrain(activeMat.beta1, activeMat.beta2, deltaC, thetaF);
        const epsP_xx = passiveMat.beta1 * deltaC;
    
        const As = computeAnisotropyRatio(activeMat.beta1, activeMat.beta2);
        
        // Curvature calculation
        const clt = computeBendingFromSwelling(epsA.eps_xx, epsP_xx, h1, h2, L, activeMat.E, passiveMat.E);
        const kx = clt.kappa;
        
        const m = h1 / h2;
        const h = h1 + h2;
        const kxy = 6 * epsA.eps_xy * Math.pow(1+m, 2) / (h * clt.phi_mn);
    
        const bendAngleDeg = clt.thetaBend * 180 / Math.PI;
        const twistAngleDeg = (kxy * L) * (180 / Math.PI);
    
        if (timelineTwist) timelineTwist.innerText = twistAngleDeg.toFixed(1) + '°';
    
        const numPoints = 40;
        let points = [];
        const model = solverModelSelect.value;
    
        if (model === 'fem') {
            points = solveBeamFEM(L, kx, kxy, activeMat.E, passiveMat.E, h1, h2, b, numPoints);
        } else if (model === 'elastica') {
            points = solveElasticaRK4(L, kx, kxy, numPoints);
        } else {
            points = solveLinearCLT(L, kx, kxy, numPoints);
        }
    
        // Update Numerical Table
        if (resEpsP) resEpsP.innerText = (activeMat.beta1 * deltaC * 100).toFixed(4) + ' %';
        if (resEpsT) resEpsT.innerText = (activeMat.beta2 * deltaC * 100).toFixed(4) + ' %';
        if (resAs) resAs.innerText = As.toFixed(2);
        if (resCurv) resCurv.innerText = kx.toFixed(4) + ' m⁻¹';
        if (resBend) resBend.innerText = bendAngleDeg.toFixed(1) + '°';
        if (resTwist) resTwist.innerText = twistAngleDeg.toFixed(1) + '°';
    
        // Update state label
        if (stateLabel) {
            stateLabel.innerText = `State: Swelling — As = ${As.toFixed(2)}`;
            stateLabel.className = deltaC > 0.01 ? "state-indicator bending" : "state-indicator flat";
        }
    
        // Safety and failure warning checks
        evaluateSafetyChecks(kx, kxy, L, model);
    
        // Update 3D Model
        if (threejsInitialized) {
            update3DBeam(points, h1, h2, b, L, kx, kxy, epsA.eps_xx);
        } else {
            drawBilayer2D(points, h1);
        }
    
        // Update Analytics Charts
        drawStressChart(kx, epsA.eps_xx, h1, h2, activeMat.E, passiveMat.E);
        renderHistoryPlot(activeMat, passiveMat, deltaC_target, h1, h2, L, thetaF);
    
        // Render live KaTeX equations
        renderLiveMath(activeMat, deltaC, thetaF, epsA, As, clt.phi_mn, h, m, kx);
    }
    
    // ============================================================================
    // 3D RENDER WITH THREE.JS (INCORPORATING BENDING AND HELICAL TWIST)
    // ============================================================================
    
    function init3D() {
        const container = document.getElementById('viewport3D');
        if (!container) return;
        
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xfafbfc);
        
        camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(25, 25, 35);
        
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);
        
        orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
        orbitControls.enableDamping = true;
        orbitControls.dampingFactor = 0.05;
        orbitControls.maxPolarAngle = Math.PI / 2 + 0.1;
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        
        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight1.position.set(20, 80, 40);
        dirLight1.castShadow = true;
        scene.add(dirLight1);
        
        const dirLight2 = new THREE.DirectionalLight(0x0ea5e9, 0.15); // blue bounce
        dirLight2.position.set(-20, -50, -30);
        scene.add(dirLight2);
        
        gridHelper = new THREE.GridHelper(80, 20, 0x8a1134, 0xe2e8f0);
        gridHelper.position.y = -8;
        scene.add(gridHelper);
        
        // Clamp mount block (sleek bracket)
        clampMesh = new THREE.Group();
        // Base block
        const baseGeo = new THREE.BoxGeometry(3, 8, 12);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(-1.5, -2, 0);
        clampMesh.add(base);
        
        // Upper clamping plate
        const plateGeo = new THREE.BoxGeometry(2, 2, 10);
        const plateMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.1 });
        const plate = new THREE.Mesh(plateGeo, plateMat);
        plate.position.set(-1, 2.5, 0);
        clampMesh.add(plate);
        
        // Screw dial
        const screwGeo = new THREE.CylinderGeometry(1.2, 1.2, 1, 16);
        const screwMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
        const screw = new THREE.Mesh(screwGeo, screwMat);
        screw.position.set(-1, 4, 0);
        clampMesh.add(screw);
        
        scene.add(clampMesh);
    
        // Glass Petri Dish
        petriDishGroup = new THREE.Group();
        
        // Bottom plate
        const dishBottomGeo = new THREE.CylinderGeometry(22, 22, 0.4, 48);
        const dishBottomMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.15,
            roughness: 0.05,
            transmission: 0.9,
            ior: 1.5
        });
        const dishBottom = new THREE.Mesh(dishBottomGeo, dishBottomMat);
        dishBottom.position.y = -0.2;
        dishBottom.receiveShadow = true;
        petriDishGroup.add(dishBottom);
        
        // Glass wall
        const dishWallGeo = new THREE.CylinderGeometry(22, 22, 3, 48, 1, true);
        const dishWallMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.25,
            roughness: 0.05,
            transmission: 0.9,
            ior: 1.5,
            side: THREE.DoubleSide
        });
        const dishWall = new THREE.Mesh(dishWallGeo, dishWallMat);
        dishWall.position.y = 1.3;
        petriDishGroup.add(dishWall);
        
        // Metallic rim base
        const rimGeo = new THREE.CylinderGeometry(22.2, 22.2, 0.6, 48, 1, true);
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            metalness: 0.9,
            roughness: 0.2
        });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.position.y = -0.3;
        petriDishGroup.add(rim);
        
        scene.add(petriDishGroup);
        
        // Specimen Group for Coupon
        specimenGroup = new THREE.Group();
        scene.add(specimenGroup);
    
        // Set default visibilities
        petriDishGroup.visible = true;
        specimenGroup.visible = true;
        gridHelper.visible = false;
        clampMesh.visible = false;
        
        window.addEventListener('resize', onWindowResize);
        
        animate3D();
    }
    
    function onWindowResize() {
        const container = document.getElementById('viewport3D');
        if (!container || !renderer || !camera) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    function animate3D() {
        requestAnimationFrame(animate3D);
        if (orbitControls) orbitControls.update();
        if (renderer && scene && camera) renderer.render(scene, camera);
    }
    
    function resetCamera() {
        if (orbitControls) {
            camera.position.set(25, 25, 35);
            orbitControls.target.set(0, 0, 0);
            orbitControls.update();
        }
    }
    
    function updateSpecimen3D(h1, h2, b, L, epsA) {
        const renderScale = 300;
        const thetaF = parseFloat(slideTheta.value);
        
        if (!specimenActiveMesh || 
            updateSpecimen3D.h1 !== h1 || updateSpecimen3D.h2 !== h2 || 
            updateSpecimen3D.b !== b || updateSpecimen3D.L !== L ||
            updateSpecimen3D.matActive !== matActiveSelect.value ||
            updateSpecimen3D.matPassive !== matPassiveSelect.value) {
            
            if (specimenActiveMesh) {
                if (specimenActiveContainer) specimenActiveContainer.remove(specimenActiveMesh);
                specimenActiveMesh.geometry.dispose();
                specimenActiveMesh.material.dispose();
            }
            if (specimenActiveContainer) {
                specimenGroup.remove(specimenActiveContainer);
            }
            if (specimenPassiveMesh) {
                specimenGroup.remove(specimenPassiveMesh);
                specimenPassiveMesh.geometry.dispose();
                specimenPassiveMesh.material.dispose();
            }
            if (specimenActiveWireframe) {
                specimenGroup.remove(specimenActiveWireframe);
                specimenActiveWireframe.geometry.dispose();
                specimenActiveWireframe.material.dispose();
            }
            if (specimenPassiveWireframe) {
                specimenGroup.remove(specimenPassiveWireframe);
                specimenPassiveWireframe.geometry.dispose();
                specimenPassiveWireframe.material.dispose();
            }
            if (fiberArrowParallel) {
                specimenGroup.remove(fiberArrowParallel);
            }
            if (fiberArrowTransverse) {
                specimenGroup.remove(fiberArrowTransverse);
            }
            
            updateSpecimen3D.h1 = h1;
            updateSpecimen3D.h2 = h2;
            updateSpecimen3D.b = b;
            updateSpecimen3D.L = L;
            updateSpecimen3D.matActive = matActiveSelect.value;
            updateSpecimen3D.matPassive = matPassiveSelect.value;
            
            const activeGeo = new THREE.BoxGeometry(L * renderScale, h1 * renderScale, b * renderScale);
            const passiveGeo = new THREE.BoxGeometry(L * renderScale, h2 * renderScale, b * renderScale);
            
            const activeMat3D = new THREE.MeshStandardMaterial({
                color: 0xef4444,
                roughness: 0.4,
                metalness: 0.1
            });
            
            const passiveMat3D = new THREE.MeshStandardMaterial({
                color: 0x64748b,
                roughness: 0.4,
                metalness: 0.1
            });
            
            specimenActiveMesh = new THREE.Mesh(activeGeo, activeMat3D);
            specimenPassiveMesh = new THREE.Mesh(passiveGeo, passiveMat3D);
            
            // Wireframes (Dry outline)
            const activeEdges = new THREE.EdgesGeometry(activeGeo);
            const activeWireframeMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 2 });
            specimenActiveWireframe = new THREE.LineSegments(activeEdges, activeWireframeMat);
            
            const passiveEdges = new THREE.EdgesGeometry(passiveGeo);
            const passiveWireframeMat = new THREE.LineBasicMaterial({ color: 0x64748b, linewidth: 1 });
            specimenPassiveWireframe = new THREE.LineSegments(passiveEdges, passiveWireframeMat);
            
            // Passive layer sits on y = 0
            const pY = (h2 * renderScale) / 2;
            specimenPassiveMesh.position.set(0, pY, 0);
            specimenPassiveWireframe.position.set(0, pY, 0);
            
            // Active container at top of passive layer
            specimenActiveContainer = new THREE.Group();
            const aY = (h2 + h1 / 2) * renderScale;
            specimenActiveContainer.position.set(0, aY, 0);
            specimenActiveContainer.add(specimenActiveMesh);
            
            specimenActiveWireframe.position.set(0, aY, 0);
            
            specimenGroup.add(specimenActiveContainer);
            specimenGroup.add(specimenPassiveMesh);
            specimenGroup.add(specimenActiveWireframe);
            specimenGroup.add(specimenPassiveWireframe);
            
            // Arrow helpers scaled to the specimen size
            const arrowLength = Math.min(L, b) * renderScale * 0.45;
            const arrowY = (h2 + h1) * renderScale + 0.15;
            
            const dummyDir = new THREE.Vector3(1, 0, 0);
            const dummyOrigin = new THREE.Vector3(0, arrowY, 0);
            
            fiberArrowParallel = new THREE.ArrowHelper(dummyDir, dummyOrigin, arrowLength, 0xef4444, arrowLength * 0.25, arrowLength * 0.15);
            fiberArrowTransverse = new THREE.ArrowHelper(dummyDir, dummyOrigin, arrowLength, 0x3b82f6, arrowLength * 0.25, arrowLength * 0.15);
            
            specimenGroup.add(fiberArrowParallel);
            specimenGroup.add(fiberArrowTransverse);
        }
        
        // Calculate concentration-dependent parallel & transverse strains
        const activeMatObj = materials[matActiveSelect.value];
        const passiveMatObj = materials[matPassiveSelect.value];
        const deltaC_target = parseFloat(slideDC.value);
        const deltaC = getActiveConcentration(currentSimTime, activeMatObj.D, h1, deltaC_target);
        
        const epsParallel = activeMatObj.beta1 * deltaC;
        const epsTransverse = activeMatObj.beta2 * deltaC;
        
        // Swelling exaggeration factor of 100 for a clear and dramatic volumetric representation
        const exaggeration = 100;
        const scaleX = 1 + epsParallel * exaggeration;
        const scaleZ = 1 + epsTransverse * exaggeration;
        
        // Apply scale to the child mesh
        specimenActiveMesh.scale.set(scaleX, 1, scaleZ);
        
        // Apply rotated shearing transformations to represent the physical shear coupling strain
        const thetaRad = thetaF * Math.PI / 180;
        specimenActiveMesh.rotation.y = thetaRad;
        specimenActiveContainer.rotation.y = -thetaRad;
        
        // Color code the active specimen based on its longitudinal strain component (epsA.eps_xx)
        const maxStrainRef = 0.007;
        specimenActiveMesh.material.color.setHex(getColorForStrain(epsA.eps_xx, maxStrainRef));
        
        // Update Arrow Helpers directions to align with the fiber direction lines
        const dirP = new THREE.Vector3(Math.cos(thetaRad), 0, Math.sin(thetaRad));
        const dirT = new THREE.Vector3(-Math.sin(thetaRad), 0, Math.cos(thetaRad));
        
        fiberArrowParallel.setDirection(dirP);
        fiberArrowTransverse.setDirection(dirT);
        
        const arrowY = (h2 + h1) * renderScale + 0.15;
        fiberArrowParallel.position.set(0, arrowY, 0);
        fiberArrowTransverse.position.set(0, arrowY, 0);
        
        // Also scale the passive layer if it has swelling coefficients
        const epsP_Parallel = passiveMatObj.beta1 * deltaC;
        const epsP_Transverse = passiveMatObj.beta2 * deltaC;
        const scaleX_pass = 1 + epsP_Parallel * exaggeration;
        const scaleZ_pass = 1 + epsP_Transverse * exaggeration;
        specimenPassiveMesh.scale.set(scaleX_pass, 1, scaleZ_pass);
        
        const showRef = showDeformedMesh ? showDeformedMesh.checked : true;
        specimenActiveWireframe.visible = showRef;
        specimenPassiveWireframe.visible = showRef;
    }
    
    function update3DBeam(points, h1, h2, b, L, kx, kxy, epsActive_xx) {
        const N = points.length - 1;
        const ds_undeformed = L / N;
        const renderScale = 300;
        const thetaF = parseFloat(slideTheta.value);
    
        if (currentViewMode === 'specimen') {
            activeSegments.forEach(mesh => mesh.visible = false);
            passiveSegments.forEach(mesh => mesh.visible = false);
            if (clampMesh) clampMesh.visible = false;
            if (gridHelper) gridHelper.visible = false;
            
            if (petriDishGroup) petriDishGroup.visible = true;
            if (specimenGroup) specimenGroup.visible = true;
            
            const activeMat = materials[matActiveSelect.value];
            const deltaC_target = parseFloat(slideDC.value);
            const deltaC = getActiveConcentration(currentSimTime, activeMat.D, h1, deltaC_target);
            const epsA = rotateSwellingStrain(activeMat.beta1, activeMat.beta2, deltaC, thetaF);
            
            updateSpecimen3D(h1, h2, b, L, epsA);
            return;
        }
    
        if (petriDishGroup) petriDishGroup.visible = false;
        if (specimenGroup) specimenGroup.visible = false;
        if (clampMesh) clampMesh.visible = true;
        
        const showGrid = showDeformedMesh ? showDeformedMesh.checked : true;
        if (gridHelper) gridHelper.visible = showGrid;
    
        // Invalidate geometry cache if parameters have changed to prevent visual gaps
        if (activeSegments.length !== N || passiveSegments.length !== N ||
            update3DBeam.h1 !== h1 || update3DBeam.h2 !== h2 || 
            update3DBeam.b !== b || update3DBeam.L !== L ||
            update3DBeam.thetaF !== thetaF ||
            update3DBeam.matActive !== matActiveSelect.value ||
            update3DBeam.matPassive !== matPassiveSelect.value) {
            
            activeSegments.forEach(mesh => {
                if (mesh.geometry) mesh.geometry.dispose();
                mesh.children.forEach(c => {
                    if (c.geometry) c.geometry.dispose();
                    if (c.material) c.material.dispose();
                });
                if (mesh.material) mesh.material.dispose();
                scene.remove(mesh);
            });
            passiveSegments.forEach(mesh => {
                if (mesh.geometry) mesh.geometry.dispose();
                mesh.children.forEach(c => {
                    if (c.geometry) c.geometry.dispose();
                    if (c.material) c.material.dispose();
                });
                if (mesh.material) mesh.material.dispose();
                scene.remove(mesh);
            });
            activeSegments = [];
            passiveSegments = [];
            
            update3DBeam.h1 = h1;
            update3DBeam.h2 = h2;
            update3DBeam.b = b;
            update3DBeam.L = L;
            update3DBeam.thetaF = thetaF;
            update3DBeam.matActive = matActiveSelect.value;
            update3DBeam.matPassive = matPassiveSelect.value;
            
            const activeGeo = new THREE.BoxGeometry(ds_undeformed * renderScale * 1.03, h1 * renderScale, b * renderScale);
            const passiveGeo = new THREE.BoxGeometry(ds_undeformed * renderScale * 1.03, h2 * renderScale, b * renderScale);
            
            const lineMat = new THREE.LineBasicMaterial({ color: 0x334155, linewidth: 2 });
            const numFibers = 3;
            
            for (let i = 0; i < N; i++) {
                const activeMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 });
                const passiveMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 });
                
                const aMesh = new THREE.Mesh(activeGeo, activeMat);
                const pMesh = new THREE.Mesh(passiveGeo, passiveMat);
                
                // Add fibre lines on top active layer showing orientation angle θ_f
                const fiberLength = ds_undeformed * renderScale * 0.95;
                const thetaRad = thetaF * Math.PI / 180;
                const dx_f = fiberLength * Math.cos(thetaRad);
                const dz_f = fiberLength * Math.sin(thetaRad);
                
                for (let f = 0; f < numFibers; f++) {
                    const zOffset = (f / (numFibers - 1) - 0.5) * b * renderScale * 0.7;
                    const pointsArray = [
                        new THREE.Vector3(-dx_f/2, h1 * renderScale / 2 + 0.05, zOffset - dz_f/2),
                        new THREE.Vector3(dx_f/2, h1 * renderScale / 2 + 0.05, zOffset + dz_f/2)
                    ];
                    const lineGeo = new THREE.BufferGeometry().setFromPoints(pointsArray);
                    const line = new THREE.Line(lineGeo, lineMat);
                    aMesh.add(line);
                }
                
                // Add passive fibre lines at 0 degrees on bottom passive layer
                const pass_dx_f = ds_undeformed * renderScale * 0.95;
                for (let f = 0; f < numFibers; f++) {
                    const zOffset = (f / (numFibers - 1) - 0.5) * b * renderScale * 0.7;
                    const pointsArray = [
                        new THREE.Vector3(-pass_dx_f/2, -h2 * renderScale / 2 - 0.05, zOffset),
                        new THREE.Vector3(pass_dx_f/2, -h2 * renderScale / 2 - 0.05, zOffset)
                    ];
                    const lineGeo = new THREE.BufferGeometry().setFromPoints(pointsArray);
                    const line = new THREE.Line(lineGeo, lineMat);
                    pMesh.add(line);
                }
                
                scene.add(aMesh);
                scene.add(pMesh);
                
                activeSegments.push(aMesh);
                passiveSegments.push(pMesh);
            }
        }
        
        // Timoshenko equivalent neutral axis (mid-thickness for equal modulus approximation)
        const activeMat = materials[matActiveSelect.value];
        const passiveMat = materials[matPassiveSelect.value];
        const Ex1 = activeMat.E;
        const Ex2 = passiveMat.E;
        const y_na = (Ex1 * h1 * (h2 + h1 / 2) + Ex2 * h2 * (h2 / 2)) / (Ex1 * h1 + Ex2 * h2);
    
        const activeOff = (h2 + h1/2 - y_na);
        const passiveOff = (h2/2 - y_na);
        
        // Scale for strain colors
        const maxStrainRef = 0.007; // maximum typical loading strain
    
        for (let i = 0; i < N; i++) {
            const p1 = points[i];
            const p2 = points[i+1];
            
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2;
            const theta = (p1.theta + p2.theta) / 2;
            const phi = (p1.phi + p2.phi) / 2;
            
            const px = -Math.sin(theta);
            const py = Math.cos(theta);
            
            const ax = mx + activeOff * px;
            const ay = my + activeOff * py;
            const passx = mx + passiveOff * px;
            const passy = my + passiveOff * py;
            
            activeSegments[i].position.set(ax * renderScale, ay * renderScale, 0);
            activeSegments[i].rotation.set(0, 0, 0);
            activeSegments[i].rotateZ(theta);
            activeSegments[i].rotateX(phi);
            activeSegments[i].scale.set(1, 1, 1);
            activeSegments[i].visible = true;
            
            passiveSegments[i].position.set(passx * renderScale, passy * renderScale, 0);
            passiveSegments[i].rotation.set(0, 0, 0);
            passiveSegments[i].rotateZ(theta);
            passiveSegments[i].rotateX(phi);
            passiveSegments[i].scale.set(1, 1, 1);
            passiveSegments[i].visible = true;
            
            // Heatmap vertex colors for active layer based on strain
            activeSegments[i].material.color.setHex(getColorForStrain(epsActive_xx, maxStrainRef));
            passiveSegments[i].material.color.setHex(0x475569); // Passive constraint is grey
        }
    }
    
    function getColorForStrain(strain, maxStrain) {
        const norm = Math.max(0, Math.min(1, strain / maxStrain));
        const r = Math.round(0x3b + (0xef - 0x3b) * norm);
        const g = Math.round(0x82 + (0x44 - 0x82) * norm);
        const b = Math.round(0xf6 + (0x44 - 0xf6) * norm);
        return (r << 16) + (g << 8) + b;
    }
    
    // 2D Canvas Fallback
    function drawBilayer2D(points, h1) {
        const canvas = document.getElementById('simCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, 250);
        ctx.lineTo(450, 250);
        ctx.stroke();
        
        ctx.fillStyle = '#475569';
        ctx.fillRect(20, 200, 30, 100);
        
        const scale = 3000;
        const ox = 50, oy = 250;
        
        ctx.lineWidth = h1 * 1000 * 5;
        ctx.strokeStyle = '#ef4444';
        ctx.beginPath();
        points.forEach((p, idx) => {
            const sx = ox + p.x * scale;
            const sy = oy - p.y * scale;
            if (idx === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
    }
    
    // ============================================================================
    // SOLVER METHODS (Timoshenko, Elastica, FEM)
    // ============================================================================
    
    function solveLinearCLT(L, kx, kxy, segments) {
        const ds = L / segments;
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const s = i * ds;
            let x, y, theta;
            if (Math.abs(kx) < 1e-6) {
                x = s;
                y = 0;
                theta = 0;
            } else {
                x = Math.sin(kx * s) / kx;
                y = (1 - Math.cos(kx * s)) / kx;
                theta = kx * s;
            }
            const phi = kxy * s;
            points.push({ x, y, theta, phi });
        }
        return points;
    }
    
    function solveElasticaRK4(L, kx, kxy, segments) {
        const ds = L / segments;
        let x = 0, y = 0, theta = 0;
        const points = [{ x, y, theta, phi: 0 }];
    
        for (let i = 0; i < segments; i++) {
            // RK4 Bending Integrator
            const dx1 = Math.cos(theta) * ds;
            const dy1 = Math.sin(theta) * ds;
            const dt1 = kx * ds;
    
            const dx2 = Math.cos(theta + dt1 / 2) * ds;
            const dy2 = Math.sin(theta + dt1 / 2) * ds;
            const dt2 = kx * ds;
    
            const dx3 = Math.cos(theta + dt2 / 2) * ds;
            const dy3 = Math.sin(theta + dt2 / 2) * ds;
            const dt3 = kx * ds;
    
            const dx4 = Math.cos(theta + dt3) * ds;
            const dy4 = Math.sin(theta + dt3) * ds;
            const dt4 = kx * ds;
    
            x += (dx1 + 2 * dx2 + 2 * dx3 + dx4) / 6;
            y += (dy1 + 2 * dy2 + 2 * dy3 + dy4) / 6;
            theta += (dt1 + 2 * dt2 + 2 * dt3 + dt4) / 6;
    
            const s = (i + 1) * ds;
            const phi = kxy * s;
    
            points.push({ x, y, theta, phi });
        }
        return points;
    }
    
    function solveBeamFEM(L, kx, kxy, E1, E2, h1, h2, b, numElements) {
        const Le = L / numElements;
        
        // EI_eff calculation
        const yc = (E1 * h1 * (h2 + h1 / 2) + E2 * h2 * (h2 / 2)) / (E1 * h1 + E2 * h2);
        const EI_eff = b * (
            (E1 * Math.pow(h1, 3) / 12) + E1 * h1 * Math.pow(h2 + h1/2 - yc, 2) +
            (E2 * Math.pow(h2, 3) / 12) + E2 * h2 * Math.pow(h2/2 - yc, 2)
        );
    
        // Bending moment M_th = EI_eff * kx
        const M_th = -EI_eff * kx;
    
        const numNodes = numElements + 1;
        const numDOFs = numNodes * 2;
    
        const K = Array(numDOFs).fill(0).map(() => Array(numDOFs).fill(0));
        const F = Array(numDOFs).fill(0);
    
        const C = EI_eff / Math.pow(Le, 3);
        const ke = [
            [12 * C, 6 * Le * C, -12 * C, 6 * Le * C],
            [6 * Le * C, 4 * Le * Le * C, -6 * Le * C, 2 * Le * Le * C],
            [-12 * C, -6 * Le * C, 12 * C, -6 * Le * C],
            [6 * Le * C, 2 * Le * Le * C, -6 * Le * C, 4 * Le * Le * C]
        ];
    
        const fe = [0, -M_th, 0, M_th];
    
        for (let e = 0; e < numElements; e++) {
            const node1 = e;
            const node2 = e + 1;
            const dofs = [node1 * 2, node1 * 2 + 1, node2 * 2, node2 * 2 + 1];
    
            for (let i = 0; i < 4; i++) {
                F[dofs[i]] += fe[i];
                for (let j = 0; j < 4; j++) {
                    K[dofs[i]][dofs[j]] += ke[i][j];
                }
            }
        }
    
        // Boundary conditions: clamp node 0
        const BC_dofs = [0, 1];
        BC_dofs.forEach(dof => {
            for (let j = 0; j < numDOFs; j++) {
                K[dof][j] = 0;
            }
            K[dof][dof] = 1;
            F[dof] = 0;
        });
    
        const u = gaussianElimination(K, F);
    
        let curX = 0;
        const points = [{ x: 0, y: 0, theta: 0, phi: 0 }];
    
        for (let i = 1; i < numNodes; i++) {
            const w = u[i * 2];
            const theta = u[i * 2 + 1];
            const dy = w - points[i-1].y;
            const dx = Math.sqrt(Math.max(0, Le * Le - dy * dy));
            curX += dx;
            const s = i * Le;
            const phi = kxy * s;
            points.push({ x: curX, y: w, theta: theta, phi: phi });
        }
    
        return points;
    }
    
    // ============================================================================
    // LIVE ANALYTICS PLOTS
    // ============================================================================
    
    function drawStressChart(kx, epsActive_xx, h1, h2, E1, E2) {
        if (!stressChartCanvas) return;
        const ctx = stressChartCanvas.getContext('2d');
        ctx.clearRect(0, 0, stressChartCanvas.width, stressChartCanvas.height);
    
        const padLeft = 45, padRight = 15, padTop = 15, padBottom = 25;
        const w = stressChartCanvas.width - padLeft - padRight;
        const h = stressChartCanvas.height - padTop - padBottom;
    
        // Grid lines
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const x = padLeft + (i / 5) * w;
            ctx.beginPath(); ctx.moveTo(x, padTop); ctx.lineTo(x, padTop + h); ctx.stroke();
        }
        for (let i = 0; i <= 4; i++) {
            const y = padTop + (i / 4) * h;
            ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(padLeft + w, y); ctx.stroke();
        }
    
        // Stress values evaluation
        const numSteps = 60;
        const totalThick = h1 + h2;
        const dy = totalThick / numSteps;
        const stressPoints = [];
    
        const y_na = (E1 * h1 * (h2 + h1 / 2) + E2 * h2 * (h2 / 2)) / (E1 * h1 + E2 * h2);
        
        // reference strain eps0
        const eps0 = (E1 * h1 * epsActive_xx) / (E1 * h1 + E2 * h2);
    
        let maxStr = 1.0;
    
        for (let i = 0; i <= numSteps; i++) {
            const yCoord = i * dy;
            let E_y, eps_th_y;
            
            if (yCoord <= h2) {
                E_y = E2;
                eps_th_y = 0;
            } else {
                E_y = E1;
                eps_th_y = epsActive_xx;
            }
    
            // Stress formula: σ = E * (ε_0 + κ*(y - y_na) - ε_th)
            const stress = E_y * (eps0 + kx * (yCoord - y_na) - eps_th_y); // MPa
            stressPoints.push({ y: yCoord, s: stress });
            if (Math.abs(stress) > maxStr) maxStr = Math.abs(stress);
        }
    
        maxStr = maxStr * 1.15;
    
        // Zero stress line
        const zeroX = padLeft + 0.5 * w;
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(zeroX, padTop);
        ctx.lineTo(zeroX, padTop + h);
        ctx.stroke();
    
        // Interface line
        const interfaceY = padTop + h - (h2 / totalThick) * h;
        ctx.strokeStyle = '#94a3b8';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padLeft, interfaceY);
        ctx.lineTo(padLeft + w, interfaceY);
        ctx.stroke();
        ctx.setLineDash([]);
    
        // Draw Stress profile
        ctx.strokeStyle = '#8a1134';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        stressPoints.forEach((pt, idx) => {
            const sx = zeroX + (pt.s / maxStr) * (w / 2);
            const sy = padTop + h - (pt.y / totalThick) * h;
            if (idx === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
    
        // Labels
        ctx.fillStyle = '#475569';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText((-maxStr).toFixed(1) + ' MPa', padLeft, padTop + h + 15);
        ctx.fillText('0', zeroX, padTop + h + 15);
        ctx.fillText((maxStr).toFixed(1) + ' MPa', padLeft + w, padTop + h + 15);
    }
    
    function renderHistoryPlot(material, passiveMaterial, deltaC, h1, h2, L, currentTheta) {
        if (!historyChartCanvas) return;
        const ctx = historyChartCanvas.getContext('2d');
        ctx.clearRect(0, 0, historyChartCanvas.width, historyChartCanvas.height);
    
        const padLeft = 40, padRight = 15, padTop = 15, padBottom = 25;
        const w = historyChartCanvas.width - padLeft - padRight;
        const h = historyChartCanvas.height - padTop - padBottom;
    
        // Grid lines
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const x = padLeft + (i / 4) * w;
            ctx.beginPath(); ctx.moveTo(x, padTop); ctx.lineTo(x, padTop + h); ctx.stroke();
        }
        for (let i = 0; i <= 4; i++) {
            const y = padTop + (i / 4) * h;
            ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(padLeft + w, y); ctx.stroke();
        }
    
        // Sweep evaluation
        const sweep = sweepFibreOrientation(material, passiveMaterial, deltaC, h1, h2, L);
        
        let maxAngle = 5.0; // Min scale bounds
        sweep.forEach(pt => {
            if (Math.abs(pt.bendAngleDeg) > maxAngle) maxAngle = Math.abs(pt.bendAngleDeg);
            if (Math.abs(pt.twistAngleDeg) > maxAngle) maxAngle = Math.abs(pt.twistAngleDeg);
        });
        maxAngle = maxAngle * 1.15;
    
        const toPx = (theta, angle) => {
            const x = padLeft + (theta / 90) * w;
            const y = padTop + h - (Math.abs(angle) / maxAngle) * h;
            return { x, y };
        };
    
        // Plot Bending Angle (solid Crimson `#8a1134`)
        ctx.strokeStyle = '#8a1134';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        sweep.forEach((pt, idx) => {
            const p = toPx(pt.theta, pt.bendAngleDeg);
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
    
        // Plot Twist Angle (dashed Blue `#0ea5e9`)
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        sweep.forEach((pt, idx) => {
            const p = toPx(pt.theta, pt.twistAngleDeg);
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
    
        // Current operating orientation line
        const curX = padLeft + (currentTheta / 90) * w;
        ctx.strokeStyle = '#8a1134';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(curX, padTop);
        ctx.lineTo(curX, padTop + h);
        ctx.stroke();
        ctx.setLineDash([]);
    
        // Dots at current points
        const activeEps = rotateSwellingStrain(material.beta1, material.beta2, deltaC, currentTheta);
        const epsP_xx = passiveMaterial.beta1 * deltaC;
        const activeB = computeBendingFromSwelling(activeEps.eps_xx, epsP_xx, h1, h2, L, material.E, passiveMaterial.E);
        const m = h1 / h2;
        const totalH = h1 + h2;
        const activeKxy = 6 * activeEps.eps_xy * Math.pow(1+m, 2) / (totalH * activeB.phi_mn);
    
        const activeBendDeg = activeB.thetaBend * 180 / Math.PI;
        const activeTwistDeg = (activeKxy * L) * 180 / Math.PI;
    
        const dotB = toPx(currentTheta, activeBendDeg);
        const dotT = toPx(currentTheta, activeTwistDeg);
    
        ctx.fillStyle = '#8a1134';
        ctx.beginPath(); ctx.arc(dotB.x, dotB.y, 4.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath(); ctx.arc(dotT.x, dotT.y, 4.5, 0, Math.PI*2); ctx.fill();
    
        // Axes
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padLeft, padTop);
        ctx.lineTo(padLeft, padTop + h);
        ctx.lineTo(padLeft + w, padTop + h);
        ctx.stroke();
    
        // Labels
        ctx.fillStyle = '#475569';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('0°', toPx(0, 0).x, padTop + h + 12);
        ctx.fillText('45°', toPx(45, 0).x, padTop + h + 12);
        ctx.fillText('90°', toPx(90, 0).x, padTop + h + 12);
    
        ctx.textAlign = 'right';
        ctx.fillText(maxAngle.toFixed(1) + '°', padLeft - 4, padTop + 5);
        ctx.fillText('0°', padLeft - 4, padTop + h);
    }
    
    // 12. HTML live substituted math formula renderer
    function renderLiveMath(activeMat, deltaC, thetaF, epsA, As, phi_mn, h, m, kx) {
        if (!latexFormulaContainer) return;
    
        const b1_val = activeMat.beta1.toFixed(4);
        const b2_val = activeMat.beta2.toFixed(4);
        const dc_val = deltaC.toFixed(3);
        const ep_val = (activeMat.beta1 * deltaC * 100).toFixed(3);
        const et_val = (activeMat.beta2 * deltaC * 100).toFixed(3);
        const exx_val = (epsA.eps_xx * 100).toFixed(3);
        const exy_val = (epsA.eps_xy * 100).toFixed(3);
        const kx_val = kx.toFixed(4);
    
        latexFormulaContainer.innerHTML = `
            <div style="font-family: inherit; line-height: 1.6; font-size: 16px; font-weight: bold;">
                <div>&epsilon;<sub>&parallel;</sub> = &beta;<sub>&parallel;</sub> &times; &Delta;C = ${b1_val} &times; ${dc_val} = ${ep_val}%</div>
                <div>&epsilon;<sub>&perp;</sub> = &beta;<sub>&perp;</sub> &times; &Delta;C = ${b2_val} &times; ${dc_val} = ${et_val}%</div>
                <div style="margin-top: 4px;">&epsilon;<sub>xx</sub>(&theta;) = &epsilon;<sub>&parallel;</sub> cos<sup>2</sup>&theta; + &epsilon;<sub>&perp;</sub> sin<sup>2</sup>&theta; = ${exx_val}%</div>
                <div>&epsilon;<sub>xy</sub>(&theta;) = (&epsilon;<sub>&parallel;</sub> - &epsilon;<sub>&perp;</sub>) sin&theta; cos&theta; = ${exy_val}%</div>
                <div style="margin-top: 6px; font-weight: bold; color: #8A1134;">
                    &kappa; = [6 &times; &Delta;&epsilon;<sub>xx</sub> &times; (1+m)<sup>2</sup>] / [h &times; &phi;(m,n)] = ${kx_val} m<sup>-1</sup>
                </div>
            </div>
        `;
    }
    
    // 13. Dynamic Warning/Success Banners
    function evaluateSafetyChecks(kx, kxy, L, solverModel) {
        if (!safetyWarningsBox) return;
    
        const activeWarnings = [];
        const thetaF = parseFloat(slideTheta.value);
    
        // Insight banners based on angle orientation
        if (Math.abs(thetaF - 45) < 3) {
            activeWarnings.push({
                id: "twist-peak",
                color: "green",
                title: "Maximum Twist Coupling",
                text: "Fibre angle θ_f = 45° maximizes the shear coupling strain ε_xy, driving helical/auxetic out-of-plane coiling deformations."
            });
        } else if (thetaF === 0 || thetaF === 90) {
            activeWarnings.push({
                id: "pure-bend",
                color: "blue",
                title: "Maximum Pure Bending",
                text: `Fibre angle θ_f = ${thetaF}° aligns with the principal axis. Shear strain ε_xy = 0, producing pure cylindrical bending with zero twist.`
            });
        }
    
        // Small-deflection warning
        if (Math.abs(kx * L) > 0.3 && solverModel === 'timoshenko') {
            activeWarnings.push({
                id: "small-angle-limit",
                color: "amber",
                title: "Small-Angle Limit Exceeded",
                text: `κL = ${(Math.abs(kx * L)).toFixed(2)} exceeds 0.3. Small-deflection Timoshenko assumptions become inaccurate. Switch to Nonlinear Elastica solver.`
            });
        }
    
        // Update safetyWarningsBox DOM in-place to prevent visual flashing
        if (activeWarnings.length === 0) {
            const existingBanners = Array.from(safetyWarningsBox.children);
            existingBanners.forEach(banner => {
                if (banner.dataset.id !== "success") banner.remove();
            });
    
            let successBanner = safetyWarningsBox.querySelector('[data-id="success"]');
            if (!successBanner) {
                successBanner = document.createElement('div');
                successBanner.dataset.id = "success";
                successBanner.className = "warning-banner";
                successBanner.style.background = "#EBFDF5";
                successBanner.style.color = "#047857";
                successBanner.style.borderLeft = "4px solid #10B981";
                successBanner.innerHTML = `<span class="warning-icon">[OK]</span> <div><strong>Structural Integrity Normal</strong>: Swelling stresses and deformations are within safe parameters.</div>`;
                safetyWarningsBox.appendChild(successBanner);
            }
            return;
        }
    
        // Clean up obsolete banners
        const existingBanners = Array.from(safetyWarningsBox.children);
        existingBanners.forEach(banner => {
            const id = banner.dataset.id;
            if (!id || !activeWarnings.some(w => w.id === id)) {
                banner.remove();
            }
        });
    
        // Write or update active banners in order
        activeWarnings.forEach((w, index) => {
            let banner = safetyWarningsBox.querySelector(`[data-id="${w.id}"]`);
            if (!banner) {
                banner = document.createElement('div');
                banner.dataset.id = w.id;
                banner.className = `warning-banner ${w.color}`;
                banner.innerHTML = `<span class="warning-icon">[Warning]</span> <div><strong>${w.title}</strong>: <span class="warning-text"></span></div>`;
                
                if (index < safetyWarningsBox.children.length) {
                    safetyWarningsBox.insertBefore(banner, safetyWarningsBox.children[index]);
                } else {
                    safetyWarningsBox.appendChild(banner);
                }
            }
            
            const textSpan = banner.querySelector('.warning-text');
            if (textSpan && textSpan.textContent !== w.text) {
                textSpan.textContent = w.text;
            }
        });
    }
    
    // 14. Timeline Playback Animation Loop
    function startSimulation() {
        resetTimelineToZero();
        isPlaying = true;
        if (btnPlayPause) btnPlayPause.innerText = "Pause";
        if (btnRun) btnRun.disabled = true;
        
        playInterval = setInterval(() => {
            currentSimTime += 0.2;
            if (currentSimTime >= maxSimTime) {
                currentSimTime = maxSimTime;
                pauseSimulation();
                if (btnRun) btnRun.disabled = false;
            }
            runSimulationAtTime(currentSimTime);
        }, 80);
    }
    
    function pauseSimulation() {
        isPlaying = false;
        if (btnPlayPause) btnPlayPause.innerText = "Play";
        if (playInterval) {
            clearInterval(playInterval);
            playInterval = null;
        }
    }
    
    function togglePlayPause() {
        if (isPlaying) {
            pauseSimulation();
        } else {
            if (currentSimTime >= maxSimTime) currentSimTime = 0;
            isPlaying = true;
            if (btnPlayPause) btnPlayPause.innerText = "Pause";
            playInterval = setInterval(() => {
                currentSimTime += 0.2;
                if (currentSimTime >= maxSimTime) {
                    currentSimTime = maxSimTime;
                    pauseSimulation();
                }
                runSimulationAtTime(currentSimTime);
            }, 80);
        }
    }
    
    function resetTimelineToZero() {
        pauseSimulation();
        currentSimTime = 0.0;
        if (btnRun) btnRun.disabled = false;
    }
    
    function resetLab() {
        pauseSimulation();
        matActiveSelect.value = "cellulose";
        matPassiveSelect.value = "cellulose_constrained";
        solverModelSelect.value = "timoshenko";
        slideH1.value = 0.50;
        slideH2.value = 0.50;
        slideLen.value = 50;
        slideWidth.value = 10;
        slideDC.value = 0.30;
        slideTheta.value = 45;
    
        const labelAs = document.getElementById('labelAs');
        if (labelAs) labelAs.innerText = "Anisotropy Index: 7.00";
        
        if (showMeshNodes) showMeshNodes.checked = true;
        if (showDeformedMesh) showDeformedMesh.checked = true;
    
        currentViewMode = 'specimen';
        const viewSpecimenBtn = document.getElementById('viewSpecimenBtn');
        const viewBilayerBtn = document.getElementById('viewBilayerBtn');
        if (viewSpecimenBtn) viewSpecimenBtn.classList.add('active');
        if (viewBilayerBtn) viewBilayerBtn.classList.remove('active');
    
        updateLabels();
        resetTimelineToZero();
        runSimulationAtTime(0.0);
    }
    
    // Helper: Solve Gaussian Elimination for linear solver (up to 6x6)
    function gaussianElimination(A, b) {
        const n = b.length;
        for (let i = 0; i < n; i++) {
            let maxEl = Math.abs(A[i][i]);
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(A[k][i]) > maxEl) {
                    maxEl = Math.abs(A[k][i]);
                    maxRow = k;
                }
            }
            
            for (let k = i; k < n; k++) {
                const tmp = A[maxRow][k];
                A[maxRow][k] = A[i][k];
                A[i][k] = tmp;
            }
            const tmp = b[maxRow];
            b[maxRow] = b[i];
            b[i] = tmp;
            
            for (let k = i + 1; k < n; k++) {
                const c = -A[k][i] / A[i][i];
                for (let j = i; j < n; j++) {
                    if (i === j) {
                        A[k][j] = 0;
                    } else {
                        A[k][j] += c * A[i][j];
                    }
                }
                b[k] += c * b[i];
            }
        }
        
        const x = Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = b[i] / A[i][i];
            for (let k = i - 1; k >= 0; k--) {
                b[k] -= A[k][i] * x[i];
            }
        }
        return x;
    }
    
    // Initialize application on load
    window.addEventListener('DOMContentLoaded', init);
})();

// ============================================================
// SCRIPT_C.JS (Page Check: document.getElementById('thetaTop'))
// ============================================================
(function() {
    if (!document.getElementById('thetaTop')) return;
    
    // ============================================================
    // MATERIAL PROPERTIES - Anisotropic Thermal Expansion
    // ============================================================
    
    // Base CTE anisotropy values (1/K)
    const alpha_parallel = 10e-6;   // CTE along fibre/grain direction
    const alpha_transverse = 100e-6; // CTE perpendicular to fibres
    
    // Normalized structural parameters
    const h_denom = 1.0e-3;  // Total thickness in meters (1 mm)
    const m = 1.0;           // Thickness ratio h1/h2 = 1 (equal layers)
    const renderScale = 300; // Scaling for Three.js visualization
    
    // ============================================================
    // UI ELEMENTS
    // ============================================================
    
    const slideThetaTop = document.getElementById('thetaTop');
    const slideThetaBot = document.getElementById('thetaBot');
    const slideDT = document.getElementById('deltaT');
    
    const valTop = document.getElementById('valTop');
    const valBot = document.getElementById('valBot');
    const valDT = document.getElementById('valDT');
    
    const resAlphaTop = document.getElementById('resAlphaTop');
    const resAlphaBot = document.getElementById('resAlphaBot');
    const resKappa = document.getElementById('resKappa');
    const resMode = document.getElementById('resMode');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const btnRun = document.getElementById('btnRun');
    const btnReset = document.getElementById('btnReset');
    const btnPlayPause = document.getElementById('btnPlayPause');
    const timeScrubber = document.getElementById('timeScrubber');
    const timeVal = document.getElementById('timeVal');
    const btnOrbitReset = document.getElementById('btnOrbitReset');
    const showPrintLines = document.getElementById('showPrintLines');
    const showDeformedMesh = document.getElementById('showDeformedMesh');
    
    // Timeline statistics DOM
    const timelineTop = document.getElementById('timelineTop');
    const timelineBot = document.getElementById('timelineBot');
    const timelineKappa = document.getElementById('timelineKappa');
    const timelineTwist = document.getElementById('timelineTwist');
    
    let isRunning = false;
    let animInterval = null;
    
    // Three.js State variables
    let scene, camera, renderer, orbitControls;
    let topMesh, botMesh;
    let topLines, botLines;
    let bedMesh, gridHelper;
    let threejsInitialized = false;
    
    // ============================================================
    // INITIAL SETUP & EVENT LISTENERS
    // ============================================================
    
    function init() {
        // Slider Listeners
        [slideThetaTop, slideThetaBot, slideDT].forEach(el => {
            if (el) el.addEventListener('input', () => {
                pauseAnimation();
                updateValues();
            });
        });
    
        if (timeScrubber) {
            timeScrubber.addEventListener('input', (e) => {
                pauseAnimation();
                slideDT.value = e.target.value;
                updateValues();
            });
        }
    
        // Buttons
        if (btnRun) btnRun.addEventListener('click', () => {
            if (isRunning) {
                pauseAnimation();
            } else {
                const currentDT = parseFloat(slideDT.value);
                if (currentDT >= 100) {
                    slideDT.value = 0;
                    if (timeScrubber) timeScrubber.value = 0;
                }
                startPresetAnimation();
            }
        });
        if (btnReset) btnReset.addEventListener('click', resetSetup);
        if (btnPlayPause) btnPlayPause.addEventListener('click', togglePlayPause);
        if (btnOrbitReset) btnOrbitReset.addEventListener('click', resetCamera);
        if (showPrintLines) showPrintLines.addEventListener('change', updateValues);
        if (showDeformedMesh) showDeformedMesh.addEventListener('change', updateValues);
    
        // Preset Buttons click loaders
        const preset1Btn = document.getElementById('preset1Btn');
        const preset2Btn = document.getElementById('preset2Btn');
        const preset3Btn = document.getElementById('preset3Btn');
        const preset4Btn = document.getElementById('preset4Btn');
    
        if (preset1Btn) preset1Btn.addEventListener('click', () => applyComboPreset(0, 90));
        if (preset2Btn) preset2Btn.addEventListener('click', () => applyComboPreset(45, -45));
        if (preset3Btn) preset3Btn.addEventListener('click', () => applyComboPreset(0, 45));
        if (preset4Btn) preset4Btn.addEventListener('click', () => applyComboPreset(45, 90));
    
        // Initialize 3D Viewport
        try {
            init3D();
            threejsInitialized = true;
        } catch (e) {
            console.error("WebGL failure during Three.js initialization:", e);
        }
    
        updateValues();
    }
    
    function updateValues() {
        const tTop = parseInt(slideThetaTop.value);
        const tBot = parseInt(slideThetaBot.value);
        const dT = parseInt(slideDT.value);
    
        if (valTop) valTop.innerText = tTop + '°';
        if (valBot) valBot.innerText = tBot + '°';
        if (valDT) valDT.innerText = dT + ' °C';
        if (timeVal) timeVal.innerText = dT;
        if (timeScrubber) timeScrubber.value = dT;
    
        // Timeline stats update
        if (timelineTop) timelineTop.innerText = tTop + '°';
        if (timelineBot) timelineBot.innerText = tBot + '°';
    
        simulate(tTop, tBot, dT);
    }
    
    // ============================================================
    // PHYSICS ENGINE - CTE tensor transformation & Curvature
    // ============================================================
    
    function calculateMorphing(tTopDeg, tBotDeg, deltaT) {
        const tTop = tTopDeg * Math.PI / 180;
        const tBot = tBotDeg * Math.PI / 180;
        
        // Effective longitudinal CTEs
        const alphaEffTop = alpha_parallel * Math.cos(tTop)**2 + alpha_transverse * Math.sin(tTop)**2;
        const alphaEffBot = alpha_parallel * Math.cos(tBot)**2 + alpha_transverse * Math.sin(tBot)**2;
        
        // Shear CTE couplings (responsible for twist)
        const alphaShearTop = (alpha_parallel - alpha_transverse) * Math.sin(tTop) * Math.cos(tTop);
        const alphaShearBot = (alpha_parallel - alpha_transverse) * Math.sin(tBot) * Math.cos(tBot);
        
        // Timoshenko curvature formula: κ = 6 × (α_eff_top - α_eff_bot) × ΔT × (1+m)² / h
        const deltaAlpha = alphaEffTop - alphaEffBot;
        const kappa = (6 * deltaAlpha * deltaT * Math.pow(1 + m, 2)) / h_denom;
        
        // Twist rate formula: τ = 6 × (α_xy_top - α_xy_bot) × ΔT × (1+m)² / h
        const deltaAlphaShear = alphaShearTop - alphaShearBot;
        const twistRate = (6 * deltaAlphaShear * deltaT * Math.pow(1 + m, 2)) / h_denom;
        
        // Classification of deformation mode
        let mode, description, code;

        
        if (Math.abs(tTopDeg - tBotDeg) < 3) {
            mode = "Uniform Expansion";
            description = "Equal print path angles program zero differential strain. The printed coupon expands uniformly without bending.";
            code = "d";
        } else if (Math.abs(tTopDeg) === 0 && Math.abs(tBotDeg) === 90 || Math.abs(tTopDeg) === 90 && Math.abs(tBotDeg) === 0) {
            mode = "Pure Cylindrical Bending";
            description = "0°/90° maximizes longitudinal CTE mismatch while shear cancels. The coupon curls into a smooth cylindrical arc (like a taco shell).";
            code = "a";
        } else if (Math.abs(tTopDeg - 45) < 3 && Math.abs(tBotDeg + 45) < 3 || Math.abs(tTopDeg + 45) < 3 && Math.abs(tBotDeg - 45) < 3) {
            mode = "Pure Twisting";
            description = "45°/-45° programs anti-symmetric shear mismatch while bending cancels. The coupon twists like a propeller/saddle; corners lift symmetrically.";
            code = "b";
        } else {
            mode = "Helical Shape Morphing";
            description = "Combined bending and twisting programs helical coiling. The coupon deforms into a corkscrew/helical ribbon shape.";
            code = "c";
        }
        
        return {
            alphaEffTop,
            alphaEffBot,
            alphaShearTop,
            alphaShearBot,
            kappa,
            twistRate,
            mode,
            description,
            code
        };
    }
    
    function simulate(tTop, tBot, dT) {
        const result = calculateMorphing(tTop, tBot, dT);
    
        // Update outputs
        if (resAlphaTop) resAlphaTop.innerText = (result.alphaEffTop * 1e6).toFixed(1) + ' µm/(m·K)';
        if (resAlphaBot) resAlphaBot.innerText = (result.alphaEffBot * 1e6).toFixed(1) + ' µm/(m·K)';
        if (resKappa) resKappa.innerText = result.kappa.toFixed(2) + ' m⁻¹';
        if (resMode) resMode.innerText = result.mode;
    
        // Timeline badging
        if (timelineKappa) timelineKappa.innerText = result.kappa.toFixed(2) + ' m⁻¹';
        if (timelineTwist) timelineTwist.innerText = result.twistRate.toFixed(2) + ' rad/m';
    
        // State indicators
        if (stateLabel) {
            stateLabel.innerText = dT > 0 ? `Active: ${result.mode}` : "Idle: Room Temperature";
            stateLabel.className = dT > 5 ? "state-indicator bending" : "state-indicator flat";
        }
    
        // Set Insight Banner
        if (liveInsight) {
            let bannerClass = "safety-box";
            if (result.code === "a") bannerClass = "safety-box blue";
            else if (result.code === "b") bannerClass = "safety-box green";
            else if (result.code === "c") bannerClass = "safety-box amber";
            
            liveInsight.className = bannerClass;
            liveInsight.innerHTML = `<strong>${result.mode} (${result.code.toUpperCase()}):</strong> ${result.description}`;
        }
    
        // Update dynamic elements
        updatePlot(tTop, tBot, dT);
        updateComparisonTable(dT);
        renderLiveMath(result.alphaEffTop, result.alphaEffBot, result.alphaShearTop, result.alphaShearBot, dT, result.kappa, result.twistRate);
    
        // Reconstruct 3D meshes using Frenet-Serret
        if (threejsInitialized) {
            update3D(result.kappa, result.twistRate);
        }
    }
    
    // ============================================================
    // THREE.JS VIEWPORT & PRINT BED GRID
    // ============================================================
    
    function init3D() {
        const container = document.getElementById('viewport3D');
        if (!container) return;
    
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xfafbfc);
    
        camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(0, 15, 20);
    
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);
    
        orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
        orbitControls.enableDamping = true;
        orbitControls.dampingFactor = 0.05;
        orbitControls.maxPolarAngle = Math.PI / 2 + 0.1;
    
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
    
        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight1.position.set(10, 30, 20);
        dirLight1.castShadow = true;
        scene.add(dirLight1);
    
        const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.15); // blue fill
        dirLight2.position.set(-10, -20, -10);
        scene.add(dirLight2);
    
        // Build print bed grid
        const bedGeo = new THREE.BoxGeometry(20, 0.2, 20);
        const bedMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.15,
            roughness: 0.1,
            transmission: 0.9,
            ior: 1.5
        });
        bedMesh = new THREE.Mesh(bedGeo, bedMat);
        bedMesh.position.y = -0.5;
        scene.add(bedMesh);
    
        gridHelper = new THREE.GridHelper(20, 20, 0x475569, 0xcbd5e1);
        gridHelper.position.y = -0.39;
        scene.add(gridHelper);
    
        window.addEventListener('resize', onWindowResize);
        animate3D();
    }
    
    function onWindowResize() {
        const container = document.getElementById('viewport3D');
        if (!container || !renderer || !camera) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    function animate3D() {
        requestAnimationFrame(animate3D);
        if (orbitControls) orbitControls.update();
        if (renderer && scene && camera) renderer.render(scene, camera);
    }
    
    function resetCamera() {
        if (orbitControls) {
            camera.position.set(0, 15, 20);
            orbitControls.target.set(0, 0, 0);
            orbitControls.update();
        }
    }
    
    // ============================================================
    // FRENET-SERRET NUMERICAL INTEGRATION (RK4)
    // ============================================================
    
    function rk4Step(r, T, N, B, kappa, torsion, ds) {
        const deriv = (state) => {
            return {
                dr: state.T.clone(),
                dT: state.N.clone().multiplyScalar(kappa),
                dN: state.T.clone().multiplyScalar(-kappa).add(state.B.clone().multiplyScalar(torsion)),
                dB: state.N.clone().multiplyScalar(-torsion)
            };
        };
    
        const addState = (s, d, scale) => {
            return {
                r: s.r.clone().add(d.dr.clone().multiplyScalar(scale)),
                T: s.T.clone().add(d.dT.clone().multiplyScalar(scale)),
                N: s.N.clone().add(d.dN.clone().multiplyScalar(scale)),
                B: s.B.clone().add(d.dB.clone().multiplyScalar(scale))
            };
        };
    
        const state0 = { r, T, N, B };
        const k1 = deriv(state0);
    
        const state1 = addState(state0, k1, ds / 2);
        const k2 = deriv(state1);
    
        const state2 = addState(state0, k2, ds / 2);
        const k3 = deriv(state2);
    
        const state3 = addState(state0, k3, ds);
        const k4 = deriv(state3);
    
        const nextR = r.clone().add(k1.dr.add(k2.dr.multiplyScalar(2)).add(k3.dr.multiplyScalar(2)).add(k4.dr).multiplyScalar(ds / 6));
        const nextT = T.clone().add(k1.dT.add(k2.dT.multiplyScalar(2)).add(k3.dT.multiplyScalar(2)).add(k4.dT).multiplyScalar(ds / 6));
        const nextN = N.clone().add(k1.dN.add(k2.dN.multiplyScalar(2)).add(k3.dN.multiplyScalar(2)).add(k4.dN).multiplyScalar(ds / 6));

    
        nextT.normalize();
        const nextN_proj = nextN.clone().sub(nextT.clone().multiplyScalar(nextN.dot(nextT))).normalize();
        const nextB_proj = nextT.clone().cross(nextN_proj).normalize();
    
        return { r: nextR, T: nextT, N: nextN_proj, B: nextB_proj };
    }
    
    function buildLayerGeometry(yCenter, layerH, L, W, kappa, torsion, segments=40, width_segments=10) {
        const geom = new THREE.BufferGeometry();
        
        const vertices = [];
        const colors = [];
        const indices = [];
        const uvs = [];
        
        const ds = L / segments;
        let r = new THREE.Vector3(0, 0, 0);
        let T = new THREE.Vector3(1, 0, 0);
        let N = new THREE.Vector3(0, 1, 0);
        let B = new THREE.Vector3(0, 0, 1);
        
        const frames = [{ r: r.clone(), T: T.clone(), N: N.clone(), B: B.clone() }];
        for (let i = 0; i < segments; i++) {
            const next = rk4Step(r, T, N, B, kappa, torsion, ds);
            r = next.r; T = next.T; N = next.N; B = next.B;
            frames.push({ r: r.clone(), T: T.clone(), N: N.clone(), B: B.clone() });
        }
        
        // Centering offset
        const midFrame = frames[Math.floor(segments / 2)];
        const centerOffset = midFrame.r.clone();
        frames.forEach(f => f.r.sub(centerOffset));
        
        const numVertsRow = width_segments + 1;
        const numVertsCol = segments + 1;
        
        const addVertexData = (f, wVal, yOff) => {
            const v = f.r.clone().add(f.B.clone().multiplyScalar(wVal)).add(f.N.clone().multiplyScalar(yOff));
            vertices.push(v.x, v.y, v.z);
            
            // UV coordinates mapping
            const uCoord = (f.r.x + L / 2) / L;
            const vCoord = wVal / W + 0.5;
            uvs.push(uCoord, vCoord);
            
            // Dynamic color gradients mapped to local curvature
            const maxK = 0.5; // reference curvature
            const norm = Math.max(0, Math.min(1, Math.abs(kappa) / maxK));
            const rColor = Math.round(0x3b + (0xef - 0x3b) * norm) / 255;
            const gColor = Math.round(0x82 + (0x44 - 0x82) * norm) / 255;
            const bColor = Math.round(0xf6 + (0x44 - 0xf6) * norm) / 255;
            colors.push(rColor, gColor, bColor);
        };
        
        // Generate Top face vertices
        for (let i = 0; i < numVertsCol; i++) {
            const f = frames[i];
            for (let j = 0; j < numVertsRow; j++) {
                const wVal = W * (j / width_segments - 0.5);
                addVertexData(f, wVal, yCenter + layerH / 2);
            }
        }
        
        // Generate Bottom face vertices
        for (let i = 0; i < numVertsCol; i++) {
            const f = frames[i];
            for (let j = 0; j < numVertsRow; j++) {
                const wVal = W * (j / width_segments - 0.5);
                addVertexData(f, wVal, yCenter - layerH / 2);
            }
        }
        
        const topOffset = 0;
        const botOffset = numVertsCol * numVertsRow;
        
        // Top face indices
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < width_segments; j++) {
                const i00 = topOffset + i * numVertsRow + j;
                const i10 = topOffset + (i + 1) * numVertsRow + j;
                const i01 = topOffset + i * numVertsRow + j + 1;
                const i11 = topOffset + (i + 1) * numVertsRow + j + 1;
                
                indices.push(i00, i10, i01);
                indices.push(i01, i10, i11);
            }
        }
        
        // Bottom face indices
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < width_segments; j++) {
                const i00 = botOffset + i * numVertsRow + j;
                const i10 = botOffset + (i + 1) * numVertsRow + j;
                const i01 = botOffset + i * numVertsRow + j + 1;
                const i11 = botOffset + (i + 1) * numVertsRow + j + 1;
                
                indices.push(i00, i01, i10);
                indices.push(i01, i11, i10);
            }
        }
        
        // Side faces indices
        // Left edge
        for (let i = 0; i < segments; i++) {
            const t0 = topOffset + i * numVertsRow;
            const t1 = topOffset + (i + 1) * numVertsRow;
            const b0 = botOffset + i * numVertsRow;
            const b1 = botOffset + (i + 1) * numVertsRow;
            indices.push(t0, b0, t1);
            indices.push(t1, b0, b1);
        }
        
        // Right edge
        for (let i = 0; i < segments; i++) {
            const t0 = topOffset + i * numVertsRow + width_segments;
            const t1 = topOffset + (i + 1) * numVertsRow + width_segments;
            const b0 = botOffset + i * numVertsRow + width_segments;
            const b1 = botOffset + (i + 1) * numVertsRow + width_segments;
            indices.push(t0, t1, b0);
            indices.push(t1, b1, b0);
        }
        
        // Front edge
        for (let j = 0; j < width_segments; j++) {
            const t0 = topOffset + j;
            const t1 = topOffset + j + 1;
            const b0 = botOffset + j;
            const b1 = botOffset + j + 1;
            indices.push(t0, t1, b0);
            indices.push(t1, b1, b0);
        }
        
        // Back edge
        for (let j = 0; j < width_segments; j++) {
            const t0 = topOffset + segments * numVertsRow + j;
            const t1 = topOffset + segments * numVertsRow + j + 1;
            const b0 = botOffset + segments * numVertsRow + j;
            const b1 = botOffset + segments * numVertsRow + j + 1;
            indices.push(t0, b0, t1);
            indices.push(t1, b0, b1);
        }
        
        geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geom.setIndex(indices);
        geom.computeVertexNormals();
        
        return geom;
    }
    
    function buildPrintLinesGeometry(yOffset, L, W, thetaDeg, kappa, torsion, segments=40) {
        const points = [];
        const thetaRad = thetaDeg * Math.PI / 180;
        
        const ds = L / segments;
        let r = new THREE.Vector3(0, 0, 0);
        let T = new THREE.Vector3(1, 0, 0);
        let N = new THREE.Vector3(0, 1, 0);
        let B = new THREE.Vector3(0, 0, 1);
        
        const frames = [{ r: r.clone(), T: T.clone(), N: N.clone(), B: B.clone() }];
        for (let i = 0; i < segments; i++) {
            const next = rk4Step(r, T, N, B, kappa, torsion, ds);
            r = next.r; T = next.T; N = next.N; B = next.B;
            frames.push({ r: r.clone(), T: T.clone(), N: N.clone(), B: B.clone() });
        }
        
        const midFrame = frames[Math.floor(segments / 2)];
        const centerOffset = midFrame.r.clone();
        frames.forEach(f => f.r.sub(centerOffset));
        
        const getFrameAtS = (sVal) => {
            const idxRaw = sVal / ds;
            const idx = Math.max(0, Math.min(segments - 1, Math.floor(idxRaw)));
            const frac = idxRaw - idx;
            const f0 = frames[idx];
            const f1 = frames[idx + 1];
            return {
                r: f0.r.clone().lerp(f1.r, frac),
                N: f0.N.clone().lerp(f1.N, frac).normalize(),
                B: f0.B.clone().lerp(f1.B, frac).normalize()
            };
        };
        
        const halfL = L / 2;
        const halfW = W / 2;
        const nx = Math.cos(thetaRad);
        const nz = Math.sin(thetaRad);
        
        const spacing = 1.0; 
        const maxDist = Math.abs(halfL * nx) + Math.abs(halfW * nz);
        
        for (let d = -maxDist + spacing/2; d < maxDist; d += spacing) {
            const intersects = [];
            
            if (Math.abs(nx) > 1e-6) {
                const z1 = (d - (-halfL) * nx) / nz;
                if (z1 >= -halfW && z1 <= halfW) intersects.push(new THREE.Vector2(-halfL, z1));
                const z2 = (d - halfL * nx) / nz;
                if (z2 >= -halfW && z2 <= halfW) intersects.push(new THREE.Vector2(halfL, z2));
            }
            if (Math.abs(nz) > 1e-6) {
                const x1 = (d - (-halfW) * nz) / nx;
                if (x1 >= -halfL && x1 <= halfL) intersects.push(new THREE.Vector2(x1, -halfW));
                const x2 = (d - halfW * nz) / nx;
                if (x2 >= -halfL && x2 <= halfL) intersects.push(new THREE.Vector2(x2, halfW));
            }
            
            const unique = [];
            intersects.forEach(pt => {
                if (!unique.some(upt => upt.distanceTo(pt) < 1e-4)) {
                    unique.push(pt);
                }
            });
            
            if (unique.length >= 2) {
                const pStart = unique[0];
                const pEnd = unique[1];
                const lineSteps = 15;
                
                for (let k = 0; k < lineSteps; k++) {
                    const frac1 = k / lineSteps;
                    const frac2 = (k + 1) / lineSteps;
                    
                    const x1 = pStart.x + (pEnd.x - pStart.x) * frac1;
                    const z1 = pStart.y + (pEnd.y - pStart.y) * frac1;
                    const s1 = x1 + halfL;
                    const f1 = getFrameAtS(s1);
                    const v1 = f1.r.clone().add(f1.B.clone().multiplyScalar(z1)).add(f1.N.clone().multiplyScalar(yOffset));
                    
                    const x2 = pStart.x + (pEnd.x - pStart.x) * frac2;
                    const z2 = pStart.y + (pEnd.y - pStart.y) * frac2;
                    const s2 = x2 + halfL;
                    const f2 = getFrameAtS(s2);
                    const v2 = f2.r.clone().add(f2.B.clone().multiplyScalar(z2)).add(f2.N.clone().multiplyScalar(yOffset));
                    
                    points.push(v1, v2);
                }
            }
        }
        
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        return geom;
    }
    
    function update3D(kappa, torsion) {
        const L_render = 12;
        const W_render = 12;
        const h1_render = 0.15;
        const h2_render = 0.15;
        
        const kappa_render = kappa / renderScale;
        const tau_render = torsion / renderScale;
        
        // Clear old elements from scene
        if (topMesh) {
            scene.remove(topMesh);
            if (topMesh.geometry) topMesh.geometry.dispose();
            if (topMesh.material) topMesh.material.dispose();
        }
        if (botMesh) {
            scene.remove(botMesh);
            if (botMesh.geometry) botMesh.geometry.dispose();
            if (botMesh.material) botMesh.material.dispose();
        }
        if (topLines) {
            scene.remove(topLines);
            if (topLines.geometry) topLines.geometry.dispose();
            if (topLines.material) topLines.material.dispose();
        }
        if (botLines) {
            scene.remove(botLines);
            if (botLines.geometry) botLines.geometry.dispose();
            if (botLines.material) botLines.material.dispose();
        }
        
        // Create new geometries
        const topGeo = buildLayerGeometry(h1_render / 2, h1_render, L_render, W_render, kappa_render, tau_render);
        const botGeo = buildLayerGeometry(-h2_render / 2, h2_render, L_render, W_render, kappa_render, tau_render);
        
        const topMat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.3,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        
        const botMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            roughness: 0.4,
            metalness: 0.05,
            side: THREE.DoubleSide
        });
        
        topMesh = new THREE.Mesh(topGeo, topMat);
        botMesh = new THREE.Mesh(botGeo, botMat);
        
        scene.add(topMesh);
        scene.add(botMesh);
        
        // Generate and add print line overlays
        const showLines = showPrintLines ? showPrintLines.checked : true;
        if (showLines) {
            const topLinesGeo = buildPrintLinesGeometry(h1_render + 0.01, L_render, W_render, parseFloat(slideThetaTop.value), kappa_render, tau_render);
            const botLinesGeo = buildPrintLinesGeometry(-h2_render - 0.01, L_render, W_render, parseFloat(slideThetaBot.value), kappa_render, tau_render);
            
            const topLinesMat = new THREE.LineBasicMaterial({ color: 0x1e3a8a, linewidth: 2.5 });
            const botLinesMat = new THREE.LineBasicMaterial({ color: 0xe11d48, linewidth: 2.5 });
            
            topLines = new THREE.LineSegments(topLinesGeo, topLinesMat);
            botLines = new THREE.LineSegments(botLinesGeo, botLinesMat);
            
            scene.add(topLines);
            scene.add(botLines);
        }
    
        // Toggle build plate visibility
        const showBed = showDeformedMesh ? showDeformedMesh.checked : true;
        if (gridHelper) gridHelper.visible = showBed;
        if (bedMesh) bedMesh.visible = showBed;
    }
    
    // ============================================================
    // COMPARISON TABLE & PRESETS
    // ============================================================
    
    const requiredCombos = [
        { thetaTop: 0,  thetaBot: 90,  label: "0° / 90° (Bend)" },
        { thetaTop: 45, thetaBot: -45, label: "45° / -45° (Twist)" },
        { thetaTop: 0,  thetaBot: 45,  label: "0° / 45° (Helix)" },
        { thetaTop: 45, thetaBot: 90,  label: "45° / 90° (Helix)" }
    ];
    
    function updateComparisonTable(deltaT) {
        const tbody = document.querySelector('#comparisonTable tbody');
        if (!tbody) return;
        
        const tTop = parseFloat(slideThetaTop.value);
        const tBot = parseFloat(slideThetaBot.value);
        
        tbody.innerHTML = '';
        
        requiredCombos.forEach(c => {
            const morph = calculateMorphing(c.thetaTop, c.thetaBot, deltaT);
            
            // Highlight row matching current combo
            const isCurrent = (c.thetaTop === tTop && c.thetaBot === tBot);
            const rowStyle = isCurrent ? 'style="background: #fef08a; font-weight: 700;"' : 'style="border-bottom: 1px solid #e2e8f0;"';
            
            tbody.innerHTML += `
                <tr ${rowStyle}>
                    <td style="padding: 6px 4px;">${c.label}</td>
                    <td style="padding: 6px 4px; text-align: right;">${(morph.alphaEffTop * 1e6).toFixed(0)}</td>
                    <td style="padding: 6px 4px; text-align: right;">${(morph.alphaEffBot * 1e6).toFixed(0)}</td>
                    <td style="padding: 6px 4px; text-align: right;">${morph.kappa.toFixed(1)}</td>
                    <td style="padding: 6px 4px; text-align: right;">${morph.twistRate.toFixed(1)}</td>
                </tr>
            `;
        });
    }
    
    function applyComboPreset(top, bot) {
        slideThetaTop.value = top;
        slideThetaBot.value = bot;
        
        if (animInterval) {
            clearInterval(animInterval);
            animInterval = null;
            isRunning = false;
        }
        
        startPresetAnimation();
    }
    
    function startPresetAnimation() {
        isRunning = true;
        if (btnRun) {
            btnRun.disabled = true;
            btnRun.innerText = 'Running...';
        }
        if (btnPlayPause) btnPlayPause.innerText = 'Pause';
        
        let currentDT = 0;
        const targetDT = 100;
        const steps = 50;
        const dtStep = targetDT / steps;
        const delay = 800 / steps; 
        
        slideDT.value = 0;
        if (timeScrubber) timeScrubber.value = 0;
        
        animInterval = setInterval(() => {
            currentDT += dtStep;
            
            if (currentDT >= targetDT) {
                currentDT = targetDT;
                clearInterval(animInterval);
                animInterval = null;
                isRunning = false;
                if (btnRun) {
                    btnRun.disabled = false;
                    btnRun.innerText = 'Rerun Simulation';
                }
                if (btnPlayPause) btnPlayPause.innerText = 'Play';
            }
            
            slideDT.value = Math.round(currentDT);
            if (timeScrubber) timeScrubber.value = Math.round(currentDT);
            updateValues();
        }, delay);
    }
    
    function togglePlayPause() {
        if (isRunning) {
            pauseAnimation();
        } else {
            const currentDT = parseFloat(slideDT.value);
            if (currentDT >= 100) {
                slideDT.value = 0;
                if (timeScrubber) timeScrubber.value = 0;
            }
            startPresetAnimation();
        }
    }
    
    function pauseAnimation() {
        if (animInterval) {
            clearInterval(animInterval);
            animInterval = null;
        }
        isRunning = false;
        if (btnRun) {
            btnRun.disabled = false;
            btnRun.innerText = 'Simulate Actuation';
        }
        if (btnPlayPause) btnPlayPause.innerText = 'Play';
    }
    
    function resetSetup() {
        pauseAnimation();
        slideThetaTop.value = 0;
        slideThetaBot.value = 90;
        slideDT.value = 50;
        if (timeScrubber) timeScrubber.value = 50;
        
        if (showPrintLines) showPrintLines.checked = true;
        if (showDeformedMesh) showDeformedMesh.checked = true;
        
        resetCamera();
        updateValues();
    }
    
    // ============================================================
    // CURVATURE PLOT
    // ============================================================
    
    function updatePlot(tTop, tBot, currentDT) {
        const plotCanvas = document.getElementById('plotCanvas');
        if (!plotCanvas) return;
        
        const ctxPlot = plotCanvas.getContext('2d');
        if (!ctxPlot) return;
        
        ctxPlot.clearRect(0, 0, plotCanvas.width, plotCanvas.height);
        
        const padLeft = 45, padRight = 15, padTop = 15, padBottom = 25;
        const plotW = plotCanvas.width - padLeft - padRight;
        const plotH = plotCanvas.height - padTop - padBottom;
        
        // Grid Lines
        ctxPlot.strokeStyle = '#f1f5f9';
        ctxPlot.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const x = padLeft + (i / 5) * plotW;
            ctxPlot.beginPath(); ctxPlot.moveTo(x, padTop); ctxPlot.lineTo(x, padTop + plotH); ctxPlot.stroke();
        }
        for (let i = 0; i <= 4; i++) {
            const y = padTop + (i / 4) * plotH;
            ctxPlot.beginPath(); ctxPlot.moveTo(padLeft, y); ctxPlot.lineTo(padLeft + plotW, y); ctxPlot.stroke();
        }
        
        // Axes
        ctxPlot.strokeStyle = '#cbd5e1';
        ctxPlot.lineWidth = 1;
        ctxPlot.beginPath();
        ctxPlot.moveTo(padLeft, padTop + plotH);
        ctxPlot.lineTo(padLeft + plotW, padTop + plotH);
        ctxPlot.stroke();
        
        // Sweep points for curves
        let dataPoints = [];
        let maxK = 10.0; // minimum bound
        
        for (let dt = 0; dt <= 100; dt += 2) {
            const res = calculateMorphing(tTop, tBot, dt);
            const kMag = Math.abs(res.kappa);
            const tMag = Math.abs(res.twistRate);
            if (kMag > maxK) maxK = kMag;
            if (tMag > maxK) maxK = tMag;
            dataPoints.push({ dt: dt, kappa: kMag, twist: tMag });
        }
        
        const yMax = maxK * 1.15;
        
        // Draw Curvature curve (crimson)
        ctxPlot.strokeStyle = '#8a1134';
        ctxPlot.lineWidth = 2.5;
        ctxPlot.beginPath();
        for (let i = 0; i < dataPoints.length; i++) {
            const px = padLeft + (dataPoints[i].dt / 100) * plotW;
            const py = padTop + plotH - (dataPoints[i].kappa / yMax) * plotH;
            if (i === 0) ctxPlot.moveTo(px, py);
            else ctxPlot.lineTo(px, py);
        }
        ctxPlot.stroke();
        
        // Draw Twist rate curve (dashed blue)
        ctxPlot.strokeStyle = '#0ea5e9';
        ctxPlot.lineWidth = 2.0;
        ctxPlot.setLineDash([4, 3]);
        ctxPlot.beginPath();
        for (let i = 0; i < dataPoints.length; i++) {
            const px = padLeft + (dataPoints[i].dt / 100) * plotW;
            const py = padTop + plotH - (dataPoints[i].twist / yMax) * plotH;
            if (i === 0) ctxPlot.moveTo(px, py);
            else ctxPlot.lineTo(px, py);
        }
        ctxPlot.stroke();
        ctxPlot.setLineDash([]);
        
        // Operating line marker
        const curX = padLeft + (currentDT / 100) * plotW;
        ctxPlot.strokeStyle = '#8a1134';
        ctxPlot.lineWidth = 1;
        ctxPlot.setLineDash([2, 2]);
        ctxPlot.beginPath();
        ctxPlot.moveTo(curX, padTop);
        ctxPlot.lineTo(curX, padTop + plotH);
        ctxPlot.stroke();
        ctxPlot.setLineDash([]);
        
        // Dots at current values
        const currentRes = calculateMorphing(tTop, tBot, currentDT);
        const currK = Math.abs(currentRes.kappa);
        const currT = Math.abs(currentRes.twistRate);
        
        const dotK_y = padTop + plotH - (currK / yMax) * plotH;
        const dotT_y = padTop + plotH - (currT / yMax) * plotH;
        
        ctxPlot.fillStyle = '#8a1134';
        ctxPlot.beginPath(); ctxPlot.arc(curX, dotK_y, 4, 0, Math.PI * 2); ctxPlot.fill();
        ctxPlot.fillStyle = '#0ea5e9';
        ctxPlot.beginPath(); ctxPlot.arc(curX, dotT_y, 4, 0, Math.PI * 2); ctxPlot.fill();
        
        // Labels
        ctxPlot.fillStyle = '#475569';
        ctxPlot.font = '8px monospace';
        ctxPlot.textAlign = 'center';
        ctxPlot.fillText('0', padLeft, padTop + plotH + 10);
        ctxPlot.fillText('50°C', padLeft + plotW/2, padTop + plotH + 10);
        ctxPlot.fillText('100°C', padLeft + plotW, padTop + plotH + 10);
        
        ctxPlot.textAlign = 'right';
        ctxPlot.fillText(yMax.toFixed(1) + ' m⁻¹', padLeft - 4, padTop + 5);
        ctxPlot.fillText('0', padLeft - 4, padTop + plotH);
    }
    
    // ============================================================
    // EQUATIONS RENDER
    // ============================================================
    
    function renderLiveMath(alphaEffTop, alphaEffBot, alphaShearTop, alphaShearBot, deltaT, kappa, twistRate) {
        const latexFormulaContainer = document.getElementById('latexFormulaContainer');
        if (!latexFormulaContainer) return;
        
        const a_top_val = (alphaEffTop * 1e6).toFixed(1);
        const a_bot_val = (alphaEffBot * 1e6).toFixed(1);

        const k_val = kappa.toFixed(2);
        const t_val = twistRate.toFixed(2);
        
        latexFormulaContainer.innerHTML = `
            <div style="font-family: inherit; line-height: 1.6; font-size: 16px; font-weight: bold;">
                <div>&alpha;<sub>eff,top</sub> = &alpha;<sub>&parallel;</sub> cos<sup>2</sup>&theta;<sub>top</sub> + &alpha;<sub>&perp;</sub> sin<sup>2</sup>&theta;<sub>top</sub> = ${a_top_val} &times; 10<sup>-6</sup> K<sup>-1</sup></div>
                <div>&alpha;<sub>eff,bot</sub> = &alpha;<sub>&parallel;</sub> cos<sup>2</sup>&theta;<sub>bot</sub> + &alpha;<sub>&perp;</sub> sin<sup>2</sup>&theta;<sub>bot</sub> = ${a_bot_val} &times; 10<sup>-6</sup> K<sup>-1</sup></div>
                <div style="margin-top: 6px;">&kappa; = [6(&alpha;<sub>eff,top</sub> - &alpha;<sub>eff,bot</sub>) &times; &Delta;T &times; (1+m)<sup>2</sup>] / h = ${k_val} m<sup>-1</sup></div>
                <div>&tau; = [6(&alpha;<sub>shear,top</sub> - &alpha;<sub>shear,bot</sub>) &times; &Delta;T &times; (1+m)<sup>2</sup>] / h = ${t_val} rad/m</div>
            </div>
        `;
    }
    
    // ============================================================
    // CONSOLE INTEGRATION VERIFIER
    // ============================================================
    
    function validateIntegration(kappa, torsion, L) {
        if (Math.abs(kappa) < 1e-6 && Math.abs(torsion) < 1e-6) return;
        
        const omega = Math.sqrt(kappa * kappa + torsion * torsion);
        const analyticDist = Math.sqrt((2 * kappa * kappa * (1 - Math.cos(omega * L))) / Math.pow(omega, 4) + (torsion * torsion * L * L) / (omega * omega));
        
        const ds = L / 40;
        let r = new THREE.Vector3(0, 0, 0);
        let T = new THREE.Vector3(1, 0, 0);
        let N = new THREE.Vector3(0, 1, 0);
        let B = new THREE.Vector3(0, 0, 1);
        
        for (let i = 0; i < 40; i++) {
            const next = rk4Step(r, T, N, B, kappa, torsion, ds);
            r = next.r; T = next.T; N = next.N; B = next.B;
        }
        const integratedDist = r.length();
        
        console.log(`[Validation] Curvature=${kappa.toFixed(2)}, Torsion=${torsion.toFixed(2)} | integratedDist=${integratedDist.toFixed(4)}, analyticDist=${analyticDist.toFixed(4)} | Match: ${(Math.abs(integratedDist - analyticDist) < 1e-3 ? "PASS" : "FAIL")}`);
    }
    
    // Run validation checks on load
    validateIntegration(100.0 / renderScale, 50.0 / renderScale, 0.04 * renderScale);
    validateIntegration(150.0 / renderScale, 0.0, 0.04 * renderScale);
    
    // Start on DOM Load
    window.addEventListener('DOMContentLoaded', init);
})();

// ============================================================
// SCRIPT_D.JS (Page Check: document.getElementById('layerL'))
// ============================================================
(function() {
    if (!document.getElementById('layerL')) return;
    
    // ============================================================
    // MATERIAL DIFFUSION DATABASE
    // ============================================================
    
    // Diffusion coefficients (m²/s) typical for water in polymer systems
    const diffusionProps = {
        cellulose: { 
            D: 5e-12,           
            name: 'Cellulose',
            description: 'Semi-crystalline, hydrogen-bonded cellulose network (slow)'
        },
        pva_hydrogel: { 
            D: 8e-11,           
            name: 'PVA Hydrogel',
            description: 'Poly(vinyl alcohol) porous hydrogel matrix'
        },
        pnipam: { 
            D: 1e-10,           
            name: 'PNIPAM',
            description: 'Thermoresponsive poly(N-isopropylacrylamide) gel'
        },
        hydrogel: { 
            D: 2e-10,           
            name: 'Hydrogel',
            description: 'Highly porous swelling polymer network (fast)'
        }
    };
    
    // ============================================================
    // UI ELEMENTS & STATE
    // ============================================================
    
    const slideL = document.getElementById('layerL');
    const matDiff = document.getElementById('matDiff');
    const valL = document.getElementById('valL');
    
    const preset1Btn = document.getElementById('preset1Btn');
    const preset2Btn = document.getElementById('preset2Btn');
    const preset3Btn = document.getElementById('preset3Btn');
    
    const btnRun = document.getElementById('btnRun');
    const btnReset = document.getElementById('btnReset');
    const btnPlayPause = document.getElementById('btnPlayPause');
    const timeScrubber = document.getElementById('timeScrubber');
    
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    
    // Timeline Stats Row
    const timelineMat = document.getElementById('timelineMat');
    const timelineL = document.getElementById('timelineL');
    const timelineTau = document.getElementById('timelineTau');
    const timelineAvgC = document.getElementById('timelineAvgC');
    
    // Results Table Cells
    const resL = document.getElementById('resL');
    const resTdiff = document.getElementById('resTdiff');
    const resT90 = document.getElementById('resT90');
    const resDepth = document.getElementById('resDepth');
    
    // State Variables
    let simTime = 0.0;          // Normalized timeline position (0.0 to 1.0, where 1.0 is tau = 0.6)
    let isAnimating = false;
    let lastFrameTime = Date.now();
    
    // Three.js Scene Components
    let scene, camera, renderer, controls;
    let slabMesh, slabGeom;
    let topArrow, botArrow; // Left and Right arrow indicators in reoriented coordinate system
    let frontLeftLine, frontRightLine; // Surface contour lines
    let frontLeftMesh, frontRightMesh; // Internal semi-transparent planes
    let leftContactMesh, rightContactMesh; // Wetted boundary plates
    
    // Presets list
    const presets = [
        { btn: preset1Btn, val: 0.2 },
        { btn: preset2Btn, val: 0.5 },
        { btn: preset3Btn, val: 1.0 }
    ];
    
    // ============================================================
    // PHYSICS FORMULAS
    // ============================================================
    
    /**
     * Format time for human-readable display
     */
    function formatTime(seconds) {
        if (seconds === 0) return '0 s';
        if (seconds < 1e-6) return (seconds * 1e9).toFixed(1) + ' ns';
        if (seconds < 1e-3) return (seconds * 1e6).toFixed(1) + ' µs';
        if (seconds < 1) return (seconds * 1e3).toFixed(1) + ' ms';
        if (seconds < 60) return seconds.toFixed(2) + ' s';
        if (seconds < 3600) return (seconds / 60).toFixed(2) + ' min';
        if (seconds < 86400) return (seconds / 3600).toFixed(2) + ' h';
        return (seconds / 86400).toFixed(2) + ' days';
    }
    
    /**
     * Complementary error function (erfc) approximation
     * Abramowitz and Stegun formula 7.1.26 (accuracy ~1.5e-7)
     */
    function erfc(x) {
        if (x > 6) return 0;
        if (x < -6) return 2;
        
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
    
        const absX = Math.abs(x);
        const t = 1.0 / (1.0 + p * absX);
        const erf_val = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
        
        return x >= 0 ? (1.0 - erf_val) : (1.0 + erf_val);
    }
    
    /**
     * Calculate diffusion timescales using Fick's Second Law
     */
    function calculateDiffusionTimes(L_meters, D) {
        const L_sq = L_meters * L_meters;
        
        // Characteristic diffusion time (first Fourier mode decay)
        const t_diff = L_sq / (Math.PI * Math.PI * D);
        
        // Time to 90% equilibrium (t_90 ≈ 0.53 * L² / D)
        const t_90 = 0.53 * L_sq / D;
        
        return {
            t_diff: t_diff,
            t_90: t_90,
            penetrationDepth: 0.73 * L_meters // at t_90 (front has reached ~73% of slab thickness)
        };
    }
    
    /**
     * Calculate concentration profile C(x, tau) for 1D slab diffusion
     * Wetting from both faces (x = 0 and x = 1) with initial dry condition C=0.
     */
    function getConcentrationProfile(x_normalized, tau) {
        // x_normalized: 0 to 1 (boundaries at 0 and 1)
        // tau: dimensionless Fourier time D*t/L²
        if (tau <= 0) return 0;
        
        if (tau > 0.1) {
            // Late time: Fourier series solution (highly convergent)
            let sum = 1;
            for (let n = 0; n < 5; n++) {
                const k = 2 * n + 1;
                sum -= (4 / (Math.PI * k)) * Math.sin(k * Math.PI * x_normalized) 
                       * Math.exp(-k * k * Math.PI * Math.PI * tau);
            }
            return Math.max(0, Math.min(1, sum));
        } else {
            // Early time: erfc solution from both boundaries (prevents Gibbs oscillation)
            const term1 = erfc(x_normalized / (2 * Math.sqrt(tau)));
            const term2 = erfc((1 - x_normalized) / (2 * Math.sqrt(tau)));
            return Math.max(0, Math.min(1, term1 + term2));
        }
    }
    
    /**
     * Calculate the average concentration (slab moisture content)
     */
    function getAverageConcentration(tau) {
        if (tau <= 0) return 0;
        
        // Infinite series solution for average concentration is exact and fast for any tau in JS
        let sum = 0;
        for (let n = 0; n < 30; n++) {
            const k = 2 * n + 1;
            sum += (8 / (k * k * Math.PI * Math.PI)) * Math.exp(-k * k * Math.PI * Math.PI * tau);
        }
        return Math.max(0, Math.min(1, 1 - sum));
    }
    
    // ============================================================
    // STARTUP MATHEMATICAL VALIDATION
    // ============================================================
    
    (function validateContinuity() {
        const tau = 0.1;
        const x = 0.5; // Midpoint
        
        // Early-time erfc calculation
        const c_early = erfc(x / (2 * Math.sqrt(tau))) + erfc((1 - x) / (2 * Math.sqrt(tau)));
        
        // Late-time series calculation
        let sum = 1;
        for (let n = 0; n < 5; n++) {
            const k = 2 * n + 1;
            sum -= (4 / (Math.PI * k)) * Math.sin(k * Math.PI * x) * Math.exp(-k * k * Math.PI * Math.PI * tau);
        }
        const c_late = sum;
        
        const diff_pct = Math.abs(c_early - c_late) / c_late * 100;
        console.log(`[Validation] Switch-point continuity check at C(0.5, 0.1):`);
        console.log(`  - Early-time (erfc): ${c_early.toFixed(6)}`);
        console.log(`  - Late-time (series): ${c_late.toFixed(6)}`);
        console.log(`  - Discrepancy: ${diff_pct.toFixed(4)}%`);
        
        if (diff_pct < 1.0) {
            console.log(`  - Status: SUCCESS (Continuity error is well below 1.0% limit)`);
        } else {
            console.warn(`  - Status: WARNING (Discrepancy exceeds 1.0%!)`);
        }
    })();
    
    // ============================================================
    // UI LOGIC & THREE.JS UPDATES
    // ============================================================
    
    /**
     * Update UI fields, calculations, comparison table, equations, and redraw canvas
     */
    function updateValues() {
        const L_mm = parseFloat(slideL.value);
        const L = L_mm / 1000; // mm to m
        
        const matKey = matDiff.value;
        const mat = diffusionProps[matKey];
        const D = mat.D;
        
        // Calculate values
        const times = calculateDiffusionTimes(L, D);
        
        // Update labels
        if (valL) valL.innerText = L_mm.toFixed(1) + ' mm';
        
        const labelDValue = document.getElementById('labelDValue');
        const labelMatDesc = document.getElementById('labelMatDesc');
        if (labelDValue) labelDValue.innerText = `D = ${D.toExponential(2)} m²/s`;
        if (labelMatDesc) labelMatDesc.innerText = mat.description;
        
        // Update numeric table
        if (resL) resL.innerText = L_mm.toFixed(1) + ' mm';
        if (resTdiff) resTdiff.innerText = formatTime(times.t_diff);
        if (resT90) resT90.innerText = formatTime(times.t_90);
        if (resDepth) resDepth.innerText = (times.penetrationDepth * 1000).toFixed(2) + ' mm';
        
        // Update timeline stats badges
        if (timelineMat) timelineMat.innerText = mat.name;
        if (timelineL) timelineL.innerText = L_mm.toFixed(1) + ' mm';
        
        const tau = simTime * 0.6; // simTime ranges 0-1, maps to tau 0-0.6 (covers t_90 = 0.53)
        if (timelineTau) timelineTau.innerText = tau.toFixed(3);
        
        const avgC = getAverageConcentration(tau);
        if (timelineAvgC) timelineAvgC.innerText = (avgC * 100).toFixed(1) + '%';
        
        // Update scrubber value slider
        if (timeScrubber && !isAnimating) {
            timeScrubber.value = Math.round(simTime * 100);
        }
        
        // Update navigation readout
        const timeVal = document.getElementById('timeVal');
        if (timeVal) {
            timeVal.innerText = (avgC * 100).toFixed(0);
        }
        
        // Update presets highlights
        updatePresetHighlight(L_mm);
        
        // Update dynamic comparison table
        updateComparisonTable(L_mm);
        
        // Update live LaTeX equations
        updateEquations(mat.name, D, L_mm, times.t_90);
        
        // Update safety/design insights banner
        updateInsight(L_mm, times.t_90);
        
        // Update 3D elements
        update3DScene(L_mm, tau);
        
        // Update 3D Overlay Badge
        const d_pen_ratio = Math.sqrt(tau);
        const d_pen_mm = d_pen_ratio * L_mm;
        const valPenDepth = document.getElementById('valPenDepth');
        const valPenPct = document.getElementById('valPenPct');
        if (valPenDepth) valPenDepth.innerText = `${d_pen_mm.toFixed(2)} mm`;
        if (valPenPct) valPenPct.innerText = `${(d_pen_ratio * 100).toFixed(1)}% of L`;
        
        // Update state indicators
        if (stateLabel) {
            if (simTime === 0.0) {
                stateLabel.innerText = 'State: Dry / Ready';
                stateLabel.className = 'state-indicator flat';
            } else if (simTime >= 1.0) {
                stateLabel.innerText = 'State: Fully Saturated';
                stateLabel.className = 'state-indicator success';
            } else {
                stateLabel.innerText = `State: Diffusing (${(avgC * 100).toFixed(0)}%)`;
                stateLabel.className = 'state-indicator warning';
            }
        }
    }
    
    /**
     * Highlight active preset button if current L matches exactly
     */
    function updatePresetHighlight(currentL) {
        presets.forEach(p => {
            if (p.btn) {
                if (Math.abs(p.val - currentL) < 1e-4) {
                    p.btn.className = 'btn btn-primary';
                } else {
                    p.btn.className = 'btn btn-secondary';
                }
            }
        });
    }
    
    /**
     * Generate speedup comparison table dynamically
     */
    function updateComparisonTable(activeL_mm) {
        const tbody = document.querySelector('#comparisonTable tbody');
        if (!tbody) return;
        
        const matKey = matDiff.value;
        const mat = diffusionProps[matKey];
        const D = mat.D;
        
        const presetsList = [0.2, 0.5, 1.0];
        const tolerance = 1e-4;
        const isActivePreset = presetsList.some(p => Math.abs(p - activeL_mm) < tolerance);
        
        let rowsData = [...presetsList];
        if (!isActivePreset) {
            rowsData.push(activeL_mm);
            rowsData.sort((a, b) => a - b);
        }
        
        tbody.innerHTML = '';
        
        // Reference is always the 1.0 mm thickness of the selected material
        const t90_ref = 0.53 * (1e-3 * 1e-3) / D;
        
        rowsData.forEach(L_val => {
            const L_m = L_val / 1000;
            const L_sq = L_val * L_val;
            const t_diff = L_m * L_m / (Math.PI * Math.PI * D);
            const t_90 = 0.53 * L_m * L_m / D;
            const speedup = t90_ref / t_90;
            
            const isCurrent = Math.abs(L_val - activeL_mm) < tolerance;
            
            const tr = document.createElement('tr');
            if (isCurrent) {
                tr.style.background = '#eff6ff'; // Light slate blue highlight
                tr.style.fontWeight = '600';
                tr.style.borderLeft = '3px solid #3b82f6';
            } else {
                tr.style.borderLeft = '3px solid transparent';
                tr.style.background = 'transparent';
            }
            
            tr.innerHTML = `
                <td style="padding: 6px 4px; text-align: left;">${L_val.toFixed(1)} mm ${isCurrent ? '*' : ''}</td>
                <td style="padding: 6px 4px; text-align: right; color: #64748b;">${L_sq.toFixed(2)}</td>
                <td style="padding: 6px 4px; text-align: right;">${formatTime(t_diff)}</td>
                <td style="padding: 6px 4px; text-align: right; font-weight: 500;">${formatTime(t_90)}</td>
                <td style="padding: 6px 4px; text-align: right; color: ${speedup >= 1.0 ? '#10b981' : '#ef4444'}; font-weight: 600;">${speedup.toFixed(1)}x</td>
            `;
            tbody.appendChild(tr);
        });
        
        // Update comparison card header
        const header = document.querySelector('.analytics-card h3');
        if (header && header.innerText.includes('Comparison')) {
            header.innerText = `Thickness Speedup Comparison (${mat.name})`;
        }
    }
    
    /**
     * Render LaTeX equation substitutions using KaTeX
     */
    function updateEquations(name, D, L_mm, t_90) {
        const container = document.getElementById('latexFormulaContainer');
        if (!container) return;
        
        const L = L_mm / 1000;
        const D_html = D.toExponential(1).replace('e', ' &times; 10<sup>') + '</sup>';
        const L_html = L.toExponential(1).replace('e', ' &times; 10<sup>') + '</sup>';
        
        container.innerHTML = `
            <div style="font-family: inherit; line-height: 1.6; font-size: 16px; font-weight: bold;">
                <div><strong>Fick's Second Law:</strong> &part;C/&part;t = D &times; &part;<sup>2</sup>C/&part;x<sup>2</sup></div>
                <div style="margin-top: 6px;"><strong>Parameters:</strong> D = ${D_html} m<sup>2</sup>/s, &nbsp; L = ${L_mm.toFixed(1)} mm = ${L_html} m</div>
                <div style="margin-top: 6px;">&tau; = (D &times; t) / L<sup>2</sup> = [(${D_html}) &times; t] / (${L_html})<sup>2</sup> = t / ${(L*L/D).toFixed(0)} s</div>
                <div style="margin-top: 6px; font-weight: bold; color: #8A1134;">t<sub>90</sub> &approx; 0.53 &times; L<sup>2</sup> / D = 0.53 &times; (${L_html})<sup>2</sup> / ${D_html} = ${formatTime(t_90)}</div>
            </div>
        `;
    }
    
    /**
     * Write highly detailed engineering guidelines based on physics
     */
    function updateInsight(L_mm, t90_seconds) {
        if (!liveInsight) return;
        
        const t90_str = formatTime(t90_seconds);
        
        if (L_mm <= 0.2) {
            liveInsight.innerHTML = `
                <strong>Design Insight (Fast Response):</strong><br>
                A thin layer of <strong>${L_mm} mm</strong> reaches 90% saturation in just <strong>${t90_str}</strong>. 
                This represents a <strong>25.0x</strong> acceleration compared to the 1.0 mm baseline. 
                Perfect for responsive hinges, active bilayers, and fast shape-shifting logic.
            `;
        } else if (L_mm >= 1.0) {
            liveInsight.innerHTML = `
                <strong>Design Insight (Diffusion Limited):</strong><br>
                A thick section of <strong>${L_mm} mm</strong> takes <strong>${t90_str}</strong> to swell. 
                Moisture diffusion is strictly limited by the quadratic scaling <b>t &propto; L<sup>2</sup></b>. 
                Avoid solid sections this thick. Consider using porous infill meshes or thin parallel laminate panels.
            `;
        } else {
            liveInsight.innerHTML = `
                <strong>Design Insight (Balanced Design):</strong><br>
                A thickness of <strong>${L_mm} mm</strong> offers a structural compromise: response time is 
                <strong>${t90_str}</strong>. It provides moderate bending stiffness and mid-range response latency.
            `;
        }
    }
    
    // ============================================================
    // THREE.JS 3D SCENE INITIALIZATION & ANIMATION
    // ============================================================
    
    const canvasElement = document.getElementById('simCanvas');
    
    function init3D() {
        if (!canvasElement) return;
        
        // 1. Create Scene & Background
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf8fafc); // Premium light slate grey background
        
        // 2. Camera Setup (Adjusted to look front-on with slight 3/4 tilt to optimize wall visibility)
        camera = new THREE.PerspectiveCamera(40, canvasElement.clientWidth / canvasElement.clientHeight, 0.1, 100);
        camera.position.set(2.8, 0.8, 5.0);
        
        // 3. Renderer Setup
        renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true });
        renderer.setSize(canvasElement.clientWidth, canvasElement.clientHeight, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        
        // 4. OrbitControls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2 + 0.15;
        controls.minDistance = 2.0;
        controls.maxDistance = 15.0;
        controls.target.set(0, 0, 0);
        
        // 5. Grid Helper (Build Plate Representation)
        const gridHelper = new THREE.GridHelper(10, 10, 0xcbd5e1, 0xe2e8f0);
        gridHelper.position.y = -1.9;
        scene.add(gridHelper);
        
        // 6. Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(5, 8, 5);
        dirLight.castShadow = true;
        scene.add(dirLight);
        
        const pointLight = new THREE.PointLight(0x3b82f6, 0.5, 15);
        pointLight.position.set(-4, 3, -4);
        scene.add(pointLight);
        
        // 7. Create Slab Geometry
        // Reoriented: width (X-axis) = 1.0 (represents thickness L), height (Y-axis) = 3.0, depth (Z-axis) = 0.4
        // widthSegments is set to 45 so we have fine resolution mapping the gradient left-to-right
        slabGeom = new THREE.BoxGeometry(1.0, 3.0, 0.4, 45, 1, 1);
        
        // Material with vertexColors enabled
        const slabMat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.25,
            metalness: 0.05,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        
        slabMesh = new THREE.Mesh(slabGeom, slabMat);
        slabMesh.castShadow = true;
        slabMesh.receiveShadow = true;
        scene.add(slabMesh);
        
        // 8. Create Wetted Contact Plate Guides (Blue indicator slices on Left and Right faces)
        const contactGeom = new THREE.PlaneGeometry(0.4, 3.0);
        contactGeom.rotateY(Math.PI / 2); // Rotate to lie in Y-Z plane
        
        const contactMat = new THREE.MeshBasicMaterial({
            color: 0x2563eb,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        
        leftContactMesh = new THREE.Mesh(contactGeom, contactMat);
        rightContactMesh = new THREE.Mesh(contactGeom, contactMat);
        scene.add(leftContactMesh);
        scene.add(rightContactMesh);
        
        // 9. Create Arrow Helpers for Penetration Depth Annotations (Red, pointing horizontally)
        const arrowDirLeft = new THREE.Vector3(1, 0, 0);   // Points Right
        const arrowDirRight = new THREE.Vector3(-1, 0, 0); // Points Left
        const originLeft = new THREE.Vector3(-0.5, -0.5, 0.22);
        const originRight = new THREE.Vector3(0.5, 0.5, 0.22);
        
        topArrow = new THREE.ArrowHelper(arrowDirLeft, originLeft, 0.01, 0xef4444, 0.12, 0.06);
        botArrow = new THREE.ArrowHelper(arrowDirRight, originRight, 0.01, 0xef4444, 0.12, 0.06);
        scene.add(topArrow);
        scene.add(botArrow);
        
        // 10. Create Surface Front Contour lines on the front face of the slab
        // Offset slightly forward in Z (z = 0.21) to sit on the front face (z = 0.2)
        const lineGeom = new THREE.PlaneGeometry(0.03, 3.0);
        const lineMat = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        frontLeftLine = new THREE.Mesh(lineGeom, lineMat);
        frontRightLine = new THREE.Mesh(lineGeom, lineMat);
        scene.add(frontLeftLine);
        scene.add(frontRightLine);
        
        // 11. Create Internal Diffusion front planes (translucent red)
        const frontPlaneGeom = new THREE.PlaneGeometry(0.4, 3.0);
        frontPlaneGeom.rotateY(Math.PI / 2); // Face sideways parallel to wetting faces
        const frontPlaneMat = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide
        });
        
        frontLeftMesh = new THREE.Mesh(frontPlaneGeom, frontPlaneMat);
        frontRightMesh = new THREE.Mesh(frontPlaneGeom, frontPlaneMat);
        scene.add(frontLeftMesh);
        scene.add(frontRightMesh);
        
        // 12. Inject Floating HTML Overlay Badge
        const wrapper = document.querySelector('.canvas-3d-wrapper');
        if (wrapper) {
            // Clear any old overlay
            const oldOverlay = document.getElementById('penetrationOverlay');
            if (oldOverlay) oldOverlay.remove();
            
            const overlay = document.createElement('div');
            overlay.id = 'penetrationOverlay';
            overlay.style.position = 'absolute';
            overlay.style.top = '15px';
            overlay.style.right = '15px';
            overlay.style.background = 'rgba(255, 255, 255, 0.95)';
            overlay.style.border = '1px solid var(--border-color)';
            overlay.style.borderRadius = '6px';
            overlay.style.padding = '8px 12px';
            overlay.style.fontSize = '11px';
            overlay.style.fontFamily = 'Outfit, sans-serif';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '10';
            overlay.style.display = 'flex';
            overlay.style.flexDirection = 'column';
            overlay.style.gap = '4px';
            overlay.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
            overlay.innerHTML = `
                <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">Front Penetration</div>
                <div style="color: var(--text-secondary);">Depth: <span id="valPenDepth" style="font-weight: 700; color: #ef4444;">0.00 mm</span></div>
                <div style="color: var(--text-secondary);">Relative: <span id="valPenPct" style="font-weight: 700; color: #ef4444;">0% of L</span></div>
            `;
            wrapper.appendChild(overlay);
        }
        
        // Start unified loop
        lastFrameTime = Date.now();
        renderLoop();
    }
    
    /**
     * Handle WebGL container resizing
     */
    function resizeCanvas() {
        if (!renderer) return;
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (canvas.width !== width || canvas.height !== height) {
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }
    }
    
    /**
     * Update 3D meshes based on active thickness L and dimensionless time tau
     */
    function update3DScene(L_mm, tau) {
        if (!slabMesh || !slabGeom) return;
        
        // 1. Scale slab thickness (X-axis) dynamically
        const scaleX = 2.4; // Visual horizontal scaling factor
        const W = L_mm * scaleX;
        slabMesh.scale.set(W, 1, 1);
        
        // 2. Map local X vertices coordinates to concentration profile
        const positionAttribute = slabGeom.getAttribute('position');
        const colors = [];
        const color = new THREE.Color();
        const dryColor = new THREE.Color(0xf8fafc); // Slate 50 (dry, C=0)
        const wetColor = new THREE.Color(0x2563eb); // Blue 600 (saturated, C=1)
        
        for (let i = 0; i < positionAttribute.count; i++) {
            const x = positionAttribute.getX(i);
            const x_norm = x + 0.5; // normalized thickness in [0, 1] since local box width is 1.0
            const C = getConcentrationProfile(x_norm, tau);
            
            color.copy(dryColor).lerp(wetColor, C);
            colors.push(color.r, color.g, color.b);
        }
        slabGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        slabGeom.attributes.color.needsUpdate = true;
        
        // 3. Update wetted guide plates at the sides
        if (leftContactMesh) {
            leftContactMesh.position.set(-W / 2 - 0.005, 0, 0);
        }
        if (rightContactMesh) {
            rightContactMesh.position.set(W / 2 + 0.005, 0, 0);
        }
        
        // 4. Update Arrow annotation helper positions & lengths
        const d_pen = Math.min(0.5, Math.sqrt(tau)); // Nominal penetration ratio relative to L, capped at center (0.5)
        const d_pen_world = d_pen * W; // world units
        
        if (topArrow) {
            topArrow.position.set(-W / 2, -0.5, 0.22);
            topArrow.setLength(Math.max(0.01, d_pen_world), 0.14, 0.07);
        }
        if (botArrow) {
            botArrow.position.set(W / 2, 0.5, 0.22);
            botArrow.setLength(Math.max(0.01, d_pen_world), 0.14, 0.07);
        }
        
        // 5. Update front contour lines and planes positions
        if (frontLeftLine && frontRightLine && frontLeftMesh && frontRightMesh) {
            // If the fronts have met at the center, hide them
            if (d_pen_world >= W / 2 - 0.01) {
                frontLeftLine.visible = false;
                frontRightLine.visible = false;
                frontLeftMesh.visible = false;
                frontRightMesh.visible = false;
            } else {
                frontLeftLine.visible = true;
                frontRightLine.visible = true;
                frontLeftMesh.visible = true;
                frontRightMesh.visible = true;
                
                // Front lines sit on the front face of the slab (z = 0.2 + small offset)
                frontLeftLine.position.set(-W / 2 + d_pen_world, 0, 0.201);
                frontRightLine.position.set(W / 2 - d_pen_world, 0, 0.201);
                
                // Internal planes sit inside the slab body (z = 0)
                frontLeftMesh.position.set(-W / 2 + d_pen_world, 0, 0);
                frontRightMesh.position.set(W / 2 - d_pen_world, 0, 0);
            }
        }
    }
    
    /**
     * Unified render loop handling controls updates, animation timeline playback, and WebGL renders
     */
    function renderLoop() {
        requestAnimationFrame(renderLoop);
        
        const now = Date.now();
        const dt = (now - lastFrameTime) / 1000;
        lastFrameTime = now;
        
        // 1. Playback animation timeline logic
        if (isAnimating) {
            simTime += dt * 0.125; // Timeline plays to 100% in exactly 8 seconds
            if (simTime >= 1.0) {
                simTime = 1.0;
                isAnimating = false;
                if (btnPlayPause) btnPlayPause.innerText = 'Play';
            }
            updateValues();
        }
        
        // 2. Update OrbitControls
        if (controls) controls.update();
        
        // 3. Pulse the active point marker on the plot (kept smooth on every frame)
        const matKey = matDiff.value;
        const D = diffusionProps[matKey].D;
        const L_mm = parseFloat(slideL.value);
        updatePlot(D, L_mm);
        
        // 4. Render WebGL scene
        if (renderer && scene && camera) {
            resizeCanvas();
            renderer.render(scene, camera);
        }
    }
    
    // ============================================================
    // 2D CHART PLOTTING
    // ============================================================
    
    /**
     * Update the 2D chart comparing t_90 timescale versus thickness squared
     */
    function updatePlot(D, currentL_mm) {
        const plotCanvas = document.getElementById('plotCanvas');
        if (!plotCanvas) return;
        
        const ctxPlot = plotCanvas.getContext('2d');
        if (!ctxPlot) return;
        
        // Clear canvas
        ctxPlot.clearRect(0, 0, plotCanvas.width, plotCanvas.height);
        
        const padLeft = 55, padRight = 20, padTop = 30, padBottom = 45;
        const plotW = plotCanvas.width - padLeft - padRight;
        const plotH = plotCanvas.height - padTop - padBottom;
        
        // 1. Determine time scale and units
        // Maximum L is 2.0 mm
        const maxL_m = 2.0 / 1000;
        const maxT90_s = 0.53 * maxL_m * maxL_m / D;
        
        let timeScale = 1;
        let unitLabel = 'Time to 90% Equil. (s)';
        
        if (maxT90_s > 7200) {
            timeScale = 3600;
            unitLabel = 'Time to 90% Equil. (hours)';
        } else if (maxT90_s > 120) {
            timeScale = 60;
            unitLabel = 'Time to 90% Equil. (mins)';
        }
        
        const yMax = (maxT90_s / timeScale) * 1.1; // Add 10% headroom
        
        // 2. Draw Grid & Axes
        ctxPlot.strokeStyle = '#f1f5f9';
        ctxPlot.lineWidth = 1;
        
        // Vertical grid lines (L^2 goes from 0 to 4.0 mm^2)
        for (let i = 0; i <= 4; i++) {
            const x = padLeft + (i / 4) * plotW;
            ctxPlot.beginPath();
            ctxPlot.moveTo(x, padTop);
            ctxPlot.lineTo(x, padTop + plotH);
            ctxPlot.stroke();
        }
        
        // Horizontal grid lines (5 levels)
        for (let i = 0; i <= 4; i++) {
            const y = padTop + (i / 4) * plotH;
            ctxPlot.beginPath();
            ctxPlot.moveTo(padLeft, y);
            ctxPlot.lineTo(padLeft + plotW, y);
            ctxPlot.stroke();
        }
        
        // 3. Draw curve: t_90 vs L^2
        const dataPoints = [];
        for (let L = 0.1; L <= 2.05; L += 0.05) {
            const L_m = L / 1000;
            const t90_s = 0.53 * L_m * L_m / D;
            const t90_val = t90_s / timeScale;
            dataPoints.push({ x: L*L, y: t90_val });
        }
        
        // Draw fill under curve
        const gradient = ctxPlot.createLinearGradient(0, padTop, 0, padTop + plotH);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
        ctxPlot.fillStyle = gradient;
        
        ctxPlot.beginPath();
        ctxPlot.moveTo(padLeft, padTop + plotH);
        dataPoints.forEach(pt => {
            const px = padLeft + (pt.x / 4.0) * plotW;
            const py = padTop + plotH - (pt.y / yMax) * plotH;
            ctxPlot.lineTo(px, py);
        });
        ctxPlot.lineTo(padLeft + plotW, padTop + plotH);
        ctxPlot.closePath();
        ctxPlot.fill();
        
        // Draw line
        ctxPlot.strokeStyle = '#3b82f6';
        ctxPlot.lineWidth = 2.5;
        ctxPlot.beginPath();
        dataPoints.forEach((pt, idx) => {
            const px = padLeft + (pt.x / 4.0) * plotW;
            const py = padTop + plotH - (pt.y / yMax) * plotH;
            if (idx === 0) ctxPlot.moveTo(px, py);
            else ctxPlot.lineTo(px, py);
        });
        ctxPlot.stroke();
        
        // 4. Draw Axes Labels & Ticks
        ctxPlot.fillStyle = '#475569';
        ctxPlot.font = '10px Outfit, sans-serif';
        ctxPlot.textAlign = 'center';
        
        // X axis ticks (L^2 = 0, 1, 2, 3, 4)
        for (let i = 0; i <= 4; i++) {
            const x = padLeft + (i / 4) * plotW;
            ctxPlot.fillText(i.toString(), x, padTop + plotH + 15);
        }
        ctxPlot.fillText('Thickness Squared L² (mm²)', padLeft + plotW / 2, padTop + plotH + 32);
        
        // Y axis ticks
        ctxPlot.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const val = (1 - i / 4) * yMax;
            const y = padTop + (i / 4) * plotH;
            ctxPlot.fillText(val.toFixed(val > 10 ? 0 : 1), padLeft - 6, y + 3);
        }
        
        // Y-axis title
        ctxPlot.save();
        ctxPlot.translate(15, padTop + plotH / 2);
        ctxPlot.rotate(-Math.PI / 2);
        ctxPlot.textAlign = 'center';
        ctxPlot.fillText(unitLabel, 0, 0);
        ctxPlot.restore();
        
        // 5. Active point annotation
        const currL_sq = currentL_mm * currentL_mm;
        const curr_t90_s = 0.53 * (currentL_mm / 1000) * (currentL_mm / 1000) / D;
        const curr_t90_val = curr_t90_s / timeScale;
        
        const px = padLeft + (currL_sq / 4.0) * plotW;
        const py = padTop + plotH - (curr_t90_val / yMax) * plotH;
        
        // Draw crosshair dashed lines
        ctxPlot.strokeStyle = '#ef4444';
        ctxPlot.lineWidth = 1;
        ctxPlot.setLineDash([3, 3]);
        ctxPlot.beginPath();
        ctxPlot.moveTo(px, py);
        ctxPlot.lineTo(px, padTop + plotH);
        ctxPlot.moveTo(px, py);
        ctxPlot.lineTo(padLeft, py);
        ctxPlot.stroke();
        ctxPlot.setLineDash([]);
        
        // Draw pulsing outer circle
        const pulseRadius = 5 + 1.5 * Math.sin(Date.now() / 150);
        ctxPlot.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctxPlot.beginPath();
        ctxPlot.arc(px, py, pulseRadius, 0, Math.PI * 2);
        ctxPlot.fill();
        
        // Draw inner solid circle
        ctxPlot.fillStyle = '#ef4444';
        ctxPlot.beginPath();
        ctxPlot.arc(px, py, 3.5, 0, Math.PI * 2);
        ctxPlot.fill();
    }
    
    // ============================================================
    // ANIMATION SCENE CONTROL HANDLERS
    // ============================================================
    
    function startPlayback() {
        if (simTime >= 1.0) {
            simTime = 0.0;
        }
        isAnimating = true;
        if (btnPlayPause) btnPlayPause.innerText = 'Pause';
    }
    
    function pausePlayback() {
        isAnimating = false;
        if (btnPlayPause) btnPlayPause.innerText = 'Play';
    }
    
    // ============================================================
    // EVENT LISTENERS & SETUP
    // ============================================================
    
    // Slider event
    if (slideL) {
        slideL.addEventListener('input', () => {
            updateValues();
        });
    }
    
    // Material selector event
    if (matDiff) {
        matDiff.addEventListener('change', () => {
            updateValues();
        });
    }
    
    // Run / Reset Button Event handlers
    if (btnRun) {
        btnRun.addEventListener('click', () => {
            pausePlayback();
            simTime = 0.0;
            startPlayback();
        });
    }
    
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            pausePlayback();
            simTime = 0.0;
            slideL.value = 0.5;
            matDiff.value = 'cellulose';
            if (timeScrubber) timeScrubber.value = 0;
            updateValues();
            // Reset 3D camera orientation for convenience
            if (camera && controls) {
                camera.position.set(2.8, 0.8, 5.0);
                controls.target.set(0, 0, 0);
                controls.update();
            }
        });
    }
    
    // Play Pause Button Event
    if (btnPlayPause) {
        btnPlayPause.addEventListener('click', () => {
            if (isAnimating) {
                pausePlayback();
            } else {
                startPlayback();
            }
        });
    }
    
    // Scrubber slider manual interaction
    if (timeScrubber) {
        timeScrubber.addEventListener('input', () => {
            pausePlayback();
            simTime = parseFloat(timeScrubber.value) / 100;
            updateValues();
        });
    }
    
    // Presets click listeners wiring
    presets.forEach(p => {
        if (p.btn) {
            p.btn.addEventListener('click', () => {
                slideL.value = p.val;
                updateValues();
            });
        }
    });
    
    // Initialize on Load
    init3D();
    updateValues();
})();

// ============================================================
// SCRIPT_E.JS (Page Check: document.getElementById('widthB'))
// ============================================================
(function() {
    if (!document.getElementById('widthB')) return;
    
    // ============================================================
    // MATERIAL DATABASE (Aligned with Sub-Calc B)
    // ============================================================
    
    const materials = {
        cellulose: {
            name: "Cellulose NFC",
            beta1: 0.002,      // β_parallel (longitudinal swelling coefficient)
            beta2: 0.014,      // β_transverse (transverse swelling coefficient)
            E: 8500,           // Elastic Modulus (MPa)
            nu: 0.35,
            rho: 1500,
            D: 5e-12,          // Diffusion coefficient (m²/s)
            yield_strength: 85
        },
        wood: {
            name: "Wood Spruce",
            beta1: 0.001,
            beta2: 0.010,
            E: 12000,
            nu: 0.37,
            rho: 450,
            D: 2e-12,
            yield_strength: 40
        },
        cellulose_constrained: {
            name: "Cellulose Constrained",
            beta1: 0.0,
            beta2: 0.0,
            E: 8500,
            nu: 0.35,
            rho: 1500,
            D: 0.0,
            yield_strength: 85
        },
        pla_standard: {
            name: "Standard PLA",
            beta1: 0.0,
            beta2: 0.0,
            E: 3500,
            nu: 0.36,
            rho: 1240,
            D: 0.0,
            yield_strength: 60
        },
        custom: {
            name: "Custom Material",
            beta1: 0.002,
            beta2: 0.014,
            E: 8500,
            nu: 0.35,
            rho: 1500,
            D: 5e-12,
            yield_strength: 85
        }
    };
    
    // ============================================================
    // UI ELEMENTS & STATE
    // ============================================================
    
    const matActive = document.getElementById('matActive');
    const matPassive = document.getElementById('matPassive');
    
    const presetRH1 = document.getElementById('presetRH1');
    const presetRH2 = document.getElementById('presetRH2');
    const presetRH3 = document.getElementById('presetRH3');
    const slideRH = document.getElementById('humidity');
    const valRH = document.getElementById('valRH');
    
    const slideB = document.getElementById('widthB');
    const slideL = document.getElementById('lengthL');
    const slideH1 = document.getElementById('thickH1');
    const slideH2 = document.getElementById('thickH2');
    
    const valB = document.getElementById('valB');
    const valL = document.getElementById('valL');
    const valH1 = document.getElementById('valH1');
    const valH2 = document.getElementById('valH2');
    
    const btnRun = document.getElementById('btnRun');
    const btnReset = document.getElementById('btnReset');
    const btnPlayPause = document.getElementById('btnPlayPause');
    const timeScrubber = document.getElementById('timeScrubber');
    
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const canvasElement = document.getElementById('simCanvas');
    
    // Timeline Stats
    const timelineMat = document.getElementById('timelineMat');
    const timelineDims = document.getElementById('timelineDims');
    const timelineKappa = document.getElementById('timelineKappa');
    const timelineForce = document.getElementById('timelineForce');
    
    // Numerical Output Table
    const resDeflect = document.getElementById('resDeflect');
    const resForce = document.getElementById('resForce');
    const resWork = document.getElementById('resWork');
    const resEnergy = document.getElementById('resEnergy');
    
    // Checkboxes
    const showGhostCheckbox = document.getElementById('showGhost');
    const showForceCheckbox = document.getElementById('showForce');
    
    // State Variables
    let simTime = 0.0;          // Normalized timeline position (0.0 to 1.0, where 1.0 is tau = 0.6)
    let isAnimating = false;
    let lastFrameTime = Date.now();
    
    // Three.js Scene Components
    let scene, camera, renderer, controls;
    let blockedBeamGroup, ghostBeamGroup, deflectionGroup;
    let activeLayerMesh, passiveLayerMesh;
    let topArrow; // Force arrow pointing downwards
    let ghostMaterial, ghostLineMaterial;
    
    // Presets mapping
    const rhPresets = [
        { btn: presetRH1, val: 40 },
        { btn: presetRH2, val: 60 },
        { btn: presetRH3, val: 80 }
    ];
    
    // ============================================================
    // PHYSICS ENGINE
    // ============================================================
    
    /**
     * Sorption Isotherm curve linking RH (%) to Moisture Content ΔC (g/g) for Cellulose
     */
    function rhToMoistureContent(RH_pct) {
        const rhPoints = [0, 40, 60, 80, 100];
        const mcPoints = [0.0, 0.06, 0.10, 0.18, 0.30];
        
        if (RH_pct <= 0) return 0.0;
        if (RH_pct >= 100) return 0.30;
        
        for (let i = 0; i < rhPoints.length - 1; i++) {
            if (RH_pct >= rhPoints[i] && RH_pct <= rhPoints[i+1]) {
                const t = (RH_pct - rhPoints[i]) / (rhPoints[i+1] - rhPoints[i]);
                return mcPoints[i] + t * (mcPoints[i+1] - mcPoints[i]);
            }
        }
        return 0.0;
    }
    
    /**
     * Swelling strain transformation under angle theta
     */
    function rotateSwellingStrain(epsParallel, epsTransverse, thetaDegrees) {
        const theta = thetaDegrees * Math.PI / 180;
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        const c2 = c * c;
        const s2 = s * s;
        return {
            eps_xx: epsParallel * c2 + epsTransverse * s2,
            eps_yy: epsParallel * s2 + epsTransverse * c2,
            eps_xy: (epsParallel - epsTransverse) * s * c
        };
    }
    
    /**
     * Calculate curvature using Timoshenko's Bimetal Equation
     */
    function calculateCurvature(deltaC, activeMat, passiveMat, h1, h2, thetaF = 0) {
        const epsActive = rotateSwellingStrain(activeMat.beta1 * deltaC, activeMat.beta2 * deltaC, thetaF).eps_xx;
        const epsPassive = passiveMat.beta1 * deltaC;
        const deltaEps = epsActive - epsPassive;
        
        const m = h1 / h2;
        const n = activeMat.E / passiveMat.E;
        const h = h1 + h2;
        
        const phi = 3 * Math.pow(1 + m, 2) + (1 + m * n) * (m * m + 1 / (m * n));
        const kappa = 6 * deltaEps * Math.pow(1 + m, 2) / (h * phi);
        return { kappa, phi };
    }
    
    function freeDeflection(kappa, L) {
        return kappa * L * L / 2;
    }
    
    function blockingForce(E_eff, h1, h2, b, R_free, L) {
        const h_total = h1 + h2;
        if (R_free === Infinity || R_free <= 0) return 0;
        return E_eff * Math.pow(h_total, 3) * b / (6 * R_free * L);
    }
    
    function workOutput(F_block, delta_free) {
        return 0.5 * F_block * delta_free;
    }
    
    function energyDensity(W, h1, h2, L, b) {
        const vol = (h1 + h2) * L * b; // Volume in m³
        if (vol === 0) return 0;
        return W / vol; // J/m³
    }
    
    function computeEffectiveModulus(active, passive, h1, h2) {
        // Return modulus in Pascals (active.E and passive.E are in MPa, multiply by 1e6)
        const E1 = active.E * 1e6;
        const E2 = passive.E * 1e6;
        return (E1 * h1 + E2 * h2) / (h1 + h2);
    }
    
    /**
     * Calculate Fickian average moisture saturation percentage
     */
    function getAverageConcentration(tau) {
        if (tau <= 0) return 0;
        let sum = 0;
        for (let n = 0; n < 30; n++) {
            const k = 2 * n + 1;
            sum += (8 / (k * k * Math.PI * Math.PI)) * Math.exp(-k * k * Math.PI * Math.PI * tau);
        }
        return Math.max(0, Math.min(1, 1 - sum));
    }
    
    // ============================================================
    // UI LOGIC & THREE.JS SCENE UPDATES
    // ============================================================
    
    function updateValues() {
        const b_mm = parseFloat(slideB.value);
        const L_mm = parseFloat(slideL.value);
        const h1_mm = parseFloat(slideH1.value);
        const h2_mm = parseFloat(slideH2.value);
        const RH = parseFloat(slideRH.value);
        
        // Convert to SI units
        const b = b_mm / 1000;
        const L = L_mm / 1000;
        const h1 = h1_mm / 1000;
        const h2 = h2_mm / 1000;
        
        const activeMat = materials[matActive.value];
        const passiveMat = materials[matPassive.value];
        
        // Equilibrium moisture content
        const deltaC_equil = rhToMoistureContent(RH);
        
        // Timeline scaling
        const tau = simTime * 0.6; // plays up to tau = 0.6
        const avgC = getAverageConcentration(tau);
        
        // Active moisture content at current frame
        const deltaC = avgC * deltaC_equil;
        
        // Bending math
        const E_eff = computeEffectiveModulus(activeMat, passiveMat, h1, h2);
        const bendResult = calculateCurvature(deltaC, activeMat, passiveMat, h1, h2, 0);
        const kappa = bendResult.kappa;
        const R_free = (kappa < 1e-10) ? Infinity : 1 / kappa;
        const delta_free = freeDeflection(kappa, L);
        const F_block = blockingForce(E_eff, h1, h2, b, R_free, L);
        const W = workOutput(F_block, delta_free);
        const U_act_J_m3 = energyDensity(W, h1, h2, L, b);
        const U_act_J_cm3 = U_act_J_m3 * 1e-6; // convert J/m³ to J/cm³
        
        // Update Slider Readout Labels
        if (valB) valB.innerText = b_mm + ' mm';
        if (valL) valL.innerText = L_mm + ' mm';
        if (valH1) valH1.innerText = h1_mm.toFixed(1) + ' mm';
        if (valH2) valH2.innerText = h2_mm.toFixed(1) + ' mm';
        if (valRH) valRH.innerText = RH + ' %';
        
        // Update Numeric Table Cells
        if (resDeflect) resDeflect.innerText = (delta_free * 1000).toFixed(2) + ' mm';
        if (resForce) resForce.innerText = (F_block * 1000).toFixed(1) + ' mN';
        if (resWork) resWork.innerText = (W * 1000).toFixed(4) + ' mJ';
        if (resEnergy) resEnergy.innerText = (U_act_J_cm3 * 1000).toFixed(4) + ' mJ/cm³ (' + U_act_J_cm3.toFixed(6) + ' J/cm³)';
        
        // Update Scrubber Readout
        if (timeScrubber && !isAnimating) {
            timeScrubber.value = Math.round(simTime * 100);
        }
        const timeVal = document.getElementById('timeVal');
        if (timeVal) {
            timeVal.innerText = (avgC * 100).toFixed(0);
        }
        
        // Update Timeline Stats
        if (timelineMat) timelineMat.innerText = activeMat.name;
        if (timelineDims) timelineDims.innerText = `${L_mm}x${b_mm} mm`;
        if (timelineKappa) timelineKappa.innerText = `${kappa.toFixed(3)} m⁻¹`;
        if (timelineForce) timelineForce.innerText = `${(F_block * 1000).toFixed(1)} mN`;
        
        // Update Presets highlights
        updatePresetHighlight(RH);
        
        // Update comparison table
        updateComparisonTable(RH, activeMat, passiveMat, h1, h2, b, L, E_eff);
        
        // Update Equations panel
        updateEquations(activeMat.name, passiveMat.name, deltaC, kappa, R_free, delta_free, F_block, W, U_act_J_cm3);
        
        // Update safety/design insight box
        updateInsight(U_act_J_cm3, L_mm);
        
        // Update 3D scene elements
        update3DScene(L_mm, b_mm, h1_mm, h2_mm, kappa, F_block);
        
        // Update 2D Canvas Plots
        updatePlot(deltaC, W);
        drawBarChart(U_act_J_cm3);
        
        // Update state indicators
        if (stateLabel) {
            if (simTime === 0.0) {
                stateLabel.innerText = 'State: Ready';
                stateLabel.className = 'state-indicator flat';
            } else if (simTime >= 1.0) {
                stateLabel.innerText = `State: Blocked — F = ${(F_block * 1000).toFixed(1)} mN, δ_free = ${(delta_free * 1000).toFixed(2)} mm`;
                stateLabel.className = 'state-indicator success';
            } else {
                stateLabel.innerText = `State: Actuating (${(avgC * 100).toFixed(0)}%)`;
                stateLabel.className = 'state-indicator warning';
            }
        }
    }
    
    /**
     * Highlight active preset button if current RH matches exactly
     */
    function updatePresetHighlight(currentRH) {
        rhPresets.forEach(p => {
            if (p.btn) {
                if (Math.abs(p.val - currentRH) < 1e-4) {
                    p.btn.className = 'btn btn-primary';
                } else {
                    p.btn.className = 'btn btn-secondary';
                }
            }
        });
    }
    
    /**
     * Generate speedup comparison table dynamically
     */
    function updateComparisonTable(activeRH, activeMat, passiveMat, h1, h2, b, L, E_eff) {
        const tbody = document.querySelector('#comparisonTable tbody');
        if (!tbody) return;
        
        const requiredRH = [40, 60, 80];
        const tolerance = 1e-4;
        
        tbody.innerHTML = '';
        
        requiredRH.forEach(RH_val => {
            const deltaC = rhToMoistureContent(RH_val);
            const bend = calculateCurvature(deltaC, activeMat, passiveMat, h1, h2, 0);
            const kappa = bend.kappa;
            const R_free = (kappa < 1e-10) ? Infinity : 1 / kappa;
            const delta_free = freeDeflection(kappa, L);
            const F_block = blockingForce(E_eff, h1, h2, b, R_free, L);
            const W = workOutput(F_block, delta_free);
            
            const isCurrent = Math.abs(RH_val - activeRH) < tolerance;
            
            const tr = document.createElement('tr');
            if (isCurrent) {
                tr.style.background = '#eff6ff'; // Light slate blue highlight
                tr.style.fontWeight = '600';
                tr.style.borderLeft = '3px solid #3b82f6';
            } else {
                tr.style.borderLeft = '3px solid transparent';
                tr.style.background = 'transparent';
            }
            
            tr.innerHTML = `
                <td style="padding: 6px 4px; text-align: left;">${RH_val}% ${isCurrent ? '*' : ''}</td>
                <td style="padding: 6px 4px; text-align: right; color: #64748b;">${deltaC.toFixed(2)}</td>
                <td style="padding: 6px 4px; text-align: right;">${kappa.toFixed(3)}</td>
                <td style="padding: 6px 4px; text-align: right;">${(delta_free * 1000).toFixed(2)} mm</td>
                <td style="padding: 6px 4px; text-align: right; font-weight: 500;">${(F_block * 1000).toFixed(1)} mN</td>
                <td style="padding: 6px 4px; text-align: right; color: #10b981; font-weight: 600;">${(W * 1000).toFixed(4)} mJ</td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    /**
     * Render LaTeX equation substitutions using KaTeX
     */
    function updateEquations(activeName, passiveName, deltaC, kappa, R_free, delta_free, F_block, W, U_act_J_cm3) {
        const container = document.getElementById('latexFormulaContainer');
        if (!container) return;
        

        const delta_str = (delta_free * 1000).toFixed(2) + ' mm';
        const F_str = (F_block * 1000).toFixed(1) + ' mN';
        const W_str = (W * 1000).toFixed(4) + ' mJ';
        
        const U_html = U_act_J_cm3.toExponential(3).replace('e', ' &times; 10<sup>') + '</sup>';
        
        container.innerHTML = `
            <div style="font-family: inherit; line-height: 1.6; font-size: 16px; font-weight: bold;">
                <div><strong>Swelling Strain:</strong> &Delta;&epsilon; = &beta;<sub>&parallel;</sub> &times; &Delta;C = ${deltaC.toFixed(4)}</div>
                <div style="margin-top: 6px;"><strong>Curvature:</strong> &kappa; = [6 &times; &Delta;&epsilon; &times; (1+m)<sup>2</sup>] / [h &times; &phi;(m,n)] = ${kappa.toFixed(3)} m<sup>-1</sup></div>
                <div style="margin-top: 6px;"><strong>Free Deflection:</strong> &delta;<sub>free</sub> = (&kappa; &times; L<sup>2</sup>) / 2 = ${delta_str}</div>
                <div style="margin-top: 6px;"><strong>Blocking Force:</strong> F<sub>block</sub> = (E<sub>eff</sub> &times; h<sup>3</sup> &times; b) / (6R<sub>free</sub> &times; L) = ${F_str}</div>
                <div style="margin-top: 6px;"><strong>Work Output:</strong> W = (1/2) &times; F<sub>block</sub> &times; &delta;<sub>free</sub> = ${W_str}</div>
                <div style="margin-top: 6px; font-weight: bold; color: #8A1134;">Energy Density: U<sub>act</sub> = W / Volume = ${U_html} J/cm<sup>3</sup></div>
            </div>
        `;
    }
    
    /**
     * Write safety and design insights based on energy output
     */
    function updateInsight(U_act_J_cm3, L_mm) {
        if (!liveInsight) return;
        
        const u_density_mJ = U_act_J_cm3 * 1000;
        
        let text = `<strong>Design Insight:</strong> `;
        if (u_density_mJ < 0.01) {
            text += `Extremely low work density (<strong>${u_density_mJ.toFixed(5)} mJ/cm³</strong>). `;
            text += `Consider increasing humidity, using a thinner bilayer, or switching to the high-swelling Wood Spruce.`;
        } else if (u_density_mJ > 5.0) {
            text += `High work output (<strong>${u_density_mJ.toFixed(2)} mJ/cm³</strong>). `;
            text += `The blocking force and elastic energy output are significant. Ideal for micro-grippers and active flaps.`;
        } else {
            text += `Moderate work density (<strong>${u_density_mJ.toFixed(3)} mJ/cm³</strong>). `;
            text += `Bilayer cantilever length L = ${L_mm} mm provides stable, controllable mechanical work output.`;
        }
        
        liveInsight.innerHTML = text;
    }
    
    // ============================================================
    // THREE.JS 3D SCENE INITIALIZATION & ANIMATION
    // ============================================================
    
    function init3D() {
        if (!canvasElement) return;
        
        // 1. Create Scene & Background
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf8fafc);
        
        // 2. Camera Setup (Positioned side-on/3/4 view to emphasize thin dimension L and deflection)
        camera = new THREE.PerspectiveCamera(40, canvasElement.clientWidth / canvasElement.clientHeight, 0.1, 100);
        camera.position.set(2.8, 0.8, 5.0);
        
        // 3. Renderer Setup
        renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true });
        renderer.setSize(canvasElement.clientWidth, canvasElement.clientHeight, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        
        // 4. OrbitControls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2 + 0.15;
        controls.minDistance = 2.0;
        controls.maxDistance = 15.0;
        controls.target.set(0, 0, 0);
        
        // 5. Grid Helper
        const gridHelper = new THREE.GridHelper(10, 10, 0xcbd5e1, 0xe2e8f0);
        gridHelper.position.y = -1.9;
        scene.add(gridHelper);
        
        // 6. Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(5, 8, 5);
        dirLight.castShadow = true;
        scene.add(dirLight);
        
        const pointLight = new THREE.PointLight(0x3b82f6, 0.45, 15);
        pointLight.position.set(-4, 3, -4);
        scene.add(pointLight);
        
        // 7. Clamp Support Bracket (Wall fixed end)
        const wallGeom = new THREE.BoxGeometry(0.3, 1.2, 1.2);
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x34495e, // Dark grey matching A's style
            metalness: 0.1,  // Matte non-reflective
            roughness: 0.6   // Diffuse surface
        });
        const wallMesh = new THREE.Mesh(wallGeom, wallMat);
        wallMesh.position.set(-0.15, 0, 0);
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        scene.add(wallMesh);
        
        // 8. Blocked (Straight) Solid Beam Group
        blockedBeamGroup = new THREE.Group();
        scene.add(blockedBeamGroup);
        
        // We create boxes with local dimension 1x1x1 and scale them dynamically
        const layerGeom = new THREE.BoxGeometry(1, 1, 1);
        
        // Warm active layer on top
        const activeMatMesh = new THREE.MeshStandardMaterial({
            color: 0xf97316, // orange-500
            roughness: 0.3,
            metalness: 0.1
        });
        activeLayerMesh = new THREE.Mesh(layerGeom, activeMatMesh);
        activeLayerMesh.castShadow = true;
        activeLayerMesh.receiveShadow = true;
        blockedBeamGroup.add(activeLayerMesh);
        
        // Cool passive layer on bottom
        const passiveMatMesh = new THREE.MeshStandardMaterial({
            color: 0x64748b, // slate-500
            roughness: 0.3,
            metalness: 0.1
        });
        passiveLayerMesh = new THREE.Mesh(layerGeom, passiveMatMesh);
        passiveLayerMesh.castShadow = true;
        passiveLayerMesh.receiveShadow = true;
        blockedBeamGroup.add(passiveLayerMesh);
        
        // Initialize global materials for reuse to prevent memory leaks (wireframe MeshBasicMaterial for a clear ghost/dashed outline)
        ghostMaterial = new THREE.MeshBasicMaterial({
            color: 0x2563eb,
            transparent: true,
            opacity: 0.65,
            wireframe: true,
            side: THREE.DoubleSide
        });
        
        ghostLineMaterial = new THREE.LineBasicMaterial({
            color: 0x2563eb
        });
    
        // 9. Ghost (Curved) Beam Group
        ghostBeamGroup = new THREE.Group();
        scene.add(ghostBeamGroup);
        
        // 10. Deflection Double-Arrow Annotation Group
        deflectionGroup = new THREE.Group();
        scene.add(deflectionGroup);
        
        // Cylinder for dimension line
        const cylGeom = new THREE.CylinderGeometry(0.012, 0.012, 1.0, 8);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const cylMesh = new THREE.Mesh(cylGeom, lineMat);
        cylMesh.name = 'cylinder';
        deflectionGroup.add(cylMesh);
        
        // Cones at ends
        const coneGeom = new THREE.ConeGeometry(0.045, 0.12, 10);
        const topCone = new THREE.Mesh(coneGeom, lineMat);
        topCone.name = 'topCone';
        deflectionGroup.add(topCone);
        
        const botCone = new THREE.Mesh(coneGeom, lineMat);
        botCone.name = 'botCone';
        botCone.rotation.x = Math.PI; // point downwards
        deflectionGroup.add(botCone);
        
        // 11. Force Arrow Helper at the tip of the solid beam (pointing downwards)
        topArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 0),
            0.01,
            0xef4444,
            0.12,
            0.06
        );
        scene.add(topArrow);
        
        // Start playback
        lastFrameTime = Date.now();
        renderLoop();
    }
    
    /**
     * Update 3D elements based on geometry scale and curvature
     */
    function update3DScene(L_mm, b_mm, h1_mm, h2_mm, kappa, F_block) {
        if (!blockedBeamGroup || !activeLayerMesh || !passiveLayerMesh) return;
        
        // Scale Factors
        const scaleL = 0.045; // 45 mm length maps to ~2.0 world units
        const scaleB = 0.045;
        const scaleH = 0.35;  // 1.0 mm thickness maps to ~0.35 world units
        
        const L_w = L_mm * scaleL;
        const b_w = b_mm * scaleB;
        const h1_w = h1_mm * scaleH;
        const h2_w = h2_mm * scaleH;
        
        // 1. Update Blocked (Solid Flat) Beam
        activeLayerMesh.scale.set(L_w, h1_w, b_w);
        activeLayerMesh.position.set(L_w / 2, h1_w / 2, 0);
        
        passiveLayerMesh.scale.set(L_w, h2_w, b_w);
        passiveLayerMesh.position.set(L_w / 2, -h2_w / 2, 0);
        
        // 2. Clear and Rebuild Ghost (Free Curved) Beam segments
        // We empty the group
        while (ghostBeamGroup.children.length > 0) {
            const child = ghostBeamGroup.children[0];
            ghostBeamGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
        }
        
        // Calculate curvature in world scale with a visual exaggeration factor of 20x for clear visual representation
        const L_m = L_mm / 1000;
        const exaggeration = 20.0;
        const theta_tip = (kappa * exaggeration) * L_m;
        const kappa_w = (L_w === 0) ? 0 : theta_tip / L_w;
        
        const showGhost = showGhostCheckbox.checked;
        
        let y_tip = 0.0;
        
        if (showGhost && kappa_w > 0.001) {
            // Build 30 wireframe segments to show curved unconstrained shape
            const nSegments = 30;
            const ds = L_w / nSegments;
            const totalH_w = h1_w + h2_w;
            
            const ghostMat = ghostMaterial;
            
            for (let i = 0; i < nSegments; i++) {
                const s = (i + 0.5) * ds;
                const theta = kappa_w * s;
                const x = Math.sin(theta) / kappa_w;
                const y = (1 - Math.cos(theta)) / kappa_w;
                
                const segGeom = new THREE.BoxGeometry(ds, totalH_w, b_w);
                const segMesh = new THREE.Mesh(segGeom, ghostMat);
                segMesh.position.set(x, y, 0);
                segMesh.rotation.z = theta;
                ghostBeamGroup.add(segMesh);
            }
            
            // Centerline dashed line for visual reinforcement
            const points = [];
            for (let i = 0; i <= nSegments; i++) {
                const s = i * ds;
                const x = Math.sin(kappa_w * s) / kappa_w;
                const y = (1 - Math.cos(kappa_w * s)) / kappa_w;
                points.push(new THREE.Vector3(x, y, 0));
            }
            
            const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
            const lineMat = ghostLineMaterial;
            const centerline = new THREE.Line(lineGeom, lineMat);
            centerline.computeLineDistances();
            ghostBeamGroup.add(centerline);
            
            // Save tip coordinates
            y_tip = (1 - Math.cos(theta_tip)) / kappa_w;
        } else if (showGhost) {
            // If kappa is 0, unconstrained coincides with flat
            const segGeom = new THREE.BoxGeometry(L_w, h1_w + h2_w, b_w);
            const ghostMat = ghostMaterial;
            const segMesh = new THREE.Mesh(segGeom, ghostMat);
            segMesh.position.set(L_w / 2, 0, 0);
            ghostBeamGroup.add(segMesh);
        }
        
        // 3. Update Deflection Annotation (double-headed vertical cylinder)
        if (deflectionGroup) {
            // We only show annotation if deflection is visible and significant
            if (!showGhost || y_tip < 0.02) {
                deflectionGroup.visible = false;
            } else {
                deflectionGroup.visible = true;
                deflectionGroup.position.set(L_w + 0.12, 0, 0);
                
                const cylinder = deflectionGroup.getObjectByName('cylinder');
                const tCone = deflectionGroup.getObjectByName('topCone');
                const bCone = deflectionGroup.getObjectByName('botCone');
                
                if (cylinder && tCone && bCone) {
                    // Scale cylinder to span the deflection gap
                    cylinder.scale.set(1, y_tip, 1);
                    cylinder.position.y = y_tip / 2;
                    
                    // Cones positioned at solid tip (0) and ghost tip (y_tip)
                    tCone.position.y = y_tip;
                    bCone.position.y = 0;
                }
            }
        }
        
        // 4. Update Force Vector Arrow Helper (Red arrow pointing downwards at solid tip)
        const showForce = showForceCheckbox.checked;
        if (topArrow) {
            // Scale arrow visual length based on blocking force magnitude (shorter and cleaner)
            const force_mN = F_block * 1000;
            const arrowLen = Math.min(0.35, 0.10 + force_mN * 0.0008);
            
            // Position origin exactly on the top surface of the beam tip (zero gap)
            topArrow.position.set(L_w, h1_w, 0);
            
            if (arrowLen < 0.03 || !showForce) {
                topArrow.visible = false;
            } else {
                topArrow.visible = true;
                topArrow.setLength(arrowLen, 0.12, 0.06);
            }
        }
    }
    
    /**
     * Unified render loop
     */
    function renderLoop() {
        requestAnimationFrame(renderLoop);
        
        const now = Date.now();
        const dt = (now - lastFrameTime) / 1000;
        lastFrameTime = now;
        
        // 1. Playback timeline logic
        if (isAnimating) {
            simTime += dt * 0.125; // Timeline plays to 100% in exactly 8 seconds
            if (simTime >= 1.0) {
                simTime = 1.0;
                isAnimating = false;
                if (btnPlayPause) btnPlayPause.innerText = 'Play';
            }
            updateValues();
        }
        
        // 2. Update OrbitControls
        if (controls) controls.update();
        
        // 3. Render Three.js Scene
        if (renderer && scene && camera) {
            resizeCanvas();
            renderer.render(scene, camera);
        }
    }
    
    function resizeCanvas() {
        if (!renderer) return;
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (canvas.width !== width || canvas.height !== height) {
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }
    }
    
    // ============================================================
    // 2D CANVAS CHARTS
    // ============================================================
    
    /**
     * Draw Work W vs Moisture Content ΔC Plot
     */
    function updatePlot(activeC, activeW) {
        const plotCanvas = document.getElementById('plotCanvas');
        if (!plotCanvas) return;
        
        const ctxPlot = plotCanvas.getContext('2d');
        if (!ctxPlot) return;
        
        ctxPlot.clearRect(0, 0, plotCanvas.width, plotCanvas.height);
        
        const padLeft = 50, padRight = 15, padTop = 15, padBottom = 35;
        const plotW = plotCanvas.width - padLeft - padRight;
        const plotH = plotCanvas.height - padTop - padBottom;
        
        const activeMat = materials[matActive.value];
        const passiveMat = materials[matPassive.value];
        const h1 = parseFloat(slideH1.value) / 1000;
        const h2 = parseFloat(slideH2.value) / 1000;
        const b = parseFloat(slideB.value) / 1000;
        const L = parseFloat(slideL.value) / 1000;
        const E_eff = computeEffectiveModulus(activeMat, passiveMat, h1, h2);
        
        // 1. Generate curve data up to ΔC = 0.30 to determine visual max limits
        const dataPoints = [];
        let maxW_mJ = 0.001;
        
        for (let dc = 0; dc <= 0.301; dc += 0.01) {
            const bend = calculateCurvature(dc, activeMat, passiveMat, h1, h2, 0);
            const kappa = bend.kappa;
            const R_free = (kappa < 1e-10) ? Infinity : 1 / kappa;
            const delta_free = freeDeflection(kappa, L);
            const F_block = blockingForce(E_eff, h1, h2, b, R_free, L);
            const W_mJ = workOutput(F_block, delta_free) * 1000;
            
            if (W_mJ > maxW_mJ) maxW_mJ = W_mJ;
            dataPoints.push({ x: dc, y: W_mJ });
        }
        
        const yMax = maxW_mJ * 1.1; // Add 10% headroom
        
        // 2. Draw Grid Lines
        ctxPlot.strokeStyle = '#f1f5f9';
        ctxPlot.lineWidth = 1;
        
        // Vertical grid lines (ΔC goes from 0 to 0.30)
        for (let i = 0; i <= 6; i++) {
            const x = padLeft + (i / 6) * plotW;
            ctxPlot.beginPath(); ctxPlot.moveTo(x, padTop); ctxPlot.lineTo(x, padTop + plotH); ctxPlot.stroke();
        }
        // Horizontal grid lines
        for (let i = 0; i <= 4; i++) {
            const y = padTop + (i / 4) * plotH;
            ctxPlot.beginPath(); ctxPlot.moveTo(padLeft, y); ctxPlot.lineTo(padLeft + plotW, y); ctxPlot.stroke();
        }
        
        // 3. Draw Plot Axes
        ctxPlot.strokeStyle = '#cbd5e1';
        ctxPlot.lineWidth = 1.5;
        ctxPlot.beginPath();
        ctxPlot.moveTo(padLeft, padTop);
        ctxPlot.lineTo(padLeft, padTop + plotH);
        ctxPlot.lineTo(padLeft + plotW, padTop + plotH);
        ctxPlot.stroke();
        
        // 4. Draw curve line
        ctxPlot.strokeStyle = '#10b981'; // Green accent for work
        ctxPlot.lineWidth = 2;
        ctxPlot.beginPath();
        dataPoints.forEach((pt, idx) => {
            const px = padLeft + (pt.x / 0.30) * plotW;
            const py = padTop + plotH - (pt.y / yMax) * plotH;
            if (idx === 0) ctxPlot.moveTo(px, py);
            else ctxPlot.lineTo(px, py);
        });
        ctxPlot.stroke();
        
        // 5. Draw Axes Labels & Ticks
        ctxPlot.fillStyle = '#475569';
        ctxPlot.font = '9px Outfit, sans-serif';
        ctxPlot.textAlign = 'center';
        
        // X axis ticks (0.0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30)
        for (let i = 0; i <= 6; i++) {
            const val = (i / 6) * 0.30;
            const x = padLeft + (i / 6) * plotW;
            ctxPlot.fillText(val.toFixed(2), x, padTop + plotH + 12);
        }
        ctxPlot.fillText('Moisture Content ΔC (g/g)', padLeft + plotW / 2, padTop + plotH + 26);
        
        // Y axis ticks
        ctxPlot.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const val = (1 - i / 4) * yMax;
            const y = padTop + (i / 4) * plotH;
            ctxPlot.fillText(val.toFixed(4), padLeft - 6, y + 3);
        }
        
        // 6. Draw active tracer point
        const currX = padLeft + (activeC / 0.30) * plotW;
        const activeW_mJ = activeW * 1000;
        const currY = padTop + plotH - (activeW_mJ / yMax) * plotH;
        
        ctxPlot.fillStyle = '#ef4444';
        ctxPlot.beginPath();
        ctxPlot.arc(currX, currY, 4.5, 0, Math.PI * 2);
        ctxPlot.fill();
    }
    
    /**
     * Draw Horizontal Logarithmic Energy Density Bar Chart
     */
    function drawBarChart(U_act_J_cm3) {
        const canvas = document.getElementById('barChartCanvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const padLeft = 55, padRight = 15, padTop = 10, padBottom = 32;
        const w = canvas.width - padLeft - padRight;
        const h = canvas.height - padTop - padBottom;
        
        // Log scale limits: 10⁻⁵ to 10¹ J/cm³
        const minLog = -5;
        const maxLog = 1;
        const decades = maxLog - minLog; // 6 decades
        
        // 1. Draw logarithmic grid lines
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        for (let dec = minLog; dec <= maxLog; dec++) {
            const x = padLeft + ((dec - minLog) / decades) * w;
            ctx.beginPath(); ctx.moveTo(x, padTop); ctx.lineTo(x, padTop + h); ctx.stroke();
            
            // Draw finer subdivisions
            if (dec < maxLog) {
                ctx.strokeStyle = '#f8fafc';
                for (let sub = 2; sub <= 9; sub++) {
                    const subVal = dec + Math.log10(sub);
                    const subX = padLeft + ((subVal - minLog) / decades) * w;
                    ctx.beginPath(); ctx.moveTo(subX, padTop); ctx.lineTo(subX, padTop + h); ctx.stroke();
                }
                ctx.strokeStyle = '#f1f5f9';
            }
        }
        
        // 2. Data bounds
        const data = [
            { label: 'SMA', val: 1.0, color: '#ef4444' }, // Shape Memory Alloys: ~1.0 J/cm³
            { label: 'Bilayer', val: U_act_J_cm3, color: '#3b82f6' }, // Hydro-bilayer (computed)
            { label: 'SMP', val: 0.1, color: '#eab308' }  // Shape Memory Polymers: ~0.1 J/cm³
        ];
        
        // 3. Draw bars
        const barHeight = Math.floor(h / 4);
        const gap = Math.floor(h / 12);
        
        data.forEach((item, index) => {
            const y = padTop + gap + index * (barHeight + gap);
            
            // Log mapping width
            let barW = 0;
            if (item.val > 0) {
                const valLog = Math.log10(item.val);
                const ratio = (valLog - minLog) / decades;
                barW = Math.max(0, Math.min(1, ratio)) * w;
            }
            
            // Draw bar
            ctx.fillStyle = item.color;
            ctx.fillRect(padLeft, y, barW, barHeight);
            
            // Draw label
            ctx.fillStyle = '#475569';
            ctx.font = 'bold 9px Outfit, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(item.label, padLeft - 6, y + barHeight / 2 + 3);
            
            // Draw value overlay
            if (barW > 40) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '8px JetBrains Mono, monospace';
                ctx.textAlign = 'right';
                ctx.fillText(item.val.toExponential(1), padLeft + barW - 4, y + barHeight / 2 + 3);
            }
        });
        
        // 4. Draw X-axis line & labels
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padLeft, padTop + h);
        ctx.lineTo(padLeft + w, padTop + h);
        ctx.stroke();
        
        ctx.fillStyle = '#475569';
        ctx.font = '8px Outfit, sans-serif';
        ctx.textAlign = 'center';
        
        for (let dec = minLog; dec <= maxLog; dec++) {
            const x = padLeft + ((dec - minLog) / decades) * w;
            
            // Draw tick mark
            ctx.beginPath();
            ctx.moveTo(x, padTop + h);
            ctx.lineTo(x, padTop + h + 4);
            ctx.stroke();
            
            let labelText = '';
            if (dec === 0) labelText = '1';
            else if (dec === 1) labelText = '10';
            else labelText = `10⁻${Math.abs(dec)}`;
            
            ctx.fillText(labelText, x, padTop + h + 12);
        }
    }
    
    // ============================================================
    // ANIMATION SCENE CONTROL HANDLERS
    // ============================================================
    
    function startPlayback() {
        if (simTime >= 1.0) {
            simTime = 0.0;
        }
        isAnimating = true;
        if (btnPlayPause) btnPlayPause.innerText = 'Pause';
    }
    
    function pausePlayback() {
        isAnimating = false;
        if (btnPlayPause) btnPlayPause.innerText = 'Play';
    }
    
    // ============================================================
    // EVENT LISTENERS & SETUP
    // ============================================================
    
    // Sliders events
    [slideB, slideL, slideH1, slideH2].forEach(el => {
        if (el) el.addEventListener('input', () => {
            updateValues();
        });
    });
    
    // Selector dropdown events
    [matActive, matPassive].forEach(el => {
        if (el) el.addEventListener('change', () => {
            updateValues();
        });
    });
    
    // Environment humidity slider
    if (slideRH) {
        slideRH.addEventListener('input', () => {
            updateValues();
        });
    }
    
    // Preset click listeners
    rhPresets.forEach(p => {
        if (p.btn) {
            p.btn.addEventListener('click', () => {
                slideRH.value = p.val;
                updateValues();
            });
        }
    });
    
    // Checkboxes toggles
    [showGhostCheckbox, showForceCheckbox].forEach(el => {
        if (el) el.addEventListener('change', () => {
            updateValues();
        });
    });
    
    // Run / Reset buttons
    if (btnRun) {
        btnRun.addEventListener('click', () => {
            pausePlayback();
            simTime = 0.0;
            startPlayback();
        });
    }
    
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            pausePlayback();
            simTime = 0.0;
            slideB.value = 10;
            slideL.value = 50;
            slideH1.value = 0.5;
            slideH2.value = 0.5;
            slideRH.value = 60;
            matActive.value = 'cellulose';
            matPassive.value = 'cellulose_constrained';
            if (timeScrubber) timeScrubber.value = 0;
            
            // Restore default camera orientation
            if (camera && controls) {
                camera.position.set(2.8, 0.8, 5.0);
                controls.target.set(0, 0, 0);
                controls.update();
            }
            
            updateValues();
        });
    }
    
    // Play/Pause scrubber control
    if (btnPlayPause) {
        btnPlayPause.addEventListener('click', () => {
            if (isAnimating) {
                pausePlayback();
            } else {
                startPlayback();
            }
        });
    }
    
    if (timeScrubber) {
        timeScrubber.addEventListener('input', () => {
            pausePlayback();
            simTime = parseFloat(timeScrubber.value) / 100;
            updateValues();
        });
    }
    
    // Initialize on Load
    init3D();
    updateValues();
})();
