# Momentum Hunter

Momentum Hunter is a Next.js web app that surfaces YouTube videos with strong view-to-subscriber momentum.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create an `.env.local` file:

```bash
YOUTUBE_API_KEY=your_key_here
```

3. Run the app:

```bash
npm run dev
```

## Vercel

- Add `YOUTUBE_API_KEY` in the Vercel project environment variables.
- Deploy the project to Vercel as a standard Next.js application.

## Notes

- Results are ranked by views / subscribers.
- Duration filter uses 8 minutes as the cutoff.
- Search requests are limited to 500 videos per scan.
