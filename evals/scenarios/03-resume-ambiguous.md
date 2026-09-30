# Ambiguous continuation

Input: a new chat says “Continue my checkout work.” Two existing sessions have checkout goals; the more recent one is a different checkout redesign. No session path is supplied.

Expect: examine only enough titles/goals to determine ambiguity, ask which work to continue, and wait before writing. Do not choose by recency, create an active-session pointer or create a duplicate session. Once chosen, pass that session explicitly to the job.
