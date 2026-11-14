import { questCards, weekCalendar } from "./game-ui.js?v=9";
import { reputationPoints, schoolTeam } from "./game.js";
import { recommendations, verifiedHours } from "./domain.js";
export const escapeHTML = (v = "") => String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const x = escapeHTML;
export function commonNav(role, route) {
  const links = [["community","Quest board"],["explore","Opportunities"],["dashboard","Dashboard"],...(role === "student" ? [["progress","My progress"]] : [])];
  return `<nav class="community-nav" aria-label="Primary"><a class="community-brand" href="#/community"><span class="brand-mark" aria-hidden="true">✳</span> CivicShift<span class="demo-badge">DEMO</span></a><div class="primary-links">${links.map(([id,label])=>`<a href="#/${id}" ${route===id?'aria-current="page"':""}>${label}</a>`).join("")}</div><button class="button assistant-launch" type="button" data-assistant-open><span aria-hidden="true">✧</span> Demo assistant</button></nav>`;
}
export function visibleStories(state, ui, student) {
  const saved = state.savedStories[student.id] || [];
  const matches = recommendations(state,student);
  return state.stories.filter(story => story.status === "published")
    .filter(story => ui.feedTab !== "saved" || saved.includes(story.id))
    .filter(story => !ui.feedCause || ui.feedCause === "all" || story.cause === ui.feedCause)
    .filter(story => !ui.feedSearch || `${story.title} ${story.summary} ${story.locality} ${story.cause} ${story.publisher}`.toLowerCase().includes(ui.feedSearch.toLowerCase()))
    .sort((a,b) => {
      const weight = story => Math.max(0,...matches.filter(i => story.eventIds.includes(i.event.id) && !i.blocked).map(i => i.score));
      return (ui.feedTab === "latest" || ui.feedTab === "saved" ? 0 : weight(b)-weight(a)) || b.date.localeCompare(a.date);
    });
}
const shortDate = value => new Date(value+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
const questSymbols = {
  creek:'<path d="M12 29V12m0 9C3 21 3 10 3 10s9 0 9 11Zm0-5C12 6 24 4 24 4s1 12-12 12ZM4 30h24"/>',
  books:'<path d="M16 9v22M3 6c5-2 9-1 13 3 4-4 8-5 13-3v22c-5-2-9-1-13 3-4-4-8-5-13-3Z"/>',
  food:'<path d="M5 12h22l-2 18H7ZM10 12V8a6 6 0 0 1 12 0v4M11 21h10m-5-5v10"/>',
  tech:'<rect x="3" y="5" width="26" height="19" rx="1"/><path d="M10 30h12m-6-6v6M12 12l-3 3 3 3m8-6 3 3-3 3"/>',
  paws:'<path d="M9 21c-5 7 0 11 7 7 7 4 12 0 7-7l-4-5c-2-2-4-2-6 0Z"/><ellipse cx="5" cy="13" rx="2.5" ry="4"/><ellipse cx="12" cy="6" rx="2.5" ry="4"/><ellipse cx="21" cy="6" rx="2.5" ry="4"/><ellipse cx="28" cy="13" rx="2.5" ry="4"/>',
  wellness:'<path d="M16 29S1 21 3 11c1-7 10-7 13-1 3-6 12-6 13 1 2 10-13 18-13 18ZM10 17h12m-6-6v12"/>'
};
export function feedView(state,ui,student) {
  const stories=visibleStories(state,ui,student), saved=state.savedStories[student.id]||[];
  const matches=recommendations(state,student), hours=verifiedHours(state,student.id), team=schoolTeam(state,student.id);
  const commitments=state.signups.filter(r=>r.studentId===student.id&&["approved","pending","offered"].includes(r.status)).map(r=>({r,e:state.events.find(e=>e.id===r.eventId)})).filter(({r,e})=>e?.status==="active"&&e.shifts.some(sh=>sh.id===r.shiftId&&`${e.date}T${sh.end}`>state.clock)).sort((a,b)=>a.e.date.localeCompare(b.e.date));
  const isStudent=state.role==='student';
  const causes=[...new Set(state.stories.filter(s=>s.status==="published").map(s=>s.cause))];
  return `<section class="board-intro" aria-labelledby="board-title"><div><span class="eyebrow">A LITTLE TIME. A WORLD OF GOOD.</span><h1 id="board-title">Small acts.<br><em>Real impact.</em></h1></div><div class="board-intro-copy"><span class="place-label">CUPERTINO & THE BAY AREA</span><p>Find your next way to help.<br>Choose a community quest and make a little good happen.</p><a class="button button-primary" href="#/explore">Find an opportunity <span aria-hidden="true">↗</span></a></div></section>
    ${isStudent?`<section class="service-strip" aria-label="Your service snapshot"><a href="#/hours"><strong>${hours.toFixed(2)}<small> / ${x(student.requirementGoal)} h</small></strong><span>Verified hours</span></a><a href="#/progress"><strong>${reputationPoints(state,student.id)}<small> pts</small></strong><span>Reputation · reliability & contribution</span></a><a href="#/dashboard"><strong>${commitments.filter(({r})=>r.status==='approved').length}<small> upcoming</small></strong><span>Approved commitments</span></a><a class="strip-profile" href="#/profile"><span>YOUR JOURNEY</span><strong>${x(student.name.split(' ')[0])}<span aria-hidden="true">↗</span></strong><small>Profile & preferences</small></a></section>`:''}
    <section class="quest-board" aria-labelledby="quest-board-heading"><div class="board-heading"><div><span class="eyebrow">THE COMMUNITY BOARD</span><h2 id="quest-board-heading">A quest worth your time.</h2></div><span class="feed-count">${stories.length} ${stories.length===1?'community need':'community needs'}</span></div>
    <div class="feed-toolbar"><div class="feed-tabs" role="group" aria-label="Feed view">${[["for-you","For You"],["latest","Latest"],["saved","Saved"]].map(([id,label])=>`<button type="button" data-feed-tab="${id}" aria-pressed="${(ui.feedTab||"for-you")===id}">${label}${id==="saved"?` <span>${saved.filter(id=>state.stories.some(s=>s.id===id&&s.status==="published")).length}</span>`:""}</button>`).join("")}</div><span class="board-hint">Explore a need. Choose a shift.</span></div>
    <form class="feed-search" data-form="feed-filter"><div class="field"><label for="feed-search">Search quests</label><input id="feed-search" name="search" type="search" value="${x(ui.feedSearch||"")}" placeholder="Search by cause, place, or keyword"></div><div class="field"><label for="feed-cause">Cause</label><select id="feed-cause" name="cause"><option value="all">All causes</option>${causes.map(c=>`<option ${ui.feedCause===c?"selected":""}>${x(c)}</option>`).join("")}</select></div><button class="button button-dark" type="submit">Search</button></form>
    <div class="story-list">${stories.length?stories.map(story=>{
      const linked=story.eventIds.map(id=>state.events.find(e=>e.id===id)).filter(e=>e?.status==="active"&&e.shifts.some(sh=>`${e.date}T${sh.start}`>=state.clock));
      const best=matches.find(i=>story.eventIds.includes(i.event.id)&&!i.blocked);
      const number=String(state.stories.findIndex(s=>s.id===story.id)+1).padStart(2,'0');
      return `<article class="story-card paper-quest" aria-labelledby="title-${story.id}"><div class="quest-paper-head"><span>QUEST NO. ${number}</span><span>${x(story.cause)}</span><button class="story-save" type="button" data-save-story="${story.id}" aria-pressed="${saved.includes(story.id)}" aria-label="${saved.includes(story.id)?'Unsave':'Save'} story: ${x(story.title)}"><svg viewBox="0 0 20 24" aria-hidden="true"><path d="M4 3h12v18l-6-4-6 4Z"/></svg><span>${saved.includes(story.id)?'Saved':'Save'}</span></button></div><div class="quest-paper-content"><div class="quest-illustration" aria-hidden="true"><svg viewBox="0 0 34 36">${questSymbols[story.art]||questSymbols.creek}</svg><span>CIVICSHIFT</span></div><div class="quest-paper-copy"><h3 id="title-${story.id}">${x(story.title)}</h3><p>${x(story.summary)}</p><details class="why-match"><summary>Why this matches you</summary><p>${best?.reasons.length?best.reasons.map(x).join('. ')+'.':'Explore this community need to discover a new cause.'} Based on your saved profile and availability. Review each shift’s requirements.</p></details></div><div class="story-opportunities"><span>AVAILABLE OPPORTUNITIES</span>${linked.length?linked.map(e=>{
        const shifts=e.shifts.filter(sh=>`${e.date}T${sh.start}`>=state.clock),spots=shifts.reduce((n,sh)=>n+Math.max(0,sh.capacity-sh.filled),0);
        return `<a href="#/event/${e.id}"><div><strong>${x(e.title)}</strong><small>${shortDate(e.date)} · ${spots?`${spots} ${spots===1?'spot':'spots'} left`:'Waitlist available'}</small></div><span aria-hidden="true">↗</span></a>`;
      }).join(''):'<p>No upcoming shifts.<br><a href="#/explore">Explore opportunities →</a></p>'}</div></div><footer class="quest-paper-footer"><span>${x(story.publisher)}</span><span>${x(story.locality)} · <time datetime="${story.date}">${shortDate(story.date)}</time> · Fictional story</span></footer></article>`;
    }).join(''):'<div class="card empty"><div><h3>No quests found.</h3><p>Try another search, choose a different cause, or save a quest to revisit it.</p></div></div>'}</div></section>
    ${isStudent?`<section class="board-followup" aria-label="Your next steps"><details class="board-disclosure"><summary><span>Your personal quests<small>Small milestones. A badge for every chapter.</small></span><span aria-hidden="true">+</span></summary><div class="disclosure-content">${questCards(state,student.id)}<a class="text-link" href="#/progress">View progress & point history →</a></div></details><details class="board-disclosure"><summary><span>Your calendar<small>${commitments.length} commitments, applications, or offers</small></span><span aria-hidden="true">+</span></summary><div class="disclosure-content">${commitments.length?commitments.slice(0,3).map(({r,e})=>`<a class="commitment" href="#/event/${e.id}"><time>${shortDate(e.date)}</time><div><strong>${x(e.title)}</strong><span>${x(e.shifts.find(sh=>sh.id===r.shiftId)?.name)} · ${x(r.status)}</span></div><span aria-hidden="true">↗</span></a>`).join(''):'<p>Your first commitment can start with a quest above.</p>'}<a class="text-link" href="#/calendar">Open your calendar →</a>${weekCalendar(state)}</div></details><div class="team-line"><span><strong>${x(team.school)} team</strong><small>${Number(team.hours).toFixed(2)} / ${team.goal} verified hours this week · ${team.members} participating</small></span><a class="text-link" href="#/profile">${team.optedIn?'Team settings':'Join the shared goal'} ↗</a></div></section>`:''}<footer class="board-footer"><span>Fictional community stories · Browser-local demo<br>Demo clock: ${x(state.clock.replace('T',' '))}</span><a href="#/about">About CivicShift ↗</a></footer>`;
}
export function storiesView(state) {
  return `<div class="page-head"><div><span class="eyebrow">Community publishing</span><h1>Make a need visible.</h1><p>Publish or hide fictional demo stories. Hidden stories disappear from every feed, including Saved.</p></div></div><section class="grid grid-2">${state.stories.map(s=>`<article class="card"><span class="tag">${x(s.status)}</span><h2>${x(s.title)}</h2><p>${x(s.publisher)} · ${x(s.locality)}</p><button class="button button-primary" data-story-status="${s.id}" data-status="${s.status==="published"?"hidden":"published"}">${s.status==="published"?"Hide story":"Publish story"}</button></article>`).join("")}</section>`;
}
