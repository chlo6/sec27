const VIEWS = ['cards', 'calendar', 'map'];
const START_DISTANCE = 12;
const SWIPE_DISTANCE = 64;
const DIRECTION_RATIO = 1.6;
const installations = new WeakMap();
const CONTROL_SELECTOR = 'input, textarea, select, option, button, summary, label, .button, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="slider"], [role="textbox"], [data-opportunity-swipe-ignore], a[download], a[target="_blank"]';

function elementFor(target) {
  return target?.nodeType === 1 ? target : target?.parentElement;
}

function hasOwnScrolling(target, container) {
  const window = container.ownerDocument?.defaultView;
  if (!window?.getComputedStyle) return false;
  for (let element = target; element; element = element.parentElement) {
    const style = window.getComputedStyle(element);
    if ((/(auto|scroll|overlay)/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1) ||
        (/(auto|scroll|overlay)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1)) return true;
    if (element === container) break;
  }
  return false;
}

/**
 * Install once on a stable root; rendered content may be replaced freely.
 * getView returns 'cards', 'calendar', 'map', or null outside Opportunities.
 * navigate receives the next view name. The return value removes all listeners.
 * Wrap gesture content in [data-opportunity-swipe]. Keep native horizontal
 * scrollers outside that wrapper so its touch-action does not constrain them.
 */
export function installOpportunitySwipes({root = document, getView, navigate}) {
  if (installations.has(root)) return installations.get(root);
  if (typeof getView !== 'function' || typeof navigate !== 'function') {
    throw new TypeError('Opportunity swipes require getView and navigate callbacks.');
  }
  const activePointers = new Set();
  const window = root.ownerDocument?.defaultView || root.defaultView;
  let gesture = null;
  let suppressedClick = null;

  function resetGesture() {
    if (!gesture) return;
    const {container, pointerId} = gesture;
    gesture = null;
    container.removeAttribute('data-opportunity-swiping');
    if (container.hasPointerCapture?.(pointerId)) container.releasePointerCapture(pointerId);
  }

  function validGesture() {
    return gesture && root.contains(gesture.container) && getView() === gesture.view;
  }

  function direction(event) {
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    return {dx, horizontal: Math.abs(dx) >= START_DISTANCE && Math.abs(dx) >= Math.abs(dy) * DIRECTION_RATIO,
      moved: Math.max(Math.abs(dx), Math.abs(dy)) >= START_DISTANCE};
  }

  function pointerDown(event) {
    if (!['touch', 'pen', 'mouse'].includes(event.pointerType)) return;
    activePointers.add(event.pointerId);
    // A fresh physical press is intentional; it must not inherit suppression.
    suppressedClick = null;
    if (activePointers.size !== 1 || !event.isPrimary) {
      resetGesture();
      return;
    }
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
    const target = elementFor(event.target);
    const container = target?.closest('[data-opportunity-swipe]');
    const view = getView();
    if (!container || !root.contains(container) || !VIEWS.includes(view) || target.closest(CONTROL_SELECTOR) || hasOwnScrolling(target, container)) return;
    gesture = {pointerId: event.pointerId, container, view, x: event.clientX, y: event.clientY};
  }

  function pointerMove(event) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (!validGesture()) { resetGesture(); return; }
    const movement = direction(event);
    if (!movement.moved) return;
    // Once the movement favors scrolling or a diagonal, never turn it into a
    // view change later in the same gesture.
    if (!movement.horizontal) { resetGesture(); return; }
    gesture.container.setAttribute('data-opportunity-swiping', '');
    if (!gesture.container.hasPointerCapture?.(event.pointerId)) {
      try { gesture.container.setPointerCapture?.(event.pointerId); } catch { /* Pointer already ended. */ }
    }
    event.preventDefault();
  }

  function pointerUp(event) {
    activePointers.delete(event.pointerId);
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (!validGesture()) { resetGesture(); return; }
    const {dx, horizontal} = direction(event);
    const view = gesture.view;
    resetGesture();
    if (!horizontal) return;
    // Suppress a drag's synthetic click even at an end stop or below the
    // navigation threshold, so dragging a linked card never opens its detail.
    suppressedClick = {pointerId: event.pointerId, x: event.clientX, y: event.clientY, expires: Date.now() + 700};
    event.preventDefault();
    if (Math.abs(dx) < SWIPE_DISTANCE) return;
    const next = VIEWS[VIEWS.indexOf(view) + (dx < 0 ? 1 : -1)];
    if (next) navigate(next);
  }

  function pointerCancel(event) {
    activePointers.delete(event.pointerId);
    if (gesture?.pointerId === event.pointerId) resetGesture();
  }

  function click(event) {
    if (!suppressedClick || event.detail === 0) return;
    if (Date.now() > suppressedClick.expires) { suppressedClick = null; return; }
    // Modern clicks carry a pointer id. Coordinates cover legacy MouseEvents,
    // including clicks retargeted after navigation replaces the old content.
    const samePointer = typeof event.pointerId === 'number' && event.pointerId >= 0
      ? event.pointerId === suppressedClick.pointerId
      : Math.abs(event.clientX - suppressedClick.x) <= 32 && Math.abs(event.clientY - suppressedClick.y) <= 32;
    if (!samePointer) return;
    suppressedClick = null;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function dragStart(event) {
    // Native anchor/image dragging would otherwise cancel mouse swipe events.
    if (gesture) event.preventDefault();
  }

  function blur() {
    activePointers.clear();
    suppressedClick = null;
    resetGesture();
  }

  const listeners = {pointerdown: pointerDown, pointermove: pointerMove, pointerup: pointerUp, pointercancel: pointerCancel, click, dragstart: dragStart};
  for (const [type, handler] of Object.entries(listeners)) root.addEventListener(type, handler, {capture: true, passive: false});
  window?.addEventListener('blur', blur);
  const cleanup = () => {
    blur();
    for (const [type, handler] of Object.entries(listeners)) root.removeEventListener(type, handler, true);
    window?.removeEventListener('blur', blur);
    installations.delete(root);
  };
  installations.set(root, cleanup);
  return cleanup;
}
