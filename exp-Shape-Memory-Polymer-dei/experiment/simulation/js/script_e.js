const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const plotCanvas = document.getElementById('plotCanvas');
const plotCtx = plotCanvas.getContext('2d');

const btnRun = document.getElementById('btnRun');
const stateLabel = document.getElementById('stateLabel');

const slen = document.getElementById('len');
const scp = document.getElementById('cp');
const sthi = document.getElementById('thi');
const sden = document.getElementById('den');
const liveInsight = document.getElementById('liveInsight');

const swid = 2.0; 

slen.addEventListener('input', () => { document.getElementById('valLen').innerText = slen.value + " cm"; render(); });
scp.addEventListener('input', () => { document.getElementById('valCp').innerText = scp.value + " J/g°C"; render(); });
sthi.addEventListener('input', () => { document.getElementById('valThi').innerText = sthi.value + " cm"; render(); });
sden.addEventListener('input', () => { document.getElementById('valDen').innerText = sden.value + " g/cm³"; render(); });

let isRunning = false;
let strain = 100;
let curThermal = 0;
let curWork = 0;

function drawSim() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#333";
    ctx.fillRect(30, 100, 40, 200);
    ctx.fillStyle = "#aaa";
    ctx.beginPath(); ctx.arc(70, 200, 15, 0, Math.PI*2); ctx.fill(); 
    
    let L = parseFloat(slen.value);
    let maxSafeWidth = 250; 
    let visualWidth = 100 + (strain/100) * (L*10);
    if(visualWidth > maxSafeWidth) visualWidth = maxSafeWidth;

    ctx.fillStyle = isRunning ? "rgba(138, 17, 52, 0.9)" : "rgba(100, 100, 100, 0.9)";
    ctx.fillRect(70, 185, visualWidth, 30);
    let pistonX = 70 + visualWidth;
    ctx.fillStyle = "#555";
    ctx.fillRect(pistonX, 170, 20, 60);
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(pistonX+20, 200); ctx.lineTo(pistonX+80, 200); ctx.stroke();

    ctx.fillStyle = "#8A1134";
    ctx.fillRect(pistonX+80, 160, 40, 80);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px Arial";
    ctx.fillText("LOAD", pistonX+82, 205);
    
    ctx.fillStyle = "#333";
    ctx.font = "14px Arial";
    ctx.fillText(`Polymer Muscle L = ${L} cm`, 50, 360);
}

function drawPlot() {
    plotCtx.clearRect(0, 0, plotCanvas.width, plotCanvas.height);
    
    let l = parseFloat(slen.value);
    let t = parseFloat(sthi.value);
    let d = parseFloat(sden.value);
    let cpVal = parseFloat(scp.value);
    
    let vol = l * swid * t;
    let mass = vol * d;
    
    plotCtx.fillStyle = "#fff";
    plotCtx.fillRect(20, 20, 410, 360);
    
    plotCtx.fillStyle = "#8A1134";
    plotCtx.font = "bold 16px Arial";
    plotCtx.fillText("Geometry & Mass:", 40, 50);
    plotCtx.fillStyle = "#333";
    plotCtx.font = "14px Arial";
    plotCtx.fillText(`Volume (V) = l * w * t = ${l} * ${swid} * ${t} = ${vol.toFixed(1)} cm³`, 40, 75);
    plotCtx.fillText(`Mass (m) = V * d = ${vol.toFixed(1)} * ${d} = ${mass.toFixed(1)} g`, 40, 95);
    
    plotCtx.fillStyle = "#8A1134";
    plotCtx.font = "bold 16px Arial";
    plotCtx.fillText("Thermal Energy In (Q):", 40, 140);
    plotCtx.fillStyle = "#333";
    plotCtx.font = "14px Arial";
    plotCtx.fillText(`Q = m * Cp * ΔT`, 40, 165);
    plotCtx.fillText(`Q = ${mass.toFixed(1)} * ${cpVal.toFixed(1)} * (ΔT) = ${curThermal.toFixed(1)} J`, 40, 185);
    
    plotCtx.fillStyle = "#8A1134";
    plotCtx.font = "bold 16px Arial";
    plotCtx.fillText("Mechanical Work Out (W):", 40, 230);
    plotCtx.fillStyle = "#333";
    plotCtx.font = "14px Arial";
    plotCtx.fillText(`W = Stress * Strain * Volume`, 40, 255);
    plotCtx.fillText(`W = 2.0 * ${((100-strain)/100).toFixed(2)} * ${vol.toFixed(1)} = ${curWork.toFixed(1)} mJ`, 40, 275);
    
    plotCtx.fillStyle = "#8A1134";
    plotCtx.font = "bold 18px Arial";
    plotCtx.fillText("Efficiency (η):", 40, 320);
    let eff = curThermal > 0 ? ((curWork/1000) / curThermal) * 100 : 0;
    plotCtx.fillText(`η = (W / Q) * 100 = ${eff.toFixed(4)} %`, 40, 345);
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
        
        let l = parseFloat(slen.value);
        let t = parseFloat(sthi.value);
        let d = parseFloat(sden.value);
        let cpVal = parseFloat(scp.value); 
        
        let vol = l * swid * t;
        let mass = vol * d;
        
        strain = 100;
        curThermal = 0;
        curWork = 0;

        let maxThermal = mass * cpVal * 45; 
        let maxWork = 2.0 * 1.0 * vol * 1000; 
        
        liveInsight.innerHTML = `<strong>Live Insight:</strong> Thermal energy (Joules) is being pumped into the 'muscle'. The low specific heat capacity (Cp) allows it to heat up rapidly, generating a massive kinetic stroke (Work) pulling the robotic load.`;
        
        let simLoop = setInterval(() => {
            strain -= 1.5;
            
            curThermal += maxThermal / (100/1.5);
            curWork += maxWork / (100/1.5);
            
            if(strain <= 0) {
                strain = 0;
                clearInterval(simLoop);
                isRunning = false;
                btnRun.disabled = false;
                stateLabel.innerText = "Actuation Complete";
                
                document.getElementById('resMass').innerText = mass.toFixed(2) + " grams";
                document.getElementById('resThermal').innerText = curThermal.toFixed(2) + " Joules";
                document.getElementById('resWork').innerText = curWork.toFixed(2) + " mJ";
                let eff = ((curWork/1000) / curThermal) * 100;
                document.getElementById('resEff').innerText = eff.toFixed(4) + " %";
                
                liveInsight.innerHTML = `<strong>Live Insight:</strong> Stroke complete. The artificial muscle used ${curThermal.toFixed(1)} Joules of thermal energy to produce ${curWork.toFixed(1)} mJ of robotic actuation work. Total Thermal Efficiency is ${eff.toFixed(4)}%.`;
            }
        }, 30);
        
        render();
    }
});

render();

