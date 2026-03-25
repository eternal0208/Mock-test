# Design System Specification: The Ethereal Authority

## 1. Overview & Creative North Star
**Creative North Star: The Editorial Sanctuary**
This design system moves away from the rigid, "boxed-in" nature of traditional testing platforms. Instead, it adopts the persona of a high-end digital curator—combining the authority of a premium educational journal with the fluid, breathing room of a modern luxury interface. 

We break the "template" look through **Intentional Asymmetry** and **Tonal Depth**. By utilizing wide margins, overlapping glass elements, and a radical departure from solid borders, we create an environment that inspires focus and trust. The interface doesn't just present data; it stages it.

---

## 2. Colors & Surface Architecture
The palette is rooted in deep Indigos and Violets, balanced by an expansive range of "Surface" tones that allow for sophisticated layering.

### The "No-Line" Rule
**Borders are a failure of hierarchy.** In this system, 1px solid borders for sectioning are strictly prohibited. Boundaries must be defined solely through:
1.  **Background Shifts:** e.g., A `surface-container-low` section sitting on a `surface` background.
2.  **Tonal Transitions:** Using the `surface-container` tiers to create natural edges.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of frosted glass.
*   **Base:** `surface` (#f4f6ff)
*   **Low-Level Content:** `surface-container-low` (#ecf1ff)
*   **Active Cards:** `surface-container-lowest` (#ffffff)
*   **Floating Navigation:** `surface-bright` with 80% opacity and `backdrop-blur-xl`.

### The "Glass & Gradient" Rule
To achieve a "signature" feel, use **Glassmorphism** for all sticky elements (headers, floating action buttons). 
*   **Signature Textures:** Main CTAs and Hero headings should utilize a linear gradient: `primary` (#4a40e0) to `secondary` (#702ae1) at a 135° angle. This adds "visual soul" that flat colors cannot replicate.

---

## 3. Typography: The Editorial Scale
We pair **Plus Jakarta Sans** for high-impact displays with **Manrope** for technical clarity.

| Level | Token | Font | Size | Weight | Intent |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Plus Jakarta Sans | 3.5rem | 800 | Hero Statements; use Gradient Text. |
| **Headline** | `headline-md` | Plus Jakarta Sans | 1.75rem | 700 | Section Headers; tight tracking (-0.02em). |
| **Title** | `title-lg` | Manrope | 1.375rem | 600 | Card titles; authoritative and clean. |
| **Body** | `body-md` | Manrope | 0.875rem | 400 | General reading; generous line-height (1.6). |
| **Label** | `label-md` | Manrope | 0.75rem | 600 | All-caps for metadata/chips; letter-spacing 0.05em. |

---

## 4. Elevation & Depth: Tonal Layering
We move beyond shadows to define space. Depth is achieved by "stacking" the surface-container tiers.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft, natural lift without the "dirtiness" of a heavy shadow.
*   **Ambient Shadows:** If a "floating" effect is mandatory (e.g., a modal), use an ultra-diffused shadow: `box-shadow: 0 20px 40px rgba(74, 64, 224, 0.08)`. The shadow is tinted with the `primary` color to mimic natural light refraction.
*   **The Ghost Border:** If accessibility requires a stroke, use `outline-variant` (#a8adb9) at **15% opacity**. Never use 100% opaque lines.

---

## 5. Components

### Buttons (The "Glow" Variant)
*   **Primary:** Gradient (`primary` to `secondary`), `rounded-xl` (1.5rem), with a soft `primary_container` shadow.
*   **Secondary:** Ghost style. No background, `primary` text, and a `surface-variant` background on hover.
*   **Sizing:** Use Spacing `4` (1.4rem) for horizontal padding to ensure a wide, premium footprint.

### Cards & Progress Tracking
*   **Forbid Dividers:** Do not use lines to separate test questions or results. Use Spacing `6` (2rem) and `surface-container` shifts.
*   **Glass Cards:** Use for "Pro" features. `surface-container-lowest` at 70% opacity + `backdrop-blur-md`.

### Specialized App Components
*   **Confidence Chips:** Used during mock tests. `tertiary_container` for high confidence, `primary_container` for neutral.
*   **The Focus Timer:** A floating glass orb (`surface-bright` + blur) with a `secondary` glowing ring.

---

## 6. Do’s and Don’ts

### Do
*   **DO** use whitespace as a structural element. If an element feels cramped, increase the spacing to the next tier in the scale (e.g., move from `8` to `10`).
*   **DO** use "Trust Emerald" (`tertiary` #006947) sparingly—only for final success states and "Correct" indicators to maintain its psychological impact.
*   **DO** apply `rounded-2xl` (1rem) as the standard, but use `xl` (3rem) for large container-level components to emphasize softness.

### Don’t
*   **DON'T** use pure black (#000000) for text. Use `on-surface` (#2a2f38) to keep the editorial feel soft and readable.
*   **DON'T** use standard "drop shadows." If it looks like a default Photoshop shadow, it’s wrong. It must be diffused and tinted.
*   **DON'T** use 1px dividers. If you feel the need to separate two items, use a 8px height `surface-container-low` gap instead.
