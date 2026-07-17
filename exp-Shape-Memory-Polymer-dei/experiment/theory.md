# Theory: Shape Memory Polymers in 4D Printing

## 1. What "4D" adds to printing
A 3D print is finished the moment it leaves the build plate. A 4D print is not - it is deliberately engineered so that, some time after printing, an external stimulus makes it fold, curl, expand, or straighten into a second designed geometry. Time is the extra dimension. Heat is by far the most common trigger, though light, moisture, and magnetic fields are all used. When the trigger is thermal, the workhorse material is a **Shape Memory Polymer (SMP)**, and everything in this lab follows from how that one class of material behaves as it is heated and cooled.

---

## 2. Why a polymer can "remember" a shape
An SMP holds two shapes at once: a permanent one it always wants to return to, and a temporary one it can be locked into. That trick needs two structural features working together.

- **Netpoints** are the permanent crosslinks (chemical or physical). They store the memory of the original shape and supply the entropic restoring force that pulls the chains back once they are free to move.
- **Switching segments** are the chain portions that stiffen and soften around a thermal transition. Below the transition they are frozen and hold whatever shape they were cooled into; above it they flow and let the netpoints win.

For amorphous SMPs the relevant transition is the **glass transition temperature T<sub>g</sub>**. Cool the switching segments below T<sub>g</sub> under strain and the temporary shape is trapped; heat back through T<sub>g</sub> and the entropic spring-back recovers the permanent shape. The five sub-calculators quantify each step of that loop for three model materials - PU-SMP (T<sub>g</sub> = 45&deg;C), PLA-SMP (60&deg;C), and PMMA-SMP (105&deg;C).

---

## 3. Glass Transition & the WLF Shift (Sub-Calc A)
Crossing T<sub>g</sub> changes the modulus by orders of magnitude. Below it the polymer is a stiff glass (E &sim; 1.5-3 GPa); above it segmental motion switches on and the material drops to a compliant rubber (E &sim; 15-30 MPa). How fast the chains relax once they are mobile is set by the **Williams-Landel-Ferry (WLF)** equation, which gives the shift factor a<sub>T</sub> - the ratio of relaxation time at T to relaxation time at T<sub>g</sub>:

<div align="center" style="font-size: 1.1em; font-weight: bold;">log(a<sub>T</sub>) = &minus;C<sub>1</sub>(T &minus; T<sub>g</sub>) / (C<sub>2</sub> + (T &minus; T<sub>g</sub>)) &nbsp;&nbsp; for T &ge; T<sub>g</sub></div>

Here C<sub>1</sub> = 17.44 and C<sub>2</sub> = 51.6 K are the "universal" WLF constants, and a<sub>T</sub> = 10<sup>log(a<sub>T</sub>)</sup> is the viscosity (relaxation-time) ratio. Below T<sub>g</sub> the equation is left undefined - the glassy relaxation time is effectively infinite, so the simulator marks that zone as frozen rather than plotting a value. The companion DSC trace models heat capacity as a smooth step centred on T<sub>g</sub>:

<div align="center" style="font-size: 1.1em; font-weight: bold;">C<sub>p</sub>(T) = &Delta;C<sub>p</sub> / (1 + exp(&minus;4(T &minus; T<sub>g</sub>) / w)) &nbsp;&nbsp; (&Delta;C<sub>p</sub> = 0.3 J/g&deg;C, w = 8)</div>

The inflection of that step is exactly the calorimetric T<sub>g</sub>. Because activation for a body-worn device wants T<sub>g</sub> near 37&deg;C, the sub-calc scores each material by |T<sub>g</sub> &minus; 37|: under 10&deg;C is good, under 30&deg;C moderate, beyond that poor.

<p align="center"><img src="images/subcalc_a.svg" alt="WLF shift factor and DSC heat-capacity step across the glass transition" width="620"/></p>
<p align="center"><em>Figure 1: Below T<sub>g</sub> the shift factor is undefined (glassy zone); above it the WLF curve falls steeply while the DSC heat capacity steps up through its inflection at T<sub>g</sub> (Sub-Calc A).</em></p>

---

