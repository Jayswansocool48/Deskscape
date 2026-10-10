#!/usr/bin/env bash
# Deskscape installer for Pop!_OS (COSMIC).
#
#   ./install.sh               install, or update if already installed
#   ./install.sh --uninstall   remove Deskscape and all of its data
#   ./install.sh --check       show what is installed and why Deskscape might not work
#
# Deskscape is installed as a regular Pop!_OS package (not a Flatpak): COSMIC only lets
# apps outside the Flatpak sandbox draw on the desktop layer, which a live wallpaper needs.
# Once installed it appears in the COSMIC Store, which can also uninstall it.
set -euo pipefail

APP_ID=io.github.jayswansocool48.Deskscape
SRC=$(cd "$(dirname "$0")" && pwd)
PUBLISHED=https://jayswansocool48.github.io/Deskscape
BUILD_DEPS="meson ninja-build gcc pkg-config libgtk-4-dev libwayland-dev wayland-protocols gobject-introspection libgirepository1.0-dev dpkg-dev git"

say() { printf '\n\033[1;33m==>\033[0m %s\n' "$*"; }

remove_old_copies() {
  # Earlier test versions: a Flatpak (can't be a wallpaper on COSMIC) and a manual install.
  if command -v flatpak >/dev/null && flatpak info "$APP_ID" >/dev/null 2>&1; then
    say "Removing the old Flatpak version of Deskscape"
    flatpak kill "$APP_ID" 2>/dev/null || true
    flatpak uninstall -y --noninteractive --delete-data "$APP_ID" || true
  fi
  if command -v flatpak >/dev/null; then
    flatpak remote-delete --user --force deskscape-local 2>/dev/null || true
    flatpak remote-delete --user --force deskscape 2>/dev/null || true
  fi
  rm -rf "$HOME/.local/share/deskscape-flatpak-repo" "$HOME/.cache/deskscape-build" \
    "$HOME/.local/lib/deskscape" "$HOME/.local/bin/deskscape" \
    "$HOME/.local/share/applications/deskscape.desktop" \
    "$HOME/.local/share/icons/hicolor/scalable/apps/deskscape.svg" \
    "$HOME/.config/autostart/deskscape.desktop"
}

case "${1:-}" in
  --check)
    say "Installed package"
    dpkg -s deskscape 2>/dev/null | grep -E "^(Status|Version)" || echo "Deskscape is NOT installed. Run ./install.sh"
    say "Old Flatpak copy (should say 'none')"
    (command -v flatpak >/dev/null && flatpak info "$APP_ID" 2>/dev/null | head -3) || echo "none"
    say "Update source"
    cat /etc/apt/sources.list.d/deskscape.sources 2>/dev/null || echo "none (run ./install.sh to add it)"
    say "Desktop: ${XDG_CURRENT_DESKTOP:-unknown}, session: ${XDG_SESSION_TYPE:-unknown}"
    if command -v deskscape >/dev/null; then
      say "Starting Deskscape for 15 seconds to catch errors"
      deskscape --quit 2>/dev/null || true
      sleep 1
      timeout 15 deskscape 2>&1 | tail -30 || true
      say "What Deskscape sees of your windows (8 seconds)"
      deskscape --windows 2>&1 | tail -20 || true
      say "Deskscape log"
      deskscape --log | tail -30
    fi
    echo
    echo "Copy everything above and send it to Claude if Deskscape still doesn't work."
    exit 0
    ;;
  --uninstall)
    say "Removing Deskscape (asks for your password)"
    deskscape --quit 2>/dev/null || true
    deskscape --restore-cosmic-look 2>/dev/null || true
    remove_old_copies
    sudo apt-get purge -y deskscape || true
    rm -rf "$HOME/.config/deskscape" "$HOME/.local/share/deskscape" "$HOME/.cache/deskscape.log" \
      "$HOME/.config/autostart/$APP_ID.desktop" "$SRC/build" "$SRC/dist"
    echo "Deskscape and all of its data are gone."
    exit 0
    ;;
esac

remove_old_copies

if curl -fsSL --max-time 10 -o /dev/null "$PUBLISHED/deskscape.gpg" 2>/dev/null; then
  # Released: add Deskscape's package source, so updates arrive with your other updates
  # (COSMIC Store → Updates) and Settings → Check for updates works.
  say "Adding Deskscape's update source (asks for your password)"
  curl -fsSL "$PUBLISHED/deskscape.gpg" | sudo tee /usr/share/keyrings/deskscape.gpg >/dev/null
  curl -fsSL "$PUBLISHED/deskscape.sources" | sudo tee /etc/apt/sources.list.d/deskscape.sources >/dev/null
  sudo apt-get update -qq
  say "Installing Deskscape"
  sudo apt-get install -y deskscape
else
  # Not released yet: build the package on this computer from this folder.
  if [ -d "$SRC/.git" ]; then
    say "Getting the newest code"
    before=$(git -C "$SRC" rev-parse HEAD)
    git -C "$SRC" pull --ff-only || echo "Could not pull (no internet or local changes). Building what is here."
    # If this script itself changed, run the new copy.
    [ "$(git -C "$SRC" rev-parse HEAD)" = "$before" ] || exec "$SRC/install.sh" "$@"
  fi
  say "Installing build tools (asks for your password, first time only)"
  # shellcheck disable=SC2086
  sudo apt-get install -y --no-install-recommends $BUILD_DEPS
  say "Building Deskscape"
  rm -f "$SRC"/dist/deskscape_*.deb
  "$SRC/tools/build-deb.sh"
  say "Installing Deskscape"
  sudo apt-get install -y --reinstall "$(ls "$SRC"/dist/deskscape_*.deb)"
fi

say "Starting Deskscape"
deskscape --quit 2>/dev/null || true
sleep 1
(setsid deskscape >/dev/null 2>&1 &)

echo
echo "Done! Deskscape is now your live wallpaper. It opened with the Customize panel;"
echo "click Done and it settles behind your windows. Find it in your app list and the COSMIC Store."
echo "Update:    COSMIC Store → Updates, or Deskscape → Settings → Check for updates"
echo "Uninstall: Settings → Uninstall Deskscape, the COSMIC Store, or ./install.sh --uninstall"
