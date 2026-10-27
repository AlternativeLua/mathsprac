#!/usr/bin/env bash
#
# Cut a release: check, bump the version, tag, push. GitHub Actions then builds
# the APK and attaches it to the release.
#
#   ./tools/release.sh 1.0.1
#
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "usage: $0 <version>      e.g. $0 1.0.1"
  echo
  echo "current: $(node -p "require('./package.json').version")"
  exit 1
fi

if ! printf '%s' "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "version should look like 1.0.1, got '$VERSION'"
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" != "main" ]; then
  echo "on branch '$BRANCH'; releases are cut from main"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "working tree is dirty — commit or stash first:"
  git status --short
  exit 1
fi

if git rev-parse "v$VERSION" >/dev/null 2>&1; then
  echo "tag v$VERSION already exists"
  exit 1
fi

echo "== checking the question generators =="
node tools/selftest.mjs 200

echo "== bumping to $VERSION =="
node tools/bump-version.mjs "$VERSION"

git add package.json android/app/build.gradle
git commit -q -m "Release v$VERSION"
git tag -a "v$VERSION" -m "v$VERSION"

echo "== pushing =="
git push -q origin main
git push -q origin "v$VERSION"

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo '')"
echo
echo "tagged v$VERSION and pushed."
if [ -n "$REPO" ]; then
  echo "  actions: https://github.com/$REPO/actions"
  echo "  release: https://github.com/$REPO/releases/tag/v$VERSION"
  echo
  echo "watching the build (ctrl-c to stop)..."
  sleep 5
  gh run watch "$(gh run list --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status \
    && echo "APK published: https://github.com/$REPO/releases/tag/v$VERSION"
fi
