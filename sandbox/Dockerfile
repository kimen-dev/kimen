# Kimen unattended-loop sandbox (constitution Art. XI):
# disposable, credential-free, egress restricted by init-firewall.sh.
FROM node:22-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    iptables ipset dnsutils jq sudo git \
    && rm -rf /var/lib/apt/lists/*

# Playwright system deps for the real-browser gate (Chromium, Art. IV PR gate)
RUN npx -y playwright@1.61.1 install-deps chromium

# The agent driving the loop. Installed at build time (root): the node user
# cannot install globals, and the loop must not depend on runtime installs.
RUN npm install -g @anthropic-ai/claude-code

COPY init-firewall.sh /usr/local/bin/init-firewall.sh
RUN chmod +x /usr/local/bin/init-firewall.sh \
    # The node user may ONLY run the firewall script as root: nothing else.
    && echo "node ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/kimen-firewall \
    && chmod 0440 /etc/sudoers.d/kimen-firewall

ENV KIMEN_SANDBOX=1
USER node
WORKDIR /workspace
