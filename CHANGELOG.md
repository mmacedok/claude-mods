# FunMeter changelog

## 0.5.17 (2026-11-12)

- Spacing pass on the band. The buttons moved out of the column that held the limit tubes into a footer row (agent boxes and skills on the left, buttons on the right): they are wider than the tubes and left a hole between the context tube and the vials. The context tube now runs all the way to the vials.
- The numbers under the tube are two lines by meaning instead of one that wrapped wherever it ran out of room: token types first, then cache hit, cost, speed and the 5h reset.

## 0.5.16 (2026-11-12)

- Art pass on the limit tubes and the daily battery. The 5h and weekly tubes are now glass vials with a rounded bottom, brushed-metal caps, measure marks, a long glass reflection and gel with volume (cylinder shading, a second wave behind, a lit surface line, rising bubbles) that casts a soft glow, pulsing from 80%. The drop grows on the nozzle, stretches as it falls and splashes: a ripple and two uneven droplets.
- The battery has a metal case and terminal, charge that reads as light (a sheen climbing through it, a lit top line, cell dividers), a lightning bolt with a breathing glow (a red outline when empty), a real blurred halo in gold or red instead of a stroke, sparkles that grow and shrink, and a pink number when negative. The "Energy" label no longer loses the tail of the g.
- The context tube got brushed-metal rings with grooves, glass that darkens into each ring, measure marks at 25, 50 and 75% of the window and a softer reflection.

## 0.5.15 (2026-11-11)

