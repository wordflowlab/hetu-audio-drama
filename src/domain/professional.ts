import {requireValue as need,canonical} from "../../vendor/project-store.ts";
import {createHash} from "node:crypto";
import {artifact} from "./artifact.ts";
import {readBlob} from "./media.ts";
export const timelineDigest=(p:any)=>createHash("sha256").update(canonical({roles:p.roles,lines:p.lines,takes:p.takes,clips:p.clips})).digest("hex");
export function parseWav(b:Buffer){
 need(b.length>=44&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WAVE'&&b.readUInt32LE(4)+8===b.length,"WAV头或完整长度无效。");
 let at=12,fmt:any,pcm:Buffer|undefined;
 while(at+8<=b.length){const name=b.toString('ascii',at,at+4),n=b.readUInt32LE(at+4);need(at+8+n<=b.length,"WAV块截断。");const part=b.subarray(at+8,at+8+n);
  if(name==='fmt '){need(!fmt&&n>=16,'重复或无效WAV格式块。');fmt={encoding:part.readUInt16LE(0),channels:part.readUInt16LE(2),sample_rate:part.readUInt32LE(4),byte_rate:part.readUInt32LE(8),align:part.readUInt16LE(12),bits:part.readUInt16LE(14)};}
  if(name==='data'){need(!pcm,'重复WAV数据块。');pcm=part;}at+=8+n+(n%2);
 }
 need(at===b.length&&fmt&&pcm&&fmt.encoding===1&&fmt.bits===16&&[1,2].includes(fmt.channels)&&fmt.sample_rate>=8000&&fmt.sample_rate<=48000&&fmt.align===fmt.channels*2&&fmt.byte_rate===fmt.sample_rate*fmt.align&&pcm.length%fmt.align===0,"仅支持完整PCM16单/双声道WAV，格式参数须一致。");
 const frames=pcm.length/fmt.align;need(frames>0,'录音没有实际帧。');return {...fmt,frames,duration_ms:frames*1000/fmt.sample_rate,pcm};
}
export function validateDomain(p:any){const roles=new Set(p.roles.map((v:any)=>v.id)),lines=new Set(p.lines.map((v:any)=>v.id)),takes=new Set(p.takes.map((v:any)=>v.id));
 need(new Set(p.lines.map((v:any)=>v.order)).size===p.lines.length,"台词序号重复。");
 for(const l of p.lines)need(roles.has(l.role_id),"台词角色不存在。");
 for(const t of p.takes)need(t.line_id===null?t.kind!=="dialogue":lines.has(t.line_id),"对白录音须关联台词，其他关联须存在。");
 for(const c of p.clips){need(takes.has(c.take_id),"时间线录音不存在。");need(c.out_ms>c.in_ms&&c.fade_in_ms+c.fade_out_ms<=c.out_ms-c.in_ms&&c.start_ms+c.out_ms-c.in_ms<=300000,"入出点、淡入淡出或时间线预算无效。");}
 for(const n of p.notes){need(n.end_ms>n.start_ms,"听审区间无效。");need(n.status!=="resolved"||n.resolution.trim(),"解决听审意见须有说明。");}
}
export async function loadTakes(p:any,sources:any[],request:any){const map=new Map<string,any>();for(const t of p.takes){const b=await readBlob(sources[t.asset_source_index]?.source_ref,request);map.set(t.id,parseWav(b));}return map;}
export async function checkSources(p:any,sources:any[],request:any){if(!p.takes.length)return;const takes=await loadTakes(p,sources,request);const used=p.clips.map((c:any)=>takes.get(c.take_id));need(new Set(used.map((v:any)=>v.sample_rate)).size<=1,"混音输入采样率不同，请外部明确转码后重新固定素材。");for(const c of p.clips)need(c.out_ms<=takes.get(c.take_id).duration_ms+.001,"片段入出点超过实际录音时长。");}
export async function mix(p:any,sources:any[],request:any){
 need(p.clips.length,'没有选择时间线片段。');const takes=await loadTakes(p,sources,request),rate=takes.get(p.clips[0].take_id).sample_rate;
 need(p.clips.every((c:any)=>takes.get(c.take_id).sample_rate===rate),"混音采样率不同。");
 const end=Math.max(...p.clips.map((c:any)=>c.start_ms+c.out_ms-c.in_ms)),frames=Math.ceil(end*rate/1000);need(frames*4<=24*1024*1024,"混音超过24MiB，请分场次制作。");
 const samples=new Float64Array(frames*2);
 for(const c of p.clips){const take=takes.get(c.take_id);need(c.out_ms<=take.duration_ms+.001,"出点超过录音。");const start=Math.round(c.start_ms*rate/1000),from=Math.round(c.in_ms*rate/1000),n=Math.min(Math.round((c.out_ms-c.in_ms)*rate/1000),take.frames-from),gain=10**(c.gain_db/20),fi=c.fade_in_ms*rate/1000,fo=c.fade_out_ms*rate/1000;
  for(let k=0;k<n&&start+k<frames;k++){const fade=Math.min(1,fi?k/fi:1,fo?(n-1-k)/fo:1),left=take.pcm.readInt16LE((from+k)*take.align)/32768,right=take.channels===2?take.pcm.readInt16LE((from+k)*take.align+2)/32768:left;
   samples[(start+k)*2]+=left*gain*fade*(c.pan>0?1-c.pan:1);samples[(start+k)*2+1]+=right*gain*fade*(c.pan<0?1+c.pan:1);
  }
 }
 const b=Buffer.alloc(44+frames*4);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(frames*4,40);
 let clipped=0,peak=0;for(let k=0;k<samples.length;k++){peak=Math.max(peak,Math.abs(samples[k]));if(Math.abs(samples[k])>1)clipped++;b.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(samples[k]*32768))),44+k*2);}
 return {bytes:b,report:{sample_rate:rate,channels:2,bits:16,frames,duration_ms:frames*1000/rate,peak_before_limit:peak,clipped_samples:clipped,unused_take_ids:p.takes.filter((t:any)=>!p.clips.some((c:any)=>c.take_id===t.id)).map((t:any)=>t.id),unrecorded_line_ids:p.lines.filter((l:any)=>!p.clips.some((c:any)=>p.takes.find((t:any)=>t.id===c.take_id)?.line_id===l.id)).map((l:any)=>l.id),stale_note_ids:p.notes.filter((n:any)=>n.timeline_sha256!==timelineDigest(p)).map((n:any)=>n.id),unchecked_speech_take_ids:p.takes.filter((t:any)=>!t.speech_checked).map((t:any)=>t.id),note:"数值混音与可解码不代表实际听取、表演质量或作者认可。"}};
}
export function pureAction(_a:string,_i:any){return undefined;}
export async function writeProfessional(_a:string,_p:any,_s:any[],_i:any,_r?:any){throw Error("未知专业写入。");}
export async function readProfessional(a:string,p:any,s:any[],i:any,r:any){if(a==="check_mix")return (await mix(p,s,r)).report;if(a==="render_mix"){const v=await mix(p,s,r);return {...artifact(v.bytes,"有声剧混音.wav","audio/wav",i),report:v.report};}if(a==="inspect_take"){need(p.takes.some((t:any)=>t.id===i.take_id),"录音不存在。");const {pcm,...meta}=(await loadTakes(p,s,r)).get(i.take_id);return meta;}if(a==="locate_audio")return {clips:p.clips.filter((c:any)=>c.start_ms<=i.time_ms&&i.time_ms<c.start_ms+c.out_ms-c.in_ms).map((c:any)=>({clip:c,take:p.takes.find((t:any)=>t.id===c.take_id),line:p.lines.find((l:any)=>l.id===p.takes.find((t:any)=>t.id===c.take_id)?.line_id)})),notes:p.notes.filter((n:any)=>n.timeline_sha256===timelineDigest(p)&&n.start_ms<=i.time_ms&&i.time_ms<n.end_ms),stale_notes:p.notes.filter((n:any)=>n.timeline_sha256!==timelineDigest(p))};}
export function summaries(p:any){return [{title:"角色",lines:p.roles.map((v:any)=>v.name+"："+v.direction)},{title:"台本",lines:[...p.lines].sort((a,b)=>a.order-b.order).map((v:any)=>(p.roles.find((r:any)=>r.id===v.role_id)?.name??'角色')+"："+v.text)},{title:"录音与混音",lines:p.clips.map((v:any)=>(p.takes.find((t:any)=>t.id===v.take_id)?.title??'录音')+"　"+v.start_ms+"ms")},{title:"听审意见",lines:p.notes.map((v:any)=>v.comment)}];}
