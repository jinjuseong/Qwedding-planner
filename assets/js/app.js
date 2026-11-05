import { store, isRemote } from './store.js';

/* ---------------- Labels ---------------- */
const OWNER = { couple: '둘이', bride: '신부', groom: '신랑', family: '가족', vendor: '업체' };
const STATUS = { todo: 'TODO', in_progress: 'DOING', done: 'DONE', planned: 'PLANNED', tentative: '가안' };
const STATUS_KO = { todo: '할 일', in_progress: '진행 중', done: '완료', planned: '예정', tentative: '가안' };
const PRIORITY = { critical: '필수', high: '높음', medium: '보통', low: '낮음' };
const CATEGORY = {
  venue: '예식장', indoor_shoot: '실내 촬영', outdoor_shoot: '야외 스냅', family: '가족·혼주', invitation: '청첩장',
  guest_management: '하객 관리', ceremony: '본식', honeymoon: '신혼여행', budget: '예산', post_wedding: '결혼 후',
};
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

/* ---------------- Helpers ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const weekday = (d) => WD[new Date(d + 'T00:00:00Z').getUTCDay()];
const md = (d) => `${d.slice(5, 7)}/${d.slice(8, 10)} ${weekday(d)}`;
const opts = (map, sel, all) => (all !== undefined ? `<option value="">${all}</option>` : '') +
  Object.entries(map).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${v}</option>`).join('');
const dateOf = (t) => t.due_date || t.start_date || null;   // 캘린더에 놓일 날짜
const statusGroup = (s) => s === 'done' ? 'done' : s === 'in_progress' ? 'in_progress' : 'todo';

let S;                                   // state
const view = { y: 0, m: 0, day: '', tab: 'monthly', openId: null };
const F = { ownerM: '', statusM: '', ownerT: '', priorityT: '' };

function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('toast--show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('toast--show'), 2200);
}
async function safe(fn, ok) {
  try { await fn(); if (ok) toast(ok); } catch (e) { console.error(e); toast('저장 실패: ' + (e.message || e)); }
  render();
}

/* ---------------- Badges ---------------- */
const ownerBadge = (t) => `<span class="badge badge--${t.owner}">${OWNER[t.owner] || t.owner}</span>`;
const statusBadge = (t) => `<span class="badge badge--${t.status}">${STATUS[t.status] || t.status}</span>`;

/* ---------------- Calendar ---------------- */
function renderCalendar() {
  const { y, m } = view, today = todayISO();
  $('#month-ko').textContent = `${m}월`;
  $('#month-en').textContent = MONTH_EN[m - 1];
  $('#month-year').textContent = y;

  const first = new Date(Date.UTC(y, m - 1, 1));
  const start = new Date(first); start.setUTCDate(1 - first.getUTCDay());
  const byDate = {};
  for (const t of S.tasks) { const d = dateOf(t); if (d) (byDate[d] ||= []).push(t); }

  let html = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setUTCDate(start.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    const inMonth = d.getUTCMonth() === m - 1;
    const tasks = (byDate[key] || []).slice().sort((a, b) => (a.status === 'done') - (b.status === 'done'));
    const isWedding = key === S.project.wedding_date;
    const cls = ['cell', inMonth ? '' : 'cell--other', key === today ? 'cell--today' : '',
      isWedding ? 'cell--wedding' : '', inMonth && view.day === key ? 'cell--selected' : ''].filter(Boolean).join(' ');
    const shown = inMonth ? tasks.slice(0, 4) : [];
    const label = `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일${tasks.length ? `, 할 일 ${tasks.length}건` : ''}`;
    html += `<button class="${cls}" data-date="${key}" role="gridcell" aria-label="${label}">
      <span class="cell__num">${pad(d.getUTCDate())}</span>
      ${key === today && inMonth ? '<span class="cell__today">TODAY</span>' : isWedding ? '<span class="cell__wedding">WEDDING</span>' : ''}
      ${shown.length ? `<span class="cell__tasks">${shown.map(t => `
        <span class="cell-task ${t.status === 'done' ? 'cell-task--done' : ''}">
          <span class="cell-task__title">${esc(t.title)}</span>${ownerBadge(t)}</span>`).join('')}
        ${tasks.length > 4 ? `<span class="cell__more">+${tasks.length - 4}건 더</span>` : ''}</span>` : ''}
    </button>`;
  }
  $('#cal-grid').innerHTML = html;
}

