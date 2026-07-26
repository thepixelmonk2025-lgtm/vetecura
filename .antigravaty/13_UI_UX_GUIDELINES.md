# UI/UX Guidelines — Vetecura IMS

**Principle:** Enterprise-grade capability, warehouse-floor simplicity. The system handles complex logic (audit chains, anomaly detection, RBAC) — the interface should never make the person using it feel that complexity. A warehouse worker with basic smartphone literacy should be fully productive within 15 minutes of first use, no manual required.

---

## 1. Two Distinct Interfaces, Two Distinct Design Goals

| Interface | Users | Design Goal |
|---|---|---|
| Warehouse PWA | Staff (scanning, picking, counting) | Speed and error-prevention — minimal taps, huge touch targets, impossible to misread |
| Web Admin (Next.js) | Owner, Manager, Purchase Team | Clarity and control — dashboards, approvals, reports, configuration |

These should not share the same layout system. The PWA is a task tool; the Web Admin is a management tool. Trying to force one design language across both usually makes both worse.

## 2. Warehouse PWA Design Rules

- **One primary action per screen.** The scan screen has one job: scan. No secondary buttons competing for attention during an active scan session.
- **Large touch targets (minimum 48×48px, ideally larger for primary actions).** Staff are often wearing gloves or moving quickly — small tap targets cause errors and frustration.
- **Immediate, unambiguous feedback per scan.** Green flash + short buzz/beep for accepted, red flash + distinct buzz/beep for rejected — the worker should never have to read text to know if a scan worked.
- **Persistent progress indicator.** "342 / 500 scanned" always visible, never buried in a menu — this is the single most-referenced piece of information during a GRN or dispatch session.
- **No nested menus during an active task.** If Staff is mid-scan, don't require navigating through 2–3 screens to see status or cancel — surface it inline.
- **Offline indicator always visible.** A small, persistent icon showing "syncing" / "synced" / "offline — queued" so staff always know if their scans are safely recorded, without needing to ask.
- **Minimal text, maximal icons + color.** Literacy and language vary across warehouse staff — lean on universally understood icons (checkmark, warning triangle, camera) over dense English text wherever possible.
- **Single-hand operability where feasible.** Scanning often happens one-handed (other hand holding the item) — critical actions should be reachable by thumb on a standard phone/tablet size.

## 3. Web Admin Design Rules

- **Role-specific dashboards, not one dashboard with everything hidden behind filters.** Per `08_MODULE_REPORTS_ANALYTICS.md`: Owner sees business KPIs, Manager sees operational status, Purchase sees PO/supplier data. Nobody should have to mentally filter out irrelevant sections — the system does that filtering for them.
- **Approvals surfaced, not buried.** Pending PO approvals, write-off requests, and discrepancies belong on the Manager/Owner's dashboard landing view — not three clicks into a "Requests" tab nobody remembers to check.
- **Progressive disclosure for complex data.** A batch-wise report or audit extract can be dense — default to a clean summary view, let the user drill into detail on demand, rather than dumping every column at once.
- **Consistent action placement.** Primary action (Approve, Print, Export) always in the same visual position across modules — reduces cognitive load when switching between PO approval, write-off approval, and return inspection screens.
- **Plain-language empty states and errors.** "No low-stock items right now — you're all stocked up" instead of a blank table. "This barcode doesn't match any item in this delivery — check you're scanning the right product" instead of `barcode_not_found`.
- **Color coding consistent system-wide.** Green = good/complete, amber = needs attention, red = blocking/urgent — used identically whether it's a dispatch status, an expiry risk score, or a supplier performance rating. One learned color language across the whole system.

## 4. Visual & Interaction Standards

- **Typography:** one clear sans-serif family across both interfaces (e.g. Inter or similar), generous line height for scanability, larger base font size on the PWA (workers glance at screens quickly, often from arm's length or a moving position).
- **Spacing over borders.** Prefer whitespace to separate sections rather than heavy boxes/borders everywhere — reduces visual clutter, especially important on the denser Web Admin screens.
- **Loading states, never blank screens.** Any action that takes more than ~300ms shows a skeleton loader or spinner — a frozen-looking screen during a scan session reads as "did my scan register?" and causes duplicate/panicked re-scans.
- **Confirmation only where it matters.** Don't make Staff confirm every single scan (kills speed) — but do require explicit confirmation for irreversible/high-stakes actions (force-close dispatch, approve write-off, reject PO).

## 5. Onboarding & Learnability

- **Guided first-use flow on the PWA** — first login walks a new Staff member through one practice scan before they touch a real GRN/dispatch, so the feedback patterns (accepted vs. rejected) are already familiar.
- **Inline tooltips on Web Admin, not a separate help manual.** A small "?" next to "Expiry Risk Score" that explains the formula in one plain sentence, rather than requiring a PDF manual lookup.
- **Role-appropriate defaults.** New Purchase Team accounts land on the PO/supplier view by default, not a generic dashboard they need to reconfigure.

## 6. Accessibility & Practical Constraints

- Design for **outdoor/bright warehouse lighting** — sufficient contrast ratios (WCAG AA minimum) so screens remain readable near loading bay doors or under harsh fluorescent lighting.
- Design for **budget Android devices**, not flagship phones — avoid animation-heavy transitions or large unoptimized assets that lag on lower-end hardware common in warehouse deployments.
- Support **both camera-based scanning and external Bluetooth/USB scanner input** without the UI needing to know which one is active — same visual feedback either way.

## 7. What "Enterprise-Level" Means Here (and What It Doesn't)

Enterprise-level, in this system, means: reliable, auditable, role-secured, scalable — not visually dense or feature-crowded. The temptation with "enterprise" software is to cram every capability onto one screen to look powerful. For Vetecura, the opposite is the actual enterprise signal: a system confident enough in its underlying architecture (immutable audit trail, RBAC, anomaly detection) that its interface can stay calm and simple, because the complexity is handled correctly underneath, not displayed as a badge of sophistication on the screen.

## 8. Definition of Done (UI/UX)

- [ ] A new Staff member can complete a full Stock In scan session correctly on first attempt after the guided practice scan, without asking for help
- [ ] Every scan (accepted or rejected) gives feedback within 300ms, with no ambiguity requiring the user to read text
- [ ] Manager/Owner can find and act on a pending approval within 2 clicks/taps of login, from any screen
- [ ] Color coding audited for consistency across all modules (no module using red/green/amber differently than the rest)
- [ ] PWA tested on at least one budget Android device (not just a high-end test phone) for performance and touch-target usability
- [ ] All error messages reviewed and rewritten in plain language (no raw error codes surfaced to end users)
