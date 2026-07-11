#!/usr/bin/env bash
# Launcher for one checksum-pinned ShellCheck binary on Windows Git Bash
# and Linux CI. The binary is cached locally, but its hash is checked every run.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
readonly ROOT
readonly VERSION="0.11.0"
readonly RELEASE_BASE="https://github.com/koalaman/shellcheck/releases/download/v${VERSION}"

UNAME_S="$(uname -s 2>/dev/null || echo unknown)"
UNAME_M="$(uname -m 2>/dev/null || echo unknown)"

case "$UNAME_S:$UNAME_M" in
  Linux:x86_64|Linux:amd64)
    readonly PLATFORM="linux-x86_64"
    readonly ASSET="shellcheck-v${VERSION}.linux.x86_64.tar.gz"
    readonly ARCHIVE_SHA256="b7af85e41cc99489dcc21d66c6d5f3685138f06d34651e6d34b42ec6d54fe6f6"
    readonly BINARY_SHA256="4da528ddb3a4d1b7b24a59d4e16eb2f5fd960f4bd9a3708a15baddbdf1d5a55b"
    readonly MEMBER="shellcheck-v${VERSION}/shellcheck"
    readonly BINARY_NAME="shellcheck"
    readonly EXTRACTOR="tar"
    ;;
  MINGW*:x86_64|MSYS*:x86_64|CYGWIN*:x86_64)
    readonly PLATFORM="windows-x86_64"
    readonly ASSET="shellcheck-v${VERSION}.zip"
    readonly ARCHIVE_SHA256="8a4e35ab0b331c85d73567b12f2a444df187f483e5079ceffa6bda1faa2e740e"
    readonly BINARY_SHA256="c9e82ada36ef4b8d4caf1f97fa89289048c8f4a33c2c76ffffc88bfe09ff00c5"
    readonly MEMBER="shellcheck.exe"
    readonly BINARY_NAME="shellcheck.exe"
    readonly EXTRACTOR="unzip"
    ;;
  *)
    echo "shellcheck bootstrap: unsupported platform '$UNAME_S' architecture '$UNAME_M'" >&2
    echo "Supported: Linux x86_64 and Windows x86_64 under Git Bash." >&2
    exit 1
    ;;
esac

readonly CACHE_DIR="$ROOT/.cache/shellcheck/v${VERSION}/${PLATFORM}"
readonly BINARY="$CACHE_DIR/$BINARY_NAME"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "shellcheck bootstrap: required command '$1' is not available" >&2
    exit 1
  fi
}

sha256_file() {
  sha256sum "$1" | awk '{ print $1 }'
}

binary_is_valid() {
  [ -f "$BINARY" ] || return 1
  [ "$(sha256_file "$BINARY")" = "$BINARY_SHA256" ] || return 1
  "$BINARY" --version 2>/dev/null | grep -F "version: $VERSION" >/dev/null
}

require_command sha256sum

if ! binary_is_valid; then
  require_command curl
  require_command "$EXTRACTOR"
  mkdir -p "$CACHE_DIR"

  TMP_DIR="$(mktemp -d "$CACHE_DIR/.download.XXXXXX")"
  TMP_ARCHIVE="$TMP_DIR/$ASSET"
  TMP_BINARY="$TMP_DIR/$BINARY_NAME"

  cleanup() {
    rm -f "$TMP_ARCHIVE" "$TMP_BINARY"
    rmdir "$TMP_DIR" 2>/dev/null || true
  }
  trap cleanup EXIT HUP INT TERM

  echo "shellcheck bootstrap: downloading ShellCheck v$VERSION for $PLATFORM" >&2
  curl --fail --location --silent --show-error \
    --retry 5 --retry-delay 2 --retry-all-errors \
    "$RELEASE_BASE/$ASSET" -o "$TMP_ARCHIVE"

  if [ "$(sha256_file "$TMP_ARCHIVE")" != "$ARCHIVE_SHA256" ]; then
    echo "shellcheck bootstrap: archive checksum mismatch for $ASSET" >&2
    exit 1
  fi

  case "$EXTRACTOR" in
    tar) tar -xOzf "$TMP_ARCHIVE" "$MEMBER" > "$TMP_BINARY" ;;
    unzip) unzip -p "$TMP_ARCHIVE" "$MEMBER" > "$TMP_BINARY" ;;
  esac

  if [ "$(sha256_file "$TMP_BINARY")" != "$BINARY_SHA256" ]; then
    echo "shellcheck bootstrap: binary checksum mismatch for $BINARY_NAME" >&2
    exit 1
  fi

  chmod 755 "$TMP_BINARY"
  if ! "$TMP_BINARY" --version 2>/dev/null | grep -F "version: $VERSION" >/dev/null; then
    echo "shellcheck bootstrap: downloaded binary did not report version $VERSION" >&2
    exit 1
  fi

  mv -f "$TMP_BINARY" "$BINARY"
  cleanup
  trap - EXIT HUP INT TERM
fi

exec "$BINARY" "$@"
