# FunMeter changelog

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
