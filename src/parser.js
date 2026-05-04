function pickLine(text, regex) {
  const m = text.match(regex);
  return m ? m[1].trim() : '';
}

function parseProductText(raw) {
  if (!raw) return {};
  const text = String(raw);

  const model =
    pickLine(text, /📱\s*#?\s*([^\n\r]+)/i) ||
    pickLine(text, /(?:model|модель)\s*[:\-]\s*([^\n\r]+)/i);

  const memory =
    pickLine(text, /🧠\s*([^\n\r]+)/i) ||
    pickLine(text, /(\d+\s*(?:GB|TB|ГБ|ТБ))/i);

  const batteryRaw =
    pickLine(text, /🔋\s*([^\n\r]+)/i) ||
    pickLine(text, /(?:battery|аккум|батарея)\s*[:\-]\s*([^\n\r]+)/i);
  const batteryMatch = batteryRaw ? batteryRaw.match(/(\d+)/) : null;
  const battery = batteryMatch ? batteryMatch[1] : '';

  const region =
    pickLine(text, /🌏\s*([^\n\r]+)/i) ||
    pickLine(text, /🌍\s*([^\n\r]+)/i) ||
    pickLine(text, /🌎\s*([^\n\r]+)/i) ||
    pickLine(text, /(?:region|регион)\s*[:\-]\s*([^\n\r]+)/i);

  const status =
    pickLine(text, /📦\s*([^\n\r]+)/i) ||
    pickLine(text, /(?:karobka|короб|box)\s*[:\-]?\s*([^\n\r]+)/i);

  const imei = pickLine(text, /imei\s*[:\-]?\s*([0-9]{4,})/i);

  let condition = '';
  if (/\b(yangi|new|новы)/i.test(text)) condition = 'Yangi';
  else if (/\b(yaxshi|good|хорошо|норм)/i.test(text)) condition = 'Yaxshi';
  else if (/\b(a.?lo|excellent|отличн)/i.test(text)) condition = "A'lo";

  const priceRaw =
    pickLine(text, /(?:narxi|narx|цена|price)\s*[:\-]?\s*([\d\s.,]+)/i) ||
    pickLine(text, /([\d\s.,]+)\s*(?:\$|💵|usd)/i);
  const price = priceRaw ? Number(priceRaw.replace(/[^\d.]/g, '').replace(/\.(?=\d{3})/g, '')) || '' : '';

  return {
    model: model.replace(/^#/, '').trim(),
    memory,
    battery,
    region,
    status,
    condition,
    imei,
    price: price ? String(Math.round(price)) : '',
  };
}

module.exports = { parseProductText };
