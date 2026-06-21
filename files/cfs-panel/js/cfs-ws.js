/* WebSocket client for the Creality control port (9999).
   The browser handles the WS handshake; we send JSON get/set commands and ack
   the periodic "heart_beat". The printer also PUSHES status telemetry in partial
   messages, so we accumulate known fields into one state object and emit it. */
(function (global) {
  "use strict";

  // Telemetry fields we care about (verified on a real K1C). Each push message
  // carries a subset; we merge them so consumers always see the latest of each.
  var TELE_KEYS = [
    "deviceState", "state", "printProgress", "dProgress",
    "printJobTime", "printLeftTime", "printStartTime",
    "TotalLayer", "layer", "printFileName", "printId",
    "nozzleTemp", "targetNozzleTemp", "bedTemp0", "targetBedTemp0", "boxTemp",
    "lightSw", "fan", "fanCase", "fanAuxiliary",
    "modelFanPct", "caseFanPct", "auxiliaryFanPct",
    "curFeedratePct", "curPosition", "feedState", "materialStatus",
    "cfsConnect", "maxNozzleTemp", "maxBedTemp", "model", "hostname", "err"
  ];

  function CFSClient(opts) {
    opts = opts || {};
    this.onBoxsInfo = opts.onBoxsInfo || function () {};
    this.onBoxConfig = opts.onBoxConfig || function () {};
    this.onTelemetry = opts.onTelemetry || function () {};
    this.onList = opts.onList || function () {}; // (kind, data)
    this.onStatus = opts.onStatus || function () {};
    this.pollMs = opts.pollMs || 3000;
    this.ws = null;
    this.ip = null;
    this.state = {};
    this._poll = null;
    this._reconnect = null;
    this._closedByUser = false;
  }

  CFSClient.prototype.connect = function (ip) {
    this.disconnect(true);
    this._closedByUser = false;
    this.ip = ip;
    this.state = {};
    this.onStatus("connecting");
    var ws;
    try {
      ws = new WebSocket("ws://" + ip + ":9999/");
    } catch (e) {
      this.onStatus("error", String(e));
      return;
    }
    this.ws = ws;
    var self = this;

    ws.onopen = function () {
      self.onStatus("connected");
      self.refresh();
      self._poll = setInterval(function () { self.refresh(); }, self.pollMs);
    };

    ws.onmessage = function (ev) {
      var raw = typeof ev.data === "string" ? ev.data : "";
      if (raw.indexOf("heart_beat") !== -1) { try { ws.send("ok"); } catch (e) {} return; }
      var msg;
      try { msg = JSON.parse(raw); } catch (e) { return; }
      if (!msg || typeof msg !== "object" || Array.isArray(msg)) return;

      if (msg.boxsInfo)  self.onBoxsInfo(msg.boxsInfo);
      if (msg.boxConfig) self.onBoxConfig(msg.boxConfig);
      if (msg.retGcodeFileInfo2) self.onList("files", msg.retGcodeFileInfo2);
      if (msg.retHistory || msg.history) self.onList("history", msg.retHistory || msg.history);
      if (msg.retElapseVideoList || msg.videoList) self.onList("video", msg.retElapseVideoList || msg.videoList);

      // accumulate telemetry
      var touched = false;
      for (var i = 0; i < TELE_KEYS.length; i++) {
        var k = TELE_KEYS[i];
        if (msg[k] !== undefined) { self.state[k] = msg[k]; touched = true; }
      }
      if (touched) self.onTelemetry(self.state);
    };

    ws.onclose = function () {
      clearInterval(self._poll); self._poll = null;
      if (self._closedByUser) return;
      self.onStatus("disconnected");
      self._reconnect = setTimeout(function () { self.connect(ip); }, 2500);
    };
    ws.onerror = function () { self.onStatus("error"); };
  };

  CFSClient.prototype.refresh = function () {
    this._get({ boxsInfo: 1 });
    this._get({ boxConfig: 1 });
  };

  CFSClient.prototype.reqFiles   = function () { this._get({ reqGcodeFile: 1 }); };
  CFSClient.prototype.reqHistory = function () { this._get({ reqHistory: 1 }); };
  CFSClient.prototype.reqVideos  = function () { this._get({ reqElapseVideoList: 1 }); };

  CFSClient.prototype._get = function (params) {
    if (!this.ws || this.ws.readyState !== 1) return;
    try { this.ws.send(JSON.stringify({ method: "get", params: params })); } catch (e) {}
  };

  CFSClient.prototype.set = function (params) {
    if (!this.ws || this.ws.readyState !== 1) return false;
    try { this.ws.send(JSON.stringify({ method: "set", params: params })); return true; }
    catch (e) { return false; }
  };

  CFSClient.prototype.gcode = function (cmd) { return this.set({ gcodeCmd: cmd }); };

  CFSClient.prototype.disconnect = function (silent) {
    this._closedByUser = true;
    clearInterval(this._poll); this._poll = null;
    clearTimeout(this._reconnect); this._reconnect = null;
    if (this.ws) { try { this.ws.close(); } catch (e) {} this.ws = null; }
    if (!silent) this.onStatus("disconnected");
  };

  global.CFSClient = CFSClient;
})(window);
