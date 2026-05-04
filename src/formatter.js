const { calculatePlan } = require('./calculator');

function fmtMoney(n) {
  return Number(n).toLocaleString('en-US');
}

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function telLink(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/[^\d+]/g, '');
  return `<a href="tel:${esc(digits)}">${esc(raw)}</a>`;
}

function formatModel(model, system) {
  const m = String(model || '').trim();
  if (!m) return '';
  if (system === 'apple' && !/^iphone/i.test(m)) {
    return `iPhone ${m}`;
  }
  return m;
}

function formatBattery(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/%/.test(s)) return s;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? `${n}%` : s;
}

function buildCaption(product, settings) {
  const { model, memory, battery, region, status, condition, imei, price, system, admin_fee } = product;
  const lines = [];

  const fullModel = formatModel(model, system);
  if (fullModel) lines.push(`📱 <b>${esc(fullModel)}</b>`);
  if (memory) lines.push(`🧠 ${esc(memory)}`);
  if (battery) lines.push(`🔋 ${esc(formatBattery(battery))}`);
  if (region) lines.push(`🌏 ${esc(region)}`);
  if (status) lines.push(`📦 Karobka: ${esc(status)}`);
  if (condition) {
    const ico = /a.?lo/i.test(condition) ? '🌟' : /yaxshi/i.test(condition) ? '👍' : '✨';
    lines.push(`${ico} Holati: ${esc(condition)}`);
  }

  if (imei) {
    lines.push('');
    lines.push(`🔐 IMEI: <code>${esc(imei)}</code>`);
  }

  if (price) {
    lines.push('');
    lines.push(`💵 <b>Narxi: ${fmtMoney(price)}$</b>`);

    const calc = calculatePlan(price, settings, { admin_fee });
    lines.push('');
    lines.push('⏰ <b>Nasiya:</b>');
    lines.push(`▫️ Bosh to'lov: <b>${fmtMoney(calc.initial)}$</b>`);
    lines.push(`▫️ 3 oy: <b>${fmtMoney(calc.plans[3])}$</b> dan`);
    lines.push(`▫️ 6 oy: <b>${fmtMoney(calc.plans[6])}$</b> dan`);
    lines.push(`▫️ 9 oy: <b>${fmtMoney(calc.plans[9])}$</b> dan`);
    lines.push(`▫️ 12 oy: <b>${fmtMoney(calc.plans[12])}$</b> dan`);

    if (calc.noInitial12 > 0) {
      lines.push('');
      lines.push(`💎 <b>12 oy (Boshlang'ich to'lovsiz): ${fmtMoney(calc.noInitial12)}$</b> dan`);
    }
  }

  // ----- Footer -----
  const footerText = String(settings.footer_text || '').trim();
  const tagline = String(settings.tagline || '').trim();
  const address = String(settings.address || '').trim();
  const addressFull = String(settings.address_full || '').trim();
  const phones = [settings.phone1, settings.phone2, settings.phone3]
    .map((p) => String(p || '').trim())
    .filter(Boolean);
  const workingHours = String(settings.working_hours || '').trim();
  const tgUrl = String(settings.telegram_url || '').trim();
  const igUrl = String(settings.instagram_url || '').trim();

  const hasFooter =
    footerText || tagline || address || addressFull ||
    phones.length || workingHours || tgUrl || igUrl;

  if (hasFooter) {
    lines.push('');
    lines.push('━━━━━━━━━━━━━━');
  }

  if (footerText) {
    lines.push('');
    lines.push(esc(footerText));
  }

  if (address) {
    lines.push('');
    lines.push(`📍 <b>Manzil:</b> ${esc(address)}`);
  }

  if (phones.length) {
    lines.push('');
    lines.push('📞 <b>To\'liq ma\'lumot:</b>');
    for (const phone of phones) {
      lines.push(`   ${telLink(phone)}`);
    }
  }

  if (tagline) {
    lines.push('');
    lines.push(`<i>${esc(tagline)}</i>`);
  }

  if (addressFull) {
    lines.push('');
    lines.push(`📍 ${esc(addressFull)}`);
  }

  if (workingHours) {
    lines.push('');
    lines.push(`🕐 <b>Ish vaqti:</b> ${esc(workingHours)}`);
  }

  const links = [];
  if (igUrl) links.push(`<a href="${esc(igUrl)}">📷 Instagram</a>`);
  if (tgUrl) links.push(`<a href="${esc(tgUrl)}">💬 Telegram</a>`);
  if (links.length) {
    lines.push('');
    lines.push(links.join('  |  '));
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = { buildCaption };
