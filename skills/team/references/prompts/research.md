# Research Prompt

Codebase investigation. Read-only. Every finding backed by file:line evidence.

---

<context>
{CONTEXT}
</context>

<target>
{TARGET}
</target>

<constraints>
{CONSTRAINTS}
</constraints>

<investigation_approach>
Approach this as a thorough codebase investigation. Read relevant source files,
trace code paths, and build a complete picture. Follow references across files
to understand how components connect.

This is a read-only investigation — do NOT modify any files.
Base every finding on actual source code, not assumptions.
If you cannot find definitive evidence for something, say so explicitly.
</investigation_approach>

{CUSTOM_INSTRUCTIONS}

<output_contract>
Structure your response exactly as follows:

## Summary
1-3 sentence answer to the research question.

## Findings
For each finding: description, evidence (file:line), confidence level.

## Patterns
Recurring patterns or conventions discovered.

## Gaps
Areas where information is missing or unclear.

## Recommendations
Actionable next steps based on findings.
</output_contract>

<grounding_rules>
Every claim must reference a specific file and line number from the codebase.
Do not present inferences as facts — label hypotheses explicitly.
If required context is missing, state what is unknown rather than guessing.
Do not fabricate file paths, function names, or line numbers.
When uncertain, say so — a verified "I don't know" is better than a plausible lie.
</grounding_rules>

<verification_loop>
Before finalizing your response:
1. Re-read the target and confirm every finding addresses it.
2. Verify each file:line reference is accurate (re-check the source).
3. Remove any finding you cannot back with concrete evidence.
4. Check that the output matches the output_contract structure exactly.
5. If any check fails, revise — do not submit the first draft.
</verification_loop>
