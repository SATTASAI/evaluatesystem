(()=>{'use strict';
 const kindName=kind=>kind==='assistant'?'ครูผู้ช่วย':'PA';
 const number=value=>Number(value||0).toFixed(2);
 const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('th',{granularity:'word'}):null;
 const thai=value=>{const text=String(value??'');return text.length>60&&segmenter?[...segmenter.segment(text)].map(part=>part.segment).join('\u200b'):text;};
 let loading,fontFiles;
 function loadLibrary(){
  if(window.pdfMake)return Promise.resolve();
  if(!loading)loading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/js/pdfmake.min.js';script.onload=resolve;script.onerror=()=>reject(new Error('โหลดเครื่องมือ PDF ไม่สำเร็จ กรุณาลองใหม่'));document.head.append(script);}).catch(e=>{loading=null;throw e;});
  return loading;
 }
 function definition(record){
  const result=record.result;
  if(!result?.members?.length)throw new Error('ยังไม่มีผลสรุปที่สามารถส่งออกได้');
  const content=[
   {text:'โรงเรียนบ้านป่าเด็ง',style:'school'},
   {text:'สรุปผลการประเมิน'+kindName(record.kind),style:'title'},
   {text:record.personal?'ผลการประเมินของกรรมการรายบุคคล':record.published_at?'ผลที่ผู้บริหารยืนยันเผยแพร่แล้ว':'ผลสรุปรอผู้บริหารยืนยัน',style:'status'},
   {text:'ผู้รับการประเมิน: '+thai(record.full_name),margin:[0,12,0,4]},
   {text:thai(record.title)+' · ปีงบประมาณ '+thai(record.fiscal_year)+' · ครั้งที่ '+thai(record.cycle)},
   {text:'เกณฑ์: '+thai(record.template_name),margin:[0,4,0,4]},
   ...(record.reference?[{text:'เอกสารอ้างอิง: '+thai(record.reference),fontSize:10,margin:[0,0,0,8]}]:[]),
   {text:'ผลการประเมิน: '+(result.passed?'ผ่านเกณฑ์':'ไม่ผ่านเกณฑ์'),style:'result'},
   {text:result.mode==='checklist'?'ตัดสินจากจำนวนรายการที่ผ่านตามเกณฑ์รายด้าน คะแนนร้อยละแสดงเพื่อประกอบการอ่าน':result.mode==='each'?'กรรมการแต่ละคนต้องผ่านเกณฑ์ร้อยละ '+result.threshold:'ตัดสินจากคะแนนเฉลี่ยกรรมการ',fontSize:11,margin:[0,4,0,8]},
   {text:'คะแนนเฉลี่ย '+number(result.average)+'%',margin:[0,0,0,10]},
   {table:{headerRows:1,widths:['*',75,55,55],body:[
    ['กรรมการ','คะแนน / เต็ม','ร้อยละ','ผล'],
    ...result.members.map(m=>[thai(m.name),number(m.total)+' / '+thai(m.max),number(m.percent),m.passed?'ผ่าน':'ไม่ผ่าน'])
   ]},layout:'lightHorizontalLines'}
  ];
  for(const member of result.members){if(member.groups?.length)content.push({text:'ผลรายด้าน — '+thai(member.name),bold:true,margin:[0,14,0,6]},{table:{headerRows:1,widths:['*',65,70],body:[['ด้าน','ผ่าน (ข้อ)','ต้องผ่าน (ข้อ)'],...member.groups.map(g=>[thai(g.section),String(g.passed),String(g.required)])]},layout:'lightHorizontalLines'});}
  if(record.rubric?.items&&record.mine?.scores){
   content.push({text:'รายการที่ประเมิน — '+thai(record.mine.name),bold:true,margin:[0,16,0,6]},
    {table:{headerRows:1,widths:['*',75,65],body:[['รายการประเมิน','ผล / คะแนน','คะแนนเต็ม'],...record.rubric.items.map(item=>[thai(item.section)+'\n'+thai(item.id)+' '+thai(item.label),record.mine.scores[item.id]===undefined?'ยังไม่ประเมิน':record.rubric.mode==='checklist'?(record.mine.scores[item.id]===1?'ผ่าน':'ไม่ผ่าน'):String(record.mine.scores[item.id]),String(item.max)])]},layout:'lightHorizontalLines'});
   if(record.mine.comment)content.push({text:'ข้อเสนอแนะ: '+thai(record.mine.comment),margin:[0,12,0,0]});
  }
  if(record.published_at)content.push({text:'ยืนยันเผยแพร่เมื่อ '+thai(record.published_at),fontSize:10,margin:[0,14,0,0]});
  return {pageSize:'A4',pageMargins:[40,40,40,48],defaultStyle:{font:'Sarabun',fontSize:12,lineHeight:1.25},styles:{school:{fontSize:17,bold:true,alignment:'center'},title:{fontSize:18,bold:true,alignment:'center',margin:[0,6,0,6]},status:{fontSize:11,alignment:'center',color:'#526579'},result:{fontSize:16,bold:true,margin:[0,10,0,0]}},content,footer:(page,total)=>({text:'โรงเรียนบ้านป่าเด็ง · หน้า '+page+' / '+total,alignment:'center',font:'Sarabun',fontSize:9,margin:[40,12,40,0]})};
 }
 // ---------- แบบประเมิน PA ตามฟอร์มของโรงเรียน (ต่อกรรมการ 1 คน) ----------
 const TH_MONTHS=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
 const thDate=iso=>{const [y,m,d]=String(iso||'').slice(0,10).split('-').map(Number);return y?`วันที่ ${d} เดือน ${TH_MONTHS[m-1]} พ.ศ. ${y+543}`:'';};
 const CHECK={svg:'<svg width="11" height="11" viewBox="0 0 11 11"><path d="M1.5 6 L4.5 9 L9.5 1.5" stroke="#000" stroke-width="1.6" fill="none"/></svg>',width:11,alignment:'center'};
 const box=on=>({svg:`<svg width="11" height="11" viewBox="0 0 11 11"><rect x="0.5" y="0.5" width="10" height="10" stroke="#000" fill="none"/>${on?'<path d="M2 6 L4.5 8.5 L9 2.5" stroke="#000" stroke-width="1.5" fill="none"/>':''}</svg>`,width:11});
 const dots='..............................................................................................................................';
 const full=i=>i.points??i.max,pts=(i,v)=>i.points===undefined?v:v/i.max*i.points,num=n=>Number(n).toFixed(2).replace(/\.00$/,'');
 const LEVEL_HEAD=[['1','ปฏิบัติได้ต่ำกว่าระดับฯ ที่คาดหวังมาก'],['2','ปฏิบัติได้ต่ำกว่าระดับฯ ที่คาดหวัง'],['3','ปฏิบัติได้ตามระดับฯ ที่คาดหวัง'],['4','ปฏิบัติได้สูงกว่าระดับฯ ที่คาดหวัง']];
 function levelTable(items,scores,firstHead){
  const head=[{text:firstHead,style:'th',rowSpan:2},{text:'ผลการประเมิน',style:'th',colSpan:4},{},{},{},{text:'หมายเหตุ',style:'th',rowSpan:2}];
  const head2=[{},...LEVEL_HEAD.map(([n,t])=>({text:[{text:n+'\n',bold:true},{text:t,fontSize:8}],style:'th'})),{}];
  const body=[head,head2];let section='';
  for(const i of items){
   if(i.section!==section){section=i.section;body.push([{text:thai(section),bold:true,colSpan:6,fillColor:'#eeeeee'},{},{},{},{},{}]);}
   const v=scores[i.id];
   body.push([{stack:[{text:thai((i.part===2?'':i.id+' ')+i.label)+(i.points&&i.part===2?` (${num(i.points)} คะแนน)`:''),bold:true},...(i.description?[{text:thai(i.description),fontSize:10.5}]:[])]},
    ...[1,2,3,4].map(n=>v===n?{...CHECK,margin:[0,4,0,0]}:''),v===undefined?{text:'ยังไม่ประเมิน',fontSize:9}:{text:i.points!==undefined?num(pts(i,v))+' คะแนน':'',fontSize:9,alignment:'center'}]);
  }
  return {table:{headerRows:2,dontBreakRows:true,widths:['*',34,34,34,34,52],body},layout:{hLineWidth:()=>0.6,vLineWidth:()=>0.6,paddingTop:()=>3,paddingBottom:()=>3}};
 }
 function formDefinition(c,member){
  const rubric=c.rubric,scores=member?.scores||{},extras=member?.extras||{};
  if(!member||!Object.keys(scores).length)throw new Error('กรรมการยังไม่ได้ให้คะแนน');
  const part1=rubric.items.filter(i=>i.part!==2),part2=rubric.items.filter(i=>i.part===2);
  const sum=list=>list.reduce((n,i)=>n+(scores[i.id]===undefined?0:pts(i,scores[i.id])),0),max=list=>list.reduce((n,i)=>n+full(i),0);
  const total=sum(rubric.items),totalMax=max(rubric.items),percent=totalMax?total/totalMax*100:0,complete=rubric.items.every(i=>scores[i.id]!==undefined);
  const rankLabel=rubric.rank_label||('ครู '+(c.rank||''));
  const sign=()=>[{text:'(ลงชื่อ) ........................................................ กรรมการผู้ประเมิน',margin:[200,24,0,2]},{text:'( '+thai(member.name)+' )',alignment:'center',margin:[200,0,0,2]},{text:member.guest_org?'หน่วยงาน '+thai(member.guest_org):'ตำแหน่ง ................................................................',margin:[200,0,0,2]},{text:'วันที่............ เดือน...................................... พ.ศ. ...........',margin:[200,0,0,0]}];
  const content=[
   {text:'แบบประเมินผลการพัฒนางานตามข้อตกลง (PA)',style:'title'},
   {text:'สำหรับข้าราชการครูและบุคลากรทางการศึกษา ตำแหน่ง '+thai(rankLabel),style:'center'},
   {text:'โรงเรียนบ้านป่าเด็ง สำนักงานเขตพื้นที่การศึกษาประถมศึกษาเพชรบุรี เขต 2',style:'center'},
   {text:'ประจำปีงบประมาณ พ.ศ. '+thai(c.fiscal_year),style:'center'},
   {text:'(รอบการประเมิน ระหว่าง'+thDate(c.start_date)+' ถึง'+thDate(c.end_date)+')',style:'center',margin:[0,0,0,10]},
   {text:'ข้อมูลผู้รับการประเมิน',bold:true},
   {text:'ชื่อ–นามสกุล  '+thai(c.full_name)+'    ตำแหน่ง  ครู    วิทยฐานะ  '+thai(rubric.rank==='none'?'ยังไม่มีวิทยฐานะ':rubric.rank||c.academic_rank||c.rank||'-')},
   {text:'สถานศึกษา  โรงเรียนบ้านป่าเด็ง    สังกัด  สำนักงานเขตพื้นที่การศึกษาประถมศึกษาเพชรบุรี เขต 2'},
   {text:'รับเงินเดือนในอันดับ คศ. .......... อัตราเงินเดือน .................... บาท',margin:[0,0,0,8]},
   {text:'ให้ทำเครื่องหมาย / ในช่องที่ตรงกับผลการประเมิน หรือให้คะแนนตามระดับคุณภาพ',fontSize:11,margin:[0,0,0,6]},
   {text:'ส่วนที่ 1 ข้อตกลงในการพัฒนางานตามมาตรฐานตำแหน่ง ('+num(max(part1))+' คะแนน)',bold:true},
   ...(rubric.workload?[{columns:[{text:'1) ภาระงาน',width:80},box(extras.workload==='met'),{text:' เป็นไปตามที่ ก.ค.ศ. กำหนด',width:150},box(extras.workload==='not_met'),{text:' ไม่เป็นไปตามที่ ก.ค.ศ. กำหนด',width:'*'}],columnGap:4,margin:[16,4,0,4]}]:[]),
   {text:(rubric.workload?'2) ':'')+'การปฏิบัติงานและผลการปฏิบัติงานตามมาตรฐานตำแหน่งครู',margin:[16,0,0,4]},
   levelTable(part1,scores,'ลักษณะงานที่ปฏิบัติตามมาตรฐานตำแหน่ง\nระดับการปฏิบัติที่คาดหวัง'),
   {text:'คะแนนส่วนที่ 1 = '+num(sum(part1))+' / '+num(max(part1))+' คะแนน',alignment:'right',bold:true,margin:[0,4,0,10]},
   ...(part2.length?[{text:'ส่วนที่ 2 ข้อตกลงในการพัฒนางานที่เสนอเป็นประเด็นท้าทายในการพัฒนาผลลัพธ์การเรียนรู้ของผู้เรียน ('+num(max(part2))+' คะแนน)',bold:true,pageBreak:'before',margin:[0,0,0,4]},
    ...(c.challenge?[{text:'ประเด็นท้าทาย: '+thai(c.challenge),fontSize:11,margin:[0,0,0,6]}]:[]),
    levelTable(part2,scores,'ลักษณะงานที่ปฏิบัติตามมาตรฐานตำแหน่ง\nระดับการปฏิบัติที่คาดหวัง'),
    {text:'คะแนนส่วนที่ 2 = '+num(sum(part2))+' / '+num(max(part2))+' คะแนน',alignment:'right',bold:true,margin:[0,4,0,8]}]:[]),
   {text:'รวมผลการประเมินทั้ง 2 ส่วน = '+num(total)+' คะแนน'+(totalMax!==100?' (จาก '+num(totalMax)+')':''),bold:true,fontSize:14,margin:[0,6,0,2]},
   ...(rubric.mode!=='checklist'&&complete?[{text:'คิดเป็นร้อยละ '+num(percent)+' — '+(percent>=rubric.threshold?'ผ่านเกณฑ์':'ไม่ผ่านเกณฑ์')+' (เกณฑ์ผ่าน: คะแนนจากกรรมการแต่ละคนไม่ต่ำกว่าร้อยละ '+num(rubric.threshold)+')',fontSize:11}]:[]),
   ...sign(),
   {text:'สรุปข้อสังเกตเกี่ยวกับ จุดเด่น จุดที่ควรพัฒนา และข้อคิดเห็น',style:'title',pageBreak:'before'},
   {text:'ราย '+thai(c.full_name),margin:[0,6,0,8]},
   ...[['1. จุดเด่น',extras.strengths],['2. จุดที่ควรพัฒนา',extras.improvements],['3. ข้อคิดเห็น',member.comment]].flatMap(([h,t])=>[{text:h,bold:true,margin:[0,6,0,2]},{text:t?thai(t):dots+'\n'+dots+'\n'+dots,margin:[16,0,0,4]}]),
   ...sign()
  ];
  return {pageSize:'A4',pageMargins:[40,36,40,44],defaultStyle:{font:'Sarabun',fontSize:12,lineHeight:1.2},styles:{title:{fontSize:16,bold:true,alignment:'center'},center:{alignment:'center'},th:{bold:true,alignment:'center',fontSize:10.5}},content,
   footer:(page,total)=>({text:'แบบประเมิน PA · '+c.full_name+' · กรรมการ '+member.name+' · หน้า '+page+' / '+total,alignment:'center',font:'Sarabun',fontSize:8,margin:[40,12,40,0]})};
 }
 async function download(doc,name){
  await loadLibrary();
  if(!fontFiles)fontFiles=Promise.all(['Sarabun-Regular.ttf','Sarabun-Bold.ttf'].map(async name=>{const response=await fetch('/fonts/'+name);if(!response.ok)throw new Error('โหลดฟอนต์ PDF ไม่สำเร็จ');const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return [name,btoa(binary)];})).then(Object.fromEntries).catch(e=>{fontFiles=null;throw e;});
  const vfs=await fontFiles,fonts={Sarabun:{normal:'Sarabun-Regular.ttf',bold:'Sarabun-Bold.ttf',italics:'Sarabun-Regular.ttf',bolditalics:'Sarabun-Bold.ttf'}};
  const filename=name.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_')+'.pdf';
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('สร้าง PDF ใช้เวลานานเกินไป กรุณาลองใหม่')),30000);try{window.pdfMake.createPdf(doc,undefined,fonts,vfs).getBlob(blob=>{const href=URL.createObjectURL(blob),link=document.createElement('a');link.href=href;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(href),60000);clearTimeout(timer);resolve();});}catch(e){clearTimeout(timer);reject(e);}});
 }
 async function exportForm(c,member){return download(formDefinition(c,member),'แบบประเมิน-PA-'+c.full_name+'-'+c.fiscal_year+'-'+member.name);}
 async function exportPdf(record){
  const doc=definition(record);await loadLibrary();
  if(!fontFiles)fontFiles=Promise.all(['Sarabun-Regular.ttf','Sarabun-Bold.ttf'].map(async name=>{const response=await fetch('/fonts/'+name);if(!response.ok)throw new Error('โหลดฟอนต์ PDF ไม่สำเร็จ');const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return [name,btoa(binary)];})).then(Object.fromEntries).catch(e=>{fontFiles=null;throw e;});
  const vfs=await fontFiles,fonts={Sarabun:{normal:'Sarabun-Regular.ttf',bold:'Sarabun-Bold.ttf',italics:'Sarabun-Regular.ttf',bolditalics:'Sarabun-Bold.ttf'}};
  const filename=('ผลประเมิน-'+kindName(record.kind)+'-'+thai(record.full_name)+'-'+thai(record.fiscal_year)+'-'+thai(record.cycle)).replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_')+'.pdf';
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('สร้าง PDF ใช้เวลานานเกินไป กรุณาลองใหม่')),30000);try{window.pdfMake.createPdf(doc,undefined,fonts,vfs).getBlob(blob=>{const href=URL.createObjectURL(blob),link=document.createElement('a');link.href=href;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(href),60000);clearTimeout(timer);resolve();});}catch(e){clearTimeout(timer);reject(e);}});
 }
 window.EvaluationReport={exportPdf,definition,exportForm,formDefinition};
})();
