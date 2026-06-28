### Aim of the Experiment

**The big picture.** A single material can only bend; to make a flat print *fold, twist, and self-assemble* into a prescribed 3D shape you combine materials of different stiffness and put the right joints in the right places. This experiment teaches you to design a real multi-material 4D-printed transforming structure from start to finish, by working through the five questions a structure designer actually has to answer. Each sub-calculator is a real printed structure, not just an equation:

1. **The self-folding flat-pack box - "will the fold stay crisp?" (stiffness contrast).** A flat-printed sheet folds itself into a box along a soft printed living hinge. You compute the **stiffness contrast ratio SC** and the **hinge length** so the bending localises in the hinge and the box folds with sharp corners instead of bowing.

2. **The self-closing gripper mechanism - "does it have the right joints?" (Grubler-Kutzbach).** A printed gripper only works if its mobility is right. You count links and joints and compute the **degrees of freedom F**, tuning it to F = 2 (a controllable open/close) rather than locked or floppy.

3. **Folding a sheet to a target shape - "what fold angles do I print?" (kinematics).** A printed strip folds at its hinges to reach a target point. You use **forward kinematics** to see where a set of angles lands, and **inverse kinematics** to solve the hinge angles that hit a target 3D shape, recording the positioning error.

4. **The deployable Miura panel / stent - "how small does it pack?" (Miura fold).** A Miura-ori sheet packs flat-compact and pops open with one pull. You compute the **mountain-valley angle**, the **pack ratio** (folded area), and the **negative (auxetic) Poisson's ratio** that makes it expand in both directions at once.

5. **The living-hinge cycle life - "how many folds before it cracks?" (Basquin's Law).** A repeatedly actuated hinge fails by fatigue. You compute the **flexure strain and stress**, predict the **fatigue life N** from the S-N curve, and size the minimum hinge thickness for a target cycle count with a safety factor.

**What you should be able to do at the end:** for each structure, decide *what materials, what geometry (thickness, hinge length, fold angle), and what joint layout* give the transformation you want - the core design loop of multi-material 4D printing.
