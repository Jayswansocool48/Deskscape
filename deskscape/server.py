"""Local web server that feeds the Deskscape page.

Listens on 127.0.0.1 only. Anything that changes state or reads app/system data
needs the per-run token, so other web pages in a browser can't use it.
"""

import json
import mimetypes
import re
import secrets
import shutil
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from . import APP_ID, __version__, cosmic_look, library, media_player, package, paths
from .app_catalog import AppCatalog
from .system_info import SystemInfo

MAX_UPLOAD = 200 * 1024 * 1024
MEDIA_TYPES = {
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg",  # images
    ".glb", ".gltf",  # 3D models
    ".mp4", ".webm",  # video wallpapers
    ".hdr",  # 360° HDR skies
}
_SAFE_NAME = re.compile(r"^[a-f0-9]{32}\.[a-z0-9]{2,5}$")

mimetypes.add_type("model/gltf-binary", ".glb")
mimetypes.add_type("model/gltf+json", ".gltf")
mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("image/vnd.radiance", ".hdr")


class DeskscapeServer:
    def __init__(self, port=0):
        paths.ensure_dirs()
        self.token = secrets.token_urlsafe(24)
        self.catalog = AppCatalog()
        self.system = SystemInfo()
        self.on_shell_request = None  # set by the GTK shell (quit, reload, focus)
        self.on_snapshot = None  # set by the GTK shell: (monitor, widgets, path) -> path
        handler = _make_handler(self)
        self.httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
        self.httpd.daemon_threads = True
        self.port = self.httpd.server_address[1]

    @property
    def url(self):
        return f"http://127.0.0.1:{self.port}/index.html#token={self.token}"

    def start(self):
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        threading.Thread(target=self.catalog.refresh, daemon=True).start()

    def stop(self):
        self.httpd.shutdown()

    # ---- config -------------------------------------------------------
    def read_config(self):
        try:
            return json.loads(paths.CONFIG_FILE.read_text())
        except (OSError, ValueError):
            return None

    def write_config(self, data):
        paths.ensure_dirs()  # the folder may have been removed while running
        tmp = paths.CONFIG_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2))
        tmp.replace(paths.CONFIG_FILE)

    def library_allowed(self):
        cfg = self.read_config() or {}
        return bool((cfg.get("general") or {}).get("libraryConsent"))

    def set_lockscreen(self, req):
        """Makes a picture COSMIC's wallpaper, which is what the lock screen shows."""
        folder = paths.DATA_DIR / "lockscreen"
        folder.mkdir(parents=True, exist_ok=True)
        target = folder / f"lockscreen-{uuid.uuid4().hex[:8]}.png"  # a new name so COSMIC reloads it
        if req.get("source") == "scene":
            if not self.on_snapshot:
                raise RuntimeError("Only works in the Deskscape app, not in preview mode")
            monitor = req.get("monitor") if isinstance(req.get("monitor"), int) else 0
            self.on_snapshot(monitor, bool(req.get("widgets")), target)
        else:
            name = str(req.get("url", "")).removeprefix("/media/")
            if not _SAFE_NAME.match(name) or Path(name).suffix not in (".png", ".jpg", ".jpeg", ".webp"):
                raise ValueError("Choose a PNG, JPG or WebP picture")
            target = target.with_suffix(Path(name).suffix)
            shutil.copyfile(paths.MEDIA_DIR / name, target)
        for old in folder.iterdir():
            if old != target:
                old.unlink(missing_ok=True)
        return cosmic_look.set_wallpaper(target)

    def delete_all_data(self):
        cosmic_look.restore()  # put COSMIC's own look back before forgetting how it was
        shutil.rmtree(paths.DATA_DIR, ignore_errors=True)
        shutil.rmtree(paths.CONFIG_DIR, ignore_errors=True)
        paths.AUTOSTART_FILE.unlink(missing_ok=True)
        paths.ensure_dirs()

    def install_info(self):
        return {"installed": package.INSTALLED, "canUpdate": package.can_update(),
                "version": __version__, "appId": APP_ID}

    def update(self):
        """Gets the newest Deskscape from its published package source."""
        if not package.INSTALLED:
            return {"ok": False, "updated": False,
                    "message": "Running from the source folder: update with ./install.sh."}
        if not package.can_update():
            return {"ok": False, "updated": False,
                    "message": "To update this build, run ./install.sh again in the Deskscape folder."}
        ok, out = package.update()
        if not ok:
            return {"ok": False, "updated": False, "message": "Could not update right now (cancelled or offline)."}
        updated = "deskscape is already the newest version" not in out
        return {"ok": True, "updated": updated,
                "message": "Updated! Restart Deskscape to use the new version." if updated else "You have the latest version."}

    def uninstall(self):
        """Removes the app and all of its data. Returns (ok, message)."""
        if not package.INSTALLED:
            return False, "Deskscape is running from its source folder, so there is nothing installed to remove."
        cosmic_look.restore()  # give COSMIC its original look back
        ok, _ = package.uninstall()
        if not ok:
            return False, "Uninstall was cancelled or failed. You can also remove Deskscape in the COSMIC Store."
        shutil.rmtree(paths.DATA_DIR, ignore_errors=True)
        shutil.rmtree(paths.CONFIG_DIR, ignore_errors=True)
        paths.AUTOSTART_FILE.unlink(missing_ok=True)
        return True, "Deskscape was uninstalled. Goodbye!"

    def restart(self):
        """Starts a fresh copy after this one quits (used after an update)."""
        return package.spawn(["sh", "-c", f"sleep 2; {package.launch_command()}"])

    def set_autostart(self, enabled):
        if enabled:
            paths.AUTOSTART_FILE.parent.mkdir(parents=True, exist_ok=True)
            paths.AUTOSTART_FILE.write_text(
                "[Desktop Entry]\nType=Application\nName=Deskscape\n"
                f"Comment=3D desktop with widgets\nExec={package.launch_command()} --background\n"
                f"Icon={APP_ID}\nX-GNOME-Autostart-enabled=true\n"
            )
        else:
            paths.AUTOSTART_FILE.unlink(missing_ok=True)
        return paths.AUTOSTART_FILE.exists()


