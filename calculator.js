// Savings calculator. calculate() is pure so it can be tested without a browser (see test.mjs).
const num = v => { const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, '')); return Number.isFinite(n) ? n : 0; };

export function calculate(input) {
  const currentTotal = num(input.currentTms) + num(input.currentVisibility);
  const proposedTotal = num(input.newTms) + num(input.newVisibility);
  const monthlySavings = currentTotal - proposedTotal;
  const annualSavings = monthlySavings * 12;
  const firstYearNet = annualSavings - num(input.implementation);
  const percent = currentTotal > 0 ? (monthlySavings / currentTotal) * 100 : null;
  return { currentTotal, proposedTotal, monthlySavings, annualSavings, firstYearNet, percent };
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function init() {
  const root = document.getElementById('savingsCalculator');
  if (!root) return;
  const val = id => root.querySelector(`#${id}`).value;
  const out = (id, value, signed) => {
    const el = root.querySelector(`#${id}`);
    el.textContent = money.format(value);
    el.classList.toggle('neg', Boolean(signed) && value < 0);
  };
  const update = () => {
    const r = calculate({ currentTms: val('currentTms'), newTms: val('newTms'), currentVisibility: val('currentVisibility'), newVisibility: val('newVisibility'), implementation: val('implementation') });
    out('rCurrent', r.currentTotal); out('rNew', r.proposedTotal);
    out('rMonthly', r.monthlySavings, true); out('rAnnual', r.annualSavings, true); out('rFirstYear', r.firstYearNet, true);
    const pct = root.querySelector('#rPercent');
    pct.textContent = r.percent === null ? 'n/a' : `${r.percent.toFixed(1)}%`;
    pct.classList.toggle('neg', r.percent !== null && r.percent < 0);
    const msg = root.querySelector('#calcMsg');
    const cost = r.monthlySavings < 0;
    msg.classList.toggle('neg', cost);
    msg.textContent = cost ? 'With these numbers the proposed setup costs more each month than your current one.'
      : r.monthlySavings === 0 ? 'With these numbers monthly spending is unchanged.'
      : r.firstYearNet < 0 ? 'With these numbers the one-time cost is not recovered within the first year.' : '';
  };
  root.addEventListener('input', update);
  root.addEventListener('submit', e => e.preventDefault());
  update();
}
if (typeof document !== 'undefined') init();
