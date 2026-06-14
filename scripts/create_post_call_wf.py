#!/usr/bin/env python3
"""Create the 'Dawood — post_call' n8n workflow: receives the ElevenLabs
post-call webhook, verifies it (strict HMAC when raw body is available, else
agent-id-pinned + signature-present fallback), and upserts a full conversations
+ turns + outcome record for EVERY call. Idempotent / merge-friendly so it
cooperates with the in-call CES + handover rows (same elevenlabs id)."""
import re, json, urllib.request, urllib.error

env = {}
for line in open('.env.local'):
    m = re.match(r'^([A-Z0-9_]+)=(.*)$', line.rstrip('\n'))
    if m:
        env[m.group(1)] = m.group(2).strip().strip('"').strip("'")
BASE = env['N8N_BASE_URL'].rstrip('/')
KEY = env['N8N_API_KEY']
HDR = {'X-N8N-API-KEY': KEY, 'Accept': 'application/json', 'Content-Type': 'application/json'}
AGENT = env['ELEVENLABS_AGENT_ID']


def api(path, method='GET', body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, headers=HDR, method=method)
    try:
        return urllib.request.urlopen(req, timeout=60).read().decode()
    except urllib.error.HTTPError as e:
        return 'ERR %s %s' % (e.code, e.read().decode()[:300])


VERIFY = r'''
var item=$input.first();
var headers=(item.json&&item.json.headers)||{};
var sig=headers['elevenlabs-signature']||headers['ElevenLabs-Signature']||'';
var secret=$vars.DAWOOD_ELEVENLABS_WEBHOOK_SECRET||'';
var DAWOOD_AGENT='__AGENT__';

// --- obtain raw body bytes (needed for strict HMAC) ---
var raw=null;
try{ var buf=await this.helpers.getBinaryDataBuffer(0,'data'); if(buf) raw=buf.toString('utf8'); }catch(e){}
if(raw===null){ try{ raw=Buffer.from(item.binary.data.data,'base64').toString('utf8'); }catch(e){} }
if(raw===null && item.json && item.json.body!==undefined){ try{ raw=JSON.stringify(item.json.body); }catch(e){} }

var parsed=null;
try{ parsed=JSON.parse(raw); }catch(e){ parsed=(item.json&&item.json.body)||null; }
var data=(parsed&&parsed.data)?parsed.data:parsed; // unwrap {type,event_timestamp,data}

var authorized=false, reason='unauthorized';
var t=null,v0=null;
try{ sig.split(',').forEach(function(kv){ var i=kv.indexOf('='); if(i>0){ var k=kv.slice(0,i).trim(); var val=kv.slice(i+1).trim(); if(k==='t')t=val; if(k==='v0')v0=val; } }); }catch(e){}
var hmacRan=false;
if(secret && sig && raw && t && v0){
  hmacRan=true;
  try{
    var crypto=require('crypto');
    var expected=crypto.createHmac('sha256',secret).update(t+'.'+raw).digest('hex');
    var fresh=Math.abs((Date.now()/1000)-Number(t))<1800;
    if(expected===v0 && fresh){ authorized=true; reason='hmac_ok'; }
    else { reason=(expected!==v0)?'hmac_mismatch':'stale_timestamp'; }
  }catch(e){ hmacRan=false; reason='hmac_error'; }
}
// fallback ONLY when strict HMAC could not run (missing secret/raw) — never on an
// explicit mismatch. Always pin to our agent so other tenants' payloads are refused.
if(!authorized && !hmacRan){
  var aid=(data&&data.agent_id)||'';
  if(sig && aid===DAWOOD_AGENT){ authorized=true; reason='fallback_sig_agent_pin'; }
}
if(!authorized){ return [{json:{_authorized:false,_status:(reason==='hmac_mismatch'?401:401),_reason:reason}}]; }
if(data&&data.agent_id&&data.agent_id!==DAWOOD_AGENT){ return [{json:{_authorized:false,_status:403,_reason:'wrong_agent'}}]; }
return [{json:{_authorized:true,_reason:reason,_data:data}}];
'''.replace('__AGENT__', AGENT)

