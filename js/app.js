document.addEventListener("DOMContentLoaded", () => {
  const appContent = document.getElementById("app-content");

  let activeIntervals = [];
  let activeScrollListeners = [];
  let activeRafs = [];

  const pageCache = {};

  const renderPage = async (pathname) => {
    const route = pathname === "/" ? "home" : pathname.replace("/", "");
    try {
      let htmlContent = "";
      if (pageCache[route]) {
        htmlContent = pageCache[route];
      } else {
        const response = await fetch(`./pages/${route}.html`);
        if (!response.ok) throw new Error("Page not found");
        htmlContent = await response.text();
        pageCache[route] = htmlContent;
      }

      activeIntervals.forEach(clearInterval);
      activeIntervals = [];

      activeScrollListeners.forEach(({ fn }) =>
        window.removeEventListener("scroll", fn),
      );
      activeScrollListeners = [];

      activeRafs.forEach((id) => cancelAnimationFrame(id));
      activeRafs = [];

      appContent.classList.remove("fade-in");
      appContent.style.opacity = "0";

      setTimeout(() => {
        appContent.innerHTML = htmlContent;
        appContent.style.opacity = "1";
        appContent.classList.add("fade-in");
        updateNav(route);
        initPageComponents(route);
      }, 200);
    } catch (error) {
      console.error("Error loading page:", error);
      if (route !== "home") {
        renderPage("/");
        history.replaceState(null, null, "/");
      }
    }
  };

  const updateNav = (route) => {
    document.querySelectorAll("[data-link]").forEach((link) => {
      const linkRoute =
        link.getAttribute("href") === "/"
          ? "home"
          : link.getAttribute("href").replace("/", "");

      if (linkRoute === route) {
        link.classList.add("text-primary", "font-semibold");
        link.classList.remove("text-foreground/80");
      } else {
        link.classList.remove("text-primary", "font-semibold");
        link.classList.add("text-foreground/80");
      }
    });
  };

  document.body.addEventListener("click", (e) => {
    const link = e.target.closest("[data-link]");
    if (link) {
      const href = link.getAttribute("href");
      if (href.startsWith("/")) {
        e.preventDefault();
        if (window.location.pathname !== href) {
          history.pushState(null, null, href);
          renderPage(href);
        }
      }
    }
  });

  window.addEventListener("popstate", () => {
    renderPage(window.location.pathname);
  });

  renderPage(window.location.pathname);

  // --- Global UI Components ---

  const header = document.querySelector("header");

  const handleScroll = () => {
    if (window.scrollY > 20) {
      header.classList.remove("bg-transparent", "border-transparent");
      header.classList.add("glass", "border-border");
    } else {
      header.classList.add("bg-transparent", "border-transparent");
      header.classList.remove("glass", "border-border");
    }
  };

  window.addEventListener("scroll", handleScroll);
  handleScroll();

  const themeToggleBtn = document.getElementById("theme-toggle");
  if (themeToggleBtn) {
    if (
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    themeToggleBtn.addEventListener("click", () => {
      document.documentElement.classList.toggle("dark");
      localStorage.theme = document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
    });
  }

  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener("click", () =>
      mobileMenu.classList.toggle("hidden"),
    );
    mobileMenu.addEventListener("click", (e) => {
      if (e.target.closest("[data-link]")) mobileMenu.classList.add("hidden");
    });
  }

  // ─── Per-page component initialisation ───────────────────────────────────

  function initPageComponents(route) {
    // Scroll-reveal observer
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            obs.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px", threshold: 0.15 },
    );
    document
      .querySelectorAll(".reveal-on-scroll")
      .forEach((el) => observer.observe(el));

    // ── Home-only components ──────────────────────────────────────────────

    if (route === "home") {
      // ── Hero floating particles ──────────────────
      const pWrap = document.getElementById("hero-particles");
      if (pWrap) {
        const pConfig = [
          { left: "12%", delay: "0s", dur: "9s" },
          { left: "25%", delay: "2s", dur: "11s" },
          { left: "38%", delay: "0.5s", dur: "8s" },
          { left: "50%", delay: "3.5s", dur: "10s" },
          { left: "63%", delay: "1.2s", dur: "9s" },
          { left: "74%", delay: "4s", dur: "12s" },
          { left: "85%", delay: "1.8s", dur: "8.5s" },
          { left: "20%", delay: "5s", dur: "10s" },
          { left: "57%", delay: "6s", dur: "7.5s" },
          { left: "90%", delay: "2.8s", dur: "11s" },
        ];
        pConfig.forEach((p) => {
          const el = document.createElement("div");
          el.className = "hero-particle";
          el.style.left = p.left;
          el.style.animationDelay = p.delay;
          el.style.animationDuration = p.dur;
          pWrap.appendChild(el);
        });
      }
      
      // ── Testimonial Carousel ──────────────────────────────────────────────
      const track = document.getElementById("testimonial-track");
      const prevBtn = document.getElementById("prev-testimonial");
      const nextBtn = document.getElementById("next-testimonial");
      const tdots = document.querySelectorAll(".dot-btn");

      if (track && prevBtn && nextBtn && tdots.length > 0) {
        let currentIndex = 0;
        const slideCount = tdots.length;
        let autoPlayInterval;

        const startAutoPlay = () => {
          clearInterval(autoPlayInterval);
          autoPlayInterval = setInterval(() => {
            goToSlide(currentIndex < slideCount - 1 ? currentIndex + 1 : 0);
          }, 5000);
          activeIntervals.push(autoPlayInterval);
        };

        const goToSlide = (index) => {
          currentIndex = index;
          track.style.transform = `translateX(-${currentIndex * 100}%)`;

          tdots.forEach((dot, idx) => {
            const progressBar = dot.querySelector(".progress-bar");
            if (progressBar) {
              progressBar.style.transition = "none";
              progressBar.style.width = "0%";
            }
            if (idx === currentIndex) {
              dot.classList.replace("w-4", "w-16");
              dot.classList.replace("bg-border", "bg-primary/20");
              dot.classList.remove("hover:bg-primary/50");
              if (progressBar) {
                void progressBar.offsetWidth;
                progressBar.style.transition = "width 5000ms linear";
                progressBar.style.width = "100%";
              }
            } else {
              dot.classList.replace("w-16", "w-4");
              dot.classList.replace("bg-primary/20", "bg-border");
              dot.classList.add("hover:bg-primary/50");
            }
          });

          track.querySelectorAll(".carousel-slide").forEach((slide, idx) => {
            if (idx === currentIndex) {
              slide.classList.remove("opacity-50", "scale-95");
              slide.classList.add("opacity-100", "scale-100");
            } else {
              slide.classList.remove("opacity-100", "scale-100");
              slide.classList.add("opacity-50", "scale-95");
            }
          });

          startAutoPlay();
        };

        prevBtn.addEventListener("click", () =>
          goToSlide(currentIndex > 0 ? currentIndex - 1 : slideCount - 1),
        );
        nextBtn.addEventListener("click", () =>
          goToSlide(currentIndex < slideCount - 1 ? currentIndex + 1 : 0),
        );
        tdots.forEach((dot, idx) =>
          dot.addEventListener("click", () => goToSlide(idx)),
        );
        goToSlide(0);
      }

      // ── 3D Cylinder Carousel (scroll-driven, lerp-smoothed) ──────────────

      const CARDS = [
        {
          tags: ["Outsourcing", "Development", "Team"],
          name: "Programmer Outsourcing",
          desc: "Tim developer berpengalaman siap bergabung dengan proyek Anda secara fleksibel.",
        },
        {
          tags: ["iOS", "Android", "Mobile"],
          name: "Mobile App Development",
          desc: "Aplikasi iOS & Android yang cepat, elegan, dan siap untuk skala besar.",
        },
        {
          tags: ["AI-Assisted", "Automation"],
          name: "Vibe Coding",
          desc: "Pengembangan berbantuan AI untuk hasil yang lebih cepat dan kreatif.",
        },
        {
          tags: ["Cloud", "CI/CD", "DevOps"],
          name: "Cloud & DevOps Solutions",
          desc: "Pipeline CI/CD, orkestrasi container, dan infrastruktur cloud yang andal.",
        },
        {
          tags: ["UI Design", "UX Research"],
          name: "UI/UX Design",
          desc: "Antarmuka yang indah dan intuitif yang membuat pengguna betah berlama-lama.",
        },
        {
          tags: ["Testing", "QA", "Bug-Free"],
          name: "Quality Assurance",
          desc: "Pengujian menyeluruh untuk memastikan produk Anda bebas bug dan siap rilis.",
        },
      ];

      const section = document.getElementById("carousel-section");
      const drum = document.getElementById("cDrum");
      const infoEl = document.getElementById("cInfo");
      const infoTag = document.getElementById("cInfoTag");
      const infoName = document.getElementById("cInfoName");
      const infoDesc = document.getElementById("cInfoDesc");
      const hint = document.getElementById("cScrollHint");

      if (!section || !drum) return;

      const cards = Array.from(drum.querySelectorAll(".c-card"));
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
          card.style.pointerEvents = isBehind ? "none" : "auto";
          card.classList.toggle("is-active", isActive);
        });

        const activeIdx =
          Math.round((((angle % 360) + 360) % 360) / stepAngle) % N;
        updateLabel(activeIdx);
      }

      function updateLabel(idx) {
        const clamped = ((idx % N) + N) % N;

        if (clamped !== lastActiveIdx) {
          lastActiveIdx = clamped;

          if (infoEl) {
            infoEl.style.opacity = "0";
            infoEl.style.transform = "translateY(6px)";
          }

          setTimeout(() => {
            if (infoName) infoName.textContent = CARDS[clamped].name;
            if (infoDesc) infoDesc.textContent = CARDS[clamped].desc;

            // Render multiple tags
            if (infoTag) {
              infoTag.innerHTML = CARDS[clamped].tags
                .map((t) => `<span class="c-tag-pill">${t}</span>`)
                .join("");
            }

            if (infoEl) {
              infoEl.style.opacity = "1";
              infoEl.style.transform = "translateY(0)";
            }
          }, 180);
        }

        if (hint) hint.style.opacity = clamped === 0 ? "0.45" : "0";
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

      // Hover spotlight
      cards.forEach((card) => {
        card.addEventListener("mousemove", (e) => {
          const r = card.getBoundingClientRect();
          card.style.setProperty("--mx", `${e.clientX - r.left}px`);
          card.style.setProperty("--my", `${e.clientY - r.top}px`);
        });
      });

      window.addEventListener("scroll", onCarouselScroll, { passive: true });
      activeScrollListeners.push({ fn: onCarouselScroll });

      window.addEventListener("resize", () => render(renderedAngle));

      // Initial state
      onCarouselScroll();
      renderedAngle = targetAngle;
      render(renderedAngle);

      rafId = requestAnimationFrame(tick);
      activeRafs.push(rafId);
    }
  }
});
