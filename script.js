(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const els = {
    prev: $('btnPrev'), play: $('btnPlay'), next: $('btnNext'), reset: $('btnReset'),
    random: $('btnRandom'), size: $('size'), sizeVal: $('sizeVal'), speed: $('speed'), order: $('order'),
    form: $('customForm'), custom: $('customInput'), customError: $('customError'),
    scrub: $('scrub'), stepCount: $('stepCount'),
    explain: $('explain'), bars: $('bars'), merge: $('merge'), tree: $('tree'),
    code: $('code'), stack: $('stack'),
    cmp: $('statCmp'), writes: $('statWrites'), depth: $('statDepth'),
  };

  // Pseudocode shown on the page. Steps refer to these lines by 1-based number.
  const codeFor = (desc) => [
    'mergeSort(A, lo, hi):',
    '  if lo >= hi: return   // size 1',
    '  mid = floor((lo + hi) / 2)',
    '  mergeSort(A, lo, mid)      // left',
    '  mergeSort(A, mid + 1, hi)  // right',
    '  merge(A, lo, mid, hi)',
    '',
    'merge(A, lo, mid, hi):',
    '  L = A[lo..mid];  R = A[mid+1..hi]',
    '  i = 0;  j = 0;  k = lo',
    '  while i < len(L) and j < len(R):',
    `    if L[i] ${desc ? '>=' : '<='} R[j]: A[k] = L[i]; i++`,
    '    else:            A[k] = R[j]; j++',
    '    k++',
    '  copy whatever is left of L or R into A',
  ];

  const DELAYS = [1600, 1200, 900, 700, 520, 380, 260, 170, 100, 50];

  let input = [];
  let steps = [];
  let tree = { nodes: [], maxDepth: 0 };
  let cur = 0;
  let timer = null;
  let barEls = [];
  let nodeEls = new Map();
  let lineEls = [];

  // ---------- Step generation ----------

  const fmt = (arr) => '[' + arr.join(', ') + ']';
  const rng = (lo, hi) => `A[${lo}..${hi}]`;

  function buildTree(n) {
    const nodes = [];
    let maxDepth = 0;
    (function rec(lo, hi, d) {
      nodes.push({ lo, hi, d });
      maxDepth = Math.max(maxDepth, d);
      if (lo < hi) {
        const m = (lo + hi) >> 1;
        rec(lo, m, d + 1);
        rec(m + 1, hi, d + 1);
      }
    })(0, n - 1, 0);
    return { nodes, maxDepth };
  }

  // Runs merge sort once and records a snapshot for every teaching moment.
  function buildSteps(source, desc) {
    const a = source.slice();
    const orderName = desc ? 'descending' : 'ascending';
    // Ties go to L in both orders, which keeps the sort stable.
    const leftFirst = (x, y) => (desc ? x >= y : x <= y);
    const out = [];
    const status = {}; // "lo-hi" -> { s: 'active' | 'waiting' | 'sorted', v?: values }
    const stack = [];
    let comparisons = 0;
    let writes = 0;

    const snap = (o) => out.push({
      arr: a.slice(), status: { ...status }, stack: stack.slice(), comparisons, writes, ...o,
    });

    snap({
      phase: 'start', lines: [],
      msg: `Goal: sort <b>${fmt(a)}</b> in <b>${orderName}</b> order. Merge sort splits it in half again and again until every piece has one element, then merges the pieces back together in order.`,
    });

    function sort(lo, hi) {
      const key = lo + '-' + hi;
      stack.push({ lo, hi });
      if (lo >= hi) {
        status[key] = { s: 'sorted', v: [a[lo]] };
        snap({
          phase: 'base', lo, hi, lines: [1, 2],
          msg: `${rng(lo, hi)} = <b>${fmt([a[lo]])}</b> has only one element, so it is already sorted. Return.`,
        });
        stack.pop();
        return;
      }
      const mid = (lo + hi) >> 1;
      status[key] = { s: 'active' };
      snap({
        phase: 'split', lo, mid, hi, lines: [1, 3, 4, 5],
        msg: `Split ${rng(lo, hi)} = <b>${fmt(a.slice(lo, hi + 1))}</b> at mid = ${mid}: left <b>${fmt(a.slice(lo, mid + 1))}</b> and right <b>${fmt(a.slice(mid + 1, hi + 1))}</b>. Sort each half first.`,
      });
      status[key] = { s: 'waiting' };
      sort(lo, mid);
      sort(mid + 1, hi);
      status[key] = { s: 'active' };
      merge(lo, mid, hi);
      status[key] = { s: 'sorted', v: a.slice(lo, hi + 1) };
      snap({
        phase: 'merged', lo, hi, lines: [6],
        msg: `Merge finished: ${rng(lo, hi)} is now sorted <b>${fmt(a.slice(lo, hi + 1))}</b>.`,
      });
      stack.pop();
    }

    function merge(lo, mid, hi) {
      const L = a.slice(lo, mid + 1);
      const R = a.slice(mid + 1, hi + 1);
      const base = { lo, mid, hi, L, R };
      let i = 0, j = 0, k = lo;

      snap({
        ...base, phase: 'copy', i, j, k, lines: [6, 8, 9, 10],
        msg: `Both halves are sorted. To merge them, copy them into <b>L = ${fmt(L)}</b> and <b>R = ${fmt(R)}</b>. Pointers i and j start at the front of each, and k = ${lo} is where the next value goes.`,
      });

      while (i < L.length && j < R.length) {
        comparisons++;
        const takeL = leftFirst(L[i], R[j]);
        const rel = takeL ? (desc ? '≥' : '≤') : (desc ? '<' : '>');
        snap({
          ...base, phase: 'compare', i, j, k, take: takeL ? 'L' : 'R', lines: [11, takeL ? 12 : 13],
          msg: `Compare L[${i}] = <b>${L[i]}</b> with R[${j}] = <b>${R[j]}</b>. ${L[i]} ${rel} ${R[j]}, so take <b>${takeL ? L[i] : R[j]}</b> from ${takeL ? 'L' : 'R'}.`,
        });
        const v = takeL ? L[i] : R[j];
        a[k] = v;
        writes++;
        snap({
          ...base, phase: 'write', i, j, k, take: takeL ? 'L' : 'R', lines: [takeL ? 12 : 13, 14],
          msg: `Write <b>${v}</b> into A[${k}], then move ${takeL ? 'i' : 'j'} and k forward by one.`,
        });
        if (takeL) i++; else j++;
        k++;
      }
      while (i < L.length) {
        a[k] = L[i];
        writes++;
        snap({
          ...base, phase: 'write', i, j, k, take: 'L', lines: [15],
          msg: `R is used up, so no more comparisons are needed. Copy the leftover <b>${L[i]}</b> from L into A[${k}].`,
        });
        i++; k++;
      }
      while (j < R.length) {
        a[k] = R[j];
        writes++;
        snap({
          ...base, phase: 'write', i, j, k, take: 'R', lines: [15],
          msg: `L is used up, so no more comparisons are needed. Copy the leftover <b>${R[j]}</b> from R into A[${k}].`,
        });
        j++; k++;
      }
    }

    sort(0, a.length - 1);
    snap({
      phase: 'done', lines: [],
      msg: `Done! The array is sorted in ${orderName} order: <b>${fmt(a)}</b>. It took ${comparisons} comparisons and ${writes} writes for n = ${a.length}. (n·log₂n ≈ ${Math.round(a.length * Math.log2(a.length))})`,
    });
    return out;
  }

  // ---------- DOM setup (once per array) ----------

  function setupCode() {
    els.code.innerHTML = '';
    lineEls = codeFor(els.order.value === 'desc').map((text, idx) => {
      const span = document.createElement('span');
      span.className = 'ln';
      span.innerHTML = `<span class="num">${text ? idx + 1 : ''}</span>`;
      span.appendChild(document.createTextNode(text));
      els.code.appendChild(span);
      return span;
    });
  }

  function setupBars() {
    els.bars.innerHTML = '';
    els.bars.classList.toggle('dense', input.length > 20);
    barEls = input.map((_, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'bar-wrap';
      const bar = document.createElement('div');
      bar.className = 'bar';
      const val = document.createElement('span');
      val.className = 'val';
      bar.appendChild(val);
      const ix = document.createElement('div');
      ix.className = 'idx';
      ix.textContent = idx;
      wrap.append(bar, ix);
      els.bars.appendChild(wrap);
      return { bar, val };
    });
  }

  function setupTree() {
    els.tree.innerHTML = '';
    nodeEls = new Map();
    const n = input.length;
    els.tree.classList.toggle('dense', n > 16);
    const levels = [];
    for (let d = 0; d <= tree.maxDepth; d++) {
      const lvl = document.createElement('div');
      lvl.className = 'tlevel';
      els.tree.appendChild(lvl);
      levels.push(lvl);
    }
    for (const node of tree.nodes) {
      const el = document.createElement('div');
      el.className = 'tnode' + (node.lo === node.hi ? ' leaf' : '');
      el.style.left = (node.lo / n * 100) + '%';
      el.style.width = ((node.hi - node.lo + 1) / n * 100) + '%';
      const inner = document.createElement('div');
      el.appendChild(inner);
      levels[node.d].appendChild(el);
      nodeEls.set(node.lo + '-' + node.hi, { el, inner, node });
    }
  }

  // ---------- Rendering one step ----------

  function barClass(idx, st) {
    if (st.phase === 'done') return 'sorted';
    if (st.phase === 'start') return '';
    if (idx < st.lo || idx > st.hi) return 'dim';
    switch (st.phase) {
      case 'base':
      case 'merged':
        return 'sorted';
      case 'split':
      case 'copy':
        return idx <= st.mid ? 'left' : 'right';
      case 'compare':
      case 'write': {
        const lastWritten = st.phase === 'write' ? st.k : st.k - 1;
        if (st.phase === 'write' && idx === st.k) return 'merged just';
        return idx <= lastWritten ? 'merged' : 'stale';
      }
      default:
        return '';
    }
  }

  function renderBars(st) {
    const max = Math.max(...st.arr, 1);
    st.arr.forEach((v, idx) => {
      const { bar, val } = barEls[idx];
      bar.style.height = Math.max(4, (v / max) * 100) + '%';
      bar.className = 'bar ' + barClass(idx, st);
      val.textContent = v;
    });
  }

  function cellHTML(values, side, ptr, st) {
    const cells = values.map((v, idx) => {
      let cls = 'cell';
      if (idx < ptr) cls += ' used';
      else if (idx === ptr) {
        cls += (st.take === side && (st.phase === 'compare' || st.phase === 'write')) ? ' win' : ' ptr';
      }
      const name = idx === ptr ? `<span class="ptrname">${side === 'L' ? 'i' : 'j'}</span>` : '';
      return `<div class="${cls}">${v}${name}</div>`;
    }).join('');
    return `<div class="mrow"><span class="mlabel ${side}">${side}</span><div class="cells ${side}">${cells}</div></div>`;
  }

  function renderMerge(st) {
    if (!st.L) {
      els.merge.innerHTML = '<div class="placeholder">Merge workspace: the L and R copies appear here whenever two sorted halves are being merged.</div>';
      return;
    }
    els.merge.innerHTML = cellHTML(st.L, 'L', st.i, st) + cellHTML(st.R, 'R', st.j, st);
  }

  function renderTree(st) {
    const focus = st.lo !== undefined ? st.lo + '-' + st.hi : null;
    for (const [key, { el, inner, node }] of nodeEls) {
      const s = st.status[key];
      let cls = 'tnode' + (node.lo === node.hi ? ' leaf' : '');
      if (st.phase === 'done') cls += ' sorted';
      else if (s) cls += ' ' + s.s;
      if (key === focus && st.phase !== 'done') cls += ' current';
      el.className = cls;
      const vals = (s && s.s === 'sorted') ? s.v : st.arr.slice(node.lo, node.hi + 1);
      inner.textContent = vals.join(' ');
      inner.title = `mergeSort(A, ${node.lo}, ${node.hi}) → ${fmt(vals)}`;
    }
  }

  function renderCode(st) {
    lineEls.forEach((el, idx) => el.classList.toggle('hl', st.lines.includes(idx + 1)));
  }

  function renderStack(st) {
    if (!st.stack.length) {
      els.stack.innerHTML = `<div class="empty">${st.phase === 'done' ? 'All calls have returned.' : 'Empty: nothing has been called yet.'}</div>`;
      return;
    }
    els.stack.innerHTML = st.stack
      .map((f) => `<div class="frame">mergeSort(A, ${f.lo}, ${f.hi})</div>`)
      .join('');
  }

  function render() {
    const st = steps[cur];
    els.explain.innerHTML = st.msg;
    renderBars(st);
    renderMerge(st);
    renderTree(st);
    renderCode(st);
    renderStack(st);
    els.cmp.textContent = st.comparisons;
    els.writes.textContent = st.writes;
    els.depth.textContent = st.stack.length;
    els.scrub.value = cur;
    els.stepCount.textContent = `Step ${cur} / ${steps.length - 1}`;
    els.prev.disabled = cur === 0;
    els.next.disabled = cur === steps.length - 1;
  }

  // ---------- Playback ----------

  const isPlaying = () => timer !== null;

  function pause() {
    clearTimeout(timer);
    timer = null;
    els.play.textContent = '▶ Play';
  }

  function play() {
    if (cur >= steps.length - 1) { cur = 0; render(); }
    els.play.textContent = '❚❚ Pause';
    const tick = () => {
      timer = setTimeout(() => {
        if (cur < steps.length - 1) {
          cur++;
          render();
          tick();
        } else {
          pause();
        }
      }, DELAYS[els.speed.value - 1]);
    };
    tick();
  }

  function go(to) {
    pause();
    cur = Math.max(0, Math.min(steps.length - 1, to));
    render();
  }

  // ---------- Loading arrays ----------

  function load(arr) {
    pause();
    input = arr;
    tree = buildTree(arr.length);
    steps = buildSteps(arr, els.order.value === 'desc');
    cur = 0;
    els.scrub.max = steps.length - 1;
    setupCode();
    setupBars();
    setupTree();
    render();
  }

  function randomArray(n) {
    return Array.from({ length: n }, () => 5 + Math.floor(Math.random() * 95));
  }

  function loadRandom() {
    const n = Number(els.size.value);
    els.sizeVal.textContent = n;
    els.customError.textContent = '';
    load(randomArray(n));
  }

  function parseCustom(text) {
    const parts = text.split(/[\s,;]+/).filter(Boolean);
    if (parts.length < 2) return { error: 'Enter at least 2 numbers.' };
    if (parts.length > 32) return { error: 'Use 32 numbers or fewer.' };
    const nums = parts.map(Number);
    if (nums.some((x) => !Number.isInteger(x) || x < 0 || x > 999)) {
      return { error: 'Use whole numbers from 0 to 999.' };
    }
    return { nums };
  }

  // ---------- Events ----------

  els.play.addEventListener('click', () => (isPlaying() ? pause() : play()));
  els.next.addEventListener('click', () => go(cur + 1));
  els.prev.addEventListener('click', () => go(cur - 1));
  els.reset.addEventListener('click', () => go(0));
  els.random.addEventListener('click', loadRandom);
  els.size.addEventListener('input', () => { els.sizeVal.textContent = els.size.value; });
  els.size.addEventListener('change', loadRandom);
  els.scrub.addEventListener('input', () => go(Number(els.scrub.value)));
  // Re-run on the same numbers so students can compare the two orders.
  els.order.addEventListener('change', () => load(input));

  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { nums, error } = parseCustom(els.custom.value);
    if (error) { els.customError.textContent = error; return; }
    els.customError.textContent = '';
    els.size.value = nums.length;
    els.sizeVal.textContent = nums.length;
    load(nums);
  });

  document.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if ((tag === 'INPUT' && e.target.type === 'text') || tag === 'SELECT') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    switch (e.key) {
      case ' ':
        e.preventDefault();
        isPlaying() ? pause() : play();
        break;
      case 'ArrowRight':
        if (tag === 'INPUT') return; // let range sliders handle arrows
        e.preventDefault(); go(cur + 1); break;
      case 'ArrowLeft':
        if (tag === 'INPUT') return;
        e.preventDefault(); go(cur - 1); break;
      case 'r': case 'R': go(0); break;
      case 'n': case 'N': loadRandom(); break;
    }
  });

  // ---------- Start ----------
  load([38, 27, 43, 3, 9, 82, 10, 19]);
})();
