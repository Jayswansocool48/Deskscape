"""How Aerie is installed, and the commands that update or remove it.

Aerie is a regular Pop!_OS package (/usr/lib/aerie), not a Flatpak: COSMIC only
lets non-sandboxed apps draw on the desktop layer, which a live wallpaper needs.
"""

import os
import subprocess
from pathlib import Path

INSTALL_DIR = Path("/usr/lib/aerie")
APP_DIR = Path(__file__).resolve().parent.parent
INSTALLED = APP_DIR == INSTALL_DIR
APT_SOURCE = Path("/etc/apt/sources.list.d/aerie.sources")


def run(cmd, timeout=None):
    """Runs a command and returns (ok, output)."""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout,
                                env={**os.environ, "LC_ALL": "C"})
    except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
        return False, str(exc)
    return result.returncode == 0, (result.stdout + result.stderr).strip()


def spawn(cmd):
    """Starts a command in the background without waiting."""
    try:
        subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        return True
    except FileNotFoundError:
        return False


def data_dirs():
    """Folders that hold installed apps (.desktop files) and icons."""
    home_share = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    dirs = [home_share]
    dirs += [Path(p) for p in os.environ.get("XDG_DATA_DIRS", "/usr/local/share:/usr/share").split(":") if p]
    dirs += [
        home_share / "flatpak" / "exports" / "share",
        Path("/var/lib/flatpak/exports/share"),
        Path("/var/lib/snapd/desktop"),
    ]
    unique = []
    for d in dirs:
        if d not in unique:
            unique.append(d)
    return unique


def launch_command():
    """How to start Aerie from outside (used for login autostart and restarts)."""
    return "aerie" if INSTALLED else str(APP_DIR / "bin" / "aerie")


def can_update():
    """Updates come from Aerie's published package source, once it has been added."""
    return INSTALLED and APT_SOURCE.exists()


def update():
    """Installs a newer Aerie if there is one. Asks for the password in a system dialog."""
    return run(["pkexec", "sh", "-c", "apt-get update -qq && apt-get install -y --only-upgrade aerie"],
               timeout=900)


def uninstall():
    """Removes the Aerie package, its update source and its app-list icon."""
    return run(["pkexec", "apt-get", "purge", "-y", "aerie"], timeout=600)
