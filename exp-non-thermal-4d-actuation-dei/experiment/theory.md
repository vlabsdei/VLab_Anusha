# Theory: Non-Thermal 4D Actuation

## 1. Introduction to Non-Thermal 4D Printing
4D printing adds a time axis to additive manufacturing: a printed structure changes its shape or function after fabrication in response to an external stimulus. The most familiar route is thermal — heat a shape-memory polymer through its glass transition. But bulk heating is slow, hard to localise, and awkward inside the body. This experiment covers the *non-thermal* alternatives, where light and magnetic fields do the driving. Each brings its own physics and its own trade-offs: light can be aimed precisely but is limited by absorption and reaction kinetics, magnetic fields pass through tissue almost untouched and act nearly instantly, and near-infrared light splits the difference by converting to local heat only where nanoparticles absorb it.

---

## 2. Stimuli, Kinetics, and Confinement
Three ideas recur across the sub-calcs. First, **how far** a structure moves is set by an equilibrium — a photostationary state, a magnetic torque balance, or a steady temperature rise. Second, **how fast** it gets there is set by a kinetic time constant — a first-order rate, a viscous alignment time, or a thermal relaxation time. Third, **how local** the effect stays matters as much as its size: a heated zone that spreads beyond its target, or a coil field that demands runaway power at depth, defeats the purpose. The five sub-calcs each isolate one stimulus and quantify its equilibrium, its kinetics, and its practical limit.

---

## 3. The Light-Driven Actuator Strip (Sub-Calc A)
An azobenzene dye printed into one layer of a bilayer strip isomerises from its extended *trans* form to its bent *cis* form under 365 nm UV light, contracting that layer and bending the strip toward the lamp. 450 nm visible light drives it back. How much light the dye actually captures follows the **Beer-Lambert law** through an optical depth &epsilon;Cx:

<div align="center" style="font-size: 1.1em; font-weight: bold;">I<sub>abs</sub> = I<sub>0</sub> (1 - e<sup>-&epsilon;Cx</sup>)</div>

with molar absorptivity &epsilon; = 1250, path length x = 0.1 cm, and dye loading C in mmol/L. The dye then approaches its **photostationary state (PSS)** by first-order photokinetics:

<div align="center" style="font-size: 1.1em; font-weight: bold;">[cis](t) = [cis]<sub>PSS</sub> (1 - e<sup>-kt</sup>) &nbsp;&nbsp; k = k<sub>0</sub> I<sub>0</sub> (f<sub>abs</sub>(C) / f<sub>abs</sub>(8))</div>

where [cis]<sub>PSS</sub> = 0.85 under 365 nm and 0.12 under 450 nm, f<sub>abs</sub> is the absorbed fraction, and k<sub>0</sub> = 2.709&times;10<sup>-3</sup>. The actuation time — reaching 90% of full switching — and the bend angle are:

<div align="center" style="font-size: 1.1em; font-weight: bold;">t<sub>90</sub> = ln(10) / k &nbsp;(&prop; 1/I<sub>0</sub>) &nbsp;&nbsp;|&nbsp;&nbsp; &theta; &asymp; 70&deg; &middot; ([cis] / 0.85)</div>

Brighter light bends the strip faster; the bend saturates at about 70&deg; at full cis loading.

<p align="center"><img src="images/subcalc_a.svg" alt="Cis fraction and bend angle rising toward the photostationary state with the t90 actuation time marked" width="620"/></p>
<p align="center"><em>Figure 1: Under UV the cis fraction climbs first-order toward its PSS value and the strip bends with it; t<sub>90</sub> = ln(10)/k marks when it reaches 90% of full bend, and it shrinks as brightness rises (Sub-Calc A).</em></p>

---

