# Discord Webhook Troubleshooting Summary

## Problem
GitHub webhook was failing with HTTP 400 error and Discord error code 50006: "Cannot send an empty message"

## Root Causes Identified

### 1. Duplicate Webhook Configuration
- **Issue**: Two separate systems were trying to send Discord notifications:
  - GitHub repository webhook (Settings → Webhooks) - sending raw GitHub payload
  - GitHub Actions workflow (`.github/workflows/discord-commits.yml`) - sending formatted Discord embeds
  
- **Problem**: The repository webhook was sending GitHub's native push event JSON, which Discord couldn't parse, resulting in "empty message" errors

### 2. Workflow JSON Formatting Issues
- **Issue**: The GitHub Actions workflow had improper JSON string interpolation
- **Problems**:
  - Mixed use of single quotes with embedded variables created malformed JSON
  - Special characters in commit messages (quotes, newlines) broke JSON syntax
  - Used `jq` for JSON encoding, which may not be available in all environments
  - No error handling or response validation

## Solutions Implemented

### Step 1: Fixed GitHub Actions Workflow
**File**: `.github/workflows/discord-commits.yml`

**Changes Made**:
1. Changed from single-quoted to double-quoted JSON strings
2. Removed `jq` dependency and used `sed` for JSON escaping instead
3. Added proper escaping for special characters (`\"`, `\\n`, `\\`)
4. Added HTTP response code checking and error handling
5. Added success/failure logging

**Before**:
```yaml
COMMIT_MSG=$(echo '${{ github.event.head_commit.message }}' | head -n 1 | jq -Rs .)
curl -H "Content-Type: application/json" \
  -d '{
    "username": "GitHub Commits",
    "embeds": [{
      "title": "📦 New Commit",
      "description": "... '"${COMMIT_MSG}"' ...",
      ...
    }]
  }' \
  "${DISCORD_WEBHOOK}"
```

**After**:
```yaml
# Extract and escape commit message
COMMIT_MSG=$(echo '${{ github.event.head_commit.message }}' | head -n 1)
COMMIT_MSG_ESCAPED=$(printf '%s' "$COMMIT_MSG" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\n/\\n/g')

# Send with error handling
RESPONSE=$(curl -w "\n%{http_code}" -H "Content-Type: application/json" \
  -d "{
    \"username\": \"GitHub Commits\",
    \"embeds\": [{
      \"title\": \"📦 New Commit\",
      \"description\": \"... ${COMMIT_MSG_ESCAPED} ...\",
      ...
    }]
  }" \
  "${DISCORD_WEBHOOK}")

# Validate response
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [ "$HTTP_CODE" -ne 204 ] && [ "$HTTP_CODE" -ne 200 ]; then
  echo "Error: Discord webhook returned HTTP $HTTP_CODE"
  exit 1
fi
```

### Step 2: Removed Duplicate Repository Webhook
**Action**: Deleted the GitHub repository webhook from Settings → Webhooks

**Reason**: 
- Repository webhooks send raw GitHub event payloads
- Discord expects specific JSON format with `content`, `embeds`, or `file` fields
- GitHub Actions workflow already handles proper Discord notification formatting

## Final Architecture

```
┌─────────────────┐
│   Git Push to   │
│  master branch  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  GitHub Actions Workflow        │
│  (.github/workflows/            │
│   discord-commits.yml)          │
│                                 │
│  - Extracts commit info         │
│  - Formats Discord embed        │
│  - Escapes special characters   │
│  - Sends HTTP POST to Discord   │
│  - Validates response           │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Discord Webhook API            │
│  https://discord.com/api/       │
│  webhooks/{id}/{token}          │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Discord Channel                │
│  - Shows formatted embed        │
│  - Includes repo, author,       │
│    branch, commit, message      │
└─────────────────────────────────┘
```

## Verification Steps

1. ✅ Deleted repository webhook from GitHub Settings
2. ✅ Updated workflow file with proper JSON formatting
3. ✅ Added error handling and validation
4. ✅ Tested with commit push
5. ✅ Verified GitHub Actions workflow succeeded (green checkmark)
6. ✅ Confirmed Discord notification appeared with proper formatting

## Discord Notification Format

The workflow now sends rich embeds to Discord with:
- **Title**: 📦 New Commit
- **Username**: GitHub Commits
- **Avatar**: GitHub logo
- **Fields**:
  - Repository name
  - Author
  - Branch
  - Commit SHA (shortened, linked)
  - Commit message
  - Timestamp

## Key Takeaways

1. **Avoid duplicate webhooks**: Only use one notification method (GitHub Actions workflow preferred for Discord)
2. **Proper JSON escaping**: Always escape special characters in user-generated content
3. **Error handling**: Validate HTTP responses and log errors for debugging
4. **Use native tools**: Prefer `sed`/`printf` over `jq` for portability
5. **Test incrementally**: Verify each component works before moving to the next

## Testing

To test the webhook:
```bash
# Manual Discord webhook test
curl -X POST -H "Content-Type: application/json" \
  -d '{"content":"Test message"}' \
  "https://discord.com/api/webhooks/{id}/{token}"

# Trigger GitHub Actions by pushing a commit
git commit -m "Test commit" --allow-empty
git push origin master
```

## References

- [Discord Webhook API Documentation](https://discord.com/developers/docs/resources/webhook)
- [GitHub Actions Context](https://docs.github.com/en/actions/learn-github-actions/contexts)
- Discord Error Code 50006: Cannot send an empty message
  - Requires at least one of: `content`, `embeds`, or `file`

---

**Status**: ✅ Resolved  
**Date**: November 10, 2025  
**Final Result**: Discord notifications working successfully via GitHub Actions
