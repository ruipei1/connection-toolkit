// @ts-ignore qrcode has a stable server API; no separate types needed.
import QRCode from 'qrcode';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../../chatgpt-auth';
export const dynamic='force-dynamic';
function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
function aggregate(rows:any[],activity:string){const answers=rows.map(r=>JSON.parse(r.values_json));const n=answers.length;if(activity==='invitation'){const cells=[0,0,0,0];for(const a of answers)cells[a[0]*2+a[1]]++;return {n,cells,activity};}return {n,activity,pairs:[0,1,2,3].map(i=>{const values=[answers.map(a=>a[i*2]),answers.map(a=>a[i*2+1])];return {means:values.map(v=>n?v.reduce((a,b)=>a+b,0)/n:0),distributions:values.map(v=>Array.from({length:5},(_,k)=>v.filter(x=>Math.min(4,Math.floor(x/20))===k).length))}})}}
async function handle(request:Request){
 try{
 const url=new URL(request.url),parts=url.pathname.split('/').filter(Boolean).slice(2),db=env.DB;
 if(!db)return json({error:'The survey database is unavailable.'},503);
 const method=request.method;
 if(method!=='GET'){if(request.headers.get('origin')!==url.origin)return json({error:'Please submit from this website.'},403);if(Number(request.headers.get('content-length')||0)>10000)return json({error:'Request too large.'},413)}
 const user=await getChatGPTUser();
 if(parts[0]==='me')return json({signedIn:!!user});
 if(parts[0]==='join'){
 const s:any=await db.prepare('SELECT id,title,activity,status FROM sessions WHERE participant=?').bind(parts[1]||'').first();if(!s)return json({error:'This activity link is unavailable.'},404);
 if(method==='GET')return json({title:s.title,activity:s.activity,status:s.status});
 if(method!=='POST')return json({error:'Method not allowed.'},405);
 const b=await request.json() as any;const v=b.values;const count=s.activity==='room'?8:2;
 if(!Array.isArray(v)||v.length!==count||v.some((x:any)=>typeof x!=='number'||!Number.isInteger(x)||x<0||x>(s.activity==='room'?100:1))||typeof b.id!=='string'||!/^[a-f0-9-]{36}$/.test(b.id))return json({error:'Please answer every question using the displayed scale.'},400);
 const duplicate=await db.prepare('SELECT id FROM responses WHERE id=? AND session=?').bind(b.id,s.id).first();if(duplicate)return json({ok:true});
 const inserted=await db.prepare('INSERT INTO responses (id,session,values_json,created) SELECT ?,id,?,? FROM sessions WHERE id=? AND status=\'open\'').bind(b.id,JSON.stringify(v),Date.now(),s.id).run();
 return inserted.meta.changes?json({ok:true},201):json({error:'Collection is closed. Your response was not recorded.'},409);
 }
 if(parts[0]==='present'){
 const s:any=await db.prepare('SELECT title,activity,published,selected,snapshot FROM sessions WHERE presentation=?').bind(parts[1]||'').first();if(!s)return json({error:'This presentation is unavailable.'},404);
 if(!s.published||!s.snapshot)return json({ready:false,title:s.title});const data=JSON.parse(s.snapshot);if(data.n<3)return json({ready:false,title:s.title,message:'At least three responses are needed to share aggregate results.'});
 if(data.pairs){const selected=JSON.parse(s.selected);data.pairs=data.pairs.map((p:any,i:number)=>selected.includes(i)?{...p,index:i}:null).filter(Boolean)}return json({ready:true,title:s.title,data});
 }
 if(!user)return json({error:'Sign in to manage your sessions.'},401);
 if(parts[0]!=='sessions')return json({error:'Not found.'},404);
 if(!parts[1]){
 if(method==='GET'){const rows=await db.prepare('SELECT id,title,activity,status,created FROM sessions WHERE owner=? ORDER BY created DESC').bind(user.userId).all();return json({sessions:rows.results})}
 if(method==='POST'){const b=await request.json() as any;const title=typeof b.title==='string'?b.title.trim():'';if(!title||title.length>100||!['room','invitation'].includes(b.activity))return json({error:'Choose an activity and a title of 1–100 characters.'},400);const id=crypto.randomUUID();await db.prepare('INSERT INTO sessions (id,owner,title,activity,participant,presentation,status,published,selected,created) VALUES (?,?,?,?,?,?,\'closed\',0,\'[0,1,2,3]\',?)').bind(id,user.userId,title,b.activity,crypto.randomUUID(),crypto.randomUUID(),Date.now()).run();return json({id},201)}
 return json({error:'Method not allowed.'},405)
 }
 const s:any=await db.prepare('SELECT * FROM sessions WHERE id=? AND owner=?').bind(parts[1],user.userId).first();if(!s)return json({error:'Session not found.'},404);
 if(method==='DELETE'){await db.batch([db.prepare('DELETE FROM responses WHERE session=?').bind(s.id),db.prepare('DELETE FROM sessions WHERE id=? AND owner=?').bind(s.id,user.userId)]);return json({ok:true})}
 if(parts[2]==='qr'&&method==='GET'){const svg=await QRCode.toString(url.origin+'/join.html?session='+s.participant,{type:'svg',margin:2,width:200});return new Response(svg,{headers:{'Content-Type':'image/svg+xml','Cache-Control':'no-store'}})}
 const rows=await db.prepare('SELECT id,values_json,created FROM responses WHERE session=? ORDER BY created').bind(s.id).all();
 if(parts[2]==='csv'&&method==='GET'){const headers=s.activity==='room'?['conversation_self','conversation_peer_estimate','coffee_self','coffee_peer_estimate','appreciation_self','appreciation_peer_estimate','listening_self','listening_peer_estimate']:['welcome_conversation','willing_to_initiate'];const csv=[headers.join(','),...rows.results.map((r:any)=>JSON.parse(r.values_json).join(','))].join('\r\n');return new Response(csv,{headers:{'Content-Type':'text/csv;charset=utf-8','Content-Disposition':'attachment; filename="session-responses.csv"','Cache-Control':'no-store'}})}
 if(method==='GET')return json({id:s.id,title:s.title,activity:s.activity,status:s.status,published:!!s.published,selected:JSON.parse(s.selected),participant:s.participant,presentation:s.presentation,data:s.snapshot?JSON.parse(s.snapshot):aggregate(rows.results,s.activity),frozen:!!s.snapshot});
 if(method==='PATCH'){const b=await request.json() as any;
 if(b.action==='open')await db.prepare('UPDATE sessions SET status=\'open\',snapshot=NULL,published=0 WHERE id=? AND owner=?').bind(s.id,user.userId).run();
 else if(b.action==='close'){
 // D1 batch is transactional: close collection and freeze one consistent snapshot.
 await db.batch([db.prepare('UPDATE sessions SET status=\'closed\',published=0 WHERE id=? AND owner=?').bind(s.id,user.userId),db.prepare(`UPDATE sessions SET snapshot=json_object('activity',activity,'answers',json((SELECT COALESCE(json_group_array(json(values_json)),'[]') FROM responses WHERE session=?))) WHERE id=? AND owner=?`).bind(s.id,s.id,user.userId)]);
 const frozen:any=await db.prepare('SELECT snapshot FROM sessions WHERE id=?').bind(s.id).first();const raw=JSON.parse(frozen.snapshot);const data=aggregate(raw.answers.map((v:any)=>({values_json:JSON.stringify(v)})),s.activity);await db.prepare('UPDATE sessions SET snapshot=? WHERE id=? AND owner=?').bind(JSON.stringify(data),s.id,user.userId).run();
 }else if(b.action==='publish'){if(s.status!=='closed'||!s.snapshot)return json({error:'Close and freeze collection before sharing results.'},409);if(JSON.parse(s.snapshot).n<3)return json({error:'Collect at least three responses before sharing aggregate results.'},409);const selected=b.selected;if(!Array.isArray(selected)||!selected.length||selected.some((i:any)=>!Number.isInteger(i)||i<0||i>3))return json({error:'Select at least one valid result.'},400);await db.prepare('UPDATE sessions SET published=1,selected=? WHERE id=? AND owner=?').bind(JSON.stringify([...new Set(selected)]),s.id,user.userId).run();}
 else if(b.action==='hide')await db.prepare('UPDATE sessions SET published=0 WHERE id=? AND owner=?').bind(s.id,user.userId).run();else return json({error:'Unknown action.'},400);
 return json({ok:true})}
 return json({error:'Method not allowed.'},405);
 }catch(e){console.error('Live activity request failed',e);return json({error:'The request could not be completed. Please try again.'},500)}
}
export const GET=handle;export const POST=handle;export const PATCH=handle;export const DELETE=handle;
