---
name: Kinetic Atelier
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#3f4946'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#6f7976'
  outline-variant: '#bec9c5'
  surface-tint: '#21695f'
  primary: '#00433b'
  on-primary: '#ffffff'
  primary-container: '#0d5c52'
  on-primary-container: '#8ed2c5'
  inverse-primary: '#8fd3c6'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#00433e'
  on-tertiary: '#ffffff'
  tertiary-container: '#005c55'
  on-tertiary-container: '#7ed4ca'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#abf0e2'
  primary-fixed-dim: '#8fd3c6'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005047'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#9cf2e8'
  tertiary-fixed-dim: '#80d5cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#00504a'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.011em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 21px
    letterSpacing: -0.006em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 19px
    letterSpacing: 0em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.01em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.5rem
  gutter-lg: 1.5rem
  margin: 1.5rem
  margin-mobile: 0.75rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system supports an AI-augmented workspace integrating asynchronous documentation, real-time messaging, and deterministic issue tracking. The visual tone is engineered for uninterrupted deep work: calm, architectural, dense, and uncompromisingly fast.

### Aesthetic Foundation
- **Precision Modernism**: A fusion of structural grid ergonomics and tactile software utilities. Whitespace is purposeful and compressed; borders are structural hairpins rather than stylistic ornament.
- **Instrumental Restraint**: Avoid generic AI chromatic glow, holographic gradients, and floating orb motifs. AI presence is rendered as an analytical collaborator through crisp typographic highlights, monospaced metadata, and discrete emerald telemetry accents.
- **Cognitive Clarity**: The UI recedes behind user content. Navigation frames use muted warm off-white slate backdrops, leaving pure white surfaces for active focus targets (documents, active threads, issue boards).

## Colors

The palette establishes high semantic rigor, distinguishing systemic UI controls, user-created content, and machine-generated insights without visual fatigue.

### Color Tokens & Roles
- **Primary Canvas (`#F8F9FA`)**: Grounding foundation for application sidebars, navigation panels, and inactive work areas.
- **Surface Elevation (`#FFFFFF`)**: Pure white reserved for focal surfaces—editable document bodies, message feeds, issue cards, and modal canvases.
- **Primary Brand Accent (`#0D5C52`)**: Deep architectural pine green used for committed actions, active channel markers, primary key-bind badges, and selected navigation states.
- **Secondary Highlight (`#10B981`)**: Refined emerald mint for AI inference markers, system health telemetry, user presence nodes, and git-like merge confirmations.
- **Tertiary Accent (`#0F766E`)**: Intermediate teal for interactive hover states, secondary focus rings, and segmented control highlights.
- **Primary Typography (`#111827`)**: Near-black charcoal delivering WCAG AAA contrast against white cards and slate canvas planes.
- **Muted Structural Borders (`#E2E8F0`)**: Hairline dividers providing structural containment without visual clutter.

## Typography

The typography pairs a structural geometric grotesque with an analytical monospaced companion.

### Type Hierarchy Strategy
- **Titles & Document Structure (`Hanken Grotesk`)**: Provides sharp, non-distracting headers that hold up across high-density kanban columns, rich-text markdown blocks, and nested channel headers.
- **Reading & Conversation (`Inter`)**: Tuned for prolonged reading comfort in long-form issue descriptions, inline review threads, and continuous message streams.
- **Telemetry & Controls (`JetBrains Mono`)**: Strict, monospaced application for keyboard shortcuts (`Cmd+K`, `Shift+I`), sprint cycle counters, timestamps, issue identifiers (`ENG-8492`), and AI reasoning tokens.

## Layout & Spacing

The layout operates on a compact 4px base baseline module designed for multi-column enterprise operations.

### Grid & Composition
- **Desktop Architecture**: A multi-pane split model composed of an anchored utility bar (48px), collapsible tree navigator/inbox (240px–320px), primary work canvas (flexible fluid width, min 640px), and an optional contextual flyout inspector (360px).
- **Responsive Adaptations**:
  - *Desktop (>1280px)*: Full 3-to-4 pane visibility with persistent keyboard focus anchors.
  - *Tablet (768px–1279px)*: Main navigator collapses to icon-only rail; context flyout moves to an overlay drawer.
  - *Mobile (<768px)*: Full-width single-context view utilizing bottom-sheet navigation switches and stacked thread views.
- **Rhythm Rules**: Dense lists (issue feeds, chat logs) adopt `space-xs` and `space-sm` vertical spacing to minimize scrolling and maximize vertical information density.

## Elevation & Depth

Visual hierarchy is maintained through subtle tonal contrast and razor-sharp border outlines rather than pronounced shadows.

