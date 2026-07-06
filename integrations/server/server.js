/* Aurora Dental Iqaluit — bridge server (jembatan omnichannel)
 *
 * Satu server kecil (Node.js murni, tanpa dependency) yang:
 *  - melayani function-tools untuk Vapi/Retell (voice)      → POST /tools/*
 *  - melayani chatbot website / WA / SMS berbasis teks       → POST /chat
 *  - menerima webhook Twilio inbound (SMS & WhatsApp)        → POST /webhook/twilio-inbound (balas TwiML)
 *  - menerima webhook email inbound (Postmark)               → POST /webhook/postmark-inbound
 *  - MEMAKAI ULANG engine yang sama dengan aplikasi web:
 *    js/data.js + js/store.js + js/sila.js — satu SOP, semua kanal.
 *
 * Demo mode: data disimpan ke db.json (overlay di atas seed).
 * Produksi: ganti lapisan store dengan Supabase (lihat docs/omnichannel-ai-receptionist.md).
 *
 * Jalankan:  node server.js   (PORT=3100 default)
 * Amankan:   set WEBHOOK_SHARED_SECRET → semua /tools/* wajib header x-webhook-secret.
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3100;
const SECRET = process.env.WEBHOOK_SHARED_SECRET || '';
const DB_FILE = path.join(__dirname, 'db.json');
const APP_JS = path.join(__dirname, '..', '..', 'js');

/* ---------- shim browser globals + persist overlay ke db.json ---------- */
let dbCache = {};
try { dbCache = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { dbCache = {}; }
globalThis.localStorage = {
  getItem: function (k) { return dbCache[k] !== undefined ? dbCache[k] : null; },
  setItem: function (k, v) {
    dbCache[k] = v;
    fs.writeFile(DB_FILE, JSON.stringify(dbCache, null, 1), function () {});
  },
  removeItem: function (k) { delete dbCache[k]; }
};
globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/* ---------- muat engine aplikasi (sumber kebenaran tunggal) ---------- */
eval(fs.readFileSync(path.join(APP_JS, 'data.js'), 'utf8'));
eval(fs.readFileSync(path.join(APP_JS, 'store.js'), 'utf8'));
eval(fs.readFileSync(path.join(APP_JS, 'sila.js'), 'utf8'));
const S = globalThis.AuroraStore;
const Sila = globalThis.Sila;

/* ---------- sesi chat per pengguna (website / WA / SMS / email) ---------- */
const sessions = new Map(); // key: sessionId/phone → { agent, last }
const SESSION_TTL = 30 * 60 * 1000;
function agentFor(key, channel) {
  const now = Date.now();
  let s = sessions.get(key);
  if (!s || now - s.last > SESSION_TTL) {
    const agent = new Sila({
      storm: process.env.STORM_MODE === '1',
      onEvent: function (ev) {
        if (ev.type === 'booked') {
          S.logConversation({
            ch: channel, name: ev.appointment.patient,
            preview: channel + ' — booked ' + ev.appointment.proc,
            sub: channel + ' · ' + ev.lang + ' · handled by Sila (bridge)',
            channelName: channel.toLowerCase(),
            summary: '✦ Booked ' + ev.appointment.proc + ' for ' + ev.appointment.patient + ' via ' + channel + '.',
            thread: agent.transcript.slice(-8).map(t => ({ from: t[0], text: t[1], meta: t[0] === 's' ? 'Sila ᓯᓚ' : '' }))
          });
        }
        if (ev.type === 'escalation') {
          S.logConversation({
            ch: channel, name: 'Caller', preview: '⚠ Emergency — escalated',
            sub: channel + ' · escalated to on-call', channelName: channel.toLowerCase(),
            summary: '✦ Emergency detected on ' + channel + '; on-call paged (' + S.clinic.emergencyPhone + ').',
            thread: agent.transcript.slice(-6).map(t => ({ from: t[0], text: t[1], meta: '' }))
          });
        }
      }
    });
    s = { agent: agent, last: now };
    sessions.set(key, s);
  }
  s.last = now;
  return s.agent;
}

/* ---------- helpers ---------- */
function normalizePhone(raw) {
  let d = String(raw || '').replace(/[^0-9]/g, '');
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  if (d.length === 7) d = '867' + d; // aturan lokal Iqaluit
  if (d.length !== 10) return null;
  return '+1 (' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
}
function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}
function xml(res, body) {
  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(body);
}
function parseForm(raw) {
  const out = {};
  raw.split('&').forEach(function (kv) {
    const i = kv.indexOf('=');
    if (i > 0) out[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' '));
  });
  return out;
}

