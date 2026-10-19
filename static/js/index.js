'use strict';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Animate once an element scrolls into view; progress runs 0 → 1 with an ease-out curve.
function animateOnView(el, draw, {threshold = 0.4, duration = 1400} = {}) {
  if (!el || reduceMotion || !('IntersectionObserver' in window)) return;
  draw(0);
  new IntersectionObserver((entries, observer) => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    const start = performance.now();
    const tick = now => {
      const progress = Math.min((now - start) / duration, 1);
      draw(1 - Math.pow(1 - progress, 3));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, {threshold}).observe(el);
}
const countUp = (label, eased) => {
  if (Number(label.dataset.value) === 0) return;
  label.textContent = `${(Number(label.dataset.value) * eased).toFixed(Number(label.dataset.digits))}${label.dataset.unit ?? ''}`;
};

// Qualitative GSM8K examples (Appendix J of the paper).
const examples = [
  {id: 652, gold: '75', problem: 'James hires a horse-drawn carriage from 5 PM to 9 PM. He gets 1 hour free. The first paid hour is $15 and each hour after that is twice the cost. How much did he pay?',
    lead: 'The baseline routes this arithmetic problem through two Programming Experts and an Inspector. PRISM assigns three Math Solvers.',
    base: {crew: ['Programming Expert', 'Inspector', 'Programming Expert'], answer: '105'},
    ours: {crew: ['Math Solver', 'Math Solver', 'Math Solver'], answer: '75'}},
  {id: 847, gold: '975', problem: 'Brenda invested $300 into a scheme that accumulates simple interest at the rate of three-quarters of the original amount per year. How much in total will she have after 3 years?',
    lead: 'The baseline uses three Inspectors and returns an answer an order of magnitude too large. PRISM replaces the middle Inspector with a Mathematical Analyst.',
    base: {crew: ['Inspector', 'Inspector', 'Inspector'], answer: '10298.44'},
    ours: {crew: ['Inspector', 'Mathematical Analyst', 'Inspector'], answer: '975'}},
  {id: 1312, gold: '180', problem: 'Tom’s restaurant gets 6 reservations a night. They normally order 2 meals that cost $5 each and a $5 bottle of wine. How much do they make a week if they are open 2 days a week?',
    lead: 'The baseline’s logged reasoning drops the six reservations and prices a single one. PRISM’s Math Solvers keep every step: 6 × $15 = $90 a night, then $90 × 2 = $180.',
    base: {crew: ['Inspector', 'Inspector', 'Inspector'], answer: '30'},
    ours: {crew: ['Math Solver', 'Math Solver', 'Math Solver'], answer: '180'}},
  {id: 763, gold: '100', problem: 'Rob, Royce, and Pedro are contractors getting ready to put a new roof on three homes. If the three homes will need 250 cases of shingles, with the first house needing 1/2 of the second, and the third needing double the first. How many cases of shingles will the third house need?',
    lead: 'The baseline sets up the wrong equation (x + x/2 + 2x = 250) and rounds 142.86 to 143. PRISM recovers 50, 100 and 100 cases for the three houses.',
    base: {crew: ['Programming Expert', 'Inspector', 'Programming Expert'], answer: '143'},
    ours: {crew: ['Math Solver', 'Math Solver'], answer: '100'}},
  {id: 322, gold: '9', problem: 'Jam has three boxes full of pencils and 2 loose pencils which give a total of 26 pencils. If her sister, Meg, has 46 pencils, how many boxes do Jam and Meg need to store all their pencils?',
    lead: 'The baseline builds the same role composition it used for Problems 652 and 763. PRISM builds a mixed crew.',
    base: {crew: ['Programming Expert', 'Inspector', 'Programming Expert'], answer: '8'},
    ours: {crew: ['Inspector', 'Mathematical Analyst', 'Math Solver'], answer: '9'}},
  {id: 664, gold: '32', problem: 'John decides to take a cooking class. The class meets 4 times a week for 2 hours each time for 6 weeks. If he learns a new recipe for every 1.5 hours of class time, how many recipes does he learn?',
    lead: 'The baseline again uses three Inspectors and returns the total class time in hours instead of the number of recipes.',
    base: {crew: ['Inspector', 'Inspector', 'Inspector'], answer: '48'},
    ours: {crew: ['Inspector', 'Programming Expert', 'Math Solver'], answer: '32'}}
];
const exampleSlides = document.querySelector('#example-slides');
if (exampleSlides) {
  const crewHtml = crew => crew.map(role => `<span class="role">${role}</span>`).join('<span class="arrow" aria-label="then">→</span>');
  exampleSlides.innerHTML = examples.map((ex, i) => `
    <div class="result-slide" data-slide${i ? ' hidden' : ''}>
      <article class="example-card">
        <div class="example-head"><h3>Example ${i + 1}: GSM8K problem ${ex.id}</h3><span class="gold">Gold answer: ${ex.gold}</span></div>
        <p class="problem">${ex.problem}</p>
        <p class="example-lead">${ex.lead}</p>
        <div class="designer-row"><span class="who">ARG-Designer</span><div class="crew">${crewHtml(ex.base.crew)}</div><span class="answer wrong">${ex.base.answer} ✗</span></div>
        <div class="designer-row ours"><span class="who">PRISM (Ours)</span><div class="crew">${crewHtml(ex.ours.crew)}</div><span class="answer right">${ex.ours.answer} ✓</span></div>
      </article>
    </div>`).join('');
  document.querySelector('#example-dots').innerHTML = examples.map((ex, i) =>
    `<button type="button" class="video-dot" data-dot aria-label="Example ${i + 1}" aria-pressed="${i === 0}"></button>`).join('');
}

// Carousels: results tables and qualitative examples.
document.querySelectorAll('[data-carousel]').forEach(carousel => {
  const slides = carousel.querySelectorAll('[data-slide]');
  const dots = carousel.querySelectorAll('[data-dot]');
  let index = 0;
  const show = next => {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== index; });
    dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === index)));
  };
  carousel.querySelector('[data-prev]').addEventListener('click', () => show(index - 1));
  carousel.querySelector('[data-next]').addEventListener('click', () => show(index + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
});

