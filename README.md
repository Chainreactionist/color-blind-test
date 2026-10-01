# ChromaClear 👁️🔬
### Clinical & Occupational Color Vision Diagnostic Suite

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Ready-brightgreen?logo=github)](https://pages.github.com/)
[![Pure CSS & HTML](https://img.shields.io/badge/CSS3%20%2F%20HTML5-Bespoke%20Design-blue?logo=css3)](https://www.w3.org/Style/CSS/)
[![Standards](https://img.shields.io/badge/CIE%201976%20UCS-Standardized-blue)](https://cie.co.at/)
[![Mobile Friendly](https://img.shields.io/badge/Mobile-Touch%20Optimized-success?logo=apple)](https://developer.mozilla.org/)

**ChromaClear** is a state-of-the-art, single-page web application engineered to screen, quantitatively grade, and clinically classify color vision deficiencies (CVD). Crafted with a bespoke clinical design in pure HTML5, CSS3, and modern JavaScript, it eliminates the display luminance artifacts that plague naive digital tests and incorporates quantitative algorithms from clinical ophthalmology without any framework bloat or build steps.

---

## 🚀 Live GitHub Pages Deployment Guide

This repository is **100% prepped for GitHub Pages** with zero build steps required.

### Enabling GitHub Pages in 3 Simple Steps:

1. **Push this repository to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of ChromaClear suite"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository on GitHub.
   - Click **Settings** ➔ **Pages** (in the left sidebar under *Code and automation*).
   - Under **Build and deployment**:
     - **Source**: Select `Deploy from a branch`.
     - **Branch**: Select `main` and folder `/ (root)`.
     - Click **Save**.

3. **Visit Your Site**:
   - Within 1–2 minutes, your site will be live at:
     ```
     https://<your-username>.github.io/<your-repo-name>/
     ```

*(The included `.nojekyll` file ensures GitHub Pages serves all static assets directly without Jekyll preprocessing).*

---

## 💻 Running Locally

Because ChromaClear is fully self-contained with zero server dependencies, you can run it locally in any modern browser:

### Option A: Direct Open
Double-click `index.html` or open it directly in Safari, Chrome, Firefox, or Edge.

### Option B: Local Static Server (Node.js)
```bash
npx serve .
# or
python3 -m http.server 8080
```
Then visit `http://localhost:8080`.

---

## 🔬 Scientific & Clinical Foundation

### 1. Dynamic Luminance Contrast Noise (DLCN)
Standard digital screens (sRGB/P3) exhibit subpixel gamma non-linearities. Scanned physical plates (like Ishihara) leak subtle brightness differences that color-blind individuals can use to identify figures without seeing the color difference. 

ChromaClear implements real-time **Dynamic Luminance Contrast Noise (DLCN)** (Barbur et al., City University London CAD test). Dot luminance is jittered independently ($\pm 12-16\%$) across both static and dynamic flicker modes, ensuring stimuli detection relies strictly on parvocellular chromatic cone channels.

### 2. Dual-Axis Screening (Red-Green & Blue-Yellow Tritan)
Traditional Ishihara testing completely misses **Tritan** (S-cone / blue-yellow) defects. ChromaClear integrates an 8-plate hybrid battery based on the **Hardy-Rand-Rittler (HRR)** standard, evaluating:
- **Protan & Deutan** (L/M cone opponent channel)
- **Tritan** (S-cone channel — essential for early detection of glaucoma, diabetic retinopathy, and macular degeneration)
- **Achromatopsia Control** (Rod monochromacy confirmation)

### 3. Quantitative Farnsworth D-15 Analysis (Vingrys & King-Smith, 1988)
Rather than simple error counting, the 16 Munsell-calibrated caps are scored using **Moment of Inertia (MoI) tensor analysis** in CIE 1976 UCS $(u', v')$ chromaticity space:
- **Confusion Index ($C$-Index)**: Quantifies total severity of loss ($1.00 = \text{normal}$; $\ge 1.25 = \text{deficient}$).
- **Selectivity Index ($S$-Index)**: Quantifies polar alignment vs. random scatter ($> 1.65$ indicates non-random congenital confusion).
- **Confusion Angle ($\theta$)**: Differentiates specific defect axes:
  - **Protan Axis**: $\approx +1.4^\circ$
  - **Deutan Axis**: $\approx -61.5^\circ$
  - **Tritan Axis**: $\approx +86.5^\circ$

### 4. Computerized CAD / Cambridge Adaptive Trivector Test
A real-time 60 FPS dynamic luminance noise canvas running a **4-Alternative Forced Choice (4-AFC)** psychometric staircase (1-up / 2-down rule) with a Landolt-C target. Quantifies chromatic discrimination thresholds in standardized **CAD Units** ($1.0 \text{ CAD} = \text{normal population limit}$).

### 5. Physiological Machado LMS Cone Simulation
Implements the continuous matrix transformation algorithms of **Machado et al. (2009)** and **Viénot et al. (1999)**:
$$\begin{bmatrix} L' \\ M' \\ S' \end{bmatrix} = \mathbf{M}_{\text{defect}}(\text{severity}) \times \mathbf{M}_{\text{RGB}\to\text{LMS}} \begin{bmatrix} R \\ G \\ B \end{bmatrix}$$
Features an interactive split-view comparison slider demonstrating everyday safety-critical scenes (traffic lights, fruit ripeness, autumn scenery).

### 6. 2025/2026 Occupational Standards Integration
Provides real-time clearance analysis referencing updated regulatory criteria:
- **FAA (Federal Aviation Administration)**: Updated criteria retiring legacy lantern tests in favor of computerized threshold standards (CAD/CCT/WCCVO) for Class 1, 2, and 3 pilot medical certification.
- **Maritime Navigation (STCW / IMO)**: Port/starboard lateral navigation light recognition.
- **Electrical & Electronics Engineering**: IEC 60757 resistor color-coding and wiring phase identification.

---

## 📱 Full Mobile & Touch Optimization

ChromaClear is engineered from the ground up for phone, tablet, and desktop viewports:
- **Mobile Sticky Progress Sub-Header**: Compact step indicator, progress bar, and fast next/prev step controls on viewports $< 1280\text{px}$.
- **Touch-Friendly D-15 Reordering**: Tap-to-select cap workflow with a dedicated mobile reorder toolbar (`◀ Left` / `Right ▶` / `× Deselect`) and quick-tray tap swapping, overcoming HTML5 drag-and-drop mobile limitations.
- **Responsive Procedural Canvases**: Dynamic DLCN plates and CAD canvases scale proportionally to viewport width while preserving physical dot pitch and Retina DPI resolution.
- **On-Screen Keypads & D-Pads**: 48px touch targets for 0–9 numerical entry and 4-AFC directional decisions.
- **Tap-to-Jump Split Simulator**: Interactive Machado comparison slider responds to single-finger dragging or direct tapping anywhere on the viewport.

---

## 📂 Project Architecture

```
ColorBlind/
├── index.html         # Semantic, accessible one-page UI with bespoke clinical styling
├── style.css          # Comprehensive stylesheet (clinical theme, Retina canvas, print rules)
├── app.js             # Core colorimetry, procedural plate generator & CAD engine
├── .nojekyll          # Bypasses Jekyll processing on GitHub Pages
├── .gitignore         # OS and editor ignore rules
└── README.md          # Project documentation and deployment guide
```

---

## 📄 Medical Report Export

The application includes an optimized `@media print` stylesheet. Clicking **Print Medical Report / Save PDF** generates a clean, single-page clinical diagnostic summary suitable for optometric records and physician consultation.

---

## 📚 References & Scientific Literature

1. **Vingrys, A. J., & King-Smith, P. E. (1988).** *A quantitative scoring technique for panel tests of color vision.* Investigative Ophthalmology & Visual Science, 29(1), 50–63.
2. **Barbur, J. L., Harlow, J. A., & Plant, G. T. (1994).** *Insights into the nature of the dynamic luminance-contrast noise mask in color vision testing.* Optical Society of America.
3. **Mollon, J. D., & Regan, B. C. (2000).** *Cambridge Colour Test Handbook.* Cambridge Research Systems Ltd.
4. **Machado, G. M., Oliveira, M. M., & Fernandes, L. A. (2009).** *A physiologically-based model for simulation of color vision deficiency.* IEEE Transactions on Visualization and Computer Graphics, 15(6), 1291–1298.
5. **Viénot, F., Brettel, H., & Mollon, J. D. (1999).** *Digital video colourmaps for checking the legibility of displays by dichromats.* Color Research & Application, 24(4), 243–252.
6. **Bowman, K. J. (1982).** *A method for quantitative scoring of the Farnsworth Panel D-15.* Acta Ophthalmologica, 60(6), 907–916.
7. **Federal Aviation Administration (FAA) (2025).** *Guide for Aviation Medical Examiners: Computer-Based Color Vision Testing Protocols.* U.S. Department of Transportation.

---

*ChromaClear is an open-source educational and clinical research diagnostic suite.*
