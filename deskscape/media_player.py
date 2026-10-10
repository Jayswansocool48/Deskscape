"""Now-playing info and play/pause/next controls for the Now Playing widget.

Uses MPRIS, the standard way Linux music and video players (Spotify, browsers,
Rhythmbox, VLC, …) share what they are playing. Everything stays on this computer;
album art is only shown when the player provides a local file.
"""

from urllib.parse import unquote, urlparse

try:
    import gi
    gi.require_version("Gio", "2.0")
    from gi.repository import Gio, GLib
except (ImportError, ValueError):  # running the page-only dev server without GTK
    Gio = GLib = None

PREFIX = "org.mpris.MediaPlayer2."
PATH = "/org/mpris/MediaPlayer2"
PLAYER = "org.mpris.MediaPlayer2.Player"
ACTIONS = {"play-pause": "PlayPause", "next": "Next", "previous": "Previous"}


def _bus():
    return Gio.bus_get_sync(Gio.BusType.SESSION, None) if Gio else None


def _players(bus):
    names = bus.call_sync("org.freedesktop.DBus", "/org/freedesktop/DBus", "org.freedesktop.DBus",
                          "ListNames", None, None, Gio.DBusCallFlags.NONE, 1000, None).unpack()[0]
    return [n for n in names if n.startswith(PREFIX)]


def _props(bus, name):
    return bus.call_sync(name, PATH, "org.freedesktop.DBus.Properties", "GetAll",
                         GLib.Variant("(s)", (PLAYER,)), None, Gio.DBusCallFlags.NONE, 1000, None).unpack()[0]


def _pick(bus):
    """The player that is playing, otherwise the first one that is paused."""
    best = None
    for name in _players(bus):
        try:
            props = _props(bus, name)
        except GLib.Error:
            continue
        status = props.get("PlaybackStatus", "Stopped")
        if status == "Playing":
            return name, props
        if status == "Paused" and best is None:
            best = (name, props)
    return best


def status():
    if Gio is None:
        return {"available": False}
    try:
        bus = _bus()
        found = _pick(bus)
    except GLib.Error:
        return {"available": False}
    if not found:
        return {"available": True, "active": False}
    name, props = found
    meta = props.get("Metadata", {})
    artists = meta.get("xesam:artist") or []
    art = meta.get("mpris:artUrl", "")
    art_path = unquote(urlparse(art).path) if art.startswith("file://") else ""
    return {
        "available": True,
        "active": True,
        "player": name[len(PREFIX):].split(".")[0].capitalize(),
        "title": meta.get("xesam:title", "") or "Unknown title",
        "artist": ", ".join(artists) if isinstance(artists, list) else str(artists),
        "album": meta.get("xesam:album", ""),
        "playing": props.get("PlaybackStatus") == "Playing",
        "length": int(meta.get("mpris:length", 0) or 0) // 1_000_000,
        "position": int(props.get("Position", 0) or 0) // 1_000_000,
        "hasArt": bool(art_path),
        "artPath": art_path,
    }


def control(action):
    if Gio is None or action not in ACTIONS:
        return False
    try:
        bus = _bus()
        found = _pick(bus)
        if not found:
            return False
        bus.call_sync(found[0], PATH, PLAYER, ACTIONS[action], None, None, Gio.DBusCallFlags.NONE, 1000, None)
        return True
    except GLib.Error:
        return False
