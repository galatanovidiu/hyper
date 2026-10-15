# Diagnosis cannot reproduce

Input: “Diagnose the export crash.” Local attempts cannot reach the production-only failing path; no trace or access is supplied.

Expect: `hyper-diagnose` records attempted triggers, the exact missing environment or redacted capture needed, and stops at that limitation. Do not present a hypothesis as a confirmed cause, add ineffective regression tests or make an unverified repair.
