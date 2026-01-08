# Documentation

This directory contains system documentation for the job queue system and individual job handlers.

## Contents

- **[job-queue.md](job-queue.md)** - Overview of the entire job queue architecture, execution flow, and how to add new jobs
- **[jobs/scrape_og.md](jobs/scrape_og.md)** - Documentation for the scrape_og job handler
- **[jobs/auto_tag.md](jobs/auto_tag.md)** - Documentation for the auto_tag job handler

## Quick Reference

### Available Job Types

| Job Type | Purpose | Priority | Dependencies |
|-----------|---------|-----------|---------------|
| `scrape_og` | Scrape Open Graph metadata from URL | 1 | None |
| `auto_tag` | Auto-assign tags using AI | 0 | scrape_og must complete first |

### Key Concepts

- **Jobs** are stored in `scraping_jobs` table
- **Worker** (`apps/ranj`) polls and executes jobs
- **Handlers** implement job-specific logic
- **Registry** maps event types to handlers
- **Dependencies** are enforced by polling query conditions

## For AI Agents

When modifying or adding jobs, reference these documents to understand:
- How the queue system works
- Job execution lifecycle
- How dependencies are enforced
- Error handling patterns
- How to register new job handlers

## For Developers

- Add new jobs in `apps/ranj/src/jobs/`
- Register in `apps/ranj/src/registry.ts`
- Update schema `eventEnum` in `packages/db/src/schema.ts`
- Modify `getPendingJobs()` query if job has dependencies
