# Kartis — Exchange cards for Shabbat

The live site for Kartis. It renders the artboards from the Kartis design canvas
(`src/dc/*.dc.html`) with a small React runtime, so the site looks exactly like the canvas.

## What's in it
- `/` landing page, `/editor` card editor (3 steps, print-ready PDF with 3 mm bleed and crop marks, real QR codes)
- `/he/...` the same pages in Hebrew, right to left
- Shabbat mode turns on by itself from candle lighting to Havdalah, using the visitor's time zone (Hebcal). Preview it with `?shabbat=1`
- `/privacy`, `/terms`, `/accessibility` (EN + HE) — **drafts, have a lawyer review them**
- "Draft with AI" sign-ups go to a Google Sheet through `/api/subscribe`

## Run locally
```
npm install
npm run dev        # http://localhost:5173
npm test           # checks: patches, QR codes, Hebrew strings, Shabbat times, legal pages
npm run build
```

## Publish on Vercel (one time, ~10 minutes)
1. Create a GitHub repository (for example `kartis`) and upload this folder to it.
2. On vercel.com sign in with GitHub → **Add New → Project** → pick the repository → **Deploy**.
   Vercel detects Vite by itself. The site goes live at `https://<project>.vercel.app`.
3. Google Sheet for sign-ups:
   - Create a new Google Sheet, e.g. "Kartis — Draft with AI sign-ups".
   - Extensions → Apps Script → paste `docs/google-sheet-apps-script.gs`, change `SECRET`, save.
   - Deploy → New deployment → Web app → Execute as **Me**, access **Anyone** → copy the `/exec` URL.
   - In Vercel → Project → Settings → Environment Variables add
     `SHEETS_WEBHOOK_URL` = the `/exec` URL and `SHEETS_SECRET` = the same secret. Redeploy.
4. Domain (when bought): Vercel → Project → Settings → Domains → add it and follow the DNS steps.

## Updating from the canvas
Copy the changed `.dc.html` files from the canvas into `src/dc/`, then run `npm test`.
Site-only changes (Google Maps link, saving drafts, footer links, Havdalah time) live in `src/patches.js`;
the test tells you if a canvas change broke one of them. New text on the canvas needs a Hebrew line in `src/he.js`
(the test lists what's missing).

## Notes
- Music: Satie, Gymnopédie No. 1, recording from Musopen via Wikimedia Commons (public domain). Credited on the page.
- Fonts: Google Fonts (SIL Open Font License). Hebrew letters use Frank Ruhl Libre and Heebo.
- The editor keeps drafts only in the visitor's browser (localStorage). Nothing is sent to a server except the sign-up email.
