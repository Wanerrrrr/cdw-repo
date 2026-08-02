#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if ! command -v firebase >/dev/null 2>&1; then
  echo "Firebase CLI is not installed. Install it first, then run this file again."
  exit 1
fi

PROJECT_ID=$(node -e 'global.window={}; require(process.cwd()+"/site/firebase-config.js"); const c=window.OPEN_STREETS_FIREBASE_CONFIG||{}; process.stdout.write(String(c.projectId||""));')

if [ -z "$PROJECT_ID" ] || [[ "$PROJECT_ID" == *"PASTE_"* ]]; then
  echo "ERROR: Replace the Firebase values in site/firebase-config.js first."
  exit 1
fi

if grep -q 'PASTE_YOUR_OPENAI_API_KEY_HERE' functions/.env; then
  echo "ERROR: Replace the OpenAI key in functions/.env first."
  exit 1
fi

echo "Using Firebase project: $PROJECT_ID"
echo "Installing backend dependencies..."
(cd functions && npm install)

echo "Deploying only the Open Streets agent backend..."
firebase deploy --only functions:openStreetsAgent --project "$PROJECT_ID"

echo ""
echo "DONE"
echo "Backend URL: https://us-central1-${PROJECT_ID}.cloudfunctions.net/openStreetsAgent"
echo "Upload the CONTENTS of the site folder to GitHub Pages, then refresh the page."
