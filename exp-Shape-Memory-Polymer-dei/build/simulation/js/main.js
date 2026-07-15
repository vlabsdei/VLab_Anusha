/* global THREE */
// Combined simulator script for Exp 1

// ============================================================
// SCRIPT_A.JS (Page Check: document.getElementById('plotCanvasMain'))
// ============================================================
(function() {
    if (!document.getElementById('plotCanvasMain')) return;
    
    // ============================================================
    // MATERIAL DATABASE & PHYSICAL CONSTANTS
    // ============================================================
    
    const materials = {
        PU:   { Tg: 45,  name: "PU-SMP",  desc: "Polyurethane Shape Memory Polymer" },
        PLA:  { Tg: 60,  name: "PLA-SMP",  desc: "Polylactic Acid Shape Memory Polymer" },
        PMMA: { Tg: 105, name: "PMMA-SMP", desc: "Polymethyl Methacrylate Shape Memory Polymer" }
    };
    
    const C1 = 17.44;
    const C2 = 51.6;
    const T_body = 37.0;
    
    // UI Elements
    const radioPU = document.getElementById('matPU');
    const radioPLA = document.getElementById('matPLA');
    const radioPMMA = document.getElementById('matPMMA');
    const inputTemp = document.getElementById('temperature');
    const inputRate = document.getElementById('heatingRate');
    const valTemp = document.getElementById('valTemp');
    const valRate = document.getElementById('valRate');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotCanvasMain = document.getElementById('plotCanvasMain');
    const plotCtxMain = plotCanvasMain ? plotCanvasMain.getContext('2d') : null;
    const plotCanvasDSC = document.getElementById('plotCanvasDSC');
    const plotCtxDSC = plotCanvasDSC ? plotCanvasDSC.getContext('2d') : null;
    
    // Results elements
    const resMat = document.getElementById('resMat');
    const resTg = document.getElementById('resTg');
    const resTemp = document.getElementById('resTemp');
    const resWLF = document.getElementById('resWLF');
    const resVisc = document.getElementById('resVisc');
    const resRegime = document.getElementById('resRegime');
    const resDeltaT = document.getElementById('resDeltaT');
    const suitabilityTbody = document.querySelector('#suitabilityTable tbody');
    const latexFormulaContainer = document.getElementById('latexFormulaContainer');
    
    // State Variables
    let currentMaterial = 'PU';
    let Tg = materials.PU.Tg;
    let currentT = Tg - 20;
    let isAnimating = false;
    let animationFrameId = null;
    let time = 0.0;
    
    // Three.js Globals
    let scene, camera, renderer, controls;
    // let sampleMesh;
    // let originalVertices = []; // To store base vertex positions
    
    // ============================================================
    // MATHEMATICAL FUNCTIONS
    // ============================================================
    
    /**
     * WLF Shift Factor log(a_T)
     */
    function wlfShiftFactor(T, Tg) {
        if (T < Tg) return null; // Undefined below Tg
        return -C1 * (T - Tg) / (C2 + (T - Tg));
    }
    
    /**
     * Viscosity Ratio a_T = 10^log(a_T)
     */
    function viscosityRatio(logAT) {
        return logAT === null ? null : Math.pow(10, logAT);
    }
    
    /**
     * Format viscosity ratio to a clean scientific notation string: e.g. 2.4 x 10^-8
     */
    function formatViscosityRatio(viscVal) {
        if (viscVal === null) return "Undefined";
        if (viscVal === 1) return "1.0";
        const str = viscVal.toExponential(1); // e.g. "2.4e-8"
        const parts = str.split('e');
        const exp = parseInt(parts[1], 10);
        return `${parts[0]} x 10^${exp}`;
    }
    
    /**
     * DSC Heat Flow Cp(T) - Sigmoid transition
     */
    function dscHeatFlow(T, Tg, deltaCp = 0.3, width = 8) {
        return deltaCp / (1 + Math.exp(-4 * (T - Tg) / width));
    }
    
    /**
     * Bio-Suitability scoring based on |Tg - 37|
     */
    function bioSuitability(Tg) {
        const delta = Math.abs(Tg - T_body);
        if (delta < 10) return { score: "Good", color: "rgba(16, 185, 129, 0.15)", textColor: "#047857", border: "#10b981", reason: "Tg is very close to body temperature (37°C), allowing actuation at physiological conditions." };
        if (delta < 30) return { score: "Moderate", color: "rgba(245, 158, 11, 0.15)", textColor: "#b45309", border: "#f59e0b", reason: "Tg is moderately above body temperature. Requires mild local heating for activation." };
        return { score: "Poor", color: "rgba(239, 68, 68, 0.15)", textColor: "#b91c1c", border: "#ef4444", reason: "Tg is too high. Requires excessive temperatures that could damage biological tissues." };
    }
    
    // ============================================================
    // THREE.JS SCENE SETUP
    // ============================================================
    
    // ============================================================
    // THREE.JS SCENE SETUP (MOLECULAR VIEW)
    // ============================================================
    
    const NUM_CHAINS = 8;
    const NODES_PER_CHAIN = 12;
    const BOND_LENGTH = 0.16;
    let chains = [];
    
    function positionCylinder(cylinder, v1, v2) {
        const dir = new THREE.Vector3().subVectors(v2, v1);
        const length = dir.length();
        cylinder.scale.set(1, length, 1);
        
        const midpoint = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
        cylinder.position.copy(midpoint);
        
        const up = new THREE.Vector3(0, 1, 0);
        dir.normalize();
        cylinder.quaternion.setFromUnitVectors(up, dir);
    }
    
    function initChains() {
        chains = [];
        
        const sphereGeom = new THREE.SphereGeometry(0.032, 16, 16);
        const cylinderGeom = new THREE.CylinderGeometry(0.012, 0.012, 1.0, 8);
        
        const chainMaterial = new THREE.MeshStandardMaterial({
            color: 0x64748b,
            roughness: 0.2,
            metalness: 0.1
        });
    
        for (let i = 0; i < NUM_CHAINS; i++) {
            const chainGroup = new THREE.Group();
            scene.add(chainGroup);
    
            const nodePositions = [];
            const basePositions = [];
            const sphereMeshes = [];
            const bondMeshes = [];
    
            // Generate random walk points within container limits
            let currentPos = new THREE.Vector3(
                (Math.random() - 0.5) * 1.0,
                (Math.random() - 0.5) * 0.7,
                (Math.random() - 0.5) * 0.7
            );
    
            for (let j = 0; j < NODES_PER_CHAIN; j++) {
                nodePositions.push(currentPos.clone());
                basePositions.push(currentPos.clone());
    
                // Create sphere mesh
                const sphere = new THREE.Mesh(sphereGeom, chainMaterial.clone());
                sphere.position.copy(currentPos);
                sphere.castShadow = true;
                sphere.receiveShadow = true;
                chainGroup.add(sphere);
                sphereMeshes.push(sphere);
    
                if (j > 0) {
                    // Create cylinder bond
                    const cylinder = new THREE.Mesh(cylinderGeom, chainMaterial.clone());
                    chainGroup.add(cylinder);
                    bondMeshes.push(cylinder);
                    positionCylinder(cylinder, nodePositions[j - 1], currentPos);
                }
    
                // Next position step
                const dir = new THREE.Vector3(
                    Math.random() - 0.5,
                    Math.random() - 0.5,
                    Math.random() - 0.5
                ).normalize().multiplyScalar(BOND_LENGTH);
    
                let nextPos = new THREE.Vector3().addVectors(currentPos, dir);
                // Confine to volume bounds
                if (Math.abs(nextPos.x) > 0.65 || Math.abs(nextPos.y) > 0.45 || Math.abs(nextPos.z) > 0.45) {
                    dir.negate();
                    nextPos = new THREE.Vector3().addVectors(currentPos, dir);
                }
                currentPos = nextPos;
            }
    
            chains.push({
                group: chainGroup,
                nodePositions: nodePositions,
                basePositions: basePositions,
                sphereMeshes: sphereMeshes,
                bondMeshes: bondMeshes,
                phases: Array.from({ length: NODES_PER_CHAIN }, () => Math.random() * Math.PI * 2)
            });
        }
    }
    
    function init3D() {
        const container = document.getElementById('viewport3D');
        if (!container) return;
    
        // Clear previous elements
        container.innerHTML = '';
    
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xF4F5F3);
    
        camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
        camera.position.set(2.2, 1.6, 2.8);
    
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);
    
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 1.5;
        controls.maxDistance = 6.0;
        controls.target.set(0, 0, 0);
    
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
    
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(5, 8, 5);
        dirLight.castShadow = true;
        scene.add(dirLight);
    
        // Bounding container box (translucent glassmorphism)
        const boxGeom = new THREE.BoxGeometry(1.5, 1.0, 1.0);
        const boxMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.08,
            roughness: 0.1,
            transmission: 0.6,
            thickness: 0.2,
            side: THREE.DoubleSide
        });
        const glassBox = new THREE.Mesh(boxGeom, boxMat);
        scene.add(glassBox);
    
        const boxEdges = new THREE.EdgesGeometry(boxGeom);
        const boxLine = new THREE.LineSegments(boxEdges, new THREE.LineBasicMaterial({ color: 0xcbd5e1, linewidth: 1 }));
        scene.add(boxLine);
    
        // Initialize chains
        initChains();
    
        window.addEventListener('resize', onWindowResize);
    }
    
    function onWindowResize() {
        const container = document.getElementById('viewport3D');
        if (!container || !camera || !renderer) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    /**
     * Update polymer chains: colors, vibrations, writhing segmental motion, and conformational drift
     */
    function updateSampleMesh(T, Tg) {
        if (chains.length === 0) return;
    
        const isRubbery = T >= Tg;
        const softness = isRubbery ? Math.min((T - Tg) / 40, 1.0) : 0.0;
    
        const colorGlassy = new THREE.Color(0x64748b);
        const colorRubbery = new THREE.Color(0xE2570F);
        const currentColor = new THREE.Color().copy(colorGlassy).lerp(colorRubbery, softness);
    
        time += 0.05;
    
        chains.forEach((chain, cIdx) => {
            const nodes = chain.nodePositions;
            const bases = chain.basePositions;
            const spheres = chain.sphereMeshes;
            const bonds = chain.bondMeshes;
    
            // Calculate center of mass of the original chain
            const centerOfMass = new THREE.Vector3();
            bases.forEach(b => centerOfMass.add(b));
            centerOfMass.divideScalar(NODES_PER_CHAIN);
    
            // 1. Calculate raw node positions with stretching and writhing/jitter
            const rawPos = [];
            for (let j = 0; j < NODES_PER_CHAIN; j++) {
                // Offset from center of mass
                const offset = new THREE.Vector3().subVectors(bases[j], centerOfMass);
    
                // Stretch offset based on softness (polymer relaxes and spreads out by up to 35% in rubbery state)
                const stretchFactor = 1.0 + softness * 0.35;
                const stretchedOffset = offset.clone().multiplyScalar(stretchFactor);
    
                // Slow conformational rotation around center of mass (sliding segments above Tg)
                const rotAngle = time * 0.12 * softness; 
                const cosA = Math.cos(rotAngle + cIdx);
                const sinA = Math.sin(rotAngle + cIdx);
                const rotatedOffset = new THREE.Vector3(
                    stretchedOffset.x * cosA - stretchedOffset.z * sinA,
                    stretchedOffset.y,
                    stretchedOffset.x * sinA + stretchedOffset.z * cosA
                );
    
                // Anchor point
                const anchor = new THREE.Vector3().addVectors(centerOfMass, rotatedOffset);
    
                // High-frequency thermal vibration/jitter (always present)
                const jiggleFrequency = 22.0;
                const jiggleAmplitude = 0.005;
                const jitterX = Math.sin(time * jiggleFrequency + chain.phases[j] + cIdx) * jiggleAmplitude;
                const jitterY = Math.cos(time * jiggleFrequency * 0.9 + chain.phases[j] * 1.5 + cIdx) * jiggleAmplitude;
                const jitterZ = Math.sin(time * jiggleFrequency * 1.1 + chain.phases[j] * 2.1 + cIdx) * jiggleAmplitude;
    
                // Large-scale writhing motion (slower wave-like conformational change above Tg)
                const writhingAmplitude = softness * 0.07;
                const writhingFreq = 2.0;
                const writheX = Math.sin(time * writhingFreq + chain.phases[j] + cIdx * 0.5) * writhingAmplitude;
                const writheY = Math.cos(time * writhingFreq * 0.8 + chain.phases[j] * 1.3 + cIdx * 0.7) * writhingAmplitude;
                const writheZ = Math.sin(time * writhingFreq * 1.2 + chain.phases[j] * 0.9 + cIdx * 1.1) * writhingAmplitude;
    
                // Combine base + jitter + writhing
                const finalPos = new THREE.Vector3(
                    anchor.x + jitterX + writheX,
                    anchor.y + jitterY + writheY,
                    anchor.z + jitterZ + writheZ
                );
                rawPos.push(finalPos);
            }
    
            // 2. Apply binomial smoothing pass to eliminate sharp angles and render fluid, organic curves
            for (let j = 0; j < NODES_PER_CHAIN; j++) {
                if (j === 0) {
                    nodes[j].copy(rawPos[0]).lerp(rawPos[1], 0.25);
                } else if (j === NODES_PER_CHAIN - 1) {
                    nodes[j].copy(rawPos[j]).lerp(rawPos[j - 1], 0.25);
                } else {
                    nodes[j].set(0, 0, 0)
                        .addScaledVector(rawPos[j - 1], 0.2)
                        .addScaledVector(rawPos[j], 0.6)
                        .addScaledVector(rawPos[j + 1], 0.2);
                }
    
                // Update sphere mesh
                spheres[j].position.copy(nodes[j]);
                spheres[j].material.color.copy(currentColor);
            }
    
            // 3. Re-orient cylinders connecting the nodes
            for (let j = 0; j < NODES_PER_CHAIN - 1; j++) {
                const cylinder = bonds[j];
                positionCylinder(cylinder, nodes[j], nodes[j + 1]);
                cylinder.material.color.copy(currentColor);
            }
        });
    }
    
    // ============================================================
    // DUAL PLOTS ENGINE (WLF & DSC)
    // ============================================================
    
    function drawPlots(T, Tg) {
        const T_min = Tg - 20;
        const T_max = Tg + 40;
    
        // ==========================================
        // 1. DRAW MAIN PLOT (WLF)
        // ==========================================
        if (plotCanvasMain && plotCtxMain) {
            const ctx = plotCtxMain;
            const W = plotCanvasMain.width;
            const H = plotCanvasMain.height;
            ctx.clearRect(0, 0, W, H);
    
            const padLeft = 55;
            const padRight = 20;
            const padTop = 25;
            const padBottom = 35;
            const w = W - padLeft - padRight;
            const h = H - padTop - padBottom;
    
            const getX = (temp) => {
                return padLeft + ((temp - T_min) / (T_max - T_min)) * w;
            };
            const getY = (logAT) => {
                const val = logAT === null ? 0 : logAT;
                return padTop + (-val / 16) * h;
            };
    
            // Draw background grid
            ctx.strokeStyle = "#f1f5f9";
            ctx.lineWidth = 1;
            // Temperature vertical grid lines
            for (let temp = T_min; temp <= T_max; temp += 10) {
                const x = getX(temp);
                ctx.beginPath();
                ctx.moveTo(x, padTop);
                ctx.lineTo(x, padTop + h);
                ctx.stroke();
            }
            // log(a_T) horizontal grid lines
            for (let lv = 0; lv >= -16; lv -= 4) {
                const y = getY(lv);
                ctx.beginPath();
                ctx.moveTo(padLeft, y);
                ctx.lineTo(padLeft + w, y);
                ctx.stroke();
            }
    
            // Shaded Glassy Region (T < Tg) — clipped rectangular fill
            const xTg = getX(Tg);
            const xMin = getX(T_min);
            ctx.fillStyle = "rgba(226, 232, 240, 0.4)"; // soft slate grey
            ctx.fillRect(xMin, padTop, xTg - xMin, h);
            
            ctx.save();
            ctx.beginPath();
            ctx.rect(xMin, padTop, xTg - xMin, h);
            ctx.clip(); // clip to ensure perfect rectangular borders
    
            // Draw diagonal hatching lines in glassy region
            ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
            ctx.lineWidth = 1.0;
            for (let offset = xMin - h; offset < xTg + h; offset += 12) {
                ctx.beginPath();
                ctx.moveTo(offset, padTop);
                ctx.lineTo(offset + h, padTop + h);
                ctx.stroke();
            }
            ctx.restore();
    
            // Draw horizontal reference line at log(a_T) = 0
            ctx.strokeStyle = "#64748b";
            ctx.lineWidth = 1.2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(padLeft, getY(0));
            ctx.lineTo(padLeft + w, getY(0));
            ctx.stroke();
            ctx.setLineDash([]);
    
            // Draw vertical reference line at T = Tg
            ctx.strokeStyle = "#3B6FD8";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(xTg, padTop);
            ctx.lineTo(xTg, padTop + h);
            ctx.stroke();
            ctx.setLineDash([]);
    
            // Draw axes
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(padLeft, padTop);
            ctx.lineTo(padLeft, padTop + h);
            ctx.lineTo(padLeft + w, padTop + h);
            ctx.stroke();
    
            // Ticks and labels
            ctx.fillStyle = "#475569";
            ctx.font = "9px sans-serif";
            ctx.textAlign = "center";
            for (let temp = T_min; temp <= T_max; temp += 10) {
                const x = getX(temp);
                ctx.fillText(temp + "°C", x, padTop + h + 13);
            }
            ctx.textAlign = "right";
            for (let lv = 0; lv >= -16; lv -= 4) {
                const y = getY(lv);
                ctx.fillText(lv, padLeft - 6, y + 3);
            }
    
            // Y-axis label
            ctx.save();
            ctx.translate(15, padTop + h / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = "center";
            ctx.fillStyle = "#E2570F";
            ctx.font = "bold 10px sans-serif";
            ctx.fillText("log(a_T)", 0, 0);
            ctx.restore();
    
            // Draw WLF curve (only defined for T >= Tg)
            ctx.strokeStyle = "#E2570F";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            let started = false;
            for (let temp = Tg; temp <= T_max; temp += 0.2) {
                const logVal = wlfShiftFactor(temp, Tg);
                if (logVal !== null) {
                    const x = getX(temp);
                    const y = getY(logVal);
                    if (!started) {
                        ctx.moveTo(x, y);
                        started = true;
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
            }
            ctx.stroke();
    
            // Intersection point marker (open circle at (Tg, 0))
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "#E2570F";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(xTg, getY(0), 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
    
            // Graph-level Legend Box to stagger and clean up label collisions
            const legX = padLeft + w - 160;
            const legY = padTop + 20;
            ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
            ctx.fillRect(legX, legY, 150, 72);
            ctx.strokeStyle = "#cbd5e1";
            ctx.lineWidth = 1;
            ctx.strokeRect(legX, legY, 150, 72);
    
            ctx.fillStyle = "#1e293b";
            ctx.font = "bold 9px sans-serif";
            ctx.textAlign = "left";
            ctx.fillText("Main Plot Legend", legX + 8, legY + 11);
    
            ctx.font = "8px sans-serif";
            ctx.fillStyle = "#475569";
    
            // WLF Line legend
            ctx.strokeStyle = "#E2570F";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(legX + 8, legY + 22);
            ctx.lineTo(legX + 24, legY + 22);
            ctx.stroke();
            ctx.fillText("WLF Shift factor log(a_T)", legX + 30, legY + 25);
    
            // Reference point circle legend
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "#E2570F";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(legX + 16, legY + 34, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = "#475569";
            ctx.fillText("Ref: a_T = 1 at T = T_g", legX + 30, legY + 37);
    
            // Tg line legend
            ctx.strokeStyle = "#3B6FD8";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(legX + 8, legY + 46);
            ctx.lineTo(legX + 24, legY + 46);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = "#475569";
            ctx.fillText("Transition Line (T = T_g)", legX + 30, legY + 49);
    
            // Glassy region legend
            ctx.fillStyle = "rgba(226, 232, 240, 0.8)";
            ctx.fillRect(legX + 8, legY + 56, 16, 8);
            ctx.fillStyle = "#475569";
            ctx.fillText("Glassy Zone (Undefined)", legX + 30, legY + 63);
    
            // Draw current temperature tracker dot and label
            if (T >= T_min && T <= T_max) {
                const cx = getX(T);
                
                // Draw matching vertical line through full canvas height to link plots
                ctx.strokeStyle = "rgba(239, 68, 68, 0.3)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx, padTop);
                ctx.lineTo(cx, padTop + h);
                ctx.stroke();
    
                const logVal = wlfShiftFactor(T, Tg);
                if (logVal !== null) {
                    const cy = getY(logVal);
                    ctx.fillStyle = "#ef4444";
                    ctx.beginPath();
                    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
    
                    // Live tracker value label — dynamic side selection to prevent canvas edge clipping
                    const isNearRightEdge = (T > Tg + 18);
                    ctx.fillStyle = "#ef4444";
                    ctx.font = "bold 9px sans-serif";
                    ctx.textAlign = isNearRightEdge ? "right" : "left";
                    ctx.fillText(`log(a_T) = ${logVal.toFixed(2)}`, cx + (isNearRightEdge ? -8 : 8), cy + 3);
                }
            }
        }
    
        // ==========================================
        // 2. DRAW DSC PLOT (C_p)
        // ==========================================
        if (plotCanvasDSC && plotCtxDSC) {
            const ctx = plotCtxDSC;
            const W = plotCanvasDSC.width;
            const H = plotCanvasDSC.height;
            ctx.clearRect(0, 0, W, H);
    
            const padLeft = 55;
            const padRight = 20;
            const padTop = 15;
            const padBottom = 30;
            const w = W - padLeft - padRight;
            const h = H - padTop - padBottom;
    
            const getXDSC = (temp) => {
                return padLeft + ((temp - T_min) / (T_max - T_min)) * w;
            };
            const getYDSC = (cp) => {
                return padTop + h - (cp / 0.35) * h;
            };
    
            const xTg = getXDSC(Tg);
            const xMin = getXDSC(T_min);
            const xMax = getXDSC(T_max);
    
            // Shaded step background colors (Glassy vs Rubbery regime background tint)
            ctx.fillStyle = "rgba(226, 232, 240, 0.25)"; // pre-Tg glassy tint
            ctx.fillRect(xMin, padTop, xTg - xMin, h);
    
            ctx.fillStyle = "rgba(253, 242, 248, 0.4)"; // post-Tg rubbery pink tint
            ctx.fillRect(xTg, padTop, xMax - xTg, h);
    
            // Background grid
            ctx.strokeStyle = "#f1f5f9";
            ctx.lineWidth = 1;
            for (let temp = T_min; temp <= T_max; temp += 10) {
                const x = getXDSC(temp);
                ctx.beginPath();
                ctx.moveTo(x, padTop);
                ctx.lineTo(x, padTop + h);
                ctx.stroke();
            }
            for (let cpVal = 0.0; cpVal <= 0.3; cpVal += 0.1) {
                const y = getYDSC(cpVal);
                ctx.beginPath();
                ctx.moveTo(padLeft, y);
                ctx.lineTo(padLeft + w, y);
                ctx.stroke();
            }
    
            // Draw vertical reference line at T = Tg (DSC inflection)
            ctx.strokeStyle = "#3B6FD8";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(xTg, padTop);
            ctx.lineTo(xTg, padTop + h);
            ctx.stroke();
            ctx.setLineDash([]);
    
            // Draw inflection point marker dot exactly on the DSC sigmoid curve at T = Tg
            const yInflection = getYDSC(0.15); // Cp = 0.15 at Tg
            ctx.fillStyle = "#1E40AF";
            ctx.beginPath();
            ctx.arc(xTg, yInflection, 4, 0, Math.PI * 2);
            ctx.fill();
    
            // Label: "T_g (DSC inflection)"
            ctx.fillStyle = "#3B6FD8";
            ctx.font = "bold 9px sans-serif";
            ctx.textAlign = "left";
            ctx.fillText("T_g (DSC inflection)", xTg + 8, yInflection + 3);
    
            // Draw axes
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(padLeft, padTop);
            ctx.lineTo(padLeft, padTop + h);
            ctx.lineTo(padLeft + w, padTop + h);
            ctx.stroke();
    
            // Ticks and labels
            ctx.fillStyle = "#475569";
            ctx.font = "9px sans-serif";
            ctx.textAlign = "center";
            for (let temp = T_min; temp <= T_max; temp += 10) {
                const x = getXDSC(temp);
                ctx.fillText(temp + "°C", x, padTop + h + 13);
            }
            ctx.textAlign = "right";
            for (let cpVal = 0.0; cpVal <= 0.3; cpVal += 0.1) {
                const y = getYDSC(cpVal);
                ctx.fillText(cpVal.toFixed(1), padLeft - 6, y + 3);
            }
    
            // Y-axis label
            ctx.save();
            ctx.translate(15, padTop + h / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = "center";
            ctx.fillStyle = "#1E40AF";
            ctx.font = "bold 10px sans-serif";
            ctx.fillText("C_p (J/g°C)", 0, 0);
            ctx.restore();
    
            // Draw DSC Cp curve
            ctx.strokeStyle = "#1E40AF";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (let temp = T_min; temp <= T_max; temp += 0.5) {
                const cpVal = dscHeatFlow(temp, Tg);
                const x = getXDSC(temp);
                const y = getYDSC(cpVal);
                if (temp === T_min) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
    
            // Draw current temperature tracker dot
            if (T >= T_min && T <= T_max) {
                const cx = getXDSC(T);
                
                // Draw matching vertical line
                ctx.strokeStyle = "rgba(239, 68, 68, 0.3)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx, padTop);
                ctx.lineTo(cx, padTop + h);
                ctx.stroke();
    
                const cpVal = dscHeatFlow(T, Tg);
                const cy = getYDSC(cpVal);
                ctx.fillStyle = "#ef4444";
                ctx.beginPath();
                ctx.arc(cx, cy, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }
    }
    
    // ============================================================
    // DYNAMIC TABLE GENERATOR
    // ============================================================
    
    function updateBioTable() {
        if (!suitabilityTbody) return;
        suitabilityTbody.innerHTML = '';
    
        Object.keys(materials).forEach(key => {
            const m = materials[key];
            const delta = Math.abs(m.Tg - T_body);
            const evaluation = bioSuitability(m.Tg);
            const isActive = key === currentMaterial;
    
            const tr = document.createElement('tr');
            if (isActive) {
                tr.style.background = "rgba(138, 17, 52, 0.08)";
                tr.style.fontWeight = "bold";
                tr.style.borderLeft = "4px solid #E2570F";
            } else {
                tr.style.borderLeft = "4px solid transparent";
            }
    
            tr.innerHTML = `
                <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0;">${m.name}</td>
                <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0;">${m.Tg}°C</td>
                <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0;">${delta}°C</td>
                <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; text-align: right;">
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; background: ${evaluation.color}; color: ${evaluation.textColor}; border: 1px solid ${evaluation.border}; font-size: 10px; font-weight: 700;">
                        ${evaluation.score}
                    </span>
                </td>
            `;
            suitabilityTbody.appendChild(tr);
        });
    }
    
    // ============================================================
    // GOVERNING EQUATIONS RENDERER
    // ============================================================
    
    function updateEquationsPanel(T, Tg) {
        if (!latexFormulaContainer) return;
    
        let subWlf = "T &lt; T<sub>g</sub> &rArr; Undefined (Glassy State)";
        let subVisc = "T &lt; T<sub>g</sub> &rArr; Undefined";
        
        const logVal = wlfShiftFactor(T, Tg);
        const viscVal = viscosityRatio(logVal);
    
        if (logVal !== null) {
            const viscStr = viscVal.toExponential(3).replace('e', ' &times; 10<sup>') + '</sup>';
            subWlf = `log(a<sub>T</sub>) = -17.44(${T.toFixed(1)} - ${Tg}) / (51.6 + (${T.toFixed(1)} - ${Tg})) = ${logVal.toFixed(3)}`;
            subVisc = `a<sub>T</sub> = 10<sup>${logVal.toFixed(3)}</sup> = ${viscStr}`;
        }
    
        latexFormulaContainer.innerHTML = `
            <div style="font-family: inherit; line-height: 1.6; color: #1e293b; font-size: 16px; font-weight: bold;">
                <div><strong>WLF Shift Factor Equation:</strong> log(a<sub>T</sub>) = -C<sub>1</sub>(T - T<sub>g</sub>) / (C<sub>2</sub> + (T - T<sub>g</sub>))</div>
                <div style="margin-left: 20px; font-style: italic; color: #475569; font-size: 0.95em; margin-bottom: 8px;">Substitution: ${subWlf}</div>
                <div><strong>Viscosity Ratio:</strong> &eta;(T)/&eta;(T<sub>g</sub>) = a<sub>T</sub> = 10<sup>log(a<sub>T</sub>)</sup></div>
                <div style="margin-left: 20px; font-style: italic; color: #475569; font-size: 0.95em;">Substitution: ${subVisc}</div>
            </div>
        `;
    }
    
    // ============================================================
    // INTERACTIVE LOGIC & ANIMATION CONTROLLER
    // ============================================================
    
    function updateUI() {
        valTemp.innerText = currentT.toFixed(1) + " °C";
        inputTemp.value = currentT.toFixed(1);
    
        const logVal = wlfShiftFactor(currentT, Tg);
        const viscVal = viscosityRatio(logVal);
        const m = materials[currentMaterial];
    
        // Real-Time outputs
        if (resMat) resMat.innerText = m.name;
        if (resTg) resTg.innerText = Tg.toFixed(1) + " °C";
        if (resTemp) resTemp.innerText = currentT.toFixed(1) + " °C";
        
        if (logVal === null) {
            if (resWLF) {
                resWLF.innerText = "Undefined (Glassy)";
                resWLF.style.color = "#64748b";
            }
            if (resVisc) {
                resVisc.innerText = "Undefined";
                resVisc.style.color = "#64748b";
            }
            if (resRegime) {
                resRegime.innerText = "Glassy (T < Tg)";
                resRegime.style.color = "#475569";
            }
            stateLabel.innerText = "State: Glassy (Frozen)";
            stateLabel.style.color = "#475569";
            stateLabel.style.background = "#cbd5e1";
        } else {
            if (resWLF) {
                resWLF.innerText = logVal.toFixed(2);
                resWLF.style.color = "#E2570F";
            }
            if (resVisc) {
                resVisc.innerText = formatViscosityRatio(viscVal);
                resVisc.style.color = "#E2570F";
            }
            if (resRegime) {
                resRegime.innerText = "Rubbery (T >= Tg)";
                resRegime.style.color = "#E2570F";
            }
            stateLabel.innerText = "State: Rubbery (Viscoelastic)";
            stateLabel.style.color = "#ffffff";
            stateLabel.style.background = "#E2570F";
        }
    
        if (resDeltaT) {
            const deltaVal = currentT - Tg;
            resDeltaT.innerText = (deltaVal >= 0 ? "+" : "") + deltaVal.toFixed(1) + " °C";
            resDeltaT.style.color = deltaVal >= 0 ? "#E2570F" : "#475569";
        }
    
        // Insight banner content generator (without emojis)
        const evaluation = bioSuitability(m.Tg);
        let insightText = `<strong>Live Insight (${currentT.toFixed(1)}°C):</strong> `;
        
        if (currentT < Tg) {
            insightText += `The ${m.name} sample is below its Glass transition temperature of ${m.Tg}°C. The polymer chains are locked in a rigid glassy state, and WLF viscoelastic relaxation is frozen (undefined).`;
        } else if (currentT >= Tg && currentT < Tg + 15) {
            insightText += `Transition state reached! As temperature rises above ${m.Tg}°C, thermal energy unfreezes the molecular network. Viscoelastic sagging and jiggling begin. log(a_T) is currently ${logVal.toFixed(2)}.`;
        } else {
            insightText += `rubbery state active. The viscosity ratio has dropped to ${formatViscosityRatio(viscVal)}. The material is highly viscoelastic. Bio-suitability for 37°C body activation is rated as <strong>${evaluation.score}</strong>. ${evaluation.reason}`;
        }
        liveInsight.innerHTML = insightText;
    
        // Redraw 3D scene & plots
        updateSampleMesh(currentT, Tg);
        drawPlots(currentT, Tg);
        updateBioTable();
        updateEquationsPanel(currentT, Tg);
    }
    
    function handleMaterialChange(matKey) {
        currentMaterial = matKey;
        Tg = materials[matKey].Tg;
        localStorage.setItem('selectedMaterial', matKey);
    
        // Update temperature slider range: [Tg - 20, Tg + 40]
        const tMin = Tg - 20;
        const tMax = Tg + 40;
        inputTemp.min = tMin;
        inputTemp.max = tMax;
        currentT = tMin;
        inputTemp.value = currentT;
    
        updateUI();
    }
    
    // Sliders and Radio inputs
    [radioPU, radioPLA, radioPMMA].forEach(radio => {
        radio.addEventListener('change', () => {
            if (isAnimating) stopAnimation();
            handleMaterialChange(document.querySelector('input[name="mat"]:checked').value);
        });
    });
    
    inputTemp.addEventListener('input', () => {
        if (isAnimating) stopAnimation();
        currentT = parseFloat(inputTemp.value);
        updateUI();
    });
    
    inputRate.addEventListener('input', () => {
        valRate.innerText = inputRate.value + " °C/min";
    });
    
    // Animation Timeline
    function animateTimeline() {
        const tMax = Tg + 40;
        const rate = parseFloat(inputRate.value);
        // heating rate scaled down to frame rate step
        const dt = (rate * 0.06);
    
        currentT += dt;
        if (currentT >= tMax) {
            currentT = tMax;
            stopAnimation();
            const btnNext = document.getElementById('btnNextCalc');
            if (btnNext) btnNext.style.display = 'block';
        }
    
        updateUI();
    
        if (isAnimating) {
            animationFrameId = requestAnimationFrame(animateTimeline);
        }
    }
    
    function startAnimation() {
        isAnimating = true;
        btnRun.innerText = "Pause Cycle";
        btnRun.style.background = "#475569";
        currentT = Tg - 20; // reset to beginning
        animateTimeline();
    }
    
    function stopAnimation() {
        isAnimating = false;
        btnRun.innerText = "Run Thermal Cycle";
        btnRun.style.background = "#E2570F";
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }
    
    btnRun.addEventListener('click', () => {
        if (isAnimating) {
            stopAnimation();
        } else {
            startAnimation();
        }
    });
    
    // Three.js Render Loop
    function renderScene() {
        requestAnimationFrame(renderScene);
        if (controls) controls.update();
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }
    
    // Initialize on Load
    init3D();
    handleMaterialChange('PU');
    renderScene();
    updateBioTable();
})();

// ============================================================
// SCRIPT_B.JS (Page Check: document.getElementById('fixityCanvas'))
// ============================================================
(function() {
    if (!document.getElementById('fixityCanvas')) return;
    
    // ============================================================
    // MATERIAL DATABASE & PHYSICAL CONSTANTS
    // ============================================================
    
    const materials = {
        PU:   { Tg: 45,  E_glassy: 1500, E_rubbery: 15, Xc: 0.85, name: "PU-SMP",  desc: "Polyurethane Shape Memory Polymer" },
        PLA:  { Tg: 60,  E_glassy: 3000, E_rubbery: 25, Xc: 0.70, name: "PLA-SMP",  desc: "Polylactic Acid Shape Memory Polymer" },
        PMMA: { Tg: 105, E_glassy: 3200, E_rubbery: 30, Xc: 0.60, name: "PMMA-SMP", desc: "Polymethyl Methacrylate Shape Memory Polymer" }
    };
    
    // UI Elements
    const inheritedMatName = document.getElementById('inheritedMatName');
    const inheritedMatSpecs = document.getElementById('inheritedMatSpecs');
    const progTemp = document.getElementById('progTemp');
    const valPtemp = document.getElementById('valPtemp');
    const appStress = document.getElementById('appStress');
    const valStress = document.getElementById('valStress');
    const coolingRate = document.getElementById('coolingRate');
    const valCooling = document.getElementById('valCooling');
    const btnRun = document.getElementById('btnRun');
    const btnNextCalc = document.getElementById('btnNextCalc');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotCanvas = document.getElementById('plotCanvas');
    const plotCtx = plotCanvas.getContext('2d');
    const fixityCanvas = document.getElementById('fixityCanvas');
    const fixityCtx = fixityCanvas.getContext('2d');
    
    // Results elements
    const resStress = document.getElementById('resStress');
    const resMaxStrain = document.getElementById('resMaxStrain');
    const resFixed = document.getElementById('resFixed');
    const resFixity = document.getElementById('resFixity');
    const presetTbody = document.querySelector('#presetComparisonTable tbody');
    const latexFormulaContainer = document.getElementById('latexFormulaContainer');
    
    // Preset Buttons
    const presetTg10 = document.getElementById('presetTg10');
    const presetTg30 = document.getElementById('presetTg30');
    const presetTg60 = document.getElementById('presetTg60');
    
    // State Variables
    let currentMaterial = 'PU';
    let Tg = materials.PU.Tg;
    let E_glassy = materials.PU.E_glassy;
    let E_rubbery = materials.PU.E_rubbery;
    let Xc = materials.PU.Xc;
    let T_prog = 75;
    
    let isAnimating = false;
    let stress = 0;
    let strain = 0;
    let maxStrainReached = 0;
    let currentT = 75;
    // let animationFrameId = null;
    let timelineTime = 0;
    let historyPlot = [];
    
    // Three.js Globals
    let scene, camera, renderer, controls;
    let specimenMesh, gripL, gripR;
    
    // ============================================================
    // MATHEMATICAL FUNCTIONS
    // ============================================================
    
    /**
     * Shape Fixity Ratio R_f using a saturating exponential model
     */
    function calculateRf(T_prog, Tg, Xc) {
        if (T_prog <= Tg) return 0;
        const deltaT_char = 15.0; // characteristic temperature range
        return Xc * (1 - Math.exp(-(T_prog - Tg) / deltaT_char)) * 100; // %
    }
    
    function calculateEpsLoad(stress, E_r) {
        return (stress / E_r) * 100; // %
    }
    
    function calculateEpsFixed(epsLoad, Rf) {
        return (Rf / 100) * epsLoad; // %
    }
    
    // ============================================================
    // THREE.JS VISUALIZATION
    // ============================================================
    
    function init3D() {
        const container = document.getElementById('viewport3D');
        if (!container) return;
    
        container.innerHTML = '';
    
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xF4F5F3);
    
        camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
        camera.position.set(0, 1.2, 2.4);
    
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);
    
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 1.0;
        controls.maxDistance = 5.0;
        controls.target.set(0, 0, 0);
    
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
        scene.add(ambientLight);
    
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(2, 4, 3);
        dirLight.castShadow = true;
        scene.add(dirLight);
    
        // Standard Grid Floor
        const grid = new THREE.GridHelper(10, 10, 0xcbd5e1, 0xe2e8f0);
        grid.position.y = -0.4;
        scene.add(grid);
    
        // UTM Clamps/Grips
        const gripGeom = new THREE.BoxGeometry(0.25, 0.35, 0.35);
        const gripMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });
    
        gripL = new THREE.Mesh(gripGeom, gripMat);
        gripL.position.set(-0.75, 0, 0);
        scene.add(gripL);
    
        gripR = new THREE.Mesh(gripGeom, gripMat);
        gripR.position.set(0.75, 0, 0);
        scene.add(gripR);
    
        // Specimen Bar (stretches along length)
        const specimenGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 16); // base length matches grip gap (1.5)
        specimenGeom.rotateZ(Math.PI / 2); // align along X axis
    
        const specimenMat = new THREE.MeshStandardMaterial({
            color: 0x64748b, // cool glassy slate grey by default
            roughness: 0.3,
            metalness: 0.1
        });
    
        specimenMesh = new THREE.Mesh(specimenGeom, specimenMat);
        specimenMesh.position.set(0, 0, 0);
        scene.add(specimenMesh);
    }
    
    function updateSpecimenVisual(activeStrain, activeT) {
        if (!specimenMesh || !gripR) return;
    
        // Stretches specimen mesh (representing strain)
        // base length is 1.5 world units
        // activeStrain is in %
        const stretch = 1.0 + (activeStrain / 100.0);
        specimenMesh.scale.set(stretch, 1.0 / Math.sqrt(stretch), 1.0 / Math.sqrt(stretch));
        
        // Position the moving grip R to match specimen end
        gripR.position.x = -0.75 + 1.5 * stretch;
        specimenMesh.position.x = -0.75 + 0.75 * stretch; // left end stays anchored inside grip L at -0.75
    
        // Temperature color coding
        const softness = activeT >= Tg ? Math.min((activeT - Tg) / 40.0, 1.0) : 0.0;
        const colorGlassy = new THREE.Color(0x64748b);
        const colorRubbery = new THREE.Color(0xE2570F);
        specimenMesh.material.color.copy(colorGlassy).lerp(colorRubbery, softness);
    }
    
    // ============================================================
    // PLOTTING ENGINES
    // ============================================================
    
    /**
     * Plot 1: Stress vs Strain Loading Hysteresis Loop
     */
    function drawStressStrainPlot() {
        if (!plotCanvas) return;
        plotCtx.clearRect(0, 0, plotCanvas.width, plotCanvas.height);
    
        const padLeft = 50;
        const padRight = 20;
        const padTop = 30;
        const padBottom = 45;
        const w = plotCanvas.width - padLeft - padRight;
        const h = plotCanvas.height - padTop - padBottom;
    
        // Fixed axis ranges: Strain = [0, 40%], Stress = [0, 4 MPa]
        function getX(str) {
            return padLeft + (str / 40.0) * w;
        }
        function getY(strs) {
            return padTop + h - (strs / 4.0) * h;
        }
    
        // Grid lines
        plotCtx.strokeStyle = "#f1f5f9";
        plotCtx.lineWidth = 1;
        for (let s = 10; s <= 30; s += 10) {
            const x = getX(s);
            plotCtx.beginPath(); plotCtx.moveTo(x, padTop); plotCtx.lineTo(x, padTop + h); plotCtx.stroke();
        }
        for (let st = 1; st <= 3; st += 1) {
            const y = getY(st);
            plotCtx.beginPath(); plotCtx.moveTo(padLeft, y); plotCtx.lineTo(padLeft + w, y); plotCtx.stroke();
        }
    
        // Axes
        plotCtx.strokeStyle = "#94a3b8";
        plotCtx.lineWidth = 1.5;
        plotCtx.beginPath();
        plotCtx.moveTo(padLeft, padTop);
        plotCtx.lineTo(padLeft, padTop + h);
        plotCtx.lineTo(padLeft + w, padTop + h);
        plotCtx.stroke();
    
        // Ticks and Labels
        plotCtx.fillStyle = "#475569";
        plotCtx.font = "9px sans-serif";
        plotCtx.textAlign = "center";
        for (let s = 0; s <= 40; s += 10) {
            plotCtx.fillText(s + "%", getX(s), padTop + h + 13);
        }
        plotCtx.textAlign = "right";
        for (let st = 0; st <= 4; st += 1) {
            plotCtx.fillText(st, padLeft - 6, getY(st) + 3);
        }
    
        // Axis titles
        plotCtx.save();
        plotCtx.translate(15, padTop + h / 2);
        plotCtx.rotate(-Math.PI / 2);
        plotCtx.textAlign = "center";
        plotCtx.fillStyle = "#E2570F";
        plotCtx.font = "bold 10px sans-serif";
        plotCtx.fillText("Applied Stress σ (MPa)", 0, 0);
        plotCtx.restore();
    
        plotCtx.fillStyle = "#1e293b";
        plotCtx.font = "bold 10px sans-serif";
        plotCtx.textAlign = "center";
        plotCtx.fillText("Specimen Strain ε (%)", padLeft + w / 2, padTop + h + 30);
    
        // Plot Loop History
        if (historyPlot.length > 1) {
            plotCtx.strokeStyle = "#E2570F";
            plotCtx.lineWidth = 2.5;
            plotCtx.beginPath();
            plotCtx.moveTo(historyPlot[0].x, historyPlot[0].y);
            for (let i = 1; i < historyPlot.length; i++) {
                plotCtx.lineTo(historyPlot[i].x, historyPlot[i].y);
            }
            plotCtx.stroke();
        }
    
        // Current State Dot
        const cx = getX(strain);
        const cy = getY(stress);
        plotCtx.fillStyle = "#ef4444";
        plotCtx.beginPath();
        plotCtx.arc(cx, cy, 5, 0, Math.PI * 2);
        plotCtx.fill();
        plotCtx.strokeStyle = "#ffffff";
        plotCtx.lineWidth = 1;
        plotCtx.stroke();
    }
    
    /**
     * Plot 2: Rf vs (T_prog - Tg) curve
     */
    function drawFixityCurve() {
        if (!fixityCanvas) return;
        fixityCtx.clearRect(0, 0, fixityCanvas.width, fixityCanvas.height);
    
        const padLeft = 45;
        const padRight = 15;
        const padTop = 20;
        const padBottom = 35;
        const w = fixityCanvas.width - padLeft - padRight;
        const h = fixityCanvas.height - padTop - padBottom;
    
        function getX(dT) {
            return padLeft + (dT / 80.0) * w; // ΔT range: [0, 80°C]
        }
        function getY(rfVal) {
            return padTop + h - (rfVal / 100.0) * h; // Rf range: [0, 100%]
        }
    
        // Grid lines
        fixityCtx.strokeStyle = "#f1f5f9";
        fixityCtx.lineWidth = 1;
        for (let dt = 20; dt <= 60; dt += 20) {
            const x = getX(dt);
            fixityCtx.beginPath(); fixityCtx.moveTo(x, padTop); fixityCtx.lineTo(x, padTop + h); fixityCtx.stroke();
        }
        for (let rf = 20; rf <= 80; rf += 20) {
            const y = getY(rf);
            fixityCtx.beginPath(); fixityCtx.moveTo(padLeft, y); fixityCtx.lineTo(padLeft + w, y); fixityCtx.stroke();
        }
    
        // Axes
        fixityCtx.strokeStyle = "#cbd5e1";
        fixityCtx.lineWidth = 1.2;
        fixityCtx.beginPath();
        fixityCtx.moveTo(padLeft, padTop);
        fixityCtx.lineTo(padLeft, padTop + h);
        fixityCtx.lineTo(padLeft + w, padTop + h);
        fixityCtx.stroke();
    
        // Ticks & labels
        fixityCtx.fillStyle = "#64748b";
        fixityCtx.font = "8px sans-serif";
        fixityCtx.textAlign = "center";
        for (let dt = 0; dt <= 80; dt += 20) {
            fixityCtx.fillText("+" + dt + "°C", getX(dt), padTop + h + 12);
        }
        fixityCtx.textAlign = "right";
        for (let rf = 0; rf <= 100; rf += 20) {
            fixityCtx.fillText(rf + "%", padLeft - 6, getY(rf) + 3);
        }
    
        // Axis Titles
        fixityCtx.fillStyle = "#475569";
        fixityCtx.font = "bold 8px sans-serif";
        fixityCtx.fillText("T_prog - T_g", padLeft + w / 2, padTop + h + 25);
    
        fixityCtx.save();
        fixityCtx.translate(12, padTop + h / 2);
        fixityCtx.rotate(-Math.PI / 2);
        fixityCtx.fillText("Shape Fixity R_f (%)", 0, 0);
        fixityCtx.restore();
    
        // Plot full curve
        fixityCtx.strokeStyle = "#E2570F";
        fixityCtx.lineWidth = 2;
        fixityCtx.beginPath();
        let started = false;
        for (let dt = 0; dt <= 80; dt += 1) {
            const val = calculateRf(Tg + dt, Tg, Xc);
            const x = getX(dt);
            const y = getY(val);
            if (!started) {
                fixityCtx.moveTo(x, y);
                started = true;
            } else {
                fixityCtx.lineTo(x, y);
            }
        }
        fixityCtx.stroke();
    
        // Draw Asymptote line (R_f = X_c * 100%)
        const yAsymptote = getY(Xc * 100);
        fixityCtx.strokeStyle = "#ef4444";
        fixityCtx.lineWidth = 1;
        fixityCtx.setLineDash([3, 3]);
        fixityCtx.beginPath();
        fixityCtx.moveTo(padLeft, yAsymptote);
        fixityCtx.lineTo(padLeft + w, yAsymptote);
        fixityCtx.stroke();
        fixityCtx.setLineDash([]);
        fixityCtx.fillStyle = "#ef4444";
        fixityCtx.textAlign = "right";
        fixityCtx.fillText(`Limit: X_c = ${(Xc * 100).toFixed(0)}%`, padLeft + w - 4, yAsymptote - 4);
    
        // Current State Dot
        const currentDeltaT = Math.max(0, T_prog - Tg);
        const currentRf = calculateRf(T_prog, Tg, Xc);
        const dotX = getX(currentDeltaT);
        const dotY = getY(currentRf);
    
        fixityCtx.fillStyle = "#ef4444";
        fixityCtx.beginPath();
        fixityCtx.arc(dotX, dotY, 4.5, 0, Math.PI * 2);
        fixityCtx.fill();
        fixityCtx.strokeStyle = "#ffffff";
        fixityCtx.lineWidth = 1;
        fixityCtx.stroke();
    }
    
    // ============================================================
    // DYNAMIC PRESET TABLE & EQUATIONS PANEL
    // ============================================================
    
    function updatePresetTable() {
        if (!presetTbody) return;
        presetTbody.innerHTML = '';
    
        const activeStress = parseFloat(appStress.value);
        const presets = [10, 30, 60];
    
        presets.forEach(offset => {
            const tp = Tg + offset;
            const epsL = calculateEpsLoad(activeStress, E_rubbery);
            const rf = calculateRf(tp, Tg, Xc);
            const epsF = calculateEpsFixed(epsL, rf);
    
            const isActive = Math.abs(T_prog - tp) < 0.1;
    
            const tr = document.createElement('tr');
            if (isActive) {
                tr.style.background = "rgba(138, 17, 52, 0.08)";
                tr.style.fontWeight = "bold";
                tr.style.borderLeft = "4px solid #E2570F";
            } else {
                tr.style.borderLeft = "4px solid transparent";
            }
    
            tr.innerHTML = `
                <td style="padding: 6px 2px; border-bottom: 1px solid #cbd5e1;">${tp.toFixed(0)}°C</td>
                <td style="padding: 6px 2px; border-bottom: 1px solid #cbd5e1;">+${offset}°C</td>
                <td style="padding: 6px 2px; border-bottom: 1px solid #cbd5e1;">${epsL.toFixed(1)}%</td>
                <td style="padding: 6px 2px; border-bottom: 1px solid #cbd5e1;">${rf.toFixed(1)}%</td>
                <td style="padding: 6px 2px; border-bottom: 1px solid #cbd5e1; text-align: right;">${epsF.toFixed(1)}%</td>
            `;
            presetTbody.appendChild(tr);
        });
    }
    
    function updateEquationsPanel() {
        if (!latexFormulaContainer) return;
    
        const activeStress = parseFloat(appStress.value);
        const epsL = calculateEpsLoad(activeStress, E_rubbery);
        const rf = calculateRf(T_prog, Tg, Xc);
        const epsF = calculateEpsFixed(epsL, rf);
    
        latexFormulaContainer.innerHTML = `
            <div style="font-family: inherit; line-height: 1.6; color: #1e293b; font-size: 16px; font-weight: bold;">
                <div><strong>1. Rubber Loading Strain:</strong> &epsilon;<sub>load</sub> = (&sigma; / E<sub>rubbery</sub>) &times; 100% = (${activeStress.toFixed(1)} / ${E_rubbery}) &times; 100% = ${epsL.toFixed(1)}%</div>
                <div style="margin-top: 8px;"><strong>2. Shape Fixity Ratio:</strong> R<sub>f</sub> = X<sub>c</sub> &times; [1 - exp(-(T<sub>prog</sub> - T<sub>g</sub>) / 15)] &times; 100% = ${rf.toFixed(1)}%</div>
                <div style="margin-top: 8px;"><strong>3. Fixed Shape Strain:</strong> &epsilon;<sub>u</sub> = (R<sub>f</sub> / 100) &times; &epsilon;<sub>load</sub> = (${rf.toFixed(1)} / 100) &times; ${epsL.toFixed(1)}% = ${epsF.toFixed(1)}%</div>
            </div>
        `;
    }
    
    // ============================================================
    // TIMELINE & ANIMATION LOGIC
    // ============================================================
    
    function updateUI() {
        valPtemp.innerText = T_prog.toFixed(0) + " °C";
        progTemp.value = T_prog.toFixed(0);
        valStress.innerText = parseFloat(appStress.value).toFixed(0) + " MPa";
        valCooling.innerText = parseFloat(coolingRate.value).toFixed(0) + " °C/min";
    
        // Update read-only material inherited display card
        const m = materials[currentMaterial];
        inheritedMatName.innerText = m.name;
        inheritedMatSpecs.innerText = `T_g = ${Tg.toFixed(1)}°C | X_c = ${Xc.toFixed(2)} | E_r = ${E_rubbery} MPa`;
    
        // Results panel text updates
        resStress.innerText = parseFloat(appStress.value).toFixed(1) + " MPa";
        
        // Set actual numeric values in results
        const epsL = calculateEpsLoad(parseFloat(appStress.value), E_rubbery);
        const rf = calculateRf(T_prog, Tg, Xc);
        const epsF = calculateEpsFixed(epsL, rf);
    
        localStorage.setItem('eps_u', epsF.toFixed(4));
        localStorage.setItem('selectedMaterial', currentMaterial);
    
        if (timelineTime === 0) {
            resMaxStrain.innerText = "-";
            resFixed.innerText = "-";
            resFixity.innerText = "-";
        } else {
            resMaxStrain.innerText = epsL.toFixed(2) + " %";
            resFixed.innerText = epsF.toFixed(2) + " %";
            resFixity.innerText = rf.toFixed(1) + " %";
        }
    
        updateSpecimenVisual(strain, currentT);
        drawStressStrainPlot();
        drawFixityCurve();
        updatePresetTable();
        updateEquationsPanel();
    }
    
    function handlePresetClick(offset) {
        if (isAnimating) return;
        T_prog = Tg + offset;
        updateUI();
    }
    
    // Sliders and Preset Buttons listeners
    progTemp.addEventListener('input', () => {
        T_prog = parseFloat(progTemp.value);
        // Remove active styling on presets if custom T is selected
        document.querySelectorAll('.btn-preset').forEach(b => {
            b.style.background = "#FAFAF9";
            b.style.color = "#475569";
        });
        updateUI();
    });
    
    appStress.addEventListener('input', () => {
        updateUI();
    });
    
    coolingRate.addEventListener('input', () => {
        updateUI();
    });
    
    presetTg10.addEventListener('click', () => {
        handlePresetClick(10);
        setActivePresetStyle(presetTg10);
    });
    presetTg30.addEventListener('click', () => {
        handlePresetClick(30);
        setActivePresetStyle(presetTg30);
    });
    presetTg60.addEventListener('click', () => {
        handlePresetClick(60);
        setActivePresetStyle(presetTg60);
    });
    
    function setActivePresetStyle(btn) {
        document.querySelectorAll('.btn-preset').forEach(b => {
            b.style.background = "#FAFAF9";
            b.style.color = "#475569";
            b.style.borderColor = "#cbd5e1";
        });
        btn.style.background = "#E2570F";
        btn.style.color = "#ffffff";
        btn.style.borderColor = "#E2570F";
    }
    
    // Cycle execution timeline
    let intervalId = null;
    
    function runUTMCycle() {
        isAnimating = true;
        btnRun.disabled = true;
        btnRun.innerText = "Running Cycle...";
        btnRun.style.background = "#475569";
    
        const activeStress = parseFloat(appStress.value);
        const coolRate = parseFloat(coolingRate.value);
        
        // Physics targets
        const epsL = calculateEpsLoad(activeStress, E_rubbery);
        const rf = calculateRf(T_prog, Tg, Xc);
        const epsF = calculateEpsFixed(epsL, rf);
    
        // Reset loop variables
        stress = 0;
        strain = 0;
        currentT = T_prog;
        timelineTime = 1;
        historyPlot = [];
    
        // Helper mapping
        function getX(str) {
            const padLeft = 50, padRight = 20, w = plotCanvas.width - padLeft - padRight;
            return padLeft + (str / 40.0) * w;
        }
        function getY(strs) {
            const padTop = 30, padBottom = 45, h = plotCanvas.height - padTop - padBottom;
            return padTop + h - (strs / 4.0) * h;
        }
    
        historyPlot.push({ x: getX(strain), y: getY(stress) });
    
        let utmPhase = 1; // 1: Loading, 2: Holding/Cooling, 3: Unloading, 4: Finished
    
        if (intervalId) clearInterval(intervalId);
    
        intervalId = setInterval(() => {
            if (utmPhase === 1) {
                // Phase 1: Loading (Stress increases to target at rubbery state T_prog)
                stateLabel.innerText = "UTM Phase 1: Tensile Loading";
                stress += 0.2; 
                if (stress >= activeStress) {
                    stress = activeStress;
                }
                strain = calculateEpsLoad(stress, E_rubbery);
                liveInsight.innerHTML = `<strong>UTM Phase 1 (Loading):</strong> Applying stress to stretch the polymer. Modulus is low (rubbery state: ${E_rubbery} MPa), resulting in a shallow slope on the Stress vs Strain plot.`;
                
                if (stress === activeStress) {
                    utmPhase = 2; // proceed to cooling
                    maxStrainReached = strain;
                }
            } else if (utmPhase === 2) {
                // Phase 2: Holding & Quenching (Temperature cools below Tg)
                stateLabel.innerText = "UTM Phase 2: Cooling/Quenching";
                
                // Cool down step based on coolingRate
                const dT = coolRate * 0.08; 
                currentT -= dT;
    
                // Introduce slight viscoelastic creep during early cooling
                if (currentT > Tg) {
                    strain += 0.15; // slow creep
                    maxStrainReached = strain;
                }
    
                liveInsight.innerHTML = `<strong>UTM Phase 2 (Cooling):</strong> Cooling the specimen under stress down to ${currentT.toFixed(0)}°C (below T_g). Specimen shifts color as molecular chains freeze into the stretched shape.`;
    
                if (currentT <= Tg - 15) {
                    currentT = Tg - 15;
                    utmPhase = 3; // proceed to unloading
                }
            } else if (utmPhase === 3) {
                // Phase 3: Unloading (Stress decreases back to 0 at glassy state)
                stateLabel.innerText = "UTM Phase 3: Unloading";
                stress -= 0.2;
                if (stress <= 0) {
                    stress = 0;
                }
    
                // Unloading elastic recovery uses glassy modulus E_glassy
                const stressRecovered = activeStress - stress;
                strain = maxStrainReached - (stressRecovered / E_glassy) * 100;
                if (strain < 0) strain = 0;
    
                liveInsight.innerHTML = `<strong>UTM Phase 3 (Unloading):</strong> Releasing tensile stress. Because the polymer is now glassy (${E_glassy} MPa), elastic springback is negligible, locking the shape.`;
    
                if (stress === 0) {
                    utmPhase = 4;
                }
            } else if (utmPhase === 4) {
                // Finished
                clearInterval(intervalId);
                intervalId = null;
                isAnimating = false;
                btnRun.disabled = false;
                btnRun.innerText = "Execute Programming Cycle";
                btnRun.style.background = "#E2570F";
                btnNextCalc.style.display = "block";
    
                // Enforce exact mathematical end state values in readouts
                strain = epsF;
                updateUI();
    
                liveInsight.innerHTML = `<strong>Programming Complete:</strong> Shape fixity ratio R_f is ${(rf).toFixed(1)}%. Specimen successfully programmed into a fixed temporary shape.`;
            }
    
            // Add history coordinates
            historyPlot.push({ x: getX(strain), y: getY(stress) });
            updateUI();
    
        }, 35);
    }
    
    btnRun.addEventListener('click', () => {
        if (!isAnimating) runUTMCycle();
    });
    
    // Three.js Render Loop
    function renderScene() {
        requestAnimationFrame(renderScene);
        if (controls) controls.update();
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }
    
    // Initializing state
    function initializeState() {
        // Read inherited material from localStorage
        currentMaterial = localStorage.getItem('selectedMaterial') || 'PU';
        
        // Bind to database values
        const m = materials[currentMaterial];
        Tg = m.Tg;
        E_glassy = m.E_glassy;
        E_rubbery = m.E_rubbery;
        Xc = m.Xc;
    
        // Rescale progTemp slider range based on inherited material
        progTemp.min = Tg - 20;
        progTemp.max = Tg + 80;
        T_prog = Tg + 30; // default preset
        progTemp.value = T_prog;
    
        // Highlight preset Tg+30 by default
        setActivePresetStyle(presetTg30);
    
        // Initialize 3D scene & graphics
        init3D();
        renderScene();
        updateUI();
    }
    
    // Load initialization
    initializeState();
})();

// ============================================================
// SCRIPT_C.JS (Page Check: document.getElementById('inheritedStrainVal'))
// ============================================================
(function() {
    if (!document.getElementById('inheritedStrainVal')) return;
    
    // ============================================================
    // MATERIAL DATABASE & PHYSICAL CONSTANTS
    // ============================================================
    
    const materials = {
        PU:   { Tg: 45,  E_glassy: 1500, E_rubbery: 15, Xc: 0.85, name: "PU-SMP",  desc: "Polyurethane Shape Memory Polymer" },
        PLA:  { Tg: 60,  E_glassy: 3000, E_rubbery: 25, Xc: 0.70, name: "PLA-SMP",  desc: "Polylactic Acid Shape Memory Polymer" },
        PMMA: { Tg: 105, E_glassy: 3200, E_rubbery: 30, Xc: 0.60, name: "PMMA-SMP", desc: "Polymethyl Methacrylate Shape Memory Polymer" }
    };
    
    const C1 = 17.44;
    const C2 = 51.6;
    
    // UI Elements
    const inheritedMatName = document.getElementById('inheritedMatName');
    const inheritedMatSpecs = document.getElementById('inheritedMatSpecs');
    const inheritedStrainVal = document.getElementById('inheritedStrainVal');
    const scenarioFree = document.getElementById('scenarioFree');
    const scenarioConstrained = document.getElementById('scenarioConstrained');
    const recTemp = document.getElementById('recTemp');
    const valRecTemp = document.getElementById('valRecTemp');
    const oppStressGroup = document.getElementById('oppStressGroup');
    const oppStress = document.getElementById('oppStress');
    const valOppStress = document.getElementById('valOppStress');
    const tauRef = document.getElementById('tauRef');
    const valTauRef = document.getElementById('valTauRef');
    const btnRun = document.getElementById('btnRun');
    const btnNextCalc = document.getElementById('btnNextCalc');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotCanvas = document.getElementById('plotCanvas');
    const plotCtx = plotCanvas.getContext('2d');
    
    // Results elements
    const resTau = document.getElementById('resTau');
    const resRr = document.getElementById('resRr');
    const resRecStress = document.getElementById('resRecStress');
    const resT95 = document.getElementById('resT95');
    const scenarioTableBody = document.querySelector('#scenarioTable tbody');
    const latexFormulaContainer = document.getElementById('latexFormulaContainer');
    
    // State Variables
    let currentMaterial = 'PU';
    let Tg = materials.PU.Tg;
    let E_rubbery = materials.PU.E_rubbery;
    let Xc = materials.PU.Xc;
    let eps_u = 9.80; // inherited strain %
    let activeScenario = 'free'; // 'free' or 'constrained'
    let isAnimating = false;
    let strain = 0;
    // let currentT = 75;
    // let animationFrameId = null;
    let simTime = 0;
    let intervalId = null;
    
    // Three.js Globals
    let scene, camera, renderer, controls;
    let specimenMesh, gripL, gripR, wallMesh, arrowHelper;
    
    // ============================================================
    // MATHEMATICAL FUNCTIONS
    // ============================================================
    
    /**
     * WLF Shift Factor log(a_T)
     */
    function wlfShiftFactor(T, Tg) {
        if (T < Tg) return null;
        return -C1 * (T - Tg) / (C2 + (T - Tg));
    }
    
    /**
     * WLF-based relaxation time tau(T)
     */
    function relaxationTime(T, Tg, tau_ref) {
        if (T < Tg) return Infinity;
        const logAT = wlfShiftFactor(T, Tg);
        if (logAT === null) return Infinity;
        return tau_ref * Math.pow(10, logAT);
    }
    
    /**
     * Equilibrium strain eps_eq
     */
    function epsEqConstrained(eps_u, E_rubbery, sigma_applied) {
        return Math.min(eps_u, (sigma_applied / E_rubbery) * 100);
    }
    
    /**
     * First-order shape recovery kinetics (analytical step)
     */
    function stepRecovery(eps_current, eps_eq, tau, dt) {
        if (tau === Infinity) return eps_current;
        return eps_eq + (eps_current - eps_eq) * Math.exp(-dt / tau);
    }
    
    /**
     * Shape Recovery Ratio R_r
     */
    function recoveryRatio(eps_u, eps_recovered) {
        if (eps_u === 0) return 100;
        return ((eps_u - eps_recovered) / eps_u) * 100;
    }
    
    /**
     * Blocking recovery stress
     */
    function recoveryStress(E_rubbery, eps_u, eps_eq) {
        return E_rubbery * eps_eq / 100;
    }
    
    /**
     * Time to 95% recovery
     */
    function timeTo95Recovery(tau) {
        if (tau === Infinity) return Infinity;
        return tau * Math.log(20);
    }
    
    function formatTau(tauVal) {
        if (tauVal === Infinity) return "Infinity (Frozen)";
        if (tauVal < 0.001) {
            return tauVal.toExponential(3) + " s";
        }
        if (tauVal < 0.1) {
            return tauVal.toFixed(4) + " s";
        }
        return tauVal.toFixed(1) + " s";
    }
    
    function formatT95(t95Val) {
        if (t95Val === Infinity) return "Infinity";
        if (t95Val < 0.001) {
            return t95Val.toExponential(3) + " s";
        }
        if (t95Val < 0.1) {
            return t95Val.toFixed(4) + " s";
        }
        return t95Val.toFixed(1) + " s";
    }
    
    // ============================================================
    // THREE.JS VISUALIZATION
    // ============================================================
    
    function init3D() {
        const container = document.getElementById('viewport3D');
        if (!container) return;
        container.innerHTML = '';
    
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xF4F5F3);
    
        camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
        camera.position.set(0, 1.2, 2.4);
    
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);
    
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 1.0;
        controls.maxDistance = 5.0;
        controls.target.set(0, 0, 0);
    
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
        scene.add(ambientLight);
    
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(2, 4, 3);
        dirLight.castShadow = true;
        scene.add(dirLight);
    
        const grid = new THREE.GridHelper(10, 10, 0xcbd5e1, 0xe2e8f0);
        grid.position.y = -0.4;
        scene.add(grid);
    
        // UTM Grips
        const gripGeom = new THREE.BoxGeometry(0.25, 0.35, 0.35);
        const gripMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });
    
        gripL = new THREE.Mesh(gripGeom, gripMat);
        gripL.position.set(-0.75, 0, 0);
        scene.add(gripL);
    
        gripR = new THREE.Mesh(gripGeom, gripMat);
        gripR.position.set(0.75, 0, 0);
        scene.add(gripR);
    
        // Specimen base cylinder
        const specimenGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 16);
        specimenGeom.rotateZ(Math.PI / 2);
    
        const specimenMat = new THREE.MeshStandardMaterial({
            color: 0xE2570F, // starts rubbery/programmed red
            roughness: 0.3,
            metalness: 0.1
        });
    
        specimenMesh = new THREE.Mesh(specimenGeom, specimenMat);
        specimenMesh.position.set(0, 0, 0);
        scene.add(specimenMesh);
    
        // Constraint Wall
        const wallGeom = new THREE.BoxGeometry(0.06, 0.45, 0.45);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.3 });
        wallMesh = new THREE.Mesh(wallGeom, wallMat);
        wallMesh.visible = false;
        scene.add(wallMesh);
    
        // Stress Arrow
        arrowHelper = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            0.1,
            0xef4444,
            0.08,
            0.04
        );
        arrowHelper.visible = false;
        scene.add(arrowHelper);
    }
    
    function updateSpecimenVisual(activeStrain, activeT, activeScenario, epsEqVal, sigmaRecVal) {
        if (!specimenMesh || !gripR || !wallMesh || !arrowHelper) return;
    
        const stretch = 1.0 + (activeStrain / 100.0);
        specimenMesh.scale.set(stretch, 1.0 / Math.sqrt(stretch), 1.0 / Math.sqrt(stretch));
        
        gripR.position.x = -0.75 + 1.5 * stretch;
        specimenMesh.position.x = -0.75 + 0.75 * stretch;
    
        // Color transition (turns colder/greyer as strain relaxes to recovery shape)
        const normalizedRec = Math.min(recoveryRatio(eps_u, activeStrain) / 100.0, 1.0);
        const colorProgrammed = new THREE.Color(0xE2570F); // rubbery burgundy
        const colorRecovered = new THREE.Color(0x475569);  // neutral slate grey
        specimenMesh.material.color.copy(colorProgrammed).lerp(colorRecovered, normalizedRec);
    
        if (activeScenario === 'constrained') {
            wallMesh.visible = true;
            const wallX = -0.75 + 1.5 * (1.0 + epsEqVal / 100.0);
            wallMesh.position.set(wallX + 0.15, 0, 0); // positioned right after gripR endpoint
    
            // If grip has met the wall, render the stress arrow
            const maxStressVal = recoveryStress(E_rubbery, eps_u, epsEqVal);
            if (activeStrain <= epsEqVal + 0.05 && maxStressVal > 0) {
                arrowHelper.visible = true;
                arrowHelper.position.set(wallX + 0.12, 0, 0);
                
                // Length scales with active recovery stress
                const length = 0.1 + 0.3 * (sigmaRecVal / maxStressVal);
                arrowHelper.setLength(length, 0.08, 0.04);
            } else {
                arrowHelper.visible = false;
            }
        } else {
            wallMesh.visible = false;
            arrowHelper.visible = false;
        }
    }
    
    // ============================================================
    // PLOTTING ENGINE
    // ============================================================
    
    function drawPlot(activeTime) {
        if (!plotCanvas) return;
        plotCtx.clearRect(0, 0, plotCanvas.width, plotCanvas.height);
    
        const padLeft = 50;
        const padRight = 20;
        const padTop = 30;
        const padBottom = 45;
        const w = plotCanvas.width - padLeft - padRight;
        const h = plotCanvas.height - padTop - padBottom;
    
        const activeTemp = parseFloat(recTemp.value);
        const activeTau = relaxationTime(activeTemp, Tg, parseFloat(tauRef.value));
        
        // Scale time axis dynamically up to 1.5 * t_95
        const t95 = timeTo95Recovery(activeTau);
        const tMax = t95 === Infinity ? 500 : t95 * 1.5;
    
        function getX(tVal) {
            return padLeft + (tVal / tMax) * w;
        }
        function getY(strainVal) {
            return padTop + h - (strainVal / eps_u) * h;
        }
    
        // Grid lines
        plotCtx.strokeStyle = "#f1f5f9";
        plotCtx.lineWidth = 1;
        for (let t = tMax / 5; t < tMax; t += tMax / 5) {
            const x = getX(t);
            plotCtx.beginPath(); plotCtx.moveTo(x, padTop); plotCtx.lineTo(x, padTop + h); plotCtx.stroke();
        }
        for (let s = eps_u / 4; s < eps_u; s += eps_u / 4) {
            const y = getY(s);
            plotCtx.beginPath(); plotCtx.moveTo(padLeft, y); plotCtx.lineTo(padLeft + w, y); plotCtx.stroke();
        }
    
        // Axes
        plotCtx.strokeStyle = "#cbd5e1";
        plotCtx.lineWidth = 1.5;
        plotCtx.beginPath();
        plotCtx.moveTo(padLeft, padTop);
        plotCtx.lineTo(padLeft, padTop + h);
        plotCtx.lineTo(padLeft + w, padTop + h);
        plotCtx.stroke();
    
        // Ticks and Labels
        plotCtx.fillStyle = "#64748b";
        plotCtx.font = "8px sans-serif";
        plotCtx.textAlign = "center";
        for (let t = 0; t <= tMax; t += tMax / 5) {
            plotCtx.fillText(t.toFixed(0) + "s", getX(t), padTop + h + 13);
        }
        plotCtx.textAlign = "right";
        for (let s = 0; s <= eps_u; s += eps_u / 4) {
            plotCtx.fillText(s.toFixed(1) + "%", padLeft - 6, getY(s) + 3);
        }
    
        // Titles
        plotCtx.fillStyle = "#1e293b";
        plotCtx.font = "bold 9px sans-serif";
        plotCtx.textAlign = "center";
        plotCtx.fillText("Recovery Time t (s)", padLeft + w / 2, padTop + h + 30);
    
        plotCtx.save();
        plotCtx.translate(15, padTop + h / 2);
        plotCtx.rotate(-Math.PI / 2);
        plotCtx.fillText("Strain (%)", 0, 0);
        plotCtx.restore();
    
        // Plot isothermal analytical curves
        // Curve 1: Free Recovery (Dashed)
        plotCtx.strokeStyle = "#64748b";
        plotCtx.lineWidth = 1.5;
        plotCtx.setLineDash([3, 3]);
        plotCtx.beginPath();
        for (let tVal = 0; tVal <= tMax; tVal += tMax / 50) {
            const epsFree = eps_u * Math.exp(-tVal / activeTau);
            if (tVal === 0) plotCtx.moveTo(getX(tVal), getY(epsFree));
            else plotCtx.lineTo(getX(tVal), getY(epsFree));
        }
        plotCtx.stroke();
    
        // Curve 2: Constrained Recovery (Solid)
        const activeSigma = parseFloat(oppStress.value);
        const epsEq = epsEqConstrained(eps_u, E_rubbery, activeSigma);
        plotCtx.strokeStyle = "#E2570F";
        plotCtx.lineWidth = 2.5;
        plotCtx.setLineDash([]);
        plotCtx.beginPath();
        for (let tVal = 0; tVal <= tMax; tVal += tMax / 50) {
            const epsConstrained = epsEq + (eps_u - epsEq) * Math.exp(-tVal / activeTau);
            if (tVal === 0) plotCtx.moveTo(getX(tVal), getY(epsConstrained));
            else plotCtx.lineTo(getX(tVal), getY(epsConstrained));
        }
        plotCtx.stroke();
    
        // Moving Tracer Dot during simulation
        if (isAnimating && activeTime >= 0 && activeTime <= tMax) {
            const tracerStrain = activeScenario === 'free' 
                ? eps_u * Math.exp(-activeTime / activeTau)
                : epsEq + (eps_u - epsEq) * Math.exp(-activeTime / activeTau);
    
            const cx = getX(activeTime);
            const cy = getY(tracerStrain);
    
            plotCtx.fillStyle = "#ef4444";
            plotCtx.beginPath();
            plotCtx.arc(cx, cy, 5, 0, Math.PI * 2);
            plotCtx.fill();
            plotCtx.strokeStyle = "#ffffff";
            plotCtx.lineWidth = 1.2;
            plotCtx.stroke();
        }
    }
    
    // ============================================================
    // DYNAMIC TABLES & EQUATIONS
    // ============================================================
    
    function updateScenarioTable() {
        if (!scenarioTableBody) return;
        scenarioTableBody.innerHTML = '';
    
        const activeTemp = parseFloat(recTemp.value);
        const activeTau = relaxationTime(activeTemp, Tg, parseFloat(tauRef.value));
        const activeSigma = parseFloat(oppStress.value);
        
        const scenarios = [
            { name: 'Free Recovery', eq: 0, sigma: 0, isCurrent: activeScenario === 'free' },
            { name: 'Constrained', eq: epsEqConstrained(eps_u, E_rubbery, activeSigma), sigma: recoveryStress(E_rubbery, eps_u, epsEqConstrained(eps_u, E_rubbery, activeSigma)), isCurrent: activeScenario === 'constrained' }
        ];
    
        scenarios.forEach(sc => {
            const rfVal = recoveryRatio(eps_u, sc.eq);
            const t95Val = timeTo95Recovery(activeTau);
            const t95Str = formatT95(t95Val);
    
            const tr = document.createElement('tr');
            if (sc.isCurrent) {
                tr.style.background = "rgba(138, 17, 52, 0.08)";
                tr.style.fontWeight = "bold";
                tr.style.borderLeft = "4px solid #E2570F";
            } else {
                tr.style.borderLeft = "4px solid transparent";
            }
    
            tr.innerHTML = `
                <td style="padding: 8px 4px; border-bottom: 1px solid #cbd5e1;">${sc.name}</td>
                <td style="padding: 8px 4px; border-bottom: 1px solid #cbd5e1;">${sc.eq.toFixed(2)}%</td>
                <td style="padding: 8px 4px; border-bottom: 1px solid #cbd5e1;">${rfVal.toFixed(1)}%</td>
                <td style="padding: 8px 4px; border-bottom: 1px solid #cbd5e1;">${sc.sigma.toFixed(2)} MPa</td>
                <td style="padding: 8px 4px; border-bottom: 1px solid #cbd5e1; text-align: right;">${t95Str}</td>
            `;
            scenarioTableBody.appendChild(tr);
        });
    }
    
    function updateEquationsPanel() {
        if (!latexFormulaContainer) return;
    
        const activeTemp = parseFloat(recTemp.value);
        const activeTau = relaxationTime(activeTemp, Tg, parseFloat(tauRef.value));
        const activeSigma = parseFloat(oppStress.value);
        const epsEq = epsEqConstrained(eps_u, E_rubbery, activeSigma);
        const sigmaRec = recoveryStress(E_rubbery, eps_u, epsEq);
    
        const logAT = wlfShiftFactor(activeTemp, Tg);
        const logATStr = logAT === null ? "&infin;" : logAT.toFixed(3);
        
        let tauStr;
        if (activeTau === Infinity) {
            tauStr = "&infin;";
        } else if (activeTau < 0.001) {
            const str = activeTau.toExponential(3); // e.g. "3.870e-4"
            const parts = str.split('e');
            tauStr = `${parts[0]} &times; 10<sup>${parts[1]}</sup> s`;
        } else if (activeTau < 0.1) {
            tauStr = activeTau.toFixed(4) + " s";
        } else {
            tauStr = activeTau.toFixed(1) + " s";
        }
    
        latexFormulaContainer.innerHTML = `
            <div style="font-family: inherit; line-height: 1.6; color: #1e293b; font-size: 16px; font-weight: bold;">
                <div><strong>1. WLF Shift log(a<sub>T</sub>) at ${activeTemp.toFixed(1)}&deg;C:</strong> log(a<sub>T</sub>) = -17.44(T - T<sub>g</sub>) / (51.6 + (T - T<sub>g</sub>)) = ${logATStr}</div>
                <div style="margin-top: 6px;"><strong>2. Relaxation Time:</strong> &tau;(T) = &tau;<sub>ref</sub> &times; a<sub>T</sub> = ${tauStr}</div>
                <div style="margin-top: 6px;"><strong>3. Strain Equilibrium:</strong> &epsilon;<sub>eq</sub> = ${activeScenario === 'free' ? '0%' : 'min(&epsilon;<sub>u</sub>, (&sigma;<sub>opp</sub> / E<sub>r</sub>) &times; 100%) = ' + epsEq.toFixed(2) + '%'}</div>
                <div style="margin-top: 6px;"><strong>4. Recovery Stress:</strong> &sigma;<sub>recovery</sub> = (E<sub>rubbery</sub> &times; &epsilon;<sub>eq</sub>) / 100 = ${activeScenario === 'free' ? '0 MPa' : sigmaRec.toFixed(2) + ' MPa'}</div>
                <div style="margin-top: 6px;"><strong>5. Recovery Kinetics:</strong> &epsilon;(t) = &epsilon;<sub>eq</sub> + (&epsilon;<sub>u</sub> - &epsilon;<sub>eq</sub>)e<sup>-t/&tau;</sup></div>
            </div>
        `;
    }
    
    // ============================================================
    // TIMELINE & ANIMATION LOGIC
    // ============================================================
    
    function updateUI() {
        const activeTemp = parseFloat(recTemp.value);
        const activeSigma = parseFloat(oppStress.value);
        const activeTauRef = parseFloat(tauRef.value);
    
        valRecTemp.innerText = activeTemp.toFixed(0) + " °C";
        valOppStress.innerText = activeSigma.toFixed(2) + " MPa";
        valTauRef.innerText = activeTauRef.toFixed(0) + " s";
    
        // Update read-only cards
        const m = materials[currentMaterial];
        inheritedMatName.innerText = m.name;
        inheritedMatSpecs.innerText = `T_g = ${Tg.toFixed(1)}°C | E_r = ${E_rubbery} MPa | X_c = ${Xc.toFixed(2)}`;
        inheritedStrainVal.innerText = eps_u.toFixed(2) + " %";
    
        // Dynamic slider cap for opposing stress
        const minStressLimit = 0.01;
        const maxStressPossible = Math.max(minStressLimit, recoveryStress(E_rubbery, eps_u, eps_u)); // E_r * eps_u / 100
        oppStress.min = minStressLimit.toString();
        oppStress.max = maxStressPossible.toFixed(2);
        oppStress.step = "0.001";
        
        let val = parseFloat(oppStress.value);
        if (isNaN(val)) val = minStressLimit;
        if (val > maxStressPossible) {
            val = maxStressPossible;
            oppStress.value = val.toFixed(2);
        }
        if (val < minStressLimit) {
            val = minStressLimit;
            oppStress.value = val.toFixed(2);
        }
        valOppStress.innerText = val.toFixed(2) + " MPa";
    
        const activeTau = relaxationTime(activeTemp, Tg, activeTauRef);
        const epsEq = activeScenario === 'free' ? 0 : epsEqConstrained(eps_u, E_rubbery, activeSigma);
        // const sigmaRec = activeScenario === 'free' ? 0 : recoveryStress(E_rubbery, eps_u, epsEq);
        const t95 = timeTo95Recovery(activeTau);
    
        // Dynamic numeric displays
        resTau.innerText = formatTau(activeTau);
        resRr.innerText = recoveryRatio(eps_u, strain).toFixed(1) + " %";
        
        // Recovery stress grows dynamically matching simulated strain
        const currentSigmaRec = activeScenario === 'free' ? 0 : recoveryStress(E_rubbery, eps_u, strain);
        resRecStress.innerText = currentSigmaRec.toFixed(2) + " MPa";
        resT95.innerText = formatT95(t95);
    
        updateSpecimenVisual(strain, activeTemp, activeScenario, epsEq, currentSigmaRec);
        drawPlot(simTime);
        updateScenarioTable();
        updateEquationsPanel();
    }
    
    function runRecoverySimulation() {
        isAnimating = true;
        btnRun.disabled = true;
        btnRun.innerText = "Simulating...";
        btnRun.style.background = "#475569";
        document.getElementById('resultsContainer').style.display = 'grid';
    
        const activeTemp = parseFloat(recTemp.value);
        const activeSigma = parseFloat(oppStress.value);
        const activeTauRef = parseFloat(tauRef.value);
    
        const activeTau = relaxationTime(activeTemp, Tg, activeTauRef);
        const epsEq = activeScenario === 'free' ? 0 : epsEqConstrained(eps_u, E_rubbery, activeSigma);
        
        strain = eps_u;
        simTime = 0;
        
        // Time step dt represents 2 seconds per tick in simulation time
        const dt = 2.0;
    
        if (intervalId) clearInterval(intervalId);
    
        intervalId = setInterval(() => {
            if (activeTemp <= Tg) {
                stateLabel.innerText = "State: Frozen (T <= Tg)";
                liveInsight.innerHTML = `<strong>Frozen State:</strong> Temperature (${activeTemp.toFixed(1)}°C) is below or equal to T_g. Relaxation time is infinite; chains are locked. No shape recovery occurs.`;
                clearInterval(intervalId);
                isAnimating = false;
                btnRun.disabled = false;
                btnRun.innerText = "Initiate Heating Cycle";
                btnRun.style.background = "#E2570F";
                return;
            }
    
            simTime += dt;
            strain = stepRecovery(strain, epsEq, activeTau, dt);
    
            // const currentRr = recoveryRatio(eps_u, strain);
            const currentSigmaRec = activeScenario === 'free' ? 0 : recoveryStress(E_rubbery, eps_u, strain);
            
            stateLabel.innerText = `Recovering (tau = ${formatTau(activeTau)})`;
            
            if (activeScenario === 'free') {
                liveInsight.innerHTML = `<strong>Free Recovery:</strong> specimen is heating above T_g. Chains regain mobility (τ = ${formatTau(activeTau)}), and entropic force pulls the specimen back to its flat original shape.`;
            } else {
                liveInsight.innerHTML = `<strong>Constrained Recovery:</strong> specimen contracts until it meets the constraint wall at ε<sub>eq</sub> = ${epsEq.toFixed(2)}%. A blocking stress of ${currentSigmaRec.toFixed(2)} MPa builds up against the wall.`;
            }
    
            // Stop simulation when recovery is 95% complete or exceeds time limit
            const t95 = timeTo95Recovery(activeTau);
            if (strain <= epsEq + (eps_u - epsEq) * 0.05 || simTime >= t95 * 1.5) {
                clearInterval(intervalId);
                intervalId = null;
                isAnimating = false;
                btnRun.disabled = false;
                btnRun.innerText = "Initiate Heating Cycle";
                btnRun.style.background = "#E2570F";
                btnNextCalc.style.display = "block";
    
                // Clamp exactly to equilibrium end state values
                strain = epsEq;
                stateLabel.innerText = "Recovery Complete";
                
                if (activeScenario === 'free') {
                    liveInsight.innerHTML = `<strong>Cycle Complete:</strong> specimen fully recovered (R<sub>r</sub> = 100%) to its original memorized shape.`;
                } else {
                    liveInsight.innerHTML = `<strong>Cycle Complete:</strong> recovery halted by the wall constraint. A maximum blocking recovery stress of ${currentSigmaRec.toFixed(2)} MPa is generated.`;
                }
            }
    
            updateUI();
        }, 35);
    }
    
    // Event Listeners
    recTemp.addEventListener('input', () => {
        updateUI();
    });
    
    oppStress.addEventListener('input', () => {
        updateUI();
    });
    
    tauRef.addEventListener('input', () => {
        updateUI();
    });
    
    scenarioFree.addEventListener('click', () => {
        if (isAnimating) return;
        activeScenario = 'free';
        oppStressGroup.style.display = 'none';
        setActiveScenarioStyle('scenarioFree');
        updateUI();
    });
    
    scenarioConstrained.addEventListener('click', () => {
        if (isAnimating) return;
        activeScenario = 'constrained';
        oppStressGroup.style.display = 'block';
        setActiveScenarioStyle('scenarioConstrained');
        updateUI();
    });
    
    function setActiveScenarioStyle(activeId) {
        if (activeId === 'scenarioFree') {
            scenarioFree.style.background = "#E2570F";
            scenarioFree.style.color = "#ffffff";
            scenarioFree.style.borderColor = "#E2570F";
            scenarioConstrained.style.background = "#FAFAF9";
            scenarioConstrained.style.color = "#475569";
            scenarioConstrained.style.borderColor = "#cbd5e1";
        } else {
            scenarioConstrained.style.background = "#E2570F";
            scenarioConstrained.style.color = "#ffffff";
            scenarioConstrained.style.borderColor = "#E2570F";
            scenarioFree.style.background = "#FAFAF9";
            scenarioFree.style.color = "#475569";
            scenarioFree.style.borderColor = "#cbd5e1";
        }
    }
    
    btnRun.addEventListener('click', () => {
        if (!isAnimating) runRecoverySimulation();
    });
    
    // Three.js Render Loop
    function renderScene() {
        requestAnimationFrame(renderScene);
        if (controls) controls.update();
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }
    
    // Initializing state
    function initializeState() {
        currentMaterial = localStorage.getItem('selectedMaterial') || 'PU';
        eps_u = parseFloat(localStorage.getItem('eps_u')) || 9.80;
    
        const m = materials[currentMaterial];
        Tg = m.Tg;
        E_rubbery = m.E_rubbery;
        Xc = m.Xc;
    
        // Rescale recTemp range based on Tg
        recTemp.min = Tg;
        recTemp.max = Tg + 40;
        recTemp.value = Tg + 30; // default preset
    
        strain = eps_u;
    
        setActiveScenarioStyle('scenarioFree');
        init3D();
        renderScene();
        updateUI();
    }
    
    // Load initialization
    initializeState();
})();

