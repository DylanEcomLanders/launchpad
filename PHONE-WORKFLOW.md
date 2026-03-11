# Phone Workflow — Cooking on the Move

## First time (from your laptop in the hotel room)

### 1. Create the server
- Go to https://console.hetzner.cloud
- Create server → CX22 (€4/mo) → Ubuntu 24.04
- Add your SSH key (or note the root password)
- Note the IP address

### 2. Run the setup script
```bash
scp server-setup.sh root@YOUR_IP:~/
ssh root@YOUR_IP
bash server-setup.sh
```

### 3. SSH in as dev and set up the project
```bash
ssh dev@YOUR_IP
git clone YOUR_REPO_URL ~/launchpad
cd ~/launchpad
npm install
cp .env.example .env.local
nano .env.local          # paste your env vars
claude /login            # authenticate Claude Code
```

### 4. Test it works
```bash
tmux new -s launchpad
cd ~/launchpad && claude
```

---

## Every time (from your phone)

### Get your SSH app
- **iPhone**: Blink Shell (paid, worth it) or Termius (free tier)
- **Android**: Termux (free)

### Connect and code
```bash
ssh dev@YOUR_IP
tmux attach -t launchpad
```
You're back in Claude Code, right where you left off.

### Preview the build
Split your tmux pane (Ctrl+B then %) and run:
```bash
cd ~/launchpad
npm run dev -- -H 0.0.0.0
cloudflared tunnel --url http://localhost:3000
```
Copy the https URL → open in your phone browser.

### tmux cheat sheet
```
Ctrl+B then %      Split pane vertically
Ctrl+B then "      Split pane horizontally
Ctrl+B then →/←    Switch between panes
Ctrl+B then d      Detach (session keeps running)
tmux attach         Reattach to session
Ctrl+B then z      Zoom current pane (fullscreen toggle)
```

### When you're done
Just close the SSH app. Session stays alive on the server.
Next time: `ssh dev@YOUR_IP` → `tmux attach -t launchpad` → keep cooking.

---

## Costs
- Hetzner CX22: €4/mo
- Blink Shell: one-time purchase
- Cloudflared: free
- Claude Code: uses your existing Anthropic API key / subscription
