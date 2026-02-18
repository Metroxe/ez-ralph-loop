# Monitors

Describe what you want to monitor. Each monitor has a name, a plain-English description of what to check, and what to do if something is wrong. You can be as specific or as vague as you want — include exact commands if you know them, or just describe the intent and let the AI figure out how to check it.

---

## Monitors

> Delete these examples and add your own.

### website-health
Check that https://example.com is up and responding within a reasonable time. It should return a 200 status code.
If it fails 3 times in a row, stop the loop with a summary of the failures.

### app-container
Make sure the docker container called "myapp" is running and healthy. If it's in a restart loop or exited, that's a failure.
If it's down, run `docker restart myapp`.

### app-errors
Look at /var/log/app.log and check if there are any new ERROR-level lines since the last check. A few warnings are fine, but errors are not.
If there are more than 10 new errors, stop the loop and summarize what's happening.

### disk-usage
Check if the root partition is getting full. Anything over 90% usage is a problem.
If it's over 90%, run `docker system prune -f` and log a warning.

### worker-process
There should be a process called "my-worker-process" running. If it's not found, it crashed.
If it's not running, run `systemctl restart my-worker`.

### api-response
Hit the endpoint GET http://localhost:3000/api/health and make sure the JSON response has `"status": "ok"` in it. Also note the response time — anything over 2 seconds is slow.
If the response is not ok, just log a warning — no action needed.

---

## Stop Conditions

The loop should output `[STOP LOOP]` when:

- Any monitor reaches the consecutive failure threshold defined above
- A remediation action fails (e.g. restart command returns non-zero exit code)
- You encounter a situation not covered by the monitors above that requires human attention
