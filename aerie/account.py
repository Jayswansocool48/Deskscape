"""Your profile picture (shown on COSMIC's lock and login screens) and locking the screen.

The picture is changed the standard way, through AccountsService (the same thing COSMIC
Settings uses), which copies it to /var/lib/AccountsService/icons/<you>. Your previous
picture is saved first so "Restore" can put it back.
"""

import os
import pwd
import re
import shutil
import subprocess
from pathlib import Path

from . import paths

BACKUP = paths.DATA_DIR / "avatar-backup"
NO_PICTURE = paths.DATA_DIR / "avatar-backup.none"


def _user():
    return pwd.getpwuid(os.getuid()).pw_name


def _object_path():
    out = subprocess.run(
        ["gdbus", "call", "--system", "--dest", "org.freedesktop.Accounts", "--object-path",
         "/org/freedesktop/Accounts", "--method", "org.freedesktop.Accounts.FindUserByName", _user()],
        capture_output=True, text=True, timeout=10)
    m = re.search(r"'(/org/freedesktop/Accounts/User\d+)'", out.stdout)
    if not m:
        raise RuntimeError("Couldn't reach your account settings (AccountsService)")
    return m.group(1)


def _set_icon_file(path):
    out = subprocess.run(
        ["gdbus", "call", "--system", "--dest", "org.freedesktop.Accounts", "--object-path", _object_path(),
         "--method", "org.freedesktop.Accounts.User.SetIconFile", str(path)],
        capture_output=True, text=True, timeout=20)
    if out.returncode != 0:
        raise RuntimeError("Your account didn't accept the picture: " + (out.stderr.strip().splitlines() or ["unknown error"])[-1])


def set_avatar(image):
    """Makes `image` your profile picture. Remembers the old one the first time."""
    current = Path("/var/lib/AccountsService/icons") / _user()
    if not BACKUP.exists() and not NO_PICTURE.exists():
        BACKUP.parent.mkdir(parents=True, exist_ok=True)
        try:
            shutil.copyfile(current, BACKUP)
        except OSError:
            NO_PICTURE.touch()  # you had no picture of your own
    _set_icon_file(image)


def restore_avatar():
    """Puts back the profile picture you had before Aerie changed it."""
    try:
        if BACKUP.exists():
            _set_icon_file(BACKUP)
            BACKUP.unlink(missing_ok=True)
            return True
        if NO_PICTURE.exists():
            _set_icon_file("")
            NO_PICTURE.unlink(missing_ok=True)
            return True
    except (RuntimeError, OSError, subprocess.SubprocessError):
        pass
    return False


def lock_now():
    """Locks the screen right away (so you can see the lock screen)."""
    for cmd in (["loginctl", "lock-session"], ["dbus-send", "--session", "--dest=org.freedesktop.ScreenSaver",
                                               "--type=method_call", "/org/freedesktop/ScreenSaver",
                                               "org.freedesktop.ScreenSaver.Lock"]):
        try:
            if subprocess.run(cmd, capture_output=True, timeout=10).returncode == 0:
                return True
        except (OSError, subprocess.SubprocessError):
            continue
    return False
