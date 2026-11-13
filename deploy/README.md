# Deploying the coach

The coach is the page `web/coach.wac` and its server `server/coach.wac`. It runs on one ordinary Linux machine,
with nothing specific to any vendor:

- **Caddy** terminates TLS (it gets and renews the certificate from Let's Encrypt itself) and passes every request to
  the server on 127.0.0.1:8080.
- **The server** is a `wac app`, run by node under systemd as the `coach` user (`coach.service`). It serves the page
  and the about page, and keeps the moves of players who share them as JSON lines in `/var/lib/coach`, which only it
  can read.
- **A daily backup** (`coach-backup.timer`) tars `/var/lib/coach` into `/var/backups/coach` and keeps 14 days of them.
- **Releases** go to `/opt/coach/releases/<commit>`, with `/opt/coach/current` pointing at the live one; the last
  five are kept, so going back is one symlink and a restart.

## What Andrew provides

1. **A machine.** Any small VM: 1 vCPU, 1 GB of RAM, 20 GB of disk, Debian 12 or Ubuntu 24.04, with a public IPv4
   address (IPv6 too, if the provider gives one). The server needs little: a move is under 8 KB and is appended to a
   file. Ports 22, 80 and 443 open to the internet; 80 is needed for the certificate and redirects to 443.
2. **SSH access as root** from the machine that deploys, by key. (A user with passwordless `sudo` works too, with the
   scripts' `ssh` commands run through `sudo`; root is simpler for a machine that does one thing.)
3. **A domain name**, such as `coach.example.org`, with DNS records pointing at the machine: an `A` record for its
   IPv4 address and an `AAAA` record for its IPv6 one, if it has one. They must resolve before the first deploy, or
   Caddy cannot get a certificate.
4. **Nothing secret.** The server has no accounts and signs nothing, so it needs no keys, tokens or passwords. The
   only secret is SSH access to the machine.
5. **A decision on retention**, if not the defaults: games are deleted 12 months after they started
   (`RETENTION_DAYS`), and at most 10 GB is kept in all and 20 MB for one player (`MAX_TOTAL_MB`, `MAX_PLAYER_MB`),
   in `/etc/coach/coach.env`. The about page says 12 months and 14 days of backups; change it with them.
6. **Optionally, off-machine backups.** The daily backups stay on the machine. Copying `/var/backups/coach` elsewhere
   (the provider's snapshots, or `rsync` to another host) would survive losing the machine; they hold players' moves,
   so keep them where only Andrew can read them, and no longer than 14 days.

## How to deploy

The machine that deploys needs this repository, `wac` (`~/.wac/bin/wac`, at the commit `server/wac.json5` pins),
`node`, `rsync` and `ssh`.

The first time, which also prepares the machine (`setup.sh`: node 22 and Caddy from their own apt repositories, the
`coach` user, the units, the Caddyfile and the firewall):

```sh
sh deploy/deploy.sh root@<host> --setup coach.example.org
```

Every time after that:

```sh
sh deploy/deploy.sh root@<host>
```

It builds the release (`deploy/build.sh`: the pages, the server as a `wac app`, and the `wac` that runs it), copies
it, switches `/opt/coach/current` to it, restarts the server and checks that `/health` answers.

To go back to an earlier release, on the machine:

```sh
ls -1t /opt/coach/releases
ln -sfn /opt/coach/releases/<commit> /opt/coach/current && systemctl restart coach
```

Logs are in the journal: `journalctl -u coach`. They say what was asked and how it was answered, never a data code,
an address or a body. Caddy writes no access log.

## Checking it

- `https://<domain>/health` answers `{"ok":true}`.
- The coach loads at `https://<domain>/`, sharing unticked.
- Ticking "Share my moves" shows a data code, and moves then appear under `/var/lib/coach/players/`.
- "Delete my data" removes them.

## Trying it locally

```sh
sh tools/site.sh
cd server && wac update && PORT=8080 DATA_DIR=/tmp/coach-data \
  wac run --allow-read --allow-write --allow-net --allow-env coach.wac ../dist/site/coach.html ../dist/site/about.html
```

Then open `http://localhost:8080/`. Browsers accept its `Secure` cookie on `localhost` without TLS.
