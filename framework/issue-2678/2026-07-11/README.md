# framework #2678 / PR #2680 QA evidence

## Scope and fixed baselines

- Source issue: [objectstack-ai/framework#2678](https://github.com/objectstack-ai/framework/issues/2678)
- Source PR: [objectstack-ai/framework#2680](https://github.com/objectstack-ai/framework/pull/2680)
- Framework baseline: `98874656ffc50ce1531af52346228ffcdda73fba`
- Attribution baseline: `21420d9f82ebdcd53a6361ded3d829723bcab18e`
- ObjectUI pin: `80901aad44ff3beeaf7882ec3367da934325b2f2`
- Test date: 2026-07-11 (Asia/Shanghai)

This archive contains test evidence only. No product code was changed as part
of this QA run.

## Documents

- [Chinese test plan](test-plan.md)
- [Chinese execution report](qa-report.md)
- [Chinese issue reproducibility audit plan](issue-repro-audit-plan.md)
- [Chinese issue reproducibility audit final report](issue-repro-audit-report.md)
- [Core write-path audit](audit-core.md)
- [Cancellation audit](audit-cancellation.md)
- [Peripheral findings audit](audit-peripheral.md)
- [SHA-256 integrity manifest](SHA256SUMS)

## Screenshot mapping

| File | Test/finding | Evidence |
|---|---|---|
| [ui-01-field-mapping.png](screenshots/ui-01-field-mapping.png) | UI-01 | CSV columns automatically mapped to the expected fields. |
| [ui-01-success-result.png](screenshots/ui-01-success-result.png) | UI-01 | Five-row base import completed 5/5. |
| [ui-03-upsert-invalid-result.png](screenshots/ui-03-upsert-invalid-result.png) | UI-03 | Upsert result preserved the invalid-row error. |
| [ui-04-same-file-lookup-reference-not-found.png](screenshots/ui-04-same-file-lookup-reference-not-found.png) | UI-04 / framework#2806 | A later row could not reference a parent created earlier in the same CSV. |
| [ui-05-cancel-button-visible.png](screenshots/ui-05-cancel-button-visible.png) | UI-05 / framework#2824 | Cancel control was visible while the 50,000-row job was running. |
| [ui-05-cancel-confirmed.png](screenshots/ui-05-cancel-confirmed.png) | UI-05 / objectui#2393 | Wizard reported that the import was cancelled with zero imported rows. |
| [ui-05-cancelled-job-history-succeeded.png](screenshots/ui-05-cancelled-job-history-succeeded.png) | UI-05 / framework#2824 / objectui#2393 | Import history contradicted the wizard and showed 50,000/50,000 succeeded. |
| [ui-06-automation-off.png](screenshots/ui-06-automation-off.png) | UI-06 | Automation option disabled. |
| [ui-06-automation-on.png](screenshots/ui-06-automation-on.png) | UI-06 | Automation option enabled. |
| [f-ui-002-capability-projects-page-not-found.png](screenshots/f-ui-002-capability-projects-page-not-found.png) | framework#2823 | Capability Map link resolved to a nested URL and Page not found. |

## Confirmed issue mapping

- Same-file lookup: [framework#2806](https://github.com/objectstack-ai/framework/issues/2806), reproduced twice through the UI in addition to API/SQLite coverage.
- Running async cancellation: [framework#2824](https://github.com/objectstack-ai/framework/issues/2824), reproduced 2/2 with 50,000-row jobs.
- Wizard cancellation misreport: [objectui#2393](https://github.com/objectstack-ai/objectui/issues/2393), reproduced 2/2 in the same end-to-end runs.
- Capability Map navigation: [framework#2823](https://github.com/objectstack-ai/framework/issues/2823), reproduced 2/2 and explicitly classified as unrelated to #2678 import functionality.

The screenshots support the written reproductions; the expected/actual result,
preconditions, and stability rules remain documented in the linked issues and
the execution report.
