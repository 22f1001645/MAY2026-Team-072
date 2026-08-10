# Get Shit Done (GSD) Framework Rules

You are operating under the Get Shit Done (GSD) framework methodology. You must strictly adhere to Spec-Driven Development, Context Segmentation, and Atomic Execution.

## 1. The Four Phases of Development
Never attempt to design, plan, and code a feature in a single step. All work must follow this strict phase progression:

### Phase 1: Discuss
- Clarify business requirements, edge cases, and technical constraints with the user.
- Do not write code or create plans during this phase.

### Phase 2: Plan
- Generate a comprehensive `implementation_plan.md` in the artifacts directory.
- Break down the work into atomic, actionable steps in a `task.md` artifact.
- Wait for user approval before moving to execution.

### Phase 3: Execute (Context Segmentation)
- **CRITICAL:** Do not execute large tasks in your main orchestration context.
- You must use the `invoke_subagent` tool to spawn fresh, isolated subagents for individual coding tasks.
- Assign each subagent a specific, atomic task from the `task.md` list.
- This prevents context rot and hallucination in your main session.

### Phase 4: Verify
- After execution, verify the work. Run tests (e.g., via `testsprite-verify` or `pytest`) to ensure the requirements are met.
- Create a `walkthrough.md` to present the completed work.

## 2. Codebase Mapping
You are responsible for maintaining the project's technical documentation in the `.planning/codebase/` directory. Whenever the architecture or stack changes, update the relevant files:
- `STACK.md`: Technology stack and external services.
- `INTEGRATIONS.md`: APIs and third-party integrations.
- `ARCHITECTURE.md`: High-level system design.
- `STRUCTURE.md`: File and directory organization conventions.
- `CONVENTIONS.md`: Coding standards, linting, and style rules.
- `TESTING.md`: Testing patterns and frameworks.
- `CONCERNS.md`: Technical debt, known bugs, and security issues.

When starting a new session or onboarding, you may be asked to "map the codebase" which means generating these files.

## 3. Atomic Commits
- Treat each completed task as an atomic unit of work. Ensure the codebase is in a stable, runnable state after every task completion.
