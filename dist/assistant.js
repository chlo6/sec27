import { actorFor, recommendations, verifiedHours, commitmentConflicts } from "./domain.js";
import { escapeHTML as x } from "./community.js";

export function interpretRequest(state, input) {
  const text = input.toLowerCase().trim(), user = actorFor(state);
  if (user?.role !== "student") return {text:"Matching and registration tools use the student account. Switch to Student Volunteer to try them. Organizers and admins can use Approvals and the roster to manage service."};
  const matches = recommendations(state,user);
  if (/\b(hours?|goal|remaining)\b/.test(text)) {
    const hours=verifiedHours(state,user.id), pending=state.hours.filter(h=>h.studentId===user.id&&h.status==="pending").reduce((n,h)=>n+Number(h.hours),0);
    return {text:`You have ${hours.toFixed(2)} verified hours toward your ${user.requirementGoal}-hour goal. ${Math.max(0,user.requirementGoal-hours).toFixed(2)} hours remain. ${pending.toFixed(2)} pending hours are excluded until verification.`};
  }
  if (/\b(cancel|withdraw|leave)\b/.test(text)) {
    const registrations=state.signups.filter(r=>r.studentId===user.id&&["approved","pending","waitlist","offered"].includes(r.status));
    return {text:registrations.length?"Choose a registration to review a cancellation. Nothing changes until you confirm.":"You have no cancelable registrations.", registrations};
  }
  if (/\b(conflict|conflicts|overlap|overlaps)\b/.test(text)) {
    const existing=commitmentConflicts(state,user.id);
    if(existing.length) return {text:`Your existing commitments conflict: ${existing.join(". ")}. Review the changed event details or ask to cancel a signup.`};
    const blocked=matches.filter(m=>m.blocked.includes("overlaps"));
    return {text:blocked.length?"These shifts overlap your current commitments. Touching end and start times are allowed. Pending and offered registrations also count as commitments.":"I found no overlapping new shifts in the upcoming demo records. New signups and approvals are checked again when they happen.", matches:blocked.slice(0,4)};
  }
  if (/\b(why|explain|recommend|recommendations|match|matches|find|shifts?|volunteer|signup|join)\b|sign\s*up/.test(text)) {
    const keyword=text.includes("saturday")?"saturday":text.includes("sunday")?"sunday":null;
    const eligible=matches.filter(m=>!m.blocked && (!keyword || new Date(m.event.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long"}).toLowerCase()===keyword));
    return {text:eligible.length?"Here are eligible shifts, ordered by interests, location, and saved availability. Reasons explain the order; there are no confidence scores. Review a signup before confirming.":"No eligible shifts matched. Check your profile, demo consent, calendar availability, or existing commitments.", matches:eligible.slice(0,4)};
  }
  return {text:"I support finding shifts, explaining matches, checking conflicts, showing remaining hours, and proposing signup or cancellation. Try “Find Saturday shifts” or “How many hours remain?” I use scripted rules over local demo data; I cannot browse news, contact anyone, or monitor in the background."};
}

export function installAssistant({getState, runAction}) {
  const drawer=document.createElement("dialog");
  drawer.className="assistant-drawer"; drawer.setAttribute("aria-labelledby","assistant-title");
  drawer.innerHTML=`<header><div><span class="eyebrow">A LITTLE GUIDANCE</span><h2 id="assistant-title">✦ Demo assistant</h2></div><button class="icon-button" type="button" data-close-assistant aria-label="Close demo assistant">×</button></header><p class="assistant-disclosure">Scripted tools · Local demo data · No live AI or background monitoring.</p><div class="assistant-log" role="log" aria-label="Conversation" aria-live="polite"></div><div class="assistant-suggestions">${["Find shifts","Explain matches","Check conflicts","Hours remaining","Cancel a signup"].map(p=>`<button type="button" data-prompt="${p}">${p}</button>`).join("")}</div><form class="assistant-input"><label for="assistant-input">Ask about your service</label><div><input id="assistant-input" autocomplete="off" maxlength="300" placeholder="Find Saturday shifts…" required><button class="button button-primary" type="submit">Send</button></div></form>`;
  document.body.append(drawer);
  const log=drawer.querySelector(".assistant-log"), input=drawer.querySelector("input");
  let proposal=null, opener=null, persona=null;
  const append=(html, mine=false)=>{const node=document.createElement("section");node.className=`assistant-message ${mine?"from-you":""}`;node.innerHTML=html;log.append(node);node.scrollIntoView({block:"nearest"});};
  const welcome=()=>append("<p>I can help turn interest into a next step. Try a prompt below. You stay in control of every registration change.</p>");
  welcome();
  function answer(text) {
    proposal=null; log.querySelectorAll("[data-confirm-proposal]").forEach(b=>b.disabled=true);
    append(`<strong>You</strong><p>${x(text)}</p>`,true);
    const response=interpretRequest(getState(),text);
    append(`<p>${x(response.text)}</p>${(response.matches||[]).map(m=>`<article class="assistant-match"><a href="#/event/${m.event.id}" data-assistant-link><strong>${x(m.event.title)}</strong></a><span>${x(m.event.date)} · ${x(m.shift.name)} · ${m.shift.start}–${m.shift.end}</span><p>${m.reasons.map(x).join(". ")||"Explore a new community need."}</p>${m.blocked?`<p>${x(m.blocked)}</p>`:`<button class="button button-light" type="button" data-propose-signup="${m.event.id}" data-shift="${m.shift.id}">${m.full?"Review waitlist request":"Review signup"}</button>`}</article>`).join("")}${(response.registrations||[]).map(r=>`<button class="button button-light cancel-choice" type="button" data-propose-cancel="${r.id}">Review cancellation: ${x(getState().events.find(e=>e.id===r.eventId)?.title)} · ${x(getState().events.find(e=>e.id===r.eventId)?.shifts.find(s=>s.id===r.shiftId)?.name)}</button>`).join("")}`);
    input.value=""; input.focus();
  }
  document.addEventListener("click",event=>{
    if (!event.target.closest("[data-assistant-open]")) return;
    opener=event.target.closest("button");
    const next=actorFor(getState())?.id;
    if (persona!==next) {log.replaceChildren();proposal=null;welcome();persona=next;}
    drawer.showModal();input.focus();
  });
  drawer.addEventListener("close",()=>{proposal=null;(opener?.isConnected ? opener : document.querySelector("[data-assistant-open]"))?.focus();});
  drawer.addEventListener("keydown",event=>{
    if(event.key!=="Tab")return;
    const controls=[...drawer.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),[tabindex="0"]')].filter(node=>node.getClientRects().length);
    const first=controls[0],last=controls.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  drawer.addEventListener("click",event=>{
    const button=event.target.closest("button,a");if(!button)return;
    if(button.hasAttribute("data-close-assistant")||button.hasAttribute("data-assistant-link")){drawer.close();return;}
    if(button.dataset.prompt){answer(button.dataset.prompt);return;}
    if(button.dataset.proposeSignup||button.dataset.proposeCancel){
      const state=getState(),actor=actorFor(state);
      let copy;
      if(button.dataset.proposeSignup){
        const e=state.events.find(e=>e.id===button.dataset.proposeSignup),sh=e?.shifts.find(s=>s.id===button.dataset.shift);
        if(!sh)return;
        const expectedStatus=sh.filled>=sh.capacity?"waitlist":e.approvalMode==="automatic"?"approved":"pending";
        proposal={type:"signup",eventId:e.id,shiftId:sh.id,expectedStatus,actorId:actor.id};
        copy=`${e.title} · ${sh.name} · ${e.date}, ${sh.start}–${sh.end}. This will create a ${expectedStatus} registration. Confirm only if you want to proceed.`;
      }else{
        const r=state.signups.find(r=>r.id===button.dataset.proposeCancel);
        if(!r)return;
        proposal={type:"cancel-registration",signupId:r.id,actorId:actor.id};
        copy="Cancel this registration? An available spot may be offered to another volunteer. This action is recorded in demo activity history.";
      }
      log.querySelectorAll("[data-confirm-proposal]").forEach(b=>b.disabled=true);
      append(`<h3>Review this action</h3><p>${x(copy)}</p><div class="dialog-actions"><button class="button button-light" type="button" data-dismiss-proposal>Keep as is</button><button class="button button-primary" type="button" data-confirm-proposal>Confirm ${proposal.type==="signup"?"signup":"cancellation"}</button></div>`);
      log.lastElementChild.querySelector("button").focus();
    }
    if(button.hasAttribute("data-dismiss-proposal")){proposal=null;button.parentElement.querySelectorAll("button").forEach(b=>b.disabled=true);append("<p>Proposal dismissed. Your registrations are unchanged.</p>");input.focus();}
    if(button.hasAttribute("data-confirm-proposal")&&proposal){
      button.parentElement.querySelectorAll("button").forEach(b=>b.disabled=true);const request=proposal;proposal=null;
      const result=runAction(request);
      append(`<strong>${result.ok?"Action completed":"Action not completed"}</strong><p>${x(result.message)}</p>`);input.focus();
    }
  });
  drawer.querySelector("form").addEventListener("submit",event=>{event.preventDefault();if(input.value.trim())answer(input.value.trim());});
}
