"""GTK window that shows the Deskscape page as your live wallpaper.

Desktop mode puts a full-screen surface on every monitor above the COSMIC wallpaper and
below your windows (wlr-layer-shell; COSMIC offers it only to apps outside a sandbox). While the editor is open the surface
is lifted above windows so you can work on it, then dropped back down.
Window mode (--window) is a normal resizable window for testing or other desktops.
"""

import ctypes
import json
import signal
import threading
import sys
import time
import traceback
from pathlib import Path

# gtk4-layer-shell has to be loaded before GTK connects to Wayland, so load it first.
for _lib in ("libgtk4-layer-shell.so.0", "libgtk4-layer-shell.so"):
    try:
        ctypes.CDLL(_lib)
        break
    except OSError:
        continue

import gi  # noqa: E402

gi.require_version("Gtk", "4.0")
gi.require_version("Gdk", "4.0")
gi.require_version("WebKit", "6.0")
from gi.repository import Gdk, Gio, GLib, Gtk, WebKit  # noqa: E402

try:
    gi.require_version("Gtk4LayerShell", "1.0")
    from gi.repository import Gtk4LayerShell as LayerShell  # noqa: E402
except (ValueError, ImportError):
    LayerShell = None

from . import APP_ID, __version__, cosmic_look, desktop_watch  # noqa: E402
from .server import DeskscapeServer  # noqa: E402


