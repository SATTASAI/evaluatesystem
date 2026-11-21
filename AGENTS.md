# AGENTS.md — ระบบประเมินผลการปฏิบัติงาน (evaluatesystem)

ระบบประเมิน PA และครูผู้ช่วย แยก Worker จากระบบโรงเรียน แต่ใช้ฐาน D1 เดียวกัน · https://evaluate.banpadengschool.ac.th

## ข้อมูลระบบ

- Cloudflare Worker `evaluatesystem` (`workers_dev: false`, `run_worker_first: true`)
- D1 `DB` = `banpadeng_school_db` · มี D1 แยกสำหรับ preview (`previews.d1_databases`) — ใช้ตัวนั้นทดสอบ
- ไม่มี package.json · Node 24 ใน CI

## วิธีทำงานในรีโปนี้ (สำหรับ agent)

1. อ่านไฟล์นี้, `README.md` และเอกสารใน `docs/` (ถ้ามี) ก่อนแก้ทุกครั้ง
2. ทำเฉพาะขอบเขตที่ได้รับมอบหมาย ไม่ refactor, ไม่เปลี่ยนชื่อไฟล์/ตาราง/endpoint และไม่อัปเกรด dependency ถ้าไม่ได้สั่ง
3. ถ้างานกระทบข้อมูลจริง สิทธิ์ผู้ใช้ เงิน หรือระบบอื่น ให้หยุดถามก่อนลงมือ
4. แก้ให้น้อยที่สุดที่ทำให้งานสำเร็จ และเขียน/ปรับ test ที่ครอบคลุมพฤติกรรมที่เปลี่ยน
5. รันคำสั่งตรวจในหัวข้อ "คำสั่ง" ให้ผ่านทั้งหมดก่อน commit
6. ตอบผู้ใช้เป็นภาษาไทย กระชับ ข้อความ UI ทั้งหมดเป็นภาษาไทย

## คำสั่ง

```sh
node --check src/index.js
node --check public/js/evaluation.js
node --test tests/*.test.mjs
```

- CI: `.github/workflows/test.yml` รันชุดเดียวกัน

## โครงสร้างไฟล์

```
src/index.js        → router
src/evaluation/     → logic การประเมิน/รายงาน
src/lib/auth.js     → ล็อกอินผ่านระบบโรงเรียน (one-time code)
public/evaluate.html, public/js/, public/css/
docs/evaluation-reports.md
```

## ฐานข้อมูลกลาง `banpadeng_school_db` (ใช้ร่วมหลายระบบ)

ฐาน D1 นี้ใช้ร่วมกับ banpadeng-school-db (system), students-report, publicservice, bpdactivity,
teaching-media, evaluatesystem และ school-cooperative ความผิดพลาดที่นี่กระทบทุกระบบ

- เขียนได้เฉพาะตารางของรีโปนี้: `evaluation_*` (`evaluation_cases`, `evaluation_assignments`, `evaluation_ballots`, `evaluation_templates`, `evaluation_events`, `evaluation_login_*`, `evaluation_pa_photos`)
- ตารางของระบบอื่นอ่านอย่างเดียว: `users`, `students`, `student_details`, `student_enrollments`, `academic_years`, `academic_terms`, `personnel_records` และตารางอื่นของ system และหัวหน้าฝ่าย — ห้ามคัดลอกทะเบียนหรือแก้ชื่อบุคลากรจากระบบนี้
- ตาราง passkey กลาง (`auth_passkeys`, `auth_passkey_users`, `auth_passkey_challenges`, `auth_passkey_rates`) ใช้ร่วมทุกระบบ ห้ามเปลี่ยนโครงสร้าง
- schema สร้างอัตโนมัติด้วย `CREATE TABLE IF NOT EXISTS`/เพิ่มคอลัมน์แบบตรวจก่อน ห้าม `DROP`, `RENAME`, ลบคอลัมน์ หรือเปลี่ยนชนิดข้อมูล
- ห้ามรันคำสั่งเขียน/ลบบนฐานจริง (`--remote`) เพื่อทดสอบ; ใช้ฐาน local/shim หรือ fixture
- ระวังโควต้า D1: query ต้องใช้ index, จำกัดจำนวนแถว, ไม่ scan ทั้งตารางใน cron

## กติกาเฉพาะของระบบ (business rules)

- ไม่เก็บ/รับรหัสผ่านโรงเรียน และไม่ใช้ `JWT_SECRET` ของโรงเรียน
- ล็อกอิน: ส่งไปยืนยันบนระบบโรงเรียน → รหัสใช้ครั้งเดียว 120 วินาที ต้องตรง state/cookie เบราว์เซอร์เดียวกัน → session 7 วัน
- ทุกคำขออ่าน role/status/session_version และหัวหน้าฝ่ายจากฐานปัจจุบัน (ระงับบัญชีมีผลทันที)
- คะแนนร่างและผลที่ยังไม่ยืนยันห้ามปรากฏในฝ่ายบุคลากร
- ผู้ทรงคุณวุฒิภายนอก: ลิงก์เชิญรายบุคคล สิทธิ์สูงสุด 7 วัน ไม่เห็นผลกรรมการคนอื่น

