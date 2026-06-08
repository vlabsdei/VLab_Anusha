const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const plotCanvas = document.getElementById('plotCanvas');
const plotCtx = plotCanvas.getContext('2d');

const btnRun = document.getElementById('btnRun');
const stateLabel = document.getElementById('stateLabel');

const baseTg = document.getElementById('baseTg');
const progTemp = document.getElementById('progTemp');
const appStress = document.getElementById('appStress');
const loadRate = document.getElementById('loadRate');
const holdTime = document.getElementById('holdTime');
const liveInsight = document.getElementById('liveInsight');

baseTg.addEventListener('input', () => document.getElementById('valTg').innerText = baseTg.value + " °C");
progTemp.addEventListener('input', () => document.getElementById('valPtemp').innerText = progTemp.value + " °C");
appStress.addEventListener('input', () => document.getElementById('valStress').innerText = appStress.value + " MPa");
loadRate.addEventListener('input', () => document.getElementById('valLoadRate').innerText = loadRate.value + " MPa/s");
holdTime.addEventListener('input', () => document.getElementById('valHold').innerText = holdTime.value + " min");

let isRunning = false;
let strain = 0; 
let stress = 0; 
let currentWidth = 100;
let historyPlot = [];
let E_current = 2.0;
let maxPossibleStrain = 550; 

