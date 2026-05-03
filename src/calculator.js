function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function calculatePlan(price, settings) {
  const p = num(price, 0);
  const initialPercent = num(settings.initial_percent, 50);
  const minInitial = num(settings.min_initial, 0);

  const initial = Math.max(Math.round((p * initialPercent) / 100), minInitial);
  const financed = Math.max(p - initial, 0);

  const months = [3, 6, 9, 12];
  const plans = {};
  for (const m of months) {
    const markup = num(settings[`markup_${m}`], 0);
    const monthly = financed === 0 ? 0 : Math.ceil((financed * (100 + markup)) / 100 / m);
    plans[m] = monthly;
  }

  return { initial, financed, plans };
}

module.exports = { calculatePlan };
