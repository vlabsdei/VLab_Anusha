### Aim of the Experiment

**The big picture.** Heat is the usual 4D-printing trigger, but many devices need actuation that is *remote, spatially precise, or biocompatible* in ways heat cannot manage - so they are driven by light or magnetism instead. This experiment teaches you to design a real non-thermal 4D-printed device from start to finish, by working through the five questions a designer of light- and magnetically-driven structures actually has to answer. Each sub-calculator is a real printed device, not just an equation:

1. **The light-driven actuator strip - "how fast does it bend?" (azobenzene).** A printed strip carrying azobenzene dye bends toward UV light and relaxes under visible light. You use the **Beer-Lambert law** and first-order photokinetics to compute the bend angle and the **time to actuate (t90)** at different light intensities.

2. **The NIR skin-activated implant - "can I switch it through skin?" (photothermal).** A printed implant under the skin is heated by an 808 nm laser shining through tissue. You compute the **temperature rise**, the time to trigger, and the **heated-zone size**, and find the minimum power that activates it while staying local.

3. **The magnetic catheter tip / micro-gripper - "what magnet steers it?" (magnetic torque).** A printed strip loaded with magnetic particles bends when an external magnet is brought close. You compute the **torque, the tip deflection, and the critical field** for 45 and 90 degree steering as a function of particle loading.

4. **The wireless coil driving an in-body robot - "wireless or battery?" (coil design).** An external coil must deliver enough field at an implant's depth. You design the **coil current and power**, account for tissue soaking up the field, and find the **crossover depth** beyond which an on-board battery wins.

5. **Pick the right trigger for the job - "which stimulus is fastest?" (speed comparison).** Three identical strips race under magnetic, light, and heat triggers. You compute each **response time** (milliseconds to minutes) and map each stimulus to the application it suits best.

**What you should be able to do at the end:** for each device, decide *what stimulus, what material loading, and what source settings (intensity, field, coil)* give the remote, precise actuation you want - the core design loop of non-thermal 4D printing.
