# Client preprocess ↔ Backend A contract

**Owner:** Coder 2 (FE) · **A partner:** Banckend  
**Status:** FE helpers landed; A consumption optional until tiered-context / RLM work wires it.

## Why
Devansh’s CSR/SSR load split: do cheap, deterministic shaping on the browser so Backend A and Model APIs don’t redo trivial work. API-only models (no local/Azure weights). Aligns with sparse frequency compression + RLM “prompt as external env” (FE ships a structured hint, not a megabyte dump).

## What FE computes (CSR)
| Helper | Output | When |
|--------|--------|------|
| `buildFrequencyEncoding(text)` | `{ token: count }` | Per user message + older history |
| `compressMessagesForApi(messages)` | recent turns + `older_freq` + char stats | Before chat when history exists |
| `normalizeDatasetRows(rows)` | filtered/deduped/capped rows | Before dataset upload/query |
| `buildChatClientContext(...)` | `client_context` blob | Attached to `POST /v1/chat` |

## Chat request shape (additive)
```json
{
  "message": "<verbatim current user text>",
  "user_id": "...",
  "project_id": "...",
  "client_context": {
    "version": 1,
    "source": "csr-client-preprocess",
    "message_freq": { "revenue": 3, "q3": 2 },
    "history": {
      "recent": [{ "role": "user", "content": "..." }],
      "older_freq": { "token": 4 },
      "stats": {
        "original_chars": 12000,
        "recent_chars": 1800,
        "older_chars": 10200,
        "older_unique_tokens": 210
      }
    }
  }
}
```

## What Backend A must NOT redo
- Re-tokenize / re-count frequencies already present in `client_context.message_freq` / `older_freq` for metering previews (may recompute server-side only for trust/billing audits).
- Re-dedupe/cap dataset rows that FE already normalized with the same rules (document limits in API if A enforces a lower cap).

## What Backend A / Model MAY do
- Ignore `client_context` safely (backward compatible).
- Use `older_freq` as a cheap prior for RLM recursive inspect / sparse retrieval pre-filter (AI Engineer track).
- Enforce tier limits using `stats.*` as client hints, then verify.

## Out of scope here
- Globe UI (Coder)
- Tier quotas / persistence (Banckend)
- RLM recursive tool loop (AI Engineer)
