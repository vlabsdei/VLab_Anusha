# References

1. **Tibbits, S. (2014).** *4D Printing: Multi-Material Shape Change*. Architectural Design, 84(1), 116-121. DOI: [10.1002/ad.1710](https://doi.org/10.1002/ad.1710)
2. **Rus, D., & Tolley, M. T. (2015).** *Design, fabrication and control of soft robots*. Nature, 521(7553), 467-475. DOI: [10.1038/nature14543](https://doi.org/10.1038/nature14543)
3. **Gul, J. Z., Sajid, M., Rehman, M. M., et al. (2018).** *3D printing for soft robotics - a review*. Science and Technology of Advanced Materials, 19(1), 243-262. DOI: [10.1080/14686996.2018.1431862](https://doi.org/10.1080/14686996.2018.1431862)
4. **Polygerinos, P., Correll, N., Morin, S. A., et al. (2017).** *Soft Robotics: Review of Fluid-Driven Intrinsically Soft Devices; Manufacturing, Sensing, Control, and Applications*. Advanced Engineering Materials, 19(12), 1700016. DOI: [10.1002/adem.201700016](https://doi.org/10.1002/adem.201700016)
5. **Yang, Y., Chen, Y., Wei, Y., & Li, Y. (2016).** *Novel Design and Three-Dimensional Printing of Variable Stiffness Robotic Grippers*. Journal of Mechanisms and Robotics, 8(6), 061010. DOI: [10.1115/1.4033835](https://doi.org/10.1115/1.4033835)
6. **Seok, S., Onal, C. D., Cho, K.-J., et al. (2013).** *Meshworm: A Peristaltic Soft Robot With Antagonistic Nickel Titanium Coil Actuators*. IEEE/ASME Transactions on Mechatronics, 18(5), 1485-1497. DOI: [10.1109/TMECH.2012.2204070](https://doi.org/10.1109/TMECH.2012.2204070)
7. **Marchese, A. D., Katzschmann, R. K., & Rus, D. (2015).** *A Recipe for Soft Fluidic Elastomer Robots*. Soft Robotics, 2(1), 7-25. DOI: [10.1089/soro.2014.0022](https://doi.org/10.1089/soro.2014.0022)

## Indian engineering lab manuals

8. **Institute of Aeronautical Engineering (IARE), Hyderabad - Control Systems and Simulation Lab Manual.** *Experiment 10, Temperature Control Systems*, PDF page 43 (procedure runs on to page 45). Backs the P, PI and PID controller comparison this experiment runs on the pneumatic finger. The manual holds an oven at a 60 deg C setpoint, patches P, then PI, then PID into the drive, records the temperature every 15-30 s for about 20 min and plots temperature against time. That is the same first-order plant plus controller loop as G(s) = K/(tau*s + 1) driven by u = Kp*(e + (1/Ti)*integral(e dt) + Td*de/dt).
   [Open the manual (PDF)](https://www.iare.ac.in/sites/default/files/lab1/IARE_Control_Systems_Lab_Manual.pdf) - local copy: `screenshots_references/manuals/exp9_control_iare.pdf`, screenshot: `screenshots_references/exp09_pid__iare_controller_p43.png`

   Partial fit: the manual proves the P/PI/PID experiment and the tuning procedure, but the gains are set on potentiometers and the PID equation itself is never printed. For the equation see Nagrath, I. J., & Gopal, M., *Control Systems Engineering*, New Age International.
