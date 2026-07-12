#!/usr/bin/env bash
# Allocate repository-local, private caches without consulting mutable global
# npm/pnpm/Nx/Playwright state. This wrapper intentionally never reads npm
# configuration; it only points tools at empty, isolated config files.
set -euo pipefail
umask 077

fail() {
  printf 'cache-env: %s\n' "$1" >&2
  exit 1
}

usage() {
  fail 'usage: cache-env.sh -- command... | --github-env /absolute/file | --validate'
}

validate_absolute_path() {
  local label="$1"
  local path="$2"

  case "$path" in
    /*) ;;
    *) fail "$label must be an absolute path" ;;
  esac

  if [[ "$path" =~ [[:cntrl:]] ]]; then
    fail "$label contains a control character"
  fi

  case "$path" in
    //* | *//*) fail "$label must not contain repeated separators" ;;
  esac

  case "/${path#/}/" in
    */./* | */../*) fail "$label must not contain dot segments" ;;
  esac
}

path_is_within() {
  local candidate="$1"
  local parent="$2"

  if [ "$parent" = '/' ]; then
    case "$candidate" in
      /*) return 0 ;;
      *) return 1 ;;
    esac
  fi

  [ "$candidate" = "$parent" ] || [ "${candidate#"$parent"/}" != "$candidate" ]
}

assert_no_symlink_components() {
  local label="$1"
  local path="$2"
  local remainder="${path#/}"
  local component
  local current='/'

  while [ -n "$remainder" ]; do
    case "$remainder" in
      */*)
        component="${remainder%%/*}"
        remainder="${remainder#*/}"
        ;;
      *)
        component="$remainder"
        remainder=''
        ;;
    esac

    if [ "$current" = '/' ]; then
      current="/$component"
    else
      current="$current/$component"
    fi
    [ ! -L "$current" ] || fail "$label has a symbolic-link component"
  done
}

physical_directory() {
  (CDPATH= cd "$1" 2>/dev/null && pwd -P)
}

assert_outside_home() {
  local label="$1"
  local path="$2"
  local physical_path="$3"

  if [ -n "${HOME:-}" ]; then
    case "$HOME" in
      /*) ;;
      *) fail 'HOME must be an absolute path when set' ;;
    esac

    if path_is_within "$path" "$HOME"; then
      fail "$label must be outside HOME"
    fi

    if [ -n "$HOME_PHYSICAL" ] && path_is_within "$physical_path" "$HOME_PHYSICAL"; then
      fail "$label resolves below HOME"
    fi
  fi
}

assert_override_preflight() {
  local label="$1"
  local path="$2"
  local ancestor="$path"
  local parent
  local physical_ancestor

  validate_absolute_path "$label" "$path"
  assert_outside_home "$label" "$path" ''

  while [ ! -e "$ancestor" ]; do
    parent="$(dirname "$ancestor")"
    [ "$parent" != "$ancestor" ] || break
    ancestor="$parent"
  done

  [ ! -L "$ancestor" ] || fail "$label has a symbolic-link ancestor"
  if [ ! -d "$ancestor" ]; then
    ancestor="$(dirname "$ancestor")"
  fi
  physical_ancestor="$(physical_directory "$ancestor")" ||
    fail "$label existing ancestor could not be resolved"
  assert_outside_home "$label" "$path" "$physical_ancestor"
}

assert_directory_writable() {
  local label="$1"
  local path="$2"
  local probe

  probe="$(mktemp "$path/.kimen-write.XXXXXX" 2>/dev/null)" ||
    fail "$label is not writable"
  rm -f "$probe" || fail "$label write probe could not be removed"
}

assert_directory_not_shared_writable() {
  local label="$1"
  local path="$2"
  local mode
  local mode_value

  if mode="$(stat -f '%Lp' "$path" 2>/dev/null)"; then
    :
  elif mode="$(stat -c '%a' "$path" 2>/dev/null)"; then
    :
  else
    fail "$label permissions could not be read"
  fi

  case "$mode" in
    '' | *[!0-7]*) fail "$label permissions were not an octal mode" ;;
  esac
  mode_value=$((8#$mode))
  [ $((mode_value & 8#022)) -eq 0 ] ||
    fail "$label must not be group- or world-writable"
}

assert_cache_directory_components_private() {
  local label="$1"
  local path="$2"
  local boundary="$path"
  local component
  local current
  local remainder

  if [ -n "${KIMEN_CACHE_ROOT:-}" ] && path_is_within "$path" "$KIMEN_CACHE_ROOT"; then
    boundary="$KIMEN_CACHE_ROOT"
  fi

  current="$boundary"
  assert_directory_not_shared_writable "$label" "$current"
  remainder="${path#"$boundary"}"
  remainder="${remainder#/}"

  while [ -n "$remainder" ]; do
    case "$remainder" in
      */*)
        component="${remainder%%/*}"
        remainder="${remainder#*/}"
        ;;
      *)
        component="$remainder"
        remainder=''
        ;;
    esac

    if [ "$current" = '/' ]; then
      current="/$component"
    else
      current="$current/$component"
    fi
    [ -d "$current" ] || fail "$label contains a non-directory component"
    assert_directory_not_shared_writable "$label" "$current"
  done
}

