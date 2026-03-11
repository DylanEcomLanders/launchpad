#!/bin/bash
# ══════════════════════════════════════════════════════════════
# Launchpad — Remote Dev Server Setup
# Run this on a fresh Hetzner VPS (Ubuntu 24.04)
#
# Usage:
#   1. Create a Hetzner CX22 (€4/mo, Ubuntu 24.04)
#   2. SSH in from your laptop: ssh root@YOUR_SERVER_IP
#   3. Run: bash server-setup.sh
#   4. Follow the prompts
# ══════════════════════════════════════════════════════════════

set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Launchpad Remote Dev Setup         ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. System packages ──────────────────────────────────────

echo "→ Installing system packages..."
apt update && apt upgrade -y
apt install -y curl git tmux build-essential unzip

# ── 2. Node.js 22 ───────────────────────────────────────────

echo "→ Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
echo "  Node: $(node -v)"
echo "  npm:  $(npm -v)"

# ── 3. Claude Code ──────────────────────────────────────────

echo "→ Installing Claude Code..."
npm install -g @anthropic-ai/claude-code
echo "  Claude Code installed ✓"

# ── 4. Cloudflare Tunnel (for phone preview) ────────────────

echo "→ Installing Cloudflared..."
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb
rm /tmp/cloudflared.deb
echo "  Cloudflared installed ✓"

# ── 5. Create dev user (don't run everything as root) ───────

echo "→ Creating dev user..."
if id "dev" &>/dev/null; then
  echo "  User 'dev' already exists"
else
  adduser --disabled-password --gecos "" dev
  usermod -aG sudo dev
  echo "dev ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/dev
  # Copy SSH keys so you can SSH as dev
  mkdir -p /home/dev/.ssh
  cp /root/.ssh/authorized_keys /home/dev/.ssh/
  chown -R dev:dev /home/dev/.ssh
  chmod 700 /home/dev/.ssh
  chmod 600 /home/dev/.ssh/authorized_keys
  echo "  User 'dev' created ✓"
fi

# ── 6. Clone repo ──────────────────────────────────────────

echo ""
echo "══════════════════════════════════════"
echo "  Setup complete! Next steps:"
echo "══════════════════════════════════════"
echo ""
echo "  1. SSH in as dev:"
echo "     ssh dev@$(curl -s ifconfig.me)"
echo ""
echo "  2. Clone your repo:"
echo "     git clone YOUR_REPO_URL ~/launchpad"
echo "     cd ~/launchpad && npm install"
echo ""
echo "  3. Set up your .env.local:"
echo "     cp .env.example .env.local"
echo "     nano .env.local"
echo ""
echo "  4. Authenticate Claude Code:"
echo "     claude /login"
echo ""
echo "  5. Start coding:"
echo "     tmux new -s launchpad"
echo "     cd ~/launchpad && claude"
echo ""
echo "  6. Preview on your phone:"
echo "     (in a second tmux pane: Ctrl+B then %)"
echo "     npm run dev -- -H 0.0.0.0"
echo "     cloudflared tunnel --url http://localhost:3000"
echo "     → Copy the URL to your phone browser"
echo ""
echo "══════════════════════════════════════"
echo ""
