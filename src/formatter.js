const { calculatePlan } = require('./calculator');

function fmtMoney(n) {
  return Number(n).toLocaleString('en-US');
}

function buildCaption(product, settings) {
  const { model, memory, battery, region, status, imei, price, system } = product;
  const lines = [];

  if (model) lines.push(`📱 #${String(model).replace(/^#/, '').replace(/\s+/g, '')}`);
  if (memory) lines.push(`🧠 ${memory}`);
  if (battery) lines.push(`🔋 ${battery}`);
  if (region) lines.push(`🌏 ${region}`);
  if (status) lines.push(`📦 ${status}`);
  if (system) lines.push(`${system === 'apple' ? '🍎 Apple (iOS)' : '🤖 Android'}`);
  lines.push('');
  if (imei) lines.push(`IMEI: ${imei}`);
  lines.push('');
  if (price) lines.push(`Narxi: ${fmtMoney(price)}$ 💵`);

  if (price) {
    const calc = calculatePlan(price, settings);
    lines.push('');
    lines.push('💰 To‘lov rejasi:');
    lines.push(`Bosh to‘lov: ${fmtMoney(calc.initial)}$`);
    lines.push(`3 oy: ${fmtMoney(calc.plans[3])}$ dan`);
    lines.push(`6 oy: ${fmtMoney(calc.plans[6])}$ dan`);
    lines.push(`9 oy: ${fmtMoney(calc.plans[9])}$ dan`);
    lines.push(`12 oy: ${fmtMoney(calc.plans[12])}$ dan`);
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = { buildCaption };