/* ---------- tool handlers (kontrak = integrations/vapi/tools.json) ---------- */
const TOOLS = {
  get_clinic_status: function () {
    const now = new Date();
    const hrs = S.clinic.hours[now.getDay()];
    const mins = now.getHours() * 60 + now.getMinutes();
    const holToday = S.isHoliday(now);
    const openNow = !!hrs && !holToday && mins >= hrs.open && mins < hrs.close;
    return {
      open_now: openNow,
      today_hours: holToday ? 'closed — ' + holToday.name : (hrs ? Math.floor(hrs.open / 60) + ':' + String(hrs.open % 60).padStart(2, '0') + '–' + Math.floor(hrs.close / 60) + ':' + String(hrs.close % 60).padStart(2, '0') + (hrs.note ? ' (' + hrs.note + ')' : '') : 'closed'),
      next_holiday: S.nextHoliday(30),
      blizzard_mode: process.env.STORM_MODE === '1',
      address: S.clinic.address, phone: S.clinic.phone, emergency_phone: S.clinic.emergencyPhone
    };
  },
  lookup_patient: function (b) {
    const p = S.findPatient(b.name) || (b.phone ? S.findPatient(normalizePhone(b.phone) || b.phone) : null);
    return p
      ? { found: true, patient: { id: p.id, name: p.name, phone: p.phone, insurance: p.insurance, language: p.langCode, recall: p.recall, allergies: p.allergies } }
      : { found: false, patient: null };
  },
  create_patient: function (b) {
    const phone = normalizePhone(b.phone);
    if (!b.name || !phone) return { ok: false, error: 'name and a valid phone (7 or 10 digits) are required' };
    const p = S.addPatient({
      name: b.name, phone: phone, email: b.email || '—',
      insurance: b.insurance || 'Not provided',
      langCode: b.language_pref || 'EN',
      lang: b.language_pref === 'FR' ? 'Français preferred' : (b.language_pref === 'IU' ? 'ᐃᓄᒃᑎᑐᑦ preferred' : 'English')
    });
    return { ok: true, patient_id: p.id, normalized_phone: phone };
  },
  find_available_slots: function (b) {
    let slots = S.freeSlots(b.service_id || 'exam', { limit: 24 });
    if (process.env.STORM_MODE === '1') {
      const today = new Date().toDateString();
      slots = slots.filter(s => !(new Date(s.start).toDateString() === today && new Date(s.start).getHours() >= 12));
    }
    if (b.day_preference) {
      const want = String(b.day_preference).toLowerCase().slice(0, 3);
      const filtered = slots.filter(s => new Date(s.start).toLocaleDateString('en-CA', { weekday: 'long' }).toLowerCase().indexOf(want) === 0);
      if (filtered.length) slots = filtered;
    }
    const offer = [];
    const seen = {};
    for (const s of slots) {
      const k = s.start.slice(0, 10);
      if (!seen[k] || offer.length === 2) { offer.push(s); seen[k] = true; }
      if (offer.length === 3) break;
    }
    return {
      slots: offer.map(s => ({
        slot_start: s.start, spoken: S.fmtSlot(s), provider: s.provider, op: s.op
      }))
    };
  },
  create_appointment: function (b) {
    const p = S.patientById(b.patient_id);
    const svc = S.services.find(x => x.id === b.service_id);
    if (!p || !svc) return { ok: false, error: 'unknown patient_id or service_id' };
    const a = S.addAppointment({
      time: S.fmtTime(b.slot_start), dur: svc.duration, patient: p.name, pid: p.id,
      proc: svc.name, provider: b.provider, op: b.op, billing: p.insurance,
      status: 'confirmed', start: b.slot_start,
      sila: 'Booked by Sila via phone bridge. Reminders scheduled 48h & 2h (' + (p.langCode || 'EN') + ').' + (b.notes ? ' Note: ' + b.notes : '')
    });
    return { ok: true, appointment_id: a.id, spoken_confirmation: S.fmtSlot({ start: b.slot_start }) + ' with ' + b.provider };
  },
  lookup_appointment: function (b) {
    return {
      appointments: S.upcomingFor(b.patient_id).map(a => ({
        appointment_id: a.id, spoken: S.fmtSlot({ start: a.start }), service: a.proc, provider: a.provider
      }))
    };
  },
  cancel_appointment: function (b) {
    S.cancelAppointment(b.appointment_id);
    return { ok: true, message: 'cancelled and slot released' };
  },
  escalate_emergency: function (b) {
    const slot = S.freeSlots('emergency', { limit: 1 })[0];
    S.logConversation({
      ch: 'CALL', name: b.caller_phone ? normalizePhone(b.caller_phone) || 'Caller' : 'Caller',
      preview: '⚠ EMERGENCY — ' + (b.symptoms || '').slice(0, 60),
      sub: 'Phone · escalated by Sila', channelName: 'phone',
      summary: '✦ Emergency (pain ' + (b.pain_scale || '?') + '/10): ' + b.symptoms + '. On-call paged; slot held ' + (slot ? S.fmtSlot(slot) : 'ASAP') + '.',
      thread: [{ from: 's', text: '⚠ ESCALATED — paged on-call dentist + front desk.', meta: 'System · emergency protocol' }]
    });
    // Produksi: kirim SMS/panggilan nyata ke on-call via Twilio di sini.
    return { ok: true, emergency_slot: slot ? S.fmtSlot(slot) : 'first opening tomorrow', on_call_paged: true };
  },
  log_complaint: function (b) {
    S.logConversation({
      ch: 'CALL', name: b.patient_id ? (S.patientById(b.patient_id) || {}).name || 'Caller' : 'Caller',
      preview: 'Complaint logged — manager callback due', sub: 'Phone · complaint', channelName: 'phone',
      summary: '✦ Complaint: ' + b.complaint + ' — practice manager to call back within 1 business day.',
      thread: [{ from: 'p', text: b.complaint, meta: 'verbatim' }]
    });
    return { ok: true };
  },
  log_call_summary: function (b) {
    S.logConversation({
      ch: 'CALL', name: b.patient_name || 'Caller',
      preview: (b.outcome || 'call') + ' — ' + (b.intent || ''),
      sub: 'Phone · ' + (b.language || 'EN') + ' · handled by Sila', channelName: 'phone',
      summary: '✦ ' + b.summary,
      thread: []
    });
    return { ok: true };
  }
};

