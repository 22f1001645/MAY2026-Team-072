# **EKATVA BRAND KIT & DESIGN SYSTEM**

**Version 1.0 | January 2025** **For:** Portfolio Website, Sponsorship Decks, Emails, Social Media, Future Regional Editions

## **1\. BRAND VISUAL PHILOSOPHY**

### **Core Truth**

**EKATVA** is the physical manifestation of digital connection — where scattered IITM BS students become one community. The visual system must feel:

* **Warm, not corporate** (celebration, not transaction)  
* **Unified, not chaotic** (oneness amid diversity)  
* **Authentic, not polished** (student-led, not institutionally sterile)  
* **Cultural, not gimmicky** (rooted in tradition, not trendy)

### **Design Ethos**

Every visual decision reflects EKATVA's Sanskrit meaning: **Oneness (एकत्व)**.

**Unity through:**

* Circular/mandala motifs (interconnection)  
* Gradients that blend rather than contrast (smooth transitions)  
* Symmetric layouts (balance)

**Celebration through:**

* Vibrant accent colors (joy without overwhelming)  
* Dynamic photography (candid energy)  
* Generous white space (breath amid excitement)

**Authenticity through:**

* Hand-crafted logo elements (not generic)  
* Real student photography (not stock images)  
* Natural typography hierarchy (readable, not over-designed)

## **2\. COLOR SYSTEM**

### **PRIMARY COLORS (Brand Anchors)**

| Color | Hex | Purpose | Emotional Meaning |
| :---- | :---- | :---- | :---- |
| **Ekatva Teal** | \#5CE6C9 | Primary brand color, CTAs, highlights, links | Freshness, energy, youth, community |
| **Unity Gold** | \#FFCF96 | Headings, accents, celebration | Warmth, belonging, cultural heritage |
| **Oneness Black** | \#030907 / oklch(0.13 0.015 175) | Backgrounds, grounding | Depth, sophistication, canvas for color — teal-tinted, not flat gray |

**Usage Rules:**

