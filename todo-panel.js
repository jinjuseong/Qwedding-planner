// 우측 패널 뷰: 월별 할 일을 신랑/신부로 나눠 그립니다. 데이터 변경은 하지 않습니다.
import { esc, p2 } from './utils.js';

const GROUPS = [
  { key: 'groom', label: '🤵 신랑 담당', color: 'var(--groom)' },
  { key: 'bride', label: '👰 신부 담당', color: 'var(--bride)' },
];

export function renderPanel({ year, month, filter, todos }) {
  const prefix = year + '-' + p2(month + 1);
  const monthTodos = todos.filter(t => t.date.startsWith(prefix));
  const shown = monthTodos.filter(t => filter === 'all' || t.owner === filter);
  const done = monthTodos.filter(t => t.done).length;
  const pct = monthTodos.length ? Math.round(done / monthTodos.length * 100) : 0;

  let list = '';
  GROUPS.filter(g => filter === 'all' || filter === g.key).forEach(g => {
    const items = shown
      .filter(t => t.owner === g.key)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.done - b.done));
    if (!items.length) return;
    list += `<div class="group"><i style="background:${g.color}"></i>${g.label} (${items.length})</div>`;
    list += items.map(t => `
      <div class="todo ${t.done ? 'done' : ''}">
        <input type="checkbox" data-act="toggle" data-id="${t.id}" ${t.done ? 'checked' : ''}>
        <div class="body">
          <div class="title">${t.priority === 'high' ? '🔥 ' : ''}${esc(t.title)}</div>
          <div class="meta">${t.date}${t.memo ? ' · ' + esc(t.memo) : ''}</div>
        </div>
        <div class="tools">
          <button class="btn" data-act="edit" data-id="${t.id}">수정</button>
          <button class="btn danger" data-act="delete" data-id="${t.id}">삭제</button>
        </div>
      </div>`).join('');
  });

  return {
    title: (month + 1) + '월 할 일',
    sub: `완료 ${done} / ${monthTodos.length} (${pct}%)`,
    pct,
    list: list || '<div class="empty">이번 달 할 일이 없습니다.</div>',
  };
}
