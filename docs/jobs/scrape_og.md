# scrape_og Job

## Purpose

Scrapes Open Graph metadata from a URL to extract website title, description, and image.

## Event Type

`scrape_og`

## Handler Location

`apps/ranj/src/jobs/scrapeOg.ts`

## Execution Requirements

- **Required**: `url` - Valid HTTP/HTTPS URL
- **Required**: `linkId` - UUID of link record
- **Required**: No dependencies (can run immediately)

## Job Parameters

```typescript
{
  event: 'scrape_og',
  url: string,
  linkId: string,
  priority: 1,
}
```

## What It Does

1. **Fetches URL** using `open-graph-scraper` library
2. **Extracts metadata**:
   - `og:title` → link.title
   - `og:description` → link.description
   - `og:image` → link.image
   - `og:site_name` → ignored
3. **Validates data** using Zod schema (all fields optional)
4. **Updates link record**:
   - Sets title, description, image
   - Changes state to `processed`
5. **Marks job** as `completed`

## Success Case

Job succeeds and link state becomes `processed` with metadata populated.

## Failure Case

Job fails and:
- Job status set to `failed`
- Link state set to `failed`
- Link title set to URL as fallback

## Output

No data returned to job system (used internally to update link).

## Dependencies

None. Can run immediately when `status = pending`.

## Priority

1 (higher priority than `auto_tag`)

## Error Handling

- Invalid URL: Throws error → job failed
- Network timeout: Throws error → job failed
- No OG data available: Still succeeds with empty fields
- Parsing error: Throws error → job failed

## Example Flow

```
User adds link: https://example.com
    ↓
API creates scrape_og job (priority: 1)
    ↓
Worker picks up job
    ↓
Fetch https://example.com
    ↓
Extract: title="Example Domain", description="..."
    ↓
Update link with scraped data
    ↓
Link state: processed
    ↓
Job status: completed
```

## Notes

- Uses `open-graph-scraper` npm package
- All scraped fields are optional (some sites don't have OG tags)
- Runs in ~1-3 seconds depending on network
- Not retried on failure