* **Teal:** Use for interactive elements (buttons, links), never as large background blocks.  
* **Gold:** Headlines, decorative accents, never body text (contrast issues).  
* **Black:** Primary background for dark mode designs, never pure black text on white (use \#1A1A1A). Onyx carries a deliberate teal hue (H≈175°, matching Ekatva Teal) at very low chroma (\~0.015) — a generic achromatic black reads sterile/corporate, which the brand explicitly rejects (§1).

### **SECONDARY COLORS (Supporting Roles)**

| Color | Hex | Purpose |
| :---- | :---- | :---- |
| **Deep Teal** | \#1F4F59 | Section headers, dark UI elements |
| **Gradient Dark** | \#0E2F36 | Gradient transitions, card backgrounds |
| **Accent Turquoise** | \#3FD4B6 | Hover states, secondary CTAs |

**Usage:**

* **Gradients:** linear-gradient(135deg, \#1F4F59 0%, \#0E2F36 100%)  
* Never use secondary colors as standalone—always in gradients or paired with primaries.

### **NEUTRAL COLORS**

| Color | Hex | Purpose |
| :---- | :---- | :---- |
| **Pure White** | \#FFFFFF | Clean backgrounds, light mode |
| **Off-White** | \#F8F8F8 | Section alternates |
| **Light Gray** | \#AAAAAA | Secondary text, captions |
| **Mid Gray** | \#666666 | Body text on light backgrounds |
| **Divider Gray** | \#333333 | Subtle borders, separators |
| **Near Black** | \#111111 | Text on white/light backgrounds |

**Accessibility:** All text meets WCAG AA standards (4.5:1 contrast minimum).

### **STATUS COLORS (implemented in product UI, not in v1.0 palette above)**

Ekatva OS product surfaces (toasts, badges, buttons, form states) use a fixed semantic triad for non-brand status, consistent across `Button`, `Badge`, `Toast`, and page-level alerts:

| Color | Hex range (Tailwind) | Purpose |
| :---- | :---- | :---- |
| **Success** | Emerald 400–500 | Confirmations, approved/paid states |
| **Warning** | Amber 400 | Pending/changes-requested states |
| **Danger** | Red 300–500 | Errors, rejected/revoked states, destructive actions |

These never substitute for Teal/Gold — they're reserved for system feedback (success/warn/error), always paired with a matching soft background (`/10–/15` opacity) and border (`/25–/40` opacity), not solid fills.

## **3\. TYPOGRAPHY SYSTEM**

**PRIMARY TYPEFACE: Poppins**

* **Why?** Geometric sans-serif, modern, readable, wide weight range (400–700).  
* **Font Stack:** font-family: 'Poppins', Arial, Helvetica, sans-serif;

### **HIERARCHY**

| Element | Weight | Size (Desktop) | Size (Mobile) | Line Height | Use Case |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **H1 Hero** | 700 | 48px | 32px | 1.2 | Landing pages |
| **H1 Section** | 700 | 36px | 28px | 1.2 | Section titles |
| **H2** | 600 | 28px | 24px | 1.3 | Subsections |
| **H3** | 600 | 20px | 18px | 1.4 | Cards, highlights |
| **Body** | 400 | 16px | 16px | 1.6 | Paragraphs |
| **Caption** | 400 | 12px | 12px | 1.5 | Labels, footnotes |
| **CTA** | 700 | 14px | 14px | 1.2 | Buttons (Uppercase) |

## **4\. LOGO USAGE RULES**

### **LOGO VARIANTS**

1. **Primary Logo:** Ornate badge with mandala motifs, "EKATVA" in bold rectangle, tagline "Unite. Inspire. Celebrate."  
2. **Icon-Only Version:** A simplified version of the mandala/badge motif for use in social profile pictures, favicons, and small-scale mobile applications.

### **CLEAR SPACE & SIZE**

* **Minimum Padding:** Equal to the height of the "E" in EKATVA on all sides.  
* **Minimum Size (Digital):** 120px width (Main logo); 32px (Icon-only).  
* **Minimum Size (Print):** 1.5 inches width.

### **BACKGROUNDS**

* **Dark (\#050505):** Use Full-color logo.  
* **Light (\#FFFFFF):** Use Logo with dark border or dark-background variant.  
* **Photography:** Use 40-60% dark overlay before placing the logo.

## **5\. SPACING & LAYOUT PHILOSOPHY**

### **SPATIAL SYSTEM (8px Base Unit)**

* **Micro (8px):** Icon padding.  
* **Small (16px):** Between related elements (Caption → Image).  
* **Medium (24px):** Card padding, paragraph spacing.  
* **Large (40px):** Between sections.  
* **Hero (80px+):** Landing page breathing room.

### **ALIGNMENT**

* **Hero Sections:** Center-aligned.  
* **Body Content:** Left-aligned (Never justify).  
* **Max Text Width:** 680px for optimal readability.

### **SHAPE (implemented, not in v1.0 spec above)**

* **Buttons & Badges:** Fully rounded (pill shape) — never squared corners.  
* **Cards:** 20px radius.  
* **Inputs:** 12px radius (`rounded-xl`).

### **FOCUS STATE (implemented, not in v1.0 spec above)**

* All interactive elements (buttons, inputs) show a 2px Teal focus ring at 40–50% opacity on keyboard focus — required for WCAG keyboard-navigation compliance, not optional polish.

## **6\. IMAGE & VIDEO TREATMENT**

### **PHOTOGRAPHY STYLE**

* **Framing:** Candid \> Posed. Capture authentic emotion.  
* **Subjects:** Students interacting. Never solitary portraits.  
* **Color Grading:** Slight warmth (+5% saturation, \+10 color temp).  
* **Authenticity:** Minimal retouching. Keep imperfections to preserve "real energy."

### **NOSTALGIA ELEMENTS**

* Subtle film-grain texture overlay (10% opacity).  
* Soft vignette on edge of photos.  
* Polaroid-style borders for "throwback" social posts.

## **7\. MOTION & MICRO-INTERACTION**

**Intent:** Guide attention, provide feedback, and enhance storytelling.

### **SCROLL & TRANSITION**

* **Scroll-Triggered Animations:** The website utilizes parallax on hero backgrounds and fade-in reveals for sections (20px upward slide \+ opacity 0→1).  
* **Hover States:**  
  * **CTAs:** Scale 1.02, background lighten 10% (0.3s ease).  
  * **Cards:** Lift 4px shadow, border glow (0.3s).  
* **Easing:** Standard Material Design ease cubic-bezier(0.4, 0, 0.2, 1).

## **8\. VISUAL DO'S & DON'TS**

### **DO ✅**

* Use Teal for energy, Gold for warmth.  
* Maintain 1.6 line-height for readability.  
* Show diversity in student photography.  
* Use white space as an emotional tool for "breathing room."

### **DON'T ❌**

* Use SaaS-style sterile visuals or navy blue corporate schemes.  
* Use stock photos of handshakes or generic office settings.  
* Over-gamify with neon colors everywhere or "fun" fonts like Comic Sans.  
* Distort the logo or change its core colors.

## **9\. BRAND GUARDRAILS FOR FUTURE EDITIONS**

### **Scaling Across Cities**

* **Regional Accents:** Each city edition (Delhi, Mumbai, etc.) has the freedom to introduce **one local tertiary accent color** (e.g., Saffron for Delhi, Ocean Blue for Mumbai) while keeping Teal and Gold as the primary anchors.  
* **Language:** All official branding and core materials remain **English-only** to maintain consistency across the national IITM BS community.

### **Evolution Timeline**

* **Lock Period:** This Brand Kit is locked for **1 year** (until Jan 2026).  
* **Refresh:** A brand health check should be evaluated annually, but the logo remains untouched for a minimum of 3 years.

**EKATVA: Unite. Inspire. Celebrate.**