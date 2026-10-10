# Privacy policy

_Last updated: October 10, 2026 (version 1.2.0)_

Deskscape runs entirely on your computer.

- **No data is collected.** There are no accounts, sign-ups, analytics, telemetry, crash reporting, ads or third-party SDKs.
- **Offline unless you use the online library.** Deskscape's screen is a page served by its own small server that only listens on `127.0.0.1` (your own computer) and needs a random key that changes every time Deskscape starts. Updates are downloaded by Pop!_OS's normal updater / the COSMIC Store, not by Deskscape.
- **Online library (optional, off until you turn it on):** when you open it, or pick a preset with a 360° sky, Deskscape asks first, then downloads the catalog, small previews and only the skies or models you choose from Poly Haven (`api.polyhaven.com`, `cdn.polyhaven.com`, `dl.polyhaven.org`). Poly Haven sees an ordinary download request: your internet address and that it comes from Deskscape (its version). Nothing else about you, your files or your setup is sent. [Poly Haven's privacy policy](https://polyhaven.com/privacy) applies to those requests. You can turn it off in Settings → Online library; what you downloaded is kept in `~/.local/share/deskscape/library` and keeps working offline.
- **What is stored, and where:** your setup (including text you type in the Notes widget) and any images, videos or 3D models you add, in `~/.config/deskscape/` and `~/.local/share/deskscape/`, plus a small log in `~/.cache/deskscape.log`. If you turn on "Start when I log in", one file is added: `~/.config/autostart/io.github.jayswansocool48.Deskscape.desktop`.
- **Also stored, in your setup file:** the apps you pin to the dock and the last 12 apps you opened from Deskscape (for "Recently used" sorting), your to-do items, and looks you save (with a small picture of your desktop at that moment, kept in `~/.local/share/deskscape/media/`). Sound files you choose are copied there too and never leave your computer.
- **Your windows:** to pause while you use apps, Deskscape reads which windows are maximized, full screen, focused or minimized, and on which screen and workspace. It doesn't read window titles or contents, and none of this is stored.
- **What it reads, without storing it:** the list of installed apps and their icons (for the app widgets); CPU, memory, disk, battery and network speed (for the System monitor and graph widgets); and what your music or video player is playing (for the Now playing widget, and to fade the ambient soundscape out while music plays). These are only shown on your screen.
- **Changes to COSMIC:** only if you use the COSMIC tab or agree to a preset's matching taskbar. This can change COSMIC's glass, window, panel and dock settings, which applets your panel and dock show, and your pinned apps. Deskscape saves your original COSMIC settings in `~/.local/share/deskscape/cosmic-backup.json` first and puts them back when you click Restore, delete your data, or uninstall.
- **Profile picture:** if you change it from the Lock screen section, Deskscape hands the picture to your system's account service (AccountsService, as COSMIC Settings does) and keeps a copy of your previous picture in `~/.local/share/deskscape/` so Restore can put it back.
- **Lock screen:** if you set it from the COSMIC tab, the picture is saved in `~/.local/share/deskscape/lockscreen/` and set as COSMIC's wallpaper (COSMIC's lock and login screens show that picture). Restore, delete-data and uninstall put your original wallpaper back.
- **Sound:** all sounds are generated on your computer; Deskscape never records or listens to audio.
- **Cookies:** none. Deskscape uses no cookies or tracking storage, so there is no cookie banner.
- **Children:** Deskscape collects no personal data from anyone, including children.
- **Deleting your data:** Settings → **Delete all my Deskscape data** removes your setup, files you added and the autostart entry, and restores your original COSMIC look. Settings → **Uninstall Deskscape** removes the app and all of that data in one step (and the update source, if one was added).
- **Links and web search:** Quick links, the search widget's optional web search, and 3D objects set to open a website open them in your normal browser, whose own privacy policy applies.

Publisher: Jayswansocool48 · Questions: https://github.com/Jayswansocool48/Deskscape/issues
