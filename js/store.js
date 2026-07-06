/* Aurora Dental Iqaluit — data store
   Seed + overlay localStorage: booking/pencatatan demo persist antar-reload. */

(function (global) {
  'use strict';

  const LS_KEY = 'aurora_iqaluit_db_v1';
  const seed = global.AURORA_SEED;

  function blankOverlay() {
    return { appointments: [], patients: [], conversations: [], records: {}, rxSent: {}, ordered: {}, timeoffDone: {}, cancelled: [] };
  }
  function loadOverlay() {
    try { return Object.assign(blankOverlay(), JSON.parse(localStorage.getItem(LS_KEY)) || {}); }
    catch (e) { return blankOverlay(); }
  }
  let ov = loadOverlay();
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(ov)); } catch (e) {} }

  const Store = {
    clinic: seed.clinic,
    staff: seed.staff,
    roles: seed.roles,
    roster: seed.roster,
    timeoff: seed.timeoff,
    services: seed.services,
    ops: seed.ops,
    inventorySeed: seed.inventory,
    silaStats: seed.silaStats,
    bulkList: seed.bulkList,

    reset: function () { ov = blankOverlay(); save(); },

    /* ---- session (multi-user login) ---- */
    login: function (roleId) {
      const r = seed.roles.find(function (x) { return x.id === roleId; });
      if (r) sessionStorage.setItem('aurora_user', JSON.stringify(r));
      return r;
    },
    logout: function () { sessionStorage.removeItem('aurora_user'); },
    currentUser: function () {
      try { return JSON.parse(sessionStorage.getItem('aurora_user')); } catch (e) { return null; }
    },

    /* ---- patients ---- */
    patients: function () { return seed.patients.concat(ov.patients); },
    patientById: function (id) { return this.patients().find(function (p) { return p.id === id; }) || null; },
    findPatient: function (query) {
      const q = String(query || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!q) return null;
      return this.patients().find(function (p) {
        const name = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const digits = q.replace(/[^0-9]/g, '');
        return name.indexOf(q) !== -1 || (digits.length >= 7 && p.phone.replace(/[^0-9]/g, '').indexOf(digits) !== -1);
      }) || null;
    },
    addPatient: function (data) {
      const p = Object.assign({
        id: 'pn' + Date.now().toString(36),
        name: '', dob: '—', sex: '—', lang: 'English', langCode: 'EN',
        insurance: 'Not provided', phone: '', channel: 'SMS', email: '—',
        address: 'Iqaluit', allergies: 'Not asked', conditions: '—', meds: '—',
        next: '—', last: '— New patient', recall: '—', balance: '$0.00',
        billingNote: 'Registered by Sila ᓯᓚ', dot: false, isNew: true,
        flags: [['New patient', 'blue']], records: [], rx: [], hist: []
      }, data);
      ov.patients.push(p); save();
      return p;
    },

    /* ---- clinical records (per patient) ---- */
    recordsFor: function (pid) {
      const extra = ov.records[pid] || [];
      const p = this.patientById(pid);
      return extra.concat((p && p.records) || []);
    },
    addRecord: function (pid, rec) {
      if (!ov.records[pid]) ov.records[pid] = [];
      ov.records[pid].unshift(rec); save();
    },

    /* ---- rx / inventory / timeoff state ---- */
    rxSent: function (key) { return !!ov.rxSent[key]; },
    markRxSent: function (key) { ov.rxSent[key] = true; save(); },
    isOrdered: function (id) { return !!ov.ordered[id]; },
    markOrdered: function (id) { ov.ordered[id] = true; save(); },
    timeoffDone: function (id) { return ov.timeoffDone[id] || null; },
    setTimeoff: function (id, val) { ov.timeoffDone[id] = val; save(); },

    /* ---- appointments ---- */
    appointments: function () {
      const cancelled = ov.cancelled;
      return seed.appointments.concat(ov.appointments).map(function (a) {
        return cancelled.indexOf(a.id) !== -1 ? Object.assign({}, a, { status: 'cancelled' }) : a;
      });
    },
    appointmentsOn: function (date) {
      const y = date.getFullYear(), m = date.getMonth(), day = date.getDate();
      return this.appointments().filter(function (a) {
        const t = new Date(a.start);
        return t.getFullYear() === y && t.getMonth() === m && t.getDate() === day && a.status !== 'cancelled';
      }).sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    },
    upcomingFor: function (pid) {
      const nowT = Date.now();
      return this.appointments().filter(function (a) {
        return a.pid === pid && new Date(a.start).getTime() > nowT && a.status !== 'cancelled' && a.status !== 'done';
      }).sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    },
    addAppointment: function (a) {
      a.id = 'an' + Date.now().toString(36);
      ov.appointments.push(a); save();
      return a;
    },
    cancelAppointment: function (id) {
      if (ov.cancelled.indexOf(id) === -1) { ov.cancelled.push(id); save(); }
    },

    /* ---- conversations ---- */
    conversations: function () {
      return ov.conversations.concat(seed.conversations);
    },
    logConversation: function (c) {
      c.id = 'cn' + Date.now().toString(36);
      c.at = new Date().toISOString();
      c.time = new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false });
      ov.conversations.unshift(c); save();
      return c;
    },

    /* ---- holidays (Nunavut) ---- */
    isHoliday: function (date) {
      const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
      return (this.clinic.holidays || []).find(function (h) { return h.date === key; }) || null;
    },
    nextHoliday: function (withinDays) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const limit = today.getTime() + (withinDays || 14) * 86400000;
      return (this.clinic.holidays || []).find(function (h) {
        const t = new Date(h.date + 'T12:00:00').getTime();
        return t >= today.getTime() && t <= limit;
      }) || null;
    },

    /* ---- availability engine ---- */
    opBusy: function (opId, start, duration) {
      const s = start.getTime(), e = s + duration * 60000;
      return this.appointments().some(function (a) {
        if (a.op !== opId || a.status === 'cancelled') return false;
        const as = new Date(a.start).getTime();
        const ae = as + a.dur * 60000;
        return s < ae && e > as;
      });
    },
    freeSlots: function (serviceId, opts) {
      opts = opts || {};
      const svc = this.services.find(function (s) { return s.id === serviceId; }) || this.services[0];
      const slots = [];
      const limit = opts.limit || 12;
      const minLead = Date.now() + 60 * 60 * 1000;
      for (let dOff = 0; dOff < (opts.maxDays || 10) && slots.length < limit; dOff++) {
        const date = new Date(); date.setDate(date.getDate() + dOff);
        const hrs = this.clinic.hours[date.getDay()];
        if (!hrs) continue;
        if (this.isHoliday(date)) continue; // libur Nunavut — klinik tutup
        // Sabtu hanya hygiene
        if (date.getDay() === 6 && svc.ops.indexOf('Op 3') === -1) continue;
        for (let mins = hrs.open; mins + svc.duration <= hrs.close && slots.length < limit; mins += 30) {
          const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, mins);
          if (start.getTime() < minLead) continue;
          for (let oi = 0; oi < svc.ops.length; oi++) {
            if (!this.opBusy(svc.ops[oi], start, svc.duration)) {
              const op = this.ops.find(function (o) { return o.id === svc.ops[oi]; });
              slots.push({ start: start.toISOString(), op: op.id, provider: op.provider, serviceId: svc.id });
              break;
            }
          }
        }
      }
      return slots;
    },

    /* ---- formatting ---- */
    fmtDay: function (iso) {
      const t = new Date(iso);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const that = new Date(t); that.setHours(0, 0, 0, 0);
      const diff = Math.round((that - today) / 86400000);
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Tomorrow';
      return t.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
    },
    fmtTime: function (iso) {
      return new Date(iso).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false });
    },
    fmtSlot: function (slot) { return this.fmtDay(slot.start) + ' ' + this.fmtTime(slot.start); },
    initials: function (n) {
      return n.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('');
    }
  };

  global.AuroraStore = Store;
})(typeof window !== 'undefined' ? window : globalThis);
