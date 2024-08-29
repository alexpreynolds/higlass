import cloneEvent from './clone-event';

/**
 * Forward an event by cloning and dispatching it.
 * @param   {object}  event  Event to be forwarded.
 * @param   {object}  target  Target HTML element for the event.
 */
const forwardEvent = (event, target) => {
  // console.log(`[forward-event] | ${event.type} | ${target.tagName} | ${target.id}`);
  target.dispatchEvent(cloneEvent(event));
};

export default forwardEvent;
