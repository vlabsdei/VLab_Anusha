const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const plotCanvas = document.getElementById('plotCanvas');
const plotCtx = plotCanvas.getContext('2d');

const btnRun = document.getElementById('btnRun');
const blendSlider = document.getElementById('blendSlider');
const stateLabel = document.getElementById('stateLabel');
const liveInsight = document.getElementById('liveInsight');

let isRunning = false;
let currentTemp = 25;
let debug_val = 0; 
let historyPlot = [];
let puStrain = 50;
let pmmaStrain = 50;
let unifiedStrain = 100;
let currentMorphology = 'immiscible';

const radios = document.getElementsByName('morphology');
radios.forEach(r => r.addEventListener('change', () => {
    currentMorphology = document.querySelector('input[name="morphology"]:checked').value;
    if(!isRunning) render();
}));

blendSlider.addEventListener('input', () => {
    document.getElementById('lblPU').innerText = (100 - blendSlider.value) + "% PU";
    document.getElementById('lblPMMA').innerText = blendSlider.value + "% PMMA";
    if(!isRunning) render();
});

function calcFoxTg(w1, w2) {
    let tg1 = 45 + 273.15; 
    let tg2 = 105 + 273.15; 
    let invTg = (w1 / tg1) + (w2 / tg2);
    return (1 / invTg) - 273.15;
}

function drawSim() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "#555";
    ctx.fillRect(30, 150, 20, 100);
    
    let pmmaW2 = blendSlider.value / 100;
    
    if (currentMorphology === 'miscible') {
        let uWidth = 100 * (1 + unifiedStrain/100);
        if(uWidth > 350) uWidth = 350;
        
        ctx.fillStyle = unifiedStrain > 0 ? "rgba(100, 50, 100, 0.8)" : "rgba(80, 40, 80, 1)"; 
        ctx.fillRect(50, 160, uWidth, 80);
        ctx.strokeStyle = "#333";
        ctx.strokeRect(50, 160, uWidth, 80);
        
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px Arial";
        ctx.fillText("Unified Homogeneous Polymer Blend", 60, 205);
    } else {
        let puWidth = 100 * (1 + puStrain/100);
        if(puWidth > 350) puWidth = 350; 
        
        let pmmaWidth = 100 * (1 + pmmaStrain/100);
        if(pmmaWidth > 350) pmmaWidth = 350;
        
        ctx.fillStyle = puStrain > 0 ? "rgba(100, 100, 100, 0.7)" : "rgba(50, 50, 50, 1)";
        ctx.fillRect(50, 160, puWidth, 30);
        
        ctx.fillStyle = pmmaStrain > 0 ? "rgba(138, 17, 52, 0.7)" : "rgba(138, 17, 52, 1)";
        ctx.fillRect(50, 210, pmmaWidth, 30);
        
        ctx.strokeStyle = "#333";
        ctx.strokeRect(50, 160, Math.max(puWidth, pmmaWidth), 80);
        
        ctx.fillStyle = "#333";
        ctx.font = "12px Arial";
        ctx.fillText("PU Soft Domain (Phase 1)", 60, 180);
        ctx.fillStyle = "#fff";
        ctx.fillText("PMMA Hard Domain (Phase 2)", 60, 230);
    }
    let puW1 = 1 - pmmaW2;
    let mixedTg = calcFoxTg(puW1, pmmaW2);
    
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(95, 30, 270, 90);
    ctx.strokeStyle = "#8A1134";
    ctx.strokeRect(95, 30, 270, 90);
    
    ctx.fillStyle = "#333";
    
    if(currentMorphology === 'miscible') {
        ctx.font = "14px Arial";
        ctx.fillText("Fox Equation (Miscible Blend Tg):", 105, 50);
        ctx.font = "bold 12px Arial";
        ctx.fillText(`1 / Tg = (w1 / Tg1) + (w2 / Tg2)`, 105, 70);
        ctx.fillText(`1 / Tg = (${puW1.toFixed(2)} / 318.15) + (${pmmaW2.toFixed(2)} / 378.15)`, 105, 85);
        ctx.fillText(`Tg = ${mixedTg.toFixed(1)} °C`, 105, 105);
    } else {
        ctx.font = "14px Arial";
        ctx.fillText("Phase-Separated (Block Copolymer):", 105, 50);
        ctx.font = "bold 12px Arial";
        ctx.fillText(`Domain 1 (PU Tg) = 45.0 °C`, 105, 70);
        ctx.fillText(`Domain 2 (PMMA Tg) = 105.0 °C`, 105, 85);
        ctx.fillText(`Total Strain = (w1 × ε1) + (w2 × ε2)`, 105, 105);
    }
}

