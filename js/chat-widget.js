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
  let editingMsgId = null;
  let renderedMessageIds = new Set();
  let isFirstLoad = true;
  let replyToData = null;
  let contextMsgId = null;
  let contextMsgText = null;
  let longPressTimer = null;
  let isCreatingChat = false;

  const supabaseClient = window.supabaseClient;

  // ── Sanitize Helpers ─────────────────────────────────────────
  function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function safeUrl(url) {
    if (!url) return '';
    try { const u = new URL(url); return ['https:','http:'].includes(u.protocol) ? url : ''; } catch { return ''; }
  }

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

  // ── Helpers ───────────────────────────────────────────────────
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  const PUBLIC_VAPID_KEY = 'BJgkti3bRXGoIaPq5bt3S346p0yhbw4GC8zAw7e8c7ulFpoa3huVb5PghF3jGWULnq0RpS2Hgs-jPTMXYJMyRus';

  async function subscribeToPush(currentChatId) {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const register = await navigator.serviceWorker.register('/sw.js');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const subscription = await register.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        });

        const subData = JSON.parse(JSON.stringify(subscription));
        
        await supabaseClient.from('push_subscriptions').upsert({
          role: 'client',
          chat_id: currentChatId,
          endpoint: subData.endpoint,
          auth: subData.keys.auth,
          p256dh: subData.keys.p256dh,
          last_updated: new Date().toISOString()
        }, { onConflict: 'endpoint' });
      } catch (e) {
        console.error('Push registration failed', e);
      }
    }
  }

  function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    if (isCreatingChat) return;
    isCreatingChat = true;

    const authSuccess = await ensureAuth();
    if (!authSuccess) { isCreatingChat = false; return; }

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
      isCreatingChat = false;
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
    subscribeToPush(chatId);
    isCreatingChat = false;
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
          
          // Handle deleted_at toggle
          if (bubble) {
            const isCurrentlyDeleted = bubble.classList.contains('chat-msg-deleted');
            const isNowDeleted = !!msg.deleted_at;
            if (isCurrentlyDeleted !== isNowDeleted) {
              const wrapperDiv = bubble.closest('.chat-msg');
              if (wrapperDiv) {
                const tempContainer = document.createElement('div');
                const oldAppend = messagesEl.appendChild.bind(messagesEl);
                messagesEl.appendChild = (el) => tempContainer.appendChild(el);
                renderedMessageIds.delete(msg.id);
                renderMessage(msg, msg.id);
                renderedMessageIds.add(msg.id);
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
              const timeContainer = bubble.querySelector('.chat-msg-time-container');
              if (timeContainer && !timeContainer.querySelector('.chat-msg-edited-text')) {
                timeContainer.insertAdjacentHTML('afterbegin', '<span class="chat-msg-edited-text">(diedit)</span>');
              }
            }

            // Update Reactions
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
              reactionContainer.innerHTML = `<button class="chat-msg-reaction">${window.chatSanitize(msg.reaction)} <span class="chat-reaction-count">1</span></button>`;
            } else if (reactionContainer) {
              reactionContainer.remove();
            }
          }

          // Update pinned header
          if (msg.is_pinned !== undefined) {
             if (msg.is_pinned) updatePinnedHeader(msg.text, msg.id);
             // Note: if unpinned we just leave it or hide it, let's hide if we unpinned the currently showing one
             else {
               const pinnedTextEl = document.getElementById('chat-pinned-text');
               if (pinnedTextEl && pinnedTextEl.textContent === msg.text) {
                 updatePinnedHeader(null);
               }
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
    if (typingTimeout) { clearTimeout(typingTimeout); typingTimeout = null; }
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
        const cleanUrl = msg.imageUrl.split('?')[0];
        const urlLower = cleanUrl.toLowerCase();
        const fileName = cleanUrl.split('/').pop();
        const extMatch = fileName.match(/\.([a-z0-9]+)$/);
        const ext = extMatch ? extMatch[1] : '';
        const extUpper = ext.toUpperCase() || 'FILE';

        const isImg = ['jpeg', 'jpg', 'gif', 'png', 'webp', 'svg'].includes(ext) || !urlLower.includes('.');
        const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
        const isVideo = ['mp4', 'webm', 'mov'].includes(ext);

        if (isImg) {
          imageHtml = `
            <div class="chat-msg-img-bubble" style="border-radius:12px; overflow:hidden; border:1px solid var(--border); margin-bottom:4px; max-width:300px; cursor:pointer; position:relative; background:var(--card); display:flex; flex-direction:column;" onclick="window.openChatLightbox('${escapeAttr(safeUrl(msg.imageUrl))}')">
              <img src="${escapeAttr(safeUrl(msg.imageUrl))}" alt="Attached Image" style="width:100%; max-height:350px; object-fit:cover; display:block; transition:0.2s;" loading="lazy">
              ${msg.text ? `<div style="padding:8px 12px; font-size:12px; color:var(--foreground); border-top:1px solid var(--border);">${window.chatSanitize(msg.text)}</div>` : ''}
              <div style="position:absolute; inset:0; background:rgba(0,0,0,0.1); opacity:0; transition:0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'"></div>
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
            ${msg.text ? `<div style="font-size:12px; color:var(--foreground); margin-top:2px; padding:0 6px;">${window.chatSanitize(msg.text)}</div>` : ''}
          `;
        } else if (isVideo) {
          imageHtml = `
            <div class="chat-msg-video-bubble" style="border-radius:12px; overflow:hidden; border:1px solid var(--border); margin-bottom:4px; max-width:300px; background:var(--card); display:flex; flex-direction:column;">
              <video controls playsinline webkit-playsinline style="width:100%; max-height:350px; display:block; background:#000;" preload="metadata">
                <source src="${escapeAttr(safeUrl(msg.imageUrl))}">
                Browser Anda tidak mendukung elemen video.
              </video>
              ${msg.text ? `<div style="padding:8px 12px; font-size:12px; color:var(--foreground); border-top:1px solid var(--border);">${window.chatSanitize(msg.text)}</div>` : ''}
            </div>
          `;
        } else {
          imageHtml = `
            <div class="chat-msg-file-bubble" style="background:var(--card); padding:10px 12px; border-radius:10px; display:flex; align-items:center; gap:10px; border:1px solid var(--border); margin-bottom:4px; max-width:240px;">
              <div style="width:40px; height:40px; background:var(--primary); color:var(--primary-foreground); border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px; flex-shrink:0;">
                ${extUpper}
              </div>
              <div style="flex:1; overflow:hidden;">
                <div style="font-size:12px; font-weight:600; color:var(--foreground); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${escapeAttr(fileName)}">
                  ${escapeAttr(fileName.length > 20 ? fileName.substring(0, 15) + '...' + fileName.slice(-5) : fileName)}
                </div>
                <a href="${escapeAttr(safeUrl(msg.imageUrl))}" target="_blank" download style="font-size:11px; color:var(--primary); text-decoration:none; display:inline-flex; align-items:center; gap:4px; margin-top:4px;">
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
            <button class="chat-msg-reaction">${window.chatSanitize(msg.reaction)} <span class="chat-reaction-count">1</span></button>
          </div>
        `;
      }

      const timeFormatted = msg.timestamp ? window.chatFormatTime(new Date(msg.timestamp).getTime()) : '';
      const isEdited = msg.is_edited ? '<span class="chat-msg-edited-text">(diedit)</span>' : '';
      const favs = JSON.parse(localStorage.getItem('hd_fav_msgs') || '[]');
      const isFav = favs.includes(msgId) ? '<i class="ph-fill ph-star chat-msg-fav-icon"></i>' : '';

      // Handle soft deleted message
      if (msg.deleted_at) {
        div.innerHTML = `
          ${!isClient ? `<div class="chat-msg-avatar"><i class="ph-fill ph-headset"></i></div>` : ''}
          <div class="chat-msg-bubble chat-msg-deleted" data-id="${escapeAttr(msgId)}" data-sender="${escapeAttr(msg.sender)}" style="background:var(--muted); color:var(--muted-foreground); border:1px solid var(--border); font-style:italic; display:flex; align-items:center; gap:8px;">
            <i class="ph ph-prohibit"></i> Pesan ini telah dihapus.
          </div>
        `;
      } else {
        div.innerHTML = `
          ${!isClient ? `<div class="chat-msg-avatar"><i class="ph-fill ph-headset"></i></div>` : ''}
          <div class="chat-msg-bubble" data-id="${escapeAttr(msgId)}" data-text="${escapeAttr(msg.text || '[Image]')}" data-sender="${escapeAttr(msg.sender)}" data-url="${msg.imageUrl ? escapeAttr(safeUrl(msg.imageUrl)) : ''}">
            <div class="chat-msg-options" onclick="window.showContextMenuFromBtn(event, this)">
              <i class="ph-bold ph-dots-three-vertical"></i>
            </div>
            ${replyHtml}
            ${imageHtml}
            ${textHtml}
            ${reactionsHtml}
            <div class="chat-msg-time-container">
              ${isEdited}
              <span class="chat-msg-time">${timeFormatted}</span>
              ${isFav}
              ${statusHtml}
            </div>
          </div>
        `;
      }
      
      // Update sticky header if message is pinned
      if (msg.is_pinned) {
        updatePinnedHeader(msg.text, msg.id);
      }
    }

    div.classList.add('chat-msg--anim');
    messagesEl.appendChild(div);
  }

  // ── Pinned Header Logic ───────────────────────────────────────
  const pinnedHeader = document.getElementById('chat-pinned-header');
  const pinnedTextEl = document.getElementById('chat-pinned-text');

  function updatePinnedHeader(text, id) {
    if (text) {
      pinnedHeader.style.display = 'flex';
      pinnedHeader.style.cursor = 'pointer';
      pinnedTextEl.textContent = text;
      if (id) pinnedHeader.dataset.id = id;
    } else {
      pinnedHeader.style.display = 'none';
      pinnedTextEl.textContent = '';
      pinnedHeader.removeAttribute('data-id');
    }
  }

  pinnedHeader.addEventListener('click', () => {
    const id = pinnedHeader.dataset.id;
    if (id) {
      const msgEl = document.querySelector(`.chat-msg-bubble[data-id="${id}"]`);
      if (msgEl) {
        msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight effect
        msgEl.style.transition = 'background-color 0.5s';
        const originalBg = msgEl.style.backgroundColor;
        msgEl.style.backgroundColor = 'var(--primary-light)';
        setTimeout(() => {
          msgEl.style.backgroundColor = originalBg;
        }, 1500);
      }
    }
  });

  // ── Send Message ──────────────────────────────────────────────
  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !chatId) return;

    if (!checkMessageRateLimit()) {
      if (window.showToast) window.showToast('Terlalu banyak pesan. Mohon tunggu sebentar.', 'error');
      return;
    }

    recordMessage();
    const savedReply = replyToData;
    const savedEditId = editingMsgId;
    replyToData = null;
    editingMsgId = null;
    document.querySelectorAll('.chat-reply-preview').forEach(el => el.remove());
    chatInput.value = '';
    sendBtn.disabled = true;

    try {
      if (savedEditId) {
        await supabaseClient.from('messages').update({
          text: text,
          is_edited: true
        }).eq('id', savedEditId);
      } else {
        await supabaseClient.from('messages').insert({
          chat_id: chatId,
          sender: 'client',
          senderName: clientName,
          text: text,
          replyTo_id: savedReply ? savedReply.id : null,
          replyTo_text: savedReply ? savedReply.text : null,
          timestamp: new Date().toISOString(),
          read: false,
        });

        supabaseClient.from('chats').update({
          lastMessageAt: new Date().toISOString(),
        }).eq('id', chatId).then();

        // Kirim push notification ke semua perangkat CS
        if (window.triggerPushNotification) {
          window.triggerPushNotification({
            sender: 'client',
            senderName: clientName,
            text: text,
            chat_id: chatId,
          });
        }
      }

      clearClientTyping();
    } catch (err) {
      chatInput.value = text;
      sendBtn.disabled = false;
      if (window.showToast) window.showToast('Gagal mengirim pesan. Coba lagi.', 'error');
    }
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

      if (file.size > 50 * 1024 * 1024) {
        if (window.showToast) window.showToast('Ukuran file maksimal 50MB', 'error');
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
        const safeName = finalFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filePath = `${chatId}/${Date.now()}_${safeName}`;
        
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

        // Kirim push notification ke semua perangkat CS
        if (window.triggerPushNotification) {
          window.triggerPushNotification({
            sender: 'client',
            senderName: clientName,
            text: '[Gambar]',
            chat_id: chatId,
          });
        }

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


  window.chatForceDownload = async (url, filename) => {
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
    } catch(e) {
      window.open(url, '_blank');
    }
  };

  // ── Lightbox ───────────────────────────────────────────────────
  window.openChatLightbox = function (url) {
    const lb = document.getElementById('chat-lightbox');
    const img = document.getElementById('chat-lightbox-img');
    const dl = document.getElementById('chat-lightbox-download');
    if (lb && img) {
      img.src = url;
      if (dl) {
        dl.onclick = (e) => {
          e.preventDefault();
          if (window.chatForceDownload) {
            window.chatForceDownload(url, 'image_' + Date.now() + '.jpg');
          } else {
            const a = document.createElement('a');
            a.href = url;
            a.download = 'image_' + Date.now() + '.jpg';
            a.target = '_blank';
            a.click();
          }
        };
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
  let contextMsgSender = null;
  
  function showContextMenu(e, msgId, msgText, sender, bubbleUrl) {
    e.preventDefault();
    contextMsgId = msgId;
    contextMsgText = msgText;
    contextMsgSender = sender;
    
    // Hide/Show Edit button based on sender
    const editBtn = document.getElementById('chat-ctx-edit');
    if (editBtn) {
      editBtn.style.display = contextMsgSender === 'client' ? 'flex' : 'none';
    }

    // Toggle Favorite text
    const favBtn = document.getElementById('chat-ctx-fav');
    if (favBtn) {
      const favs = JSON.parse(localStorage.getItem('hd_fav_msgs') || '[]');
      if (favs.includes(msgId)) {
        favBtn.innerHTML = '<i class="ph-fill ph-star"></i> Hapus Favorit';
      } else {
        favBtn.innerHTML = '<i class="ph ph-star"></i> Favorit';
      }
    }

    // Toggle Download button
    const downloadBtn = document.getElementById('chat-ctx-download');
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
          ctxMenu.style.display = 'none';
        };
      } else {
        downloadBtn.style.display = 'none';
      }
    }

    // Position menu
    let x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    let y = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    
    ctxMenu.style.display = 'block';
    // Adjust if off-screen
    if (x + ctxMenu.offsetWidth > window.innerWidth) x -= ctxMenu.offsetWidth;
    if (y + ctxMenu.offsetHeight > window.innerHeight) y -= ctxMenu.offsetHeight;
    
    ctxMenu.style.left = x + 'px';
    ctxMenu.style.top = y + 'px';
  }

  window.showContextMenuFromBtn = function(e, btn) {
    e.stopPropagation();
    const bubble = btn.closest('.chat-msg-bubble');
    if (bubble && bubble.dataset.id) {
      showContextMenu(e, bubble.dataset.id, bubble.dataset.text, bubble.dataset.sender, bubble.dataset.url);
    }
  };

  messagesEl.addEventListener('contextmenu', (e) => {
    const bubble = e.target.closest('.chat-msg-bubble');
    if (bubble && bubble.dataset.id) {
      showContextMenu(e, bubble.dataset.id, bubble.dataset.text, bubble.dataset.sender, bubble.dataset.url);
    }
  });

  messagesEl.addEventListener('touchstart', (e) => {
    const bubble = e.target.closest('.chat-msg-bubble');
    if (bubble && bubble.dataset.id) {
      longPressTimer = setTimeout(() => {
        showContextMenu(e, bubble.dataset.id, bubble.dataset.text, bubble.dataset.sender);
      }, 500);
    }
  });

  messagesEl.addEventListener('touchend', () => clearTimeout(longPressTimer));
  messagesEl.addEventListener('touchmove', () => clearTimeout(longPressTimer));

  document.addEventListener('click', (e) => {
    if (ctxMenu && !ctxMenu.contains(e.target)) {
      ctxMenu.style.display = 'none';
    }
    
    // Delegate click for reaction removal
    const reactionBtn = e.target.closest('.chat-msg-reaction');
    if (reactionBtn) {
      const bubble = reactionBtn.closest('.chat-msg-bubble');
      if (bubble && bubble.dataset.id) {
        const msgId = bubble.dataset.id;
        const myReactions = JSON.parse(localStorage.getItem('hd_my_reactions') || '[]');
        if (myReactions.includes(msgId)) {
          supabaseClient.from('messages').update({ reaction: null }).eq('id', msgId).then(() => {
            myReactions.splice(myReactions.indexOf(msgId), 1);
            localStorage.setItem('hd_my_reactions', JSON.stringify(myReactions));
          });
        } else {
          let emoji = reactionBtn.textContent.trim().split(' ')[0];
          if (reactionBtn.childNodes.length > 0) {
            emoji = reactionBtn.childNodes[0].nodeValue.trim();
          }
          supabaseClient.from('messages').update({ reaction: emoji }).eq('id', msgId).then(() => {
            myReactions.push(msgId);
            localStorage.setItem('hd_my_reactions', JSON.stringify(myReactions));
          });
        }
      }
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
      preview.innerHTML = `
        <div class="chat-msg-reply" style="margin:0 10px 5px; display:flex; justify-content:space-between; align-items:center;">
          <div><span style="font-weight:bold; color:var(--primary);">Replying to:</span> ${window.chatSanitize(contextMsgText)}</div>
          <i class="ph ph-x" style="cursor:pointer;" onclick="this.parentElement.parentElement.remove(); window.chatClearReply();"></i>
        </div>`;
      inputArea.insertBefore(preview, inputArea.firstChild);
      
      chatInput.focus();
      ctxMenu.style.display = 'none';
    });

    document.getElementById('chat-ctx-fav').addEventListener('click', () => {
      const favs = JSON.parse(localStorage.getItem('hd_fav_msgs') || '[]');
      if (!favs.includes(contextMsgId)) {
        favs.push(contextMsgId);
        if (window.showToast) window.showToast('Pesan ditambahkan ke favorit', 'success');
      } else {
        favs.splice(favs.indexOf(contextMsgId), 1);
        if (window.showToast) window.showToast('Pesan dihapus dari favorit', 'info');
      }
      localStorage.setItem('hd_fav_msgs', JSON.stringify(favs));
      
      // Update DOM visually without reloading
      const bubble = document.querySelector(`.chat-msg-bubble[data-id="${contextMsgId}"]`);
      if (bubble) {
        let favIcon = bubble.querySelector('.chat-msg-fav-icon');
        if (favs.includes(contextMsgId)) {
          if (!favIcon) {
            const timeContainer = bubble.querySelector('.chat-msg-time-container');
            if (timeContainer) {
              const timeSpan = timeContainer.querySelector('.chat-msg-time');
              if (timeSpan) {
                timeSpan.insertAdjacentHTML('afterend', '<i class="ph-fill ph-star chat-msg-fav-icon"></i>');
              }
            }
          }
        } else if (favIcon) {
          favIcon.remove();
        }
      }
      ctxMenu.style.display = 'none';
    });

    const btnCopy = document.getElementById('chat-ctx-copy');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(contextMsgText).then(() => {
          if (window.showToast) window.showToast('Teks disalin ke clipboard', 'success');
        });
        ctxMenu.style.display = 'none';
      });
    }

    const btnEdit = document.getElementById('chat-ctx-edit');
    if (btnEdit) {
      btnEdit.addEventListener('click', () => {
        editingMsgId = contextMsgId;
        chatInput.value = contextMsgText;
        chatInput.focus();
        
        // Show edit preview above input
        document.querySelectorAll('.chat-reply-preview').forEach(el => el.remove());
        const preview = document.createElement('div');
        preview.className = 'chat-reply-preview';
        preview.innerHTML = `
          <div class="chat-msg-reply" style="margin:0 10px 5px; display:flex; justify-content:space-between; align-items:center;">
            <div><span style="font-weight:bold; color:var(--chat-primary);">Mengedit pesan:</span> ${window.chatSanitize(contextMsgText)}</div>
            <i class="ph ph-x" style="cursor:pointer;" onclick="this.parentElement.parentElement.remove(); editingMsgId = null; chatInput.value='';"></i>
          </div>`;
        inputArea.insertBefore(preview, inputArea.firstChild);
        
        ctxMenu.style.display = 'none';
      });
    }

    const reactions = ctxMenu.querySelector('.chat-ctx-reactions');
    if (reactions) {
      reactions.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && contextMsgId && chatId) {
          const emoji = e.target.textContent;
          const bubble = document.querySelector(`.chat-msg-bubble[data-id="${contextMsgId}"]`);
          const currentReaction = bubble ? bubble.querySelector('.chat-msg-reaction') : null;
          const myReactions = JSON.parse(localStorage.getItem('hd_my_reactions') || '[]');
          
          if (currentReaction && currentReaction.textContent.includes(emoji)) {
            supabaseClient.from('messages').update({ reaction: null }).eq('id', contextMsgId).then(() => {
              const index = myReactions.indexOf(contextMsgId);
              if (index > -1) myReactions.splice(index, 1);
              localStorage.setItem('hd_my_reactions', JSON.stringify(myReactions));
            });
          } else {
            supabaseClient.from('messages').update({ reaction: emoji }).eq('id', contextMsgId).then(() => {
              if (!myReactions.includes(contextMsgId)) myReactions.push(contextMsgId);
              localStorage.setItem('hd_my_reactions', JSON.stringify(myReactions));
            });
          }
          ctxMenu.style.display = 'none';
        }
      });
    }
  }

})();
