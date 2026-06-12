(function () {
  'use strict';

  /* ── Route → Skeleton type ─────────────────────────────────── */
  function getSkeletonType(route) {
    if (route === 'home') return 'home';
    if (route === 'services' || route.startsWith('services/')) return 'services';
    if (route === 'portfolio/web') return 'portfolio-web';
    if (route === 'portfolio/mobile') return 'portfolio-mobile';
    if (route === 'portfolio/case-studies') return 'portfolio-case-studies';
    if (route === 'portfolio') return 'portfolio';
    if (route === 'about') return 'about';
    if (route === 'blog') return 'blog';
    if (route === 'contact') return 'contact';
    if (route === 'careers') return 'careers';
    return 'generic';
  }

  /* ── Shorthand: shimmer block ──────────────────────────────── */
  function b(style) {
    return '<div class="sk-block" style="' + style + '"></div>';
  }

  /* ── Shorthand: card shell ─────────────────────────────────── */
  function card(inner, extraStyle) {
    return (
      '<div class="sk-card"' +
      (extraStyle ? ' style="' + extraStyle + '"' : '') +
      '>' +
      inner +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════
     SHARED BUILDING BLOCKS
     ═══════════════════════════════════════════════════════════ */

  /* Section eyebrow + heading + optional desc lines */
  function sectionHead(pillW, titleW, showDesc, align) {
    var center = (align || 'center') === 'center';
    var mx = center ? ';margin-left:auto;margin-right:auto' : '';
    var wrap = center
      ? 'class="sk-section-head"'
      : 'style="display:flex;flex-direction:column;gap:.625rem;margin-bottom:2rem"';
    var desc = showDesc
      ? b('height:1rem;width:clamp(30rem,88%,100%)' + mx) +
        b('height:1rem;width:clamp(22rem,70%,100%)' + mx)
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

  /*
   * heroSection(opts) — standard left-aligned page hero.
   * hasRight: show right stat-card column (home only).
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
        '<section style="padding:8rem 0 5rem">' +
        '<div class="sk-wrap"><div class="sk-wrap" style="max-width:48rem;padding:0">' +
        leftHTML +
        '</div></div>' +
        '</section>'
      );
    }
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
      '<div class="sk-hero-right" style="display:flex;position:relative;height:480px">' +
      rightHTML +
      '</div>' +
      '</div></div></section>'
    );
  }

  /*
   * centeredHero(pillW, titleW) — centered hero for portfolio sub-pages.
   * Matches .port-hero / .mob-hero / .cs-hero style.
   */
  function centeredHero(pillW, titleW) {
    return (
      '<section style="padding:5rem 0 3rem;text-align:center">' +
      '<div style="display:flex;flex-direction:column;align-items:center;gap:.75rem">' +
      b('height:1.75rem;width:' + (pillW || '6rem') + ';border-radius:999px') +
      b('height:2.75rem;width:' + (titleW || '12rem') + ';margin:0 auto') +
      b('height:1.125rem;width:clamp(30rem,80%,100%);margin:0 auto') +
      '</div></section>'
    );
  }

  /* 4-col stat cards row (homepage) */
  function statsRow() {
    function sc() {
      return card(
        b('height:1.75rem;width:2.75rem;border-radius:999px') +
          b('height:1.5rem;width:62%') +
          b('height:.875rem;width:78%')
      );
    }
    return (
      '<div class="sk-wrap" style="margin-bottom:2.5rem">' +
      '<div class="sk-grid sk-grid-4">' +
      sc() +
      sc() +
      sc() +
      sc() +
      '</div>' +
      '</div>'
    );
  }

  /* About-page stats: 4 large numbers centered in a row */
  function aboutStats() {
    function col() {
      return (
        '<div style="text-align:center;padding:1rem">' +
        b('height:3rem;width:4rem;margin:0 auto .5rem;border-radius:.25rem') +
        b('height:1rem;width:7rem;margin:0 auto;border-radius:999px') +
        '</div>'
      );
    }
    return (
      '<div class="sk-wrap" style="padding-block:1.5rem">' +
      '<div class="sk-grid sk-grid-4">' +
      col() +
      col() +
      col() +
      col() +
      '</div>' +
      '</div>'
    );
  }

  /* 3-col service cards (homepage preview grid) */
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
    return '<div class="sk-wrap"><div class="sk-grid sk-grid-3">' + out + '</div></div>';
  }

  /*
   * serviceCards2Col(count) — 2-col service cards for /services page.
   * Each card: top row (icon 64×64 + number badge), h3, desc, tech tag pills.
   */
  function serviceCards2Col(count) {
    var inner =
      '<div style="display:flex;align-items:center;justify-content:space-between;' +
      'margin-bottom:1.5rem">' +
      b('height:4rem;width:4rem;border-radius:.75rem') +
      b('height:1rem;width:1.5rem;border-radius:.25rem') +
      '</div>' +
      b('height:1.5rem;width:64%;margin-bottom:.75rem') +
      b('height:.9rem;width:100%;margin-bottom:.4rem') +
      b('height:.9rem;width:94%;margin-bottom:.4rem') +
      b('height:.9rem;width:80%;margin-bottom:1.25rem') +
      '<div style="display:flex;gap:.5rem;flex-wrap:wrap">' +
      b('height:1.625rem;width:3.5rem;border-radius:999px') +
      b('height:1.625rem;width:4rem;border-radius:999px') +
      b('height:1.625rem;width:3.5rem;border-radius:999px') +
      '</div>';
    var out = '';
    for (var i = 0; i < count; i++) {
      out += card(inner, 'border-radius:1.5rem;padding:2rem 2.5rem');
    }
    return '<div class="sk-wrap"><div class="sk-grid sk-grid-2">' + out + '</div></div>';
  }

  /*
   * workflowSteps(count) — numbered-circle steps for /services workflow section.
   */
  function workflowSteps(count) {
    var c =
      '<div style="background:var(--card);border:1px solid var(--border);' +
      'border-radius:1.5rem;padding:2rem;text-align:center;display:flex;' +
      'flex-direction:column;align-items:center;gap:.625rem">' +
      b('height:3rem;width:3rem;border-radius:50%;margin:0 auto .5rem') +
      b('height:1.25rem;width:6rem;margin:0 auto') +
      b('height:.875rem;width:90%;margin:0 auto') +
      b('height:.875rem;width:72%;margin:0 auto') +
      '</div>';
    var out = '';
    for (var i = 0; i < count; i++) out += c;
    return '<div class="sk-wrap"><div class="sk-grid sk-grid-4">' + out + '</div></div>';
  }

  /* Generic project cards: tall image + title + tags (portfolio main page) */
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
      '</div></div></div>';
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

  /* Filter tab pills */
  function filterTabs() {
    var ws = ['5rem', '7.5rem', '6rem', '5.5rem', '7rem', '6.5rem'];
    return (
      '<div class="sk-wrap" style="padding-block:1rem 2rem">' +
      '<div style="display:flex;gap:.625rem;flex-wrap:wrap">' +
      ws
        .map(function (w) {
          return b('height:2.375rem;width:' + w + ';border-radius:999px');
        })
        .join('') +
      '</div></div>'
    );
  }

  /* Centered filter bar (for portfolio sub-pages) */
  function centeredFilterBar() {
    var ws = ['5rem', '7rem', '6.5rem', '6rem', '7.5rem'];
    return (
      '<div style="display:flex;align-items:center;justify-content:center;' +
      'gap:.5rem;flex-wrap:wrap;margin-bottom:3rem;padding:0 1rem">' +
      ws
        .map(function (w) {
          return b('height:2.25rem;width:' + w + ';border-radius:999px');
        })
        .join('') +
      '</div>'
    );
  }

  /*
   * portWebCards(count) — colored image area + card body for /portfolio/web.
   */
  function portWebCards(count) {
    var c =
      '<div style="background:var(--card);border:1px solid var(--border);' +
      'border-radius:1.25rem;overflow:hidden">' +
      b('height:200px;border-radius:0') +
      '<div style="padding:1.25rem 1.5rem 1.5rem;display:flex;flex-direction:column;gap:.5rem">' +
      b('height:1.25rem;width:72%') +
      b('height:.875rem;width:100%') +
      b('height:.875rem;width:78%') +
      '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.25rem">' +
      b('height:1.5rem;width:3.5rem;border-radius:5px') +
      b('height:1.5rem;width:4rem;border-radius:5px') +
      b('height:1.5rem;width:3.5rem;border-radius:5px') +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;' +
      'padding-top:.875rem;border-top:1px solid var(--border);margin-top:.375rem">' +
      '<div style="display:flex;flex-direction:column;gap:.3rem">' +
      b('height:.875rem;width:5.5rem') +
      b('height:.75rem;width:4rem;border-radius:999px') +
      '</div>' +
      b('height:1rem;width:5rem;border-radius:999px') +
      '</div></div></div>';
    var out = '';
    for (var i = 0; i < count; i++) out += c;
    return (
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));' +
      'gap:1.5rem;padding:0 1.5rem;max-width:1200px;margin:0 auto">' +
      out +
      '</div>'
    );
  }

  /*
   * portMobileCards(count) — sidebar layout for /portfolio/mobile.
   * Left sidebar: app icon + platform badges. Right body: h3 + desc + tags + status.
   */
  function portMobileCards(count) {
    var c =
      '<div style="background:var(--card);border:1px solid var(--border);' +
      'border-radius:1.25rem;overflow:hidden;display:flex">' +
      '<div style="width:90px;flex-shrink:0;display:flex;flex-direction:' +
      'align-items:center;justify-content:center;gap:8px;padding:1.25rem .75rem;' +
      'border-right:1px solid var(--border)">' +
      b('height:56px;width:56px;border-radius:14px') +
      b('height:1.375rem;width:3rem;border-radius:4px') +
      b('height:1.375rem;width:3rem;border-radius:4px') +
      '</div>' +
      '<div style="flex:1;padding:1.25rem;display:flex;flex-direction:column;gap:.5rem">' +
      b('height:1.125rem;width:78%') +
      b('height:.875rem;width:96%') +
      b('height:.875rem;width:72%') +
      '<div style="display:flex;gap:.4rem;flex-wrap:wrap">' +
      b('height:1.25rem;width:3.5rem;border-radius:4px') +
      b('height:1.25rem;width:4rem;border-radius:4px') +
      b('height:1.25rem;width:3rem;border-radius:4px') +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:.25rem">' +
      b('height:1.375rem;width:5rem;border-radius:999px') +
      b('height:1rem;width:5.5rem;border-radius:999px') +
      '</div></div></div>';
    var out = '';
    for (var i = 0; i < count; i++) out += c;
    return (
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));' +
      'gap:1.5rem;padding:0 1.5rem;max-width:1200px;margin:0 auto">' +
      out +
      '</div>'
    );
  }

  /* CTA used at bottom of portfolio sub-pages */
  function portCTA() {
    return (
      '<div style="text-align:center;padding:4rem 1.5rem;max-width:600px;margin:0 auto">' +
      b('height:2rem;width:14rem;margin:0 auto .75rem') +
      b('height:1.125rem;width:clamp(28rem,80%,100%);margin:0 auto .5rem') +
      b('height:1.125rem;width:clamp(22rem,70%,100%);margin:0 auto 1.75rem') +
      b('height:3.25rem;width:9.5rem;border-radius:.75rem;margin:0 auto') +
      '</div>'
    );
  }

  /*
   * csFeatureCard() — 2-col featured case study for /portfolio/case-studies.
   * Left: primary-tinted bg + badge + 3 metric boxes.
   * Right: label + h2 + desc + checklist + tags + CTA.
   */
  function csFeatureCard() {
    var metrics =
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem">' +
      ['55%', '50%', '50%']
        .map(function (w) {
          return (
            '<div style="background:var(--background);border:1px solid var(--border);' +
            'border-radius:.75rem;padding:.875rem;text-align:center">' +
            b('height:1.75rem;width:' + w + ';margin:0 auto .3rem') +
            b('height:.75rem;width:78%;margin:0 auto') +
            '</div>'
          );
        })
        .join('') +
      '</div>';
    var right =
      b('height:1rem;width:8rem;margin-bottom:1rem;border-radius:999px') +
      b('height:2rem;width:90%;margin-bottom:.5rem') +
      b('height:2rem;width:64%;margin-bottom:1rem') +
      b('height:.9rem;width:100%;margin-bottom:.4rem') +
      b('height:.9rem;width:84%;margin-bottom:1.25rem') +
      '<div style="display:flex;flex-direction:column;gap:.5rem;margin-bottom:1.25rem">' +
      b('height:.875rem;width:76%') +
      b('height:.875rem;width:82%') +
      b('height:.875rem;width:72%') +
      b('height:.875rem;width:78%') +
      '</div>' +
      '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:1.25rem">' +
      b('height:1.5rem;width:4rem;border-radius:5px') +
      b('height:1.5rem;width:4.5rem;border-radius:5px') +
      b('height:1.5rem;width:5.5rem;border-radius:5px') +
      b('height:1.5rem;width:4rem;border-radius:5px') +
      '</div>' +
      b('height:2.25rem;width:12rem;border-radius:.5rem');
    return (
      '<div style="max-width:1100px;margin:0 auto 3.5rem;padding:0 1.5rem">' +
      '<div style="background:var(--card);border:1px solid var(--border);' +
      'border-radius:1.5rem;overflow:hidden;display:grid;grid-template-columns:1fr 1fr">' +
      '<div style="background:color-mix(in srgb,var(--primary) 12%,var(--muted));' +
      'padding:2.5rem;display:flex;flex-direction:column;justify-content:center;min-height:280px">' +
      b('height:1.5rem;width:8rem;border-radius:6px') +
      metrics +
      '</div>' +
      '<div style="padding:2.5rem">' +
      right +
      '</div>' +
      '</div></div>'
    );
  }

  /*
   * csCaseRows(count) — list rows for /portfolio/case-studies.
   * 5-col: title+desc | KPI | KPI | tags | button.
   */
  function csCaseRows(count) {
    var row =
      '<div style="background:var(--card);border:1px solid var(--border);' +
      'border-radius:1.25rem;padding:1.5rem 2rem;display:grid;' +
      'grid-template-columns:3fr 1fr 1fr 1fr auto;align-items:center;gap:1.5rem">' +
      '<div style="display:flex;flex-direction:column;gap:.4rem">' +
      b('height:1.25rem;width:86%') +
      b('height:.875rem;width:96%') +
      b('height:.875rem;width:68%') +
      '</div>' +
      '<div style="text-align:center">' +
      b('height:1.75rem;width:55%;margin:0 auto .3rem') +
      b('height:.75rem;width:70%;margin:0 auto') +
      '</div>' +
      '<div style="text-align:center">' +
      b('height:1.75rem;width:50%;margin:0 auto .3rem') +
      b('height:.75rem;width:65%;margin:0 auto') +
      '</div>' +
      '<div style="display:flex;gap:.4rem;flex-wrap:wrap">' +
      b('height:1.375rem;width:3rem;border-radius:4px') +
      b('height:1.375rem;width:3.5rem;border-radius:4px') +
      '</div>' +
      b('height:2rem;width:4.5rem;border-radius:.5rem') +
      '</div>';
    var out = '';
    for (var i = 0; i < count; i++) out += row;
    return (
      '<div style="max-width:1100px;margin:0 auto;padding:0 1.5rem">' +
      '<div style="display:flex;flex-direction:column;gap:1.25rem">' +
      out +
      '</div></div>'
    );
  }

  /*
   * featuredBlogCard() — 2-col featured post card for /blog.
   * Left: bg-muted image area. Right: category + date + h2 + desc + link.
   */
  function featuredBlogCard() {
    return (
      '<div class="sk-wrap" style="margin-bottom:4rem">' +
      '<div style="background:var(--card);border:1px solid var(--border);' +
      'border-radius:1.5rem;overflow:hidden;display:grid;grid-template-columns:1fr 1fr">' +
      '<div style="background:var(--muted);min-height:260px;display:flex;' +
      'align-items:center;justify-content:center">' +
      b('height:6rem;width:6rem;border-radius:1rem;opacity:.4') +
      '</div>' +
      '<div style="padding:2.5rem 3rem;display:flex;flex-direction:' +
      'column;justify-content:center;gap:.625rem">' +
      '<div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.375rem">' +
      b('height:1.5rem;width:6.5rem;border-radius:999px') +
      b('height:1rem;width:5rem;border-radius:999px') +
      '</div>' +
      b('height:1.75rem;width:92%;margin-bottom:.25rem') +
      b('height:1.75rem;width:70%;margin-bottom:1rem') +
      b('height:1rem;width:96%;margin-bottom:.4rem') +
      b('height:1rem;width:80%;margin-bottom:1.5rem') +
      b('height:1rem;width:7rem;border-radius:999px') +
      '</div></div></div>'
    );
  }

  /* Blog article cards — image placeholder + category + date + h3 + excerpt */
  function articleCards(count) {
    var c =
      '<div style="border-radius:1.5rem;overflow:hidden;' +
      'border:1px solid var(--border);background:var(--card)">' +
      '<div style="background:var(--muted);height:11rem;display:flex;' +
      'align-items:center;justify-content:center">' +
      b('height:4rem;width:4rem;border-radius:.75rem;opacity:.4') +
      '</div>' +
      '<div style="padding:1.5rem;display:flex;flex-direction:column;gap:.5rem">' +
      '<div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.25rem">' +
      b('height:1.25rem;width:4.5rem;border-radius:999px') +
      b('height:1rem;width:4rem;border-radius:999px') +
      '</div>' +
      b('height:1.25rem;width:88%;margin-bottom:.25rem') +
      b('height:.875rem;width:100%') +
      b('height:.875rem;width:74%') +
      '</div></div>';
    var out = '';
    for (var i = 0; i < count; i++) out += c;
    return (
      '<div class="sk-wrap" style="margin-bottom:4rem">' +
      '<div class="sk-grid sk-grid-3">' +
      out +
      '</div></div>'
    );
  }

  /* Team member cards (about page: square avatar initials + name + role) */
  function memberCards(count) {
    var c =
      '<div style="background:var(--card);border:1px solid var(--border);' +
      'border-radius:1.5rem;padding:1.5rem;text-align:center;display:flex;' +
      'flex-direction:column;align-items:center;gap:.75rem">' +
      b('height:5rem;width:5rem;border-radius:.75rem;margin:0 auto') +
      b('height:1.25rem;width:55%;margin:0 auto') +
      b('height:1rem;width:42%;border-radius:999px;margin:0 auto') +
      '</div>';
    var out = '';
    for (var i = 0; i < count; i++) out += c;
    return (
      '<div class="sk-wrap" style="margin-bottom:4rem">' +
      '<div class="sk-grid sk-grid-4">' +
      out +
      '</div></div>'
    );
  }

  /* Generic content blocks (privacy, terms, cookies) */
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

  /* ═══════════════════════════════════════════════════════════
     HOME — mirrors home.html section by section
     ═══════════════════════════════════════════════════════════ */
  function homeHTML() {
    var hero = heroSection({ hasRight: true, twoLine: true, buttons: true });
    var carousel =
      '<section style="padding:4rem 0 3rem;' +
      'background:linear-gradient(in srgb,var(--muted) 40%,transparent)">' +
      '<div class="sk-wrap">' +
      sectionHead('5.5rem', '10rem', false, 'center') +
      '<div class="sk-carousel-row">' +
      b('height:240px;width:160px;border-radius:1.25rem;opacity:.35') +
      b('height:290px;width:190px;border-radius:1.25rem') +
      b('height:240px;width:160px;border-radius:1.25rem;opacity:.35') +
      '</div>' +
      '<div style="display:flex;flex-direction:column;align-items:center;gap:.5rem;padding-top:1.5rem">' +
      b('height:1.375rem;width:12rem') +
      b('height:1rem;width:18rem') +
      '<div style="display:flex;gap:.5rem;margin-top:.25rem">' +
      b('height:1.5rem;width:5rem;border-radius:999px') +
      b('height:1.5rem;width:5rem;border-radius:999px') +
      b('height:1.5rem;width:4.5rem;border-radius:999px') +
      '</div></div></div></section>';
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
    var services =
      '<section style="padding:5rem 0;' +
      'background:linear-gradient(in srgb,var(--muted) 50%,transparent);' +
      'border-radius:3rem 3rem 0 0">' +
      sectionHead('5rem', '14rem', true, 'center') +
      serviceCards(6) +
      '</section>';
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
      '</div></div>' +
      b('height:1rem;width:5rem;border-radius:999px') +
      '</div></div>';
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
      '</div></section>';
    var projLeft =
      b('height:1.5rem;width:9.5rem;border-radius:999px;margin-bottom:1.5rem') +
      b('height:2.75rem;width:88%;margin-bottom:.625rem') +
      b('height:2.75rem;width:60%;margin-bottom:1.5rem') +
      b('height:1.1rem;width:96%;margin-bottom:.4rem') +
      b('height:1.1rem;width:80%;margin-bottom:2rem') +
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
    var featured =
      '<section style="padding:5rem 0"><div class="sk-wrap">' +
      '<div class="sk-featured-card"><div class="sk-featured-grid">' +
      '<div>' +
      projLeft +
      '</div>' +
      '<div class="sk-featured-right" style="display:flex;min-height:340px">' +
      b('height:100%;min-height:340px;border-radius:1.5rem') +
      '</div>' +
      '</div></div></div></section>';
    var cta =
      '<section style="padding:5rem 0;text-align:center">' +
      '<div class="sk-wrap" style="display:flex;flex-direction:column;align-items:center;gap:.75rem">' +
      b('height:1rem;width:4.5rem;border-radius:999px') +
      b('height:3.5rem;width:clamp(22rem,80%,100%)') +
      b('height:1.25rem;width:clamp(30rem,85%,100%)') +
      b('height:1.25rem;width:clamp(22rem,70%,100%)') +
      '<div style="display:flex;gap:1rem;margin-top:1.5rem;flex-wrap:wrap;justify-content:center">' +
      b('height:3.75rem;width:9.5rem;border-radius:.75rem') +
      b('height:3.75rem;width:9rem;border-radius:.75rem') +
      '</div>' +
      '<div style="display:flex;gap:1.25rem;margin-top:1.5rem;flex-wrap:wrap;justify-content:center">' +
      b('height:1.25rem;width:8rem;border-radius:999px') +
      b('height:1.25rem;width:7rem;border-radius:999px') +
      b('height:1.25rem;width:7.5rem;border-radius:999px') +
      '</div></div></section>';
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

  /* ═══════════════════════════════════════════════════════════
     SERVICES — hero + 2-col service cards + workflow + CTA
     Mirrors services.html exactly.
     ═══════════════════════════════════════════════════════════ */
  function servicesHTML() {
    var workflow =
      '<section style="padding:6rem 0;' +
      'background:linear-gradient(in srgb,var(--muted) 50%,transparent);' +
      'border-top:1px solid var(--border);border-bottom:1px solid var(--border)">' +
      sectionHead('6rem', '12rem', true, 'center') +
      workflowSteps(4) +
      '</section>';
    var cta =
      '<section style="padding:6rem 0;text-align:center">' +
      '<div class="sk-wrap" style="display:flex;flex-direction:column;align-items:center;gap:.75rem">' +
      b('height:2.75rem;width:clamp(22rem,80%,100%)') +
      b('height:1.125rem;width:clamp(28rem,85%,100%)') +
      b('height:1.125rem;width:clamp(20rem,70%,100%)') +
      b('height:3.75rem;width:10rem;border-radius:.75rem;margin-top:1.5rem') +
      '</div></section>';
    return (
      '<div class="sk-page">' +
      heroSection({ hasRight: false, twoLine: false, buttons: false }) +
      '<section style="padding:1rem 0 6rem">' +
      serviceCards2Col(6) +
      '</section>' +
      workflow +
      cta +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════
     PORTFOLIO (main /portfolio route) — filter + 3-col cards
     ═══════════════════════════════════════════════════════════ */
  function portfolioHTML() {
    return (
      '<div class="sk-page">' +
      heroSection({ hasRight: false, twoLine: false, buttons: false, breadcrumb: true }) +
      filterTabs() +
      projectCards(6) +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════
     PORTFOLIO/WEB — centered hero + filter bar + port-cards
     Mirrors portfolio/web.html exactly.
     ═══════════════════════════════════════════════════════════ */
  function portfolioWebHTML() {
    return (
      '<div class="sk-page">' +
      centeredHero('5rem', '9rem') +
      centeredFilterBar() +
      portWebCards(6) +
      portCTA() +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════
     PORTFOLIO/MOBILE — centered hero + stats row + info note
     + sidebar-layout app cards. Mirrors portfolio/mobile.html.
     ═══════════════════════════════════════════════════════════ */
  function portfolioMobileHTML() {
    var stats =
      '<div style="display:flex;justify-content:center;gap:2.5rem;flex-wrap:wrap;margin-bottom:3.5rem">' +
      ['8+', '50k+', '4.7★', 'iOS+Android']
        .map(function () {
          return (
            '<div style="text-align:center">' +
            b('height:2rem;width:3.5rem;margin:0 auto .375rem;border-radius:.25rem') +
            b('height:.875rem;width:5.5rem;margin:0 auto;border-radius:999px') +
            '</div>'
          );
        })
        .join('') +
      '</div>';
    var techNote =
      '<div style="max-width:700px;margin:0 auto 3rem;padding:0 1.5rem">' +
      '<div style="background:color-mix(in srgb,var(--primary) 5%,transparent);' +
      'border:1px solid color-mix(in srgb,var(--primary) 15%,transparent);' +
      'border-radius:1rem;padding:1.25rem 1.5rem;display:flex;align-items:center;gap:.75rem">' +
      b('height:1.2rem;width:1.2rem;border-radius:.25rem;flex-shrink:0') +
      '<div style="flex:1;display:flex;flex-direction:column;gap:.375rem">' +
      b('height:.875rem;width:96%') +
      b('height:.875rem;width:80%') +
      '</div></div></div>';
    return (
      '<div class="sk-page">' +
      centeredHero('6rem', '10rem') +
      stats +
      techNote +
      portMobileCards(5) +
      portCTA() +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════
     PORTFOLIO/CASE-STUDIES — centered hero + featured card
     + section title + 4 case rows + CTA.
     Mirrors portfolio/case-studies.html exactly.
     ═══════════════════════════════════════════════════════════ */
  function portfolioCaseStudiesHTML() {
    var sectionTitle =
      '<div style="max-width:1100px;margin:0 auto 1.25rem;padding:0 1.5rem">' +
      b('height:1.75rem;width:12rem;border-radius:.25rem') +
      '</div>';
    return (
      '<div class="sk-page">' +
      centeredHero('7rem', '10rem') +
      csFeatureCard() +
      sectionTitle +
      csCaseRows(4) +
      portCTA() +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════
     ABOUT — hero + mission/vision + stats + values + team + CTA
     Mirrors about.html exactly.
     ═══════════════════════════════════════════════════════════ */
  function aboutHTML() {
    /* Mission & Vision — 2-col (icon + h3 + long desc each) */
    var mvCard = card(
      b('height:3.5rem;width:3.5rem;border-radius:.75rem;margin-bottom:1.5rem') +
        b('height:1.625rem;width:55%;margin-bottom:1rem') +
        b('height:.9rem;width:100%;margin-bottom:.4rem') +
        b('height:.9rem;width:96%;margin-bottom:.4rem') +
        b('height:.9rem;width:88%;margin-bottom:.4rem') +
        b('height:.9rem;width:75%'),
      'border-radius:1.5rem;padding:2rem 2.5rem'
    );
    var mv =
      '<section style="padding:1rem 0 6rem"><div class="sk-wrap">' +
      '<div class="sk-grid sk-grid-2">' +
      mvCard +
      mvCard +
      '</div></div></section>';
    /* Stats bar — 4 large numbers */
    var statsBar =
      '<section style="padding:5rem 0;' +
      'background:linear-gradient(in srgb,var(--muted) 50%,transparent);' +
      'border-top:1px solid var(--border);border-bottom:1px solid var(--border)">' +
      aboutStats() +
      '</section>';
    /* Core Values — 3-col centered icon + title + desc */
    var valCard =
      '<div style="background:var(--card);border:1px solid var(--border);' +
      'border-radius:1.5rem;padding:2rem;text-align:center;display:flex;' +
      'flex-direction:column;align-items:center;gap:.625rem">' +
      b('height:3.5rem;width:3.5rem;border-radius:.75rem;margin:0 auto .5rem') +
      b('height:1.375rem;width:7rem;margin:0 auto') +
      b('height:.875rem;width:90%;margin:0 auto') +
      b('height:.875rem;width:75%;margin:0 auto') +
      '</div>';
    var values =
      '<section style="padding:6rem 0">' +
      sectionHead('6rem', '14rem', false, 'center') +
      '<div class="sk-wrap"><div class="sk-grid sk-grid-3">' +
      valCard +
      valCard +
      valCard +
      '</div></div></section>';
    /* Team — 4-col square avatar + name + role */
    var team =
      '<section style="padding:6rem 0;' +
      'background:linear-gradient(in srgb,var(--muted) 50%,transparent);' +
      'border-top:1px solid var(--border);border-bottom:1px solid var(--border)">' +
      sectionHead('6.5rem', '12rem', false, 'center') +
      memberCards(4) +
      '</section>';
    /* CTA — 2 buttons */
    var cta =
      '<section style="padding:6rem 0;text-align:center">' +
      '<div class="sk-wrap" style="display:flex;flex-direction:column;align-items:center;gap:.75rem">' +
      b('height:2.75rem;width:clamp(22rem,80%,100%)') +
      b('height:1.125rem;width:clamp(24rem,80%,100%)') +
      b('height:1.125rem;width:clamp(18rem,65%,100%)') +
      '<div style="display:flex;gap:1rem;margin-top:1.5rem;flex-wrap:wrap;justify-content:center">' +
      b('height:3.75rem;width:9.5rem;border-radius:.75rem') +
      b('height:3.75rem;width:9rem;border-radius:.75rem') +
      '</div></div></section>';
    return (
      '<div class="sk-page">' +
      heroSection({ hasRight: false, twoLine: false, buttons: false }) +
      mv +
      statsBar +
      values +
      team +
      cta +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════
     BLOG — hero + featured 2-col card + 3×2 article grid
     Mirrors blog.html exactly.
     ═══════════════════════════════════════════════════════════ */
  function blogHTML() {
    return (
      '<div class="sk-page">' +
      heroSection({ hasRight: false, twoLine: false, buttons: false }) +
      '<section style="padding:1rem 0 4rem">' +
      featuredBlogCard() +
      '</section>' +
      '<section style="padding:0 0 6rem">' +
      articleCards(6) +
      '</section>' +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════
     CONTACT — hero + 5-col grid (2 info + 3 form)
     Mirrors contact.html exactly.
     ═══════════════════════════════════════════════════════════ */
  function contactHTML() {
    /* Left: 4 stacked info cards (icon + title + content lines) */
    function infoCard() {
      return card(
        '<div style="display:flex;align-items:center;gap:1rem">' +
          b('height:3rem;width:3rem;border-radius:.75rem;flex-shrink:0') +
          '<div style="flex:1;display:flex;flex-direction:column;gap:.4rem">' +
          b('height:1.125rem;width:40%') +
          b('height:.875rem;width:75%') +
          b('height:.875rem;width:60%') +
          '</div></div>',
        'border-radius:1rem;padding:1.5rem'
      );
    }
    var infoCol =
      '<div style="display:flex;flex-direction:column;gap:1.5rem">' +
      infoCard() +
      infoCard() +
      infoCard() +
      /* Social card */
      card(
        b('height:1.125rem;width:5rem;margin-bottom:1rem') +
          '<div style="display:flex;gap:.75rem">' +
          b('height:2.5rem;width:2.5rem;border-radius:.75rem') +
          b('height:2.5rem;width:2.5rem;border-radius:.75rem') +
          b('height:2.5rem;width:2.5rem;border-radius:.75rem') +
          b('height:2.5rem;width:2.5rem;border-radius:.75rem') +
          '</div>',
        'border-radius:1rem;padding:1.5rem'
      ) +
      '</div>';
    /* Right: form card (name row + email + subject + message + button + note) */
    var formCard = card(
      b('height:1.5rem;width:60%;margin-bottom:.5rem') +
        b('height:1rem;width:80%;margin-bottom:2rem;border-radius:999px') +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.25rem">' +
        '<div>' +
        b('height:.875rem;width:4rem;margin-bottom:.4rem') +
        b('height:2.75rem;border-radius:.75rem') +
        '</div>' +
        '<div>' +
        b('height:.875rem;width:4.5rem;margin-bottom:.4rem') +
        b('height:2.75rem;border-radius:.75rem') +
        '</div>' +
        '</div>' +
        '<div style="margin-bottom:1.25rem">' +
        b('height:.875rem;width:3.5rem;margin-bottom:.4rem') +
        b('height:2.75rem;border-radius:.75rem') +
        '</div>' +
        '<div style="margin-bottom:1.25rem">' +
        b('height:.875rem;width:4.5rem;margin-bottom:.4rem') +
        b('height:2.75rem;border-radius:.75rem') +
        '</div>' +
        '<div style="margin-bottom:1.25rem">' +
        b('height:.875rem;width:4rem;margin-bottom:.4rem') +
        b('height:7rem;border-radius:.75rem') +
        '</div>' +
        b('height:3.25rem;width:100%;border-radius:.75rem;margin-bottom:.875rem') +
        b('height:.875rem;width:60%;border-radius:999px;margin:0 auto'),
      'border-radius:1.5rem;padding:2.5rem'
    );
    var content =
      '<section style="padding:1rem 0 6rem"><div class="sk-wrap">' +
      '<div style="display:grid;grid-template-columns:2fr 3fr;gap:2rem">' +
      infoCol +
      formCard +
      '</div></div></section>';
    return (
      '<div class="sk-page">' +
      heroSection({ hasRight: false, twoLine: false, buttons: false }) +
      content +
      '</div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════
     CAREERS — hero + 2-col job listing cards
     ═══════════════════════════════════════════════════════════ */
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
    return (
      '<div class="sk-page">' +
      heroSection({ hasRight: false, buttons: false }) +
      '<section style="padding:1.5rem 0 5rem">' +
      sectionHead('5rem', '16rem', true, 'center') +
      '<div class="sk-wrap"><div class="sk-grid sk-grid-2">' +
      jobCard +
      jobCard +
      jobCard +
      jobCard +
      '</div></div></section></div>'
    );
  }

  /* ═══════════════════════════════════════════════════════════
     GENERIC — hero + prose content (privacy, terms, cookies)
     ═══════════════════════════════════════════════════════════ */
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

  /* ═══════════════════════════════════════════════════════════
     BUILDER MAP
     ═══════════════════════════════════════════════════════════ */
  var builders = {
    home: homeHTML,
    services: servicesHTML,
    portfolio: portfolioHTML,
    'portfolio-web': portfolioWebHTML,
    'portfolio-mobile': portfolioMobileHTML,
    'portfolio-case-studies': portfolioCaseStudiesHTML,
    about: aboutHTML,
    blog: blogHTML,
    contact: contactHTML,
    careers: careersHTML,
    generic: genericHTML,
  };

  /* ═══════════════════════════════════════════════════════════
     PUBLIC API
     window.getSkeletonHTML(route) → HTML string
     ═══════════════════════════════════════════════════════════ */
  window.getSkeletonHTML = function (route) {
    var type = getSkeletonType(route);
    var builder = builders[type] || builders['generic'];
    return builder();
  };
})();
