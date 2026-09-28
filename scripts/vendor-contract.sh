#!/usr/bin/env bash
#
# Copy the API's published OpenAPI contract into this repo, then regenerate the typed client.
# Run this whenever the backend contract changes. The vendored file is committed so reviewers
# see the diff, and the CI drift check (`npm run check:client`) fails if the committed client
# is stale relative to the committed contract.
#
# Override the source path with API_CONTRACT=/path/to/openapi.json.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
src="${API_CONTRACT:-$here/../appointments-api/contracts/openapi.json}"
dest="$here/contracts/openapi.json"

if [ ! -f "$src" ]; then
  echo "error: source contract not found at $src" >&2
  echo "set API_CONTRACT=/absolute/path/to/openapi.json" >&2
  exit 1
fi

mkdir -p "$here/contracts"
cp "$src" "$dest"
echo "vendored $src -> contracts/openapi.json"

cd "$here"
npm run generate:client
echo "regenerated src/api/schema.d.ts"