prepare_directory() {
  local label="$1"
  local path="$2"

  validate_absolute_path "$label" "$path"
  assert_no_symlink_components "$label" "$path"
  [ ! -L "$path" ] || fail "$label must not be a symbolic link"
  mkdir -p "$path" 2>/dev/null || fail "$label could not be created"
  assert_no_symlink_components "$label" "$path"
  [ ! -L "$path" ] || fail "$label became a symbolic link"
  [ -d "$path" ] || fail "$label is not a directory"
  assert_cache_directory_components_private "$label" "$path"
  assert_directory_writable "$label" "$path"
}

assert_default_below_cache_root() {
  local label="$1"
  local physical_path="$2"

  if ! path_is_within "$physical_path" "$CACHE_ROOT_PHYSICAL"; then
    fail "$label escapes KIMEN_CACHE_ROOT"
  fi
}

select_directory() {
  local name="$1"
  local default_path="$2"
  local value=''
  local overridden=0
  local override_present="${!name+x}"
  local physical_path

  if [ "$override_present" = 'x' ]; then
    overridden=1
    value="${!name}"
    assert_override_preflight "$name" "$value"
  else
    value="$default_path"
  fi

  prepare_directory "$name" "$value"
  physical_path="$(physical_directory "$value")" || fail "$name could not be resolved"

  if [ "$overridden" -eq 1 ]; then
    assert_outside_home "$name" "$value" "$physical_path"
  else
    assert_default_below_cache_root "$name" "$physical_path"
  fi

  printf -v "$name" '%s' "$value"
  export "$name"
}

prepare_empty_private_file() {
  local label="$1"
  local path="$2"

  assert_no_symlink_components "$label" "$path"
  [ ! -L "$path" ] || fail "$label must not be a symbolic link"
  if [ -e "$path" ]; then
    [ -f "$path" ] || fail "$label is not a regular file"
    [ ! -s "$path" ] || fail "$label must be empty"
  else
    (set -o noclobber; : >"$path") 2>/dev/null || fail "$label could not be created"
  fi
  assert_no_symlink_components "$label" "$path"
  [ ! -L "$path" ] || fail "$label became a symbolic link"
  [ -f "$path" ] || fail "$label is not a regular file"
  chmod 600 "$path" 2>/dev/null || fail "$label permissions could not be restricted"
  [ ! -s "$path" ] || fail "$label must remain empty"
  : >>"$path" 2>/dev/null || fail "$label is not writable"
}

select_empty_file() {
  local name="$1"
  local default_path="$2"
  local value=''
  local overridden=0
  local override_present="${!name+x}"
  local parent
  local physical_parent
  local physical_path

  if [ "$override_present" = 'x' ]; then
    overridden=1
    value="${!name}"
    assert_override_preflight "$name" "$value"
  else
    value="$default_path"
  fi

  validate_absolute_path "$name" "$value"
  parent="$(dirname "$value")"
  prepare_directory "$name parent" "$parent"
  physical_parent="$(physical_directory "$parent")" || fail "$name parent could not be resolved"
  physical_path="$physical_parent/$(basename "$value")"

  if [ "$overridden" -eq 1 ]; then
    assert_outside_home "$name" "$value" "$physical_path"
  else
    assert_default_below_cache_root "$name" "$physical_path"
  fi

  prepare_empty_private_file "$name" "$value"
  printf -v "$name" '%s' "$value"
  export "$name"
}

