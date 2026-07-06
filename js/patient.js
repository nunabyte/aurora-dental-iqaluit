/* Aurora Dental Iqaluit — patient site + Sila chat widget */

(function () {
  'use strict';

  const S = window.AuroraStore;
  const W = window.AuroraWeather;
  const $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function md(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>'); }

  /* ---- services grid ---- */
  const EMOJI = { exam: '🔍', hygiene: '🦷', filling: '✨', crown: '👑', extraction: '🪥', denture: '😁', kids: '🧸', whitening: '🌟', emergency: '🚨' };
  $('svcGrid').innerHTML = S.services.map(function (s) {
    return '<div class="tile"><div class="ic">' + (EMOJI[s.id] || '🦷') + '</div><b>' + esc(s.name) + '</b>' +
      '<div class="price">' + esc(s.price) + ' · ' + s.duration + ' min</div>' +
      '<span class="lnk" data-book="' + s.id + '">Book with Sila →</span></div>';
  }).join('');

  /* ---- hours ---- */
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDow = new Date().getDay();
  function toHM(mins) { return String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0'); }
  $('hoursT').innerHTML = [1, 2, 3, 4, 5, 6, 0].map(function (dow) {
    const h = S.clinic.hours[dow];
    return '<tr' + (dow === todayDow ? ' class="today"' : '') + '><td>' + DAYS[dow] + (dow === todayDow ? ' · today' : '') + '</td><td>' +
      (h ? toHM(h.open) + ' – ' + toHM(h.close) + (h.note ? ' (' + h.note + ')' : '') : 'Closed') + '</td></tr>';
  }).join('');
  (function () {
    const h = S.clinic.hours[todayDow];
    const mins = new Date().getHours() * 60 + new Date().getMinutes();
    const open = h && mins >= h.open && mins < h.close;
    const chip = $('openChip');
    chip.textContent = open ? '● Open now — until ' + toHM(h.close) : '● Closed — Sila still books 24/7';
    if (!open) { chip.classList.remove('green'); chip.classList.add('amber'); }
  })();

  /* ---- weather ribbon ---- */
  function renderWx() {
    const w = W.current;
    $('wxRibbon').innerHTML = '<div class="wrap"><span>Iqaluit now: <b>' + w.temp + '°C</b> · feels ' + w.feels + '° · wind ' + w.wind + ' km/h</span>' +
      (W.storm ? '<span class="warn">⚠ Blizzard warning from ~13:00 — Sila is rescheduling afternoon visits</span>' : '<span style="opacity:.7">No weather alerts in effect</span>') +
      '</div>';
  }
  renderWx();
  W.load(renderWx);

  /* ---- Sila chat ---- */
  const agent = new window.Sila({
    storm: W.storm, weather: W.current,
    onEvent: function (ev) {
      if (ev.type === 'booked') {
        S.logConversation({
          ch: 'CHAT', name: ev.appointment.patient, preview: 'Website chat — booked ' + ev.appointment.proc,
          sub: 'Website chatbot · ' + ev.lang + ' · resolved by Sila', channelName: 'website chat',
          summary: '✦ ' + (ev.isNewPatient ? 'New patient registered and booked ' : 'Booked ') + ev.appointment.proc + ' via website chat (' + ev.lang + ').',
          thread: agent.transcript.slice(-10).map(function (t) { return { from: t[0], text: t[1], meta: t[0] === 's' ? 'Sila ᓯᓚ' : '' }; })
        });
      } else if (ev.type === 'escalation') {
        S.logConversation({
          ch: 'CHAT', name: 'Website visitor', preview: '⚠ Emergency — escalated to on-call',
          sub: 'Website chatbot · escalated to staff', channelName: 'website chat',
          summary: '✦ Emergency keywords detected on website chat. Visitor given on-call number and emergency slot; on-call dentist paged.',
          thread: agent.transcript.slice(-6).map(function (t) { return { from: t[0], text: t[1], meta: t[0] === 's' ? 'Sila ᓯᓚ · emergency protocol' : '' }; })
        });
      }
    }
  });

  const panel = $('panel'), log = $('log'), quick = $('quick');
  let opened = false;

  function openChat() {
    panel.classList.remove('closed');
    if (!opened) { opened = true; respond(agent.greeting()); }
    setTimeout(function () { $('text').focus(); }, 250);
  }
  $('fab').addEventListener('click', function () {
    panel.classList.contains('closed') ? openChat() : panel.classList.add('closed');
  });
  $('closeChat').addEventListener('click', function () { panel.classList.add('closed'); });
  document.querySelectorAll('[data-chat]').forEach(function (b) { b.addEventListener('click', openChat); });
  document.addEventListener('click', function (e) {
    const bk = e.target.closest('[data-book]');
    if (bk) {
      openChat();
      const svc = S.services.find(function (s) { return s.id === bk.dataset.book; });
      setTimeout(function () { send('Book ' + svc.name.toLowerCase()); }, 350);
    }
  });

  $('langBtns').addEventListener('click', function (e) {
    const b = e.target.closest('button[data-l]');
    if (!b) return;
    setLangBtns(b.dataset.l);
    agent.lang = b.dataset.l;
    respond(agent.greeting());
  });
  function setLangBtns(l) {
    document.querySelectorAll('#langBtns button').forEach(function (x) { x.classList.toggle('on', x.dataset.l === l); });
  }

  function addMsg(text, who, alert) {
    const el = document.createElement('div');
    el.className = 'msg ' + who + (alert ? ' alert' : '');
    el.innerHTML = md(text);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }
  function typing() {
    const el = document.createElement('div');
    el.className = 'typing';
    el.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }
  function setQuick(opts) {
    quick.innerHTML = '';
    (opts || []).forEach(function (q) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = q;
      b.addEventListener('click', function () { send(q); });
      quick.appendChild(b);
    });
  }
  function respond(out) {
    setQuick([]);
    let delay = 120;
    (out.messages || []).forEach(function (m, i) {
      setTimeout(function () {
        const t = typing();
        setTimeout(function () {
          t.remove();
          addMsg(m, 's', out.escalated);
          if (i === out.messages.length - 1) setQuick(out.quick);
        }, 340 + Math.min(m.length * 3, 650));
      }, delay);
      delay += 520 + Math.min(m.length * 5, 850);
    });
    if (!(out.messages || []).length) setQuick(out.quick);
  }
  function send(text) {
    if (!text.trim()) return;
    addMsg(text, 'p');
    const out = agent.reply(text);
    setLangBtns(agent.lang);
    respond(out);
  }
  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    const v = $('text').value;
    $('text').value = '';
    send(v);
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
