# Theory: Timoshenko Bimetal & 4D-Printed Bilayer Actuators

## 1. Introduction to Bilayer 4D Actuators
A 4D-printed actuator is a structure that changes shape after printing when it meets a stimulus: heat, moisture, light, or a field. The simplest and most robust way to program that change is to laminate two layers that respond differently. When one layer expands (or swells) more than the other, the mismatch strain has nowhere to go but into curvature, and the flat strip bends. It's the same mechanism a household bimetal thermostat uses, and Timoshenko wrote down its governing equation in 1925. Everything in this lab builds on that one bilayer idea.

---

## 2. The Bilayer Mismatch Concept
Two bonded layers share an interface, so they have to keep the same length there. If the active (top) layer wants to grow by a strain &Delta;&epsilon; more than the passive (bottom) layer, the only compatible equilibrium is a uniform curvature &kappa;. Three things set how large that curvature is: the **mismatch strain** &Delta;&epsilon;, the **thickness ratio** m = h<sub>1</sub>/h<sub>2</sub>, and the **modulus ratio** n = E<sub>1</sub>/E<sub>2</sub>. A stiff, thin active layer on a thick compliant base behaves nothing like the reverse, and the lab lets you feel that trade-off directly.

---

## 3. Timoshenko Bimetal Curvature (Sub-Calc A)
For a thermal stimulus the mismatch strain is &Delta;&epsilon; = (&alpha;<sub>2</sub> &minus; &alpha;<sub>1</sub>)&Delta;T, where &alpha; is the coefficient of expansion of each layer. Timoshenko's closed-form curvature for a bonded bilayer is:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&kappa; = 6 &sdot; &Delta;&epsilon; &sdot; (1 + m)<sup>2</sup> / [ h &sdot; &phi; ]</div>

with the geometric/stiffness denominator

<div align="center" style="font-size: 1.1em; font-weight: bold;">&phi; = 3(1 + m)<sup>2</sup> + (1 + mn)(m<sup>2</sup> + 1/(mn))</div>

where h = h<sub>1</sub> + h<sub>2</sub> is the total thickness, m = h<sub>1</sub>/h<sub>2</sub> and n = E<sub>1</sub>/E<sub>2</sub>. The transformed-section neutral axis (measured from the bottom face) and the effective flexural rigidity are:

<div align="center" style="font-size: 1.1em; font-weight: bold;">y<sub>na</sub> = [E<sub>1</sub>h<sub>1</sub>(h<sub>2</sub> + h<sub>1</sub>/2) + E<sub>2</sub>h<sub>2</sub>(h<sub>2</sub>/2)] / (E<sub>1</sub>h<sub>1</sub> + E<sub>2</sub>h<sub>2</sub>)</div>

The through-thickness bending stress follows from the plane-sections strain &sigma;(y) = E(y)&thinsp;[&epsilon;<sub>0</sub> + &kappa;(y &minus; y<sub>na</sub>) &minus; &epsilon;<sub>th</sub>(y)], and the stored elastic energy is U = &frac12; EI<sub>eff</sub> &kappa;<sup>2</sup> L. The solver also softens each modulus through T<sub>g</sub> with a sigmoid and a standard-linear-solid relaxation, so a 4D-Print PLA active layer (T<sub>g</sub> = 55&deg;C, E<sub>glassy</sub> = 2300 MPa dropping to E<sub>rubbery</sub> = 25 MPa) loses stiffness as it heats. One caveat: once &kappa;L &gt; 0.3 the small-deflection assumption breaks down and you should switch to the nonlinear elastica solver.

<p align="center"><img src="images/subcalc_a.svg" alt="Timoshenko bilayer cantilever bending under a stimulus with its transformed-section stress profile" width="620"/></p>
<p align="center"><em>Figure 1: A bonded bilayer converts an expansion mismatch into curvature &kappa;; the transformed section fixes the neutral axis y<sub>na</sub> and the through-thickness bending stress &sigma;(y) (Sub-Calc A).</em></p>

---

## 4. Anisotropic Hygroscopic Swelling (Sub-Calc B)
Cellulose-fibre layers swell far more across the fibres than along them. Two swelling coefficients capture this: &beta;<sub>1</sub> along the fibre and &beta;<sub>2</sub> transverse, giving principal swelling strains

<div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;<sub>&parallel;</sub> = &beta;<sub>1</sub> &Delta;C &nbsp;&nbsp;&nbsp; &epsilon;<sub>&perp;</sub> = &beta;<sub>2</sub> &Delta;C</div>

For Cellulose NFC &beta;<sub>1</sub> = 0.002 and &beta;<sub>2</sub> = 0.014, so the anisotropy index A<sub>s</sub> = &beta;<sub>2</sub>/&beta;<sub>1</sub> = 7.0 (Wood Spruce reaches 10.0). When the fibre runs at an angle &theta;<sub>f</sub> to the beam axis, a strain-transformation rotates these into the beam frame:

