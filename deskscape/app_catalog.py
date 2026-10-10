"""Finds installed apps (.desktop files) and their icons, and launches them.

Pure Python so it works without GTK; covers system apps, Flatpak and Snap.
"""

import configparser
import os
from pathlib import Path

from . import APP_ID, package

_ICON_THEMES = ["Pop", "Cosmic", "Adwaita", "hicolor", "breeze", "Papirus"]
_ICON_SIZES = ["scalable", "256x256", "128x128", "96x96", "64x64", "48x48", "512x512", "32x32"]
_ICON_EXTS = [".svg", ".png", ".xpm"]


class AppCatalog:
    def __init__(self):
        self._apps = {}
        self._icon_cache = {}

    def refresh(self):
        apps = {}
        desktop_env = os.environ.get("XDG_CURRENT_DESKTOP", "").split(":")
        for base in package.data_dirs():
            app_dir = base / "applications"
            if not app_dir.is_dir():
                continue
            for path in sorted(app_dir.rglob("*.desktop")):
                app_id = str(path.relative_to(app_dir)).replace("/", "-")[: -len(".desktop")]
                if app_id in apps or app_id == APP_ID:
                    continue  # earlier data dirs take priority, like the desktop does
                entry = _read_entry(path)
                if entry is None:
                    apps[app_id] = None
                    continue
                if entry.get("NoDisplay", "false").lower() == "true" or entry.get("Hidden", "false").lower() == "true":
                    apps[app_id] = None
                    continue
                if entry.get("Type", "Application") != "Application":
                    apps[app_id] = None
                    continue
                only = [d for d in entry.get("OnlyShowIn", "").split(";") if d]
                not_in = [d for d in entry.get("NotShowIn", "").split(";") if d]
                if only and not set(only) & set(desktop_env):
                    apps[app_id] = None
                    continue
                if not_in and set(not_in) & set(desktop_env):
                    apps[app_id] = None
                    continue
                apps[app_id] = {
                    "id": app_id,
                    "name": entry.get("Name", app_id),
                    "comment": entry.get("Comment", ""),
                    "categories": [c for c in entry.get("Categories", "").split(";") if c],
                    "icon": entry.get("Icon", ""),
                    "path": str(path),
                }
        self._apps = {k: v for k, v in apps.items() if v}
        return self.list()

    def list(self):
        if not self._apps:
            self.refresh()
        return sorted(
            (
                {
                    "id": a["id"],
                    "name": a["name"],
                    "comment": a["comment"],
                    "categories": a["categories"],
                    "hasIcon": self.icon_path(a["id"]) is not None,
                }
                for a in self._apps.values()
            ),
            key=lambda a: a["name"].lower(),
        )

    def icon_path(self, app_id):
        if app_id in self._icon_cache:
            return self._icon_cache[app_id]
        app = self._apps.get(app_id)
        found = _find_icon(app["icon"]) if app and app["icon"] else None
        self._icon_cache[app_id] = found
        return found

    def launch(self, app_id):
        app = self._apps.get(app_id)
        if not app:
            return False
        return package.spawn(["gio", "launch", app["path"]])


def _read_entry(path):
    parser = configparser.RawConfigParser(strict=False, interpolation=None)
    parser.optionxform = str
    try:
        parser.read(path, encoding="utf-8")
    except (configparser.Error, UnicodeDecodeError, OSError):
        return None
    if not parser.has_section("Desktop Entry"):
        return None
    return dict(parser.items("Desktop Entry"))


def _find_icon(name):
    if os.path.isabs(name):
        return name if os.path.isfile(name) else None
    for base in package.data_dirs():
        for theme in _ICON_THEMES:
            theme_dir = base / "icons" / theme
            if not theme_dir.is_dir():
                continue
            for size in _ICON_SIZES:
                for ext in _ICON_EXTS[:2]:
                    candidate = theme_dir / size / "apps" / (name + ext)
                    if candidate.is_file():
                        return str(candidate)
        for ext in _ICON_EXTS:
            candidate = base / "pixmaps" / (name + ext)
            if candidate.is_file():
                return str(candidate)
    return None