/* ---------------- Cards ---------------- */
function card(t, variant) {
  const d = dateOf(t), open = view.openId === t.id;
  const lead = variant === 'monthly'
    ? `<button class="check" role="checkbox" aria-checked="${t.status === 'done'}" data-toggle="${t.id}" aria-label="${esc(t.title)} 완료"><img src="assets/img/icon-check.svg" width="13" height="13" alt=""></button>`
    : `<span class="date-box">${d ? `<b>${d.slice(8, 10)}</b><small>${weekday(d)}</small>` : '<b>–</b><small>미정</small>'}</span>`;
  const badges = (variant === 'monthly' ? `<span class="badge badge--date">${d ? md(d) : '날짜 미정'}</span>` : '') +
    ownerBadge(t) + statusBadge(t) + (t.priority === 'critical' && t.status !== 'done' ? `<span class="badge badge--critical">필수</span>` : '');
  return `<li class="card ${t.status === 'done' ? 'card--done' : ''}" data-card="${t.id}" ${open ? 'open' : ''}>
    <div class="card__row">${lead}
      <button class="card__body" data-expand="${t.id}" aria-expanded="${open}">
        <span class="card__title">${esc(t.title)}</span><span class="card__badges">${badges}</span>
      </button>
      <button class="chev" data-expand="${t.id}" aria-label="상세 열기" aria-expanded="${open}"></button>
    </div>
    ${open ? detail(t) : ''}
  </li>`;
}

function detail(t) {
  const rule = S.rules.find(r => r.task_id === t.id);
  const isShoot = rule?.key === 'shoot_day';
  const dependents = S.tasks.filter(x => (x.depends_on || []).includes(t.id));
  const dep = (id) => { const o = S.tasks.find(x => x.id === id); return `<button type="button" class="badge ${o?.status === 'done' ? 'badge--done' : 'badge--date'}" data-goto="${id}">${id} ${esc(o?.title || '')}</button>`; };
  return `<form class="detail" data-form="${t.id}">
    <p class="detail__meta">${t.id} · ${CATEGORY[t.category] || t.category}${t.vendor ? ' · ' + esc(t.vendor) : ''}</p>
    ${t.description ? `<p class="detail__desc">${esc(t.description)}</p>` : ''}
    ${rule && !isShoot ? `<p class="detail__note">실내 촬영일 기준 ${-rule.offset_days / 7}주 전 마감 규칙이 적용됩니다. 촬영일을 확정하면 마감일이 자동 계산됩니다.</p>` : ''}
    ${isShoot ? `<label class="field">실내 촬영일 확정 (관련 준비 마감일 자동 계산)
      <input type="date" name="__shoot_date" value="${S.shoots.indoor?.shoot_date || ''}" max="${S.shoots.indoor?.target_completion_date || ''}"></label>` : ''}
    <div class="field-row">
      <label class="field">상태<select name="status">${opts(STATUS_KO, t.status)}</select></label>
      <label class="field">담당<select name="owner">${opts(OWNER, t.owner)}</select></label>
      <label class="field">중요도<select name="priority">${opts(PRIORITY, t.priority)}</select></label>
    </div>
    <div class="field-row">
      <label class="field">시작일<input type="date" name="start_date" value="${t.start_date || ''}"></label>
      <label class="field">마감일<input type="date" name="due_date" value="${t.due_date || ''}"></label>
    </div>
    <div class="field-row">
      <label class="field">예상 비용(원)<input type="number" min="0" step="1000" name="estimated_cost_krw" value="${t.estimated_cost_krw ?? ''}"></label>
      <label class="field">실제 비용(원)<input type="number" min="0" step="1000" name="actual_cost_krw" value="${t.actual_cost_krw ?? ''}"></label>
    </div>
    <div class="field-row">
      <label class="field">업체<input name="vendor" value="${esc(t.vendor)}"></label>
      <label class="field">예약 링크<input type="url" name="booking_url" value="${esc(t.booking_url)}" placeholder="https://"></label>
    </div>
    <label class="field">메모<textarea name="memo">${esc(t.memo)}</textarea></label>
    ${t.depends_on?.length ? `<div class="field">선행 작업<div class="deps">${t.depends_on.map(dep).join('')}</div></div>` : ''}
    ${dependents.length ? `<div class="field">후속 작업<div class="deps">${dependents.map(x => dep(x.id)).join('')}</div></div>` : ''}
    ${t.updated_by ? `<p class="detail__meta">최근 수정 ${esc(t.updated_by)}</p>` : ''}
    <div class="detail__actions">
      <button type="button" class="btn btn--danger" data-delete="${t.id}">삭제</button>
      <button type="submit" class="btn">저장</button>
    </div>
  </form>`;
}

