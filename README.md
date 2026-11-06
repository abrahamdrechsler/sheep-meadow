# Sheep Meadow

A small browser-based local multiplayer sheep playground. Static HTML, CSS and JavaScript with a Three.js renderer and a Canvas fallback. This export contains version 8.

## Play

Serve `dist/` with a static HTTP server. Each Xbox-compatible controller presses A to join (up to four independently exposed Gamepad API devices). Use stick/D-pad to move, A to jump, X to baa, B to chomp, and Y to change hats.

Enable Keyboard / touch for one shared keyboard sheep: WASD/arrows move, Space jumps, X baas, B chomps, H changes hats. A chomp has a short windup, directional range and cooldown. Three hits cause a cartoon knockout; the sheep respawns after five seconds.

Music and effects have independent switches. A click may be required to activate browser audio. In Xbox Edge, use its “Use game controls” mode. Multiple physical controllers must appear as distinct browser gamepads; hardware compatibility is not guaranteed.

## Build and test

Requirements: Node.js and npm.

1. Run `npm ci`.
2. Run `npm run build` to rebuild `dist/meadow3d.js` from `src/meadow3d.js`.
3. Run `for f in tests/*.cjs tests/*.mjs; do node "$f" || exit 1; done` for the automated tests.

The committed `dist/` can be hosted without rebuilding. Keep its files and `audio/` together. Assets use relative URLs so the game can be hosted in a subdirectory. Runtime assets are local; no external account, backend, chat or data collection is implemented.

## Third-party assets and licenses

- Three.js 0.180.0: MIT, Copyright 2010–2025 Three.js Authors. Full license is in `THREE-LICENSE.txt`; preserve the bundled notice in `dist/meadow3d.js`.
- esbuild 0.25.10: MIT; development/build dependency, not shipped as runtime code. Installed packages retain their upstream licensing metadata.
- Sheep recording: Michael Perfect, CC0. https://freesound.org/people/michaelperfect/sounds/710296/
- Apple-bite recording: phatcorns, CC0. https://freesound.org/people/phatcorns/sounds/250106/
- “Carefree” by Kevin MacLeod (incompetech.com), licensed under Creative Commons Attribution 4.0. https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400037 ; https://creativecommons.org/licenses/by/4.0/ . Re-encoded to 96 kbps / 32 kHz MP3, played quietly and repeated.

Keep the visible `dist/audio-credits.html` attribution page and its game link. Third-party assets retain their own licenses. No project-wide license has been selected for the original game code; the dependency and audio licenses do not grant a blanket license to that code. No reference images or videos are bundled.
