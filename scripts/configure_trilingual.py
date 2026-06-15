#!/usr/bin/env python3
"""Reconfigure the Salma agent: English primary + Arabic + German presets,
upgrade TTS to eleven_multilingual_v2 (best Arabic), deploy the updated
multilingual system prompt, and give the end_call tool a real description so
the agent reliably hangs up."""
import re, json, urllib.request, urllib.error

env = {}
for line in open('.env.local'):
    m = re.match(r'^([A-Z0-9_]+)=(.*)$', line.rstrip('\n'))
    if m:
        env[m.group(1)] = m.group(2).strip().strip('"').strip("'")
EK = env['ELEVENLABS_API_KEY']
AG = env['ELEVENLABS_AGENT_ID']
API = 'https://api.elevenlabs.io/v1/convai/agents/' + AG

EN = "Hello, I'm Salma, the voice assistant at Dawood Hospital. May I record this call for service-quality and training purposes?"
AR = "السلام عليكم، أنا سلمى، المساعِدة الصوتية في مستشفى داوود. هل تسمحون بتسجيل المكالمة لأغراض جودة الخدمة والتدريب؟"
DE = "Hallo, ich bin Salma, die Sprachassistentin im Dawood-Krankenhaus. Darf ich dieses Gespräch zu Qualitäts- und Schulungszwecken aufzeichnen?"

PROMPT = open('elevenlabs/system_prompt.md').read()
SOURCE_HASH = json.dumps({"firstMessage": EN, "language": "en"}, ensure_ascii=False)


def preset(text):
    return {
        "overrides": {"asr": None, "turn": None, "tts": None, "conversation": None,
                      "agent": {"first_message": text, "language": None,
                                "max_conversation_duration_message": None, "prompt": None}},
        "first_message_translation": {"source_hash": SOURCE_HASH, "text": text},
        "soft_timeout_translation": None,
    }


ag = json.load(urllib.request.urlopen(urllib.request.Request(API, headers={'xi-api-key': EK}), timeout=40))
cc = ag['conversation_config']
prompt = cc['agent']['prompt']
prompt['prompt'] = PROMPT
prompt.pop('tool_ids', None)  # gotcha: cannot send both tools and tool_ids
for t in prompt.get('tools', []):
    if t.get('params', {}).get('system_tool_type') == 'end_call':
        t['description'] = ("Ends and disconnects the call. Invoke this as your final action "
                            "immediately after the closing line, once the caller has no further "
                            "requests or says goodbye/bye/خلص/باي/tschüss. Always hang up yourself.")

body = {
    "conversation_config": {
        "agent": {"language": "en", "first_message": EN, "prompt": prompt},
        "tts": {"model_id": "eleven_multilingual_v2"},
        "language_presets": {"ar": preset(AR), "de": preset(DE)},
    }
}
req = urllib.request.Request(API, data=json.dumps(body).encode(),
                             headers={'xi-api-key': EK, 'Content-Type': 'application/json'}, method='PATCH')
try:
    r = urllib.request.urlopen(req, timeout=60)
    print('PATCH', r.status)
except urllib.error.HTTPError as e:
    print('ERR', e.code, e.read().decode()[:800])
    raise SystemExit(1)

# verify
ag2 = json.load(urllib.request.urlopen(urllib.request.Request(API, headers={'xi-api-key': EK}), timeout=40))
cc2 = ag2['conversation_config']
print('language:', cc2['agent'].get('language'))
print('first_message:', repr(cc2['agent'].get('first_message'))[:90])
print('tts model:', cc2['tts'].get('model_id'), '| voice:', cc2['tts'].get('voice_id'))
print('language_presets:', list(cc2.get('language_presets', {}).keys()))
for t in cc2['agent']['prompt'].get('tools', []):
    if t.get('params', {}).get('system_tool_type') == 'end_call':
        print('end_call description set:', bool(t.get('description')))
print('prompt updated (multilingual):', '§2' not in PROMPT and 'trilingual' in cc2['agent']['prompt']['prompt'].lower())
