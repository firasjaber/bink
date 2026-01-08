# auto_tag Job

## Purpose

Automatically assigns relevant tags to a link using AI (OpenAI gpt-4o-mini) based on the link's title and description.

## Event Type

`auto_tag`

## Handler Location

`apps/ranj/src/jobs/autoTag.ts`

## Execution Requirements

- **Required**: `linkId` - UUID of link record
- **Required**: `userId` - UUID of user (to fetch their tags)
- **Required**: `autoTagging` - Must be `true`
- **Required**: Link must have `title` populated
- **Required**: Corresponding `scrape_og` job must be `completed`
- **Required**: `OPENAI_API_KEY` environment variable (optional, logs warning if missing)

## Job Parameters

```typescript
{
  event: 'auto_tag',
  url: string,
  linkId: string,
  priority: 0,
  autoTagging: true,
  userId: string,
}
```

## What It Does

1. **Validates requirements**:
   - Check if `autoTagging` is enabled
   - Check if `userId` is present
   - Skip if either missing
2. **Fetches link data** using `selectLinkById()`:
   - Requires link to exist and have title
3. **Fetches available tags** using `selectAllUserTags()`:
   - Gets all system tags + user's custom tags
   - Skips if no tags available
4. **Generates tag suggestions** using OpenAI API:
   - Sends title and description to gpt-4o-mini
   - Prompts AI to select 2-5 relevant tags from available list
   - Returns only tags that exist in available list
5. **Merges tags** with existing link tags:
   - Fetches current tags on link
   - Merges existing + suggested tags (no duplicates)
6. **Updates link tags** using `deleteLinkTagsByLinkId()`:
   - Replaces all tags with merged set

## Success Case

Job succeeds, link has merged tags (existing + AI suggestions).

## Failure Case

Job succeeds (returns `success: true`) even if:
- AI API fails (error logged)
- No tags suggested
- Other errors occur

**Note**: Auto-tagging failures never fail the link or job.

## Output

No data returned (used internally to update link tags).

## Dependencies

- **Required**: `scrape_og` job for same link must be `completed`
- Enforced by polling query: `auto_tag` jobs only visible to executor when condition met

## Priority

0 (lower than `scrape_og`)

## Error Handling

- **Missing API key**: Logs warning, returns empty array, skips tagging
- **API failure**: Logs error, returns empty array, skips tagging
- **No link/title found**: Logs warning, skips tagging
- **No user tags available**: Logs info, skips tagging
- **No tags suggested**: Logs info, skips tagging
- **Tag update failure**: Logs error but still returns success

## AI Configuration

- **Model**: gpt-4o-mini
- **Temperature**: 0.3 (lower = more consistent results)
- **Response Format**: JSON
- **Cost**: ~$0.00003 per link (very cheap)

## Example Flow

```
User creates link with autoTagging: true
    ↓
API creates scrape_og job (priority: 1)
API creates auto_tag job (priority: 0)
    ↓
Worker picks up scrape_og job
    ↓
scrape_og completes → link.title and link.description populated
    ↓
Next poll: auto_tag job now eligible (scrape_og completed)
    ↓
Worker picks up auto_tag job
    ↓
Fetch user tags: ["Technology", "Science", "Health", "Finance"]
    ↓
Call OpenAI with title "AI Breakthrough" and description "New ML advances"
    ↓
AI suggests: ["Technology", "Science"]
    ↓
Merge with existing tags (none) → ["Technology", "Science"]
    ↓
Update link tags
    ↓
Job status: completed
```

## Tag Merging Logic

```typescript
// Existing tags on link: ["Finance"]
// AI suggested: ["Technology", "Finance"]

const existingTagNames = new Set(["Finance"]);
const mergedTagNames = [
  ...["Finance"],
  ...["Technology", "Finance"].filter(name => !existingTagNames.has(name))
];
// Result: ["Finance", "Technology"] (no duplicate)
```

## Notes

- Only suggests tags from user's available tags (system + custom)
- Never creates new tags (maintains tag system integrity)
- Always merges with existing tags (doesn't replace)
- Graceful degradation: missing API key or failures don't break the system
- Optional feature: disabled by default, user controls per-link
- Cost-effective: cheap model, minimal tokens per request