## ข้อตกลงการเขียนโค้ด

- เวลาและวันที่อิงเวลาไทย `Asia/Bangkok` (UTC+7) ทุกจุด ทั้งการคำนวณวัน ตัดรอบ และ cron; แสดงปีเป็น พ.ศ. แต่เก็บเป็น ISO/ค.ศ.
- SQL ใช้ prepared statement + `.bind()` เท่านั้น ห้ามต่อสตริงจากค่าที่ผู้ใช้ส่งมา
- ตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์ทุก endpoint (role/status/session ปัจจุบันจากฐาน) อย่าเชื่อค่าจากหน้าเว็บ
- งานที่เขียนหลายแถวต้องเป็น atomic (`db.batch()`) และกันกดซ้ำ (idempotency key) เมื่อเป็นรายการเงินหรือรายการสำคัญ
- การลบข้อมูลสำคัญใช้ soft delete/ยกเลิกพร้อมเหตุผล และบันทึก audit แทนการลบแถว
- หน้าเว็บต้องใช้ได้บนมือถือ (iPhone Safari/PWA) และจอกว้าง ใช้ฟอนต์และสไตล์เดิมของรีโป
- escape ข้อความก่อนใส่ลง HTML เสมอ (กัน XSS) และอย่าเพิ่ม CDN/สคริปต์ภายนอกใหม่ถ้าไม่จำเป็น

## ความปลอดภัยและ secrets

- ห้าม commit secret, token, รหัสผ่าน, `.env`, `.dev.vars`, ไฟล์สำรองฐานข้อมูล หรือข้อมูลนักเรียน/บุคลากรจริงลง Git
- secret ตั้งผ่าน Cloudflare dashboard หรือ `wrangler secret put` เท่านั้น (`keep_vars: true` ทำให้ค่าที่ตั้งใน dashboard ไม่ถูกทับ)
- ข้อมูลนักเรียนเป็นข้อมูลส่วนบุคคลของผู้เยาว์: ห้าม log ชื่อ เลขประจำตัว ที่อยู่ หรือข้อมูลผู้ปกครองลง console/observability
- ห้ามปิดหรือผ่อนการตรวจสิทธิ์ การจำกัดความถี่ล็อกอิน Turnstile หรือ passkey เพื่อให้ทดสอบง่าย

## ห้ามแตะ / ต้องระวังเป็นพิเศษ

- การเปิดเผยผลประเมิน/คะแนนกรรมการ (ข้อมูลอ่อนไหวของบุคลากร)
- flow ล็อกอินใน `src/lib/auth.js`

## ระบบที่เชื่อมกัน

- banpadeng-school-db: ยืนยันตัวตน + หน้าผลในฝ่ายบุคลากรอ่านผลที่ยืนยันแล้ว (`docs/evaluation.md` ฝั่งนั้น)

## Deploy

- Cloudflare เชื่อม `main` root `/` คำสั่ง `npx wrangler deploy`: merge = ขึ้นจริง

## เลขเวอร์ชันกลาง (แพทช์ข้ามรีโป)

รีโปนี้เชื่อมกับระบบบริหารโรงเรียน (D1 กลางและการยืนยันตัวตนผ่าน system) จึงอยู่ในขอบเขตแพทช์กลาง:

- ทุกชุดการแก้ไขที่ merge/push เข้า `main` ต้องออกเลขแพทช์ใหม่ใน
  [`SATTASAI/banpadeng-school-db/CHANGELOG.md`](https://github.com/SATTASAI/banpadeng-school-db/blob/main/CHANGELOG.md) รวมงานเอกสาร
- อ่านเลขล่าสุดจาก CHANGELOG นั้นก่อนเสมอ ห้ามนับเลขแยกในรีโปนี้
- งานเล็ก/กลางเพิ่มเลขส่วนที่สาม งานใหญ่เพิ่มเลขส่วนที่สอง งานหลายรีโปในชุดเดียวใช้เลขเดียวและลิงก์ PR ทุกรีโป
- รายละเอียดกติกาอยู่ใน `README.md` ของ banpadeng-school-db หัวข้อ "เวอร์ชันและบันทึก Patch Update"

## Checklist ก่อนเปิด PR / merge

- [ ] test และ syntax check ทั้งหมดผ่าน
- [ ] ไม่มี secret/ข้อมูลจริงใน diff (`git diff --cached` ตรวจก่อน commit)
- [ ] ไม่แก้ `database_id`, `routes`, `services` และชื่อ Worker ใน wrangler config โดยไม่ได้สั่ง
- [ ] schema เปลี่ยนแบบเพิ่มเท่านั้น (add table/column) และรันซ้ำได้ ไม่ทำให้ข้อมูลเดิมหรือระบบอื่นพัง
- [ ] อัปเดต `README.md`/`docs/` เมื่อพฤติกรรมหรือขั้นตอนติดตั้งเปลี่ยน และบันทึกการตัดสินใจถาวรของผู้ใช้ลงไฟล์นี้
- [ ] commit/PR อธิบายเป็นภาษาไทยว่าเปลี่ยนอะไร เพราะอะไร และทดสอบอย่างไร
