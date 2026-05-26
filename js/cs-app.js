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
  let chatsData = {};
  let activeMessagesListener = null;
  let activeTypingListener = null;
  let typingTimeout = null;
  let searchQuery = '';
  let currentTab = 'active';
  let archiveData = {};
  let archiveListener = null;
  let csReplyToData = null;
  let csContextMsgId = null;
  let csContextMsgText = null;
  let csLongPressTimer = null;
  let csArchiveContextMenuId = null;

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
  window.showConfirmModal = function({ title, text, icon = 'ph-warning', iconBg = '#fee2e2', iconColor = '#ef4444', confirmText = 'Ya', confirmBg = '#ef4444', onConfirm }) {
    const modalOverlay = document.createElement('div');
    modalOverlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999; opacity:0; transition:opacity 0.2s ease;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background:var(--background, #fff); border-radius:12px; padding:24px; width:90%; max-width:400px; box-shadow:0 10px 25px rgba(0,0,0,0.2); transform:scale(0.95); transition:transform 0.2s ease; text-align:center;';

    modalBox.innerHTML = `
      <div style="width:48px; height:48px; border-radius:50%; background:${iconBg}; color:${iconColor}; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:24px;">
        <i class="ph-bold ${icon}"></i>
      </div>
      <h3 style="margin:0 0 8px; color:var(--foreground); font-size:1.1rem; font-weight:600;">${title}</h3>
      <p style="margin:0 0 24px; color:var(--text-muted); font-size:0.9rem;">${text}</p>
      <div style="display:flex; gap:12px; justify-content:center;">
        <button id="hd-modal-btn-no" style="flex:1; padding:10px; border-radius:8px; border:1px solid var(--border); background:transparent; color:var(--foreground); font-weight:500; cursor:pointer; transition:background 0.2s;">Batal</button>
        <button id="hd-modal-btn-yes" style="flex:1; padding:10px; border-radius:8px; border:none; background:${confirmBg}; color:white; font-weight:500; cursor:pointer; transition:opacity 0.2s;">${confirmText}</button>
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
    };

    document.getElementById('hd-modal-btn-no').onclick = closeModal;
    document.getElementById('hd-modal-btn-yes').onclick = async () => {
      const btnYes = document.getElementById('hd-modal-btn-yes');
      btnYes.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Proses...';
      btnYes.disabled = true;
      if (onConfirm) await onConfirm(closeModal);
      else closeModal();
    };
  };

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

  let currentEmail = window.EMAILJS_CONFIG?.recipientEmail || 'himawaridigi@gmail.com';
  let resendCooldown = 0;
  let resendInterval = null;

  async function checkExistingSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session && csName) {
      showDashboard();
    } else {
      clearSession();
      showLogin();
    }
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      clearSession();
      showLogin();
    } else if (event === 'SIGNED_IN' && csName) {
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
      showStatus('Verifikasi berhasil! Memuat dashboard...', 'success');
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
  }

  // ── Listen for Active Chats ───────────────────────────────────
  async function listenForChats() {
    const { data: chats } = await supabase.from('chats').select('*').eq('status', 'active');
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
    const renderedIds = new Set();

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: true });
    if (msgs) {
      msgs.forEach((m) => {
        const msg = {
          ...m,
          timestamp: m.timestamp ? new Date(m.timestamp).getTime() : 0,
          replyTo: m.replyTo_id ? { id: m.replyTo_id, text: m.replyTo_text } : null,
        };
        if (chatSource[chatId]) {
          chatSource[chatId].messages[m.id] = msg;
        }
        renderedIds.add(m.id);
        renderCSMessage(msg, m.id);

        if (msg.sender === 'client' && !msg.read) {
          supabase.from('messages').update({ read: true }).eq('id', m.id).then();
          if (chatSource[chatId]) {
            chatSource[chatId].messages[m.id].read = true;
          }
        }
      });
      renderChatList();
      scrollCSMessages();
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
            if (!renderedIds.has(m.id)) {
              renderedIds.add(m.id);
              renderCSMessage(msg, m.id);
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
            if (bubble) {
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
                reactionContainer.innerHTML = `<span class="cs-msg-reaction">${msg.reaction}</span>`;
              } else if (reactionContainer) {
                reactionContainer.remove();
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

    // Re-render list to update active state
    renderChatList();
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
        const urlLower = msg.imageUrl.toLowerCase();
        const isImg = urlLower.match(/\.(jpeg|jpg|gif|png|webp|svg)$/) || !urlLower.includes('.');
        if (isImg) {
          imageHtml = `
            <div class="cs-msg-image-bubble" onclick="window.openCSLightbox('${msg.imageUrl}')">
              <img class="cs-msg-image" src="${msg.imageUrl}" alt="Image" loading="lazy" />
              ${msg.text ? `<div class="cs-msg-image-caption">${window.chatSanitize(msg.text)}</div>` : ''}
            </div>
          `;
        } else {
          const fileName = msg.imageUrl.split('/').pop().split('?')[0];
          const ext = fileName.split('.').pop().toUpperCase();
          imageHtml = `
            <div class="cs-msg-file-bubble" style="background:var(--bg-tertiary); padding:10px; border-radius:8px; display:flex; align-items:center; gap:12px; border:1px solid var(--border-color); margin-bottom: 5px;">
              <div style="width:40px; height:40px; background:var(--primary); color:white; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px;">
                ${ext}
              </div>
              <div style="flex:1; overflow:hidden;">
                <div style="font-size:13px; font-weight:500; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${fileName}">
                  ${fileName.length > 20 ? fileName.substring(0, 15) + '...' + fileName.slice(-5) : fileName}
                </div>
                <a href="${msg.imageUrl}" target="_blank" download style="font-size:12px; color:var(--primary); text-decoration:none; display:inline-flex; align-items:center; gap:4px; margin-top:4px;">
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
            <div class="cs-msg-reply" onclick="window.scrollToMessage('${msg.replyTo.id}')" style="cursor: pointer;" title="Klik untuk melompat ke pesan ini">
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
            <button class="cs-msg-reaction">${msg.reaction} <span class="cs-reaction-count">1</span></button>
          </div>
        `;
      }

      div.innerHTML = `
        ${isClient ? `<div class="cs-msg-avatar">${window.chatSanitize(initials)}</div>` : ''}
        <div class="cs-msg-bubble" data-id="${msgId}" data-text="${window.chatSanitize(msg.text || '[Image]')}">
          ${senderNameHtml}
          ${replyHtml}
          ${imageHtml}
          ${textHtml}
          ${reactionsHtml}
          <div class="cs-msg-time-container">
            <span class="cs-msg-time">${msg.timestamp ? window.chatFormatTime(msg.timestamp) : ''}</span>
            ${statusHtml}
          </div>
        </div>
      `;
    }

    messagesEl.appendChild(div);
  }

  function scrollCSMessages() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  // ── Send Message as CS ────────────────────────────────────────
  async function sendCSMessage() {
    const text = chatInput.value.trim();
    if (!text || !selectedChatId) return;

    await supabase.from('messages').insert({
      chat_id: selectedChatId,
      sender: 'cs',
      senderName: csName,
      text: text,
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

    chatInput.value = '';
    sendBtn.disabled = true;
    clearCSTyping();
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
      }
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
        if (chatsListener) {
          supabase.removeChannel(chatsListener);
          chatsListener = null;
        }
        if (archiveListener) {
          supabase.removeChannel(archiveListener);
          archiveListener = null;
        }
        detachCurrentChatListeners();

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
      }
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

  function getChatExportData() {
    const data = currentTab === 'archive' ? archiveData : chatsData;
    const chat = data[selectedChatId];
    if (!chat) return null;
    const messages = chat.messages
      ? Object.values(chat.messages).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      : [];
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
        text: (m.text || ''),
        imageUrl: m.imageUrl || null,
        reaction: m.reaction || null
      })),
    };
  }

  async function exportChat(format) {
    const data = getChatExportData();
    if (!data) return;
    const filename =
      'chat_' + data.clientName.replace(/\s+/g, '_') + '_' + new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      let csv = 'Waktu,Tipe,Pengirim,Pesan\n';
      data.messages.forEach((m) => {
        let msgText = m.text || '';
        if (m.imageUrl) msgText += (msgText ? `\n[Image] ${m.imageUrl}` : `[Image] ${m.imageUrl}`);
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
          if (m.imageUrl) msgText += (msgText ? `\n[Image] ${m.imageUrl}` : `[Image] ${m.imageUrl}`);
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
        const rxMap = { '👍': '[Jempol]', '❤️': '[Hati]', '😂': '[Tertawa]', '😮': '[Terkejut]', '😢': '[Sedih]', '🙏': '[Terima Kasih]' };
        for (const [e, txt] of Object.entries(rxMap)) {
          str = str.replace(new RegExp(e, 'g'), txt);
        }
        // Strip remaining emojis
        return str.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
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
  window.openCSLightbox = function (url) {
    const lb = document.getElementById('cs-lightbox');
    const img = document.getElementById('cs-lightbox-img');
    const dl = document.getElementById('cs-lightbox-download');
    if (lb && img) {
      img.src = url;
      img.classList.remove('zoomed');
      if (dl) {
        dl.href = url;
        dl.download = 'image_' + Date.now() + '.jpg';
      }
      lb.style.display = 'flex';
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
        if (file.size > 5 * 1024 * 1024) {
          if (window.showToast) window.showToast('Ukuran gambar maksimal 5MB', 'error');
          csImageUpload.value = '';
          return;
        }
        try {
          sendBtn.disabled = true;
          chatInput.disabled = true;
          if (csAttachLabel) csAttachLabel.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';

          const finalFile = window.compressImageFile ? await window.compressImageFile(file) : file;
          const filePath = selectedChatId + '/' + Date.now() + '_' + finalFile.name;
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

          if (window.showToast) window.showToast('Gambar berhasil dikirim', 'success');
        } catch (err) {
          console.error(err);
          if (window.showToast) window.showToast('Gagal upload gambar', 'error');
        }

        sendBtn.disabled = !chatInput.value.trim();
        chatInput.disabled = false;
        if (csAttachLabel) csAttachLabel.innerHTML = '<i class="ph ph-paperclip"></i>';
        csImageUpload.value = '';
      });
    }

    // ── Lightbox Zoom & Pan ──
    const lightbox = document.getElementById('cs-lightbox');
    const lightboxClose = document.getElementById('cs-lightbox-close');
    const lightboxOverlay = document.querySelector('.cs-lightbox-overlay');
    const lightboxImg = document.getElementById('cs-lightbox-img');
    const zoomInBtn = document.getElementById('cs-lightbox-zoom-in');
    const zoomOutBtn = document.getElementById('cs-lightbox-zoom-out');
    const resetBtn = document.getElementById('cs-lightbox-reset');
    
    let scale = 1, panning = false, pointX = 0, pointY = 0, startX = 0, startY = 0;
    const setTransform = () => {
      lightboxImg.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
    };
    
    const resetLightbox = () => {
      scale = 1; pointX = 0; pointY = 0; setTransform();
    };

    if (lightboxImg) {
      lightboxImg.onmousedown = (e) => {
        e.preventDefault();
        startX = e.clientX - pointX;
        startY = e.clientY - pointY;
        panning = true;
      };
      document.onmouseup = () => { panning = false; };
      document.onmousemove = (e) => {
        if (!panning || scale <= 1) return;
        pointX = e.clientX - startX;
        pointY = e.clientY - startY;
        setTransform();
      };
      lightboxImg.onwheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        scale = Math.max(0.5, Math.min(scale + delta, 5));
        setTransform();
      };
    }
    
    if (zoomInBtn) zoomInBtn.onclick = () => { scale = Math.min(scale + 0.2, 5); setTransform(); };
    if (zoomOutBtn) zoomOutBtn.onclick = () => { scale = Math.max(scale - 0.2, 0.5); setTransform(); };
    if (resetBtn) resetBtn.onclick = resetLightbox;

    const closeLightbox = () => {
      lightbox.style.display = 'none';
      resetLightbox();
    };

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxOverlay) lightboxOverlay.addEventListener('click', closeLightbox);

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
    function showCSContextMenu(e, msgId, msgText) {
      e.preventDefault();
      csContextMsgId = msgId;
      csContextMsgText = msgText;
      let x = e.clientX || (e.touches && e.touches[0].clientX);
      let y = e.clientY || (e.touches && e.touches[0].clientY);
      csCtxMenu.style.display = 'block';
      if (x + csCtxMenu.offsetWidth > window.innerWidth) x -= csCtxMenu.offsetWidth;
      if (y + csCtxMenu.offsetHeight > window.innerHeight) y -= csCtxMenu.offsetHeight;
      csCtxMenu.style.left = x + 'px';
      csCtxMenu.style.top = y + 'px';
    }

    messagesEl.addEventListener('contextmenu', (e) => {
      const bubble = e.target.closest('.cs-msg-bubble');
      if (bubble && bubble.dataset.id) {
        showCSContextMenu(e, bubble.dataset.id, bubble.dataset.text);
      }
    });

    messagesEl.addEventListener('touchstart', (e) => {
      const bubble = e.target.closest('.cs-msg-bubble');
      if (bubble && bubble.dataset.id) {
        csLongPressTimer = setTimeout(() => {
          showCSContextMenu(e, bubble.dataset.id, bubble.dataset.text);
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
        preview.innerHTML = `<div class="cs-msg-reply" style="margin:0 10px 5px">Replying to: ${window.chatSanitize(csContextMsgText)}</div>`;
        const inputArea = document.getElementById('cs-input-area');
        inputArea.insertBefore(preview, inputArea.firstChild);
        chatInput.focus();
        csCtxMenu.style.display = 'none';
      });
      document.getElementById('cs-ctx-fav').addEventListener('click', () => {
        const favs = JSON.parse(localStorage.getItem('hd_cs_fav_msgs') || '[]');
        if (!favs.includes(csContextMsgId)) favs.push(csContextMsgId);
        localStorage.setItem('hd_cs_fav_msgs', JSON.stringify(favs));
        if (window.showToast) window.showToast('Pesan ditambahkan ke favorit', 'success');
        csCtxMenu.style.display = 'none';
      });
      const reactions = csCtxMenu.querySelector('.cs-ctx-reactions');
      if (reactions) {
        reactions.addEventListener('click', (e) => {
          if (e.target.tagName === 'BUTTON' && csContextMsgId && selectedChatId) {
            const emoji = e.target.textContent;
            const bubble = document.querySelector(`.cs-msg-bubble[data-id="${csContextMsgId}"]`);
            const currentReaction = bubble ? bubble.querySelector('.cs-msg-reaction') : null;

            if (currentReaction && currentReaction.textContent === emoji) {
              supabase.from('messages').update({ reaction: null }).eq('id', csContextMsgId).then();
            } else {
              supabase.from('messages').update({ reaction: emoji }).eq('id', csContextMsgId).then();
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
            }
          });
        }
        archiveCtxMenu.style.display = 'none';
      });
    }

    document.addEventListener('click', (e) => {
      if (csCtxMenu && !csCtxMenu.contains(e.target)) csCtxMenu.style.display = 'none';
      if (archiveCtxMenu && !archiveCtxMenu.contains(e.target))
        archiveCtxMenu.style.display = 'none';
    });
  }

  // ── Helpers ───────────────────────────────────────────────────
  window.scrollToMessage = function (id) {
    const el = document.querySelector(`.cs-msg-bubble[data-id="${id}"]`);
    if (el) {
      const container = document.getElementById('cs-messages');
      container.scrollTo({ top: el.offsetTop - container.offsetTop - 20, behavior: 'smooth' });
      const oldBg = el.style.backgroundColor;
      el.style.transition = 'background-color 0.3s';
      el.style.backgroundColor = 'rgba(0, 122, 255, 0.2)';
      setTimeout(() => {
        el.style.backgroundColor = oldBg || '';
      }, 1500);
    }
  };

  // ── Init ──────────────────────────────────────────────────────
  checkExistingSession();
})();
