import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)

test('package exposes the root host entry and the browser bundle', async () => {
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
  assert.equal(pkg.exports['.'], './index.js')
  assert.equal(pkg.exports['./client'], './client.js')
  assert.ok(pkg.files.includes('index.js'), 'index.js must be published')
  assert.ok(pkg.files.includes('client.js'), 'client.js must be published')
  assert.equal(pkg.dsh.client.platform, 'web')
})

test('patch mounts an exact package-root Loader row for client discovery', async () => {
  const patch = await readFile(new URL('cordis.patch.yml', root), 'utf8')
  assert.match(
    patch,
    /id: chat-mode-root\n\s+name: '@local\/dsh-chat-mode'\n/,
    'a bare @local/dsh-chat-mode row is required; subpath rows never trigger the client scan',
  )
})
