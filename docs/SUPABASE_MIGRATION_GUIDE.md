# Supabase 마이그레이션 빠른 가이드

## 문제
관리자 페이지에서 API 500 오류 발생

## 해결 방법

### 1. Supabase Dashboard에서 SQL 실행

1. **Supabase 대시보드 접속**: https://supabase.com/dashboard
2. **프로젝트 선택**
3. **왼쪽 메뉴에서 "SQL Editor" 클릭**
4. **"New query" 클릭**

### 2. 다음 SQL을 순서대로 실행

#### Step 1: guides 테이블 생성 (이미 있다면 스킵)
```sql
-- Create guides table
create table if not exists guides (
  page_type text primary key,
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table guides enable row level security;

-- Create policies
create policy "Public guides are viewable by everyone"
  on guides for select
  using ( true );

create policy "Enable insert for everyone"
  on guides for insert
  to public
  with check ( true );

create policy "Enable update for everyone"
  on guides for update
  to public
  using ( true )
  with check ( true );
```

#### Step 2: updated_at 자동 업데이트 트리거 생성
```sql
-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create trigger for guides table
drop trigger if exists update_guides_updated_at on guides;

create trigger update_guides_updated_at
  before update on guides
  for each row
  execute function update_updated_at_column();
```

### 3. 실행 확인

각 SQL 블록을 복사해서:
1. SQL Editor에 붙여넣기
2. "Run" 또는 `Ctrl+Enter` 로 실행
3. 성공 메시지 확인

### 4. 테스트

1. 배포된 사이트에서 `/admin.html` 접속
2. 로그인
3. 페이지 선택
4. 내용이 로드되는지 확인
5. 저장 테스트

## 오류가 계속되면

### 환경 변수 확인
Vercel 대시보드에서 다음 환경 변수가 설정되어 있는지 확인:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (또는 `SUPABASE_ANON_KEY`)

### 테이블 확인
Supabase Dashboard → Table Editor → guides 테이블이 생성되었는지 확인

### 로그 확인
Vercel Dashboard → 프로젝트 → Functions → Logs에서 오류 확인

## 완료!

마이그레이션이 완료되면 관리자 페이지가 정상 작동합니다.
