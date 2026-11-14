import test from 'node:test';
import assert from 'node:assert/strict';
import {seedState} from '../dist/state.js';
import {interpretRequest} from '../dist/assistant.js';

test('assistant explains points, badges, team progress and code limitations without mutations', () => {
  const s=seedState(), before=JSON.stringify(s);
  const points=interpretRequest(s,'How do reputation points work?').text;
  assert.match(points,/0 reputation points/);
  assert.match(points,/10.*2.*3/s);
  assert.match(points,/deducts 5/);
  assert.match(points,/email opens/);
  const badges=interpretRequest(s,'My quests').text;
  assert.match(badges,/First Step/);
  assert.match(badges,/Badges add no reputation/);
  assert.match(interpretRequest(s,'School team').text,/20 verified hours/);
  const attendance=interpretRequest(s,'How do I check in?').text;
  assert.match(attendance,/six-digit/);
  assert.match(attendance,/cannot prove attendance/);
  assert.match(attendance,/cannot generate a code/);
  assert.equal(JSON.stringify(s),before);
});

test('game questions take precedence over generic matching and hours intents', () => {
  const s=seedState();
  assert.match(interpretRequest(s,'Explain reputation for shifts').text,/reputation points/);
  assert.match(interpretRequest(s,'What are my quest goals?').text,/Your quests/);
  assert.match(interpretRequest(s,'How does attendance verification work?').text,/pending hours/);
  assert.match(interpretRequest(s,'Read reminder emails for me').text,/cannot/);
  s.role='organizer';
  assert.match(interpretRequest(s,'Give me reputation points').text,/student account/);
});
