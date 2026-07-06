# Procedure: Non-Thermal 4D Actuation

Welcome to the Non-Thermal 4D Actuation Virtual Laboratory. Each sub-calculator is a recognizable light- or magnetically-driven 4D-printed device: a light-bending actuator strip, an NIR skin-activated implant, a magnetic catheter tip, a wireless coil driver, and a stimulus speed race. You set the light, magnet, or coil on the left, trigger the device, watch it respond in 3D, and read off a real design number. The Beer-Lambert, photothermal, magnetic-torque, coil-field, and response-time physics runs underneath every animation.

---

## Sub-Calc A: The Light-Driven Actuator Strip (Azobenzene)
**The device:** a printed strip carrying azobenzene dye. Violet 365 nm light flips the dye and the strip bends toward the light; blue 450 nm light flips it back and the strip relaxes - a light-powered actuator with no wires.

1. **Pick the light:** choose **365 nm** (UV - bends it) or **450 nm** (visible - relaxes it).
2. **Set the dose:** move the **light intensity I&#8320;** and **dye concentration C** sliders.
3. **Trigger it:** click **Shine the Light**. The strip curls toward the lamp and tints violet as the dye switches.
4. **Read the plots:** the bend-vs-time curve (with the t<sub>90</sub> marker) and the **time-to-actuate vs brightness** curve.
5. **Record:** the absorbed intensity, the photostationary cis %, the bend angle, and the **time to 90% bend t<sub>90</sub>** at three intensities.
6. **Design takeaway:** brighter light actuates faster (t<sub>90</sub> &prop; 1/intensity); UV bends, visible relaxes. Click **Next Experiment ->**.

---

## Sub-Calc B: The NIR Skin-Activated Implant (Photothermal)
**The device:** a printed implant sitting under the skin. An 808 nm laser shines through the skin and heats a nanoparticle spot to switch the implant on - activation with no surgery, as long as the hot spot stays local.

1. **Set the laser:** move the **laser power P** slider.
2. **Set the loading:** move the **gold-nanorod (AuNR) loading** slider (more nanorods absorb more light).
3. **Trigger it:** click **Fire the Laser**. The beam passes through the translucent skin and a red hot-spot grows on the implant; the marker glows when it activates.
4. **Read the plots:** the **hot-zone size vs power** curve (with the "stays local < 0.5 mm" band and minimum power) and the temperature-rise curve (with the +25&deg;C switch-on line).
5. **Record:** the heating rate, the steady &Delta;T, the **time to activate**, the heated-zone size d, and the **minimum power** to keep d < 0.5 mm.
6. **Design takeaway:** use enough power to cross +25&deg;C but keep the heated zone small - faster heating means a tighter spot. Click **Next Experiment ->**.

---

## Sub-Calc C: The Magnetic Catheter Tip / Micro-Gripper (Magnetic Torque)
**The device:** a printed strip loaded with magnetic particles that bends when an external magnet is brought close - wireless, millisecond steering for a catheter tip threading into a side branch.

1. **Set the loading:** move the **particle volume fraction** slider (1-10 vol%).
2. **Set the magnet:** move the **external field B** slider, or click **Apply the Magnet** to ramp the field up.
3. **Watch it:** the tip bends toward the green field arrows; the target ring lights up when the tip steers far enough (&ge; 45&deg;).
4. **Read the plots:** the tip-bend vs field curve (with the 45&deg; and 90&deg; markers) and the **critical field vs particle content** curve.
5. **Record:** the effective magnetisation, the torque, the tip deflection, and the **critical field B<sub>crit</sub>** for 45&deg; and 90&deg;.
6. **Design takeaway:** print in more particles to steer with a gentler magnet - B<sub>crit</sub> falls as 1/(volume fraction), and steering stays wireless and millisecond-fast. Click **Next Experiment ->**.

---

## Sub-Calc D: The Wireless Coil Driving an In-Body Robot (Coil Design)
**The device:** an external coil that must deliver enough magnetic field at an implanted robot's depth to drive it. Tissue soaks up the field, so beyond a crossover depth a tiny on-board battery wins.

1. **Set the coil:** move the **turns n** and **coil radius R** sliders.
2. **Set the depth:** move the **implant depth r** slider (50-100 mm for an in-body device), or click **Power the Coil** to sweep depth.
3. **Watch it:** the in-body device glows green when the coil can power it and red when it cannot; the field beam fades with depth.
4. **Read the plots:** the **coil power vs depth** curve (with the wireless-budget line and crossover marker) and the **field reaching the device** curve (solid = at the surface, dashed = after tissue soaks it up).
5. **Record:** the field at depth, the required current and **coil power P**, the tissue-attenuated field, and the **crossover depth** beyond which a battery wins.
6. **Design takeaway:** power climbs steeply with depth - wireless wins when shallow, battery wins when deep. Click **Next Experiment ->**.

---

## Sub-Calc E: Pick the Right Trigger for the Job (Speed Race)
**The device:** three identical printed actuator strips racing under three different triggers - magnetic, light, and heat - to show which is fastest and which job each one suits.

1. **Set the triggers:** move the **magnetic field B**, **light intensity I**, and **thermal time-constant &tau;** sliders.
2. **Trigger it:** click **Race the Actuators**. The three strips bend in real time at their own characteristic speed.
3. **Read the plots:** the **response-time bar chart** (log scale) and the **application map** linking each trigger to its use.
4. **Record:** the magnetic, photo, and thermal response times in the comparison table, and confirm the ranking - magnetic fastest (ms), photo intermediate (s), thermal slowest (min).
5. **Design takeaway:** pick the trigger by the speed your device needs - magnetic for surgical robots, photo for microfluidics, thermal for implants.
6. **Finish:** you have driven all five non-thermal devices. Use **Restart** to compare other settings.
