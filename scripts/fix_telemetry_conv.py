#!/usr/bin/env python3
"""Patch Dawood telemetry workflows so they resolve-or-create the conversations
row (keyed on elevenlabs_conversation_id) instead of using the agent-supplied
conversation_id directly as a FK uuid. Fixes the customer_feedback / handovers
FK-409 and makes calls appear on the dashboard."""
import re, json, urllib.request

env = {}
for line in open('.env.local'):
    m = re.match(r'^([A-Z0-9_]+)=(.*)$', line.rstrip('\n'))
    if m:
        env[m.group(1)] = m.group(2).strip().strip('"').strip("'")
BASE = env['N8N_BASE_URL'].rstrip('/')
KEY = env['N8N_API_KEY']
HDR = {'X-N8N-API-KEY': KEY, 'Accept': 'application/json', 'Content-Type': 'application/json'}


def api(path, method='GET', body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, headers=HDR, method=method)
    return json.load(urllib.request.urlopen(req, timeout=60))


# Shared "resolve-or-create conversation" block. Expects `inp`, `base`, `key`,
# `helpers`, `Hget`, `Hjson` to already be defined. Produces `convUuid`.
RESOLVE = r"""
var convRef=String(inp.conversation_id||'').trim();
var convUuid=null;
var isUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(convRef);
if(isUuid){ try{ var _chk=await helpers.httpRequest({method:'GET',url:base+'/rest/v1/conversations?id=eq.'+convRef+'&select=id&limit=1',headers:Hget,json:true}); if(Array.isArray(_chk)&&_chk[0]) convUuid=_chk[0].id; }catch(e){} }
if(!convUuid && convRef){
  var _up=await helpers.httpRequest({method:'POST',url:base+'/rest/v1/conversations?on_conflict=elevenlabs_conversation_id',headers:Object.assign({},Hjson,{Prefer:'resolution=merge-duplicates,return=representation'}),body:{elevenlabs_conversation_id:convRef,language:(inp.language==='en'?'en':'ar')},json:true});
  var _crow=Array.isArray(_up)?_up[0]:_up; convUuid=_crow&&_crow.id;
  if(!convUuid){ try{ var _g=await helpers.httpRequest({method:'GET',url:base+'/rest/v1/conversations?elevenlabs_conversation_id=eq.'+encodeURIComponent(convRef)+'&select=id&limit=1',headers:Hget,json:true}); if(Array.isArray(_g)&&_g[0]) convUuid=_g[0].id; }catch(e){} }
}
if(!convUuid){ return [{json:{ok:false,data:null,error_code:'CONVERSATION_UNRESOLVED',message_for_agent:null,meta:{version:'v1'}}}]; }
"""

INSERT_RATING = (
    "var inp=$input.first().json; if(inp && inp.ok===false){ return [{json:inp}]; }\n"
    "var base=$vars.DAWOOD_SUPABASE_URL, key=$vars.DAWOOD_SUPABASE_SERVICE_ROLE_KEY, helpers=this.helpers;\n"
    "var Hget={apikey:key,Authorization:'Bearer '+key};\n"
    "var Hjson={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};\n"
    + RESOLVE +
    "var declined=inp.declined===true; var score=declined?null:Number(inp.score);\n"
    "var cbody={conversation_id:convUuid,channel:'voice',ces:score,declined:declined};\n"
    "var cins=await helpers.httpRequest({method:'POST',url:base+'/rest/v1/customer_feedback',headers:Object.assign({},Hjson,{Prefer:'return=representation'}),body:cbody,json:true});\n"
    "var cf=Array.isArray(cins)?cins[0]:cins;\n"
    "try{ await helpers.httpRequest({method:'POST',url:base+'/rest/v1/outcomes?on_conflict=conversation_id',headers:Object.assign({},Hjson,{Prefer:'resolution=merge-duplicates,return=minimal'}),body:{conversation_id:convUuid,ces:score,ces_declined:declined},json:true}); }catch(e){}\n"
    "try{ await helpers.httpRequest({method:'POST',url:base+'/rest/v1/audit_log',headers:Object.assign({},Hjson,{Prefer:'return=minimal'}),body:{conversation_id:convUuid,actor:'service',action:'submit_ces_rating',target_table:'customer_feedback',target_id:(cf&&cf.id)||null,before_json:null,after_json:{ces:score,declined:declined}},json:true}); }catch(e){}\n"
    "return [{json:{_result:{ces_id:(cf&&cf.id)||null,conversation_id:convUuid},_t0:inp._t0}}];"
)

INSERT_HANDOVER = (
    "var inp=$input.first().json; if(inp && inp.ok===false){ return [{json:inp}]; }\n"
    "var base=$vars.DAWOOD_SUPABASE_URL, key=$vars.DAWOOD_SUPABASE_SERVICE_ROLE_KEY, helpers=this.helpers;\n"
    "var Hget={apikey:key,Authorization:'Bearer '+key};\n"
    "var Hjson={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};\n"
    "var target=$vars.DAWOOD_HANDOVER_TARGET_PHONE||'+96265000000';\n"
    + RESOLVE +
    "var hbody={conversation_id:convUuid,reason_code:inp.reason_code,summary_ar:(inp.summary_ar||null),customer_data:(inp.customer_data||{}),target_agent_id:target,triggered_at:new Date().toISOString()};\n"
    "var hins=await helpers.httpRequest({method:'POST',url:base+'/rest/v1/handovers?on_conflict=conversation_id',headers:Object.assign({},Hjson,{Prefer:'resolution=merge-duplicates,return=representation'}),body:hbody,json:true});\n"
    "var h=Array.isArray(hins)?hins[0]:hins;\n"
    "try{ await helpers.httpRequest({method:'PATCH',url:base+'/rest/v1/conversations?id=eq.'+convUuid,headers:Object.assign({},Hjson,{Prefer:'return=minimal'}),body:{outcome:'completed_with_handover'},json:true}); }catch(e){}\n"
    "try{ await helpers.httpRequest({method:'POST',url:base+'/rest/v1/audit_log',headers:Object.assign({},Hjson,{Prefer:'return=minimal'}),body:{conversation_id:convUuid,actor:'agent',action:'prepare_handover',target_table:'handovers',target_id:(h&&h.id)||null,before_json:null,after_json:{reason_code:inp.reason_code}},json:true}); }catch(e){}\n"
    "return [{json:{_result:{handover_id:(h&&h.id)||null,target_agent_id:target},_t0:inp._t0}}];"
)

TARGETS = [
    ('JHcPKjLCxlBfgeHh', 'Insert Rating', INSERT_RATING),
    ('odAztaYVcouNoz4a', 'Insert Handover', INSERT_HANDOVER),
]

for wf_id, node_name, new_code in TARGETS:
    wf = api('/api/v1/workflows/' + wf_id)
    patched = False
    for n in wf['nodes']:
        if n['name'] == node_name:
            n['parameters']['jsCode'] = new_code
            patched = True
    if not patched:
        print('!! node not found:', node_name, 'in', wf['name'])
        continue
    body = {'name': wf['name'], 'nodes': wf['nodes'],
            'connections': wf['connections'], 'settings': wf.get('settings', {})}
    api('/api/v1/workflows/' + wf_id, 'PUT', body)
    api('/api/v1/workflows/' + wf_id + '/activate', 'POST')
    print('patched + reactivated:', wf['name'], '->', node_name)

print('done')
