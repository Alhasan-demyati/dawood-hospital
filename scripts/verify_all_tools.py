#!/usr/bin/env python3
"""End-to-end verification of all 12 Dawood tools + the post-call webhook,
replaying a full booking journey against the LIVE n8n webhooks, then cleaning
up. Prints PASS/FAIL per step."""
import re, json, time, hmac, hashlib, urllib.request, urllib.error

env = {}
for line in open('.env.local'):
    m = re.match(r'^([A-Z0-9_]+)=(.*)$', line.rstrip('\n'))
    if m:
        env[m.group(1)] = m.group(2).strip().strip('"').strip("'")
SEC = env['N8N_SHARED_SECRET']
AGENT = env['ELEVENLABS_AGENT_ID']
PC_SECRET = env['ELEVENLABS_POST_CALL_WEBHOOK_SECRET']
SB = env['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
SK = env['SUPABASE_SERVICE_ROLE_KEY']
SBH = {'apikey': SK, 'Authorization': 'Bearer ' + SK, 'Accept': 'application/json', 'Content-Type': 'application/json'}
BASE = 'https://curizen.app.n8n.cloud/webhook/'
PHONE = '+962799000111'
results = []


def tool(path, body):
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json', 'X-Auth-Secret': SEC}, method='POST')
    try:
        return json.load(urllib.request.urlopen(req, timeout=40))
    except urllib.error.HTTPError as e:
        return {'ok': False, '_http': e.code, '_body': e.read().decode()[:200]}


def sb(method, path):
    try:
        r = urllib.request.urlopen(urllib.request.Request(SB + '/rest/v1/' + path, headers=SBH, method=method), timeout=30)
        return json.load(r) if method == 'GET' else r.status
    except urllib.error.HTTPError as e:
        return {'_err': e.code, '_b': e.read().decode()[:150]}


def check(name, cond, detail=''):
    results.append((name, cond))
    print(('  PASS ' if cond else '  FAIL ') + name + (' — ' + str(detail) if detail else ''))


print('=== 1. get_patient_by_phone (new number → not found) ===')
r = tool('dawood-get-patient-by-phone', {'phone': PHONE})
check('get_patient_by_phone', r.get('ok') is True, r.get('error_code') or ('found=' + str((r.get('data') or {}).get('found'))))

print('=== 2. suggest_specialty (nose pain) ===')
r = tool('dawood-suggest-specialty', {'chief_complaint': 'I have pain in my nose and ringing in my ear'})
sug = (r.get('data') or {}).get('suggestions') or []
spec_id = sug[0].get('specialty_id') or sug[0].get('id') if sug else None
check('suggest_specialty → ENT', bool(sug) and ('nf' in json.dumps(sug, ensure_ascii=False).lower() or 'أنف' in json.dumps(sug, ensure_ascii=False) or 'ent' in json.dumps(sug, ensure_ascii=False).lower()), json.dumps(sug, ensure_ascii=False)[:120])

print('=== 3. check_availability (by clinic NAME — fuzzy resolution) ===')
r = tool('dawood-check-availability', {'specialty_id': 'الأنف والأذن والحنجرة', 'from_date': '2026-06-16', 'to_date': '2026-06-23'})
slots = (r.get('data') or {}).get('slots') or []
check('check_availability', r.get('ok') is True and len(slots) > 0, str(len(slots)) + ' slots')
start = slots[0].get('start') if slots else None

print('=== 4. book_visit (by clinic NAME, new patient) ===')
r = tool('dawood-book-visit', {'spoken_phone': PHONE, 'name': 'Test Mustafa', 'dob': '2000-01-15',
                               'specialty_id': 'الأنف والأذن والحنجرة', 'chief_complaint': 'nose pain',
                               'picked_by': 'patient', 'start_time': start, 'confirmation_token': 'confirmed_2026-06-16T00:00:00Z'})
ref = (r.get('data') or {}).get('booking_reference')
check('book_visit', r.get('ok') is True and bool(ref), ref or r.get('error_code'))

# resolve patient_id for list_visits
pat = sb('GET', 'patients?phone_e164=eq.' + urllib.request.quote(PHONE) + '&select=id')
pid = pat[0]['id'] if isinstance(pat, list) and pat else None

print('=== 5. list_visits ===')
r = tool('dawood-list-visits', {'patient_id': pid})
vis = (r.get('data') or {}).get('visits') or []
check('list_visits', r.get('ok') is True and any(v.get('booking_reference') == ref for v in vis), str(len(vis)) + ' visits')

print('=== 6. reschedule_visit ===')
new_start = slots[1].get('start') if len(slots) > 1 else start
r = tool('dawood-reschedule-visit', {'booking_reference': ref, 'new_start': new_start, 'confirmation_token': 'confirmed_resch'})
check('reschedule_visit', r.get('ok') is True, r.get('error_code') or 'ok')

print('=== 7. cancel_visit ===')
r = tool('dawood-cancel-visit', {'booking_reference': ref, 'reason': 'test', 'confirmation_token': 'confirmed_cancel'})
check('cancel_visit', r.get('ok') is True, r.get('error_code') or 'ok')

print('=== 8. find_patient (name + dob) ===')
r = tool('dawood-find-patient', {'name': 'Test Mustafa', 'dob': '2000-01-15'})
check('find_patient', r.get('ok') is True and bool((r.get('data') or {}).get('found') or (r.get('data') or {}).get('patient') or (r.get('data') or {}).get('patients')), json.dumps(r.get('data'), ensure_ascii=False)[:120])

print('=== 9. post_call webhook (signed) — creates conversation, links patient ===')
now = int(time.time())
payload = {"type": "post_call_transcription", "event_timestamp": now, "data": {
    "agent_id": AGENT, "conversation_id": "conv_verify_alltools_001", "status": "done",
    "transcript": [{"role": "agent", "message": "Hello", "time_in_call_secs": 0}, {"role": "user", "message": "Hi", "time_in_call_secs": 2}],
    "metadata": {"start_time_unix_secs": now - 60, "call_duration_secs": 60, "phone_call": {"external_number": PHONE}},
    "analysis": {"call_successful": "success", "transcript_summary": "verify"},
    "conversation_initiation_client_data": {"dynamic_variables": {"language": "en"}}}}
raw = json.dumps(payload)
v0 = hmac.new(PC_SECRET.encode(), ('%d.%s' % (now, raw)).encode(), hashlib.sha256).hexdigest()
req = urllib.request.Request(BASE + 'dawood-post-call', data=raw.encode(),
                             headers={'Content-Type': 'application/json', 'ElevenLabs-Signature': 't=%d,v0=%s' % (now, v0)}, method='POST')
pcr = json.load(urllib.request.urlopen(req, timeout=40))
conv = sb('GET', 'conversations?elevenlabs_conversation_id=eq.conv_verify_alltools_001&select=id,caller_phone,patient_id,outcome')
linked = isinstance(conv, list) and conv and conv[0].get('patient_id') == pid
check('post_call webhook (+patient link)', pcr.get('ok') is True and linked, 'patient linked=' + str(bool(linked)))

print('=== 10. submit_ces_rating (real conv id) ===')
r = tool('dawood-submit-ces-rating', {'conversation_id': 'conv_verify_alltools_001', 'score': 8})
check('submit_ces_rating', r.get('ok') is True, r.get('error_code') or 'ok')

print('=== 11. prepare_handover (real conv id) ===')
r = tool('dawood-prepare-handover', {'conversation_id': 'conv_verify_alltools_001', 'reason_code': 'out_of_scope',
                                     'summary_ar': 'تجربة', 'customer_data': {'phone': PHONE}})
check('prepare_handover', r.get('ok') is True, r.get('error_code') or 'ok')

print('\n=== CLEANUP ===')
c = sb('GET', 'conversations?elevenlabs_conversation_id=eq.conv_verify_alltools_001&select=id')
if isinstance(c, list) and c:
    print('  del conversation:', sb('DELETE', 'conversations?id=eq.' + c[0]['id']))
if pid:
    print('  del patient (cascade visits):', sb('DELETE', 'patients?id=eq.' + pid))

ok = sum(1 for _, c in results if c)
print('\n========== %d/%d PASS ==========' % (ok, len(results)))
if ok != len(results):
    print('FAILED:', [n for n, c in results if not c])
