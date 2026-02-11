# Edge Case Analysis: src/claude.ts Streaming Event Processing

## Edge Case 1: Unparsed Buffer Remainder After Stream Completion

**Trigger Condition:** Stream ends with incomplete line (no trailing `\n`). The readline loop (lines 132-190) only processes complete lines. When `done === true` at line 126, remaining `buffer` content bypasses JSON parsing and gets written as raw text (lines 197-200).

**Severity:** CRITICAL

**One-Line Fix:** Before line 197, add: `try { const ev = JSON.parse(buffer.trim()); await processEvent(ev, blocks, footer, liveStats, config, state, debugFile); buffer = ""; } catch { }`

---

## Edge Case 2: Content Block Delta Without Prior Start Event

**Trigger Condition:** `content_block_delta` event arrives for index with no prior `content_block_start`. The delta handlers (lines 433-471) write content to footer/output BEFORE checking `if (blocks[idx])` (lines 435-439 for text, 448-456 for thinking). When `content_block_stop` arrives (line 474), it finds no block at `blocks[idx]` and skips all formatting (line 482).

**Severity:** HIGH

**One-Line Fix:** At line 426 in `handleBlockDelta`, add: `if (!blocks[idx]) blocks[idx] = { type: "text", content: "" };`

---

## Edge Case 3: Global Boolean Suppresses Unstreamed Blocks in Mixed Messages

**Trigger Condition:** Assistant message contains multiple blocks, but only some arrive via streaming deltas. The `hasStreamedContent` flag is set on ANY streaming block (lines 398, 436). When `handleAssistantMessage` executes (line 519), it checks this flag at line 529 and skips printing the ENTIRE message if true—including blocks that were never streamed.

**Severity:** HIGH

**One-Line Fix:** Replace `hasStreamedContent: boolean` with `streamedBlockIndices: Set<number>`, track indices in start/delta handlers, and in `handleAssistantMessage` only skip blocks present in the set.

---

# Constraint Scheduling Problem Solution

## Problem Statement

Assign 5 tasks (A=3, B=5, C=2, D=4, E=1) to 3 workers:

**Constraints:**
1. A must finish before C starts (A → C)
2. B and D cannot share a worker
3. E must be on W2
4. Max 2 tasks per worker

**Objective:** Minimize makespan (total completion time)

---

## Optimal Solution: Makespan = 5

```
Time:  0   1   2   3   4   5
W1:    [===A===][==C==]
W2:    [E][=====D=====]
W3:    [========B========]
```

| Worker | Tasks | Schedule | Completion |
|--------|-------|----------|------------|
| W1 | A, C | A:[0,3], C:[3,5] | 5 |
| W2 | E, D | E:[0,1], D:[1,5] | 5 |
| W3 | B | B:[0,5] | 5 |

**Constraint Verification:**
- ✓ A→C precedence: A ends at t=3, C starts at t=3
- ✓ B≠D worker: B on W3, D on W2
- ✓ E on W2: satisfied
- ✓ Max 2 tasks/worker: W1=2, W2=2, W3=1

---

## Proof of Optimality

### Lower Bounds (All Equal 5)

**LB1 — Longest task:** B = 5 → makespan ≥ 5

**LB2 — Precedence chain:** A→C forces sequential execution: 3 + 2 = 5 → makespan ≥ 5

**LB3 — Workload balance:** Total work = 15, across 3 workers: ⌈15/3⌉ = 5 → makespan ≥ 5

Since our solution achieves makespan = 5 (matching all lower bounds), **no solution with makespan < 5 can exist**.

### Assignment is Forced by Constraints

1. **E must be on W2** (constraint 3). W2 has capacity for one more task (constraint 4).

2. **D must pair with E on W2:** If D goes elsewhere, B cannot share with D (constraint 2), forcing B and D on separate non-W2 workers. This leaves E alone on W2 and creates imbalance. The only way to achieve makespan ≤ 5 is E+D on W2 (1+4=5).

3. **A and C must stay together:** The precedence constraint A→C means if they're split across workers, the worker executing C must idle until A completes, introducing slack → makespan ≥ 6. Keeping them together: A+C = 3+2 = 5 exactly.

4. **B occupies remaining worker alone:** With E-D on W2 and A-C on another worker, B goes to the third worker: B = 5 exactly.

### Exhaustive Alternatives All Fail

- **E+B on W2:** 1+5 = 6 > 5 ✗
- **D pairs with B:** Violates constraint 2 ✗
- **A and C split:** Introduces idle time → makespan ≥ 6 ✗
- **D pairs with A or C:** Creates unbalanced load (7, 6, or 9) ✗
- **E not on W2:** Violates constraint 3 ✗

**Therefore, makespan = 5 is optimal and no better solution exists. QED.**
