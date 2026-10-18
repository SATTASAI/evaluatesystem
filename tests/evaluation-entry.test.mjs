import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const script=readFileSync(new URL('../public/js/evaluation.js',import.meta.url),'utf8');
async function openPage(permissions,{search='',hash='',inviteError=false,cases=[]}={}){
 const elements=new Map(),requests=[],redirects=[],errors=[];
 const element=id=>{if(!elements.has(id))elements.set(id,{hidden:true,textContent:'',className:'',innerHTML:'',value:'',disabled:false,addEventListener(){},prepend(){},querySelectorAll(){return [];}});return elements.get(id);};
 const location={pathname:'/evaluate',search,hash,replace:url=>redirects.push(url)};
 const document={getElementById:element,querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>({})};
 const fetch=async(url,options)=>{
  requests.push({url,method:options?.method});
  if(url.endsWith('/guest/session')&&inviteError)return Response.json({error:'ลิงก์เชิญหมดอายุ'},{status:401});
  if(url.endsWith('/permissions'))return Response.json(permissions);
  if(url.endsWith('/templates'))return Response.json({templates:[],starters:[]});
  if(url.endsWith('/people?kind=pa'))return Response.json({people:[{id:2,full_name:'ครูเป้าหมาย',position:'ครู',academic_rank:'ค.ศ. 1'}],evaluators:[]});
  if(url.endsWith('/cases'))return Response.json({cases});
  return Response.json({ok:true});
 };
 runInNewContext(script,{document,location,fetch,URLSearchParams,history:{replaceState(){}},console:{error:e=>errors.push(e)}});
 // Finish the asynchronous page initialization, including response body reads.
 for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(errors,[]);
 return {element,requests,redirects};
}

test('opening evaluate without a session stays on the evaluation page',async()=>{
 const page=await openPage({access:false,user:null,guest:null});
 assert.deepEqual(page.redirects,[]);
 assert.equal(page.element('loginPanel').hidden,true);
 assert.equal(page.element('app').hidden,false);
 assert.equal(page.requests.length,1);
 assert.equal(page.element('newCase').hidden,true);
 assert.equal(page.element('refresh').disabled,true);
 assert.equal(page.element('metrics').hidden,true);
 assert.match(page.element('caseList').innerHTML,/href="\/auth\/start"/);
});

test('an existing authorized session opens the evaluation list directly',async()=>{
 const page=await openPage({access:true,user:{full_name:'ผู้บริหาร'},guest:null,manage:true});
 assert.deepEqual(page.redirects,[]);
 assert.equal(page.element('app').hidden,false);
 assert.equal(page.element('loginPanel').hidden,true);
 assert.ok(page.requests.some(r=>r.url.endsWith('/cases')));
 assert.ok(page.requests.some(r=>r.url.endsWith('/people?kind=pa')));
 assert.match(page.element('rosterList').innerHTML,/ครูเป้าหมาย/);
});

test('an authenticated account without access gets a denial without a sign-in loop',async()=>{
 const page=await openPage({access:false,user:{full_name:'ครู'},guest:null});
 assert.deepEqual(page.redirects,[]);
 assert.match(page.element('caseList').innerHTML,/ไม่มีสิทธิ์/);
 assert.equal(page.element('app').hidden,false);
 assert.equal(page.requests.length,1);
});

test('signing out returns to the evaluation page without automatic sign-in',async()=>{
 const page=await openPage({access:true,user:{full_name:'ผู้บริหาร'},guest:null});
 await page.element('logout').onclick();
 assert.deepEqual(page.redirects,['/evaluate']);
 assert.ok(page.requests.some(r=>r.url==='/auth/logout'&&r.method==='POST'));
 const signedOut=await openPage({access:false,user:null,guest:null},{});
 assert.deepEqual(signedOut.redirects,[]);
 assert.equal(signedOut.element('loginPanel').hidden,true);
 assert.equal(signedOut.element('app').hidden,false);
});

test('an invited external evaluator opens assigned cases without school sign-in',async()=>{
 const page=await openPage({access:true,user:null,guest:{name:'กรรมการ',expires_at:2000000000}},{hash:'#invite=test-invitation'});
 assert.deepEqual(page.redirects,[]);
 assert.equal(page.element('app').hidden,false);
 assert.equal(page.requests[0].url,'/api/evaluation/guest/session');
 assert.ok(page.requests.some(r=>r.url.endsWith('/cases')));
 assert.ok(!page.requests.some(r=>r.url.endsWith('/templates')));
});

test('an invalid invitation shows its error without redirecting to school sign-in',async()=>{
 const page=await openPage({access:false,user:null,guest:null},{hash:'#invite=expired',inviteError:true});
 assert.deepEqual(page.redirects,[]);
 assert.match(page.element('message').textContent,/ลิงก์เชิญหมดอายุ/);
 assert.equal(page.requests.length,1);
});


test('an external evaluator assigned only assistant cases starts on the assistant page',async()=>{
 const page=await openPage({access:true,user:null,guest:{name:'กรรมการ',expires_at:2000000000}},{cases:[{id:2,kind:'assistant',full_name:'ครูผู้ช่วยทดสอบ',title:'รอบทดสอบ',fiscal_year:2570,cycle:1,state:'open',committee_count:3,submitted_count:0}]});
 assert.deepEqual(page.redirects,[]);assert.match(page.element('pageHeading').textContent,/ครูผู้ช่วย/);assert.match(page.element('caseList').innerHTML,/ครูผู้ช่วยทดสอบ/);assert.equal(page.element('resultsMenu').hidden,true);
});
