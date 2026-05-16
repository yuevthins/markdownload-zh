# Issue tracker

Issues are tracked in **GitHub Issues** on [`yuevthins/markdownload-zh`](https://github.com/yuevthins/markdownload-zh/issues).

## CLI

Use the `gh` CLI for all issue operations:

```bash
# Create an issue
gh issue create --title "..." --body "..." --label "needs-triage"

# List open issues
gh issue list

# Close an issue
gh issue close <number>

# Add a label
gh issue edit <number> --add-label "ready-for-agent"
```

## Conventions

- Every new issue gets the `needs-triage` label until a maintainer evaluates it.
- Issue titles should be concise (<70 chars) and describe the problem or feature, not the solution.
- Use the issue body for reproduction steps, acceptance criteria, or design context.