/* ---------- HTTP server ---------- */
const server = http.createServer(function (req, res) {
  let raw = '';
  req.on('data', c => { raw += c; if (raw.length > 1e6) req.destroy(); });
  req.on('end', function () {
    try {
      const url = req.url.split('?')[0];

      if (req.method === 'GET' && url === '/healthz') {
        return json(res, 200, { ok: true, patients: S.patients().length, appointments: S.appointments().length });
      }

      /* Vapi/Retell function tools */
      if (req.method === 'POST' && url.startsWith('/tools/')) {
        if (SECRET && req.headers['x-webhook-secret'] !== SECRET) return json(res, 401, { error: 'bad secret' });
        const name = url.slice('/tools/'.length);
        const fn = TOOLS[name];
        if (!fn) return json(res, 404, { error: 'unknown tool ' + name });
        let body = {};
        try { body = JSON.parse(raw || '{}'); } catch (e) {}
        // Vapi membungkus arguments di message.toolCalls — dukung keduanya.
        if (body.message && body.message.toolCalls && body.message.toolCalls[0]) {
          const tc = body.message.toolCalls[0];
          const args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
          const result = fn(args || {});
          return json(res, 200, { results: [{ toolCallId: tc.id, result: JSON.stringify(result) }] });
        }
        return json(res, 200, fn(body));
      }

      /* Website chatbot / apps: teks masuk → balasan Sila */
      if (req.method === 'POST' && url === '/chat') {
        const body = JSON.parse(raw || '{}');
        if (!body.message) return json(res, 400, { error: 'message required' });
        const agent = agentFor(body.session_id || 'anon', 'CHAT');
        const out = agent.reply(String(body.message));
        return json(res, 200, { messages: out.messages, quick: out.quick || [], escalated: !!out.escalated, booked: !!out.booked, language: agent.lang });
      }

      /* Twilio inbound: SMS & WhatsApp (form-encoded) → balasan TwiML */
      if (req.method === 'POST' && url === '/webhook/twilio-inbound') {
        const form = parseForm(raw);
        const from = form.From || 'unknown';
        const channel = from.indexOf('whatsapp:') === 0 ? 'WA' : 'SMS';
        const agent = agentFor(from, channel);
        const out = agent.reply(String(form.Body || ''));
        const reply = (out.messages || []).join('\n\n').replace(/\*\*/g, '*'); // WA/SMS pakai *bold*
        return xml(res, '<?xml version="1.0" encoding="UTF-8"?><Response><Message>' +
          reply.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</Message></Response>');
      }

      /* Postmark inbound email → klasifikasi + balasan (JSON; produksi: kirim via Postmark API) */
      if (req.method === 'POST' && url === '/webhook/postmark-inbound') {
        const body = JSON.parse(raw || '{}');
        const fromEmail = (body.FromFull && body.FromFull.Email) || body.From || 'unknown';
        const agent = agentFor('mail:' + fromEmail, 'EMAIL');
        const out = agent.reply(String(body.TextBody || body.Subject || ''));
        return json(res, 200, { reply_to: fromEmail, subject: 'Re: ' + (body.Subject || 'Aurora Dental'), body: (out.messages || []).join('\n\n') });
      }

      json(res, 404, { error: 'not found' });
    } catch (e) {
      json(res, 500, { error: e.message });
    }
  });
});

server.listen(PORT, function () {
  console.log('Aurora bridge listening on :' + PORT +
    ' | patients=' + S.patients().length +
    ' | tools=' + Object.keys(TOOLS).length +
    (SECRET ? ' | secured' : ' | OPEN (set WEBHOOK_SHARED_SECRET!)'));
});
