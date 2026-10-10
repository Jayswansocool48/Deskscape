# Release checklist

The Pop!_OS project checklist. Deskscape is a free desktop app (offline unless you turn on the optional online library) with no accounts, payments, emails or data collection, so several items are met by not having that feature at all — each one says how.

## Project requirements

| Requirement | Status | How |
|---|---|---|
| Uninstall button that deletes all of the app | ✅ | Settings → **Uninstall Deskscape**: purges the package (app, icon, store listing, update source) and deletes your setup, media, log and autostart entry |
| Icon that stays in Applications and opens the app | ✅ | Desktop entry + icon (`data/io.github.jayswansocool48.Deskscape.*`), installed by the package; right-click actions: Customize, Open in a Window, Quit |
| Flatpak | ⚠️ Exception | A live wallpaper must draw on COSMIC's desktop layer, and COSMIC only allows that for apps **outside** the Flatpak sandbox (cosmic-comp hides layer-shell from sandboxed clients). As a Flatpak, Deskscape could only open as a separate window. So it ships as a regular `.deb` package instead, with the same easy install/update/uninstall and COSMIC Store listing. Decided Oct 9, 2026 |
| In the COSMIC Store | ✅ | The package installs its own store listing (`/usr/share/swcatalog/xml/deskscape.xml.gz`), so it appears under Installed and can be removed there. After public release, updates arrive in the store's Updates page from the published package source |
| Easy install | ✅ | One command from the install page (`curl … install.sh \| bash`), or `./install.sh` from a clone |
| Easy update | ✅ | Automatic in the COSMIC Store (Updates) or Settings → Check for updates, from the signed package source on GitHub Pages |
| Easy uninstall | ✅ | Settings button, COSMIC Store, or `./install.sh --uninstall` |
| On GitHub | ✅ | https://github.com/Jayswansocool48/Deskscape (public), listed in the `apps` catalog |

## The 20 items

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Privacy policy | ✅ | `PRIVACY.md`, linked from Settings → About and the install page |
| 2 | Terms of service | ✅ | `TERMS.md` |
| 3 | Refund policy | ✅ | In `TERMS.md`: free, nothing is charged, nothing to refund |
| 4 | Cookie policy | ✅ | In `PRIVACY.md`: no cookies or tracking storage |
| 5 | Cookie consent banner | ✅ N/A | No cookies, so no banner; the install page sets no cookies either |
| 6 | Checkbox consents | ✅ | Nothing is pre-checked; login autostart, ambient sound and the online library are off until you turn them on (presets with 360° skies ask before downloading); the lock screen only changes when you click to set it; presets ask before touching your real COSMIC taskbar (or follow your Always/Never choice); taskbar layouts, delete, reset and uninstall each ask first |
| 7 | No unnecessary data | ✅ | Only your setup, pins, last 12 opened apps and files you add, stored locally; now-playing, system stats and window states (for pausing — no titles or contents) are used live, never stored; goes online only for the optional, off-by-default online library, and only to download what you pick |
| 8 | Audit third-party SDKs | ✅ | three.js r169 (MIT, rendering; includes its GLTF and RGBE loaders) and gtk4-layer-shell 1.3.0 (MIT, places the wallpaper on the desktop layer; bundled). One third-party service, used only on request: the Poly Haven API (public CC0 asset library, no account or key, see `PRIVACY.md`). No analytics, ads or tracking SDKs |
| 9 | Remove dark patterns | ✅ | Quit, delete-data and uninstall are plain, visible buttons with honest confirmations; COSMIC changes (including the panel, dock, applets and pinned apps) are clearly labeled, backed up first and one click to restore; sounds can be turned off or down in one place; no nagging |
| 10 | Remove hidden fees | ✅ N/A | Free, no purchases |
| 11 | Remove fake reviews | ✅ | No reviews or testimonials anywhere, including the store listing |
| 12 | Remove unsupported claims | ✅ | README and store listing describe only features that exist; notes that desktop mode needs layer-shell |
| 13 | Accessibility alt text | ✅ | App buttons labeled "Open <app>", star buttons labeled "Pin/Unpin <app>", applet and pinned-app buttons labeled ("Move Sound earlier", "Unpin Files"), taskbar layout cards described, image widget has a description field, slideshow thumbnails labeled, moon and clock SVGs labeled, decorative graphics hidden from screen readers |
| 14 | Fix color contrast | ✅ | Editor uses a fixed high-contrast palette and warns when widget text vs card contrast is under 4.5:1 |
| 15 | Keyboard navigation | ✅ | Ctrl+E editor, Ctrl+Space app drawer, Esc closes, arrow keys between editor tabs, switches and segmented buttons are real buttons/checkboxes, visible focus rings, Enter opens the top search result |
| 16 | Add business details | ✅ | Publisher and contact in `TERMS.md`, `PRIVACY.md` the store listing (`<developer>`) and the package metadata |
| 17 | Age consent for kids' data | ✅ N/A | No personal data collected from anyone; store content rating OARS: none |
| 18 | Unsubscribe link in emails | ✅ N/A | Sends no emails |
| 19 | License fonts/images | ✅ | No bundled fonts or audio files (every sound is synthesized with Web Audio); the only bundled images are the preset previews, which are screenshots of Deskscape itself; original icon; 360° skies and models from the online library are Poly Haven CC0 (public domain) and credited in the editor; MIT licenses for three.js and gtk4-layer-shell included in the app |
| 20 | Data deletion request | ✅ | Settings → "Delete all my Deskscape data" (also restores COSMIC's look, taskbar and pinned apps), or uninstall to remove everything |

Also: respects the system "reduce motion" setting (or force it on/off in Settings).
