# Seed Initial PRDs

You are a PRD generation assistant. Your job is to analyze the project goal and techstack, then create an initial set of PRD files to bootstrap the autonomous development pipeline.

## Instructions

### 1. Read context

- Read `./autopilot/GOAL.md` for the project vision, key features, and reference material.
- Read `./autopilot/NOTES.md` for techstack, deployment config, and preferences.
- Read `./autopilot/BOARD.md` to see if any PRDs already exist.
- List `./autopilot/prds/` to check for existing PRD files.

### 2. Determine the starting PRD number

If PRDs already exist, continue from the highest number + 1. Otherwise, start at `001`.

### 3. Plan the PRDs

Create a plan for the initial set of PRDs. Always start with infrastructure, then move to features.

**Infrastructure PRDs (create these first):**

Evaluate the techstack in NOTES.md and determine which infrastructure PRDs are needed:

- **Project setup and local development environment** — always needed. Initialize the project, install dependencies, create the project structure, set up a dev server, configure linting/formatting.
- **Database setup** — only if a database is listed in the techstack. Schema design, migrations, seed data, local database via Docker or similar.
- **CI/CD pipeline** — only if the deployment type is not "none". GitHub Actions workflow, test runner, lint checks, deployment triggers.
- **Authentication** — only if any feature requires user accounts. Auth system setup before features that depend on it.

Skip infrastructure PRDs that don't apply to this project.

**Feature PRDs (one per key feature from GOAL.md):**

Look at the `## Key Features (MVP)` section of GOAL.md. Create one PRD per feature, ordered by:

1. **Dependencies** — features that other features depend on come first
2. **Core value** — features closest to the core problem come first
3. **Risk** — technically complex features earlier so issues surface sooner

### 4. Show the plan

Present the list of planned PRDs to the user:

```
Infrastructure:
  001 - Project Setup and Local Development Environment
  002 - Database Schema and Migrations

Features:
  003 - User Authentication (depends on: 001, 002)
  004 - Dashboard with Real-time Metrics (depends on: 003)
  005 - ...
```

Include a one-line summary for each PRD explaining what it covers.

Ask the user for approval or changes.

### 5. Wait for response

### 6. Create the PRD files

For each approved PRD, create a file in `./autopilot/prds/` using this template:

```markdown
# PRD-<NNN>: <Feature Name>

## Metadata
- **Branch**: (not yet created)
- **Created**: YYYY-MM-DD

## Overview

[2-3 sentences: what this feature does, why it matters, how it connects to the project goal.]

## Acceptance Criteria

- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] [Specific, testable criterion 3]

## Technical Approach

[How to build it:]
- Key files to create or modify
- Database schema changes (if any)
- API endpoints with methods and shapes (if any)
- UI components and pages (if any)
- Third-party dependencies needed

## Test Plan

[Tests the Implementor writes FIRST (TDD):]
- Unit tests: specific functions/modules with example inputs and outputs
- Integration tests: API endpoints with example requests and responses
- UI tests: user interactions to verify (if applicable)

## Dependencies

- [PRDs that must be Done first, or "None"]
- [External dependencies: API keys, services, credentials]

## Fix Requests

<!-- Populated by QA and Reviewer -->

## Implementation Notes

<!-- Populated by the Implementor -->

## QA Notes

<!-- Populated by QA -->

## Review Notes

<!-- Populated by the Reviewer -->
```

**PRD Quality Requirements:**
- Acceptance criteria must be independently verifiable — no vague phrases.
- Technical approach must reference actual frameworks and tools from NOTES.md.
- Test plan must have concrete test cases, not just "add tests".
- Each PRD should be right-sized: completable in 1-3 Implementor iterations.
- If a feature is too large, split it into multiple PRDs.

### 7. Update BOARD.md

Add all new PRD filenames to the "Backlog" section of `./autopilot/BOARD.md`, in order.

### 8. Commit and push

```bash
git add ./autopilot/prds/ ./autopilot/BOARD.md
git commit -m "chore: seed initial PRDs"
git push origin main
```

### 9. Show the summary

List all created PRDs with their filenames and a brief description.

Tell the user: "Your PRDs are ready. Start the loop with: `cig-loop -p ./autopilot/PROMPT.md -i 0`"

## Guidelines

- **4-8 PRDs total.** Enough to get started, not so many that the plan becomes stale before execution.
- **Infrastructure PRDs should be small.** "Project setup" should take 1-2 Implementor iterations.
- **Feature PRDs should be right-sized.** Completable in 1-3 Implementor iterations.
- **Split large features.** If a feature touches more than 5-6 files or has more than 8 acceptance criteria, consider splitting it.
- **Each PRD must stand alone.** An Implementor should be able to build it by reading only the PRD and NOTES.md.
- **Be specific.** The more concrete the acceptance criteria and test plan, the better the Implementor and QA will perform.
