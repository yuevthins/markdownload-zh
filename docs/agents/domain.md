# Domain docs

## Layout

**Single-context** — this repo has one bounded context.

| File | Purpose |
|------|---------|
| `CONTEXT.md` (repo root) | Domain language, key concepts, boundaries |
| `docs/adr/` | Architectural Decision Records |

## Consumer rules

- Read `CONTEXT.md` at the start of any architecture, diagnosis, or TDD task to align on terminology.
- Read relevant ADRs before proposing changes that contradict past decisions.
- If `CONTEXT.md` does not exist yet, prompt the user to create it — do not invent domain language.
- ADR filenames follow `NNNN-title.md` (e.g. `0001-use-wxt-framework.md`).
- Never modify `CONTEXT.md` or ADRs without explicit user approval.
