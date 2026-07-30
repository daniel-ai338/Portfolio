/*  main.js — theme, navigation, reveals and small interface manners.
 *  Everything here degrades gracefully: without JS the page is still a
 *  complete, readable document.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ── theme ──────────────────────────────────────────────────────────── */
  var toggle = document.querySelector('[data-theme-toggle]');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('ab-theme', next); } catch (e) {}

      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', next === 'dark' ? '#121318' : '#f0ebe2');
    });
  }

  /* ── mobile navigation ──────────────────────────────────────────────── */
  var navBtn = document.querySelector('[data-nav-toggle]');
  var nav = document.getElementById('nav');

  function closeNav() {
    root.classList.remove('is-nav-open');
    if (navBtn) navBtn.setAttribute('aria-expanded', 'false');
  }

  if (navBtn && nav) {
    navBtn.addEventListener('click', function () {
      var open = root.classList.toggle('is-nav-open');
      navBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') closeNav();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });

    document.addEventListener('pointerdown', function (e) {
      if (!root.classList.contains('is-nav-open')) return;
      if (nav.contains(e.target) || navBtn.contains(e.target)) return;
      closeNav();
    });
  }

  /* ── masthead condenses once you leave the top ──────────────────────── */
  var masthead = document.querySelector('[data-masthead]');
  if (masthead) {
    var stuck = false;
    var onScroll = function () {
      var should = window.scrollY > 24;
      if (should !== stuck) {
        stuck = should;
        masthead.classList.toggle('is-stuck', stuck);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── reveal on entry ────────────────────────────────────────────────── */
  var targets = document.querySelectorAll('[data-reveal]');

  if (calm || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(targets, function (el) { el.classList.add('is-in'); });
  } else {
    var pending = Array.prototype.slice.call(targets);

    var show = function (el) {
      el.classList.add('is-in');
      var at = pending.indexOf(el);
      if (at > -1) pending.splice(at, 1);
    };

    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        show(entry.target);
        seen.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    pending.forEach(function (el) { seen.observe(el); });

    /* Safety net. An observer callback that gets skipped — a very fast flick,
       a restored scroll position, a background tab waking up — would leave
       content invisible, which is the one failure this page cannot afford.
       This sweep costs nothing once everything has been shown. */
    var sweeping = false;
    var sweep = function () {
      sweeping = false;
      if (!pending.length) {
        window.removeEventListener('scroll', queueSweep);
        window.removeEventListener('resize', queueSweep);
        return;
      }
      var limit = window.innerHeight * 0.92;
      pending.slice().forEach(function (el) {
        if (el.getBoundingClientRect().top < limit) { show(el); seen.unobserve(el); }
      });
    };
    var queueSweep = function () {
      if (sweeping) return;
      sweeping = true;
      requestAnimationFrame(sweep);
    };

    window.addEventListener('scroll', queueSweep, { passive: true });
    window.addEventListener('resize', queueSweep, { passive: true });
    queueSweep();
  }

  /* ── which section am I in ──────────────────────────────────────────── */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('is-current', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ── copy the email address ─────────────────────────────────────────── */
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    var label = btn.querySelector('[data-copy-label]') || btn;
    var original = label.textContent;
    var timer;

    var settle = function (text) {
      label.textContent = text;
      clearTimeout(timer);
      timer = setTimeout(function () { label.textContent = original; }, 2200);
    };

    /* The async Clipboard API rejects in plenty of ordinary situations —
       an unfocused document, a permissions policy, a non-secure origin. Fall
       back to the old selection trick, and if even that fails, put the address
       on screen so it can still be copied by hand. */
    var viaSelection = function (text) {
      var field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.appendChild(field);
      field.select();
      field.setSelectionRange(0, text.length);

      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      field.remove();
      return ok;
    };

    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');

      var fallback = function () {
        settle(viaSelection(text) ? 'Copied' : text);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { settle('Copied'); }, fallback);
      } else {
        fallback();
      }
    });
  });

  /* ── a little parallax on the project shots ─────────────────────────── */
  if (fine && !calm) {
    document.querySelectorAll('.project__shot').forEach(function (shot) {
      shot.addEventListener('pointermove', function (e) {
        var box = shot.getBoundingClientRect();
        var nx = (e.clientX - box.left) / box.width - 0.5;
        var ny = (e.clientY - box.top) / box.height - 0.5;

        shot.classList.add('is-tilting');
        shot.style.transform =
          'perspective(1100px) rotateX(' + (-ny * 3.4).toFixed(2) + 'deg) ' +
          'rotateY(' + (nx * 4.2).toFixed(2) + 'deg) translateY(-4px) scale(1.012)';
      });

      shot.addEventListener('pointerleave', function () {
        shot.classList.remove('is-tilting');
        shot.style.transform = '';
      });
    });
  }

  /* ── footer year ────────────────────────────────────────────────────── */
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
