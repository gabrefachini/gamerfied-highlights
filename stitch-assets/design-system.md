---
name: Obsidian High-Contrast
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#383939'
  surface-container-lowest: '#0d0e0f'
  surface-container-low: '#1b1c1c'
  surface-container: '#1f2020'
  surface-container-high: '#292a2a'
  surface-container-highest: '#343535'
  on-surface: '#e3e2e2'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e3e2e2'
  inverse-on-surface: '#303031'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#edffe1'
  on-secondary: '#013a00'
  secondary-container: '#28ff1d'
  on-secondary-container: '#027100'
  tertiary: '#ffffff'
  on-tertiary: '#313030'
  tertiary-container: '#e5e2e1'
  on-tertiary-container: '#656464'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#77ff61'
  secondary-fixed-dim: '#02e600'
  on-secondary-fixed: '#002200'
  on-secondary-fixed-variant: '#015300'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#121414'
  on-background: '#e3e2e2'
  surface-variant: '#343535'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  container-max: 1200px
  gutter: 24px
  margin: 32px
---

## Brand & Style
The design system embodies a premium, developer-centric aesthetic characterized by high-contrast minimalism. It is designed for high-performance tools where focus is paramount. By utilizing a pure black foundation, the UI recedes into the background, allowing content and "highlights" to take center stage.

The style draws from the **Minimalism** and **Modern Corporate** movements, specifically echoing the precision of technical tools like Linear and Raycast. The emotional response is one of total control, speed, and refined professionalism. Visual noise is aggressively eliminated, favoring generous whitespace and razor-sharp clarity over decorative elements.

## Colors
This design system utilizes a strictly limited palette to maintain its high-contrast identity.
- **Base:** The background is absolute pure black (`#000000`) to create infinite depth on OLED displays.
- **Primary:** Pure white (`#FFFFFF`) is used for primary text and high-priority actions to ensure maximum legibility.
- **Success/Active:** The "Neon Green" (`#00FF00`) is used sparingly. It is reserved exclusively for success states, active connectivity indicators, or signifying a completed "highlight."
- **Surfaces:** Containers and surfaces use deep grays (starting at `#0A0A0A`) to provide subtle separation without breaking the dark immersion.
- **Borders:** Low-contrast borders (`#1F1F1F`) are used for structural definition.

## Typography
The system relies entirely on **Inter**, leveraging its geometric precision and excellent legibility at small scales. 
- **Headlines:** Use tight letter spacing and bold weights to create a sense of authority. 
- **Body:** Standardized at 16px and 14px for optimal reading against a dark background.
- **Labels:** Small caps or increased letter spacing are used for metadata to distinguish it from body content.
- **Contrast:** Always use pure white for primary content, and a mid-tone gray (`#888888`) for secondary or "de-emphasized" information.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a maximum container width of 1200px for desktop. It uses an 8px base unit system to ensure consistent proportions.
- **Whitespace:** Elements are given significant breathing room to prevent the interface from feeling cramped, a hallmark of premium technical tools.
- **Alignment:** Strict adherence to a 12-column grid on desktop.
- **Mobile:** Margins shrink to 16px, and multi-column layouts reflow to a single vertical stack. 
- **Consistency:** Padding inside containers (like cards or modals) should consistently be 24px (`lg`) to maintain a sense of openness.

## Elevation & Depth
Depth is created through **Tonal Layering** rather than heavy shadows. In a pure black environment, shadows are often invisible or muddy.
- **Layering:** Level 0 is pure black. Level 1 (Surfaces) is a very dark gray (`#0A0A0A`). Level 2 (Modals/Popovers) is slightly lighter (`#141414`).
- **Outlines:** Subtle, low-opacity borders (`1px solid #1F1F1F`) define the edges of containers. 
- **Active State:** Instead of shadows, use a subtle white inner-glow or a change in border brightness to indicate elevation or focus.

## Shapes
The shape language is sophisticated and modern. A standard radius of **8px** (Level 2) is applied to all primary UI elements including buttons, input fields, and cards. 
- **Consistency:** Larger containers like modals or main content areas should use 16px (`rounded-lg`) to maintain a nested visual harmony.
- **Interactive Elements:** Small elements like tags or badges may use a slightly smaller radius (4px) to appear sharper and more technical.

## Components
- **Buttons:** Primary buttons are pure white with black text. Secondary buttons are transparent with a thin white or dark gray border. High-impact "success" actions use the Green accent.
- **Input Fields:** Backgrounds are slightly lighter than the main page (`#0A0A0A`). On focus, the border transitions from dark gray to pure white.
- **Chips/Badges:** Small, subtle containers with a `#1A1A1A` background. If representing an active filter or "live" state, use the Green accent color for the text or a small leading dot.
- **Cards:** No shadows. Defined by a `#1F1F1F` border and a `#0A0A0A` background.
- **Command Palette:** Inspired by Raycast, this component is central. It should feature a backdrop blur of 20px over a semi-transparent dark surface to provide a sense of focus and overlay.
- **Lists:** Clean lines with `#1F1F1F` dividers. Hover states should use a subtle background shift to `#141414`.