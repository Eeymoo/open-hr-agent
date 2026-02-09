#!/bin/sh

set -e

echo "Configuring git..."
git config --global user.name "HR-Agent"
git config --global user.email "hra@xmail.fun"

if [ -n "$SSH_PRIVATE_KEY" ] && [ -n "$SSH_PUBLIC_KEY" ]; then
    echo "Setting up SSH keys..."
    mkdir -p ~/.ssh
    chmod 700 ~/.ssh
    
    echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_ed25519
    chmod 600 ~/.ssh/id_ed25519
    
    echo "$SSH_PUBLIC_KEY" > ~/.ssh/id_ed25519.pub
    chmod 644 ~/.ssh/id_ed25519.pub
    
    echo "SSH keys configured successfully"
    
    echo "Authenticating with GitHub CLI..."
    gh auth login --hostname github.com --git-protocol ssh --no-browser --ssh-key ~/.ssh/id_ed25519 || echo "GitHub CLI authentication failed, continuing..."
fi

echo "Starting opencode..."
exec "$@"
