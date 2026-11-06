# Sheep Meadow

A local-multiplayer browser playground with a soft 3D meadow, configurable sheep and a timed dragon encounter. Static HTML, CSS and JavaScript with Three.js and a Canvas fallback.

## Controls

Up to four independently exposed Gamepad API devices. Press A to join; stick/D-pad moves, A jumps, X baas, B chomps (or breathes fire as a dragon), Y changes hats, RB changes wool.

Choose Keyboard / touch for one shared keyboard sheep: WASD/arrows move, Space jumps, X baas, B chomps/fires, H changes hats, C changes wool. Each player's Wool button changes only that sheep. Colors cycle light blue, pink, yellow, purple. Hats and wool are independent.

Music and effects have separate switches. A click may be required to activate audio. Full screen uses an edge-to-edge playfield; expanded view still works when browser fullscreen is unavailable. Xbox Edge needs “Use game controls.” Multiple physical controllers must appear as separate browser gamepads; hardware compatibility is not guaranteed.

## Play

A valid forward bite removes one health and briefly glows/shakes the victim red. Three ordinary hits cause a cartoon knockout with a short original “wah-wah.” Respawn takes five seconds and preserves selected cosmetics. Reduced-motion preferences suppress the hit shake and reduce decorative movement.

After three active minutes, one bouncing/rolling egg appears. Its third valid bite grants the biter 30 seconds as a red dragon. The scene darkens and boss music replaces the meadow track. B breathes fire in a forward cone, causing a cartoon charcoal/furless/upside-down knockout. No gore. When power ends, the normal sheep, scene and music return; the next three-minute egg interval starts. One egg or dragon is active at a time. Timers pause when the page is hidden, independent controls retain their slots across reconnects, and near-simultaneous bites resolve deterministically.

## Build and test

Requirements: Node.js and npm.

1. `npm ci`
2. `npm run build` rebuilds `dist/meadow3d.js` from `src/meadow3d.js`.
3. `for f in tests/*.cjs tests/*.mjs; do node "$f" || exit 1; done`

Host `dist/` with any static HTTP server. Assets use relative URLs for subdirectory hosting. No backend, external login, chat or data collection is implemented. The committed runtime assets are ready to serve.

For local testing only, localhost/127.0.0.1 with `?qa=1` exposes accelerated encounter tools under Controller check. Those tools are not enabled on public hostnames. Normal egg/power timers are 180/30 seconds.

## Third-party licenses

Keep `dist/audio-credits.html` and its visible game link. The runtime uses:

- Three.js 0.180.0: MIT, Copyright 2010–2025 Three.js Authors. Full license in `THREE-LICENSE.txt`, bundled copyright/SPDX notice in `dist/meadow3d.js`.
- esbuild 0.25.10: MIT, development/build dependency only.
- Sheep baa: Michael Perfect, CC0. https://freesound.org/people/michaelperfect/sounds/710296/
- Apple Bite: phatcorns, CC0. https://freesound.org/people/phatcorns/sounds/250106/
- Dragon fire: scarbelly25, “flamewind.wav,” CC0. https://freesound.org/people/scarbelly25/sounds/33943/ . Public HQ preview shortened to 0.75 seconds, faded, reduced in volume and re-encoded.
- Meadow music: “Dream Culture” by Kevin MacLeod (incompetech.com), CC BY 4.0. https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1300046 . Re-encoded at 96 kbps / 32 kHz, played quietly and repeated with its natural quiet ending.
- Boss music: “Video Dungeon Boss” by Kevin MacLeod (incompetech.com), CC BY 4.0. https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1200065 . Adapted 30-second excerpt with fades and reduced volume.

CC0: https://creativecommons.org/publicdomain/zero/1.0/
CC BY 4.0: https://creativecommons.org/licenses/by/4.0/

The knockout sound is an original Web Audio synthesis, not a sampled third-party recording. Third-party code/assets retain their own licenses; no project-wide license has been selected for the original game code. No reference images or videos are bundled.
