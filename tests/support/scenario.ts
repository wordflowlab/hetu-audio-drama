import {createHash} from "node:crypto";
import {canonical} from "../../vendor/project-store.ts";
import {newProject} from "../../src/domain/model.ts";
export const original="林溪在雨港邮局等信。\n她把旧钥匙放进信封。\n\n第二天，她决定出发。\n";
export const sha=(v:string|Uint8Array)=>createHash("sha256").update(v).digest("hex");
export const sourceRef={kind:"document",work_ref:{workspace_id:"workspace_test",kind:"novel",object_id:"novel_test"},document_id:"doc_11111111-1111-4111-8111-111111111111",revision_id:"rev_11111111-1111-4111-8111-111111111111",sha256:sha(original)};
export const range={source_index:0,byte_start:0,byte_end:Buffer.byteLength(original),quote:original};
export const base=(r:any,key:string)=>({object_id:r.object.object_id,expected_revision:r.object.revision,expected_sha256:r.sha256,operation_key:key});
export const selection=(r:any)=>({object_id:r.object.object_id,revision:r.object.revision});
export function wav(value=6000,frames=800,rate=8000){const b=Buffer.alloc(44+frames*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(frames*2,40);for(let n=0;n<frames;n++)b.writeInt16LE(value,44+n*2);return b;}

export function scenario(_work:any=sourceRef.work_ref):any {const p:any={...newProject("雨港来信"),...{
  "roles": [
    {
      "id": "narrator",
      "name": "叙述者",
      "direction": "清楚而克制，留出雨声空间。"
    },
    {
      "id": "lin",
      "name": "林溪",
      "direction": "疑问放在停顿里，避免夸张。"
    }
  ],
  "lines": [
    {
      "id": "narration",
      "role_id": "narrator",
      "scene": "旧邮局",
      "text": "Lin Xi waited at the old post office.",
      "ranges": [range],
      "order": 0
    },
    {
      "id": "question",
      "role_id": "lin",
      "scene": "旧邮局",
      "text": "Who sent this letter?",
      "ranges": [range],
      "order": 1
    }
  ],
  "takes": [],
  "clips": [],
  "notes": [
    {
      "id": "pause",
      "start_ms": 0,
      "end_ms": 100,
      "comment": "核对叙述与对白间的停顿，试听后决定。",
      "status": "open",
      "resolution": ""
    }
  ]
}};for(const note of p.notes)note.timeline_sha256=sha(canonical({roles:p.roles,lines:p.lines,takes:p.takes,clips:p.clips}));return p;}
