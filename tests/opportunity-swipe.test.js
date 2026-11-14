import test from 'node:test';
import assert from 'node:assert/strict';
import {installOpportunitySwipes} from '../dist/opportunity-swipe.js';

// A small DOM stand-in exercises the real delegated event handlers without a
// browser dependency. Only the DOM operations used by this module are modeled.
class Element {
  constructor(tag = 'div', parent = null, attrs = {}) {
    this.nodeType = 1;
    this.tag = tag;
    this.parentElement = parent;
    this.attrs = {...attrs};
    this.ownerDocument = parent?.ownerDocument;
    this.style = {overflowX: 'visible', overflowY: 'visible'};
    this.clientWidth = this.scrollWidth = this.clientHeight = this.scrollHeight = 100;
    this.capture = null;
  }
  matches(selector) {
    return selector.split(',').some(part => {
      part = part.trim();
      if (part === '[contenteditable]:not([contenteditable="false"])') return 'contenteditable' in this.attrs && this.attrs.contenteditable !== 'false';
      if (part === '.button') return (this.attrs.class || '').split(' ').includes('button');
      const match = part.match(/^(\w+)?(?:\[([\w-]+)(?:="([^"]*)")?\])?$/);
      return !!match && (!match[1] || this.tag === match[1]) && (!match[2] || match[2] in this.attrs && (match[3] === undefined || this.attrs[match[2]] === match[3]));
    });
  }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector); }
  contains(element) { return element === this || !!element?.parentElement && this.contains(element.parentElement); }
  setAttribute(name, value) { this.attrs[name] = value; }
  removeAttribute(name) { delete this.attrs[name]; }
  hasPointerCapture(id) { return this.capture === id; }
  setPointerCapture(id) { this.capture = id; }
  releasePointerCapture() { this.capture = null; }
}

class Root extends Element {
  constructor() {
    super('document');
    this.listeners = new Map();
    this.ownerDocument = this;
    this.defaultView = {getComputedStyle: element => element.style, addEventListener() {}, removeEventListener() {}};
  }
  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || new Set();
    handlers.add(handler);
    this.listeners.set(type, handlers);
  }
  removeEventListener(type, handler) { this.listeners.get(type)?.delete(handler); }
  fire(type, props = {}) {
    const event = {target: this, pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0,
      clientX: 200, clientY: 200, detail: 1, defaultPrevented: false, stopped: false,
      preventDefault() { this.defaultPrevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...props};
    for (const handler of this.listeners.get(type) || []) {
      handler(event);
      if (event.stopped) break;
    }
    return event;
  }
}

function fixture(view = 'cards') {
  const root = new Root();
  const container = new Element('section', root, {'data-opportunity-swipe': ''});
  const card = new Element('a', container, {href: '#/event/test'});
  const navigated = [];
  const options = {root, getView: () => view, navigate: next => {navigated.push(next); view = next;}};
  const cleanup = installOpportunitySwipes(options);
  const fire = (type, props) => root.fire(type, {target: card, ...props});
  const swipe = (dx, dy = 0, props = {}) => {
    fire('pointerdown', props);
    const moved = fire('pointermove', {clientX: 200 + dx, clientY: 200 + dy, ...props});
    const ended = fire('pointerup', {clientX: 200 + dx, clientY: 200 + dy, ...props});
    return {moved, ended};
  };
  return {root, container, card, fire, swipe, navigated, cleanup, options, setView: next => {view = next;}};
}

test('left advances Cards → Calendar → Map and right reverses, without wrapping', () => {
  const f = fixture();
  f.swipe(100);
  assert.deepEqual(f.navigated, []);
  f.swipe(-100);
  f.swipe(-100);
  f.swipe(-100);
  assert.deepEqual(f.navigated, ['calendar', 'map']);
  f.swipe(100);
  f.swipe(100);
  f.swipe(100);
  assert.deepEqual(f.navigated, ['calendar', 'map', 'calendar', 'cards']);
});

test('navigation requires 64 pixels and a clear horizontal direction', () => {
  const f = fixture();
  f.swipe(-63);
  f.swipe(-100, 70);
  f.swipe(-50, 120);
  assert.deepEqual(f.navigated, []);
  f.swipe(-64, 10);
  assert.deepEqual(f.navigated, ['calendar']);
});

test('vertical scrolling and diagonal gestures remain native and never become swipes later', () => {
  const f = fixture();
  f.fire('pointerdown');
  assert.equal(f.fire('pointermove', {clientX: 204, clientY: 230}).defaultPrevented, false);
  f.fire('pointermove', {clientX: 60, clientY: 235});
  f.fire('pointerup', {clientX: 40, clientY: 235});
  assert.deepEqual(f.navigated, []);
  assert.equal('data-opportunity-swiping' in f.container.attrs, false);
});

