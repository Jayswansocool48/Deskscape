#!/usr/bin/env bash
# One-time setup so tagged releases publish Aerie's package source (updates for everyone).
# Run on your own computer (needs gh signed in) when you are ready to release publicly.
#   1. creates a signing key and stores it as the GPG_PRIVATE_KEY secret
#   2. turns on publishing (APT_PUBLISH variable)
#   3. turns on GitHub Pages for the repository
set -euo pipefail
REPO=Jayswansocool48/aerie

command -v gh >/dev/null || { echo "Install the GitHub CLI first: sudo apt install gh"; exit 1; }
gh auth status >/dev/null || { echo "Sign in first: gh auth login"; exit 1; }

if [ "$(gh repo view "$REPO" --json visibility --jq .visibility)" != "PUBLIC" ]; then
  echo "The repository is private. Make it public first (finish COMPLIANCE.md, then):"
  echo "  gh repo edit $REPO --visibility public --accept-visibility-change-consequences"
  exit 1
fi

KEYDIR=$(mktemp -d)
trap 'rm -rf "$KEYDIR"' EXIT
export GNUPGHOME="$KEYDIR"
gpg --batch --passphrase '' --quick-gen-key "Aerie packages <Jayswansocool48@users.noreply.github.com>" ed25519 sign never
gpg --batch --armor --export-secret-keys | gh secret set GPG_PRIVATE_KEY --repo "$REPO"
gh variable set APT_PUBLISH --body true --repo "$REPO"
gh api -X POST "repos/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 \
  || gh api -X PUT "repos/$REPO/pages" -f build_type=workflow >/dev/null
echo
echo "Publishing is on. Release a version with:"
echo "  GitHub → Actions → Release → Run workflow"
echo "Then anyone can install from https://jayswansocool48.github.io/aerie/"