class DeskscapeApp(Gtk.Application):
    def __init__(self):
        super().__init__(application_id=APP_ID, flags=Gio.ApplicationFlags.HANDLES_COMMAND_LINE)
        self.server = None
        self.windows = []
        self.layered = False
        self.debug = False
        self.watch = None
        self.desktop_state = {}
        self.prefs = {}
        self.taskbar_timer = 0
        self.rebuild_timer = 0
        self.add_main_option("window", ord("w"), GLib.OptionFlags.NONE, GLib.OptionArg.NONE,
                             "Run in a normal window instead of on the desktop", None)
        self.add_main_option("edit", ord("e"), GLib.OptionFlags.NONE, GLib.OptionArg.NONE,
                             "Open the editor (also what happens when you launch it again)", None)
        self.add_main_option("background", ord("b"), GLib.OptionFlags.NONE, GLib.OptionArg.NONE,
                             "Start quietly under your windows (used when starting at login)", None)
        self.add_main_option("quit", ord("q"), GLib.OptionFlags.NONE, GLib.OptionArg.NONE,
                             "Quit the running Deskscape", None)
        self.add_main_option("debug", ord("d"), GLib.OptionFlags.NONE, GLib.OptionArg.NONE,
                             "Enable the web inspector", None)
        self.add_main_option("version", ord("v"), GLib.OptionFlags.NONE, GLib.OptionArg.NONE,
                             "Show version", None)

    # ---- startup ------------------------------------------------------
    def do_command_line(self, command_line):
        try:
            return self.start(command_line)
        except Exception:
            log("startup failed:\n" + traceback.format_exc())
            if not self.server:
                raise
            # Desktop mode failed: show Deskscape in a normal window instead of nothing.
            for win in self.windows:
                win.destroy()
            self.windows = []
            self.layered = False
            self.build_windows(open_editor=True)
            log("fell back to a normal window")
            return 0

    def start(self, command_line):
        opts = command_line.get_options_dict().end().unpack()
        if opts.get("version"):
            print(f"deskscape {__version__}")
            return 0
        if opts.get("quit"):
            self.quit()
            return 0
        if self.windows:
            # Already running: launching again opens the editor (on the main screen only).
            self.run_js("window.deskscape && window.deskscape.openEditor()", self.windows[:1])
            return 0
        self.debug = bool(opts.get("debug"))
        want_layer = not opts.get("window")
        if want_layer and (LayerShell is None or not LayerShell.is_supported()):
            msg = ("layer-shell not available, using a normal window "
                   "(the desktop must be COSMIC or another Wayland desktop with layer-shell)")
            print("deskscape: " + msg, file=sys.stderr)
            log(msg)
            want_layer = False
        self.layered = want_layer
        self.open_editor_on_load = False
        self.hold()
        self.server = DeskscapeServer()
        self.server.on_shell_request = lambda action, monitor=None: GLib.idle_add(self.handle_shell_request, action, monitor)
        self.server.on_snapshot = self.snapshot_from_thread
        self.server.start()
        self.load_prefs()
        cosmic_look.maximized_style(False)  # in case Deskscape stopped while a window was maximized
        # Opened from the app list: come up above your windows with the editor, so you see it.
        # Started at login (--background): stay quietly under your windows.
        self.build_windows(open_editor=not opts.get("background"))
        if self.layered:
            Gdk.Display.get_default().get_monitors().connect("items-changed", self.on_monitors_changed)
            self.watch = desktop_watch.watch(lambda state: GLib.idle_add(self.on_desktop_state, state), log)
        log(f"started (layer-shell: {self.layered}, monitors: {len(self.windows)})")
        return 0

    @staticmethod
    def use_direct_connection():
        """Talk to the local server directly. Looking up proxy settings goes through a
        desktop portal that refuses the request inside the sandbox, which left the page blank."""
        try:
            WebKit.NetworkSession.get_default().set_proxy_settings(WebKit.NetworkProxyMode.NO_PROXY, None)
        except (AttributeError, TypeError, GLib.Error) as exc:
            log(f"could not turn off proxy lookup: {exc}")

    def build_windows(self, open_editor=False):
        self.open_editor_on_load = open_editor
        self.use_direct_connection()
        if self.layered:
            monitors = Gdk.Display.get_default().get_monitors()
            for i in range(monitors.get_n_items()):
                self.windows.append(self.make_window(monitors.get_item(i), i))
        else:
            self.windows.append(self.make_window(None, 0))

    def make_window(self, monitor, index):
        win = Gtk.ApplicationWindow(application=self, title="Deskscape")
        webview = WebKit.WebView()
        settings = webview.get_settings()
        settings.set_enable_webgl(True)
        settings.set_hardware_acceleration_policy(WebKit.HardwareAccelerationPolicy.ALWAYS)
        settings.set_enable_developer_extras(self.debug)
        settings.set_enable_back_forward_navigation_gestures(False)
        webview.set_background_color(Gdk.RGBA(0, 0, 0, 0))
        webview.connect("decide-policy", self.on_decide_policy)
        webview.connect("context-menu", lambda *a: not self.debug)
        webview.connect("web-process-terminated", self.on_web_crash)
        webview.connect("load-changed", self.on_load_changed, win)
        edit = "&edit=1" if index == 0 and self.open_editor_on_load else ""
        webview.load_uri(self.server.url.replace("#", f"?monitor={index}{edit}#"))
        win.set_child(webview)
        win.webview = webview
        win.index = index
        win.paused = None
        win.connector = monitor.get_connector() if monitor is not None else None

        if self.layered:
            LayerShell.init_for_window(win)
            LayerShell.set_namespace(win, "deskscape")
            # In front of your windows when opened from the app list (with the editor),
            # under them when started at login. Closing the editor moves it under them.
            in_front = self.open_editor_on_load and index == 0
            LayerShell.set_layer(win, LayerShell.Layer.TOP if in_front else LayerShell.Layer.BOTTOM)
            for edge in (LayerShell.Edge.TOP, LayerShell.Edge.BOTTOM,
                         LayerShell.Edge.LEFT, LayerShell.Edge.RIGHT):
                LayerShell.set_anchor(win, edge, True)
            LayerShell.set_exclusive_zone(win, -1)
            LayerShell.set_keyboard_mode(win, LayerShell.KeyboardMode.ON_DEMAND)
            if monitor is not None:
                LayerShell.set_monitor(win, monitor)
            if not getattr(self, "css_added", False):
                css = Gtk.CssProvider()
                css.load_from_string("window { background: transparent; }")
                Gtk.StyleContext.add_provider_for_display(
                    Gdk.Display.get_default(), css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
                self.css_added = True
        else:
            win.set_default_size(1280, 800)
        win.present()
        return win

    # ---- page → shell -------------------------------------------------
    def handle_shell_request(self, action, monitor=None):
        mine = [w for w in self.windows if monitor is None or w.index == monitor] or self.windows[:1]
        if action == "quit":
            self.quit()
        elif action == "quit-later":
            # give the page a moment to show "uninstalled" before closing
            GLib.timeout_add(1500, lambda: self.quit() or False)
        elif action == "reload":
            for win in self.windows:
                win.webview.reload()
        elif action in ("front", "back") and self.layered:
            # "front": above your windows (editor or app drawer open) — only on the screen that asked;
            # "back": wallpaper again
            layer = LayerShell.Layer.TOP if action == "front" else LayerShell.Layer.BOTTOM
            for win in mine:
                LayerShell.set_layer(win, layer)
                if action == "front":
                    win.present()
        elif action == "config-changed":
            # Other screens pick up the new look; pausing and taskbar settings may have changed.
            self.load_prefs()
            others = [w for w in self.windows if w not in mine] if monitor is not None else self.windows
            self.run_js("window.deskscape && window.deskscape.reloadConfig()", others)
            self.apply_pause()
            self.schedule_taskbar()
        return False

    # ---- pausing and the taskbar while you use apps ------------------------
    def load_prefs(self):
        cfg = self.server.read_config() if self.server else None
        general = (cfg or {}).get("general") or {}
        self.prefs = {
            "pauseWhen": general.get("pauseWhen", "maximized"),
            "taskbarOnMaximize": general.get("taskbarOnMaximize", True),
        }

    def on_desktop_state(self, state):
        self.desktop_state = state
        self.apply_pause()
        self.schedule_taskbar()
        return False

    def apply_pause(self):
        mode = self.prefs.get("pauseWhen", "maximized")
        for win in self.windows:
            s = self.desktop_state.get(win.connector) or {}
            if not s and len(self.windows) == 1 and len(self.desktop_state) == 1:
                s = next(iter(self.desktop_state.values()))  # one screen: names don't matter
            paused = (mode != "never" and bool(s.get("maximized"))) or (mode == "focused" and bool(s.get("focused")))
            if paused != win.paused:
                win.paused = paused
                self.run_js(f"window.deskscape && window.deskscape.setPaused({json.dumps(paused)})", [win])

    def schedule_taskbar(self):
        if self.taskbar_timer:
            GLib.source_remove(self.taskbar_timer)
        self.taskbar_timer = GLib.timeout_add(350, self.update_taskbar)

    def update_taskbar(self):
        self.taskbar_timer = 0
        maximized = any(s.get("maximized") and not s.get("fullscreen") for s in self.desktop_state.values())
        try:
            if cosmic_look.maximized_style(maximized and self.prefs.get("taskbarOnMaximize", True)):
                log(f"taskbar: {'normal look while a window is maximized' if maximized else 'your style is back'}")
        except OSError as exc:
            log(f"taskbar: could not change ({exc})")
        return False

    def on_load_changed(self, webview, event, win):
        if event == WebKit.LoadEvent.FINISHED and win.paused:
            win.paused = None  # tell the fresh page again
            GLib.timeout_add(300, lambda: self.apply_pause() or False)

    # ---- screens plugged in or removed --------------------------------------
    def on_monitors_changed(self, *_):
        if self.rebuild_timer:
            GLib.source_remove(self.rebuild_timer)
        self.rebuild_timer = GLib.timeout_add(800, self.rebuild_windows)

    def rebuild_windows(self):
        self.rebuild_timer = 0
        log("screens changed; rebuilding")
        old, self.windows = self.windows, []
        self.build_windows(open_editor=False)
        for win in old:
            win.destroy()
        self.apply_pause()
        return False

    # ---- snapshots (for the lock screen) --------------------------------------
    def snapshot_from_thread(self, monitor, widgets, path, timeout=15):
        """Called from the server thread: saves a picture of a screen to `path` as PNG."""
        done = threading.Event()
        result = {}

        def finish(error=None):
            result["error"] = error
            done.set()

        GLib.idle_add(self.snapshot, monitor, widgets, path, finish)
        if not done.wait(timeout):
            raise RuntimeError("taking the picture took too long")
        if result.get("error"):
            raise RuntimeError(result["error"])
        return path

    def snapshot(self, monitor, widgets, path, finish):
        win = next((w for w in self.windows if w.index == monitor), None) or self.windows[0]
        hide = "snapshot" + ("" if widgets else " snapshot-no-widgets")
        self.run_js(f"document.documentElement.classList.add(...{json.dumps(hide.split())})", [win])

        def restore():
            self.run_js("document.documentElement.classList.remove('snapshot', 'snapshot-no-widgets')", [win])

        def done(webview, res):
            try:
                texture = webview.get_snapshot_finish(res)
                texture.save_to_png(str(path))
                finish()
            except (GLib.Error, AttributeError) as exc:
                finish(f"could not take the picture: {exc}")
            restore()

        def take():
            win.webview.get_snapshot(WebKit.SnapshotRegion.VISIBLE, WebKit.SnapshotOptions.NONE, None, done)
            return False

        GLib.timeout_add(450, take)  # let the page hide the editor first
        return False

    def on_web_crash(self, webview, reason):
        log(f"page stopped ({reason}); reloading")
        GLib.timeout_add(1000, lambda: webview.reload() or False)

    def run_js(self, script, windows=None):
        for win in self.windows if windows is None else windows:
            win.webview.evaluate_javascript(script, -1, None, None, None, None, None)
        return True

    def on_decide_policy(self, webview, decision, decision_type):
        # Links to the internet open in the normal browser, never inside the desktop.
        if decision_type in (WebKit.PolicyDecisionType.NAVIGATION_ACTION,
                             WebKit.PolicyDecisionType.NEW_WINDOW_ACTION):
            uri = decision.get_navigation_action().get_request().get_uri()
            if not uri.startswith(f"http://127.0.0.1:{self.server.port}/"):
                decision.ignore()
                if uri.startswith(("https://", "http://")):
                    try:
                        Gio.AppInfo.launch_default_for_uri(uri, None)
                    except GLib.Error as exc:
                        log(f"could not open {uri}: {exc.message}")
                return True
        return False

    def do_shutdown(self):
        if self.watch:
            self.watch.stop()
        try:
            cosmic_look.maximized_style(False)  # never leave your taskbar in its temporary look
        except OSError:
            pass
        if self.server:
            self.server.stop()
        Gtk.Application.do_shutdown(self)


LOG_FILE = Path(GLib.get_user_cache_dir()) / "deskscape.log"


def log(message):
    """Keeps a short log so problems can be found later (deskscape --log shows it)."""
    try:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with LOG_FILE.open("a") as f:
            f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} {message}\n")
    except OSError:
        pass


def _log_crash(kind, value, tb):
    log("crash:\n" + "".join(traceback.format_exception(kind, value, tb)))
    sys.__excepthook__(kind, value, tb)


def main():
    if "--log" in sys.argv:
        print(LOG_FILE.read_text() if LOG_FILE.exists() else "No log yet.")
        return 0
    if LOG_FILE.exists() and LOG_FILE.stat().st_size > 200_000:
        LOG_FILE.unlink()
    sys.excepthook = _log_crash
    app = DeskscapeApp()
    GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGINT, app.quit)
    GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGTERM, app.quit)
    return app.run(sys.argv)
