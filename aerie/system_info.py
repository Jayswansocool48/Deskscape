"""Reads CPU, memory, disk, battery and uptime from /proc and /sys. Nothing leaves the computer."""

import os
import shutil
import socket
import time
from pathlib import Path


class SystemInfo:
    def __init__(self):
        self._last_cpu = _read_cpu_times()
        self._last_net = (_read_net_bytes(), time.monotonic())

    def snapshot(self):
        now = _read_cpu_times()
        cpu = 0.0
        if now and self._last_cpu:
            idle = now[0] - self._last_cpu[0]
            total = now[1] - self._last_cpu[1]
            cpu = round(100.0 * (1 - idle / total), 1) if total > 0 else 0.0
        self._last_cpu = now
        net_now, t_now = _read_net_bytes(), time.monotonic()
        (net_before, t_before) = self._last_net
        elapsed = max(t_now - t_before, 0.001)
        net = None
        if net_now and net_before:
            net = {"down": max(0, int((net_now[0] - net_before[0]) / elapsed)),
                   "up": max(0, int((net_now[1] - net_before[1]) / elapsed))}
        self._last_net = (net_now, t_now)
        return {
            "network": net,
            "cpu": cpu,
            "memory": _memory(),
            "disk": _disk(),
            "battery": _battery(),
            "uptime": _uptime(),
            "hostname": socket.gethostname(),
            "user": os.environ.get("USER", ""),
            "time": time.time(),
        }


def _read_cpu_times():
    try:
        with open("/proc/stat") as f:
            parts = [int(x) for x in f.readline().split()[1:]]
        idle = parts[3] + (parts[4] if len(parts) > 4 else 0)
        return idle, sum(parts)
    except (OSError, ValueError, IndexError):
        return None


def _read_net_bytes():
    """Total bytes received and sent on all network interfaces except loopback."""
    try:
        rx = tx = 0
        with open("/proc/net/dev") as f:
            for line in f.readlines()[2:]:
                name, data = line.split(":", 1)
                if name.strip() == "lo":
                    continue
                fields = data.split()
                rx += int(fields[0])
                tx += int(fields[8])
        return rx, tx
    except (OSError, ValueError, IndexError):
        return None


def _memory():
    info = {}
    try:
        with open("/proc/meminfo") as f:
            for line in f:
                key, value = line.split(":", 1)
                info[key] = int(value.split()[0]) * 1024
    except (OSError, ValueError):
        return None
    total = info.get("MemTotal", 0)
    available = info.get("MemAvailable", 0)
    used = total - available
    return {"total": total, "used": used, "percent": round(100 * used / total, 1) if total else 0}


def _disk():
    try:
        usage = shutil.disk_usage(str(Path.home()))
    except OSError:
        return None
    return {"total": usage.total, "used": usage.used, "percent": round(100 * usage.used / usage.total, 1)}


def _battery():
    for supply in sorted(Path("/sys/class/power_supply").glob("BAT*")):
        try:
            capacity = int((supply / "capacity").read_text().strip())
            status = (supply / "status").read_text().strip()
            return {"percent": capacity, "status": status}
        except (OSError, ValueError):
            continue
    return None


def _uptime():
    try:
        with open("/proc/uptime") as f:
            return int(float(f.read().split()[0]))
    except (OSError, ValueError):
        return 0
