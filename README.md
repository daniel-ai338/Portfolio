# Andrey Buno — portfolio

A single-page portfolio. Plain HTML, CSS and JavaScript — no build step, no
framework, no dependencies. Open `index.html` and it works.

---

## Contact details (live)

Set in the `#contact` section of `index.html`:

| Channel | Value | Link |
|---|---|---|
| Email | `rof71254@gmail.com` | `mailto:` on the solid button, the copy button, and the Gmail pill |
| Telegram | `@skyblue321321` | `https://t.me/skyblue321321` |
| WhatsApp | `+1 (771) 250-1600` | `https://wa.me/17712501600` |

The WhatsApp link uses the digits-only E.164 form (`17712501600`) — that's what
`wa.me` requires; the formatted number is only for display.

To add Upwork, LinkedIn or GitHub later, copy one of the `<li>` blocks in the
`.socials` list and swap the `href` and label.

---

## Still worth doing

### 1. Real project screenshots (recommended)

The three project images are hand-drawn SVG recreations of each site's hero,
used because the real screenshots weren't available. They look intentional, but
actual screenshots will always sell the work better.

To swap one in, save a screenshot over the matching file — same name, or change
the `src` in `index.html`:

```
assets/img/work/driven-dispatch.svg    →  Driven Dispatch Solutions
assets/img/work/silverstein-songs.svg  →  Silverstein Songs
assets/img/work/tee-shirt-lady.svg     →  Tee Shirt Lady
```

Shoot them at **1200×760** (or any 1.58:1 ratio) so the cards keep their
proportions. JPG or PNG is fine — just update the file extension in the `src`.

### 2b. Unused files in `assets/img/tech/`

These four are not referenced by the page and can be deleted (about 5 MB):

```
stripe .png     stripe .svg     vrecel.png     vrecel.svg
```

They're AI-generated 3D wordmark renders on opaque grey backgrounds, so they
don't work as small chip icons — a grey square in a round pill, at a wide aspect
ratio, illegible at 22px. The page uses proper transparent logos instead:
`stripe.png`, `langchain.png` and `vercel.png`, rasterised at 66px (3× the
display size) from the official marks.

If you do want your own images in those chips, crop them square, cut the
background out to transparency, and save over those three PNGs.

### 3. Check two facts I had to interpret

- **Your Kyiv degree.** Your profile said "Taras Stevchenko National Technical
  University". I wrote **Taras Shevchenko National University of Kyiv**, which is
  the closest real institution. If you meant Kyiv Polytechnic (KPI), change it in
  the Education panel.
- **Tee Shirt Lady's stack.** Your profile listed both "PostgreSQL, React" and
  "PHP, WordPress, jQuery, MongoDB" for the same project. I went with the
  WordPress/PHP/jQuery set, since that matches the site description. Adjust the
  chips in that project card if the other list is right.

---

## Running it

Double-clicking `index.html` works for a quick look. For an exact preview
(fonts and icons load over `file://` inconsistently in some browsers), serve the
folder:

```bash
npx serve .          # or: python -m http.server 8000
```

## Deploying

It's a static folder — upload it anywhere. Netlify, Vercel, Cloudflare Pages,
GitHub Pages, or plain FTP to any shared host. No configuration needed.

---

## What's in here

```
index.html                  the whole page
assets/
  css/style.css             all styling, sectioned and commented
  js/water.js               the ripple surface + droplet cursor
  js/main.js                theme, navigation, reveals, copy button
  fonts/                    Fraunces + DM Sans (self-hosted, variable)
  img/
    andrey-portrait.jpg     hero
    andrey-about.jpg        about section
    andrey-avatar.jpg       contact card + social preview
    favicon.svg
    tech/                   24 brand logos, local (no CDN)
    work/                   project images
README.md
```

Fonts and logos are stored locally on purpose: the page renders identically
offline, and nothing breaks if a CDN goes away or gets blocked.

---

## The water effect

Moving the pointer drips into a height-field water simulation; clicking drops a
stone in, complete with expanding rings and satellite droplets. It's rendered on
a low-resolution canvas that the browser scales up, and blended over the page
with `soft-light`, so it reads as light bending on a wet surface rather than as
shapes sitting on top of the text.

Tuning lives at the top of `assets/js/water.js`:

| Setting | Does what |
|---|---|
| `CELL` | simulation resolution — lower is finer and costs more |
| `DAMPING` | how quickly ripples settle (closer to 1 = longer) |
| `GAIN` | how visible the ripples are |
| `TRAIL_STEP` | pointer distance between trail droplets |

To make it subtler overall, lower `--water-alpha` in `assets/css/style.css`.

The loop stops itself whenever the surface goes still, so an idle page uses no
CPU. Touch devices get click splashes but no trail (and no cursor droplet).

---

## Accessibility and robustness

Verified in a headless browser rather than assumed:

- All body text meets WCAG AA contrast in **both** light and dark themes.
- `prefers-reduced-motion` removes the canvas, the cursor and every transition;
  all content shows immediately.
- With JavaScript disabled the full page is still readable — reveal animations
  only apply when JS is present.
- Keyboard reachable throughout, with a skip link, visible focus rings, one `h1`,
  no skipped heading levels, and labelled icon buttons.
- No horizontal scroll at 390px or 1440px.
- `prefers-contrast: more` strengthens borders and drops the decorative layers.
- Print stylesheet included.

## Theme

Light by default, following the system preference on first visit; the toggle
stores the choice in `localStorage`. Colours are CSS custom properties at the top
of `style.css` — change `--accent` and the whole page follows.