<div align="center" style="font-size: 1.05em; font-weight: bold;">&epsilon;<sub>xx</sub> = &epsilon;<sub>&parallel;</sub>cos<sup>2</sup>&theta;<sub>f</sub> + &epsilon;<sub>&perp;</sub>sin<sup>2</sup>&theta;<sub>f</sub> &nbsp;&nbsp; &epsilon;<sub>xy</sub> = (&epsilon;<sub>&parallel;</sub> &minus; &epsilon;<sub>&perp;</sub>) sin&theta;<sub>f</sub> cos&theta;<sub>f</sub></div>

The axial part &epsilon;<sub>xx</sub> feeds the same Timoshenko curvature as Sub-Calc A, while the shear part &epsilon;<sub>xy</sub> drives a twist through &kappa;<sub>xy</sub> = 6&thinsp;&epsilon;<sub>xy</sub>(1 + m)<sup>2</sup>/(h&phi;). The twist peaks near &theta;<sub>f</sub> = 45&deg; and drops to zero at 0&deg; or 90&deg;, where the fibre lines up with a principal axis and the coupon bends in pure cylindrical fashion.

<p align="center"><img src="images/subcalc_b.svg" alt="Anisotropic fibre swelling ellipse rotated by fibre angle, splitting into bending and twist" width="620"/></p>
<p align="center"><em>Figure 2: Transverse swelling dominates (A<sub>s</sub> = &beta;<sub>2</sub>/&beta;<sub>1</sub>); rotating the fibre by &theta;<sub>f</sub> splits the strain into an axial part that bends and a shear part &epsilon;<sub>xy</sub> that twists, maximal at 45&deg; (Sub-Calc B).</em></p>

---

## 5. Print-Path Programming & Effective CTE (Sub-Calc C)
In FDM printing the raster (infill) direction sets the stiff, low-expansion axis of a layer. Treating each printed layer as orthotropic with &alpha;<sub>&parallel;</sub> = 10&times;10<sup>&minus;6</sup>/K and &alpha;<sub>&perp;</sub> = 100&times;10<sup>&minus;6</sup>/K, the effective longitudinal and shear CTEs of a layer printed at raster angle &theta; are:

<div align="center" style="font-size: 1.05em; font-weight: bold;">&alpha;<sub>eff</sub>(&theta;) = &alpha;<sub>&parallel;</sub>cos<sup>2</sup>&theta; + &alpha;<sub>&perp;</sub>sin<sup>2</sup>&theta; &nbsp;&nbsp; &alpha;<sub>xy</sub>(&theta;) = (&alpha;<sub>&parallel;</sub> &minus; &alpha;<sub>&perp;</sub>) sin&theta; cos&theta;</div>

With equal layers (m = 1), the differential longitudinal CTE bends the coupon and the differential shear CTE twists it:

<div align="center" style="font-size: 1.05em; font-weight: bold;">&kappa; = 6(&alpha;<sub>eff,top</sub> &minus; &alpha;<sub>eff,bot</sub>)&Delta;T(1 + m)<sup>2</sup>/h &nbsp;&nbsp; &kappa;<sub>twist</sub> = 6(&alpha;<sub>xy,top</sub> &minus; &alpha;<sub>xy,bot</sub>)&Delta;T(1 + m)<sup>2</sup>/h</div>

The raster pair is a design knob. 0&deg;/90&deg; maximizes the CTE mismatch for pure cylindrical bending, 45&deg;/&minus;45&deg; cancels bending but programs pure twist, and intermediate pairs (0&deg;/45&deg;, 45&deg;/90&deg;) blend the two into a helix. Matched angles give zero differential strain and only uniform expansion.

<p align="center"><img src="images/subcalc_c.svg" alt="Raster angle sweep mapping print-path pairs onto bending, twisting and helical modes" width="620"/></p>
<p align="center"><em>Figure 3: The raster angle rotates a layer's effective CTE; matched pairs bend (0&deg;/90&deg;), anti-symmetric pairs twist (45&deg;/&minus;45&deg;), and mixed pairs coil into a helix (Sub-Calc C).</em></p>

---

## 6. Diffusion & Swelling Timescale (Sub-Calc D)
Moisture-driven actuators are only as fast as water can diffuse into the active layer. For a slab of thickness L wetted on its surface, Fickian transport is governed by the dimensionless Fourier number &tau; = Dt/L<sup>2</sup>. The slab-average moisture follows the classic series C&#772;(&tau;) = 1 &minus; &Sigma; (8/(k<sup>2</sup>&pi;<sup>2</sup>)) exp(&minus;k<sup>2</sup>&pi;<sup>2</sup>&tau;) with k = 2n + 1. Two timescales summarize it:

