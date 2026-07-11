#!/usr/bin/env bash
# Mahalak customer iOS — first-time setup + open Xcode (run on macOS only)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script must run on macOS (Xcode required)."
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "Xcode is not installed. Install it from the Mac App Store first."
  exit 1
fi

echo "==> Installing npm dependencies"
npm ci --prefer-offline --no-audit --no-fund

echo "==> Building customer web assets"
npm run build:customer

echo "==> Preparing Capacitor iOS project"
cd apps/customer
if [[ ! -d "ios/App" ]]; then
  npx cap add ios
fi
npx cap sync ios
cd "$ROOT"

echo "==> Opening Xcode (App.xcodeproj)"
npm run cap:open:customer:ios

cat <<'EOF'

Next steps in Xcode (one-time):
1. Target App → Signing & Capabilities
2. Enable "Automatically manage signing" and select your Apple Developer Team
3. Confirm Bundle Identifier: iq.mahalak.app
4. Click "+ Capability" → add "Push Notifications"
5. Version: 1.0.5 | Build: 8 (or higher for each upload)

To upload to App Store:
1. Select "Any iOS Device (arm64)" as destination
2. Product → Archive
3. Distribute App → App Store Connect → Upload

After code changes, run:
  npm run ios:sync:customer
EOF
