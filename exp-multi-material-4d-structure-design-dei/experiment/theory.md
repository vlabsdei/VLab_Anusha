# Theory: Multi-Material 4D Structure Design

## 1. Why Multi-Material 4D Printing?
A single homogeneous material can only bend. To make a flat printed sheet **fold, twist, and self-assemble** into a prescribed 3D shape, designers combine materials of very different stiffness so that deformation localises where it is wanted. This experiment links classical mechanics, the Theory of Machines, and origami metamaterials to the design of transforming 4D-printed structures.

<p align="center"><img src="images/theory_overview.svg" alt="Overview of multi-material 4D structure design" width="620"/></p>
<p align="center"><em>Figure 1: The five sub-calculations form one transformation-design pipeline - stiffness contrast, mobility, kinematics, origami and fatigue.</em></p>

---

## 2. Stiffness Contrast & Hinge Design - The Self-Folding Flat-Pack Box (Sub-Calc A)
A bilayer of an **active** layer (e.g. a soft E&nbsp;=&nbsp;1&nbsp;MPa hydrogel) and a **passive** layer (e.g. a stiff E&nbsp;=&nbsp;2&nbsp;GPa PLA) bends because the two layers respond differently to a stimulus. The bending resistance of a rectangular cross-section (width b, thickness h) is its **flexural rigidity**:

<div align="center" style="font-size: 1.1em; font-weight: bold;">EI = E &middot; b &middot; h&sup3; / 12</div>

The **stiffness contrast ratio** between the two materials is:

<div align="center" style="font-size: 1.1em; font-weight: bold;">SC = E<sub>passive</sub> / E<sub>active</sub></div>

For a hydrogel/PLA pair, SC &asymp; 2&times;10<sup>9</sup>/1&times;10<sup>6</sup> = **2000**. A high SC forces essentially all of the deformation into the soft hinge, mimicking a biological joint. The rotation of a soft flexure hinge of length L<sub>hinge</sub> under an applied bending moment M is, from beam theory:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&theta; = M &middot; L<sub>hinge</sub> / (E<sub>active</sub> &middot; I)</div>

<p align="center"><img src="images/subcalc_a.svg" alt="Stiffness contrast and hinge design" width="600"/></p>
<p align="center"><em>Figure 2: A high stiffness contrast concentrates the bending in the soft hinge; the required hinge length scales with the cross-section (L<sub>hinge</sub> &prop; h&sup3;).</em></p>

Rearranging gives the **hinge length** needed for a target fold angle &theta;: L<sub>hinge</sub> = &theta;&middot;E<sub>active</sub>&middot;I / M. Because I = b&middot;h&sup3;/12, a **thinner active hinge** (smaller h) is more compliant and needs a **shorter** L<sub>hinge</sub> to reach the same angle. The design rule is that the minimum stiffness contrast to keep deformation in the hinge scales with the moment and geometry; in practice **SC &gt; 1000** is required for clean, localised folding.

---

## 3. Degrees of Freedom: the Grubler-Kutzbach Criterion - The Self-Closing Gripper Mechanism (Sub-Calc B)
A transforming structure is a **mechanism**, so its mobility can be predicted with the **Grubler-Kutzbach** criterion for planar mechanisms:

<div align="center" style="font-size: 1.1em; font-weight: bold;">F = 3(n - 1) - 2&middot;j<sub>1</sub> - j<sub>2</sub></div>

where n is the number of rigid **links** (the fixed ground counts as one), j<sub>1</sub> is the number of **full joints** (lower pairs, 1 relative DOF, each removing 2 DOF), and j<sub>2</sub> is the number of **half joints** (higher pairs, 2 relative DOF, each removing 1 DOF). In a compliant 4D-printed mechanism a **flexure hinge** plays the role of a full joint. To find the links needed for a target mobility:

<div align="center" style="font-size: 1.05em; font-weight: bold;">n = (F + 2&middot;j<sub>1</sub> + j<sub>2</sub>) / 3 + 1</div>