write_github_environment() {
  local destination="$1"
  local parent
  local probe

  validate_absolute_path 'GitHub environment file' "$destination"
  assert_no_symlink_components 'GitHub environment file' "$destination"
  [ ! -L "$destination" ] || fail 'GitHub environment file must not be a symbolic link'
  parent="$(dirname "$destination")"
  [ -d "$parent" ] || fail 'GitHub environment parent must already exist'
  [ ! -L "$parent" ] || fail 'GitHub environment parent must not be a symbolic link'
  probe="$(mktemp "$parent/.kimen-github-env.XXXXXX" 2>/dev/null)" ||
    fail 'GitHub environment parent is not writable'
  rm -f "$probe" || fail 'GitHub environment write probe could not be removed'

  if [ -e "$destination" ]; then
    [ -f "$destination" ] || fail 'GitHub environment target is not a regular file'
  else
    (set -o noclobber; : >"$destination") 2>/dev/null ||
      fail 'GitHub environment target could not be created'
  fi
  assert_no_symlink_components 'GitHub environment file' "$destination"
  [ ! -L "$destination" ] || fail 'GitHub environment target became a symbolic link'

  {
    printf 'KIMEN_CACHE_ROOT=%s\n' "$KIMEN_CACHE_ROOT"
    printf 'NPM_CONFIG_CACHE=%s\n' "$NPM_CONFIG_CACHE"
    printf 'NPM_CONFIG_STORE_DIR=%s\n' "$NPM_CONFIG_STORE_DIR"
    printf 'NPM_CONFIG_USERCONFIG=%s\n' "$NPM_CONFIG_USERCONFIG"
    printf 'NPM_CONFIG_GLOBALCONFIG=%s\n' "$NPM_CONFIG_GLOBALCONFIG"
    printf 'COREPACK_HOME=%s\n' "$COREPACK_HOME"
    printf 'XDG_CACHE_HOME=%s\n' "$XDG_CACHE_HOME"
    printf 'NX_CACHE_DIRECTORY=%s\n' "$NX_CACHE_DIRECTORY"
    printf 'NX_WORKSPACE_DATA_DIRECTORY=%s\n' "$NX_WORKSPACE_DATA_DIRECTORY"
    printf 'NX_NATIVE_FILE_CACHE_DIRECTORY=%s\n' "$NX_NATIVE_FILE_CACHE_DIRECTORY"
    printf 'PLAYWRIGHT_BROWSERS_PATH=%s\n' "$PLAYWRIGHT_BROWSERS_PATH"
    printf 'KIMEN_CONSUMER_CACHE_DIR=%s\n' "$KIMEN_CONSUMER_CACHE_DIR"
    printf 'KIMEN_MUTATION_CACHE_DIR=%s\n' "$KIMEN_MUTATION_CACHE_DIR"
    printf 'NX_DAEMON=%s\n' "$NX_DAEMON"
    printf 'KIMEN_CACHE_ENV_READY=%s\n' "$KIMEN_CACHE_ENV_READY"
  } >>"$destination" || fail 'GitHub environment target is not writable'
}

validate_prepared_directory() {
  local name="$1"
  local value
  local physical_path

  [ "${!name+x}" = 'x' ] || fail "$name is required when KIMEN_CACHE_ENV_READY=1"
  value="${!name}"
  [ -n "$value" ] || fail "$name is required when KIMEN_CACHE_ENV_READY=1"
  validate_absolute_path "$name" "$value"
  assert_no_symlink_components "$name" "$value"
  [ ! -L "$value" ] || fail "$name must not be a symbolic link"
  [ -d "$value" ] || fail "$name must be an existing directory"
  physical_path="$(physical_directory "$value")" || fail "$name could not be resolved"
  if ! path_is_within "$physical_path" "$CACHE_ROOT_PHYSICAL"; then
    assert_outside_home "$name" "$value" "$physical_path"
  fi
  assert_cache_directory_components_private "$name" "$value"
  assert_directory_writable "$name" "$value"
}

