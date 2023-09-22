export default defineNuxtConfig({
  modules: [
    '@unocss/nuxt'
  ],
  devtools: {
    enabled: true
  },
  typescript: {
    shim: false
  },
  app: {
    head: {
      title: '100 toys',
      meta: [
        { name: 'description', content: 'toryz\'s 100 toys.' }
      ]
    }
  },
  css: [
    '@/assets/styles/public.css'
  ]
})
