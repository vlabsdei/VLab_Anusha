# Theory: 4D Print Process Engineering

## 1. Introduction to the 4D Print Process
A 4D print only folds, curls, or actuates the way it was designed to if the underlying fused-deposition process laid the material down soundly. Every road is extruded hot, welds to its neighbour, cools, contracts, and crystallises, and each of those steps can quietly ruin the part before the stimulus is ever applied. This experiment treats the print process itself as the object of study: five sub-calculators, each isolating one mechanism that decides whether the finished geometry is strong, dimensionally true, and free to transform.

---

## 2. Why Process Physics Governs 4D Parts
Fused deposition builds anisotropic, semi-crystalline, internally-stressed solids. Four coupled facts drive the whole experiment:
1. **Interfaces are welds, and they aren't free.** Adjacent roads bond only if polymer chains have time to reptate across the interface while it's still hot.
2. **Cooling is a race.** How long a road lingers between T<sub>g</sub> and T<sub>m</sub> sets how much crystallinity forms, which stiffens the part but pins the network that a 4D shape-memory response depends on.
3. **Contraction is constrained.** The bed and the layers below stop a cooling road from shrinking freely, so the strain converts to residual stress and warpage.
4. **Strength has a direction.** A print is a unidirectional composite; its weakest plane is a shear-dominated raster angle, not the obvious cross-road direction.

The fifth sub-calculator closes the loop by asking whether the accumulated shrinkage and process noise still leave the part inside tolerance.

---

## 3. Neck Growth & Inter-Layer Bonding (Sub-Calc A)
When two roads touch, the interface heals by **reptation**, chains diffusing across the contact, not by the surface-diffusion sintering used for metals. Two timescales compete. The interface is only hot enough to diffuse for the time it takes the nozzle to move one layer height on:

<div align="center" style="font-size: 1.1em; font-weight: bold;">t<sub>avail</sub> = L<sub>h</sub> / v<sub>print</sub></div>

The chains' reptation time follows an Arrhenius law referenced to the print temperature (E<sub>a</sub> = 60 kJ/mol, T<sub>ref</sub> = 503.15 K, t<sub>0</sub> = 0.0148 s):

<div align="center" style="font-size: 1.1em; font-weight: bold;">t<sub>rep</sub>(T) = t<sub>0</sub> &middot; exp[E<sub>a</sub>/R &middot; (1/T &minus; 1/T<sub>ref</sub>)]</div>

The healing degree is the ratio of the two, on the classic reptation &frac14;-power law, and it sets the weld strength against the &sigma;<sub>bulk</sub> = 47 MPa PLA bulk:

<div align="center" style="font-size: 1.1em; font-weight: bold;">D<sub>b</sub> = min(1, (t<sub>avail</sub> / t<sub>rep</sub>)<sup>&frac14;</sup>) &nbsp;&nbsp; &sigma;<sub>bond</sub> = D<sub>b</sub> &middot; &sigma;<sub>bulk</sub></div>

Once D<sub>b</sub> &ge; 0.80 the interface reads as fully healed and the part behaves isotropically; below that, the layers stay weak and the print fails across the build direction.

<p align="center"><img src="images/subcalc_a.svg" alt="Bonding degree D_b rising with print temperature toward the isotropic window" width="620"/></p>
<p align="center"><em>Figure 1: Two roads weld by chain reptation; the healing degree D<sub>b</sub> climbs with print temperature (and dwell time) until it crosses the D<sub>b</sub> &ge; 0.80 isotropic threshold (Sub-Calc A).</em></p>

---

## 4. Crystallisation During Printing (Sub-Calc B)
A deposited road cools by Newtonian convection toward the chamber temperature, with a cooling time constant set by its mass, heat capacity and the convective coefficient (&rho; = 1240 kg/m&sup3;, C<sub>p</sub> = 1800 J/kg&middot;K):

<div align="center" style="font-size: 1.1em; font-weight: bold;">&tau;<sub>cool</sub> = &rho;&middot;d&middot;C<sub>p</sub> / (4&middot;h<sub>conv</sub>) &nbsp;&nbsp; T(t) = T<sub>amb</sub> + (T<sub>print</sub> &minus; T<sub>amb</sub>)&middot;e<sup>&minus;t/&tau;</sup></div>

Crystals only grow while the road sits in the T<sub>g</sub>-T<sub>m</sub> window (60-170 °C). The dwell in that window is:

