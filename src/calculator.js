function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function calculatePlan(price, settings) {
  const p = num(price, 0);
  const initialPercent = num(settings.initial_percent, 30);
  const monthlyMarkup = num(settings.monthly_markup, 5);
  const noInitialMarkup = num(settings.no_initial_markup, 70);
  const minInitial = num(settings.min_initial, 0);

  const initial = Math.max(Math.round((p * initialPercent) / 100), minInitial);
  const financed = Math.max(p - initial, 0);

  const months = [3, 6, 9, 12];
  const plans = {};
  for (const m of months) {
    if (financed <= 0) {
      plans[m] = 0;
      continue;
    }
    const total = financed * (1 + (monthlyMarkup * m) / 100);
    plans[m] = Math.ceil(total / m);
  }

  const noInitialTotal = p * (1 + noInitialMarkup / 100);
  const noInitial12 = p > 0 ? Math.ceil(noInitialTotal / 12) : 0;

  return { initial, financed, plans, noInitial12, monthlyMarkup, noInitialMarkup };
}

module.exports = { calculatePlan };
