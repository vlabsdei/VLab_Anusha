# Theory: Shape Memory Alloys and their Laboratory Characterisation

## 1. Introduction to Shape Memory Alloys in 4D Printing
4D printing adds time as the fourth dimension: a printed part reconfigures its shape or function after fabrication when it meets an external stimulus. Where thermal polymers rely on a soft glass transition, the metallic route uses a **Shape Memory Alloy (SMA)**, most often near-equiatomic Nitinol (NiTi). An SMA remembers a hot "austenite" shape, can be deformed while cold, and snaps back on heating through a solid-state phase change. That gives large recoverable strains (up to ~8 %) and stresses of several hundred MPa, which is why NiTi shows up in 4D actuators, stents, and morphing structures.

---

## 2. The Martensitic Transformation
The behaviour rests on a diffusionless, reversible transformation between two crystal structures:
1. **Austenite (B2):** the high-temperature, high-symmetry parent phase, stiff and holding the "remembered" geometry.
2. **Martensite (B19'):** the low-temperature monoclinic phase, soft and easily reoriented (detwinned) by stress.

Four temperatures bound the hysteresis loop: on cooling, martensite forms between M<sub>s</sub> (start) and M<sub>f</sub> (finish); on heating, austenite grows between A<sub>s</sub> (start) and A<sub>f</sub> (finish). The forward and reverse paths don't coincide, so there's a thermal hysteresis that the DSC station measures directly. The rest of this page follows the five lab instruments that put numbers on each part of this transformation.

---

## 3. Transformation Thermometry - DSC Machine (Sub-Calc A)
Differential Scanning Calorimetry ramps a milligram of Nitinol and records heat flow; the endothermic (heating) and exothermic (cooling) peaks locate the transformation temperatures. Composition sets M<sub>s</sub> through the **Duerig empirical relation**, and the remaining temperatures follow the fixed offsets used in the simulation:

<div align="center" style="font-size: 1.1em; font-weight: bold;">M<sub>s</sub> = 1020 &minus; 99.3 &times; (at%Ni &minus; 40.91)</div>
<div align="center">M<sub>f</sub> = M<sub>s</sub> &minus; 20 &nbsp;&nbsp; A<sub>s</sub> = M<sub>s</sub> + 30 &nbsp;&nbsp; A<sub>f</sub> = A<sub>s</sub> + 20</div>

The fraction of martensite still present at temperature T during heating follows a **cosine kinetics law**:

<div align="center" style="font-size: 1.1em; font-weight: bold;">x<sub>M</sub> = 0.5 &times; cos[&pi;(T &minus; A<sub>s</sub>) / (A<sub>f</sub> &minus; A<sub>s</sub>)] + 0.5 &nbsp;&nbsp; for A<sub>s</sub> &le; T &le; A<sub>f</sub></div>

with x<sub>M</sub> = 1 below A<sub>s</sub> and x<sub>M</sub> = 0 above A<sub>f</sub>. The austenite fraction is x<sub>A</sub> = 1 &minus; x<sub>M</sub>, and the recoverable strain scales with it against a maximum &epsilon;<sub>max</sub> = 8 %:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;<sub>SMA</sub> = &epsilon;<sub>max</sub> &times; x<sub>A</sub> = 8.0 &times; (1 &minus; x<sub>M</sub>) %</div>

The thermal hysteresis reported by the instrument is simply &Delta;T = A<sub>f</sub> &minus; M<sub>s</sub>.

<p align="center"><img src="images/subcalc_a.svg" alt="DSC heat-flow curves showing the transformation temperatures and hysteresis window of Nitinol" width="620"/></p>
<p align="center"><em>Figure 1: The DSC heating and cooling scans locate M<sub>s</sub>, M<sub>f</sub>, A<sub>s</sub>, A<sub>f</sub>; the gap between the exothermic and endothermic peaks is the thermal hysteresis A<sub>f</sub> &minus; M<sub>s</sub> (Sub-Calc A).</em></p>

---

## 4. Mechanical Regimes - Universal Testing Machine (Sub-Calc B)
Which stress-strain loop a Nitinol coupon traces depends on the test temperature relative to A<sub>f</sub> (fixed at 18 &deg;C in the model). Below A<sub>f</sub> the alloy shows the **Shape Memory Effect**: martensite detwins at a roughly constant critical stress and a permanent set stays after unloading, only recovered later by heating. At or above A<sub>f</sub> it turns **superelastic**: a stress-induced transformation forms martensite on loading and reverts on unloading, closing the loop.

The superelastic upper-plateau stress rises with temperature in a **Clausius-Clapeyron** fashion (slope 7 MPa/&deg;C, capped at 500 MPa):

<div align="center" style="font-size: 1.1em; font-weight: bold;">&sigma;<sub>AM</sub> = 150 + 7 &times; (T &minus; A<sub>f</sub>) &nbsp;&nbsp; [MPa]</div>

The detwinning plateau in the cold regime is &sigma;<sub>yield</sub> &asymp; 120 MPa. Loading is elastic (austenite E<sub>A</sub> = 40 GPa, martensite E<sub>M</sub> = 25 GPa) up to the plateau. The energy dissipated per unit volume is the enclosed loop area, and the damping capacity is that work normalised by the elastic energy:

<div align="center" style="font-size: 1.1em; font-weight: bold;">W<sub>hyst</sub> = &Delta;&sigma;<sub>plateau</sub> &times; (&epsilon;<sub>max</sub> &minus; 1.5) / 100 &nbsp;&nbsp; [MJ/m<sup>3</sup>], &nbsp; &Delta;&sigma;<sub>plateau</sub> = 120 MPa</div>
<div align="center" style="font-size: 1.1em; font-weight: bold;">Q<sup>&minus;1</sup> = W<sub>hyst</sub> / (&pi; &times; &sigma;<sub>max</sub> &times; &epsilon;<sub>max</sub>)</div>

Nitinol's Q<sup>&minus;1</sup> lands near 0.1, orders of magnitude above structural steel (~0.001), which is why it doubles as a mechanical damper.

<p align="center"><img src="images/subcalc_b.svg" alt="Superelastic and shape-memory stress-strain hysteresis loops of Nitinol" width="620"/></p>
<p align="center"><em>Figure 2: The UTM loop, a closed superelastic hysteresis above A<sub>f</sub> versus the open shape-memory loop with a permanent set below A<sub>f</sub>; the enclosed area is the dissipated work W<sub>hyst</sub> (Sub-Calc B).</em></p>

---

## 5. Electrical Actuation - Bench Power Supply & Thermocouple (Sub-Calc C)
A Nitinol wire is a resistive heater as well as an actuator, so a current I drives it through the transformation. The wire's resistance depends on phase (austenite resistivity &rho;<sub>A</sub> = 82&times;10<sup>&minus;8</sup> &Omega;&middot;m drops ~20 % below martensite &rho;<sub>M</sub> = 100&times;10<sup>&minus;8</sup> &Omega;&middot;m), blended through the same x<sub>M</sub>:

<div align="center" style="font-size: 1.1em; font-weight: bold;">R(T) = R<sub>A</sub> + (R<sub>M</sub> &minus; R<sub>A</sub>) &times; x<sub>M</sub>, &nbsp;&nbsp; R = &rho; L / A<sub>wire</sub></div>

The temperature history is the **lumped electro-thermal ODE**, Joule input balanced against convective loss (h = 25 W/m<sup>2</sup>K, C<sub>p</sub> = 320 J/kg&middot;K, &rho;<sub>NiTi</sub> = 6450 kg/m<sup>3</sup>, L = 0.1 m):

<div align="center" style="font-size: 1.1em; font-weight: bold;">dT/dt = [ I<sup>2</sup> R(T) &minus; h A<sub>surf</sub> (T &minus; T<sub>amb</sub>) ] / (m C<sub>p</sub>)</div>

Setting dT/dt = 0 gives the steady-state temperature, and the activation time t<sub>act</sub> is found by integrating the ODE until T reaches A<sub>f</sub> = 68 &deg;C:

<div align="center" style="font-size: 1.1em; font-weight: bold;">T<sub>ss</sub> = T<sub>amb</sub> + I<sup>2</sup> R<sub>A</sub> / (h A<sub>surf</sub>)</div>

If T<sub>ss</sub> &le; A<sub>f</sub> the wire asymptotes below the finish temperature and never actuates. Above T<sub>ss</sub> &sim; 150 &deg;C the readout warns of oxidation and loss of trained behaviour.

<p align="center"><img src="images/subcalc_c.svg" alt="Joule heating temperature-time curve of a Nitinol wire crossing the austenite temperatures" width="620"/></p>
<p align="center"><em>Figure 3: Resistive heating drives the wire temperature along an exponential approach to T<sub>ss</sub>; the activation time t<sub>act</sub> is where the curve crosses A<sub>f</sub>, and if T<sub>ss</sub> sits below A<sub>f</sub> actuation stalls (Sub-Calc C).</em></p>

---

## 6. Actuator Sizing - Load Cell & Ruler (Sub-Calc D)
Sizing a wire actuator turns geometry and a programmed pre-strain into a usable stroke and force. The recovered contraction is the pre-strain acting over the active length, while the blocking force is the recovery stress (&sigma;<sub>recovery</sub> = 400 MPa) over the cross-section, using the handy identity 1 MPa &times; 1 mm<sup>2</sup> = 1 N:

<div align="center" style="font-size: 1.1em; font-weight: bold;">d<sub>stroke</sub> = &epsilon;<sub>pre</sub> &times; L<sub>wire</sub> &nbsp;&nbsp;&nbsp; F<sub>block</sub> = &sigma;<sub>recovery</sub> &times; A<sub>wire</sub></div>

Real actuation delivers roughly the triangular area under the force-stroke line, and dividing by the wire mass gives the mass-specific work that lets NiTi be compared to other actuators (&rho; = 6450 kg/m<sup>3</sup>):

<div align="center" style="font-size: 1.1em; font-weight: bold;">W = (F<sub>block</sub> &times; d<sub>stroke</sub>) / 2 &nbsp;&nbsp;&nbsp; w<sub>sp</sub> = W / m<sub>wire</sub> &nbsp;&nbsp; [J/kg]</div>

At a few hundred J/kg the specific work sits well above shape memory polymers (~5 J/kg) and pneumatics (~100 J/kg), which is the headline advantage of SMA actuation.

<p align="center"><img src="images/subcalc_d.svg" alt="Force versus stroke line for a Nitinol wire actuator with work area shaded" width="620"/></p>
<p align="center"><em>Figure 4: The actuator rig converts pre-strain into a stroke d and a blocking force F<sub>block</sub>; the shaded triangle under the force-stroke line is the mechanical work, normalised by mass to give w<sub>sp</sub> (Sub-Calc D).</em></p>

---

## 7. Fatigue Life - Rotating Bending Rig (Sub-Calc E)
Cyclic loading limits every SMA device, and two distinct failure modes matter. **Structural fatigue**, crack growth to fracture, follows a Coffin-Manson power law with slope &minus;2 (constant C = 8 with strain as a fraction):

<div align="center" style="font-size: 1.1em; font-weight: bold;">N<sub>f</sub> = C / &epsilon;<sub>a</sub><sup>2</sup></div>

Below ~4000 cycles the specimen is in the low-cycle, high-strain regime; above it, in finite-life durable service. Separately, **functional fatigue** is the gradual loss of recoverable strain from accumulated dislocations, modelled as an exponential decay with a strain-sensitive rate (k<sub>0</sub> = 1.2&times;10<sup>&minus;6</sup>, n = 1.8) evaluated at a reference N<sub>ref</sub> = 10 000 cycles:

<div align="center" style="font-size: 1.1em; font-weight: bold;">k = k<sub>0</sub> &epsilon;<sup>n</sup> &nbsp;&nbsp;&nbsp; &epsilon;<sub>rec</sub> = &epsilon;<sub>applied</sub> &times; exp(&minus;k N<sub>ref</sub>)</div>
<div align="center" style="font-size: 1.1em; font-weight: bold;">Loss = (&epsilon;<sub>applied</sub> &minus; &epsilon;<sub>rec</sub>) / &epsilon;<sub>applied</sub> &times; 100 %</div>

Both mechanisms sharpen with strain amplitude, so keeping the working strain modest is the central design lever for long-life SMA components.

<p align="center"><img src="images/subcalc_e.svg" alt="S-N fatigue curve of Nitinol on a logarithmic cycle axis" width="620"/></p>
<p align="center"><em>Figure 5: The rotating-bending S-N curve falls steeply with strain amplitude (N &prop; &epsilon;<sup>&minus;2</sup>); the 4000-cycle line separates low-cycle fatigue from the durable finite-life range (Sub-Calc E).</em></p>

---

## 8. The Transformation as a Temperature-Time Trajectory and its Fatigue Limit

The martensite fraction x<sub>M</sub>(T) is a state function of temperature, but a Joule-heated wire
doesn't jump. It sweeps from A<sub>s</sub> to A<sub>f</sub> in time, driven by
dT/dt = [I&sup2;R(T) &minus; hA<sub>surf</sub>(T &minus; T<sub>amb</sub>)]/(mC<sub>p</sub>) toward the
steady state T<sub>ss</sub> = T<sub>amb</sub> + I&sup2;R<sub>A</sub>/(hA<sub>surf</sub>). Cooling resets
it. The actuation bandwidth, how fast the SMA can cycle, is set entirely by this thermal time constant,
and that is the fourth dimension of an SMA actuator.

<div align="center" style="font-size: 1.1em; font-weight: bold;">stroke passes only if  work F<sub>block</sub>&middot;d<sub>stroke</sub> meets demand  AND  T<sub>ss</sub> stays below overheating</div>

**Cycling.** Functional fatigue follows N<sub>f</sub> = C/&epsilon;<sub>a</sub><sup>2</sup>, and each cycle
loses a little recoverable strain, &epsilon;<sub>rec</sub> = &epsilon;<sub>applied</sub> &middot;
exp(&minus;k N<sub>ref</sub>). Pre-straining much above 4-5% drops life into the low-cycle regime, so a
durable actuator lives to the right of the ~4000-cycle knee.

**Bench bridge.** The wire resistance R = &rho;L/A<sub>wire</sub> that produces the Joule heating is
measured directly in the metre-bridge *resistance of a wire* experiment (IIT Roorkee); the mapped page
is in `screenshots_references/`.
