# Theory: Shape Memory Polymers in 4D Printing

## 1. What "4D" adds to printing
A 3D print is done the moment it leaves the build plate. A 4D print isn't. It's built so that some time later, when something in its surroundings changes, it folds, curls, expands, or straightens into a second shape you planned in advance. That response over time is the extra dimension. Heat triggers most 4D prints, though light, moisture, and magnetic fields all get used too. When the trigger is thermal, the material of choice is a **Shape Memory Polymer (SMP)**, so the rest of this lab is really a close look at how one class of SMP behaves while you heat it and cool it.

---

## 2. Why a polymer can "remember" a shape
An SMP carries two shapes at once: a permanent one it keeps trying to return to, and a temporary one you can lock it into. Two structural features make that possible.

- **Netpoints** are the permanent crosslinks (chemical or physical). They store the memory of the original shape and supply the entropic restoring force that pulls the chains back once they're free to move.
- **Switching segments** are the chain portions that stiffen and soften around a thermal transition. Below the transition they're frozen and hold whatever shape they were cooled into; above it they flow and let the netpoints win.

For amorphous SMPs the transition that matters is the **glass transition temperature T<sub>g</sub>**. Cool the switching segments below T<sub>g</sub> while they're under strain and the temporary shape stays trapped; heat them back through T<sub>g</sub> and the entropic spring-back pulls the permanent shape back. The five sub-calculators put numbers on each step of that loop for three model materials: PU-SMP (T<sub>g</sub> = 45&deg;C), PLA-SMP (60&deg;C), and PMMA-SMP (105&deg;C).

---

## 3. Glass Transition & the WLF Shift (Sub-Calc A)
Crossing T<sub>g</sub> changes the modulus by orders of magnitude. Below it the polymer is a stiff glass (E &sim; 1.5-3 GPa); above it segmental motion switches on and the material softens to a rubber (E &sim; 15-30 MPa). Once the chains are mobile, how fast they relax is set by the **Williams-Landel-Ferry (WLF)** equation, which gives the shift factor a<sub>T</sub>, the ratio of relaxation time at T to relaxation time at T<sub>g</sub>:

<div align="center" style="font-size: 1.1em; font-weight: bold;">log(a<sub>T</sub>) = &minus;C<sub>1</sub>(T &minus; T<sub>g</sub>) / (C<sub>2</sub> + (T &minus; T<sub>g</sub>)) &nbsp;&nbsp; for T &ge; T<sub>g</sub></div>

Here C<sub>1</sub> = 17.44 and C<sub>2</sub> = 51.6 K are the "universal" WLF constants, and a<sub>T</sub> = 10<sup>log(a<sub>T</sub>)</sup> is the viscosity (relaxation-time) ratio. Below T<sub>g</sub> the equation is left undefined; the glassy relaxation time is effectively infinite, so the simulator marks that zone as frozen instead of plotting a value. The companion DSC trace models heat capacity as a smooth step centred on T<sub>g</sub>:

<div align="center" style="font-size: 1.1em; font-weight: bold;">C<sub>p</sub>(T) = &Delta;C<sub>p</sub> / (1 + exp(&minus;4(T &minus; T<sub>g</sub>) / w)) &nbsp;&nbsp; (&Delta;C<sub>p</sub> = 0.3 J/g&deg;C, w = 8)</div>

The inflection of that step is exactly the calorimetric T<sub>g</sub>. A body-worn device wants T<sub>g</sub> near 37&deg;C, so the sub-calc scores each material by |T<sub>g</sub> &minus; 37|: under 10&deg;C is good, under 30&deg;C moderate, anything beyond that poor.

<p align="center"><img src="images/subcalc_a.svg" alt="WLF shift factor and DSC heat-capacity step across the glass transition" width="620"/></p>
<p align="center"><em>Figure 1: Below T<sub>g</sub> the shift factor is undefined (glassy zone); above it the WLF curve falls steeply while the DSC heat capacity steps up through its inflection at T<sub>g</sub> (Sub-Calc A).</em></p>

---

## 4. Programming & Strain Fixity (Sub-Calc B)
Programming is how you write the temporary shape in. You load the rubbery polymer under an applied stress &sigma;, cool it below T<sub>g</sub> with the stress still held, and only then unload it. In the rubbery state the loading strain is a simple linear response:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;<sub>load</sub> = (&sigma; / E<sub>rubbery</sub>) &times; 100%</div>

Not all of that strain survives the unload. The fraction that stays is the **strain fixity ratio R<sub>f</sub>**, modelled here as a saturating exponential that depends on how far above T<sub>g</sub> the programming was done and is capped by the material's crystallinity limit X<sub>c</sub>:

