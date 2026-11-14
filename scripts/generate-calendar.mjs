import { writeFile } from 'node:fs/promises';
import { publishedOpportunityCalendar } from '../dist/opportunity-feed.js';

const output = new URL('../dist/opportunities.ics', import.meta.url);
await writeFile(output, publishedOpportunityCalendar(), 'utf8');
console.log('Generated dist/opportunities.ics from published fictional demo opportunities.');
