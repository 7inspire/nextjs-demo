# Next.js demo

Next.js App Router demo on Google Compute Engine. Edit `app/page.js` and `app/layout.js` to change the site.

## Local development

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Check a production build with `npm run build`.

## Deploy

Commit and push changes to `main`, then open the VM's SSH terminal in Google Cloud Console:

```bash
git add .
git commit -m "Update site"
git push origin main
```

On the VM, run:

```bash
sudo /usr/local/sbin/deploy-nextjs-demo
```

The script clones `main` using a VM-specific read-only deploy key, installs the exact lockfile dependencies, builds a separate release, switches the current symlink, restarts systemd and checks the local HTTP endpoint. A failed build leaves the running release untouched; a failed post-restart health check restores the previous release. Old releases are kept for manual recovery and consume disk space.

Useful checks: `sudo systemctl status nextjs-demo`, `sudo journalctl -u nextjs-demo -n 100 --no-pager`, and `readlink -f /opt/nextjs-demo-current`. The original site remains at `/opt/nextjs-demo` as a fallback. The deploy script installed at `/usr/local/sbin/deploy-nextjs-demo` must be updated separately if `scripts/deploy.sh` changes.