<p align="center"><img src="images/subcalc_b.svg" alt="Grubler-Kutzbach mobility" width="600"/></p>
<p align="center"><em>Figure 3: The Grubler-Kutzbach criterion predicts whether a compliant mechanism is over-constrained (locked), correctly mobile (F = 2), or under-constrained (floppy).</em></p>

For a self-folding gripper we usually want **F = 2** (open/close plus a lateral motion). The mobility tells us the regime:
* **F &lt; target (e.g. F = 0):** over-constrained - the structure is rigid/locked and cannot transform regardless of stimulus magnitude.
* **F = target:** correctly mobile.
* **F &gt; target:** under-constrained - floppy, with uncontrolled extra motions.

Adding a constraint (a full or half joint) lowers F; adding a link raises F. This is the first time classical Theory-of-Machines mobility analysis is applied directly to a 4D-printing design problem.

---

## 4. Transformation Kinematics: Forward & Inverse - Folding a Sheet to a Target Shape (Sub-Calc C)
A flat strip that folds into a 3D shape is an **open kinematic chain**. With link lengths L<sub>i</sub> and hinge angles &theta;<sub>i</sub>, **forward kinematics** maps the angles to the position of the free (end-effector) tip by accumulating the rotations:

<div align="center" style="font-size: 1.05em; font-weight: bold;">x<sub>end</sub> = &Sigma;<sub>i</sub> L<sub>i</sub> cos(&Sigma;<sub>j&le;i</sub> &theta;<sub>j</sub>) , &nbsp; y<sub>end</sub> = &Sigma;<sub>i</sub> L<sub>i</sub> sin(&Sigma;<sub>j&le;i</sub> &theta;<sub>j</sub>)</div>

<p align="center"><img src="images/subcalc_c.svg" alt="Forward and inverse kinematics" width="600"/></p>
<p align="center"><em>Figure 4: Forward kinematics maps hinge angles to the folded end-effector position; inverse kinematics (CCD) solves the angles needed to reach a target shape.</em></p>

**Inverse kinematics** is the reverse problem: given a target shape or tip position, find the hinge angles &theta;<sub>i</sub> = f(x<sub>target</sub>, y<sub>target</sub>) that achieve it. For a folding box from a flat sheet the simulation computes the required fold angles, then verifies them by running forward kinematics and reporting the **maximum deviation (positioning error, mm)** from the target. This directly connects 4D printing to robotics and mechanism design.

---

## 5. Origami-Based Structures: the Miura Fold - The Deployable Miura Panel / Stent (Sub-Calc D)
The **Miura-ori** is the origami pattern behind deployable satellite solar panels, foldable maps, and 4D-printed metamaterials. For a sheet with sector angle &alpha; folded to a fold angle &phi;, the mountain-valley dihedral angle is:

<div align="center" style="font-size: 1.1em; font-weight: bold;">tan(&theta;<sub>M</sub>) = tan(&alpha;) &middot; sin(&phi;)</div>

The **flat-to-folded area ratio** (how much the footprint shrinks) is:

<div align="center" style="font-size: 1.05em; font-weight: bold;">A<sub>ratio</sub> = sin(&phi;) cos(&alpha;) / (sin&sup2;(&alpha;) cos(&phi;) + cos&sup2;(&alpha;))</div>

Most strikingly, the Miura-ori has a **negative (auxetic) Poisson's ratio**: stretching it in one in-plane direction makes it expand in the perpendicular in-plane direction as well:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&nu;<sub>x</sub> = &minus;(&part;&epsilon;<sub>y</sub>/&part;&epsilon;<sub>x</sub>) &lt; 0</div>

<p align="center"><img src="images/subcalc_d.svg" alt="Miura fold geometry and auxetic behaviour" width="600"/></p>
<p align="center"><em>Figure 5: The Miura-ori folds to a smaller footprint (A<sub>ratio</sub> &lt; 1) and is auxetic - it expands in both in-plane directions on deployment (&nu;<sub>x</sub> &lt; 0).</em></p>