/* ---------------- Sidebar: Monthly ---------------- */
function renderMonthly() {
  const prefix = `${view.y}-${pad(view.m)}`;
  const monthTasks = S.tasks.filter(t => dateOf(t)?.startsWith(prefix));
  const done = monthTasks.filter(t => t.status === 'done').length;
  const d = dayDiff(todayISO(), S.project.wedding_date);
  $('#dday').textContent = d > 0 ? `D-${d}` : d === 0 ? 'D-DAY' : `D+${-d}`;
  $('#progress-bar').style.width = monthTasks.length ? `${done / monthTasks.length * 100}%` : '0%';
  $('#month-total').textContent = `${monthTasks.length} total`;
  $('#month-stats').innerHTML = statBoxes(monthTasks);
  $('#month-label').textContent = `${view.y}년 ${view.m}월`;

  const days = [...new Set(monthTasks.map(dateOf))].sort();
  if (view.day && !view.day.startsWith(prefix)) view.day = '';
  const dayOpts = Object.fromEntries(days.map(x => [x, `${+x.slice(8)}일 (${weekday(x)})`]));
  if (view.day && !dayOpts[view.day]) dayOpts[view.day] = `${+view.day.slice(8)}일 (${weekday(view.day)})`;
  $('#f-day').innerHTML = opts(Object.fromEntries(Object.entries(dayOpts).sort()), view.day, '일 전체');
  $('#f-owner-m').innerHTML = opts(OWNER, F.ownerM, '담당 전체');
  $('#f-status-m').innerHTML = opts(STATUS_KO, F.statusM, '상태 전체');

  const list = monthTasks.filter(t => (!view.day || dateOf(t) === view.day) && (!F.ownerM || t.owner === F.ownerM) && (!F.statusM || t.status === F.statusM))
    .sort((a, b) => dateOf(a).localeCompare(dateOf(b)) || a.id.localeCompare(b.id));
  $('#month-list').innerHTML = list.length ? list.map(t => card(t, 'monthly')).join('')
    : `<li class="empty">${view.day ? '이 날짜에 할 일이 없습니다.' : '이 달에 할 일이 없습니다.'}</li>`;
}

function statBoxes(tasks) {
  const c = { todo: 0, in_progress: 0, done: 0 };
  for (const t of tasks) c[statusGroup(t.status)]++;
  return [['todo', 'todo'], ['in_progress', 'doing'], ['done', 'done']].map(([k, l]) =>
    `<div class="stat stat--${k}"><span class="stat__label">${l}</span><span class="stat__num">${c[k]}</span></div>`).join('');
}

