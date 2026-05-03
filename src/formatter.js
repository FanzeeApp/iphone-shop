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
  const { model, memory, battery, region, status, imei, price, system } = product;
  const lines = [];

  const fullModel = formatModel(model, system);
  if (fullModel) lines.push(`📱 <b>${esc(fullModel)}</b>`);
  if (memory) lines.push(`🧠 ${esc(memory)}`);
  if (battery) lines.push(`🔋 ${esc(formatBattery(battery))}`);
  if (region) lines.push(`🌏 ${esc(region)}`);
  if (status) lines.push(`📦 ${esc(status)}`);
  if (system === 'apple') lines.push('🍎 Apple iOS');
  else if (system === 'android') lines.push('🤖 Android');

  if (imei) {
    lines.push('');
    lines.push(`🔐 IMEI: <code>${esc(imei)}</code>`);
  }

  if (price) {
    lines.push('');
    lines.push(`💵 <b>Narxi: ${fmtMoney(price)}$</b>`);

    const calc = calculatePlan(price, settings);
    lines.push('');
    lines.push('⏰ <b>Nasiya:</b>');
    lines.push(`▫️ Bosh to'lov: <b>${fmtMoney(calc.initial)}$</b>`);
    lines.push(`▫️ 3 oy: <b>${fmtMoney(calc.plans[3])}$</b> dan`);
    lines.push(`▫️ 6 oy: <b>${fmtMoney(calc.plans[6])}$</b> dan`);
    lines.push(`▫️ 9 oy: <b>${fmtMoney(calc.plans[9])}$</b> dan`);
    lines.push(`▫️ 12 oy: <b>${fmtMoney(calc.plans[12])}$</b> dan`);

    if (calc.noInitial12 > 0) {
      lines.push('');
      lines.push(`💎 <b>12 oy (boshlang'ichsiz): ${fmtMoney(calc.noInitial12)}$</b> dan`);
    }
  }

  // Footer (configurable)
  const footerText = String(settings.footer_text || '').trim();
  const address = String(settings.address || '').trim();
  const phone1 = String(settings.phone1 || '').trim();
  const phone2 = String(settings.phone2 || '').trim();
  const tgUrl = String(settings.telegram_url || '').trim();
  const igUrl = String(settings.instagram_url || '').trim();

  const hasFooter = footerText || address || phone1 || phone2 || tgUrl || igUrl;
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

  if (phone1 || phone2) {
    lines.push('');
    lines.push('📞 <b>Bog\'lanish:</b>');
    if (phone1) lines.push(`   ${telLink(phone1)}`);
    if (phone2) lines.push(`   ${telLink(phone2)}`);
  }

  const links = [];
  if (igUrl) links.push(`<a href="${esc(igUrl)}">📷 Instagram</a>`);
  if (tgUrl) links.push(`<a href="${esc(tgUrl)}">💬 Telegram</a>`);
  if (links.length) {
    lines.push('');
    lines.push(links.join(' | '));
  }

  if (hasFooter) {
    lines.push('');
    lines.push('✅ <i>Ishonch sizdan, kafolat bizdan!</i>');
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = { buildCaption };
