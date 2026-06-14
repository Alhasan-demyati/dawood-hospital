#!/usr/bin/env python3
"""Bind conversation_id -> {{system__conversation_id}} on the Dawood agent's
telemetry tools so the real, stable ElevenLabs conversation id is sent (instead
of an LLM-invented value). Pairs with the n8n resolve-or-create fix."""
import re, json, urllib.request

env = {}
for line in open('.env.local'):
    m = re.match(r'^([A-Z0-9_]+)=(.*)$', line.rstrip('\n'))
    if m:
        env[m.group(1)] = m.group(2).strip().strip('"').strip("'")
EK = env['ELEVENLABS_API_KEY']
AG = env['ELEVENLABS_AGENT_ID']
API = 'https://api.elevenlabs.io/v1/convai/agents/' + AG

ag = json.load(urllib.request.urlopen(
    urllib.request.Request(API, headers={'xi-api-key': EK}), timeout=30))

prompt = ag['conversation_config']['agent']['prompt']
TARGET = {'submit_ces_rating', 'prepare_handover'}
changed = []
for t in prompt.get('tools', []):
    if t.get('name') in TARGET:
        props = t['api_schema']['request_body_schema']['properties']
        ci = props.get('conversation_id')
        if ci is not None:
            # These value-source fields are mutually exclusive — exactly ONE may
            # be set. Clear description/constant/flags and set only dynamic_variable.
            ci['dynamic_variable'] = 'system__conversation_id'
            ci['description'] = ''
            ci['constant_value'] = ''
            ci['is_system_provided'] = False
            ci['is_omitted'] = False
        # conversation_id is now system-injected -> not LLM-required
        req = t['api_schema']['request_body_schema'].get('required') or []
        t['api_schema']['request_body_schema']['required'] = [r for r in req if r != 'conversation_id']
        changed.append(t['name'])

# PATCH gotcha: prompt carries BOTH tools and tool_ids -> must drop tool_ids
prompt.pop('tool_ids', None)
body = {'conversation_config': {'agent': {'prompt': prompt}}}
req = urllib.request.Request(API, data=json.dumps(body).encode(),
                             headers={'xi-api-key': EK, 'Content-Type': 'application/json'},
                             method='PATCH')
r = urllib.request.urlopen(req, timeout=60)
print('PATCH status', r.status, '| bound:', changed)

# verify
ag2 = json.load(urllib.request.urlopen(
    urllib.request.Request(API, headers={'xi-api-key': EK}), timeout=30))
for t in ag2['conversation_config']['agent']['prompt'].get('tools', []):
    if t.get('name') in TARGET:
        ci = t['api_schema']['request_body_schema']['properties']['conversation_id']
        reqd = t['api_schema']['request_body_schema'].get('required')
        print(f"  {t['name']}: dynamic_variable={ci.get('dynamic_variable')!r} required={reqd}")
