#!/usr/bin/env bash
# One-line installer published on the Aerie page:
#   curl -fsSL https://jayswansocool48.github.io/aerie/install.sh | bash
# Adds Aerie's signed package source (so updates arrive with your other updates and in
# the COSMIC Store), installs Aerie and starts it.
set -euo pipefail
URL=https://jayswansocool48.github.io/aerie
echo "Installing Aerie (asks for your password)…"
curl -fsSL "$URL/aerie.gpg" | sudo tee /usr/share/keyrings/aerie.gpg >/dev/null
curl -fsSL "$URL/aerie.sources" | sudo tee /etc/apt/sources.list.d/aerie.sources >/dev/null
sudo apt-get update -qq
sudo apt-get install -y aerie
(setsid aerie >/dev/null 2>&1 &)
echo "Done! Aerie is your live wallpaper. Find it in your app list and the COSMIC Store."
echo "Uninstall any time: Aerie → Settings → Uninstall, or remove it in the COSMIC Store."