The simulation computes &nu;<sub>x</sub> by finite-differencing the projected in-plane width W(&phi;) and length L(&phi;) of the unit cell as the fold changes, robustly yielding the auxetic (negative) value. A<sub>ratio</sub> &lt; 1 means the folded sheet is smaller than the flat one, enabling compact deployment. (The exact magnitude of &nu;<sub>x</sub> depends on the parametrisation; the sign - negative - is the key auxetic signature.)

---

## 6. Printed Hinge Fatigue: Basquin's Law - The Living-Hinge Cycle Life (Sub-Calc E)
Any repeatedly actuated hinge eventually fails by **fatigue**. The peak bending strain at the surface of a flexure hinge of thickness h bent to a minimum radius R<sub>min</sub> is:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;<sub>max</sub> = h / (2 R<sub>min</sub>)</div>

For a hinge of length L folded through angle &theta; (radians), the bend radius is R<sub>min</sub> = L/&theta;, so &epsilon;<sub>max</sub> = h&middot;&theta;/(2L). The peak stress is &sigma;<sub>max</sub> = E&middot;&epsilon;<sub>max</sub>. Fatigue life follows the S-N curve via **Basquin's Law**:

<div align="center" style="font-size: 1.1em; font-weight: bold;">N = (&sigma;<sub>f</sub> / &sigma;<sub>max</sub>)<sup>1/b</sup></div>

<p align="center"><img src="images/subcalc_e.svg" alt="Printed hinge fatigue via Basquin's Law" width="600"/></p>
<p align="center"><em>Figure 6: Folding a hinge sets the peak surface strain &epsilon;<sub>max</sub> = h/(2R<sub>min</sub>); Basquin's Law then converts the stress into a fatigue life N (very sensitive, since 1/b = 10).</em></p>

with fatigue strength coefficient &sigma;<sub>f</sub> &asymp; 60 MPa and exponent b = 0.1 for PLA-SMP. Because the exponent 1/b = 10, fatigue life is **extremely** sensitive to stress: a small reduction in h (and hence &sigma;<sub>max</sub>) raises N by orders of magnitude. To design for N &gt; 1000 cycles, require &sigma;<sub>max</sub> &lt; &sigma;<sub>f</sub>&middot;N<sup>&minus;b</sup>. An engineering **safety factor of 5** is applied to the computed N for polymers.

---

## 7. Contradictions and Limitations

<p align="center"><img src="images/theory_limits.svg" alt="Model validity windows and limitations" width="620"/></p>
<p align="center"><em>Figure 7: Validity windows - rigid-body DOF for thin flexures, rigid-origami for thin panels, and a factor-of-3 fatigue margin (safety factor 5).</em></p>

**Contradiction 1 - Grubler for compliant mechanisms.** The Grubler-Kutzbach equation was derived for **rigid bodies with ideal pin joints**. A compliant flexure hinge distributes deformation over a region rather than at a point, so the very notion of a "joint" is ambiguous. For thin, localised flexures the rigid-body equivalent is a good approximation; for thick, distributed flexures (hinge length &gt; 5&times; thickness) mobility alone cannot describe the mechanism and a continuum model is required.

**Contradiction 2 - rigid-origami assumption.** The Miura geometry (Sub-Calc D) assumes **rigid panels** joined by zero-thickness creases. Real 4D-printed panels have finite thickness and finite-compliance folds, so the actual A<sub>ratio</sub> and Poisson's ratio deviate from rigid-origami predictions once panel thickness exceeds ~5% of panel length. Thick-panel corrections (Tachi-Miura) are an active research frontier beyond this lab's scope.

**Contradiction 3 - Basquin's Law for polymers.** Basquin's Law was developed for **metals**. Polymer fatigue is rate-dependent, temperature-sensitive, and affected by hysteretic self-heating, so the life prediction carries roughly a **factor-of-3** uncertainty. Engineers therefore apply safety factors of 5-10 on N when using polymer S-N data; this lab applies a stated safety factor of 5.

---

## 8. Relevance
Multi-material design and origami-inspired structures are the most visually compelling aspects of 4D printing. Applying the Grubler-Kutzbach criterion to a compliant mechanism uniquely bridges classical Theory of Machines with 4D-printing design, and the Miura fold connects directly to the AICTE-recognised field of mechanical metamaterials.