document.querySelector('#copy-citation')?.addEventListener('click', async () => {
  const citation = document.querySelector('#citation');
  const status = document.querySelector('#copy-status');
  try {
    await navigator.clipboard.writeText(citation.textContent);
    status.textContent = 'Citation copied.';
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(citation);
    selection.removeAllRanges();
    selection.addRange(range);
    status.textContent = 'Citation selected. Press Ctrl+C or ⌘C to copy.';
  }
});

// Horizontal bars grow from zero, with their values counting up.
document.querySelectorAll('.time-chart').forEach(chart => {
  const bars = chart.querySelectorAll('.time-bar');
  const values = chart.querySelectorAll('.time-value[data-value]');
  animateOnView(chart, eased => {
    bars.forEach(bar => { bar.style.transform = `scaleX(${eased})`; });
    values.forEach(value => countUp(value, eased));
  }, {threshold: 0.5});
});

// Vertical bars grow from the baseline.
document.querySelectorAll('.real-chart').forEach(chart => {
  const cols = chart.querySelectorAll('.rbar-col');
  const labels = chart.querySelectorAll('.rbar-value');
  animateOnView(chart, eased => {
    cols.forEach(col => { col.style.transform = `scaleY(${eased})`; });
    labels.forEach(label => countUp(label, eased));
  });
});

