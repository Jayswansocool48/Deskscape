#!/usr/bin/env bash
# One-line installer published on the Deskscape page:
#   curl -fsSL https://jayswansocool48.github.io/Deskscape/install.sh | bash
# Adds Deskscape's signed package source (so updates arrive with your other updates and in
# the COSMIC Store), installs Deskscape and starts it.
set -euo pipefail
URL=https://jayswansocool48.github.io/Deskscape
echo "Installing Deskscape (asks for your password)…"
curl -fsSL "$URL/deskscape.gpg" | sudo tee /usr/share/keyrings/deskscape.gpg >/dev/null
curl -fsSL "$URL/deskscape.sources" | sudo tee /etc/apt/sources.list.d/deskscape.sources >/dev/null
sudo apt-get update -qq
sudo apt-get install -y deskscape
(setsid deskscape >/dev/null 2>&1 &)
echo "Done! Deskscape is your live wallpaper. Find it in your app list and the COSMIC Store."
echo "Uninstall any time: Deskscape → Settings → Uninstall, or remove it in the COSMIC Store."
