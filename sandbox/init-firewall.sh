#!/usr/bin/env bash
# @spec:018-project-integrity-hardening#S4
# Root-owned, default-deny OUTPUT policy. The unprivileged agent may reach only
# loopback; the dedicated proxy identity alone receives declared DNS/HTTPS.
set -euo pipefail

POLICY_FILE=${KIMEN_EGRESS_POLICY_FILE:-/etc/kimen/egress-allowlist.txt}
PROXY_USER=${KIMEN_PROXY_USER:-kimen-proxy}
DNS_RESOLVER_IP=${KIMEN_DNS_RESOLVER_IP:-}

fail() {
  echo "kimen firewall: $*" >&2
  exit 1
}

[ "$(id -u)" -eq 0 ] || fail 'must run as root'
[ -f "$POLICY_FILE" ] || fail "missing egress policy: $POLICY_FILE"
[ ! -L "$POLICY_FILE" ] || fail 'egress policy may not be a symlink'
[ "$(stat -c '%u' "$POLICY_FILE")" -eq 0 ] || fail 'egress policy must be root-owned'
policy_mode=$(stat -c '%a' "$POLICY_FILE")
case "$policy_mode" in
  *[2367][0-9] | *[0-9][2367]) fail 'egress policy may not be group/world writable' ;;
esac

PROXY_UID=$(id -u "$PROXY_USER" 2>/dev/null) || fail "missing proxy identity: $PROXY_USER"
if [ -z "$DNS_RESOLVER_IP" ]; then
  DNS_RESOLVER_IP=$(awk '$1 == "nameserver" { print $2; exit }' /etc/resolv.conf)
fi
[[ "$DNS_RESOLVER_IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] ||
  fail 'declared DNS resolver must be one IPv4 address'

mapfile -t policy_lines < "$POLICY_FILE"
[ "${policy_lines[0]:-}" = 'version 1' ] || fail 'unsupported egress policy version'

declare -A declared_hosts=()
for line in "${policy_lines[@]:1}"; do
  [ -n "$line" ] || continue
  read -r phase authority extra <<< "$line"
  [ -z "${extra:-}" ] || fail "malformed egress policy entry: $line"
  case "$phase" in
    bootstrap | agent) ;;
    *) fail "invalid egress phase: $phase" ;;
  esac
  [[ "$authority" =~ ^[A-Za-z0-9.-]+:443$ ]] || fail "invalid HTTPS authority: $authority"
  host=${authority%:443}
  declared_hosts["${host,,}"]=1
done
[ "${#declared_hosts[@]}" -gt 0 ] || fail 'egress policy contains no declared hosts'

ipset destroy kimen-proxy-https 2>/dev/null || true
ipset create kimen-proxy-https hash:ip
for host in "${!declared_hosts[@]}"; do
  while IFS= read -r address; do
    [[ "$address" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || continue
    ipset add kimen-proxy-https "$address" 2>/dev/null || true
  done < <(dig @"$DNS_RESOLVER_IP" +time=1 +tries=1 +short A "$host" 2>/dev/null || true)
done

iptables -F OUTPUT
iptables -A OUTPUT -o lo -j ACCEPT
iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m owner --uid-owner "$PROXY_UID" -p udp \
  -d "$DNS_RESOLVER_IP" --dport 53 -j ACCEPT
iptables -A OUTPUT -m owner --uid-owner "$PROXY_UID" -p tcp \
  -d "$DNS_RESOLVER_IP" --dport 53 -j ACCEPT
iptables -A OUTPUT -m owner --uid-owner "$PROXY_UID" -p tcp --dport 443 \
  -m set --match-set kimen-proxy-https dst -j ACCEPT
iptables -A OUTPUT -j REJECT

if command -v ip6tables >/dev/null 2>&1; then
  ip6tables -F OUTPUT 2>/dev/null || true
  ip6tables -A OUTPUT -o lo -j ACCEPT 2>/dev/null || true
  ip6tables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT \
    2>/dev/null || true
  ip6tables -A OUTPUT -j REJECT 2>/dev/null || true
fi

echo "kimen firewall active: agent=loopback-only proxy-uid=$PROXY_UID resolver=$DNS_RESOLVER_IP"
