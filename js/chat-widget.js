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
  let chatChannel = null;
  let typingTimeout = null;
  let renderedMessageIds = new Set();
  let isFirstLoad = true;
  let replyToData = null;
  let contextMsgId = null;
  let contextMsgText = null;
  let longPressTimer = null;

  const deviceId = window.getDeviceId();
  const supabaseClient = window.supabaseClient;

  // ── Authentication ──────────────────────────────────────────────
  async function ensureAuth() {
    if (!supabaseClient) return false;
    try {
      const { data } = await supabaseClient.auth.getSession();
      if (!data.session) {
        const { error } = await supabaseClient.auth.signInAnonymously();
        if (error) throw error;
      }
      return true;
    } catch (err) {
      console.error('Auth error:', err);
      if (window.showToast) {
        if (err.status === 422 || (err.message && err.message.toLowerCase().includes('anonymous provider is disabled'))) {
          window.showToast('Gagal terhubung: Fitur Anonymous Auth belum diaktifkan di Supabase Dashboard.', 'error');
        } else {
          window.showToast('Gagal terhubung ke layanan autentikasi.', 'error');
        }
      }
      return false;
    }
  }

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
      ensureAuth().then((authSuccess) => {
        if (!authSuccess) return;
        attachListeners();
        
        // Mark existing CS messages as read
        if (supabaseClient) {
          supabaseClient.from('messages')
            .update({ read: true })
            .eq('chat_id', chatId)
            .eq('sender', 'cs')
            .eq('read', false)
            .then();
        }
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
    if (!chatId || !supabaseClient) return;
    const isOnline = isOpen && !document.hidden;
    supabaseClient.from('chats').update({
      isOnline: isOnline
    }).eq('id', chatId).then().catch(() => {});
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
    inputArea.style.display = 'block';
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

  // ── Create New Chat in Supabase ───────────────────────────────
  async function createChat() {
    const authSuccess = await ensureAuth();
    if (!authSuccess) return;

    const { data: authData } = await supabaseClient.auth.getSession();
    const userId = authData?.session?.user?.id;

    chatId = 'chat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    localStorage.setItem('hd_chat_id', chatId);
    recordChatCreation();

    const { error: chatError } = await supabaseClient.from('chats').insert({
      id: chatId,
      clientName: clientName,
      clientEmail: clientEmail,
      status: 'active',
      isOnline: true,
      lastMessageAt: new Date().toISOString()
    });

    if (chatError) {
      console.error('Chat error:', chatError);
      if (window.showToast) window.showToast('Gagal memulai obrolan (Akses Ditolak)', 'error');
      return;
    }

    await supabaseClient.from('typing_status').insert({
      chat_id: chatId,
      client_is_typing: false
    });

    renderedMessageIds.clear();
    messagesEl.innerHTML = '';
    isFirstLoad = true;

    // Add greeting message locally since RLS blocks inserting 'system' messages from client
    const lang = localStorage.getItem('lang') || 'id';
    const greetingTemplate =
      lang === 'en'
        ? 'Hi {name}! 👋 How can we help you today?'
        : 'Halo {name}! 👋 Ada yang bisa kami bantu hari ini?';
    const greetingText = greetingTemplate.replace('{name}', clientName);
    
    renderMessage({
      sender: 'system',
      text: greetingText,
      timestamp: new Date().toISOString()
    }, 'local-greeting');

    showChatView();
    attachListeners();
  }

  // ── Attach Supabase Listeners ─────────────────────────────────
  async function attachListeners() {
    if (!chatId || !supabaseClient) return;

    detachListeners();

    // Fetch existing messages
    const { data: messages } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: true });

    if (messages) {
      messages.forEach((msg) => {
        if (!renderedMessageIds.has(msg.id)) {
          renderedMessageIds.add(msg.id);
          renderMessage(msg, msg.id);
        }
      });
      scrollToBottom();
    }
    
    // Mark first load complete
    setTimeout(() => {
      isFirstLoad = false;
    }, 500);

    // Subscribe to realtime changes
    chatChannel = supabaseClient.channel('chat-' + chatId + '-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: 'chat_id=eq.' + chatId }, payload => {
        const msg = payload.new;
        if (payload.eventType === 'INSERT') {
          if (!renderedMessageIds.has(msg.id)) {
            renderedMessageIds.add(msg.id);
            renderMessage(msg, msg.id);
            scrollToBottom();

            if (!isFirstLoad && msg.sender === 'cs') {
              if (window.playNotifSound) window.playNotifSound();
              if (!isOpen) {
                unreadCount++;
                unreadBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                unreadBadge.style.display = 'flex';
              } else if (!msg.read) {
                supabaseClient.from('messages').update({ read: true }).eq('id', msg.id).then();
              }
            }
          }
        }
        if (payload.eventType === 'UPDATE') {
          if (msg.sender === 'client' && msg.read) {
            const statusEl = document.getElementById('chat-msg-status-' + msg.id);
            if (statusEl) {
              statusEl.className = 'chat-msg-status read';
              statusEl.innerHTML = '<i class="ph-bold ph-checks"></i>';
            }
          }
          
          const bubble = document.querySelector(`.chat-msg-bubble[data-id="${msg.id}"]`);
          if (bubble) {
            let reactionContainer = bubble.querySelector('.chat-msg-reactions');
            if (msg.reaction) {
              if (!reactionContainer) {
                reactionContainer = document.createElement('div');
                reactionContainer.className = 'chat-msg-reactions';
                const timeContainer = bubble.querySelector('.chat-msg-time-container');
                if (timeContainer) {
                  bubble.insertBefore(reactionContainer, timeContainer);
                } else {
                  bubble.appendChild(reactionContainer);
                }
              }
              reactionContainer.innerHTML = `<span class="chat-msg-reaction">${msg.reaction}</span>`;
            } else if (reactionContainer) {
              reactionContainer.remove();
            }
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'typing_status', filter: 'chat_id=eq.' + chatId }, payload => {
        const data = payload.new;
        if (data && data.cs_is_typing && Date.now() - new Date(data.cs_timestamp).getTime() < 5000) {
          typingEl.style.display = 'flex';
          scrollToBottom();
        } else {
          typingEl.style.display = 'none';
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chats', filter: 'id=eq.' + chatId }, payload => {
        if (payload.new.status === 'closed') {
          handleChatClosed();
        }
      })
      .subscribe();

    updatePresence();
  }

  function detachListeners() {
    if (chatChannel) {
      supabaseClient.removeChannel(chatChannel);
      chatChannel = null;
    }
  }

  // ── Render Message Bubble ─────────────────────────────────────
  function renderMessage(msg, msgId) {
    const div = document.createElement('div');
    const isClient = msg.sender === 'client';
    const isSystem = msg.sender === 'system';

    if (isSystem) {
      div.className = 'chat-msg chat-msg--system';
      if (msg.text && (msg.text.includes('👋') || msg.isGreeting)) {
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

      let imageHtml = '';
      let textHtml = '';

      if (msg.imageUrl) {
        const urlLower = msg.imageUrl.toLowerCase();
        const isImg = urlLower.match(/\.(jpeg|jpg|gif|png|webp|svg)$/) || !urlLower.includes('.');
        if (isImg) {
          imageHtml = `
            <div class="chat-msg-image-bubble" onclick="window.openChatLightbox('${msg.imageUrl}')">
              <img class="chat-msg-image" src="${msg.imageUrl}" alt="Image" loading="lazy" />
              ${msg.text ? `<div class="chat-msg-image-caption">${window.chatSanitize(msg.text)}</div>` : ''}
            </div>
          `;
        } else {
          const fileName = msg.imageUrl.split('/').pop().split('?')[0];
          const ext = fileName.split('.').pop().toUpperCase();
          imageHtml = `
            <div class="chat-msg-file-bubble" style="background:#f1f5f9; padding:8px; border-radius:6px; display:flex; align-items:center; gap:10px; border:1px solid #e2e8f0; margin-bottom:4px; max-width:240px;">
              <div style="width:36px; height:36px; background:var(--chat-primary); color:white; border-radius:6px; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:11px;">
                ${ext}
              </div>
              <div style="flex:1; overflow:hidden;">
                <div style="font-size:12px; font-weight:500; color:#1e293b; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${fileName}">
                  ${fileName.length > 20 ? fileName.substring(0, 15) + '...' + fileName.slice(-5) : fileName}
                </div>
                <a href="${msg.imageUrl}" target="_blank" download style="font-size:11px; color:var(--chat-primary); text-decoration:none; display:inline-flex; align-items:center; gap:4px; margin-top:4px;">
                  <i class="ph ph-download-simple"></i> Download
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

      const replyHtml = msg.replyTo_text 
        ? `<div class="chat-msg-reply">
             <div class="chat-msg-reply-inner">
               <div class="chat-msg-reply-author">Membalas pesan</div>
               <div class="chat-msg-reply-text">${window.chatSanitize(msg.replyTo_text)}</div>
             </div>
           </div>` 
        : '';
      
      let reactionsHtml = '';
      if (msg.reaction) {
        reactionsHtml = `
          <div class="chat-msg-reactions">
            <button class="chat-msg-reaction">${msg.reaction} <span class="chat-reaction-count">1</span></button>
          </div>
        `;
      }

      const timeFormatted = msg.timestamp ? window.chatFormatTime(new Date(msg.timestamp).getTime()) : '';

      div.innerHTML = `
        ${!isClient ? `<div class="chat-msg-avatar"><i class="ph-fill ph-headset"></i></div>` : ''}
        <div class="chat-msg-bubble" data-id="${msgId}" data-text="${window.chatSanitize(msg.text || '[Image]')}">
          ${replyHtml}
          ${imageHtml}
          ${textHtml}
          ${reactionsHtml}
          <div class="chat-msg-time-container">
            <span class="chat-msg-time">${timeFormatted}</span>
            ${statusHtml}
          </div>
        </div>
      `;
    }

    div.classList.add('chat-msg--anim');
    messagesEl.appendChild(div);
  }

  // ── Send Message ──────────────────────────────────────────────
  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !chatId) return;

    if (!checkMessageRateLimit()) {
      if (window.showToast) window.showToast('Terlalu banyak pesan. Mohon tunggu sebentar.', 'error');
      return;
    }

    recordMessage();

    await supabaseClient.from('messages').insert({
      chat_id: chatId,
      sender: 'client',
      senderName: clientName,
      text: text,
      replyTo_id: replyToData ? replyToData.id : null,
      replyTo_text: replyToData ? replyToData.text : null,
      timestamp: new Date().toISOString(),
      read: false,
    });

    replyToData = null;
    document.querySelectorAll('.chat-reply-preview').forEach(el => el.remove());

    // Update last message timestamp
    supabaseClient.from('chats').update({
      lastMessageAt: new Date().toISOString(),
    }).eq('id', chatId).then();

    chatInput.value = '';
    sendBtn.disabled = true;

    // Clear client typing status
    clearClientTyping();
  }

  // ── Client Typing Indicator ───────────────────────────────────
  function sendClientTyping() {
    if (!chatId || !supabaseClient) return;
    supabaseClient.from('typing_status').update({
      client_is_typing: true,
      client_timestamp: new Date().toISOString()
    }).eq('chat_id', chatId).then();

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      clearClientTyping();
    }, 3000);
  }

  function clearClientTyping() {
    if (!chatId || !supabaseClient) return;
    supabaseClient.from('typing_status').update({
      client_is_typing: false,
      client_timestamp: new Date().toISOString()
    }).eq('chat_id', chatId).then();
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
          if (inputArea) inputArea.style.display = 'block';
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
  if (chatId && supabaseClient) {
    ensureAuth().then((authSuccess) => {
      if (!authSuccess) return;
      // Check if chat is still active
      supabaseClient.from('chats').select('status').eq('id', chatId).single()
        .then(({ data, error }) => {
          if (data && data.status === 'active') {
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
    });
  }

  // ── Image Upload ──────────────────────────────────────────────
  const imageUploadInput = document.getElementById('chat-image-upload');
  const chatAttachLabel = document.querySelector('.chat-attach-btn[for="chat-image-upload"]');
  if (imageUploadInput) {
    imageUploadInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file || !chatId) return;

      if (file.size > 5 * 1024 * 1024) {
        if (window.showToast) window.showToast('Ukuran gambar maksimal 5MB', 'error');
        imageUploadInput.value = '';
        return;
      }

      if (!checkMessageRateLimit()) {
        if (window.showToast) window.showToast('Terlalu banyak pesan. Mohon tunggu sebentar.', 'error');
        imageUploadInput.value = '';
        return;
      }

      if (!supabaseClient) {
        if (window.showToast) window.showToast('Storage tidak tersedia', 'error');
        imageUploadInput.value = '';
        return;
      }

      try {
        // Show uploading state
        sendBtn.disabled = true;
        chatInput.disabled = true;
        if (chatAttachLabel) chatAttachLabel.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';

        const finalFile = window.compressImageFile ? await window.compressImageFile(file) : file;
        const filePath = `${chatId}/${Date.now()}_${finalFile.name}`;
        
        const { error: uploadError } = await supabaseClient.storage.from('chat-images').upload(filePath, finalFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseClient.storage.from('chat-images').getPublicUrl(filePath);
        const url = urlData.publicUrl;

        recordMessage();

        await supabaseClient.from('messages').insert({
          chat_id: chatId,
          sender: 'client',
          senderName: clientName,
          text: '',
          imageUrl: url,
          replyTo_id: replyToData ? replyToData.id : null,
          replyTo_text: replyToData ? replyToData.text : null,
          timestamp: new Date().toISOString()
        });

        replyToData = null;
        document.querySelectorAll('.chat-reply-preview').forEach(el => el.remove());

        supabaseClient.from('chats').update({
          lastMessageAt: new Date().toISOString()
        }).eq('id', chatId).then();

        if (window.showToast) window.showToast('Gambar berhasil dikirim', 'success');
        sendClientTyping();
      } catch (err) {
        console.error('Image upload failed:', err);
        if (window.showToast) window.showToast('Gagal upload gambar. Coba lagi.', 'error');
      }

      sendBtn.disabled = !chatInput.value.trim();
      chatInput.disabled = false;
      if (chatAttachLabel) chatAttachLabel.innerHTML = '<i class="ph ph-paperclip"></i>';
      imageUploadInput.value = '';
    });
  }


  // ── Lightbox ───────────────────────────────────────────────────
  window.openChatLightbox = function (url) {
    const lb = document.getElementById('chat-lightbox');
    const img = document.getElementById('chat-lightbox-img');
    const dl = document.getElementById('chat-lightbox-download');
    if (lb && img) {
      img.src = url;
      if (dl) {
        dl.href = url;
        dl.download = 'image_' + Date.now() + '.jpg';
      }
      lb.style.display = 'flex';
      resetLightbox();
    }
  };

  const lb = document.getElementById('chat-lightbox');
  const lbClose = document.getElementById('chat-lightbox-close');
  const lbOverlay = document.querySelector('.chat-lightbox-overlay');
  const lbImg = document.getElementById('chat-lightbox-img');
  const lbZoomIn = document.getElementById('chat-lightbox-zoom-in');
  const lbZoomOut = document.getElementById('chat-lightbox-zoom-out');
  const lbReset = document.getElementById('chat-lightbox-reset');

  let scale = 1, panning = false, pointX = 0, pointY = 0, startX = 0, startY = 0;
  const setTransform = () => {
    if (lbImg) lbImg.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
  };
  const resetLightbox = () => {
    scale = 1; pointX = 0; pointY = 0; setTransform();
  };

  if (lbImg) {
    lbImg.onmousedown = (e) => {
      e.preventDefault();
      startX = e.clientX - pointX;
      startY = e.clientY - pointY;
      panning = true;
    };
    document.addEventListener('mouseup', () => { panning = false; });
    document.addEventListener('mousemove', (e) => {
      if (!panning || scale <= 1) return;
      pointX = e.clientX - startX;
      pointY = e.clientY - startY;
      setTransform();
    });
    lbImg.onwheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      scale = Math.max(0.5, Math.min(scale + delta, 5));
      setTransform();
    };
  }

  if (lbZoomIn) lbZoomIn.onclick = () => { scale = Math.min(scale + 0.2, 5); setTransform(); };
  if (lbZoomOut) lbZoomOut.onclick = () => { scale = Math.max(scale - 0.2, 0.5); setTransform(); };
  if (lbReset) lbReset.onclick = resetLightbox;

  function closeLightbox() {
    if (lb) lb.style.display = 'none';
    resetLightbox();
  }

  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lbOverlay) lbOverlay.addEventListener('click', closeLightbox);

  // ── Close on Escape Key ───────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const lb = document.getElementById('chat-lightbox');
      if (lb && lb.style.display !== 'none') {
        closeLightbox();
      } else if (isOpen) {
        closeChat();
      }
    }
  });

  // ── Emoji Picker ────────────────────────────────────────────────
  const emojiToggle = document.getElementById('chat-emoji-toggle');
  const emojiPicker = document.getElementById('chat-emoji-picker');
  if (emojiToggle && emojiPicker) {
    emojiToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'grid' : 'none';
    });
    emojiPicker.addEventListener('click', (e) => {
      if (e.target.classList.contains('chat-emoji-btn')) {
        chatInput.value += e.target.textContent;
        sendBtn.disabled = !chatInput.value.trim();
        emojiPicker.style.display = 'none';
        chatInput.focus();
      }
    });
    document.addEventListener('click', (e) => {
      if (!emojiToggle.contains(e.target) && !emojiPicker.contains(e.target)) {
        emojiPicker.style.display = 'none';
      }
    });
  }

  // ── Context Menu (Right Click & Long Press) ─────────────────────
  const ctxMenu = document.getElementById('chat-context-menu');
  
  function showContextMenu(e, msgId, msgText) {
    e.preventDefault();
    contextMsgId = msgId;
    contextMsgText = msgText;
    
    // Position menu
    let x = e.clientX || (e.touches && e.touches[0].clientX);
    let y = e.clientY || (e.touches && e.touches[0].clientY);
    
    ctxMenu.style.display = 'block';
    // Adjust if off-screen
    if (x + ctxMenu.offsetWidth > window.innerWidth) x -= ctxMenu.offsetWidth;
    if (y + ctxMenu.offsetHeight > window.innerHeight) y -= ctxMenu.offsetHeight;
    
    ctxMenu.style.left = x + 'px';
    ctxMenu.style.top = y + 'px';
  }

  messagesEl.addEventListener('contextmenu', (e) => {
    const bubble = e.target.closest('.chat-msg-bubble');
    if (bubble && bubble.dataset.id) {
      showContextMenu(e, bubble.dataset.id, bubble.dataset.text);
    }
  });

  messagesEl.addEventListener('touchstart', (e) => {
    const bubble = e.target.closest('.chat-msg-bubble');
    if (bubble && bubble.dataset.id) {
      longPressTimer = setTimeout(() => {
        showContextMenu(e, bubble.dataset.id, bubble.dataset.text);
      }, 500);
    }
  });

  messagesEl.addEventListener('touchend', () => clearTimeout(longPressTimer));
  messagesEl.addEventListener('touchmove', () => clearTimeout(longPressTimer));

  document.addEventListener('click', (e) => {
    if (ctxMenu && !ctxMenu.contains(e.target)) {
      ctxMenu.style.display = 'none';
    }
  });

  // Context menu actions
  if (ctxMenu) {
    document.getElementById('chat-ctx-reply').addEventListener('click', () => {
      replyToData = { id: contextMsgId, text: contextMsgText };
      
      // Show reply preview above input
      document.querySelectorAll('.chat-reply-preview').forEach(el => el.remove());
      const preview = document.createElement('div');
      preview.className = 'chat-reply-preview';
      preview.innerHTML = `<div class="chat-msg-reply" style="margin:0 10px 5px">Replying to: ${window.chatSanitize(contextMsgText)}</div>`;
      inputArea.insertBefore(preview, inputArea.firstChild);
      
      chatInput.focus();
      ctxMenu.style.display = 'none';
    });

    document.getElementById('chat-ctx-fav').addEventListener('click', () => {
      const favs = JSON.parse(localStorage.getItem('hd_fav_msgs') || '[]');
      if (!favs.includes(contextMsgId)) favs.push(contextMsgId);
      localStorage.setItem('hd_fav_msgs', JSON.stringify(favs));
      if (window.showToast) window.showToast('Pesan ditambahkan ke favorit', 'success');
      ctxMenu.style.display = 'none';
    });

    const reactions = ctxMenu.querySelector('.chat-ctx-reactions');
    if (reactions) {
      reactions.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && contextMsgId && chatId) {
          const emoji = e.target.textContent;
          const bubble = document.querySelector(`.chat-msg-bubble[data-id="${contextMsgId}"]`);
          const currentReaction = bubble ? bubble.querySelector('.chat-msg-reaction') : null;
          
          if (currentReaction && currentReaction.textContent === emoji) {
            supabaseClient.from('messages').update({ reaction: null }).eq('id', contextMsgId).then();
          } else {
            supabaseClient.from('messages').update({ reaction: emoji }).eq('id', contextMsgId).then();
          }
          ctxMenu.style.display = 'none';
        }
      });
    }
  }

})();
