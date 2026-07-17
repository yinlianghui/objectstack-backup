# Hook QA comparison report

- Status: **FAIL**
- Checks: 45/83 passed; 38 failed
- Known record-Hook issue #2922 reproduced: true
- afterInsert persistence/report mismatch observed: true

## Category summary

| Category | Passed | Failed | Total |
|---|---:|---:|---:|
| database | 10 | 7 | 17 |
| exception | 1 | 4 | 5 |
| hook | 6 | 20 | 26 |
| observation | 9 | 0 | 9 |
| order | 2 | 4 | 6 |
| summary | 5 | 0 | 5 |
| write | 12 | 3 | 15 |

## Failed checks

| ID | Category | Expected | Actual |
|---|---|---|---|
| normal.seed.before.calls | hook | `1000` | `5` |
| normal.seed.before.shape | hook | `["record"]` | `["array"]` |
| normal.seed.after.calls | hook | `1000` | `5` |
| normal.seed.after.shape | hook | `["record"]` | `["array"]` |
| normal.seed.db.hook-markers | database | `1000` | `0` |
| normal.import.before.calls | hook | `1000` | `5` |
| normal.import.before.shape | hook | `["record"]` | `["array"]` |
| normal.import.after.calls | hook | `1000` | `5` |
| normal.import.after.shape | hook | `["record"]` | `["array"]` |
| normal.import.db.hook-markers | database | `1000` | `0` |
| normal.single-parent.child-before.calls | hook | `1000` | `5` |
| normal.single-parent.child-before.shape | hook | `["record"]` | `["array"]` |
| normal.single-parent.child-after.calls | hook | `1000` | `5` |
| normal.single-parent.child-after.shape | hook | `["record"]` | `["array"]` |
| normal.single-parent.child-markers | database | `1000` | `0` |
| normal.ten-parents.child-before.calls | hook | `1000` | `5` |
| normal.ten-parents.child-before.shape | hook | `["record"]` | `["array"]` |
| normal.ten-parents.child-after.calls | hook | `1000` | `5` |
| normal.ten-parents.child-after.shape | hook | `["record"]` | `["array"]` |
| normal.ten-parents.child-markers | database | `1000` | `0` |
| normal.seed.record-bulk-order | order | `[{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SEED-0001","SEED-0200"]},{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SEED-0201","SEED-0400"]},{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SEED-0401","SEED-0600"]},{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SEED-0601","SEED-0800"]},{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SEED-0801","SEED-1000"]}]` | `[{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SEED-0001","SEED-0200"]},{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SEED-0201","SEED-0400"]},{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SEED-0401","SEED-0600"]},{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SEED-0601","SEED-0800"]},{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SEED-0801","SEED-1000"]}]` |
| normal.import.record-bulk-order | order | `[{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["IMPORT-0001","IMPORT-0200"]},{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["IMPORT-0201","IMPORT-0400"]},{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["IMPORT-0401","IMPORT-0600"]},{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["IMPORT-0601","IMPORT-0800"]},{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["IMPORT-0801","IMPORT-1000"]}]` | `[{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["IMPORT-0001","IMPORT-0200"]},{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["IMPORT-0201","IMPORT-0400"]},{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["IMPORT-0401","IMPORT-0600"]},{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["IMPORT-0601","IMPORT-0800"]},{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["IMPORT-0801","IMPORT-1000"]}]` |
| normal.single-parent.record-bulk-order | order | `[{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SINGLE-0001","SINGLE-0200"]},{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SINGLE-0201","SINGLE-0400"]},{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SINGLE-0401","SINGLE-0600"]},{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SINGLE-0601","SINGLE-0800"]},{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SINGLE-0801","SINGLE-1000"]}]` | `[{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SINGLE-0001","SINGLE-0200"]},{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SINGLE-0201","SINGLE-0400"]},{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SINGLE-0401","SINGLE-0600"]},{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SINGLE-0601","SINGLE-0800"]},{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["SINGLE-0801","SINGLE-1000"]}]` |
| normal.ten-parents.record-bulk-order | order | `[{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["TEN-0001","TEN-0200"]},{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["TEN-0201","TEN-0400"]},{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["TEN-0401","TEN-0600"]},{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["TEN-0601","TEN-0800"]},{"rows":200,"beforeCount":200,"bulkCount":1,"afterCount":200,"beforeShapes":["record"],"afterShapes":["record"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["TEN-0801","TEN-1000"]}]` | `[{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["TEN-0001","TEN-0200"]},{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["TEN-0201","TEN-0400"]},{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["TEN-0401","TEN-0600"]},{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["TEN-0601","TEN-0800"]},{"rows":200,"beforeCount":1,"bulkCount":1,"afterCount":1,"beforeShapes":["array"],"afterShapes":["array"],"beforeAllBeforeBulk":true,"afterAllAfterBulk":true,"boundary":["TEN-0801","TEN-1000"]}]` |
| before-error.before.calls | hook | `8` | `1` |
| before-error.after.calls | hook | `4` | `1` |
| before-error.before.keys | hook | `["HOOK-BEFORE-01","HOOK-BEFORE-02","HOOK-BEFORE-03","HOOK-BEFORE-01","HOOK-BEFORE-02","HOOK-BEFORE-03","HOOK-BEFORE-04","HOOK-BEFORE-05"]` | `[null]` |
| before-error.after.keys | hook | `["HOOK-BEFORE-01","HOOK-BEFORE-02","HOOK-BEFORE-04","HOOK-BEFORE-05"]` | `[null]` |
| before-error.engine-insert | write | `6` | `1` |
| before-error.driver-bulk-create | write | `0` | `1` |
| before-error.driver-create-attempts | write | `4` | `0` |
| before-error.reported-inserted | exception | `4` | `5` |
| before-error.reported-errored | exception | `1` | `0` |
| before-error.db.rows | database | `4` | `5` |
| before-error.db.hook-markers | database | `4` | `0` |
| before-error.db.rejected-row-persisted | database | `false` | `true` |
| after-error.safety.reported-inserted-equals-persisted | exception | `true` | `false` |
| after-error.safety.reported-errored-rows-absent | exception | `true` | `false` |
