/* CFS data model: parses the printer's boxsInfo / boxConfig into a normalized
   shape and resolves product names via the material catalogue. */
(function (global) {
  "use strict";

  let CATALOG = {}; // { "03001": {vendor, product, type}, ... }

  async function loadCatalog() {
    try {
      const r = await fetch("js/materials.json", { cache: "no-cache" });
      if (r.ok) CATALOG = await r.json();
    } catch (e) { /* offline: catalog stays empty, names fall back to box data */ }
    return CATALOG;
  }

  // "#0RRGGBB" / "0RRGGBB" / "#RRGGBB" -> "#RRGGBB"
  function normColor(c) {
    if (!c) return "#3a3a3f";
    let h = String(c).replace(/[^0-9a-fA-F]/g, "");
    if (h.length > 6) h = h.slice(-6);
    if (h.length !== 6) return "#3a3a3f";
    return "#" + h.toLowerCase();
  }

  // catalogue id = last 5 digits of the code/rfid
  function catLookup(code) {
    if (!code) return null;
    const k = String(code);
    return CATALOG[k] || (k.length > 5 ? CATALOG[k.slice(-5)] : null) || null;
  }

  function letter(i) { return String.fromCharCode(65 + i); } // 0->A

  // Build a normalized box list from a boxsInfo payload (already unwrapped to the
  // object holding materialBoxs).
  function parseBoxes(boxsInfo) {
    const boxes = (boxsInfo && boxsInfo.materialBoxs) || [];
    return boxes.map(function (box) {
      const isCfs = (box.type === 0 || box.type === 2);
      const slots = (box.materials || []).map(function (m) {
        const cat = catLookup(m.rfid);
        const loaded = (m.state && m.state !== 0) && !(!m.vendor && !m.type && !m.name);
        return {
          id: m.id,
          loaded: !!loaded,
          vendor: m.vendor || (cat && cat.vendor) || "",
          type: m.type || (cat && cat.type) || "",
          product: m.name || (cat && cat.product) || "",
          color: normColor(m.color),
          rfid: m.rfid || "",
          percent: (typeof m.percent === "number") ? m.percent : -1,
          selected: !!m.selected,
          minTemp: m.minTemp, maxTemp: m.maxTemp,
        };
      });
      return {
        id: box.id,
        type: box.type,
        isCfs: isCfs,
        active: box.state === 1,
        temp: (typeof box.temp === "number") ? box.temp : null,
        humidity: (typeof box.humidity === "number") ? box.humidity : null,
        slots: slots,
        slotLabel: function (idx) { return isCfs ? (box.id + letter(idx)) : "ext"; },
      };
    });
  }

  // ---- telemetry helpers ----------------------------------------------------
  // Temps arrive as strings ("31.790000"); other numbers as numbers.
  function num(v) {
    if (v == null || v === "") return null;
    var n = typeof v === "number" ? v : parseFloat(v);
    return isFinite(n) ? n : null;
  }
  function temp(v) { var n = num(v); return n == null ? "—" : Math.round(n) + "°C"; }

  function fmtDuration(sec) {
    sec = num(sec);
    if (sec == null || sec <= 0) return "—";
    sec = Math.round(sec);
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h) return h + "h" + (m < 10 ? "0" : "") + m + "m";
    if (m) return m + "m" + (s < 10 ? "0" : "") + s + "s";
    return s + "s";
  }

  // "X:178.00 Y:215.00 Z:125.86" -> {x,y,z}
  function parsePosition(s) {
    var out = { x: null, y: null, z: null };
    if (!s) return out;
    var m = String(s).match(/X:(-?[\d.]+).*Y:(-?[\d.]+).*Z:(-?[\d.]+)/);
    if (m) { out.x = +m[1]; out.y = +m[2]; out.z = +m[3]; }
    return out;
  }

  // Creality deviceState/state codes (verified idle=0; others mapped best-effort).
  var STATE_LABELS = { 0: "Ocioso", 1: "Imprimindo", 2: "Concluído", 3: "Pausado", 4: "Erro", 5: "Cancelado" };
  function stateLabel(n) {
    n = num(n);
    return (n != null && STATE_LABELS[n] != null) ? STATE_LABELS[n] : (n == null ? "—" : "estado " + n);
  }
  // A job is "active" (controls enabled) when printing or paused, or a file is loaded with progress.
  function isActiveJob(t) {
    var st = num(t.deviceState);
    if (st === 1 || st === 3) return true;
    return !!(t.printFileName && num(t.printJobTime) > 0 && num(t.printProgress) < 100);
  }
  function isPaused(t) { return num(t.deviceState) === 3; }

  global.CFSModel = {
    loadCatalog: loadCatalog, parseBoxes: parseBoxes, normColor: normColor, catLookup: catLookup,
    num: num, temp: temp, fmtDuration: fmtDuration, parsePosition: parsePosition,
    stateLabel: stateLabel, isActiveJob: isActiveJob, isPaused: isPaused
  };
})(window);
