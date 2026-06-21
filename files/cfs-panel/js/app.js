/* Creality CFS Panel — dashboard (CFS + telemetria + controles + abas).
   Servido pela própria impressora: conecta automaticamente ao host da página.
   Comandos set/get verificados contra docs/device-api.md + K1C real. */
(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var M = window.CFSModel;
  var t = function (k, p) { return window.I18N.t(k, p); };

  var elStatus = $("#status"), elBoxes = $("#boxes");
  var elEmpty = $("#empty-hint"), elDash = $("#dashboard"), elTabs = $("#tabs");

  var client = null;
  var connectedIp = null;
  var lastBoxes = [];
  var lastTele = {};
  var boxConfig = { autoRefill: 0, cAutoFeed: 0, cSelfTest: 0 };
  var selected = null;
  var jogStep = 1;
  var camOn = false;

  // ---- utils ----
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  var toastT = null;
  function toast(msg, kind) {
    var el = $("#toast");
    el.textContent = msg;
    el.className = "toast" + (kind ? " " + kind : "");
    el.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.hidden = true; }, 2600);
  }
  function send(params, okMsg) {
    if (!client || !client.set(params)) { toast(t("msg.noConn"), "bad"); return false; }
    if (okMsg) toast(okMsg);
    return true;
  }

  function setStatus(s) {
    var cls = { connecting: "on", connected: "on", disconnected: "off", error: "err" }[s] || "off";
    elStatus.className = "status " + cls;
    elStatus.textContent = t("status." + (s === "connecting" ? "connecting" : s === "connected" ? "connected" : s === "error" ? "error" : "off"));
    if (s === "connected") { elEmpty.hidden = true; elDash.hidden = false; elTabs.hidden = false; }
  }

  // ================= TELEMETRIA → painéis =================
  function setRange(id, val) {
    var el = $("#" + id);
    if (el && document.activeElement !== el) el.value = val;
  }
  function onTelemetry(tl) {
    lastTele = tl;
    var arrow = t("to");
    $("#t-nozzle").textContent = M.temp(tl.nozzleTemp);
    $("#t-nozzle-tgt").textContent = M.num(tl.targetNozzleTemp) ? " " + arrow + " " + Math.round(M.num(tl.targetNozzleTemp)) + "°C" : "";
    $("#t-bed").textContent = M.temp(tl.bedTemp0);
    $("#t-bed-tgt").textContent = M.num(tl.targetBedTemp0) ? " " + arrow + " " + Math.round(M.num(tl.targetBedTemp0)) + "°C" : "";
    $("#t-box").textContent = M.temp(tl.boxTemp);

    if (document.activeElement !== $("#led")) $("#led").checked = !!M.num(tl.lightSw);

    var spd = M.num(tl.curFeedratePct);
    if (spd != null) $("#speed-val").textContent = spd + "%";

    var fm = M.num(tl.modelFanPct), fc = M.num(tl.caseFanPct), fa = M.num(tl.auxiliaryFanPct);
    if (fm != null) { setRange("fan-model", fm); $("#fan-model-v").textContent = fm + "%"; }
    if (fc != null) { setRange("fan-case", fc); $("#fan-case-v").textContent = fc + "%"; }
    if (fa != null) { setRange("fan-aux", fa); $("#fan-aux-v").textContent = fa + "%"; }

    var p = M.parsePosition(tl.curPosition);
    $("#pos").textContent = "X " + (p.x == null ? "—" : p.x) + "  Y " + (p.y == null ? "—" : p.y) + "  Z " + (p.z == null ? "—" : p.z);

    var st = M.num(tl.deviceState);
    $("#dev-state").textContent = (st != null) ? t("state." + st) : "—";
    var prog = M.num(tl.printProgress); if (prog == null) prog = 0;
    $("#print-bar").style.width = prog + "%";
    $("#print-pct").textContent = prog + "%";
    $("#print-name").textContent = tl.printFileName || t("print.none");
    $("#print-name").className = "print-name" + (tl.printFileName ? "" : " muted");
    var lay = M.num(tl.layer), tot = M.num(tl.TotalLayer);
    $("#print-layer").textContent = tot ? (t("print.layer") + " " + (lay || 0) + "/" + tot) : (t("print.layer") + " —");
    $("#print-elapsed").textContent = t("print.elapsed") + " " + M.fmtDuration(tl.printJobTime);
    $("#print-left").textContent = t("print.left") + " " + M.fmtDuration(tl.printLeftTime);

    var active = M.isActiveJob(tl), paused = M.isPaused(tl);
    $("#btn-pause").disabled = !active || paused;
    $("#btn-resume").disabled = !active || !paused;
    $("#btn-stop").disabled = !active;
  }

  // ================= CFS =================
  function onBoxsInfo(boxsInfo) { lastBoxes = M.parseBoxes(boxsInfo); renderCfs(); }
  function onBoxConfig(cfg) {
    boxConfig = { autoRefill: cfg && cfg.autoRefill ? 1 : 0,
      cAutoFeed: cfg && cfg.cAutoFeed ? 1 : 0, cSelfTest: cfg && cfg.cSelfTest ? 1 : 0 };
    if (document.activeElement !== $("#cfg-auto")) $("#cfg-auto").checked = !!boxConfig.autoRefill;
    if (document.activeElement !== $("#cfg-autofeed")) $("#cfg-autofeed").checked = !!boxConfig.cAutoFeed;
    renderCfs();
  }

  function pctClass(p) { return p < 0 ? "" : (p <= 10 ? "bar crit" : (p <= 30 ? "bar low" : "bar")); }

  function slotEl(box, slot, idx) {
    var d = document.createElement("div");
    var isSel = selected && selected.boxId === box.id && selected.slotId === slot.id;
    d.className = "slot" + (slot.loaded ? "" : " empty") + (isSel ? " selected" : "");
    var label = box.slotLabel(idx);
    var name = slot.loaded ? (slot.product || slot.type || "—") : t("cfs.empty");
    var type = slot.loaded && slot.product && slot.type ? slot.type : "";
    var pct = slot.percent >= 0
      ? '<div class="' + pctClass(slot.percent) + '"><i style="width:' + slot.percent + '%"></i></div><div class="pct">' + slot.percent + '%</div>'
      : "";
    var star = slot.selected ? '<div class="star">● ' + t("state.1").toLowerCase() + '</div>' : "";
    d.innerHTML = '<div class="label">' + label + '</div>' +
      '<div class="ring" style="border-color:' + slot.color + '"><div class="hub"></div></div>' +
      '<div class="name">' + escapeHtml(name) + '</div>' +
      (type ? '<div class="type">' + escapeHtml(type) + '</div>' : "") + pct + star;
    d.addEventListener("click", function () { selected = { boxId: box.id, slotId: slot.id }; renderCfs(); });
    return d;
  }

  function cfsCard(box) {
    var card = document.createElement("div");
    card.className = "box-card cfs";
    var env = (box.temp != null || box.humidity != null)
      ? '<span class="badge env">' + (box.temp != null ? box.temp + "°C" : "") +
        (box.temp != null && box.humidity != null ? " · " : "") +
        (box.humidity != null ? box.humidity + "%" : "") + '</span>' : "";
    var auto = '<span class="badge auto ' + (boxConfig.autoRefill ? "on" : "") + '">AUTO</span>';
    card.innerHTML = '<div class="box-head"><span class="box-name">CFS ' + box.id + '</span>' +
      '<span class="box-meta">' + env + auto + '</span></div>';
    var row = document.createElement("div");
    row.className = "slots";
    box.slots.forEach(function (s, i) { row.appendChild(slotEl(box, s, i)); });
    card.appendChild(row);
    return card;
  }

  function externalCard(box) {
    var card = document.createElement("div");
    card.className = "box-card external";
    var s = box.slots[0];
    var loaded = s && s.loaded;
    card.innerHTML = '<div class="box-name" style="margin-bottom:10px">' + t("cfs.support") + '</div>' +
      '<div class="ring" style="border-color:' + (loaded ? s.color : "#555") + '"><div class="hub"></div></div>' +
      '<div class="name" style="margin-top:8px">' + (loaded ? escapeHtml(s.product || s.type) : "—") + '</div>';
    return card;
  }

  function selectedSlot() {
    if (!selected) return null;
    var box = lastBoxes.filter(function (b) { return b.id === selected.boxId; })[0];
    if (!box) return null;
    var slot = box.slots.filter(function (s) { return s.id === selected.slotId; })[0];
    return slot ? { box: box, slot: slot } : null;
  }

  function renderCfs() {
    elBoxes.innerHTML = "";
    lastBoxes.filter(function (b) { return !b.isCfs; }).forEach(function (b) { elBoxes.appendChild(externalCard(b)); });
    lastBoxes.filter(function (b) { return b.isCfs && b.active; }).forEach(function (b) { elBoxes.appendChild(cfsCard(b)); });
    var ctrls = $("#cfs-ctrls");
    var sel = selectedSlot();
    ctrls.hidden = !lastBoxes.length;
    if (sel) {
      $("#sel-label").textContent = sel.box.slotLabel(sel.slot.id);
      $("#sel-prod").textContent = sel.slot.loaded ? (sel.slot.product || sel.slot.type || "") : t("cfs.empty");
    } else {
      $("#sel-label").textContent = "—";
      $("#sel-prod").textContent = t("cfs.selectHint");
    }
  }

  // ================= LISTAS =================
  function onList(kind, data) {
    if (kind === "files") renderFiles(data);
    else if (kind === "history") renderHistory(data);
    else if (kind === "video") renderVideo(data);
  }

  function matSwatches(colorStr) {
    if (!colorStr) return "";
    return colorStr.split(";").filter(Boolean).map(function (c) {
      return '<span class="sw" style="background:' + escapeHtml(c) + '"></span>';
    }).join("");
  }

  // /tmp/creality/local_gcode/...png -> /gcodeimg/...png (servido pelo nginx)
  function thumbUrl(f) {
    var p = f.thumbnail || f.preview;
    if (!p) return null;
    var i = p.indexOf("/local_gcode/");
    return i >= 0 ? ("/gcodeimg/" + p.slice(i + "/local_gcode/".length)) : null;
  }

  function renderFiles(list) {
    var el = $("#files");
    if (!list || !list.length) { el.innerHTML = '<p class="hint">' + t("files.none") + '</p>'; return; }
    el.innerHTML = "";
    list.forEach(function (f) {
      var row = document.createElement("div");
      row.className = "file-row";
      var sizeMB = f.file_size ? (f.file_size / 1048576).toFixed(1) + " MB" : "";
      var th = thumbUrl(f);
      var thumb = th ? '<img class="file-thumb" src="' + escapeHtml(th) + '" alt="" onerror="this.style.display=\'none\'">'
                     : '<div class="file-thumb empty"></div>';
      row.innerHTML = thumb +
        '<div class="file-main"><div class="file-name">' + escapeHtml(f.name) + '</div>' +
        '<div class="file-sub muted">' + matSwatches(f.materialColors) +
        ' ' + escapeHtml(sizeMB) + (f.timeCost ? " · ~" + M.fmtDuration(f.timeCost) : "") + '</div></div>' +
        '<div class="file-act"></div>';
      var act = row.querySelector(".file-act");
      var bp = document.createElement("button"); bp.className = "primary"; bp.textContent = t("btn.print");
      bp.addEventListener("click", function () {
        if (confirm(t("confirm.print", { name: f.name })))
          send({ opGcodeFile: "printprt:" + f.path }, t("msg.printReq"));
      });
      var bd = document.createElement("button"); bd.textContent = t("btn.delete"); bd.className = "danger ghost";
      bd.addEventListener("click", function () {
        if (confirm(t("confirm.delete", { name: f.name }))) {
          send({ opGcodeFile: "deleteprt:" + f.path }, t("msg.deleted"));
          setTimeout(function () { client.reqFiles(); }, 600);
        }
      });
      act.appendChild(bp); act.appendChild(bd);
      el.appendChild(row);
    });
  }

  function renderHistory(list) {
    var el = $("#history");
    if (!list || !list.length) { el.innerHTML = '<p class="hint">' + t("history.none") + '</p>'; return; }
    el.innerHTML = "";
    list.forEach(function (h) {
      var row = document.createElement("div");
      row.className = "file-row";
      var name = h.name || h.printName || h.fileName || h.file || "—";
      var dur = h.timeCost || h.printTime || h.totalTime;
      var ok = (h.result === 1 || h.state === 1 || h.status === "completed");
      row.innerHTML = '<div class="file-main"><div class="file-name">' + escapeHtml(name) + '</div>' +
        '<div class="file-sub muted">' + (dur ? M.fmtDuration(dur) : "") + '</div></div>' +
        '<div class="badge ' + (ok ? "auto on" : "") + '">' + (ok ? "ok" : (h.result != null ? "fail" : "")) + '</div>';
      el.appendChild(row);
    });
  }

  function renderVideo(list) {
    var el = $("#video");
    if (!list || !list.length) { el.innerHTML = '<p class="hint">' + t("video.none") + '</p>'; return; }
    el.innerHTML = "";
    list.forEach(function (v) {
      var name = v.name || v.fileName || v.file || "video";
      var url = v.url || v.path || "";
      var row = document.createElement("div");
      row.className = "file-row";
      row.innerHTML = '<div class="file-main"><div class="file-name">' + escapeHtml(name) + '</div></div>';
      if (url && connectedIp) {
        var a = document.createElement("a");
        a.href = /^https?:/.test(url) ? url : ("http://" + connectedIp + url);
        a.target = "_blank"; a.textContent = t("video.open"); a.className = "link";
        row.appendChild(a);
      }
      el.appendChild(row);
    });
  }

  // ================= CÂMERA =================
  function setCam(on) {
    camOn = on;
    var img = $("#cam"), off = $("#cam-off");
    if (on && connectedIp) {
      img.src = "http://" + connectedIp + ":8080/?action=stream";
      img.hidden = false; off.hidden = true;
    } else {
      img.removeAttribute("src"); img.hidden = true; off.hidden = false;
    }
  }

  // ================= console G-code =================
  function gcodeLog(line) {
    var el = $("#gcode-log");
    var d = document.createElement("div");
    d.textContent = "› " + line;
    el.appendChild(d);
    while (el.childNodes.length > 60) el.removeChild(el.firstChild);
    el.scrollTop = el.scrollHeight;
  }

  // ================= WIRING =================
  function wireDashboard() {
    $$("button[data-set]").forEach(function (b) {
      b.addEventListener("click", function () {
        var which = b.getAttribute("data-set");
        var off = b.getAttribute("data-off");
        var val = off ? 0 : parseInt(($("#set-" + which).value || "0"), 10) || 0;
        if (which === "nozzle") send({ nozzleTempControl: val }, t("temp.nozzle") + " " + t("to") + " " + val + "°C");
        else if (which === "bed") send({ bedTempControl: { num: 0, val: val } }, t("temp.bed") + " " + t("to") + " " + val + "°C");
      });
    });
    $("#led").addEventListener("change", function () { send({ lightSw: this.checked ? 1 : 0 }); });
    $("#speed-presets").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var mode = parseInt(b.getAttribute("data-mode"), 10);
      var pct = parseInt(b.getAttribute("data-pct"), 10);
      send({ speedMode: mode, setFeedratePct: pct }, t("misc.speed") + " " + t("to") + " " + pct + "%");
    });
    [["fan-model", "fan"], ["fan-case", "fanCase"], ["fan-aux", "fanAuxiliary"]].forEach(function (pair) {
      var el = $("#" + pair[0]);
      el.addEventListener("input", function () { $("#" + pair[0] + "-v").textContent = el.value + "%"; });
      el.addEventListener("change", function () {
        var p = {}; p[pair[1]] = parseInt(el.value, 10);
        send(p, t("fan.title") + " " + t("to") + " " + el.value + "%");
      });
    });
    $("#btn-pause").addEventListener("click", function () { if (confirm(t("confirm.pause"))) send({ pause: 1 }, t("msg.pausing")); });
    $("#btn-resume").addEventListener("click", function () { send({ pause: 0 }, t("msg.resuming")); });
    $("#btn-stop").addEventListener("click", function () { if (confirm(t("confirm.cancel"))) send({ stop: 1 }, t("msg.cancelling")); });
    $("#cam-toggle").addEventListener("click", function () { setCam(!camOn); });
  }

  function wireCfsControls() {
    $("#btn-feed").addEventListener("click", function () {
      if (!selected) return toast(t("msg.selectSlot"), "bad");
      send({ feedInOrOut: { boxId: selected.boxId, materialId: selected.slotId, isFeed: 1 } }, t("msg.feeding"));
    });
    $("#btn-retract").addEventListener("click", function () {
      if (!selected) return toast(t("msg.selectSlot"), "bad");
      send({ feedInOrOut: { boxId: selected.boxId, materialId: selected.slotId, isFeed: 0 } }, t("msg.retracting"));
    });
    $("#btn-refresh-rfid").addEventListener("click", function () {
      if (!selected) return toast(t("msg.selectSlot"), "bad");
      send({ refreshBox: { boxId: selected.boxId, materialId: selected.slotId } }, t("msg.rereadRfid"));
      setTimeout(function () { client.refresh(); }, 800);
    });
    $("#cfg-auto").addEventListener("change", function () {
      boxConfig.autoRefill = this.checked ? 1 : 0;
      send({ boxConfig: boxConfig }, "AUTO " + (boxConfig.autoRefill ? "on" : "off"));
    });
    $("#cfg-autofeed").addEventListener("change", function () {
      boxConfig.cAutoFeed = this.checked ? 1 : 0;
      send({ boxConfig: boxConfig }, "Auto-feed " + (boxConfig.cAutoFeed ? "on" : "off"));
    });
    $("#btn-dry").addEventListener("click", function () {
      var v = parseInt($("#dry-temp").value || "0", 10) || 0;
      send({ boxTempControl: v }, t("cfs.drying") + " " + v + "°C");
    });
    $("#btn-dry-off").addEventListener("click", function () { send({ boxTempControl: 0 }, t("msg.dryStopped")); });
    $("#btn-edit").addEventListener("click", openEdit);
    $("#edit-cancel").addEventListener("click", function () { $("#edit-modal").hidden = true; });
    $("#edit-save").addEventListener("click", saveEdit);
  }

  function openEdit() {
    var sel = selectedSlot();
    if (!sel) return toast(t("msg.selectSlot"), "bad");
    $("#edit-label").textContent = sel.box.slotLabel(sel.slot.id);
    $("#edit-type").value = sel.slot.type || "";
    $("#edit-vendor").value = sel.slot.vendor || "";
    $("#edit-name").value = sel.slot.product || "";
    $("#edit-color").value = sel.slot.color && /^#[0-9a-f]{6}$/i.test(sel.slot.color) ? sel.slot.color : "#22c55e";
    $("#edit-min").value = sel.slot.minTemp || "";
    $("#edit-max").value = sel.slot.maxTemp || "";
    $("#edit-modal").hidden = false;
  }
  function saveEdit() {
    if (!selected) return;
    send({ modifyMaterial: {
      boxId: selected.boxId, id: selected.slotId,
      type: $("#edit-type").value.trim(), vendor: $("#edit-vendor").value.trim(),
      name: $("#edit-name").value.trim(), color: $("#edit-color").value,
      minTemp: parseInt($("#edit-min").value || "0", 10) || 0,
      maxTemp: parseInt($("#edit-max").value || "0", 10) || 0
    } }, t("msg.slotUpdated"));
    $("#edit-modal").hidden = true;
    setTimeout(function () { client.refresh(); }, 800);
  }

  function wireControlTab() {
    $$("button[data-home]").forEach(function (b) {
      b.addEventListener("click", function () { send({ autohome: b.getAttribute("data-home") }, "Home " + b.getAttribute("data-home")); });
    });
    $("#steps").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      jogStep = parseFloat(b.getAttribute("data-step"));
      $$("#steps button").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
    });
    $$("button[data-jog]").forEach(function (b) {
      b.addEventListener("click", function () {
        var j = b.getAttribute("data-jog");
        var axis = j.charAt(0), sign = j.charAt(1) === "-" ? "-" : "";
        send({ setPosition: axis + sign + jogStep + " F3000" }, "Jog " + j + " " + jogStep);
      });
    });
    $$("button[data-zoff]").forEach(function (b) {
      b.addEventListener("click", function () { send({ setZOffset: b.getAttribute("data-zoff") }, "Z-offset " + b.getAttribute("data-zoff")); });
    });
    $("#btn-gcode").addEventListener("click", function () {
      var v = $("#gcode-in").value.trim();
      if (v) { if (send({ gcodeCmd: v }, t("msg.gcodeSent"))) gcodeLog(v); $("#gcode-in").value = ""; }
    });
    $("#gcode-in").addEventListener("keydown", function (e) { if (e.key === "Enter") $("#btn-gcode").click(); });
  }

  function wireListTabs() {
    $("#files-refresh").addEventListener("click", function () { client && client.reqFiles(); toast(t("msg.loading")); });
    $("#history-refresh").addEventListener("click", function () { client && client.reqHistory(); toast(t("msg.loading")); });
    $("#video-refresh").addEventListener("click", function () { client && client.reqVideos(); toast(t("msg.loading")); });
  }

  function wireTabs() {
    elTabs.addEventListener("click", function (e) {
      var b = e.target.closest(".tab"); if (!b) return;
      var name = b.getAttribute("data-tab");
      $$(".tab").forEach(function (x) { x.classList.toggle("active", x === b); });
      $$(".tabpane").forEach(function (p) {
        var on = p.getAttribute("data-pane") === name;
        p.classList.toggle("active", on); p.hidden = !on;
      });
      if (name === "files") client && client.reqFiles();
      else if (name === "history") client && client.reqHistory();
      else if (name === "video") client && client.reqVideos();
    });
  }

  // ================= conexão =================
  function connect(ip) {
    connectedIp = ip;
    if (!client) client = new CFSClient({ onBoxsInfo: onBoxsInfo, onBoxConfig: onBoxConfig,
      onTelemetry: onTelemetry, onList: onList, onStatus: setStatus });
    client.connect(ip);
    setCam(true); // câmera ligada por padrão
  }

  function demo() {
    if (client) client.disconnect(true);
    setStatus("connected");
    fetch("references/sample-boxinfo.json", { cache: "no-cache" }).then(function (r) { return r.json(); })
      .then(function (s) {
        var bi = (s.boxsInfo && s.boxsInfo.boxsInfo) || s.boxsInfo;
        var bc = (s.boxConfig && s.boxConfig.boxConfig) || s.boxConfig;
        if (bc) onBoxConfig(bc);
        if (bi) onBoxsInfo(bi);
      }).catch(function () { toast(t("msg.noSample"), "bad"); });
  }

  // ================= init =================
  (function init() {
    window.I18N.apply();
    $("#lang").value = window.I18N.getLang();
    $("#lang").addEventListener("change", function () {
      window.I18N.setLang(this.value);
      setStatus(client && client.ws && client.ws.readyState === 1 ? "connected" : "disconnected");
      if (Object.keys(lastTele).length) onTelemetry(lastTele);
      renderCfs();
    });
    $("#btn-demo").addEventListener("click", demo);
    $("#btn-reconnect").addEventListener("click", function () { if (connectedIp || location.hostname) connect(connectedIp || location.hostname); });

    wireDashboard();
    wireCfsControls();
    wireControlTab();
    wireListTabs();
    wireTabs();

    M.loadCatalog().then(function () {
      var host = location.hostname;
      if (host && host !== "localhost" && host !== "127.0.0.1") connect(host); // auto-conexão
      else { setStatus("disconnected"); elEmpty.hidden = false; elEmpty.textContent = "localhost — " + t("btn.demo"); }
    });
  })();
})();
