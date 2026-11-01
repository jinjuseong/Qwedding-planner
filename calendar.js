// 캘린더 뷰: 월요일 시작 달력을 그립니다.
import { fmt, parse, WEDDING, MONTHS, DAYS, DOW } from './utils.js';

export function renderCalendar({ year, month, selected, todos }) {
  const today = fmt(new Date());
  const sd = parse(selected);
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((offset + days) / 7) * 7;
  const hasDates = new Set(todos.map(t => t.date));

  let cells = '';
  for (let i = 0; i < total; i++) {
    const d = new Date(year, month, 1 - offset + i);
    const ds = fmt(d);
    const cls = ['dot'];
    if (d.getMonth() !== month) cls.push('other');
    if (ds === today) cls.push('today');
    else if (ds > today) cls.push('future');
    if (ds === selected) cls.push('sel');
    if (ds === WEDDING) cls.push('wed');
    if (hasDates.has(ds)) cls.push('has');
    cells += `<button class="${cls.join(' ')}" data-d="${ds}" aria-label="${ds}"></button>`;
  }

  return {
    big: sd.getDate(),
    month: MONTHS[sd.getMonth()],
    year: sd.getFullYear(),
    weekday: DAYS[sd.getDay()],
    dow: DOW.map(d => `<div class="dow">${d}</div>`).join(''),
    cells,
  };
}

export function ddayText() {
  const today = parse(fmt(new Date()));
  const diff = Math.round((parse(WEDDING) - today) / 86400000);
  return diff >= 0 ? String(diff) : `0 (D+${-diff})`;
}
