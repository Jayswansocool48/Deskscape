"""Watches your windows so the wallpaper can pause while you use an app.

COSMIC tells trusted (non-Flatpak) apps about open windows through two Wayland protocols:
ext-foreign-toplevel-list (the list of windows) and zcosmic-toplevel-info (whether each one
is maximized, full screen, focused or minimized, and which screen and workspace it is on),
plus ext-workspace (which workspace is showing). This is a tiny client for just those
messages, written in plain Python so Deskscape needs nothing extra installed. It only
reads window states; it never sees window contents or titles it doesn't need.

The result, per screen (by connector name, e.g. "eDP-1"):
    {"maximized": bool, "fullscreen": bool, "focused": bool}
"""

import os
import socket
import struct
import threading
import time

# Interface versions we understand
WANT = {
    "wl_output": 4,
    "ext_foreign_toplevel_list_v1": 1,
    "zcosmic_toplevel_info_v1": 3,
    "ext_workspace_manager_v1": 1,
}
MAXIMIZED, MINIMIZED, ACTIVATED, FULLSCREEN = 0, 1, 2, 3
WS_ACTIVE = 1


class Wire:
    """Encodes and decodes Wayland messages (no file descriptors needed here)."""

    @staticmethod
    def message(obj, opcode, *args):
        body = b""
        for kind, value in args:
            if kind in ("u", "o", "n"):
                body += struct.pack("<I", value)
            elif kind == "i":
                body += struct.pack("<i", value)
            elif kind == "s":
                raw = value.encode() + b"\0"
                body += struct.pack("<I", len(raw)) + raw + b"\0" * (-len(raw) % 4)
        return struct.pack("<II", obj, ((8 + len(body)) << 16) | opcode) + body

    def __init__(self, data):
        self.data = data
        self.pos = 0

    def uint(self):
        v = struct.unpack_from("<I", self.data, self.pos)[0]
        self.pos += 4
        return v

    def int(self):
        v = struct.unpack_from("<i", self.data, self.pos)[0]
        self.pos += 4
        return v

    def string(self):
        n = self.uint()
        raw = self.data[self.pos:self.pos + n]
        self.pos += n + (-n % 4)
        return raw[:-1].decode(errors="replace") if n else ""

    def array(self):
        n = self.uint()
        raw = self.data[self.pos:self.pos + n]
        self.pos += n + (-n % 4)
        return raw


class Toplevel:
    __slots__ = ("outputs", "states", "workspaces")

    def __init__(self):
        self.outputs = set()
        self.states = set()
        self.workspaces = set()