/* ---------------- Sidebar: Total ---------------- */
function renderTotal() {
  $('#total-stats').innerHTML = statBoxes(S.tasks);
  $('#f-owner-t').innerHTML = opts(OWNER, F.ownerT, '담당 전체');
  $('#f-priority-t').innerHTML = opts(PRIORITY, F.priorityT, '중요도');
  const list = S.tasks.filter(t => (!F.ownerT || t.owner === F.ownerT) && (!F.priorityT || t.priority === F.priorityT))
    .sort((a, b) => (dateOf(a) || '9999').localeCompare(dateOf(b) || '9999') || a.id.localeCompare(b.id));
  const groups = new Map();
  for (const t of list) { const k = dateOf(t) ? dateOf(t).slice(0, 7) : 'none'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); }
  $('#total-list').innerHTML = groups.size ? [...groups].map(([k, ts]) => `
    <div class="month-group">
      <p class="month-label">${k === 'none' ? '날짜 미정' : `${k.slice(0, 4)}. ${+k.slice(5)}`}</p>
      <ul class="task-list">${ts.map(t => card(t, 'total')).join('')}</ul>
    </div>`).join('') : '<p class="empty">조건에 맞는 할 일이 없습니다.</p>';
}

function renderTabs() {
  for (const k of ['monthly', 'total']) {
    $(`#tab-${k}`).setAttribute('aria-selected', String(view.tab === k));
    $(`#panel-${k}`).hidden = view.tab !== k;
  }
}

function render() { renderCalendar(); renderMonthly(); renderTotal(); renderTabs(); }

/* ---------------- Actions ---------------- */
function setMonth(y, m) { view.y = y; view.m = m; render(); }
function shiftMonth(delta) { const d = new Date(Date.UTC(view.y, view.m - 1 + delta, 1)); setMonth(d.getUTCFullYear(), d.getUTCMonth() + 1); }

function saveForm(form) {
  const id = form.dataset.form, fd = new FormData(form), patch = {};
  for (const k of ['status', 'owner', 'priority', 'vendor', 'booking_url', 'memo', 'start_date', 'due_date']) patch[k] = (fd.get(k) || '').trim() || null;
  for (const k of ['estimated_cost_krw', 'actual_cost_krw']) { const v = fd.get(k); patch[k] = v === '' || v === null ? null : Math.max(0, Math.round(+v)); }
  if (patch.start_date && patch.due_date && patch.start_date > patch.due_date) { toast('시작일이 마감일보다 늦습니다'); return; }
  const shoot = fd.has('__shoot_date') ? (fd.get('__shoot_date') || null) : undefined;
  const shootChanged = shoot !== undefined && shoot !== (S.shoots.indoor?.shoot_date || null);
  safe(async () => {
    await store.updateTask(id, patch);
    if (shootChanged) await store.updateShoot('indoor', { shoot_date: shoot, shoot_date_status: shoot ? 'confirmed' : 'undecided' });
  }, shootChanged && shoot ? '촬영일 기준으로 준비 마감일을 다시 계산했습니다' : '저장했습니다');
}

