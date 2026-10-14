import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import Color from 'color'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { loadSource } from './helpers/source.mjs'

const themes = loadSource('Models/Theme.ts')
const presetColors = loadSource('helpers/amountPresetColors.ts')
const ColorSchema = loadSource('components/ColorSchema.tsx', {
    '../Models/Theme': themes,
    '../helpers/amountPresetColors': presetColors,
}).default

// Audit the shipped widget palettes and the separate playground palettes.
const playground = { exports: {} }
const { outputText } = ts.transpileModule(readFileSync(new URL('../../../../apps/widget-playground/src/lib/Themes.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
})
new Function('exports', outputText)(playground.exports)

const rgb = value => value.split(',').map(Number)
const contrast = (a, b) => Color(a).contrast(Color(b))
const background = (theme, opacity) => rgb(theme.secondary[300]).map((channel, index) => channel * opacity + rgb(theme.secondary[500])[index] * (1 - opacity))

for (const [catalog, palettes] of [['widget', themes.THEME_COLORS], ['playground', playground.exports.THEME_COLORS]]) {
    for (const [name, theme] of Object.entries(palettes)) {
        test(`${catalog} ${name}: preset labels, badge and selection have sufficient contrast`, () => {
            const colors = presetColors.resolveAmountPresetColors(theme.secondary, theme.primary)
            const selected = rgb(colors.selectedBackground)
            const track = background(theme, 0.35)
            assert.ok(contrast(selected, rgb(colors.selectedText)) >= 4.5, 'Selected label contrast')
            assert.ok(contrast(selected, track) >= 3, 'Selection must stand out from the track')
            assert.ok(contrast(rgb(colors.text), track) >= 4.5, 'Unselected enabled label contrast')
            assert.ok(contrast(rgb(colors.badgeText), background(theme, 0.6)) >= 4.5, 'Badge label contrast')
        })
    }
}

test('the default preset and badge colours remain exactly unchanged', () => {
    const theme = themes.THEME_COLORS.default
    assert.deepEqual(presetColors.resolveAmountPresetColors(theme.secondary, theme.primary), {
        selectedBackground: '163, 173, 194', selectedText: '14, 21, 36',
        text: '163, 173, 194', badgeText: '163, 173, 194',
    })
})

test('ColorSchema emits the resolved colours and handles partial/default themes', () => {
    for (const theme of [undefined, { primary: { DEFAULT: '1, 2, 3' } }, themes.THEME_COLORS.light, themes.THEME_COLORS.ton]) {
        const markup = renderToStaticMarkup(createElement(ColorSchema, { themeData: theme }))
        const palette = theme?.secondary ? theme : themes.THEME_COLORS.default
        const colors = presetColors.resolveAmountPresetColors(palette.secondary, palette.primary)
        for (const [token, key] of [['selected', 'selectedBackground'], ['selected-text', 'selectedText'], ['text', 'text'], ['badge-text', 'badgeText']]) {
            assert.ok(markup.includes(`--ls-colors-preset-${token}: ${colors[key]};`))
        }
    }
})

test('non-numeric custom CSS colours keep their original theme values', () => {
    const theme = themes.THEME_COLORS.default
    const secondary = { ...theme.secondary, text: 'var(--custom-text)' }
    assert.deepEqual(presetColors.resolveAmountPresetColors(secondary, theme.primary), {
        selectedBackground: secondary.text, selectedText: secondary[700],
        text: secondary.text, badgeText: secondary.text,
    })
})
