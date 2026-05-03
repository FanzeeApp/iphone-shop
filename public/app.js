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
  for (let i = 0; i < PHOTO_COUNT; i++) {
    const slot = document.createElement('label');
    slot.className = 'slot' + (i === 0 ? ' required' : '');
    slot.innerHTML = `
      <span class="placeholder">${i === 0 ? '+ Asosiy *' : '+ Rasm'}</span>
      ${i === 0 ? '<span class="badge">1</span>' : ''}
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
        const ph = document.createElement('span');
        ph.className = 'placeholder';
        ph.textContent = i === 0 ? '+ Asosiy *' : '+ Rasm';
        slot.insertBefore(ph, slot.firstChild);
      }
    });
    photosEl.appendChild(slot);
  }

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
        $('#preview').textContent = caption || '…';
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
    btn.textContent = 'Yuborilmoqda…';
    try {
      await api('/publish', { method: 'POST', body: fd });
      toast('✅ Kanalga yuborildi', 'success');
      haptic('medium');
      tg?.HapticFeedback?.notificationOccurred?.('success');
      // Reset form
      fields.forEach((f) => ($('#f_' + f).value = ''));
      $('#autoText').value = '';
      photoFiles.fill(null);
      photosEl.innerHTML = '';
      photosEl.parentElement.replaceChild(photosEl.cloneNode(true), photosEl);
      // simpler: reload page after short delay
      setTimeout(() => location.reload(), 800);
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
  async function loadSettings() {
    try {
      settings = await api('/settings');
      const map = {
        s_initial_percent: 'initial_percent',
        s_min_initial: 'min_initial',
        s_markup_3: 'markup_3',
        s_markup_6: 'markup_6',
        s_markup_9: 'markup_9',
        s_markup_12: 'markup_12',
        s_channel_id: 'channel_id',
      };
      for (const [id, key] of Object.entries(map)) {
        $('#' + id).value = settings[key] || '';
      }
      const ownerOnly = !me?.isOwner;
      $$('.owner-only').forEach((el) => el.classList.toggle('hidden', !ownerOnly));
      $('#saveSettingsBtn').disabled = ownerOnly;
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  $('#saveSettingsBtn').addEventListener('click', async () => {
    const body = {
      initial_percent: $('#s_initial_percent').value,
      min_initial: $('#s_min_initial').value,
      markup_3: $('#s_markup_3').value,
      markup_6: $('#s_markup_6').value,
      markup_9: $('#s_markup_9').value,
      markup_12: $('#s_markup_12').value,
      channel_id: $('#s_channel_id').value,
    };
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
        row.innerHTML = `
          <div class="info">
            <b>${a.full_name || a.username || a.telegram_id}</b>
            <small>${a.username ? '@' + a.username + ' · ' : ''}ID: ${a.telegram_id}</small>
          </div>
          ${
            isOwner
              ? '<span class="badge">OWNER</span>'
              : me?.isOwner
                ? `<button class="rm-btn" data-id="${a.telegram_id}">🗑</button>`
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
      const canAdd = me?.isOwner;
      $('#addAdminBtn').disabled = !canAdd;
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
