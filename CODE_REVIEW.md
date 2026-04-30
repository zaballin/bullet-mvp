# Bullet Journal MVP - Code Review & Issues Report

## Context
React/Next.js app with Prisma + SQLite. Mobile-first bullet journal with:
- Day navigation (‹ Today ›)
- Swipe gestures (right=complete, left=move to tomorrow)
- Drag & drop reordering
- Prefix-based entry parsing (. task, .! urgent, / note, ! idea)
- Habit tracker with 52-week GitHub-style contribution graph

---

## CRITICAL ISSUES

### 1. Entry Cannot Be Added - Root Cause Analysis

**Symptom:** User cannot add tasks via the web UI input.

**Files involved:** `TodayView.tsx`, `entries/route.ts`, `db.ts`

**Issue A: parseInput in TodayView is LOCAL, not used by API**
- `TodayView.tsx` has its own `parseInput()` function
- When `addEntry()` is called, it extracts `{ type, priority, content }` correctly
- But then sends `{ type, priority, content, date: currentDateStr }` to POST `/api/entries`
- The API receives these and uses them directly (good)

**Issue B: API POST logic flaw in entries/route.ts**
```typescript
let finalType = type
let finalContent = content
// ...
if (!finalType || !finalContent) {
  const parsed = parseMessage(content || '')
  // This fallback NEVER runs because type and content ARE provided
```

**Issue C: The date field name mismatch**
- `TodayView` sends: `{ type, priority, content, date: currentDateStr }`
- API expects: `{ type, content, priority, date: entryDate }` via destructuring
- `entryDate` gets `body.date` which is `currentDateStr` - this works

**Issue D: `parseMessage` in db.ts is WRONG for Web UI input**
- `parseMessage` looks for patterns like `task:`, `idea:`, etc.
- But Web UI already extracts type/priority via `parseInput()` and sends as separate fields
- The `else` block in parseMessage that should handle raw text has bugs:
  ```javascript
  // Default to task
  return { type: 'task', content: trimmed }
  ```
  This strips prefixes like `. ` but doesn't properly handle all cases.

**Conclusion:** The issue is likely that the API's conditional logic is confusing and `parseMessage` in db.ts may be called incorrectly from the `/api/capture` endpoint.

---

### 2. Tomorrow Navigation Not Working

**Symptom:** User navigates to tomorrow with › but sees nothing, or navigation is disabled.

**Files:** `TodayView.tsx`

**Issue A: Future dates are blocked**
```typescript
function goToNextDay() {
  const next = new Date(currentDate)
  next.setDate(next.getDate() + 1)
  const today = new Date()
  if (next <= today) setCurrentDate(next)  // ← This blocks tomorrow!
}
```
Since tomorrow hasn't happened yet, `next <= today` is FALSE, so navigation is blocked.

**Issue B: "Tomorrow" is a conceptual future**
- If today is April 28, tomorrow is April 29 (future from user's perspective)
- But we want to allow viewing "tomorrow" even if it's future
- The intent was probably to allow viewing today AND yesterday, but tomorrow only appears via MOVE action

**Conclusion:** The navigation › is intentionally blocked for future dates. Users should navigate to tomorrow AFTER they've moved tasks there (tasks appear on the actual tomorrow's date).

---

### 3. DraggableRow onDragOver/onDrop Conflict with Touch Handlers

**Files:** `TodayView.tsx`

**Issue:** `onDragOver` and `onDrop` are on the same div as touch handlers. On mobile, drag events don't fire properly - touch gestures take over. The drag and drop only works on desktop.

**Missing:** Mobile needs a different approach for reordering (long-press to enter reorder mode, then drag).

---

### 4. Input Prefix Parsing Inconsistency

**Files:** `TodayView.tsx` (local), `db.ts` (API)

**Issue:** Two different parsing systems:
1. `TodayView.parseInput()` - handles `.` `.!` `/` `!`
2. `db.ts parseMessage()` - handles `task:` `idea:` `event:` `note:`

The WhatsApp capture uses `db.ts parseMessage()` which has DIFFERENT patterns.

**Example:**
- Web UI: `.! fix the bug` → `{ type: 'task', priority: 'high', content: 'fix the bug' }`
- WhatsApp: `! fix the bug` → `{ type: 'idea', ... }` (because `!` is treated as idea prefix, not urgency)

This is inconsistent behavior.

---

### 5. Habits GET Query Doesn't Fetch All Required Logs

**File:** `habits/route.ts`

```typescript
logs: {
  where: {
    date: { gte: getDateDaysAgo(7), lte: today() }
  }
}
```

**Issue:** The 52-week contribution graph in `HabitsView.tsx` calls `get52Weeks()` which goes back 52 weeks. But the API only fetches 7 days of logs. This means:
- Last 7 days: works (shows dots)
- 52-week graph: shows empty squares for older days (no data fetched)

**Required fix:** Need to either:
1. Fetch all logs for habits (unlimited range), or
2. Add a separate endpoint for full history

---

### 6. Undo Logic is Per-Entry, Not Global

**File:** `TodayView.tsx`

