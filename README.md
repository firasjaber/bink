# Bink

A modern bookmarks management app with AI-powered search and automatic content scraping.

**Live at:** [binkapp.firrj.com](https://binkapp.firrj.com)

## Features

- **Auto-Scraping**: Automatically extracts page content and metadata when you paste a URL
- **AI-Powered Search**: Context-aware search using similarity matching to find bookmarks even with typos or related terms
- **Tagging System**: Simple yet effective tagging to organize your bookmarks
- **Rich Notes**: Add personal notes with a rich text editor

## Tech Stack

**Frontend**
- React + Vite + TypeScript
- TanStack Router & Query
- TailwindCSS + Radix UI
- Novel (rich text editor)

**Backend**
- Elysia.js (Bun runtime)
- PostgreSQL + pgvector (vector similarity search)
- Drizzle ORM
- Redis (caching)
- OpenAI API (embeddings)
- Lucia (authentication)

## Project Structure

```
bink/
├── apps/
│   ├── api/          # Backend API server
│   ├── client/       # Frontend React app
│   └── ranj/         # Background worker service
└── packages/
    └── db/           # Shared database schema and utilities
```

## Development

```bash
# Install dependencies
bun install

# Start development servers
cd apps/api && bun dev
cd apps/client && bun dev

# Or use Docker Compose
docker-compose up
```

## Contributing

Have an idea or found an issue? Feel free to reach out or submit a pull request!
