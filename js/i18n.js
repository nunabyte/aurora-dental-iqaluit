/* Aurora Dental Iqaluit — UI strings (EN / FR / IU)
   Catatan: terjemahan Inuktitut memakai frasa umum yang lazim; label teknis
   tetap bahasa Inggris menunggu tinjauan penutur asli (standar demo). */

(function (global) {
  'use strict';

  const STR = {
    nav: {
      dashboard: { EN: 'Dashboard', FR: 'Tableau de bord', IU: 'Dashboard' },
      calendar: { EN: 'Calendar', FR: 'Calendrier', IU: 'ᐅᓪᓗᐃᑦ · Calendar' },
      patients: { EN: 'Patients', FR: 'Patients', IU: 'ᐋᓐᓂᐊᖅᑐᑦ · Patients' },
      messages: { EN: 'Messages', FR: 'Messages', IU: 'ᑎᑎᖅᑲᑦ · Messages' },
      sila: { EN: 'Sila AI', FR: 'Sila IA', IU: 'ᓯᓚ AI' },
      staff: { EN: 'Staff', FR: 'Personnel', IU: 'ᐃᖅᑲᓇᐃᔭᖅᑏᑦ · Staff' },
      inventory: { EN: 'Inventory', FR: 'Inventaire', IU: 'Inventory' },
      setup: { EN: 'Clinic setup', FR: 'Config. clinique', IU: 'Clinic setup' }
    },
    titles: {
      dashboard: { EN: 'Good morning', FR: 'Bonjour', IU: 'ᐅᓪᓛᒃᑯᑦ — Good morning' },
      calendar: { EN: 'Calendar', FR: 'Calendrier', IU: 'Calendar' },
      patients: { EN: 'Patients', FR: 'Patients', IU: 'Patients' },
      messages: { EN: 'Messages', FR: 'Messages', IU: 'Messages' },
      sila: { EN: 'Sila ᓯᓚ — AI receptionist', FR: 'Sila ᓯᓚ — réceptionniste IA', IU: 'ᓯᓚ — AI receptionist' },
      staff: { EN: 'Staff', FR: 'Personnel', IU: 'Staff' },
      inventory: { EN: 'Inventory', FR: 'Inventaire', IU: 'Inventory' },
      setup: { EN: 'Clinic setup', FR: 'Configuration de la clinique', IU: 'Clinic setup' }
    },
    common: {
      openCalendar: { EN: 'Open calendar →', FR: 'Ouvrir le calendrier →', IU: 'Open calendar →' },
      inbox: { EN: 'Inbox →', FR: 'Boîte de réception →', IU: 'Inbox →' },
      todaysSchedule: { EN: "Today's schedule", FR: "Horaire d'aujourd'hui", IU: "ᐅᓪᓗᒥ · Today's schedule" },
      silaSuggests: { EN: 'Sila suggests', FR: 'Sila suggère', IU: 'ᓯᓚ suggests' },
      channelSummaries: { EN: 'Channel summaries', FR: 'Résumés des canaux', IU: 'Channel summaries' },
      send: { EN: 'Send', FR: 'Envoyer', IU: 'Send' },
      logout: { EN: 'Sign out', FR: 'Déconnexion', IU: 'Sign out' }
    }
  };

  global.AuroraI18n = {
    strings: STR,
    t: function (group, key, lang) {
      const g = STR[group] || {};
      const e = g[key] || {};
      return e[lang] || e.EN || key;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
