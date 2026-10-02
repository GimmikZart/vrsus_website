type OneSignalCreateResponse = {
  id?: unknown
  errors?: unknown
}

export function parseOneSignalCreateResponse(body: string) {
  let response: OneSignalCreateResponse
  try {
    response = JSON.parse(body) as OneSignalCreateResponse
  } catch {
    return { accepted: false, error: 'ONESIGNAL_INVALID_RESPONSE' }
  }
  if (!response || typeof response !== 'object') {
    return { accepted: false, error: 'ONESIGNAL_INVALID_RESPONSE' }
  }

  if (typeof response.id === 'string' && response.id.trim()) {
    return { accepted: true, messageId: response.id }
  }

  const detail = response.errors
    ? JSON.stringify(response.errors).slice(0, 240)
    : 'no valid push subscriptions'
  return { accepted: false, error: `ONESIGNAL_NO_MESSAGE:${detail}` }
}
