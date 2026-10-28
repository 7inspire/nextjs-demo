#!/usr/bin/env bash
set -Eeuo pipefail

# Run on the VM as root. The repository is public, so no credential is needed.
[[ $EUID -eq 0 ]] || { echo 'Run with sudo.' >&2; exit 1; }
repo='https://github.com/7inspire/nextjs-demo.git'
base=/opt/nextjs-demo-releases
current=/opt/nextjs-demo-current
export GIT_TERMINAL_PROMPT=0
export NEXT_TELEMETRY_DISABLED=1

exec 9>/run/lock/nextjs-demo-deploy.lock
flock -n 9 || { echo 'A deployment is already running.' >&2; exit 1; }
mkdir -p "$base"
release=$(mktemp -d "$base/release-XXXXXXXX")
switched=0
cleanup() {
  if (( switched )); then
    echo 'Deployment interrupted or failed; restoring previous release.' >&2
    ln -sfn "$previous" "${current}.new"
    mv -Tf "${current}.new" "$current"
    systemctl restart nextjs-demo || true
  fi
  rm -rf -- "$release"
}
trap cleanup EXIT

git clone --quiet --branch main --single-branch "$repo" "$release"
commit=$(git -C "$release" rev-parse --short HEAD)
chown -R nextdemo:nextdemo "$release"
sudo -u nextdemo env NEXT_TELEMETRY_DISABLED=1 npm --prefix "$release" ci --no-audit --no-fund
sudo -u nextdemo env NEXT_TELEMETRY_DISABLED=1 npm --prefix "$release" run build

previous=$(readlink -f "$current")
[[ -d $previous ]] || { echo 'Current release is missing; refusing to switch.' >&2; exit 1; }
ln -sfn "$release" "${current}.new"
mv -Tf "${current}.new" "$current"
switched=1
if systemctl restart nextjs-demo; then
  for _ in {1..30}; do
    if curl --fail --silent --output /dev/null http://127.0.0.1:3000/; then
      trap - EXIT
      echo "Deployed commit $commit at $release"
      exit 0
    fi
    sleep 2
  done
fi
echo 'Health check failed.' >&2
exit 1
