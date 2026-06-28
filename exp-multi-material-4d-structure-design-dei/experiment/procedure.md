# Procedure: Multi-Material 4D Structure Design

Welcome to the Multi-Material 4D Structure Design Virtual Laboratory. Each sub-calculator is a recognizable 4D-printed structure you design and watch transform: a self-folding flat-pack box, a self-closing gripper mechanism, a sheet that folds to a target shape, a deployable Miura panel, and a living hinge tested for cycle life. You choose materials and geometry on the left, set the structure moving, and read off a real design number. The composite-beam, mechanism-mobility, kinematics, origami, and fatigue physics runs underneath every animation.

---

## Sub-Calc A: The Self-Folding Flat-Pack Box (Stiffness Contrast)
**The device:** a flat-printed sheet that folds itself into a box along a soft printed living hinge (the maroon strip). A high stiffness contrast keeps the fold crisp; too low and the stiff panels bow too.

1. **Pick the materials:** choose the **active (soft hinge)** material and the **passive (stiff panel)** material. Their ratio sets the stiffness contrast SC = E<sub>passive</sub>/E<sub>active</sub>.
2. **Set the print:** move the **hinge thickness h** and **target fold angle &theta;** sliders.
3. **Trigger it:** click **Fold the Box**. The flat sheet rises into a box; the bending concentrates in the maroon hinge.
4. **Read the plots:** the hinge-length curve (L &prop; h&sup3;) and the **% fold-in-hinge** curve vs stiffness contrast.
5. **Record:** the stiffness contrast SC, the required hinge length L<sub>hinge</sub>, the % of bending kept in the hinge, and whether the box folds **clean** or **smears**.
6. **Design takeaway:** a high stiffness contrast (SC > 1000) localises the fold in the hinge for sharp corners. Click **Next Experiment ->**.

---

## Sub-Calc B: The Self-Closing Gripper Mechanism (Grubler-Kutzbach)
**The device:** a printed two-jaw gripper. Its number of working joints decides whether it is locked solid, opens and closes properly (F = 2), or is too floppy to control.

1. **Set the links:** move the **links n** slider (rigid bodies in the mechanism).
2. **Set the joints:** move the **full joints j&#8321;** and **half joints j&#8322;** sliders.
3. **Trigger it:** click **Test the Gripper**. The jaws try to open and close; the colour and motion show the regime, and the workpiece lights up when a working gripper grips it.
4. **Read the plots:** the mobility curve F = 3(n-1) - 2j&#8321; - j&#8322; and the regime strip (locked / rigid / works / floppy).
5. **Record:** the mobility F, the regime, and the **links needed for F = 2**. The table shows F for nearby joint counts.
6. **Design takeaway:** aim for exactly **F = 2** (open/close plus lateral) for a controllable gripper. Click **Next Experiment ->**.

---

## Sub-Calc C: Folding a Flat Sheet to a Target Shape (Kinematics)
**The device:** a printed strip of three panels that folds at its hinges to reach a target point in space - the link between a flat print and its folded 3D form.

1. **Choose the mode:** **Forward** (you set the hinge angles, see where the tip lands) or **Inverse** (you set a target, the solver finds the angles).
2. **Forward:** move the three **hinge-angle** sliders and watch the strip fold; read the tip position.
3. **Inverse:** set the **target x** and **target y**; the CCD solver (hinges limited to &plusmn;90&deg;) folds the strip toward it.
4. **Trigger it:** click **Fold the Sheet** to animate the fold from flat.
5. **Record:** the tip position, the hinge angles, and - in Inverse mode - the **positioning error (mm)** and whether the target is reachable.
6. **Design takeaway:** inverse kinematics gives you the exact fold angles to print for a desired shape. Click **Next Experiment ->**.

---

## Sub-Calc D: The Deployable Miura Panel / Stent (Miura Fold)
**The device:** a Miura-ori sheet (solar panel or self-expanding stent) that packs flat-compact for launch and pops open with a single pull, expanding in both directions at once.

1. **Set the crease geometry:** move the **sector angle &alpha;** and **fold angle &phi;** sliders.
2. **Trigger it:** click **Deploy the Panel**. The packed sheet unfolds; notice it grows in both directions together.
3. **Read the plots:** the pack-ratio curve (folded area % vs &phi;) and the **Poisson's ratio** curve (negative = auxetic).
4. **Record:** the mountain-valley angle &theta;<sub>M</sub>, the **pack ratio** (folded area as % of flat), and the Poisson's ratio &nu;<sub>x</sub> (&lt; 0, auxetic). The table lists these for several fold angles.
5. **Design takeaway:** one fold deploys the whole panel, and being auxetic it expands both ways at once - ideal for packed arrays and stents. Click **Next Experiment ->**.

---

## Sub-Calc E: The Living-Hinge Cycle Life (Basquin's Law)
**The device:** a printed living hinge flexed open and closed over and over. The question is how many cycles it survives before the skin cracks - the key failure mode of any repeatedly actuated 4D part.

1. **Set the hinge:** move the **thickness h**, **fold angle &theta;**, and **hinge length L** sliders.
2. **Trigger it:** click **Run Cycle Test**. The hinge flexes repeatedly while it is thinned, so you can watch the stress (and predicted life) change colour from safe green to overstressed red.
3. **Read the plots:** the S-N fatigue curve and the **stress-utilisation** strip (how hard the hinge works vs its limit).
4. **Record:** the surface strain &epsilon;<sub>max</sub>, the stress &sigma;<sub>max</sub>, the fatigue life N, and the **safe life N/5** (polymer safety factor). The table gives the minimum h for 1,000 and 100,000 cycles.
5. **Design takeaway:** a thinner hinge lowers the stress and buys exponentially more cycles. 
6. **Finish:** you have designed and tested all five multi-material structures. Use **Restart** to explore other designs.
