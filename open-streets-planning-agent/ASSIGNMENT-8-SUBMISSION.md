# Assignment 8 — Submission

## Website link

Paste the published Firebase Hosting or GitHub Pages URL here.

## Screenshot

Add a screenshot showing:

- the Open Streets Planning Agent heading;
- one user question;
- the agent's full response;
- the `Firebase agent connected` status.

## Description

I expanded my NYC Open Streets community poll by adding an Open Streets Planning Assistant. The chatbot is designed as a focused civic-planning agent rather than a general-purpose assistant. A user can describe a hypothetical block, preferred schedule, intended activities, or concerns about access and operations. The agent then organizes those inputs into a preliminary Open Street concept covering purpose, schedule, accessible and local access, staffing, maintenance, community outreach, and unresolved questions.

The website calls a Firebase Cloud Function, which keeps the OpenAI API key on the server rather than exposing it in the browser. The function sends the conversation to the OpenAI Responses API and stores the question and response in Firebase Realtime Database. The interface also reminds users that the output is a first draft, not official NYC DOT approval or evidence of neighborhood consensus.

## How I might use this approach in a project

This approach could become an early-stage participation and scenario-building tool within my larger Open Streets project. After a resident completes the community poll, the planning agent could help them translate general preferences into a more concrete street scenario. Repeated conversations could also reveal common questions about schedules, deliveries, accessibility, staffing, and maintenance. However, chatbot interactions would remain only one input layer and would need to be combined with public meetings, interviews, site observation, multilingual outreach, and official program guidance.
