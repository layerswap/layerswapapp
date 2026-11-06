import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)

function loadSource(path, imports = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', outputText)(name => {
    if (['react', 'react/jsx-runtime', 'swr', 'zustand'].includes(name)) return require(name)
    if (name in imports) return imports[name]
    return {}
  }, module, module.exports)
  return module.exports
}

const { useLoadingStore } = loadSource('../src/hooks/useFee.tsx', {
  '@/lib/apiClients': { LayerswapApiClient: class {} },
})

test('quote loading is tracked per URL so concurrent quotes do not reset each other', () => {
  const { setLoading } = useLoadingStore.getState()
  setLoading('/quote?a', true)
  setLoading('/quote?b', true)
  setLoading('/quote?a', false)
  assert.deepEqual(useLoadingStore.getState().loading, { '/quote?b': true })
  setLoading('/quote?b', false)
  assert.deepEqual(useLoadingStore.getState().loading, {})
})

test('repeating the current loading state does not notify subscribers', () => {
  const state = useLoadingStore.getState()
  let notifications = 0
  const unsubscribe = useLoadingStore.subscribe(() => notifications++)
  state.setLoading('/quote?c', false)
  state.setLoading('/quote?c', true)
  state.setLoading('/quote?c', true)
  state.setLoading('/quote?c', false)
  unsubscribe()
  assert.equal(notifications, 2)
})
