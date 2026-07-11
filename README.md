# Destructor

A web-based Electribe-style groovebox for jungle and rave — open it in as many browser windows as you want, including a VJ desk powered underneath by [Constructor](https://github.com/s4y/constructor).

One window can run the full machine. Another can be just the break chopper. Another can be fullscreen visuals on a projector. Same session, synced over the local network. Host plays the audio; everything else is a controller.



## How it works

Run the tiny LAN server, open a host window, then open more windows (or phones, or a projector) pointed at the same session:

```bash
node server.mjs
```

| Window | URL |
|--------|-----|
| Full groovebox (host) | `http://<lan-ip>:8765/?s=CODE&view=full&role=host` |
| Break only | `…&view=break&role=ctrl` |
| Seq + FX | `…&view=seq,fx&role=ctrl` |
| VJ / projector | `…&view=visuals&role=ctrl` |
| Solo, offline | open `breakbox_1.html` with no `?s=` |

Port **8765** by default. Session code prints on launch (or set `SESSION`). No npm install, no build — just Node and a browser with Web Audio + WebGL.

Views you can mix: `full`, `transport`, `break`, `fx`, `seq`, `mixer`, `visuals`.

## The groovebox

Electribe energy in the browser: patterns, pads, knobs, LCD — not a DAW timeline.

- **Transport** — play/stop, BPM 80–220 (default 172), key/scale, master XY filter, 16-song jungle bank
- **Break** — 16-slice chopper (STEP / SLICE / PITCH / RETRIG / RAMP / REV), glitch pads, live latch FX, load your own break or use the synthesized amen
- **Amen drums** — kick / snare / ghosts / hats with Motion Rec and A–D presets
- **FX** — three Electribe-style slots (delay, grain, reverb, decimator, filters, modulation, distortion…) in parallel or series
- **Seq** — Hoover, Rhodes, 303 acid, rave strings, and sub on a shared step grid
- **Mixer** — mute, solo, level, FX assign

## The VJ section (Constructor underneath)

Destructor’s visuals panel is a four-channel VJ mixer — crossfader, preview/program, take, blackout, mute/solo/cue — with Constructor’s audio-reactive WebGL engine under the hood.

You get tools, knobs, and presets. No shader editor. The stage listens to the master bus (FFT + beat) and paints tunnels, plasma, flake, lasers, smoke, grids, and more. Fifteen scene presets load full A/B setups ready to ride.

Open `view=visuals` on a second screen or projector and perform lights while someone else (or another window) plays the box. Full GLSL authoring still lives in standalone [Constructor](https://github.com/s4y/constructor); this is the machine-side desk wired into Destructor.

## Keyboard

| Keys | Action |
|------|--------|
| Space | Play / stop |
| `1`–`0`, `-`, `=` | Slices 1–12 |
| `Q W E R T Y U I` | Slices 13–16 |
| `1`–`4` | Visual channel select (Shift variants cue / select by view) |
| `M` / `S` / `C` | Mute / solo / cue to PVW |
| `A` `D` or ← → | Nudge crossfader · `Z` / `X` snap A / B |
| Enter / `B` / `P` | Take / Blackout / toggle PVW·PGM |

## Files

```
breakbox_1.html   # groovebox + embedded Constructor visuals
server.mjs        # static host + WebSocket sync
```

```
Parts → FX → master → speakers
                 ↘ AnalyserNode → Constructor VJ engine
```

One host plays audio; peers sync state, playheads, and slice hits over WebSocket. Env: `PORT`, `SESSION`.