function gotoTask(id) {
  const t = S.tasks.find(x => x.id === id); if (!t) return;
  view.openId = id; view.tab = 'total';
  render();
  document.querySelector(`[data-card="${id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function nextId() {
  const n = Math.max(0, ...S.tasks.map(t => +(/^WED-(\d+)$/.exec(t.id)?.[1] || 0))) + 1;
  return `WED-${String(n).padStart(3, '0')}`;
}

function openAdd() {
  const f = $('#add-form');
  f.reset();
  f.owner.innerHTML = opts(OWNER, 'couple');
  f.category.innerHTML = opts(CATEGORY, 'ceremony');
  f.priority.innerHTML = opts(PRIORITY, 'medium');
  f.due_date.value = view.day || '';
  $('#add-dialog').showModal();
  f.title.focus();
}

function bind() {
  $('#prev-month').addEventListener('click', () => shiftMonth(-1));
  $('#next-month').addEventListener('click', () => shiftMonth(1));
  $('#cal-grid').addEventListener('click', (e) => {
    const c = e.target.closest('[data-date]'); if (!c) return;
    const d = c.dataset.date, [y, m] = d.split('-').map(Number);
    view.day = view.day === d ? '' : d; view.tab = 'monthly';
    if (y !== view.y || m !== view.m) { view.y = y; view.m = m; }
    render();
  });
  for (const k of ['monthly', 'total']) $(`#tab-${k}`).addEventListener('click', () => { view.tab = k; renderTabs(); });
  $('.tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    view.tab = view.tab === 'monthly' ? 'total' : 'monthly'; renderTabs(); $(`#tab-${view.tab}`).focus();
  });

  $('#f-day').addEventListener('change', (e) => { view.day = e.target.value; render(); });
  $('#f-owner-m').addEventListener('change', (e) => { F.ownerM = e.target.value; renderMonthly(); });
  $('#f-status-m').addEventListener('change', (e) => { F.statusM = e.target.value; renderMonthly(); });
  $('#f-owner-t').addEventListener('change', (e) => { F.ownerT = e.target.value; renderTotal(); });
  $('#f-priority-t').addEventListener('change', (e) => { F.priorityT = e.target.value; renderTotal(); });

  $('.sidebar').addEventListener('click', (e) => {
    const tog = e.target.closest('[data-toggle]');
    if (tog) {
      const t = S.tasks.find(x => x.id === tog.dataset.toggle);
      const done = t.status !== 'done';
      return safe(() => store.updateTask(t.id, { status: done ? 'done' : 'todo' }), done ? '완료로 표시했습니다' : '할 일로 되돌렸습니다');
    }
    const ex = e.target.closest('[data-expand]');
    if (ex) { view.openId = view.openId === ex.dataset.expand ? null : ex.dataset.expand; renderMonthly(); renderTotal(); return; }
    const go = e.target.closest('[data-goto]');
    if (go) { e.preventDefault(); return gotoTask(go.dataset.goto); }
    const del = e.target.closest('[data-delete]');
    if (del) {
      const t = S.tasks.find(x => x.id === del.dataset.delete);
      if (!confirm(`'${t.title}' 할 일을 삭제할까요?`)) return;
      view.openId = null;
      return safe(() => store.deleteTask(t.id), '삭제했습니다');
    }
  });
  $('.sidebar').addEventListener('submit', (e) => {
    const form = e.target.closest('[data-form]'); if (!form) return;
    e.preventDefault(); saveForm(form);
  });

  $('#fab').addEventListener('click', openAdd);
  $('#add-form').addEventListener('submit', (e) => {
    if (e.submitter?.value !== 'add') return;
    const fd = new FormData(e.target);
    const task = {
      id: nextId(), title: fd.get('title').trim(), category: fd.get('category'), due_date: fd.get('due_date') || null,
      status: 'todo', priority: fd.get('priority'), owner: fd.get('owner'), description: fd.get('description').trim() || null,
    };
    if (!task.title) { e.preventDefault(); return; }
    safe(() => store.addTask(task), '할 일을 추가했습니다');
  });

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#login-msg').textContent = '전송 중…';
    try { await store.signIn(new FormData(e.target).get('email')); $('#login-msg').textContent = '메일함에서 로그인 링크를 눌러 주세요.'; }
    catch (err) { $('#login-msg').textContent = '실패: ' + err.message; }
  });
}

/* ---------------- Boot ---------------- */
async function boot() {
  const t = todayISO();
  view.y = +t.slice(0, 4); view.m = +t.slice(5, 7);
  bind();
  try {
    const { user } = await store.init();
    if (isRemote && !user) { $('#login').showModal(); return; }
    S = store.state;
    render();
    store.subscribe(() => { S = store.state; render(); });
  } catch (e) {
    console.error(e);
    $('#month-list').innerHTML = `<li class="empty">데이터를 불러오지 못했습니다: ${esc(e.message)}</li>`;
  }
}
boot();
