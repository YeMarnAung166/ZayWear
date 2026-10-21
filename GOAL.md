# GOAL.md — Project Vision & Full Scope

**Project:** Myanmar Apparel E-Commerce
**Version:** 1.0
**Status:** Active
**Owner:** Solo developer-founder
**Last updated:** [date]

---

## 1. Vision

Build a direct-to-consumer apparel store for men's and women's clothing in Myanmar that
makes online clothes shopping **trustworthy, fast, and locally relevant** — mobile-first,
Burmese-language, COD-first, and orderable in under 60 seconds via Telegram.

The long-term goal is a sustainable small business, not a venture-scale marketplace.
Success is measured in repeat customers and operational reliability, not in traffic.

---

## 2. The Problem

Myanmar online apparel buyers face:

- **Trust deficit** — fake sellers on Facebook; reluctance to prepay.
- **Address reality** — no street-address system; delivery depends on township + landmark + phone.
- **Size ambiguity** — inconsistent sizing; no size charts; costly exchanges.
- **Payment fragmentation** — near-zero card penetration; COD dominates; wallets (KBZPay, Wave) growing.
- **Delivery uncertainty** — no tracking; buyers don't know when to expect the order.
- **Language** — English-only sites lose trust; Burmese-first is expected.

---

## 3. Product Principles

1. **COD is the default, not an option.** Prepayment is the exception.
2. **Telegram is a first-class sales channel**, not a notification tool.
3. **Mobile-first, low-end Android first.** Test on cheap devices, slow networks.
4. **Burmese first, English second.** Every screen, every state.
5. **One primary action per page.** Reduce decisions, not add them.
6. **Township + landmark > free-text address.** Design for how delivery actually works.
7. **Ship weekly. Measure monthly. Scale only when a metric demands it.**
8. **Boring stack, standard patterns.** Novelty is a cost, not a feature.

---

## 4. Full Scope (Long-Term)

The full product, over 12–24 months, includes:

### 4.1 Commerce
- Product catalog (men, women, categories, sizes, colors, stock per variant)
- Size charts (Asian sizing, cm + inches)
- Cart and checkout
- COD + KBZPay + Wave Money
- Order lifecycle and tracking
- Returns and exchanges
- Promo codes and discounts
- Customer accounts (phone + OTP)
- Order history
- Wishlist
- Reviews (collected via Telegram, displayed on PDP)

### 4.2 Channels
- Mobile-first website (Next.js)
- Telegram bot (order flow, status, help)
- Telegram channel (broadcast catalog, new arrivals)
- Facebook page (discovery, ads)
- TikTok (short-form content)

### 4.3 Operations
- Admin dashboard (orders, status, shipments, metrics)
- Logistics integration (COD collection, remittance reconciliation)
- Payment reconciliation
- Inventory management
- Customer support workflows (Telegram handoff)

### 4.4 Growth
- Facebook/TikTok ads
- Influencer seeding
- Referral program
- Loyalty points
- Email/SMS re-engagement (later)

### 4.5 Platform
- Multi-language (Burmese, English, later Shan/Karen)
- Multi-warehouse (later)
- International shipping (later)

---

## 5. Success Metrics (Long-Term)

| Horizon | Metric | Target |
|---|---|---|
| 3 months | First 10 real orders | ≥ 10 |
| 3 months | COD refusal rate | < 30% |
| 6 months | Repeat customers | ≥ 10% of buyers |
| 6 months | Median delivery time | ≤ 7 days |
| 12 months | Monthly orders | ≥ 200 |
| 12 months | Monthly revenue | [target] |
| 12 months | Customer acquisition cost | < [target] |

---

## 6. Constraints

- **Solo founder.** Time is the scarcest resource.
- **Myanmar market.** COD, township addresses, Burmese language, eComReg compliance.
- **Low-end devices.** Android 8+, 2GB RAM, 3G networks.
- **Budget.** Managed services in v1; self-hosted later as a learning exercise.
- **Compliance.** eComReg registration mandatory before launch.

---

## 7. Non-Goals (Permanent)

- Marketplace / multi-seller model.
- Subscription / rental.
- International shipping (until v2+).
- Venture-scale growth at the expense of profitability.
- Feature parity with global e-commerce giants.

---

## 8. Roadmap (High-Level)

| Phase | Focus | Duration |
|---|---|---|
| V1 | Ship the core store + bot; first 10 orders | 4–5 weeks |
| V1.1 | Observability, queues, admin dashboard | 2 weeks |
| V1.2 | Deliberate VPS migration (learning) | 1 week |
| V2 | Accounts, reviews, promo codes, search | 4–6 weeks |
| V3 | Growth features (referrals, loyalty, ads) | Ongoing |

See `V1.md` for the detailed v1 scope and `BACKLOG.md` for prioritization.

---

## 9. Related Documents

- `V1.md` — v1 scope and acceptance criteria
- `DESIGN.md` — design system and UX rules
- `AGENT.md` — AI agent operating instructions
- `ARCHITECTURE.md` — system architecture and data model
- `API.md` — API specification
- `TELEGRAM.md` — bot specification
- `BACKLOG.md` — prioritized backlog
- `RUNBOOK.md` — operational procedures
- `CHANGELOG.md` — version history

---

## 10. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | [date] | Initial goal document |