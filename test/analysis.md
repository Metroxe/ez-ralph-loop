# Edge Case Analysis: `src/claude.ts` Streaming Event Processing

## 1. `hasStreamedContent` Boolean Silently Drops Non-Streamed Blocks

**Trigger condition:** An assistant turn contains multiple content blocks, but only some are delivered via `content_block_delta` events. Any single block start or delta sets `hasStreamedContent = true` (lines 387-389, 426), causing `handleAssistantMessage` (line 519) to skip the *entire* `message.content` array — silently dropping blocks that were never individually streamed (e.g., a short text block alongside a streamed tool_use).

**Severity:** High — text or tool-use blocks are silently lost from both display output and `state.lastTextBlock`, breaking rendering and sentinel-based loop control.

**Fix:** Replace the single boolean with a `Set<number>` of streamed block indices; in `handleAssistantMessage`, only skip blocks whose index appears in the set.

---

## 2. `lastTextBlock` Not Updated in `handleAssistantMessage` Fallback Path

**Trigger condition:** When no streaming deltas are received (`hasStreamedContent` is false — e.g., very short responses or the CLI batching output without streaming), `handleAssistantMessage` (lines 528-533) writes text to output and the footer but never assigns `state.lastTextBlock`. Sentinel string detection at lines 212-217 then checks an empty/stale `lastTextBlock`, failing to detect `stopString` or `continueString`.

**Severity:** High — loop control flow is broken for any iteration where streaming deltas were absent; the loop either fails to terminate on a stop signal or runs unnecessary extra iterations, wasting API spend.

**Fix:** Add `state.lastTextBlock = cleaned;` after line 530 in the fallback text-block handling branch.

---

## 3. Block Index Collision Across Assistant Turns

**Trigger condition:** The `blocks` record (line 103) is allocated once per iteration and never cleared between assistant turns. The Claude streaming API reuses index 0 for each new message's first `content_block_start`. If a prior turn's block was not cleaned up (no `content_block_stop` received due to truncated stream or network error), the new turn's block at the same index silently overwrites the stale entry, leaking corrupted `input`/`content` into formatting.

**Severity:** Medium — causes garbled tool-use formatting or phantom content from a previous turn; normally masked by `delete blocks[idx]` at line 506 but exposed under network interruption or rapid multi-turn agentic responses.

**Fix:** Clear all entries in `blocks` when a `message_start` event is received (lines 285-289), instead of ignoring it as a no-op.
