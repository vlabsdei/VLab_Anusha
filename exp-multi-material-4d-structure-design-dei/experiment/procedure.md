# Procedure: Multi-Material 4D Structure Design

Welcome to the 4D Printing Virtual Laboratory. This lab walks you through five ways a flat, multi-material printed sheet turns itself into a working folded structure. Each sub-calculator is a self-contained device. Set the parameters in the right-hand dock, press **Start Experiment** on the idle viewport, then run the animation and read off the results.

---

## Sub-Calc A: The Self-Folding Flat-Pack Box
**Objective:** Find the stiffness contrast between the soft living hinge and the rigid panels, and decide whether the fold localises cleanly in the hinge or bows the whole sheet.

1. **Pick the soft hinge material:** Choose **Hydrogel (1 MPa)**, **Elastomer (5 MPa)**, or **Soft SMP (20 MPa)** from the first control group.
2. **Pick the stiff panel material:** Select **PLA (2 GPa)** or **ABS (2.3 GPa)**.
3. **Set the living-hinge thickness:** Drag the **hinge thickness h (mm)** slider (0.2&ndash;2.0 mm).
4. **Set the target fold angle:** Drag the **fold angle &theta; (deg)** slider (15&ndash;150&deg;).
5. **Fold it:** Click **Fold the Box**. The flat sheet rotates up along the rust-coloured hinge into a box.
6. **Read the outcome:** Note the **Stiffness contrast**, the **Hinge length needed**, the **% fold that stays in the hinge**, and whether it folds cleanly. The design rule to watch for is SC &gt; 1000.
7. **Advance:** Click **Next sub-calc &rsaquo;**.

---

## Sub-Calc B: The Self-Closing Gripper Mechanism
**Objective:** Count the links and joints of a printed gripper and use the Kutzbach&ndash;Gr&uuml;bler criterion to tell whether it is locked, rigid, a working F=2 gripper, or floppy.

1. **Set the number of links:** Use the **links n** slider (2&ndash;8, base included).
2. **Set the full joints:** Adjust **full joints j&#8321;** - the simple pin hinges (0&ndash;10).
3. **Set the half joints:** Adjust **half joints j&#8322;** - rolling or sliding contacts (0&ndash;6).
4. **Test it:** Click **Test the Gripper**. The animation builds joints up to your chosen count and the jaws move (or don't).
5. **Read the verdict:** Check **Freedom to move F**, the **Verdict** band, and the **links needed to work (F=2)** readout. Aim for exactly F=2.
6. **Advance:** Click **Next sub-calc &rsaquo;**.

---

## Sub-Calc C: Folding a Flat Sheet into a Target Shape
**Objective:** Treat the three-panel strip as a serial hinge chain - run it forward from angles to tip position, or inverse from a target back to the fold angles.

1. **Choose the approach:** Pick **Set the fold angles, see where it lands** (forward) or **Set a target, solve the fold angles** (inverse).
2. **Forward mode:** Set **hinge 1**, **hinge 2**, and **hinge 3** angles (each &minus;90&deg; to +90&deg;).
3. **Inverse mode:** Set **target x** (&minus;30 to 30 mm) and **target y** (0 to 30 mm); the solver runs cyclic coordinate descent for the angles.
4. **Fold it:** Click **Fold the Sheet** to watch the strip fold to shape.
5. **Read the result:** Note where the **tip lands (x, y)**, the **fold angles to print**, the **positioning error**, and whether it reaches the target (within 1 mm).
6. **Advance:** Click **Next sub-calc &rsaquo;**.

---

## Sub-Calc D: The Deployable Solar Panel / Stent (Miura Fold)
**Objective:** Fold a Miura-ori sheet, measure how compact it packs, and confirm its negative (auxetic) Poisson's ratio.

1. **Set the crease pattern:** Drag **&alpha; (deg)**, the sector angle (20&ndash;75&deg;) - larger &alpha; is a sharper zigzag.
2. **Set the fold amount:** Drag **&phi; (deg)** (5&ndash;85&deg;) from nearly open toward packed.
3. **Deploy:** Click **Deploy the Panel** to fold it compact and pop it open.
4. **Read the geometry:** Note the **mountain-valley crease angle**, the **pack ratio** (folded area as a % of flat), and **Poisson's ratio &nu;**. A negative &nu; means the sheet expands both ways at once.
5. **Advance:** Click **Next sub-calc &rsaquo;**.

---

## Sub-Calc E: The Living-Hinge Cycle Life
**Objective:** Estimate how many open/close cycles a printed living hinge survives before a fatigue crack, using flexure strain and Basquin's law.

1. **Set the hinge thickness:** Drag **h (mm)** (0.2&ndash;1.0 mm) - thinner bends more gently.
2. **Set the fold angle:** Drag **&theta; (deg)** (15&ndash;120&deg;), the swing per cycle.
3. **Set the hinge length:** Drag **L (mm)** (2&ndash;10 mm) - a longer hinge spreads the bend over a larger radius.
4. **Cycle it:** Click **Run Cycle Test**. The hinge flexes repeatedly and its colour tracks how hard it is working.
5. **Read the life:** Note the **max strain each fold**, the **peak stress**, the **cycles to crack N**, the **safe cycles (N/5)**, and whether it survives long use.
6. **Finish:** This is the last sub-calc; the forward arrow is disabled at the end of the simulation.