validate_prepared_file() {
  local name="$1"
  local value
  local parent
  local physical_parent
  local physical_path
  local mode

  [ "${!name+x}" = 'x' ] || fail "$name is required when KIMEN_CACHE_ENV_READY=1"
  value="${!name}"
  [ -n "$value" ] || fail "$name is required when KIMEN_CACHE_ENV_READY=1"
  validate_absolute_path "$name" "$value"
  assert_no_symlink_components "$name" "$value"
  [ ! -L "$value" ] || fail "$name must not be a symbolic link"
  [ -f "$value" ] || fail "$name must be an existing regular file"
  [ ! -s "$value" ] || fail "$name must be empty"
  parent="$(dirname "$value")"
  physical_parent="$(physical_directory "$parent")" || fail "$name parent could not be resolved"
  physical_path="$physical_parent/$(basename "$value")"
  if ! path_is_within "$physical_path" "$CACHE_ROOT_PHYSICAL"; then
    assert_outside_home "$name" "$value" "$physical_path"
  fi
  if mode="$(stat -f '%Lp' "$value" 2>/dev/null)"; then
    :
  elif mode="$(stat -c '%a' "$value" 2>/dev/null)"; then
    :
  else
    fail "$name permissions could not be read"
  fi
  [ "$mode" = '600' ] || fail "$name must have mode 0600"
  : >>"$value" 2>/dev/null || fail "$name is not writable"
}

validate_prepared_cache_root() {
  local value
  local default_path="$REPOSITORY_ROOT/reports/cache"

  [ "${KIMEN_CACHE_ROOT+x}" = 'x' ] ||
    fail 'KIMEN_CACHE_ROOT is required when KIMEN_CACHE_ENV_READY=1'
  value="$KIMEN_CACHE_ROOT"
  [ -n "$value" ] || fail 'KIMEN_CACHE_ROOT is required when KIMEN_CACHE_ENV_READY=1'
  validate_absolute_path KIMEN_CACHE_ROOT "$value"
  assert_no_symlink_components KIMEN_CACHE_ROOT "$value"
  [ ! -L "$value" ] || fail 'KIMEN_CACHE_ROOT must not be a symbolic link'
  [ -d "$value" ] || fail 'KIMEN_CACHE_ROOT must be an existing directory'
  CACHE_ROOT_PHYSICAL="$(physical_directory "$value")" ||
    fail 'KIMEN_CACHE_ROOT could not be resolved'
  if [ "$value" != "$default_path" ]; then
    assert_outside_home KIMEN_CACHE_ROOT "$value" "$CACHE_ROOT_PHYSICAL"
  fi
  assert_cache_directory_components_private KIMEN_CACHE_ROOT "$value"
  assert_directory_writable KIMEN_CACHE_ROOT "$value"
}

validate_prepared_environment() {
  [ "${KIMEN_CACHE_ENV_READY:-}" = '1' ] ||
    fail 'KIMEN_CACHE_ENV_READY must equal 1 for validation'

  validate_prepared_cache_root
  validate_prepared_directory NPM_CONFIG_CACHE
  validate_prepared_directory NPM_CONFIG_STORE_DIR
  validate_prepared_directory COREPACK_HOME
  validate_prepared_directory XDG_CACHE_HOME
  validate_prepared_directory NX_CACHE_DIRECTORY
  validate_prepared_directory NX_WORKSPACE_DATA_DIRECTORY
  validate_prepared_directory NX_NATIVE_FILE_CACHE_DIRECTORY
  validate_prepared_directory PLAYWRIGHT_BROWSERS_PATH
  validate_prepared_directory KIMEN_CONSUMER_CACHE_DIR
  validate_prepared_directory KIMEN_MUTATION_CACHE_DIR
  validate_prepared_file NPM_CONFIG_USERCONFIG
  validate_prepared_file NPM_CONFIG_GLOBALCONFIG
  [ "${NX_DAEMON:-}" = 'false' ] || fail 'NX_DAEMON must equal false'
}

