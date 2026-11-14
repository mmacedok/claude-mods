# FunMeter changelog

## 0.8.16 (2026-11-13)

- Agent flasks are readable: the name alone under the flask, bigger and uncut; the total and the agent's share inside the glass.
- No close button on the desktop flasks (the native button covered them); a finished agent leaves on its own after 5 minutes instead of 10.

## 0.8.15 (2026-11-13)

- Codex's colour is the green #00AD29.

## 0.8.14 (2026-11-13)

- The ✕ that closes an agent flask is hidden over its top corner and shows only while the pointer is over that flask (no layout shift).

## 0.8.13 (2026-11-13)

- The agent flask's label reads name, weekly % and, in the bright colour, +what that agent alone consumed ("Sol 43% +3%"). Names longer than 7 letters are cut.

## 0.8.12 (2026-11-13)

- Codex's colour is a shocking neon yellow (#FFF01F) instead of green.

## 0.8.11 (2026-11-13)

- Agent flasks: each agent in use is a flask like the 5h/wk ones, in the row beside them, in its provider's fixed colour (Gemini blue, Codex green, Claude orange), filled up to the weekly limit. The part already used when the agent started is matte and still; what the agent spent is bright, with the glow, bubbles and the drop while it runs. The label is the agent's name and the weekly %, red/grey/gold on error/stopped/limit; ✕ beside it closes the bar.
- The terminal keeps the agent text rows.

## 0.8.10 (2026-11-13)

- The button panel sits on the bottom edge of the band, level with the flasks' base.

## 0.8.9 (2026-11-13)

- The buttons work again: back to plain native buttons (the label drawn as a Text inside the button, in a fixed cell, came out cut as "Mo…" and did not press). Labels padded to the same width, as in 0.8.7.
- The button panel sits in the middle of the band's height instead of at the top.

## 0.8.8 (2026-11-13)

- New look: chrome caps and bases, thick glass and a metal stand for the flasks and the battery; the context tube is a glossy liquid with a wavy edge, bubbles and coloured droplets; a soft glow on the liquids.
- The flasks and the battery moved out of the right panel into a row beside the mascot, under the metrics, at 80% size: the band is shorter and the empty area is gone. The right panel keeps only the buttons.
- The four buttons are cells of the same size, centred labels, rounded, with an even gap.
- Agent rows are plain lines without an outline (a new agent design comes later).
- The terminal never takes the Svg branch, even where a surface table lists Svg.

## 0.8.7 (2026-11-13)

Data fixes from the review:

- Codex rollouts above 4 MiB are read by their last 256 KiB (they froze the Codex quota), and a newest rollout without limits falls back to an older one.
- Quota measuring no longer blocks tool calls: it runs after the call, only for real job tools or commands that start with the CLI, never for a denied or failed call, and concurrent reads share one run.
- Weekly attribution: a weekly reset resets the running bars, the first rise after a start is counted, the fresher Codex reading wins, and the readers run one at a time.
- Bars: a resumed subagent or a teammate's new turn reopens its bar; bars that stop without an end time get one and expire; the task request goes only to agent types that have tasks; a failed TaskCreate is not counted.
- Pending jobs expire even when the live folder is missing and are dropped when the call is denied or fails.
- Only a real answer counts as a reply and celebrates, and a new celebration cancels the previous timer; Clear also resets bars, pending jobs, weekly accounts and main-loop tokens, in parallel.
- The bar polling sleeps when no agent is running or just finished; data timestamps use the engine clock.
- 11 new tests (39 in all).

## 0.8.6 (2026-11-13)

Fixes from a three-agent review:

- Drawing caches keep the most used entries (64, was 12 first-in-first-out): a session with many agents no longer evicts the tube and flasks, which restarted their animations.
- Flasks, battery and agent tubes are cached by their numbers instead of rebuilt on every frame; the context tube falls back to the plain bar if its SVG ever passes the size limit.
- The band no longer reads the Gemini and Codex quotas it does not draw, and the weekly attribution only writes when something changed (it redrew the band every 2 s) and no longer overwrites bars changed meanwhile.
- The button grid keeps its width without the flasks, and the labels are equal on the terminal.
- lerCodex: no unchecked index (the two old type errors), and a rate_limits line without numbers falls back to an earlier one.
- The last good band is kept per surface, so a desktop tree never reaches the terminal.

## 0.8.5 (2026-11-13)

