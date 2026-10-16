// Completed pairs only: pending/failed questions never enter model context.
export function conversationHistory(messages) {
  const pairs = [];
  for (let i = 0; i < messages.length - 1; i++) {
    const user = messages[i], assistant = messages[i + 1];
    if (user.role !== 'user' || user.status !== 'complete' || assistant.role !== 'assistant' || assistant.status !== 'complete') continue;
    if (user.text.length > 2000 || assistant.text.length > 12000) continue;
    pairs.push([{role:'user',text:user.text},{role:'model',text:assistant.text}]);
    i++;
  }
  const selected = [];
  let length = 0;
  for (const pair of pairs.slice(-6).reverse()) {
    const size = pair[0].text.length + pair[1].text.length;
    if (length + size > 16000) break;
    selected.unshift(...pair); length += size;
  }
  return selected;
}

export function beginChatTurn(messages, text, id) {
  // Replace a failed outgoing bubble when retrying/editing it.
  const previous = messages.at(-1)?.role === 'user' && messages.at(-1)?.status === 'failed' ? messages.slice(0,-1) : messages;
  return [...previous.slice(-38), {id,role:'user',text,status:'pending'}];
}
