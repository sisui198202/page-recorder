function invalid(error) {
  return { success: false, error };
}

export async function send({ extensionId, message } = {}, chromeApi = globalThis.chrome) {
  if (typeof extensionId !== 'string' || !extensionId.trim()) return invalid('invalid_extension_id');
  if (!message || typeof message !== 'object' || Array.isArray(message)) return invalid('invalid_message');
  if (!chromeApi?.runtime?.sendMessage) return invalid('runtime_send_message_unavailable');
  try {
    const response = await chromeApi.runtime.sendMessage(extensionId, message);
    return { success: true, response };
  } catch (error) {
    return { success: false, error: typeof error?.message === 'string' ? error.message : String(error) };
  }
}

export function validatePageRecorderStockDetected(message) {
  if (message?.type !== 'PAGE_RECORDER_STOCK_DETECTED') return invalid('unsupported_message');
  if (!message?.siteId || typeof message.siteId !== 'string') return invalid('missing_site_id');
  if (!message?.discordChannelId || typeof message.discordChannelId !== 'string') return invalid('missing_discord_channel_id');
  const urls = Array.isArray(message.urls)
    ? message.urls.filter((url) => typeof url === 'string' && /^https?:\/\//.test(url))
    : [];
  if (urls.length === 0) return invalid('invalid_urls');
  return {
    success: true,
    normalizedMessage: { ...message, siteId: message.siteId.trim(), discordChannelId: message.discordChannelId.trim(), urls }
  };
}

export function validatePageRecorderTargetpageStockDetected(message) {
  if (message?.type !== 'PAGE_RECORDER_STOCK_DETECTED') return invalid('unsupported_message');
  const requiredStrings = [
    ['siteId', 'missing_site_id'],
    ['targetId', 'missing_target_id'],
    ['environment', 'missing_environment'],
    ['eventId', 'missing_event_id'],
    ['detectedAt', 'missing_detected_at']
  ];
  for (const [field, error] of requiredStrings) {
    if (typeof message?.[field] !== 'string' || !message[field].trim()) return invalid(error);
  }
  const environment = message.environment.trim();
  if (!['test', 'prod'].includes(environment)) return invalid('invalid_environment');
  const urls = Array.isArray(message.urls)
    ? message.urls.filter((url) => typeof url === 'string' && /^https?:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(url))
    : [];
  if (urls.length === 0) return invalid('invalid_urls');
  return {
    success: true,
    normalizedMessage: {
      ...message,
      siteId: message.siteId.trim(),
      targetId: message.targetId.trim(),
      environment,
      eventId: message.eventId.trim(),
      detectedAt: message.detectedAt.trim(),
      urls
    }
  };
}

export const ExternalMessaging = Object.freeze({
  send,
  validatePageRecorderStockDetected,
  validatePageRecorderTargetpageStockDetected
});
