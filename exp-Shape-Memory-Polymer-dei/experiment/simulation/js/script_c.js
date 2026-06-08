const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const plotCanvas = document.getElementById('plotCanvas');
const plotCtx = plotCanvas.getContext('2d');

const btnRun = document.getElementById('btnRun');
const stateLabel = document.getElementById('stateLabel');

const progStrain = document.getElementById('progStrain');
const heatRate = document.getElementById('heatRate');
const oppLoad = document.getElementById('oppLoad');
const liveInsight = document.getElementById('liveInsight');

progStrain.addEventListener('input', () => document.getElementById('valStrain').innerText = progStrain.value + " %");
heatRate.addEventListener('input', () => document.getElementById('valHeat').innerText = heatRate.value + " °C/min");
oppLoad.addEventListener('input', () => document.getElementById('valLoad').innerText = oppLoad.value + " MPa");

let isRunning = false;
let currentTemp = 25;
let debug_val = 0;
let Tg = 60;
let initialStrain = 100;
let strain = 100; 
let historyPlot = [];

function drawSim() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ccc";
    ctx.fillRect(400, 50, 15, 280);
    ctx.beginPath(); ctx.arc(407.5, 330, 20, 0, Math.PI*2); ctx.fill();
    let thHeight = ((currentTemp - 20) / 80) * 280;
    if(thHeight > 280) thHeight = 280;
    ctx.fillStyle = "#8A1134";
    ctx.beginPath(); ctx.arc(407.5, 330, 16, 0, Math.PI*2); ctx.fill();
    ctx.fillRect(403, 330 - thHeight, 9, thHeight);
    ctx.fillStyle = "#333";
    ctx.font = "12px Arial";
    ctx.fillText(currentTemp.toFixed(1) + "°C", 390, 365);
    
    let loadVal = parseFloat(oppLoad.value);
    ctx.fillStyle = "#333";
    ctx.fillRect(80, 20, 100, 20);

    let maxVisStrain = 300; 
    let height = 80 + (strain / maxVisStrain) * 150;
    ctx.fillStyle = currentTemp > Tg ? "rgba(138, 17, 52, 0.8)" : "rgba(100, 100, 100, 0.8)";
    ctx.fillRect(110, 40, 40, height);

    let plateY = 40 + height;
    ctx.fillStyle = "#555";
    ctx.fillRect(90, plateY, 80, 10);
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(130, plateY + 10);
    ctx.lineTo(130, plateY + 40);
    ctx.stroke();
    if(loadVal > 0) {
        let weightSize = 30 + loadVal * 10;
        ctx.fillStyle = "#222";
        ctx.fillRect(130 - weightSize/2, plateY + 40, weightSize, weightSize);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px Arial";
        ctx.fillText(loadVal + " MPa", 130 - 20, plateY + 40 + weightSize/2 + 4);
    }
}

