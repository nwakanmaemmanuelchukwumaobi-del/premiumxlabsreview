<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep audit choices and conditional validation in the browser-safe audit-fields module, shared by both forms and the server, so saved answers match the available choices.
- Store multi-select audit answers as arrays with separate Other text fields; normalize hidden ad answers before saving to avoid stale submissions.
- Store new online presence in separate website and platform-specific social fields with independent profile_screenshots paths; retain legacy social_media and normalize online_links only for compatibility so old submissions remain readable.
- Validate profile screenshot signatures and keep uploads private; sign owner email links for seven days and inbox links only after owner authorization, never return image paths or signed links from public submission handlers.
- Pass separate audit details internally to the WhatsApp sender without adding template parameters, preserving the approved name-only message and preventing private screenshot paths from being sent to prospects.
- Normalize audit phones through the shared browser-safe international phone validator so forms, saved records and notifications use the same full number.
- Keep service summaries and expanded scope/audience descriptions together in the shared service catalog; render expanded content on service pages, not the homepage, to preserve its overview.
- Focused local service routes reuse scope and audience from the shared catalog and link to the existing preselected service request form, so claims and enquiries remain consistent.
- Derive sitemap URLs from router inventory with required staticData.sitemap decisions on every route; omit lastmod unless authoritative page-specific dates exist.
- Keep website inspection in server-only helpers, save audit rows before running independent bounded checks, and store results on the same row so external failures cannot lose submissions.
- Run up to four background mobile performance-only checks in parallel, cache per root domain for seven days including unavailable measurements, persist each result, and fetch client homepage separately so partial reports open without starting tests.
- Generate instant breakdowns server-side from an allowlisted fact projection; persist before showing, with deterministic missing/unreachable states and failure-safe submission success.
- Present audit loading and results in a shared accessible report dialog on both forms; derive display-only finding labels without changing saved AI output.
- Use the shared submission-error boundary and friendly client fallback for all public forms so upstream failures never reveal internal configuration to visitors.
- Private audit access uses verified owner roles in a separate role table, enforced by RLS and every server handler; profiles never grant permissions.
- Keep private routes under the authenticated layout and out of sitemap; clear protected query data before signing out.
- Persist AI access pauses in Cloud storage and never retry terminal gateway denials; SDK Responses calls use request-local run IDs and structured streaming output.
- Keep branded share-image metadata in public leaf routes via the shared helper, never the root, so page-specific previews and titles are not overridden.
- Use same-origin variable font assets with swap and a sized WebP logo; keep hero content server-visible and defer report code until form interaction to protect first-screen loading.
- Send audit notifications through the server-only owner-email helper after persistence and checks, using bounded delivery and private screenshot links; upgraded audits retain their visible report on notification failure, while legacy submissions retain friendly email-failure handling.
- Keep competitor exclusions and offering synonyms in one browser-safe configuration, explicitly gate client evidence on a valid website, and keep Google report queries/scoring in browser-safe helpers and provider/AI work server-only; durable context-keyed cache leases avoid duplicate paid calls, and public token routes project only validated report data, never submissions or screenshot paths.
- Cache only successful provider checks for 24 hours and release failed leases; report links are hashed and revocable capabilities, with explicit permanent links for the durable report experience and expiry for legacy links.
- Enqueue report tasks through private database webhook capabilities, claim each once, persist real stage progress and send completion emails server-side; browser polling reads only validated report data; the progress page may send one claim-once kick so jobs still run if the webhook cannot reach the worker.
