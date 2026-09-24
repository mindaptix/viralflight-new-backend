import test from 'node:test';
import assert from 'node:assert/strict';
import { communityRecommendationScore as score } from '../src/application/community/categoryRecommendations.js';

test('motherhood and doctor categories match parenting and healthcare communities', () => {
  const profile = { contentCategories: ['Lifestyle', 'Doctor', 'Motherhood'], profileType: 'regional', city: 'Pune' };
  assert.ok(score({ category: 'Parenting', tags: [] }, profile) > score({ category: 'Gaming' }, profile));
  assert.ok(score({ category: 'Healthcare' }, profile) > 0);
  assert.ok(score({ category: 'Lifestyle', city: 'Pune' }, profile) > score({ category: 'Lifestyle', city: 'Mumbai' }, profile));
  assert.equal(score({ category: 'Gaming' }, null), 0);
});
