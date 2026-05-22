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
  const nameInput = document.getElementById('chat-prechat-name');
  const emailInput = document.getElementById('chat-prechat-email');
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
  let statusListener = null;
  let messagesChangedListener = null;
  let renderedMessageIds = new Set();
  let isFirstLoad = true;

  const deviceId = window.getDeviceId();
  const db = window.firebaseDB;

  // ── Rate Limiting ─────────────────────────────────────────────
  const RATE_LIMIT = {
    maxChatsPerHour: 50,
    maxMessagesPerMinute: 60,
    minFormDuration: 1000, // 1 second minimum to fill form (anti-bot)
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
      
      // Mark existing CS messages as read
      db.ref('chats/' + chatId + '/messages')
        .orderByChild('sender')
        .equalTo('cs')
        .once('value', (snap) => {
          snap.forEach((child) => {
            if (!child.val().read) {
              child.ref.update({ read: true });
            }
          });
        });
    } else {
      showPrechatView();
    }

    // Auto-scroll
    scrollToBottom();
    updatePresence();
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('chat-window--visible');
    win.classList.add('chat-window--hidden');
    win.setAttribute('aria-hidden', 'true');
    iconOpen.style.display = 'block';
    iconClose.style.display = 'none';
    toggleBtn.classList.remove('is-active');
    updatePresence();
  }

  // ── Client Presence ───────────────────────────────────────────
  function updatePresence() {
    if (!chatId || !db) return;
    const isOnline = isOpen && !document.hidden;
    db.ref('chats/' + chatId + '/info').update({
      isOnline: isOnline
    }).catch(() => {});
  }

  document.addEventListener('visibilitychange', updatePresence);

  function showPrechatView() {
    prechat.style.display = 'block';
    messagesEl.style.display = 'none';
    typingEl.style.display = 'none';
    inputArea.style.display = 'none';

    // Restore saved client info
    if (clientName && nameInput) nameInput.value = clientName;
    if (clientEmail && emailInput) emailInput.value = clientEmail;

    // Start from blank answer
    if (challengeInput) challengeInput.value = '';

    generateChallenge();
    formOpenedAt = Date.now();
  }

  function showChatView() {
    prechat.style.display = 'none';
    messagesEl.style.display = 'flex';
    inputArea.style.display = 'flex';
    chatInput.focus();
  }

  // ── Toggle Button Events ──────────────────────────────────────
  toggleBtn.addEventListener('click', () => {
    isOpen ? closeChat() : openChat();
  });

  // Handle dynamic language change
  window.addEventListener('languageChanged', () => {
    const lang = localStorage.getItem('lang') || 'id';

    if (prechat && prechat.style.display !== 'none') {
      generateChallenge();
    }

    // Update greetings
    const greetings = document.querySelectorAll('[data-greeting="true"]');
    const name = localStorage.getItem('hd_client_name') || 'Guest';
    const greetingText = lang === 'en' 
      ? `Hi ${name}! 👋 How can we help you today?` 
      : `Halo ${name}! 👋 Ada yang bisa kami bantu hari ini?`;
    greetings.forEach(el => el.textContent = greetingText);

    // Update end chat message
    const endChats = document.querySelectorAll('[data-endchat="true"]');
    const endMsg = lang === 'en'
      ? '— Chat ended. Thank you for contacting us!<br><span style="font-size:0.6rem;opacity:0.7">This chat will be deleted in the designated time.</span> —'
      : '— Chat selesai. Terima kasih telah menghubungi kami!<br><span style="font-size:0.6rem;opacity:0.7">Chat akan kami hapus dalam waktu yang ditentukan.</span> —';
    endChats.forEach(el => el.innerHTML = endMsg);

    // Update new chat button text
    const newChatBtns = document.querySelectorAll('.chat-new-btn span');
    newChatBtns.forEach(el => el.textContent = lang === 'en' ? 'New Chat' : 'Chat Baru');
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
      if (window.showToast) window.showToast('Mohon tunggu sebentar sebelum mengirim.', 'warning');
      return;
    }

    // Anti-bot: challenge check
    if (parseInt(challengeInput.value) !== challengeAnswer) {
      const lang = localStorage.getItem('lang') || 'id';
      const errorMsg = lang === 'en' 
        ? 'Incorrect security answer. Please try again.' 
        : 'Jawaban keamanan salah. Silakan coba lagi.';
      if (window.showToast) window.showToast(errorMsg, 'error');

      challengeInput.classList.add('shake');
      setTimeout(() => challengeInput.classList.remove('shake'), 500);
      challengeInput.value = '';
      challengeInput.focus();
      generateChallenge();
      return;
    }

    // Rate limit check
    if (!checkChatRateLimit()) {
      if (window.showToast) window.showToast('Terlalu banyak chat. Silakan coba lagi nanti.', 'error');
      return;
    }

    clientName = window.chatSanitize(nameInput.value.trim());
    clientEmail = window.chatSanitize(emailInput.value.trim());

    localStorage.setItem('hd_client_name', clientName);
    localStorage.setItem('hd_client_email', clientEmail);

    createChat();
  });

  // ── Create New Chat in Firebase ───────────────────────────────
  function createChat() {
    chatId = 'chat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    localStorage.setItem('hd_chat_id', chatId);
    recordChatCreation();

    const chatRef = db.ref('chats/' + chatId);
    chatRef.child('info').set({
      clientName: clientName,
      clientEmail: clientEmail,
      status: 'active',
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      lastMessageAt: firebase.database.ServerValue.TIMESTAMP,
      deviceId: deviceId,
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
      isGreeting: true,
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

    // Setup presence disconnect hook
    db.ref('chats/' + chatId + '/info').onDisconnect().update({ isOnline: false });
    updatePresence();

    // Listen for new messages
    const msgRef = db.ref('chats/' + chatId + '/messages');
    messagesListener = msgRef.orderByChild('timestamp').on('child_added', (snap) => {
      const msg = snap.val();
      const msgId = snap.key;

      if (renderedMessageIds.has(msgId)) return;
      renderedMessageIds.add(msgId);

      renderMessage(msg, msgId);
      scrollToBottom();

      // Handle message reading/notifications
      if (!isFirstLoad && msg.sender === 'cs') {
        if (window.playNotifSound) window.playNotifSound();
        if (!isOpen) {
          unreadCount++;
          unreadBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
          unreadBadge.style.display = 'flex';
        } else if (!msg.read) {
          msgRef.child(msgId).update({ read: true });
        }
      }

      // Mark first load complete after a brief delay
      if (isFirstLoad) {
        setTimeout(() => {
          isFirstLoad = false;
        }, 500);
      }
    });

    // Listen for read receipts
    messagesChangedListener = db.ref('chats/' + chatId + '/messages').on('child_changed', (snap) => {
      const msg = snap.val();
      const msgId = snap.key;
      if (msg.sender === 'client' && msg.read) {
        const statusEl = document.getElementById('chat-msg-status-' + msgId);
        if (statusEl) {
          statusEl.className = 'chat-msg-status read';
          statusEl.innerHTML = '<i class="ph-bold ph-checks"></i>';
        }
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
    statusListener = db.ref('chats/' + chatId + '/info/status').on('value', (snap) => {
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
    if (messagesChangedListener && chatId) {
      db.ref('chats/' + chatId + '/messages').off('child_changed', messagesChangedListener);
      messagesChangedListener = null;
    }
    if (typingListener && chatId) {
      db.ref('cs-typing/' + chatId).off('value', typingListener);
      typingListener = null;
    }
    if (statusListener && chatId) {
      db.ref('chats/' + chatId + '/info/status').off('value', statusListener);
      statusListener = null;
    }
  }

  // ── Render Message Bubble ─────────────────────────────────────
  function renderMessage(msg, msgId) {
    const div = document.createElement('div');
    const isClient = msg.sender === 'client';
    const isSystem = msg.sender === 'system';

    if (isSystem) {
      div.className = 'chat-msg chat-msg--system';
      if (msg.isGreeting) {
        div.innerHTML = `<p data-greeting="true">${window.chatSanitize(msg.text)}</p>`;
      } else {
        div.innerHTML = `<p>${window.chatSanitize(msg.text)}</p>`;
      }
    } else {
      div.className = `chat-msg ${isClient ? 'chat-msg--client' : 'chat-msg--cs'}`;
      
      let statusHtml = '';
      if (isClient && msgId) {
        statusHtml = msg.read
          ? `<span id="chat-msg-status-${msgId}" class="chat-msg-status read"><i class="ph-bold ph-checks"></i></span>`
          : `<span id="chat-msg-status-${msgId}" class="chat-msg-status sent"><i class="ph ph-check"></i></span>`;
      }

      div.innerHTML = `
        ${!isClient ? `<div class="chat-msg-avatar"><i class="ph-fill ph-headset"></i></div>` : ''}
        <div class="chat-msg-bubble">
          <p>${window.chatSanitize(msg.text)}</p>
          <div class="chat-msg-time-container">
            <span class="chat-msg-time">${msg.timestamp ? window.chatFormatTime(msg.timestamp) : ''}</span>
            ${statusHtml}
          </div>
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
      if (window.showToast) window.showToast('Terlalu banyak pesan. Mohon tunggu sebentar.', 'error');
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
  let chatClosed = false;

  function handleChatClosed() {
    if (chatClosed) return; // Guard against double invocation
    chatClosed = true;

    detachListeners();

    if (inputArea) inputArea.style.display = 'none';

    const lang = localStorage.getItem('lang') || 'id';
    const endMsg =
      lang === 'en'
        ? '— Chat ended. Thank you for contacting us!<br><span style="font-size:0.6rem;opacity:0.7">This chat will be deleted in the designated time.</span> —'
        : '— Chat selesai. Terima kasih telah menghubungi kami!<br><span style="font-size:0.6rem;opacity:0.7">Chat akan kami hapus dalam waktu yang ditentukan.</span> —';

    const div = document.createElement('div');
    div.className = 'chat-msg chat-msg--system chat-msg--end';
    div.innerHTML = `
      <div data-endchat="true">${endMsg}</div>
      <button id="chat-new-btn" class="chat-new-btn">
        <i class="ph-bold ph-plus"></i>
        <span data-i18n="chat_new_chat">${lang === 'en' ? 'New Chat' : 'Chat Baru'}</span>
      </button>
    `;
    messagesEl.appendChild(div);
    scrollToBottom();

    // Clear chat ID so next open starts fresh
    localStorage.removeItem('hd_chat_id');
    chatId = null;

    // Bind new chat button
    setTimeout(() => {
      const newBtn = document.getElementById('chat-new-btn');
      if (newBtn) {
        newBtn.addEventListener('click', () => {
          chatClosed = false;
          renderedMessageIds.clear();
          isFirstLoad = true;
          unreadCount = 0;
          if (inputArea) inputArea.style.display = 'flex';
          localStorage.removeItem('hd_chat_id');
          chatId = null;
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
