# Job Queue System

## Overview

The job queue system is a database-backed queue that handles asynchronous tasks in the background. It's implemented in the `apps/ranj` worker service and uses PostgreSQL for job storage and management.

## Architecture

### Components

- **Database Queue**: Jobs stored in `scraping_jobs` table
- **Job Executor**: Polls and executes jobs (`apps/ranj/src/executor.ts`)
- **Job Handlers**: Individual job logic implementations (`apps/ranj/src/jobs/`)
- **Job Registry**: Maps event types to handlers (`apps/ranj/src/registry.ts`)

## Job Lifecycle

1. **Creation**: API service creates job record in `scraping_jobs` table
2. **Polling**: Worker polls database every 2 seconds (idle) or 100ms (processing) for pending jobs
3. **Selection**: Fetches batch of pending jobs (max 10), ordered by priority
4. **Claiming**: Updates job status to `processing` and sets `lockedAt` timestamp
5. **Execution**: Calls appropriate job handler
6. **Completion**: Updates job status to `completed` or `failed`

## Job States

| State | Description |
|--------|-------------|
| `pending` | Job is waiting to be processed |
| `processing` | Job is currently being executed |
| `completed` | Job finished successfully |
| `failed` | Job failed with an error |

## Job Priority

Jobs are ordered by priority (higher first) then by creation time (older first):

- `scrape_og`: Priority 1
- `auto_tag`: Priority 0 (runs after scrape_og)

## Job Dependencies

Some jobs depend on others completing successfully. The queue enforces dependencies through the polling query:

- **scrape_og**: Can run immediately when pending
- **auto_tag**: Only eligible when corresponding `scrape_og` job for same link is `completed`

## Database Schema

```sql
scraping_jobs:
  - id: UUID (primary key)
  - url: TEXT
  - event: ENUM('scrape_og', 'auto_tag')
  - status: ENUM('pending', 'processing', 'completed', 'failed')
  - priority: INTEGER
  - linkId: UUID (foreign key to link)
  - autoTagging: BOOLEAN (for auto_tag jobs)
  - userId: UUID (foreign key to user, for auto_tag jobs)
  - createdAt: TIMESTAMP
  - updatedAt: TIMESTAMP
  - lockedAt: TIMESTAMP (prevents duplicate processing)
```

## Error Handling

- Job failures update job status to `failed`
- Failed `scrape_og` jobs set link state to `failed` with URL as fallback title
- `auto_tag` job failures don't fail the link (optional enhancement)
- Jobs are never retried automatically

## Execution Flow

```
API (POST /links)
    ↓
Create link record (state: processing)
    ↓
Create scrape_og job (priority: 1)
    ↓
If autoTagging: true, create auto_tag job (priority: 0)
    ↓
Worker polls for pending jobs
    ↓
Fetch jobs based on priority and dependencies
    ↓
Mark jobs as processing
    ↓
Execute handlers in parallel
    ↓
Mark jobs as completed or failed
    ↓
Link state updated to processed/failed
```

## Adding New Jobs

1. Create handler in `apps/ranj/src/jobs/[jobName].ts`
2. Export handler implementing `JobHandler` interface
3. Register in `apps/ranj/src/registry.ts`
4. Add event type to `eventEnum` in schema
5. Update `getPendingJobs()` query if job has dependencies
6. Create job from API when needed

## Key Files

- `apps/ranj/src/executor.ts` - Main job execution loop
- `apps/ranj/src/registry.ts` - Job handler registry
- `apps/ranj/src/types.ts` - Type definitions
- `packages/db/src/queries/scraping-jobs.ts` - Database queries
- `packages/db/src/schema.ts` - Database schema
