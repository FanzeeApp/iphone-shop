(() => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('secondary_bg_color');
    try { tg.enableClosingConfirmation?.(); } catch {}
  }

  const initData = tg?.initData || '';
  let me = null;
  let settings = {};
  let activeTab = 'post';

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
  function hapticNotify(type) {
    try { tg?.HapticFeedback?.notificationOccurred?.(type); } catch {}
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

  // ---------- theme ----------
  const stored = localStorage.getItem('theme');
  const initialTheme = stored === 'light' || stored === 'dark'
    ? stored
    : (tg?.colorScheme === 'light' ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', initialTheme);

  $('#themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    haptic('light');
  });

  // ---------- segmented helper ----------
  function setupSegment(container, attr, onChange) {
    const buttons = container.querySelectorAll('.seg-btn');
    buttons.forEach((b) =>
      b.addEventListener('click', (e) => {
        e.preventDefault();
        const isAlready = b.classList.contains('active');
        buttons.forEach((x) => x.classList.toggle('active', x === b));
        onChange?.(b.dataset[attr], isAlready);
        haptic('light');
      })
    );
    return {
      get: () => container.querySelector('.seg-btn.active')?.dataset[attr] || '',
      set: (val) => {
        let found = false;
        buttons.forEach((b) => {
          const match = b.dataset[attr] === val;
          b.classList.toggle('active', match);
          if (match) found = true;
        });
        return found;
      },
      clear: () => buttons.forEach((b) => b.classList.remove('active')),
    };
  }

  // ---------- segments ----------
  const osSeg = setupSegment($('#osSeg'), 'os', () => updatePreview());
  osSeg.set('apple');
  const memSeg = setupSegment($('#memSeg'), 'mem', () => updatePreview());
  const statusSeg = setupSegment($('#statusSeg'), 'status', () => updatePreview());
  const conditionSeg = setupSegment($('#conditionSeg'), 'condition', () => updatePreview());

  // ---------- form fields ----------
  const fields = ['model', 'battery', 'region', 'imei', 'price'];
  fields.forEach((f) => {
    const el = $('#f_' + f);
    el.addEventListener('input', () => {
      el.classList.remove('invalid');
      updatePreview();
    });
  });

  function getProduct() {
    const obj = { system: osSeg.get() || 'apple' };
    fields.forEach((f) => (obj[f] = $('#f_' + f).value.trim()));
    obj.memory = memSeg.get();
    obj.status = statusSeg.get();
    obj.condition = conditionSeg.get();
    return obj;
  }

  function validateForm() {
    const product = getProduct();
    let firstInvalid = null;
    const required = [
      ['model', $('#f_model'), 'Model'],
      ['price', $('#f_price'), 'Narx'],
    ];
    for (const [key, el, label] of required) {
      if (!product[key]) {
        el.classList.add('invalid');
        if (!firstInvalid) firstInvalid = label;
      } else {
        el.classList.remove('invalid');
      }
    }
    if (!photoFiles[0]) {
      const slot0 = document.querySelector('.slot.required');
      slot0?.classList.add('invalid');
      if (!firstInvalid) firstInvalid = 'Asosiy rasm';
    }
    return { valid: !firstInvalid, message: firstInvalid && `${firstInvalid} majburiy` };
  }

  // ---------- auto-parse ----------
  $('#parseBtn').addEventListener('click', async () => {
    const text = $('#autoText').value.trim();
    if (!text) return toast('Avval matnni qo\'ying', 'error');
    try {
      const parsed = await api('/parse', { method: 'POST', body: { text } });
      ['model', 'battery', 'region', 'imei', 'price'].forEach((f) => {
        if (parsed[f]) $('#f_' + f).value = parsed[f];
      });
      if (parsed.memory) {
        const normalized = String(parsed.memory).toUpperCase().replace(/\s+/g, '');
        memSeg.set(normalized) || memSeg.set(normalized + 'GB');
      }
      if (parsed.status) {
        const s = String(parsed.status).toLowerCase();
        if (s.includes('bor') || s.includes('есть') || s.includes('yes')) statusSeg.set('Bor');
        else if (s.includes('yo') || s.includes('нет') || s.includes('no')) statusSeg.set("Yo'q");
      }
      if (parsed.condition) conditionSeg.set(parsed.condition);
      updatePreview();
      toast('To\'ldirildi', 'success');
      hapticNotify('success');
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
      const ph = i === 0 ? '+ Asosiy' : '+ Rasm';
      slot.innerHTML = `
        <span class="placeholder">${ph}</span>
        <span class="badge"${i > 0 ? ' style="background:rgba(0,0,0,0.6);color:#fff"' : ''}>${i + 1}</span>
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
          slot.classList.remove('invalid');
        };
        reader.readAsDataURL(file);
        haptic('light');
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
        $('#preview').innerHTML = caption || '<span style="color:var(--hint)">Maydonlarni to\'ldiring…</span>';
      } catch { /* ignore */ }
    }, 200);
  }

  // ---------- publish ----------
  async function publish() {
    const v = validateForm();
    if (!v.valid) {
      toast('❌ ' + v.message, 'error');
      hapticNotify('error');
      return;
    }
    const product = getProduct();
    const fd = new FormData();
    fd.append('product', JSON.stringify(product));
    photoFiles.forEach((f) => f && fd.append('photos', f));

    setMainButtonLoading(true);
    const btn = $('#publishBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Yuborilmoqda…';
    try {
      await api('/publish', { method: 'POST', body: fd });
      toast('✅ Kanalga yuborildi', 'success');
      hapticNotify('success');
      // Reset form
      fields.forEach((f) => ($('#f_' + f).value = ''));
      $('#autoText').value = '';
      memSeg.clear();
      statusSeg.clear();
      conditionSeg.clear();
      photoFiles.fill(null);
      renderSlots();
      setTimeout(() => updatePreview(), 200);
    } catch (e) {
      toast('❌ ' + e.message, 'error');
      hapticNotify('error');
    } finally {
      setMainButtonLoading(false);
      btn.disabled = false;
      btn.textContent = '🚀 Kanalga yuborish';
    }
  }
  $('#publishBtn').addEventListener('click', publish);

  // ---------- alive check ----------
  $('#aliveBtn').addEventListener('click', async () => {
    try {
      await api('/check-alive', { method: 'POST' });
      toast('✅ Kanalga "Bot ishlayapti" yuborildi', 'success');
      hapticNotify('success');
    } catch (e) {
      toast('❌ ' + e.message, 'error');
    }
  });

  // ---------- settings ----------
  const SETTING_KEYS = [
    'initial_percent',
    'monthly_markup',
    'no_initial_markup',
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
      SETTING_KEYS.forEach((k) => {
        const el = $('#s_' + k);
        if (el) el.disabled = ownerOnly;
      });
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function saveSettings() {
    const body = {};
    SETTING_KEYS.forEach((k) => {
      const el = $('#s_' + k);
      if (el) body[k] = el.value;
    });
    try {
      setMainButtonLoading(true);
      await api('/settings', { method: 'POST', body });
      toast('✅ Saqlandi', 'success');
      hapticNotify('success');
      updatePreview();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setMainButtonLoading(false);
    }
  }
  $('#saveSettingsBtn').addEventListener('click', saveSettings);

  // ---------- admins ----------
  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

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
        const meta = [a.username ? '@' + a.username : null, 'ID: ' + a.telegram_id]
          .filter(Boolean).join(' · ');
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
      hapticNotify('success');
      loadAdmins();
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  // ---------- Telegram MainButton (native primary action) ----------
  function setMainButtonLoading(on) {
    if (!tg?.MainButton) return;
    if (on) tg.MainButton.showProgress?.(false);
    else tg.MainButton.hideProgress?.();
  }
  function configureMainButton() {
    if (!tg?.MainButton) return;
    const mb = tg.MainButton;
    mb.offClick(publish);
    mb.offClick(saveSettings);
    if (activeTab === 'post') {
      mb.setText('🚀 Kanalga yuborish');
      mb.show();
      mb.onClick(publish);
    } else if (activeTab === 'settings' && me?.isOwner) {
      mb.setText('💾 Sozlamalarni saqlash');
      mb.show();
      mb.onClick(saveSettings);
    } else {
      mb.hide();
    }
  }

  // ---------- tabs ----------
  $$('.tab').forEach((btn) =>
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      $$('.tab').forEach((b) => b.classList.toggle('active', b === btn));
      $$('.panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === activeTab));
      if (activeTab === 'settings') loadSettings();
      if (activeTab === 'admins') loadAdmins();
      configureMainButton();
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

  // ---------- bootstrap ----------
  (async () => {
    if (!initData) {
      toast('Mini App Telegram ichida ochilishi kerak', 'error');
      return;
    }
    try {
      me = await api('/me');
      updatePreview();
      configureMainButton();
    } catch (e) {
      toast('Ruxsat yo\'q. Egasi sizni admin sifatida qo\'shsin.', 'error');
    }
  })();
})();
