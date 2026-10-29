import {PA_TITLES,PA_EXPECTED} from './pa-criteria.js';
// PA ตามแบบประเมินของโรงเรียน (ปีงบประมาณ 2569) แยกตามวิทยฐานะ: ส่วนที่ 1 ระดับ 1–4 × 15 ข้อ = 60 คะแนน · ส่วนที่ 2 ระดับ 1–4 แปลงเป็น 20/10/10 = 40 คะแนน
export const PA_RANKS=[['none','ครู (ยังไม่มีวิทยฐานะ)'],['ชำนาญการ','ครู วิทยฐานะครูชำนาญการ'],['ชำนาญการพิเศษ','ครู วิทยฐานะครูชำนาญการพิเศษ']];
const PA_SECTIONS={'1':'1. ด้านการจัดการเรียนรู้','2':'2. ด้านการส่งเสริมและสนับสนุนการจัดการเรียนรู้','3':'3. ด้านการพัฒนาตนเองและวิชาชีพ'};
const PA_CHALLENGE='ส่วนที่ 2 ประเด็นท้าทาย';
export function paRubric(rank){
 const label=PA_RANKS.find(r=>r[0]===rank)[1];
 return {mode:'each',threshold:70,committee_size:3,rank,rank_label:label,workload:true,feedback:true,
  notes:'ให้ระดับ 1–4 ทุกข้อ (1 ต่ำกว่าระดับที่คาดหวังมาก · 2 ต่ำกว่าระดับที่คาดหวัง · 3 ตามระดับที่คาดหวัง · 4 สูงกว่าระดับที่คาดหวัง) — ส่วนที่ 1 รวม 60 คะแนน ส่วนที่ 2 รวม 40 คะแนน เกณฑ์ผ่าน: คะแนนจากกรรมการแต่ละคนไม่ต่ำกว่าร้อยละ 70',
  items:[...Object.entries(PA_TITLES).map(([id,title])=>({id,label:title,description:PA_EXPECTED[rank][id],section:PA_SECTIONS[id[0]],part:1,min:1,max:4,points:4})),
  {id:'challenge.method',label:'วิธีดำเนินการ',description:'พิจารณาจากการดำเนินการที่ถูกต้อง ครบถ้วน เป็นไปตามระยะเวลาที่กำหนดไว้ในข้อตกลง และสะท้อนให้เห็นถึงระดับการปฏิบัติที่คาดหวังตามตำแหน่งและวิทยฐานะ',section:PA_CHALLENGE,part:2,min:1,max:4,points:20},
  {id:'challenge.quantity',label:'ผลลัพธ์การเรียนรู้ของผู้เรียนที่คาดหวัง เชิงปริมาณ',description:'พิจารณาจากการบรรลุเป้าหมายเชิงปริมาณได้ครบถ้วนตามข้อตกลง และมีความถูกต้อง เชื่อถือได้',section:PA_CHALLENGE,part:2,min:1,max:4,points:10},
  {id:'challenge.quality',label:'ผลลัพธ์การเรียนรู้ของผู้เรียนที่คาดหวัง เชิงคุณภาพ',description:'พิจารณาจากการบรรลุเป้าหมายเชิงคุณภาพได้ครบถ้วน ถูกต้อง เชื่อถือได้ และปรากฏผลต่อคุณภาพผู้เรียนได้ตามข้อตกลง',section:PA_CHALLENGE,part:2,min:1,max:4,points:10}]};
}
export const paStarters=PA_RANKS.map(([rank,label])=>({name:'PA '+label+' — แบบประเมินโรงเรียน 2569',kind:'pa',reference:'แบบประเมินผลการพัฒนางานตามข้อตกลง (PA) โรงเรียนบ้านป่าเด็ง ปีงบประมาณ 2569 ตาม ว9/2564',rubric:paRubric(rank)}));
export const starterTemplates=[...paStarters, ...[1,3].map(cycle=>({
 name:`ครูผู้ช่วย ว19/2568 — ครั้งที่ ${cycle===1?'1–2':'3–4'} (รอตรวจรายการฉบับเต็ม)`,kind:'assistant',reference:'ว19/2568 — https://circular.otepc.go.th/files/W19-2568_.pdf',
 rubric:{mode:'checklist',threshold:0,committee_size:3,notes:'โครงสร้างจำนวนข้อเท่านั้น ยังไม่ใช่แบบพร้อมใช้ ต้องแทนชื่อรายการด้วยรายการในแบบบันทึก ก.ค.ศ. ฉบับเต็ม และตรวจจำนวนข้อ/เงื่อนไขตามรอบก่อนยืนยัน ห้ามนำรายการชั่วคราวไปใช้ประเมินจริง',
 items:[...Array.from({length:15},(_,i)=>({id:'professional.'+(i+1),section:'ด้านวิชาชีพ',label:'รอระบุรายการตามแบบ ก.ค.ศ. ด้านวิชาชีพ ข้อ '+(i+1),min:0,max:1})),
 ...(cycle===3?Array.from({length:3},(_,i)=>({id:'social.'+(i+1),section:'ด้านสังคม',label:'รอระบุรายการตามแบบ ก.ค.ศ. ด้านสังคม ข้อ '+(i+1),min:0,max:1})):[]),
 ...Array.from({length:16},(_,i)=>({id:'personal.'+(i+1),section:'ด้านคุณลักษณะส่วนบุคคล',label:'รอระบุรายการตามแบบ ก.ค.ศ. ด้านคุณลักษณะส่วนบุคคล ข้อ '+(i+1),min:0,max:1}))],
 groups:[{section:'ด้านวิชาชีพ',required:cycle===1?9:11},...(cycle===3?[{section:'ด้านสังคม',required:3}]:[]),{section:'ด้านคุณลักษณะส่วนบุคคล',required:cycle===1?7:11}]}
}))];
