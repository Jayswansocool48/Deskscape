# Release checklist

The Pop!_OS project checklist. Aerie is a free desktop app (offline unless you turn on the optional online library) with no accounts, payments, emails or data collection, so several items are met by not having that feature at all — each one says how.

## Project requirements

| Requirement | Status | How |
|---|---|---|
| Uninstall button that deletes all of the app | ✅ | Settings → **Uninstall Aerie**: purges the package (app, icon, store listing, update source) and deletes your setup, media, log and autostart entry |
| Icon that stays in Applications and opens the app | ✅ | Desktop entry + icon (`data/io.github.jayswansocool48.Aerie.*`), installed by the package; right-click actions: Customize, Open in a Window, Quit |
| Flatpak | ⚠️ Exception | A live wallpaper must draw on COSMIC's desktop layer, and COSMIC only allows that for apps **outside** the Flatpak sandbox (cosmic-comp hides layer-shell from sandboxed clients). As a Flatpak, Aerie could only open as a separate window. So it ships as a regular `.deb` package instead, with the same easy install/update/uninstall and COSMIC Store listing. Decided Oct 9, 2026 (as Deskscape) |
| In the COSMIC Store | ✅ | The package installs its own store listing (`/usr/share/swcatalog/xml/aerie.xml.gz`), so it appears under Installed and can be removed there. After public release, updates arrive in the store's Updates page from the published package source |
| Easy install | ✅ | One command from the install page (`curl … install.sh \| bash`), or `./install.sh` from a clone |
| Easy update | ✅ | Automatic in the COSMIC Store (Updates) or Settings → Check for updates, from the signed package source on GitHub Pages |
| Easy uninstall | ✅ | Settings button, COSMIC Store, or `./install.sh --uninstall` |
| On GitHub | ✅ | https://github.com/Jayswansocool48/aerie (public), listed in the `apps` catalog |

## The 20 items

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Privacy policy | ✅ | `PRIVACY.md`, linked from Settings → About and the install page |
| 2 | Terms of service | ✅ | `TERMS.md` |
| 3 | Refund policy | ✅ | In `TERMS.md`: free, nothing is charged, nothing to refund |
| 4 | Cookie policy | ✅ | In `PRIVACY.md`: no cookies or tracking storage |
| 5 | Cookie consent banner | ✅ N/A | No cookies, so no banner; the install page sets no cookies either |
| 6 | Checkbox consents | ✅ | Nothing is pre-checked; login autostart, ambient sound, the online library and the AI assistant are off until you turn them on; choosing Claude or ChatGPT shows exactly what is sent before you save a key; presets with 360° skies ask before downloading; COSMIC changes suggested by the assistant need your click |
| 7 | No unnecessary data | ✅ | Only your setup, pins, last 12 opened apps and files you add, stored locally; window states, now-playing and system stats are used live, never stored; the assistant sends only your message and a design summary (no notes, to-dos, names or files), and conversations aren't saved |
| 8 | Audit third-party SDKs | ✅ | three.js r169 (MIT) and gtk4-layer-shell 1.3.0 (MIT), bundled. Third-party services, each only when you turn it on: Anthropic or OpenAI APIs (assistant, with your own key), a local Ollama, and the Poly Haven API (CC0 library). All calls are plain HTTPS from Aerie's own code, no SDKs. No analytics, ads or tracking |
| 9 | Remove dark patterns | ✅ | Quit, delete-data and uninstall are plain, visible buttons with honest confirmations; COSMIC changes (including the panel, dock, applets and pinned apps) are clearly labeled, backed up first and one click to restore; sounds can be turned off or down in one place; no nagging |
| 10 | Remove hidden fees | ✅ N/A | Free, no purchases |
| 11 | Remove fake reviews | ✅ | No reviews or testimonials anywhere, including the store listing |
| 12 | Remove unsupported claims | ✅ | README and store listing describe only features that exist; the assistant is described as optional and design-only, with its providers named; notes that desktop mode needs layer-shell |
| 13 | Accessibility alt text | ✅ | App buttons labeled "Open <app>", star buttons labeled "Pin/Unpin <app>", applet and pinned-app buttons labeled ("Move Sound earlier", "Unpin Files"), taskbar layout cards described, image widget has a description field, slideshow thumbnails labeled, moon and clock SVGs labeled, decorative graphics hidden from screen readers |
| 14 | Fix color contrast | ✅ | Editor uses a fixed high-contrast palette and warns when widget text vs card contrast is under 4.5:1 |
| 15 | Keyboard navigation | ✅ | Ctrl+E editor, Ctrl+Space app drawer, Esc closes, Ctrl+Z brings back a removed widget, the right-click menu works with arrow keys, Enter and Esc (menu key / Shift+F10 opens it), arrow keys between editor tabs, switches and segmented buttons are real buttons/checkboxes, visible focus rings, Enter opens the top search result |
| 16 | Add business details | ✅ | Publisher and contact in `TERMS.md`, `PRIVACY.md` the store listing (`<developer>`) and the package metadata |
| 17 | Age consent for kids' data | ✅ N/A | No personal data collected from anyone; the privacy policy points children to Ollama or no assistant, since Claude/ChatGPT accounts have their own age rules; OARS: none |
| 18 | Unsubscribe link in emails | ✅ N/A | Sends no emails |
| 19 | License fonts/images | ✅ | No bundled fonts or audio files (every sound is synthesized with Web Audio); the only bundled images are the preset previews, which are screenshots of Aerie itself; original icon; 360° skies and models from the online library are Poly Haven CC0 (public domain) and credited in the editor; MIT licenses for three.js and gtk4-layer-shell included in the app |
| 20 | Data deletion request | ✅ | Settings → "Delete all my Aerie data" (also restores COSMIC's look, taskbar, pinned apps, wallpaper/lock screen and profile picture), or uninstall to remove everything |

Also: respects the system "reduce motion" setting (or force it on/off in Settings).
