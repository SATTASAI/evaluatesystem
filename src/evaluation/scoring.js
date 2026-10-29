export const RANK_KEYS=['none','ชำนาญการ','ชำนาญการพิเศษ'];
// วิทยฐานะจากทะเบียนบุคลากร → รหัสระดับของเกณฑ์ PA (null = วิทยฐานะที่ยังไม่มีแบบประเมิน เช่น เชี่ยวชาญ)
export function rankKey(rank){
 const r=String(rank??'').replace(/\s+/g,'');
 if(/ชำนาญการพิเศษ|ค\.?ศ\.?3/.test(r))return 'ชำนาญการพิเศษ';
 if(/ชำนาญการ|ค\.?ศ\.?2/.test(r))return 'ชำนาญการ';
 if(/เชี่ยวชาญ|ทรงคุณวุฒิ|ค\.?ศ\.?[4-9]/.test(r))return null;
 return 'none';
}
export class EvaluationError extends Error {
 constructor(message,status=400){super(message);this.status=status;}
}
export function requireValue(condition,message,status=400){if(!condition)throw new EvaluationError(message,status);}
export function validateRubric(rubric) {
 requireValue(rubric && Array.isArray(rubric.items) && rubric.items.length>0 && rubric.items.length<=150,'ต้องระบุเกณฑ์ 1–150 ข้อ');
 requireValue(['each','average','checklist'].includes(rubric.mode),'รูปแบบการตัดสินไม่ถูกต้อง');
 requireValue(Number.isInteger(rubric.committee_size)&&rubric.committee_size>=1&&rubric.committee_size<=10,'จำนวนกรรมการไม่ถูกต้อง');
 requireValue(typeof rubric.threshold==='number'&&Number.isFinite(rubric.threshold)&&rubric.threshold>=0&&rubric.threshold<=100,'เกณฑ์ผ่านไม่ถูกต้อง');
 const ids=new Set();
 for(const item of rubric.items){
  requireValue(typeof item.id==='string'&&/^[a-zA-Z0-9_.-]{1,50}$/.test(item.id)&&!['__proto__','constructor','prototype'].includes(item.id)&&!ids.has(item.id),'รหัสเกณฑ์ซ้ำหรือไม่ถูกต้อง');ids.add(item.id);
  requireValue(typeof item.label==='string'&&item.label.trim().length>0&&item.label.length<=1500,'ชื่อเกณฑ์ไม่ถูกต้อง');
  requireValue(typeof item.section==='string'&&item.section.length>0&&item.section.length<=100,'หมวดเกณฑ์ไม่ถูกต้อง');
  requireValue(typeof item.max==='number'&&Number.isFinite(item.max)&&item.max>0&&item.max<=1000,'คะแนนเต็มไม่ถูกต้อง');
  requireValue(typeof item.min==='number'&&Number.isFinite(item.min)&&item.min>=0&&item.min<=item.max,'คะแนนต่ำสุดไม่ถูกต้อง');
  if(rubric.mode==='checklist')requireValue(item.max===1&&item.min===0,'แบบตรวจรายการต้องใช้ 0/1');
  requireValue(item.points===undefined||(typeof item.points==='number'&&Number.isFinite(item.points)&&item.points>0&&item.points<=1000),'คะแนนที่แปลงได้ไม่ถูกต้อง');
  requireValue(item.description===undefined||(typeof item.description==='string'&&item.description.length<=3000),'คำอธิบายระดับที่คาดหวังยาวเกินไป');
 }
 requireValue(rubric.rank===undefined||RANK_KEYS.includes(rubric.rank),'วิทยฐานะของเกณฑ์ไม่ถูกต้อง');
 requireValue(['workload','feedback'].every(k=>rubric[k]===undefined||typeof rubric[k]==='boolean'),'ตัวเลือกแบบประเมินไม่ถูกต้อง');
 if(rubric.mode==='checklist'){
  requireValue(Array.isArray(rubric.groups)&&rubric.groups.length>0,'ต้องกำหนดจำนวนข้อผ่านรายด้าน');
  for(const group of rubric.groups){
   const count=rubric.items.filter(i=>i.section===group.section).length;
   requireValue(count>0&&Number.isInteger(group.required)&&group.required>=0&&group.required<=count,'จำนวนข้อผ่านรายด้านไม่ถูกต้อง');
  }
  requireValue(new Set(rubric.groups.map(g=>g.section)).size===rubric.groups.length&&rubric.items.every(i=>rubric.groups.some(g=>g.section===i.section)),'ต้องกำหนดเกณฑ์ผ่านให้ครบทุกด้าน');
 }
 return rubric;
}
export function validateScores(rubric,scores,complete=false){
 requireValue(scores&&typeof scores==='object'&&!Array.isArray(scores),'รูปแบบคะแนนไม่ถูกต้อง');
 requireValue(Object.keys(scores).every(id=>rubric.items.some(i=>i.id===id)),'พบคะแนนนอกเกณฑ์');
 for(const item of rubric.items){
  const score=scores[item.id];
  if(score===undefined){requireValue(!complete,'กรุณาประเมินให้ครบทุกข้อ');continue;}
  requireValue(typeof score==='number'&&Number.isFinite(score)&&score>=item.min&&score<=item.max,'คะแนนอยู่นอกช่วง: '+item.label);
  if(rubric.mode==='checklist')requireValue(score===0||score===1,'ผลตรวจรายการต้องเป็น 0 หรือ 1');
 }
 return scores;
}
// ข้อที่มี points: แปลงระดับเป็นคะแนน (ระดับ ÷ ระดับสูงสุด × points) เช่น วิธีดำเนินการ ระดับ 3 จาก 4 = 15 จาก 20
export const itemPoints=(item,score)=>item.points===undefined?score:score/item.max*item.points;
export const itemFull=item=>item.points??item.max;
export function validateExtras(rubric,extras,complete=false){
 const e=extras??{};requireValue(typeof e==='object'&&!Array.isArray(e),'รูปแบบข้อมูลประกอบไม่ถูกต้อง');
 const out={};
 if(rubric.workload){requireValue(e.workload===undefined||e.workload===null||['met','not_met'].includes(e.workload),'ผลภาระงานไม่ถูกต้อง');if(complete)requireValue(e.workload,'กรุณาประเมินภาระงานตามที่ ก.ค.ศ. กำหนด');if(e.workload)out.workload=e.workload;}
 if(rubric.feedback)for(const k of ['strengths','improvements']){requireValue(e[k]===undefined||typeof e[k]==='string','ข้อสังเกตไม่ถูกต้อง');if(e[k])out[k]=e[k].trim().slice(0,4000);}
 return out;
}
export function ballotResult(rubric,scores){
 validateScores(rubric,scores,true);
 const total=rubric.items.reduce((n,i)=>n+itemPoints(i,scores[i.id]),0),max=rubric.items.reduce((n,i)=>n+itemFull(i),0),percent=total/max*100;
 const groups=rubric.mode==='checklist'?rubric.groups.map(g=>({...g,passed:rubric.items.filter(i=>i.section===g.section&&scores[i.id]===1).length})):[];
 return {total,max,percent,groups,passed:rubric.mode==='checklist'?groups.every(g=>g.passed>=g.required):percent>=rubric.threshold};
}
export function summarize(rubric,ballots){
 requireValue(ballots.length===rubric.committee_size,'จำนวนกรรมการยังไม่ครบตามเกณฑ์',409);
 requireValue(ballots.every(b=>b.submitted_at),'กรรมการยังส่งผลประเมินไม่ครบ',409);
 const members=ballots.map(b=>{const extras=JSON.parse(b.extras_json||'{}');return {assignment_id:b.id,name:b.name,...ballotResult(rubric,JSON.parse(b.scores_json)),...(rubric.workload?{workload:extras.workload||null}:{})};});
 const average=members.reduce((n,m)=>n+m.percent,0)/members.length;
 return {members,average,passed:rubric.mode==='average'?average>=rubric.threshold:members.every(m=>m.passed),mode:rubric.mode,threshold:rubric.threshold};
}