class DesktopWatch(threading.Thread):
    """Runs in the background and calls on_change(state) whenever the per-screen state changes."""

    def __init__(self, on_change, log=print, sock=None):
        super().__init__(daemon=True, name="deskscape-window-watch")
        self.on_change = on_change
        self.log = log
        self.sock = sock
        self.objects = {}        # id -> (interface, extra)
        self.next_id = 2
        self.globals = {}        # interface -> (name, version)
        self.outputs = {}        # wl_output id -> name
        self.toplevels = {}      # cosmic handle id -> Toplevel
        self.foreign = {}        # foreign handle id -> cosmic handle id
        self.workspaces = {}     # workspace id -> state bits
        self.info_version = 0
        self.workspace_aware = False
        self.last = None
        self.stopped = False
        self.supported = None    # None until we know, then True/False

    # ---- connection -----------------------------------------------------------
    def connect(self):
        if self.sock:
            return self.sock
        name = os.environ.get("WAYLAND_DISPLAY", "wayland-0")
        path = name if name.startswith("/") else os.path.join(os.environ.get("XDG_RUNTIME_DIR", "/run/user/%d" % os.getuid()), name)
        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.connect(path)
        self.sock = s
        return s

    def new_id(self, interface, extra=None):
        oid = self.next_id
        self.next_id += 1
        self.objects[oid] = (interface, extra)
        return oid

    def send(self, obj, opcode, *args):
        self.sock.sendall(Wire.message(obj, opcode, *args))

    def run(self):
        try:
            self.connect()
            self.objects[1] = ("wl_display", None)
            registry = self.new_id("wl_registry")
            self.send(1, 1, ("n", registry))              # wl_display.get_registry
            self.send(1, 0, ("n", self.new_id("wl_callback", "globals-done")))  # wl_display.sync
            buf = b""
            while not self.stopped:
                chunk = self.sock.recv(65536)
                if not chunk:
                    break
                buf += chunk
                while len(buf) >= 8:
                    obj, word = struct.unpack_from("<II", buf, 0)
                    size, opcode = word >> 16, word & 0xFFFF
                    if size < 8 or len(buf) < size:
                        break
                    self.dispatch(obj, opcode, Wire(buf[8:size]))
                    buf = buf[size:]
        except OSError as exc:
            self.log(f"window watch stopped: {exc}")
        except Exception as exc:  # never take the wallpaper down with it
            self.log(f"window watch error: {exc!r}")
        if self.supported is None:
            self.supported = False

    def stop(self):
        self.stopped = True
        try:
            self.sock.shutdown(socket.SHUT_RDWR)
        except (OSError, AttributeError):
            pass

    # ---- events ---------------------------------------------------------------
    def dispatch(self, obj, op, w):
        interface, extra = self.objects.get(obj, (None, None))
        handler = getattr(self, "on_" + interface, None) if interface else None
        if handler:
            handler(obj, op, w, extra)

    def on_wl_display(self, obj, op, w, extra):
        if op == 0:  # error
            target, code, message = w.uint(), w.uint(), w.string()
            self.log(f"window watch: compositor error {code} on object {target}: {message}")
            self.stop()
        elif op == 1:  # delete_id
            self.objects.pop(w.uint(), None)

    def on_wl_registry(self, obj, op, w, extra):
        if op == 0:  # global
            name, interface, version = w.uint(), w.string(), w.uint()
            if interface in WANT:
                if interface == "wl_output":
                    self.globals.setdefault("wl_output", [])
                    self.globals["wl_output"].append((name, version))
                    if self.supported is not None:  # a screen plugged in later
                        self.bind_output(obj, name, version)
                else:
                    self.globals[interface] = (name, version)
        elif op == 1:  # global_remove
            pass

    def on_wl_callback(self, obj, op, w, extra):
        if extra != "globals-done":
            return
        registry = next(i for i, (iface, _) in self.objects.items() if iface == "wl_registry")
        for name, version in self.globals.get("wl_output", []):
            self.bind_output(registry, name, version)
        info = self.globals.get("zcosmic_toplevel_info_v1")
        flist = self.globals.get("ext_foreign_toplevel_list_v1")
        if not info:
            self.supported = False
            self.log("window watch: this desktop doesn't share window states (not COSMIC?)")
            return
        self.info_version = min(info[1], WANT["zcosmic_toplevel_info_v1"])
        if self.info_version >= 2 and not flist:
            self.info_version = 1
        ws = self.globals.get("ext_workspace_manager_v1")
        if ws and self.info_version >= 3:
            self.bind(registry, ws[0], "ext_workspace_manager_v1", 1)
            self.workspace_aware = True
        self.info = self.bind(registry, info[0], "zcosmic_toplevel_info_v1", self.info_version)
        if self.info_version >= 2:
            self.bind(registry, flist[0], "ext_foreign_toplevel_list_v1", 1)
        self.supported = True
        self.log(f"window watch: on (toplevel info v{self.info_version}, workspaces: {self.workspace_aware})")

    def bind(self, registry, name, interface, version):
        oid = self.new_id(interface)
        self.send(registry, 0, ("u", name), ("s", interface), ("u", version), ("n", oid))
        return oid

    def bind_output(self, registry, name, version):
        oid = self.bind(registry, name, "wl_output", min(version, WANT["wl_output"]))
        self.outputs[oid] = f"output-{name}"  # replaced by the real name (v4) when it arrives

    def on_wl_output(self, obj, op, w, extra):
        if op == 4:  # name
            self.outputs[obj] = w.string()
            self.changed()

    # ext_foreign_toplevel_list_v1: events toplevel(0, new_id), finished(1)
    def on_ext_foreign_toplevel_list_v1(self, obj, op, w, extra):
        if op == 0:
            handle = w.uint()
            self.objects[handle] = ("ext_foreign_toplevel_handle_v1", None)
            cosmic = self.new_id("zcosmic_toplevel_handle_v1")
            self.toplevels[cosmic] = Toplevel()
            self.foreign[handle] = cosmic
            # zcosmic_toplevel_info_v1.get_cosmic_toplevel(new_id, foreign handle) is request 1
            self.send(self.info, 1, ("n", cosmic), ("o", handle))

    # ext_foreign_toplevel_handle_v1: closed(0), done(1), title(2), app_id(3), identifier(4)
    def on_ext_foreign_toplevel_handle_v1(self, obj, op, w, extra):
        if op == 0:
            cosmic = self.foreign.pop(obj, None)
            self.toplevels.pop(cosmic, None)
            self.send(obj, 0)  # destroy
            if cosmic:
                self.send(cosmic, 0)  # destroy the cosmic handle too
            self.changed()
        elif op == 1:
            self.changed()

    # zcosmic_toplevel_info_v1: toplevel(0, new_id; v1 only), finished(1), done(2)
    def on_zcosmic_toplevel_info_v1(self, obj, op, w, extra):
        if op == 0:
            handle = w.uint()
            self.objects[handle] = ("zcosmic_toplevel_handle_v1", None)
            self.toplevels[handle] = Toplevel()
        elif op == 2:
            self.changed()

    # zcosmic_toplevel_handle_v1: closed(0), done(1), title(2), app_id(3), output_enter(4),
    # output_leave(5), workspace_enter(6), workspace_leave(7), state(8), geometry(9),
    # ext_workspace_enter(10), ext_workspace_leave(11)
    def on_zcosmic_toplevel_handle_v1(self, obj, op, w, extra):
        t = self.toplevels.get(obj)
        if t is None:
            return
        if op == 0:  # closed (v1)
            self.toplevels.pop(obj, None)
            self.send(obj, 0)
            self.changed()
        elif op == 1:  # done (v1)
            self.changed()
        elif op == 4:
            t.outputs.add(w.uint())
        elif op == 5:
            t.outputs.discard(w.uint())
        elif op == 8:
            raw = w.array()
            t.states = set(struct.unpack(f"<{len(raw) // 4}I", raw))
        elif op == 10:
            t.workspaces.add(w.uint())
        elif op == 11:
            t.workspaces.discard(w.uint())

    # ext_workspace_manager_v1: workspace_group(0, new_id), workspace(1, new_id), done(2), finished(3)
    def on_ext_workspace_manager_v1(self, obj, op, w, extra):
        if op == 0:
            self.objects[w.uint()] = ("ext_workspace_group_handle_v1", None)
        elif op == 1:
            ws = w.uint()
            self.objects[ws] = ("ext_workspace_handle_v1", None)
            self.workspaces[ws] = 0
        elif op == 2:
            self.changed()

    # ext_workspace_handle_v1: id(0), name(1), coordinates(2), state(3), capabilities(4), removed(5)
    def on_ext_workspace_handle_v1(self, obj, op, w, extra):
        if op == 3:
            self.workspaces[obj] = w.uint()
        elif op == 5:
            self.workspaces.pop(obj, None)

    # ---- result ---------------------------------------------------------------
    def visible(self, t):
        if MINIMIZED in t.states:
            return False
        if self.workspace_aware and t.workspaces:
            return any(self.workspaces.get(ws, 0) & WS_ACTIVE for ws in t.workspaces)
        # Without workspace info, only trust the focused window (it is always on a shown workspace).
        return ACTIVATED in t.states

    def state(self):
        out = {name: {"maximized": False, "fullscreen": False, "focused": False} for name in self.outputs.values()}
        for t in self.toplevels.values():
            if not self.visible(t):
                continue
            for oid in t.outputs:
                s = out.get(self.outputs.get(oid))
                if s is None:
                    continue
                s["maximized"] |= MAXIMIZED in t.states or FULLSCREEN in t.states
                s["fullscreen"] |= FULLSCREEN in t.states
                s["focused"] |= ACTIVATED in t.states
        return out

    def changed(self):
        if not self.supported:
            return
        now = self.state()
        if now != self.last:
            self.last = now
            try:
                self.on_change(now)
            except Exception as exc:
                self.log(f"window watch callback failed: {exc!r}")


def watch(on_change, log=print):
    """Starts watching in the background. Returns the watcher (call .stop() to end it)."""
    if not os.environ.get("WAYLAND_DISPLAY"):
        return None
    w = DesktopWatch(on_change, log)
    w.start()
    return w


if __name__ == "__main__":  # `python3 -m deskscape.desktop_watch` prints changes, for testing
    w = watch(lambda s: print(time.strftime("%H:%M:%S"), s, flush=True))
    if not w:
        raise SystemExit("not running on Wayland")
    try:
        while w.is_alive():
            time.sleep(1)
    except KeyboardInterrupt:
        pass
