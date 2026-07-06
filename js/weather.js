/* Aurora Dental Iqaluit — data cuaca (Open-Meteo, tanpa API key)
   Fallback ke nilai desain (−29° / −38° wind chill) bila offline. */

(function (global) {
  'use strict';

  const FALLBACK = { temp: -29, feels: -38, wind: 90, ok: false };

  function stormPref() {
    const v = localStorage.getItem('aurora_storm_demo');
    return v === null ? true : v === '1'; // default ON sesuai desain
  }

  global.AuroraWeather = {
    current: Object.assign({}, FALLBACK),
    storm: stormPref(),

    setStormDemo: function (on) {
      this.storm = !!on;
      try { localStorage.setItem('aurora_storm_demo', on ? '1' : '0'); } catch (e) {}
    },

    load: function (cb) {
      const self = this;
      const c = global.AuroraStore.clinic;
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + c.lat + '&longitude=' + c.lon +
        '&current=temperature_2m,apparent_temperature,wind_speed_10m&timezone=America%2FIqaluit';
      fetch(url).then(function (r) { return r.json(); }).then(function (j) {
        const cur = j.current || {};
        self.current = {
          temp: Math.round(cur.temperature_2m),
          feels: Math.round(cur.apparent_temperature),
          wind: Math.round(cur.wind_speed_10m),
          ok: true
        };
        // Angin kencang nyata juga memicu mode badai.
        if (self.current.wind >= 60) self.storm = true;
        if (cb) cb(self.current);
      }).catch(function () {
        self.current = Object.assign({}, FALLBACK);
        if (cb) cb(self.current);
      });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
