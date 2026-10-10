"""Where Deskscape keeps its files. Everything stays on this computer."""

import os
from pathlib import Path

from . import APP_ID

PACKAGE_DIR = Path(__file__).resolve().parent
WEB_DIR = PACKAGE_DIR.parent / "web"

_config_home = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
_data_home = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))

CONFIG_DIR = _config_home / "deskscape"
CONFIG_FILE = CONFIG_DIR / "config.json"
DATA_DIR = _data_home / "deskscape"
MEDIA_DIR = DATA_DIR / "media"
AUTOSTART_FILE = _config_home / "autostart" / f"{APP_ID}.desktop"


def ensure_dirs():
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
