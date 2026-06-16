# Theory: 4D Printing & Viscoelastic Shape Memory Polymers

## 1. Introduction to 4D Printing
4D Printing is an additive manufacturing paradigm where a 3D-printed structure can alter its geometry, properties, or functionality over time in response to an external stimulus (such as heat, humidity, light, or magnetic fields). The "fourth dimension" represents this dynamic, autonomous shape transformation. In thermal 4D printing, shape-change is programmed into a **Shape Memory Polymer (SMP)** matrix.

---

## 2. Shape Memory Polymers (SMPs)
SMPs are active materials capable of "remembering" a primary, permanent shape. They can be deformed into a secondary, temporary shape under stress, locked in that state by cooling, and subsequently triggered by reheating to recover their original, permanent shape. This cycle relies on a dual-segment network:
1. **Netpoints (Crosslinks):** Determine the permanent shape and provide the entropic elastic restoring force.
2. **Switching Segments:** Undergo a thermal transition ($T_g$) allowing chains to become mobile or rigid.

---

## 3. Viscoelasticity and WLF Shift Factor (Sub-Calc A)
The mechanical response of SMPs is highly time-temperature dependent. The transition from a hard, glassy state to a soft, rubbery state occurs at the **Glass Transition Temperature ($T_g$)**:
* **Below $T_g$:** Segmental chain motion is frozen, and the material exhibits high elastic modulus ($E_{\text{glassy}} \sim 1.5\text{--}3\text{ GPa}$).
* **Above $T_g$:** Thermal activation increases chain mobility, causing the modulus to drop by several orders of magnitude into a compliant rubbery state ($E_{\text{rubbery}} \sim 15\text{--}30\text{ MPa}$).

The relationship between temperature $T$ and molecular relaxation time shift factor $a_T$ is governed by the **Williams-Landel-Ferry (WLF) Equation**:

\[ \log(a_T) = \frac{-C_1 (T - T_g)}{C_2 + (T - T_g)} \quad \text{for } T \ge T_g \]

Where:
* $a_T = \frac{\tau(T)}{\tau(T_g)}$ is the shift factor (viscosity ratio).
* $C_1 = 17.44$ and $C_2 = 51.6\text{ K}$ are material empirical constants.
* For glassy temperatures ($T < T_g$), the relaxation time is considered infinite (glassy zone).

---

## 4. Programming Cycle and Strain Fixity (Sub-Calc B)
During the programming stage, the polymer is heated above $T_g$ to its rubbery state, stretched under applied stress $\sigma_{\text{applied}}$, and cooled down to freeze the deformation.

* **Loading Strain ($\epsilon_{\text{load}}$):** Under rubbery equilibrium, the loading strain is calculated as:
  \[ \epsilon_{\text{load}} = \frac{\sigma_{\text{applied}}}{E_{\text{rubbery}}} \times 100\% \]

* **Strain Fixity Ratio ($R_f$):** Quantifies the material's ability to retain the programmed deformation after the stress is removed. It is modeled using a crystallization-kinetics-based saturating exponential:
  \[ R_f = X_c \left(1 - \exp\left(-\frac{T_{\text{prog}} - T_g}{10}\right)\right) \times 100\% \quad \text{for } T_{\text{prog}} \ge T_g \]
  where $X_c$ is the maximum crystallinity limit ($0.85$ for PU, $0.70$ for PLA, and $0.60$ for PMMA).

* **Programmed Strain ($\epsilon_u$):** The resulting temporary shape strain is:
  \[ \epsilon_u = \epsilon_{\text{load}} \times R_f \]

---

## 5. Shape Recovery Kinetics and Opposing Stress (Sub-Calc C)
Reheating the polymer triggers relaxation. Depending on the loading conditions, recovery falls into two regimes:
* **Free Recovery ($\sigma_{\text{opp}} = 0$):** The specimen fully retracts to its original strain ($\epsilon_{\text{eq}} = 0$).
* **Constrained Recovery ($\sigma_{\text{opp}} > 0$):** Recovery is blocked by an opposing stress, resulting in a non-zero final strain:
  \[ \epsilon_{\text{eq}} = \max\left(0, \epsilon_u - \frac{\sigma_{\text{opp}}}{E_{\text{rubbery}}} \times 100\%\right) \]

* **Shape Recovery Ratio ($R_r$):**
  \[ R_r = \left(1 - \frac{\epsilon_{\text{eq}}}{\epsilon_u}\right) \times 100\% \]

* **Blocking Recovery Stress ($\sigma_{\text{recovery}}$):** The stress generated against the constraint at equilibrium:
  \[ \sigma_{\text{recovery}} = E_{\text{rubbery}} \times \frac{\epsilon_u - \epsilon_{\text{eq}}}{100} \quad (\text{capped at } \sigma_{\text{opp}}) \]

* **Kinetics and Recovery Timescale ($t_{95}$):**
  The first-order relaxation time is $\tau(T) = \tau_{\text{ref}} \times a_T$. The time required to achieve $95\%$ of the possible shape recovery is:
  \[ t_{95} = \tau(T) \ln(20) \]

---

## 6. Multi-Shape Memory and Fox Equation (Sub-Calc D)
Copolymers containing phase-separated domains can memorize multiple temporary shapes:
* **Phase-Separated (Immiscible Blend):** Contains distinct domains of PU ($T_{g1} = 45^\circ\text{C}$) and PMMA ($T_{g2} = 90^\circ\text{C}$). 
  During heating, the first transition release results in a partial strain plateau:
  \[ \epsilon_{\text{intermediate}} = \epsilon_{\text{total}} \times w_1 \times \frac{E_{g1,\text{rubbery}}}{E_{g1,\text{rubbery}} + w_2 \times E_{g2,\text{glassy,eff}}} \]
  where $E_{g1,\text{rubbery}} = 15\text{ MPa}$ and $E_{g2,\text{glassy,eff}} = 7.5\text{ MPa}$ represent soft/hard phase moduli, and $w_1$ is the PU weight fraction.
* **Miscible Blend:** Forms a single phase with a single transition temperature $T_{g,\text{blend}}$ defined by the **Fox Equation**:
  \[ \frac{1}{T_{g,\text{blend}}} = \frac{w_1}{T_{g1} + 273.15} + \frac{w_2}{T_{g2} + 273.15} \quad (\text{temperatures in Kelvin}) \]

---

## 7. Thermodynamics and Efficiency (Sub-Calc E)
To actuate against a load, the polymer converts thermal heat input $Q$ into mechanical work output $W$.
* **Unit Equivalence:** $1\text{ MPa} = 1\text{ J/cm}^3 \implies \text{MPa} \times \text{cm}^3 = \text{Joules}$.
* **Stored Elastic Energy ($U_{\text{stored}}$):** The mechanical energy stored during programming:
  \[ U_{\text{stored}} = \frac{1}{2} E_{\text{rubbery}} \epsilon_u^2 V \]
* **Thermal Trigger Heat ($Q$):** The heat energy required to raise the material's temperature by $\Delta T = 25^\circ\text{C}$:
  \[ Q = m C_p \Delta T \]
* **Mechanical Work Output ($W$):** The work done against the recovery stress:
  \[ W = \sigma_{\text{recovery}} \Delta \epsilon V \]
* **Thermodynamic Efficiency ($\eta$):**
  \[ \eta = \frac{W}{Q} \times 100\% \]
  Due to the high sensible heat capacity ($C_p$) of polymers relative to their elastic strain energy capacity, the thermal-to-mechanical conversion efficiency is typically low ($\eta \sim 1\text{--}4\%$).