**Issue:** The original code had an `undoStack` with undo per entry. Current code removed this and relies on "repeat gesture to undo". But the logic for undoing a move (swipe left again to revert) is:

```typescript
async function moveEntry(entry: Entry) {
  const tomorrowDate = getTomorrowStr()
  // ... sets to moved
  // To undo, need to set status back to 'open' AND date back to original
}
```

**Problem:** When moving to tomorrow, we update the entry's DATE to tomorrow's date. To undo, we need the original date. The current code doesn't track the original date for undo.

---

### 7. Drag Reorder Not Persisted

**File:** `TodayView.tsx`

**Issue:** When user drags to reorder, the visual order changes in React state but NO API call is made to persist the order. The `createdAt` timestamp in DB determines original order, but we have no `order` or `position` field in the schema.

**Implication:** On page refresh, order resets to `createdAt` order.

---

## MEDIUM ISSUES

### 8. Journal View Groups by `date` Field Only

**File:** `JournalView.tsx`

Migrated tasks show under the NEW date (tomorrow), not original. This is correct behavior per Bullet Journal principle. But if user wants to see ALL entries for a task across days, there's no history.

### 9. No Error Handling on Failed API Calls

**File:** All components

`fetchEntries()`, `addEntry()`, `toggleComplete()`, etc. - none show user-facing error messages when API calls fail.

### 10. parseMessage in db.ts has Unused Regex Patterns

```typescript
// These patterns are defined but the fallback logic doesn't use them correctly
const taskMatch = trimmed.match(/^task:?\s*(?:!?(high|medium|low)\s+)?(.+)/i)
// ...
```

The API was modified to skip parseMessage when type/content are provided directly from UI. But parseMessage is still used in `/api/capture` which has its own issues.

### 11. capture/route.ts Creates Duplicate Habits

```typescript
const existing = await prisma.habit.findFirst({
  where: { name: { equals: parsed.content } }
})
```

The `equals` Prisma filter might not work as expected for case-insensitive matching. "Morning stretch" vs "morning stretch" would create duplicates.

### 12. HabitsView Component Has Two Different Toggle APIs

```typescript
// 7-day compact toggle
onClick={() => toggleHabitDay(habit.id, day)}

// 52-week contribution graph toggle  
onClick={() => onToggleDay(day)}
```

Both call the same underlying toggle endpoint but with slightly different parameter naming.

---

## MINOR ISSUES

### 13. No Loading State for Individual Actions
When toggling a habit or completing a task, there's no immediate visual feedback - must wait for API round-trip.

### 14. Symbol Legend at Bottom is Clutter
The hint row (`. task  .! urgent  / note  ! idea`) takes space and may confuse users. Better to show as placeholder or tooltip.

### 15. Date Formatting Uses toISOString which is UTC
```typescript
const currentDateStr = currentDate.toISOString().split('T')[0]
```

For users in CET (Zurich), this could show dates incorrectly during late-night hours when UTC date differs from CET date.

---

## RECOMMENDATIONS FOR ADVANCED LLM

### Priority 1: Fix Entry Creation
1. Trace the full `addEntry()` → API → DB flow
2. Add console.log at each step to verify data
3. Simplify API POST logic - remove parseMessage dependency entirely when type/content are provided

### Priority 2: Fix Tomorrow Navigation
1. Clarify intent: should › navigate to actual next calendar day or to "tomorrow's page" where moved tasks live?
2. If allowing future navigation, add a "preview" mode that greys out "not yet arrived"

### Priority 3: Persist Drag Order
1. Add `order Int @default(0)` field to Entry model
2. Update reorder API to accept new order array
3. Fetch entries ordered by `order` field

### Priority 4: 52-Week Graph Data
1. Either fetch all logs for habits, or
2. Create a separate endpoint that returns all logs within a date range

### Priority 5: Unified Prefix Parsing
1. Create ONE shared parser used by both Web UI and WhatsApp capture
2. Document the prefix system clearly
3. Ensure `.!` means urgency, `!` means idea (not urgency)

---

## File-by-File Summary

| File | Status | Issues |
|------|--------|--------|
| `src/components/TodayView.tsx` | ⚠️ | Swipe/touch conflict, drag only desktop, undo needs original date, no error handling |
| `src/app/api/entries/route.ts` | ⚠️ | Conditional parse logic confusing, date field naming |
| `src/app/api/capture/route.ts` | ⚠️ | Habit duplicate check, parseMessage usage |
| `src/app/api/habits/route.ts` | ⚠️ | Only fetches 7 days of logs |
| `src/app/api/habits/[id]/toggle/route.ts` | ✅ | Looks fine |
| `src/lib/db.ts` | ⚠️ | parseMessage unused regex, UTC date issues |
| `src/components/HabitsView.tsx` | ⚠️ | Two toggle patterns, 52-week needs more data |
| `src/components/JournalView.tsx` | ✅ | Mostly fine |
| `prisma/schema.prisma` | ⚠️ | Missing order field for drag persist |

---

*Report generated: 2026-04-28*
*App: bullet-mvp on port 3001*