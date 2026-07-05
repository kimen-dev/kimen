# Kimen unattended-loop sandbox (constitution Art. XI):
# disposable, credential-free, egress restricted by init-firewall.sh.
FROM node:22-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    iptables ipset dnsutils jq sudo git \
    && rm -rf /var/lib/apt/lists/*

# Playwright system deps for the real-browser gate (Chromium, Art. IV PR gate)
RUN npx -y playwright@1.61.1 install-deps chromium

# The agents that can drive the loop (Art. XI is vendor-agnostic). Installed
# at build time (root): the node user cannot install globals, and the loop
# must not depend on runtime installs.
RUN npm install -g @anthropic-ai/claude-code @openai/codex

# pnpm via corepack, enabled at BUILD time (the node user cannot symlink into
# /usr/local/bin at runtime). The pinned version (keep in sync with the root
# package.json packageManager field) is pre-fetched into COREPACK_HOME, which
# stays node-writable for future packageManager bumps.
ENV COREPACK_HOME=/opt/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable pnpm \
    && corepack prepare pnpm@10.34.4 --activate \
    && chown -R node:node /opt/corepack

# --chmod: the build-context files may be mode 0600 (COPY preserves it and
# chmod +x alone would leave them unreadable by the node user).
COPY --chmod=755 init-firewall.sh /usr/local/bin/init-firewall.sh
COPY --chmod=755 loop-entry.sh /usr/local/bin/loop-entry.sh
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
