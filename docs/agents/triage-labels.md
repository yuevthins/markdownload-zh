# Triage labels

The `triage` skill moves issues through these states by applying labels:

| Role | Label | Meaning |
|------|-------|---------|
| Needs evaluation | `needs-triage` | Maintainer needs to look at this |
| Waiting on reporter | `needs-info` | Blocked until the reporter provides more detail |
| AFK-ready | `ready-for-agent` | Fully specified; an agent can implement without human context |
| Human-required | `ready-for-human` | Needs human judgement or implementation |
| Won't fix | `wontfix` | Will not be actioned |

## Rules

- An issue has exactly **one** triage label at a time.
- When moving between states, remove the old label before adding the new one.
- `ready-for-agent` issues must have clear acceptance criteria in the body.
