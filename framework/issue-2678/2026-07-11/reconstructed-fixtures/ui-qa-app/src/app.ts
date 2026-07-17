export const qaApp = {
  name: 'qa_issue_2678_app',
  label: 'Issue 2678 QA',
  icon: 'flask-conical',
  navigation: [
    {
      id: 'qa_data',
      type: 'group',
      label: 'QA Data',
      icon: 'database',
      children: [
        {
          id: 'qa_import_items',
          type: 'object',
          objectName: 'qa_import_item',
          label: 'Import Items',
        },
        {
          id: 'qa_summary_parents',
          type: 'object',
          objectName: 'qa_summary_parent',
          label: 'Summary Parents',
        },
        {
          id: 'qa_summary_children',
          type: 'object',
          objectName: 'qa_summary_child',
          label: 'Summary Children',
        },
      ],
    },
  ],
} as const;
