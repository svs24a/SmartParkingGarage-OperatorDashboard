import test from 'node:test'
import assert from 'node:assert/strict'
import { openFocus } from '../src/focusLease.ts'

const flush = async () => { for (let i = 0; i < 8; i++) await new Promise(setImmediate) }
const response = (lease_id, extra = {}) => Response.json({ lease_id, ...extra })

test('focus lease lifecycle', async t => {
  const originalFetch = globalThis.fetch
  const originalWindow = globalThis.window
  globalThis.window = new EventTarget()
  t.after(() => { globalThis.fetch = originalFetch; globalThis.window = originalWindow })

  await t.test('renews every ten seconds with lease ID and releases only its own lease', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 100000 })
    const calls = []
    const states = []
    globalThis.fetch = async (url, options) => {
      calls.push({ url, ...options })
      return options.method === 'DELETE' ? new Response(null, { status: 204 }) : response('lease-a')
    }
    const close = openFocus('CAM_ENTRANCE', state => states.push(state))
    await flush()
    assert.equal(states.at(-1).phase, 'owned')
    assert.deepEqual(JSON.parse(calls[0].body), {})
    t.mock.timers.tick(9999)
    await flush()
    assert.equal(calls.length, 1)
    t.mock.timers.tick(1)
    await flush()
    assert.deepEqual(JSON.parse(calls[1].body), { lease_id: 'lease-a' })
    // Renewal must not publish a new acquisition identity and remount the stream.
    assert.deepEqual(states.map(state => state.phase), ['acquiring', 'owned'])
    close()
    await flush()
    assert.equal(calls[2].method, 'DELETE')
    assert.equal(calls[2].headers['X-Focus-Lease-Id'], 'lease-a')
    t.mock.timers.tick(30000)
    await flush()
    assert.equal(calls.length, 3)
  })

  await t.test('late acquisition is released before a switched camera acquires', async () => {
    let resolveFirst
    const calls = []
    globalThis.fetch = async (url, options) => {
      calls.push(`${options.method} ${url}`)
      if (calls.length === 1) return new Promise(resolve => { resolveFirst = resolve })
      return options.method === 'DELETE' ? new Response(null, { status: 204 }) : response('lease-b')
    }
    const states = []
    const closeFirst = openFocus('CAM_ENTRANCE', state => states.push(state))
    await flush()
    closeFirst()
    const closeSecond = openFocus('CAM_EXIT', () => {})
    await flush()
    assert.equal(calls.length, 1)
    resolveFirst(response('late-lease'))
    await flush()
    assert.deepEqual(calls.slice(0, 3), [
      'POST /api/cameras/CAM_ENTRANCE/focus',
      'DELETE /api/cameras/focus',
      'POST /api/cameras/CAM_EXIT/focus',
    ])
    assert.equal(states.some(state => state.phase === 'owned'), false)
    closeSecond()
    await flush()
  })

  for (const status of [409, 503]) {
    await t.test(`HTTP ${status} preserves fallback without stealing or releasing another lease`, async () => {
      const calls = []
      let state
      globalThis.fetch = async (url, options) => {
        calls.push(options.method)
        return new Response(null, { status })
      }
      const close = openFocus('CAM_ENTRANCE', value => { state = value })
      await flush()
      assert.equal(state.phase, 'error')
      assert.match(state.message, status === 409 ? /another viewer/ : /unavailable/)
      close()
      await flush()
      assert.deepEqual(calls, ['POST'])
    })
  }

  await t.test('failed renewal stops ownership and releases the known lease', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 100000 })
    const calls = []
    let state
    globalThis.fetch = async (url, options) => {
      calls.push(options.method)
      if (calls.length === 2) throw new TypeError('offline')
      return options.method === 'DELETE' ? new Response(null, { status: 204 }) : response('lease-a')
    }
    const close = openFocus('CAM_ENTRANCE', value => { state = value })
    await flush()
    t.mock.timers.tick(10000)
    await flush()
    assert.equal(state.phase, 'error')
    assert.match(state.message, /connection failed/)
    assert.deepEqual(calls, ['POST', 'POST', 'DELETE'])
    close()
    await flush()
  })

  await t.test('pagehide sends keepalive release', async () => {
    const calls = []
    globalThis.fetch = async (url, options) => {
      calls.push(options)
      return options.method === 'DELETE' ? new Response(null, { status: 204 }) : response('lease-a')
    }
    const close = openFocus('CAM_ENTRANCE', () => {})
    await flush()
    window.dispatchEvent(new Event('pagehide'))
    await flush()
    assert.equal(calls.at(-1).method, 'DELETE')
    assert.equal(calls.at(-1).keepalive, true)
    close()
    await flush()
  })
})