def _make_handler(app):
    class Handler(BaseHTTPRequestHandler):
        server_version = "Deskscape/" + __version__

        def log_message(self, *args):
            pass

        # ---- helpers ----
        def _host_ok(self):
            host = self.headers.get("Host", "")
            return host in (f"127.0.0.1:{app.port}", f"localhost:{app.port}")

        def _authed(self):
            return secrets.compare_digest(self.headers.get("X-Deskscape-Token", ""), app.token)

        def _json(self, data, status=200):
            body = json.dumps(data).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def _file(self, path, cache=True):
            try:
                data = Path(path).read_bytes()
            except OSError:
                return self._json({"error": "not found"}, 404)
            ctype = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "max-age=3600" if cache else "no-cache")
            self.end_headers()
            self.wfile.write(data)

        def _body(self):
            length = int(self.headers.get("Content-Length", 0) or 0)
            if length > MAX_UPLOAD:
                raise ValueError("too large")
            return self.rfile.read(length) if length else b""

        def _guard(self, need_token=True):
            if not self._host_ok():
                self._json({"error": "bad host"}, 403)
                return False
            if need_token and not self._authed():
                self._json({"error": "unauthorized"}, 401)
                return False
            return True

        # ---- routes ----
        def do_GET(self):
            route = urlparse(self.path).path
            if not self._guard(need_token=route.startswith("/api/")):
                return
            if route == "/api/config":
                return self._json({"config": app.read_config(), "version": __version__})
            if route == "/api/apps":
                return self._json({"apps": app.catalog.list()})
            if route == "/api/system":
                return self._json(app.system.snapshot())
            if route == "/api/autostart":
                return self._json({"enabled": paths.AUTOSTART_FILE.exists()})
            if route == "/api/cosmic-look":
                return self._json(cosmic_look.read())
            if route == "/api/now-playing":
                info = media_player.status()
                info.pop("artPath", None)
                return self._json(info)
            if route == "/now-playing-art":
                art = media_player.status().get("artPath", "")
                if art and Path(art).suffix.lower() in (".png", ".jpg", ".jpeg", ".webp", ".gif") and Path(art).is_file():
                    return self._file(art, cache=False)
                return self._json({"error": "no art"}, 404)
            if route.startswith("/icon/"):
                icon = app.catalog.icon_path(unquote(route[len("/icon/"):]))
                return self._file(icon) if icon else self._json({"error": "no icon"}, 404)
            if route == "/api/library":
                if not app.library_allowed():
                    return self._json({"error": "The online library is turned off in Settings"}, 403)
                kind = (urlparse(self.path).query.partition("kind=")[2] or "hdris").split("&")[0]
                try:
                    return self._json({"items": library.browse(kind)})
                except Exception as exc:  # offline, Poly Haven down, …
                    return self._json({"error": library.error_message(exc)}, 502)
            if route == "/api/lockscreen":
                current = cosmic_look.wallpaper()
                return self._json({"current": current, "ours": bool(current and str(paths.DATA_DIR) in current)})
            if route.startswith("/library-thumb/"):
                if not app.library_allowed():
                    return self._json({"error": "library is off"}, 403)
                try:
                    return self._file(library.thumbnail(unquote(route[len("/library-thumb/"):])))
                except Exception:
                    return self._json({"error": "not found"}, 404)
            if route.startswith("/library/"):
                f = library.local_file(unquote(route[len("/library/"):]))
                return self._file(f) if f else self._json({"error": "not found"}, 404)
            if route.startswith("/media/"):
                name = route[len("/media/"):]
                if not _SAFE_NAME.match(name):
                    return self._json({"error": "not found"}, 404)
                return self._file(paths.MEDIA_DIR / name)
            # static files
            rel = "index.html" if route in ("/", "") else unquote(route.lstrip("/"))
            target = (paths.WEB_DIR / rel).resolve()
            if paths.WEB_DIR.resolve() not in target.parents or not target.is_file():
                return self._json({"error": "not found"}, 404)
            return self._file(target, cache=False)

        def do_PUT(self):
            if not self._guard():
                return
            if urlparse(self.path).path == "/api/config":
                try:
                    data = json.loads(self._body())
                except ValueError:
                    return self._json({"error": "bad json"}, 400)
                app.write_config(data)
                return self._json({"ok": True})
            self._json({"error": "not found"}, 404)

        def do_POST(self):
            if not self._guard():
                return
            route = urlparse(self.path).path
            try:
                body = self._body()
            except ValueError:
                return self._json({"error": "file too large (max 200 MB)"}, 413)
            if route == "/api/launch":
                app_id = json.loads(body or b"{}").get("id", "")
                return self._json({"ok": app.catalog.launch(app_id)})
            if route == "/api/apps/refresh":
                app.catalog.refresh()
                return self._json({"apps": app.catalog.list()})
            if route == "/api/media":
                ext = Path(unquote(self.headers.get("X-Filename", ""))).suffix.lower()
                if ext not in MEDIA_TYPES:
                    return self._json({"error": f"unsupported file type {ext or '(none)'}"}, 400)
                name = uuid.uuid4().hex + ext
                (paths.MEDIA_DIR / name).write_bytes(body)
                return self._json({"url": "/media/" + name})
            if route == "/api/autostart":
                enabled = bool(json.loads(body or b"{}").get("enabled"))
                return self._json({"enabled": app.set_autostart(enabled)})
            if route == "/api/install-info":
                return self._json(app.install_info())
            if route == "/api/update":
                return self._json(app.update())
            if route == "/api/restart":
                ok = app.restart()
                if ok and app.on_shell_request:
                    app.on_shell_request("quit")
                return self._json({"ok": ok})
            if route == "/api/uninstall":
                ok, message = app.uninstall()
                if ok and app.on_shell_request:
                    app.on_shell_request("quit-later")
                return self._json({"ok": ok, "message": message})
            if route == "/api/cosmic-look":
                try:
                    changes = json.loads(body or b"{}")
                    return self._json({"ok": True, "look": cosmic_look.apply(changes)})
                except (ValueError, TypeError, OSError, RuntimeError) as exc:
                    return self._json({"ok": False, "error": str(exc)}, 400)
            if route == "/api/cosmic-look/restore":
                return self._json({"ok": cosmic_look.restore(), "look": cosmic_look.read()})
            if route == "/api/now-playing":
                action = json.loads(body or b"{}").get("action", "")
                return self._json({"ok": media_player.control(action)})
            if route == "/api/delete-data":
                app.delete_all_data()
                return self._json({"ok": True})
            if route == "/api/shell":
                if not app.on_shell_request:  # server running on its own, no desktop window
                    return self._json({"ok": False})
                req = json.loads(body or b"{}")
                monitor = req.get("monitor")
                app.on_shell_request(req.get("action", ""), monitor if isinstance(monitor, int) else None)
                return self._json({"ok": True})
            if route == "/api/library/fetch":
                if not app.library_allowed():
                    return self._json({"error": "The online library is turned off in Settings"}, 403)
                req = json.loads(body or b"{}")
                try:
                    return self._json({"url": library.fetch(req.get("kind", ""), req.get("id", ""), req.get("resolution", "2k"))})
                except Exception as exc:
                    return self._json({"error": library.error_message(exc)}, 502)
            if route == "/api/lockscreen":
                try:
                    return self._json({"ok": True, "current": app.set_lockscreen(json.loads(body or b"{}"))})
                except (ValueError, RuntimeError, OSError) as exc:
                    return self._json({"ok": False, "error": str(exc)}, 400)
            self._json({"error": "not found"}, 404)

    return Handler


def main():
    """Run only the server and print the URL (for testing in a normal browser)."""
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=0)
    args = parser.parse_args()
    server = DeskscapeServer(args.port)
    print(server.url, flush=True)
    server.httpd.serve_forever()


if __name__ == "__main__":
    main()