function drawPlot() {
    plotCtx.clearRect(0, 0, plotCanvas.width, plotCanvas.height);
    
    plotCtx.strokeStyle = "#eee";
    plotCtx.lineWidth = 1;
    for(let i=50; i<=400; i+=50) {
        plotCtx.beginPath(); plotCtx.moveTo(i, 50); plotCtx.lineTo(i, 350); plotCtx.stroke();
        plotCtx.beginPath(); plotCtx.moveTo(50, i-50); plotCtx.lineTo(400, i-50); plotCtx.stroke();
    }
    
    plotCtx.strokeStyle = "#333";
    plotCtx.lineWidth = 2;
    plotCtx.beginPath(); plotCtx.moveTo(50, 50); plotCtx.lineTo(50, 350); plotCtx.lineTo(400, 350); plotCtx.stroke();
    
    plotCtx.fillStyle = "#333";
    plotCtx.font = "12px Arial";
    plotCtx.fillText("Temperature (°C) [20 - 100]", 180, 380);
    
    plotCtx.save();
    plotCtx.translate(20, 250);
    plotCtx.rotate(-Math.PI/2);
    plotCtx.fillText(`Strain (%) [0 - ${initialStrain.toFixed(0)}]`, 0, 0);
    plotCtx.restore();
    
    plotCtx.strokeStyle = "#8A1134";
    plotCtx.lineWidth = 3;
    plotCtx.beginPath();
    for(let i=0; i<historyPlot.length; i++) {
        if(i===0) plotCtx.moveTo(historyPlot[i].x, historyPlot[i].y);
        else plotCtx.lineTo(historyPlot[i].x, historyPlot[i].y);
    }
    plotCtx.stroke();
    plotCtx.fillStyle = "rgba(255,255,255,0.9)";
    plotCtx.fillRect(180, 60, 240, 90);
    plotCtx.strokeStyle = "#8A1134";
    plotCtx.strokeRect(180, 60, 240, 90);
    
    plotCtx.fillStyle = "#333";
    plotCtx.font = "14px Arial";
    plotCtx.fillText("Arrhenius Recovery Kinetics:", 190, 80);
    plotCtx.font = "bold 12px Arial";
    let Rr = ((initialStrain - strain) / initialStrain) * 100;

    let RT = 8.314 * (currentTemp + 273.15);
    let Ea = 150000;
    let relTime = Math.exp(Ea/RT - 45); 
    
    plotCtx.fillText(`Relaxation Time (τ) ~ exp(Ea/RT)`, 190, 100);
    plotCtx.fillText(`τ = ${currentTemp < Tg ? "∞ (Frozen)" : relTime.toFixed(2) + " seconds"}`, 190, 115);
    plotCtx.fillText(`R_r = ${Rr.toFixed(1)}%`, 190, 135);
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
        document.getElementById('resultsContainer').style.display = 'block';
        
        initialStrain = parseFloat(progStrain.value);
        strain = initialStrain;
        currentTemp = 25;
        let rate = parseFloat(heatRate.value) * 0.1;
        let loadVal = parseFloat(oppLoad.value);
        let E = 2.0; 
        
        historyPlot = [];
        
        let simLoop = setInterval(() => {
            currentTemp += rate;
            stateLabel.innerText = "Heating: " + currentTemp.toFixed(1) + " °C";
            
            if(currentTemp < Tg - 5) {
                liveInsight.innerHTML = `<strong>Live Insight (${currentTemp.toFixed(1)}°C):</strong> The polymer is heating. Below Tg, the chains are frozen and the relaxation time (τ) is infinite. The physical load hangs still.`;
            } else if(currentTemp >= Tg - 5 && currentTemp < Tg + 15) {
                liveInsight.innerHTML = `<strong>Live Insight (${currentTemp.toFixed(1)}°C):</strong> <strong>Tg approached!</strong> The Arrhenius relaxation time drops exponentially. The entropic force is physically hoisting the ${loadVal} MPa weight vertically!`;
                let force = E * (strain/100);
                if(force > loadVal) {
                    strain -= (force - loadVal) * 0.5;
                }
            } else {
                 liveInsight.innerHTML = `<strong>Live Insight (${currentTemp.toFixed(1)}°C):</strong> The recovery force diminishes as the strain returns to zero. The shape has hoisted the weight as much as possible against gravity.`;
            }
            
            if(strain < 0) strain = 0;
            
            let px = 50 + ((currentTemp - 20) / 80) * 350; 
            let py = 350 - (strain / initialStrain) * 300; 
            historyPlot.push({x: px, y: Math.min(350, Math.max(50, py))});
            
            if(currentTemp > Tg + 30) {
                clearInterval(simLoop);
                isRunning = false;
                btnRun.disabled = false;
                let btnNext = document.getElementById('btnNextCalc');
                if(btnNext) btnNext.style.display = 'block';
                stateLabel.innerText = "Recovery Complete";
                
                let Rr = ((initialStrain - strain) / initialStrain) * 100;
                let work = loadVal * (initialStrain - strain) * 0.01; 
                
                document.getElementById('resRecStrain').innerText = strain.toFixed(2) + " %";
                document.getElementById('resRr').innerText = Rr.toFixed(1) + " %";
                document.getElementById('resWork').innerText = work.toFixed(2) + " J/cm³";
                
                liveInsight.innerHTML = `<strong>Live Insight:</strong> Cycle complete. The material successfully performed ${work.toFixed(2)} Joules of mechanical work by physically lifting the weight!`;
            }
        }, 30);
        
        render();
    }
});

render();

