# Next.js demo

A browser-local toolbox on Google Compute Engine: QR codes, Base64 and URL encoding, SHA-256/SHA-512/MD5 hashes, AES-256-GCM text encryption, JSON formatting, Unix timestamp conversion and UUID v4 generation. Edit `app/page.js` and `app/globals.css` to change the site.

AES ciphertext uses the toolbox-specific `TL2` format with PBKDF2-SHA-256 (210,000 iterations), a random salt and a random nonce. Keep the password safe; this format is not compatible with arbitrary AES tools. MD5 is included for legacy interoperability and is unsuitable for password storage or security verification. The site is currently served over HTTP, so use HTTPS before entering sensitive data: HTTP cannot protect the JavaScript delivered to the browser.

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

The script clones `main` over HTTPS (the repository is public), installs the exact lockfile dependencies, builds a separate release, switches the current symlink, restarts systemd and checks the local HTTP endpoint. A failed build leaves the running release untouched; a failed post-restart health check restores the previous release. Old releases are kept for manual recovery and consume disk space.

Useful checks: `sudo systemctl status nextjs-demo`, `sudo journalctl -u nextjs-demo -n 100 --no-pager`, and `readlink -f /opt/nextjs-demo-current`. The original site remains at `/opt/nextjs-demo` as a fallback. The deploy script installed at `/usr/local/sbin/deploy-nextjs-demo` must be updated separately if `scripts/deploy.sh` changes.
