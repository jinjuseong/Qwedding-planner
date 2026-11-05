-- 이미 예전 schema.sql(로그인 필요 버전)을 실행한 경우에만 실행하세요.
-- 로그인 없이 누구나 조회·수정·삭제할 수 있도록 권한 정책을 바꿉니다. 여러 번 실행해도 안전합니다.
-- ---------- Row Level Security: 로그인 없이 공개 편집 ----------------
-- 누구나(anon 포함) 조회·추가·수정·삭제할 수 있습니다. 사이트 주소를 아는 사람은 모두 편집 가능.
-- project_members 는 사용하지 않으며 공개하지 않습니다(정책 없음 = 접근 불가).
do $$
declare t text;
begin
  foreach t in array array['projects','project_members','confirmed_items','tasks','task_dependencies',
                           'shoots','relative_deadline_rules','recurring_rules','honeymoon'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %1$s_read  on %1$I', t);
    execute format('drop policy if exists %1$s_write on %1$I', t);
    execute format('drop policy if exists %1$s_public on %1$I', t);
    if t <> 'project_members' then
      execute format('create policy %1$s_public on %1$I for all to anon, authenticated using (true) with check (true)', t);
    end if;
  end loop;
end $$;

-- ---------- API 접근 권한 (로그인 없는 공개 접근) ----------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
