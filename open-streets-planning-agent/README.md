# Assignment 8 — Open Streets Planning Agent

This package keeps the Assignment 7 five-question Firebase poll and adds an Open Streets Planning Assistant powered by an OpenAI model through a Firebase callable Cloud Function.

## What is already complete

- Existing poll UI and Realtime Database logic
- New chatbot interface in the same visual language
- Firebase callable function named `openStreetsAgent`
- OpenAI Responses API server call
- Server-side conversation logging to Realtime Database
- Preview responses when Firebase/OpenAI are not configured
- Database rules, Firebase Hosting config, and submission text

## Important folder structure

- `site/` — uploadable website files
- `functions/` — private server-side code; do not put this folder on GitHub Pages as website content
- `database.rules.json` — poll rules plus server-only agent logs
- `firebase.json` — Firebase Hosting, Functions, and Database configuration

## One-time setup

### 1. Put your existing Firebase web config in the website

Open `site/firebase-config.js` and replace the `PASTE_...` values with the Firebase Web App configuration from the same project used for Assignment 7.

This web configuration may appear in browser code. The OpenAI key must not.

### 2. Install the Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### 3. Connect this folder to your Firebase project

From this project folder:

```bash
firebase use --add
```

Choose the existing Assignment 7 Firebase project. Firebase will create a local `.firebaserc` file.

### 4. Install function packages

```bash
cd functions
npm install
cd ..
```

### 5. Save the OpenAI API key as a Firebase secret

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

Paste the key only into the terminal prompt. Do not add it to JavaScript, GitHub, or `firebase-config.js`.

### 6. Deploy

```bash
firebase deploy
```

The first Functions deployment may ask you to enable billing because Cloud Functions requires the Blaze plan. OpenAI API use is billed separately by OpenAI.

## Test

1. Open the Firebase Hosting URL printed after deployment.
2. The poll status should say `Firebase connected · live results`.
3. The agent status should say `Firebase agent connected`.
4. Ask: `Create a simple Saturday Open Street plan focused on play and seating.`
5. Confirm the answer is not labeled `PREVIEW RESPONSE`.
6. In Realtime Database, confirm a record appears under `openStreetsAgent/conversations`.
7. Take a screenshot showing the chatbot question and reply.

## GitHub Pages option

The files inside `site/` can still be hosted with GitHub Pages. The chatbot will call the deployed Firebase Function across origins. Deploy the Firebase Function first, then upload only the contents of `site/` to the GitHub Pages assignment folder.

## Troubleshooting

- `Preview mode · connect Firebase to use OpenAI`: fill in `site/firebase-config.js`.
- `Agent request failed`: deploy Functions and set `OPENAI_API_KEY`.
- Function says billing is required: change the Firebase project to the Blaze plan.
- Poll works but chatbot does not: ensure `firebase-functions-compat.js` and `agent-app.js` are uploaded.
- Empty model response: check function logs with `firebase functions:log`.