## 4. Programming & Strain Fixity (Sub-Calc B)
Programming means writing the temporary shape in. The rubbery polymer is loaded under an applied stress &sigma;, cooled below T<sub>g</sub> while the stress is held, and only then unloaded. In the rubbery state the loading strain follows a simple linear response:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;<sub>load</sub> = (&sigma; / E<sub>rubbery</sub>) &times; 100%</div>

Not all of that strain survives the unload. The fraction that stays put is the **strain fixity ratio R<sub>f</sub>**, modelled here as a saturating exponential set by how far above T<sub>g</sub> the programming was done and capped by the material's crystallinity limit X<sub>c</sub>:

<div align="center" style="font-size: 1.1em; font-weight: bold;">R<sub>f</sub> = X<sub>c</sub> &times; [1 &minus; exp(&minus;(T<sub>prog</sub> &minus; T<sub>g</sub>) / 15)] &times; 100% &nbsp;&nbsp; for T<sub>prog</sub> &ge; T<sub>g</sub></div>

The characteristic margin is 15&deg;C, and X<sub>c</sub> is 0.85 for PU, 0.70 for PLA, 0.60 for PMMA - so R<sub>f</sub> climbs quickly with programming temperature but never reaches 100%. The strain actually locked in, which the next sub-calc inherits, is:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;<sub>u</sub> = (R<sub>f</sub> / 100) &times; &epsilon;<sub>load</sub></div>

A saturating model is used deliberately: the naive ratio &epsilon;<sub>frozen</sub>/&epsilon;<sub>load</sub> can drift above 100%, which is unphysical.

<p align="center"><img src="images/subcalc_b.svg" alt="Strain fixity ratio versus programming margin above the glass transition" width="620"/></p>
<p align="center"><em>Figure 2: R<sub>f</sub> rises as a saturating exponential with the programming margin (T<sub>prog</sub> &minus; T<sub>g</sub>) and levels off at the crystallinity ceiling X<sub>c</sub> (Sub-Calc B).</em></p>

---

## 5. Shape Recovery Kinetics (Sub-Calc C)
Reheating above T<sub>g</sub> unfreezes the switching segments and the entropic restoring force takes over. The relaxation time governing how quickly this happens is the reference time scaled by the WLF shift factor:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&tau;(T) = &tau;<sub>ref</sub> &times; a<sub>T</sub></div>

Recovery then follows first-order kinetics between the starting strain &epsilon;<sub>u</sub> and an equilibrium strain &epsilon;<sub>eq</sub>:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;(t) = &epsilon;<sub>eq</sub> + (&epsilon;<sub>u</sub> &minus; &epsilon;<sub>eq</sub>) e<sup>&minus;t/&tau;</sup></div>

What &epsilon;<sub>eq</sub> is depends on the boundary condition. With nothing opposing it (free recovery) the part relaxes all the way, &epsilon;<sub>eq</sub> = 0 and the recovery ratio hits 100%. Under an opposing stress &sigma;<sub>opp</sub> the part can only shrink until it reaches force balance:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;<sub>eq</sub> = min(&epsilon;<sub>u</sub>, (&sigma;<sub>opp</sub> / E<sub>rubbery</sub>) &times; 100%)</div>

<div align="center" style="font-size: 1.1em; font-weight: bold;">R<sub>r</sub> = ((&epsilon;<sub>u</sub> &minus; &epsilon;<sub>recovered</sub>) / &epsilon;<sub>u</sub>) &times; 100%</div>

The stress the specimen pushes back with when it is blocked - the blocking recovery stress - grows with that held strain, and t<sub>95</sub> sets the timescale to reach 95% of the available recovery:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&sigma;<sub>recovery</sub> = E<sub>rubbery</sub> &times; &epsilon;<sub>eq</sub> / 100 &nbsp;&nbsp;&nbsp;&nbsp; t<sub>95</sub> = &tau;(T) &middot; ln(20)</div>

<p align="center"><img src="images/subcalc_c.svg" alt="Free and constrained strain recovery curves over time" width="620"/></p>
<p align="center"><em>Figure 3: Free recovery decays exponentially to zero strain while constrained recovery levels off at &epsilon;<sub>eq</sub>; the dashed marker shows t<sub>95</sub>, the time to 95% of the available recovery (Sub-Calc C).</em></p>

---

