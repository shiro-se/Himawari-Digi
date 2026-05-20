class CardSwap {
  constructor(container, options = {}) {
    this.container = container;
    this.cards = Array.from(container.querySelectorAll('.swap-card'));
    if (this.cards.length < 2) return;

    this.cardDistance = options.cardDistance || 60;
    this.verticalDistance = options.verticalDistance || 70;
    this.delay = options.delay || 3000;
    this.skewAmount = options.skewAmount || 6;
    this.pauseOnHover = options.pauseOnHover !== undefined ? options.pauseOnHover : false;

    this.config = {
      ease: 'elastic.out(0.6,0.9)',
      durDrop: 2,
      durMove: 2,
      durReturn: 2,
      promoteOverlap: 0.9,
      returnDelay: 0.05,
    };

    this.order = this.cards.map((_, i) => i);
    this.tl = null;
    this.interval = null;

    // Set container styles dynamically if not already set via classes
    if (!this.container.style.perspective) {
      this.container.style.perspective = '900px';
    }

    this.init();
  }

  makeSlot(i, distX, distY, total) {
    return {
      x: i * distX,
      y: -i * distY,
      z: -i * distX * 1.5,
      zIndex: total - i,
    };
  }

  placeNow(el, slot, skew) {
    if (typeof gsap === 'undefined') return;
    gsap.set(el, {
      x: slot.x,
      y: slot.y,
      z: slot.z,
      xPercent: -50,
      yPercent: -50,
      skewY: skew,
      transformOrigin: 'center center',
      zIndex: slot.zIndex,
      force3D: true,
    });
  }

  swap() {
    if (this.order.length < 2 || typeof gsap === 'undefined') return;

    const front = this.order[0];
    const rest = this.order.slice(1);
    const elFront = this.cards[front];

    const tl = gsap.timeline();
    this.tl = tl;

    tl.to(elFront, {
      y: '+=500',
      duration: this.config.durDrop,
      ease: this.config.ease,
    });

    tl.addLabel('promote', `-=${this.config.durDrop * this.config.promoteOverlap}`);

    rest.forEach((idx, i) => {
      const el = this.cards[idx];
      const slot = this.makeSlot(i, this.cardDistance, this.verticalDistance, this.cards.length);
      tl.set(el, { zIndex: slot.zIndex }, 'promote');
      tl.to(
        el,
        {
          x: slot.x,
          y: slot.y,
          z: slot.z,
          duration: this.config.durMove,
          ease: this.config.ease,
        },
        `promote+=${i * 0.15}`
      );
    });

    const backSlot = this.makeSlot(
      this.cards.length - 1,
      this.cardDistance,
      this.verticalDistance,
      this.cards.length
    );
    tl.addLabel('return', `promote+=${this.config.durMove * this.config.returnDelay}`);
    tl.call(
      () => {
        gsap.set(elFront, { zIndex: backSlot.zIndex });
      },
      undefined,
      'return'
    );
    tl.to(
      elFront,
      {
        x: backSlot.x,
        y: backSlot.y,
        z: backSlot.z,
        duration: this.config.durReturn,
        ease: this.config.ease,
      },
      'return'
    );

    tl.call(() => {
      this.order = [...rest, front];
    });
  }

  init() {
    const total = this.cards.length;
    this.cards.forEach((card, i) => {
      this.placeNow(
        card,
        this.makeSlot(i, this.cardDistance, this.verticalDistance, total),
        this.skewAmount
      );
    });

    // Small delay to prevent initial jank
    setTimeout(() => {
      this.swap();
      this.interval = setInterval(() => this.swap(), this.delay);
    }, 500);

    if (this.pauseOnHover) {
      this.container.addEventListener('mouseenter', () => {
        if (this.tl) this.tl.pause();
        clearInterval(this.interval);
      });
      this.container.addEventListener('mouseleave', () => {
        if (this.tl) this.tl.play();
        this.interval = setInterval(() => this.swap(), this.delay);
      });
    }
  }
}

// Global initialization function to be called dynamically on page render
window.initCardSwap = function () {
  document.querySelectorAll('.card-swap-container').forEach((container) => {
    if (!container.dataset.initialized) {
      new CardSwap(container, {
        cardDistance: 40,
        verticalDistance: 50,
        delay: 4000,
      });
      container.dataset.initialized = 'true';
    }
  });
};

// Dispatch event or call initCardSwap if we're not waiting for an SPA render
window.initCardSwap();
