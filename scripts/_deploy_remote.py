#!/usr/bin/env python3
"""One-shot remote deploy via SSH. Credentials from .env — do not commit secrets.

Streams remote stdout/stderr live so the terminal shows progress
(fetch → build → up → health), not a silent buffer until the end.
"""
from __future__ import annotations

import sys
import time
import warnings
from pathlib import Path

# Paramiko pulls deprecated TripleDES — noise, not a deploy failure.
warnings.filterwarnings("ignore", category=DeprecationWarning, module="paramiko")
warnings.filterwarnings("ignore", message=".*TripleDES.*")

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


def log(msg: str) -> None:
    print(msg, flush=True)


def stream_exec(client: paramiko.SSHClient, cmd: str, timeout: float = 560) -> int:
    """Run remote command and print stdout/stderr as they arrive."""
    transport = client.get_transport()
    if transport is None:
        raise RuntimeError("SSH transport is not available")
    channel = transport.open_session()
    channel.set_combine_stderr(False)
    channel.get_pty()  # docker/build progress often needs a TTY
    channel.exec_command(cmd)
    channel.settimeout(1.0)

    deadline = time.time() + timeout
    stdout_buf = ""
    stderr_buf = ""

    while True:
        if time.time() > deadline:
            log("[deploy] TIMEOUT — aborting remote command")
            channel.close()
            return 124

        if channel.recv_ready():
            chunk = channel.recv(4096).decode("utf-8", "replace")
            stdout_buf += chunk
            while "\n" in stdout_buf:
                line, stdout_buf = stdout_buf.split("\n", 1)
                print(line, flush=True)

        if channel.recv_stderr_ready():
            chunk = channel.recv_stderr(4096).decode("utf-8", "replace")
            stderr_buf += chunk
            while "\n" in stderr_buf:
                line, stderr_buf = stderr_buf.split("\n", 1)
                print(f"[remote:err] {line}", flush=True)

        if channel.exit_status_ready():
            # drain remaining
            while channel.recv_ready():
                chunk = channel.recv(4096).decode("utf-8", "replace")
                stdout_buf += chunk
            while channel.recv_stderr_ready():
                chunk = channel.recv_stderr(4096).decode("utf-8", "replace")
                stderr_buf += chunk
            break

        # avoid busy-spin when nothing is ready
        time.sleep(0.05)

    if stdout_buf.strip():
        print(stdout_buf.rstrip("\n"), flush=True)
    if stderr_buf.strip():
        for line in stderr_buf.rstrip("\n").splitlines():
            print(f"[remote:err] {line}", flush=True)

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
        print("DEPLOY_SSH_PASSWORD missing in .env", file=sys.stderr, flush=True)
        return 2

    log(f"[deploy] 1/4 connect {user}@{host}")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=password, timeout=30)
    log(f"[deploy] connected — branch={branch} path={path}")

    cmd = f"""set -e
cd {path}
echo '[deploy] 2/4 git fetch + reset {branch}'
git fetch --prune origin
git checkout {branch}
git reset --hard origin/{branch}
echo -n '[deploy] commit '
git rev-parse --short HEAD | tee .git-commit
git log -1 --oneline
echo '[deploy] 3/4 docker compose build app'
docker compose build app
echo '[deploy] docker compose up -d --force-recreate app nginx'
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

    log(f"[deploy] exit {code}")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