<div align="center" style="font-size: 1.1em; font-weight: bold;">t<sub>x</sub> = &tau;<sub>cool</sub> &middot; ln[(T<sub>m</sub> &minus; T<sub>amb</sub>) / (T<sub>g</sub> &minus; T<sub>amb</sub>)]</div>

The crystallinity follows **Avrami kinetics** with exponent n &asymp; 1.93 (near the textbook spherulitic value of 2) and X<sub>c,max</sub> = 0.45. More crystallinity stiffens the amorphous modulus (E<sub>a</sub> = 2.0 GPa, k = 1.83) but locks the network, so shape-memory recovery falls:

<div align="center" style="font-size: 1.1em; font-weight: bold;">X<sub>c</sub> = X<sub>c,max</sub>(1 &minus; e<sup>&minus;(t<sub>x</sub>/t<sub>half</sub>)<sup>n</sup></sup>) &nbsp;&nbsp; E = E<sub>a</sub>(1 + k&middot;X<sub>c</sub>)</div>

This is the central 4D trade-off: a heated chamber gives a stiffer, better-bonded part but a poorer actuator.

<p align="center"><img src="images/subcalc_b.svg" alt="Road cooling curve through the crystallisation window setting X_c" width="620"/></p>
<p align="center"><em>Figure 2: The road cools exponentially through the shaded T<sub>g</sub>-T<sub>m</sub> growth window; the dwell t<sub>x</sub> feeds the Avrami relation that fixes crystallinity X<sub>c</sub> and hence stiffness (Sub-Calc B).</em></p>

---

## 5. Residual Stress & Warpage (Sub-Calc C)
A road wants to shrink as it cools, but the bed and the layers below hold it. The blocked thermal strain is the mismatch strain, and because the constraint is biaxial the locked-in stress carries a Poisson factor (&alpha; = 70&times;10<sup>&minus;6</sup>/°C, E = 3 GPa, &nu; = 0.35):

<div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;<sub>mis</sub> = &alpha;(T<sub>print</sub> &minus; T<sub>bed</sub>) &nbsp;&nbsp; &sigma;<sub>res</sub> = E&alpha;(T<sub>print</sub> &minus; T<sub>bed</sub>) / (1 &minus; &nu;)</div>

The mismatch curls the part; treating it as a bimetallic-strip-like beam of length L and thickness h, the corner deflection is:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&delta; = C &middot; &epsilon;<sub>mis</sub> &middot; L&sup2; / (2h) &middot; f<sub>relax</sub>(T<sub>bed</sub>)</div>

A heated bed relaxes stress near T<sub>g</sub> through f<sub>relax</sub> = min(1, e<sup>&minus;(T<sub>bed</sub>&minus;20)/T*</sup>), calibrated so PLA warps &asymp;2.8 mm on an unheated bed but only &asymp;0.6 mm at a 60 °C bed. When &sigma;<sub>res</sub> exceeds the 30 MPa inter-layer bond, the plate stops warping and simply peels off the bed.

<p align="center"><img src="images/subcalc_c.svg" alt="Constrained plate curling at the corners with residual stress and a delamination limit" width="620"/></p>
<p align="center"><em>Figure 3: Constrained cooling locks in biaxial residual stress and curls the corners by &delta; &prop; L&sup2;/2h; once &sigma;<sub>res</sub> beats the bond limit the part delaminates instead (Sub-Calc C).</em></p>

---

## 6. Print Anisotropy: Raster Angle (Sub-Calc D)
Each printed layer is an idealised unidirectional lamina: strong along the road (&sigma;<sub>L</sub>), weak across the inter-road bond (&sigma;<sub>T</sub>, inherited from Sub-Calc A), with shear strength &tau;<sub>LT</sub>. The **Tsai-Hill** criterion gives the off-axis strength when the load sits at raster angle &theta;:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&sigma;<sub>&theta;</sub> = [cos<sup>4</sup>&theta;/&sigma;<sub>L</sub>&sup2; + (1/&tau;<sub>LT</sub>&sup2; &minus; 1/&sigma;<sub>L</sub>&sup2;)sin&sup2;&theta;cos&sup2;&theta; + sin<sup>4</sup>&theta;/&sigma;<sub>T</sub>&sup2;]<sup>&minus;&frac12;</sup></div>

The anisotropy ratio AR = &sigma;<sub>L</sub>/&sigma;<sub>T</sub> exceeds 1 for every FDM material (PLA: 47/24, ABS: 35/14, PETG: 50/28 MPa). The important part is that the strength minimum is **not** at 90°: the shear term drives the weakest plane to &theta;<sub>min</sub> &asymp; 45-55° (about 53° for PLA), where the roads shear apart. That angle governs where a 4D part preferentially folds.

