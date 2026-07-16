# Issue #2678 Problem One — Reconstructed Revalidation Comparison

- Result: **EXACT MATCH**
- Framework SHA: `98874656ffc50ce1531af52346228ffcdda73fba`
- Compared at: `2026-07-16T16:22:15.144Z`
- Scope: Problem one only (bulk write and summary calculation).
- Provenance: Data source reconstructed from the final report and revalidated; the original temporary fixture no longer exists.

| Check | Expected | Actual | Result |
|---|---:|---:|:---:|
| Framework fixed SHA | `"98874656ffc50ce1531af52346228ffcdda73fba"` | `"98874656ffc50ce1531af52346228ffcdda73fba"` | PASS |
| Harness provenance | `"Data source reconstructed from the final report and revalidated; the original temporary fixture no longer exists."` | `"Data source reconstructed from the final report and revalidated; the original temporary fixture no longer exists."` | PASS |
| Batch size | `200` | `200` | PASS |
| Seed batch write count | `5` | `5` | PASS |
| Seed batch sizes | `[200,200,200,200,200]` | `[200,200,200,200,200]` | PASS |
| Seed single write count | `0` | `0` | PASS |
| Seed loader inserted | `1000` | `1000` | PASS |
| Seed loader errors | `0` | `0` | PASS |
| Seed database row count | `1000` | `1000` | PASS |
| Seed unique external keys | `1000` | `1000` | PASS |
| Seed amount minimum | `1` | `1` | PASS |
| Seed amount maximum | `1000` | `1000` | PASS |
| Seed amount resummed | `500500` | `500500` | PASS |
| Seed active=true | `500` | `500` | PASS |
| Import HTTP status | `200` | `200` | PASS |
| Import total | `1000` | `1000` | PASS |
| Import successful rows | `1000` | `1000` | PASS |
| Import created rows | `1000` | `1000` | PASS |
| Import error rows | `0` | `0` | PASS |
| Import batch count | `5` | `5` | PASS |
| Import batch sizes | `[200,200,200,200,200]` | `[200,200,200,200,200]` | PASS |
| Import single-create count | `0` | `0` | PASS |
| Import database row count | `1000` | `1000` | PASS |
| Import unique external keys | `1000` | `1000` | PASS |
| Import amount minimum | `1` | `1` | PASS |
| Import amount maximum | `1000` | `1000` | PASS |
| Import amount resummed | `500500` | `500500` | PASS |
| Import active=true | `500` | `500` | PASS |
| Single-parent loader inserted | `1000` | `1000` | PASS |
| Single-parent loader errors | `0` | `0` | PASS |
| Single-parent batch sizes | `[200,200,200,200,200]` | `[200,200,200,200,200]` | PASS |
| Single-parent summary recomputes | `5` | `5` | PASS |
| Single-parent summary parent updates | `5` | `5` | PASS |
| Single-parent recompute target | `["parent_single","parent_single","parent_single","parent_single","parent_single"]` | `["parent_single","parent_single","parent_single","parent_single","parent_single"]` | PASS |
| Ten-parent loader inserted | `1000` | `1000` | PASS |
| Ten-parent loader errors | `0` | `0` | PASS |
| Ten-parent batch sizes | `[200,200,200,200,200]` | `[200,200,200,200,200]` | PASS |
| Ten-parent summary recomputes | `50` | `50` | PASS |
| Ten-parent summary parent updates | `50` | `50` | PASS |
| Ten-parent recomputes per parent | `{"parent_01":5,"parent_02":5,"parent_03":5,"parent_04":5,"parent_05":5,"parent_06":5,"parent_07":5,"parent_08":5,"parent_09":5,"parent_10":5}` | `{"parent_01":5,"parent_02":5,"parent_03":5,"parent_04":5,"parent_05":5,"parent_06":5,"parent_07":5,"parent_08":5,"parent_09":5,"parent_10":5}` | PASS |
| parent_single child row count | `1000` | `1000` | PASS |
| parent_single unique child keys | `1000` | `1000` | PASS |
| parent_single child amount sum | `500500` | `500500` | PASS |
| parent_single stored summary | `500500` | `500500` | PASS |
| parent_01 child row count | `100` | `100` | PASS |
| parent_01 unique child keys | `100` | `100` | PASS |
| parent_01 child amount sum | `49600` | `49600` | PASS |
| parent_01 stored summary | `49600` | `49600` | PASS |
| parent_02 child row count | `100` | `100` | PASS |
| parent_02 unique child keys | `100` | `100` | PASS |
| parent_02 child amount sum | `49700` | `49700` | PASS |
| parent_02 stored summary | `49700` | `49700` | PASS |
| parent_03 child row count | `100` | `100` | PASS |
| parent_03 unique child keys | `100` | `100` | PASS |
| parent_03 child amount sum | `49800` | `49800` | PASS |
| parent_03 stored summary | `49800` | `49800` | PASS |
| parent_04 child row count | `100` | `100` | PASS |
| parent_04 unique child keys | `100` | `100` | PASS |
| parent_04 child amount sum | `49900` | `49900` | PASS |
| parent_04 stored summary | `49900` | `49900` | PASS |
| parent_05 child row count | `100` | `100` | PASS |
| parent_05 unique child keys | `100` | `100` | PASS |
| parent_05 child amount sum | `50000` | `50000` | PASS |
| parent_05 stored summary | `50000` | `50000` | PASS |
| parent_06 child row count | `100` | `100` | PASS |
| parent_06 unique child keys | `100` | `100` | PASS |
| parent_06 child amount sum | `50100` | `50100` | PASS |
| parent_06 stored summary | `50100` | `50100` | PASS |
| parent_07 child row count | `100` | `100` | PASS |
| parent_07 unique child keys | `100` | `100` | PASS |
| parent_07 child amount sum | `50200` | `50200` | PASS |
| parent_07 stored summary | `50200` | `50200` | PASS |
| parent_08 child row count | `100` | `100` | PASS |
| parent_08 unique child keys | `100` | `100` | PASS |
| parent_08 child amount sum | `50300` | `50300` | PASS |
| parent_08 stored summary | `50300` | `50300` | PASS |
| parent_09 child row count | `100` | `100` | PASS |
| parent_09 unique child keys | `100` | `100` | PASS |
| parent_09 child amount sum | `50400` | `50400` | PASS |
| parent_09 stored summary | `50400` | `50400` | PASS |
| parent_10 child row count | `100` | `100` | PASS |
| parent_10 unique child keys | `100` | `100` | PASS |
| parent_10 child amount sum | `50500` | `50500` | PASS |
| parent_10 stored summary | `50500` | `50500` | PASS |
| Summary child parent groups | `11` | `11` | PASS |
| Summary parent records | `11` | `11` | PASS |
| Orphan child records | `0` | `0` | PASS |
| SQLite integrity_check | `"ok"` | `"ok"` | PASS |

Problem one remains consistent with the final QA report.
