# Semantic Versioning (SemVer) & Release Guidelines

This project strictly adheres to **Semantic Versioning 2.0.0** (`MAJOR.MINOR.PATCH`):

```
v MAJOR . MINOR . PATCH
    │       │       │
    │       │       └── PATCH: Bug fixes, small UI tweaks, typo/quote fixes (e.g. 1.0.0 -> 1.0.1)
    │       └────────── MINOR: New features added backwards-compatibly (e.g. new export format, sound effect toggle) (e.g. 1.0.0 -> 1.1.0)
    └────────────────── MAJOR: Breaking changes, architectural redesign, incompatible storage schema (e.g. 1.x.x -> 2.0.0)
```

---

## Strict Version Bump Rules for this Project

### 1. PATCH Bump (`+0.0.1`) — *Thode-bahut changes / Minor tweaks*
Always use a **PATCH** bump when:
- Adjusting CSS shadows, padding, colors, or font sizes.
- Adding a few new motivational quotes.
- Fixing a bug with the timer tick, checkbox click, or tooltip offset.
- Updating documentation or README typos.
- Optimizing internal functions without changing user-facing feature behavior.

*Example*: `1.0.0` → `1.0.1`

---

### 2. MINOR Bump (`+0.1.0`) — *New backwards-compatible feature*
Use a **MINOR** bump only when adding an entirely new capability without breaking existing user data:
- Adding sound chime effects or audio toggles.
- Adding data export/import (JSON/CSV backup).
- Adding keyboard shortcuts (e.g. `Ctrl + Shift + Space` to expand).
- Adding a new statistical view or graph mode.

*Example*: `1.0.1` → `1.1.0` (resets patch to 0)

---

### 3. MAJOR Bump (`+1.0.0`) — *Breaking changes only*
Never bump MAJOR for regular updates. Only reserved for:
- Migrating to a completely different framework or runtime that breaks existing configs.
- Re-architecting local database format requiring manual user migration.

---

## Release & Git Tagging Checklist
1. Update `"version"` in [`package.json`](file:///d:/Desktop/Desktop%20overlay%20component/package.json).
2. Document changes under [`CHANGELOG.md`](file:///d:/Desktop/Desktop%20overlay%20component/CHANGELOG.md).
3. Commit with semantic message:
   - `fix: ...` (triggers patch)
   - `feat: ...` (triggers minor)
   - `docs: ...` or `style: ...` (triggers patch)
4. Create Git tag: `git tag vX.Y.Z` and push: `git push origin vX.Y.Z`.
