---
name: Helpdesk
description: Premium editorial workspace for customer support and engineering teams
colors:
  primary: "#7c3aed"
  neutral-bg: "#ffffff"
  neutral-fg: "#111111"
  card: "#ffffff"
  muted: "#f7f6f3"
  muted-fg: "#787774"
  border: "#eaeaea"
  accent-green: "#edf3ec"
  accent-green-fg: "#346538"
  accent-yellow: "#fbf3db"
  accent-yellow-fg: "#956400"
  accent-red: "#fdebec"
  accent-red-fg: "#9f2f2d"
typography:
  display:
    fontFamily: "Instrument Serif, Playfair Display, Georgia, serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 300
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "SF Pro Display, Geist Sans, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "SF Pro Display, Geist Sans, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "SF Pro Display, Geist Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Mono, SF Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.05em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "#6d28d9"
  button-secondary:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.neutral-fg}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "24px"
---

# Design System: Helpdesk

## 1. Overview

**Creative North Star: "The Editorial Workshop"**

Helpdesk is designed with a premium, document-like editorial aesthetic that emphasizes content structure, legibility, and restraint. Instead of relying on typical high-saturation SaaS patterns, gradient fills, and heavy shadows, the interface focuses on precise alignment, generous whitespace, high typographic contrast, and a warm monochrome base. Color is treated as a premium semantic resource, reserved almost exclusively for status alerts and actionable indicators.

Key Characteristics:
- **Clean White Canvas**: High-density flat white background `#ffffff` with minimal structural borders.
- **Typographic Axis**: Elegant serif display titles paired with clean, geometric sans-serif user interface typography.
- **Restrained Spot Color**: High-contrast desaturated pastels for metadata and labels, reserving the primary deep violet only for key interactions.
- **Crisp Structural Borders**: Thin dividers and border lanes replacing ambient drop shadows for separation.

## 2. Colors

The Helpdesk palette is built on a clean monochrome foundation with functional desaturated accent zones.

### Primary
- **Deep Violet** (#7c3aed / oklch(0.527 0.280 287)): Used for primary action affordances, active menu highlights, and focus ring borders.

### Neutral
- **Pure Canvas** (#ffffff / oklch(0.99 0 0)): The main app background and card container layer, presenting a clean and distraction-free surface.
- **Bone Neutral** (#f7f6f3 / oklch(0.965 0.003 270)): Used for secondary button fills, sidebars, and nested metadata backgrounds.
- **Ink Charcoal** (#111111 / oklch(0.13 0.012 270)): Used for main text, headings, and high-contrast solid button fills.
- **Muted Stone** (#787774 / oklch(0.48 0.008 270)): Used for supporting text, labels, placeholder copy, and inactive state details.
- **Crisp Border** (#eaeaea / oklch(0.92 0.003 270)): Used for dividing lines and structural cards.

### Accents
- **Washed Green** (#edf3ec / oklch(0.95 0.01 120)): Used for resolved ticket status backgrounds, success states, and positive badges.
- **Washed Yellow** (#fbf3db / oklch(0.95 0.02 85)): Used for open ticket status backgrounds and caution alerts.
- **Washed Red** (#fdebec / oklch(0.95 0.03 20)): Used for new ticket status backgrounds, high-priority tasks, and destructive buttons.

**The Ten Percent Rule.** Accent colors and primary deep violet fills should occupy no more than 10% of any given interface screen to maintain their focus value.

## 3. Typography

**Display Font:** Instrument Serif, Playfair Display (with system-serif fallback)
**Body Font:** SF Pro Display, Geist Sans (with system-sans-serif fallback)
**Label/Mono Font:** Geist Mono, SF Mono (with monospace fallback)

Typography utilizes extreme contrast in font family, size, and weight to establish hierarchical depth.

### Hierarchy
- **Display** (Light 300, clamp(2rem, 5vw, 3.5rem), 1.1): Used for large hero titles, onboarding headlines, and major page headers.
- **Headline** (Semi-Bold 600, 1.5rem, 1.25): Used for primary page headers and board columns.
- **Title** (Semi-Bold 600, 1.125rem, 1.3): Used for sidebar headings, card titles, and modal headers.
- **Body** (Regular 400, 0.875rem, 1.6): Used for ticket descriptions, task bodies, user details, and email drafts. Restricted to a maximum width of 75ch.
- **Label** (Medium 500, 0.75rem, 1.2, letter-spacing 0.05em): Used for status tags, metadata chips, table headers, and keyboard indicators.

**The Balanced Line Rule.** Display headings must always use `text-wrap: balance` to prevent awkward typography wrapping on small viewports, and body paragraphs must use `text-wrap: pretty` to eliminate orphans.

## 4. Elevation

The visual system is flat by default. Depth is conveyed strictly via layout positioning, clear borders, and high contrast typography. Shadows are prohibited as a styling default.

**The Flat-By-Default Rule.** Elements are flat at rest. Diffuse low-opacity shadows (opacity < 0.04) appear only on interactive hover, modal dialog elevations, or absolute overlays to separate them from the canvas.

### Shadow Vocabulary
- **Interactive Hover** (`box-shadow: 0 2px 8px rgba(0,0,0,0.04)`): Applied to cards and primary action icons during active cursor hover.
- **Floating overlay** (`box-shadow: 0 4px 16px rgba(0,0,0,0.08)`): Applied to popovers, dropdown lists, and modal windows.

## 5. Components

Components follow a crisp, clean layout built with subtle rounded corners and thin borders.

### Buttons
- **Shape:** Crisp edges (4px radius)
- **Primary:** Solid Deep Violet fill (#7c3aed), white text. Padding: 8px 16px.
- **Secondary:** Solid Bone Neutral fill (#f7f6f3), charcoal text. Padding: 8px 16px.
- **Hover / Focus:** Scale transform (scale(0.98)) on active, with slight contrast shift (darken by 5%) on hover.

### Cards / Containers
- **Corner Style:** Rounded corners (8px radius)
- **Background:** Pure White (#ffffff)
- **Border:** Thin solid border (1px solid #eaeaea)
- **Internal Padding:** Generous spacing (24px)

### Inputs / Fields
- **Style:** Pure white background, border (1px solid #eaeaea), crisp edges (4px radius).
- **Focus:** Outline focus ring with Deep Violet border highlight.
- **Error:** Accent red border (1px solid #9f2f2d) and washed red background.

### Navigation
- **Style:** Sticky top-bar, pure white background, border-bottom (1px solid #eaeaea). Navigation links use sans-serif typography (0.875rem), transitioning from muted stone to ink charcoal on hover.

## 6. Do's and Don'ts

### Do:
- **Do** wrap display titles in serif typography with tight letter spacing (-0.02em).
- **Do** use thin borders (1px solid #eaeaea) instead of shadows for card borders and section separators.
- **Do** pair desaturated pastel backgrounds with high-contrast text for badges and chips.
- **Do** restrict body paragraph widths to 65-75ch to ensure reading ease.

### Don't:
- **Don't** use heavy dropshadows or dark outlines on cards.
- **Don't** use neon colors or gradients for text, headings, or section backgrounds.
- **Don't** use over-rounded pill shapes (32px+) on cards, inputs, or textareas.
- **Don't** use border-left or border-right side stripes as colored badges.
- **Don't** default to standard sans-serif for display headings; preserve the Serif display option.