## 4. The NIR Skin-Activated Implant (Sub-Calc B)
Gold nanorods tuned to 808 nm absorb near-infrared light — a wavelength that passes through skin with little attenuation — and convert it to local heat, switching a thermoresponsive implant on without wires or surgery. The steady temperature rise scales with laser power P and nanorod loading, and heating follows a **Newtonian (lumped-capacitance) approach** to that steady state:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&Delta;T<sub>ss</sub> = 560 &middot; P &middot; load &nbsp;&nbsp;|&nbsp;&nbsp; &Delta;T(t) = &Delta;T<sub>ss</sub> (1 - e<sup>-t/&tau;<sub>H</sub></sup>)</div>

with thermal time constant &tau;<sub>H</sub> = 15 s. The implant switches on once the rise clears the activation threshold &Delta;T<sub>req</sub> = 25 &deg;C, giving an activation time:

<div align="center" style="font-size: 1.1em; font-weight: bold;">t<sub>act</sub> = -&tau;<sub>H</sub> ln(1 - &Delta;T<sub>req</sub> / &Delta;T<sub>ss</sub>) &nbsp;&nbsp; (only if &Delta;T<sub>ss</sub> &gt; &Delta;T<sub>req</sub>)</div>

Heat also spreads while it activates. Treating conduction as diffusion with diffusivity D<sub>th</sub> = 5.3&times;10<sup>-3</sup> mm&sup2;/s, the heated-zone size at activation is:

<div align="center" style="font-size: 1.1em; font-weight: bold;">d = 2 &radic;(D<sub>th</sub> t<sub>act</sub>)</div>

The design tension is real: too little power never crosses +25 &deg;C, but slow heating lets the zone diffuse wide. Because faster heating reaches threshold sooner, more power actually gives a *tighter* spot — the sub-calc reports the minimum power P<sub>min</sub> that keeps d below 0.5 mm.

<p align="center"><img src="images/subcalc_b.svg" alt="Newtonian temperature-rise curve crossing the +25 C activation threshold with heated-zone growth" width="620"/></p>
<p align="center"><em>Figure 2: The nanorod spot heats toward &Delta;T<sub>ss</sub>; activation occurs where the curve crosses +25 &deg;C, and the heated-zone size d = 2&radic;(D<sub>th</sub>t<sub>act</sub>) sets whether the trigger stays local (Sub-Calc B).</em></p>

---

## 5. The Magnetic Micro-Gripper / Catheter Tip (Sub-Calc C)
Ferromagnetic particles printed into a soft tip carry a net moment m that an external field B tries to align, producing a **magnetic torque** that bends the tip:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&tau; = m &times; B = m B sin&theta; &nbsp;&nbsp; m = M<sub>s</sub> V<sub>particle</sub></div>

with saturation magnetisation M<sub>s</sub> = 4.8&times;10<sup>5</sup> A/m (magnetite, Fe<sub>3</sub>O<sub>4</sub>) and effective moment density M<sub>eff</sub> = M<sub>s</sub>&phi;/100 for a volume fraction &phi; in vol%. In the linear regime the tip angle grows with both loading and field, and the arc deflection of a beam of length L follows from that angle:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&theta; = min(90&deg;, k<sub>m</sub> &phi; B) &nbsp;&nbsp;|&nbsp;&nbsp; &delta; = L (1 - cos&theta;) / &theta;</div>

with k<sub>m</sub> = 0.18 deg/(vol%&middot;mT) and L = 10 mm. The field needed to reach a target angle is the **critical field**, which falls inversely with particle content:

<div align="center" style="font-size: 1.1em; font-weight: bold;">B<sub>crit</sub> = &theta;<sub>target</sub> / (k<sub>m</sub> &phi;) &nbsp;&nbsp; (&prop; 1/&phi;)</div>

So printing in more particles lets a gentler, safer external magnet do the steering — and because the torque is magnetic, it acts in milliseconds and passes straight through tissue.

