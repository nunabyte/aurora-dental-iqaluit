/* Aurora Dental Iqaluit — staff console SPA (implementasi desain RE) */

(function () {
  'use strict';

  const S = window.AuroraStore;
  const W = window.AuroraWeather;
  const I18N = window.AuroraI18n;
  const $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  const App = window.App = {
    state: {
      page: 'dashboard', pid: 'p1', ptab: 'overview', convoId: 'c1',
      apptId: null, lang: 'EN', calView: 'day', calOffset: 0,
      invFilter: 'All', ptQuery: '', rec: false, dictText: '', noteImgs: [],
      selRole: null, broadcast: false
    }
  };

  /* ================= LOGIN ================= */
  function renderLogin() {
    $('roleList').innerHTML = S.roles.map(function (r) {
      return '<div class="role-item' + (App.state.selRole === r.id ? ' sel' : '') + '" onclick="App.pickRole(\'' + r.id + '\')">' +
        '<div class="av" style="background:' + r.bg + ';color:' + r.fg + '">' + r.initials + '</div>' +
        '<div style="flex:1"><b>' + esc(r.name) + '</b><small>' + esc(r.role) + '</small></div>' +
        '<div class="arrow">→</div></div>';
    }).join('');
  }
  App.pickRole = function (id) {
    App.state.selRole = id;
    renderLogin();
    $('passInput').focus();
  };
  App.signIn = function () {
    const err = $('loginErr');
    if (!App.state.selRole) { err.textContent = 'Please select your account first.'; return; }
    const pass = $('passInput').value;
    if (pass && pass !== 'aurora') { err.textContent = 'Wrong password — demo password is "aurora" (or leave blank).'; return; }
    err.textContent = '';
    S.login(App.state.selRole);
    enterApp();
  };

  function enterApp() {
    const user = S.currentUser();
    if (!user) return;
    $('loginScreen').classList.add('hide');
    $('appShell').classList.remove('hide');
    App.state.page = user.pages[0] || 'dashboard';
    render();
  }
  App.logout = function () {
    S.logout();
    $('appShell').classList.add('hide');
    $('loginScreen').classList.remove('hide');
    App.state.selRole = null;
    $('passInput').value = '';
    renderLogin();
  };

  /* ================= SHELL ================= */
  const NAV = [
    ['dashboard', '◧'], ['calendar', '▦'], ['patients', '◉'], ['messages', '✉'],
    ['sila', '✦'], ['staff', '⬡'], ['inventory', '▤'], ['setup', '⚙']
  ];

  App.go = function (page) {
    App.state.page = page;
    App.state.apptId = null;
    render();
  };
  App.setLang = function (l) { App.state.lang = l; render(); };

  function unreadCount() {
    return 12; // dari desain — badge inbox
  }

  function renderShell() {
    const user = S.currentUser();
    const L = App.state.lang;
    $('navList').innerHTML = NAV.filter(function (n) { return user.pages.indexOf(n[0]) !== -1; }).map(function (n) {
      return '<button class="nav-item' + (App.state.page === n[0] ? ' on' : '') + '" onclick="App.go(\'' + n[0] + '\')">' +
        '<span class="ic">' + n[1] + '</span><span>' + I18N.t('nav', n[0], L) + '</span>' +
        (n[0] === 'messages' ? '<span class="badge">' + unreadCount() + '</span>' : '') + '</button>';
    }).join('');
    $('sideUser').innerHTML =
      '<div class="av" style="background:' + user.bg + ';color:' + user.fg + '">' + user.initials + '</div>' +
      '<div style="flex:1;min-width:0"><b>' + esc(user.name) + '</b><small>' + esc(user.role) + '</small></div>' +
      '<button class="out" onclick="App.logout()" title="' + I18N.t('common', 'logout', L) + '">⎋</button>';

    const titleKey = I18N.t('titles', App.state.page, L);
    $('pageTitle').textContent = App.state.page === 'dashboard'
      ? titleKey + ', ' + user.name.split(' ')[0].replace('Dr.', 'Dr') + ' 👋' : titleKey;
    $('pageDate').textContent = new Date().toLocaleDateString(L === 'FR' ? 'fr-CA' : 'en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) +
      ' · ' + new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' EDT';

    $('langSwitch').innerHTML = ['EN', 'FR', 'ᐃᓄᒃᑎᑐᑦ'].map(function (l, i) {
      const code = ['EN', 'FR', 'IU'][i];
      return '<span class="' + (App.state.lang === code ? 'on' : '') + '" onclick="App.setLang(\'' + code + '\')">' + l + '</span>';
    }).join('');

    const w = W.current;
    $('weatherChip').innerHTML = w.temp + '° <span class="sub">/ ' + w.feels + '° wind chill' + (w.ok ? '' : ' · offline data') + '</span>';

    $('stormBanner').innerHTML = W.storm
      ? '<div class="storm-banner"><b>⚠ BLIZZARD WARNING</b><span class="txt">Environment Canada · winds ' + Math.max(w.wind, 90) + ' km/h, visibility near zero from 13:00. ' + riskAppts().length + ' afternoon patients flagged.</span><span class="act" onclick="App.openBulk(false)">Review reschedules →</span></div>'
      : '';
  }

  /* ================= HELPERS ================= */
  function riskAppts() {
    return S.appointmentsOn(new Date()).filter(function (a) { return a.status === 'risk'; });
  }
  function chipClass(status) {
    return { confirmed: 'green', unconfirmed: 'amber', risk: 'red', done: 'grey', cancelled: 'grey' }[status] || 'blue';
  }
  function chipLabel(a) {
    return a.status === 'risk' ? '⚠ WEATHER RISK' : a.status.toUpperCase();
  }
  function barColor(status) {
    return status === 'risk' ? '#8c2f2f' : status === 'unconfirmed' ? '#c9a227' : '#3b4a6b';
  }
  function toast(msg) {
    $('toastRoot').innerHTML = '<div class="toast">' + esc(msg) + '</div>';
    clearTimeout(App._tt);
    App._tt = setTimeout(function () { $('toastRoot').innerHTML = ''; }, 2600);
  }
  App.toast = toast;

  /* ================= DASHBOARD ================= */
  function pageDashboard() {
    const todays = S.appointmentsOn(new Date());
    const risk = riskAppts();
    const L = App.state.lang;
    const sched = todays.map(function (a) {
      return '<div class="appt-row' + (a.status === 'risk' ? ' risk' : '') + '" onclick="App.openAppt(\'' + a.id + '\')">' +
        '<span class="t">' + a.time + '</span><div class="bar" style="background:' + barColor(a.status) + '"></div>' +
        '<div class="who"><b>' + esc(a.patient) + ' · ' + esc(a.proc) + '</b><small>' + esc(a.provider) + ' · ' + a.op + ' · ' + a.dur + ' min · ' + esc(a.billing) + '</small></div>' +
        '<span class="chip ' + chipClass(a.status) + '">' + chipLabel(a) + '</span></div>';
    }).join('');

    return '' +
      '<div class="cards">' +
      '<div class="kpi" onclick="App.go(\'calendar\')"><div class="lbl">TODAY\'S APPOINTMENTS</div><div class="val">' + todays.length + '</div><div class="sub">2 walk-ins expected</div></div>' +
      '<div class="kpi" onclick="App.openBulk(false)"><div class="lbl">AT-RISK (WEATHER)</div><div class="val" style="color:var(--red)">' + risk.length + '</div><div class="sub">after 13:00 · reschedule?</div></div>' +
      '<div class="kpi" onclick="App.go(\'messages\')"><div class="lbl">UNREAD MESSAGES</div><div class="val">12</div><div class="sub">5 WA · 4 SMS · 3 email</div></div>' +
      '<div class="kpi" onclick="App.go(\'sila\')"><div class="lbl">HANDLED BY SILA</div><div class="val" style="color:var(--navy)">31</div><div class="sub">calls + chats since 07:00</div></div>' +
      '</div>' +
      '<div class="grid-2">' +
      '<div class="card"><div class="card-h"><b>' + I18N.t('common', 'todaysSchedule', L) + '</b><span class="lnk" onclick="App.go(\'calendar\')">' + I18N.t('common', 'openCalendar', L) + '</span></div>' + (sched || '<div class="empty-note">No appointments today.</div>') + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:14px">' +
      '<div class="card"><div class="card-h"><div style="width:24px;height:24px;border-radius:99px;background:linear-gradient(135deg,#3b4a6b,#7e93c4);color:#fff;display:grid;place-items:center;font-size:11px">✦</div><b>' + I18N.t('common', 'silaSuggests', L) + '</b></div>' +
      '<div style="display:flex;flex-direction:column;gap:10px">' +
      (W.storm ? '<div class="suggest">Blizzard hits ~13:00. I can message the ' + risk.length + ' afternoon patients now and offer Thursday slots.<div class="acts"><button class="btn primary" onclick="App.openBulk(false)">Send bulk (' + risk.length + ')</button><button class="btn ghost" onclick="App.go(\'messages\')">Review each</button></div></div>' : '') +
      '<div class="suggest">Nitrile gloves (M) below reorder point — 3 boxes left. <span class="lnk" onclick="App.go(\'inventory\')">Open inventory →</span></div>' +
      '<div class="suggest">D. Okalik is on warfarin — remind Dr. Carter to check latest INR before the 13:30 extraction. <span class="lnk" onclick="App.openChart(\'p4\')">Open chart →</span></div>' +
      '</div></div>' +
      '<div class="card"><div class="card-h"><b>' + I18N.t('common', 'channelSummaries', L) + '</b><span class="lnk" onclick="App.go(\'messages\')">' + I18N.t('common', 'inbox', L) + '</span></div>' +
      '<div class="chan-row"><span class="tag">CALL</span><span>Elisapee A. — asks to move Wed cleaning; Sila offered Fri 10:00, awaiting reply.</span></div>' +
      '<div class="chan-row"><span class="tag">WA</span><span>Josie Q. — photo of chipped tooth; triaged non-urgent, slotted 11:15 today.</span></div>' +
      '<div class="chan-row"><span class="tag">EMAIL</span><span>NIHB predetermination approved for A. Kilabuk crown.</span></div>' +
      '<div class="chan-row"><span class="tag">CHAT</span><span>New-patient inquiry: family of 4 moving from Ottawa in Aug. Intake forms sent.</span></div>' +
      '</div></div></div>';
  }

  App.openAppt = function (id) {
    App.state.apptId = id;
    App.state.page = 'calendar';
    render();
  };
  App.openChart = function (pid) {
    App.state.pid = pid; App.state.ptab = 'overview'; App.state.page = 'patients';
    render();
  };

  /* ================= CALENDAR ================= */
  function calDate() {
    const d = new Date();
    d.setDate(d.getDate() + App.state.calOffset);
    return d;
  }
  App.calNav = function (dir) { App.state.calOffset += dir * (App.state.calView === 'day' ? 1 : 7); App.state.apptId = null; render(); };
  App.calSetView = function (v) { App.state.calView = v; render(); };

  function pageCalendar() {
    const view = App.state.calView;
    const date = calDate();
    const dayAppts = S.appointmentsOn(date);
    let body;

    if (view === 'day') {
      body = '<div class="op-grid">' + S.ops.map(function (op) {
        const list = dayAppts.filter(function (a) { return a.op === op.id; });
        return '<div class="op-col"><h4>' + op.title + '</h4><div class="stack">' +
          (list.map(function (a) {
            return '<div class="appt-card ' + a.status + (App.state.apptId === a.id ? ' sel' : '') + '" onclick="App.selAppt(\'' + a.id + '\')">' +
              '<div class="top"><span>' + a.time + ' · ' + a.dur + 'm</span><span style="font-weight:700">' + (a.status === 'risk' ? '⚠' : '') + '</span></div>' +
              '<b>' + esc(a.patient) + '</b><div class="proc">' + esc(a.proc) + '</div></div>';
          }).join('') || '<div class="empty-note">No appointments</div>') +
          '</div></div>';
      }).join('') + '</div>';
    } else if (view === 'week') {
      const start = new Date(date);
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday
      let cols = '';
      for (let i = 0; i < 6; i++) {
        const d = new Date(start); d.setDate(d.getDate() + i);
        const list = S.appointmentsOn(d);
        const isToday = d.toDateString() === new Date().toDateString();
        cols += '<div class="op-col"><h4 style="' + (isToday ? 'color:var(--navy)' : '') + '">' + d.toLocaleDateString('en-CA', { weekday: 'short', day: 'numeric' }).toUpperCase() + '</h4><div class="stack">' +
          (S.clinic.hours[d.getDay()] ?
            (list.map(function (a) {
              return '<div class="appt-card ' + a.status + '" onclick="App.selAppt(\'' + a.id + '\')"><div class="top"><span>' + a.time + '</span></div><b>' + esc(a.patient) + '</b><div class="proc">' + esc(a.proc) + '</div></div>';
            }).join('') || '<div class="empty-note">Free</div>')
            : '<div class="empty-note">Closed</div>') +
          '</div></div>';
      }
      body = '<div class="op-grid" style="grid-template-columns:repeat(6,1fr)">' + cols + '</div>';
    } else {
      // month: hitungan janji per hari
      const y = date.getFullYear(), m = date.getMonth();
      const first = new Date(y, m, 1);
      const startDow = (first.getDay() + 6) % 7;
      const days = new Date(y, m + 1, 0).getDate();
      let cells = '';
      for (let i = 0; i < startDow; i++) cells += '<div></div>';
      for (let dd = 1; dd <= days; dd++) {
        const d = new Date(y, m, dd);
        const n = S.appointmentsOn(d).length;
        const isToday = d.toDateString() === new Date().toDateString();
        cells += '<div style="border:1px solid var(--line-soft);border-radius:8px;min-height:64px;padding:6px;font-size:11px;' + (isToday ? 'outline:2px solid var(--navy)' : '') + '">' +
          '<div style="color:var(--mut);font-weight:700">' + dd + '</div>' +
          (n ? '<div class="chip blue" style="margin-top:5px">' + n + ' appt' + (n > 1 ? 's' : '') + '</div>' : '') + '</div>';
      }
      body = '<div style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px">' +
        '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;font-size:10.5px;font-weight:700;color:var(--mut);margin-bottom:6px"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span></div>' +
        '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">' + cells + '</div></div>';
    }

    const a = S.appointments().find(function (x) { return x.id === App.state.apptId; });
    const drawer = a ? renderApptDrawer(a) : '';

    return '<div class="cal-wrap"><div class="cal-main">' +
      '<div class="cal-controls">' +
      '<div class="seg">' + ['day', 'week', 'month'].map(function (v) { return '<span class="' + (view === v ? 'on' : '') + '" onclick="App.calSetView(\'' + v + '\')">' + v[0].toUpperCase() + v.slice(1) + '</span>'; }).join('') + '</div>' +
      '<div class="cal-nav"><span class="pg" onclick="App.calNav(-1)">‹</span> ' + date.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }) + ' <span class="pg" onclick="App.calNav(1)">›</span></div>' +
      '<span class="cal-meta">' + dayAppts.length + ' appointments · 3 operatories</span>' +
      '<button class="btn primary lg" style="margin-left:auto" onclick="App.newApptModal()">+ New appointment</button>' +
      '</div>' + body + '</div>' + drawer + '</div>';
  }

  App.selAppt = function (id) { App.state.apptId = App.state.apptId === id ? null : id; render(); };
  App.closeAppt = function () { App.state.apptId = null; render(); };

  function renderApptDrawer(a) {
    return '<div class="drawer">' +
      '<div class="head"><b>Appointment</b><button class="x" onclick="App.closeAppt()">✕</button></div>' +
      '<h2>' + esc(a.patient) + '</h2><div class="proc">' + esc(a.proc) + '</div>' +
      '<div class="fact-grid">' +
      '<div class="fact"><div class="k">TIME</div><div class="v">' + a.time + ' · ' + a.dur + ' min</div></div>' +
      '<div class="fact"><div class="k">PROVIDER</div><div class="v">' + esc(a.provider) + '</div></div>' +
      '<div class="fact"><div class="k">OPERATORY</div><div class="v">' + a.op + '</div></div>' +
      '<div class="fact"><div class="k">BILLING</div><div class="v">' + esc(a.billing) + '</div></div>' +
      '</div>' +
      (a.alert ? '<div class="alert-box">' + esc(a.alert) + '</div>' : '') +
      '<div class="sila-note">✦ ' + esc(a.sila || 'Reminders scheduled in patient\'s preferred language.') + '</div>' +
      '<div class="acts">' +
      '<button class="btn block" onclick="App.openChart(\'' + a.pid + '\')">Open patient chart</button>' +
      '<div class="row">' +
      '<button class="btn ghost" onclick="App.toast(\'Reminder sent to ' + esc(a.patient) + ' via preferred channel\')">Send reminder</button>' +
      '<button class="btn ghost" onclick="App.toast(\'Reschedule options sent to ' + esc(a.patient) + '\')">Reschedule</button>' +
      '</div></div></div>';
  }

  /* --- new appointment modal --- */
  App.newApptModal = function () {
    const pts = S.patients().slice(0, 40);
    $('modalRoot').innerHTML = '<div class="modal-back" onclick="App.closeModal(event)"><div class="modal" onclick="event.stopPropagation()">' +
      '<div class="head"><b>New appointment</b><button class="x" onclick="App.closeModal()">✕</button></div>' +
      '<div class="sub">Booked manually by front desk — Sila will schedule reminders automatically.</div>' +
      '<div class="field" style="margin-top:14px"><div class="k">PATIENT</div><select id="naPatient" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:9px 12px;font-size:12.5px">' +
      pts.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><div class="k">SERVICE</div><select id="naService" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:9px 12px;font-size:12.5px">' +
      S.services.map(function (s) { return '<option value="' + s.id + '">' + esc(s.name) + ' (' + s.duration + ' min)</option>'; }).join('') + '</select></div>' +
      '<div class="field"><div class="k">NEXT FREE SLOTS</div><div id="naSlots"></div></div>' +
      '</div></div>';
    App.refreshNaSlots();
    $('naService').addEventListener('change', App.refreshNaSlots);
  };
  App.refreshNaSlots = function () {
    const svcId = $('naService').value;
    const slots = S.freeSlots(svcId, { limit: 6 });
    $('naSlots').innerHTML = slots.map(function (s, i) {
      return '<button class="btn ghost" style="margin:4px 6px 0 0" onclick="App.createAppt(\'' + svcId + '\',\'' + s.start + '\',\'' + s.op + '\',\'' + esc(s.provider) + '\')">' + S.fmtSlot(s) + ' · ' + esc(s.provider) + '</button>';
    }).join('') || '<div class="empty-note">No free slots in the next 10 days.</div>';
  };
  App.createAppt = function (svcId, start, op, provider) {
    const p = S.patientById($('naPatient').value);
    const svc = S.services.find(function (s) { return s.id === svcId; });
    S.addAppointment({
      time: S.fmtTime(start), dur: svc.duration, patient: p.name, pid: p.id,
      proc: svc.name, provider: provider, op: op, billing: p.insurance,
      status: 'confirmed', start: start, sila: 'Booked by ' + (S.currentUser() || {}).name + '. Reminders scheduled 48h & 2h.'
    });
    App.closeModal();
    toast('Appointment booked — ' + p.name + ', ' + S.fmtSlot({ start: start }));
    render();
  };

  /* ================= PATIENTS ================= */
  function pagePatients() {
    const q = App.state.ptQuery.toLowerCase();
    const pts = S.patients().filter(function (p) {
      return !q || p.name.toLowerCase().indexOf(q) !== -1 || (p.phone || '').indexOf(q) !== -1 || (p.insurance || '').toLowerCase().indexOf(q) !== -1;
    });
    const sel = S.patientById(App.state.pid) || pts[0] || S.patients()[0];
    if (sel && sel.id !== App.state.pid) App.state.pid = sel.id;

    const list = '<div class="pt-list">' +
      '<div class="search"><input id="ptSearch" placeholder="Search 1,482 patients…" value="' + esc(App.state.ptQuery) + '" oninput="App.ptSearch(this.value)"><button class="add" onclick="App.newPatientModal()">+</button></div>' +
      '<div class="pt-rows">' + pts.map(function (p) {
        return '<div class="pt-row' + (p.id === App.state.pid ? ' sel' : '') + '" onclick="App.selPatient(\'' + p.id + '\')">' +
          '<div class="av">' + S.initials(p.name) + '</div>' +
          '<div style="flex:1;min-width:0"><b>' + esc(p.name) + (p.isNew ? ' <span class="chip blue" style="font-size:9px">NEW</span>' : '') + '</b><small>' + esc((p.dob || '').split('(')[0].trim()) + ' · ' + esc(p.insurance) + '</small></div>' +
          (p.dot ? '<span class="dot"></span>' : '') + '</div>';
      }).join('') + '</div></div>';

    return '<div class="pt-wrap">' + list + '<div class="pt-detail"><div class="card" style="padding:18px 20px">' + renderPatientDetail(sel) + '</div></div></div>';
  }

  App.ptSearch = function (v) {
    App.state.ptQuery = v;
    // hanya render ulang list agar fokus input tidak hilang
    const scroll = document.querySelector('.pt-rows') ? document.querySelector('.pt-rows').scrollTop : 0;
    render();
    const inp = $('ptSearch');
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    if (document.querySelector('.pt-rows')) document.querySelector('.pt-rows').scrollTop = scroll;
  };
  App.selPatient = function (id) { App.state.pid = id; App.state.ptab = 'overview'; App.state.rec = false; App.state.noteImgs = []; render(); };
  App.setPtab = function (t) { App.state.ptab = t; render(); };

  function renderPatientDetail(p) {
    if (!p) return '<div class="empty-note">No patient selected.</div>';
    const user = S.currentUser();
    const flags = (p.flags || []).map(function (f) { return '<span class="chip ' + f[1] + '">' + esc(f[0]) + '</span>'; }).join('');
    const tabs = [['overview', 'Overview'], ['record', 'Clinical record'], ['rx', 'Prescriptions'], ['visits', 'Visits']].map(function (t) {
      return '<span class="' + (App.state.ptab === t[0] ? 'on' : '') + '" onclick="App.setPtab(\'' + t[0] + '\')">' + t[1] + '</span>';
    }).join('');

    let tab = '';
    if (App.state.ptab === 'overview') {
      tab = '<div class="ov-grid">' +
        '<div class="ov-box"><div class="k">CONTACT</div><div class="v">' + esc(p.phone) + ' · prefers ' + esc(p.channel) + '<br>' + esc(p.email) + '<br>' + esc(p.address) + '</div></div>' +
        '<div class="ov-box"><div class="k">MEDICAL SNAPSHOT</div><div class="v">Allergies: <b class="red">' + esc(p.allergies) + '</b><br>Conditions: ' + esc(p.conditions) + '<br>Medications: ' + esc(p.meds) + '</div></div>' +
        '<div class="ov-box"><div class="k">NEXT / LAST VISIT</div><div class="v">Next: ' + esc(nextVisit(p)) + '<br>Last: ' + esc(p.last) + '<br>Recall due: ' + esc(p.recall) + '</div></div>' +
        '<div class="ov-box"><div class="k">BILLING</div><div class="v">Coverage: ' + esc(p.insurance) + '<br>Balance: <b>' + esc(p.balance) + '</b><br>' + esc(p.billingNote) + '</div></div>' +
        '</div>';
    } else if (App.state.ptab === 'record') {
      const canWrite = /Dentist|assistant|Receptionist|Admin|Owner/i.test(user.role);
      const recs = S.recordsFor(p.id).map(function (r) {
        const typeCls = r.type === 'Voice' ? 'voice' : r.type === 'AI' ? 'ai' : 'typed';
        const typeLbl = r.type === 'Voice' ? '🎙 VOICE' : r.type === 'AI' ? '✦ SILA' : '⌨ TYPED';
        return '<div class="rec-item"><div class="meta"><b>' + esc(r.author) + '</b><span>' + esc(r.role) + '</span><span>· ' + esc(r.date) + '</span><span class="type ' + typeCls + '">' + typeLbl + '</span></div>' +
          '<div class="body">' + esc(r.note) + '</div>' +
          (r.imgData ? '<img class="real" src="' + r.imgData + '" alt="attachment">' : (r.img ? '<div class="img-ph">' + esc(r.img) + '</div>' : '')) +
          '</div>';
      }).join('');
      tab = (canWrite ?
        '<div class="note-box"><div class="head"><b>New clinical note</b><small>as ' + esc(user.name) + ' (' + esc(user.role) + ')</small>' +
        '<div class="acts"><button class="pill-btn' + (App.state.rec ? ' rec' : '') + '" onclick="App.toggleRec()">' + (App.state.rec ? '■ Stop dictation' : '🎙 Dictate') + '</button>' +
        '<button class="pill-btn" onclick="document.getElementById(\'noteImg\').click()">📎 Add image</button>' +
        '<input type="file" id="noteImg" accept="image/*" class="hide" onchange="App.attachImg(this)"></div></div>' +
        (App.state.rec ? '<div class="dictation"><span class="dot"></span><span class="txt" id="dictLive">' + esc(App.state.dictText || '"…listening — speak your note…"') + '</span><span class="t" id="dictTime">00:00</span></div>' : '') +
        '<div class="note-img-preview">' + App.state.noteImgs.map(function (d) { return '<img src="' + d + '">'; }).join('') + '</div>' +
        '<textarea id="noteText" placeholder="Type, or dictate with the mic — Sila structures it into tooth / procedure / materials automatically."></textarea>' +
        '<div class="foot"><button class="btn primary lg" style="margin-left:auto" onclick="App.saveNote()">Save to record</button></div></div>'
        : '<div class="suggest" style="margin-top:16px">Your role (' + esc(user.role) + ') has read-only access to clinical records.</div>') +
        '<div class="rec-list">' + (recs || '<div class="empty-note">No records yet.</div>') + '</div>';
    } else if (App.state.ptab === 'rx') {
      const rx = (p.rx || []).map(function (x, i) {
        const key = p.id + i;
        const sent = S.rxSent(key);
        return '<div class="rx-item"><div class="info"><b>' + esc(x.drug) + '</b><small>' + esc(x.sig) + ' · ' + esc(x.prescriber) + ' · ' + esc(x.date) + '</small></div>' +
          '<div class="dest"><div class="to">' + esc(x.dest) + '</div>' +
          '<button class="rx-send' + (sent ? ' sent' : '') + '" onclick="App.sendRx(\'' + key + '\',\'' + esc(x.dest) + '\')">' + (sent ? '✓ Sent to pharmacy' : 'Send to ' + esc(x.dest.split(' ')[0])) + '</button></div></div>';
      }).join('');
      tab = '<div style="padding-top:4px">' + (rx || '<div class="empty-note" style="padding:16px 0">No prescriptions on file.</div>') +
        '<div class="rx-new">＋ New prescription or referral — sends direct to <b style="color:var(--ink-3)">Northmart Pharmacy</b> (partner) or <b style="color:var(--ink-3)">QGH Pharmacy</b> via secure text / WA / email, so patients don\'t wait.</div></div>';
    } else {
      tab = (p.hist || []).map(function (h) {
        return '<div class="visit-row"><span class="d">' + esc(h.date) + '</span><span class="p">' + esc(h.proc) + '</span><span class="pr">' + esc(h.provider) + '</span><span class="chip ' + (h.status === 'today' ? 'amber' : 'green') + '">' + h.status.toUpperCase() + '</span></div>';
      }).join('') || '<div class="empty-note" style="padding:16px 0">No visit history yet.</div>';
      tab = '<div style="padding-top:8px">' + tab + '</div>';
    }

    return '<div class="pt-head"><div class="av">' + S.initials(p.name) + '</div>' +
      '<div style="flex:1"><h2>' + esc(p.name) + '</h2><div class="demo">' + esc(p.sex) + ' · ' + esc(p.dob) + ' · ' + esc(p.lang) + ' · ' + esc(p.insurance) + '</div></div>' +
      '<div class="acts"><button class="btn ghost lg" onclick="App.msgPatient()">Message</button><button class="btn primary lg" onclick="App.go(\'calendar\')">Book</button></div></div>' +
      '<div class="flags">' + flags + '</div>' +
      '<div class="ptabs">' + tabs + '</div>' + tab;
  }

  function nextVisit(p) {
    const up = S.upcomingFor(p.id)[0];
    return up ? S.fmtSlot({ start: up.start }) + ' · ' + up.proc : (p.next || '—');
  }

  App.msgPatient = function () { App.state.page = 'messages'; App.state.convoId = 'c2'; render(); };

  /* dictation — Web Speech API dengan fallback simulasi */
  App.toggleRec = function () {
    App.state.rec = !App.state.rec;
    if (App.state.rec) startDictation(); else stopDictation();
    render();
  };
  let recTimer = null, recSeconds = 0, recognition = null;
  function startDictation() {
    recSeconds = 0;
    App.state.dictText = '';
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = function (e) {
        let txt = '';
        for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
        App.state.dictText = '"…' + txt + '"';
        const live = $('dictLive'); if (live) live.textContent = App.state.dictText;
        const ta = $('noteText'); if (ta) ta.value = txt;
      };
      try { recognition.start(); } catch (e) {}
    } else {
      // Simulasi (desain): teks dikte contoh mengalir masuk.
      const demo = '…tooth one-four, crown prep completed, two-plane chamfer margin, temporised with acrylic provisional, occlusion verified…';
      let i = 0;
      App._dictSim = setInterval(function () {
        i += 6;
        App.state.dictText = '"' + demo.slice(0, i) + '"';
        const live = $('dictLive'); if (live) live.textContent = App.state.dictText;
        const ta = $('noteText'); if (ta && i <= demo.length) ta.value = demo.slice(0, i);
        if (i >= demo.length) clearInterval(App._dictSim);
      }, 350);
    }
    recTimer = setInterval(function () {
      recSeconds++;
      const t = $('dictTime');
      if (t) t.textContent = '00:' + String(recSeconds).padStart(2, '0');
    }, 1000);
  }
  function stopDictation() {
    if (recognition) { try { recognition.stop(); } catch (e) {} recognition = null; }
    if (App._dictSim) clearInterval(App._dictSim);
    if (recTimer) clearInterval(recTimer);
  }

  App.attachImg = function (input) {
    const f = input.files && input.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      App.state.noteImgs.push(e.target.result);
      render();
    };
    reader.readAsDataURL(f);
  };

  App.saveNote = function () {
    const ta = $('noteText');
    const text = (ta && ta.value.trim()) || App.state.dictText.replace(/^"|"$/g, '');
    if (!text && !App.state.noteImgs.length) { toast('Nothing to save — type or dictate a note first.'); return; }
    const user = S.currentUser();
    const wasRec = App.state.rec;
    stopDictation();
    S.addRecord(App.state.pid, {
      date: 'Today ' + new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }),
      author: user.name, role: user.role,
      type: wasRec ? 'Voice' : 'Typed',
      note: text || '(image attachment)',
      imgData: App.state.noteImgs[0] || null
    });
    App.state.rec = false; App.state.dictText = ''; App.state.noteImgs = [];
    const p = S.patientById(App.state.pid);
    toast('Note saved to ' + (p ? p.name : 'patient') + "'s record");
    render();
  };

  App.sendRx = function (key, dest) {
    if (S.rxSent(key)) return;
    S.markRxSent(key);
    toast('Rx sent to ' + dest + ' — patient notified');
    render();
  };

  App.newPatientModal = function () {
    $('modalRoot').innerHTML = '<div class="modal-back" onclick="App.closeModal(event)"><div class="modal" onclick="event.stopPropagation()">' +
      '<div class="head"><b>New patient</b><button class="x" onclick="App.closeModal()">✕</button></div>' +
      '<div class="sub">Quick registration — full intake form is sent by Sila afterwards.</div>' +
      '<div class="field" style="margin-top:14px"><div class="k">FULL NAME</div><input id="npName" placeholder="e.g. Annie Kilabuk"></div>' +
      '<div class="field-2">' +
      '<div class="field"><div class="k">PHONE</div><input id="npPhone" placeholder="(867) 979-…"></div>' +
      '<div class="field"><div class="k">INSURANCE</div><input id="npIns" placeholder="NIHB / GN plan / …"></div>' +
      '</div>' +
      '<button class="btn primary lg" style="width:100%;margin-top:6px" onclick="App.createPatient()">Register patient</button></div></div>';
  };
  App.createPatient = function () {
    const name = $('npName').value.trim();
    if (!name) { toast('Name is required.'); return; }
    const p = S.addPatient({ name: name, phone: $('npPhone').value.trim(), insurance: $('npIns').value.trim() || 'Not provided' });
    App.closeModal();
    App.state.pid = p.id;
    toast('Patient registered — intake form queued via Sila');
    render();
  };

  App.closeModal = function (ev) {
    if (ev && ev.target !== ev.currentTarget) return;
    $('modalRoot').innerHTML = '';
  };

  /* ================= MESSAGES ================= */
  function pageMessages() {
    const convos = S.conversations();
    const sel = convos.find(function (c) { return c.id === App.state.convoId; }) || convos[0];
    if (sel) App.state.convoId = sel.id;

    const list = '<div class="convo-list"><div class="head"><b>Inbox</b><small>all channels</small>' +
      '<button class="btn primary" style="margin-left:auto" onclick="App.openBulk(false)">Bulk send</button></div>' +
      convos.map(function (c) {
        return '<div class="convo-row' + (c.id === App.state.convoId ? ' sel' : '') + '" onclick="App.selConvo(\'' + c.id + '\')">' +
          '<span class="ch-tag ch-' + c.ch + '">' + c.ch + '</span>' +
          '<div class="cbody"><div class="l1"><b>' + esc(c.name) + '</b><small>' + esc(c.time) + '</small></div><div class="prev">' + esc(c.preview) + '</div></div></div>';
      }).join('') + '</div>';

    const bubbles = (sel.thread || []).map(function (m) {
      return '<div class="bubble-wrap from-' + m.from + '"><div class="bubble">' + esc(m.text) + '</div><div class="bubble-meta">' + esc(m.meta || '') + '</div></div>';
    }).join('');

    const thread = '<div class="thread">' +
      '<div class="head"><div><b>' + esc(sel.name) + '</b><small>' + esc(sel.sub) + '</small></div><span class="sila-badge">✦ Sila summary</span></div>' +
      '<div class="summary">' + esc(sel.summary) + '</div>' +
      '<div class="msgs" id="threadMsgs">' + bubbles + '</div>' +
      '<div class="composer"><input id="replyInput" placeholder="Reply on ' + esc(sel.channelName) + '…">' +
      '<button class="btn ghost lg" style="white-space:nowrap" onclick="App.silaDraft()">✦ Let Sila reply</button>' +
      '<button class="btn primary lg" onclick="App.sendReply()">Send</button></div></div>';

    const autos = '<div class="auto-col">' +
      '<div class="card"><div class="card-h"><b>Automations</b></div>' +
      '<div class="auto-row"><span class="st onn"></span>Appointment reminders — 48h &amp; 2h, patient\'s language</div>' +
      '<div class="auto-row"><span class="st onn"></span>Hygiene recall — 6 months, WA → SMS fallback</div>' +
      '<div class="auto-row"><span class="st onn"></span>Weather watch — auto-flag fly-in patients</div>' +
      '<div class="auto-row"><span class="st off"></span>Post-op check-in — day 1 &amp; 7<span class="offlbl">off</span></div></div>' +
      '<div class="card"><div class="card-h"><b>Emergency broadcast</b></div>' +
      '<div style="font-size:12px;color:var(--ink-2);line-height:1.5">One tap notifies all of today\'s patients + staff (closure, storm, power outage) on every channel.</div>' +
      '<button class="btn danger-ghost lg" style="width:100%;margin-top:10px" onclick="App.openBulk(true)">⚠ Start broadcast</button></div></div>';

    return '<div class="msg-wrap">' + list + thread + autos + '</div>';
  }

  App.selConvo = function (id) { App.state.convoId = id; render(); };
  App.silaDraft = function () {
    const drafts = {
      c1: 'Hi Elisapee — just checking in! The Friday 10:00 slot with Leetia is still on hold for you until 5 PM. Reply YES and it\'s yours. ᖁᔭᓐᓇᒦᒃ!',
      c3: 'Hi Tommy — with the blizzard starting at 1 PM we\'d like to move your 3:30 visit to Thursday 10:00 or Friday 9:00. Reply 1 or 2, or call us — we can also send a taxi voucher.',
      c6: 'Hi Tommy — checking in after this morning\'s emergency visit. Any spreading swelling or fever? If yes, call us right away. Take the clindamycin with food.'
    };
    $('replyInput').value = drafts[App.state.convoId] || 'Thanks for your message! Sila here — a team member will confirm shortly. Meanwhile, is there anything else I can help with?';
    toast('Sila drafted a reply — review & send');
  };
  App.sendReply = function () {
    const inp = $('replyInput');
    const txt = inp.value.trim();
    if (!txt) return;
    const convos = S.conversations();
    const sel = convos.find(function (c) { return c.id === App.state.convoId; });
    const user = S.currentUser();
    sel.thread.push({ from: 's', text: txt, meta: user.name + ' · manual · ' + new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }) });
    inp.value = '';
    toast('Message sent on ' + sel.channelName);
    render();
  };

  /* --- bulk modal (storm reschedule / emergency broadcast) --- */
  App.openBulk = function (broadcast) {
    App.state.broadcast = !!broadcast;
    const title = broadcast ? 'Emergency broadcast — clinic status' : 'Bulk message — storm reschedule';
    const list = broadcast
      ? S.appointmentsOn(new Date()).map(function (a) { return { name: a.patient, appt: a.time + ' ' + a.proc, ch: 'SMS', lang: 'EN' }; }).concat([{ name: 'All staff (9)', appt: 'internal alert', ch: 'WA', lang: 'EN' }])
      : S.bulkList;
    const draft = broadcast
      ? '"⚠ Aurora Dental: due to the blizzard warning, the clinic closes at 13:00 today. All afternoon appointments will be rescheduled — we\'ll message you options. Stay safe. — Aurora Dental ᓯᓚ"'
      : '"Hi {first name} — a blizzard warning starts at 1 PM today in Iqaluit. For your safety we\'d like to move your {time} visit. Reply 1 for Thu {slot}, 2 for Fri, or call us. — Aurora Dental ᓯᓚ"';
    $('modalRoot').innerHTML = '<div class="modal-back" onclick="App.closeModal(event)"><div class="modal" onclick="event.stopPropagation()">' +
      '<div class="head"><b>' + title + '</b><button class="x" onclick="App.closeModal()">✕</button></div>' +
      '<div class="sub">Sila drafted this in each recipient\'s preferred language &amp; channel. Routine replies send automatically.</div>' +
      '<div id="bulkBody"><div style="margin-top:14px">' +
      list.map(function (b) {
        return '<div class="bulk-row"><span class="cb">✓</span><span class="nm">' + esc(b.name) + ' <span>· ' + esc(b.appt) + '</span></span>' +
          '<span class="ch-tag ch-' + b.ch + '">' + b.ch + '</span><span class="lang">' + esc(b.lang) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="bulk-draft">' + esc(draft) + '</div>' +
      '<div class="bulk-acts"><button class="btn primary" style="flex:1;padding:11px;font-size:13px;font-weight:700;border-radius:9px" onclick="App.sendBulk(' + list.length + ')">Send to ' + list.length + ' recipients</button>' +
      '<button class="btn ghost lg" onclick="App.toast(\'Draft editor — each message can be customised per recipient\')">Edit drafts</button></div></div>' +
      '</div></div>';
  };
  App.sendBulk = function (n) {
    $('bulkBody').innerHTML = '<div class="bulk-done"><div class="ok">✓</div><b>Sent to ' + n + ' recipients</b>' +
      '<div class="sub2">' + (App.state.broadcast ? 'Delivered on every channel · staff acknowledged via WA.' : '2 via WhatsApp, 1 via SMS · replies will appear in the inbox.<br>D. Okalik confirmed Thursday 10:00 already.') + '</div>' +
      '<button class="btn ghost lg" style="margin-top:14px" onclick="App.closeModal()">Done</button></div>';
  };

  /* ================= SILA PAGE ================= */
  let testAgent = null;
  function pageSila() {
    const st = S.silaStats;
    const bars = st.volume.map(function (v, i) {
      const total = v[0] + v[1];
      const pct = Math.round(100 * v[0] / total);
      const h = Math.round(100 * total / 52);
      return '<div class="vol-col"><div class="vol-bar" style="height:' + h + '%;background:linear-gradient(to top,#3b4a6b ' + pct + '%,#c9d2e6 0)"></div><span>' + st.volumeDays[i] + '</span></div>';
    }).join('');
    const insights = st.insights.map(function (x) {
      return '<div class="insight"><b>' + esc(x.bold) + '</b> ' + esc(x.text) + (x.action ? ' <span class="lnk" onclick="App.toast(\'Campaign drafted — review in Messages → Bulk send\')">' + esc(x.action) + '</span>' : '') + '</div>';
    }).join('');

    return '<div class="cards">' +
      '<div class="kpi"><div class="lbl">CONTACTS HANDLED (7D)</div><div class="val">' + st.contacts7d + '</div><div class="sub">' + st.contactsBreakdown + '</div></div>' +
      '<div class="kpi"><div class="lbl">RESOLVED WITHOUT STAFF</div><div class="val" style="color:var(--navy)">' + st.resolvedPct + '%</div><div class="sub">booking, reschedule, FAQ</div></div>' +
      '<div class="kpi"><div class="lbl">BY LANGUAGE</div><div class="val">' + st.byLang + '</div><div class="sub">% EN / FR / ᐃᓄᒃᑎᑐᑦ</div></div>' +
      '<div class="kpi"><div class="lbl">NO-SHOW RATE</div><div class="val" style="color:var(--green)">' + st.noShow + '</div><div class="sub">↓ from ' + st.noShowWas + ' pre-Sila</div></div>' +
      '</div>' +
      '<div class="grid-2">' +
      '<div class="card"><div class="card-h"><b>Insights for Owner &amp; Admin</b></div>' +
      '<div style="font-size:11.5px;color:var(--mut);margin-bottom:2px">Generated from booking, communication and billing data · refreshed nightly</div>' + insights + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:14px">' +
      '<div class="card"><div class="card-h"><b>Contact volume · last 7 days</b></div><div class="vol-chart">' + bars + '</div>' +
      '<div class="legend"><span><span class="sw" style="background:#3b4a6b"></span>Handled by Sila</span><span><span class="sw" style="background:#c9d2e6"></span>Escalated to staff</span></div></div>' +
      '<div class="card"><div class="card-h"><b>Guardrails</b></div><div class="guardrails">Sila never gives clinical advice — medical questions escalate to on-duty clinician.<br>Emergencies (pain 8+/10, trauma, swelling + fever) page the receptionist and Dr. on call instantly.<br>All AI messages are logged and reviewable; routine bulk sends go automatically.</div></div>' +
      '</div></div>' +
      '<div class="card" style="margin-top:14px"><div class="card-h"><b>Test console — talk to Sila</b><span class="mini">exactly what patients experience on the website, WhatsApp &amp; SMS</span></div>' +
      '<div class="test-chat"><div class="msgs" id="testMsgs"></div>' +
      '<div class="composer"><input id="testInput" placeholder="Try: \'book a cleaning\' · \'combien coûte une couronne?\' · \'my cheek is swollen\'" onkeydown="if(event.key===\'Enter\')App.testSend()">' +
      '<button class="btn primary lg" onclick="App.testSend()">Send</button></div></div></div>';
  }

  function testBubble(text, from) {
    const wrap = document.createElement('div');
    wrap.className = 'bubble-wrap from-' + from;
    wrap.innerHTML = '<div class="bubble">' + esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>') + '</div>';
    $('testMsgs').appendChild(wrap);
    $('testMsgs').scrollTop = $('testMsgs').scrollHeight;
  }
  App.testSend = function () {
    const inp = $('testInput');
    const txt = inp.value.trim();
    if (!txt) return;
    inp.value = '';
    if (!testAgent) initTestAgent();
    testBubble(txt, 'p');
    const out = testAgent.reply(txt);
    (out.messages || []).forEach(function (m, i) {
      setTimeout(function () { testBubble(m, 's'); }, 350 * (i + 1));
    });
  };
  function initTestAgent() {
    testAgent = new window.Sila({
      storm: W.storm, weather: W.current,
      onEvent: function (ev) {
        if (ev.type === 'booked') {
          S.logConversation({
            ch: 'CHAT', name: ev.appointment.patient, preview: 'Test console booking — ' + ev.appointment.proc,
            sub: 'Test console · ' + ev.lang + ' · handled by Sila', channelName: 'test console',
            summary: '✦ Booked ' + ev.appointment.proc + ' for ' + ev.appointment.patient + ' via staff test console.',
            thread: testAgent.transcript.slice(-8).map(function (t) { return { from: t[0], text: t[1], meta: t[0] === 's' ? 'Sila ᓯᓚ' : '' }; })
          });
        }
      }
    });
    const g = testAgent.greeting();
    g.messages.forEach(function (m) { testBubble(m, 's'); });
  }

  /* ================= STAFF ================= */
  function pageStaff() {
    const team = S.staff.map(function (s) {
      return '<div class="staff-row"><div class="av" style="background:' + s.bg + ';color:' + s.fg + '">' + (s.name.indexOf('Sila') === 0 ? '✦' : S.initials(s.name)) + '</div>' +
        '<div style="flex:1;min-width:0"><b>' + esc(s.name) + '</b><small>' + esc(s.role) + ' · ' + esc(s.access) + '</small></div>' +
        '<span class="chip ' + (s.on ? 'green' : 'amber') + '">' + esc(s.status) + '</span></div>';
    }).join('');

    const roster = S.roster.map(function (r) {
      return '<div class="who">' + esc(r.who) + '</div>' + r.days.map(function (c) {
        return '<div class="rcell ' + c + '">' + (c === 'h' ? '½' : '') + '</div>';
      }).join('');
    }).join('');

    const timeoff = S.timeoff.map(function (t) {
      const done = S.timeoffDone(t.id);
      return '<div class="to-row"><div class="txt">' + esc(t.who) + ' — ' + esc(t.when) + ', ' + esc(t.reason) + '</div>' +
        (done ? '<span class="chip ' + (done === 'approved' ? 'green' : 'red') + '">' + done.toUpperCase() + '</span>'
          : '<button class="btn ghost" onclick="App.timeoff(\'' + t.id + '\',\'approved\')">Approve</button><button class="btn ghost" onclick="App.timeoff(\'' + t.id + '\',\'declined\')">Decline</button>') +
        '</div>';
    }).join('');

    return '<div class="grid-2" style="margin-top:0">' +
      '<div class="card"><div class="card-h"><b>Team · ' + S.staff.length + ' people</b><button class="btn primary lg" style="margin-left:auto" onclick="App.toast(\'Add employee — name, role, access level, schedule\')">+ Add employee</button></div>' + team + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:14px">' +
      '<div class="card"><div class="card-h"><b>This week\'s roster</b></div>' +
      '<div class="roster-grid"><div></div><div class="dh">MON</div><div class="dh">TUE</div><div class="dh">WED</div><div class="dh">THU</div><div class="dh">FRI</div>' + roster + '</div>' +
      '<div class="legend"><span><span class="sw" style="background:#e9edf6;border:1px solid #c9d2e6"></span>Shift</span><span><span class="sw" style="background:#f7f0dc"></span>Half</span><span><span class="sw" style="background:#f3dede"></span>Off / leave</span></div></div>' +
      '<div class="card"><div class="card-h"><b>Time-off requests</b></div>' + timeoff +
      '<div style="font-size:11.5px;color:var(--mut);line-height:1.5;margin-top:10px">✦ Sila checks the calendar first — no hygiene column conflicts on either date.</div></div>' +
      '</div></div>';
  }
  App.timeoff = function (id, val) {
    S.setTimeoff(id, val);
    toast('Request ' + val + ' — roster updated, Sila notifies the employee');
    render();
  };

  /* ================= INVENTORY ================= */
  function pageInventory() {
    const f = App.state.invFilter;
    const items = S.inventorySeed.filter(function (i) {
      if (f === 'All') return true;
      if (f === 'Clinical') return ['Clinical', 'Sterilization', 'Hygiene', 'Imaging'].indexOf(i.cat) !== -1;
      return i.cat === f;
    });
    const lowCount = S.inventorySeed.filter(function (i) { return i.low && !S.isOrdered(i.id); }).length;
    const rows = items.map(function (i) {
      const ordered = S.isOrdered(i.id);
      return '<span class="cell name">' + esc(i.name) + '</span>' +
        '<span class="cell" style="color:var(--ink-3)">' + esc(i.cat) + '</span>' +
        '<span class="cell ' + (i.low ? 'low' : 'okv') + '">' + esc(i.stock) + '</span>' +
        '<span class="cell" style="color:var(--mut)">' + esc(i.min) + '</span>' +
        '<span class="cell" style="text-align:right">' +
        (ordered ? '<span class="chip green">✓ PO drafted</span>' : i.low ? '<button class="btn primary" onclick="App.orderItem(\'' + i.id + '\')">Reorder</button>' : '<span style="color:#c2c9d6">—</span>') +
        '</span>';
    }).join('');

    return '<div class="cards" style="grid-template-columns:repeat(3,1fr);margin-bottom:14px">' +
      '<div class="kpi"><div class="lbl">ITEMS TRACKED</div><div class="val">312</div><div class="sub">clinical · office · sterilization</div></div>' +
      '<div class="kpi"><div class="lbl">BELOW REORDER POINT</div><div class="val" style="color:var(--red)">' + lowCount + '</div><div class="sub">sealift order cutoff: Jul 24</div></div>' +
      '<div class="kpi"><div class="lbl">INBOUND</div><div class="val">2 POs</div><div class="sub">Canadian North cargo · Wed (weather permitting)</div></div>' +
      '</div>' +
      '<div class="card"><div class="card-h"><b>Stock</b>' +
      '<div class="inv-filters">' + ['All', 'Clinical', 'Office', 'PPE'].map(function (x) { return '<span class="' + (f === x ? 'on' : '') + '" onclick="App.invFilter(\'' + x + '\')">' + x + '</span>'; }).join('') + '</div>' +
      '<input placeholder="Search items…" style="margin-left:auto;border:1px solid var(--line);border-radius:8px;padding:8px 11px;font-size:12px;outline:none;width:200px"></div>' +
      '<div class="inv-table"><span class="hrow">ITEM</span><span class="hrow">CATEGORY</span><span class="hrow">ON HAND</span><span class="hrow">REORDER AT</span><span class="hrow" style="text-align:right">ACTION</span>' + rows + '</div>' +
      '<div class="suggest" style="margin-top:12px">✦ Sila: air freight for the ' + lowCount + ' low items ≈ $310; adding them to the July 24 sealift saves ~$240 but arrives late Aug. Gloves &amp; anesthetic can\'t wait — suggest air for those two only.</div></div>';
  }
  App.invFilter = function (f) { App.state.invFilter = f; render(); };
  App.orderItem = function (id) {
    S.markOrdered(id);
    toast('PO drafted — Arctic Medical Supply, air freight');
    render();
  };

  /* ================= SETUP ================= */
  function pageSetup() {
    const c = S.clinic;
    const locs = c.locations.map(function (l) {
      return '<div class="loc-row"><div class="txt"><b style="color:var(--ink)">' + esc(l.name) + '</b><br><span style="font-size:11.5px;color:var(--mut)">' + esc(l.sub) + '</span></div>' +
        '<span class="chip ' + (l.tone === 'green' ? 'green' : 'amber') + '">' + esc(l.status) + '</span></div>';
    }).join('');
    const hours = c.hoursText.map(function (h) {
      return '<div class="hours-row"><span class="d">' + h[0] + '</span><span' + (h[0] === 'Sunday' ? ' style="color:var(--mut)"' : '') + '>' + h[1] + '</span></div>';
    }).join('');
    const events = c.events.map(function (e) {
      return '<div class="event-row"><span class="d">' + esc(e.date) + '</span><span><b style="color:var(--ink)">' + esc(e.title) + '</b> — ' + esc(e.sub) + '</span></div>';
    }).join('');
    const pharm = c.pharmacies.map(function (p) {
      return '<div class="event-row"><span style="flex:1"><b style="color:var(--ink)">' + esc(p.name) + '</b> — ' + esc(p.sub) + '</span><span class="chip green">' + esc(p.status) + '</span></div>';
    }).join('');

    return '<div class="setup-grid">' +
      '<div style="display:flex;flex-direction:column;gap:14px">' +
      '<div class="card"><div class="card-h"><b>Clinic profile</b></div>' +
      '<div class="field"><div class="k">CLINIC NAME</div><input value="' + esc(c.name) + '"></div>' +
      '<div class="field"><div class="k">ADDRESS</div><input value="' + esc(c.address) + '"></div>' +
      '<div class="field-2"><div class="field"><div class="k">PHONE</div><input value="' + esc(c.phone) + '"></div>' +
      '<div class="field"><div class="k">EMAIL</div><input value="' + esc(c.email) + '"></div></div>' +
      '<div class="field"><div class="k">LANGUAGES SERVED</div><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip blue" style="padding:5px 12px">English ✓</span><span class="chip blue" style="padding:5px 12px">Français ✓</span><span class="chip blue" style="padding:5px 12px">ᐃᓄᒃᑎᑐᑦ ✓</span></div></div></div>' +
      '<div class="card"><div class="card-h"><b>Locations</b></div>' + locs + '<div class="loc-add">＋ Add branch</div></div>' +
      '<div class="card"><div class="card-h"><b>Demo controls</b></div>' +
      '<div class="switch-row" style="border-top:0"><div><b>❄️ Storm scenario</b><br><small style="color:var(--mut)">Blizzard banner + weather-risk flags (for demos)</small></div>' +
      '<label class="switch"><input type="checkbox" ' + (W.storm ? 'checked' : '') + ' onchange="App.setStorm(this.checked)"><span class="sl"></span></label></div>' +
      '<div class="switch-row"><div><b>Reset demo data</b><br><small style="color:var(--mut)">Clears bookings, notes &amp; patients created in this browser</small></div>' +
      '<button class="btn danger-ghost lg" onclick="App.resetDemo()">Reset</button></div></div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:14px">' +
      '<div class="card"><div class="card-h"><b>Working hours</b></div>' + hours +
      '<div class="suggest" style="margin-top:12px">After hours, Sila books, triages emergencies to the on-call dentist, and updates patients during storm closures — in all three languages.</div></div>' +
      '<div class="card"><div class="card-h"><b>Events &amp; closures</b></div>' + events + '<div class="loc-add">＋ Add event — Sila announces it on booking channels</div></div>' +
      '<div class="card"><div class="card-h"><b>Partner pharmacies</b></div>' + pharm + '</div>' +
      '</div></div>';
  }
  App.setStorm = function (on) {
    W.setStormDemo(on);
    toast(on ? 'Storm scenario ON — banner & risk flags active' : 'Storm scenario OFF');
    render();
  };
  App.resetDemo = function () {
    if (confirm('Reset all demo bookings, notes and patients created in this browser?')) {
      S.reset();
      location.reload();
    }
  };

  /* ================= RENDER ================= */
  const PAGES = {
    dashboard: pageDashboard, calendar: pageCalendar, patients: pagePatients,
    messages: pageMessages, sila: pageSila, staff: pageStaff,
    inventory: pageInventory, setup: pageSetup
  };

  function render() {
    const user = S.currentUser();
    if (!user) return;
    if (user.pages.indexOf(App.state.page) === -1) App.state.page = user.pages[0];
    renderShell();
    $('page').innerHTML = PAGES[App.state.page]();
    if (App.state.page === 'sila') { testAgent = null; initTestAgent(); }
  }
  App.render = render;

  /* ================= INIT ================= */
  $('signInBtn').addEventListener('click', App.signIn);
  $('passInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') App.signIn(); });
  renderLogin();
  W.load(function () { if (S.currentUser()) renderShell(); });
  if (S.currentUser()) enterApp();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
