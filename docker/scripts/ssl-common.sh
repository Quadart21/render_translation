#!/usr/bin/env bash
# Проверка: установлен ли настоящий Let's Encrypt (не dummy openssl)
is_letsencrypt_cert() {
  local cert="$1"
  [[ -f "$cert" ]] || return 1
  openssl x509 -in "$cert" -noout -issuer 2>/dev/null | grep -qi "Let's Encrypt"
}

remove_domain_cert() {
  local domain="$1"
  local conf_dir="$2"
  rm -rf \
    "$conf_dir/live/$domain" \
    "$conf_dir/archive/$domain" \
    "$conf_dir/renewal/${domain}.conf"
}
