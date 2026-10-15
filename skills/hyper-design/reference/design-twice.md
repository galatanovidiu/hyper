# Design twice

Frame the chosen module's constraints, actual callers, dependencies and behavior with a small illustrative sketch. Use [vocabulary](vocabulary.md) and [deepening](deepening.md).

With available authorized subagents, give independent designers the same problem but different constraints: minimize the interface to one to three entry points; maximize useful flexibility without speculative hooks; optimize the most common caller. Add a ports/adapters variant only when the dependencies warrant it. If delegation is unavailable, produce these alternatives sequentially and disclose that limitation.

Each design returns its interface, ordering/invariants/error modes, one usage example, hidden implementation, dependency/adapters strategy and tradeoffs. Require radically different shapes, not renamed methods. Compare depth, locality and seam placement against the same behavior. Recommend one or a justified hybrid; get agreement before implementation.
