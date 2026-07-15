document.addEventListener('DOMContentLoaded', () => {
  const appContent = document.getElementById('app-content');

  // --- i18n State & Functions ---
  window.translations = { en: {}, id: {} };
  const loadedTranslationFiles = new Set();

  // --- Toast Component ---
  window.showToast = (message, type = 'info') => {
    let container = document.querySelector('.hd-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'hd-toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `hd-toast ${type}`;

    let icon = 'ph-info';
    if (type === 'error') icon = 'ph-warning-circle';
    if (type === 'success') icon = 'ph-check-circle';
    if (type === 'warning') icon = 'ph-warning';

    const text = typeof window.chatSanitize === 'function' ? window.chatSanitize(message) : message;
    toast.innerHTML = `<i class="ph-fill ${icon}"></i> <span>${text}</span>`;
    container.appendChild(toast);

    // Trigger reflow for animation
    void toast.offsetWidth;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  window.handleNewsletter = (event) => {
    event.preventDefault();
    const input = event.target.querySelector('input[type="email"]');
    if (input && input.value) {
      if (typeof window.showToast === 'function') {
        window.showToast('Terima kasih telah berlangganan newsletter kami!', 'success');
      }
      input.value = '';
    }
  };

  let currentLang = localStorage.getItem('lang') || 'id';
  const langText = document.getElementById('langText');
  const langToggleBtn = document.getElementById('langToggle');

  const translateDOM = () => {
    if (!window.translations) return;
    const dict = window.translations[currentLang];
    if (!dict) return;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.innerHTML = dict[key];
      }
    });

    // Translate Placeholders (e.g. for input fields)
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
      const key = el.getAttribute('data-i18n-ph');
      if (dict[key]) {
        el.placeholder = dict[key];
      }
    });
  };

  const setLanguage = (lang) => {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    if (langText) langText.textContent = lang.toUpperCase();
    translateDOM();
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
    // Re-render page to re-initialize JS components (like typing animation) with new language
    if (typeof renderPage === 'function') {
      renderPage(window.location.pathname, true);
    }
  };

  if (langToggleBtn) {
    // Initial UI state
    if (langText) langText.textContent = currentLang.toUpperCase();

    langToggleBtn.addEventListener('click', () => {
      const newLang = currentLang === 'id' ? 'en' : 'id';
      setLanguage(newLang);
    });
  }

  let activeIntervals = [];
  let activeScrollListeners = [];
  let activeRafs = [];

  const pageCache = {};

  const loadTranslationFile = async (name) => {
    if (loadedTranslationFiles.has(name)) return;
    try {
      const res = await fetch(`/js/locales/${name}.json`);
      if (res.ok) {
        const data = await res.json();
        if (data.en) Object.assign(window.translations.en, data.en);
        if (data.id) Object.assign(window.translations.id, data.id);
        loadedTranslationFiles.add(name);
      }
    } catch (e) {
      console.error(`Failed to load translation: ${name}`, e);
    }
  };

  const PAGE_META = {
    '/': {
      title: 'HimawariDigi — Agensi Web & Mobile Yogyakarta',
      description:
        'HimawariDigi Creative adalah agensi pengembangan web dan mobile app di Yogyakarta. Kami membangun solusi digital skalabel — dari landing page hingga platform SaaS enterprise.',
    },
    '/services': {
      title: 'Layanan Kami — HimawariDigi',
      description:
        'Programmer outsourcing, mobile app development, vibe coding, cloud & DevOps, UI/UX design, dan quality assurance. Semua layanan pengembangan digital dalam satu atap.',
    },
    '/services/outsourcing': {
      title: 'Programmer Outsourcing — HimawariDigi',
      description:
        'Tim developer berpengalaman siap bergabung dengan proyek Anda. Fleksibel, cost-effective, dan terukur hasilnya. Mulai dari 1 developer hingga tim penuh.',
    },
    '/services/mobile': {
      title: 'Mobile App Development — HimawariDigi',
      description:
        'Pengembangan aplikasi iOS dan Android native maupun cross-platform Flutter. Dari desain UI/UX hingga publish ke App Store & Play Store.',
    },
    '/services/vibe': {
      title: 'Vibe Coding — HimawariDigi',
      description:
        'Layanan pengembangan cepat dengan pendekatan AI-assisted coding. Prototype ke production dalam waktu lebih singkat tanpa mengorbankan kualitas.',
    },
    '/services/devops': {
      title: 'Cloud & DevOps — HimawariDigi',
      description:
        'Infrastruktur cloud yang skalabel, CI/CD pipeline, monitoring, dan manajemen server. AWS, GCP, dan Vercel specialist.',
    },
    '/services/design': {
      title: 'UI/UX Design — HimawariDigi',
      description:
        'Desain antarmuka yang intuitif dan estetis. Dari user research, wireframing, prototyping Figma, hingga design system yang konsisten.',
    },
    '/services/qa': {
      title: 'Quality Assurance — HimawariDigi',
      description:
        'Testing menyeluruh — unit test, integration test, E2E testing dengan Playwright & Cypress. Pastikan produk Anda bebas bug sebelum launch.',
    },
    '/portfolio': {
      title: 'Portfolio — HimawariDigi',
      description:
        'Lihat proyek-proyek web dan mobile yang telah kami kerjakan. Dari e-commerce hingga platform SaaS enterprise untuk klien di seluruh Indonesia.',
    },
    '/portfolio/web': {
      title: 'Web Projects — HimawariDigi',
      description:
        'Proyek web development pilihan: e-commerce, SaaS dashboard, landing page, dan company profile. Dibangun dengan teknologi modern dan performa tinggi.',
    },
    '/portfolio/mobile': {
      title: 'Mobile Projects — HimawariDigi',
      description:
        'Aplikasi mobile yang telah diluncurkan di App Store dan Play Store. Flutter, React Native, Swift, dan Kotlin — kami kuasai semua stack mobile.',
    },
    '/portfolio/case-studies': {
      title: 'Case Studies — HimawariDigi',
      description:
        'Studi kasus mendalam proyek pilihan: tantangan bisnis nyata, solusi teknis terukur, dan hasil yang dapat diverifikasi.',
    },
    '/about': {
      title: 'Tentang Kami — HimawariDigi',
      description:
        'Kenali tim di balik HimawariDigi Creative — agensi teknologi dari Yogyakarta yang passionate dalam membangun produk digital berkualitas tinggi.',
    },
    '/blog': {
      title: 'Blog & Insights — HimawariDigi',
      description:
        'Artikel, tutorial, dan insight tentang web development, mobile app, UI/UX design, dan tren teknologi terkini dari tim HimawariDigi.',
    },
    '/contact': {
      title: 'Kontak — HimawariDigi',
      description:
        'Hubungi tim HimawariDigi Creative untuk konsultasi proyek gratis. Kami siap membantu mewujudkan ide digital Anda menjadi kenyataan.',
    },
    '/careers': {
      title: 'Karir — HimawariDigi',
      description:
        'Bergabunglah dengan tim HimawariDigi Creative. Kami mencari developer, designer, dan QA engineer yang passionate dan ingin berkembang bersama.',
    },
    '/privacy': {
      title: 'Kebijakan Privasi — HimawariDigi',
      description:
        'Kebijakan privasi HimawariDigi Creative mengenai pengumpulan, penggunaan, dan perlindungan data pengguna.',
    },
    '/terms': {
      title: 'Syarat & Ketentuan — HimawariDigi',
      description: 'Syarat dan ketentuan penggunaan layanan dan website HimawariDigi Creative.',
    },
    '/cookies': {
      title: 'Kebijakan Cookie — HimawariDigi',
      description: 'Informasi tentang penggunaan cookie di website HimawariDigi Creative.',
    },
    '/404': {
      title: 'Halaman Tidak Ditemukan — HimawariDigi',
      description: 'Maaf, halaman yang Anda cari tidak ditemukan.',
    },
  };

  function updatePageMeta(path) {
    const normalizedPath = path.length > 1 ? path.replace(/\/$/, '') : path;

    const meta = PAGE_META[normalizedPath] || {
      title: 'HimawariDigi Creative',
      description: 'Agensi pengembangan web dan mobile app terpercaya di Yogyakarta, Indonesia.',
    };

    document.title = meta.title;

    let descTag = document.querySelector('meta[name="description"]');
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.setAttribute('name', 'description');
      document.head.appendChild(descTag);
    }
    descTag.setAttribute('content', meta.description);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogTitle) ogTitle.setAttribute('content', meta.title);
    if (ogDesc) ogDesc.setAttribute('content', meta.description);
    if (ogUrl) ogUrl.setAttribute('content', window.location.href);
  }

  const renderPage = async (pathname, preserveScroll = false) => {
    updatePageMeta(pathname);
    const route = pathname === '/' ? 'home' : pathname.replace('/', '');

    try {
      // ── 1. Hentikan semua proses halaman sebelumnya ──────────────────────
      activeIntervals.forEach(clearInterval);
      activeIntervals = [];

      activeScrollListeners.forEach(({ fn }) => window.removeEventListener('scroll', fn));
      activeScrollListeners = [];

      activeRafs.forEach((id) => cancelAnimationFrame(id));
      activeRafs = [];

      // ── 2. Tampilkan skeleton segera (tidak ada jeda blank) ──────────────
      appContent.classList.remove('fade-in');
      if (typeof window.getSkeletonHTML === 'function') {
        appContent.innerHTML = window.getSkeletonHTML(route);
      } else {
        // Fallback jika skeleton.js belum dimuat
        appContent.style.opacity = '0';
      }

      if (!preserveScroll) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // ── 3. Fetch HTML page + translations (berjalan saat skeleton tampil) ─
      let htmlContent = '';
      if (pageCache[route]) {
        htmlContent = pageCache[route];
      } else {
        const response = await fetch(`/pages/${route}.html`);
        if (!response.ok) throw new Error('Page not found');
        htmlContent = await response.text();
        pageCache[route] = htmlContent;
      }

      await loadTranslationFile('common');
      await loadTranslationFile('chat');
      await loadTranslationFile(route.split('/')[0]);

      // ── 4. Ganti skeleton → konten nyata + fade-in ───────────────────────
      setTimeout(() => {
        appContent.style.opacity = ''; // reset inline opacity jika ada
        appContent.innerHTML = htmlContent;
        void appContent.offsetWidth; // force reflow agar animasi fade-in bisa replay
        appContent.classList.add('fade-in');
        translateDOM(); // translate konten yang baru diinjek
        updateNav(pathname);
        initPageComponents(route);
      }, 200);
    } catch (error) {
      console.error('Error loading page:', error);
      if (!pathname.includes('/404.html')) {
        window.location.replace('/404.html');
      }
    }
  };

  const updateNav = (pathname) => {
    // ── Desktop nav-links ──────────────────────────────────────────────────
    document
      .querySelectorAll('.nav-link[data-link], .mobile-nav-link[data-link]')
      .forEach((link) => {
        const href = link.getAttribute('href');
        if (!href) return;
        const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
        link.classList.toggle('active', isActive);
      });

    // ── Portfolio dropdown button: active when any /portfolio/* is open ────
    const portfolioBtn = document.querySelector('#navPortfolio > .nav-link');
    if (portfolioBtn) {
      portfolioBtn.classList.toggle('active', pathname.startsWith('/portfolio'));
    }

    // ── Bottom Dock active state ───────────────────────────────────────────
    document.querySelectorAll('.dock-item[data-link]').forEach((item) => {
      const href = item.getAttribute('href');
      if (!href) return;
      const isActive =
        pathname === href ||
        (href === '/' && pathname === '/') ||
        (href !== '/' && pathname.startsWith(href));
      item.classList.toggle('active', isActive);
    });
  };

  document.body.addEventListener('click', (e) => {
    const link = e.target.closest('[data-link]');
    if (link) {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/')) {
        e.preventDefault();
        if (window.location.pathname !== href) {
          history.pushState(null, null, href);
          renderPage(href);
        }
      }
    }
  });

  window.addEventListener('popstate', () => {
    renderPage(window.location.pathname);
  });

  // Initial render
  translateDOM();
  renderPage(window.location.pathname);

  // ─── Global UI Components ─────────────────────────────────────────────────

  const header = document.querySelector('header');

  // ── Scroll: navbar glass effect ───────────────────────────────────────────
  const handleScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // ── Theme toggle ──────────────────────────────────────────────────────────
  const themeToggleBtn = document.getElementById('themeToggle');
  if (themeToggleBtn) {
    const applyTheme = (dark) => {
      document.documentElement.classList.toggle('dark', dark);
      localStorage.theme = dark ? 'dark' : 'light';
    };

    const prefersDark =
      localStorage.theme === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    applyTheme(prefersDark);

    themeToggleBtn.addEventListener('click', () => {
      applyTheme(!document.documentElement.classList.contains('dark'));
    });
  }

  // ── Desktop dropdown menus ────────────────────────────────────────────────
  document.querySelectorAll('.nav-item[data-dropdown]').forEach((item) => {
    const btn = item.querySelector('.nav-link');
    const dropdown = item.querySelector('.dropdown');
    let timer;

    const open = () => {
      clearTimeout(timer);
      item.classList.add('open');
      btn?.setAttribute('aria-expanded', 'true');
    };
    const close = () => {
      timer = setTimeout(() => {
        item.classList.remove('open');
        btn?.setAttribute('aria-expanded', 'false');
      }, 120);
    };

    item.addEventListener('mouseenter', open);
    item.addEventListener('mouseleave', close);
    btn?.addEventListener('click', () => (item.classList.contains('open') ? close() : open()));
    dropdown?.addEventListener('mouseenter', () => clearTimeout(timer));
    dropdown?.addEventListener('mouseleave', close);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-item[data-dropdown]')) {
      document.querySelectorAll('.nav-item.open').forEach((i) => i.classList.remove('open'));
    }
  });

  // ── Mobile sub-menu accordion (desktop dropdown only) ───────────────────
  document.querySelectorAll('[data-mobile-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sub = document.getElementById(btn.dataset.mobileToggle);
      const caret = btn.querySelector('.nav-caret');
      const isOpen = sub?.classList.contains('open');

      document.querySelectorAll('.mobile-sub').forEach((s) => s.classList.remove('open'));
      document
        .querySelectorAll('[data-mobile-toggle] .nav-caret')
        .forEach((c) => (c.style.transform = ''));

      if (!isOpen && sub) {
        sub.classList.add('open');
        if (caret) caret.style.transform = 'rotate(180deg)';
      }
    });
  });

  // ─── Per-page component initialisation ───────────────────────────────────

  function initPageComponents(route) {
    // Scroll-reveal observer
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            obs.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: '0px', threshold: 0.15 }
    );
    document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));

    // ── Services-only components ────────────────────────────────────────
    if (route === 'services') {
      initServiceTabs();
      initVerticalTimeline('workflow-timeline', 'workflow-track', 'workflow-progress');
    }

    // ── About-only components ───────────────────────────────────────────
    if (route === 'about') {
      initAboutStats();
      initVerticalTimeline('journey-timeline', 'journey-track', 'journey-progress');
    }

    // ── Home-only components ──────────────────────────────────────────────
    if (route === 'home') {
      if (typeof window.initCardSwap === 'function') {
        window.initCardSwap();
      }

      // ── Hero Typing Animation ─────────────────────────────────────────────
      const typedEl = document.getElementById('hero-typed');
      const typedWrapper = document.getElementById('hero-typed-wrapper');

      let phrases = [
        'Scalable Apps',
        'Loved Products',
        'Smooth UX',
        'AI Features',
        'Durable Systems',
        'Fast UI',
      ];
      if (
        window.translations &&
        window.translations[currentLang] &&
        window.translations[currentLang].home_hero_phrases
      ) {
        phrases = window.translations[currentLang].home_hero_phrases;
      }

      const probe = document.createElement('span');
      Object.assign(probe.style, {
        visibility: 'hidden',
        position: 'absolute',
        whiteSpace: 'nowrap',
        font: getComputedStyle(typedEl).font,
      });
      document.body.appendChild(probe);

      const maxWidth = Math.max(
        ...phrases.map((p) => {
          probe.textContent = p;
          return probe.offsetWidth;
        })
      );
      document.body.removeChild(probe);

      typedWrapper.style.minWidth = maxWidth + 'px';
      typedWrapper.style.textAlign = 'left';

      let pIdx = 0,
        cIdx = 0,
        isDeleting = false;

      const TYPE_SPEED = 50,
        DELETE_SPEED = 25,
        PAUSE_END = 1800,
        PAUSE_START = 350;

      function typeLoop() {
        if (!typedEl) return;
        const current = phrases[pIdx];
        typedEl.textContent = isDeleting ? current.slice(0, --cIdx) : current.slice(0, ++cIdx);

        let delay = isDeleting ? DELETE_SPEED : TYPE_SPEED;

        if (!isDeleting && cIdx === current.length) {
          delay = PAUSE_END;
          isDeleting = true;
        } else if (isDeleting && cIdx === 0) {
          isDeleting = false;
          pIdx = (pIdx + 1) % phrases.length;
          delay = PAUSE_START;
        }
        setTimeout(typeLoop, delay);
      }

      setTimeout(typeLoop, 600);

      const heroRight = document.getElementById('hero-right');
      if (heroRight) {
        const SCENES = [
          { icon: 'ph-stack-plus', statId: 'hsc-0' },
          { icon: 'ph-users-four', statId: 'hsc-1' },
          { icon: 'ph-star', statId: 'hsc-2' },
          { icon: 'ph-lightning', statId: 'hsc-3' },
        ];

        let heroIdx = 0;
        const HOLD = 3200;

        const iconEl = document.getElementById('hero-main-icon');
        const svgEl = document.getElementById('hero-lines');
        const iconStage = document.getElementById('hero-icon-stage');
        const iconCard = document.getElementById('hero-icon-card');
        const statEls = SCENES.map((s) => document.getElementById(s.statId));

        // Inject dynamic keyframe (drawPath) once
        const animStyle = document.createElement('style');
        animStyle.id = 'hero-anim-style';
        document.head.appendChild(animStyle);

        function centerOnNearestEdge(fromRect, toRect, pad = 10) {
          const fx = fromRect.left + fromRect.width / 2;
          const fy = fromRect.top + fromRect.height / 2;
          const cx = toRect.left + toRect.width / 2;
          const cy = toRect.top + toRect.height / 2;
          const dx = cx - fx,
            dy = cy - fy;
          let x = cx,
            y = cy,
            nx = 0,
            ny = 0;
          if (Math.abs(dx) >= Math.abs(dy)) {
            if (dx >= 0) {
              x = toRect.left;
              nx = -1;
            } else {
              x = toRect.right;
              nx = 1;
            }
            y = cy;
          } else {
            if (dy >= 0) {
              y = toRect.top;
              ny = -1;
            } else {
              y = toRect.bottom;
              ny = 1;
            }
            x = cx;
          }
          return { x: x + nx * pad, y: y + ny * pad };
        }

        function drawLine(idx) {
          if (!svgEl) return;
          svgEl.innerHTML = '';

          const statEl = statEls[idx];
          if (!statEl || !iconStage) return;

          const cRect = heroRight.getBoundingClientRect();
          const sRect = statEl.getBoundingClientRect();
          const iconCardEl = iconStage.querySelector('.hero-icon-card') || iconStage;
          const iRect = iconCardEl.getBoundingClientRect();

          const startAbs = centerOnNearestEdge(sRect, iRect, 4);
          const endAbs = centerOnNearestEdge(iRect, sRect, 10);

          const x1 = startAbs.x - cRect.left;
          const y1 = startAbs.y - cRect.top;
          const x2 = endAbs.x - cRect.left;
          const y2 = endAbs.y - cRect.top;

          // Orthogonal bend path
          const dx = x2 - x1;
          const bendPad = 20,
            margin = 12;
          let outX = x1 + Math.sign(dx || 1) * bendPad;
          if (dx > 0) outX = Math.min(outX, x2 - margin);
          else outX = Math.max(outX, x2 + margin);
          if (Math.abs(x2 - x1) < bendPad + margin) outX = x1 + dx * 0.5;

          const d = `M ${x1} ${y1} L ${outX} ${y1} L ${outX} ${y2} L ${x2} ${y2}`;
          const totalLen = Math.abs(outX - x1) + Math.abs(y2 - y1) + Math.abs(x2 - outX);

          const uid = `${idx}-${Date.now()}`;

          // Update dynamic keyframe
          document.getElementById('hero-anim-style').textContent = `
      @keyframes drawPath-${uid} {
        from { stroke-dashoffset: ${totalLen}; }
        to   { stroke-dashoffset: 0; }
      }
    `;

          svgEl.innerHTML = `
      <defs>
        <linearGradient id="hlg-${uid}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stop-color="var(--primary)" stop-opacity="0.90"/>
          <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.20"/>
        </linearGradient>
        <filter id="glow-${uid}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- Aura glow -->
      <path d="${d}" fill="none"
        stroke="var(--primary)" stroke-opacity="0.10" stroke-width="8"
        stroke-linecap="round" stroke-linejoin="round"
        style="animation: lineAppear 0.5s ease forwards"/>

      <!-- Main line (draw stroke animation) -->
      <path id="hlp-${uid}" d="${d}" fill="none"
        stroke="url(#hlg-${uid})" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"
        stroke-dasharray="${totalLen}" stroke-dashoffset="${totalLen}"
        style="animation: drawPath-${uid} 0.50s cubic-bezier(0.4,0,0.2,1) 0.05s forwards"/>

      <!-- Traveling signal dot -->
      <circle r="4" fill="var(--primary)" fill-opacity="0.95" filter="url(#glow-${uid})">
        <animateMotion dur="1.4s" repeatCount="indefinite" begin="0.35s"
          keySplines=".4 0 .6 1" calcMode="spline">
          <mpath href="#hlp-${uid}"/>
        </animateMotion>
        <animate attributeName="opacity" values="0;1;1;0"  dur="1.4s" repeatCount="indefinite" begin="0.35s"/>
        <animate attributeName="r"       values="3;5;3"    dur="1.4s" repeatCount="indefinite" begin="0.35s"/>
      </circle>

      <!-- Double pulse ring at stat card -->
      <circle cx="${x2}" cy="${y2}" r="7" fill="var(--primary)" fill-opacity="0.08">
        <animate attributeName="r"       values="7;16;7"      dur="1.9s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.12;0;0.12" dur="1.9s" repeatCount="indefinite"/>
      </circle>
      <circle cx="${x2}" cy="${y2}" r="11" fill="var(--primary)" fill-opacity="0.04">
        <animate attributeName="r"       values="11;24;11"    dur="1.9s" repeatCount="indefinite" begin="0.65s"/>
        <animate attributeName="opacity" values="0.08;0;0.08" dur="1.9s" repeatCount="indefinite" begin="0.65s"/>
      </circle>

      <!-- Endpoint dot -->
      <circle cx="${x2}" cy="${y2}" r="4.5"
        fill="var(--primary)" fill-opacity="0.85"
        stroke="rgba(255,255,255,0.55)" stroke-width="1.5"
        filter="url(#glow-${uid})"
        style="animation: lineAppear 0.3s ease 0.3s both"/>

      <!-- Startpoint dot -->
      <circle cx="${x1}" cy="${y1}" r="2.5"
        fill="var(--primary)" fill-opacity="0.50"
        style="animation: lineAppear 0.3s ease 0.05s both"/>
    `;
        }

        function setHeroScene(idx, first = false) {
          const scene = SCENES[idx];

          // Aktifkan stat card + flash
          statEls.forEach((el, i) => {
            if (!el) return;
            el.classList.toggle('hsc-active', i === idx);
            if (i === idx) {
              el.style.animation = 'none';
              void el.offsetWidth; // reflow
              el.style.animation = 'cardFlash 0.7s ease forwards';
            }
          });

          // Pulse border icon card
          if (iconCard) {
            iconCard.style.animation = 'none';
            void iconCard.offsetWidth;
            iconCard.style.animation = 'iconCardPulse 0.8s ease';
          }

          if (first) {
            iconEl.className = `ph-light ${scene.icon} hero-main-icon-el`;
            setTimeout(() => drawLine(idx), 420);
            return;
          }

          // ─── FASE EXIT ──────────────────────────────────────────
          // 1. Hentikan animation apapun yang sedang berjalan
          iconEl.style.animation = 'none';
          iconEl.classList.remove('icon-entering'); // pastikan bersih
          void iconEl.offsetWidth; // commit state "no animation"

          // 2. Trigger exit via transition (bukan animation)
          iconEl.classList.add('icon-exiting');
          svgEl.innerHTML = '';

          // ─── FASE ENTER ─────────────────────────────────────────
          setTimeout(() => {
            // 3. Ganti icon, lepas semua class state
            iconEl.style.animation = 'none';
            iconEl.classList.remove('icon-exiting', 'icon-entering');
            iconEl.className = `ph-light ${scene.icon} hero-main-icon-el`;

            // 4. KRITIS: reflow untuk reset engine animasi browser
            void iconEl.offsetWidth;

            // 5. Lepas override inline, baru tambah class entering
            iconEl.style.animation = '';
            iconEl.classList.add('icon-entering');

            // 6. Hapus class entering setelah selesai agar cycle berikutnya bisa restart
            setTimeout(() => {
              iconEl.classList.remove('icon-entering');
            }, 580); // sedikit lebih lama dari durasi animasi (550ms)

            setTimeout(() => drawLine(idx), 300);
          }, 350);
        }

        setHeroScene(0, true);

        const heroTimer = setInterval(() => {
          heroIdx = (heroIdx + 1) % SCENES.length;
          setHeroScene(heroIdx);
        }, HOLD);
        activeIntervals.push(heroTimer);

        window.addEventListener('resize', () => drawLine(heroIdx));
      }

      // ── Hero floating particles ──────────────────
      const pWrap = document.getElementById('hero-particles');
      if (pWrap) {
        const pConfig = [
          { left: '12%', delay: '0s', dur: '9s' },
          { left: '25%', delay: '2s', dur: '11s' },
          { left: '38%', delay: '0.5s', dur: '8s' },
          { left: '50%', delay: '3.5s', dur: '10s' },
          { left: '63%', delay: '1.2s', dur: '9s' },
          { left: '74%', delay: '4s', dur: '12s' },
          { left: '85%', delay: '1.8s', dur: '8.5s' },
          { left: '20%', delay: '5s', dur: '10s' },
          { left: '57%', delay: '6s', dur: '7.5s' },
          { left: '90%', delay: '2.8s', dur: '11s' },
        ];
        pConfig.forEach((p) => {
          const el = document.createElement('div');
          el.className = 'hero-particle';
          el.style.left = p.left;
          el.style.animationDelay = p.delay;
          el.style.animationDuration = p.dur;
          pWrap.appendChild(el);
        });
      }

      // ── Testimonial Carousel ──────────────────────────────────────────────
      const tmcViewport = document.getElementById('testimonial-viewport');
      const tmcTrack = document.getElementById('testimonial-track');
      const tmcPrev = document.getElementById('prev-testimonial');
      const tmcNext = document.getElementById('next-testimonial');
      const tmcDots = document.querySelectorAll('#testimonial-dots .tmc-dot');
      const tmcSlides = tmcTrack ? tmcTrack.querySelectorAll('.tmc-slide') : [];

      if (tmcTrack && tmcViewport && tmcSlides.length > 0) {
        const SLIDE_COUNT = tmcSlides.length;
        const AUTO_DELAY = 6000;
        const SWIPE_THRESHOLD = 40; // min px to count as intentional swipe
        const VELOCITY_THRESHOLD = 0.3; // px/ms for momentum-based navigation

        let cur = 0;
        let autoTimer = null;
        let dragging = false;
        let dragStartX = 0;
        let dragStartTime = 0;
        let dragCurrentX = 0;
        let dragPrevTranslate = 0;

        // ─── Core render ─────────────────────────────────────────────
        function tmcGo(index, animate = true) {
          cur = ((index % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT;

          // Track position
          tmcTrack.style.transition = animate
            ? 'transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)'
            : 'none';
          tmcTrack.style.transform = `translateX(${cur * -100}%)`;
          dragPrevTranslate = cur * -100;

          // Slide states
          tmcSlides.forEach((s, i) => {
            s.classList.toggle('is-active', i === cur);
          });

          // Dot states + progress
          tmcDots.forEach((dot, i) => {
            const bar = dot.querySelector('.tmc-dot-progress');
            if (bar) {
              bar.style.transition = 'none';
              bar.style.transform = 'scaleX(0)';
            }
            dot.classList.toggle('is-active', i === cur);

            if (i === cur && bar) {
              // Force reflow then animate
              void bar.offsetWidth;
              bar.style.transition = `transform ${AUTO_DELAY}ms linear`;
              bar.style.transform = 'scaleX(1)';
            }
          });
        }

        // ─── Autoplay ────────────────────────────────────────────────
        function startAuto() {
          stopAuto();
          autoTimer = setInterval(() => tmcGo(cur + 1), AUTO_DELAY);
          activeIntervals.push(autoTimer);
        }

        function stopAuto() {
          if (autoTimer !== null) {
            clearInterval(autoTimer);
            // Remove from activeIntervals to prevent pile-up
            const idx = activeIntervals.indexOf(autoTimer);
            if (idx !== -1) activeIntervals.splice(idx, 1);
            autoTimer = null;
          }
        }

        function resetAuto() {
          stopAuto();
          startAuto();
        }

        // ─── Pointer helpers ─────────────────────────────────────────
        function getX(e) {
          return e.touches ? e.touches[0].clientX : e.clientX;
        }

        function onDragStart(e) {
          dragging = true;
          dragStartX = getX(e);
          dragStartTime = Date.now();
          dragCurrentX = dragStartX;

          tmcTrack.style.transition = 'none';
          tmcViewport.classList.add('is-dragging');
          stopAuto();
        }

        function onDragMove(e) {
          if (!dragging) return;
          dragCurrentX = getX(e);
          const dx = dragCurrentX - dragStartX;
          const pxToPercent = (dx / tmcViewport.offsetWidth) * 100;
          tmcTrack.style.transform = `translateX(${dragPrevTranslate + pxToPercent}%)`;
        }

        function onDragEnd() {
          if (!dragging) return;
          dragging = false;
          tmcViewport.classList.remove('is-dragging');

          const dx = dragCurrentX - dragStartX;
          const dt = Date.now() - dragStartTime;
          const velocity = Math.abs(dx) / (dt || 1);

          // Determine direction via velocity OR distance threshold
          if (velocity > VELOCITY_THRESHOLD || Math.abs(dx) > SWIPE_THRESHOLD) {
            if (dx < 0 && cur < SLIDE_COUNT - 1) {
              tmcGo(cur + 1);
            } else if (dx > 0 && cur > 0) {
              tmcGo(cur - 1);
            } else {
              tmcGo(cur); // snap back
            }
          } else {
            tmcGo(cur); // snap back
          }

          resetAuto();
        }

        // ─── Bind events ─────────────────────────────────────────────
        // Touch
        tmcViewport.addEventListener('touchstart', onDragStart, { passive: true });
        tmcViewport.addEventListener('touchmove', onDragMove, { passive: true });
        tmcViewport.addEventListener('touchend', onDragEnd);
        tmcViewport.addEventListener('touchcancel', onDragEnd);

        // Mouse
        tmcViewport.addEventListener('mousedown', (e) => {
          e.preventDefault(); // prevent text selection
          onDragStart(e);
        });
        window.addEventListener('mousemove', onDragMove);
        window.addEventListener('mouseup', onDragEnd);

        // Pause autoplay on hover (desktop)
        tmcViewport.addEventListener('mouseenter', () => {
          if (!dragging) stopAuto();
        });
        tmcViewport.addEventListener('mouseleave', () => {
          if (!dragging) resetAuto();
        });

        // Prev / Next buttons
        if (tmcPrev) {
          tmcPrev.addEventListener('click', () => {
            tmcGo(cur > 0 ? cur - 1 : SLIDE_COUNT - 1);
            resetAuto();
          });
        }
        if (tmcNext) {
          tmcNext.addEventListener('click', () => {
            tmcGo(cur < SLIDE_COUNT - 1 ? cur + 1 : 0);
            resetAuto();
          });
        }

        // Dots
        tmcDots.forEach((dot, i) => {
          dot.addEventListener('click', () => {
            tmcGo(i);
            resetAuto();
          });
        });

        // Keyboard navigation (when carousel is in view)
        const tmcSection = document.getElementById('testimonial-section');
        const keyHandler = (e) => {
          if (!tmcSection) return;
          const rect = tmcSection.getBoundingClientRect();
          const inView = rect.top < window.innerHeight && rect.bottom > 0;
          if (!inView) return;

          if (e.key === 'ArrowLeft') {
            tmcGo(cur > 0 ? cur - 1 : SLIDE_COUNT - 1);
            resetAuto();
          } else if (e.key === 'ArrowRight') {
            tmcGo(cur < SLIDE_COUNT - 1 ? cur + 1 : 0);
            resetAuto();
          }
        };
        document.addEventListener('keydown', keyHandler);

        // ─── Init ────────────────────────────────────────────────────
        tmcGo(0, false);
        startAuto();
      }

      // ── 3D Cylinder Carousel (scroll-driven, lerp-smoothed) ──────────────

      const CARDS = [
        {
          tags: ['Outsourcing', 'Development', 'Team'],
          name: 'Programmer Outsourcing',
          desc: 'Tim developer berpengalaman siap bergabung dengan proyek Anda secara fleksibel.',
        },
        {
          tags: ['iOS', 'Android', 'Mobile'],
          name: 'Mobile App Development',
          desc: 'Aplikasi iOS & Android yang cepat, elegan, dan siap untuk skala besar.',
        },
        {
          tags: ['AI-Assisted', 'Automation'],
          name: 'Vibe Coding',
          desc: 'Pengembangan berbantuan AI untuk hasil yang lebih cepat dan kreatif.',
        },
        {
          tags: ['Cloud', 'CI/CD', 'DevOps'],
          name: 'Cloud & DevOps Solutions',
          desc: 'Pipeline CI/CD, orkestrasi container, dan infrastruktur cloud yang andal.',
        },
        {
          tags: ['UI Design', 'UX Research'],
          name: 'UI/UX Design',
          desc: 'Antarmuka yang indah dan intuitif yang membuat pengguna betah berlama-lama.',
        },
        {
          tags: ['Testing', 'QA', 'Bug-Free'],
          name: 'Quality Assurance',
          desc: 'Pengujian menyeluruh untuk memastikan produk Anda bebas bug dan siap rilis.',
        },
      ];

      const section = document.getElementById('carousel-section');
      const drum = document.getElementById('cDrum');
      const infoEl = document.getElementById('cInfo');
      const infoTag = document.getElementById('cInfoTag');
      const infoName = document.getElementById('cInfoName');
      const infoDesc = document.getElementById('cInfoDesc');
      const hint = document.getElementById('cScrollHint');

      if (!section || !drum) return;

      const cards = Array.from(drum.querySelectorAll('.c-card'));
      const N = cards.length;

      const GAP_MULTIPLIER = 1.4;

      function getRadius() {
        const w = drum.offsetWidth || 256;
        return Math.round((w / 2 / Math.tan(Math.PI / N)) * GAP_MULTIPLIER);
      }

      let targetAngle = 0;
      let renderedAngle = 0;
      let rafId = null;
      const LERP_SPEED = 0.08;

      const cardState = cards.map(() => ({ scale: 1, opacity: 1 }));
      let lastActiveIdx = -1;

      function render(angle) {
        const radius = getRadius();
        const stepAngle = 360 / N;

        drum.style.transform = `translateZ(-${radius}px) rotateY(${-angle}deg)`;

        cards.forEach((card, i) => {
          const cardAngle = stepAngle * i;

          let diff = (((cardAngle - angle) % 360) + 360) % 360;
          if (diff > 180) diff -= 360;

          const absDiff = Math.abs(diff);
          const isActive = absDiff < stepAngle / 2;
          const isBehind = absDiff > 90;
          const proximity = 1 - Math.min(absDiff / 180, 1);

          const tScale = isActive ? 1.08 : 0.75 + 0.25 * proximity;
          const tOpacity = isActive ? 1 : 0.2 + 0.5 * proximity;

          const st = cardState[i];
          st.scale += (tScale - st.scale) * 0.12;
          st.opacity += (tOpacity - st.opacity) * 0.12;

          const zIdx = isActive ? 10 : isBehind ? 0 : Math.round(proximity * 5);

          card.style.transform = `rotateY(${cardAngle}deg) translateZ(${radius}px) scale(${st.scale.toFixed(4)})`;
          card.style.opacity = st.opacity.toFixed(4);
          card.style.zIndex = zIdx;
          card.style.pointerEvents = isBehind ? 'none' : 'auto';
          card.classList.toggle('is-active', isActive);
        });

        const activeIdx = Math.round((((angle % 360) + 360) % 360) / stepAngle) % N;
        updateLabel(activeIdx);
      }

      function updateLabel(idx) {
        const clamped = ((idx % N) + N) % N;

        if (clamped !== lastActiveIdx) {
          lastActiveIdx = clamped;

          if (infoEl) {
            infoEl.style.opacity = '0';
            infoEl.style.transform = 'translateY(6px)';
          }

          setTimeout(() => {
            if (infoName) {
              infoName.setAttribute('data-i18n', `home_services_card_${clamped}`);
              infoName.innerHTML =
                window.translations?.[currentLang]?.[`home_services_card_${clamped}`] ||
                CARDS[clamped].name;
            }
            if (infoDesc) {
              infoDesc.setAttribute('data-i18n', `home_services_info_${clamped}`);
              infoDesc.innerHTML =
                window.translations?.[currentLang]?.[`home_services_info_${clamped}`] ||
                CARDS[clamped].desc;
            }

            if (infoTag) {
              infoTag.innerHTML = CARDS[clamped].tags
                .map((t) => `<span class="c-tag-pill">${t}</span>`)
                .join('');
            }

            if (infoEl) {
              infoEl.style.opacity = '1';
              infoEl.style.transform = 'translateY(0)';
            }
          }, 180);
        }

        if (hint) hint.style.opacity = clamped === 0 ? '0.45' : '0';
      }

      function tick() {
        const delta = targetAngle - renderedAngle;
        if (Math.abs(delta) > 0.01) {
          renderedAngle += delta * LERP_SPEED;
          render(renderedAngle);
        }
        rafId = requestAnimationFrame(tick);
      }

      function onCarouselScroll() {
        const rect = section.getBoundingClientRect();
        const totalHeight = section.offsetHeight - window.innerHeight;

        const scrolled = Math.max(0, Math.min(-rect.top, totalHeight));
        const progress = totalHeight > 0 ? scrolled / totalHeight : 0;

        const stepAngle = 360 / N;
        const maxRotation = stepAngle * (N - 1);

        targetAngle = progress * maxRotation;
      }

      cards.forEach((card) => {
        card.addEventListener('mousemove', (e) => {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--mx', `${e.clientX - r.left}px`);
          card.style.setProperty('--my', `${e.clientY - r.top}px`);
        });
      });

      window.addEventListener('scroll', onCarouselScroll, { passive: true });
      activeScrollListeners.push({ fn: onCarouselScroll });

      window.addEventListener('resize', () => render(renderedAngle));

      onCarouselScroll();
      renderedAngle = targetAngle;
      render(renderedAngle);

      rafId = requestAnimationFrame(tick);
      activeRafs.push(rafId);
    }
  }

  function initServiceTabs() {
    const tabs = document.querySelectorAll('.svc-tab-btn');
    const panels = document.querySelectorAll('.svc-panel');
    const panelWrap = document.querySelector('.svc-panel-wrap');
    if (!tabs.length) return;

    tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabs.forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        panels.forEach((p) => p.classList.remove('active'));

        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        const panel = document.querySelector(`.svc-panel[data-panel="${btn.dataset.tab}"]`);
        panel.classList.add('active');

        if (window.gsap) {
          gsap.fromTo(
            panel,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
          );
        }

        // Di mobile, geser secukupnya saja kalau panel belum terlihat — bukan lompat ke atas
        if (window.innerWidth < 768 && panelWrap) {
          const rect = panelWrap.getBoundingClientRect();
          const headerOffset = 90; // kira-kira tinggi navbar fixed, sesuaikan kalau perlu
          const isHiddenAbove = rect.top < headerOffset;
          const isHiddenBelow = rect.top > window.innerHeight * 0.6;

          if (isHiddenAbove || isHiddenBelow) {
            const delta = rect.top - headerOffset - 12;
            window.scrollBy({ top: delta, behavior: 'smooth' });
          }
        }
      });
    });
  }

  function initVerticalTimeline(timelineId, trackId, progressId) {
    const timeline = document.getElementById(timelineId);
    const track = document.getElementById(trackId);
    const progressBar = document.getElementById(progressId);
    if (!timeline || !track || !progressBar) return;

    const steps = Array.from(timeline.querySelectorAll('.workflow-step'));
    if (!steps.length) return;
    const firstDot = steps[0].querySelector('.workflow-step-dot');
    const lastDot = steps[steps.length - 1].querySelector('.workflow-step-dot');
    const TRIGGER_RATIO = 0.55;

    function update() {
      const timelineRect = timeline.getBoundingClientRect();
      const firstRect = firstDot.getBoundingClientRect();
      const lastRect = lastDot.getBoundingClientRect();

      const lineLeft = firstRect.left + firstRect.width / 2 - timelineRect.left;
      const lineTop = firstRect.top + firstRect.height / 2 - timelineRect.top;
      const lineBottom = lastRect.top + lastRect.height / 2 - timelineRect.top;
      const lineLength = lineBottom - lineTop;

      track.style.left = lineLeft + 'px';
      track.style.top = lineTop + 'px';
      track.style.height = lineLength + 'px';

      progressBar.style.left = lineLeft + 'px';
      progressBar.style.top = lineTop + 'px';

      const triggerY = window.innerHeight * TRIGGER_RATIO;

      steps.forEach((step) => {
        const dot = step.querySelector('.workflow-step-dot');
        const dotRect = dot.getBoundingClientRect();
        const dotCenter = dotRect.top + dotRect.height / 2;
        step.classList.toggle('is-active', dotCenter <= triggerY);
      });

      const passed = Math.min(Math.max(triggerY - (timelineRect.top + lineTop), 0), lineLength);
      progressBar.style.height = passed + 'px';
    }

    update();

    window.addEventListener('scroll', update, { passive: true });
    activeScrollListeners.push({ fn: update });

    window.addEventListener('resize', update);
  }

  function initAboutStats() {
    const statsSection = document.getElementById('about-stats');
    if (!statsSection) return;

    const counters = statsSection.querySelectorAll('.stat-count');
    if (!counters.length) return;

    const DURATION = 1400;

    function animateCounter(el) {
      const target = parseInt(el.dataset.target, 10) || 0;
      const start = performance.now();

      function step(now) {
        const progress = Math.min((now - start) / DURATION, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        el.textContent = Math.round(eased * target);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = target;
        }
      }
      requestAnimationFrame(step);
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            counters.forEach(animateCounter);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(statsSection);
  }
});
