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
      title: '100 tools',
      meta: [
        { name: 'description', content: 'toryz\'s 100 tools or toys.' }
      ]
    }
  }
})
