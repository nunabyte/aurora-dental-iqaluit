/* Sila ᓯᓚ — AI receptionist engine (Aurora Dental Iqaluit)
   Berjalan penuh di browser (demo). Aturan dari desain & SOP:
   - Hangat, kalimat pendek, tidak mengarang, tidak memberi saran klinis.
   - Darurat (nyeri 8+/10, trauma, bengkak + demam) → eskalasi instan, jangan digating booking.
   - Semua pesan AI tercatat & dapat ditinjau (log ke Store).
   - 3 bahasa: English / Français / ᐃᓄᒃᑎᑐᑦ (IU: sapaan asli + isi bilingual, menunggu tinjauan penutur). */

(function (global) {
  'use strict';

  /* ---------- language detection ---------- */
  function detectLang(text, current) {
    if (/[᐀-ᙿ]/.test(text)) return 'IU'; // syllabics
    const t = ' ' + text.toLowerCase() + ' ';
    const frHits = (t.match(/\b(bonjour|salut|je|rendez-vous|rendez|vous|merci|combien|prix|heures|ouvert|dent|mal|annuler|déplacer|s'il|svp|oui|non|besoin|nouveau|patient)\b/g) || []).length;
    const enHits = (t.match(/\b(the|hi|hello|book|appointment|thanks|how|what|when|need|please|yes|no|cancel|move|tooth|pain|open)\b/g) || []).length;
    if (frHits >= 2 && frHits > enHits) return 'FR';
    if (enHits >= 1 && enHits >= frHits) return 'EN';
    if (frHits >= 1) return 'FR';
    return current || 'EN';
  }

  /* ---------- copy: EN penuh, FR penuh, IU = sapaan + bilingual ---------- */
  const T = {
    greet: {
      EN: 'Hi! I\'m Sila ᓯᓚ, Aurora Dental\'s assistant — awake 24/7, even at −40°. I can book or move appointments, answer questions about services, prices and insurance, or register you as a new patient. How can I help?',
      FR: 'Bonjour ! Je suis Sila ᓯᓚ, l\'assistante d\'Aurora Dental — disponible 24 h/24, même à −40°. Je peux prendre ou déplacer un rendez-vous, répondre à vos questions (services, prix, assurances) ou vous inscrire comme nouveau patient. Comment puis-je aider ?',
      IU: 'ᐊᐃ! ᓯᓚᐅᔪᖓ — I\'m Sila, Aurora Dental\'s assistant, awake 24/7. I can book appointments, answer questions, or register you as a new patient. ᖃᓄᖅ ᐃᑲᔪᕐᓂᐊᖅᐸᒋᑦ? (How can I help?)'
    },
    fallback: {
      EN: 'I want to get this right — I can help with **booking**, **rescheduling**, **prices**, **hours**, **insurance (incl. NIHB)**, or **registering** as a new patient. Which is closest?',
      FR: 'Je veux bien vous comprendre — je peux aider avec **un rendez-vous**, **un report**, **les prix**, **les heures**, **les assurances (incl. SSNA/NIHB)** ou **l\'inscription** d\'un nouveau patient. Lequel vous convient ?',
      IU: 'I can help with **booking**, **prices**, **hours**, **insurance (NIHB)**, or **new patient registration**. Which one? ᖁᔭᓐᓇᒦᒃ!'
    },
    emergency: {
      EN: 'That sounds urgent — I\'m treating this as an emergency. 🚨\n\n**I\'ve paged the on-call dentist and the front desk right now.** Please call **{emergencyPhone}** if you can.\n\nI\'m holding our next emergency slot: **{slot}**.\n\n⚠ If swelling spreads to your eye or throat, or you have trouble breathing — go to **QGH emergency** immediately.',
      FR: 'Cela semble urgent — je traite ceci comme une urgence. 🚨\n\n**J\'ai alerté le dentiste de garde et la réception.** Appelez le **{emergencyPhone}** si possible.\n\nJe vous réserve la prochaine place d\'urgence : **{slot}**.\n\n⚠ Si l\'enflure atteint l\'œil ou la gorge, ou si vous avez du mal à respirer — allez immédiatement aux **urgences du QGH**.',
      IU: '🚨 This is an emergency — **I\'ve paged the on-call dentist right now.** Call **{emergencyPhone}** if you can. Emergency slot held: **{slot}**.\n\n⚠ If swelling spreads to your eye or throat — go to **QGH emergency** immediately.'
    },
    human: {
      EN: 'Of course — a real person is always available. Call the front desk at **{phone}** (Marie answers during opening hours), or leave your number and the team calls you back within the hour. Anything I can do meanwhile?',
      FR: 'Bien sûr — une vraie personne est toujours disponible. Appelez la réception au **{phone}**, ou laissez votre numéro et l\'équipe vous rappelle dans l\'heure. Puis-je faire quelque chose en attendant ?',
      IU: 'ᐄ — a real person is always available. Call **{phone}**, or leave your number and the team calls back within the hour.'
    },
    hours: {
      EN: 'Our hours in Iqaluit:\n\n🕐 **Mon–Thu** 08:30 – 17:00\n🕐 **Fri** 08:30 – 15:00\n🕐 **Sat** 09:00 – 13:00 (hygiene only)\n🚫 **Sun** closed\n\nI take bookings 24/7 though — even during blizzards. ❄️ Want me to check times?',
      FR: 'Nos heures à Iqaluit :\n\n🕐 **Lun–Jeu** 8 h 30 – 17 h\n🕐 **Ven** 8 h 30 – 15 h\n🕐 **Sam** 9 h – 13 h (hygiène seulement)\n🚫 **Dim** fermé\n\nJe prends les rendez-vous 24 h/24 — même pendant les blizzards. ❄️ Je vérifie les disponibilités ?',
      IU: '🕐 **Mon–Thu** 08:30–17:00 · **Fri** 08:30–15:00 · **Sat** 09:00–13:00 (hygiene) · **Sun** closed.\nI take bookings 24/7 — ᐅᓐᓄᒃᑯᑦ ᐅᓪᓗᒃᑯᓪᓗ (night and day). Want me to check times?'
    },
    location: {
      EN: 'We\'re at **{address}** — across from the Aquatic Centre. 🅿️ Parking out front; taxi drivers all know the building. Shall I book you in?',
      FR: 'Nous sommes au **{address}** — en face du Centre aquatique. 🅿️ Stationnement devant. Je vous réserve une place ?',
      IU: '**{address}** — across from the Aquatic Centre. Shall I book you in?'
    },
    insurance: {
      EN: 'Good news — we **bill directly**, so most patients pay nothing at the desk:\n\n• **NIHB / FNIHB** — full direct billing, we handle predeterminations\n• **GN employee plan**, Sun Life, Canada Life, Blue Cross, Manulife\n\nTell me your plan and the team verifies coverage before your visit. Want to book?',
      FR: 'Bonne nouvelle — nous **facturons directement** :\n\n• **SSNA / NIHB** — facturation directe complète, nous gérons les prédéterminations\n• **Régime GN**, Sun Life, Canada Life, Croix Bleue, Manuvie\n\nDites-moi votre régime et l\'équipe vérifie la couverture avant votre visite. On réserve ?',
      IU: 'We **bill directly** — including **NIHB/FNIHB** (we handle predeterminations), GN plan, Sun Life and more. Most patients pay nothing at the desk. Want to book?'
    },
    priceIntro: {
      EN: 'Here\'s our price guide (exact quote after the dentist sees you — NIHB usually covers 100%):',
      FR: 'Voici notre guide de prix (devis exact après examen — le SSNA couvre souvent 100 %) :',
      IU: 'Price guide (NIHB usually covers 100%):'
    },
    priceOutro: { EN: 'Want me to find you a time?', FR: 'Je vous trouve un créneau ?', IU: 'Want me to find you a time?' },
    askService: {
      EN: 'Happy to book you in — what kind of visit do you need?',
      FR: 'Avec plaisir — quel type de visite vous faut-il ?',
      IU: 'ᐄ — what kind of visit do you need?'
    },
    askIdentity: {
      EN: '{svcLine}May I have your **full name**? And have you visited us before?',
      FR: '{svcLine}Puis-je avoir votre **nom complet** ? Êtes-vous déjà venu(e) chez nous ?',
      IU: '{svcLine}ᑭᓇᐅᕕᑦ? Your **full name**, please — and have you visited us before?'
    },
    askPhone: {
      EN: 'Thanks, {name}! You\'re not in our records yet, so I\'ll register you — 20 seconds. Best **phone number** to reach you?',
      FR: 'Merci, {name} ! Vous n\'êtes pas encore dans nos dossiers — je vous inscris en 20 secondes. Quel est le meilleur **numéro de téléphone** ?',
      IU: 'ᖁᔭᓐᓇᒦᒃ, {name}! I\'ll register you — 20 seconds. Best **phone number**?'
    },
    askInsurance: {
      EN: 'Got it. Do you have **coverage**? (NIHB, GN plan, Sun Life… — or say "none")',
      FR: 'Noté. Avez-vous une **assurance** ? (SSNA/NIHB, régime GN, Sun Life… — ou dites « aucune »)',
      IU: 'Do you have **coverage**? (NIHB, GN plan, Sun Life… — or "none")'
    },
    registered: {
      EN: 'You\'re registered! ✅ Intake form will come by your preferred channel. Now let\'s find a time.',
      FR: 'Vous êtes inscrit(e) ! ✅ Le formulaire d\'accueil suivra. Trouvons maintenant un créneau.',
      IU: 'Registered! ✅ ᖁᔭᓐᓇᒦᒃ. Now let\'s find a time.'
    },
    welcomeBack: {
      EN: 'Welcome back, **{name}**! 👋 {recall}',
      FR: 'Bon retour, **{name}** ! 👋 {recall}',
      IU: 'ᑐᙵᓱᒋᑦ, **{name}**! 👋 {recall}'
    },
    recallDue: {
      EN: 'I also see a hygiene recall is due — we can combine it with this visit.',
      FR: 'Je vois aussi qu\'un rappel d\'hygiène est dû — on peut le combiner avec cette visite.',
      IU: 'A hygiene recall is due too — we can combine it.'
    },
    offerSlots: {
      EN: 'Next openings for **{service}**:\n\n{slots}\n\nWhich works? (or say "more options" / a day you prefer)',
      FR: 'Prochaines disponibilités pour **{service}** :\n\n{slots}\n\nLequel vous convient ? (ou « autres options » / un jour précis)',
      IU: 'Next openings for **{service}**:\n\n{slots}\n\nWhich works?'
    },
    stormNote: {
      EN: '❄️ Note: a **blizzard warning** starts ~13:00 today — I\'m only offering times outside the storm window.',
      FR: '❄️ Note : un **avertissement de blizzard** débute vers 13 h aujourd\'hui — je ne propose que des créneaux hors tempête.',
      IU: '❄️ **Blizzard warning** from ~13:00 today — offering safe times only.'
    },
    confirm: {
      EN: 'Please confirm:\n\n📅 **{when}**\n🦷 {service} ({duration} min)\n👩‍⚕️ {provider} · {op}\n💳 {insurance}\n\nShall I lock it in?',
      FR: 'Veuillez confirmer :\n\n📅 **{when}**\n🦷 {service} ({duration} min)\n👩‍⚕️ {provider} · {op}\n💳 {insurance}\n\nJe confirme ?',
      IU: 'Confirm:\n\n📅 **{when}**\n🦷 {service} ({duration} min)\n👩‍⚕️ {provider}\n💳 {insurance}\n\nShall I lock it in?'
    },
    booked: {
      EN: 'Booked! ✅ **{when}** with {provider}.\n\nReminders will come 48h and 2h before, in your language{formNote}. If weather turns, I\'ll message you first. Anything else?',
      FR: 'Réservé ! ✅ **{when}** avec {provider}.\n\nRappels 48 h et 2 h avant, dans votre langue{formNote}. Si la météo tourne, je vous préviens en premier. Autre chose ?',
      IU: 'ᐄ — booked! ✅ **{when}** with {provider}. Reminders 48h & 2h before{formNote}. ᖁᔭᓐᓇᒦᒃ!'
    },
    formNote: { EN: ', plus your new-patient intake form', FR: ', plus votre formulaire d\'accueil', IU: ' + intake form' },
    whoCancel: {
      EN: 'Sure — what\'s the **full name** the appointment is under?',
      FR: 'Bien sûr — sous quel **nom complet** est le rendez-vous ?',
      IU: 'What\'s the **full name** on the appointment?'
    },
    cancelWhich: {
      EN: 'Found it:\n\n📅 **{when}** — {service} with {provider}\n\n**Cancel** it, or **reschedule** to another time?',
      FR: 'Trouvé :\n\n📅 **{when}** — {service} avec {provider}\n\nOn **annule**, ou on **reporte** à un autre moment ?',
      IU: 'Found it:\n\n📅 **{when}** — {service}\n\n**Cancel** or **reschedule**?'
    },
    cancelNone: {
      EN: 'I can\'t find an upcoming appointment under that name. Could you check the spelling — or shall I book a new visit?',
      FR: 'Je ne trouve pas de rendez-vous à venir sous ce nom. Vérifiez l\'orthographe — ou je réserve une nouvelle visite ?',
      IU: 'No upcoming appointment under that name. Book a new visit instead?'
    },
    cancelled: {
      EN: 'Done — cancelled, and the slot is released to the waitlist. Want a better time now, or a reminder next month?',
      FR: 'C\'est fait — annulé, le créneau retourne à la liste d\'attente. Un autre moment maintenant, ou un rappel le mois prochain ?',
      IU: 'Cancelled ✓ — slot released. Want another time?'
    },
    thanks: {
      EN: 'You\'re very welcome! Stay warm out there. ❄️ I\'m here any time — day, night or blizzard.',
      FR: 'Avec plaisir ! Restez au chaud. ❄️ Je suis là en tout temps — jour, nuit ou blizzard.',
      IU: 'ᖁᔭᓐᓇᒦᒃ! Stay warm ❄️ — I\'m here any time.'
    },
    noMedical: {
      EN: 'I can\'t give medical advice — that\'s for the dentist. But I *can* get you seen quickly. Shall I book {suggestion}? If the pain is 8/10 or worse, or there\'s swelling with fever, tell me now and I\'ll treat it as an emergency.',
      FR: 'Je ne peux pas donner d\'avis médical — c\'est le rôle du dentiste. Mais je *peux* vous faire voir rapidement. Je réserve {suggestion} ? Si la douleur est de 8/10 ou pire, ou s\'il y a enflure avec fièvre, dites-le-moi — je traiterai cela comme une urgence.',
      IU: 'I can\'t give medical advice — but I can get you seen fast. Book {suggestion}? If pain is 8/10+ or swelling with fever, tell me — that\'s an emergency.'
    },
    whatAreYou: {
      EN: 'Aurora Dental built me to help with bookings and questions — in English, French and Inuktitut. I\'m not human, but a real person is always one message away, and staff review everything I do. 💙',
      FR: 'Aurora Dental m\'a créée pour aider avec les rendez-vous et les questions — en anglais, français et inuktitut. Je ne suis pas humaine, mais une vraie personne est toujours à un message, et l\'équipe révise tout ce que je fais. 💙',
      IU: 'Aurora Dental built me — ᓯᓚ. I\'m not human, but real staff review everything I do, and a person is always one message away. 💙'
    },
    weather: {
      EN: 'Current Iqaluit weather: **{temp}°C** (feels like {feels}°C), wind {wind} km/h. {warn} I watch Environment Canada alerts and message affected patients automatically.',
      FR: 'Météo actuelle à Iqaluit : **{temp} °C** (ressenti {feels} °C), vent {wind} km/h. {warn} Je surveille les alertes d\'Environnement Canada et préviens les patients concernés automatiquement.',
      IU: 'ᓯᓚ Iqaluit: **{temp}°C** (feels {feels}°C), wind {wind} km/h. {warn}'
    }
  };

  function pick(key, lang) { const e = T[key]; return (e && (e[lang] || e.EN)) || ''; }
  function fill(s, map) { return s.replace(/\{(\w+)\}/g, function (_, k) { return map[k] !== undefined ? map[k] : '{' + k + '}'; }); }

  /* ---------- intents ---------- */
  const EMERGENCY_RE = /(unbearable|severe pain|swollen|swelling|knocked out|broke my|broken tooth|bleeding|can'?t sleep|kept me (up|awake)|abscess|trauma|accident|fever.*(tooth|swell)|(pain|douleur).*(8|9|10)\s*\/?\s*10|insupportable|enflure|saigne|urgence)/i;
  const INTENTS = [
    { id: 'human', re: /(human|real person|talk to (someone|a person)|front desk|staff|operator|vraie personne|parler à|réception)/i },
    { id: 'cancel', re: /(cancel|annuler)/i },
    { id: 'reschedule', re: /(reschedul|move my|change my (appointment|booking)|déplacer|reporter|changer mon)/i },
    { id: 'weather', re: /(weather|blizzard|storm|météo|tempête|ᓯᓚ\?)/i },
    { id: 'pricing', re: /(price|cost|how much|fee|charge|prix|combien|coût|tarif)/i },
    { id: 'insurance', re: /(insur|billing|coverage|nihb|fnihb|ssna|gn plan|sun ?life|blue cross|manulife|assurance)/i },
    { id: 'hours', re: /(hour|open|close|when.*(open|close)|heures|ouvert|fermé)/i },
    { id: 'location', re: /(where|address|location|directions|parking|find you|adresse|où êtes|stationnement)/i },
    { id: 'book', re: /(book|appointment|schedule|slot|available|availability|rendez-vous|réserver|disponibilit|cleaning|hygiene|filling|crown|extraction|denture|whitening|exam|check ?up|nettoyage|plombage|couronne|détartrage)/i },
    { id: 'newPatient', re: /(new patient|register|sign ?up|nouveau patient|inscrire|m'inscrire)/i },
    { id: 'services', re: /(services|treatments|what do you (do|offer)|quels services)/i },
    { id: 'whatAreYou', re: /(are you (a )?(bot|robot|ai|human)|what are you|es-tu (un )?(robot|ia)|êtes-vous)/i },
    { id: 'thanks', re: /^(thanks|thank you|thx|merci|ᖁᔭᓐᓇᒦᒃ|qujannamiik|nakurmiik|ok(ay)?[!. ]*$|great|bye|goodbye|au revoir)/i },
    { id: 'greet', re: /^(hi|hello|hey|good (morning|afternoon|evening)|bonjour|salut|ᐅᓪᓛᒃᑯᑦ|ᐊᐃ|ullaakkut|ai\b)/i }
  ];
  const SERVICE_HINTS = [
    { id: 'hygiene', re: /(clean|hygien|scaling|recall|nettoyage|détartrage)/i },
    { id: 'filling', re: /(fill|cavity|chip|plombage|carie|obturation)/i },
    { id: 'crown', re: /(crown|bridge|couronne|pont)/i },
    { id: 'extraction', re: /(extract|pull|remove|wisdom|arracher|extraction|sagesse)/i },
    { id: 'denture', re: /(denture|dentier|prothèse)/i },
    { id: 'whitening', re: /(whiten|bleach|blanchiment)/i },
    { id: 'kids', re: /(kid|child|children|son|daughter|enfant|fils|fille)/i },
    { id: 'exam', re: /(exam|check ?up|x-?ray|new patient|examen|radiographie)/i },
    { id: 'emergency', re: /(emergency|urgent|asap|today|urgence|aujourd'hui)/i }
  ];
  function detectIntent(t) { for (const i of INTENTS) if (i.re.test(t)) return i.id; return null; }
  function detectService(t) { for (const s of SERVICE_HINTS) if (s.re.test(t)) return s.id; return null; }

  function looksLikeName(text) {
    const t = text.trim().replace(/^(my name is|i'?m|it'?s|je m'appelle|c'est|je suis)\s+/i, '');
    return /^[a-zA-ZÀ-ÿ᐀-ᙿ' .-]{3,40}$/.test(t) && t.split(/\s+/).length <= 4
      ? t.replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : null;
  }
  // Aturan lokal: 7 digit saja = nomor Iqaluit/Nunavut → kode area 867.
  // Nomor lengkap (10/11 digit, dengan/ tanpa +1) juga diterima.
  function extractPhone(text) {
    const m = text.match(/[+0-9][0-9 ().-]{5,}/);
    if (!m) return null;
    let d = m[0].replace(/[^0-9]/g, '');
    if (d.length === 11 && d[0] === '1') d = d.slice(1);
    if (d.length === 7) d = '867' + d;               // lokal → area code 867
    if (d.length !== 10) return null;
    return '+1 (' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
  }

  /* ---------- agent ---------- */
  function Sila(opts) {
    opts = opts || {};
    this.lang = opts.lang || 'EN';
    this.state = 'idle';
    this.draft = {};
    this.transcript = [];
    this.onEvent = opts.onEvent || function () {};
    this.storm = opts.storm !== undefined ? opts.storm : true;
    this.weather = opts.weather || null; // {temp, feels, wind, warn}
  }

  Sila.prototype.q = function (keys) {
    const L = this.lang;
    const M = {
      book: { EN: 'Book an appointment', FR: 'Prendre rendez-vous', IU: 'Book an appointment' },
      prices: { EN: 'See prices', FR: 'Voir les prix', IU: 'See prices' },
      hours: { EN: 'Opening hours', FR: 'Heures d\'ouverture', IU: 'Hours' },
      insurance: { EN: 'Insurance / NIHB', FR: 'Assurances / SSNA', IU: 'NIHB' },
      newP: { EN: 'New patient', FR: 'Nouveau patient', IU: 'New patient' },
      yes: { EN: '✅ Yes, confirm', FR: '✅ Oui, je confirme', IU: '✅ ᐄ (yes)' },
      change: { EN: '❌ Change time', FR: '❌ Changer l\'heure', IU: '❌ Change time' },
      cancelIt: { EN: 'Cancel it', FR: 'Annuler', IU: 'Cancel' },
      resched: { EN: 'Reschedule', FR: 'Reporter', IU: 'Reschedule' },
      more: { EN: 'More options', FR: 'Autres options', IU: 'More options' }
    };
    return keys.map(function (k) { return (M[k] && (M[k][L] || M[k].EN)) || k; });
  };

  Sila.prototype.greeting = function () {
    return { messages: [pick('greet', this.lang)], quick: this.q(['book', 'prices', 'hours', 'insurance']) };
  };

  Sila.prototype.reply = function (raw) {
    const text = String(raw || '').trim();
    if (!text) return { messages: [] };
    this.lang = detectLang(text, this.lang);
    this.transcript.push(['p', text]);
    const out = this._route(text);
    const self = this;
    (out.messages || []).forEach(function (m) { self.transcript.push(['s', m]); });
    return out;
  };

  Sila.prototype._route = function (text) {
    const L = this.lang;
    const S = global.AuroraStore;
    const c = S.clinic;

    // 1. Emergency selalu menang.
    if (EMERGENCY_RE.test(text)) {
      this.state = 'idle';
      const slot = S.freeSlots('emergency', { limit: 1 })[0];
      this.onEvent({ type: 'escalation', text: text });
      return {
        messages: [fill(pick('emergency', L), {
          emergencyPhone: c.emergencyPhone,
          slot: slot ? S.fmtSlot(slot) : 'first thing tomorrow'
        })],
        quick: this.q(['yes']),
        escalated: true
      };
    }
    // 2. Minta manusia.
    if (/(human|real person|vraie personne|front desk|operator|parler à)/i.test(text)) {
      this.onEvent({ type: 'handoff' });
      return { messages: [fill(pick('human', L), { phone: c.phone })] };
    }
    // 3. State machine.
    switch (this.state) {
      case 'service': return this._stepService(text);
      case 'identity': return this._stepIdentity(text);
      case 'phone': return this._stepPhone(text);
      case 'insurance': return this._stepInsurance(text);
      case 'slots': return this._stepSlots(text);
      case 'confirm': return this._stepConfirm(text);
      case 'cancelName': return this._stepCancelName(text);
      case 'cancelConfirm': return this._stepCancelConfirm(text);
    }
    // 4. Intent bebas.
    switch (detectIntent(text)) {
      case 'greet': return this.greeting();
      case 'thanks': return { messages: [pick('thanks', L)] };
      case 'whatAreYou': return { messages: [pick('whatAreYou', L)] };
      case 'hours': {
        const hol = S.nextHoliday(14);
        const holNote = hol
          ? (L === 'FR' ? '\n\n📅 À noter : nous serons fermés le **' + new Date(hol.date + 'T12:00:00').toLocaleDateString('fr-CA', { weekday: 'long', month: 'long', day: 'numeric' }) + '** (' + (hol.fr || hol.name) + ').'
            : '\n\n📅 Heads-up: we\'re closed **' + new Date(hol.date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' }) + '** for ' + hol.name + (hol.iu ? ' (' + hol.iu + ')' : '') + '.')
          : '';
        return { messages: [pick('hours', L) + holNote], quick: this.q(['book']) };
      }
      case 'location': return { messages: [fill(pick('location', L), { address: c.address })] };
      case 'insurance': return { messages: [pick('insurance', L)], quick: this.q(['book']) };
      case 'pricing': return this._pricing(text);
      case 'services': return this._pricing('');
      case 'weather': return this._weather();
      case 'cancel': return this._startCancel(text, false);
      case 'reschedule': return this._startCancel(text, true);
      case 'newPatient':
      case 'book': return this._startBooking(text);
    }
    // 5. Keluhan nyeri ringan → triase tanpa saran medis.
    if (/(hurt|pain|ache|sensitive|sore|mal|douleur|sensible|ᐋᓐᓂᐊ)/i.test(text)) {
      this.draft = { serviceId: 'emergency' };
      this.state = 'identity';
      return {
        messages: [
          fill(pick('noMedical', L), { suggestion: L === 'FR' ? 'le prochain **examen d\'urgence** (30 min)' : 'the next **Emergency Exam** (30 min)' }),
          fill(pick('askIdentity', L), { svcLine: '' })
        ]
      };
    }
    return { messages: [pick('fallback', L)], quick: this.q(['book', 'prices', 'hours', 'newP']) };
  };

  /* ---- booking ---- */
  Sila.prototype._startBooking = function (text) {
    const S = global.AuroraStore;
    const svcId = detectService(text);
    this.draft = {};
    if (svcId) {
      this.draft.serviceId = svcId;
      this.state = 'identity';
      const svc = S.services.find(function (s) { return s.id === svcId; });
      const svcLine = (this.lang === 'FR' ? 'Parfait — **' + svc.name + '** (' + svc.duration + ' min). ' : 'Great — **' + svc.name + '** (' + svc.duration + ' min). ');
      return { messages: [fill(pick('askIdentity', this.lang), { svcLine: svcLine })] };
    }
    this.state = 'service';
    return {
      messages: [pick('askService', this.lang)],
      quick: ['🦷 Hygiene cleaning', '✨ Exam + X-rays', '🧸 Kids check-up', '👑 Crown', '🚨 Emergency']
    };
  };

  Sila.prototype._stepService = function (text) {
    this.draft.serviceId = detectService(text) || 'exam';
    this.state = 'identity';
    return { messages: [fill(pick('askIdentity', this.lang), { svcLine: '' })] };
  };

  Sila.prototype._stepIdentity = function (text) {
    const S = global.AuroraStore;
    const name = looksLikeName(text);
    if (!name) {
      return { messages: [this.lang === 'FR' ? 'Pardon — juste votre nom complet, s\'il vous plaît ? (ex. « Marie Tremblay »)' : 'Sorry — just your full name, please? (e.g. "Annie Kilabuk")'] };
    }
    this.draft.name = name;
    const existing = S.findPatient(name);
    if (existing) {
      this.draft.patient = existing;
      this.state = 'slots';
      const recall = /overdue/i.test(existing.recall || '') ? pick('recallDue', this.lang) : '';
      return this._offerSlots([fill(pick('welcomeBack', this.lang), { name: existing.name, recall: recall })]);
    }
    this.state = 'phone';
    return { messages: [fill(pick('askPhone', this.lang), { name: name.split(' ')[0] })] };
  };

  Sila.prototype._stepPhone = function (text) {
    const phone = extractPhone(text);
    if (!phone) {
      return { messages: [this.lang === 'FR' ? 'Ce numéro semble incomplet — pouvez-vous le retaper ? (ex. 867-979-1234)' : 'That number looks incomplete — mind typing it again? (e.g. 867-979-1234)'] };
    }
    this.draft.phone = phone;
    this.state = 'insurance';
    return { messages: [pick('askInsurance', this.lang)], quick: ['NIHB', 'GN plan', 'Sun Life', this.lang === 'FR' ? 'Aucune' : 'None'] };
  };

  Sila.prototype._stepInsurance = function (text) {
    const S = global.AuroraStore;
    const none = /(none|no insurance|aucune|pas d)/i.test(text);
    const match = S.clinic.insurers.find(function (i) { return text.toLowerCase().indexOf(i.toLowerCase()) !== -1; });
    this.draft.insurance = none ? 'Self-pay' : (match || text.trim().slice(0, 30));
    this.draft.patient = S.addPatient({
      name: this.draft.name, phone: this.draft.phone,
      insurance: this.draft.insurance,
      lang: this.lang === 'FR' ? 'Français preferred' : (this.lang === 'IU' ? 'ᐃᓄᒃᑎᑐᑦ preferred' : 'English'),
      langCode: this.lang, channel: 'SMS'
    });
    this.draft.isNew = true;
    this.onEvent({ type: 'patientRegistered', patient: this.draft.patient });
    this.state = 'slots';
    return this._offerSlots([pick('registered', this.lang)]);
  };

  Sila.prototype._offerSlots = function (pre, dayFilter) {
    const S = global.AuroraStore;
    const svc = S.services.find(s => s.id === this.draft.serviceId) || S.services[0];
    let slots = S.freeSlots(this.draft.serviceId, { limit: 30 });
    // Storm mode: jangan tawarkan slot sore ini (>= 12:00 hari ini).
    if (this.storm) {
      slots = slots.filter(function (s) {
        const t = new Date(s.start);
        const today = new Date();
        return !(t.toDateString() === today.toDateString() && t.getHours() >= 12);
      });
    }
    if (dayFilter) {
      slots = slots.filter(function (s) {
        return new Date(s.start).toLocaleDateString('en-CA', { weekday: 'long' }).toLowerCase().indexOf(dayFilter) !== -1;
      });
    }
    const offer = [];
    const seen = {};
    for (let i = 0; i < slots.length && offer.length < 3; i++) {
      const k = slots[i].start.slice(0, 10);
      if (!seen[k] || offer.length === 2) { offer.push(slots[i]); seen[k] = true; }
    }
    if (!offer.length) {
      return { messages: pre.concat([this.lang === 'FR' ? 'Ce jour est complet — je regarde d\'autres jours ?' : 'That day is full — want me to look at other days?']) };
    }
    this.draft.offer = offer;
    const lines = offer.map(function (s, i) { return (i + 1) + '. **' + S.fmtSlot(s) + '** — ' + s.provider; }).join('\n');
    const msgs = pre.concat([fill(pick('offerSlots', this.lang), { service: svc.name, slots: lines })]);
    if (this.storm) msgs.push(pick('stormNote', this.lang));
    return { messages: msgs, quick: offer.map(function (s, i) { return (i + 1) + ' — ' + S.fmtSlot(s); }) };
  };

  Sila.prototype._stepSlots = function (text) {
    const S = global.AuroraStore;
    if (/(more|other|autres|options)/i.test(text)) return this._offerSlots([]);
    const dayMap = { lundi: 'monday', mardi: 'tuesday', mercredi: 'wednesday', jeudi: 'thursday', vendredi: 'friday', samedi: 'saturday' };
    const lower = text.toLowerCase();
    let asked = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].find(function (w) { return lower.indexOf(w) !== -1; });
    if (!asked) { const fr = Object.keys(dayMap).find(function (w) { return lower.indexOf(w) !== -1; }); if (fr) asked = dayMap[fr]; }
    const num = (text.match(/[1-3]/) || [])[0];
    if (!num && asked) return this._offerSlots([], asked);
    let chosen = num && this.draft.offer ? this.draft.offer[Number(num) - 1] : null;
    if (!chosen && this.draft.offer) {
      const tm = text.match(/(\d{1,2})[:h.]?(\d{2})?/);
      if (tm) chosen = this.draft.offer.find(function (s) { return new Date(s.start).getHours() === Number(tm[1]); });
    }
    if (!chosen) {
      return { messages: [this.lang === 'FR' ? 'Répondez 1–3, ou dites-moi un jour. 😊' : 'Just reply 1–3, or tell me a day you prefer. 😊'] };
    }
    this.draft.slot = chosen;
    this.state = 'confirm';
    const svc = S.services.find(s => s.id === this.draft.serviceId);
    return {
      messages: [fill(pick('confirm', this.lang), {
        when: S.fmtSlot(chosen), service: svc.name, duration: svc.duration,
        provider: chosen.provider, op: chosen.op,
        insurance: (this.draft.patient && this.draft.patient.insurance) || 'Self-pay'
      })],
      quick: this.q(['yes', 'change'])
    };
  };

  Sila.prototype._stepConfirm = function (text) {
    const S = global.AuroraStore;
    if (/(no|change|❌|non|changer|autre)/i.test(text)) {
      this.state = 'slots';
      return this._offerSlots([this.lang === 'FR' ? 'Pas de souci — voici d\'autres options :' : 'No problem — here are other options:']);
    }
    if (!/(yes|yep|sure|ok|confirm|lock|oui|d'accord|ᐄ|ii\b|✅)/i.test(text)) {
      return { messages: [this.lang === 'FR' ? 'Répondez « oui » pour confirmer, ou « changer » pour d\'autres options.' : 'Reply "yes" to confirm, or "change time" for other options.'] };
    }
    const svc = S.services.find(s => s.id === this.draft.serviceId);
    const slot = this.draft.slot;
    const appt = S.addAppointment({
      time: S.fmtTime(slot.start), dur: svc.duration,
      patient: this.draft.patient.name, pid: this.draft.patient.id,
      proc: svc.name, provider: slot.provider, op: slot.op,
      billing: this.draft.patient.insurance, status: 'confirmed',
      start: slot.start, sila: 'Booked via website chat by Sila ᓯᓚ. Reminders scheduled 48h & 2h (' + this.lang + ').'
    });
    this.onEvent({ type: 'booked', appointment: appt, isNewPatient: !!this.draft.isNew, lang: this.lang });
    const msg = fill(pick('booked', this.lang), {
      when: S.fmtSlot(slot), provider: slot.provider,
      formNote: this.draft.isNew ? pick('formNote', this.lang) : ''
    });
    this.state = 'idle'; this.draft = {};
    return { messages: [msg], quick: this.q(['prices', 'hours']), booked: true };
  };

  /* ---- cancel / reschedule ---- */
  Sila.prototype._startCancel = function (text, isReschedule) {
    this.draft = { reschedule: !!isReschedule };
    const cleaned = text.replace(/(cancel|reschedule|annuler|reporter|déplacer|my appointment|mon rendez-vous)/gi, '');
    const name = looksLikeName(cleaned);
    if (name && global.AuroraStore.findPatient(name)) return this._stepCancelName(name);
    this.state = 'cancelName';
    return { messages: [pick('whoCancel', this.lang)] };
  };

  Sila.prototype._stepCancelName = function (text) {
    const S = global.AuroraStore;
    const name = looksLikeName(text);
    const patient = name ? S.findPatient(name) : null;
    const upcoming = patient ? S.upcomingFor(patient.id)[0] : null;
    if (!upcoming) {
      this.state = 'idle';
      return { messages: [pick('cancelNone', this.lang)], quick: this.q(['book']) };
    }
    this.draft.patient = patient;
    this.draft.target = upcoming;
    this.state = 'cancelConfirm';
    return {
      messages: [fill(pick('cancelWhich', this.lang), {
        when: S.fmtSlot({ start: upcoming.start }), service: upcoming.proc, provider: upcoming.provider
      })],
      quick: this.q(['cancelIt', 'resched'])
    };
  };

  Sila.prototype._stepCancelConfirm = function (text) {
    const S = global.AuroraStore;
    if (/(reschedul|report|déplac|move|change)/i.test(text)) {
      S.cancelAppointment(this.draft.target.id);
      const svcGuess = S.services.find(s => this.draft.target.proc.toLowerCase().indexOf(s.id) !== -1);
      this.draft.serviceId = (svcGuess && svcGuess.id) || 'exam';
      this.state = 'slots';
      this.onEvent({ type: 'rescheduleStart', appointment: this.draft.target });
      return this._offerSlots([this.lang === 'FR' ? 'Ancien créneau libéré. Voici les nouvelles options :' : 'Old slot released. Here are new options:']);
    }
    if (/(cancel|annul|yes|oui|ᐄ)/i.test(text)) {
      S.cancelAppointment(this.draft.target.id);
      this.onEvent({ type: 'cancelled', appointment: this.draft.target });
      this.state = 'idle';
      return { messages: [pick('cancelled', this.lang)], quick: this.q(['book']) };
    }
    return { messages: [this.lang === 'FR' ? 'On annule ou on reporte ?' : 'Cancel, or reschedule?'] };
  };

  /* ---- info ---- */
  Sila.prototype._pricing = function (text) {
    const S = global.AuroraStore;
    const svcId = detectService(text || '');
    if (svcId) {
      const svc = S.services.find(s => s.id === svcId);
      return {
        messages: ['**' + svc.name + '** — ' + svc.price + ' (' + svc.duration + ' min).', pick('priceOutro', this.lang)],
        quick: this.q(['book'])
      };
    }
    const rows = S.services.map(function (s) { return '🦷 ' + s.name + ' — **' + s.price + '**'; }).join('\n');
    return { messages: [pick('priceIntro', this.lang) + '\n\n' + rows, pick('priceOutro', this.lang)], quick: this.q(['book', 'insurance']) };
  };

  Sila.prototype._weather = function () {
    const w = this.weather || { temp: -29, feels: -38, wind: 55 };
    const L = this.lang;
    const warn = this.storm
      ? (L === 'FR' ? '⚠ **Avertissement de blizzard dès ~13 h** — les rendez-vous d\'après-midi sont en cours de report.' : '⚠ **Blizzard warning from ~13:00** — afternoon appointments are being rescheduled.')
      : (L === 'FR' ? 'Aucune alerte en vigueur.' : 'No alerts in effect.');
    return { messages: [fill(pick('weather', L), { temp: w.temp, feels: w.feels, wind: w.wind, warn: warn })], quick: this.q(['book']) };
  };

  global.Sila = Sila;
})(typeof window !== 'undefined' ? window : globalThis);
