<script setup lang="ts">
  const router = useRouter()

  const pages = computed(() => router.getRoutes().filter(v => v.path !== '/'))

  definePageMeta({
    layout: false
  })

  const themeIcon = ref<'sun' | 'moon'>('sun')
  let toggleDarkFunc: any

  onBeforeMount(async () => {
    const { isDark, toggleDark } = await import('../composables/useDark')
    toggleDarkFunc = toggleDark
    watch(isDark, (v) => {
      themeIcon.value = v ? 'sun' : 'moon'
    })
  })
</script>

<template>
  <div class="home" h-screen flex="~ col" justify-center>
    <a class="theme-toggle" @click="toggleDarkFunc">
      <div :class="`i-ri-${themeIcon}-line`" />
    </a>
    <div w-full max-w-760px m-auto px10 py15 pt5 overflow-y-auto>
      <h1 font-mono text-xl font-bold m0 mb8>
        <div i-ri-trophy-line mt="-3px" /> 100 Toys
      </h1>
      <nav grid gap-x-4 gap-y-1 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3>
        <NuxtLink v-for="pg in pages" :key="pg.name" :to="pg.path" class="link">
          <span font-mono text-lg tracking-wide>{{ pg.meta.title }}</span>&nbsp;<b font-400>{{ pg.name }}</b>
        </NuxtLink>
      </nav>
      <footer mt-24>
        <a class="link" href="https://toryz-me.netlify.app">
          <div i-ri-article-line />@toryz
        </a>
        &bull;
        <a class="link" href="https://github.com/zhou-tao/100-toys">
          <div i-ri-github-line />github
        </a>
        &bull;
        <a class="link" href="https://afdian.net/a/toryz">
          <div i-carbon-lightning />爱发电
        </a>
        <p class="link cursor-default">
          copyright &copy; 2023-present toryz
        </p>
      </footer>
    </div>
  </div>
</template>

<style scoped lang="css">
.link b {
  @apply text-#374151 dark:text-#a1a1aa;
}

.theme-toggle {
  @apply absolute text-lg top-12 <sm:top-8 right-16 <sm:right-12 cursor-pointer op-60 hover:op-100 transition-200 ease;
}

footer {
  color: #a1a1aa;
}
</style>
