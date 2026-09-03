#!/usr/bin/env python3
"""One-shot remote deploy via SSH. Credentials from .env — do not commit secrets."""
from __future__ import annotations

import sys
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[1]


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    path = ROOT / ".env"
    if not path.is_file():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def main() -> int:
    env = load_env()
    host = env.get("DEPLOY_HOST", "144.31.218.222")
    user = env.get("DEPLOY_USER", "root")
    password = env.get("DEPLOY_SSH_PASSWORD")
    path = env.get("DEPLOY_PATH", "/opt/render-screen")
    branch = env.get("DEPLOY_BRANCH")
    if not branch:
        import subprocess

        branch = subprocess.check_output(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=ROOT,
            text=True,
        ).strip()
    if not password:
        print("DEPLOY_SSH_PASSWORD missing in .env", file=sys.stderr)
        return 2

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=password, timeout=30)

    cmd = f"""set -e
cd {path}
echo '==> fetch + reset {branch}'
git fetch --prune origin
git checkout {branch}
git reset --hard origin/{branch}
git rev-parse --short HEAD | tee .git-commit
git log -1 --oneline
echo '==> docker build/up'
docker compose build app
docker compose up -d --force-recreate app nginx
sleep 5
echo '==> health'
curl -sS https://screen.norenvpn.com/api/health || curl -sS http://127.0.0.1:3000/api/health
echo
docker compose ps
"""
    stdin, stdout, stderr = client.exec_command(cmd, timeout=560)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    client.close()
    print(out[-4000:] if len(out) > 4000 else out)
    if err.strip():
        print("STDERR:", err[-2500:] if len(err) > 2500 else err)
    print("exit", code)
    return code


if __name__ == "__main__":
    raise SystemExit(main())
