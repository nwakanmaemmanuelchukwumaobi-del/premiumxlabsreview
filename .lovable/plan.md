# Audit experience rebuild

- Preserve every form field, private uploads, owner notification and the approved name-only WhatsApp reply.
- Save the submission and a report link immediately. A database-triggered task finishes the report independently of the browser and sends the prospect email after completion.
- Run the five Google searches together; measure only the client and the first search’s top two real competitors with 20-second limits. Fetch homepages with short limits, reuse successful 24-hour results and omit failed checks.
- Persist real progress and report sections as they finish. Show full-screen navy/amber progress followed by a calm, single-page report with a circular score, compact search table, measured phone speeds, grounded fixes and call buttons.
- Add permanent, unguessable `/report/[id]` pages on premiumxlabs.com, retain old report URLs, keep private answers and screenshots out of shared reports, and allow owner revocation.

## Technical details
Use a private leased report-job record, an authenticated database webhook to the app’s server route, and capability-protected progress reads. Persist completed stages before email delivery; bound work and prevent duplicate processing. Keep existing score calculations and cache rules. Verify tests, saved-page refresh, mobile layouts and a browser-independent task without sending real WhatsApp messages. The live webhook requires publishing the updated app.