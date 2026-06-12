(function () {
  'use strict';

  /* ── Route → Skeleton type ────────────────────────────────────── */
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

  /* ── Shorthand: single shimmer block ─────────────────────────── */
  function b(style) {
    return '<div class="sk-block" style="' + style + '"></div>';
  }

  /* ── Shorthand: sk-card wrapper ──────────────────────────────── */
  function card(inner, extraStyle) {
    return (
      '<div class="sk-card' +
      (extraStyle ? '" style="' + extraStyle + '"' : '"') +
      '>' +
      inner +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     SHARED BLOCKS
  ═══════════════════════════════════════════════════════════════ */

  /**
   * sectionHead(pillW, titleW, showDesc, align)
   * Renders: eyebrow pill + heading + optional 2 description lines
   */
  function sectionHead(pillW, titleW, showDesc, align) {
    var center = (align || 'center') === 'center';
    var mx = center ? ';margin-left:auto;margin-right:auto' : '';
    var wrap = center
      ? 'class="sk-section-head"'
      : 'style="display:flex;flex-direction:column;gap:.625rem;margin-bottom:2rem"';
    var desc = showDesc
      ? b('height:1rem;width:min(30rem,88%)' + mx) + b('height:1rem;width:min(22rem,70%)' + mx)
      : '';
    return (
      '<div ' +
      wrap +
      '>' +
      b('height:1.375rem;width:' + pillW + ';border-radius:999px' + mx) +
      b('height:2.375rem;width:' + titleW + mx) +
      desc +
      '</div>'
    );
  }

  /**
   * heroSection(opts)
   * Renders: page hero with optional breadcrumb, 2-line heading, CTA buttons.
   * hasRight → shows hero-right stat-card placeholder (desktop only).
   */
  function heroSection(opts) {
    var o = opts || {};
    var hasRight = o.hasRight !== false;
    var twoLine = o.twoLine || false;
    var buttons = o.buttons !== false;
    var breadcrumb = o.breadcrumb || false;

    var bc = breadcrumb
      ? '<div style="display:flex;gap:.5rem;align-items:center;margin-bottom:1.5rem">' +
        b('height:.875rem;width:3.5rem;border-radius:.25rem') +
        b('height:.875rem;width:.375rem;border-radius:.25rem') +
        b('height:.875rem;width:5rem;border-radius:.25rem') +
        '</div>'
      : '';

    var leftHTML =
      bc +
      b('height:1.5rem;width:7.5rem;border-radius:999px;margin-bottom:1.375rem') +
      b('height:3.5rem;width:78%;margin-bottom:.625rem') +
      (twoLine ? b('height:3.5rem;width:52%;margin-bottom:1.625rem') : '') +
      b('height:1.125rem;width:86%;margin-bottom:.4rem') +
      b('height:1.125rem;width:66%;margin-bottom:' + (buttons ? '2rem' : '.5rem')) +
      (buttons
        ? '<div style="display:flex;gap:.75rem;margin-top:.25rem">' +
          b('height:3.25rem;width:9.5rem;border-radius:.75rem') +
          b('height:3.25rem;width:8.5rem;border-radius:.75rem') +
          '</div>'
        : '');

    if (!hasRight) {
      return (
        '<section style="padding:7rem 0 4rem">' +
        '<div class="sk-wrap">' +
        leftHTML +
        '</div>' +
        '</section>'
      );
    }

    /* Right column — 4 stat cards at corners + center icon placeholder.
       Hidden on mobile (display:none), shown at lg via .sk-hero-right CSS class */
    var rightHTML =
      b(
        'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
          'height:96px;width:96px;border-radius:50%'
      ) +
      '<div style="position:absolute;top:15%;right:0;width:128px">' +
      b('height:62px;width:100%;border-radius:.75rem') +
      '</div>' +
      '<div style="position:absolute;top:15%;left:0;width:128px">' +
      b('height:62px;width:100%;border-radius:.75rem') +
      '</div>' +
      '<div style="position:absolute;bottom:10%;right:0;width:128px">' +
      b('height:62px;width:100%;border-radius:.75rem') +
      '</div>' +
      '<div style="position:absolute;bottom:10%;left:0;width:128px">' +
      b('height:62px;width:100%;border-radius:.75rem') +
      '</div>';

    return (
      '<section style="padding:8rem 0 8rem;overflow:hidden">' +
      '<div class="sk-wrap">' +
      '<div class="sk-hero-grid">' +
      '<div>' +
      leftHTML +
      '</div>' +
      '<div class="sk-hero-right" style="display:none;position:relative;height:480px">' +
      rightHTML +
      '</div>' +
      '</div>' +
      '</div>' +
      '</section>'
    );
  }

  /** 4-column stats bar (homepage & about) */
  function statsRow() {
    function statCard() {
      return card(
        b('height:1.75rem;width:2.75rem;border-radius:999px') +
          b('height:1.5rem;width:62%') +
          b('height:.875rem;width:78%')
      );
    }
    return (
      '<div class="sk-wrap" style="margin-bottom:2.5rem">' +
      '<div class="sk-grid sk-grid-4">' +
      statCard() +
      statCard() +
      statCard() +
      statCard() +
      '</div>' +
      '</div>'
    );
  }

  /** 6-card service/feature grid (icon + title + desc lines + link) */
  function serviceCards(count) {
    var inner =
      b('height:3.5rem;width:3.5rem;border-radius:.75rem') +
      b('height:1.375rem;width:68%') +
      b('height:.875rem;width:100%') +
      b('height:.875rem;width:86%') +
      b('height:.875rem;width:56%') +
      b('height:.875rem;width:4rem;border-radius:999px;margin-top:.25rem');
    var out = '';
    for (var i = 0; i < count; i++) out += card(inner);
    return '<div class="sk-wrap">' + '<div class="sk-grid sk-grid-3">' + out + '</div>' + '</div>';
  }

  /** Project cards with tall image thumb + title + tag pills */
  function projectCards(count) {
    var c =
      '<div style="border-radius:var(--radius-lg,1rem);overflow:hidden;' +
      'border:1px solid var(--border);background:var(--card)">' +
      b('height:200px;border-radius:0') +
      '<div style="padding:1rem;display:flex;flex-direction:column;gap:.5rem">' +
      b('height:1.25rem;width:86%') +
      b('height:1rem;width:60%') +
      '<div style="display:flex;gap:.4rem;margin-top:.25rem">' +
      b('height:1.375rem;width:3.5rem;border-radius:999px') +
      b('height:1.375rem;width:3.5rem;border-radius:999px') +
      b('height:1.375rem;width:3.5rem;border-radius:999px') +
      '</div>' +
      '</div>' +
      '</div>';
    var out = '';
    for (var i = 0; i < count; i++) out += c;
    return (
      '<div class="sk-wrap" style="margin-bottom:3rem">' +
      '<div class="sk-grid sk-grid-3">' +
      out +
      '</div>' +
      '</div>'
    );
  }

  /** Filter tab pills row */
  function filterTabs() {
    var ws = ['5rem', '7.5rem', '6rem', '5.5rem', '7rem', '6.5rem'];
    var tabs = ws
      .map(function (w) {
        return b('height:2.375rem;width:' + w + ';border-radius:999px');
      })
      .join('');
    return (
      '<div class="sk-wrap" style="padding-block:1rem 2rem">' +
      '<div style="display:flex;gap:.625rem;flex-wrap:wrap">' +
      tabs +
      '</div>' +
      '</div>'
    );
  }

  /** Article / blog cards (image + category pill + heading + excerpt) */
  function articleCards(count) {
    var c =
      '<div style="border-radius:var(--radius-lg,1rem);overflow:hidden;' +
      'border:1px solid var(--border);background:var(--card)">' +
      b('height:11rem;border-radius:0') +
      '<div style="padding:1.25rem;display:flex;flex-direction:column;gap:.5rem">' +
      b('height:1.25rem;width:3.5rem;border-radius:999px') +
      b('height:1.125rem;width:90%') +
      b('height:1.125rem;width:68%') +
      b('height:.875rem;width:100%') +
      b('height:.875rem;width:76%') +
      '</div>' +
      '</div>';
    var out = '';
    for (var i = 0; i < count; i++) out += c;
    return (
      '<div class="sk-wrap" style="margin-bottom:4rem">' +
      '<div class="sk-grid sk-grid-3">' +
      out +
      '</div>' +
      '</div>'
    );
  }

  /** Team member cards (avatar + name + role + bio line) */
  function memberCards(count) {
    var c = card(
      b('height:5rem;width:5rem;border-radius:50%;margin:0 auto') +
        b('height:1.25rem;width:58%;margin:0 auto') +
        b('height:1rem;width:42%;border-radius:999px;margin:0 auto') +
        b('height:.875rem;width:80%;margin:0 auto'),
      'align-items:center;text-align:center'
    );
    var out = '';
    for (var i = 0; i < count; i++) out += c;
    var cols = count <= 4 ? count : 3;
    return (
      '<div class="sk-wrap" style="margin-bottom:4rem">' +
      '<div class="sk-grid sk-grid-' +
      cols +
      '">' +
      out +
      '</div>' +
      '</div>'
    );
  }

  /** Contact: 2-col layout (form left, contact info right) */
  function contactLayout() {
    var ciItem =
      '<div style="display:flex;gap:1rem;align-items:flex-start">' +
      b('height:2.5rem;width:2.5rem;border-radius:.5rem;flex-shrink:0') +
      '<div style="flex:1;display:flex;flex-direction:column;gap:.4rem">' +
      b('height:1rem;width:50%') +
      b('height:.875rem;width:74%') +
      '</div></div>';
    return (
      '<div class="sk-wrap" style="padding-block:1rem 4rem">' +
      '<div class="sk-contact-cols">' +
      // Left: form skeleton
      '<div style="display:flex;flex-direction:column;gap:1.25rem">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">' +
      '<div>' +
      b('height:.875rem;width:4rem;margin-bottom:.4rem') +
      b('height:2.75rem;border-radius:.5rem') +
      '</div>' +
      '<div>' +
      b('height:.875rem;width:4rem;margin-bottom:.4rem') +
      b('height:2.75rem;border-radius:.5rem') +
      '</div>' +
      '</div>' +
      '<div>' +
      b('height:.875rem;width:4rem;margin-bottom:.4rem') +
      b('height:2.75rem;border-radius:.5rem') +
      '</div>' +
      '<div>' +
      b('height:.875rem;width:3rem;margin-bottom:.4rem') +
      b('height:2.75rem;border-radius:.5rem') +
      '</div>' +
      '<div>' +
      b('height:.875rem;width:5rem;margin-bottom:.4rem') +
      b('height:7rem;border-radius:.5rem') +
      '</div>' +
      b('height:3rem;width:10rem;border-radius:.5rem') +
      '</div>' +
      // Right: contact info items
      '<div style="display:flex;flex-direction:column;gap:1.5rem">' +
      ciItem +
      ciItem +
      ciItem +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  /** Generic content (privacy, terms, cookies) */
  function genericContent() {
    var blk =
      '<div style="margin-bottom:1.75rem">' +
      b('height:1.5rem;width:40%;margin-bottom:.75rem') +
      b('height:1rem;width:100%;margin-bottom:.4rem') +
      b('height:1rem;width:95%;margin-bottom:.4rem') +
      b('height:1rem;width:80%') +
      '</div>';
    return (
      '<div class="sk-wrap" style="padding-block:1.5rem 5rem">' + blk + blk + blk + blk + '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     HOME — Mirrors home.html section by section
  ═══════════════════════════════════════════════════════════════ */

  function homeHTML() {
    /* ── 1. Hero (min-h-screen, 2-col grid) ──────────────────────
       Left : eyebrow + 2-line h1 + description + 2 CTA buttons
       Right: 4 stat cards at corners + center icon (lg only)    */
    var hero = heroSection({ hasRight: true, twoLine: true, buttons: true });

    /* ── 2. 3D Carousel Section (compressed preview) ─────────────
       Real section uses sticky scroll (≈ 700 vh).
       Skeleton shows: heading + 3 card stubs + info label below  */
    var carousel =
      '<section style="padding:4rem 0 3rem;' +
      'background:color-mix(in srgb,var(--muted) 40%,transparent)">' +
      '<div class="sk-wrap">' +
      sectionHead('5.5rem', '10rem', false, 'center') +
      '<div class="sk-carousel-row">' +
      b('height:240px;width:160px;border-radius:1.25rem;opacity:.35') +
      b('height:290px;width:190px;border-radius:1.25rem') +
      b('height:240px;width:160px;border-radius:1.25rem;opacity:.35') +
      '</div>' +
      // Info label (name + desc + tags)
      '<div style="display:flex;flex-direction:column;align-items:center;' +
      'gap:.5rem;padding-top:1.5rem;margin-bottom:.5rem">' +
      b('height:1.375rem;width:12rem') +
      b('height:1rem;width:18rem') +
      '<div style="display:flex;gap:.5rem;margin-top:.25rem">' +
      b('height:1.5rem;width:5rem;border-radius:999px') +
      b('height:1.5rem;width:5rem;border-radius:999px') +
      b('height:1.5rem;width:4.5rem;border-radius:999px') +
      '</div>' +
      '</div>' +
      '</div>' +
      '</section>';

    /* ── 3. Infinite slides (2 rows of scrolling badge pills) ─── */
    var pillSizes = [
      '9rem',
      '8rem',
      '10rem',
      '7.5rem',
      '9.5rem',
      '8.5rem',
      '10rem',
      '8rem',
      '9.5rem',
    ];
    var pillRow = pillSizes
      .map(function (w) {
        return b('height:3.5rem;width:' + w + ';border-radius:1rem');
      })
      .join('');
    var slides =
      '<section style="padding:3.5rem 0 1.5rem;overflow:hidden">' +
      '<div class="sk-wrap" style="margin-bottom:.875rem">' +
      b('height:1rem;width:10rem;border-radius:999px;margin:0 auto') +
      '</div>' +
      '<div class="sk-pill-row" style="margin-bottom:.75rem">' +
      pillRow +
      '</div>' +
      '<div class="sk-pill-row">' +
      pillRow +
      '</div>' +
      '</section>';

    /* ── 4. Services Preview (bg-muted/50, rounded-t-[3rem]) ─────
       Heading + 3×2 grid of service cards                        */
    var services =
      '<section style="padding:5rem 0;' +
      'background:color-mix(in srgb,var(--muted) 50%,transparent);' +
      'border-radius:3rem 3rem 0 0">' +
      sectionHead('5rem', '14rem', true, 'center') +
      serviceCards(6) +
      '</section>';

    /* ── 5. Testimonials (single carousel card + nav) ────────────
       Heading + large quote card + prev/dots/next row            */
    var tmcCard =
      '<div class="sk-tmc-card">' +
      b('height:1.5rem;width:1.5rem;border-radius:.25rem;margin-bottom:.75rem') +
      b('height:1.125rem;width:96%;margin-bottom:.5rem') +
      b('height:1.125rem;width:88%;margin-bottom:.5rem') +
      b('height:1.125rem;width:72%;margin-bottom:1.75rem') +
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
      '<div style="display:flex;align-items:center;gap:.75rem">' +
      b('height:3rem;width:3rem;border-radius:50%') +
      '<div style="display:flex;flex-direction:column;gap:.35rem">' +
      b('height:1rem;width:7rem') +
      b('height:.75rem;width:5rem;border-radius:999px') +
      '</div>' +
      '</div>' +
      b('height:1rem;width:5rem;border-radius:999px') +
      '</div>' +
      '</div>';
    var tmcDots =
      '<div class="sk-dots">' +
      b('height:2.25rem;width:2.25rem;border-radius:50%') +
      b('height:.625rem;width:1.75rem;border-radius:999px') +
      b('height:.625rem;width:.625rem;border-radius:50%') +
      b('height:.625rem;width:.625rem;border-radius:50%') +
      b('height:.625rem;width:.625rem;border-radius:50%') +
      b('height:2.25rem;width:2.25rem;border-radius:50%') +
      '</div>';
    var testimonials =
      '<section style="padding:5rem 0">' +
      '<div class="sk-wrap">' +
      sectionHead('7.5rem', '12rem', true, 'center') +
      tmcCard +
      tmcDots +
      '</div>' +
      '</section>';

    /* ── 6. Featured Project (large rounded card, 2-col) ─────────
       Left:  badge + heading + desc + 3 metrics + CTA button
       Right: card-swap placeholder (hidden on mobile)            */
    var projLeft =
      b('height:1.5rem;width:9.5rem;border-radius:999px;margin-bottom:1.5rem') +
      b('height:2.75rem;width:88%;margin-bottom:.625rem') +
      b('height:2.75rem;width:60%;margin-bottom:1.5rem') +
      b('height:1.1rem;width:96%;margin-bottom:.4rem') +
      b('height:1.1rem;width:80%;margin-bottom:2rem') +
      // Metric trio
      '<div style="display:flex;align-items:center;gap:1.75rem;margin-bottom:2.5rem">' +
      '<div>' +
      b('height:2rem;width:3.5rem;margin-bottom:.25rem') +
      b('height:.75rem;width:3rem') +
      '</div>' +
      b('height:2.5rem;width:1px') +
      '<div>' +
      b('height:2rem;width:3.5rem;margin-bottom:.25rem') +
      b('height:.75rem;width:3rem') +
      '</div>' +
      b('height:2.5rem;width:1px') +
      '<div>' +
      b('height:2rem;width:2.5rem;margin-bottom:.25rem') +
      b('height:.75rem;width:2.5rem') +
      '</div>' +
      '</div>' +
      b('height:3.25rem;width:9.5rem;border-radius:.75rem');

    var projRight =
      '<div class="sk-featured-right" style="display:none;position:relative;min-height:340px">' +
      b('height:100%;min-height:340px;border-radius:1.5rem') +
      '</div>';

    var featured =
      '<section style="padding:5rem 0">' +
      '<div class="sk-wrap">' +
      '<div class="sk-featured-card">' +
      '<div class="sk-featured-grid">' +
      '<div>' +
      projLeft +
      '</div>' +
      projRight +
      '</div>' +
      '</div>' +
      '</div>' +
      '</section>';

    /* ── 7. CTA Section (centered, 2 buttons + 3 trust badges) ── */
    var cta =
      '<section style="padding:5rem 0;text-align:center">' +
      '<div class="sk-wrap" style="display:flex;flex-direction:column;' +
      'align-items:center;gap:.75rem">' +
      b('height:1rem;width:4.5rem;border-radius:999px') +
      b('height:3.5rem;width:min(22rem,80%)') +
      b('height:1.25rem;width:min(30rem,85%)') +
      b('height:1.25rem;width:min(22rem,70%)') +
      '<div style="display:flex;gap:1rem;margin-top:1.5rem;flex-wrap:wrap;' +
      'justify-content:center">' +
      b('height:3.75rem;width:9.5rem;border-radius:.75rem') +
      b('height:3.75rem;width:9rem;border-radius:.75rem') +
      '</div>' +
      '<div style="display:flex;gap:1.25rem;margin-top:1.5rem;flex-wrap:wrap;' +
      'justify-content:center">' +
      b('height:1.25rem;width:8rem;border-radius:999px') +
      b('height:1.25rem;width:7rem;border-radius:999px') +
      b('height:1.25rem;width:7.5rem;border-radius:999px') +
      '</div>' +
      '</div>' +
      '</section>';

    return (
      '<div class="sk-page">' +
      hero +
      carousel +
      slides +
      services +
      testimonials +
      featured +
      cta +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     SERVICES — hero + 6-card detail grid
  ═══════════════════════════════════════════════════════════════ */
  function servicesHTML() {
    var detailCard =
      '<div style="border-radius:var(--radius-lg,1rem);overflow:hidden;' +
      'border:1px solid var(--border);background:var(--card)">' +
      b('height:150px;border-radius:0') +
      '<div style="padding:1.5rem;display:flex;flex-direction:column;gap:.6rem">' +
      b('height:1.375rem;width:64%') +
      b('height:.875rem;width:100%') +
      b('height:.875rem;width:84%') +
      b('height:.875rem;width:54%') +
      '<div style="display:flex;gap:.4rem;margin-top:.25rem">' +
      b('height:1.25rem;width:3.5rem;border-radius:999px') +
      b('height:1.25rem;width:3.5rem;border-radius:999px') +
      '</div>' +
      '</div>' +
      '</div>';
    var cards = '';
    for (var i = 0; i < 6; i++) cards += detailCard;
    return (
      '<div class="sk-page">' +
      heroSection({ hasRight: false, twoLine: false, buttons: true, breadcrumb: true }) +
      '<section style="padding:1.5rem 0 5rem">' +
      sectionHead('5.5rem', '16rem', true, 'center') +
      '<div class="sk-wrap"><div class="sk-grid sk-grid-3">' +
      cards +
      '</div></div>' +
      '</section>' +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     PORTFOLIO — hero + filter tabs + 6-card project grid
     (Same structure used for /web, /mobile, /case-studies)
  ═══════════════════════════════════════════════════════════════ */
  function portfolioHTML() {
    return (
      '<div class="sk-page">' +
      heroSection({ hasRight: false, twoLine: false, buttons: false, breadcrumb: true }) +
      filterTabs() +
      projectCards(6) +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     ABOUT — hero + stats + team members + values/timeline
  ═══════════════════════════════════════════════════════════════ */
  function aboutHTML() {
    var timelineItem =
      '<div style="display:flex;gap:1rem;align-items:flex-start;' +
      'padding:1.5rem;border:1px solid var(--border);border-radius:1rem;' +
      'background:var(--card)">' +
      b('height:2.5rem;width:2.5rem;border-radius:.5rem;flex-shrink:0') +
      '<div style="flex:1;display:flex;flex-direction:column;gap:.4rem">' +
      b('height:1.125rem;width:55%') +
      b('height:.875rem;width:100%') +
      b('height:.875rem;width:78%') +
      '</div>' +
      '</div>';
    return (
      '<div class="sk-page">' +
      heroSection({ hasRight: false, twoLine: false, buttons: false }) +
      statsRow() +
      '<section style="padding:4rem 0">' +
      sectionHead('5rem', '14rem', false, 'center') +
      memberCards(4) +
      '</section>' +
      '<section style="padding:2rem 0 5rem">' +
      sectionHead('5rem', '12rem', false, 'left') +
      '<div class="sk-wrap">' +
      '<div style="display:flex;flex-direction:column;gap:1rem">' +
      timelineItem +
      timelineItem +
      timelineItem +
      '</div>' +
      '</div>' +
      '</section>' +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     BLOG — hero + filter tabs + 6 article cards
  ═══════════════════════════════════════════════════════════════ */
  function blogHTML() {
    return (
      '<div class="sk-page">' +
      heroSection({ hasRight: false, buttons: false }) +
      '<section style="padding:1rem 0 5rem">' +
      filterTabs() +
      articleCards(6) +
      '</section>' +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     CONTACT — hero + 2-col form layout
  ═══════════════════════════════════════════════════════════════ */
  function contactHTML() {
    return (
      '<div class="sk-page">' +
      heroSection({ hasRight: false, buttons: false }) +
      contactLayout() +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     CAREERS — hero + 2-col job listing cards
  ═══════════════════════════════════════════════════════════════ */
  function careersHTML() {
    var jobCard = card(
      b('height:1.375rem;width:66%;margin-bottom:.125rem') +
        b('height:1rem;width:40%;border-radius:999px') +
        b('height:.875rem;width:96%;margin-top:.25rem') +
        b('height:.875rem;width:78%') +
        '<div style="display:flex;gap:.4rem;margin-top:.5rem">' +
        b('height:1.25rem;width:4rem;border-radius:999px') +
        b('height:1.25rem;width:5rem;border-radius:999px') +
        b('height:1.25rem;width:4.5rem;border-radius:999px') +
        '</div>' +
        b('height:2.75rem;width:6rem;border-radius:.5rem;margin-top:.5rem')
    );
    var cards = jobCard + jobCard + jobCard + jobCard;
    return (
      '<div class="sk-page">' +
      heroSection({ hasRight: false, buttons: false }) +
      '<section style="padding:1.5rem 0 5rem">' +
      sectionHead('5rem', '16rem', true, 'center') +
      '<div class="sk-wrap"><div class="sk-grid sk-grid-2">' +
      cards +
      '</div></div>' +
      '</section>' +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     GENERIC — hero + prose content blocks (privacy, terms, etc.)
  ═══════════════════════════════════════════════════════════════ */
  function genericHTML() {
    return (
      '<div class="sk-page">' +
      heroSection({ hasRight: false, buttons: false }) +
      '<div style="padding-block:1rem 5rem">' +
      genericContent() +
      '</div>' +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     BUILDER MAP
  ═══════════════════════════════════════════════════════════════ */
  var builders = {
    home: homeHTML,
    services: servicesHTML,
    portfolio: portfolioHTML,
    about: aboutHTML,
    blog: blogHTML,
    contact: contactHTML,
    careers: careersHTML,
    generic: genericHTML,
  };

  /* ═══════════════════════════════════════════════════════════════
     PUBLIC API
     window.getSkeletonHTML(route) → HTML string
  ═══════════════════════════════════════════════════════════════ */
  window.getSkeletonHTML = function (route) {
    var type = getSkeletonType(route);
    var builder = builders[type] || builders.generic;
    return builder();
  };
})();
