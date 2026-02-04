#!/bin/bash

set -e

echo "Checking Node.js version..."

if ! command -v nvm &> /dev/null; then
  echo "NVM not found. Installing NVM..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
fi

NODE_VERSION="22n"

if [ "$(nvm current)" != "v$NODE_VERSION" ]; then
  echo "Installing and using Node.js $NODE_VERSION..."
  nvm install "$NODE_VERSION"
  nvm use "$NODE_VERSION"
else
  echo "Node.js $NODE_VERSION is already active."
fi

if ! command -v pnpm &> /dev/null; then
  echo "Installing pnpm..."
  npm install -g pnpm
else
  echo "pnpm is already installed."
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  pnpm install
else
  echo "Dependencies are already installed."
fi

echo "✅ Setup complete! You can now run 'pnpm run dev' to start the server."
