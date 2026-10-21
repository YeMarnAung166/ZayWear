# DESIGN.md — Design System & UX Rules

**Version:** 1.1
**Status:** Active
**Related:** `V1.md`, `AGENT.md`

---

## 1. Design Principles

1. **Mobile-first.** Design at 375px, scale up. 90%+ of users are on phones.
2. **Burmese first.** Every screen designed with Burmese text; English is a toggle.
3. **One primary action per screen.** Reduce decisions.
4. **COD visible above the fold.** It is the #1 trust signal.
5. **Telegram is primary CTA on PDP.** Cart is secondary.
6. **Tap targets ≥ 44×44px.** Low-end devices have imprecise touch.
7. **Contrast ≥ 4.5:1.** Test with Stark.
8. **Fast.** LCP < 2.5s on 3G; images WebP; initial payload < 500KB.

---

## 2. Color Tokens

| Token | Hex | Usage |
|---|---|---|
| `primary/500` | `#1A1A1A` | Primary buttons, headings |
| `primary/600` | `#000000` | Hover |
| `accent/500` | `#C8102E` | Sale badges, primary CTAs |
| `accent/600` | `#A00D24` | Accent hover |
| `neutral/0` | `#FFFFFF` | Background |
| `neutral/50` | `#F7F7F7` | Card background |
| `neutral/200` | `#E5E5E5` | Borders, dividers |
| `neutral/500` | `#8A8A8A` | Secondary text, placeholders |
| `neutral/900` | `#111111` | Body text |
| `success/500` | `#2E7D32` | In stock, COD badge |
| `warning/500` | `#ED6C02` | Low stock, pending |
| `error/500` | `#D32F2F` | Out of stock, validation |
| `telegram/500` | `#229ED9` | Telegram icon, floating button (icon only) |
| `telegram/700` | `#0F6FA8` | Telegram buttons carrying text — verify ≥ 4.5:1 with Stark |

**Rule:** Use CSS variables / Tailwind theme tokens. Never hardcode hex.

---

## 3. Typography

| Style | Font | Size / Line Height | Weight | Usage |
|---|---|---|---|---|
| `display/lg` | Noto Sans Myanmar | 32 / 48 | 700 | Hero headline |
| `display/md` | Noto Sans Myanmar | 24 / 36 | 700 | Section titles |
| `heading/lg` | Noto Sans Myanmar | 20 / 30 | 600 | Page titles |
| `heading/md` | Noto Sans Myanmar | 18 / 27 | 600 | Card titles |
| `body/lg` | Noto Sans Myanmar | 16 / 24 | 400 | Body |
| `body/md` | Noto Sans Myanmar | 14 / 22 | 400 | Secondary |
| `body/sm` | Noto Sans Myanmar | 12 / 18 | 400 | Captions |
| `price/lg` | Inter | 20 / 28 | 700 | Product price |
| `price/md` | Inter | 16 / 24 | 600 | Cart price |
| `button/md` | Noto Sans Myanmar | 14 / 21 | 600 | Buttons |

**Rules:**
- Noto Sans Myanmar for all Burmese text; line-height ≥ 1.5× font size.
- Inter for prices and phone numbers (digit consistency).
- No font below 12px.

---

## 4. Spacing (4px grid, 8px rhythm)

| Token | Value |
|---|---|
| `space/1` | 4px |
| `space/2` | 8px |
| `space/3` | 12px |
| `space/4` | 16px |
| `space/5` | 24px |
| `space/6` | 32px |
| `space/8` | 48px |
| `space/10` | 64px |

---

## 5. Radius & Shadows

| Token | Value |
|---|---|
| `radius/sm` | 4px |
| `radius/md` | 8px |
| `radius/lg` | 16px |
| `radius/full` | 9999px |
| `shadow/sm` | `0 1px 2px rgba(0,0,0,0.05)` |
| `shadow/md` | `0 4px 12px rgba(0,0,0,0.08)` |
| `shadow/lg` | `0 8px 24px rgba(0,0,0,0.12)` |

---

## 6. Components

### Buttons
- `Button/Primary` — filled, `primary/500`
- `Button/Secondary` — outline, `neutral/200` border
- `Button/Telegram` — filled, `telegram/700`, with Telegram icon
- `Button/Ghost` — text only
- `Button/Icon` — circular, 44×44 min
- **Variants:** Default / Hover / Pressed / Disabled / Loading
- **Sizes:** SM / MD / LG

### Inputs
- `Input/Text` — Default / Focused / Filled / Error / Disabled
- `Input/Phone` — prefix `09` pre-filled
- `Input/Dropdown` — township list with search
- `Input/Textarea` — landmark, min 5 chars
- `Input/Quantity` — stepper, min 1, max stock

### Product Card
- Image ratio 3:4
- Name (2 lines max, truncate)
- Price (Inter, bold)
- Badge: New / Sale / Low stock / Out of stock
- Size chips (only if space allows; otherwise on PDP)

### Badges
- COD (green) — visible above the fold on PDP and checkout
- New (black)
- Sale (red)
- Out of stock (gray)
- Low stock (orange)

### Chips
- `Chip/Size` — Default / Selected / Out of stock / Disabled
- `Chip/Color` — Default / Selected, with swatch

### Navigation
- Header: logo left, nav center, search + cart right (desktop); hamburger (mobile)
- Cart badge: 0 / 1–9 / 10+
- Bottom nav (mobile, optional): Home / Categories / Search / Cart / Telegram

