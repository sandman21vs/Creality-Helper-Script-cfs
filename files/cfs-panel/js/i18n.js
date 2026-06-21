/* Tiny i18n: default English, optional Portuguese. Persisted in localStorage.
   HTML elements use data-i18n (textContent) and data-i18n-ph (placeholder).
   JS strings use I18N.t(key). */
(function (global) {
  "use strict";

  var DICT = {
    en: {
      "app.subtitle": "CFS Panel",
      "status.off": "disconnected", "status.connecting": "connecting…",
      "status.connected": "connected", "status.error": "error",
      "btn.reconnect": "Reconnect", "btn.demo": "Demo",

      "cam.title": "Camera", "cam.toggle": "on/off", "cam.off": "camera off",

      "print.title": "Current print", "print.none": "no job",
      "print.layer": "layer", "print.elapsed": "elapsed", "print.left": "remaining",
      "print.pause": "Pause", "print.resume": "Resume", "print.stop": "Cancel",
      "state.0": "Idle", "state.1": "Printing", "state.2": "Completed",
      "state.3": "Paused", "state.4": "Error", "state.5": "Cancelled",

      "temp.title": "Temperatures", "temp.nozzle": "Nozzle", "temp.bed": "Bed",
      "temp.chamber": "Chamber", "temp.readonly": "read-only",
      "btn.set": "Set", "btn.off": "Off",

      "misc.title": "LED & Speed", "misc.light": "Light", "misc.speed": "Speed",
      "speed.silent": "Silent", "speed.standard": "Standard", "speed.sport": "Sport", "speed.ultra": "Ultra",

      "fan.title": "Fans", "fan.model": "Model", "fan.case": "Case", "fan.side": "Side",

      "tab.filament": "Filament (CFS)", "tab.control": "Control", "tab.files": "Files",
      "tab.history": "Logs", "tab.video": "Video",

      "cfs.selected": "Selected slot:", "cfs.selectHint": "select a slot", "cfs.empty": "(empty)",
      "cfs.support": "spool holder",
      "btn.feed": "Load (Feed)", "btn.retract": "Retract",
      "btn.refreshRfid": "Reread RFID", "btn.edit": "Edit slot",
      "cfs.auto": "AUTO (auto-refill)", "cfs.autofeed": "Auto-feed", "cfs.drying": "Drying:",
      "btn.apply": "Apply", "btn.stopDry": "Stop",

      "ctrl.position": "Position", "btn.homeX": "Home X", "btn.homeY": "Home Y",
      "btn.homeZ": "Home Z", "btn.homeAll": "Home All", "ctrl.step": "Step:",
      "ctrl.zoffset": "Z-offset (baby-step):", "ctrl.gcode": "Console G-code",
      "ctrl.gcodePh": "Send G-code (e.g. M104 S0)", "btn.send": "Send",

      "files.title": "Local files", "btn.refresh": "Refresh",
      "files.hint": "Click Refresh to list.", "files.none": "No files.",
      "btn.print": "Print", "btn.delete": "Delete",
      "history.title": "Print history", "history.none": "No logs.", "history.hint": "Click Refresh to list.",
      "video.title": "Timelapses", "video.none": "No timelapse.", "video.hint": "Click Refresh to list.",
      "video.open": "open",

      "edit.title": "Edit slot", "edit.type": "Type", "edit.vendor": "Vendor",
      "edit.name": "Product", "edit.color": "Color", "edit.min": "Min temp", "edit.max": "Max temp",
      "btn.cancel": "Cancel", "btn.save": "Save",

      "msg.noConn": "Not connected", "msg.selectSlot": "Select a slot",
      "msg.loading": "Loading…", "msg.updated": "Updated", "msg.slotUpdated": "Slot updated",
      "msg.deleted": "Deleted", "msg.printReq": "Print requested",
      "msg.feeding": "Loading filament…", "msg.retracting": "Retracting filament…",
      "msg.rereadRfid": "Rereading RFID…", "msg.dryStopped": "Drying stopped",
      "msg.gcodeSent": "G-code sent", "msg.noSample": "Sample not found (Demo unavailable on printer)",
      "msg.pausing": "Pausing…", "msg.resuming": "Resuming…", "msg.cancelling": "Cancelling…",
      "confirm.print": "Start printing:\n{name} ?", "confirm.delete": "Permanently delete:\n{name} ?",
      "confirm.pause": "Pause the print?", "confirm.cancel": "Cancel the print?",
      "to": "to"
    },
    pt: {
      "app.subtitle": "CFS Panel",
      "status.off": "desconectado", "status.connecting": "conectando…",
      "status.connected": "conectado", "status.error": "erro",
      "btn.reconnect": "Reconectar", "btn.demo": "Demo",

      "cam.title": "Câmera", "cam.toggle": "ligar/desligar", "cam.off": "câmera desligada",

      "print.title": "Impressão atual", "print.none": "nenhum trabalho",
      "print.layer": "camada", "print.elapsed": "decorrido", "print.left": "restante",
      "print.pause": "Pausar", "print.resume": "Retomar", "print.stop": "Cancelar",
      "state.0": "Ocioso", "state.1": "Imprimindo", "state.2": "Concluído",
      "state.3": "Pausado", "state.4": "Erro", "state.5": "Cancelado",

      "temp.title": "Temperaturas", "temp.nozzle": "Bico", "temp.bed": "Mesa",
      "temp.chamber": "Câmara", "temp.readonly": "somente leitura",
      "btn.set": "Set", "btn.off": "Off",

      "misc.title": "LED & Velocidade", "misc.light": "Luz", "misc.speed": "Velocidade",
      "speed.silent": "Silencioso", "speed.standard": "Padrão", "speed.sport": "Esporte", "speed.ultra": "Ultra",

      "fan.title": "Ventiladores", "fan.model": "Modelo", "fan.case": "Caso", "fan.side": "Lateral",

      "tab.filament": "Filamento (CFS)", "tab.control": "Controle", "tab.files": "Arquivos",
      "tab.history": "Registros", "tab.video": "Vídeo",

      "cfs.selected": "Slot selecionado:", "cfs.selectHint": "selecione um slot", "cfs.empty": "(vazio)",
      "cfs.support": "suporte bobina",
      "btn.feed": "Carregar (Feed)", "btn.retract": "Retrair",
      "btn.refreshRfid": "Reler RFID", "btn.edit": "Editar slot",
      "cfs.auto": "AUTO (auto-refill)", "cfs.autofeed": "Auto-feed", "cfs.drying": "Secagem:",
      "btn.apply": "Aplicar", "btn.stopDry": "Parar",

      "ctrl.position": "Posição", "btn.homeX": "Home X", "btn.homeY": "Home Y",
      "btn.homeZ": "Home Z", "btn.homeAll": "Home Tudo", "ctrl.step": "Passo:",
      "ctrl.zoffset": "Z-offset (baby-step):", "ctrl.gcode": "Console G-code",
      "ctrl.gcodePh": "Enviar G-code (ex.: M104 S0)", "btn.send": "Enviar",

      "files.title": "Arquivos locais", "btn.refresh": "Atualizar",
      "files.hint": "Clique em Atualizar para listar.", "files.none": "Nenhum arquivo.",
      "btn.print": "Imprimir", "btn.delete": "Excluir",
      "history.title": "Histórico de impressões", "history.none": "Sem registros.", "history.hint": "Clique em Atualizar para listar.",
      "video.title": "Timelapses", "video.none": "Nenhum timelapse.", "video.hint": "Clique em Atualizar para listar.",
      "video.open": "abrir",

      "edit.title": "Editar slot", "edit.type": "Tipo", "edit.vendor": "Fabricante",
      "edit.name": "Produto", "edit.color": "Cor", "edit.min": "Temp mín", "edit.max": "Temp máx",
      "btn.cancel": "Cancelar", "btn.save": "Salvar",

      "msg.noConn": "Sem conexão", "msg.selectSlot": "Selecione um slot",
      "msg.loading": "Atualizando…", "msg.updated": "Atualizado", "msg.slotUpdated": "Slot atualizado",
      "msg.deleted": "Excluído", "msg.printReq": "Impressão solicitada",
      "msg.feeding": "Carregando filamento…", "msg.retracting": "Retraindo filamento…",
      "msg.rereadRfid": "Relendo RFID…", "msg.dryStopped": "Secagem parada",
      "msg.gcodeSent": "G-code enviado", "msg.noSample": "Amostra não encontrada (Demo indisponível na impressora)",
      "msg.pausing": "Pausando…", "msg.resuming": "Retomando…", "msg.cancelling": "Cancelando…",
      "confirm.print": "Iniciar impressão de:\n{name} ?", "confirm.delete": "Excluir definitivamente:\n{name} ?",
      "confirm.pause": "Pausar a impressão?", "confirm.cancel": "Cancelar a impressão?",
      "to": "→"
    }
  };

  var lang = localStorage.getItem("cfs_lang") || "en";
  if (!DICT[lang]) lang = "en";

  function t(key, params) {
    var s = (DICT[lang] && DICT[lang][key]) || (DICT.en[key]) || key;
    if (params) for (var k in params) s = s.replace("{" + k + "}", params[k]);
    return s;
  }
  function getLang() { return lang; }
  function setLang(l) { if (DICT[l]) { lang = l; localStorage.setItem("cfs_lang", l); apply(); } }

  function apply(root) {
    root = root || document;
    var els = root.querySelectorAll("[data-i18n]");
    for (var i = 0; i < els.length; i++) els[i].textContent = t(els[i].getAttribute("data-i18n"));
    var ph = root.querySelectorAll("[data-i18n-ph]");
    for (var j = 0; j < ph.length; j++) ph[j].setAttribute("placeholder", t(ph[j].getAttribute("data-i18n-ph")));
    document.documentElement.lang = lang === "pt" ? "pt-br" : "en";
  }

  global.I18N = { t: t, apply: apply, getLang: getLang, setLang: setLang };
})(window);