[ "$#" -gt 0 ] || usage
MODE="$1"
shift
case "$MODE" in
  --)
    [ "$#" -gt 0 ] || usage
    ;;
  --github-env)
    [ "$#" -eq 1 ] || usage
    GITHUB_ENV_DESTINATION="$1"
    ;;
  --validate)
    [ "$#" -eq 0 ] || usage
    ;;
  *) usage ;;
esac

SCRIPT_DIRECTORY="$(CDPATH= cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPOSITORY_ROOT="$(CDPATH= cd "$SCRIPT_DIRECTORY/../.." && pwd -P)"
HOME_PHYSICAL=''
if [ -n "${HOME:-}" ] && [ -d "$HOME" ]; then
  HOME_PHYSICAL="$(physical_directory "$HOME")" || fail 'HOME could not be resolved'
fi

if [ "$MODE" = '--validate' ]; then
  validate_prepared_environment
  exit 0
fi

if [ "$MODE" = '--' ] && [ "${KIMEN_CACHE_ENV_READY:-}" = '1' ]; then
  validate_prepared_environment
  exec "$@"
fi

if [ "${KIMEN_CACHE_ROOT+x}" = 'x' ]; then
  assert_override_preflight 'KIMEN_CACHE_ROOT' "$KIMEN_CACHE_ROOT"
  prepare_directory 'KIMEN_CACHE_ROOT' "$KIMEN_CACHE_ROOT"
  CACHE_ROOT_PHYSICAL="$(physical_directory "$KIMEN_CACHE_ROOT")" ||
    fail 'KIMEN_CACHE_ROOT could not be resolved'
  assert_outside_home 'KIMEN_CACHE_ROOT' "$KIMEN_CACHE_ROOT" "$CACHE_ROOT_PHYSICAL"
else
  KIMEN_CACHE_ROOT="$REPOSITORY_ROOT/reports/cache"
  prepare_directory 'KIMEN_CACHE_ROOT' "$KIMEN_CACHE_ROOT"
  CACHE_ROOT_PHYSICAL="$(physical_directory "$KIMEN_CACHE_ROOT")" ||
    fail 'KIMEN_CACHE_ROOT could not be resolved'
fi
export KIMEN_CACHE_ROOT

select_directory NPM_CONFIG_CACHE "$KIMEN_CACHE_ROOT/npm/cache"
select_directory NPM_CONFIG_STORE_DIR "$KIMEN_CACHE_ROOT/pnpm/store"
select_empty_file NPM_CONFIG_USERCONFIG "$KIMEN_CACHE_ROOT/npm/userconfig"
select_empty_file NPM_CONFIG_GLOBALCONFIG "$KIMEN_CACHE_ROOT/npm/globalconfig"
select_directory COREPACK_HOME "$KIMEN_CACHE_ROOT/corepack"
select_directory XDG_CACHE_HOME "$KIMEN_CACHE_ROOT/xdg"
select_directory NX_CACHE_DIRECTORY "$KIMEN_CACHE_ROOT/nx/cache"
select_directory NX_WORKSPACE_DATA_DIRECTORY "$KIMEN_CACHE_ROOT/nx/workspace-data"
select_directory NX_NATIVE_FILE_CACHE_DIRECTORY "$KIMEN_CACHE_ROOT/nx/native"
select_directory PLAYWRIGHT_BROWSERS_PATH "$KIMEN_CACHE_ROOT/playwright"
select_directory KIMEN_CONSUMER_CACHE_DIR "$KIMEN_CACHE_ROOT/consumer"
select_directory KIMEN_MUTATION_CACHE_DIR "$KIMEN_CACHE_ROOT/mutation"

NX_DAEMON=false
KIMEN_CACHE_ENV_READY=1
export NX_DAEMON KIMEN_CACHE_ENV_READY

if [ "$MODE" = '--github-env' ]; then
  write_github_environment "$GITHUB_ENV_DESTINATION"
  exit 0
fi

exec "$@"
