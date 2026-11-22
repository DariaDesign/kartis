# Production Readiness Audit: Kartis site (mykartis.com)

**Perspective**: Production Readiness Engineer
**Date**: 2026-11-23
**Scope**: shipped code on `main` (static Vite SPA + prerender, 1 Vercel function `/api/subscribe`)

## Summary
Static, prerendered site; the only server dependency is the waitlist function → Google Apps Script. PDF is made in the browser; drafts live in localStorage. Main risks were silent failures that told the user "done" when nothing happened.

## Verdict: APPROVE WITH CHANGES (changes applied in this commit, one manual check left)

## Critical Issues (fixed)
| # | Issue | File | Failure mode | Fix |
|---|-------|------|--------------|-----|
| 1 | Waitlist showed "You're on the list" before the save, errors swallowed | patches.js (Main) | Sheet env vars missing / Apps Script down → sign-ups lost, user thinks they're in | Success only after 2xx; 12 s timeout; double-submit guard; translated error message in 6 languages |
| 2 | "Copy request" always said "Copied" | patches.js (EditorSimple) | Clipboard blocked (Safari, iframe, http) → user pastes nothing at the print shop | Waits for the clipboard result, falls back to execCommand, shows "Couldn't copy" |
| 3 | PDF font set cached even when a font failed to load | patches.js (Card) | One network blip → every PDF in that session uses fallback fonts | Cache only a complete set; retry on next download |

## Manual check (Dee)
| # | What | Why |
|---|------|-----|
| M1 | Vercel → Settings → Environment Variables: `SHEETS_WEBHOOK_URL`, `SHEETS_SECRET` set for Production | Without them `/api/subscribe` returns 503 and every sign-up now shows the error (before: silently lost) |

## Recommendations
| # | Issue | Why | Fix |
|---|-------|-----|-----|
| R1 | No error monitoring / analytics | Can't see failed PDFs or sign-ups in prod | Enable Vercel Web Analytics + Speed Insights (one toggle + 1 script) |
| R2 | `/assets/*` non-hashed files cached `immutable` 1 year | A changed font/video keeps the old copy for returning visitors | Rename on change, or cache 1 day for non-hashed files |
| R3 | Draft restore has no version | A future canvas change in state shape could break restored drafts | Add `v` to saved draft; drop drafts with another version |

## Failure Mode Analysis
| Scenario | What fails | User impact | Recovery | Handled? |
|----------|-----------|-------------|----------|----------|
| Apps Script down / env missing | /api/subscribe 5xx | Error text, can retry | Retry | Yes (now) |
| Slow network on sign-up | fetch hangs | Error after 12 s | Retry | Yes (now) |
| Clipboard blocked | writeText rejects | "Couldn't copy" | Fallback copy / select text | Yes (now) |
| Font fetch fails during PDF | fallback font in PDF | Wrong typeface in print file | Next download retries | Partly |
| PDF engine error | exception | Translated alert with next step | Retry / Chrome | Yes |
| localStorage full / disabled | draft not saved | Draft lost on reload | — | Caught, no crash |
| JS fails to load | SPA | Prerendered text and links still readable | Reload | Yes |
| Bad deploy | — | — | Vercel instant rollback, no data migrations | Yes |

## Environment Checklist
| Concern | Dev | Prod | Gap? |
|---------|-----|------|------|
| Paths | relative `/assets`, `/_blob` | same, generated in build | No |
| Network | none needed | Apps Script via function | Env vars (M1) |
| Config | none | 2 env vars | M1 |
| Build output | `npm run build` (vite + ssr + prerender) | Vercel runs the same | No |
| Hydration | — | prerender + hydrateRoot, no mismatches on 9 routes | No |

## Verdict Details
- E2E Flow: PASS
- Error Recovery: PASS (after fixes)
- Data Integrity: CONCERNS (M1 unverified)
- Environment Parity: PASS
- Observability: CONCERNS (R1)