PERSIST = r'''
var inp=$input.first().json;
if(inp&&inp._authorized===false){ return [{json:{_status:inp._status||401,ok:false,error_code:'AUTH_REJECTED',reason:inp._reason}}]; }
var data=inp._data||{};
var base=$vars.DAWOOD_SUPABASE_URL, key=$vars.DAWOOD_SUPABASE_SERVICE_ROLE_KEY, helpers=this.helpers;
var Hget={apikey:key,Authorization:'Bearer '+key};
var Hjson={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};

var convRef=String(data.conversation_id||'').trim();
if(!convRef){ return [{json:{_status:200,ok:false,error_code:'MISSING_CONVERSATION_ID'}}]; }

var meta=data.metadata||{};
var startSecs=Number(meta.start_time_unix_secs||0)||null;
var durSecs=Number(meta.call_duration_secs||0)||0;
var startISO=startSecs?new Date(startSecs*1000).toISOString():null;
var endISO=startSecs?new Date((startSecs+durSecs)*1000).toISOString():null;

var phone=null;
try{ phone=(meta.phone_call&&(meta.phone_call.external_number||meta.phone_call.caller_id))||null; }catch(e){}

var lang='ar';
try{ var dv=(data.conversation_initiation_client_data&&data.conversation_initiation_client_data.dynamic_variables)||{}; if(dv.language) lang=(String(dv.language).toLowerCase().indexOf('en')===0?'en':'ar'); }catch(e){}

var summary=null,callOk=null;
try{ summary=(data.analysis&&data.analysis.transcript_summary)||null; callOk=(data.analysis&&data.analysis.call_successful)||null; }catch(e){}

// 1) upsert conversation (merge — never clobber a handover outcome / CES set in-call)
var cbody={elevenlabs_conversation_id:convRef,language:lang};
if(startISO)cbody.started_at=startISO;
if(endISO)cbody.ended_at=endISO;
if(phone)cbody.caller_phone=phone;
var up=await helpers.httpRequest({method:'POST',url:base+'/rest/v1/conversations?on_conflict=elevenlabs_conversation_id',headers:Object.assign({},Hjson,{Prefer:'resolution=merge-duplicates,return=representation'}),body:cbody,json:true});
var crow=Array.isArray(up)?up[0]:up; var convUuid=crow&&crow.id;
if(!convUuid){ var g=await helpers.httpRequest({method:'GET',url:base+'/rest/v1/conversations?elevenlabs_conversation_id=eq.'+encodeURIComponent(convRef)+'&select=id&limit=1',headers:Hget,json:true}); convUuid=(Array.isArray(g)&&g[0])?g[0].id:null; }
if(!convUuid){ return [{json:{_status:200,ok:false,error_code:'CONVERSATION_UNRESOLVED'}}]; }

// 2) link patient by phone (best effort)
if(phone){ try{ var pj=await helpers.httpRequest({method:'GET',url:base+'/rest/v1/patients?phone_e164=eq.'+encodeURIComponent(phone)+'&select=id&limit=1',headers:Hget,json:true}); if(Array.isArray(pj)&&pj[0]){ await helpers.httpRequest({method:'PATCH',url:base+'/rest/v1/conversations?id=eq.'+convUuid,headers:Object.assign({},Hjson,{Prefer:'return=minimal'}),body:{patient_id:pj[0].id},json:true}); } }catch(e){} }

// 3) outcome — keep an existing handover outcome; else derive
var outcome=null;
try{ var hv=await helpers.httpRequest({method:'GET',url:base+'/rest/v1/handovers?conversation_id=eq.'+convUuid+'&select=id&limit=1',headers:Hget,json:true}); if(Array.isArray(hv)&&hv.length){ outcome='completed_with_handover'; } }catch(e){}
var turns=Array.isArray(data.transcript)?data.transcript:[];
if(!outcome){ if(callOk==='failure'){ outcome='error'; } else if(turns.length<=1){ outcome='abandoned'; } else { outcome='completed_automated'; } }
try{ await helpers.httpRequest({method:'PATCH',url:base+'/rest/v1/conversations?id=eq.'+convUuid,headers:Object.assign({},Hjson,{Prefer:'return=minimal'}),body:{outcome:outcome},json:true}); }catch(e){}

// 4) outcomes summary/goal (merge — do not touch ces set in-call)
try{ await helpers.httpRequest({method:'POST',url:base+'/rest/v1/outcomes?on_conflict=conversation_id',headers:Object.assign({},Hjson,{Prefer:'resolution=merge-duplicates,return=minimal'}),body:{conversation_id:convUuid,goal_achieved:(callOk==='success'),notes:summary},json:true}); }catch(e){}

// 5) turns — replace for idempotency
if(turns.length){
  try{ await helpers.httpRequest({method:'DELETE',url:base+'/rest/v1/turns?conversation_id=eq.'+convUuid,headers:Object.assign({},Hget,{Prefer:'return=minimal'}),json:true}); }catch(e){}
  var rows=[]; for(var i=0;i<turns.length;i++){ var tt=turns[i]||{}; var sp=(tt.role==='user')?'user':'agent'; rows.push({conversation_id:convUuid,turn_index:i,speaker:sp,text_raw:(tt.message!=null?String(tt.message):''),language:lang}); }
  try{ await helpers.httpRequest({method:'POST',url:base+'/rest/v1/turns',headers:Object.assign({},Hjson,{Prefer:'return=minimal'}),body:rows,json:true}); }catch(e){}
}

// 6) audit
try{ await helpers.httpRequest({method:'POST',url:base+'/rest/v1/audit_log',headers:Object.assign({},Hjson,{Prefer:'return=minimal'}),body:{conversation_id:convUuid,actor:'service',action:'post_call_webhook',target_table:'conversations',target_id:convUuid,before_json:null,after_json:{outcome:outcome,turns:turns.length,reason:inp._reason}},json:true}); }catch(e){}

return [{json:{_status:200,ok:true,data:{conversation_id:convUuid,outcome:outcome,turns:turns.length}}}];
'''