function drawPlot() {
    plotCtx.clearRect(0, 0, plotCanvas.width, plotCanvas.height);
    
    plotCtx.strokeStyle = "#eee";
    plotCtx.lineWidth = 1;
    for(let i=50; i<=400; i+=25) {
        plotCtx.beginPath(); plotCtx.moveTo(i, 50); plotCtx.lineTo(i, 350); plotCtx.stroke();
        plotCtx.beginPath(); plotCtx.moveTo(50, i-50); plotCtx.lineTo(400, i-50); plotCtx.stroke();
    }
    
    plotCtx.strokeStyle = "#333";
    plotCtx.lineWidth = 2;
    plotCtx.beginPath(); plotCtx.moveTo(50, 50); plotCtx.lineTo(50, 350); plotCtx.lineTo(400, 350); plotCtx.stroke();
    
    plotCtx.fillStyle = "#333";
    plotCtx.font = "12px Arial";
    plotCtx.fillText("Temperature (°C) [20 - 130]", 180, 380);
    
    plotCtx.save();
    plotCtx.translate(20, 200);
    plotCtx.rotate(-Math.PI/2);
    plotCtx.fillText("Strain (%)", 0, 0);
    plotCtx.restore();
    plotCtx.strokeStyle = "#8A1134";
    plotCtx.lineWidth = 3;
    plotCtx.beginPath();
    for(let i=0; i<historyPlot.length; i++) {
        if(i===0) plotCtx.moveTo(historyPlot[i].x, historyPlot[i].y);
        else plotCtx.lineTo(historyPlot[i].x, historyPlot[i].y);
    }
    plotCtx.stroke();
}

function render() {
    drawSim();
    drawPlot();
    if(isRunning) requestAnimationFrame(render);
}

btnRun.addEventListener('click', () => {
    if(!isRunning) {
        isRunning = true;
        btnRun.disabled = true;
        blendSlider.disabled = true;
        document.getElementById('resultsContainer').style.display = 'block';
        
        let pmmaW2 = blendSlider.value / 100;
        let puW1 = 1 - pmmaW2;
        let mixedTg = calcFoxTg(puW1, pmmaW2);
        
        document.getElementById('resW1').innerText = (puW1 * 100).toFixed(0) + " %";
        document.getElementById('resW2').innerText = (pmmaW2 * 100).toFixed(0) + " %";
        document.getElementById('resTg').innerText = currentMorphology === 'miscible' ? mixedTg.toFixed(1) + " °C" : "45°C & 105°C";
        
        puStrain = 50; pmmaStrain = 50; unifiedStrain = 100;
        currentTemp = 25; historyPlot = [];
        
        let simLoop = setInterval(() => {
            currentTemp += 0.5;
            stateLabel.innerText = "Heating: " + currentTemp.toFixed(1) + " °C";
            
            let totalStrain = 100;
            
            if(currentMorphology === 'immiscible') {
                if(currentTemp < 45) {
                    liveInsight.innerHTML = `<strong>Live Insight (${currentTemp.toFixed(1)}°C):</strong> Heating. Both phase-separated domains are below their respective Tgs. The strain is fixed.`;
                } else if(currentTemp >= 45 && currentTemp < 105) {
                    liveInsight.innerHTML = `<strong>Live Insight (${currentTemp.toFixed(1)}°C):</strong> <strong>First Transition!</strong> PU soft domains cross their Tg (45°C) and soften. First step of strain recovery!`;
                    puStrain -= 1.5;
                    if(puStrain < 0) puStrain = 0;
                } else if (currentTemp >= 105) {
                    liveInsight.innerHTML = `<strong>Live Insight (${currentTemp.toFixed(1)}°C):</strong> <strong>Second Transition!</strong> PMMA hard domains cross their Tg (105°C) and soften, triggering final strain recovery!`;
                    pmmaStrain -= 1.5;
                    if(pmmaStrain < 0) pmmaStrain = 0;
                }
                totalStrain = (puStrain * puW1) + (pmmaStrain * pmmaW2);
            } else {
                if(currentTemp < mixedTg) {
                    liveInsight.innerHTML = `<strong>Live Insight (${currentTemp.toFixed(1)}°C):</strong> Heating. The homogeneous blend is below its single mixed Fox Tg (${mixedTg.toFixed(1)}°C). Strain is fixed.`;
                } else {
                    liveInsight.innerHTML = `<strong>Live Insight (${currentTemp.toFixed(1)}°C):</strong> <strong>Fox Tg Reached!</strong> The miscible blend crosses its single mathematically averaged Tg. Complete recovery happens in ONE step!`;
                    unifiedStrain -= 3.0;
                    if(unifiedStrain < 0) unifiedStrain = 0;
                }
                totalStrain = unifiedStrain * 0.5; 
                puStrain = unifiedStrain / 2; 
                pmmaStrain = unifiedStrain / 2;
            }
            
            let px = 50 + ((currentTemp - 20) / 110) * 350; 

            let py = 350 - (totalStrain / 50) * 300; 
            historyPlot.push({x: px, y: Math.min(350, Math.max(50, py))});
            
            if(currentTemp > 130) {
                clearInterval(simLoop);
                isRunning = false;
                btnRun.disabled = false;
                let btnNext = document.getElementById('btnNextCalc');
                if(btnNext) btnNext.style.display = 'block';
                blendSlider.disabled = false;
                stateLabel.innerText = "Permanent Shape Reached";
                document.getElementById('resObs').innerText = currentMorphology === 'miscible' ? "Single recovery step observed at unified Tg." : "Two distinct recovery steps observed (Triple Shape).";
                liveInsight.innerHTML = `<strong>Live Insight:</strong> Cycle complete. You have successfully mapped the precise Strain Recovery curve!`;
            }
        }, 30);
        
        render();
    }
});

render();

