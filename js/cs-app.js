// ═══════════════════════════════════════════════════════════════
// HimawariDigi — CS Dashboard Application
// Login (OTP → himawaridigi@gmail.com) + WhatsApp-like Dashboard
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  const db = window.firebaseDB;
  if (!db) {
    console.error('Firebase not initialized');
    return;
  }

  // ── State ─────────────────────────────────────────────────────
  let csName = localStorage.getItem('hd_cs_name') || '';
  let csSession = localStorage.getItem('hd_cs_session') || '';
  let selectedChatId = null;
  let chatsData = {};
  let activeAddedListener = null;
  let activeChangedListener = null;
  let activeTypingListener = null;
  let typingTimeout = null;
  let searchQuery = '';

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
  const notifDot = document.getElementById('cs-notif-dot');
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

  let currentOtpId = null;
  let resendCooldown = 0;
  let resendInterval = null;

  function checkExistingSession() {
    if (csSession && csName) {
      // Verify session in Firebase
      db.ref('cs-sessions/' + csSession)
        .once('value')
        .then((snap) => {
          const data = snap.val();
          if (data && data.active) {
            showDashboard();
          } else {
            clearSession();
            showLogin();
          }
        })
        .catch(() => {
          showLogin();
        });
    } else {
      showLogin();
    }
  }

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
    localStorage.removeItem('hd_cs_session');
    csName = '';
    csSession = '';
  }

  function showStatus(msg, type) {
    loginStatus.textContent = msg;
    loginStatus.className = 'cs-login-status ' + type;
  }

  // Generate 6-digit OTP
  function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
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

  // Send OTP via EmailJS
  async function sendOTP(name) {
    const otp = generateOTP();
    const location = await getLocation();
    const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    try {
      // Store OTP in Firebase with 5-minute expiry, add 10s timeout
      const otpRef = db.ref('cs-otp').push();
      currentOtpId = otpRef.key;
      
      const setPromise = otpRef.set({
        code: otp,
        csName: name,
        device: deviceInfo.full,
        location: location,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        expiresAt: Date.now() + 5 * 60 * 1000,
        used: false,
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firebase timeout')), 10000)
      );

      await Promise.race([setPromise, timeoutPromise]);
    } catch (e) {
      console.error('Firebase DB error:', e);
      return false;
    }

    // Send email via EmailJS
    if (typeof emailjs !== 'undefined' && window.EMAILJS_CONFIG.serviceId !== 'EMAILJS_SERVICE_ID') {
      try {
        await emailjs.send(window.EMAILJS_CONFIG.serviceId, window.EMAILJS_CONFIG.templateId, {
          to_email: window.EMAILJS_CONFIG.recipientEmail,
          otp_code: otp,
          cs_name: name,
          device_info: deviceInfo.full,
          location_info: location,
          login_time: now,
          message: `Kode verifikasi CS Login: ${otp}\n\nNama CS: ${name}\nPerangkat: ${deviceInfo.full}\nLokasi: ${location}\nWaktu: ${now}`,
        });
        return true;
      } catch (e) {
        console.error('EmailJS error:', e);
        // Fallback: show OTP in console for testing
        console.warn('⚠️ EmailJS not configured. OTP Code:', otp);
        showStatus(
          'EmailJS belum dikonfigurasi. Cek console untuk kode OTP (development mode).',
          'info'
        );
        return true;
      }
    } else {
      // EmailJS not configured — development mode
      console.warn('⚠️ Development mode — OTP Code:', otp);
      showStatus(
        'EmailJS belum dikonfigurasi. Cek browser console untuk kode OTP (development mode).',
        'info'
      );
      return true;
    }
  }

  // Verify OTP
  async function verifyOTP(inputCode) {
    if (!currentOtpId) return false;

    const snap = await db.ref('cs-otp/' + currentOtpId).once('value');
    const data = snap.val();

    if (!data) return false;
    if (data.used) return false;
    if (Date.now() > data.expiresAt) return false;
    if (data.code !== inputCode) return false;

    // Mark as used
    await db.ref('cs-otp/' + currentOtpId).update({ used: true });
    return true;
  }

  // Create session
  async function createSession(name) {
    const sessionId =
      'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    await db.ref('cs-sessions/' + sessionId).set({
      csName: name,
      device: deviceInfo.full,
      loginAt: firebase.database.ServerValue.TIMESTAMP,
      active: true,
    });

    csName = name;
    csSession = sessionId;
    localStorage.setItem('hd_cs_name', name);
    localStorage.setItem('hd_cs_session', sessionId);
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
    } else {
      showStatus('Gagal mengirim kode. Coba lagi.', 'error');
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
    const code = otpInput.value.trim();
    if (code.length !== 6) return;

    otpVerifyBtn.disabled = true;
    otpVerifyBtn.innerHTML = '<span class="cs-spinner"></span>';

    const valid = await verifyOTP(code);

    if (valid) {
      showStatus('Verifikasi berhasil! Memuat dashboard...', 'success');
      await createSession(loginNameInput.value.trim());
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
    bindDashboardEvents();
  }

  // ── Listen for Active Chats ───────────────────────────────────
  function listenForChats() {
    if (chatsListener) {
      db.ref('chats').off('value', chatsListener);
    }

    chatsListener = db
      .ref('chats')
      .orderByChild('info/status')
      .equalTo('active')
      .on('value', (snap) => {
        const data = snap.val() || {};
        const prevData = chatsData || {};
        const prevChatIds = Object.keys(prevData);
        chatsData = data;

        // Check for new chats or new messages (notification)
        if (prevChatIds.length > 0) {
          Object.keys(data).forEach((id) => {
            const chat = data[id];
            const prevChat = prevData[id];
            
            if (!prevChat) {
              // New chat
              notifyNewMessage('Chat baru dari ' + (chat.info?.clientName || 'Client'), 'Ada chat baru yang membutuhkan respons.');
            } else if (chat.info?.lastMessageAt > (prevChat.info?.lastMessageAt || 0)) {
              // Existing chat, new message
              const lastMsg = getLastMessage(chat.messages);
              if (lastMsg && lastMsg.sender === 'client') {
                if (id !== selectedChatId || document.hidden) {
                  // Not focused or different chat, notify
                  notifyNewMessage('Pesan dari ' + (chat.info?.clientName || 'Client'), lastMsg.text);
                } else {
                  // Focused, just play sound
                  window.playNotifSound();
                }
              }
            }
          });
        }

        renderChatList();

        // Update selected chat status
        if (selectedChatId) {
          if (!data[selectedChatId]) {
            detailStatus.textContent = 'Closed';
            detailStatus.className = 'cs-detail-status closed';
          } else {
            const isOnline = data[selectedChatId].info?.isOnline;
            detailStatus.textContent = isOnline ? 'Active' : 'Inactive';
            detailStatus.className = 'cs-detail-status ' + (isOnline ? 'active' : 'inactive');
          }
        }
      });
  }

  // ── Render Chat List ──────────────────────────────────────────
  function renderChatList() {
    const items = Object.entries(chatsData)
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

    chatCount.textContent = items.length;

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
              ${item.unread > 0 
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

    // Update total unread in topbar
    const totalUnread = items.reduce((sum, item) => sum + item.unread, 0);
    notifDot.style.display = totalUnread > 0 ? 'block' : 'none';
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
      if (activeAddedListener) db.ref('chats/' + selectedChatId + '/messages').off('child_added', activeAddedListener);
      if (activeChangedListener) db.ref('chats/' + selectedChatId + '/messages').off('child_changed', activeChangedListener);
      if (activeTypingListener) db.ref('client-typing/' + selectedChatId).off('value', activeTypingListener);
      activeAddedListener = null;
      activeChangedListener = null;
      activeTypingListener = null;
    }
  }

  // ── Select Chat ───────────────────────────────────────────────
  function selectChat(chatId) {
    detachCurrentChatListeners();
    selectedChatId = chatId;
    const chat = chatsData[chatId];
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

    // Listen for messages
    activeAddedListener = db
      .ref('chats/' + chatId + '/messages')
      .orderByChild('timestamp')
      .on('child_added', (snap) => {
        const msg = snap.val();
        const msgId = snap.key;
        if (renderedIds.has(msgId)) return;
        renderedIds.add(msgId);

        renderCSMessage(msg, msgId);
        scrollCSMessages();

        // Mark client messages as read
        if (msg.sender === 'client' && !msg.read) {
          db.ref('chats/' + chatId + '/messages/' + msgId).update({ read: true });
        }
      });

    // Listen for read receipts
    activeChangedListener = db.ref('chats/' + chatId + '/messages').on('child_changed', (snap) => {
      const msg = snap.val();
      const msgId = snap.key;
      if (msg.sender === 'cs' && msg.read) {
        const statusEl = document.getElementById('cs-msg-status-' + msgId);
        if (statusEl) {
          statusEl.className = 'cs-msg-status read';
          statusEl.innerHTML = '<i class="ph-bold ph-checks"></i>';
        }
      }
    });

    // Listen for client typing
    activeTypingListener = db.ref('client-typing/' + chatId).on('value', (snap) => {
      const data = snap.val();
      if (data && data.isTyping && Date.now() - (data.timestamp || 0) < 5000) {
        clientTypingEl.classList.add('show');
        scrollCSMessages();
      } else {
        clientTypingEl.classList.remove('show');
      }
    });

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

      div.innerHTML = `
        ${isClient ? `<div class="cs-msg-avatar">${window.chatSanitize(initials)}</div>` : ''}
        <div class="cs-msg-bubble">
          <p>${window.chatSanitize(msg.text)}</p>
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
  function sendCSMessage() {
    const text = chatInput.value.trim();
    if (!text || !selectedChatId) return;

    db.ref('chats/' + selectedChatId + '/messages').push({
      sender: 'cs',
      senderName: csName,
      text: text,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      read: true,
    });

    db.ref('chats/' + selectedChatId + '/info').update({
      lastMessageAt: firebase.database.ServerValue.TIMESTAMP,
      assignedCS: csName,
    });

    chatInput.value = '';
    sendBtn.disabled = true;
    clearCSTyping();
  }

  // ── CS Typing Indicator ───────────────────────────────────────
  function sendCSTyping() {
    if (!selectedChatId) return;
    db.ref('cs-typing/' + selectedChatId).set({
      isTyping: true,
      csName: csName,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => clearCSTyping(), 3000);
  }

  function clearCSTyping() {
    if (!selectedChatId) return;
    db.ref('cs-typing/' + selectedChatId).set({
      isTyping: false,
      csName: csName,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    });
  }

  // ── Close Chat ────────────────────────────────────────────────
  function closeActiveChat() {
    if (!selectedChatId) return;
    if (!confirm('Tutup chat ini? Client tidak bisa mengirim pesan lagi.')) return;

    db.ref('chats/' + selectedChatId + '/info').update({
      status: 'closed',
    });

    // Detach listener
    detachCurrentChatListeners();

    db.ref('cs-typing/' + selectedChatId).remove();

    selectedChatId = null;
    chatView.style.display = 'none';
    detailEmpty.style.display = 'flex';

    // Mobile: back to sidebar
    detail.classList.remove('show-mobile');
    sidebar.classList.remove('hidden-mobile');
  }

  // ── Notifications ─────────────────────────────────────────────
  function notifyNewMessage(title, text) {
    window.playNotifSound();

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: text,
        icon: '/assets/logo/favicon.png',
      });
    }
  }

  // ── Logout ────────────────────────────────────────────────────
  function logout() {
    if (!confirm('Logout dari CS Dashboard?')) return;

    // Deactivate session
    if (csSession) {
      db.ref('cs-sessions/' + csSession).update({ active: false });
    }

    // Clear typing
    if (selectedChatId) {
      db.ref('cs-typing/' + selectedChatId).remove();
    }

    // Detach all listeners
    if (chatsListener) {
      db.ref('chats').off('value', chatsListener);
    }
    detachCurrentChatListeners();

    clearSession();
    selectedChatId = null;
    chatsData = {};

    showLogin();

    // Reset login form
    loginForm.style.display = 'block';
    otpSection.classList.remove('show');
    loginSubmit.disabled = false;
    loginSubmit.innerHTML = '<i class="ph-bold ph-sign-in"></i> Kirim Kode Verifikasi';
    loginNameInput.value = '';
    loginStatus.className = 'cs-login-status';
  }

  // ── Bind Dashboard Events ─────────────────────────────────────
  function bindDashboardEvents() {
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
  }

  // ── Init ──────────────────────────────────────────────────────
  checkExistingSession();
})();
