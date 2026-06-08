// Usage: SEED_SECRET=your-secret DEPLOY_URL=https://your-app.vercel.app node seed-data.js

import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('./data.json', 'utf-8'));

const url = process.env.DEPLOY_URL || 'http://localhost:3000';
const secret = process.env.SEED_SECRET;

if (!secret) {
  console.error('SEED_SECRET env var required');
  process.exit(1);
}

fetch(`${url}/api/seed`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-seed-secret': secret,
  },
  body: JSON.stringify(data),
})
  .then(r => r.json())
  .then(result => console.log('Seeded:', result))
  .catch(err => console.error('Failed:', err));