// Controls and ablations (Figures 2, 3 and 5 of the paper), redrawn as grouped bars.
const benchmarks = ['GSM8K', 'MultiArith', 'SVAMP', 'AQuA', 'HumanEval', 'MMLU'];
const greys = ['#d3d7de', '#aab1bd', '#7f8795'];
const ablations = [
  {note: 'Only the Stage-2 teacher differs. <strong>Constant</strong> keeps on-policy distillation but fixes the privileged input; <strong>shuffled</strong> shows another query’s graph. PRISM beats the constant teacher on all six benchmarks (+1.66 on average), so the sibling’s content matters beyond the procedure.',
    series: [
      {name: 'none (SFT)', values: [86.13, 98.83, 92.40, 62.60, 80.49, 73.22]},
      {name: 'shuffled', values: [85.44, 96.33, 91.10, 71.26, 79.88, 71.46]},
      {name: 'constant', values: [86.66, 98.83, 92.20, 71.65, 81.71, 72.11]},
      {name: 'real sibling (PRISM)', ours: true, values: [88.02, 99.17, 93.30, 76.38, 82.32, 73.94]}
    ]},
  {note: 'What the teacher sees besides the query: question and solution as one string (<strong>context</strong>), the worked solution, tests or correct option (<strong>rationale</strong>), statistics of the solved set (<strong>graph stats</strong>), or another verified graph (<strong>sibling graph</strong>). The sibling graph is best on all six benchmarks.',
    series: [
      {name: 'context', values: [82.18, 89.17, 90.10, 61.42, 71.95, 60.16]},
      {name: 'rationale', values: [84.23, 94.17, 91.50, 61.42, 73.17, 62.77]},
      {name: 'graph stats', values: [84.76, 92.50, 87.60, 60.24, 77.44, 70.28]},
      {name: 'sibling graph (PRISM)', ours: true, values: [88.02, 99.17, 93.30, 76.38, 82.32, 73.94]}
    ]},
  {note: 'Divergence objective, with the channel fixed to the sibling graph. Mode-seeking <strong>reverse KL</strong> is best on average (85.52 vs. 84.85 and 83.90) and on every math benchmark. Forward KL edges ahead only on HumanEval and MMLU.',
    series: [
      {name: 'JSD (β = 0.5)', values: [85.22, 99.00, 90.30, 75.98, 81.71, 71.20]},
      {name: 'forward KL', values: [86.13, 99.00, 91.20, 75.59, 82.93, 74.27]},
      {name: 'reverse KL (PRISM)', ours: true, values: [88.02, 99.17, 93.30, 76.38, 82.32, 73.94]}
    ]}
];
const ablationChart = document.querySelector('#ablation-chart');
if (ablationChart) {
  const W = 900, H = 330, M = {top: 16, right: 10, bottom: 34, left: 44};
  const yMin = 50, yMax = 100, yTicks = [50, 60, 70, 80, 90, 100];
  const yOf = v => M.top + (1 - (v - yMin) / (yMax - yMin)) * (H - M.top - M.bottom);
  const groupW = (W - M.left - M.right) / benchmarks.length;
  const colorOf = (series, k) => series.ours ? 'var(--accent)' : greys[k] ?? greys[0];
  let drawn = reduceMotion || !('IntersectionObserver' in window);
  const render = index => {
    const panel = ablations[index];
    const n = panel.series.length, barW = Math.min(30, (groupW - 28) / n);
    document.querySelector('#ablation-note').innerHTML = panel.note;
    document.querySelector('#ablation-legend').innerHTML = panel.series.map((s, k) =>
      `<li${s.ours ? ' class="ours"' : ''}><span class="swatch" style="background:${colorOf(s, k)}"></span>${s.name}</li>`).join('');
    const grid = yTicks.map(t => `<line class="perf-grid" x1="${M.left}" x2="${W - M.right}" y1="${yOf(t)}" y2="${yOf(t)}"/><text class="perf-tick" x="${M.left - 8}" y="${yOf(t) + 4}" text-anchor="end">${t}</text>`).join('');
    const groups = benchmarks.map((b, i) => {
      const x0 = M.left + i * groupW + (groupW - n * barW - (n - 1) * 3) / 2;
      const bars = panel.series.map((s, k) => {
        const v = s.values[i], y = yOf(v);
        return `<rect class="gbar-bar" style="--c:${colorOf(s, k)}" x="${(x0 + k * (barW + 3)).toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${(H - M.bottom - y).toFixed(1)}" rx="2"/>`;
      }).join('');
      return `<g class="gbar-group" data-group="${i}">${bars}<text class="gbar-label" x="${M.left + (i + 0.5) * groupW}" y="${H - M.bottom + 20}" text-anchor="middle">${b}</text>
        <rect class="gbar-hit" x="${M.left + i * groupW}" y="${M.top}" width="${groupW}" height="${H - M.top - M.bottom + 24}"/></g>`;
    }).join('');
    ablationChart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grouped bar chart of accuracy per benchmark">
      ${grid}<line class="perf-axis-line" x1="${M.left}" x2="${W - M.right}" y1="${H - M.bottom}" y2="${H - M.bottom}"/>${groups}</svg>
      <div class="perf-tooltip" hidden></div>`;
    const svg = ablationChart.querySelector('svg'), tooltip = ablationChart.querySelector('.perf-tooltip');
    ablationChart.querySelectorAll('.gbar-group').forEach(g => {
      const i = Number(g.dataset.group);
      g.querySelector('.gbar-hit').addEventListener('pointerenter', () => {
        ablationChart.querySelectorAll('.gbar-group').forEach(o => o.classList.toggle('dim', o !== g));
        const best = Math.max(...panel.series.map(s => s.values[i]));
        tooltip.innerHTML = `<strong>${benchmarks[i]}</strong>` + panel.series.map((s, k) =>
          `<span${s.ours ? ' class="ours"' : ''}><i style="background:${colorOf(s, k)}"></i>${s.name}<b>${s.values[i].toFixed(2)}${s.values[i] === best ? ' ★' : ''}</b></span>`).join('');
        tooltip.hidden = false;
        const box = svg.getBoundingClientRect();
        const left = (M.left + (i + 0.5) * groupW) / W * box.width;
        tooltip.style.left = `${left}px`;
        tooltip.classList.toggle('flip', left > box.width * 0.6);
      });
    });
    svg.addEventListener('pointerleave', () => {
      tooltip.hidden = true;
      ablationChart.querySelectorAll('.gbar-group').forEach(o => o.classList.remove('dim'));
    });
    if (drawn) return;
    ablationChart.classList.add('gbar-pending');
  };
  render(0);
  document.querySelectorAll('[data-ablation]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-ablation]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    render(Number(button.dataset.ablation));
    if (drawn) {
      // Replay the grow-in for the newly selected comparison.
      ablationChart.classList.add('gbar-pending');
      ablationChart.getBoundingClientRect();
      if (!reduceMotion) requestAnimationFrame(() => ablationChart.classList.remove('gbar-pending'));
      else ablationChart.classList.remove('gbar-pending');
    }
  }));
  if (!drawn) {
    new IntersectionObserver((entries, observer) => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      drawn = true;
      requestAnimationFrame(() => ablationChart.classList.remove('gbar-pending'));
    }, {threshold: 0.35}).observe(ablationChart);
  }
}

// Section nav: highlight the section currently under the nav bar and keep its link in view.
const sectionNav = document.querySelector('.section-nav');
if (sectionNav) {
  const links = [...sectionNav.querySelectorAll('a')];
  const targets = links.map(a => document.querySelector(a.getAttribute('href')));
  let current = null;
  const update = () => {
    // a section counts as current once its top passes a quarter of the way down the viewport
    const line = sectionNav.offsetHeight + window.innerHeight * 0.25;
    let idx = -1;
    targets.forEach((el, i) => { if (el && el.getBoundingClientRect().top <= line) idx = i; });
    // at the very bottom, the last (short) section can never reach the line
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) idx = links.length - 1;
    const next = links[idx] || null;  // nothing is highlighted above the first section
    if (next === current) return;
    current?.classList.remove('active');
    current?.removeAttribute('aria-current');
    current = next;
    if (!current) return;
    current.classList.add('active');
    current.setAttribute('aria-current', 'true');
    const r = current.getBoundingClientRect(), n = sectionNav.getBoundingClientRect();
    if (r.left < n.left || r.right > n.right) sectionNav.scrollBy({left: r.left - n.left - (n.width - r.width) / 2, behavior: 'smooth'});
  };
  let queued = false;
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, {passive: true});
  window.addEventListener('resize', update);
  update();
}
