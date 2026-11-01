// 데이터 계층: DOM을 다루지 않고 localStorage CRUD와 변경 구독만 담당합니다.
import { esc } from './utils.js';

const KEY = 'wedding-todos-v2';
const listeners = new Set();

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}

let items = load();

function normalize(d) {
  return {
    title: String(d.title || '').trim(),
    owner: d.owner === 'bride' ? 'bride' : 'groom',
    date: d.date,
    priority: ['high', 'normal', 'low'].includes(d.priority) ? d.priority : 'normal',
    memo: String(d.memo || '').trim(),
    done: !!d.done,
  };
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach(fn => fn(items));
}

export const TodoStore = {
  all: () => items.slice(),
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  create(data) {
    const todo = { id: crypto.randomUUID(), createdAt: Date.now(), ...normalize({ ...data, done: false }) };
    items.push(todo);
    persist();
    return todo;
  },

  update(id, patch) {
    const i = items.findIndex(x => x.id === id);
    if (i < 0) return null;
    items[i] = { ...items[i], ...normalize({ ...items[i], ...patch }) };
    persist();
    return items[i];
  },

  toggle(id) {
    const t = items.find(x => x.id === id);
    if (t) { t.done = !t.done; persist(); }
  },

  remove(id) {
    items = items.filter(x => x.id !== id);
    persist();
  },

  find: id => items.find(x => x.id === id),
};
