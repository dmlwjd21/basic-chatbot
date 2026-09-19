const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
let token = '';
env.split('\n').forEach(l => {
  if (l.startsWith('SUPABASE_ACCESS_TOKEN=')) token = l.split('=')[1].trim();
});

const sql = `
CREATE TABLE IF NOT EXISTS debate_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stance TEXT NOT NULL,
    messages JSONB NOT NULL,
    report JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE debate_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'debate_records' AND policyname = 'Allow public insert debate records'
    ) THEN
        CREATE POLICY "Allow public insert debate records" ON debate_records FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'debate_records' AND policyname = 'Allow public read debate records'
    ) THEN
        CREATE POLICY "Allow public read debate records" ON debate_records FOR SELECT USING (true);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_debate_records_created_at ON debate_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debate_records_stance ON debate_records(stance);
`;

async function run() {
  const res = await fetch('https://api.supabase.com/v1/projects/nnbzdhixxukqdmnakyzo/database/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ query: sql })
  });

  const data = await res.json();
  console.log('Result:', data);
}

run();

