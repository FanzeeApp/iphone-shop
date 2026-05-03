(() => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('secondary_bg_color');
  }

  const initData = tg?.initData || '';
  let me = null;
  let settings = {};

  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function toast(msg, kind) {
    const el = $('#toast');
    el.textContent = msg;
    el.className = `toast show ${kind || ''}`;
    setTimeout(() => (el.className = 'toast'), 2400);
  }

  function haptic(type = 'light') {
    try { tg?.HapticFeedback?.impactOccurred?.(type); } catch {}
  }

  async function api(path, opts = {}) {
    const headers = { 'X-Telegram-Init-Data': initData, ...(opts.headers || {}) };
    if (opts.body && !(opts.body instanceof FormData) && typeof opts.body !== 'string') {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    const r = await fetch('/api' + path, { ...opts, headers });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'request_failed');
    return data;
  }

  // ---------- tabs ----------
  $$('.tab').forEach((btn) =>
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      $$('.tab').forEach((b) => b.classList.toggle('active', b === btn));
      $$('.panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === tab));
      if (tab === 'settings') loadSettings();
      if (tab === 'admins') loadAdmins();
      haptic('light');
      window.scrollTo(0, 0);
    })
  );

  const params = new URLSearchParams(location.search);
  const initialTab = params.get('tab');
  if (initialTab) {
    const btn = document.querySelector(`.tab[data-tab="${initialTab}"]`);
    btn?.click();
  }

  // ---------- OS segment ----------
  let osValue = 'apple';
  $$('.seg-btn').forEach((b) =>
    b.addEventListener('click', () => {
      $$('.seg-btn').forEach((x) => x.classList.toggle('active', x === b));
      osValue = b.dataset.os;
      updatePreview();
      haptic('light');
    })
  );

  // ---------- form fields ----------
  const fields = ['model', 'memory', 'battery', 'region', 'status', 'imei', 'price'];
  fields.forEach((f) => $('#f_' + f).addEventListener('input', updatePreview));

  function getProduct() {
    const obj = { system: osValue };
    fields.forEach((f) => (obj[f] = $('#f_' + f).value.trim()));
    return obj;
  }

  // ---------- auto-parse ----------
  $('#parseBtn').addEventListener('click', async () => {
    const text = $('#autoText').value.trim();
    if (!text) return toast('Avval matnni qo\'ying', 'error');
    try {
      const parsed = await api('/parse', { method: 'POST', body: { text } });
      fields.forEach((f) => {
        if (parsed[f]) $('#f_' + f).value = parsed[f];
      });
      updatePreview();
      toast('To\'ldirildi', 'success');
      haptic('medium');
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  // ---------- photos ----------
  const PHOTO_COUNT = 6;
  const photoFiles = new Array(PHOTO_COUNT).fill(null);
  const photosEl = $('#photos');
  function renderSlots() {
    photosEl.innerHTML = '';
    for (let i = 0; i < PHOTO_COUNT; i++) {
      const slot = document.createElement('label');
      slot.className = 'slot' + (i === 0 ? ' required' : '');
      const ph = i === 0 ? '+ Asosiy *' : '+ Rasm';
      slot.innerHTML = `
        <span class="placeholder">${ph}</span>
        ${i === 0 ? '<span class="badge">1</span>' : `<span class="badge" style="background:rgba(0,0,0,0.5);color:#fff">${i + 1}</span>`}
        <input type="file" accept="image/*" />
        <button type="button" class="remove">×</button>
      `;
      const input = slot.querySelector('input');
      const removeBtn = slot.querySelector('.remove');
      input.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        photoFiles[i] = file;
        const reader = new FileReader();
        reader.onload = () => {
          slot.querySelector('.placeholder')?.remove();
          let img = slot.querySelector('img');
          if (!img) {
            img = document.createElement('img');
            slot.insertBefore(img, slot.firstChild);
          }
          img.src = reader.result;
          slot.classList.add('has-image');
        };
        reader.readAsDataURL(file);
      });
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        photoFiles[i] = null;
        input.value = '';
        slot.querySelector('img')?.remove();
        slot.classList.remove('has-image');
        if (!slot.querySelector('.placeholder')) {
          const span = document.createElement('span');
          span.className = 'placeholder';
          span.textContent = ph;
          slot.insertBefore(span, slot.firstChild);
        }
      });
      photosEl.appendChild(slot);
    }
  }
  renderSlots();

  // ---------- preview ----------
  let previewTimer = null;
  function updatePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(async () => {
      try {
        const { caption } = await api('/preview', {
          method: 'POST',
          body: { product: getProduct() },
        });
        // The caption is HTML — render it safely as innerHTML in the preview pane
        // (server is trusted; user input is escaped on the server).
        $('#preview').innerHTML = caption || '<span style="color:var(--hint)">Maydonlarni to\'ldiring…</span>';
      } catch {
        // ignore
      }
    }, 200);
  }

  // ---------- publish ----------
  $('#publishBtn').addEventListener('click', async () => {
    const product = getProduct();
    if (!product.model) return toast('Model majburiy', 'error');
    if (!product.price) return toast('Narx majburiy', 'error');
    if (!photoFiles[0]) return toast('Asosiy rasm majburiy', 'error');

    const fd = new FormData();
    fd.append('product', JSON.stringify(product));
    photoFiles.forEach((f) => f && fd.append('photos', f));

    const btn = $('#publishBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Yuborilmoqda…';
    try {
      await api('/publish', { method: 'POST', body: fd });
      toast('✅ Kanalga yuborildi', 'success');
      haptic('medium');
      tg?.HapticFeedback?.notificationOccurred?.('success');
      fields.forEach((f) => ($('#f_' + f).value = ''));
      $('#autoText').value = '';
      photoFiles.fill(null);
      renderSlots();
      setTimeout(() => updatePreview(), 200);
    } catch (e) {
      toast('❌ ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '🚀 Kanalga yuborish';
    }
  });

  // ---------- alive check ----------
  $('#aliveBtn').addEventListener('click', async () => {
    try {
      await api('/check-alive', { method: 'POST' });
      toast('✅ Kanalga "Bot ishlayapti" yuborildi', 'success');
      haptic('medium');
    } catch (e) {
      toast('❌ ' + e.message, 'error');
    }
  });

  // ---------- settings ----------
  const SETTING_KEYS = [
    'initial_percent',
    'monthly_markup',
    'min_initial',
    'address',
    'phone1',
    'phone2',
    'telegram_url',
    'instagram_url',
    'footer_text',
    'channel_id',
  ];

  async function loadSettings() {
    try {
      settings = await api('/settings');
      SETTING_KEYS.forEach((k) => {
        const el = $('#s_' + k);
        if (el) el.value = settings[k] || '';
      });
      const ownerOnly = !me?.isOwner;
      $$('.owner-only').forEach((el) => el.classList.toggle('hidden', !ownerOnly));
      $('#saveSettingsBtn').disabled = ownerOnly;
      // Disable inputs for non-owner
      SETTING_KEYS.forEach((k) => {
        const el = $('#s_' + k);
        if (el) el.disabled = ownerOnly;
      });
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  $('#saveSettingsBtn').addEventListener('click', async () => {
    const body = {};
    SETTING_KEYS.forEach((k) => {
      const el = $('#s_' + k);
      if (el) body[k] = el.value;
    });
    try {
      await api('/settings', { method: 'POST', body });
      toast('✅ Saqlandi', 'success');
      haptic('medium');
      updatePreview();
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  // ---------- admins ----------
  async function loadAdmins() {
    try {
      const { admins, ownerId } = await api('/admins');
      const list = $('#adminsList');
      list.innerHTML = '';
      admins.forEach((a) => {
        const isOwner = a.telegram_id === ownerId;
        const row = document.createElement('div');
        row.className = 'row';
        const name = a.full_name || a.username || ('ID ' + a.telegram_id);
        const meta = [
          a.username ? '@' + a.username : null,
          'ID: ' + a.telegram_id,
        ].filter(Boolean).join(' · ');
        row.innerHTML = `
          <div class="info">
            <b>${escapeHtml(name)}</b>
            <small>${escapeHtml(meta)}</small>
          </div>
          ${
            isOwner
              ? '<span class="role-badge">OWNER</span>'
              : me?.isOwner
                ? `<button class="rm-btn" data-id="${a.telegram_id}" title="O'chirish">🗑</button>`
                : ''
          }
        `;
        list.appendChild(row);
      });
      list.querySelectorAll('.rm-btn').forEach((b) =>
        b.addEventListener('click', async () => {
          if (!confirm('Adminni o\'chirishni tasdiqlaysizmi?')) return;
          try {
            await api('/admins/' + b.dataset.id, { method: 'DELETE' });
            toast('O\'chirildi', 'success');
            loadAdmins();
          } catch (e) {
            toast(e.message, 'error');
          }
        })
      );
      $('#addAdminBtn').disabled = !me?.isOwner;
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  $('#addAdminBtn').addEventListener('click', async () => {
    const id = Number($('#a_id').value);
    if (!id) return toast('Telegram ID majburiy', 'error');
    try {
      await api('/admins', {
        method: 'POST',
        body: {
          telegram_id: id,
          username: $('#a_username').value.replace(/^@/, '').trim() || null,
          full_name: $('#a_name').value.trim() || null,
        },
      });
      $('#a_id').value = '';
      $('#a_username').value = '';
      $('#a_name').value = '';
      toast('✅ Qo\'shildi', 'success');
      loadAdmins();
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  // ---------- bootstrap ----------
  (async () => {
    if (!initData) {
      toast('Mini App Telegram ichida ochilishi kerak', 'error');
      return;
    }
    try {
      me = await api('/me');
      updatePreview();
    } catch (e) {
      toast('Ruxsat yo\'q. Egasi sizni admin sifatida qo\'shsin.', 'error');
    }
  })();
})();
