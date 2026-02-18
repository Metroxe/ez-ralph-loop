#!/bin/bash
set -euo pipefail

REPO="Metroxe/cig-loop"
BIN_NAME="cig-loop"

# Detect OS
OS="$(uname -s)"
case "$OS" in
  Darwin) os="darwin" ;;
  Linux)  os="linux" ;;
  *)
    echo "Error: Unsupported operating system: $OS"
    exit 1
    ;;
esac

# Detect architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64)  arch="x64" ;;
  arm64|aarch64) arch="arm64" ;;
  *)
    echo "Error: Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

TARGET="${os}-${arch}"
ASSET_NAME="${BIN_NAME}-${TARGET}"

echo "Detected platform: ${TARGET}"

# Determine install directory
if [ -n "${CIG_INSTALL_DIR:-}" ]; then
  INSTALL_DIR="$CIG_INSTALL_DIR"
elif [ -w "/usr/local/bin" ]; then
  INSTALL_DIR="/usr/local/bin"
else
  INSTALL_DIR="${HOME}/.local/bin"
fi

mkdir -p "$INSTALL_DIR"

# Get latest release tag from GitHub API
echo "Fetching latest release..."
RELEASE_JSON="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest")"
TAG="$(echo "$RELEASE_JSON" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"//;s/".*//')"

if [ -z "$TAG" ]; then
  echo "Error: Could not determine the latest release version."
  exit 1
fi

echo "Latest version: ${TAG}"

INSTALL_PATH="${INSTALL_DIR}/${BIN_NAME}"

# Check if already installed
if [ -f "$INSTALL_PATH" ]; then
  echo "Existing installation found. Upgrading to ${TAG}..."
else
  echo "Installing ${BIN_NAME} ${TAG}..."
fi

# Download the binary
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${TAG}/${ASSET_NAME}"
echo "Downloading from ${DOWNLOAD_URL}..."
curl -f#L -o "$INSTALL_PATH" "$DOWNLOAD_URL"

# Make executable
chmod +x "$INSTALL_PATH"

echo ""
echo "${BIN_NAME} ${TAG} installed successfully to ${INSTALL_PATH}"

# Check if install directory is on PATH
case ":${PATH}:" in
  *":${INSTALL_DIR}:"*) ;;
  *)
    echo ""
    echo "WARNING: ${INSTALL_DIR} is not in your PATH."
    echo "Add it by running:"
    echo ""
    SHELL_NAME="$(basename "$SHELL")"
    case "$SHELL_NAME" in
      zsh)  SHELL_RC="~/.zshrc" ;;
      fish) SHELL_RC="~/.config/fish/config.fish" ;;
      *)    SHELL_RC="~/.bashrc" ;;
    esac
    echo "  echo 'export PATH=\"${INSTALL_DIR}:\$PATH\"' >> ${SHELL_RC} && source ${SHELL_RC}"
    echo ""
    ;;
esac