### Feedback
- `Toast` — Success / Error / Info / Warning
- `Modal` — Size chart, confirm
- `Drawer` — Cart (mobile)
- `Skeleton` — Product card, PDP, cart line
- `EmptyState` — Cart, search, orders
- `ErrorState` — 404, payment fail, network error

### Telegram
- `Telegram/FloatingButton` — fixed bottom-right, 56×56
- `Telegram/CTABanner` — full-width / inline / sticky bottom

---

## 7. Page Layouts

### Home
- Hero banner (1 slide, no carousel in v1)
- Category tiles (2–3)
- Featured grid (8 products, 2 cols mobile / 4 desktop)
- Telegram CTA banner

### Category
- Filter bar (mobile: horizontal scroll chips; desktop: sidebar)
- Sort dropdown
- Grid (2 / 3 / 4 cols)
- Empty state

### Product Detail
- Gallery (swipe mobile, thumbnails desktop)
- Price + COD badge
- Size selector + "Size guide" link → modal
- Color selector
- Stock status
- Primary CTA: "Order via Telegram" (filled, telegram color)
- Secondary CTA: "Add to Cart" (outline)
- Accordion: Description / Fabric & care / Delivery & returns

### Cart
- Line items (image, name, size, color, qty stepper, price)
- Subtotal
- Delivery note: "Calculated by township at checkout"
- Proceed to checkout
- Empty state

### Checkout
- Single page, minimal fields
- Order summary (collapsible mobile) showing subtotal, delivery fee, total
- Free-delivery hint when the cart is within the threshold
- Contact: name, phone (09 prefix)
- Delivery: township (dropdown, sets the delivery fee), address, landmark (required)
- Payment: COD (default, preselected) / KBZPay / Wave
- Totals visible before Place order — never a surprise fee at the door
- Place order button (sticky bottom on mobile)

### Order Success
- Order number
- Summary
- "We'll call you within 24 hours to confirm"
- Track on Telegram button
- Continue shopping

### Order Tracking
- Status timeline (placed → confirmed → packed → shipped → delivered)
- Terminal states rendered with plain explanation: `cancelled`, `refused`, `returned`
- Refusal reason shown when `refused`
- Tracking number if shipped
- Return/exchange button if delivered

### Admin Screens (Blade, functional only)
Deliberately undecorated — usability over polish, no Figma pass in v1.
- `/admin/orders` — list with status + date filter, 50 per page, phone and total visible
- `/admin/orders/{id}` — items, customer, full address, status buttons, tracking number input
- Auth: HTTP Basic via `ADMIN_PASSWORD`; no login screen, no session management

---

## 8. UX Rules (Non-Negotiable)

1. **Burmese default** on every page; English toggle persisted.
2. **Phone field** pre-fills `09`, accepts 9–11 digits total.
3. **Township dropdown**, not free text. Required.
4. **Landmark required**, min 5 chars, helper text in Burmese.
5. **COD preselected** on checkout.
6. **Telegram CTA is primary** on PDP; cart is secondary.
7. **Size chart one tap away** on every PDP.
8. **Stock status per variant** — disable out-of-stock sizes.
9. **Price format:** `25,000 MMK` (comma separators, MMK suffix).
10. **No email field required** anywhere.
11. **Offline banner** when `navigator.onLine` is false.
12. **Tap targets ≥ 44px.**
13. **Loading states** for every async action (skeleton, spinner).
14. **Error states** for every failure (inline, toast, page).
15. **No dead ends** — every empty/error state has a next action.
16. **Delivery fee visible before Place order** — the total shown at checkout is the amount collected at the door.
17. **Every order state has a customer-facing explanation** — including cancelled, refused, and returned.

---

## 9. Accessibility

- Contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text.
- Focus rings visible on all interactive elements.
- Alt text on all product images.
- Form labels associated with inputs.
- Error messages linked to inputs via `aria-describedby`.
- Keyboard navigable (desktop).
- Test with Stark plugin before launch.

---

## 10. Performance Budget

| Metric | Target |
|---|---|
| LCP (3G) | < 2.5s |
| CLS | < 0.1 |
| INP | < 200ms |
| Initial JS | < 200KB gzipped |
| Initial payload | < 500KB |
| Image format | WebP, lazy-loaded |
| Fonts | Preload Noto Sans Myanmar subset |

---

## 11. Figma File Structure

Myanmar Apparel E-Commerce
├── 00 — Cover & Index
├── 01 — Design System
├── 02 — Components
├── 03 — Patterns
├── 04 — Mobile Screens (375px)
├── 05 — Desktop Screens (1440px)
├── 06 — Telegram Bot Flows
├── 07 — States & Edge Cases
├── 08 — Prototype
└── 09 — Handoff Notes


**Plugins:** Tokens Studio, Unsplash, Content Reel, Iconify, Stark, Autoflow.

**Note:** Admin Blade screens are intentionally not designed in v1 (see §7). Figma covers the storefront and bot flows only.

---

## 12. Related Documents

- `GOAL.md`, `V1.md`, `AGENT.md`
- `ARCHITECTURE.md`, `API.md`, `TELEGRAM.md`

---

## 13. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | [date] | Initial design system |
| 1.1 | 2026-10-20 | Resolved token and typography contradictions; checkout totals, tracking terminal states, admin screens |