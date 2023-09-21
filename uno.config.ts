import { defineConfig, presetUno, presetAttributify, presetIcons, transformerVariantGroup, transformerDirectives } from 'unocss'

export default defineConfig({
  theme: {},
  shortcuts: {},
  rules: [],
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      warn: true,
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
        'margin': '0 4px'
      }
    })
  ],
  transformers: [
    transformerVariantGroup(),
    transformerDirectives()
  ]
})