- Every animation is a seamless loop: the mascot's legs and spin, the flasks' drop, splash and bubbles, the battery's light band and the blobs end where they start (docs/checar-loops.cjs checks all of them).
- The four buttons sit in a grid of equal cells that fills the panel; labels keep the padding as a fallback.
- The band is aligned to the top, with the mascot at the bottom left; each agent's action goes on its own line under its tube instead of being cut with "…".

## 0.8.4 (2026-11-13)

- The mascot sits on the left of one column (tube, measures, agent rows, skills) instead of leaving an empty corner above it; with agents it lines up with their rows, without them it sits in the middle.
- The measures fit in two lines: this conversation's tokens by type with the agents' summary ("3 agents · 2 active · 1 done"), then hit, cost, speed and reset. The session totals left the band.

## 0.8.3 (2026-11-13)

- Layout as in the mock-up: the tube and the measures on top, the mascot below them beside the agent rows, and the panel on the right.
- The flasks and the battery are taller and further apart, on one shelf; the four buttons are back in a 2×2 grid, padded to the same width.

## 0.8.2 (2026-11-13)

- Panel buttons: Mods, Stats and Clear spread across the panel, one under each flask, with Handoff centred below. The fixed-width columns are gone (the app does not stretch its buttons, so they left gaps).

## 0.8.1 (2026-11-13)

- Panel fixes: the buttons no longer sit on top of the flask labels, the four buttons line up as a grid, and the battery label is "24h" so it reads at the same size as the others.

## 0.8.0 (2026-11-13)

- Agent bars get their final look: one row per agent with a glass tube for its provider's weekly limit. The matte part is the weekly use when the agent began; the bright part on top is what the agent added, with a white divider and a pointer so even 1% reads. While the agent runs the tube ripples, glows and shimmers; done, error, stopped and out-of-quota each have their own colour.
- Agent rows only show for agents in use: a finished one leaves by itself after 10 minutes (or at once with its close button). At most four rows show; the rest are counted.
- The flasks and the battery are redrawn wider, with a collar, feet and a shared shelf, inside one framed panel; the buttons sit under them in a 2×2 grid.
- The metrics line counts the agents and how many are active.

## 0.7.0 (2026-11-13)

- Agent bars replace the agent boxes: one bar per Claude subagent and per Gemini or Codex job, named after its model (Hydrogen, Sol, Haiku; "Sol 2" when one repeats), with its effort, what it is doing now, its task count (3/7) and a close button.
- Each bar is measured on its provider's weekly limit: it starts from the weekly use when the agent began, and adds what the weekly went up because of it. Agents running together split the rise by the tokens each one used; the main loop's share of the Claude weekly is left out.
- Gemini and Codex jobs are read from the live status files their MCP servers now write (<id>.live.json, every event); Claude subagents from their own events, and their prompt asks for a task list.
- The look of the bars is provisional; the final design is planned in docs/AGENTES-PLANO.md.

## 0.6.0 (2026-11-12)

- The mascot is redrawn in vector, comic style: ink outline, flat colour with a hard-edged shadow and a band of halftone dots, a rim light and a white glint. Its motion is eased instead of stepped (squash and stretch, rotation, arms that swing from the shoulder), and it has a mouth for the expressions that need one.
- Idle is a 60 s cycle of scenes over breathing and blinking: looks around, waves, yawns and stretches, a somersault, juggles the token-coloured balls until the last one lands on its head, types on a laptop while a code window writes itself, dances with music notes, falls down a cartoon hole (after pedalling in the air) and jumps back out, sneezes, and dozes off with rising z z z until it wakes with a start.
- Working (6 s): types with its eyes running over the screen and code symbols floating up, stalls, scratches its head and thinks, a light bulb pops, and it types faster. Happy (2.4 s): a star jump through a burst of confetti, a squash on landing and two cheering hops.
- The frame-by-frame pixel idles (tap dance, jelly, sneeze) and the cable scene are gone with the pixel-art mascot; the sneeze returns as a vector scene.

## 0.5.18 (2026-11-12)

- The context tube is sized by the context the engine measured. It used to be drawn from the token total of the last turn, which adds up every call of the turn: a long turn (2M of cache reads across many calls) filled the whole tube while the context sat at 18%. The colours keep the proportion between token types; the numbers under the tube are still the turn totals.
- The handoff warning uses the measured context too, so it no longer reports millions of tokens of history after a long turn, and the first-message floor can never be larger than the measured context.

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
