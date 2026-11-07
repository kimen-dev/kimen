# Kimen unattended-loop sandbox (constitution Art. XI):
# disposable, credential-free, egress restricted by init-firewall.sh.
FROM node:26.12.1-bookworm@sha256:3b764117159bda01d2396391e7789b6a9106af9729cfd001ef55e98557868310

ARG DEBIAN_SNAPSHOT=20260709T000000Z
RUN rm -f /etc/apt/sources.list.d/debian.sources \
    && printf '%s\n' \
      "deb [check-valid-until=no] https://snapshot.debian.org/archive/debian/${DEBIAN_SNAPSHOT}/ bookworm main" \
      "deb [check-valid-until=no] https://snapshot.debian.org/archive/debian-security/${DEBIAN_SNAPSHOT}/ bookworm-security main" \
      > /etc/apt/sources.list \
    && apt-get -o Acquire::Check-Valid-Until=false update \
    && apt-get install -y --no-install-recommends \
      iptables=1.8.9-2 \
      ipset=7.17-1 \
      dnsutils=1:9.18.49-1~deb12u1 \
      jq=1.6-2.1+deb12u2 \
      sudo=1.9.13p3-1+deb12u4 \
      git=1:2.39.5-0+deb12u3 \
    && useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin kimen-proxy \
    && rm -rf /var/lib/apt/lists/*

# Agent and Playwright executables are installed only from npm's integrity
# lock. Runtime never performs global or mutable package installation.
WORKDIR /opt/kimen-agent-clis
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    && ./node_modules/.bin/playwright install-deps chromium \
    && npm cache clean --force
ENV PATH=/opt/kimen-agent-clis/node_modules/.bin:$PATH

# pnpm via corepack. Node 25+ no longer bundles corepack, so it comes from the
# integrity lock above, whose `pnpm` bin is corepack's shim and is already on
# PATH. The pinned version must equal the root package.json packageManager
# field (sandbox-static-contract checks it): the gates phase runs with
# --network none, so pnpm must already be in COREPACK_HOME. COREPACK_HOME stays
# node-writable for packageManager bumps fetched in the bootstrap phase.
ENV COREPACK_HOME=/opt/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack prepare pnpm@12.17.0 --activate \
    && pnpm --version \
    && chown -R node:node /opt/corepack

# --chmod: the build-context files may be mode 0600 (COPY preserves it and
# chmod +x alone would leave them unreadable by the node user).
COPY --chmod=755 init-firewall.sh /usr/local/bin/init-firewall.sh
COPY --chmod=755 loop-entry.sh /usr/local/bin/loop-entry.sh
COPY --chmod=755 phase-entry.sh /usr/local/bin/phase-entry.sh
COPY --chmod=555 proxy.mjs /usr/local/lib/kimen/proxy.mjs
COPY --chmod=444 egress-allowlist.txt /etc/kimen/egress-allowlist.txt
    # The node user may ONLY run the firewall script as root: nothing else.
RUN echo "node ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/kimen-firewall \
    && chmod 0440 /etc/sudoers.d/kimen-firewall \
    # Pre-create the volume mountpoints with node ownership (named volumes
    # inherit ownership from the image on first use).
    && mkdir -p /home/node/.codex /home/node/.cache/ms-playwright /home/node/.local/share/pnpm \
    && chown -R node:node /home/node

ENV KIMEN_SANDBOX=1
# The container has no IPv6 route: prefer A records so downloads (Playwright
# CDN) do not die on ENETUNREACH before trying IPv4.
ENV NODE_OPTIONS=--dns-result-order=ipv4first
USER node
WORKDIR /workspace
