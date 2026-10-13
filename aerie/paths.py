"""Where Aerie keeps its files. Everything stays on this computer."""

import os
from pathlib import Path

from . import APP_ID

PACKAGE_DIR = Path(__file__).resolve().parent
WEB_DIR = PACKAGE_DIR.parent / "web"

_config_home = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
_data_home = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))

CONFIG_DIR = _config_home / "aerie"
CONFIG_FILE = CONFIG_DIR / "config.json"
DATA_DIR = _data_home / "aerie"
MEDIA_DIR = DATA_DIR / "media"
AUTOSTART_FILE = _config_home / "autostart" / f"{APP_ID}.desktop"


OLD_CONFIG_DIR = _config_home / "deskscape"   # Aerie used to be called Deskscape
OLD_DATA_DIR = _data_home / "deskscape"
OLD_AUTOSTART = _config_home / "autostart" / "io.github.jayswansocool48.Deskscape.desktop"


def ensure_dirs():
    migrate_from_deskscape()
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)


def migrate_from_deskscape():
    """First run after the rename: bring over your setup, pictures, saved looks and the saved
    COSMIC look (so Restore still works). The old folders are left alone."""
    import shutil
    if CONFIG_DIR.exists() or not (OLD_CONFIG_DIR.exists() or OLD_DATA_DIR.exists()):
        return
    for old, new in ((OLD_CONFIG_DIR, CONFIG_DIR), (OLD_DATA_DIR, DATA_DIR)):
        if old.is_dir() and not new.exists():
            shutil.copytree(old, new, symlinks=True)
    if OLD_AUTOSTART.exists():
        OLD_AUTOSTART.unlink(missing_ok=True)
        AUTOSTART_FILE.parent.mkdir(parents=True, exist_ok=True)
        AUTOSTART_FILE.write_text(
            "[Desktop Entry]\nType=Application\nName=Aerie\nExec=aerie --background\n"
            f"Icon={APP_ID}\nX-GNOME-Autostart-enabled=true\n")
