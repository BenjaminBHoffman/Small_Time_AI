# Small Time AI

_Bringing AI innovation to small businesses._

The website for Small Time AI, an AI consulting and integration company that helps small businesses adopt AI tools and workflows. The home page is an AI assistant that answers visitors' questions, gives starting prices, and books discovery calls straight into the business's Google Calendar.

**Live site:** [smalltimeai.com](https://smalltimeai.com)

## Features

- **AI chat assistant** on the home page, powered by Google Gemini
- **Answers questions** about the services: AI consulting, AI tool integration, workflow automation, chatbot setup, and staff training
- **Starting-price quotes**, with firm quotes handled on a discovery call
- **Live availability** checked against the business's Google Calendar
- **Direct booking** of one-hour discovery calls, with a Google Meet link and an email invite sent automatically
- **Quick-reply buttons** for common questions
- **Privacy policy** page at `/privacy`
- **Cookie-free analytics** through Vercel Web Analytics

## How it works

1. A visitor sends a message from the home page (`pages/index.js`), which posts the whole conversation to `/api/chat`.
2. The server (`pages/api/chat.js`) sends the conversation to Gemini, along with a system prompt and two tools: `check_availability` and `book_appointment`.
3. Gemini either replies or asks to use a tool. The server runs the tool, enforces the booking rules in code, and talks to Google Calendar through `lib/calendar.js`.
4. Tool results go back to Gemini, which repeats step 3 as needed and then writes the reply the visitor sees.

Calls can be booked on weekdays, from tomorrow up to 30 days out, in one-hour slots between 9 AM and 4 PM Eastern (with a break from 12 to 1). Conversations aren't stored on the server; they live in the visitor's browser tab.

## Tech stack

| Technology | Used for |
|---|---|
| Next.js 16 (Pages Router, Turbopack) | Pages, API routes, and production builds |
| React 19 | The chat interface |
| JavaScript | All code (no TypeScript) |
| styled-jsx and global CSS | Styling (styled-jsx is built into Next.js) |
| Google Gemini API | The AI assistant, called over REST with function calling |
| Google Calendar API (`googleapis`) | Checking free/busy times and creating events |
| Google OAuth 2.0 | Server access to the business calendar through a refresh token |
| Google Meet | Video link on every booked call |
| Vercel | Hosting; runs `/api/chat` as a serverless function |
| Vercel Web Analytics (`@vercel/analytics`) | Anonymous page-view stats |
| Google Fonts | Space Grotesk and Inter |
| ESLint 9 (`eslint-config-next`) | Linting |
| npm | Package management |

## Project structure

```
├── lib/
│   └── calendar.js     Google Calendar: availability checks and booking
├── pages/
│   ├── api/
│   │   └── chat.js     AI assistant: Gemini calls, booking tools, and rules
│   ├── _app.js         Wraps every page; global CSS and analytics
│   ├── _document.js    HTML shell; loads Google Fonts
│   ├── index.js        Home page with the chat assistant
│   └── privacy.js      Privacy policy page
├── public/
│   └── favicon.ico     Browser tab icon
├── styles/
│   └── globals.css     Base styles shared by every page
├── eslint.config.mjs   Linting rules
├── jsconfig.json       Enables @/ import paths
├── next.config.mjs     Next.js settings
└── package.json        Dependencies and scripts
```

## Getting started

**Requirements:** Node.js 20.9 or later, a Gemini API key, and a Google Cloud OAuth client with access to the business's Google Calendar.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` file in the project root with the variables listed below.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Environment variables

All six are used only on the server. Set them in `.env.local` for local development and in the Vercel project settings for production. Never commit them.

| Variable | What it is |
|---|---|
| `GEMINI_API_KEY` | API key for the Gemini API |
| `GOOGLE_CLIENT_ID` | OAuth client ID from Google Cloud |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Redirect URI registered on the OAuth client |
| `GOOGLE_REFRESH_TOKEN` | Refresh token for the Google account that owns the calendar |
| `GOOGLE_CALENDAR_ID` | The calendar to check and book into (your Google account email for your main calendar) |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Check the code with ESLint |

## Deployment

The site is hosted on Vercel, which builds it with `npm run build`, serves the home and privacy pages as static HTML, and runs `/api/chat` as a serverless function. Add the environment variables under **Settings → Environment Variables** in the Vercel project.

Keep the Google Cloud OAuth consent screen set to **In production**. In testing mode, Google expires the refresh token after seven days and booking stops working.

## Customizing

| To change | Edit |
|---|---|
| What the assistant knows, its prices, and its tone | `buildSystemPrompt()` in `pages/api/chat.js` |
| Booking days, how far ahead, and per-reply limits | The settings at the top of `pages/api/chat.js` |
| Call times | `SLOT_TIMES` in `pages/api/chat.js` **and** `workingHours` in `lib/calendar.js` (keep them in sync) |
| Gemini models and fallback order | `MODELS` in `pages/api/chat.js` |
| Calendar event title and description | `bookAppointment()` in `lib/calendar.js` |
| Greeting and quick-reply buttons | The top of `pages/index.js` |
| Home page colors and layout | The `<style jsx global>` block at the bottom of `pages/index.js` |
| Privacy policy text and contact email | `pages/privacy.js` |