<div align="center" style="font-size: 1.1em; font-weight: bold;">t<sub>diff</sub> = L<sup>2</sup> / (&pi;<sup>2</sup> D) &nbsp;&nbsp;&nbsp; t<sub>90</sub> &approx; 0.53 &sdot; L<sup>2</sup> / D</div>

The first is the decay time of the slowest Fourier mode; the second is the time to reach 90% of equilibrium uptake, with the moisture front having penetrated roughly 0.73&thinsp;L by then. The telling feature is the L<sup>2</sup> scaling: halve the layer thickness and the response time drops to a quarter. Material choice matters just as much, since diffusivity spans two decades from semi-crystalline cellulose (D = 5&times;10<sup>&minus;12</sup> m&sup2;/s) up to an open hydrogel network (D = 2&times;10<sup>&minus;10</sup> m&sup2;/s).

<p align="center"><img src="images/subcalc_d.svg" alt="Fickian moisture uptake curve and the quadratic scaling of response time with thickness" width="620"/></p>
<p align="center"><em>Figure 4: Fickian uptake sets the actuation speed; t<sub>90</sub> &approx; 0.53 L<sup>2</sup>/D grows with the square of thickness, so thin layers respond far faster (Sub-Calc D).</em></p>

---

## 7. Actuator Work & Blocking Force (Sub-Calc E)
A useful actuator must do work against a load, not just deflect freely. The free-tip deflection of a cantilever of length L bent to curvature &kappa; is &delta;<sub>free</sub> = &kappa;L<sup>2</sup>/2. If the tip is instead held against a rigid stop, it develops a blocking force

<div align="center" style="font-size: 1.1em; font-weight: bold;">F<sub>block</sub> = E<sub>eff</sub> h<sup>3</sup> b &sdot; &kappa; / (6 L)</div>

using the free radius R<sub>free</sub> = 1/&kappa; and the rule-of-mixtures modulus E<sub>eff</sub> = (E<sub>1</sub>h<sub>1</sub> + E<sub>2</sub>h<sub>2</sub>)/(h<sub>1</sub> + h<sub>2</sub>). The recoverable mechanical work and its volumetric density are

<div align="center" style="font-size: 1.1em; font-weight: bold;">W = &frac12; F<sub>block</sub> &delta;<sub>free</sub> &nbsp;&nbsp;&nbsp; U = W / (h b L)</div>

There's an unavoidable trade-off: a thin layer bends far (large &delta;<sub>free</sub>) but pushes weakly, while a thick layer pushes hard but barely moves, since the h<sup>3</sup> in F<sub>block</sub> and the &kappa; &prop; 1/h pull in opposite directions. Relative humidity enters through an equilibrium-uptake curve (60% RH gives 0.10 g/g). Hygromorph energy densities land well below shape-memory alloys (~1.0 J/cm&sup3;) but stay competitive with shape-memory polymers (~0.1 J/cm&sup3;), which is why they suit slow, soft, self-powered actuation.

<p align="center"><img src="images/subcalc_e.svg" alt="Free deflection versus blocking force operating line and actuator energy density comparison" width="620"/></p>
<p align="center"><em>Figure 5: An actuator trades free deflection against blocking force along a linear operating line; peak work sits at the midpoint, and the resulting energy density is benchmarked against SMA and SMP (Sub-Calc E).</em></p>

---

## 8. Curvature in Time, the Diffusion Clock and Delamination Life

Bilayer curvature &kappa; looks instantaneous, but for a swelling-driven actuator it develops on a
Fickian clock. The mismatch strain builds as solvent diffuses in, so the bend reaches 90% of its final
value only after t<sub>90</sub> &asymp; 0.53 &middot; L&sup2;/D. Thickness dominates: halve the diffusion
length and the response gets four times faster. This time-to-shape is the fourth dimension the actuator
is actually designed around.

<div align="center" style="font-size: 1.1em; font-weight: bold;">actuator passes only if  F<sub>block</sub> &gt; load  AND  t<sub>90</sub> meets the response spec</div>

**Cycling and the failure mode.** Repeated swell/deswell cycles the interfacial shear stress between
the two layers (the Suo-Hutchinson interface problem). The usual failure isn't fracture of either
layer but **delamination**, so a durable design keeps the interfacial stress below the adhesion limit,
not just the bulk stress below yield.

**Bench bridge.** The bending stiffness EI = E&middot;b&middot;h&sup3;/12 and the end-deflection law
&delta; = WL&sup3;/3EI that underlie the curvature model are measured in the Strength of Materials
*bending test on a cantilever beam* (IARE). See `screenshots_references/` for the mapped manual page.