// ============================================================
// SCRIPT_D.JS (Page Check: document.getElementById('blendSlider'))
// ============================================================
(function() {
    if (!document.getElementById('blendSlider')) return;
    
    // ============================================================
    // MATERIAL DATABASE & PHYSICAL CONSTANTS
    // ============================================================
    
    const Tg1 = 45;  // PU domain Tg (°C)
    const Tg2 = 90;  // PMMA domain Tg (°C) (corrected from 105)
    
    const E_g1_rubbery = 15;   // MPa, PU above its Tg
    // const E_g2_glassy = 3000;  // MPa, PMMA below its Tg
    const E_g2_glassy_eff = 7.5; // MPa, effective glassy PMMA modulus near transition
    // const E_g1_glassy = 1500;  // MPa, PU below Tg1
    // const E_g2_rubbery = 30;   // MPa, PMMA above Tg2
    
    // UI Elements
    const btnRun = document.getElementById('btnRun');
    const blendSlider = document.getElementById('blendSlider');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotCanvas = document.getElementById('plotCanvas');
    const plotCtx = plotCanvas.getContext('2d');
    
    // Results elements
    const resW1 = document.getElementById('resW1');
    const resW2 = document.getElementById('resW2');
    const resTg = document.getElementById('resTg');
    const resObs = document.getElementById('resObs');
    const btnNextCalc = document.getElementById('btnNextCalc');
    
    // State Variables
    let isRunning = false;
    let currentTemp = 20;
    // let historyPlot = [];
    const eps_total = 100; // programmed strain (%)
    let eps_intermediate = 40.0;
    let eps_final = 60.0;
    let currentMorphology = 'immiscible'; // 'miscible' or 'immiscible'
    let mixedTg = 67.5;
    let intervalId = null;
    
    // Three.js Globals
    let scene, camera, renderer, controls;
    const numSegments = 20;
    let specimenMesh = null;
    let specimenMaterial = null;
    
    // ============================================================
    // MATHEMATICAL FUNCTIONS
    // ============================================================
    
    /**
     * Fox Equation Tg calculation (in Kelvin, returns Celsius)
     */
    function calcFoxTg(w1, w2) {
        const tg1 = Tg1 + 273.15;
        const tg2 = Tg2 + 273.15;
        const invTg = (w1 / tg1) + (w2 / tg2);
        return (1 / invTg) - 273.15;
    }
    
    /**
     * Shape transition fraction based on temperature T
     */
    function transitionFraction(T, TransitionTemp, width = 1.5) {
        // Sigmoidal transition from 1 (frozen/programmed) to 0 (fully recovered)
        return 1 / (1 + Math.exp((T - (TransitionTemp + 2.5)) / width));
    }
    
    /**
     * Intermediate strain released at Tg1
     */
    function epsilonIntermediate(eps_total, w1, w2, E_g1_rubbery, E_g2_glassy) {
        return eps_total * w1 * (E_g1_rubbery / (E_g1_rubbery + w2 * E_g2_glassy));
    }
    
    /**
     * Remaining strain locked at intermediate plateau
     */
    function epsilonFinal(eps_total, eps_intermediate) {
        return eps_total - eps_intermediate;
    }
    
    /**
     * Sequence verification for Triple-Shape mode
     */
    function verifySequence(eps_total, eps_at_Tg1_minus, eps_at_intermediate, eps_at_Tg2_plus) {
        const stage1_locked = Math.abs(eps_at_Tg1_minus - eps_total) < 1e-2;
        const stage2_partial = eps_at_intermediate < eps_total && eps_at_intermediate > 0;
        const stage3_complete = Math.abs(eps_at_Tg2_plus) < 1e-2;
        const monotonicDecrease = eps_at_Tg1_minus > eps_at_intermediate && eps_at_intermediate > eps_at_Tg2_plus;
        return {
            stage1_locked,
            stage2_partial,
            stage3_complete,
            monotonicDecrease
        };
    }
    
    /**
     * Sequence verification for Dual-Shape mode
     */
    function verifySequenceDual(eps_total, eps_at_Tg_minus, eps_at_Tg_plus) {
        const stage1_locked = Math.abs(eps_at_Tg_minus - eps_total) < 1e-2;
        const stage2_complete = Math.abs(eps_at_Tg_plus) < 1e-2;
        return {
            stage1_locked,
            stage2_complete
        };
    }
    
    // ============================================================
    // THREE.JS VISUALIZATION
    // ============================================================
    
    function init3D() {
        const container = document.getElementById('viewport3D');
        if (!container) return;
        container.innerHTML = '';
    
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xF4F5F3);
    
        camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
        camera.position.set(0, 1.2, 2.4);
    
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);
    
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 1.0;
        controls.maxDistance = 5.0;
        controls.target.set(0, 0, 0);
    
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
    
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
        dirLight.position.set(2, 4, 3);
        dirLight.castShadow = true;
        scene.add(dirLight);
    
        const grid = new THREE.GridHelper(10, 10, 0xcbd5e1, 0xe2e8f0);
        grid.position.y = -0.4;
        scene.add(grid);
    
        // Create single deformable specimen mesh using vertex colors
        specimenMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.4,
            metalness: 0.1
        });
    
        const dummyPoints = [];
        for (let i = 0; i < numSegments; i++) {
            dummyPoints.push(new THREE.Vector3(0, 0, 0));
        }
        const dummyCurve = new THREE.CatmullRomCurve3(dummyPoints);
        const dummyGeom = new THREE.TubeGeometry(dummyCurve, 60, 0.025, 8, false);
    
        specimenMesh = new THREE.Mesh(dummyGeom, specimenMaterial);
        scene.add(specimenMesh);
    }
    
    function updateSpecimenVisual(T) {
        if (!specimenMesh) return;
    
    
        const curvePoints = [];
    
        for (let i = 0; i < numSegments; i++) {
            // Define 3 shapes (A: Permanent, B: Intermediate, C: Fully Programmed)
            // Shape A (Permanent): Straight flat bar
            const x_A = -0.8 + 1.6 * (i / (numSegments - 1));
            const y_A = 0;
            const z_A = 0;
    
            // Shape B (First temporary): U-shaped bow
            const x_B = x_A * 0.95;
            const y_B = -0.28 * Math.sin(Math.PI * i / (numSegments - 1));
            const z_B = 0;
    
            // Shape C (Second temporary): Stretched S-curve
            const x_C = x_A * 0.9;
            const y_C = 0.22 * Math.sin(2 * Math.PI * i / (numSegments - 1));
            const z_C = 0;
    
            let px, py, pz;
            if (currentMorphology === 'immiscible') {
                const f1 = transitionFraction(T, Tg1); // PU domain transition
                const f2 = transitionFraction(T, Tg2); // PMMA domain transition
                
                px = x_A + (x_B - x_A) * f2 + (x_C - x_B) * f1;
                py = y_A + (y_B - y_A) * f2 + (y_C - y_B) * f1;
                pz = z_A + (z_B - z_A) * f2 + (z_C - z_B) * f1;
            } else {
                const fm = transitionFraction(T, mixedTg);
                px = x_A + (x_B - x_A) * fm;
                py = y_A + (y_B - y_A) * fm;
                pz = z_A + (z_B - z_A) * fm;
            }
    
            curvePoints.push(new THREE.Vector3(px, py, pz));
        }
    
        const curve = new THREE.CatmullRomCurve3(curvePoints);
        
        // Dispose the old geometry to prevent memory leaks
        if (specimenMesh.geometry) {
            specimenMesh.geometry.dispose();
        }
    
        const tubularSegments = 60;
        const radialSegments = 8;
        const radius = 0.025;
        const newGeom = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
    
        // Compute vertex colors along the tube length
        const colors = [];
        const count = newGeom.attributes.position.count;
        
        const isMiscible = currentMorphology === 'miscible';
        const fm = transitionFraction(T, mixedTg);
        const f1 = transitionFraction(T, Tg1);
        const f2 = transitionFraction(T, Tg2);
    
        const cSoft = new THREE.Color(0x6366f1);
        const cHard = new THREE.Color(0xE2570F);
        const cMixed = new THREE.Color(0x4c1d95);
        const cGrey = new THREE.Color(0x64748b);
    
        for (let idx = 0; idx < count; idx++) {
            // Find corresponding segment index along the tubular segments
            const iVal = Math.floor(idx / (radialSegments + 1));
            const u = iVal / tubularSegments;
            
            // Map to domains
            const domainIndex = Math.floor(u * numSegments);
            const isEvenDomain = domainIndex % 2 === 0;
    
            const vertexColor = new THREE.Color();
            if (isMiscible) {
                vertexColor.copy(cMixed).lerp(cGrey, 1 - fm);
            } else {
                if (isEvenDomain) {
                    vertexColor.copy(cSoft).lerp(cGrey, 1 - f1);
                } else {
                    vertexColor.copy(cHard).lerp(cGrey, 1 - f2);
                }
            }
            colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
        }
    
        newGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        specimenMesh.geometry = newGeom;
    }
    
    // ============================================================
    // PLOTTING ENGINE
    // ============================================================
    
    function drawPlot() {
        if (!plotCanvas) return;
        plotCtx.clearRect(0, 0, plotCanvas.width, plotCanvas.height);
    
        const padLeft = 50;
        const padRight = 20;
        const padTop = 30;
        const padBottom = 45;
        const w = plotCanvas.width - padLeft - padRight;
        const h = plotCanvas.height - padTop - padBottom;
    
        // T range is 20°C to 110°C (size 90)
        function getX(tVal) {
            return padLeft + ((tVal - 20) / 90.0) * w;
        }
        function getY(strainVal) {
            return padTop + h - (strainVal / 100.0) * h;
        }
    
        // Grid lines
        plotCtx.strokeStyle = "#f1f5f9";
        plotCtx.lineWidth = 1;
        for (let temp = 35; temp <= 95; temp += 15) {
            const x = getX(temp);
            plotCtx.beginPath(); plotCtx.moveTo(x, padTop); plotCtx.lineTo(x, padTop + h); plotCtx.stroke();
        }
        for (let s = 20; s <= 80; s += 20) {
            const y = getY(s);
            plotCtx.beginPath(); plotCtx.moveTo(padLeft, y); plotCtx.lineTo(padLeft + w, y); plotCtx.stroke();
        }
    
        // Axes
        plotCtx.strokeStyle = "#cbd5e1";
        plotCtx.lineWidth = 1.5;
        plotCtx.beginPath();
        plotCtx.moveTo(padLeft, padTop);
        plotCtx.lineTo(padLeft, padTop + h);
        plotCtx.lineTo(padLeft + w, padTop + h);
        plotCtx.stroke();
    
        // Ticks & Labels
        plotCtx.fillStyle = "#64748b";
        plotCtx.font = "8px sans-serif";
        plotCtx.textAlign = "center";
        for (let temp = 20; temp <= 110; temp += 15) {
            plotCtx.fillText(temp + "°C", getX(temp), padTop + h + 13);
        }
        plotCtx.textAlign = "right";
        for (let s = 0; s <= 100; s += 20) {
            plotCtx.fillText(s + "%", padLeft - 6, getY(s) + 3);
        }
    
        // Axis titles
        plotCtx.fillStyle = "#1e293b";
        plotCtx.font = "bold 9px sans-serif";
        plotCtx.textAlign = "center";
        plotCtx.fillText("Temperature T (°C)", padLeft + w / 2, padTop + h + 30);
    
        plotCtx.save();
        plotCtx.translate(15, padTop + h / 2);
        plotCtx.rotate(-Math.PI / 2);
        plotCtx.fillText("Specimen Strain (%)", 0, 0);
        plotCtx.restore();
    
        
        
        plotCtx.strokeStyle = "#E2570F";
        plotCtx.lineWidth = 2.5;
        plotCtx.beginPath();
    
        let started = false;
        for (let tVal = 20; tVal <= 110; tVal += 0.5) {
            let yStrain = eps_total;
            if (currentMorphology === 'immiscible') {
                const f1 = transitionFraction(tVal, Tg1);
                const f2 = transitionFraction(tVal, Tg2);
                yStrain = (eps_intermediate * f1) + (eps_final * f2);
            } else {
                const fm = transitionFraction(tVal, mixedTg);
                yStrain = eps_total * fm;
            }
    
            const x = getX(tVal);
            const y = getY(yStrain);
            if (!started) {
                plotCtx.moveTo(x, y);
                started = true;
            } else {
                plotCtx.lineTo(x, y);
            }
        }
        plotCtx.stroke();
    
        // Active Tracer Dot
        if (isRunning && currentTemp >= 20 && currentTemp <= 110) {
            let currentStrain = eps_total;
            if (currentMorphology === 'immiscible') {
                const f1 = transitionFraction(currentTemp, Tg1);
                const f2 = transitionFraction(currentTemp, Tg2);
                currentStrain = (eps_intermediate * f1) + (eps_final * f2);
            } else {
                const fm = transitionFraction(currentTemp, mixedTg);
                currentStrain = eps_total * fm;
            }
    
            const cx = getX(currentTemp);
            const cy = getY(currentStrain);
    
            plotCtx.fillStyle = "#ef4444";
            plotCtx.beginPath();
            plotCtx.arc(cx, cy, 5, 0, Math.PI * 2);
            plotCtx.fill();
            plotCtx.strokeStyle = "#ffffff";
            plotCtx.lineWidth = 1.2;
            plotCtx.stroke();
        }
    }
    
    // ============================================================
    // DYNAMIC TABLES & EQUATIONS
    // ============================================================
    
    function updateVerificationTable() {
        const tbody = document.querySelector('#verificationTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
    
        if (currentMorphology === 'miscible') {
            const ver = verifySequenceDual(eps_total, eps_total, 0.0);
            const stage1_status = currentTemp < mixedTg ? "Active" : (ver.stage1_locked ? "✓ locked" : "Failed");
            const stage2_status = currentTemp >= mixedTg ? (ver.stage2_complete ? "✓ complete" : "Failed") : "Locked";
    
            const stagesDual = [
                { name: "Programmed", temp: `T < ${mixedTg.toFixed(1)}°C`, strainVal: eps_total, status: stage1_status },
                { name: "Recovered", temp: `T > ${mixedTg.toFixed(1)}°C`, strainVal: 0.0, status: stage2_status }
            ];
            stagesDual.forEach(st => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 8px 4px; border-bottom: 1px solid #cbd5e1;">${st.name}</td>
                    <td style="padding: 8px 4px; border-bottom: 1px solid #cbd5e1;">${st.temp}</td>
                    <td style="padding: 8px 4px; border-bottom: 1px solid #cbd5e1;">${st.strainVal.toFixed(1)}%</td>
                    <td style="padding: 8px 4px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: bold; color: ${st.status === 'Active' ? '#ef4444' : (st.status.startsWith('✓') ? '#16a34a' : '#94a3b8')};">${st.status}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            const ver = verifySequence(eps_total, eps_total, eps_final, 0.0);
            const stage1_status = currentTemp < Tg1 ? "Active" : (ver.stage1_locked ? "✓ locked" : "Failed");
            const stage2_status = (currentTemp >= Tg1 && currentTemp < Tg2) ? "Active" : (currentTemp >= Tg2 ? (ver.stage2_partial ? "✓ partial release" : "Failed") : "Locked");
            const stage3_status = currentTemp >= Tg2 ? (ver.stage3_complete ? "✓ complete" : "Failed") : "Locked";
    
            const stagesTriple = [
                { name: "Programmed (Shape C)", temp: `T < ${Tg1}°C`, strainVal: eps_total, status: stage1_status },
                { name: "Intermediate (Shape B)", temp: `${Tg1}°C < T < ${Tg2}°C`, strainVal: eps_final, status: stage2_status },
                { name: "Recovered (Shape A)", temp: `T > ${Tg2}°C`, strainVal: 0.0, status: stage3_status }
            ];
            stagesTriple.forEach(st => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 8px 4px; border-bottom: 1px solid #cbd5e1;">${st.name}</td>
                    <td style="padding: 8px 4px; border-bottom: 1px solid #cbd5e1;">${st.temp}</td>
                    <td style="padding: 8px 4px; border-bottom: 1px solid #cbd5e1;">${st.strainVal.toFixed(1)}%</td>
                    <td style="padding: 8px 4px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: bold; color: ${st.status === 'Active' ? '#ef4444' : (st.status.startsWith('✓') ? '#16a34a' : '#94a3b8')};">${st.status}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }
    
    function updateEquationsPanel() {
        const container = document.getElementById('latexFormulaContainer');
        if (!container) return;
    
        const pmmaW2 = parseFloat(blendSlider.value) / 100;
        const puW1 = 1 - pmmaW2;
    
        if (currentMorphology === 'miscible') {
            container.innerHTML = `
                <div style="font-family: inherit; line-height: 1.6; color: #1e293b; font-size: 16px; font-weight: bold;">
                    <div><strong>1. Fox Equation (Miscible Blend T<sub>g</sub>):</strong> 1 / T<sub>g,mixed</sub> = w<sub>1</sub> / T<sub>g1</sub> + w<sub>2</sub> / T<sub>g2</sub></div>
                    <div style="margin-left: 20px; font-style: italic; color: #475569; font-size: 0.95em; margin-bottom: 8px;">
                        1 / T<sub>g,mixed</sub> = ${puW1.toFixed(2)} / 318.15 K + ${pmmaW2.toFixed(2)} / 363.15 K &rArr; T<sub>g,mixed</sub> = ${mixedTg.toFixed(1)}&deg;C
                    </div>
                    <div><strong>2. Single-Step Recovery:</strong> &epsilon;(T) = &epsilon;<sub>total</sub> for T &lt; T<sub>g,mixed</sub>, else 0</div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="font-family: inherit; line-height: 1.6; color: #1e293b; font-size: 16px; font-weight: bold;">
                    <div><strong>1. Intermediate Release (at T<sub>g1</sub>):</strong> &epsilon;<sub>intermediate</sub> = &epsilon;<sub>total</sub> &times; w<sub>1</sub> &times; E<sub>g1,rubbery</sub> / (E<sub>g1,rubbery</sub> + w<sub>2</sub> &times; E<sub>g2,glassy,eff</sub>)</div>
                    <div style="margin-left: 20px; font-style: italic; color: #475569; font-size: 0.95em; margin-bottom: 8px;">
                        &epsilon;<sub>intermediate</sub> = 100% &times; ${puW1.toFixed(2)} &times; 15 MPa / (15 MPa + ${pmmaW2.toFixed(2)} &times; ${E_g2_glassy_eff.toFixed(1)} MPa) = ${eps_intermediate.toFixed(1)}%
                    </div>
                    <div><strong>2. Intermediate Plateau:</strong> &epsilon;<sub>plateau</sub> = &epsilon;<sub>total</sub> - &epsilon;<sub>intermediate</sub> = ${eps_final.toFixed(1)}%</div>
                    <div style="margin-top: 8px;"><strong>3. Final Release (at T<sub>g2</sub>):</strong> &epsilon;<sub>final</sub> = &epsilon;<sub>plateau</sub> &rArr; 0</div>
                </div>
            `;
        }
    }
    
    // ============================================================
    // TIMELINE & ANIMATION LOGIC
    // ============================================================
    
    function updateUI() {
        const pmmaW2 = parseFloat(blendSlider.value) / 100;
        const puW1 = 1 - pmmaW2;
    
        mixedTg = calcFoxTg(puW1, pmmaW2);
    
        eps_intermediate = epsilonIntermediate(eps_total, puW1, pmmaW2, E_g1_rubbery, E_g2_glassy_eff);
        eps_final = epsilonFinal(eps_total, eps_intermediate);
    
        document.getElementById('lblPU').innerText = (puW1 * 100).toFixed(0) + "% PU";
        document.getElementById('lblPMMA').innerText = (pmmaW2 * 100).toFixed(0) + "% PMMA";
    
        resW1.innerText = (puW1 * 100).toFixed(0) + " %";
        resW2.innerText = (pmmaW2 * 100).toFixed(0) + " %";
        resTg.innerText = currentMorphology === 'miscible' ? mixedTg.toFixed(1) + " °C" : "45°C & 90°C";
    
        // Update legend visibility
        const isMiscible = currentMorphology === 'miscible';
        if (document.getElementById('legendPU')) {
            document.getElementById('legendPU').style.display = isMiscible ? 'none' : 'flex';
        }
        if (document.getElementById('legendPMMA')) {
            document.getElementById('legendPMMA').style.display = isMiscible ? 'none' : 'flex';
        }
        if (document.getElementById('legendMiscible')) {
            document.getElementById('legendMiscible').style.display = isMiscible ? 'flex' : 'none';
        }
    
        updateSpecimenVisual(currentTemp);
        drawPlot();
        updateVerificationTable();
        updateEquationsPanel();
    }
    
    function runHeatingSimulation() {
        isRunning = true;
        btnRun.disabled = true;
        blendSlider.disabled = true;
        btnRun.innerText = "Simulating...";
        btnRun.style.background = "#475569";
        document.getElementById('resultsContainer').style.display = 'grid';
    
        currentTemp = 20;
        // historyPlot = [];
    
        if (intervalId) clearInterval(intervalId);
    
        intervalId = setInterval(() => {
            currentTemp += 0.5;
            stateLabel.innerText = "Heating: " + currentTemp.toFixed(1) + " °C";
    
            if (currentMorphology === 'immiscible') {
                
    
                if (currentTemp < Tg1) {
                    liveInsight.innerHTML = `<strong>Shape C (Programmed):</strong> Both PU (${Tg1}°C) and PMMA (${Tg2}°C) phases are glassy. Strains are fully locked at ${eps_total.toFixed(1)}%.`;
                } else if (currentTemp >= Tg1 && currentTemp < Tg2) {
                    liveInsight.innerHTML = `<strong>Shape B (Intermediate):</strong> PU domain melts (T > T<sub>g1</sub>). It releases its programmed strain (${eps_intermediate.toFixed(1)}%) leaving the specimen at the intermediate plateau of ${eps_final.toFixed(1)}% locked by glassy PMMA.`;
                } else {
                    liveInsight.innerHTML = `<strong>Shape A (Permanent):</strong> PMMA domain also melts (T > T<sub>g2</sub>). All remaining strain is unlocked, returning the specimen to its original permanent shape.`;
                }
            } else {
                // const fm = transitionFraction(currentTemp, mixedTg);
    
                if (currentTemp < mixedTg) {
                    liveInsight.innerHTML = `<strong>Programmed Shape:</strong> Miscible blend is below its single Fox T<sub>g,mixed</sub> of ${mixedTg.toFixed(1)}°C. Strain is locked at 100%.`;
                } else {
                    liveInsight.innerHTML = `<strong>Transition Reached:</strong> Miscible blend crosses its unified transition. Complete strain recovery occurs in a single step!`;
                }
            }
    
            if (currentTemp > 110) {
                clearInterval(intervalId);
                intervalId = null;
                isRunning = false;
                btnRun.disabled = false;
                btnRun.innerText = "Initiate Heating Cycle";
                btnRun.style.background = "#E2570F";
                btnNextCalc.style.display = "block";
                blendSlider.disabled = false;
    
                stateLabel.innerText = "Recovery Complete";
                resObs.innerText = currentMorphology === 'miscible' 
                    ? "Single recovery step observed at unified Tg." 
                    : "Two distinct recovery steps observed (Triple Shape).";
                liveInsight.innerHTML = `<strong>Simulation Complete:</strong> Shape recovery cycle successfully completed and verified.`;
            }
    
            updateUI();
        }, 30);
    }
    
    // Event Listeners
    const morphologyRadios = document.getElementsByName('morphology');
    morphologyRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            currentMorphology = document.querySelector('input[name="morphology"]:checked').value;
            updateUI();
        });
    });
    
    blendSlider.addEventListener('input', () => {
        updateUI();
    });
    
    btnRun.addEventListener('click', () => {
        if (!isRunning) runHeatingSimulation();
    });
    
    // Three.js Render Loop
    function renderScene() {
        requestAnimationFrame(renderScene);
        if (controls) controls.update();
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }
    
    // Initializing state
    function initializeState() {
        // Determine active morphology
        const checkedMorph = document.querySelector('input[name="morphology"]:checked');
        currentMorphology = checkedMorph ? checkedMorph.value : 'immiscible';
    
        init3D();
        renderScene();
        updateUI();
    }
    
    // Load initialization
    initializeState();
})();

