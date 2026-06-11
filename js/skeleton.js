(function () {
  'use strict';

  /* ── Route → Skeleton Type mapping ───────────────────────────────── */
  function getSkeletonType(route) {
    if (route === 'home') return 'home';
    if (route === 'services' || route.startsWith('services/')) return 'services';
    if (route === 'portfolio' || route.startsWith('portfolio/')) return 'portfolio';
    if (route === 'about') return 'about';
    if (route === 'blog') return 'blog';
    if (route === 'contact') return 'contact';
    if (route === 'careers') return 'careers';
    return 'generic';
  }

  /* ── Shorthand: single shimmer block with inline style ────────────── */
  function b(style) {
    return `<div class="sk-block" style="${style}"></div>`;
  }

  /* ═══════════════════════════════════════════════════════════════════
     SHARED BUILDING BLOCKS
  ═══════════════════════════════════════════════════════════════════ */

  /** Hero section — used on every page */
  function heroHTML(opts) {
    var breadcrumb = opts.breadcrumb || false;
    var twoLine = opts.twoLine || false;
    var buttons = opts.buttons !== undefined ? opts.buttons : true;

    var bcHTML = breadcrumb
      ? '<div style="display:flex;gap:.5rem;align-items:center;margin-bottom:1.5rem">' +
        b('height:.875rem;width:3.5rem;border-radius:.25rem') +
        b('height:.875rem;width:.375rem;border-radius:.25rem') +
        b('height:.875rem;width:5rem;border-radius:.25rem') +
        '</div>'
      : '';

    var line2HTML = twoLine ? b('height:3rem;width:52%;margin-bottom:1.5rem') : '';

    var btnsHTML = buttons
      ? '<div style="display:flex;gap:1rem;margin-top:2rem">' +
        b('height:2.75rem;width:8rem;border-radius:.5rem') +
        b('height:2.75rem;width:7rem;border-radius:.5rem') +
        '</div>'
      : '';

    return (
      '<section style="padding:6rem 0 3.5rem">' +
      '<div class="sk-wrap">' +
      bcHTML +
      b('height:1.5rem;width:7rem;border-radius:999px;margin-bottom:1.25rem') +
      b('height:3rem;width:72%;margin-bottom:.75rem') +
      line2HTML +
      b('height:1.25rem;width:62%;margin-bottom:.5rem') +
      b('height:1.25rem;width:46%;margin-bottom:0') +
      btnsHTML +
      '</div>' +
      '</section>'
    );
  }

  /** 4-column stats row (homepage + about) */
  function statsHTML() {
    var card =
      '<div style="padding:1.25rem;border-radius:.75rem;border:1px solid var(--sk-border);' +
      'display:flex;flex-direction:column;gap:.5rem">' +
      b('height:1.75rem;width:2.5rem;border-radius:999px') +
      b('height:1.5rem;width:60%') +
      b('height:.875rem;width:80%') +
      '</div>';
    return (
      '<div class="sk-wrap" style="margin-bottom:3rem">' +
      '<div class="sk-stats">' +
      card +
      card +
      card +
      card +
      '</div>' +
      '</div>'
    );
  }

  /** Section heading with optional description lines */
  function sectionHeadHTML(tagW, titleW, showDesc) {
    var descHTML = showDesc
      ? b('height:1rem;width:min(30rem,90%)') + b('height:1rem;width:min(24rem,75%)')
      : '';
    return (
      '<div class="sk-section-head">' +
      b('height:1.5rem;width:' + tagW + ';border-radius:999px') +
      b('height:2.5rem;width:' + titleW) +
      descHTML +
      '</div>'
    );
  }

  /** Service / feature cards (icon + title + 3 text lines) */
  function serviceCardsHTML(count) {
    var card =
      '<div style="border-radius:1rem;padding:1.5rem;border:1px solid var(--sk-border);' +
      'display:flex;flex-direction:column;gap:.75rem">' +
      b('height:2.5rem;width:2.5rem;border-radius:.5rem') +
      b('height:1.25rem;width:70%') +
      b('height:.875rem;width:100%') +
      b('height:.875rem;width:85%') +
      b('height:.875rem;width:60%') +
      '</div>';
    var cards = '';
    for (var i = 0; i < count; i++) cards += card;
    return (
      '<div class="sk-wrap">' +
      '<div class="sk-card-grid sk-card-grid-3">' +
      cards +
      '</div>' +
      '</div>'
    );
  }

  /** Article / blog cards (image + meta + text lines) */
  function articleCardsHTML(count) {
    var card =
      '<div style="border-radius:1rem;overflow:hidden;border:1px solid var(--sk-border);' +
      'display:flex;flex-direction:column">' +
      b('height:11rem;border-radius:0') +
      '<div style="padding:1.25rem;display:flex;flex-direction:column;gap:.6rem">' +
      b('height:1.25rem;width:4rem;border-radius:999px') +
      b('height:1.1rem;width:90%') +
      b('height:1.1rem;width:68%') +
      b('height:.875rem;width:100%') +
      b('height:.875rem;width:80%') +
      '</div>' +
      '</div>';
    var cards = '';
    for (var i = 0; i < count; i++) cards += card;
    return (
      '<div class="sk-wrap" style="margin-bottom:4rem">' +
      '<div class="sk-card-grid sk-card-grid-3">' +
      cards +
      '</div>' +
      '</div>'
    );
  }

  /** Portfolio / project cards (tall image + title + tags) */
  function projectCardsHTML(count) {
    var card =
      '<div style="border-radius:1rem;overflow:hidden;border:1px solid var(--sk-border)">' +
      b('height:13rem;border-radius:0') +
      '<div style="padding:1rem;display:flex;flex-direction:column;gap:.5rem">' +
      b('height:1.25rem;width:90%') +
      b('height:1rem;width:65%') +
      '<div style="display:flex;gap:.5rem;margin-top:.25rem">' +
      b('height:1.25rem;width:3.5rem;border-radius:999px') +
      b('height:1.25rem;width:3.5rem;border-radius:999px') +
      '</div>' +
      '</div>' +
      '</div>';
    var cards = '';
    for (var i = 0; i < count; i++) cards += card;
    return (
      '<div class="sk-wrap" style="margin-bottom:4rem">' +
      '<div class="sk-card-grid sk-card-grid-3">' +
      cards +
      '</div>' +
      '</div>'
    );
  }

  /** Filter tabs (portfolio page) */
  function filterTabsHTML() {
    var widths = ['5rem', '7rem', '6rem', '5.5rem', '6.5rem'];
    var tabs = widths
      .map(function (w) {
        return b('height:2.25rem;width:' + w + ';border-radius:999px');
      })
      .join('');
    return (
      '<div class="sk-wrap">' +
      '<div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:2rem">' +
      tabs +
      '</div>' +
      '</div>'
    );
  }

  /** Team member cards (avatar + name + role) */
  function memberCardsHTML(count) {
    var card =
      '<div style="border-radius:1rem;padding:1.5rem;border:1px solid var(--sk-border);' +
      'display:flex;flex-direction:column;align-items:center;gap:.75rem;text-align:center">' +
      b('height:5rem;width:5rem;border-radius:50%') +
      b('height:1.25rem;width:60%') +
      b('height:1rem;width:45%;border-radius:999px') +
      b('height:.875rem;width:80%') +
      '</div>';
    var cards = '';
    for (var i = 0; i < count; i++) cards += card;
    var cols = count <= 4 ? count : 3;
    return (
      '<div class="sk-wrap" style="margin-bottom:4rem">' +
      '<div class="sk-card-grid sk-card-grid-' +
      cols +
      '">' +
      cards +
      '</div>' +
      '</div>'
    );
  }

  /** Contact page: left form + right info */
  function contactLayoutHTML() {
    var ciItem =
      '<div style="display:flex;gap:1rem;align-items:flex-start">' +
      b('height:2.5rem;width:2.5rem;border-radius:.5rem;flex-shrink:0') +
      '<div style="flex:1;display:flex;flex-direction:column;gap:.4rem">' +
      b('height:1rem;width:50%') +
      b('height:.875rem;width:75%') +
      '</div>' +
      '</div>';
    return (
      '<div class="sk-wrap sk-section">' +
      '<div class="sk-contact-two-col">' +
      // Left: form
      '<div style="display:flex;flex-direction:column;gap:1.25rem">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">' +
      '<div>' +
      b('height:.875rem;width:4rem;margin-bottom:.4rem') +
      b('height:2.75rem;width:100%;border-radius:.5rem') +
      '</div>' +
      '<div>' +
      b('height:.875rem;width:4rem;margin-bottom:.4rem') +
      b('height:2.75rem;width:100%;border-radius:.5rem') +
      '</div>' +
      '</div>' +
      '<div>' +
      b('height:.875rem;width:4rem;margin-bottom:.4rem') +
      b('height:2.75rem;width:100%;border-radius:.5rem') +
      '</div>' +
      '<div>' +
      b('height:.875rem;width:5rem;margin-bottom:.4rem') +
      b('height:7rem;width:100%;border-radius:.5rem') +
      '</div>' +
      b('height:3rem;width:10rem;border-radius:.5rem') +
      '</div>' +
      // Right: contact info
      '<div style="display:flex;flex-direction:column;gap:1.5rem">' +
      ciItem +
      ciItem +
      ciItem +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  /** Generic content for simple pages (privacy, terms, etc.) */
  function genericContentHTML() {
    var block =
      '<div style="margin-bottom:1.75rem">' +
      b('height:1.5rem;width:40%;margin-bottom:.75rem') +
      b('height:1rem;width:100%;margin-bottom:.4rem') +
      b('height:1rem;width:96%;margin-bottom:.4rem') +
      b('height:1rem;width:82%') +
      '</div>';
    var blocks = block + block + block + block;
    return '<div class="sk-section">' + '<div class="sk-wrap">' + blocks + '</div>' + '</div>';
  }

  /* ═══════════════════════════════════════════════════════════════════
     PAGE SKELETON COMPOSERS
  ═══════════════════════════════════════════════════════════════════ */

  var builders = {
    home: function () {
      return (
        heroHTML({ twoLine: true, buttons: true }) +
        statsHTML() +
        '<div class="sk-section">' +
        sectionHeadHTML('6rem', '18rem', true) +
        serviceCardsHTML(6) +
        '</div>' +
        '<div class="sk-section">' +
        sectionHeadHTML('8rem', '16rem', false) +
        articleCardsHTML(3) +
        '</div>'
      );
    },

    services: function () {
      return (
        heroHTML({ breadcrumb: true, buttons: true }) +
        '<div class="sk-section">' +
        sectionHeadHTML('6rem', '16rem', true) +
        serviceCardsHTML(6) +
        '</div>'
      );
    },

    portfolio: function () {
      return (
        heroHTML({ breadcrumb: true, buttons: false }) + filterTabsHTML() + projectCardsHTML(6)
      );
    },

    about: function () {
      return (
        heroHTML({ buttons: false }) +
        statsHTML() +
        '<div class="sk-section">' +
        sectionHeadHTML('4rem', '14rem', false) +
        memberCardsHTML(4) +
        '</div>'
      );
    },

    blog: function () {
      return heroHTML({ buttons: false }) + articleCardsHTML(6);
    },

    contact: function () {
      return heroHTML({ buttons: false }) + contactLayoutHTML();
    },

    careers: function () {
      var card =
        '<div style="border-radius:1rem;padding:1.5rem;border:1px solid var(--sk-border);' +
        'display:flex;flex-direction:column;gap:.75rem">' +
        b('height:1.5rem;width:70%') +
        b('height:1rem;width:45%;border-radius:999px') +
        b('height:.875rem;width:100%') +
        b('height:.875rem;width:85%') +
        b('height:2.25rem;width:6rem;border-radius:.5rem;margin-top:.5rem') +
        '</div>';
      var cards = card + card + card + card;
      return (
        heroHTML({ buttons: false }) +
        '<div class="sk-section">' +
        sectionHeadHTML('5rem', '18rem', true) +
        '<div class="sk-wrap">' +
        '<div class="sk-card-grid sk-card-grid-2">' +
        cards +
        '</div>' +
        '</div>' +
        '</div>'
      );
    },

    generic: function () {
      return heroHTML({ buttons: false }) + genericContentHTML();
    },
  };

  /* ═══════════════════════════════════════════════════════════════════
     PUBLIC API
  ═══════════════════════════════════════════════════════════════════ */

  /**
   * getSkeletonHTML(route)
   * Returns an HTML string to inject as a loading placeholder.
   * @param {string} route - e.g. 'home', 'services/mobile', 'portfolio/web'
   */
  window.getSkeletonHTML = function (route) {
    var type = getSkeletonType(route);
    var builder = builders[type] || builders.generic;
    return '<div class="sk-page-wrapper">' + builder() + '</div>';
  };
})();
