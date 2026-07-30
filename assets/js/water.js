/*  water.js — pointer-driven ripple surface
 *
 *  A height-field water simulation on a low-resolution grid that the browser
 *  scales up for free. Moving the pointer drips into it, clicking drops a
 *  stone in. The result is blended over the page with `soft-light`, so it
 *  reads as light bending on a wet surface rather than as a layer of shapes.
 *
 *  The loop parks itself whenever the surface goes still, so an idle tab
 *  costs nothing.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('water');
  var cursor = document.querySelector('.drop-cursor');
  if (!canvas) return;

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (calm.matches) {
    canvas.remove();
    if (cursor) cursor.remove();
    return;
  }

  var ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  /* ── tuning ─────────────────────────────────────────────────────────── */
  var CELL       = 4;        // px of screen per simulation cell
  var MAX_CELLS  = 200000;   // grid budget, so 4K screens coarsen instead of stall
  var DAMPING    = 0.968;    // how fast the surface settles
  var GAIN       = 300;      // height gradient → alpha
  var STILLNESS  = 0.0009;   // below this average energy we stop drawing
  var TRAIL_STEP = 13;       // px of travel between trail droplets

  /* ── state ──────────────────────────────────────────────────────────── */
  var gw = 0, gh = 0;
  var prev, curr, image, pix;
  var running = false, idleFrames = 0;

  var pointer   = { x: -999, y: -999, has: false };
  var trail     = { x: -999, y: -999 };
  var glide     = { x: -999, y: -999 };   // lagging halo
  var glideDot  = { x: -999, y: -999 };   // lagging dot
  var lastTouch = 0;

  /* ── grid ───────────────────────────────────────────────────────────── */
  function build() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var cell = CELL;

    while ((w / cell) * (h / cell) > MAX_CELLS) cell += 1;

    gw = Math.max(8, Math.ceil(w / cell) + 1);
    gh = Math.max(8, Math.ceil(h / cell) + 1);
    CELL = cell;

    canvas.width = gw;
    canvas.height = gh;

    prev  = new Float32Array(gw * gh);
    curr  = new Float32Array(gw * gh);
    image = ctx.createImageData(gw, gh);
    pix   = image.data;
  }

  /* ── perturb the surface ────────────────────────────────────────────── */
  function drop(px, py, radiusPx, power) {
    if (!prev) return;

    var cx = px / CELL;
    var cy = py / CELL;
    var r  = Math.max(1, radiusPx / CELL);

    var x0 = Math.max(1, Math.floor(cx - r));
    var x1 = Math.min(gw - 2, Math.ceil(cx + r));
    var y0 = Math.max(1, Math.floor(cy - r));
    var y1 = Math.min(gh - 2, Math.ceil(cy + r));

    for (var y = y0; y <= y1; y++) {
      var dy = y - cy;
      for (var x = x0; x <= x1; x++) {
        var dx = x - cx;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d > r) continue;
        // cosine falloff keeps the crater smooth instead of stepped
        prev[y * gw + x] += power * 0.5 * (1 + Math.cos(Math.PI * d / r));
      }
    }
    wake();
  }

  /* ── one physics step ───────────────────────────────────────────────── */
  function step() {
    var w = gw;
    for (var y = 1; y < gh - 1; y++) {
      var row = y * w;
      for (var x = 1; x < w - 1; x++) {
        var i = row + x;
        curr[i] = ((prev[i - 1] + prev[i + 1] + prev[i - w] + prev[i + w]) * 0.5 - curr[i]) * DAMPING;
      }
    }
    var swap = prev; prev = curr; curr = swap;
  }

  /* ── shade the height field ─────────────────────────────────────────── */
  function draw() {
    var w = gw, h = prev, energy = 0;

    pix.fill(0);

    for (var y = 1; y < gh - 1; y++) {
      var row = y * w;
      for (var x = 1; x < w - 1; x++) {
        var i = row + x;

        var v = h[i];
        if (v > -0.0006 && v < 0.0006) continue;
        energy += v < 0 ? -v : v;

        // light from the upper left, same direction as the page's shadows
        var s = ((h[i - 1] - h[i + 1]) * 0.75 + (h[i - w] - h[i + w]) * 0.95) * GAIN;

        var j = i * 4;
        if (s > 0) {
          if (s > 255) s = 255;
          pix[j] = 255; pix[j + 1] = 255; pix[j + 2] = 255; pix[j + 3] = s;
        } else {
          s = -s;
          if (s > 255) s = 255;
          pix[j + 3] = s;            // rgb already 0 → shadow
        }
      }
    }

    ctx.putImageData(image, 0, 0);
    return energy / (gw * gh);
  }

  /* ── loop ───────────────────────────────────────────────────────────── */
  function frame() {
    if (!running) return;

    step();
    var energy = draw();
    var settled = moveCursor();

    if (energy < STILLNESS && settled) {
      if (++idleFrames > 26) {
        running = false;
        ctx.clearRect(0, 0, gw, gh);
        prev.fill(0); curr.fill(0);
        return;
      }
    } else {
      idleFrames = 0;
    }

    requestAnimationFrame(frame);
  }

  function wake() {
    idleFrames = 0;
    if (!running && !document.hidden) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  /* ── trailing droplet cursor ────────────────────────────────────────── */
  function moveCursor() {
    if (!cursor || !pointer.has) return true;

    glide.x    += (pointer.x - glide.x) * 0.17;
    glide.y    += (pointer.y - glide.y) * 0.17;
    glideDot.x += (pointer.x - glideDot.x) * 0.42;
    glideDot.y += (pointer.y - glideDot.y) * 0.42;

    var halo = cursor.firstElementChild;
    var dot  = cursor.lastElementChild;

    // stretch the halo along its direction of travel — a droplet in motion
    var vx = pointer.x - glide.x;
    var vy = pointer.y - glide.y;
    var speed = Math.min(Math.sqrt(vx * vx + vy * vy) / 26, 0.42);
    var angle = Math.atan2(vy, vx) * 180 / Math.PI;

    halo.style.transform =
      'translate(' + glide.x + 'px,' + glide.y + 'px) rotate(' + angle + 'deg) ' +
      'scale(' + (1 + speed) + ',' + (1 - speed * 0.62) + ')';
    dot.style.transform = 'translate(' + glideDot.x + 'px,' + glideDot.y + 'px)';

    // "settled" lets the main loop park itself once the droplet has caught up
    return Math.abs(vx) < 0.25 && Math.abs(vy) < 0.25;
  }

  /* ── click splash: rings + satellite droplets ───────────────────────── */
  function splash(x, y) {
    drop(x, y, 46, 1.5);

    for (var n = 0; n < 2; n++) {
      var ring = document.createElement('span');
      ring.className = 'ripple-ring';
      ring.style.left = x + 'px';
      ring.style.top  = y + 'px';
      ring.style.setProperty('--size', (150 + n * 90) + 'px');
      ring.style.setProperty('--dur', (760 + n * 260) + 'ms');
      ring.style.animationDelay = (n * 110) + 'ms';
      document.body.appendChild(ring);
      ring.addEventListener('animationend', function () { this.remove(); });
    }

    // a few smaller droplets thrown outward, landing slightly later
    var count = 3 + Math.floor(Math.random() * 2);
    for (var k = 0; k < count; k++) {
      (function (k) {
        var a = Math.random() * Math.PI * 2;
        var d = 34 + Math.random() * 62;
        setTimeout(function () {
          drop(x + Math.cos(a) * d, y + Math.sin(a) * d, 14, 0.42);
        }, 110 + k * 55);
      })(k);
    }
  }

  /* ── input ──────────────────────────────────────────────────────────── */
  function onMove(e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;

    if (!pointer.has) {
      pointer.has = true;
      glide.x = glideDot.x = pointer.x;
      glide.y = glideDot.y = pointer.y;
      trail.x = pointer.x; trail.y = pointer.y;
      if (cursor) cursor.classList.add('is-live');
    }

    var dx = pointer.x - trail.x;
    var dy = pointer.y - trail.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > TRAIL_STEP) {
      trail.x = pointer.x;
      trail.y = pointer.y;
      var force = Math.min(0.1 + dist / 260, 0.42);
      drop(pointer.x, pointer.y, 20 + dist * 0.35, force);
    }
    wake();
  }

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') { lastTouch = Date.now(); return; }
    onMove(e);
  }, { passive: true });

  window.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') lastTouch = Date.now();
    splash(e.clientX, e.clientY);
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'touch') return;
    if (cursor) cursor.classList.remove('is-live');
  });
  document.documentElement.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'touch') return;
    if (cursor && pointer.has) cursor.classList.add('is-live');
  });

  // interactive elements make the droplet swell
  document.addEventListener('pointerover', function (e) {
    if (!cursor) return;
    var hot = e.target.closest && e.target.closest('a, button, .chip, .project__shot, input, textarea');
    cursor.classList.toggle('is-hot', !!hot);
  }, { passive: true });

  /* ── ambient drips, so the surface is alive before you touch it ─────── */
  function ambient() {
    var wait = 4200 + Math.random() * 5200;
    setTimeout(function () {
      if (!document.hidden && Date.now() - lastTouch > 3000) {
        drop(
          window.innerWidth * (0.1 + Math.random() * 0.8),
          window.innerHeight * (0.1 + Math.random() * 0.8),
          26, 0.3
        );
      }
      ambient();
    }, wait);
  }

  /* ── lifecycle ──────────────────────────────────────────────────────── */
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      running = false;
      build();
    }, 180);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) running = false;
    else wake();
  });

  calm.addEventListener('change', function (e) {
    if (e.matches) {
      running = false;
      canvas.style.display = 'none';
      if (cursor) cursor.style.display = 'none';
    } else {
      canvas.style.display = '';
      if (cursor) cursor.style.display = '';
      wake();
    }
  });

  build();
  ambient();
  // one drop on arrival, just off-centre
  setTimeout(function () {
    drop(window.innerWidth * 0.62, window.innerHeight * 0.38, 60, 0.9);
  }, 620);
})();