nodes = [
    {"name": "Webhook", "type": "n8n-nodes-base.webhook", "typeVersion": 2, "position": [220, 300],
     "webhookId": "dawood-post-call-wh",
     "parameters": {"httpMethod": "POST", "path": "dawood-post-call", "responseMode": "responseNode",
                    "options": {"rawBody": True}}},
    {"name": "Verify", "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [460, 300],
     "parameters": {"jsCode": VERIFY}},
    {"name": "Persist", "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [700, 300],
     "parameters": {"jsCode": PERSIST}},
    {"name": "Respond", "type": "n8n-nodes-base.respondToWebhook", "typeVersion": 1, "position": [940, 300],
     "parameters": {"respondWith": "json",
                    "responseBody": "={{ JSON.stringify({ ok: $json.ok !== false, data: $json.data || null, error_code: $json.error_code || null }) }}",
                    "options": {"responseCode": "={{ $json._status || 200 }}"}}},
]
connections = {
    "Webhook": {"main": [[{"node": "Verify", "type": "main", "index": 0}]]},
    "Verify": {"main": [[{"node": "Persist", "type": "main", "index": 0}]]},
    "Persist": {"main": [[{"node": "Respond", "type": "main", "index": 0}]]},
}
wf = {"name": "Dawood — post_call", "nodes": nodes, "connections": connections,
      "settings": {"executionOrder": "v1"}}

out = api('/api/v1/workflows', 'POST', wf)
try:
    created = json.loads(out)
    wid = created['id']
    print('created workflow id:', wid)
    print('activate:', api('/api/v1/workflows/' + wid + '/activate', 'POST')[:80])
    print('WEBHOOK URL: https://curizen.app.n8n.cloud/webhook/dawood-post-call')
except Exception:
    print('CREATE FAILED:', out[:800])