### Elevation System
- **Layer 0 (Canvas Base)**: `#F8F9FA` background tone. No shadow, 0px offset.
- **Layer 1 (Card & Content Panes)**: Solid `#FFFFFF` fill bounded by a 1px border of `#E2E8F0`. Non-directional surface separation.
- **Layer 2 (Floating Popovers, Command Palettes, Menus)**: `#FFFFFF` fill with a dual-stage shadow:
  - Ambient: `0 1px 3px 0 rgba(17, 24, 39, 0.05)`
  - Direct: `0 8px 24px -4px rgba(17, 24, 39, 0.08)`
  - Edge treatment: `1px solid rgba(226, 232, 240, 0.8)`
- **Layer 3 (Modals & Blockers)**: `#FFFFFF` fill framed by `0 20px 48px -12px rgba(17, 24, 39, 0.16)` overlaying a slate backdrop scrim (`#111827` at 20% opacity with 2px backdrop blur).

## Shapes

The design system maintains a calibrated, technical corner radius (`0.25rem` / `4px`) evoking functional utility instruments.

### Curvature Taxonomy
- **Standard Controls (Inputs, Buttons, Badges)**: 4px border radius. Keeps interfaces compact and enables edge-to-edge alignment in dense tables.
- **Intermediate Shells (Cards, Flyout Drawers)**: 6px to 8px (`rounded-lg`). Provides containment for text blocks and rich media items without feeling playful.
- **Status Indicators & Avatars**: Circular (`9999px`) to immediately distinguish identity tokens, presence states, and priority tags from structural cards and interactive inputs.

## Components

### Buttons
- **Primary**: Background `#0D5C52`, text `#FFFFFF`, hover `#0F766E`, active `#0B4F46`. Border radius 4px. Height: 32px (compact), 36px (default). Internal horizontal padding: 12px.
- **Secondary**: Background `#FFFFFF`, text `#111827`, border `1px solid #E2E8F0`, hover background `#F4F5F6`.
- **Keyboard Badges**: Rendered alongside button text using `label-sm` font, background `rgba(17, 24, 39, 0.06)`, border radius 2px, padding `1px 4px`.

### Command Palette (`Cmd+K`)
- **Container**: Layer 2 elevation, width 640px, anchored top 15% viewport.
- **Input**: Borderless 44px text box using `headline-sm`, placeholder `#94A3B8`.
- **Row Item**: Height 36px, `body-sm` font, dynamic highlight `#F4F5F6` with an active indicator strip (`2px` solid `#0D5C52`) on the leading edge.

### Issue & Task Cards
- **Structure**: Surface white (`#FFFFFF`), border `1px solid #E2E8F0`, interior padding `space-md`.
- **Metadata Layout**: Issue identifier in `label-sm` (`#64748B`), title in `body-sm` (`#111827`, weight 500), trailing status nodes for priority, assignee avatar, and sprint cycle.
- **Hover State**: Border shifts to `#CBD5E1`; subtle elevation lift (`0 2px 8px -2px rgba(17, 24, 39, 0.06)`).

### Interactive Chat Threads
- **Message Grouping**: Avatar (28px circle) positioned top-left; author handle (`body-sm`, weight 600) and monospaced timestamp (`label-sm`, `#94A3B8`) top-aligned.
- **Message Body**: Text rendered in `body-md` (`#1E293B`).
- **Inline Actions**: Floating micro-bar pinned to message top-right on hover; contains reaction picker, reply-in-thread, and convert-to-issue actions.

### AI Telemetry & Synthesis Cards
- **Style**: Subtle green tinting (`#F0FDF4` surface), left-accent border `2px solid #10B981`.
- **Header**: Icon badge in `#0D5C52` accompanied by `label-md` badge "AI SYNTHESIS".
- **Interaction**: Monospaced citation chips referencing specific document blocks or issue IDs.

### Input Fields & Search Bars
- **Frame**: Height 32px, background `#FFFFFF`, border `1px solid #E2E8F0`, padding `0 8px`.
- **Focus**: Border `#0D5C52`, ring outline `2px solid rgba(13, 92, 82, 0.15)`. No animation delay.

### Checkboxes & Segmented Controls
- **Checkboxes**: 16x16px square, 3px border radius. Unchecked: `1.5px solid #CBD5E1`. Checked: Background `#0D5C52`, border `#0D5C52`, white vector checkmark.
- **Segmented Toggles**: Encapsulated `#F1F5F9` track, 28px height, segmented active button with `#FFFFFF` background, `0 1px 2px rgba(0,0,0,0.05)` shadow, and 3px border radius.