<p align="center"><img src="images/subcalc_d.svg" alt="Tsai-Hill off-axis strength dipping to a shear-dominated minimum near 50 degrees" width="620"/></p>
<p align="center"><em>Figure 4: Tsai-Hill off-axis strength &sigma;<sub>&theta;</sub> falls from the along-road &sigma;<sub>L</sub> to a shear-controlled minimum near 45-55°, below even the cross-road &sigma;<sub>T</sub> at 90° (Sub-Calc D).</em></p>

---

## 7. Dimensional Accuracy & Tolerance Stack-up (Sub-Calc E)
The last question is metrological. Cooling shrinkage biases the mean of every feature, while vibration and nozzle-temperature drift set the random spread:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&delta;<sub>mean</sub> = k<sub>shrink</sub>&middot;L&middot;&Delta;T<sub>cool</sub> &nbsp;&nbsp; &sigma;<sub>proc</sub> = k<sub>vib</sub>&middot;v<sub>print</sub> + k<sub>temp</sub>&middot;&Delta;T<sub>nozzle</sub></div>

Three stacked features can be combined two ways, the optimistic root-sum-square (which assumes independent errors) and the honest worst-case sum:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&delta;<sub>RSS</sub> = &radic;(&delta;<sub>1</sub>&sup2; + &delta;<sub>2</sub>&sup2; + &delta;<sub>3</sub>&sup2;) &nbsp;&nbsp; &delta;<sub>WC</sub> = &delta;<sub>1</sub> + &delta;<sub>2</sub> + &delta;<sub>3</sub></div>

Capability against the &plusmn;USL band is the process-capability index, with 1.33 the usual acceptance target:

<div align="center" style="font-size: 1.1em; font-weight: bold;">C<sub>pk</sub> = (USL &minus; &mu;) / (3&sigma;<sub>proc</sub>) &nbsp;&nbsp; (target C<sub>pk</sub> &ge; 1.33)</div>

Because 4D-print thermal and vibration errors are physically correlated, RSS can flatter a stack that the worst-case bound rejects; the calculator flags exactly that contradiction as the honest verdict.

<p align="center"><img src="images/subcalc_e.svg" alt="Process distribution against spec limits with RSS versus worst-case stack bars" width="620"/></p>
<p align="center"><em>Figure 5: The process distribution is judged against the &plusmn;USL band by C<sub>pk</sub>; the three-feature stack shrinks under RSS but the correlated worst-case sum is the bound that actually holds (Sub-Calc E).</em></p>

---

## 8. A Race Between Cooling and Crystallisation - and the Voxel That Programs the Shape

Every deposited road is a race between two clocks. Interlayer weld strength is set by contact time against
reptation, &sigma;<sub>bond</sub> = D<sub>b</sub>&middot;&sigma;<sub>bulk</sub> with D<sub>b</sub> =
min(1, (t<sub>avail</sub>/t<sub>rep</sub>)<sup>1/4</sup>), while crystallinity develops over the cooling
window t<sub>x</sub> = &tau;<sub>cool</sub>&middot;ln[(T<sub>m</sub> &minus; T<sub>amb</sub>)/(T<sub>g</sub>
&minus; T<sub>amb</sub>)]. Both are driven by the Newtonian cooling curve T(t) = T<sub>amb</sub> +
(T<sub>print</sub> &minus; T<sub>amb</sub>)&middot;e<sup>&minus;t/&tau;</sup>, so the *time* the polymer
spends hot decides bond strength, crystallinity and warpage alike.

**The voxel is the program.** In multi-material 4D printing the transformation isn't added afterwards. It
is encoded at print time by depositing active and passive materials in a chosen voxel pattern, each carrying
its own mismatch strain &epsilon;<sub>mis</sub> = &alpha;(T<sub>print</sub> &minus; T<sub>bed</sub>). The
raster and material map *are* the shape instruction, which is what makes the process, not just the material,
part of the design.

<div align="center" style="font-size: 1.1em; font-weight: bold;">part passes acceptance only if  C<sub>pk</sub> = (USL &minus; &mu;)/(3&sigma;) &ge; 1.33</div>

**Bench bridge.** The exponential cooling time constant is realised in the Engineering Physics *R-C time
constant* experiment (identical first-order decay, q = q<sub>0</sub>e<sup>&minus;t/RC</sup>), and the
capability index in the *Statistical Process Control* experiment (RCET). Mapped pages in `screenshots_references/`.