## 6. Multi-Shape Memory & the Fox Equation (Sub-Calc D)
Blending two polymers with different transitions lets a part remember more than one temporary shape. The two morphologies behave very differently. A **phase-separated (immiscible)** PU/PMMA blend keeps two distinct domains - PU switching at T<sub>g1</sub> = 45&deg;C and PMMA at T<sub>g2</sub> = 90&deg;C - so heating releases strain in two stages, giving triple-shape recovery. The strain freed at the first transition depends on the blend fractions and the soft/hard moduli:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;<sub>intermediate</sub> = &epsilon;<sub>total</sub> &times; w<sub>1</sub> &times; E<sub>g1,rubbery</sub> / (E<sub>g1,rubbery</sub> + w<sub>2</sub> &times; E<sub>g2,glassy,eff</sub>)</div>

with &epsilon;<sub>total</sub> = 100%, E<sub>g1,rubbery</sub> = 15 MPa (soft PU), E<sub>g2,glassy,eff</sub> = 7.5 MPa (effective hard PMMA near the transition), and w<sub>1</sub> the PU weight fraction. The rest of the strain, &epsilon;<sub>plateau</sub> = &epsilon;<sub>total</sub> &minus; &epsilon;<sub>intermediate</sub>, waits on the intermediate shelf until T<sub>g2</sub> releases it. A **miscible** blend instead forms a single phase with one averaged transition set by the **Fox equation** (temperatures in Kelvin):

<div align="center" style="font-size: 1.1em; font-weight: bold;">1 / T<sub>g,blend</sub> = w<sub>1</sub> / (T<sub>g1</sub> + 273.15) + w<sub>2</sub> / (T<sub>g2</sub> + 273.15)</div>

That single T<sub>g,blend</sub> sits between the two component values and gives one-step, dual-shape recovery.

<p align="center"><img src="images/subcalc_d.svg" alt="Two-step and single-step recovery for phase-separated and miscible blends" width="620"/></p>
<p align="center"><em>Figure 4: The phase-separated blend recovers in two steps (a plateau between T<sub>g1</sub> and T<sub>g2</sub>), while the miscible blend recovers in one step at the Fox-equation T<sub>g,blend</sub> (Sub-Calc D).</em></p>

---

## 7. Actuation Energy & Efficiency (Sub-Calc E)
Treat the SMP as a muscle that lifts a load when heated. A convenient unit identity makes the bookkeeping clean: 1 MPa = 1 J/cm<sup>3</sup>, so a modulus times a volume already carries units of energy. The elastic energy stored during programming, the heat needed to trigger recovery, and the work delivered against the load are:

<div align="center" style="font-size: 1.1em; font-weight: bold;">U<sub>stored</sub> = &frac12; &times; E<sub>rubbery</sub> &times; &epsilon;<sub>u</sub><sup>2</sup> &times; V &nbsp;&nbsp;&nbsp;&nbsp; Q = m &times; C<sub>p</sub> &times; &Delta;T &nbsp;&nbsp;&nbsp;&nbsp; W = &sigma;<sub>recovery</sub> &times; &Delta;&epsilon; &times; V</div>

Here E<sub>rubbery</sub> = 15 MPa, &epsilon;<sub>u</sub> = 1.0 (100% programmed strain), &sigma;<sub>recovery</sub> = 1.5 MPa, and the trigger raises the muscle from 20&deg;C to 45&deg;C so &Delta;T = 25&deg;C. The specimen volume is V = length &times; 2.0 cm &times; thickness and its mass is m = V &times; density. The overall thermal-to-mechanical efficiency is simply the ratio of useful work to heat spent:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&eta; = (W / Q) &times; 100%</div>

Because a polymer's sensible heat capacity dwarfs the elastic energy it can store, most of the input heat goes into raising temperature rather than doing work, and &eta; lands in the low single digits (typically 1-5%). That looks poor on paper, yet for a device sitting at body temperature the trigger is nearly free - ambient body heat supplies most of the &Delta;T - which is why low-efficiency SMP actuators remain attractive in biomedical use.

<p align="center"><img src="images/subcalc_e.svg" alt="Energy flow from input heat to stored energy and mechanical work output" width="620"/></p>
<p align="center"><em>Figure 5: Of the input heat Q, only a small slice leaves as mechanical work W (aided by the released stored energy U<sub>stored</sub>); the rest is sensible heat, so the efficiency &eta; stays low (Sub-Calc E).</em></p>
