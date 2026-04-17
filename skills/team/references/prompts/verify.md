# Verify Prompt

Fact-check a claim against source code. Read-only. Output a verdict with
evidence.

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

<verification_approach>
Approach this as a fact-checker. Read the relevant source code and determine
whether the claim is accurate.

This is a read-only investigation — do NOT modify any files.
Check the actual code, not documentation (docs may be outdated).
Consider edge cases and conditional behavior that might make the claim
partially true.
If the claim involves runtime behavior that cannot be verified from source
alone, say so.
</verification_approach>

{CUSTOM_INSTRUCTIONS}

<output_contract>
Structure your response exactly as follows:

## Verdict
One of: CONFIRMED | PARTIALLY TRUE | INCORRECT | CANNOT VERIFY

## Evidence
For each piece of evidence: file:line, what it shows, how it supports the verdict.

## Explanation
How the evidence leads to the verdict. Address nuances.

## Caveats
Limitations of the verification. What could change the verdict.
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
