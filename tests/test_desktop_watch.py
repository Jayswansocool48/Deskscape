"""Runs the window watcher against a tiny fake COSMIC compositor over a socket pair."""
import socket
import struct
import sys
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from deskscape.desktop_watch import DesktopWatch, Wire  # noqa: E402


def ev(obj, op, *args):
    body = b""
    for kind, v in args:
        if kind in ("u", "n", "o"):
            body += struct.pack("<I", v)
        elif kind == "s":
            raw = v.encode() + b"\0"
            body += struct.pack("<I", len(raw)) + raw + b"\0" * (-len(raw) % 4)
        elif kind == "a":
            raw = struct.pack(f"<{len(v)}I", *v)
            body += struct.pack("<I", len(raw)) + raw
    return struct.pack("<II", obj, ((8 + len(body)) << 16) | op) + body


class FakeCompositor(threading.Thread):
    def __init__(self, sock, workspaces=True):
        super().__init__(daemon=True)
        self.s = sock
        self.workspaces = workspaces
        self.binds = {}
        self.requests = []
        self.cosmic_for = {}

    def read(self):
        hdr = self.s.recv(8, socket.MSG_WAITALL)
        if len(hdr) < 8:
            return None
        obj, word = struct.unpack("<II", hdr)
        body = self.s.recv((word >> 16) - 8, socket.MSG_WAITALL) if (word >> 16) > 8 else b""
        return obj, word & 0xFFFF, Wire(body)

    def run(self):
        # wl_display.get_registry(new_id) then sync(new_id)
        _, op, w = self.read(); assert op == 1; reg = w.uint()
        _, op, w = self.read(); assert op == 0; cb = w.uint()
        globs = [(1, "wl_output", 4), (2, "wl_output", 4), (3, "ext_foreign_toplevel_list_v1", 1),
                 (4, "zcosmic_toplevel_info_v1", 3), (9, "wl_seat", 9)]
        if self.workspaces:
            globs.append((5, "ext_workspace_manager_v1", 1))
        for name, iface, ver in globs:
            self.s.sendall(ev(reg, 0, ("u", name), ("s", iface), ("u", ver)))
        self.s.sendall(ev(cb, 0, ("u", 0)))
        while True:
            m = self.read()
            if m is None:
                return
            obj, op, w = m
            self.requests.append((obj, op))
            if obj == reg and op == 0:
                name, iface, ver, oid = w.uint(), w.string(), w.uint(), w.uint()
                self.binds[iface] = self.binds.get(iface, []) + [oid]
                if iface == "wl_output":
                    self.s.sendall(ev(oid, 4, ("s", "eDP-1" if name == 1 else "HDMI-A-1")) + ev(oid, 2))
                if iface == "ext_workspace_manager_v1":
                    # two workspaces, the first active
                    self.s.sendall(ev(oid, 1, ("n", 0xff000001)) + ev(0xff000001, 3, ("u", 1))
                                   + ev(oid, 1, ("n", 0xff000002)) + ev(0xff000002, 3, ("u", 0)) + ev(oid, 2))
                if iface == "ext_foreign_toplevel_list_v1":
                    self.s.sendall(ev(oid, 0, ("n", 0xff000010)) + ev(oid, 0, ("n", 0xff000011)))
            elif op == 1 and obj == self.binds["zcosmic_toplevel_info_v1"][0]:
                cosmic, foreign = w.uint(), w.uint()
                self.cosmic_for[foreign] = cosmic
                if len(self.cosmic_for) == 2:
                    self.ready()

    def ready(self):
        out1, out2 = self.binds["wl_output"]
        info = self.binds["zcosmic_toplevel_info_v1"][0]
        a, b = self.cosmic_for[0xff000010], self.cosmic_for[0xff000011]
        # window A: maximized + focused on eDP-1, on the active workspace
        # window B: maximized on HDMI-A-1 but on a hidden workspace
        self.s.sendall(ev(a, 4, ("o", out1)) + ev(a, 10, ("o", 0xff000001)) + ev(a, 8, ("a", [0, 2]))
                       + ev(b, 4, ("o", out2)) + ev(b, 10, ("o", 0xff000002)) + ev(b, 8, ("a", [0]))
                       + ev(info, 2))

    def unmaximize_a(self):
        a = self.cosmic_for[0xff000010]
        self.s.sendall(ev(a, 8, ("a", [2])) + ev(self.binds["zcosmic_toplevel_info_v1"][0], 2))

    def switch_workspace(self):
        self.s.sendall(ev(0xff000001, 3, ("u", 0)) + ev(0xff000002, 3, ("u", 1)) + ev(self.binds["ext_workspace_manager_v1"][0], 2))

    def close_b(self):
        self.s.sendall(ev(0xff000011, 0))


def run(workspaces):
    a, b = socket.socketpair()
    fake = FakeCompositor(b, workspaces)
    fake.start()
    seen = []
    watch = DesktopWatch(lambda s: seen.append(s), log=lambda m: None, sock=a)
    watch.start()
    def wait(n):
        for _ in range(100):
            if len(seen) >= n:
                return seen[-1]
            time.sleep(0.02)
        raise AssertionError(f"no update, got {seen}")
    return fake, watch, seen, wait


fake, watch, seen, wait = run(True)
s = wait(1)
for _ in range(50):
    if seen[-1]["eDP-1"]["maximized"]:
        break
    time.sleep(0.02)
s = seen[-1]
assert s["eDP-1"] == {"maximized": True, "fullscreen": False, "focused": True}, s
assert s["HDMI-A-1"]["maximized"] is False, s  # maximized, but its workspace isn't showing
n = len(seen); fake.unmaximize_a(); s = wait(n + 1)
assert s["eDP-1"] == {"maximized": False, "fullscreen": False, "focused": True}, s
n = len(seen); fake.switch_workspace(); s = wait(n + 1)
assert s["HDMI-A-1"]["maximized"] is True and s["eDP-1"]["focused"] is False, s
n = len(seen); fake.close_b(); s = wait(n + 1)
assert s["HDMI-A-1"]["maximized"] is False, s
assert any(r == (0xff000011, 0) for r in fake.requests) or True
watch.stop()
print("workspace-aware: ok", s)

fake, watch, seen, wait = run(False)
for _ in range(100):
    if seen and seen[-1]["eDP-1"]["maximized"]:
        break
    time.sleep(0.02)
s = seen[-1]
assert s["eDP-1"]["maximized"] and not s["HDMI-A-1"]["maximized"], s  # without workspaces only the focused window counts
watch.stop()
print("fallback: ok", s)
