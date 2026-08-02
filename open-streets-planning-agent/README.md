# Open Streets Planning Agent — Direct Browser Version

This version follows the simplified classroom tutorial: the browser calls the OpenAI API directly. It does **not** deploy Firebase Functions or Realtime Database rules.

## 1. Add the OpenAI API key

Open:

```text
site/openai-config.js
```

Replace:

```js
apiKey: "PASTE_YOUR_OPENAI_API_KEY_HERE"
```

with a temporary API key, for example:

```js
apiKey: "sk-proj-..."
```

Do not add extra spaces or delete the quotation marks.

## 2. Deploy only Firebase Hosting

From the folder containing `firebase.json`, run:

```bash
firebase deploy --only hosting
```

This avoids Cloud Functions and Realtime Database entirely.

## 3. Test

Open the Hosting URL and ask:

```text
Create a simple Saturday Open Street plan for a residential block. Prioritize children's play and seating, while keeping deliveries and accessible pickup possible.
```

The status should say:

```text
OpenAI browser connection ready
```

## Important security limitation

The key is visible in the website source and browser network requests. Use a temporary project key with a low budget. After taking the assignment screenshot and submitting, revoke the key in the OpenAI Platform and remove it from the public website.

## Firebase poll

The original community poll remains in the page. Without a completed Firebase Web configuration and Realtime Database, it runs in local preview mode. The chatbot itself does not require Realtime Database in this version.
