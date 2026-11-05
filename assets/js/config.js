// Supabase 연결 설정
// 비워두면 "로컬 모드"로 동작합니다 (data/wedding.json 을 불러와 이 브라우저에만 저장).
// 값을 채우면 두 사람이 같은 데이터를 실시간으로 공동 편집합니다.
// anon key 는 공개되어도 되는 키입니다. 접근 제어는 DB의 RLS 정책이 담당합니다.
export const SUPABASE_URL = '';       // 예: 'https://abcdxyz.supabase.co'
export const SUPABASE_ANON_KEY = '';  // Supabase > Project Settings > API > anon public
export const PROJECT_ID = '00000000-0000-4000-8000-000000002027'; // seed.sql 과 동일
