import { SUPABASE_URL, SUPABASE_ANON_KEY, PROJECT_ID } from './config.js';

const LS_KEY = 'wedding-planner-2027:v1';
export const isRemote = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// 실내 촬영일 기준 상대 마감일 계산 (DB 트리거와 같은 규칙)
export function applyRelativeDeadlines(state) {
  const date = state.shoots.indoor?.shoot_date;
  if (!date) return;
  for (const r of state.rules) {
    const t = state.tasks.find(x => x.id === r.task_id);
    if (t && t.status !== 'done') t.due_date = addDays(date, r.offset_days);
  }
}

/* ------------------------------------------------------------------ */
/* Local adapter: JSON 원본 + localStorage                             */
/* ------------------------------------------------------------------ */
class LocalStore {
  mode = 'local';
  async init() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { /* ignore */ }
    this.state = saved || await this.fetchSource();
    return { user: null };
  }
  async fetchSource() {
    const res = await fetch('data/wedding.json', { cache: 'no-store' });
    const d = await res.json();
    return { project: d.project, confirmed: d.confirmed_items, shoots: d.shoots,
             honeymoon: d.honeymoon, rules: d.relative_deadline_rules, tasks: d.tasks };
  }
  persist() { try { localStorage.setItem(LS_KEY, JSON.stringify(this.state)); } catch { /* ignore */ } }
  async updateTask(id, patch) {
    Object.assign(this.state.tasks.find(t => t.id === id), patch);
    this.persist();
  }
  async updateShoot(kind, patch) {
    Object.assign(this.state.shoots[kind], patch);
    if (kind === 'indoor' && 'shoot_date' in patch) applyRelativeDeadlines(this.state);
    this.persist();
  }
  async updateHoneymoon(patch) { Object.assign(this.state.honeymoon, patch); this.persist(); }
  async addTask(task) { this.state.tasks.push({ depends_on: [], ...task }); this.persist(); }
  async deleteTask(id) {
    this.state.tasks = this.state.tasks.filter(t => t.id !== id);
    for (const t of this.state.tasks) t.depends_on = (t.depends_on || []).filter(d => d !== id);
    this.persist();
  }
  async reset() { localStorage.removeItem(LS_KEY); this.state = await this.fetchSource(); }
  exportJSON() { return JSON.stringify(this.state, null, 2); }
  subscribe() {}
}

/* ------------------------------------------------------------------ */
/* Supabase adapter: Postgres + Auth + Realtime                        */
/* ------------------------------------------------------------------ */
class RemoteStore {
  mode = 'remote';
  async init() {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
    this.sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { session } } = await this.sb.auth.getSession();
    this.user = session?.user || null;
    if (this.user) await this.load();
    return { user: this.user };
  }
  async signIn(email) {
    const { error } = await this.sb.auth.signInWithOtp({
      email, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) throw error;
  }
  async signOut() { await this.sb.auth.signOut(); location.reload(); }
  async load() {
    const q = (table, order) => {
      let r = this.sb.from(table).select('*').eq('project_id', PROJECT_ID);
      return order ? r.order(order) : r;
    };
    const [p, c, t, d, s, h, r] = await Promise.all([
      this.sb.from('projects').select('*').eq('id', PROJECT_ID).single(),
      q('confirmed_items', 'sort_order'), q('tasks', 'id'), q('task_dependencies'),
      q('shoots'), q('honeymoon').maybeSingle(), q('relative_deadline_rules'),
    ]);
    for (const res of [p, c, t, d, s, h, r]) if (res.error) throw res.error;
    if (!p.data) throw new Error('프로젝트에 접근 권한이 없습니다. project_members 에 이메일이 등록되어 있는지 확인하세요.');
    const deps = {};
    for (const x of d.data) (deps[x.task_id] ||= []).push(x.depends_on_id);
    const project = { ...p.data, ceremony_time: (p.data.ceremony_time || '').slice(0, 5) };
    this.state = {
      project, confirmed: c.data, honeymoon: h.data || {}, rules: r.data,
      shoots: Object.fromEntries(s.data.map(x => [x.kind, x])),
      tasks: t.data.map(x => ({ ...x, depends_on: deps[x.id] || [] })),
    };
  }
  async updateTask(id, patch) {
    Object.assign(this.state.tasks.find(t => t.id === id), patch);
    const { error } = await this.sb.from('tasks').update(patch).eq('project_id', PROJECT_ID).eq('id', id);
    if (error) throw error;
  }
  async updateShoot(kind, patch) {
    Object.assign(this.state.shoots[kind], patch);
    const { error } = await this.sb.from('shoots').update(patch).eq('project_id', PROJECT_ID).eq('kind', kind);
    if (error) throw error;
    if (kind === 'indoor' && 'shoot_date' in patch) await this.load(); // 트리거가 마감일을 갱신
  }
  async updateHoneymoon(patch) {
    Object.assign(this.state.honeymoon, patch);
    const { error } = await this.sb.from('honeymoon').update(patch).eq('project_id', PROJECT_ID);
    if (error) throw error;
  }
  async addTask(task) {
    const { error } = await this.sb.from('tasks').insert({ project_id: PROJECT_ID, ...task });
    if (error) throw error;
    this.state.tasks.push({ depends_on: [], ...task });
  }
  async deleteTask(id) {
    const { error } = await this.sb.from('tasks').delete().eq('project_id', PROJECT_ID).eq('id', id);
    if (error) throw error;
    this.state.tasks = this.state.tasks.filter(t => t.id !== id);
  }
  exportJSON() { return JSON.stringify(this.state, null, 2); }
  subscribe(onChange) {
    let timer;
    const refresh = () => { clearTimeout(timer); timer = setTimeout(async () => { await this.load(); onChange(); }, 250); };
    this.channel = this.sb.channel('wedding-' + PROJECT_ID);
    for (const table of ['tasks', 'task_dependencies', 'shoots', 'honeymoon', 'confirmed_items', 'projects']) {
      const filter = table === 'projects' ? `id=eq.${PROJECT_ID}` : `project_id=eq.${PROJECT_ID}`;
      this.channel.on('postgres_changes', { event: '*', schema: 'public', table, filter }, refresh);
    }
    this.channel.subscribe();
  }
}

export const store = isRemote ? new RemoteStore() : new LocalStore();
