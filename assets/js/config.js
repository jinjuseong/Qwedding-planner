// Supabase 연결 설정
// 비워두면 "로컬 모드"로 동작합니다 (data/wedding.json 을 불러와 이 브라우저에만 저장).
// 값을 채우면 두 사람이 같은 데이터를 실시간으로 공동 편집합니다.
// anon key 는 공개되어도 되는 키입니다. 접근 제어는 DB의 RLS 정책이 담당합니다.
export const SUPABASE_URL = 'https://vfptrtomlnlrfhsduzsu.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcHRydG9tbG5scmZoc2R1enN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4NzQ2MzIsImV4cCI6MjEwOTQ1MDYzMn0.mOfA3kkbnkSL6yapkn-GVLWUrB0fvQQn6iChJOZufWA'; // 공개용 anon 키 (접근 제어는 RLS)
export const PROJECT_ID = '00000000-0000-4000-8000-000000002027'; // seed.sql 과 동일
