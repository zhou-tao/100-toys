import { defineConfig, presetUno, presetAttributify, presetIcons, transformerVariantGroup, transformerDirectives } from 'unocss'

export default defineConfig({
  theme: {
    colors: {
      light: 'rgba(156, 163, 175, 0.6)',
      base: 'rgba(156, 163, 175, 0.8)',
      heavy: 'rgb(156, 163, 175)'
    }
  },
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
        'margin': '0 2px',
        'font-size': '1.25em'
      }
    })
  ],
  transformers: [
    transformerVariantGroup(),
    transformerDirectives()
  ]
})