function drawSim() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#333";
    ctx.fillRect(10, 130, 40, 140);
    ctx.fillStyle = "#888";
    ctx.fillRect(30, 150, 20, 100);
    ctx.strokeStyle = "#8A1134";
    ctx.lineWidth = 2;
    ctx.beginPath();
    let numCells = 5;
    let cellW = currentWidth / numCells;
    for(let i=0; i<numCells; i++) {
        let sx = 50 + i*cellW;
        ctx.moveTo(sx, 175); ctx.lineTo(sx + cellW/2, 150); ctx.lineTo(sx + cellW, 175);
        ctx.moveTo(sx, 175); ctx.lineTo(sx + cellW/2, 200); ctx.lineTo(sx + cellW, 175);
        ctx.moveTo(sx, 225); ctx.lineTo(sx + cellW/2, 200); ctx.lineTo(sx + cellW, 225);
        ctx.moveTo(sx, 225); ctx.lineTo(sx + cellW/2, 250); ctx.lineTo(sx + cellW, 225);
    }
    ctx.stroke();

    let gripX = 50 + currentWidth;
    ctx.fillStyle = "#888";
    ctx.fillRect(gripX, 150, 20, 100);
    ctx.fillStyle = "#333";
    ctx.fillRect(gripX + 20, 130, 40, 140);
    if(stress > 0) {
        ctx.fillStyle = "#8A1134";
        ctx.beginPath();
        let ax = gripX + 70;
        ctx.moveTo(ax, 200); ctx.lineTo(ax + 30, 200); ctx.lineTo(ax + 20, 190); ctx.moveTo(ax + 30, 200); ctx.lineTo(ax + 20, 210);
        ctx.stroke();
        ctx.fillText("Tension: " + stress.toFixed(1) + " MPa", ax - 20, 120);
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
    plotCtx.fillText(`Strain (%) [0 - ${maxPossibleStrain.toFixed(0)}]`, 160, 380);
    
    plotCtx.save();
    plotCtx.translate(20, 250);
    plotCtx.rotate(-Math.PI/2);
    plotCtx.fillText("Stress (MPa) [0 - 10]", 0, 0);
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
    plotCtx.fillRect(200, 60, 220, 70);
    plotCtx.strokeStyle = "#8A1134";
    plotCtx.strokeRect(200, 60, 220, 70);
    
    plotCtx.fillStyle = "#333";
    plotCtx.font = "14px Arial";
    plotCtx.fillText("Viscoelastic Modulus (E):", 210, 80);
    plotCtx.font = "bold 12px Arial";
    plotCtx.fillText(`Strain = Stress / E(T)`, 210, 100);
    plotCtx.fillText(`ε = ${stress.toFixed(1)} / ${E_current.toFixed(1)} = ${(strain).toFixed(1)}%`, 210, 115);
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
        
        const Tg = parseFloat(baseTg.value);
        const ptemp = parseFloat(progTemp.value);
        const maxStress = parseFloat(appStress.value);
        const lRate = parseFloat(loadRate.value) * 0.01;
        const hTime = parseFloat(holdTime.value);
        
        E_current = ptemp > Tg ? 2.0 : 100.0; 
        maxPossibleStrain = ((maxStress / (ptemp > Tg ? 2.0 : 100.0))*100 + hTime) + 10;
        if(maxPossibleStrain < 100) maxPossibleStrain = 100;
        
        historyPlot = [];
        strain = 0; stress = 0; currentWidth = 100;
        
        let phase = 1; 
        let simLoop = setInterval(() => {
            if(phase === 1) {
                stateLabel.innerText = "UTM Phase 1: Loading";
                stress += lRate; 
                if(stress >= maxStress) stress = maxStress;
                strain = (stress / E_current) * 100; 
                liveInsight.innerHTML = `<strong>Live Insight (Loading at ${lRate*100} MPa/s):</strong> The UTM machine pulls. Since you are ${ptemp > Tg ? 'above' : 'below'} Tg, the modulus is ${E_current}, making the elastic curve ${ptemp > Tg ? 'shallow (rubbery)' : 'steep (glassy)'}.`;
                if(stress >= maxStress) phase = 2;
            } else if(phase === 2) {
                stateLabel.innerText = "UTM Phase 2: Holding Time";
                let creepRate = ptemp > Tg ? 0.05 : 0.0005; 
                strain += (hTime * creepRate); 
                stress = maxStress;
                if(ptemp > Tg) {
                    liveInsight.innerHTML = `<strong>Live Insight (Holding):</strong> The UTM motor holds position. Above Tg, the polymer chains have high mobility and physically slip over time (Viscoelastic Creep), shown by the horizontal graph line.`;
                } else {
                    liveInsight.innerHTML = `<strong>Live Insight (Holding):</strong> The UTM motor holds position. Because you are below Tg, the chains are frozen in a glassy state. Viscoelastic creep is almost zero!`;
                }
                if(strain >= (maxStress / E_current)*100 + (hTime * creepRate * 20)) {
                    phase = 3;
                    canvas.style.backgroundColor = "#e0f7fa";
                }
            } else if(phase === 3) {
                stateLabel.innerText = "UTM Phase 3: Quenching";
                E_current = 100.0;
                liveInsight.innerHTML = `<strong>Live Insight (Quenching):</strong> Rapid cooling applied. The chains freeze instantly, trapping the deformed state.`;
                phase = 4;
            } else if(phase === 4) {
                stateLabel.innerText = "UTM Phase 4: Unloading";
                canvas.style.backgroundColor = "transparent";
                stress -= lRate; 
                if(stress <= 0) stress = 0;
                strain -= (lRate / E_current) * 100;
                liveInsight.innerHTML = `<strong>Live Insight (Unloading):</strong> The UTM machine releases the tension. Notice the elastic springback is very small due to the high glassy modulus.`;
                if(stress <= 0) {
                    stress = 0;
                    clearInterval(simLoop);
                    isRunning = false;
                    btnRun.disabled = false;
                let btnNext = document.getElementById('btnNextCalc');
                if(btnNext) btnNext.style.display = 'block';
                    
                    let maxStr = ((maxStress / (ptemp > Tg ? 2.0 : 100.0))*100 + hTime);
                    let fixity = (strain / maxStr) * 100;
                    
                    document.getElementById('resMaxStrain').innerText = maxStr.toFixed(2) + " %";
                    document.getElementById('resFixed').innerText = strain.toFixed(2) + " %";
                    document.getElementById('resFixity').innerText = fixity.toFixed(1) + " %";
                    
                    liveInsight.innerHTML = `<strong>Live Insight:</strong> Test complete. Strain successfully fixed by the secondary molecular forces.`;
                }
            }
            
            currentWidth = 100 + (strain / maxPossibleStrain) * 200; 
            
            let px = 50 + (strain / maxPossibleStrain) * 350; 
            let py = 350 - (stress / 10) * 300; 
            historyPlot.push({x: px, y: Math.max(50, Math.min(350, py))});
            
        }, 30);
        
        render();
    }
});

render();