test('pointer cancellation and multi-touch cancel navigation, while a later gesture works', () => {
  const f = fixture();
  f.fire('pointerdown');
  f.fire('pointermove', {clientX: 100});
  f.fire('pointercancel');
  f.fire('pointerup', {clientX: 50});
  assert.equal(f.container.capture, null);
  f.fire('pointerdown');
  f.fire('pointerdown', {pointerId: 2, isPrimary: false, target: f.root});
  f.fire('pointermove', {clientX: 50});
  f.fire('pointerup', {clientX: 50});
  f.fire('pointerup', {pointerId: 2, isPrimary: false});
  assert.deepEqual(f.navigated, []);
  f.swipe(-90, 0, {pointerType: 'pen'});
  assert.deepEqual(f.navigated, ['calendar']);
});

test('linked-card swipes suppress one pointer click but preserve keyboard and later intentional clicks', () => {
  const f = fixture();
  f.swipe(-100);
  const keyboard = f.fire('click', {detail: 0, clientX: 100});
  assert.equal(keyboard.defaultPrevented, false);
  const unrelated = f.fire('click', {pointerId: 9, clientX: 100});
  assert.equal(unrelated.defaultPrevented, false);
  const click = f.fire('click', {clientX: 100});
  assert.equal(click.defaultPrevented, true);
  assert.equal(click.stopped, true);
  assert.equal(f.fire('click', {clientX: 100}).defaultPrevented, false);
  f.swipe(-100);
  f.fire('pointerdown', {clientX: 100});
  f.fire('pointerup', {clientX: 100});
  assert.equal(f.fire('click', {clientX: 100}).defaultPrevented, false);
});

test('short drags and end-stop drags cannot accidentally activate a card, but taps can', () => {
  const f = fixture();
  f.swipe(100);
  assert.equal(f.fire('click', {pointerId: undefined, clientX: 300}).defaultPrevented, true);
  f.swipe(-40);
  assert.equal(f.fire('click', {clientX: 160}).defaultPrevented, true);
  f.swipe(-5, 2);
  assert.equal(f.fire('click', {clientX: 195, clientY: 202}).defaultPrevented, false);
  assert.deepEqual(f.navigated, []);
});

test('controls, editable ancestors, opted-out regions, and nested scrollers are excluded', () => {
  const f = fixture();
  const excluded = [
    new Element('button', f.container), new Element('input', f.container),
    new Element('select', f.container), new Element('summary', f.container),
    new Element('a', f.container, {class: 'button', href: '#/event/test'}),
    new Element('div', f.container, {contenteditable: ''}),
    new Element('div', f.container, {'data-opportunity-swipe-ignore': ''}),
  ];
  const scroller = new Element('div', f.container);
  scroller.style.overflowX = 'auto';
  scroller.scrollWidth = 300;
  excluded.push(scroller);
  for (const element of excluded) {
    const target = new Element('span', element);
    assert.equal(f.swipe(-100, 0, {target}).moved.defaultPrevented, false);
  }
  assert.deepEqual(f.navigated, []);
});

test('gestures only run within current connected explorer content and primary unmodified presses', () => {
  const f = fixture();
  for (const props of [{target: f.root}, {button: 2}, {ctrlKey: true}, {isPrimary: false}]) f.swipe(-100, 0, props);
  f.fire('pointerdown');
  f.setView('calendar');
  f.fire('pointerup', {clientX: 100});
  f.fire('pointerdown');
  f.container.parentElement = null;
  f.fire('pointerup', {clientX: 100});
  assert.deepEqual(f.navigated, []);
});

test('mouse dragging works and does not start native anchor drag', () => {
  const f = fixture();
  f.fire('pointerdown', {pointerType: 'mouse'});
  assert.equal(f.fire('dragstart').defaultPrevented, true);
  f.fire('pointermove', {clientX: 100, pointerType: 'mouse'});
  f.fire('pointerup', {clientX: 100, pointerType: 'mouse'});
  assert.deepEqual(f.navigated, ['calendar']);
  assert.equal(f.fire('dragstart').defaultPrevented, false);
});

test('installation is idempotent and cleanup allows a fresh installation', () => {
  const f = fixture();
  assert.equal(installOpportunitySwipes(f.options), f.cleanup);
  f.swipe(-100);
  assert.deepEqual(f.navigated, ['calendar']);
  f.cleanup();
  f.swipe(-100);
  assert.deepEqual(f.navigated, ['calendar']);
  installOpportunitySwipes(f.options);
  f.swipe(-100);
  assert.deepEqual(f.navigated, ['calendar', 'map']);
});

test('delegated listeners work on a replaced content tree without reinstalling', () => {
  const f = fixture();
  f.container.parentElement = null;
  const container = new Element('section', f.root, {'data-opportunity-swipe': ''});
  const target = new Element('a', container, {href: '#/event/new'});
  f.swipe(-100, 0, {target});
  assert.deepEqual(f.navigated, ['calendar']);
});

test('a stale synthetic-click guard expires without blocking unrelated clicks', context => {
  let now = 1000;
  context.mock.method(Date, 'now', () => now);
  const f = fixture();
  f.swipe(-100);
  now += 701;
  assert.equal(f.fire('click', {clientX: 100}).defaultPrevented, false);
});
