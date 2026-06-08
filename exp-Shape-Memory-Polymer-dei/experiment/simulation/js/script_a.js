const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const plotCanvas = document.getElementById('plotCanvas');
const plotCtx = plotCanvas.getContext('2d');

const btnRun = document.getElementById('btnRun');
const stateLabel = document.getElementById('stateLabel');
const radios = document.getElementsByName('mat');
const heatingRate = document.getElementById('heatingRate');
const crosslink = document.getElementById('crosslink');
const liveInsight = document.getElementById('liveInsight');

let isRunning = false;
let currentTemp = 20;
let debug_val = 0;
let Tg = 45;
let material = 'PU';
let historyPlot = [];

heatingRate.addEventListener('input', () => document.getElementById('valRate').innerText = heatingRate.value + " °C/min");
crosslink.addEventListener('input', () => {
    document.getElementById('valCross').innerText = crosslink.value + " nodes";
    initNodes(material, parseInt(crosslink.value));
    if(!isRunning) render();
});

const magCenterX = 260;
const magCenterY = 150;
const magRadius = 110;

let nodes = [];
function initNodes(mat, count) {
    nodes = [];
    for(let i=0; i<count; i++) {
        let isHard = (mat === 'PU' && Math.random() > 0.8) || (mat === 'PLA' && i%5 === 0);
        nodes.push({
            x: magCenterX - magRadius*0.8 + Math.random() * (magRadius*1.6), 
            y: magCenterY - magRadius*0.8 + Math.random() * (magRadius*1.6),
            baseX: 0, baseY: 0,
            isHard: isHard
        });
        nodes[i].baseX = nodes[i].x;
        nodes[i].baseY = nodes[i].y;
    }
}
initNodes('PU', 60);

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
    plotCtx.fillText("Temperature (°C) [20 - 160]", 180, 380);
    plotCtx.fillText("20", 45, 365);
    plotCtx.fillText("160", 390, 365);
    
    plotCtx.save();
    plotCtx.translate(20, 250);
    plotCtx.rotate(-Math.PI/2);
    plotCtx.fillText("Shift Factor log(a_T) [0 to -15]", 0, 0);
    plotCtx.restore();
    
    plotCtx.strokeStyle = "rgba(138, 17, 52, 0.3)";
    plotCtx.lineWidth = 2;
    plotCtx.setLineDash([5, 5]);
    plotCtx.beginPath();
    for(let t = Tg; t <= Tg + 80; t++) {
        let wlf = -17.44 * (t - Tg) / (51.6 + t - Tg);
        let px = 50 + ((t - 20) / 140) * 350; 
        let py = 50 + (-wlf / 15) * 300; 
        if(t === Tg) plotCtx.moveTo(px, py);
        else plotCtx.lineTo(px, py);
    }
    plotCtx.stroke();
    plotCtx.setLineDash([]);
    
    plotCtx.strokeStyle = "#8A1134";
    plotCtx.lineWidth = 3;
    plotCtx.beginPath();
    for(let i=0; i<historyPlot.length; i++) {
        if(i===0) plotCtx.moveTo(historyPlot[i].x, historyPlot[i].y);
        else plotCtx.lineTo(historyPlot[i].x, historyPlot[i].y);
    }
    plotCtx.stroke();
    
    plotCtx.fillStyle = "rgba(255,255,255,0.9)";
    plotCtx.fillRect(60, 60, 200, 70);
    plotCtx.strokeStyle = "#8A1134";
    plotCtx.strokeRect(60, 60, 200, 70);
    
    plotCtx.fillStyle = "#333";
    plotCtx.font = "14px Arial";
    plotCtx.fillText("WLF Equation:", 70, 80);
    
    let wlfVal = 0;
    if (currentTemp >= Tg) wlfVal = -17.44 * (currentTemp - Tg) / (51.6 + currentTemp - Tg);
    
    plotCtx.font = "bold 12px Arial";
    plotCtx.fillText(`log(aT) = -17.44(${currentTemp.toFixed(1)} - ${Tg})`, 70, 100);
    plotCtx.fillText(`          ------------------- = ${currentTemp<Tg ? "0.00" : wlfVal.toFixed(2)}`, 70, 115);
    plotCtx.fillText(`          51.6 + (${currentTemp.toFixed(1)} - ${Tg})`, 70, 125);
}

