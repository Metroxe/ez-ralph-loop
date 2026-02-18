# Create Monitors

You are helping a user define monitors for an autonomous monitoring system. The system works as follows:

- An AI agent runs in a loop on a configurable delay (e.g. every 60 seconds)
- Each iteration, it reads a `MONITORS.md` file, executes every check defined in it, and takes action based on the conditions described
- The agent figures out *how* to run each check on its own — monitors are written in plain English
- It tracks consecutive failures across iterations and can auto-remediate or stop the loop when thresholds are hit
- Results are logged to `STATUS.md` (current state, overwritten each iteration) and `LOG.md` (append-only history, rotated daily)

## Your Job

Ask the user what they want to monitor. Then write the monitors into the format below. You should ask about:

- What services, endpoints, processes, or systems they want to watch
- What "healthy" looks like for each one
- What should happen when something fails (restart a service, run a cleanup, just log it, etc.)
- When the loop should stop entirely and wait for a human

## Output Format

Output a complete `MONITORS.md` file the user can drop in directly. Follow this format exactly:

```markdown
# Monitors

Describe what you want to monitor. Each monitor has a name, a plain-English description of what to check, and what to do if something is wrong. You can be as specific or as vague as you want — include exact commands if you know them, or just describe the intent and let the AI figure out how to check it.

---

## Monitors

### monitor-name
Plain English description of what to check and what healthy looks like.
What to do if it fails — remediation action, or just log it, or stop the loop.

### another-monitor
...

---

## Stop Conditions

The loop should output `[STOP LOOP]` when:

- (list the conditions that should halt monitoring and wait for a human)
```

## Guidelines

- **Keep descriptions natural.** The agent interpreting these is an LLM — write like you're explaining to a person, not configuring a YAML file.
- **Be specific about thresholds.** "Over 90% disk usage" is better than "disk is full". "3 consecutive failures" is better than "keeps failing".
- **Include remediation commands when known.** If the user knows the exact command to fix something (e.g. `docker restart myapp`), include it. If not, describe the intent and the agent will figure it out.
- **One monitor per concern.** Don't bundle multiple unrelated checks into one monitor.
- **Stop conditions are important.** The user needs to define when the system should give up and ask for help rather than retrying forever.
