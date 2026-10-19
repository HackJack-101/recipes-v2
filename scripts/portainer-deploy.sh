#!/usr/bin/env bash
# Redeploys a Portainer stack (created with the web editor) on a new image version.
# The stack's file is kept as is except for the app image tag, and its environment
# variables are sent back unchanged (Portainer replaces them with what the update sends).
#
# Env: PORTAINER_URL, PORTAINER_TOKEN (access token), IMAGE (e.g. ghcr.io/owner/repo),
#      VERSION (e.g. 1.2.0), optional PORTAINER_STACK (default "recipes") and
#      PORTAINER_BASIC_AUTH ("user:password", when a proxy guards Portainer).
set -euo pipefail

: "${PORTAINER_URL:?PORTAINER_URL is not set}" "${PORTAINER_TOKEN:?PORTAINER_TOKEN is not set}"
: "${IMAGE:?IMAGE is not set}" "${VERSION:?VERSION is not set}"
stack_name="${PORTAINER_STACK:-recipes}"
image="$(tr '[:upper:]' '[:lower:]' <<<"$IMAGE")"
base="${PORTAINER_URL%/}/api"

auth=(-H "X-API-Key: $PORTAINER_TOKEN")
if [[ -n "${PORTAINER_BASIC_AUTH:-}" ]]; then auth+=(-u "$PORTAINER_BASIC_AUTH"); fi
# Prints the response body, or fails with the status and a hint.
api() {
  local out status
  out="$(curl -sS --max-time 600 -w '\n%{http_code}' "${auth[@]}" -H "Content-Type: application/json" "$@")"
  status="${out##*$'\n'}"
  out="${out%$'\n'*}"
  if [[ "$status" != 2* ]]; then
    echo "Portainer answered HTTP $status: ${out:0:300}" >&2
    [[ "$status" == 401 ]] && echo "Check PORTAINER_BASIC_AUTH (proxy) and PORTAINER_TOKEN (Portainer access token)." >&2
    return 1
  fi
  printf '%s\n' "$out"
}

stacks="$(api "$base/stacks")"
stack_id="$(jq -r --arg name "$stack_name" 'map(select(.Name == $name)) | if length == 1 then .[0].Id else empty end' <<<"$stacks")"
if [[ -z "$stack_id" ]]; then
  echo "Expected exactly one stack named \"$stack_name\"; found: $(jq -r 'map(.Name) | join(", ")' <<<"$stacks")" >&2
  exit 1
fi
stack="$(api "$base/stacks/$stack_id")"
endpoint_id="$(jq -r .EndpointId <<<"$stack")"
if [[ "$(jq -r '.GitConfig != null' <<<"$stack")" == true ]]; then
  echo "Stack \"$stack_name\" is deployed from Git; use Portainer's Git redeploy instead." >&2
  exit 1
fi

file="$(api "$base/stacks/$stack_id/file")"
file="$(jq -r .StackFileContent <<<"$file")"
# image: ghcr.io/owner/repo[:tag] -> image: ghcr.io/owner/repo:VERSION
updated="$(sed -E "s#^([[:space:]]*image:[[:space:]]*[\"']?)${image//./\\.}(:[^[:space:]\"'@]+)?#\1${image}:${VERSION}#" <<<"$file")"
if ! grep -q "image:[[:space:]]*[\"']\{0,1\}${image}:${VERSION}" <<<"$updated"; then
  echo "Stack \"$stack_name\" doesn't use the image $image." >&2
  exit 1
fi

echo "Redeploying stack \"$stack_name\" (id $stack_id, environment $endpoint_id) on $image:$VERSION"
jq -n --arg file "$updated" --argjson env "$(jq '.Env // []' <<<"$stack")" \
  '{stackFileContent: $file, env: $env, prune: false, pullImage: true}' |
  api -X PUT "$base/stacks/$stack_id?endpointId=$endpoint_id" --data-binary @- >/dev/null
echo "Done."
