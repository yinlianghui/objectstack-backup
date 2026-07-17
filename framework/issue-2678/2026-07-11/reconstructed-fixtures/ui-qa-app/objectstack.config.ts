import { defineStack } from '@objectstack/spec';

import { qaApp } from './src/app.js';
import { objectDefinitions } from './src/objects.generated.js';
import { parentSeed } from './src/seed.generated.js';

export default defineStack({
  manifest: {
    id: 'com.objectstack.qa.issue2678',
    namespace: 'qa',
    version: '1.0.0',
    type: 'app',
    name: 'Issue 2678 QA',
    description: 'Reconstructed bulk-write and summary-calculation QA application.',
  },
  requires: ['ui', 'auth'],
  objects: [...objectDefinitions],
  apps: [qaApp],
  data: parentSeed,
});
