# UI prototype

Prefer variants embedded in the actual host page so surrounding layout and data density expose design problems. Use a throwaway route only if no natural host exists. Keep temporary app edits explicitly authorized and recorded; archive their source under the session before cleanup.

Create three structurally different variants by default, at most five. Vary hierarchy, layout and primary interaction, using the project's existing design system. Preserve read-only data access, and use stubs for mutations. Wire a `?variant=` selector with a floating previous/name/next bar, wraparound and keyboard arrows that leave text fields alone. Keep the selector and variants out of production builds.

Show the URL and variants to the human, capture their verdict and why, and preserve runnable source in the session. Rewrite the selected behavior with production verification in a separately authorized implementation; remove only the agreed temporary source changes.
