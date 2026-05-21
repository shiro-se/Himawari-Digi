// ═══════════════════════════════════════════════════════════════
// HimawariDigi — Client Chat Widget
// Real-time customer service chat via Firebase Realtime DB
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── DOM References ────────────────────────────────────────────
  const widget = document.getElementById('chat-widget');
  const win = document.getElementById('chat-window');
  const toggleBtn = document.getElementById('chat-toggle');
  const minimizeBtn = document.getElementById('chat-minimize');
  const iconOpen = document.getElementById('chat-icon-open');
  const iconClose = document.getElementById('chat-icon-close');
  const unreadBadge = document.getElementById('chat-unread-badge');

  const prechat = document.getElementById('chat-prechat');
  const prechatForm = document.getElementById('chat-prechat-form');
  const challengeGroup = document.getElementById('chat-challenge-group');
  const challengeLabel = document.getElementById('chat-challenge-label');
  const challengeInput = document.getElementById('chat-challenge-input');

  const messagesEl = document.getElementById('chat-messages');
  const typingEl = document.getElementById('chat-typing');
  const inputArea = document.getElementById('chat-input-area');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');

  if (!widget || !win || !toggleBtn) return;

  // ── State ─────────────────────────────────────────────────────
  let isOpen = false;
  let chatId = localStorage.getItem('hd_chat_id') || null;
  let clientName = localStorage.getItem('hd_client_name') || '';
  let clientEmail = localStorage.getItem('hd_client_email') || '';
  let unreadCount = 0;
  let challengeAnswer = 0;
  let formOpenedAt = 0;
  let messagesListener = null;
  let typingListener = null;
  let typingTimeout = null;
  let renderedMessageIds = new Set();
  let isFirstLoad = true;

  const deviceId = window.getDeviceId();
  const db = window.firebaseDB;

  // ── Rate Limiting ─────────────────────────────────────────────
  const RATE_LIMIT = {
    maxChatsPerHour: 3,
    maxMessagesPerMinute: 15,
    minFormDuration: 3000, // 3 seconds minimum to fill form (anti-bot)
  };

  function checkChatRateLimit() {
    const key = 'hd_chat_timestamps';
    const timestamps = JSON.parse(localStorage.getItem(key) || '[]');
    const oneHourAgo = Date.now() - 3600000;
    const recent = timestamps.filter((t) => t > oneHourAgo);
    localStorage.setItem(key, JSON.stringify(recent));
    return recent.length < RATE_LIMIT.maxChatsPerHour;
  }

  function recordChatCreation() {
    const key = 'hd_chat_timestamps';
    const timestamps = JSON.parse(localStorage.getItem(key) || '[]');
    timestamps.push(Date.now());
    localStorage.setItem(key, JSON.stringify(timestamps));
  }

  function checkMessageRateLimit() {
    const key = 'hd_msg_timestamps';
    const timestamps = JSON.parse(localStorage.getItem(key) || '[]');
    const oneMinAgo = Date.now() - 60000;
    const recent = timestamps.filter((t) => t > oneMinAgo);
    localStorage.setItem(key, JSON.stringify(recent));
    return recent.length < RATE_LIMIT.maxMessagesPerMinute;
  }

  function recordMessage() {
    const key = 'hd_msg_timestamps';
    const timestamps = JSON.parse(localStorage.getItem(key) || '[]');
    timestamps.push(Date.now());
    localStorage.setItem(key, JSON.stringify(timestamps));
  }

  // ── Challenge Generation ──────────────────────────────────────
  function generateChallenge() {
    const a = Math.floor(Math.random() * 15) + 1;
    const b = Math.floor(Math.random() * 15) + 1;
    challengeAnswer = a + b;

    const lang = localStorage.getItem('lang') || 'id';
    const template =
      lang === 'en'
        ? 'Security check: What is {a} + {b}?'
        : 'Keamanan: Berapa {a} + {b}?';
    challengeLabel.textContent = template
      .replace('{a}', a)
      .replace('{b}', b);
  }

  // ── Toggle Chat Window ────────────────────────────────────────
  function openChat() {
    isOpen = true;
    win.classList.remove('chat-window--hidden');
    win.classList.add('chat-window--visible');
    win.setAttribute('aria-hidden', 'false');
    iconOpen.style.display = 'none';
    iconClose.style.display = 'block';
    toggleBtn.classList.add('is-active');

    // Clear unread
    unreadCount = 0;
    unreadBadge.style.display = 'none';

    // If we have an active chat, resume it
    if (chatId) {
      showChatView();
      attachListeners();
    } else {
      showPrechatView();
    }

    // Auto-scroll
    scrollToBottom();
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('chat-window--visible');
    win.classList.add('chat-window--hidden');
    win.setAttribute('aria-hidden', 'true');
    iconOpen.style.display = 'block';
    iconClose.style.display = 'none';
    toggleBtn.classList.remove('is-active');
  }

  function showPrechatView() {
    prechat.style.display = 'block';
    messagesEl.style.display = 'none';
    typingEl.style.display = 'none';
    inputArea.style.display = 'none';

    // Start from blank answer
    challengeInput.value = '';

    generateChallenge();
    formOpenedAt = Date.now();
  }

  function showChatView() {
    prechat.style.display = 'none';
    messagesEl.style.display = 'flex';
    inputArea.style.display = 'block';
    chatInput.focus();
  }

  // ── Toggle Button Events ──────────────────────────────────────
  toggleBtn.addEventListener('click', () => {
    isOpen ? closeChat() : openChat();
  });

  minimizeBtn.addEventListener('click', () => {
    closeChat();
  });

  // ── Pre-chat Form Submit ──────────────────────────────────────
  prechatForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Anti-bot: honeypot check
    const honeypot = prechatForm.querySelector('.chat-hp');
    if (honeypot && honeypot.value) {
      console.warn('Bot detected via honeypot');
      return;
    }

    // Anti-bot: time check
    if (Date.now() - formOpenedAt < RATE_LIMIT.minFormDuration) {
      alert('Mohon tunggu sebentar sebelum mengirim.');
      return;
    }

    // Anti-bot: challenge check
    if (parseInt(challengeInput.value) !== challengeAnswer) {
      challengeInput.classList.add('shake');
      setTimeout(() => challengeInput.classList.remove('shake'), 500);
      challengeInput.value = '';
      challengeInput.focus();
      generateChallenge();
      return;
    }

    // Rate limit check
    if (!checkChatRateLimit()) {
      alert('Terlalu banyak chat. Silakan coba lagi nanti.');
      return;
    }

    if (!clientName) {
      clientName = 'Guest_' + Math.random().toString(36).substring(2, 6).toUpperCase();
      localStorage.setItem('hd_client_name', clientName);
    }
    clientEmail = ''; // Not collected anymore

    createChat();
  });

  // ── Create New Chat in Firebase ───────────────────────────────
  function createChat() {
    chatId = 'chat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    localStorage.setItem('hd_chat_id', chatId);
    recordChatCreation();

    const chatRef = db.ref('chats/' + chatId);
    chatRef.set({
      info: {
        clientName: clientName,
        clientEmail: clientEmail,
        status: 'active',
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        lastMessageAt: firebase.database.ServerValue.TIMESTAMP,
        deviceId: deviceId,
      },
    });

    // Add greeting message from system
    const lang = localStorage.getItem('lang') || 'id';
    const greetingTemplate =
      lang === 'en'
        ? 'Hi {name}! 👋 How can we help you today?'
        : 'Halo {name}! 👋 Ada yang bisa kami bantu hari ini?';
    const greetingText = greetingTemplate.replace('{name}', clientName);

    chatRef.child('messages').push({
      sender: 'system',
      senderName: 'HimawariDigi',
      text: greetingText,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      read: true,
    });

    renderedMessageIds.clear();
    messagesEl.innerHTML = '';
    isFirstLoad = true;

    showChatView();
    attachListeners();
  }

  // ── Attach Firebase Listeners ─────────────────────────────────
  function attachListeners() {
    if (!chatId || !db) return;

    detachListeners();

    // Listen for new messages
    const msgRef = db.ref('chats/' + chatId + '/messages').orderByChild('timestamp');
    messagesListener = msgRef.on('child_added', (snap) => {
      const msg = snap.val();
      const msgId = snap.key;

      if (renderedMessageIds.has(msgId)) return;
      renderedMessageIds.add(msgId);

      renderMessage(msg);
      scrollToBottom();

      // Notification for CS messages when window is closed
      if (!isFirstLoad && msg.sender === 'cs' && !isOpen) {
        unreadCount++;
        unreadBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        unreadBadge.style.display = 'flex';
        window.playNotifSound();
      }

      // Mark first load complete after a brief delay
      if (isFirstLoad) {
        setTimeout(() => {
          isFirstLoad = false;
        }, 500);
      }
    });

    // Listen for CS typing indicator
    const typingRef = db.ref('cs-typing/' + chatId);
    typingListener = typingRef.on('value', (snap) => {
      const data = snap.val();
      if (data && data.isTyping && Date.now() - data.timestamp < 5000) {
        typingEl.style.display = 'flex';
        scrollToBottom();
      } else {
        typingEl.style.display = 'none';
      }
    });

    // Listen for chat status changes (chat closed by CS)
    db.ref('chats/' + chatId + '/info/status').on('value', (snap) => {
      if (snap.val() === 'closed') {
        handleChatClosed();
      }
    });
  }

  function detachListeners() {
    if (messagesListener && chatId) {
      db.ref('chats/' + chatId + '/messages').off('child_added', messagesListener);
      messagesListener = null;
    }
    if (typingListener && chatId) {
      db.ref('cs-typing/' + chatId).off('value', typingListener);
      typingListener = null;
    }
  }

  // ── Render Message Bubble ─────────────────────────────────────
  function renderMessage(msg) {
    const div = document.createElement('div');
    const isClient = msg.sender === 'client';
    const isSystem = msg.sender === 'system';

    if (isSystem) {
      div.className = 'chat-msg chat-msg--system';
      div.innerHTML = `<p>${window.chatSanitize(msg.text)}</p>`;
    } else {
      div.className = `chat-msg ${isClient ? 'chat-msg--client' : 'chat-msg--cs'}`;
      div.innerHTML = `
        ${!isClient ? `<div class="chat-msg-avatar"><i class="ph-fill ph-headset"></i></div>` : ''}
        <div class="chat-msg-bubble">
          <p>${window.chatSanitize(msg.text)}</p>
          <span class="chat-msg-time">${msg.timestamp ? window.chatFormatTime(msg.timestamp) : ''}</span>
        </div>
      `;
    }

    div.classList.add('chat-msg--anim');
    messagesEl.appendChild(div);
  }

  // ── Send Message ──────────────────────────────────────────────
  function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !chatId) return;

    if (!checkMessageRateLimit()) {
      alert('Terlalu banyak pesan. Mohon tunggu sebentar.');
      return;
    }

    recordMessage();

    const msgRef = db.ref('chats/' + chatId + '/messages');
    msgRef.push({
      sender: 'client',
      senderName: clientName,
      text: text,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      read: false,
    });

    // Update last message timestamp
    db.ref('chats/' + chatId + '/info').update({
      lastMessageAt: firebase.database.ServerValue.TIMESTAMP,
    });

    chatInput.value = '';
    sendBtn.disabled = true;

    // Clear client typing status
    clearClientTyping();
  }

  // ── Client Typing Indicator ───────────────────────────────────
  function sendClientTyping() {
    if (!chatId) return;
    db.ref('client-typing/' + chatId).set({
      isTyping: true,
      clientName: clientName,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      clearClientTyping();
    }, 3000);
  }

  function clearClientTyping() {
    if (!chatId) return;
    db.ref('client-typing/' + chatId).set({
      isTyping: false,
      clientName: clientName,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
    });
  }

  // ── Chat Closed Handler ───────────────────────────────────────
  function handleChatClosed() {
    detachListeners();

    const lang = localStorage.getItem('lang') || 'id';
    const endMsg =
      lang === 'en'
        ? '— Chat ended. Thank you for contacting us! —'
        : '— Chat selesai. Terima kasih sudah menghubungi kami! —';

    const div = document.createElement('div');
    div.className = 'chat-msg chat-msg--system chat-msg--end';
    div.innerHTML = `
      <p>${endMsg}</p>
      <button id="chat-new-btn" class="chat-new-btn">
        <i class="ph-bold ph-plus"></i>
        <span data-i18n="chat_new_chat">${lang === 'en' ? 'New Chat' : 'Chat Baru'}</span>
      </button>
    `;
    messagesEl.appendChild(div);
    scrollToBottom();

    // Hide input area
    inputArea.style.display = 'none';

    // Clear chat ID so next open starts fresh
    localStorage.removeItem('hd_chat_id');
    chatId = null;

    // Bind new chat button
    setTimeout(() => {
      const newBtn = document.getElementById('chat-new-btn');
      if (newBtn) {
        newBtn.addEventListener('click', () => {
          renderedMessageIds.clear();
          messagesEl.innerHTML = '';
          showPrechatView();
        });
      }
    }, 100);
  }

  // ── Input Events ──────────────────────────────────────────────
  chatInput.addEventListener('input', () => {
    sendBtn.disabled = !chatInput.value.trim();
    sendClientTyping();
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', () => {
    sendMessage();
  });

  // ── Scroll to Bottom ──────────────────────────────────────────
  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  // ── Resume Existing Chat on Page Load ─────────────────────────
  if (chatId && db) {
    // Check if chat is still active
    db.ref('chats/' + chatId + '/info/status')
      .once('value')
      .then((snap) => {
        if (snap.val() === 'active') {
          // Chat exists and is active, listeners will attach on open
        } else {
          // Chat is closed or doesn't exist, clear state
          localStorage.removeItem('hd_chat_id');
          chatId = null;
        }
      })
      .catch(() => {
        localStorage.removeItem('hd_chat_id');
        chatId = null;
      });
  }

  // ── Close on Escape Key ───────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeChat();
    }
  });
})();