<div align="center" style="font-size: 1.1em; font-weight: bold;">R<sub>f</sub> = X<sub>c</sub> &times; [1 &minus; exp(&minus;(T<sub>prog</sub> &minus; T<sub>g</sub>) / 15)] &times; 100% &nbsp;&nbsp; for T<sub>prog</sub> &ge; T<sub>g</sub></div>

The characteristic margin is 15&deg;C, and X<sub>c</sub> is 0.85 for PU, 0.70 for PLA, 0.60 for PMMA, so R<sub>f</sub> climbs quickly with programming temperature but never quite reaches 100%. The strain that actually locks in, which the next sub-calc inherits, is:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;<sub>u</sub> = (R<sub>f</sub> / 100) &times; &epsilon;<sub>load</sub></div>

The saturating model is deliberate: the naive ratio &epsilon;<sub>frozen</sub>/&epsilon;<sub>load</sub> can drift above 100%, which is unphysical.

<p align="center"><img src="images/subcalc_b.svg" alt="Strain fixity ratio versus programming margin above the glass transition" width="620"/></p>
<p align="center"><em>Figure 2: R<sub>f</sub> rises as a saturating exponential with the programming margin (T<sub>prog</sub> &minus; T<sub>g</sub>) and levels off at the crystallinity ceiling X<sub>c</sub> (Sub-Calc B).</em></p>

---

## 5. Shape Recovery Kinetics (Sub-Calc C)
Reheat above T<sub>g</sub> and the switching segments unfreeze, so the entropic restoring force takes over. The relaxation time that governs how quickly this happens is the reference time scaled by the WLF shift factor:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&tau;(T) = &tau;<sub>ref</sub> &times; a<sub>T</sub></div>

Recovery then follows first-order kinetics between the starting strain &epsilon;<sub>u</sub> and an equilibrium strain &epsilon;<sub>eq</sub>:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;(t) = &epsilon;<sub>eq</sub> + (&epsilon;<sub>u</sub> &minus; &epsilon;<sub>eq</sub>) e<sup>&minus;t/&tau;</sup></div>

The value of &epsilon;<sub>eq</sub> depends on the boundary condition. With nothing pushing back (free recovery) the part relaxes all the way, &epsilon;<sub>eq</sub> = 0 and the recovery ratio reaches 100%. Under an opposing stress &sigma;<sub>opp</sub> the part can only shrink until the forces balance:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;<sub>eq</sub> = min(&epsilon;<sub>u</sub>, (&sigma;<sub>opp</sub> / E<sub>rubbery</sub>) &times; 100%)</div>

<div align="center" style="font-size: 1.1em; font-weight: bold;">R<sub>r</sub> = ((&epsilon;<sub>u</sub> &minus; &epsilon;<sub>recovered</sub>) / &epsilon;<sub>u</sub>) &times; 100%</div>

The stress the specimen pushes back with when it's blocked, the blocking recovery stress, grows with that held strain, and t<sub>95</sub> sets the time to reach 95% of the available recovery:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&sigma;<sub>recovery</sub> = E<sub>rubbery</sub> &times; &epsilon;<sub>eq</sub> / 100 &nbsp;&nbsp;&nbsp;&nbsp; t<sub>95</sub> = &tau;(T) &middot; ln(20)</div>

<p align="center"><img src="images/subcalc_c.svg" alt="Free and constrained strain recovery curves over time" width="620"/></p>
<p align="center"><em>Figure 3: Free recovery decays exponentially to zero strain while constrained recovery levels off at &epsilon;<sub>eq</sub>; the dashed marker shows t<sub>95</sub>, the time to 95% of the available recovery (Sub-Calc C).</em></p>

---

## 6. Multi-Shape Memory & the Fox Equation (Sub-Calc D)
Blend two polymers with different transitions and a part can remember more than one temporary shape. The two morphologies behave very differently. A **phase-separated (immiscible)** PU/PMMA blend keeps two distinct domains, PU switching at T<sub>g1</sub> = 45&deg;C and PMMA at T<sub>g2</sub> = 90&deg;C, so heating releases strain in two stages and you get triple-shape recovery. The strain freed at the first transition depends on the blend fractions and the soft/hard moduli:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;<sub>intermediate</sub> = &epsilon;<sub>total</sub> &times; w<sub>1</sub> &times; E<sub>g1,rubbery</sub> / (E<sub>g1,rubbery</sub> + w<sub>2</sub> &times; E<sub>g2,glassy,eff</sub>)</div>

with &epsilon;<sub>total</sub> = 100%, E<sub>g1,rubbery</sub> = 15 MPa (soft PU), E<sub>g2,glassy,eff</sub> = 7.5 MPa (effective hard PMMA near the transition), and w<sub>1</sub> the PU weight fraction. The remaining strain, &epsilon;<sub>plateau</sub> = &epsilon;<sub>total</sub> &minus; &epsilon;<sub>intermediate</sub>, sits on the intermediate shelf until T<sub>g2</sub> releases it. A **miscible** blend instead forms a single phase with one averaged transition, set by the **Fox equation** (temperatures in Kelvin):

