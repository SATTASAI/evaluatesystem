import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {starterTemplates} from '../src/evaluation/templates.js';
import {ballotResult} from '../src/evaluation/scoring.js';
const require=createRequire(import.meta.url),pdfMake=require('../public/js/pdfmake.min.js');
const window={};runInNewContext(readFileSync(new URL('../public/js/evaluation-report.js',import.meta.url),'utf8'),{window});
const fonts={Sarabun:{normal:'Sarabun-Regular.ttf',bold:'Sarabun-Bold.ttf',italics:'Sarabun-Regular.ttf',bolditalics:'Sarabun-Bold.ttf'}};
const vfs=Object.fromEntries(['Sarabun-Regular.ttf','Sarabun-Bold.ttf'].map(name=>[name,readFileSync(new URL('../public/fonts/'+name,import.meta.url)).toString('base64')]));
test('PA and assistant reports generate actual PDFs with embedded Thai fonts and their saved scoring results',async()=>{
 const checklist={mode:'checklist',threshold:0,committee_size:1,items:[{id:'p.1',label:'รายการสำหรับทดสอบเท่านั้น',section:'วิชาชีพ',min:0,max:1}],groups:[{section:'วิชาชีพ',required:1}]};
 for(const [kind,rubric] of [['pa',starterTemplates[0].rubric],['assistant',checklist]]){
  const scores=Object.fromEntries(rubric.items.map(i=>[i.id,i.max])),own=ballotResult(rubric,scores);
  const result={mode:rubric.mode,threshold:rubric.threshold,average:own.percent,passed:own.passed,members:[{name:'กรรมการทดสอบ',...own}]};
  const record={kind,rubric,result,full_name:'ครูทดสอบ ภาษาไทย',title:'รอบทดสอบ',fiscal_year:2570,cycle:1,template_name:'เกณฑ์ทดสอบ',personal:true,mine:{name:'กรรมการทดสอบ',scores}};
  const definition=window.EvaluationReport.definition(record);
  const buffer=await new Promise((resolve,reject)=>{try{pdfMake.createPdf(definition,undefined,fonts,vfs).getBuffer(resolve);}catch(error){reject(error);}});
  assert.equal(Buffer.from(buffer.subarray(0,5)).toString(),'%PDF-');
  const bytes=Buffer.from(buffer).toString('latin1');assert.match(bytes,/\/ToUnicode/);assert.match(bytes,/Sarabun/);assert.match(bytes,/%%EOF/);assert(buffer.byteLength>10000);
 }
});

test('PA form PDF follows the school form for each academic rank (levels ticked, workload, strengths/improvements)',async()=>{
 for(const starter of starterTemplates.filter(t=>t.kind==='pa')){
  const rubric=starter.rubric,scores=Object.fromEntries(rubric.items.map((i,n)=>[i.id,1+n%4]));
  const c={rubric,full_name:'ครูทดสอบ ใจดี',fiscal_year:2569,start_date:'2025-10-01',end_date:'2026-09-30',challenge:'พัฒนาการอ่าน',rank:''};
  const member={name:'กรรมการทดสอบ',scores,extras:{workload:'met',strengths:'สอนดี',improvements:'เพิ่มสื่อ'},comment:'ดี'};
  const definition=window.EvaluationReport.formDefinition(c,member);
  const text=JSON.stringify(definition.content);
  assert.match(text,new RegExp(rubric.rank_label.replace(/[()]/g,'.')));
  assert.match(text,/รวมผลการประเมินทั้ง 2 ส่วน/);assert.match(text,/จุดที่ควรพัฒนา/);
  const buffer=await new Promise((resolve,reject)=>{try{pdfMake.createPdf(definition,undefined,fonts,vfs).getBuffer(resolve);}catch(error){reject(error);}});
  assert.equal(Buffer.from(buffer.subarray(0,5)).toString(),'%PDF-');
  if(rubric.rank==='ชำนาญการ')writeFileSync(new URL('../.pa-form-sample.pdf',import.meta.url),Buffer.from(buffer));
 }
});
