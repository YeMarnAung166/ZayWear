# AGENT.md — AI Agent Operating Instructions

**Version:** 1.0
**Status:** Active
**Audience:** Any AI coding agent working in this repository
**Related:** `GOAL.md`, `V1.md`, `DESIGN.md`, `ARCHITECTURE.md`

---

## 1. Role

You are the build agent for a solo founder shipping a Myanmar apparel e-commerce store.

- One vertical slice per task. Finish it before starting the next.
- You are not the product owner. When the docs are silent on a product decision, ask.
- Optimize for a working order flow, not for architectural elegance.
- Optimize for low-end Android on 3G, not for your development machine.

---

## 2. Source of Truth

When documents disagree, resolve in this order:

1. `GOAL.md` — vision, non-goals
2. `V1.md` — scope and acceptance criteria
3. `DESIGN.md` — design system and UX rules
4. `ARCHITECTURE.md` — schema, state machine, invariants
5. `API.md`, `TELEGRAM.md` — interface contracts
6. `BACKLOG.md`, `RUNBOOK.md` — prioritization and operations

**Code never overrides a document.** If implementation reveals a doc is wrong, stop and report the conflict. Do not quietly "fix" it in code.

---

## 3. Modes

| Mode | You may | You must not |
|---|---|---|
| Plan | Read, analyze, propose | Write or edit files |
| Build | Implement the approved task | Change scope or schema without approval |

If the user asks for implementation while in plan mode, tell them to switch agents. Do not write files as a workaround.

---

## 4. Work Protocol

For every task:

1. **Restate** the task in one sentence and list the files you expect to touch.
2. **Check** the relevant doc section. Quote it if it constrains the implementation.
3. **Implement** the smallest change that satisfies the acceptance criteria.
4. **Verify** — run tests, run migrations on a fresh database, load the page.
5. **Record** — update the affected doc and `implemented.md` in the same change.

Rules:

- Behavior change without a doc update is an incomplete change.
- A task touching more than ~400 changed lines should be split.
- Never commit secrets. `.env` stays untracked; `.env.example` is updated whenever a variable is added.

---

## 5. Conventions

- **Commits:** Conventional Commits — `feat(web): add township delivery fee to checkout`.
- **Branches:** `feat/<slice>`, `fix/<issue>`, `docs/<topic>`.
- **Language:** code, comments, and commits in English. Customer-facing copy in Burmese + English.
- **Environment:** Windows + PowerShell. Provide PowerShell-safe commands.
- **No dependency without justification.** State why the standard library or existing package is insufficient.

---

## 6. Technical Guardrails

### Frontend (`apps/web`)
- Next.js App Router only. No Pages Router.
- TypeScript strict. No `any` without a comment explaining why.
- **Tailwind tokens only.** Never a raw hex value — every color comes from the theme built from `DESIGN.md` §2.
- Burmese is the default locale; English is a persisted toggle. Never ship a string in one language only.
- Server Components by default; `use client` only where interaction requires it.
- Images: WebP, explicit dimensions, lazy-loaded except the PDP hero.
- Initial payload budget: 500KB. Check before declaring done.

### Backend (`apps/api`)
- Every endpoint behind a FormRequest or equivalent validation. No unvalidated input reaches a model.
- Migrations must be reversible and must run cleanly on an empty database.
- Money is stored as **integer MMK**, never floats.
- Stock decrements and order creation happen inside one transaction.
- Idempotent operations use a unique constraint, not an application-level check alone.
- Never interpolate raw SQL. Use the query builder or bindings.

### Data
- Snapshot anything the customer was promised: product name, unit price, delivery fee, total.
  Editing a product or a township fee must never change a historical order.
- Every order status change writes an `order_events` row.

---

## 7. Definition of Done

A task is done only when all applicable items pass:

- [ ] Acceptance criteria in the relevant doc are met
- [ ] Tests added or updated, and passing
- [ ] Migrations run on a fresh database
- [ ] Burmese **and** English render, no overflow at 375px
- [ ] Checked on a throttled connection, not just localhost
- [ ] No console errors, no unhandled exceptions in Sentry
- [ ] Docs and `implemented.md` updated
- [ ] No secrets, no debug code, no commented-out blocks

---

## 8. Non-Negotiables (UX)

These come from `DESIGN.md` §8 and are never traded for convenience:

1. Burmese default on every page, English toggle persisted.
2. COD preselected, shown above the fold on PDP and checkout.
3. Township dropdown — never free-text delivery area.
4. Landmark required, min 5 chars, Burmese helper text.
5. No email field required anywhere.
6. Tap targets ≥ 44px.
7. Delivery fee and total visible before Place order.
8. Every order state has a customer-facing explanation.
9. Every empty and error state has a next action.

---

## 9. Forbidden in V1

Everything listed in `V1.md` §4 is out of scope. In particular, do not add:

- User accounts, login, registration, passwords
- Wishlist, reviews, newsletter, blog
- Promo code engine
- Multi-currency, multi-warehouse, multi-vendor
- Dark mode, decorative animation
- Search beyond name/category
- An admin SPA or charts
- A second order path that bypasses the shared validator

If a feature seems necessary, raise it — do not build it.

---

## 10. Escalation

Stop and ask before:

- Changing the database schema or a state transition
- Adding a runtime dependency
- Changing payment or Telegram integration behavior
- Editing acceptance criteria in `V1.md`
- Touching anything under `docs/` in a way that changes meaning
- Anything that could send a real Telegram message or charge a real customer

Ship-blocking bugs found mid-task: fix them if trivial, otherwise report and continue.

---

## 11. Testing Bar

| Layer | Requirement |
|---|---|
| API | Pest/PHPUnit — order creation, delivery fee, idempotency, invalid transition → 422 |
| Bot | Session expiry, back/edit, invalid township, order creation |
| E2E | Playwright — COD happy path, validation error, tracking page |
| Manual | One real low-end Android device before launch |

A test that only proves the happy path is not enough for money-touching code.

---

## 12. File Map

```
docs/                    GOAL, V1, DESIGN, AGENT, ARCHITECTURE, API, TELEGRAM, RUNBOOK, BACKLOG, CHANGELOG
implemented.md           Running record of what is actually done
apps/api/                Laravel — app/, database/, resources/views/admin/, routes/
apps/web/                Next.js — app/, components/, lib/i18n/, styles/
database/data/           townships.csv and other seed sources
```

---

## 13. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-20 | Initial agent operating instructions |
