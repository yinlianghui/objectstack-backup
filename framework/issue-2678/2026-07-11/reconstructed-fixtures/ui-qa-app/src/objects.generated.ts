// GENERATED from ../../source/object-definitions.ts by scripts/build-artifacts.mjs.
// Current protocol normalization: disabled tenancy explicitly uses strategy "shared".
// Do not edit this copy by hand.

export const objectDefinitions = [
  {
    name: "qa_seed_item",
    label: "QA Seed Item",
    systemFields: false,
    tenancy: { enabled: false, strategy: "shared" },
    fields: {
      external_key: { type: "text", label: "External Key", unique: true, required: true },
      name: { type: "text", label: "Name", required: true },
      amount: { type: "number", label: "Amount", required: true },
      active: { type: "boolean", label: "Active", required: true },
    },
  },
  {
    name: "qa_import_item",
    label: "QA Import Item",
    systemFields: false,
    tenancy: { enabled: false, strategy: "shared" },
    fields: {
      external_key: { type: "text", label: "External Key", unique: true, required: true },
      name: { type: "text", label: "Name", required: true },
      amount: { type: "number", label: "Amount", required: true },
      active: { type: "boolean", label: "Active", required: true },
    },
  },
  {
    name: "qa_summary_parent",
    label: "QA Summary Parent",
    systemFields: false,
    tenancy: { enabled: false, strategy: "shared" },
    fields: {
      name: { type: "text", label: "Name", unique: true, required: true },
      total_amount: {
        type: "summary",
        label: "Total Amount",
        summaryOperations: {
          object: "qa_summary_child",
          field: "amount",
          function: "sum",
          relationshipField: "parent_id",
        },
      },
    },
  },
  {
    name: "qa_summary_child",
    label: "QA Summary Child",
    systemFields: false,
    tenancy: { enabled: false, strategy: "shared" },
    fields: {
      external_key: { type: "text", label: "External Key", unique: true, required: true },
      name: { type: "text", label: "Name", required: true },
      parent_id: {
        type: "master_detail",
        label: "Parent",
        reference: "qa_summary_parent",
        required: true,
      },
      amount: { type: "number", label: "Amount", required: true },
    },
  },
] as const;
