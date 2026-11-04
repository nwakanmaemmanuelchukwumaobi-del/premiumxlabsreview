# Upgrade the premiumxlabs audit

## Preserve what works
- Keep both existing audit forms, optional website/social links, private screenshot uploads, phone formatting, website checks, saved submissions and owner inbox.
- Keep the current YCloud `audit_received` / `en` name-only reply unchanged. Send the report link to the prospect by email, as selected.
- Keep existing pages, branding and non-report copy unchanged. The current loading pop-up will show the new report with Summary and Details views.

## Form additions
- Add Products / Services / Both, a main product or service, city and state. For Both, collect the main product and main service separately to avoid guessing.
- Normalize FCT to Abuja. Preserve Industry & location and the existing five optional social platforms.
- Save the new answers separately and include them in owner emails and report generation. Keep old submissions readable.

## Google and competitor checks
- Run five Serper searches with Nigeria selected as the country and ten organic results. Do not add “Nigeria” to query text.
- Products: product + city; product + state; buy + product + state; second product + city; business name.
- Services: service + city; service + company + city; best + service + city; second service + state; business name.
- Both: product + city; buy + product + state; service + city; service + company + state; business name.
- Use homepage evidence to identify a secondary offering; use a variation of the main offering if none is supported.
- Match the client's domain accurately and show its position, or “Not on page 1” only when a search completed successfully.
- Select the top three eligible competitor websites per search, excluding directories, marketplaces, social networks and the client's own domain. Show fewer when fewer qualify.
- Perform one Maps lookup for the client's business. Match name, location and website where available; do not attribute an uncertain match's reviews to the client.
- Reuse the client's mobile PageSpeed check. Run mobile PageSpeed and homepage inspection on the top three competitors from search one only; other competitor speeds remain “Not checked” unless they are those same websites.
- Compare fetched homepage evidence for headline, WhatsApp/call button, quote form and offering-page links. Treat page text as untrusted input; skip blocked pages and never invent why a competitor ranks higher. Describe observed differences, not proven ranking causes.

## Approved scoring
- Google search: average visibility across the four offering searches × 50. Visibility is `(11 − position) / 10` for positions 1–10 and zero when absent from a successful search.
- Website speed: mobile PageSpeed performance fraction × 30.
- Name/rating: name-search visibility × 10, plus verified Google rating ÷ 5 × 10. Review count is displayed but does not change the score.
- Round once at the end. Missing or failed checks are unscored, not negative results; show a provisional earned score out of 100 with the available scoring coverage. Do not extrapolate missing points or present it as complete.
- This new report score does not alter the fictional homepage sample audit.

## Two-page report
**Summary**
- Score and one plain-language sentence, with a clear partial-data label when needed.
- Three concise status tiles: Google search, Website speed, and the manual Instagram/Facebook review note promised within 24 hours.
- Up to three evidence-backed fixes; do not invent findings to fill empty slots.
- “Book a free 15-minute call” using the existing WhatsApp contact.

**Details**
- Four offering-search blocks with result, meaning, top-three competitor/client table, and a short evidence-backed comparison.
- When the client ranks strongly, explain that visibility positively rather than claiming competitors receive all inquiries.
- Show the name-check warning only after a successful business-name search where the client website is absent.
- Show the client's verified Google rating and review count, or an honest unavailable/unconfirmed state.
- Include the social review note and a ranking caveat about location/device variation.
- At the bottom, include the requested Google Ads suggestion without budgets, prices or claims about competitor advertising, then repeat the call button.

## Saving and delivery
- Save the submission before any external checks. Persist report results before showing or sending a link.
- Keep owner emails through the existing Resend helper, with all answers, score, report link and existing private screenshot links. Preserve the existing recipient, sender and reply-to.
- Add a separate prospect report email through Resend, using the same verified sender and a submission-specific duplicate-send guard. Do not change the WhatsApp template.
- A shareable report contains no visitor contact details, screenshots or private storage links. Its unguessable, revocable link grants access only to that report. Exclude report URLs from search engines and the sitemap.
- Serper, PageSpeed, fetching and AI failures still yield a usable partial report. Keep saved data and the report visible on notification failure, and log notification failures privately rather than replacing the report with an error screen.

## Technical approach
- Add browser-safe report types, query generation and scoring helpers; keep Serper, fetching and AI inference in server-only helpers called by the existing audit submission function.
- Use the securely saved `SERPER_API_KEY` only inside server execution. Preserve `PAGESPEED_API_KEY`, `RESEND_API_KEY` and `YCLOUD_API_KEY`.
- Add nullable offering/location/report fields and private cache/report-link storage through additive migrations, with explicit grants and access policies. No anonymous access to submission rows or cache data.
- Cache checks and comparison evidence for 24 hours per normalized website and search context; keep report links and contact data outside shared cache entries. Reuse competitor website checks across reports. Deduplicate simultaneous cache fills to avoid repeated provider usage.
- Reuse public-domain/DNS/redirect checks and response/time limits for every homepage fetch, including competitors.
- Add a tokenized report route with its own title, description, social metadata and `noindex`; initial and refreshed visits both work. Return only a validated, allowlisted report projection.
- Use the supported Lovable AI SDK for new homepage comparison calls and preserve the existing AI pause behavior on terminal denials.

## Verification
- Test exact product/service/both queries, `gl: ng`, ten-result requests, no country word in query text, domain matching and exclusions.
- Test concrete 50/30/20 score values, missing-check coverage, FCT normalization and 24-hour cache expiry/reuse.
- Test save-first sequencing, partial failures, report isolation, invalid/revoked tokens and absence of private data in public responses.
- Test owner/prospect email contents and duplicate-send guards with mocked delivery; preserve name-only YCloud tests.
- Verify both forms and both report views on mobile and desktop, including direct report visits and refreshes.
- Run a live Serper check and confirm its returned results; use mocked WhatsApp delivery so no real WhatsApp test messages are sent. Verify real audit persistence and report readback without emailing an invented prospect address.

## Setup status
`SERPER_API_KEY` has been saved securely. Existing PageSpeed, Resend and YCloud secrets are present. Provider acceptance and report-link email delivery will be reported separately from confirmed mailbox receipt.