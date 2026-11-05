// data/wedding.json → supabase/seed.sql
// 사용법: node scripts/generate-seed.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(root, 'data/wedding.json'), 'utf8'));
const PID = '00000000-0000-4000-8000-000000002027'; // assets/js/config.js 의 projectId 와 동일해야 함

const q = (v) => v === null || v === undefined ? 'null'
  : typeof v === 'number' || typeof v === 'boolean' ? String(v)
  : `'${String(v).replace(/'/g, "''")}'`;
const arr = (a) => a && a.length ? `array[${a.map(q).join(', ')}]::text[]` : `'{}'::text[]`;

const p = data.project;
const out = [];
out.push(`-- 자동 생성 파일: node scripts/generate-seed.mjs (원본: data/wedding.json)`);
out.push(`begin;`);
out.push(`delete from projects where id = '${PID}';`);
out.push(`insert into projects (id, name, wedding_date, ceremony_time, venue, timezone, status, estimated_guest_count, budget_target_krw, notes)
values ('${PID}', ${q(p.name)}, ${q(p.wedding_date)}, ${q(p.ceremony_time)}, ${q(p.venue)}, ${q(p.timezone)}, ${q(p.status)}, ${p.estimated_guest_count}, ${p.budget_target_krw}, ${arr(p.notes)});`);

out.push(`\n-- 공동 편집자: 실제 로그인할 이메일로 바꾼 뒤 실행하세요.`);
out.push(`insert into project_members (project_id, email, role) values
  ('${PID}', 'bride@example.com', 'bride'),
  ('${PID}', 'groom@example.com', 'groom');`);

out.push(`\ninsert into confirmed_items (project_id, title, sort_order) values`);
out.push(data.confirmed_items.map((c, i) => `  ('${PID}', ${q(c.title)}, ${i + 1})`).join(',\n') + ';');

const cols = ['id','title','category','start_date','due_date','status','priority','owner','description','estimated_cost_krw','actual_cost_krw','vendor','booking_url','memo'];
out.push(`\ninsert into tasks (project_id, ${cols.join(', ')}) values`);
out.push(data.tasks.map(t => `  ('${PID}', ${cols.map(c => q(t[c])).join(', ')})`).join(',\n') + ';');

const deps = data.tasks.flatMap(t => (t.depends_on || []).map(d => `  ('${PID}', ${q(t.id)}, ${q(d)})`));
out.push(`\ninsert into task_dependencies (project_id, task_id, depends_on_id) values\n${deps.join(',\n')};`);

const scols = ['kind','vendor','vendor_selected','photographer','vendor_booking_required','shoot_date','shoot_date_status','outfit_source','target_completion_date','edited_photo_target_date','window_start','window_end','location_mood','location','backup_date'];
out.push(`\ninsert into shoots (project_id, ${scols.join(', ')}, notes) values`);
out.push(Object.values(data.shoots).map(s => `  ('${PID}', ${scols.map(c => q(s[c])).join(', ')}, ${arr(s.notes)})`).join(',\n') + ';');

out.push(`\ninsert into relative_deadline_rules (project_id, key, label, anchor, offset_days, task_id) values`);
out.push(data.relative_deadline_rules.map(r => `  ('${PID}', ${q(r.key)}, ${q(r.label)}, ${q(r.anchor)}, ${r.offset_days}, ${q(r.task_id)})`).join(',\n') + ';');

const h = data.honeymoon;
out.push(`\ninsert into honeymoon (project_id, route_idea, duration_idea, preferred_period, departure_constraint, prior_commitment, prior_commitment_start, prior_commitment_end, booking_status)
values ('${PID}', ${arr(h.route_idea)}, ${q(h.duration_idea)}, ${q(h.preferred_period)}, ${q(h.departure_constraint)}, ${q(h.prior_commitment)}, ${q(h.prior_commitment_start)}, ${q(h.prior_commitment_end)}, ${q(h.booking_status)});`);

out.push(`commit;\n`);
writeFileSync(join(root, 'supabase/seed.sql'), out.join('\n'));
console.log(`seed.sql: ${data.tasks.length} tasks, ${deps.length} dependencies`);
