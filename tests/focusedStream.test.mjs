import test from 'node:test'
import assert from 'node:assert/strict'
import { focusedStreamReducer } from '../src/focusedStream.ts'

const poll = (state, ready) => focusedStreamReducer(state, { type: 'metadata', ready })

test('Fresh is required to start, but routine Fresh/Stale/failed polling does not reset HD', () => {
  let stream = 'waiting'
  assert.equal(poll(stream, false), 'waiting')
  stream = poll(stream, true)
  assert.equal(stream, 'streaming')
  // The component maps stale health, failed polling, and absent frame metadata to ready=false.
  // These previously unmounted the MJPEG image on every brief health fluctuation.
  for (const ready of [true, false, true, false, false, true]) {
    stream = poll(stream, ready)
    assert.equal(stream, 'streaming')
  }
})

test('real image errors cause fallback and Fresh polls cannot silently restart the failed stream', () => {
  let stream = poll('waiting', true)
  stream = focusedStreamReducer(stream, { type: 'stream-error' })
  assert.equal(stream, 'failed')
  for (const ready of [false, true, true]) assert.equal(poll(stream, ready), 'failed')
})

test('a new lease or explicit retry begins with an independent startup gate', () => {
  const oldSession = poll('waiting', true)
  assert.equal(oldSession, 'streaming')
  let newSession = 'waiting'
  newSession = poll(newSession, false)
  assert.equal(newSession, 'waiting')
  newSession = poll(newSession, true)
  assert.equal(newSession, 'streaming')
})
