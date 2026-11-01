// 엔트리: 상태를 가지고 store / calendar / todo-panel을 연결합니다.
import { TodoStore } from './store.js';
import { renderCalendar, ddayText } from './calendar.js';
import { renderPanel } from './todo-panel.js';
import { fmt, parse } from './utils.js';

const $ = id => document.getElementById(id);

const now = new Date();
const state = {
  year: now.getFullYear(),
  month: now.getMonth(),
  selected: fmt(now),
  filter: 'all',
  editId: null,
};

function moveTo(ds) {
  state.selected = ds;
  const d = parse(ds);
  state.year = d.getFullYear();
  state.month = d.getMonth();
}

function render() {
  const todos = TodoStore.all();
  const cal = renderCalendar({ year: state.year, month: state.month, selected: state.selected, todos });
  $('bigDay').textContent = cal.big;
  $('month').textContent = cal.month;
  $('year').textContent = cal.year;
  $('weekday').textContent = cal.weekday;
  $('dowRow').innerHTML = cal.dow;
  $('calGrid').innerHTML = cal.cells;
  $('dday').textContent = ddayText();

  const panel = renderPanel({ year: state.year, month: state.month, filter: state.filter, todos });
  $('panelTitle').textContent = panel.title;
  $('panelSub').textContent = panel.sub;
  $('progress').style.width = panel.pct + '%';
  $('list').innerHTML = panel.list;
  document.querySelectorAll('.filters .btn').forEach(b => b.classList.toggle('on', b.dataset.f === state.filter));
}

function resetForm() {
  state.editId = null;
  $('todoForm').reset();
  $('date').value = state.selected;
  $('submitBtn').textContent = '추가';
  $('cancelEdit').style.display = 'none';
}

// 폼: 생성 / 수정
$('todoForm').addEventListener('submit', e => {
  e.preventDefault();
  const data = {
    title: $('title').value,
    owner: document.querySelector('input[name=owner]:checked').value,
    date: $('date').value,
    priority: $('priority').value,
    memo: $('memo').value,
  };
  if (!data.title.trim() || !data.date) return;

  if (state.editId) TodoStore.update(state.editId, data);
  else TodoStore.create(data);

  moveTo(data.date);
  resetForm();
  render();
});

$('cancelEdit').addEventListener('click', () => { resetForm(); render(); });

// 목록 액션 (이벤트 위임)
$('list').addEventListener('click', e => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const { act, id } = btn.dataset;
  const t = TodoStore.find(id);
  if (!t) return;

  if (act === 'delete') {
    if (!confirm('이 할 일을 삭제할까요?')) return;
    TodoStore.remove(id);
    if (state.editId === id) resetForm();
    render();
  }
  if (act === 'edit') {
    state.editId = id;
    $('title').value = t.title;
    document.querySelector(`input[name=owner][value=${t.owner}]`).checked = true;
    $('date').value = t.date;
    $('priority').value = t.priority;
    $('memo').value = t.memo;
    $('submitBtn').textContent = '저장';
    $('cancelEdit').style.display = '';
    $('title').focus();
  }
});

$('list').addEventListener('change', e => {
  if (e.target.dataset.act !== 'toggle') return;
  TodoStore.toggle(e.target.dataset.id);
  render();
});

// 캘린더 날짜 선택
$('calGrid').addEventListener('click', e => {
  const cell = e.target.closest('[data-d]');
  if (!cell) return;
  moveTo(cell.dataset.d);
  if (!state.editId) $('date').value = state.selected;
  render();
});

$('prev').onclick = () => { state.month--; if (state.month < 0) { state.month = 11; state.year--; } render(); };
$('next').onclick = () => { state.month++; if (state.month > 11) { state.month = 0; state.year++; } render(); };

document.querySelector('.filters').addEventListener('click', e => {
  const b = e.target.closest('.btn');
  if (!b) return;
  state.filter = b.dataset.f;
  render();
});

// 저장소 변경 시 자동 갱신
TodoStore.subscribe(() => {});

$('date').value = state.selected;
render();
