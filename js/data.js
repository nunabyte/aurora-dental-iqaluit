/* Aurora Dental Iqaluit — seed database (dummy, untuk demo & promosi)
   Sumber: desain RE/ai-receptionist-dentist-app-iqaluit (Aurora Dental App.dc.html),
   diperluas dengan pasien & janji temu tambahan. Tanggal dibuat relatif "hari ini". */

(function (global) {
  'use strict';

  const now = new Date();
  function d(offsetDays, h, m) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, h || 0, m || 0).toISOString();
  }

  /* ---------------- clinic & setup ---------------- */
  const CLINIC = {
    id: 'aurora-iqaluit',
    name: 'Aurora Dental Iqaluit',
    address: 'Bldg 1085, Mivvik Street, Iqaluit, NU X0A 0H0',
    phone: '(867) 979-4400',
    emergencyPhone: '(867) 979-0911',
    email: 'hello@auroradental.ca',
    timezone: 'America/Iqaluit',
    lat: 63.7467, lon: -68.5170,
    languages: ['EN', 'FR', 'IU'],
    // 0=Sun..6=Sat, minutes from midnight; note = displayed hint
    hours: {
      0: null,
      1: { open: 510, close: 1020 },
      2: { open: 510, close: 1020 },
      3: { open: 510, close: 1020 },
      4: { open: 510, close: 1020 },
      5: { open: 510, close: 900 },
      6: { open: 540, close: 780, note: 'hygiene only' }
    },
    hoursText: [
      ['Mon–Thu', '08:30 – 17:00'],
      ['Friday', '08:30 – 15:00'],
      ['Saturday', '09:00 – 13:00 (hygiene only)'],
      ['Sunday', 'Closed · Sila answers 24/7']
    ],
    locations: [
      { name: 'Iqaluit — Main clinic', sub: '3 operatories · Mon–Fri 08:30–17:00, Sat 09:00–13:00', status: 'OPEN', tone: 'green' },
      { name: 'Kimmirut — Visiting clinic', sub: 'Health centre partnership · 1 week / month', status: 'NEXT: JUL 20', tone: 'amber' }
    ],
    events: [
      { date: 'Jul 9', title: 'Nunavut Day', sub: 'closed · auto-reply active' },
      { date: 'Jul 20', title: 'Kimmirut visiting week', sub: 'Dr. Carter travelling' },
      { date: 'Sep 12', title: 'School dental screening day', sub: 'Aqsarniit School' }
    ],
    pharmacies: [
      { name: 'Northmart Pharmacy', sub: 'Rx via secure email + WA', status: 'LINKED' },
      { name: 'QGH Outpatient Pharmacy', sub: 'Rx via secure fax/email', status: 'LINKED' }
    ],
    insurers: ['NIHB', 'GN plan', 'Sun Life', 'Canada Life', 'Blue Cross', 'Manulife']
  };

  /* ---------------- staff & roles ---------------- */
  const STAFF = [
    { id: 's1', name: 'Dr. Emily Carter', role: 'Dentist · DDS', access: 'Clinical + Rx', status: 'On duty', on: true, bg: '#3b4a6b', fg: '#fff', op: 'Op 1' },
    { id: 's2', name: 'Dr. Jean-Philippe Roy', role: 'Dentist · DMD', access: 'Clinical + Rx', status: 'On duty', on: true, bg: '#3b4a6b', fg: '#fff', op: 'Op 2' },
    { id: 's3', name: 'Leetia Michael', role: 'Hygienist · RDH', access: 'Clinical', status: 'On duty', on: true, bg: '#7e93c4', fg: '#fff', op: 'Op 3' },
    { id: 's4', name: 'Naomi Kootoo', role: 'Dental assistant', access: 'Clinical (assist)', status: 'Storm day — remote', on: false, bg: '#7e93c4', fg: '#fff' },
    { id: 's5', name: 'Marie Tulugak', role: 'Receptionist', access: 'Front desk', status: 'On duty', on: true, bg: '#aeb8d4', fg: '#2b3550' },
    { id: 's6', name: 'Peter Aningmiuq', role: 'Owner / Admin', access: 'Full', status: 'Travelling', on: false, bg: '#1d2438', fg: '#fff' },
    { id: 's7', name: 'Joanasie Kilabuk', role: 'Security & facilities', access: 'Facilities', status: 'Evening shift', on: false, bg: '#c9d2e6', fg: '#2b3550' },
    { id: 's8', name: 'Rhoda Angnakak', role: 'Billing admin', access: 'Billing + NIHB', status: 'On duty', on: true, bg: '#aeb8d4', fg: '#2b3550' },
    { id: 's9', name: 'Sila ᓯᓚ', role: 'AI receptionist', access: 'Comms (supervised)', status: '24/7', on: true, bg: '#5ec4a8', fg: '#123f31' }
  ];

  // Login roles (dari desain) — role menentukan hak akses halaman.
  const ROLES = [
    { id: 'reception', name: 'Marie Tulugak', role: 'Receptionist', initials: 'MT', bg: '#aeb8d4', fg: '#2b3550',
      pages: ['dashboard', 'calendar', 'patients', 'messages', 'sila', 'inventory'] },
    { id: 'owner', name: 'Peter Aningmiuq', role: 'Owner', initials: 'PA', bg: '#1d2438', fg: '#fff',
      pages: ['dashboard', 'calendar', 'patients', 'messages', 'sila', 'staff', 'inventory', 'setup'] },
    { id: 'admin', name: 'Rhoda Angnakak', role: 'Admin · Billing', initials: 'RA', bg: '#aeb8d4', fg: '#2b3550',
      pages: ['dashboard', 'calendar', 'patients', 'messages', 'sila', 'staff', 'inventory', 'setup'] },
    { id: 'dentist', name: 'Dr. Emily Carter', role: 'Dentist', initials: 'EC', bg: '#3b4a6b', fg: '#fff',
      pages: ['dashboard', 'calendar', 'patients', 'messages', 'sila'] },
    { id: 'assistant', name: 'Naomi Kootoo', role: 'Dental assistant', initials: 'NK', bg: '#7e93c4', fg: '#fff',
      pages: ['dashboard', 'calendar', 'patients', 'inventory'] },
    { id: 'security', name: 'Joanasie Kilabuk', role: 'Security & facilities', initials: 'JK', bg: '#c9d2e6', fg: '#2b3550',
      pages: ['dashboard', 'staff', 'inventory'] }
  ];

  const ROSTER = [
    { who: 'Carter', days: ['f', 'f', 'f', 'f', 'h'] },
    { who: 'Roy', days: ['f', 'f', 'o', 'f', 'f'] },
    { who: 'Michael', days: ['f', 'f', 'f', 'f', 'f'] },
    { who: 'Kootoo', days: ['o', 'f', 'f', 'f', 'h'] },
    { who: 'Tulugak', days: ['f', 'f', 'f', 'f', 'f'] },
    { who: 'Kilabuk J.', days: ['h', 'e', 'h', 'e', 'h'] }
  ];

  const TIMEOFF = [
    { id: 't1', who: 'Naomi Kootoo (DA)', when: 'Jul 13–17', reason: 'family travel' },
    { id: 't2', who: 'Leetia Michael (RDH)', when: 'Aug 3', reason: 'appointment' }
  ];

  /* ---------------- services (untuk booking Sila) ---------------- */
  const SERVICES = [
    { id: 'exam', name: 'Comprehensive exam + X-rays', duration: 60, price: '$180–240', ops: ['Op 1', 'Op 2'] },
    { id: 'hygiene', name: 'Hygiene cleaning & recall', duration: 45, price: '$140–210', ops: ['Op 3'] },
    { id: 'filling', name: 'Composite filling', duration: 45, price: '$210–380', ops: ['Op 1', 'Op 2'] },
    { id: 'crown', name: 'Crown / bridge', duration: 90, price: '$1,100–1,500', ops: ['Op 1', 'Op 2'] },
    { id: 'extraction', name: 'Extraction', duration: 60, price: '$220–450', ops: ['Op 1', 'Op 2'] },
    { id: 'denture', name: 'Denture fit / repair', duration: 45, price: '$150+', ops: ['Op 1'] },
    { id: 'kids', name: 'Kids check-up', duration: 45, price: '$140', ops: ['Op 2', 'Op 3'] },
    { id: 'whitening', name: 'Whitening', duration: 60, price: '$350', ops: ['Op 2'] },
    { id: 'emergency', name: 'Emergency exam', duration: 30, price: '$120 + treatment', ops: ['Op 1', 'Op 2'] }
  ];

  const OPS = [
    { id: 'Op 1', title: 'OP 1 · DR. CARTER', provider: 'Dr. Carter' },
    { id: 'Op 2', title: 'OP 2 · DR. ROY', provider: 'Dr. Roy' },
    { id: 'Op 3', title: 'OP 3 · HYGIENE', provider: 'L. Michael, RDH' }
  ];

  /* ---------------- patients (6 kaya dari desain + 24 tambahan) -------- */
  const P_RICH = [
    { id: 'p1', name: 'Annie Kilabuk', dob: 'Mar 14, 1979 (47)', sex: 'F', lang: 'ᐃᓄᒃᑎᑐᑦ preferred', langCode: 'IU', insurance: 'NIHB', phone: '(867) 979-2214', channel: 'WhatsApp', email: 'a.kilabuk@qiniq.com', address: 'Happy Valley, Iqaluit', allergies: 'Penicillin', conditions: 'Type 2 diabetes', meds: 'Metformin 500mg', next: 'Today 09:00 · Crown prep #14', last: 'Jun 2 · Crown consult', recall: 'On schedule', balance: '$0.00', billingNote: 'NIHB predetermination approved Jul 3', dot: true,
      flags: [['⚠ Allergy: Penicillin', 'red'], ['Diabetic — AM appts preferred', 'amber'], ['NIHB', 'blue']],
      records: [
        { date: 'Today 08:40', author: 'Sila ᓯᓚ', role: 'AI intake', type: 'AI', note: 'Pre-visit check-in complete (WhatsApp, Inuktitut). No medication changes. Blood sugar this morning: 6.2 mmol/L — cleared for treatment.' },
        { date: 'Jun 2', author: 'Dr. E. Carter', role: 'Dentist', type: 'Voice', note: '#14 fractured DL cusp, asymptomatic. Recommended full-coverage crown. PA taken — no periapical pathology. Discussed zirconia vs PFM; patient prefers zirconia. NIHB predetermination submitted.', img: 'periapical x-ray · #14' },
        { date: 'Jun 2', author: 'N. Kootoo', role: 'Dental assistant', type: 'Typed', note: 'Alginate impressions for study models. Shade A3 confirmed under daylight lamp. Patient tolerates long visits well.' },
        { date: 'Feb 18', author: 'L. Michael', role: 'Hygienist', type: 'Voice', note: 'Scaling + polish. Generalized light supragingival calculus. Localized 4mm pocket #46 distal — monitor. OHI given, recommended interdental brushes.' }
      ],
      rx: [
        { drug: 'Amoxicillin — ALLERGY: substituted Clindamycin 300mg', sig: '1 cap QID × 5 days', prescriber: 'Dr. Carter', date: 'Jun 2', dest: 'Northmart Pharmacy' },
        { drug: 'Ibuprofen 600mg', sig: '1 tab TID PRN pain', prescriber: 'Dr. Carter', date: 'Jun 2', dest: 'Northmart Pharmacy' }
      ],
      hist: [
        { date: 'Jun 2, 2026', proc: 'Crown consult + PA', provider: 'Dr. Carter', status: 'done' },
        { date: 'Feb 18, 2026', proc: 'Hygiene + exam', provider: 'L. Michael', status: 'done' },
        { date: 'Aug 21, 2025', proc: 'Filling #25', provider: 'Dr. Roy', status: 'done' },
        { date: 'Feb 9, 2025', proc: 'Hygiene + FMX', provider: 'L. Michael', status: 'done' }
      ] },
    { id: 'p2', name: 'Pauloosie Nakashuk', dob: 'Oct 2, 1965 (60)', sex: 'M', lang: 'English', langCode: 'EN', insurance: 'GN plan', phone: '(867) 979-5511', channel: 'SMS', email: 'p.nakashuk@gov.nu.ca', address: 'Road to Nowhere, Iqaluit', allergies: 'None known', conditions: 'Hypertension', meds: 'Amlodipine 5mg', next: 'Today 09:30 · Hygiene', last: 'Jan 6 · Hygiene', recall: 'On schedule', balance: '$0.00', billingNote: 'Direct billing — GN employee plan', dot: false,
      flags: [['Hypertension — check BP', 'amber'], ['GN plan', 'blue']],
      records: [{ date: 'Jan 6', author: 'L. Michael', role: 'Hygienist', type: 'Typed', note: 'Routine scaling. BP 138/86 pre-treatment. Tissues healthy, minimal bleeding.' }],
      rx: [], hist: [{ date: 'Jan 6, 2026', proc: 'Hygiene + exam', provider: 'L. Michael', status: 'done' }, { date: 'Jul 8, 2025', proc: 'Hygiene', provider: 'L. Michael', status: 'done' }] },
    { id: 'p3', name: 'Marie-Claire Tremblay', dob: 'May 22, 1991 (35)', sex: 'F', lang: 'Français preferred', langCode: 'FR', insurance: 'Sun Life', phone: '(867) 222-8102', channel: 'Phone', email: 'mc.tremblay@gmail.com', address: 'Tundra Valley, Iqaluit', allergies: 'Latex', conditions: 'None', meds: 'None', next: 'Today 10:30 · Comp. exam', last: '— New patient', recall: '—', balance: '$0.00', billingNote: 'Assignment accepted — Sun Life', dot: true,
      flags: [['⚠ Latex allergy — nitrile only', 'red'], ['New patient', 'blue'], ['FR communications', 'blue']],
      records: [{ date: 'Jul 2', author: 'Sila ᓯᓚ', role: 'AI intake', type: 'AI', note: 'Intake completed by phone (FR). Moving from Gatineau; previous dentist records requested from Clinique Dentaire Aylmer — consent form signed electronically.' }],
      rx: [], hist: [{ date: 'Today', proc: 'Comp. exam + X-rays', provider: 'Dr. Roy', status: 'today' }] },
    { id: 'p4', name: 'David Okalik', dob: 'Jan 8, 1958 (68)', sex: 'M', lang: 'ᐃᓄᒃᑎᑐᑦ / EN', langCode: 'IU', insurance: 'NIHB', phone: '(867) 939-2077', channel: 'Phone', email: '—', address: 'Kimmirut (fly-in)', allergies: 'None known', conditions: 'Atrial fibrillation', meds: 'Warfarin 5mg', next: 'Today 13:30 · Extraction #32', last: 'Jun 12 · Consult (tele)', recall: 'Overdue 3 months', balance: '$0.00', billingNote: 'NIHB · travel via patient travel program', dot: true,
      flags: [['⚠ Warfarin — INR before surgery', 'red'], ['Fly-in patient — Kimmirut', 'amber'], ['NIHB', 'blue']],
      records: [
        { date: 'Jun 28', author: 'QGH Lab (imported)', role: 'External', type: 'Typed', note: 'INR 2.4 (target 2–3). Faxed from Qikiqtani General Hospital.' },
        { date: 'Jun 12', author: 'Dr. E. Carter', role: 'Dentist', type: 'Voice', note: 'Telehealth consult. #32 gross caries, non-restorable. Plan: extraction under local, hold warfarin per physician — Dr. Anand approves continuing with local measures. Confirm INR < 3 on day of surgery.' }
      ],
      rx: [{ drug: 'Tranexamic acid 4.8% rinse', sig: '10ml QID × 2 days post-op', prescriber: 'Dr. Carter', date: 'planned', dest: 'QGH Pharmacy' }],
      hist: [{ date: 'Jun 12, 2026', proc: 'Tele-consult', provider: 'Dr. Carter', status: 'done' }, { date: 'Sep 3, 2025', proc: 'Exam + PA', provider: 'Dr. Carter', status: 'done' }] },
    { id: 'p5', name: 'Josie Quvianaq', dob: 'Jul 30, 2002 (23)', sex: 'F', lang: 'English', langCode: 'EN', insurance: 'NIHB', phone: '(867) 979-8830', channel: 'WhatsApp', email: 'josieq@icloud.com', address: 'Lower Iqaluit', allergies: 'None known', conditions: 'None', meds: 'None', next: 'Today 11:15 · Chipped #8', last: 'Mar 2 · Hygiene', recall: 'On schedule', balance: '$45.00', billingNote: 'Small balance — whitening top-up', dot: false,
      flags: [['NIHB', 'blue']],
      records: [{ date: 'Today 07:58', author: 'Sila ᓯᓚ', role: 'AI triage', type: 'AI', note: 'Patient sent photo of chipped #8 via WhatsApp. No pain, no pulp exposure visible. Triaged non-urgent, booked same-day 11:15.', img: 'patient photo · chipped #8' }],
      rx: [], hist: [{ date: 'Mar 2, 2026', proc: 'Hygiene', provider: 'L. Michael', status: 'done' }] },
    { id: 'p6', name: 'Sarah Papatsie', dob: 'Nov 11, 2002 (23)', sex: 'F', lang: 'English / ᐃᓄᒃᑎᑐᑦ', langCode: 'EN', insurance: 'NIHB', phone: '(867) 979-1145', channel: 'SMS', email: 'spapatsie@qiniq.com', address: 'Apex', allergies: 'None known', conditions: 'Pregnancy — 2nd trimester', meds: 'Prenatal vitamins', next: 'Today 14:30 · Fillings', last: 'Jun 20 · Exam', recall: 'On schedule', balance: '$0.00', billingNote: 'NIHB', dot: false,
      flags: [['Pregnant (T2) — no elective X-rays', 'amber'], ['Lives in Apex — storm road risk', 'amber']],
      records: [{ date: 'Jun 20', author: 'Dr. J-P. Roy', role: 'Dentist', type: 'Voice', note: 'Two occlusal caries #19, #20 — restore with composite, safe in T2. Defer bitewings to postpartum. Left side first, short appointments, semi-reclined.' }],
      rx: [], hist: [{ date: 'Jun 20, 2026', proc: 'Exam', provider: 'Dr. Roy', status: 'done' }] }
  ];

  const FIRST = ['Elisapee', 'Tommy', 'Lucassie', 'Meeka', 'Jimmy', 'Oolootie', 'Noah', 'Siasi', 'Adamie', 'Rebecca', 'Johnny', 'Nuvija', 'Simon', 'Leah', 'Markusie', 'Sheila', 'Paul', 'Annie', 'Levi', 'Martha', 'Eric', 'Susan', 'Sam', 'Nicole'];
  const LAST = ['Arnaquq', 'Ipeelie', 'Nowdluk', 'Akavak', 'Kootoo', 'Pitseolak', 'Tikivik', 'Michael', 'Alainga', 'Tremblay', 'Idlout', 'Angnakak', 'Kilabuk', 'Petaulassie', 'Curley', 'Fraser', 'Naglingniq', 'Manning', 'Qamaniq', 'Sheutiapik', 'Boucher', 'Onalik', 'Joamie', 'Roy'];
  const P_EXTRA = FIRST.map(function (fn, i) {
    const insurers = ['NIHB', 'NIHB', 'GN plan', 'Sun Life', 'NIHB', 'Blue Cross'];
    const langs = [['English', 'EN'], ['ᐃᓄᒃᑎᑐᑦ preferred', 'IU'], ['English / ᐃᓄᒃᑎᑐᑦ', 'EN'], ['Français preferred', 'FR']];
    const L = langs[i % 4];
    return {
      id: 'px' + (i + 1), name: fn + ' ' + LAST[i],
      dob: (1955 + (i * 3) % 55) + '', sex: i % 2 ? 'M' : 'F',
      lang: L[0], langCode: L[1],
      insurance: insurers[i % insurers.length],
      phone: '(867) 979-' + String(6000 + i * 37).slice(0, 4),
      channel: ['SMS', 'WhatsApp', 'Phone', 'Email'][i % 4],
      email: (fn + '.' + LAST[i]).toLowerCase() + '@qiniq.com',
      address: ['Happy Valley', 'Lower Iqaluit', 'Apex', 'Tundra Valley', 'Road to Nowhere', 'Kimmirut (fly-in)', 'Pangnirtung (fly-in)'][i % 7] + (i % 7 > 4 ? '' : ', Iqaluit'),
      allergies: i % 8 === 0 ? 'Penicillin' : 'None known', conditions: i % 6 === 0 ? 'Asthma' : 'None', meds: i % 6 === 0 ? 'Salbutamol PRN' : 'None',
      next: '—', last: 'Within last 12 months', recall: i % 4 === 0 ? 'Overdue' : 'On schedule',
      balance: i % 9 === 0 ? '$60.00' : '$0.00', billingNote: '', dot: false,
      flags: i % 4 === 0 ? [['Hygiene recall overdue', 'amber']] : [],
      records: [], rx: [], hist: []
    };
  });

  /* ---------------- appointments hari ini (desain) + minggu ini -------- */
  const A_TODAY = [
    { id: 'a1', time: '09:00', dur: 60, patient: 'Annie Kilabuk', pid: 'p1', proc: 'Crown prep #14', provider: 'Dr. Carter', op: 'Op 1', billing: 'NIHB · approved', status: 'confirmed', sila: 'Reminder sent 48h + 2h ago in Inuktitut. Lab case arrives on the 12:40 flight — watch weather.' },
    { id: 'a2', time: '09:30', dur: 45, patient: 'Pauloosie Nakashuk', pid: 'p2', proc: 'Hygiene recall', provider: 'L. Michael, RDH', op: 'Op 3', billing: 'GN employee plan', status: 'confirmed', sila: 'Confirmed by SMS yesterday 16:02.' },
    { id: 'a3', time: '10:30', dur: 60, patient: 'Marie-Claire Tremblay', pid: 'p3', proc: 'Comp. exam + X-rays', provider: 'Dr. Roy', op: 'Op 2', billing: 'Sun Life', status: 'unconfirmed', sila: 'No reply to 2 reminders (FR). Recommend a quick call — she answered calls 3/3 times before.' },
    { id: 'a4', time: '11:15', dur: 45, patient: 'Josie Quvianaq', pid: 'p5', proc: 'Chipped #8 assessment', provider: 'Dr. Roy', op: 'Op 3', billing: 'NIHB', status: 'confirmed', sila: 'Booked via WhatsApp this morning after photo triage.' },
    { id: 'a5', time: '13:30', dur: 60, patient: 'David Okalik', pid: 'p4', proc: 'Extraction #32', provider: 'Dr. Carter', op: 'Op 1', billing: 'NIHB', status: 'risk', alert: 'On warfarin — verify INR (last 2.4 on Jun 28) before extraction.', sila: 'Flying in from Kimmirut — flight at risk after 13:00. Reschedule draft ready.' },
    { id: 'a6', time: '14:30', dur: 90, patient: 'Sarah Papatsie', pid: 'p6', proc: 'Fillings #19, #20', provider: 'Dr. Roy', op: 'Op 2', billing: 'NIHB', status: 'risk', sila: 'Lives in Apex — road closes in blizzards. Reschedule draft ready.' },
    { id: 'a7', time: '15:30', dur: 45, patient: 'Tommy Ipeelie', pid: 'px2', proc: 'Denture fit check', provider: 'Dr. Carter', op: 'Op 1', billing: 'NIHB', status: 'risk', sila: 'Elder, no vehicle — storm-risk. Reschedule draft ready.' }
  ].map(function (a) {
    const parts = a.time.split(':');
    a.start = d(0, Number(parts[0]), Number(parts[1]));
    return a;
  });

  // Janji temu hari-hari lain (kalender minggu + slot engine)
  const A_WEEK = [];
  const weekSeed = [
    [1, '09:00', 60, 'px1', 'Hygiene recall', 'Op 3'], [1, '10:30', 45, 'px3', 'Composite filling', 'Op 2'],
    [1, '13:00', 60, 'px4', 'Comp. exam', 'Op 1'], [2, '09:30', 45, 'px5', 'Hygiene recall', 'Op 3'],
    [2, '11:00', 90, 'px6', 'Crown seat', 'Op 1'], [2, '14:00', 45, 'px7', 'Kids check-up', 'Op 2'],
    [3, '09:00', 60, 'px8', 'Extraction consult', 'Op 1'], [3, '10:00', 45, 'px9', 'Hygiene recall', 'Op 3'],
    [3, '13:30', 60, 'px10', 'Whitening', 'Op 2'], [4, '09:00', 45, 'px11', 'Denture repair', 'Op 1'],
    [4, '10:30', 45, 'px12', 'Hygiene recall', 'Op 3'], [5, '09:30', 45, 'px13', 'Hygiene (Sat)', 'Op 3'],
    [-1, '09:00', 60, 'px14', 'Comp. exam', 'Op 2'], [-1, '11:00', 45, 'px15', 'Filling', 'Op 1'],
    [-2, '10:00', 45, 'px16', 'Hygiene recall', 'Op 3'], [-2, '14:00', 60, 'px17', 'Root canal (1/2)', 'Op 2']
  ];
  weekSeed.forEach(function (w, i) {
    const p = P_EXTRA.find(function (x) { return x.id === w[3]; }) || P_EXTRA[0];
    const op = OPS.find(function (o) { return o.id === w[5]; });
    const parts = w[1].split(':');
    A_WEEK.push({
      id: 'aw' + i, time: w[1], dur: w[2], patient: p.name, pid: p.id, proc: w[4],
      provider: op.provider, op: w[5], billing: p.insurance,
      status: w[0] < 0 ? 'done' : 'confirmed',
      start: d(w[0], Number(parts[0]), Number(parts[1])),
      sila: 'Reminder scheduled 48h & 2h before, in patient\'s preferred language.'
    });
  });

  /* ---------------- conversations (desain) ---------------- */
  const CONVOS = [
    { id: 'c1', ch: 'CALL', name: 'Elisapee Arnaquq', time: '08:31', at: d(0, 8, 31), preview: 'Wants Wed cleaning moved — offered Fri 10:00', sub: 'Phone call · Inuktitut · 3 min 12 s · handled by Sila', channelName: 'phone (Sila will call back)',
      summary: '✦ Elisapee asked to move Wednesday\'s cleaning because her shift at NorthMart changed. Sila offered Friday 10:00 with Leetia; Elisapee will confirm with her supervisor and reply today. No outstanding balance.',
      thread: [{ from: 'p', text: 'ᐅᓪᓛᒃᑯᑦ — I need to move my Wednesday cleaning, my shift changed.', meta: 'Transcript excerpt · 08:31' }, { from: 's', text: 'No problem, Elisapee. Leetia has Friday at 10:00 or Monday at 14:30 — would either work?', meta: 'Sila ᓯᓚ · voice · Inuktitut' }, { from: 'p', text: 'Friday might work, I\'ll check with my supervisor and let you know.', meta: '08:33' }, { from: 's', text: 'I\'ll hold the Friday 10:00 spot until 5 PM today and text you a reminder. ᖁᔭᓐᓇᒦᒃ!', meta: 'Sila ᓯᓚ · hold placed on slot' }] },
    { id: 'c2', ch: 'WA', name: 'Josie Quvianaq', time: '07:58', at: d(0, 7, 58), preview: '📷 Chipped front tooth — booked 11:15 today', sub: 'WhatsApp · English · resolved by Sila', channelName: 'WhatsApp',
      summary: '✦ Josie chipped #8 on a frozen berry. Photo shows small enamel fracture, no pain. Sila triaged as non-urgent and booked her same-day at 11:15 with Dr. Roy.',
      thread: [{ from: 'p', text: 'Hey I chipped my front tooth this morning 😬 [photo]', meta: '07:58' }, { from: 's', text: 'Thanks for the photo, Josie — that looks like a small enamel chip. Any pain or sensitivity?', meta: 'Sila ᓯᓚ' }, { from: 'p', text: 'No pain, just feels sharp', meta: '08:00' }, { from: 's', text: 'Good news — not urgent, but let\'s smooth and assess it today. Dr. Roy can see you at 11:15. Booked ✓', meta: 'Sila ᓯᓚ · appointment created' }] },
    { id: 'c3', ch: 'SMS', name: 'Tommy Ipeelie', time: '07:45', at: d(0, 7, 45), preview: 'CONFIRM reply for 15:30 denture check', sub: 'SMS · English · auto-reminder flow', channelName: 'SMS',
      summary: '✦ Tommy confirmed his 15:30 denture fit check via reminder reply. Now flagged storm-risk — he has no vehicle; reschedule draft is ready in the bulk queue.',
      thread: [{ from: 's', text: 'Reminder: denture fit check today 3:30 PM at Aurora Dental. Reply C to confirm, R to reschedule.', meta: 'Sila ᓯᓚ · 48h reminder' }, { from: 'p', text: 'C', meta: '07:45' }, { from: 's', text: '⚠ Storm-risk flag added 08:15 — blizzard from 13:00. Included in reschedule bulk queue.', meta: 'System' }] },
    { id: 'c4', ch: 'CHAT', name: 'Website visitor', time: '07:55', at: d(0, 7, 55), preview: 'New family of 4 moving from Ottawa', sub: 'Website chatbot · English · lead captured', channelName: 'website chat',
      summary: '✦ Family of 4 relocating to Iqaluit in August. Sila sent new-patient intake forms and offered a family block booking in the first week of September. High-value lead.',
      thread: [{ from: 'p', text: 'Hi — we\'re moving to Iqaluit in August with two kids (6 and 9). Are you taking new patients?', meta: '07:55' }, { from: 's', text: 'Welcome to Iqaluit! Yes — we\'d love to see your family. I can block four back-to-back visits the week of Sep 1 so you only make one trip. Shall I email the intake forms?', meta: 'Sila ᓯᓚ' }, { from: 'p', text: 'That would be great — sarah.linden@____.com', meta: '07:57' }, { from: 's', text: 'Sent ✓ — forms + what to bring (insurance card, previous records). I\'ll follow up in a week if we don\'t hear back.', meta: 'Sila ᓯᓚ · follow-up scheduled' }] },
    { id: 'c5', ch: 'EMAIL', name: 'NIHB / FNIHB', time: '07:40', at: d(0, 7, 40), preview: 'Predetermination approved — Kilabuk crown', sub: 'Email · automated parse', channelName: 'email',
      summary: '✦ NIHB approved the zirconia crown predetermination for Annie Kilabuk (#14), effective immediately. Sila attached the approval to her chart and confirmed today\'s 09:00 remains fully covered.',
      thread: [{ from: 'p', text: 'RE: Predetermination #NB-2026-88412 — APPROVED. Client: KILABUK, ANNIE. Code 27301, tooth 14…', meta: 'nihb-ssna@sac-isc.gc.ca · 07:40' }, { from: 's', text: 'Parsed & filed to chart ✓ — billing status updated to "approved". No patient action needed.', meta: 'Sila ᓯᓚ · auto-filed' }] },
    { id: 'c6', ch: 'CALL', name: 'Tommy Nowdluk', time: '07:22', at: d(0, 7, 22), preview: '⚠ Severe pain — emergency, seen 08:15', sub: 'Phone · English · escalated to staff', channelName: 'phone',
      summary: '✦ Severe pain 9/10, swelling, kept him awake. Sila classified as emergency, paged Dr. Roy, and squeezed him in at 08:15. Seen and treated; amoxicillin sent to Northmart Pharmacy.',
      thread: [{ from: 'p', text: 'I\'ve been up all night, the pain is unbearable and my cheek is swelling', meta: '07:22' }, { from: 's', text: 'I\'m sorry, Tommy — that sounds like it needs urgent care. On a scale of 1–10, how bad is the pain? Any fever?', meta: 'Sila ᓯᓚ' }, { from: 'p', text: '9. Maybe a slight fever', meta: '07:23' }, { from: 's', text: '⚠ ESCALATED — paged Dr. Roy + receptionist. Emergency slot created 08:15.', meta: 'System · emergency protocol' }, { from: 's', text: 'Tommy, we\'ll see you at 8:15 this morning. If swelling spreads to your eye or throat before then, go to QGH emergency immediately.', meta: 'Sila ᓯᓚ' }] }
  ];

  /* ---------------- inventory (desain) ---------------- */
  const INVENTORY = [
    { id: 'i1', name: 'Nitrile gloves — M', cat: 'PPE', stock: '3 boxes', min: '10 boxes', low: true },
    { id: 'i2', name: 'Lidocaine 2% w/ epi carpules', cat: 'Clinical', stock: '38', min: '50', low: true },
    { id: 'i3', name: 'Composite A2 syringes', cat: 'Clinical', stock: '5', min: '8', low: true },
    { id: 'i4', name: 'Fluoride varnish unit-dose', cat: 'Clinical', stock: '22', min: '30', low: true },
    { id: 'i5', name: 'Sterilization pouches 3.5×9', cat: 'Sterilization', stock: '6 boxes', min: '4 boxes', low: false },
    { id: 'i6', name: 'Prophy paste — mint', cat: 'Hygiene', stock: '54', min: '24', low: false },
    { id: 'i7', name: 'Bitewing sensor sleeves', cat: 'Imaging', stock: '410', min: '200', low: false },
    { id: 'i8', name: 'Printer paper — letter', cat: 'Office', stock: '9 reams', min: '4 reams', low: false },
    { id: 'i9', name: 'N₂O tank', cat: 'Clinical', stock: '62%', min: '25%', low: false }
  ];

  /* ---------------- Sila analytics (desain) ---------------- */
  const SILA_STATS = {
    contacts7d: 214, contactsBreakdown: '96 calls · 71 WA · 47 other',
    resolvedPct: 78, byLang: '61 / 9 / 30', noShow: '3.1%', noShowWas: '8.4%',
    volume: [[38, 9], [31, 7], [27, 11], [35, 6], [29, 8], [12, 3], [42, 10]],
    volumeDays: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'],
    insights: [
      { bold: '18 hygiene recalls overdue >6 months.', text: 'Past campaigns recovered ~60%. A bilingual WA/SMS push next week ≈ 11 bookings (~$2,600).', action: 'Draft campaign →' },
      { bold: 'Fridays run at 64% chair utilization', text: 'vs 92% weekly average. Consider moving Dr. Roy\'s admin block, or a Friday "new patient exam" promo.' },
      { bold: 'Toonik Tyme festival (Apr) drove 22 new patients last year.', text: 'Book the community-booth slot before the January deadline.' },
      { bold: 'Fly-in patients no-show 4× more during storm season.', text: 'Suggest auto-offering telehealth pre-checks for Kimmirut & Pangnirtung patients Nov–Mar.' }
    ]
  };

  const BULK_LIST = [
    { name: 'David Okalik', appt: '13:30 extraction', ch: 'CALL', lang: 'ᐃᓄᒃᑎᑐᑦ' },
    { name: 'Sarah Papatsie', appt: '14:30 fillings', ch: 'SMS', lang: 'EN' },
    { name: 'Tommy Ipeelie', appt: '15:30 denture', ch: 'WA', lang: 'EN' }
  ];

  global.AURORA_SEED = {
    clinic: CLINIC, staff: STAFF, roles: ROLES, roster: ROSTER, timeoff: TIMEOFF,
    services: SERVICES, ops: OPS,
    patients: P_RICH.concat(P_EXTRA),
    appointments: A_TODAY.concat(A_WEEK),
    conversations: CONVOS,
    inventory: INVENTORY,
    silaStats: SILA_STATS,
    bulkList: BULK_LIST
  };
})(typeof window !== 'undefined' ? window : globalThis);
