const earlierReply = 'data-ki-earlier-reply';

interface ReplyOrder {
  messages: Set<Element>;
  observer: MutationObserver;
}

const replyOrder = new WeakMap<ParentNode, ReplyOrder>();

function isAssistantReply(element: Element): boolean {
  if (element.localName !== 'ki-message' || element.hasAttribute('hidden')) return false;
  const role = element.getAttribute('message-role') ?? element.getAttribute('role');
  return role !== 'user' && role !== 'event';
}

function observeOrder(parent: ParentNode): ReplyOrder {
  const messages = new Set<Element>();
  const observer = new MutationObserver((records) => {
    // Streamed content changes descendants. Only direct siblings affect reply order.
    const orderChanged = records.some(({ type, target }) =>
      type === 'childList' ? target === parent : target.parentNode === parent,
    );
    if (!orderChanged) return;

    let laterReply = false;
    for (let child = parent.lastElementChild; child; child = child.previousElementSibling) {
      if (messages.has(child)) child.toggleAttribute(earlierReply, laterReply);
      laterReply ||= isAssistantReply(child);
    }
  });
  observer.observe(parent, {
    childList: true,
    subtree: true,
    attributeFilter: ['hidden', 'message-role', 'role'],
  });
  return { messages, observer };
}

export function trackReplyOrder(message: HTMLElement): (() => void) | undefined {
  const parent = message.parentNode;
  if (!parent || !message.isConnected) return undefined;

  const order = replyOrder.get(parent) ?? observeOrder(parent);
  replyOrder.set(parent, order);
  order.messages.add(message);

  let sibling = message.nextElementSibling;
  while (sibling && !isAssistantReply(sibling)) sibling = sibling.nextElementSibling;
  message.toggleAttribute(earlierReply, sibling !== null);

  return () => {
    order.messages.delete(message);
    message.removeAttribute(earlierReply);
    if (order.messages.size === 0) {
      order.observer.disconnect();
      replyOrder.delete(parent);
    }
  };
}
