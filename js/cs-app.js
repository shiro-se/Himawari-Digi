// ═══════════════════════════════════════════════════════════════
// HimawariDigi — CS Dashboard Application
// Login (OTP → himawaridigi@gmail.com) + WhatsApp-like Dashboard
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error('Supabase client not initialized');
    return;
  }

  // --- Sound Notification ---
  window.playNotifSound = function () {
    const audio = document.getElementById('cs-notif-sound');
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  };

  // ── State ─────────────────────────────────────────────────────
  let globalMessagesListener = null;
  let csName = localStorage.getItem('hd_cs_name') || '';
  let selectedChatId = null;
  let oldestMessageTimestamp = null;
  let isLoadingMore = false;
  let hasMoreMessages = true;
  let currentLastDateSeparator = null;
  let currentRenderedIds = new Set();
  let chatsData = {};
  let activeMessagesListener = null;
  let activeTypingListener = null;
  let typingTimeout = null;
  let searchQuery = '';
  let currentTab = 'active';
  let archiveData = {};
  let archiveListener = null;
  let csReplyToData = null;
  let csEditingMsgId = null;
  let csContextMsgId = null;
  let csContextMsgText = null;
  let csLongPressTimer = null;
  let csArchiveContextMenuId = null;

  window.csClearReply = function () {
    csReplyToData = null;
  };

  // ── Toast Component ──
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
    void toast.offsetWidth;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // ── Modal Konfirmasi Generik ──────────────────────────────────────
  window.showConfirmModal = function ({
    title,
    text,
    icon = 'ph-warning',
    iconBg = '#fee2e2',
    iconColor = '#ef4444',
    confirmText = 'Ya',
    confirmBg = '#ef4444',
    onConfirm,
  }) {
    if (document.querySelector('[data-hd-modal-overlay]')) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.setAttribute('data-hd-modal-overlay', '');
    modalOverlay.style.cssText =
      'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999; opacity:0; transition:opacity 0.2s ease;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText =
      'background:var(--background, #fff); border-radius:12px; padding:24px; width:90%; max-width:400px; box-shadow:0 10px 25px rgba(0,0,0,0.2); transform:scale(0.95); transition:transform 0.2s ease; text-align:center;';

    modalBox.innerHTML = `
      <div style="width:48px; height:48px; border-radius:50%; background:${iconBg}; color:${iconColor}; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:24px;">
        <i class="ph-bold ${icon}"></i>
      </div>
      <h3 style="margin:0 0 8px; color:var(--foreground); font-size:1.1rem; font-weight:600;">${title}</h3>
      <p style="margin:0 0 24px; color:var(--text-muted); font-size:0.9rem;">${text}</p>
      <div style="display:flex; gap:12px; justify-content:center;">
        <button class="hd-modal-btn-no" style="flex:1; padding:10px; border-radius:8px; border:1px solid var(--border); background:transparent; color:var(--foreground); font-weight:500; cursor:pointer; transition:background 0.2s;">Batal</button>
        <button class="hd-modal-btn-yes" style="flex:1; padding:10px; border-radius:8px; border:none; background:${confirmBg}; color:white; font-weight:500; cursor:pointer; transition:opacity 0.2s;">${confirmText}</button>
      </div>
    `;

    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);

    requestAnimationFrame(() => {
      modalOverlay.style.opacity = '1';
      modalBox.style.transform = 'scale(1)';
    });

    const closeModal = () => {
      modalOverlay.style.opacity = '0';
      modalBox.style.transform = 'scale(0.95)';
      setTimeout(() => modalOverlay.remove(), 200);
      document.removeEventListener('keydown', escHandler);
    };

    const escHandler = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', escHandler);

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
    modalBox.querySelector('.hd-modal-btn-no').onclick = closeModal;
    modalBox.querySelector('.hd-modal-btn-yes').onclick = async () => {
      const btnYes = modalBox.querySelector('.hd-modal-btn-yes');
      btnYes.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Proses...';
      btnYes.disabled = true;
      try {
        if (onConfirm) await onConfirm(closeModal);
        else closeModal();
      } catch (err) {
        closeModal();
        if (window.showToast) window.showToast('Terjadi kesalahan.', 'error');
      }
    };
  };

  // ── Sanitize Helpers ─────────────────────────────────────────
  function escapeAttr(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function safeUrl(url) {
    if (!url) return '';
    try {
      const u = new URL(url);
      return ['https:', 'http:'].includes(u.protocol) ? url : '';
    } catch {
      return '';
    }
  }

  window.formatDateSeparator = function (timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isSameDate = (d1, d2) =>
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();

    if (isSameDate(date, today)) return 'Hari ini';
    if (isSameDate(date, yesterday)) return 'Kemarin';

    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7 && diffDays >= 0) {
      const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return days[date.getDay()];
    }

    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  window.getFileFallbackText = function (url) {
    if (!url) return '[File]';
    const extMatch = url.split('?')[0].match(/\.([a-z0-9]+)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || !ext) return '[Gambar]';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return '[Audio]';
    if (['mp4', 'webm', 'mov'].includes(ext)) return '[Video]';
    return '[Dokumen]';
  };

  let isSendingCS = false;

  // ── DOM Refs ──────────────────────────────────────────────────
  const loginView = document.getElementById('cs-login-view');
  const dashView = document.getElementById('cs-dashboard-view');

  // Login
  const loginForm = document.getElementById('cs-login-form');
  const loginNameInput = document.getElementById('cs-login-name');
  const loginSubmit = document.getElementById('cs-login-submit');
  const loginStatus = document.getElementById('cs-login-status');
  const deviceText = document.getElementById('cs-device-text');
  const otpSection = document.getElementById('cs-otp-section');
  const otpInput = document.getElementById('cs-otp-input');
  const otpVerifyBtn = document.getElementById('cs-otp-verify');
  const otpResendBtn = document.getElementById('cs-otp-resend-btn');
  const otpTimer = document.getElementById('cs-otp-timer');

  // Dashboard
  const chatList = document.getElementById('cs-chat-list');
  const chatListEmpty = document.getElementById('cs-chat-list-empty');
  const chatCount = document.getElementById('cs-chat-count');
  const searchInput = document.getElementById('cs-search-input');
  const detail = document.getElementById('cs-detail');
  const detailEmpty = document.getElementById('cs-detail-empty');
  const chatView = document.getElementById('cs-chat-view');
  const detailName = document.getElementById('cs-detail-name');
  const detailEmail = document.getElementById('cs-detail-email');
  const detailStatus = document.getElementById('cs-detail-status');
  const messagesEl = document.getElementById('cs-messages');
  const chatInput = document.getElementById('cs-chat-input');
  const sendBtn = document.getElementById('cs-chat-send');
  const closeChatBtn = document.getElementById('cs-close-chat-btn');
  const backBtn = document.getElementById('cs-back-btn');
  const sidebar = document.getElementById('cs-sidebar');
  const topbarName = document.getElementById('cs-topbar-name');
  const topbarAvatar = document.getElementById('cs-topbar-avatar');
  const logoutBtn = document.getElementById('cs-logout-btn');
  const themeToggle = document.getElementById('cs-theme-toggle');
  // notifDot removed - replaced by cs-notif-badge managed by updateNotifUI()
  const clientTypingEl = document.getElementById('cs-client-typing');

  // ── Device Info ───────────────────────────────────────────────
  const deviceInfo = window.parseDeviceInfo();
  if (deviceText) {
    deviceText.textContent = deviceInfo.full;
  }

  // ── Theme Toggle ──────────────────────────────────────────────
  const moonIcon = document.getElementById('cs-theme-moon');
  const sunIcon = document.getElementById('cs-theme-sun');

  function applyTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('light', !dark);
    localStorage.setItem('cs-theme', dark ? 'dark' : 'light');
    if (moonIcon && sunIcon) {
      moonIcon.style.display = dark ? 'none' : 'block';
      sunIcon.style.display = dark ? 'block' : 'none';
    }
  }

  const savedTheme = localStorage.getItem('cs-theme');
  applyTheme(savedTheme !== 'light');

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      applyTheme(!document.documentElement.classList.contains('dark'));
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // LOGIN FLOW
  // ═══════════════════════════════════════════════════════════════

  let currentEmail = window.CS_EMAIL;
  let resendCooldown = 0;
  let resendInterval = null;

  async function checkExistingSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session && csName) {
      showDashboard();
    } else {
      showLogin();
    }
  }

  let isExplicitLogout = false;

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' && isExplicitLogout) {
      clearSession();
      showLogin();
      isExplicitLogout = false;
    } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && csName) {
      showDashboard();
    }
  });

  function showLogin() {
    loginView.style.display = 'flex';
    dashView.style.display = 'none';
  }

  function showDashboard() {
    loginView.style.display = 'none';
    dashView.style.display = 'flex';
    topbarName.textContent = csName;
    topbarAvatar.textContent = csName.substring(0, 2).toUpperCase();
    initDashboard();

    // Push notification ditunda — akan diaktifkan kembali nanti
    // subscribeToPush();
  }

  function clearSession() {
    localStorage.removeItem('hd_cs_name');
    csName = '';
  }

  function showStatus(msg, type) {
    loginStatus.textContent = msg;
    loginStatus.className = 'cs-login-status ' + type;
  }

  // Get approximate location via free API
  async function getLocation() {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        return `${data.city || 'Unknown'}, ${data.region || ''}, ${data.country_name || 'Unknown'} (IP: ${data.ip || 'N/A'})`;
      }
    } catch (e) {
      /* silent */
    }
    return 'Tidak dapat mendeteksi lokasi';
  }

  // Send OTP via Supabase Auth
  async function sendOTP(name) {
    const location = await getLocation();
    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: currentEmail,
        options: {
          data: {
            cs_name: name,
            device: deviceInfo.full,
            location: location,
            time: now,
          },
        },
      });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Supabase Auth error:', e);
      return false;
    }
  }

  // Verify OTP
  async function verifyOTP(inputCode) {
    const typesToTry = ['email', 'magiclink', 'signup'];
    let lastError = null;

    for (const type of typesToTry) {
      try {
        console.log(`Mencoba verifikasi OTP dengan tipe: ${type}, kode: ${inputCode}`);
        const { data, error } = await supabase.auth.verifyOtp({
          email: currentEmail,
          token: inputCode,
          type: type,
        });
        if (!error && data.session) {
          return true; // Sukses verifikasi!
        }
        if (error) lastError = error;
      } catch (e) {
        lastError = e;
      }
    }

    console.error('Verify error:', lastError);
    return false;
  }

  // Start resend cooldown
  function startResendCooldown() {
    resendCooldown = 60;
    otpResendBtn.disabled = true;
    clearInterval(resendInterval);
    resendInterval = setInterval(() => {
      resendCooldown--;
      otpTimer.textContent = ` (${resendCooldown}s)`;
      if (resendCooldown <= 0) {
        clearInterval(resendInterval);
        otpResendBtn.disabled = false;
        otpTimer.textContent = '';
      }
    }, 1000);
  }

  // ── Login Form Submit ─────────────────────────────────────────
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = loginNameInput.value.trim();
    if (!name) return;

    loginSubmit.disabled = true;
    loginSubmit.innerHTML = '<span class="cs-spinner"></span> Mengirim kode...';
    showStatus('', '');

    const sent = await sendOTP(name);

    if (sent) {
      otpSection.classList.add('show');
      loginForm.style.display = 'none';
      otpInput.focus();
      startResendCooldown();
      showStatus('Kode dikirim ke tim admin.', 'success');
    } else {
      showStatus('Gagal mengirim kode. Cek kredensial email Supabase Anda.', 'error');
      loginSubmit.disabled = false;
      loginSubmit.innerHTML = '<i class="ph-bold ph-sign-in"></i> Kirim Kode Verifikasi';
    }
  });

  // OTP input
  otpInput.addEventListener('input', () => {
    otpVerifyBtn.disabled = otpInput.value.length < 6;
  });

  otpInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!otpVerifyBtn.disabled) otpVerifyBtn.click();
    }
  });

  // OTP verify
  otpVerifyBtn.addEventListener('click', async () => {
    // Bersihkan kode dari spasi tersembunyi/karakter tak terlihat saat copas
    const rawCode = otpInput.value;
    const code = rawCode.replace(/[^0-9]/g, '');

    if (code.length < 6 || code.length > 10) {
      if (window.showToast) window.showToast('Panjang kode tidak valid.', 'warning');
      return;
    }

    otpVerifyBtn.disabled = true;
    otpVerifyBtn.innerHTML = '<span class="cs-spinner"></span>';

    const valid = await verifyOTP(code);

    if (valid) {
      // Auto-provisioning: daftarkan diri sendiri ke cs_agents.
      // Aman karena dibatasi RLS: hanya sesi ber-email himawaridigi@gmail.com
      // yang boleh insert baris untuk dirinya sendiri (lihat policy
      // "CS Self Provision"). Upsert supaya aman dipanggil berkali-kali.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const { error: provisionError } = await supabase
          .from('cs_agents')
          .upsert(
            { user_id: session.user.id, email: session.user.email },
            { onConflict: 'user_id' }
          );
        if (provisionError) {
          console.error('CS auto-provision failed:', provisionError);
          // Tidak menghentikan login — kalau gagal, akses tetap akan
          // ditolak RLS di query lain, jadi aman untuk lanjut saja.
        }
      }

      csName = loginNameInput.value.trim();
      localStorage.setItem('hd_cs_name', csName);
      setTimeout(() => showDashboard(), 500);
    } else {
      showStatus('Kode salah atau sudah kedaluwarsa.', 'error');
      otpInput.value = '';
      otpInput.focus();
      otpVerifyBtn.disabled = false;
      otpVerifyBtn.textContent = 'Verifikasi';
    }
  });

  // Resend OTP
  otpResendBtn.addEventListener('click', async () => {
    const name = loginNameInput.value.trim();
    if (!name || resendCooldown > 0) return;

    otpResendBtn.disabled = true;
    showStatus('Mengirim ulang kode...', 'info');
    await sendOTP(name);
    startResendCooldown();
    showStatus('Kode baru telah dikirim.', 'success');
  });

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════

  let chatsListener = null;

  function initDashboard() {
    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    listenForChats();
    listenForArchive();
    bindDashboardEvents();

    // ── Install PWA ──────────────────────────────────────────
    const installBtn = document.getElementById('cs-install-btn');
    const installModal = document.getElementById('cs-install-modal');
    const installClose = document.getElementById('cs-install-close');
    const installContent = document.getElementById('cs-install-content');
    const installAction = document.getElementById('cs-install-action');
    const installDesc = document.getElementById('cs-install-desc');
    let deferredInstallPrompt = null;

    // Detect platform
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    // Capture beforeinstallprompt (Chrome/Edge Android & Desktop)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      console.log('[Install] beforeinstallprompt captured');
    });

    function showInstallModal() {
      if (!installModal) return;
      installContent.innerHTML = '';
      installAction.style.display = 'none';

      if (isStandalone) {
        // Sudah terinstall
        installDesc.textContent = 'Aplikasi sudah terinstall di perangkat Anda! 🎉';
        installContent.innerHTML =
          '<div style="padding:16px 0;"><i class="ph-fill ph-check-circle" style="font-size:48px; color:#10b981;"></i><p style="margin:12px 0 0; color:var(--cs-text-secondary, #94a3b8); font-size:13px;">Anda sudah menggunakan Himawari CS sebagai aplikasi.</p></div>';
      } else if (deferredInstallPrompt) {
        // Chrome/Edge — native install
        installDesc.textContent = 'Install aplikasi untuk akses cepat & notifikasi push.';
        installAction.style.display = 'block';
      } else if (isIOS) {
        // iOS — manual instructions
        installDesc.textContent = 'Ikuti langkah berikut untuk install di iPhone/iPad:';
        const isBrowserSafari = isSafari;
        if (isBrowserSafari) {
          installContent.innerHTML = `
            <div style="margin-bottom:16px;">
              <div class="install-step"><div class="install-step-num">1</div><div class="install-step-text">Ketuk ikon <strong>Share</strong> <i class="ph ph-share-network"></i> di bagian bawah layar</div></div>
              <div class="install-step"><div class="install-step-num">2</div><div class="install-step-text">Scroll ke bawah dan pilih <strong>"Add to Home Screen"</strong> <i class="ph ph-plus-square"></i></div></div>
              <div class="install-step"><div class="install-step-num">3</div><div class="install-step-text">Ketuk <strong>"Add"</strong> di pojok kanan atas</div></div>
            </div>`;
        } else {
          installContent.innerHTML = `
            <div style="padding:12px; background:rgba(245,158,11,0.1); border-radius:10px; margin-bottom:16px; text-align:left;">
              <p style="margin:0; font-size:13px; color:#f59e0b; font-weight:600;"><i class="ph ph-warning"></i> Buka di Safari</p>
              <p style="margin:6px 0 0; font-size:12px; color:var(--cs-text-secondary, #94a3b8);">Di iPhone/iPad, instal PWA hanya bisa dilakukan melalui <strong>Safari</strong>. Salin URL ini dan buka di Safari:</p>
              <div style="margin-top:8px; padding:8px 12px; background:rgba(0,0,0,0.2); border-radius:6px; font-size:11px; color:#10b981; word-break:break-all; font-family:monospace;">${window.location.href}</div>
            </div>
            <div class="install-step"><div class="install-step-num">1</div><div class="install-step-text">Buka URL di atas di <strong>Safari</strong></div></div>
            <div class="install-step"><div class="install-step-num">2</div><div class="install-step-text">Ketuk ikon <strong>Share</strong> <i class="ph ph-share-network"></i></div></div>
            <div class="install-step"><div class="install-step-num">3</div><div class="install-step-text">Pilih <strong>"Add to Home Screen"</strong></div></div>`;
        }
      } else {
        // Firefox, Samsung Internet, etc — generic instructions
        installDesc.textContent = 'Install untuk akses cepat:';
        installContent.innerHTML = `
          <div style="margin-bottom:16px;">
            <div class="install-step"><div class="install-step-num">1</div><div class="install-step-text">Ketuk tombol <strong>Menu</strong> ( <i class="ph ph-dots-three-vertical"></i> ) di browser Anda</div></div>
            <div class="install-step"><div class="install-step-num">2</div><div class="install-step-text">Pilih <strong>"Install app"</strong> atau <strong>"Add to Home Screen"</strong></div></div>
            <div class="install-step"><div class="install-step-num">3</div><div class="install-step-text">Konfirmasi dan <strong>Install</strong></div></div>
          </div>`;
      }

      installModal.style.display = 'flex';
    }

    // Install action button click (for Chrome/Edge native prompt)
    if (installAction) {
      installAction.addEventListener('click', async () => {
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          const { outcome } = await deferredInstallPrompt.userChoice;
          console.log('[Install] User choice:', outcome);
          deferredInstallPrompt = null;
          if (outcome === 'accepted') {
            installModal.style.display = 'none';
            if (window.showToast) window.showToast('Aplikasi berhasil diinstall! 🎉', 'success');
            localStorage.setItem('hd_install_prompted', 'installed');
          }
        }
      });
    }

    // Close modal
    if (installClose) {
      installClose.addEventListener('click', () => {
        installModal.style.display = 'none';
        localStorage.setItem('hd_install_prompted', 'dismissed');
      });
    }
    if (installModal) {
      installModal.addEventListener('click', (e) => {
        if (e.target === installModal) {
          installModal.style.display = 'none';
          localStorage.setItem('hd_install_prompted', 'dismissed');
        }
      });
    }

    // Install button in topbar
    if (installBtn) {
      installBtn.addEventListener('click', showInstallModal);
    }

    // Auto-show on first visit (setelah 2 detik)
    if (!isStandalone && !localStorage.getItem('hd_install_prompted')) {
      setTimeout(() => showInstallModal(), 2000);
    }
  }

  // ── Listen for Active Chats ───────────────────────────────────
  async function listenForChats() {
    const { data: chats, error } = await supabase.from('chats').select('*').eq('status', 'active');
    if (error) {
      console.error('Error fetching active chats:', error);
      if (window.showToast) window.showToast('Error memuat chat aktif: ' + error.message, 'error');
    }
    const newChatsData = {};
    if (chats) {
      chats.forEach((c) => {
        newChatsData[c.id] = {
          info: { ...c, lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt).getTime() : 0 },
          messages: chatsData[c.id]?.messages || {},
        };
      });
      const chatIds = chats.map((c) => c.id);
      if (chatIds.length > 0) {
        const { data: msgs } = await supabase.from('messages').select('*').in('chat_id', chatIds);
        if (msgs) {
          msgs.forEach((m) => {
            newChatsData[m.chat_id].messages[m.id] = {
              ...m,
              timestamp: m.timestamp ? new Date(m.timestamp).getTime() : 0,
              replyTo: m.replyTo_id ? { id: m.replyTo_id, text: m.replyTo_text } : null,
            };
          });
        }
      }

      const prevData = chatsData || {};
      const prevChatIds = Object.keys(prevData);
      chatsData = newChatsData;

      if (prevChatIds.length > 0) {
        Object.keys(chatsData).forEach((id) => {
          const chat = chatsData[id];
          const prevChat = prevData[id];
          if (!prevChat) {
            notifyNewMessage(
              'Chat baru dari ' + (chat.info?.clientName || 'Client'),
              'Ada chat baru yang membutuhkan respons.',
              id
            );
          }
        });
      }
      renderChatList();
      updateSelectedChatStatus();
    }

    if (chatsListener) {
      supabase.removeChannel(chatsListener);
    }

    if (globalMessagesListener) {
      supabase.removeChannel(globalMessagesListener);
    }

    // Global Messages Listener to catch incoming messages instantly without fetching
    globalMessagesListener = supabase
      .channel('messages-global-' + Date.now())
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const m = payload.new;
          const cId = m.chat_id;
          const msg = {
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp).getTime() : 0,
            replyTo: m.replyTo_id ? { id: m.replyTo_id, text: m.replyTo_text } : null,
          };

          if (chatsData[cId]) {
            chatsData[cId].messages[m.id] = msg;
            if (m.sender === 'client') {
              if (cId !== selectedChatId || document.hidden) {
                notifyNewMessage(
                  'Pesan dari ' + (chatsData[cId].info.clientName || 'Client'),
                  m.text || '[Image]',
                  cId
                );
              } else {
                // If active, activeMessagesListener will handle marking as read. Just play sound.
                if (window.playNotifSound) window.playNotifSound();
              }
            }
            renderChatList();
          }
        }
      )
      .subscribe();

    chatsListener = supabase
      .channel('chats-active-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const c = payload.new;
          const isClosed = c.status === 'closed';
          const isActive = c.status === 'active';

          if (isActive) {
            const prevChat = chatsData[c.id];
            if (!chatsData[c.id]) chatsData[c.id] = { info: {}, messages: {} };
            chatsData[c.id].info = {
              ...c,
              lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt).getTime() : 0,
            };

            // If it was in archive, remove it from archive (e.g. reopened)
            if (archiveData[c.id]) delete archiveData[c.id];

            if (payload.eventType === 'INSERT') {
              notifyNewMessage(
                'Chat baru dari ' + (c.clientName || 'Client'),
                'Ada chat baru yang membutuhkan respons.',
                c.id
              );
            }
          } else if (isClosed) {
            // Move from active to archive
            if (chatsData[c.id]) {
              archiveData[c.id] = chatsData[c.id];
              archiveData[c.id].info = {
                ...c,
                lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt).getTime() : 0,
              };
              delete chatsData[c.id];

              if (selectedChatId === c.id && currentTab === 'active') {
                detailStatus.textContent = 'Closed';
                detailStatus.className = 'cs-detail-status closed';
              }
            } else if (!archiveData[c.id]) {
              // It's a new closed chat coming in from elsewhere
              archiveData[c.id] = {
                info: {
                  ...c,
                  lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt).getTime() : 0,
                },
                messages: {},
              };
            }
          }

          renderChatList();
          updateSelectedChatStatus();
        } else if (payload.eventType === 'DELETE') {
          if (chatsData[payload.old.id]) delete chatsData[payload.old.id];
          if (archiveData[payload.old.id]) delete archiveData[payload.old.id];
          renderChatList();
          updateSelectedChatStatus();
        }
      })
      .subscribe();
  }

  function updateSelectedChatStatus() {
    if (selectedChatId) {
      if (!chatsData[selectedChatId] && currentTab !== 'archive') {
        detailStatus.textContent = 'Closed';
        detailStatus.className = 'cs-detail-status closed';
      } else {
        const chat = chatsData[selectedChatId] || archiveData[selectedChatId];
        if (chat) {
          const isOnline = chat.info?.isOnline;
          detailStatus.textContent = isOnline ? 'Active' : 'Inactive';
          detailStatus.className = 'cs-detail-status ' + (isOnline ? 'active' : 'inactive');
        }
      }
    }
  }

  // ── Listen for Archived Chats ─────────────────────────────────
  async function listenForArchive() {
    const { data: chats } = await supabase
      .from('chats')
      .select('*')
      .eq('status', 'closed')
      .order('lastMessageAt', { ascending: false })
      .limit(50);
    if (chats) {
      archiveData = {};
      chats.forEach((c) => {
        archiveData[c.id] = {
          info: { ...c, lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt).getTime() : 0 },
          messages: {},
        };
      });
      const chatIds = chats.map((c) => c.id);
      if (chatIds.length > 0) {
        const { data: msgs } = await supabase.from('messages').select('*').in('chat_id', chatIds);
        if (msgs) {
          msgs.forEach((m) => {
            archiveData[m.chat_id].messages[m.id] = {
              ...m,
              timestamp: m.timestamp ? new Date(m.timestamp).getTime() : 0,
              replyTo: m.replyTo_id ? { id: m.replyTo_id, text: m.replyTo_text } : null,
            };
          });
        }
      }
      updateArchiveUI();
    }

    if (archiveListener) {
      supabase.removeChannel(archiveListener);
    }

    archiveListener = supabase
      .channel('chats-archive-' + Date.now())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats', filter: 'status=eq.closed' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const c = payload.new;
            if (!archiveData[c.id]) archiveData[c.id] = { info: {}, messages: {} };
            archiveData[c.id].info = {
              ...c,
              lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt).getTime() : 0,
            };
          } else if (payload.eventType === 'DELETE') {
            delete archiveData[payload.old.id];
          }
          updateArchiveUI();
        }
      )
      .subscribe();
  }

  function updateArchiveUI() {
    const archiveCount = document.getElementById('cs-archive-count');
    if (archiveCount) archiveCount.textContent = Object.keys(archiveData).length;
    if (currentTab === 'archive') renderChatList();
  }

  // ── Render Chat List ──────────────────────────────────────────
  function renderChatList() {
    const data = currentTab === 'archive' ? archiveData : chatsData;
    const items = Object.entries(data)
      .map(([id, chat]) => ({
        id,
        ...chat.info,
        lastMsg: getLastMessage(chat.messages),
        unread: countUnread(chat.messages),
      }))
      .filter((item) => {
        if (!searchQuery) return true;
        return item.clientName?.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

    chatCount.textContent = Object.keys(chatsData).length;
    const archiveCount = document.getElementById('cs-archive-count');
    if (archiveCount) archiveCount.textContent = Object.keys(archiveData).length;

    if (items.length === 0) {
      chatListEmpty.style.display = 'flex';
      // Clear old items but keep empty state
      Array.from(chatList.children).forEach((child) => {
        if (child !== chatListEmpty) child.remove();
      });
      return;
    }

    chatListEmpty.style.display = 'none';

    // Build HTML
    let html = '';
    items.forEach((item) => {
      const initials = (item.clientName || 'U')
        .split(' ')
        .map((w) => w[0])
        .join('')
        .substring(0, 2);
      const isActive = item.id === selectedChatId;

      let preview = 'Chat baru...';
      if (item.lastMsg) {
        const prefix = item.lastMsg.sender === 'cs' ? 'You: ' : `${item.clientName}: `;
        preview = window.chatSanitize(prefix + item.lastMsg.text).substring(0, 45);
      }

      const time = item.lastMessageAt ? window.chatRelativeTime(item.lastMessageAt) : '';

      html += `
        <div class="cs-chat-item ${isActive ? 'active' : ''}" data-chat-id="${item.id}">
          <div class="cs-chat-avatar-wrapper">
            <div class="cs-chat-avatar">${window.chatSanitize(initials)}</div>
            <div class="cs-chat-presence-dot ${item.isOnline ? '' : 'inactive'}"></div>
          </div>
          <div class="cs-chat-meta">
            <div class="cs-chat-meta-top">
              <span class="cs-chat-name">${window.chatSanitize(item.clientName || 'Unknown')}</span>
              ${
                item.unread > 0
                  ? `<div class="cs-chat-unread" style="display: inline-flex; width: auto; padding: 0 0.4rem;">${item.unread}</div>`
                  : `<span class="cs-chat-time">${time}</span>`
              }
            </div>
            <div class="cs-chat-preview">${preview}</div>
          </div>
        </div>
      `;
    });

    // Preserve scroll position
    const scrollTop = chatList.scrollTop;
    // Remove old items, keep empty state element
    Array.from(chatList.children).forEach((child) => {
      if (child !== chatListEmpty) child.remove();
    });
    chatList.insertAdjacentHTML('afterbegin', html);
    chatList.scrollTop = scrollTop;

    // Unread badge is now managed by updateNotifUI()
  }

  function getLastMessage(messages) {
    if (!messages) return null;
    const entries = Object.values(messages);
    return entries.reduce((latest, msg) => {
      if (!latest || (msg.timestamp || 0) > (latest.timestamp || 0)) return msg;
      return latest;
    }, null);
  }

  function countUnread(messages) {
    if (!messages) return 0;
    return Object.values(messages).filter((m) => m.sender === 'client' && !m.read).length;
  }

  function detachCurrentChatListeners() {
    if (selectedChatId) {
      if (activeMessagesListener) {
        supabase.removeChannel(activeMessagesListener);
        activeMessagesListener = null;
      }
      if (activeTypingListener) {
        supabase.removeChannel(activeTypingListener);
        activeTypingListener = null;
      }
    }
  }

  // ── Select Chat ───────────────────────────────────────────────
  async function selectChat(chatId) {
    if (selectedChatId === chatId) {
      // Mobile: show detail
      const detail = document.getElementById('cs-detail');
      const sidebar = document.getElementById('cs-sidebar');
      if (detail && sidebar) {
        detail.classList.add('show-mobile');
        sidebar.classList.add('hidden-mobile');
        if (window.innerWidth < 768) {
          history.pushState({ view: 'chat', chatId: chatId }, '');
        }
      }
      return;
    }
    detachCurrentChatListeners();
    selectedChatId = chatId;
    const chatSource = currentTab === 'archive' ? archiveData : chatsData;
    const chat = chatSource[chatId];
    if (!chat) return;

    // Update header
    detailName.textContent = chat.info?.clientName || 'Unknown';
    detailEmail.textContent = chat.info?.clientEmail || '';
    const isOnline = chat.info?.isOnline;
    detailStatus.textContent = isOnline ? 'Active' : 'Inactive';
    detailStatus.className = 'cs-detail-status ' + (isOnline ? 'active' : 'inactive');

    // Show chat view
    detailEmpty.style.display = 'none';
    chatView.style.display = 'flex';

    // Clear old messages
    messagesEl.innerHTML = '';
    currentRenderedIds.clear();
    currentLastDateSeparator = null;
    updateCSPinnedHeader(null);

    hasMoreMessages = true;
    isLoadingMore = false;
    oldestMessageTimestamp = null;

    const [{ data: msgsData }, { data: pinnedData }] = await Promise.all([
      supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: false })
        .limit(20),
      supabase.from('messages').select('*').eq('chat_id', chatId).eq('is_pinned', true).limit(1),
    ]);

    if (pinnedData && pinnedData.length > 0) {
      const pMsg = pinnedData[0];
      updateCSPinnedHeader(pMsg.text || window.getFileFallbackText(pMsg.imageUrl), pMsg.id);
    }

    if (msgsData) {
      const msgs = msgsData.reverse();
      if (msgs.length > 0) oldestMessageTimestamp = msgs[0].timestamp;
      if (msgs.length < 20) hasMoreMessages = false;

      let firstUnreadMsgId = null;
      let unreadCount = 0;
      msgs.forEach((m) => {
        if (m.sender === 'client' && !m.read) {
          if (!firstUnreadMsgId) firstUnreadMsgId = m.id;
          unreadCount++;
        }
      });

      const formattedMsgs = msgs.map((m) => {
        const msg = {
          ...m,
          timestamp: m.timestamp ? new Date(m.timestamp).getTime() : 0,
          replyTo: m.replyTo_id ? { id: m.replyTo_id, text: m.replyTo_text } : null,
        };
        if (chatSource[chatId]) {
          chatSource[chatId].messages[m.id] = msg;
        }
        if (msg.sender === 'client' && !msg.read) {
          supabase.from('messages').update({ read: true }).eq('id', m.id).then();
          if (chatSource[chatId]) {
            chatSource[chatId].messages[m.id].read = true;
          }
        }
        return msg;
      });

      renderMessagesList(formattedMsgs, firstUnreadMsgId, unreadCount);
      renderChatList();

      if (firstUnreadMsgId) {
        setTimeout(() => {
          const sepEl = document.getElementById('cs-unread-separator');
          const container = document.getElementById('cs-messages');
          if (sepEl && container) {
            container.scrollTo({
              top: sepEl.offsetTop - container.offsetTop - 20,
              behavior: 'smooth',
            });
          }
        }, 100);
      } else {
        scrollCSMessages();
      }
    }

    // Listen for messages
    activeMessagesListener = supabase
      .channel('messages-' + chatId + '-' + Date.now())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: 'chat_id=eq.' + chatId },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const m = payload.new;
            const msg = {
              ...m,
              timestamp: m.timestamp ? new Date(m.timestamp).getTime() : 0,
              replyTo: m.replyTo_id ? { id: m.replyTo_id, text: m.replyTo_text } : null,
            };
            if (chatSource[chatId]) chatSource[chatId].messages[m.id] = msg;
            if (!currentRenderedIds.has(m.id)) {
              const dateStr = window.formatDateSeparator(msg.timestamp);
              if (dateStr && dateStr !== currentLastDateSeparator) {
                const ds = document.createElement('div');
                ds.className = 'cs-date-separator';
                ds.style =
                  'text-align: center; margin: 1.5rem 0; font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground); position: relative;';
                ds.innerHTML = `<span style="background: color-mix(in srgb, var(--muted) 20%, transparent); padding: 0 10px; position: relative; z-index: 2;">${escapeAttr(dateStr)}</span><div style="position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: color-mix(in srgb, var(--border) 50%, transparent); z-index: 1;"></div>`;
                messagesEl.appendChild(ds);
                currentLastDateSeparator = dateStr;
              }
              currentRenderedIds.add(m.id);
              renderCSMessage(msg, m.id, true);
              scrollCSMessages();
            }
            if (msg.sender === 'client' && !msg.read) {
              supabase.from('messages').update({ read: true }).eq('id', m.id).then();
              // Update local state directly to clear the unread count
              chatsData[chatId].messages[m.id].read = true;
              renderChatList();
            }
          } else if (payload.eventType === 'UPDATE') {
            const m = payload.new;
            const msg = {
              ...m,
              timestamp: m.timestamp ? new Date(m.timestamp).getTime() : 0,
              replyTo: m.replyTo_id ? { id: m.replyTo_id, text: m.replyTo_text } : null,
            };
            if (chatSource[chatId]) chatSource[chatId].messages[m.id] = msg;

            if (msg.sender === 'cs' && msg.read) {
              const statusEl = document.getElementById('cs-msg-status-' + m.id);
              if (statusEl) {
                statusEl.className = 'cs-msg-status read';
                statusEl.innerHTML = '<i class="ph-bold ph-checks"></i>';
              }
            }

            const bubble = document.querySelector(`.cs-msg-bubble[data-id="${m.id}"]`);

            // Handle deleted_at toggle
            if (bubble) {
              const isCurrentlyDeleted = bubble.classList.contains('cs-msg-deleted');
              const isNowDeleted = !!msg.deleted_at;
              if (isCurrentlyDeleted !== isNowDeleted) {
                const wrapperDiv = bubble.closest('.cs-msg');
                if (wrapperDiv) {
                  const tempContainer = document.createElement('div');
                  const oldAppend = messagesEl.appendChild.bind(messagesEl);
                  messagesEl.appendChild = (el) => tempContainer.appendChild(el);
                  currentRenderedIds.delete(msg.id);
                  renderCSMessage(msg, msg.id, true);
                  currentRenderedIds.add(msg.id);
                  messagesEl.appendChild = oldAppend;
                  wrapperDiv.replaceWith(tempContainer.firstChild);
                }
                return;
              }
            }

            if (bubble) {
              // Update Text and Edit status
              if (msg.is_edited && bubble.dataset.text !== msg.text) {
                bubble.dataset.text = msg.text;
                const pTags = bubble.querySelectorAll('p');
                if (pTags.length > 0) {
                  pTags[pTags.length - 1].innerHTML = window.chatSanitize(msg.text);
                }
                const timeContainer = bubble.querySelector('.cs-msg-time-container');
                if (timeContainer && !timeContainer.querySelector('.cs-msg-edited-text')) {
                  timeContainer.insertAdjacentHTML(
                    'afterbegin',
                    '<span class="cs-msg-edited-text">(diedit)</span>'
                  );
                }
              }

              // Update Reactions
              let reactionContainer = bubble.querySelector('.cs-msg-reactions');
              if (msg.reaction) {
                if (!reactionContainer) {
                  reactionContainer = document.createElement('div');
                  reactionContainer.className = 'cs-msg-reactions';
                  const timeContainer = bubble.querySelector('.cs-msg-time-container');
                  if (timeContainer) {
                    bubble.insertBefore(reactionContainer, timeContainer);
                  } else {
                    bubble.appendChild(reactionContainer);
                  }
                }
                reactionContainer.innerHTML = `<button class="cs-msg-reaction">${window.chatSanitize(msg.reaction)} <span class="cs-reaction-count">1</span></button>`;
              } else if (reactionContainer) {
                reactionContainer.remove();
              }
            }

            // Update pinned header
            if (msg.is_pinned !== undefined) {
              if (bubble) bubble.dataset.pinned = Boolean(msg.is_pinned);
              const fallbackText = msg.text || window.getFileFallbackText(msg.imageUrl);
              if (msg.is_pinned) updateCSPinnedHeader(fallbackText, msg.id);
              else {
                const csPinnedHeader = document.getElementById('cs-pinned-header');
                if (csPinnedHeader && csPinnedHeader.dataset.id === msg.id) {
                  updateCSPinnedHeader(null);
                }
              }
            }
          }
        }
      )
      .subscribe();

    // Listen for client typing
    activeTypingListener = supabase
      .channel('typing-' + chatId + '-' + Date.now())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'typing_status', filter: 'chat_id=eq.' + chatId },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const data = payload.new;
            const ts = data.client_timestamp ? new Date(data.client_timestamp).getTime() : 0;
            if (data.client_is_typing && Date.now() - ts < 5000) {
              clientTypingEl.classList.add('show');
              scrollCSMessages();
            } else {
              clientTypingEl.classList.remove('show');
            }
          } else if (payload.eventType === 'DELETE') {
            clientTypingEl.classList.remove('show');
          }
        }
      )
      .subscribe();

    // Archive mode: hide input area and close button
    const csInputArea = document.getElementById('cs-input-area');
    if (currentTab === 'archive') {
      if (csInputArea) csInputArea.style.display = 'none';
      if (closeChatBtn) closeChatBtn.style.display = 'none';
    } else {
      if (csInputArea) csInputArea.style.display = 'flex';
      if (closeChatBtn) closeChatBtn.style.display = 'flex';
    }

    // Mobile: show detail
    detail.classList.add('show-mobile');
    sidebar.classList.add('hidden-mobile');

    // Push history state so hardware back button returns to chat list
    if (window.innerWidth < 768) {
      history.pushState({ view: 'chat', chatId: chatId }, '');
    }

    // Re-render list to update active state
    renderChatList();
  }

  function renderMessagesList(messages, firstUnreadMsgId, unreadCount) {
    messagesEl.innerHTML = '';
    currentLastDateSeparator = null;
    currentRenderedIds.clear();

    messages.forEach((msg) => {
      const dateStr = window.formatDateSeparator(msg.timestamp);
      if (dateStr && dateStr !== currentLastDateSeparator) {
        const ds = document.createElement('div');
        ds.className = 'cs-date-separator';
        ds.style =
          'text-align: center; margin: 1.5rem 0; font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground); position: relative;';
        ds.innerHTML = `<span style="background: color-mix(in srgb, var(--muted) 20%, transparent); padding: 0 10px; position: relative; z-index: 2;">${escapeAttr(dateStr)}</span><div style="position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: color-mix(in srgb, var(--border) 50%, transparent); z-index: 1;"></div>`;
        messagesEl.appendChild(ds);
        currentLastDateSeparator = dateStr;
      }

      if (msg.id === firstUnreadMsgId) {
        const sep = document.createElement('div');
        sep.id = 'cs-unread-separator';
        sep.className = 'cs-unread-separator';
        sep.style =
          'text-align: center; margin: 1.5rem 0; color: var(--primary); font-size: 0.8rem; font-weight: 600; position: relative;';
        sep.innerHTML = `<span style="background: color-mix(in srgb, var(--muted) 20%, transparent); padding: 0 10px; position: relative; z-index: 2;">${unreadCount} Pesan belum dibaca</span><div style="position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: color-mix(in srgb, var(--primary) 30%, transparent); z-index: 1;"></div>`;
        messagesEl.appendChild(sep);
      }

      currentRenderedIds.add(msg.id);
      renderCSMessage(msg, msg.id, true);
    });
  }

  function renderCSMessage(msg, msgId) {
    const div = document.createElement('div');
    const isClient = msg.sender === 'client';
    const isSystem = msg.sender === 'system';

    if (isSystem) {
      div.className = 'cs-msg cs-msg--system';
      div.innerHTML = `<div class="cs-msg-bubble"><p>${window.chatSanitize(msg.text)}</p></div>`;
    } else {
      div.className = `cs-msg ${isClient ? 'cs-msg--client' : 'cs-msg--cs'}`;
      const initials = isClient
        ? (msg.senderName || 'U').substring(0, 2).toUpperCase()
        : (csName || 'CS').substring(0, 2).toUpperCase();

      let statusHtml = '';
      if (!isClient && msgId) {
        statusHtml = msg.read
          ? `<span id="cs-msg-status-${msgId}" class="cs-msg-status read"><i class="ph-bold ph-checks"></i></span>`
          : `<span id="cs-msg-status-${msgId}" class="cs-msg-status sent"><i class="ph ph-check"></i></span>`;
      }

      const senderNameHtml = !isClient
        ? `<div class="cs-msg-sender-name">${window.chatSanitize(msg.senderName || 'CS')}</div>`
        : '';

      let imageHtml = '';
      let textHtml = '';

      if (msg.imageUrl) {
        const cleanUrl = msg.imageUrl.split('?')[0];
        const urlLower = cleanUrl.toLowerCase();
        const fileName = cleanUrl.split('/').pop();
        const extMatch = fileName.match(/\.([a-z0-9]+)$/);
        const ext = extMatch ? extMatch[1] : '';
        const extUpper = ext.toUpperCase() || 'FILE';

        const isImg =
          ['jpeg', 'jpg', 'gif', 'png', 'webp', 'svg'].includes(ext) || !urlLower.includes('.');
        const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
        const isVideo = ['mp4', 'webm', 'mov'].includes(ext);

        if (isImg) {
          imageHtml = `
            <div class="cs-msg-image-bubble" onclick="window.openCSLightbox('${escapeAttr(safeUrl(msg.imageUrl))}')">
              <img class="cs-msg-image" src="${escapeAttr(safeUrl(msg.imageUrl))}" alt="Image" loading="lazy" />
              ${msg.text ? `<div class="cs-msg-image-caption">${window.chatSanitize(msg.text)}</div>` : ''}
            </div>
          `;
        } else if (isAudio) {
          imageHtml = `
            <div class="hd-audio-player" data-src="${escapeAttr(safeUrl(msg.imageUrl))}">
              <audio class="hd-audio-element" src="${escapeAttr(safeUrl(msg.imageUrl))}" preload="metadata"></audio>
              <button class="hd-audio-play-btn" onclick="window.hdToggleAudio(this)">
                <i class="ph-fill ph-play"></i>
              </button>
              <div class="hd-audio-timeline">
                <div class="hd-audio-progress-bg">
                  <div class="hd-audio-progress-fill" style="width: 0%"></div>
                </div>
                <input type="range" class="hd-audio-progress-slider" min="0" max="100" value="0" step="0.1" oninput="window.hdSeekAudio(this)" onchange="window.hdSeekAudio(this)">
              </div>
              <div class="hd-audio-time">0:00</div>
            </div>
            ${msg.text ? `<div style="font-size:13px; color:var(--foreground); margin-top:2px; padding:0 6px;">${window.chatSanitize(msg.text)}</div>` : ''}
          `;
        } else if (isVideo) {
          imageHtml = `
            <div class="cs-msg-video-bubble" style="border-radius:12px; overflow:hidden; border:1px solid var(--border); margin-bottom:4px; max-width:360px; background:var(--card); display:flex; flex-direction:column;">
              <video controls playsinline webkit-playsinline style="width:100%; max-height:450px; display:block; background:#000;" preload="metadata">
                <source src="${escapeAttr(safeUrl(msg.imageUrl))}">
                Browser Anda tidak mendukung elemen video.
              </video>
              ${msg.text ? `<div style="padding:8px 12px; font-size:13px; color:var(--foreground); border-top:1px solid var(--border);">${window.chatSanitize(msg.text)}</div>` : ''}
            </div>
          `;
        } else {
          imageHtml = `
            <div class="cs-msg-file-bubble" style="background:var(--card); padding:10px 12px; border-radius:10px; display:flex; align-items:center; gap:12px; border:1px solid var(--border); margin-bottom:5px; max-width:260px;">
              <div style="width:40px; height:40px; background:var(--primary); color:var(--primary-foreground); border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; flex-shrink:0;">
                ${extUpper}
              </div>
              <div style="flex:1; overflow:hidden;">
                <div style="font-size:13px; font-weight:600; color:var(--foreground); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${escapeAttr(fileName)}">
                  ${escapeAttr(fileName.length > 20 ? fileName.substring(0, 15) + '...' + fileName.slice(-5) : fileName)}
                </div>
                <a href="${escapeAttr(safeUrl(msg.imageUrl))}" target="_blank" download style="font-size:12px; color:var(--primary); text-decoration:none; display:inline-flex; align-items:center; gap:4px; margin-top:4px;">
                  <i class="ph ph-download-simple"></i> Download File
                </a>
              </div>
            </div>
          `;
          if (msg.text) {
            textHtml = `<p>${window.chatSanitize(msg.text)}</p>`;
          }
        }
      } else {
        textHtml = `<p>${window.chatSanitize(msg.text)}</p>`;
      }

      let replyHtml = '';
      if (msg.replyTo && msg.replyTo.text) {
        replyHtml = `
            <div class="cs-msg-reply" onclick="event.stopPropagation(); window.scrollToMessage('${escapeAttr(msg.replyTo.id)}')" style="cursor: pointer;" title="Klik untuk melompat ke pesan ini">
              <div style="font-weight:600; font-size:0.75rem; color:var(--primary); margin-bottom:2px;">Replying to</div>
              <div>${window.chatSanitize(msg.replyTo.text)}</div>
            </div>
          `;
      }

      let reactionsHtml = '';
      if (msg.reaction) {
        // Assuming msg.reaction is a simple string for now, wrapped in the new button layout
        reactionsHtml = `
          <div class="cs-msg-reactions">
            <button class="cs-msg-reaction">${window.chatSanitize(msg.reaction)} <span class="cs-reaction-count">1</span></button>
          </div>
        `;
      }

      const isEdited = msg.is_edited ? '<span class="cs-msg-edited-text">(diedit)</span>' : '';
      const favs = JSON.parse(localStorage.getItem('hd_cs_fav_msgs') || '[]');
      const isFav = favs.includes(msgId) ? '<i class="ph-fill ph-star cs-msg-fav-icon"></i>' : '';

      // Handle soft deleted message
      if (msg.deleted_at) {
        const deleteTime = new Date(msg.deleted_at).getTime();
        const isWithin24Hours = Date.now() - deleteTime <= 24 * 60 * 60 * 1000;

        div.innerHTML = `
          ${isClient ? `<div class="cs-msg-avatar">${window.chatSanitize(initials)}</div>` : ''}
          <div class="cs-msg-bubble cs-msg-deleted" data-id="${escapeAttr(msgId)}" data-sender="${escapeAttr(msg.sender)}" style="background:var(--muted); color:var(--muted-foreground); border:1px solid var(--border); font-style:italic; display:flex; align-items:center; gap:8px;">
            <i class="ph ph-prohibit"></i> Pesan ini telah dihapus.
            ${!isClient && isWithin24Hours ? `<button onclick="window.undoDeleteCSMessage('${escapeAttr(msgId)}')" style="margin-left:8px; padding:2px 6px; font-size:11px; border-radius:4px; border:1px solid var(--border); background:var(--background); color:var(--foreground); cursor:pointer;">Undo</button>` : ''}
          </div>
        `;
      } else {
        div.innerHTML = `
          ${isClient ? `<div class="cs-msg-avatar">${window.chatSanitize(initials)}</div>` : ''}
          <div class="cs-msg-bubble" data-id="${escapeAttr(msgId)}" data-text="${escapeAttr(msg.text || window.getFileFallbackText(msg.imageUrl))}" data-sender="${escapeAttr(msg.sender)}" data-pinned="${Boolean(msg.is_pinned)}" data-url="${msg.imageUrl ? escapeAttr(safeUrl(msg.imageUrl)) : ''}">
            <div class="cs-msg-options" onclick="window.showCSContextMenuFromBtn(event, this)">
              <i class="ph-bold ph-dots-three-vertical"></i>
            </div>
            ${senderNameHtml}
            ${replyHtml}
            ${imageHtml}
            ${textHtml}
            ${reactionsHtml}
            <div class="cs-msg-time-container">
              ${isEdited}
              <span class="cs-msg-time">${msg.timestamp ? window.chatFormatTime(msg.timestamp) : ''}</span>
              ${isFav}
              ${statusHtml}
            </div>
          </div>
        `;
      }

      // Update sticky header if message is pinned
      if (msg.is_pinned) {
        updateCSPinnedHeader(msg.text || window.getFileFallbackText(msg.imageUrl), msg.id);
      }
    }

    messagesEl.appendChild(div);
  }

  // ── Pinned Header Logic ───────────────────────────────────────
  const csPinnedHeader = document.getElementById('cs-pinned-header');
  const csPinnedTextEl = document.getElementById('cs-pinned-text');

  function updateCSPinnedHeader(text, id) {
    if (text) {
      csPinnedHeader.style.display = 'flex';
      csPinnedHeader.style.cursor = 'pointer';
      csPinnedTextEl.textContent = text;
      if (id) csPinnedHeader.dataset.id = id;
    } else {
      csPinnedHeader.style.display = 'none';
      csPinnedTextEl.textContent = '';
      csPinnedHeader.removeAttribute('data-id');
    }
  }

  csPinnedHeader.addEventListener('click', () => {
    const id = csPinnedHeader.dataset.id;
    if (id) {
      window.scrollToMessage(id);
    }
  });

  function scrollCSMessages() {
    setTimeout(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 100);
  }

  // ── Send Message as CS ────────────────────────────────────────
  async function sendCSMessage() {
    const text = chatInput.value.trim();
    if (!text || !selectedChatId || isSendingCS) return;

    isSendingCS = true;
    const savedReply = csReplyToData;
    const savedEditId = csEditingMsgId;
    csReplyToData = null;
    csEditingMsgId = null;
    document.querySelectorAll('.cs-reply-preview').forEach((el) => el.remove());
    chatInput.value = '';
    sendBtn.disabled = true;

    try {
      if (savedEditId) {
        await supabase
          .from('messages')
          .update({
            text: text,
            is_edited: true,
          })
          .eq('id', savedEditId);
      } else {
        await supabase.from('messages').insert({
          chat_id: selectedChatId,
          sender: 'cs',
          senderName: csName,
          text: text,
          replyTo_id: savedReply ? savedReply.id : null,
          replyTo_text: savedReply ? savedReply.text : null,
          timestamp: new Date().toISOString(),
          read: true,
        });

        await supabase
          .from('chats')
          .update({
            lastMessageAt: new Date().toISOString(),
            assignedCS: csName,
          })
          .eq('id', selectedChatId);

        // Kirim push notification ke perangkat client
        if (window.triggerPushNotification) {
          window.triggerPushNotification({
            sender: 'cs',
            senderName: csName,
            text: text,
            chat_id: selectedChatId,
          });
        }
      }

      clearCSTyping();
    } catch (err) {
      chatInput.value = text;
      sendBtn.disabled = false;
      if (window.showToast) window.showToast('Gagal mengirim pesan. Coba lagi.', 'error');
    } finally {
      isSendingCS = false;
    }
  }

  // ── CS Typing Indicator ───────────────────────────────────────
  function sendCSTyping() {
    if (!selectedChatId) return;
    supabase
      .from('typing_status')
      .upsert({
        chat_id: selectedChatId,
        cs_is_typing: true,
        cs_timestamp: new Date().toISOString(),
      })
      .then();

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => clearCSTyping(), 3000);
  }

  function clearCSTyping() {
    if (!selectedChatId) return;
    supabase
      .from('typing_status')
      .upsert({
        chat_id: selectedChatId,
        cs_is_typing: false,
        cs_timestamp: new Date().toISOString(),
      })
      .then();
  }

  // ── Close Chat ────────────────────────────────────────────────
  async function closeActiveChat() {
    if (!selectedChatId) return;

    window.showConfirmModal({
      title: 'Tutup Chat?',
      text: 'Client tidak akan bisa mengirim pesan lagi ke obrolan ini.',
      icon: 'ph-x-circle',
      iconBg: '#fef3c7',
      iconColor: '#d97706',
      confirmText: 'Tutup',
      confirmBg: '#d97706',
      onConfirm: async (closeModal) => {
        await supabase
          .from('chats')
          .update({
            status: 'closed',
          })
          .eq('id', selectedChatId);

        // Detach listener
        detachCurrentChatListeners();

        await supabase.from('typing_status').delete().eq('chat_id', selectedChatId);

        selectedChatId = null;
        chatView.style.display = 'none';
        detailEmpty.style.display = 'flex';

        // Mobile: back to sidebar
        detail.classList.remove('show-mobile');
        sidebar.classList.remove('hidden-mobile');

        closeModal();
      },
    });
  }

  // ── Notifications ─────────────────────────────────────────────
  let notifHistory = [];
  let unreadNotifCount = 0;

  function updateNotifUI() {
    const badge = document.getElementById('cs-notif-badge');
    const list = document.getElementById('cs-notif-list');

    if (badge) {
      if (unreadNotifCount > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = unreadNotifCount > 9 ? '9+' : unreadNotifCount;
      } else {
        badge.style.display = 'none';
      }
    }

    if (list) {
      if (notifHistory.length === 0) {
        list.innerHTML = '<div class="cs-notif-empty">Belum ada notifikasi</div>';
      } else {
        list.innerHTML = notifHistory
          .map(
            (n) => `
          <div class="cs-notif-item" onclick="const el = document.querySelector('[data-chat-id=\\'${n.chatId}\\']'); if(el) el.click();">
            <div class="cs-notif-item-title">${window.chatSanitize(n.title)}</div>
            <div class="cs-notif-item-desc">${window.chatSanitize(n.text)}</div>
            <div class="cs-notif-item-time">${window.chatRelativeTime(n.time)}</div>
          </div>
        `
          )
          .join('');
      }
    }
  }

  function notifyNewMessage(title, text, chatId) {
    if (window.showToast) window.showToast(title + ': ' + text, 'info');

    notifHistory.unshift({ title, text, chatId, time: Date.now() });
    if (notifHistory.length > 20) notifHistory.pop(); // Keep max 20

    unreadNotifCount++;
    updateNotifUI();

    const bellIcon = document.querySelector('#cs-notif-toggle i');
    if (bellIcon) {
      bellIcon.classList.remove('animate-ring');
      void bellIcon.offsetWidth; // trigger reflow
      bellIcon.classList.add('animate-ring');
      setTimeout(() => bellIcon.classList.remove('animate-ring'), 1000);
    }

    if (window.playNotifSound) window.playNotifSound();

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: text,
        icon: '/assets/logo/favicon.png',
      });
    }
  }

  // Bind notification toggle
  const notifToggle = document.getElementById('cs-notif-toggle');
  const notifDropdown = document.getElementById('cs-notif-dropdown');
  if (notifToggle && notifDropdown) {
    notifToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('show');
      if (notifDropdown.classList.contains('show')) {
        unreadNotifCount = 0;
        updateNotifUI();
      }
    });
    document.addEventListener('click', (e) => {
      if (!notifToggle.contains(e.target) && !notifDropdown.contains(e.target)) {
        notifDropdown.classList.remove('show');
      }
    });
  }

  // ── Logout ────────────────────────────────────────────────────
  async function logout() {
    window.showConfirmModal({
      title: 'Logout?',
      text: 'Anda akan keluar dari CS Dashboard HimawariDigi.',
      icon: 'ph-sign-out',
      iconBg: '#fee2e2',
      iconColor: '#ef4444',
      confirmText: 'Logout',
      confirmBg: '#ef4444',
      onConfirm: async (closeModal) => {
        // Clear typing
        if (selectedChatId) {
          supabase.from('typing_status').delete().eq('chat_id', selectedChatId).then();
        }

        // Detach all listeners
        if (globalMessagesListener) {
          supabase.removeChannel(globalMessagesListener);
          globalMessagesListener = null;
        }
        if (chatsListener) {
          supabase.removeChannel(chatsListener);
          chatsListener = null;
        }
        if (archiveListener) {
          supabase.removeChannel(archiveListener);
          archiveListener = null;
        }
        detachCurrentChatListeners();
        if (resendInterval) {
          clearInterval(resendInterval);
          resendInterval = null;
        }

        isExplicitLogout = true;
        await supabase.auth.signOut();
        clearSession();
        selectedChatId = null;
        chatsData = {};
        archiveData = {};

        showLogin();

        // Reset login form
        loginForm.style.display = 'block';
        otpSection.classList.remove('show');
        loginSubmit.disabled = false;
        loginSubmit.innerHTML = '<i class="ph-bold ph-sign-in"></i> Kirim Kode Verifikasi';
        loginNameInput.value = '';
        loginStatus.className = 'cs-login-status';
        closeModal();
      },
    });
  }

  // ── Export Chat ────────────────────────────────────────────
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function getChatExportData() {
    const data = currentTab === 'archive' ? archiveData : chatsData;
    const chat = data[selectedChatId];
    if (!chat) return null;

    const { data: msgsData } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', selectedChatId)
      .order('timestamp', { ascending: true });

    const messages = msgsData ? msgsData : [];
    return {
      clientName: chat.info?.clientName || 'Unknown',
      clientEmail: chat.info?.clientEmail || '',
      assignedCS: chat.info?.assignedCS || '',
      messages: messages.map((m) => ({
        time: m.timestamp ? new Date(m.timestamp).toLocaleString('id-ID') : '',
        type: m.sender === 'client' ? 'Client' : m.sender === 'system' ? 'System' : 'CS',
        sender:
          m.sender === 'client'
            ? chat.info?.clientName || 'Client'
            : m.sender === 'system'
              ? 'System'
              : m.senderName || 'CS',
        text: m.text || '',
        imageUrl: m.imageUrl || null,
        reaction: m.reaction || null,
      })),
    };
  }

  async function exportChat(format) {
    const data = await getChatExportData();
    if (!data) return;
    const filename =
      'chat_' + data.clientName.replace(/\s+/g, '_') + '_' + new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      let csv = 'Waktu,Tipe,Pengirim,Pesan\n';
      data.messages.forEach((m) => {
        let msgText = m.text || '';
        if (m.imageUrl) msgText += msgText ? `\n[Image] ${m.imageUrl}` : `[Image] ${m.imageUrl}`;
        if (m.reaction) msgText += `\n(Reaction: ${m.reaction})`;
        csv += `"${m.time}","${m.type}","${m.sender}","${msgText.replace(/"/g, '""')}"\n`;
      });
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, filename + '.csv');
    } else if (format === 'excel') {
      if (!window.XLSX) {
        if (window.showToast) window.showToast('Library Excel gagal dimuat', 'error');
        return;
      }
      const ws = XLSX.utils.json_to_sheet(
        data.messages.map((m) => {
          let msgText = m.text || '';
          if (m.imageUrl) msgText += msgText ? `\n[Image] ${m.imageUrl}` : `[Image] ${m.imageUrl}`;
          if (m.reaction) msgText += `\n(Reaction: ${m.reaction})`;
          return {
            Waktu: m.time,
            Tipe: m.type,
            Pengirim: m.sender,
            Pesan: msgText,
          };
        })
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Chat');
      XLSX.writeFile(wb, filename + '.xlsx');
    } else if (format === 'pdf') {
      if (!window.jspdf) {
        if (window.showToast) window.showToast('Library PDF gagal dimuat', 'error');
        return;
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text('Chat History \u2014 HimawariDigi', 14, 15);
      doc.setFontSize(10);
      doc.text(`Client: ${data.clientName} (${data.clientEmail})`, 14, 23);
      doc.text(`CS: ${data.assignedCS}`, 14, 29);

      // Helper to strip non-ASCII/Emoji for jsPDF
      const stripEmoji = (str) => {
        if (!str) return '';
        // Map common reactions to text
        const rxMap = {
          '👍': '[Jempol]',
          '❤️': '[Hati]',
          '😂': '[Tertawa]',
          '😮': '[Terkejut]',
          '😢': '[Sedih]',
          '🙏': '[Terima Kasih]',
        };
        for (const [e, txt] of Object.entries(rxMap)) {
          str = str.replace(new RegExp(e, 'g'), txt);
        }
        // Strip remaining emojis
        return str
          .replace(
            /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
            ''
          )
          .trim();
      };

      const tableRows = [];
      data.messages.forEach((m) => {
        let text = stripEmoji(m.text || '');
        if (m.imageUrl) {
          text += text ? '\n[Gambar Dilampirkan]' : '[Gambar Dilampirkan]';
        }
        if (m.reaction) {
          text += '\n(Reaction: ' + stripEmoji(m.reaction) + ')';
        }
        tableRows.push([m.time, m.type, m.sender, text]);
      });

      doc.autoTable({
        startY: 35,
        head: [['Waktu', 'Tipe', 'Pengirim', 'Pesan']],
        body: tableRows,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [99, 102, 241] },
        columnStyles: { 3: { cellWidth: 80 } },
      });
      doc.save(filename + '.pdf');
    }
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Lightbox ────────────────────────────────────────────────
  window.hdForceDownload = async (url, filename) => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (e) {
      window.open(url, '_blank');
    }
  };

  // ── Lightbox Zoom & Pan ────────────────────────────────────────────────
  const csLightbox = document.getElementById('cs-lightbox');
  const csLightboxClose = document.getElementById('cs-lightbox-close');
  const csLightboxOverlay = document.querySelector('.cs-lightbox-overlay');
  const csLightboxImg = document.getElementById('cs-lightbox-img');
  const csZoomInBtn = document.getElementById('cs-lightbox-zoom-in');
  const csZoomOutBtn = document.getElementById('cs-lightbox-zoom-out');
  const csResetBtn = document.getElementById('cs-lightbox-reset');
  const csDownloadBtn = document.getElementById('cs-lightbox-download');

  let csScale = 1,
    csPanning = false,
    csPointX = 0,
    csPointY = 0,
    csStartX = 0,
    csStartY = 0;

  const setCSLightboxTransform = () => {
    if (csLightboxImg)
      csLightboxImg.style.transform = `translate(${csPointX}px, ${csPointY}px) scale(${csScale})`;
  };

  const resetCSLightbox = () => {
    csScale = 1;
    csPointX = 0;
    csPointY = 0;
    setCSLightboxTransform();
  };

  if (csLightboxImg) {
    csLightboxImg.onmousedown = (e) => {
      e.preventDefault();
      csStartX = e.clientX - csPointX;
      csStartY = e.clientY - csPointY;
      csPanning = true;
    };
    document.addEventListener('mouseup', () => {
      csPanning = false;
    });
    document.addEventListener('mousemove', (e) => {
      if (!csPanning || csScale <= 1) return;
      csPointX = e.clientX - csStartX;
      csPointY = e.clientY - csStartY;
      setCSLightboxTransform();
    });
    csLightboxImg.onwheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      csScale = Math.max(0.5, Math.min(csScale + delta, 5));
      setCSLightboxTransform();
    };
  }

  if (csZoomInBtn)
    csZoomInBtn.onclick = () => {
      csScale = Math.min(csScale + 0.2, 5);
      setCSLightboxTransform();
    };
  if (csZoomOutBtn)
    csZoomOutBtn.onclick = () => {
      csScale = Math.max(csScale - 0.2, 0.5);
      setCSLightboxTransform();
    };
  if (csResetBtn) csResetBtn.onclick = resetCSLightbox;

  const closeCSLightbox = () => {
    if (csLightbox) csLightbox.style.display = 'none';
    resetCSLightbox();
  };

  if (csLightboxClose) csLightboxClose.addEventListener('click', closeCSLightbox);
  if (csLightboxOverlay) csLightboxOverlay.addEventListener('click', closeCSLightbox);

  window.openCSLightbox = function (url) {
    if (csLightbox && csLightboxImg) {
      csLightboxImg.src = url;
      csLightboxImg.classList.remove('zoomed');
      if (csDownloadBtn) {
        csDownloadBtn.onclick = (e) => {
          e.preventDefault();
          window.hdForceDownload(url, 'image_' + Date.now() + '.jpg');
        };
      }
      csLightbox.style.display = 'flex';
      resetCSLightbox();
    }
  };

  // ── Bind Dashboard Events ─────────────────────────────────────
  let dashboardEventsBound = false;
  function bindDashboardEvents() {
    if (dashboardEventsBound) return;
    dashboardEventsBound = true;
    // Chat list item click (event delegation)
    chatList.addEventListener('click', (e) => {
      const item = e.target.closest('.cs-chat-item');
      if (item) {
        selectChat(item.dataset.chatId);
      }
    });

    // Search
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim();
      renderChatList();
    });

    async function loadMoreMessages() {
      if (!selectedChatId || isLoadingMore || !hasMoreMessages) return;

      isLoadingMore = true;

      const loadingEl = document.createElement('div');
      loadingEl.style =
        'text-align: center; padding: 10px; font-size: 0.8rem; color: var(--muted-foreground);';
      loadingEl.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Memuat...';
      messagesEl.prepend(loadingEl);

      const { data: msgsData } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', selectedChatId)
        .lt('timestamp', new Date(oldestMessageTimestamp).toISOString())
        .order('timestamp', { ascending: false })
        .limit(20);

      if (msgsData && msgsData.length > 0) {
        const msgs = msgsData.reverse();
        oldestMessageTimestamp = msgs[0].timestamp;

        const chatSource = currentTab === 'archive' ? archiveData : chatsData;

        msgs.forEach((m) => {
          const msg = {
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp).getTime() : 0,
            replyTo: m.replyTo_id ? { id: m.replyTo_id, text: m.replyTo_text } : null,
          };
          if (chatSource[selectedChatId]) {
            chatSource[selectedChatId].messages[m.id] = msg;
          }
        });

        if (msgs.length < 20) hasMoreMessages = false;

        const allMsgs = Object.values(chatSource[selectedChatId].messages).sort(
          (a, b) => a.timestamp - b.timestamp
        );
        const oldScrollHeight = messagesEl.scrollHeight;

        renderMessagesList(allMsgs, null, 0);

        messagesEl.scrollTop = messagesEl.scrollHeight - oldScrollHeight;
      } else {
        hasMoreMessages = false;
        loadingEl.remove();
      }

      isLoadingMore = false;
    }

    messagesEl.addEventListener('scroll', () => {
      if (messagesEl.scrollTop <= 50) {
        loadMoreMessages();
      }
    });

    // Send message
    sendBtn.addEventListener('click', sendCSMessage);
    chatInput.addEventListener('input', () => {
      sendBtn.disabled = !chatInput.value.trim();
      sendCSTyping();
    });
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendCSMessage();
      }
    });

    // Close chat
    closeChatBtn.addEventListener('click', closeActiveChat);

    // Back button (mobile)
    backBtn.addEventListener('click', () => {
      detail.classList.remove('show-mobile');
      sidebar.classList.remove('hidden-mobile');
      // Go back in history if we pushed a state
      if (history.state && history.state.view === 'chat') {
        history.back();
      }
    });

    // Handle hardware back button (Android) and swipe back (iOS)
    window.addEventListener('popstate', (e) => {
      if (detail.classList.contains('show-mobile')) {
        detail.classList.remove('show-mobile');
        sidebar.classList.remove('hidden-mobile');
      }
    });

    // Logout
    logoutBtn.addEventListener('click', logout);

    // ── Tab Switcher ──
    const tabActive = document.getElementById('cs-tab-active');
    const tabArchive = document.getElementById('cs-tab-archive');
    if (tabActive)
      tabActive.addEventListener('click', () => {
        currentTab = 'active';
        tabActive.classList.add('active');
        if (tabArchive) tabArchive.classList.remove('active');
        renderChatList();
      });
    if (tabArchive)
      tabArchive.addEventListener('click', () => {
        currentTab = 'archive';
        tabArchive.classList.add('active');
        if (tabActive) tabActive.classList.remove('active');
        renderChatList();
      });

    // ── Export Chat ──
    const exportBtn = document.getElementById('cs-export-btn');
    const exportDropdown = document.getElementById('cs-export-dropdown');
    if (exportBtn && exportDropdown) {
      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportDropdown.classList.toggle('show');
      });
      exportDropdown.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-format]');
        if (btn) {
          exportChat(btn.dataset.format);
          exportDropdown.classList.remove('show');
        }
      });
      document.addEventListener('click', (e) => {
        if (!exportBtn.contains(e.target) && !exportDropdown.contains(e.target)) {
          exportDropdown.classList.remove('show');
        }
      });
    }

    // ── Image Upload ──
    const csImageUpload = document.getElementById('cs-image-upload');
    const csAttachLabel = document.querySelector('.cs-attach-btn[for="cs-image-upload"]');
    if (csImageUpload) {
      csImageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedChatId) return;
        if (file.size > 50 * 1024 * 1024) {
          if (window.showToast) window.showToast('Ukuran file maksimal 50MB', 'error');
          csImageUpload.value = '';
          return;
        }
        try {
          sendBtn.disabled = true;
          chatInput.disabled = true;
          if (csAttachLabel) csAttachLabel.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';

          const finalFile = window.compressImageFile ? await window.compressImageFile(file) : file;
          const safeName = finalFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const filePath = selectedChatId + '/' + Date.now() + '_' + safeName;
          const { error: uploadError } = await supabase.storage
            .from('chat-images')
            .upload(filePath, finalFile);
          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(filePath);
          const url = urlData.publicUrl;

          await supabase.from('messages').insert({
            chat_id: selectedChatId,
            sender: 'cs',
            senderName: csName,
            text: '',
            imageUrl: url,
            replyTo_id: csReplyToData ? csReplyToData.id : null,
            replyTo_text: csReplyToData ? csReplyToData.text : null,
            timestamp: new Date().toISOString(),
            read: true,
          });

          csReplyToData = null;
          document.querySelectorAll('.cs-reply-preview').forEach((el) => el.remove());

          await supabase
            .from('chats')
            .update({
              lastMessageAt: new Date().toISOString(),
              assignedCS: csName,
            })
            .eq('id', selectedChatId);

          if (window.showToast) window.showToast('File berhasil dikirim', 'success');
        } catch (err) {
          console.error(err);
          if (window.showToast) window.showToast('Gagal upload file', 'error');
        }

        sendBtn.disabled = !chatInput.value.trim();
        chatInput.disabled = false;
        if (csAttachLabel) csAttachLabel.innerHTML = '<i class="ph ph-paperclip"></i>';
        csImageUpload.value = '';
      });
    }

    // Lightbox logic moved to global scope

    // ── Emoji Picker ──
    const csEmojiToggle = document.getElementById('cs-emoji-toggle');
    const csEmojiPicker = document.getElementById('cs-emoji-picker');
    if (csEmojiToggle && csEmojiPicker) {
      csEmojiToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        csEmojiPicker.style.display = csEmojiPicker.style.display === 'none' ? 'grid' : 'none';
      });
      csEmojiPicker.addEventListener('click', (e) => {
        if (e.target.classList.contains('cs-emoji-btn')) {
          chatInput.value += e.target.textContent;
          sendBtn.disabled = !chatInput.value.trim();
          csEmojiPicker.style.display = 'none';
          chatInput.focus();
        }
      });
      document.addEventListener('click', (e) => {
        if (!csEmojiToggle.contains(e.target) && !csEmojiPicker.contains(e.target)) {
          csEmojiPicker.style.display = 'none';
        }
      });
    }

    // ── Context Menu (Messages) ──
    const csCtxMenu = document.getElementById('cs-context-menu');
    let csContextMsgSender = null;

    function showCSContextMenu(e, msgId, msgText, sender, isPinnedStr, bubbleUrl) {
      e.preventDefault();
      csContextMsgId = msgId;
      csContextMsgText = msgText;
      csContextMsgSender = sender;

      const editBtn = document.getElementById('cs-ctx-edit');
      if (editBtn) {
        editBtn.style.display = csContextMsgSender === 'cs' && !bubbleUrl ? 'flex' : 'none';
      }

      const pinBtn = document.getElementById('cs-ctx-pin');
      if (pinBtn) {
        if (isPinnedStr === 'true') {
          pinBtn.innerHTML = '<i class="ph ph-push-pin-slash"></i> Lepas Sematan';
        } else {
          pinBtn.innerHTML = '<i class="ph ph-push-pin"></i> Sematkan';
        }
      }

      // Toggle Favorite text
      const favBtn = document.getElementById('cs-ctx-fav');
      if (favBtn) {
        const favs = JSON.parse(localStorage.getItem('hd_cs_fav_msgs') || '[]');
        if (favs.includes(msgId)) {
          favBtn.innerHTML = '<i class="ph-fill ph-star"></i> Hapus Favorit';
        } else {
          favBtn.innerHTML = '<i class="ph ph-star"></i> Favorit';
        }
      }

      // Toggle Copy button
      const copyBtn = document.getElementById('cs-ctx-copy');
      if (copyBtn) {
        copyBtn.style.display = bubbleUrl ? 'none' : 'flex';
      }

      // Toggle Download button
      const downloadBtn = document.getElementById('cs-ctx-download');
      if (downloadBtn) {
        if (bubbleUrl) {
          downloadBtn.style.display = 'flex';
          downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = bubbleUrl;
            a.download = bubbleUrl.split('/').pop() || 'download';
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            a.remove();
            csCtxMenu.style.display = 'none';
          };
        } else {
          downloadBtn.style.display = 'none';
        }
      }

      // Toggle Delete button
      const deleteBtn = document.getElementById('cs-ctx-delete');
      if (deleteBtn) {
        deleteBtn.style.display = csContextMsgSender === 'cs' ? 'flex' : 'none';
      }

      let x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      let y = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      csCtxMenu.style.display = 'block';
      if (x + csCtxMenu.offsetWidth > window.innerWidth) x -= csCtxMenu.offsetWidth;
      if (y + csCtxMenu.offsetHeight > window.innerHeight) y -= csCtxMenu.offsetHeight;
      csCtxMenu.style.left = x + 'px';
      csCtxMenu.style.top = y + 'px';
    }

    window.showCSContextMenuFromBtn = function (e, btn) {
      e.stopPropagation();
      const bubble = btn.closest('.cs-msg-bubble');
      if (bubble && bubble.dataset.id) {
        showCSContextMenu(
          e,
          bubble.dataset.id,
          bubble.dataset.text,
          bubble.dataset.sender,
          bubble.dataset.pinned,
          bubble.dataset.url
        );
      }
    };

    window.deleteCSMessage = async function (msgId) {
      try {
        const { error } = await supabase
          .from('messages')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', msgId);
        if (error) throw error;
        if (window.showToast) window.showToast('Pesan berhasil dihapus', 'success');
      } catch (err) {
        console.error('Delete error:', err);
        if (window.showToast) window.showToast('Gagal menghapus pesan', 'error');
      }
    };

    window.undoDeleteCSMessage = async function (msgId) {
      try {
        const { error } = await supabase
          .from('messages')
          .update({ deleted_at: null })
          .eq('id', msgId);
        if (error) throw error;
        if (window.showToast) window.showToast('Penghapusan dibatalkan', 'success');
      } catch (err) {
        console.error('Undo error:', err);
        if (window.showToast) window.showToast('Gagal membatalkan penghapusan', 'error');
      }
    };

    messagesEl.addEventListener('contextmenu', (e) => {
      const bubble = e.target.closest('.cs-msg-bubble');
      if (bubble && bubble.dataset.id) {
        showCSContextMenu(
          e,
          bubble.dataset.id,
          bubble.dataset.text,
          bubble.dataset.sender,
          bubble.dataset.pinned,
          bubble.dataset.url
        );
      }
    });

    messagesEl.addEventListener('touchstart', (e) => {
      const bubble = e.target.closest('.cs-msg-bubble');
      if (bubble && bubble.dataset.id) {
        csLongPressTimer = setTimeout(() => {
          showCSContextMenu(
            e,
            bubble.dataset.id,
            bubble.dataset.text,
            bubble.dataset.sender,
            bubble.dataset.pinned,
            bubble.dataset.url
          );
        }, 500);
      }
    });
    messagesEl.addEventListener('touchend', () => clearTimeout(csLongPressTimer));
    messagesEl.addEventListener('touchmove', () => clearTimeout(csLongPressTimer));

    if (csCtxMenu) {
      document.getElementById('cs-ctx-reply').addEventListener('click', () => {
        csReplyToData = { id: csContextMsgId, text: csContextMsgText };
        document.querySelectorAll('.cs-reply-preview').forEach((el) => el.remove());
        const preview = document.createElement('div');
        preview.className = 'cs-reply-preview';
        preview.innerHTML = `
          <div class="cs-msg-reply" style="margin:0 10px 5px; display:flex; justify-content:space-between; align-items:center;">
            <div><span style="font-weight:bold; color:var(--primary);">Replying to:</span> ${window.chatSanitize(csContextMsgText)}</div>
            <i class="ph ph-x" style="cursor:pointer;" onclick="this.parentElement.parentElement.remove(); window.csClearReply();"></i>
          </div>`;
        const inputArea = document.getElementById('cs-input-area');
        inputArea.insertBefore(preview, inputArea.firstChild);
        chatInput.focus();
        csCtxMenu.style.display = 'none';
      });
      document.getElementById('cs-ctx-fav').addEventListener('click', () => {
        const favs = JSON.parse(localStorage.getItem('hd_cs_fav_msgs') || '[]');
        if (!favs.includes(csContextMsgId)) {
          favs.push(csContextMsgId);
          if (window.showToast) window.showToast('Pesan ditambahkan ke favorit', 'success');
        } else {
          favs.splice(favs.indexOf(csContextMsgId), 1);
          if (window.showToast) window.showToast('Pesan dihapus dari favorit', 'info');
        }
        localStorage.setItem('hd_cs_fav_msgs', JSON.stringify(favs));

        // Update DOM visually without reloading
        const bubble = document.querySelector(`.cs-msg-bubble[data-id="${csContextMsgId}"]`);
        if (bubble) {
          let favIcon = bubble.querySelector('.cs-msg-fav-icon');
          if (favs.includes(csContextMsgId)) {
            if (!favIcon) {
              const timeContainer = bubble.querySelector('.cs-msg-time-container');
              if (timeContainer) {
                const timeSpan = timeContainer.querySelector('.cs-msg-time');
                if (timeSpan) {
                  timeSpan.insertAdjacentHTML(
                    'afterend',
                    '<i class="ph-fill ph-star cs-msg-fav-icon"></i>'
                  );
                }
              }
            }
          } else if (favIcon) {
            favIcon.remove();
          }
        }
        csCtxMenu.style.display = 'none';
      });

      const btnCopy = document.getElementById('cs-ctx-copy');
      if (btnCopy) {
        btnCopy.addEventListener('click', () => {
          navigator.clipboard.writeText(csContextMsgText).then(() => {
            if (window.showToast) window.showToast('Teks disalin ke clipboard', 'success');
          });
          csCtxMenu.style.display = 'none';
        });
      }

      const btnPin = document.getElementById('cs-ctx-pin');
      if (btnPin) {
        btnPin.addEventListener('click', () => {
          supabase
            .from('messages')
            .select('is_pinned')
            .eq('id', csContextMsgId)
            .single()
            .then(({ data }) => {
              if (data) {
                const newStatus = !data.is_pinned;

                if (newStatus) {
                  supabase
                    .from('messages')
                    .update({ is_pinned: false })
                    .eq('chat_id', selectedChatId)
                    .eq('is_pinned', true)
                    .then(() => {
                      supabase
                        .from('messages')
                        .update({ is_pinned: true })
                        .eq('id', csContextMsgId)
                        .then(() => {
                          if (window.showToast) window.showToast('Pesan disematkan', 'success');
                          updateCSPinnedHeader(csContextMsgText);
                        });
                    });
                } else {
                  supabase
                    .from('messages')
                    .update({ is_pinned: false })
                    .eq('id', csContextMsgId)
                    .then(() => {
                      if (window.showToast) window.showToast('Sematan dilepas', 'success');
                      updateCSPinnedHeader(null);
                    });
                }
              }
            });
          csCtxMenu.style.display = 'none';
        });
      }

      const btnEdit = document.getElementById('cs-ctx-edit');
      if (btnEdit) {
        btnEdit.addEventListener('click', () => {
          csEditingMsgId = csContextMsgId;
          chatInput.value = csContextMsgText;
          chatInput.focus();

          document.querySelectorAll('.cs-reply-preview').forEach((el) => el.remove());
          const preview = document.createElement('div');
          preview.className = 'cs-reply-preview';
          preview.innerHTML = `
            <div class="cs-msg-reply" style="margin:0 10px 5px; display:flex; justify-content:space-between; align-items:center;">
              <div><span style="font-weight:bold; color:var(--primary);">Mengedit pesan:</span> ${window.chatSanitize(csContextMsgText)}</div>
              <i class="ph ph-x" style="cursor:pointer;" onclick="this.parentElement.parentElement.remove(); csEditingMsgId = null; document.getElementById('cs-chat-input').value='';"></i>
            </div>`;
          const inputArea = document.getElementById('cs-input-area');
          inputArea.insertBefore(preview, inputArea.firstChild);

          csCtxMenu.style.display = 'none';
        });
      }

      const btnDelete = document.getElementById('cs-ctx-delete');
      if (btnDelete) {
        btnDelete.addEventListener('click', () => {
          if (csContextMsgId) window.deleteCSMessage(csContextMsgId);
          csCtxMenu.style.display = 'none';
        });
      }
      const reactions = csCtxMenu.querySelector('.cs-ctx-reactions');
      if (reactions) {
        reactions.addEventListener('click', (e) => {
          if (e.target.tagName === 'BUTTON' && csContextMsgId && selectedChatId) {
            const emoji = e.target.textContent;
            const bubble = document.querySelector(`.cs-msg-bubble[data-id="${csContextMsgId}"]`);
            const currentReaction = bubble ? bubble.querySelector('.cs-msg-reaction') : null;
            const myReactions = JSON.parse(localStorage.getItem('hd_cs_my_reactions') || '[]');

            if (currentReaction && currentReaction.textContent.includes(emoji)) {
              supabase
                .from('messages')
                .update({ reaction: null })
                .eq('id', csContextMsgId)
                .then(() => {
                  const index = myReactions.indexOf(csContextMsgId);
                  if (index > -1) myReactions.splice(index, 1);
                  localStorage.setItem('hd_cs_my_reactions', JSON.stringify(myReactions));
                });
            } else {
              supabase
                .from('messages')
                .update({ reaction: emoji })
                .eq('id', csContextMsgId)
                .then(() => {
                  if (!myReactions.includes(csContextMsgId)) myReactions.push(csContextMsgId);
                  localStorage.setItem('hd_cs_my_reactions', JSON.stringify(myReactions));
                });
            }
            csCtxMenu.style.display = 'none';
          }
        });
      }
    }

    // ── Context Menu (Archive) ──
    const archiveCtxMenu = document.getElementById('cs-archive-context-menu');
    function showArchiveContextMenu(e, id) {
      e.preventDefault();
      csArchiveContextMenuId = id;
      let x = e.clientX || (e.touches && e.touches[0].clientX);
      let y = e.clientY || (e.touches && e.touches[0].clientY);
      archiveCtxMenu.style.display = 'block';
      if (x + archiveCtxMenu.offsetWidth > window.innerWidth) x -= archiveCtxMenu.offsetWidth;
      if (y + archiveCtxMenu.offsetHeight > window.innerHeight) y -= archiveCtxMenu.offsetHeight;
      archiveCtxMenu.style.left = x + 'px';
      archiveCtxMenu.style.top = y + 'px';
    }

    chatList.addEventListener('contextmenu', (e) => {
      const item = e.target.closest('.cs-chat-item');
      if (item && currentTab === 'archive') {
        showArchiveContextMenu(e, item.dataset.chatId);
      }
    });

    chatList.addEventListener('touchstart', (e) => {
      const item = e.target.closest('.cs-chat-item');
      if (item && currentTab === 'archive') {
        csLongPressTimer = setTimeout(() => {
          showArchiveContextMenu(e, item.dataset.chatId);
        }, 500);
      }
    });
    chatList.addEventListener('touchend', () => clearTimeout(csLongPressTimer));
    chatList.addEventListener('touchmove', () => clearTimeout(csLongPressTimer));

    if (archiveCtxMenu) {
      document.getElementById('cs-archive-ctx-delete').addEventListener('click', () => {
        if (csArchiveContextMenuId) {
          window.showConfirmModal({
            title: 'Hapus Obrolan Permanen?',
            text: 'Tindakan ini tidak dapat dibatalkan. Semua riwayat percakapan dengan klien ini akan hilang selamanya.',
            icon: 'ph-trash',
            iconBg: '#fee2e2',
            iconColor: '#ef4444',
            confirmText: 'Hapus',
            confirmBg: '#ef4444',
            onConfirm: async (closeModal) => {
              const { error } = await supabase
                .from('chats')
                .delete()
                .eq('id', csArchiveContextMenuId);

              if (error) {
                closeModal();
                if (window.showToast)
                  window.showToast('Gagal menghapus chat: ' + error.message, 'error');
              } else {
                closeModal();
                if (window.showToast)
                  window.showToast('Chat berhasil dihapus secara permanen', 'success');
                // Optimistic delete
                if (archiveData[csArchiveContextMenuId]) delete archiveData[csArchiveContextMenuId];
                if (chatsData[csArchiveContextMenuId]) delete chatsData[csArchiveContextMenuId];
                renderChatList();

                if (selectedChatId === csArchiveContextMenuId) {
                  detail.style.display = 'none';
                  detailEmpty.style.display = 'flex';
                  selectedChatId = null;
                }
              }
            },
          });
        }
        archiveCtxMenu.style.display = 'none';
      });
    }

    document.addEventListener('click', (e) => {
      if (csCtxMenu && !csCtxMenu.contains(e.target)) {
        csCtxMenu.style.display = 'none';
      }
      if (archiveCtxMenu && !archiveCtxMenu.contains(e.target))
        archiveCtxMenu.style.display = 'none';
    });

    messagesEl.addEventListener('click', (e) => {
      // Delegate click for reaction removal
      const reactionBtn = e.target.closest('.cs-msg-reaction');
      if (reactionBtn) {
        const bubble = reactionBtn.closest('.cs-msg-bubble');
        if (bubble && bubble.dataset.id) {
          const msgId = bubble.dataset.id;
          const myReactions = JSON.parse(localStorage.getItem('hd_cs_my_reactions') || '[]');
          if (myReactions.includes(msgId)) {
            supabase
              .from('messages')
              .update({ reaction: null })
              .eq('id', msgId)
              .then(() => {
                myReactions.splice(myReactions.indexOf(msgId), 1);
                localStorage.setItem('hd_cs_my_reactions', JSON.stringify(myReactions));
              });
          } else {
            let emoji = reactionBtn.textContent.trim().split(' ')[0];
            if (reactionBtn.childNodes.length > 0) {
              emoji = reactionBtn.childNodes[0].nodeValue.trim();
            }
            supabase
              .from('messages')
              .update({ reaction: emoji })
              .eq('id', msgId)
              .then(() => {
                myReactions.push(msgId);
                localStorage.setItem('hd_cs_my_reactions', JSON.stringify(myReactions));
              });
          }
        }
      }
    });
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  const PUBLIC_VAPID_KEY =
    'BJgkti3bRXGoIaPq5bt3S346p0yhbw4GC8zAw7e8c7ulFpoa3huVb5PghF3jGWULnq0RpS2Hgs-jPTMXYJMyRus';

  // ── iOS Push Banner ─────────────────────────────────────────
  function showIOSPushBanner() {
    // Hapus banner lama jika ada
    const oldBanner = document.getElementById('ios-push-banner');
    if (oldBanner) oldBanner.remove();

    const banner = document.createElement('div');
    banner.id = 'ios-push-banner';
    banner.style.cssText =
      'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); z-index:9998; background:linear-gradient(135deg, #10b981, #059669); color:white; padding:14px 20px; border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,0.3); display:flex; align-items:center; gap:12px; max-width:360px; width:90%; animation:slideUp 0.4s ease;';
    banner.innerHTML = `
      <i class="ph-bold ph-bell-ringing" style="font-size:24px; flex-shrink:0;"></i>
      <div style="flex:1;">
        <div style="font-weight:600; font-size:14px;">Aktifkan Notifikasi</div>
        <div style="font-size:12px; opacity:0.85; margin-top:2px;">Agar tidak melewatkan pesan dari client</div>
      </div>
      <button id="ios-push-enable" style="background:white; color:#059669; border:none; padding:8px 14px; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer; white-space:nowrap;">Aktifkan</button>
      <button id="ios-push-dismiss" style="background:none; border:none; color:rgba(255,255,255,0.6); cursor:pointer; font-size:18px; padding:2px;"><i class="ph ph-x"></i></button>
    `;

    // Tambahkan animasi slideUp
    if (!document.getElementById('ios-push-style')) {
      const style = document.createElement('style');
      style.id = 'ios-push-style';
      style.textContent =
        '@keyframes slideUp { from { opacity:0; transform:translateX(-50%) translateY(20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }';
      document.head.appendChild(style);
    }

    document.body.appendChild(banner);

    // Klik Aktifkan → panggil subscribeToPush (ini user gesture, iOS akan izinkan)
    document.getElementById('ios-push-enable').addEventListener('click', async () => {
      banner.remove();
      await subscribeToPush();
    });

    // Klik dismiss
    document.getElementById('ios-push-dismiss').addEventListener('click', () => {
      banner.remove();
      localStorage.setItem('hd_ios_push_dismissed', '1');
    });
  }

  async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported on this device');
      if (window.showToast) window.showToast('Push tidak didukung di perangkat ini.', 'warning');
      return;
    }

    try {
      // Step 1: Register SW dan tunggu sampai BENAR-BENAR aktif
      await navigator.serviceWorker.register('/sw.js');
      const swReg = await navigator.serviceWorker.ready;
      console.log('[Push] SW ready, scope:', swReg.scope);

      // Step 2: Minta izin notifikasi (pada iOS, ini harus dari user gesture)
      const permission = await Notification.requestPermission();
      console.log('[Push] Permission result:', permission);
      if (permission !== 'granted') {
        if (window.showToast)
          window.showToast(
            'Izin notifikasi ditolak. Buka Pengaturan > Notifikasi untuk mengizinkan.',
            'warning'
          );
        return;
      }

      // Step 3: Hapus subscription lama (jika ada) agar buat baru yang fresh
      const oldSub = await swReg.pushManager.getSubscription();
      if (oldSub) {
        console.log('[Push] Unsubscribing old subscription...');
        await oldSub.unsubscribe();
      }

      // Step 4: Buat subscription BARU
      const subscription = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      });

      const subData = JSON.parse(JSON.stringify(subscription));
      console.log('[Push] New subscription endpoint:', subData.endpoint.slice(-30));

      // Step 5: Simpan ke DB (upsert berdasarkan endpoint agar multi-device OK)
      const { error: upsertError } = await supabase.from('push_subscriptions').upsert(
        {
          role: 'cs',
          chat_id: null,
          endpoint: subData.endpoint,
          auth: subData.keys.auth,
          p256dh: subData.keys.p256dh,
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

      if (upsertError) {
        console.error('[Push] DB save error:', upsertError);
        if (window.showToast)
          window.showToast('Gagal menyimpan subscription: ' + upsertError.message, 'error');
        return;
      }

      console.log('[Push] Subscription saved to DB successfully!');
      if (window.showToast) {
        window.showToast('Push Notifikasi aktif untuk perangkat ini.', 'success');
      }
    } catch (e) {
      console.error('[Push] Registration failed:', e);
      if (window.showToast) {
        window.showToast('Gagal mengaktifkan notifikasi: ' + e.message, 'error');
      }
    }
  }

  // ── Auth Handling ───────────────────────────────────────────────────
  window.scrollToMessage = function (id) {
    const el = document.querySelector(`.cs-msg-bubble[data-id="${id}"]`);
    if (el) {
      const container = document.getElementById('cs-messages');
      const row = el.closest('.cs-msg');
      if (row) {
        container.scrollTo({ top: row.offsetTop - container.offsetTop - 20, behavior: 'smooth' });
        const oldBg = row.style.backgroundColor;
        row.style.transition = 'background-color 0.5s';
        row.style.backgroundColor = 'color-mix(in srgb, var(--primary) 15%, transparent)';
        setTimeout(() => {
          row.style.backgroundColor = oldBg || '';
        }, 1500);
      }
    }
  };

  // ── Init ──────────────────────────────────────────────────────
  checkExistingSession();
})();
