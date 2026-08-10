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
  // 纯静态部署：强制 static 预设，避免 Nitro 在 Netlify 环境自动用 netlify preset
  // 生成 serverless 函数（与 generate 模式冲突，报 ENOENT server.json）
  nitro: {
    preset: 'static',
    output: {
      publicDir: 'dist'
    }
  },
  app: {
    head: {
      title: '100 toys - toryz',
      meta: [
        { name: 'description', content: 'toryz\'s 100 toys.' }
      ]
    }
  },
  css: [
    '@/assets/styles/public.css'
  ]
})
