# Skill Creator (Self-Generating Agent Skill)

**Description:** An agent skill that allows the system to analyze user requests, domain contexts, and project requirements to automatically generate new specialized skills.

## Core Capabilities

1. **Domain Analysis**: When asked to create a CAD-specific skill, this skill analyzes the existing codebase (Three.js, DxfParser, etc.) to extract domain-specific terminology.
2. **Skill Drafting**: It generates a structured markdown file (`SKILL-[name].md`) following the exact OpenCode skill template.
3. **Integration**: It writes the new skill file directly to the `/SKILL/` directory so it becomes immediately available via `task(load_skills=['new-skill-name'])`.

## How to use this skill

When the user asks you to "create a new skill for X":
1. Use `read` to check existing code related to X (e.g., `services/dxfService.ts` for CAD).
2. Generate a comprehensive prompt/knowledge base document.
3. Save it to `SKILL/SKILL-[name].md` where `[name]` is the requested domain.

## Template for new skills

```markdown
# [Skill Name]

**Description:** [Brief description of what this skill does]

## Domain Knowledge
- Concept 1: Definition
- Concept 2: Definition

## Best Practices
- Rule 1
- Rule 2

## Common Tools/Functions
- `tool_name`: When to use it
```