// ============================================================
// SCRIPT_E.JS (Page Check: document.getElementById('resUstored'))
// ============================================================
(function() {
    if (!document.getElementById('resUstored')) return;
    
    // ============================================================
    // MATERIAL & THERMAL CONSTANTS
    // Unit Identity: 1 MPa = 1 J/cm³, so MPa * cm³ = Joules
    // ============================================================
    const E_RUBBERY  = 15;     // MPa — PU rubbery modulus, carried over from Sub-Calc D
    const E_U        = 1.0;    // dimensionless — programmed strain (100%), matches eps_total from Sub-Calc D
    const S_RECOVERY = 1.5;    // MPa — constrained/realistic recovery stress (deliberately << E_rubbery)
    const T_AMBIENT  = 20;     // °C
    const T_RECOVERY = 45;     // °C — PU Tg1 from Sub-Calc D, the actuation trigger point
    const DT         = T_RECOVERY - T_AMBIENT;   // = 25 °C
    
    // Three.js Globals
    let scene, camera, renderer, controls;
    let muscleMesh, anchorMesh, pistonMesh, loadMesh;
    let currentTemp = T_AMBIENT;
    
    const plotCanvas = document.getElementById('plotCanvas');
    const plotCtx = plotCanvas.getContext('2d');
    
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    
    const slen = document.getElementById('len');
    const scp = document.getElementById('cp');
    const sthi = document.getElementById('thi');
    const sden = document.getElementById('den');
    const liveInsight = document.getElementById('liveInsight');
    
    // Result Elements
    const resMass = document.getElementById('resMass');
    const resUstored = document.getElementById('resUstored');
    const resThermal = document.getElementById('resThermal');
    const resWork = document.getElementById('resWork');
    const resEff = document.getElementById('resEff');
    
    // Legend Elements
    const lblLiveTemp = document.getElementById('lblLiveTemp');
    const lblLiveStrain = document.getElementById('lblLiveStrain');
    
    const swid = 2.0; // cm - width of specimen
    
    // Sliders Event Listeners
    slen.addEventListener('input', () => { document.getElementById('valLen').innerText = slen.value + " cm"; updateUI(); });
    scp.addEventListener('input', () => { document.getElementById('valCp').innerText = scp.value + " J/g°C"; updateUI(); });
    sthi.addEventListener('input', () => { document.getElementById('valThi').innerText = sthi.value + " cm"; updateUI(); });
    sden.addEventListener('input', () => { document.getElementById('valDen').innerText = sden.value + " g/cm³"; updateUI(); });
    
    let isRunning = false;
    let strain = 100;
    let curThermal = 0;
    let curWork = 0;
    
    // ============================================================
    // THREE.JS VIEWPORT SETUP
    // ============================================================
    
    function init3D() {
        const container = document.getElementById('viewport3D');
        if (!container) return;
        container.innerHTML = '';
    
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xF4F5F3);
    
        camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
        camera.position.set(0, 1.2, 2.4);
    
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);
    
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 1.0;
        controls.maxDistance = 5.0;
        controls.target.set(0, 0, 0);
    
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
    
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
        dirLight.position.set(2, 4, 3);
        dirLight.castShadow = true;
        scene.add(dirLight);
    
        const grid = new THREE.GridHelper(10, 10, 0xcbd5e1, 0xe2e8f0);
        grid.position.y = -0.4;
        scene.add(grid);
    
        // Build meshes
        // anchorMesh: Static fixed wall/mount on the left
        const anchorGeom = new THREE.BoxGeometry(0.25, 0.35, 0.35);
        const anchorMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
        anchorMesh = new THREE.Mesh(anchorGeom, anchorMat);
        anchorMesh.position.set(-0.9, 0, 0);
        scene.add(anchorMesh);
    
        // muscleMesh: Cylinder lying horizontal (rotateZ(pi/2))
        const muscleGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 16);
        muscleGeom.rotateZ(Math.PI / 2);
        const muscleMat = new THREE.MeshStandardMaterial({
            color: 0x64748b,
            roughness: 0.4,
            metalness: 0.1,
            emissive: new THREE.Color(0x000000)
        });
        muscleMesh = new THREE.Mesh(muscleGeom, muscleMat);
        scene.add(muscleMesh);
    
        // pistonMesh: Connecting rod connecting muscle's free end to the load
        const pistonGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 12);
        pistonGeom.rotateZ(Math.PI / 2);
        const pistonMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
        pistonMesh = new THREE.Mesh(pistonGeom, pistonMat);
        scene.add(pistonMesh);
    
        // loadMesh: Load block representation
        const loadGeom = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const loadMat = new THREE.MeshStandardMaterial({ color: 0xE2570F, roughness: 0.5 });
        loadMesh = new THREE.Mesh(loadGeom, loadMat);
        scene.add(loadMesh);
    }
    
    function updateActuatorVisual(eRecovered, tempNow) {
        if (!muscleMesh || !pistonMesh || !loadMesh) return;
    
        // Contraction stroke
        const stretch = 1.0 + E_U * (1 - eRecovered); // 2.0 (fully programmed/stretched) to 1.0 (fully contracted/recovered)
        
        // Scale muscle length along X (since it was rotated to lie along X)
        muscleMesh.scale.x = stretch;
    
        // Reposition coordinates (left end of muscle stays anchored at x = -0.775)
        muscleMesh.position.set(-0.775 + 0.2 * stretch, 0, 0);
    
        const muscleRight = -0.775 + 0.4 * stretch;
        pistonMesh.position.set(muscleRight + 0.3, 0, 0);
        loadMesh.position.set(muscleRight + 0.6, 0, 0);
    
        // Temperature-driven color lerping (Cold/glassy = grey-blue, Hot/rubbery = burgundy)
        const tempFrac = Math.min(Math.max((tempNow - T_AMBIENT) / DT, 0), 1);
        const cCold = new THREE.Color(0x64748b);
        const cHot  = new THREE.Color(0xE2570F);
        muscleMesh.material.color.copy(cCold).lerp(cHot, tempFrac);
    
        // Emissive heat glow ramping up with temperature fraction
        muscleMesh.material.emissive.copy(cHot).multiplyScalar(0.3 * tempFrac);
    }
    
    function renderScene() {
        requestAnimationFrame(renderScene);
        if (controls) controls.update();
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }
    
    // ============================================================
    // MATHEMATICAL PLOTTING
    // ============================================================
    
    function drawPlot() {
        plotCtx.clearRect(0, 0, plotCanvas.width, plotCanvas.height);
        
        const l = parseFloat(slen.value);
        const t = parseFloat(sthi.value);
        const d = parseFloat(sden.value);
        const cpVal = parseFloat(scp.value);
        
        const vol = l * swid * t;
        const mass = vol * d;
        
        // 1 MPa = 1 J/cm³, so MPa * cm³ = J
        const uStored = 0.5 * E_RUBBERY * (E_U ** 2) * vol; // J
        
        const e_recovered = E_U * (100 - strain) / 100;
        
        const activeThermal = isRunning ? curThermal : (strain === 0 ? mass * cpVal * DT : 0);
        const activeWork = isRunning ? curWork : (strain === 0 ? S_RECOVERY * E_U * vol * 1000 : 0);
        
        const eff = activeThermal > 0 ? ((activeWork / 1000) / activeThermal) * 100 : 0;
        
        plotCtx.fillStyle = "#fff";
        plotCtx.fillRect(20, 20, 410, 360);
        
        // 1. Geometry & Mass
        plotCtx.fillStyle = "#E2570F";
        plotCtx.font = "bold 13px Arial";
        plotCtx.fillText("1. Geometry & Mass:", 30, 45);
        plotCtx.fillStyle = "#333";
        plotCtx.font = "12px Arial";
        plotCtx.fillText(`Volume (V) = l * w * t = ${l} * ${swid} * ${t} = ${vol.toFixed(1)} cm³`, 45, 65);
        plotCtx.fillText(`Mass (m) = V * d = ${vol.toFixed(1)} * ${d} = ${mass.toFixed(1)} g`, 45, 80);
        
        // 2. Energy Stored (Programming)
        plotCtx.fillStyle = "#E2570F";
        plotCtx.font = "bold 13px Arial";
        plotCtx.fillText("2. Energy Stored, Programming (U_stored):", 30, 110);
        plotCtx.fillStyle = "#333";
        plotCtx.font = "12px Arial";
        plotCtx.fillText(`U_stored = ½ * E_rubbery * e_u² * V`, 45, 130);
        plotCtx.fillText(`U_stored = 0.5 * 15 * 1.0² * ${vol.toFixed(1)} = ${uStored.toFixed(2)} J  (1 MPa = 1 J/cm³)`, 45, 145);
        
        // 3. Thermal Energy In (Q_trigger)
        plotCtx.fillStyle = "#E2570F";
        plotCtx.font = "bold 13px Arial";
        plotCtx.fillText("3. Thermal Energy In (Q_trigger):", 30, 175);
        plotCtx.fillStyle = "#333";
        plotCtx.font = "12px Arial";
        plotCtx.fillText(`Q = m * Cp * ΔT  (ΔT = T_recovery - T_ambient = 25°C)`, 45, 195);
        plotCtx.fillText(`Q = ${mass.toFixed(1)} * ${cpVal.toFixed(1)} * 25 = ${activeThermal.toFixed(2)} J`, 45, 210);
        
        // 4. Mechanical Work Out (W_mech)
        plotCtx.fillStyle = "#E2570F";
        plotCtx.font = "bold 13px Arial";
        plotCtx.fillText("4. Mechanical Work Out (W_mech):", 30, 240);
        plotCtx.fillStyle = "#333";
        plotCtx.font = "12px Arial";
        plotCtx.fillText(`W = s_recovery * e_recovered * V  (s_recovery = 1.5 MPa)`, 45, 260);
        plotCtx.fillText(`W = 1.5 * ${e_recovered.toFixed(2)} * ${vol.toFixed(1)} = ${activeWork.toFixed(2)} mJ`, 45, 275);
        
        // 5. Efficiency (η_SMP)
        plotCtx.fillStyle = "#E2570F";
        plotCtx.font = "bold 13px Arial";
        plotCtx.fillText("5. Overall Thermal Efficiency (η_SMP):", 30, 305);
        plotCtx.fillStyle = "#333";
        plotCtx.font = "12px Arial";
        plotCtx.fillText(`η_SMP = (W_mech / Q_trigger) * 100%`, 45, 325);
        plotCtx.fillText(`η_SMP = (${(activeWork/1000).toFixed(4)} J / ${activeThermal.toFixed(2)} J) * 100 = ${eff.toFixed(4)} %`, 45, 340);
        
        plotCtx.fillStyle = "#475569";
        plotCtx.font = "italic 11px Arial";
        plotCtx.fillText("Typical SMP range: 1–5%  |  Typical SMA range: 2–8%", 45, 358);
    }
    
    // ============================================================
    // TIMELINE & COORDINATION
    // ============================================================
    
    function updateUI() {
        const e_recovered = E_U * (100 - strain) / 100;
        
        updateActuatorVisual(e_recovered, currentTemp);
        drawPlot();
        
        if (lblLiveTemp) lblLiveTemp.innerText = currentTemp.toFixed(1) + " °C";
        if (lblLiveStrain) lblLiveStrain.innerText = e_recovered.toFixed(2);
    }
    
    btnRun.addEventListener('click', () => {
        if (!isRunning) {
            isRunning = true;
            btnRun.disabled = true;
            document.getElementById('resultsContainer').style.display = 'block';
            
            const l = parseFloat(slen.value);
            const t = parseFloat(sthi.value);
            const d = parseFloat(sden.value);
            const cpVal = parseFloat(scp.value); 
            
            const vol = l * swid * t;
            const mass = vol * d;
            
            strain = 100;
            curThermal = 0;
            curWork = 0;
            currentTemp = T_AMBIENT;
    
            const maxThermal = mass * cpVal * DT; // Q_trigger total (J)
            const maxWork = S_RECOVERY * E_U * vol * 1000; // W_mech at full recovery (mJ)
            const uStored = 0.5 * E_RUBBERY * (E_U ** 2) * vol; // U_stored (J)
            
            liveInsight.innerHTML = `<strong>Live Insight:</strong> Specimen has <strong>${uStored.toFixed(2)} J</strong> of energy stored during programming (U<sub>stored</sub>). Activating the trigger by heating it from 20°C to 45°C (ΔT = 25°C) consumes input heat (Q<sub>trigger</sub>) and releases this stored energy as mechanical work (W<sub>mech</sub>).`;
            
            const simLoop = setInterval(() => {
                strain -= 1.5;
                currentTemp = T_AMBIENT + DT * (1 - strain / 100);
                
                curThermal += maxThermal / (100 / 1.5);
                curWork += maxWork / (100 / 1.5);
                
                if (strain <= 0) {
                    strain = 0;
                    currentTemp = T_RECOVERY;
                    clearInterval(simLoop);
                    isRunning = false;
                    btnRun.disabled = false;
                    stateLabel.innerText = "Actuation Complete";
                    
                    curThermal = maxThermal;
                    curWork = maxWork;
                    
                    const eff = ((curWork / 1000) / curThermal) * 100;
                    
                    resMass.innerText = mass.toFixed(2) + " g";
                    resUstored.innerText = uStored.toFixed(2) + " J";
                    resThermal.innerText = curThermal.toFixed(2) + " J";
                    resWork.innerText = curWork.toFixed(2) + " mJ";
                    resEff.innerText = eff.toFixed(3) + " %";
                    
                    let comparison = "";
                    if (eff < 1) {
                        comparison = "below the typical SMP range (1–5%)";
                    } else if (eff <= 5) {
                        comparison = "within the typical SMP range (1–5%), below SMA (2–8%)";
                    } else {
                        comparison = "above the typical SMP range, approaching SMA-like values (2–8%)";
                    }
                    
                    liveInsight.innerHTML = `<strong>Live Insight:</strong> Stroke complete. The artificial muscle consumed <strong>${curThermal.toFixed(2)} J</strong> of thermal energy (Q<sub>trigger</sub>) to produce <strong>${curWork.toFixed(2)} mJ</strong> of mechanical work (W<sub>mech</sub>), recovering the originally invested programming energy (U<sub>stored</sub> = ${uStored.toFixed(2)} J). <br><br>The overall efficiency is <strong>${eff.toFixed(3)}%</strong>, which is <strong>${comparison}</strong>. <br><br><strong>Biomedical Note:</strong> In medical applications, body heat (~37°C) is close to the trigger transition (45°C), meaning the temperature delta ΔT is effectively much smaller than in the laboratory. This allows body heat to serve as a 'free' thermal trigger, offsetting the low thermodynamic efficiency.`;
                }
                
                updateUI();
            }, 30);
        }
    });
    
    // Initialize simulation state
    function initializeState() {
        init3D();
        renderScene();
        updateUI();
    }
    
    initializeState();
})();
