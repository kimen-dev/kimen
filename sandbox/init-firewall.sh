#!/usr/bin/env bash
# Kimen sandbox egress allowlist (constitution Art. XI): default-deny outbound;
# only declared registries and endpoints resolve (mirrors CI hardening).
# Runs as root once at container start (sudoers: this script only).
set -euo pipefail

ALLOWED_DOMAINS=(
  # package registry (pnpm)
  registry.npmjs.org
  # git + release assets
  github.com
  api.github.com
  codeload.github.com
  objects.githubusercontent.com
  raw.githubusercontent.com
  # Playwright browser downloads
  cdn.playwright.dev
  playwright.azureedge.net
  # Claude Code (agent driving the loop)
  api.anthropic.com
  statsig.anthropic.com
)

ipset destroy kimen-allow 2>/dev/null || true
ipset create kimen-allow hash:ip

for domain in "${ALLOWED_DOMAINS[@]}"; do
  for ip in $(dig +short A "$domain" | grep -E '^[0-9]+\.' || true); do
    ipset add kimen-allow "$ip" 2>/dev/null || true
  done
done

iptables -F OUTPUT
# loopback + established
iptables -A OUTPUT -o lo -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
# DNS (needed to resolve the allowlist itself)
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT
# allowlisted endpoints, HTTPS only
iptables -A OUTPUT -p tcp --dport 443 -m set --match-set kimen-allow dst -j ACCEPT
# default deny
iptables -A OUTPUT -j REJECT

echo "kimen sandbox firewall active: default-deny egress, $(ipset list kimen-allow | grep -c '^[0-9]') allowed IPs"
echo "NOTE: IPs are resolved at start; re-run this script if a CDN rotates."
