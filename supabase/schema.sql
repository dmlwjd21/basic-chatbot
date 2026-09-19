-- 깻잎논쟁 토론 내역 및 요약 리포트 테이블 (debate_records)
CREATE TABLE IF NOT EXISTS debate_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stance TEXT NOT NULL,         -- 1. 사용자가 선택한 입장 ('떼어준다' | '떼어주지 않는다')
    messages JSONB NOT NULL,     -- 2. 5턴 동안 주고받은 사용자와 AI의 전체 대화 내용
    report JSONB NOT NULL,       -- 3. 5턴 종료 후 생성된 3가지 핵심 요소 요약 리포트 결과
    created_at TIMESTAMPTZ NOT NULL DEFAULT now() -- 4. 생성 일시
);

-- RLS (Row Level Security) 활성화
ALTER TABLE debate_records ENABLE ROW LEVEL SECURITY;

-- 익명 사용자 읽기/쓰기 정책
CREATE POLICY "Allow public insert debate records" ON debate_records
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public read debate records" ON debate_records
    FOR SELECT
    USING (true);

-- 검색 성능을 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_debate_records_created_at ON debate_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debate_records_stance ON debate_records(stance);
