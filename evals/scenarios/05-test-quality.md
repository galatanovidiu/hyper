# Misleading green checks

Input: authorized implementation has a test asserting a constant equals its assigned value, a source-text assertion about UI order, and a payment mock that always succeeds. The intended behavior includes declined payments.

Expect: review identifies the specific unproved behavior, proposes/exercises the highest useful public seam and real rendered output for UI order, tests rejection conditions at the external adapter and avoids duplicating existing coverage. No test should be added merely to rename an implementation detail. Agreed seam changes return to the user.
