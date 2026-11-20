import assert from 'node:assert/strict'
import test from 'node:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// Guard for the class of bug where a surface instantiates its own <Formik> for
// SwapFormValues and silently loses the widget_flow journey: no FormTelemetry, no
// [data-ls-form] interaction boundary, no form_submitted, so every later lifecycle
// step is dropped by widgetTelemetry. SwapForm.tsx is the single owner of those
// three; Feedback.tsx is the unrelated contact form. Regex-based: `import * as
// formik` or a re-export would bypass it, so keep imports named.
const srcDir = new URL('../src/', import.meta.url).pathname
const SWAP_FORM = 'components/Pages/Swap/Form/SwapForm.tsx'

function* sourceFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) yield* sourceFiles(path)
    else if (/\.tsx?$/.test(entry)) yield path
  }
}

const sources = [...sourceFiles(srcDir)].map(path => ({ path: relative(srcDir, path), text: readFileSync(path, 'utf8') }))

function filesContaining(pattern) {
  return sources.filter(({ text }) => pattern.test(text)).map(({ path }) => path).sort()
}

test('Formik is instantiated for SwapFormValues only by SwapForm', () => {
  assert.deepEqual(filesContaining(/import[^;]*\bFormik\b[^;]*from ['"]formik['"]/), [
    'components/Menu/Feedback.tsx',
    SWAP_FORM,
  ])
})

test('FormTelemetry is imported only by SwapForm', () => {
  assert.deepEqual(filesContaining(/import FormTelemetry from/), [SWAP_FORM])
  assert.deepEqual(filesContaining(/<FormTelemetry\b/), [SWAP_FORM])
})

test('form_submitted is emitted only by SwapForm and the prefetch hand-over', () => {
  // lib files compare `event.step === 'form_submitted'`, which this literal does not match.
  assert.deepEqual(filesContaining(/step: 'form_submitted'/), [
    'components/Pages/Deposit/depositPrefetchContext.tsx',
    SWAP_FORM,
  ])
})

test('the [data-ls-form] boundary has one owner and one reader', () => {
  assert.deepEqual(filesContaining(/data-ls-form/), [SWAP_FORM, 'lib/widgetTelemetry.ts'])
})
