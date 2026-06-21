# Creality Helper Script — CFS Edition

A fork of [Guilouz's Creality Helper Script](https://github.com/Guilouz/Creality-Helper-Script)
for rooted **Creality K1 / K1C / K1 Max** printers, adding first-class support for the
**CFS (Creality Filament System)**:

- 🖥️ **Creality CFS Panel** — a web dashboard (CrealityPrint "Device" style) to see and
  **control the CFS** from any browser, served on port **4410**.
- 🧩 **KAMP CFS-aware START_PRINT** — makes KAMP adaptive purging work on CFS machines by
  loading the filament **before** the purge.

Everything from the original Helper Script (Moonraker, Fluidd, Mainsail, KAMP, macros,
cameras, remote access, …) is still here — see the
[original Wiki](https://guilouz.github.io/Creality-Helper-Script-Wiki/) for those.

> ⚠️ For **rooted** K1-series printers. If you don't know what you're doing, follow the
> original Wiki first. Use at your own risk.

---

## Install (from this fork)

SSH into the printer and run:

```sh
git clone https://github.com/sandman21vs/Creality-Helper-Script-cfs.git /usr/data/helper-script
sh /usr/data/helper-script/helper.sh
```

Then, in the menu: **Install → 1** (Moonraker and Nginx) if you don't have it yet, then
**Install → 25** (Creality CFS Panel). KAMP is **Install → 6**.

<details>
<summary><b>If <code>git</code> is broken on the CFS Upgrade Kit firmware</b></summary>

Some CFS firmwares ship a broken `git`. Install it via Entware first
([credit](https://github.com/Guilouz/Creality-Helper-Script-Wiki/discussions/787)):

```sh
wget http://bin.entware.net/mipselsf-k3.4/installer/generic.sh -O - | sh
export PATH=/opt/bin:/opt/sbin:$PATH
opkg update && opkg install git git-http
mv /usr/bin/git /usr/bin/git.bak && ln -s /opt/bin/git /usr/bin/git
```
Then run the `git clone` above.
</details>

---

## New features

### 🖥️ Creality CFS Panel (port 4410)

Web dashboard served by the Helper Script's own Nginx (next to Fluidd/Mainsail), reachable
from any device on the LAN — no desktop app required. It talks to the printer over the
**same Creality WS:9999** protocol that CrealityPrint uses.

**Why it exists:** on a rooted K1 with a CFS, the only way to *control the CFS* (and most
device features) was the **CrealityPrint** desktop app — Fluidd/Mainsail don't expose the
CFS at all. This brings those features to the browser.

- **Filament / CFS:** see every slot (color, product/type, % left, active slot,
  box temp/humidity); **Load (Feed) / Retract**, **AUTO** / **Auto-feed**, **drying**,
  **edit slot**, **reread RFID**.
- **Device:** camera (MJPEG), current print (progress + **pause/resume/cancel**),
  temperatures, LED, fans, speed presets.
- **Control:** home, jog (XY/Z), Z-offset baby-step, **G-code console**.
- **Files** (with gcode thumbnails — print/delete), **Logs**, **Timelapses**.
- **EN/PT** language switch, **auto-connects** to the printer that serves the page.

Install: **Install menu → 25**. Then open `http://<printer-ip>:4410`.
Panel source / upstream: https://github.com/sandman21vs/creality-cfs-panel

### 🧩 KAMP CFS-aware START_PRINT

When **KAMP** is installed, its `START_PRINT` *replaces* the stock one — which on CFS
firmware is the macro that loads the filament from the box. The result is the well-known
problem where the **adaptive purge runs with no filament loaded** (empty purge / skipped
CFS load).

This fork's KAMP `Start_Print.cfg` restores the CFS flow: it calls `BOX_START_PRINT` at the
start and **loads/extrudes the CFS material before the purge** — only when a CFS is present.
No slicer start-gcode changes are required. Install KAMP via **Install menu → 6**.

---

## Why some things are done differently

- **CFS load is guarded by `printer.box`** (`{% if printer.box is defined %}` /
  `printer.box.enable`). Other CFS forks add `BOX_START_PRINT` unconditionally, which breaks
  **non-CFS** K1 printers (the macro doesn't exist there). The guard makes the same KAMP
  file safe on every K1.
- **Filament is loaded *before* the inline purge** instead of splitting the purge into a
  separate `ADAPT_PURGE_MOD` macro that you must add to the slicer's start g-code. Same
  result, but **no per-slicer configuration** needed.
- **Temperature waits (`M104`/`M140`, and KAMP's `M109`/`M190`) are kept**, so the purge
  still happens at temperature.
- **The panel uses WS:9999** (not just Moonraker) because that is the only transport that
  exposes CFS control — it's the same one CrealityPrint uses, so behavior matches.
- **Port 4410** sits right next to Fluidd (4408) and Mainsail (4409); the Nginx server block
  is injected idempotently between markers, so install/remove is clean and reversible.

---

## Credits & sources

- **[Guilouz](https://github.com/Guilouz/Creality-Helper-Script)** — the original Creality
  Helper Script this fork is built on. All the heavy lifting is theirs.
- **[Nik-oli](https://github.com/Nik-oli/Creality-Helper-Script-K1-CFS)** and
  **[gebauer](https://github.com/gebauer/Creality-Helper-Script-K1-CFS)** — for surfacing
  the KAMP-on-CFS `START_PRINT` purge issue and the `BOX_START_PRINT` approach, which this
  fork re-implements in a guarded, slicer-agnostic way.
- **[KAMP](https://github.com/kyleisah/Klipper-Adaptive-Meshing-Purging)** — adaptive
  meshing & purging.
- The **CFS Panel** web app: https://github.com/sandman21vs/creality-cfs-panel
  (material catalogue derived from the OrcaSlicer CFS fork / K2-RFID community projects).
- Community knowledge: Guilouz Wiki discussions
  [#787](https://github.com/Guilouz/Creality-Helper-Script-Wiki/discussions/787),
  [#760](https://github.com/Guilouz/Creality-Helper-Script-Wiki/discussions/760),
  [#797](https://github.com/Guilouz/Creality-Helper-Script-Wiki/discussions/797).

The original guide for everything else remains the
**[Creality Helper Script Wiki](https://guilouz.github.io/Creality-Helper-Script-Wiki/)**.