function drawSim() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ccc";
    ctx.fillRect(410, 50, 15, 280);
    ctx.beginPath(); ctx.arc(417.5, 330, 20, 0, Math.PI*2); ctx.fill();
    let thHeight = ((currentTemp - 20) / 140) * 280;
    if (thHeight > 280) thHeight = 280;
    ctx.fillStyle = "#8A1134";
    ctx.beginPath(); ctx.arc(417.5, 330, 16, 0, Math.PI*2); ctx.fill();
    ctx.fillRect(413, 330 - thHeight, 9, thHeight);
    ctx.fillStyle = "#333";
    ctx.font = "12px Arial";
    ctx.fillText(currentTemp.toFixed(1) + "°C", 400, 365);
    
    let isRubbery = currentTemp > Tg;

    ctx.fillStyle = "#555";
    ctx.fillRect(10, 200, 60, 150);
    ctx.fillStyle = "#333";
    ctx.fillRect(5, 200, 70, 10);

    let sag = isRubbery ? Math.min((currentTemp - Tg) * 0.7, 120) : 0;
    
    ctx.fillStyle = isRubbery ? "rgba(138, 17, 52, 0.9)" : "rgba(100, 100, 100, 0.9)";
    ctx.beginPath();
    ctx.moveTo(70, 205);
    ctx.bezierCurveTo(120, 205, 170, 205 + sag, 230, 205 + sag);
    ctx.lineTo(230, 225 + sag);
    
    ctx.bezierCurveTo(170, 225 + sag, 120, 225, 70, 225);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 1;
    ctx.setLineDash([5,5]);
    ctx.beginPath();
    ctx.moveTo(170, 215 + sag/2);
    ctx.lineTo(magCenterX, magCenterY + magRadius);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(magCenterX+3, magCenterY+3, magRadius, 0, Math.PI*2);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(magCenterX, magCenterY, magRadius, 0, Math.PI*2);
    ctx.fillStyle = "#f0f8ff";
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(magCenterX, magCenterY, magRadius, 0, Math.PI*2);
    ctx.clip();

    let mobility = isRubbery ? Math.min((currentTemp - Tg) * 0.12, 7) : (currentTemp/Tg) * 0.5;
    
    for(let i=0; i<nodes.length; i++) {
        let n = nodes[i];
        if(!n.isHard || currentTemp > Tg + 40) { 
            n.x += (Math.random() - 0.5) * mobility;
            n.y += (Math.random() - 0.5) * mobility;
            n.x += (n.baseX - n.x) * 0.05;
            n.y += (n.baseY - n.y) * 0.05;
        }
    }
    
    ctx.lineWidth = 2; 
    for(let i=0; i<nodes.length; i++) {
        for(let j=i+1; j<nodes.length; j++) {
            let dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
            let connThreshold = 35;
            if (dist < connThreshold) { 
                ctx.strokeStyle = isRubbery ? `rgba(138, 17, 52, ${1 - dist/connThreshold})` : `rgba(100, 100, 100, ${1 - dist/connThreshold})`;
                ctx.beginPath();
                ctx.moveTo(nodes[i].x, nodes[i].y);
                if (isRubbery && !nodes[i].isHard && !nodes[j].isHard) {
                    ctx.quadraticCurveTo((nodes[i].x+nodes[j].x)/2 + 8, (nodes[i].y+nodes[j].y)/2 - 8, nodes[j].x, nodes[j].y);
                } else {
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                }
                ctx.stroke();
            }
        }
    }
    
    for(let i=0; i<nodes.length; i++) {
        ctx.beginPath();
        ctx.arc(nodes[i].x, nodes[i].y, nodes[i].isHard ? 6 : 3, 0, Math.PI*2);
        ctx.fillStyle = nodes[i].isHard ? "#333" : (isRubbery ? "#8A1134" : "#777");
        ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(magCenterX, magCenterY, magRadius*0.9, 3.5, 4.8);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.restore();

    
    let gradient = ctx.createLinearGradient(magCenterX - magRadius, magCenterY - magRadius, magCenterX + magRadius, magCenterY + magRadius);
    gradient.addColorStop(0, "#ccc");
    gradient.addColorStop(0.5, "#666");
    gradient.addColorStop(1, "#333");
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(magCenterX, magCenterY, magRadius, 0, Math.PI*2);
    ctx.stroke();
    
    ctx.fillStyle = "#333";
    ctx.font = "bold 14px Arial";
    ctx.fillText("Macro View (SMP)", 10, 180);
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
        crosslink.disabled = true;
        
        material = document.querySelector('input[name="mat"]:checked').value;
        Tg = material === 'PU' ? 45 : (material === 'PLA' ? 60 : 105);
        let rate = parseFloat(heatingRate.value) * 0.05;
        
        historyPlot = [];
        currentTemp = 20;
        
        let simLoop = setInterval(() => {
            currentTemp += rate;
            
            let px = 50 + ((currentTemp - 20) / 140) * 350;
            let wlf = 0;
            if (currentTemp >= Tg) wlf = -17.44 * (currentTemp - Tg) / (51.6 + currentTemp - Tg);
            let py = 50 + (-wlf / 15) * 300;
            
            historyPlot.push({x: px, y: Math.min(350, Math.max(50, py))});
            
            document.getElementById('resTemp').innerText = currentTemp.toFixed(1) + " °C";
            document.getElementById('resWLF').innerText = currentTemp >= Tg ? wlf.toFixed(3) : "Glassy (N/A)";
            stateLabel.innerText = currentTemp < Tg ? "State: Glassy (Frozen)" : "State: Rubbery (Viscoelastic)";
            
            if(currentTemp < Tg) {
                liveInsight.innerHTML = `<strong>Live Insight (${currentTemp.toFixed(1)}°C):</strong> The macro block is hard and rigid. Inside the micro-view lens, the polymer chains are vibrating in place, lacking the thermal energy to move.`;
            } else if (currentTemp >= Tg && currentTemp < Tg + 20) {
                liveInsight.innerHTML = `<strong>Live Insight (${currentTemp.toFixed(1)}°C):</strong> <strong>Tg reached!</strong> Watch the micro-view: thermal energy unlocks the chains, creating massive molecular vibrations. Watch the block: it becomes soft and sags under its own weight!`;
            } else {
                liveInsight.innerHTML = `<strong>Live Insight (${currentTemp.toFixed(1)}°C):</strong> The SMP is in its highly rubbery, high-energy state. It is fully softened and completely flexible, but it is NOT melted!`;
            }
            
            if(currentTemp >= Tg + 80 || currentTemp >= 160) {
                clearInterval(simLoop);
                isRunning = false;
                btnRun.disabled = false;
                let btnNext = document.getElementById('btnNextCalc');
                if(btnNext) btnNext.style.display = 'block';
                crosslink.disabled = false;
                btnRun.innerText = "Rerun Cycle";
                liveInsight.innerHTML = `<strong>Live Insight:</strong> Cycle complete. You've visually observed how micro-scale molecular vibrations translate directly into macro-scale physical softening!`;
            }
        }, 30);
        
        render();
    }
});

radios.forEach(r => r.addEventListener('change', () => {
    material = document.querySelector('input[name="mat"]:checked').value;
    Tg = material === 'PU' ? 45 : (material === 'PLA' ? 60 : 105);
    initNodes(material, parseInt(crosslink.value));
    if(!isRunning) render();
}));

render();

