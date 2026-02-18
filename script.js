/**
 * Work Mate Landing Page
 * - Language toggle (JA/EN)
 * - Scroll animations (IntersectionObserver)
 * - Smooth scroll for anchor links
 */

(function () {
  'use strict';

  // ---- Language Toggle ----
  const html = document.documentElement;
  const langButtons = document.querySelectorAll('[data-set-lang]');

  function setLang(lang) {
    html.setAttribute('data-lang', lang);
    langButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-set-lang') === lang);
    });
    try {
      localStorage.setItem('workmate-lang', lang);
    } catch (e) {
      // localStorage unavailable
    }
  }

  // Restore saved language preference
  try {
    var saved = localStorage.getItem('workmate-lang');
    if (saved === 'en' || saved === 'ja') {
      setLang(saved);
    }
  } catch (e) {
    // localStorage unavailable
  }

  langButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setLang(btn.getAttribute('data-set-lang'));
    });
  });

  // ---- Scroll Animations ----
  var animatedElements = document.querySelectorAll('[data-animate]');

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    animatedElements.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // Fallback: show everything immediately
    animatedElements.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  // ---- Smooth Scroll for Anchor Links ----
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#') return;

      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
