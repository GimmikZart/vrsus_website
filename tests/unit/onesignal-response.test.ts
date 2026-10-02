import { describe, expect, it } from 'vitest'
import { parseOneSignalCreateResponse } from '../../server/utils/onesignal-response'

describe('OneSignal create notification response', () => {
  it('accepts a created message id', () => {
    expect(
      parseOneSignalCreateResponse('{"id":"created-message","recipients":1}'),
    ).toEqual({ accepted: true, messageId: 'created-message' })
  })

  it('does not treat HTTP 200 without a message id as delivered', () => {
    expect(
      parseOneSignalCreateResponse('{"id":"","errors":["no recipients"]}'),
    ).toEqual({
      accepted: false,
      error: 'ONESIGNAL_NO_MESSAGE:["no recipients"]',
    })
  })

  it('rejects a malformed response', () => {
    expect(parseOneSignalCreateResponse('not json')).toEqual({
      accepted: false,
      error: 'ONESIGNAL_INVALID_RESPONSE',
    })
    expect(parseOneSignalCreateResponse('null')).toEqual({
      accepted: false,
      error: 'ONESIGNAL_INVALID_RESPONSE',
    })
  })
})
