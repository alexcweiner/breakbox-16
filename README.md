# Destructor

Jungle / rave groovebox — *chop · glitch · rave*.

**Destructor** is the audio machine. **[Constructor](https://github.com/s4y/constructor)** is the visuals pair: a live audio-reactive WebGL shader desk. Destructor embeds a Constructor-style engine (master bus → FFT → GLSL) behind **tools, knobs, and presets only** — no shader editor.

Current build ships as `breakbox_1.html` (UI title still reads BREAKBOX-16 MKIII).

## Quick start

```bash
node server.mjs
```

- Default port **8765** (`PORT` env). Session code is printed (or set `SESSION`).
- **Host (plays audio):** `http://<lan-ip>:8765/?s=CODE&view=full&role=host`
- **Projector:** `http://<lan-ip>:8765/?s=CODE&view=visuals&role=ctrl`
- **Solo:** open `breakbox_1.html` directly (no `?s=` → offline, no LAN sync)

Zero npm dependencies. No build step. Needs a modern browser with Web Audio + WebGL.

## App features

### Transport

- Play / stop, BPM **80–220** (default **172**), key + scale (Minor, Major, Harmonic minor, Phrygian)
- Master XY pad (filter / resonance)
- **16-song bank** — progressive jungle arrangement:
  - 01 Intro Pads → 02 Bass Enters → 03 Break Drop → 04 Acid In
  - 05 Groove A → 06 Hoover In → 07 Peak A → 08 Breakdown
  - 09 Rebuild → 10 Acid Filter → 11 Rhodes Pass → 12 Peak B
  - 13 Chop Lab → 14 Mentasm → 15 Final Peak → 16 Outro
- LCD display, session bar for view switching

### Break

- **16-slice chopper** with lanes: STEP, SLICE, PITCH, RETRIG, RAMP, REV
- Waveform canvas — click to trigger slices
- Glitch pads: Shuffle, Reverse, Stutter, Pitch chaos, Ramp chaos, FULL CHAOS
- Live latch FX: loop ¼ / ⅛ / 1 / 16 bar, half-speed, scramble, pitch fall/rise, reverse all, gater
- Load your own break (WAV/MP3) or use the **synthesized amen**
- Bitcrush slider
- Chop styles used in songs: linear, jungle, science, half-time, stutter, sparse, rise

### Amen drum builder

- Kick / snare / ghost / closed hat / open hat
- Per-voice knobs (pitch env, click, sub, drive, ADSR, …)
- Drum step grid with ghost velocities on snare
- **Motion Rec** — twist knobs while playing to record per-step automation
- Preset slots **A–D** per voice (e.g. Kick: Amen, 808, Tight, Boom)

### FX

Three ESX-style slots (type + two edit params). Defaults: BPM Delay / Grain / Reverb.

- Thru, BPM Delay, Short Delay, Grain Shifter, Decimator, MG Filter
- Chorus/Flanger, Phaser, Ring Mod, Distortion, Compressor, Reverb
- Chain modes: Parallel, 1▸2, 2▸3, 1▸2▸3

### Seq (synth rack)

Five voices sharing a multi-voice sequencer grid:

- **Hoover** — rave stab
- **Rhodes** — FM electric piano, chord mode
- **303 Acid** — resonant line with slide
- **Rave strings** — pad with vibrato / chorus
- **Sub bass** — square / sine / saw sub

Per voice: tone / amp / time knobs, degree pen (0–8), **A–D sound presets**, pattern presets (Clear, Offbeat, 4-floor, Arp, Acid line, Random). Toggle voices onto the shared grid with **▤ Seq**.

### Mixer

Per-part mute, solo, level, and FX assign (same rack panel as Seq).

### Visuals (embedded Constructor)

Constructor-style reactive stage — knobs and presets, no GLSL coding. Four-channel VJ mixer:

- **4 channels** — live strip **thumbnails**, tool, level fader, **mute / solo / cue**, **A / B / AB** routing
- **Presets** — each loads a full **4-channel setup** (tools on A/B buses ready to xfade)
- **Crossfader** — EQ (equal-power) or CUT curve; snap A / center / B; AB routes bypass the xfade
- **PVW · PGM** — tap a strip thumb or **C** to preview that channel in PVW without changing edit focus; channel select only edits
- **Take / Blk** — Take sends cue channel to program (AB + center xfade); Blackout kills PGM only
- **Swap / Copy→Cue** — exchange or copy edit↔cue channel settings
- **Tools:** Tunnel, Pulse, Mirror, Flake, Plasma, Laser, Scan, Glitch, Field, Blob, Smoke, Water, Aurora, Dust, Lattice, Voronoi, Stars, Ribbon, Hex
- **Master knobs:** Intensity, Hue, Speed, Trail, Flash, Beat sync
- **Deck blend:** Mix, Add, Screen, Diff, Flake
- **Flake extras:** 6 palettes (Rave, Acid, Neon, Ice, Fire, Mono), split grid, kernels (Bright / Hue / Chaos / Warm / Avg), dual inputs (Wave / Ring / Spec / Noise)
- **15 presets:** Rave, Hypno, Chop, Ice, Chaos, Deep, Soft, Wire, Acid, Drift, Grid, Strobe, Smoke, Laser, Cells
- **Projector mode:** `?view=visuals` → fullscreen stage + slim control strip

Standalone [Constructor](https://github.com/s4y/constructor) remains the place for full shader authoring; this panel is the machine-side subset wired to Destructor’s master bus.

### LAN session

- One **host** plays audio; **ctrl** clients are UI-only
- WebSocket sync: full state snapshot, step playheads, slice trigger commands
- URL params:
  - `s` — 4-char session code
  - `role` — `host` | `ctrl`
  - `view` — `full`, `transport`, `break`, `fx`, `seq`, `mixer`, `visuals` (comma-separated, e.g. `view=break,fx`)
- Same Wi‑Fi required. Controllers default to `role=ctrl`.

### Keyboard

- **Space** — play / stop
- **1–0, -, =** — slices 1–12
- **Q W E R T Y U I** — slices 13–16
- **Visuals chops** (`view=visuals` / projector, or with focus in the visuals panel):
  - **1–4** — select channel to edit (use **Shift+1–4** in full view); in viz-only view **Shift+1–4** cues to PVW
  - **M / S / C** — mute / solo / **cue to PVW** (C does not steal edit focus)
  - **A · D** or **← · →** — nudge crossfader; **Z / X** — snap A / B
  - **Enter** — Take; **B** — Blackout; **P** — toggle PVW·PGM

## Code features

### Layout

```
breakbox_1.html   # Destructor app (audio + embedded visuals)
server.mjs        # LAN host — static files + WebSocket relay
README.md
```

### Architecture (`breakbox_1.html`)

Single-file HTML/CSS/JS (~6k lines). Rough flow:

```
state (S, FX, INSTS, CHANS, …)
  → song / composition builders
  → LAN session sync
  → Web Audio graph + transport
  → break synthesis (OfflineAudioContext)
  → sequencer / UI renderers
  → WebGL visuals (tools, decks, presets)
  → init
```

Notable APIs:

- `getSnapshot()` / `applySnapshot()` — LAN state round-trip
- `ensureAudio()` — lazy Web Audio graph (host only)
- `makeSynthBreak()` — offline-render amen → `AudioBuffer`
- `buildFX(i)` — rebuild FX slot on type change
- `composeSong(cfg)` — programmatic arrangement builder
- `applyVizPreset(id)` — load embedded visual preset from `VIZ_PRESETS`
- `initLAN()` — session / role / view from URL

### Audio graph

```
Parts → channel gains → FX slots → master gain
  → master filter (XY) → compressor → destination
  → AnalyserNode (FFT → visuals)
```

Break path: `breakIn → crusher → breakGate → break channel`.

### Visuals engine

- Per-tool GLSL programs + composite shader for multi-deck blending
- Ping-pong framebuffer for trails
- FFT texture from master `AnalyserNode`
- Beat phase from transport step index
- Presets live in the `VIZ_PRESETS` constant (not external files)

### LAN server (`server.mjs`)

Plain Node.js (built-in `http` only). Serves `/` → `breakbox_1.html`, implements a minimal text-frame WebSocket relay.

- Message types: `join`, `welcome`, `peer`, `state`, `step`, `cmd`, `error`
- `GET /api/session` → `{ session, port }`
- Env: `PORT` (default 8765), `SESSION` (fixed code, else random 4-char)

## Requirements

- Node.js (for LAN host)
- Browser with Web Audio API and WebGL
- Google Fonts loaded for UI (Chakra Petch, VT323)