<div align="center" style="font-size: 1.1em; font-weight: bold;">1 / T<sub>g,blend</sub> = w<sub>1</sub> / (T<sub>g1</sub> + 273.15) + w<sub>2</sub> / (T<sub>g2</sub> + 273.15)</div>

That single T<sub>g,blend</sub> lands between the two component values and gives one-step, dual-shape recovery.

<p align="center"><img src="images/subcalc_d.svg" alt="Two-step and single-step recovery for phase-separated and miscible blends" width="620"/></p>
<p align="center"><em>Figure 4: The phase-separated blend recovers in two steps (a plateau between T<sub>g1</sub> and T<sub>g2</sub>), while the miscible blend recovers in one step at the Fox-equation T<sub>g,blend</sub> (Sub-Calc D).</em></p>

---

## 7. Actuation Energy & Efficiency (Sub-Calc E)
Treat the SMP as a muscle that lifts a load when heated. One unit identity keeps the bookkeeping clean: 1 MPa = 1 J/cm<sup>3</sup>, so a modulus times a volume already has units of energy. The elastic energy stored during programming, the heat needed to trigger recovery, and the work delivered against the load are:

<div align="center" style="font-size: 1.1em; font-weight: bold;">U<sub>stored</sub> = &frac12; &times; E<sub>rubbery</sub> &times; &epsilon;<sub>u</sub><sup>2</sup> &times; V &nbsp;&nbsp;&nbsp;&nbsp; Q = m &times; C<sub>p</sub> &times; &Delta;T &nbsp;&nbsp;&nbsp;&nbsp; W = &sigma;<sub>recovery</sub> &times; &Delta;&epsilon; &times; V</div>

Here E<sub>rubbery</sub> = 15 MPa, &epsilon;<sub>u</sub> = 1.0 (100% programmed strain), &sigma;<sub>recovery</sub> = 1.5 MPa, and the trigger raises the muscle from 20&deg;C to 45&deg;C so &Delta;T = 25&deg;C. The specimen volume is V = length &times; 2.0 cm &times; thickness and its mass is m = V &times; density. The overall thermal-to-mechanical efficiency is just the ratio of useful work to heat spent:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&eta; = (W / Q) &times; 100%</div>

A polymer's sensible heat capacity dwarfs the elastic energy it can store, so most of the input heat goes into raising temperature rather than doing work, and &eta; lands in the low single digits (typically 1-5%). That looks poor on paper. But for a device sitting at body temperature the trigger is nearly free, since ambient body heat supplies most of the &Delta;T, which is why low-efficiency SMP actuators are still attractive in biomedical use.

<p align="center"><img src="images/subcalc_e.svg" alt="Energy flow from input heat to stored energy and mechanical work output" width="620"/></p>
<p align="center"><em>Figure 5: Of the input heat Q, only a small slice leaves as mechanical work W (aided by the released stored energy U<sub>stored</sub>); the rest is sensible heat, so the efficiency &eta; stays low (Sub-Calc E).</em></p>

---

## 8. Closing the 4D Loop: Time, Cycling and the Acceptance Gate

The five sub-calcs aren't independent. They're one cycle laid out on a time axis, and that
axis is the "4D" in 4D printing. Programming cools the specimen under stress; storage locks the
temporary shape; the trigger heats it back through T<sub>g</sub>; and recovery unfolds with the
relaxation time &tau;(T) = &tau;<sub>ref</sub> &middot; a<sub>T</sub>, reaching 95% of the available
strain at t<sub>95</sub> = &tau;(T) &middot; ln(20). Nothing here's a still image. The shape is a
function of time, and the whole point of the lab is to predict *when* it arrives, not just *where*.

<div align="center" style="font-size: 1.1em; font-weight: bold;">activation passes only if  |T<sub>g</sub> &minus; 37&deg;C| is small  AND  t<sub>95</sub> fits the device duty window</div>

**Cycling and end of life.** Every program-recover pass leaves a little residual set, so the fixity
R<sub>f</sub> and recovery R<sub>r</sub> ratios drift downward with repeated use; in practice a device is
called end-of-life once R<sub>r</sub> drops below about 0.9. A material that scores "good" on |T<sub>g</sub>
&minus; 37| can still fail this durability gate, and the simulator is built to let it fail rather
than always pass.

**Bench bridge.** The elastic modulus that sets the programming strain &epsilon; = &sigma;/E<sub>rubbery</sub>
and the rubber-elasticity link E = 3G is measured on a real bench in the Engineering Physics
*torsional-pendulum / rigidity-modulus* experiment (Aurora's Engineering College). The formula-proof
pack in `screenshots_references/` maps this virtual experiment to that AICTE lab page.
