import {paStarters} from './templates.js';
// Owned by the evaluation module; never migrates unrelated school modules.
export const EVALUATION_SCHEMA = [
`CREATE TABLE IF NOT EXISTS evaluation_templates (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('pa','assistant')),
 reference TEXT NOT NULL, rubric_json TEXT NOT NULL, verified INTEGER NOT NULL DEFAULT 0,
 created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS evaluation_cases (
 id INTEGER PRIMARY KEY AUTOINCREMENT, personnel_id INTEGER NOT NULL REFERENCES personnel_records(id),
 template_id INTEGER NOT NULL REFERENCES evaluation_templates(id), title TEXT NOT NULL, fiscal_year INTEGER NOT NULL,
 cycle INTEGER NOT NULL DEFAULT 1 CHECK(cycle BETWEEN 1 AND 4), start_date TEXT NOT NULL, end_date TEXT NOT NULL,
 rank TEXT NOT NULL DEFAULT '', challenge TEXT NOT NULL DEFAULT '', evidence_url TEXT NOT NULL DEFAULT '',
 rubric_json TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','open','published')),
 result_json TEXT, published_by INTEGER REFERENCES users(id), published_at TEXT,
 created_by INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS evaluation_assignments (
 id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER NOT NULL REFERENCES evaluation_cases(id),
 user_id INTEGER REFERENCES users(id), guest_name TEXT, guest_org TEXT, invite_hash TEXT UNIQUE, session_hash TEXT UNIQUE,
 expires_at INTEGER, redeemed_at INTEGER, revoked_at INTEGER, created_by INTEGER NOT NULL REFERENCES users(id),
 CHECK ((user_id IS NOT NULL AND guest_name IS NULL) OR (user_id IS NULL AND guest_name IS NOT NULL)),
 UNIQUE(case_id,user_id)
)`,
`CREATE TABLE IF NOT EXISTS evaluation_ballots (
 assignment_id INTEGER PRIMARY KEY REFERENCES evaluation_assignments(id), scores_json TEXT NOT NULL DEFAULT '{}',
 comment TEXT NOT NULL DEFAULT '', revision INTEGER NOT NULL DEFAULT 0, submitted_at TEXT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS evaluation_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER REFERENCES evaluation_cases(id),
 actor_user_id INTEGER REFERENCES users(id), actor_assignment_id INTEGER REFERENCES evaluation_assignments(id),
 action TEXT NOT NULL, detail_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE INDEX IF NOT EXISTS idx_evaluation_personnel ON evaluation_cases(personnel_id,state,fiscal_year)`,
`CREATE INDEX IF NOT EXISTS idx_evaluation_assignee ON evaluation_assignments(user_id,case_id)`
];
const ready = new WeakMap();
// คอลัมน์ที่เพิ่มภายหลัง: extras_json = ภาระงานตาม ก.ค.ศ. / จุดเด่น / จุดที่ควรพัฒนา ของกรรมการแต่ละคน
async function addColumns(env){
 const {results}=await env.DB.prepare("SELECT name FROM pragma_table_info('evaluation_ballots')").all();
 if(!results.some(r=>r.name==='extras_json'))await env.DB.prepare("ALTER TABLE evaluation_ballots ADD COLUMN extras_json TEXT NOT NULL DEFAULT '{}'").run();
}
// เกณฑ์ PA 3 ระดับตามแบบประเมินของโรงเรียน ใช้แทนเกณฑ์ PA รุ่นเดิม (รุ่นเดิมเลิกใช้สร้างรอบใหม่ — รอบที่สร้างแล้วยังใช้เกณฑ์ที่ล็อกไว้)
async function seedPaTemplates(env){
 const {results}=await env.DB.prepare("SELECT name FROM evaluation_templates WHERE kind='pa'").all();
 const have=new Set(results.map(r=>r.name)),missing=paStarters.filter(t=>!have.has(t.name));
 if(!missing.length)return;
 await env.DB.batch([
  env.DB.prepare("UPDATE evaluation_templates SET verified=0 WHERE kind='pa' AND json_extract(rubric_json,'$.rank') IS NULL"),
  ...missing.map(t=>env.DB.prepare('INSERT INTO evaluation_templates(name,kind,reference,rubric_json,verified) VALUES(?,?,?,?,1)').bind(t.name,t.kind,t.reference,JSON.stringify(t.rubric))),
 ]);
}
export function ensureEvaluationSchema(env) {
 let promise=ready.get(env.DB);
 if(!promise){promise=env.DB.batch(EVALUATION_SCHEMA.map(sql=>env.DB.prepare(sql))).then(()=>addColumns(env)).then(()=>seedPaTemplates(env));ready.set(env.DB,promise);promise.catch(()=>ready.delete(env.DB));}
 return promise;
}
