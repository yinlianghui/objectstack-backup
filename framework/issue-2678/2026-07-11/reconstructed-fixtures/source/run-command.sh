#!/bin/bash

set -u

if [ "$#" -lt 3 ]; then
  printf 'usage: %s <id> <cwd> <command>\n' "$0" >&2
  exit 64
fi

id="$1"
cwd="$2"
shift 2
command="$*"

root=$(cd "$(dirname "$0")/.." && pwd -P)
stdout_file="$root/commands/${id}.stdout.log"
stderr_file="$root/commands/${id}.stderr.log"
ledger="$root/command-ledger.md"
started=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

if [ -e "$stdout_file" ] || [ -e "$stderr_file" ]; then
  printf 'refusing to overwrite command evidence for id %s\n' "$id" >&2
  exit 73
fi

{
  printf '\n## %s\n\n' "$id"
  printf -- '- Started (UTC): `%s`\n' "$started"
  printf -- '- Working directory: `%s`\n' "$cwd"
  printf -- '- Command: `%s`\n' "$command"
  printf -- '- Stdout: `commands/%s.stdout.log`\n' "$id"
  printf -- '- Stderr: `commands/%s.stderr.log`\n' "$id"
} >> "$ledger"

set +e
(
  cd "$cwd" || exit 72
  /bin/zsh -lc "$command"
) > >(tee "$stdout_file") 2> >(tee "$stderr_file" >&2)
status=$?
set -e

finished=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
{
  printf -- '- Finished (UTC): `%s`\n' "$finished"
  printf -- '- Exit code: `%s`\n' "$status"
} >> "$ledger"

exit "$status"
