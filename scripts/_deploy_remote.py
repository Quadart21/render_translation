#!/usr/bin/env python3
"""One-shot remote deploy via SSH. Credentials from .env — do not commit secrets.

Streams remote stdout/stderr live with clear stage markers:
  [deploy] 1/4 connect → 2/4 git → 3/4 docker → 4/4 health
"""
from __future__ import annotations

import re
import sys
import time
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", category=DeprecationWarning, module="paramiko")
warnings.filterwarnings("ignore", message=".*TripleDES.*")

import paramiko

ROOT = Path(__file__).resolve().parents[1]
ANSI_RE = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07|\r")


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


def safe_print(msg: str = "", *, err: bool = False) -> None:
    """Print without crashing on Windows cp125x consoles."""
    stream = sys.stderr if err else sys.stdout
    try:
        stream.write(msg + "\n")
        stream.flush()
    except UnicodeEncodeError:
        enc = stream.encoding or "utf-8"
        stream.buffer.write((msg + "\n").encode(enc, errors="replace"))
        stream.flush()


def clean_line(text: str) -> str:
    return ANSI_RE.sub("", text).rstrip()


def stream_exec(client: paramiko.SSHClient, cmd: str, timeout: float = 560) -> int:
    transport = client.get_transport()
    if transport is None:
        raise RuntimeError("SSH transport is not available")
    channel = transport.open_session()
    channel.set_combine_stderr(True)
    # No PTY: avoid docker TTY spinner spam; use plain progress in cmd.
    channel.exec_command(cmd)
    channel.settimeout(1.0)

    deadline = time.time() + timeout
    buf = ""

    while True:
        if time.time() > deadline:
            safe_print("[deploy] TIMEOUT — aborting remote command", err=True)
            channel.close()
            return 124

        if channel.recv_ready():
            chunk = channel.recv(4096).decode("utf-8", "replace")
            buf += chunk
            while "\n" in buf:
                line, buf = buf.split("\n", 1)
                cleaned = clean_line(line)
                if cleaned.strip():
                    safe_print(cleaned)

        if channel.exit_status_ready():
            while channel.recv_ready():
                buf += channel.recv(4096).decode("utf-8", "replace")
            break

        time.sleep(0.05)

    if buf.strip():
        for line in buf.splitlines():
            cleaned = clean_line(line)
            if cleaned.strip():
                safe_print(cleaned)

    code = channel.recv_exit_status()
    channel.close()
    return code


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
        safe_print("DEPLOY_SSH_PASSWORD missing in .env", err=True)
        return 2

    safe_print(f"[deploy] 1/4 connect {user}@{host}")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=password, timeout=30)
    safe_print(f"[deploy] connected — branch={branch}")

    cmd = f"""set -e
cd {path}
echo '[deploy] 2/4 git fetch + reset {branch}'
git fetch --prune origin
git checkout {branch}
git reset --hard origin/{branch}
echo -n '[deploy] commit '
git rev-parse --short HEAD | tee .git-commit
echo
git log -1 --pretty=format:'[deploy] %h %s' ; echo
echo '[deploy] 3/4 docker compose build app (plain)'
DOCKER_BUILDKIT=1 docker compose build --progress=plain app
echo '[deploy] docker compose up --force-recreate'
docker compose up -d --force-recreate app nginx
sleep 5
echo '[deploy] 4/4 health'
curl -sS https://screen.norenvpn.com/api/health || curl -sS http://127.0.0.1:3000/api/health
echo
docker compose ps
echo '[deploy] done'
"""
    try:
        code = stream_exec(client, cmd, timeout=560)
    finally:
        client.close()

    safe_print(f"[deploy] exit {code}")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