- The daily battery is now one of seven per week (1/7 of the weekly limit = 100%) and turns over at local midnight instead of in 24h blocks from the reset. What is left carries into the next day (the battery goes above 100% and glows gold while the extra lasts); going past the day goes negative and is taken from tomorrow. The label reads "Energy" (it shrinks to fit) and nothing is stored anymore.
- Agent boxes (Gemini, Codex) show only what this run spent: the quota is read before the first call to that agent and again after each call, and the box shows the difference. A small ✕ closes the box; the next call starts a new run. Each agent gets a random sci-fi codename per run (never the same as the other's); the box color still tells them apart (blue Gemini, teal Codex).

## 0.5.14 (2026-11-08)

- Agent boxes are compact: a tinted background instead of a border, so each takes one line, and smaller meters so Gemini and Codex fit side by side. "Skills: none" is hidden when no skill was used.

## 0.5.13 (2026-11-08)

- Agents in boxes: Gemini (blue, the Google plan quotas) and Codex (teal, the ChatGPT plan 5h and weekly limits) each get a bordered box with their meters. Codex limits are read from its latest session file, at no cost.

## 0.5.12 (2026-11-08)

- Layout: the limit tubes and the buttons now sit in a column on the right, so the token numbers stay in a row under the context tube instead of stacking one per line. Gemini meters no longer break their labels.

## 0.5.11 (2026-11-07)

- New `24h` battery: it starts each 24 hours full and drains as you use your share of the weekly limit, the share that makes the week last until it resets. Past the share the number goes negative and the empty battery blinks red. Stats shows the detail in points of the week.

## 0.5.10 (2026-11-07)

- Handoff now really deletes the old session. The delete command was malformed, so old sessions were piling up. The file is deleted permanently, not moved to the Recycle Bin.
- The old session is kept if the summary could not be saved, and the toast now says what actually happened, checked against the file itself.

## 0.5.9 (2026-11-06)

- Animations: the mascot's idle blinks and dance steps now play at their real timing (rounded key times were swallowing almost half of them), and a happy sparkle with an invalid key time is fixed.
- Bubbles in the gel no longer pop in and out at the ends of the tube, whatever their size. The small white bubbles travel a fixed path, so they no longer jump when tokens grow.
- The expired-cache warning and the Handoff button now work on a resumed session before the first message. `/resume` inside a running process no longer keeps the previous conversation's numbers.
- Handoff keeps the session title on sessions over 4 MiB, on Windows.
- Cost estimate: added the missing models, including Haiku 5.5, which was being priced 40x too high. The longest matching model id now wins.
- A context window of 0 or an invalid value no longer breaks the tube. Number formatting no longer shows `1000k`, and an invalid reset time no longer shows `NaNh`.
- The tube is only redrawn when its numbers change, the stats pane no longer rereads logs that have not changed, and caches are kept per session with a size limit.

## 0.5.8 (2026-11-06)

- Removed the blobs after the gel, along with the space reserved for them and the dotted 100% mark. The whole tube is now 100% of the context window.
- Bubbles inside the gel no longer have a dark outline.

## 0.5.7 (2026-11-06)

- Bubbles are easier to see: larger minimum size and a stronger outline. A very small share now gets a bubble bigger than its true area, so it still shows.

## 0.5.6 (2026-11-06)

- New warning when the last reply was 1 hour or more ago: the cache has expired, so the next message writes the whole context again. It also works on a resumed session, and it goes away with ✕ or the next reply.
- Input and output now follow the same rule as cache write: under 12% of cache read they are bubbles in the orange gel, and from 12% up they are their own layer.
- Bubbles move more like they are in a liquid. They run faster in the middle of the tube than near the glass, speed up and slow down, drift up and down, and stretch a little along the flow.
- The 5h and weekly tubes now sit on the bottom line of the band, next to the buttons.

## 0.5.5 (2026-11-06)

- While cache write is under 12% of cache read, it now shows as white bubbles flowing through the orange gel, with a total area that matches its share. From 12% up it is its own layer, right after the orange, at true scale.
- Tube animations no longer restart when tokens are spent. Each animation now starts in the phase the clock gives it, so redrawing the tube carries the motion on from where it was.

## 0.5.3 (2026-11-06)

- The Mods, Stats, Clear and Handoff buttons now stay on the bottom line of the band instead of shifting up and down when the stats next to them wrap.

## 0.5.2 (2026-11-04)

- The `/stats` command is now `/funstats`. Claude Code reserves `/stats`, so the old name was refused, which also skipped the rest of the mod's startup, including the Gemini refresh while the Stats pane is open.

## 0.5.1 (2026-11-04)

- Fixed a terminal window that flashed on screen about every 15 minutes on Windows. It came from the Antigravity CLI auto-updater, so the quota read now runs with that updater off. The CLI still updates itself when you use it directly.
- Open sessions now share one quota read, saved in `~/.claude/funmeter-cotas.json`, instead of each running its own.
- Fixed the home folder lookup. In 0.5.0 it came back empty, so the Gemini quota, Handoff files and Gemini job logs pointed to the wrong folders.

## 0.5.0 (2026-11-04)

- Renamed from `medidor` to FunMeter. The plugin is now `funmeter@claude-mods`, so uninstall `medidor@claude-mods` before installing it.
- Handoffs now save to `~/.claude/funmeter-handoffs`, and Gemini job logs are read from `~/.claude/funmeter-gemini-logs`. Existing files in the old folders are not moved.
- Docs and release notes are now in English.

## 0.4.2 (2026-11-04)

- Input, cache write and output now show as blobs in the tube, sized by token count.
- Blobs slowly change shape in a seamless loop and never touch each other.
- When a type's slice of gel reaches 20 px wide, its blob joins the gel and disappears.
- The right end of the tube is reserved for blobs, and a dotted mark shows where 100% of the context is.
- The tube went from 24 to 32 px tall.

## 0.4.1 (2026-11-04)

- Bigger limit tubes that go from green to red as usage grows.

## 0.4.0 (2026-11-04)

- Response speed in tok/s.
- Two vertical tubes for the 5-hour and weekly limits, with a falling drop and gel building up.
- Stats button and `/stats` command, with usage by model.
- Gemini bars only appear after they have been used.
- The tube now reaches the percentage at the end of the line.

## 0.3.0 (2026-11-04)

- A gel tube replaces the plain bar.
- Compact numbers, like `259k` and `8.10M`.
- Gemini quota in the band.

## 0.2.0 (2026-10-18)

- Tap dance, wobble and sneeze added to the idle mascot cycle.

## First version (2026-10-07)

- First marketplace release: context bar by token type, totals, estimated cost, skills used and Handoff.
