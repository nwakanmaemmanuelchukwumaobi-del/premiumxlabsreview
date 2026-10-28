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
- Store online presence as platform-labeled JSON entries with separate link and optional custom platform name; collect only selected fields so deselected links never reach storage.
- Keep service summaries and expanded scope/audience descriptions together in the shared service catalog; render expanded content on service pages, not the homepage, to preserve its overview.
- Focused local service routes reuse scope and audience from the shared catalog and link to the existing preselected service request form, so claims and enquiries remain consistent.
- Derive sitemap URLs from router inventory with required staticData.sitemap decisions on every route; omit lastmod unless authoritative page-specific dates exist.
- Keep website inspection in server-only helpers, save audit rows before running independent bounded checks, and store results on the same row so external failures cannot lose submissions.
- Generate instant breakdowns server-side from an allowlisted fact projection; persist before showing, with deterministic missing/unreachable states and failure-safe submission success.
- Private audit access uses verified owner roles in a separate role table, enforced by RLS and every server handler; profiles never grant permissions.
- Keep private routes under the authenticated layout and out of sitemap; clear protected query data before signing out.
- Persist AI access pauses in Cloud storage and never retry terminal gateway denials; SDK Responses calls use request-local run IDs and structured streaming output.
