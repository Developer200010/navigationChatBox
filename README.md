# AI Co-Browsing Portfolio Chatbot (Next.js + Gemini)

This project implements an AI co-browsing assistant for a portfolio website.

The assistant can:
- Understand portfolio content from a live DOM snapshot (no hard-coded answers).
- Respond conversationally with short-term context.
- Trigger tool-based page actions from user intent:
  - `scroll_by`
  - `navigate_to_section`
  - `click_element`
  - `highlight_element`
  - `fill_input`

## Tech Stack

- Next.js (App Router, TypeScript)
- React
- Gemini API (`gemini-2.5-flash` by default)
- Vercel-ready deployment

## Project Structure

- `src/app/page.tsx`: two-column app shell (portfolio + chat panel).
- `src/components/portfolio-content.tsx`: portfolio sections and form.
- `src/components/chat-panel.tsx`: chat UI + client orchestration loop.
- `src/lib/page-snapshot.ts`: dynamic DOM extraction for sections/elements.
- `src/lib/tool-runner.ts`: frontend tool execution against the DOM.
- `src/lib/tool-definitions.ts`: tool schema passed to Gemini.
- `src/app/api/chat/route.ts`: Gemini orchestration API route.
- `src/lib/types.ts`: shared request/response/types.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env.local
```

3. Add your Gemini key in `.env.local`:

```env
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-2.5-flash
```

4. Start dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## How the Co-Browsing Loop Works

1. User message is sent from `chat-panel` with:
   - chat history
   - fresh `pageSnapshot`
2. `/api/chat` asks Gemini to either:
   - respond directly, or
   - return tool calls
3. Client executes tool calls with `tool-runner`.
4. Client sends tool execution results back to `/api/chat`.
5. Gemini produces a final assistant response grounded in tool outcomes.

## API Contract

`POST /api/chat`

Request body:

```ts
{
  message: string;
  history: ChatMessage[];
  pageSnapshot: PageSnapshot;
  toolResults?: ToolResult[];
}
```

Response body:

```ts
{
  assistantMessage: string;
  toolCalls?: ToolCall[];
  awaitingToolResults: boolean;
}
```

## Manual Test Prompts

Use these in local testing and in your demo video:

1. `What projects are showcased here?`
2. `Go to the projects section and highlight the most recent one.`
3. `Open the GitHub link for PulseCart Analytics.`
4. `Fill contact form with name Alex and email alex@test.com.`
5. `Open that one.`
6. `Highlight a section called testimonials.`
7. `Show projects` then `Highlight the second one.`

## Build and Lint

```bash
npm run lint
npm run build
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Add environment variables in Vercel:
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (optional)
4. Deploy.

## Deliverables Reminder

- GitHub repo link
- Vercel live URL
- 2-5 minute demo video showing:
  - user prompt
  - assistant response
  - corresponding page action