<p align="center"><img src="images/subcalc_c.svg" alt="Free-body sketch of a magnetically loaded tip bending under field torque with the critical-field relation" width="620"/></p>
<p align="center"><em>Figure 3: The field-aligned moment m generates a torque &tau; = mB&nbsp;sin&theta; that curls the tip; the field to steer a set angle scales as B<sub>crit</sub> &prop; 1/&phi;, so heavier particle loading needs a weaker magnet (Sub-Calc C).</em></p>

---

## 6. The Wireless Coil Driving an In-Body Robot (Sub-Calc D)
An external drive coil must deliver a working field to a device implanted at depth r. The **on-axis field** of a coil of n turns and radius R carrying current I is:

<div align="center" style="font-size: 1.1em; font-weight: bold;">B = &mu;<sub>0</sub> n I R&sup2; / [2 (R&sup2; + r&sup2;)<sup>3/2</sup>]</div>

Far from the coil this falls off as 1/r&sup3;. Crucially, biological tissue has relative magnetic permeability &approx; 1, so unlike light or RF power it does *not* absorb a magnetostatic field — the field reaching the device equals the coil's geometric field, with no extra exponential decay. Inverting for the current needed to reach the working field B<sub>crit</sub> = 50 mT, and the resistive power that current dissipates in the winding:

<div align="center" style="font-size: 1.1em; font-weight: bold;">I<sub>req</sub> = B<sub>crit</sub> &middot; 2 (R&sup2; + r&sup2;)<sup>3/2</sup> / (&mu;<sub>0</sub> n R&sup2;) &nbsp;&nbsp;|&nbsp;&nbsp; P = I<sub>req</sub><sup>2</sup> R<sub>coil</sub>, &nbsp; R<sub>coil</sub> &prop; n</div>

Because the required field is fixed but the geometric coupling collapses with depth, the coil power climbs steeply. Past the **crossover depth**, where P exceeds a practical wireless budget of 300 W, a milliwatt-scale on-board battery becomes the sensible choice.

<p align="center"><img src="images/subcalc_d.svg" alt="Coil power rising steeply with implant depth crossing the wireless power budget" width="620"/></p>
<p align="center"><em>Figure 4: The on-axis field falls as 1/r&sup3; through magnetically-transparent tissue, so the current and power to hold B<sub>crit</sub> rise sharply with depth; beyond the crossover the coil exceeds the 300 W budget and a battery wins (Sub-Calc D).</em></p>

---

## 7. Picking the Right Trigger (Sub-Calc E)
The three stimuli live in completely different time regimes, each set by its own rate-limiting physics. Magnetic alignment is viscosity-limited, photoswitching is reaction-kinetics-limited, and thermal actuation is diffusion-limited:

<div align="center" style="font-size: 1.1em; font-weight: bold;">t<sub>mag</sub> &asymp; &eta; / (M<sub>s</sub> B) = 0.6 / B &nbsp;|&nbsp; t<sub>photo</sub> &asymp; 1 / (&Phi; I &sigma;) = 850 / I &nbsp;|&nbsp; t<sub>therm</sub> = &tau;<sub>thermal</sub></div>

(B in mT, I in mW/cm&sup2;, times in seconds). Across typical settings the magnetic strip snaps in milliseconds, the light-driven strip in seconds, and the heat-driven strip in minutes — spanning roughly six decades. The two ratios t<sub>photo</sub>/t<sub>mag</sub> and t<sub>therm</sub>/t<sub>mag</sub> quantify the gap. There is no single best trigger; the right one is the one whose speed matches the job — magnetic for fast surgical micro-robots, light for precisely-addressed microfluidics, and heat for simple, slow implants.

<p align="center"><img src="images/subcalc_e.svg" alt="Log-scale response-time comparison of magnetic, photo, and thermal triggers mapped to applications" width="620"/></p>
<p align="center"><em>Figure 5: On a log time axis the three triggers separate cleanly — magnetic (ms), photo (s), thermal (min) — and each maps to the application whose required response speed it fits (Sub-Calc E).</em></p>
