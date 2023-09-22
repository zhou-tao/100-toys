<script setup lang="ts">
  const router = useRouter()

  const pages = computed(() => router.getRoutes().filter(v => v.path !== '/'))

  definePageMeta({
    layout: false
  })
</script>

<template>
  <div class="home" h-screen flex="~ col" justify-center>
    <div w-full max-w-760px m-auto px10 py15 overflow-y-auto>
      <h1 font-mono text-xl font-bold m0 mb8>
        <div i-ri-trophy-line mt="-3px" /> 100 Toys
      </h1>
      <nav grid gap-x-4 gap-y-1 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3>
        <NuxtLink v-for="pg in pages" :key="pg.name" :to="pg.path" class="link">
          <span font-mono text-lg tracking-wide>{{ pg.meta.title }}</span>&nbsp;<b font-400>{{ pg.name }}</b>
        </NuxtLink>
      </nav>
      <footer mt-24>
        <a class="link" href="https://github.com/zhou-tao/100-toys">
          <div i-ri-github-line />github
        </a>
        &bull;
        <a class="link" href="https://toryz-me.netlify.app/">
          <div i-ri-article-line />me
        </a>
        <p class="link cursor-default">
          Copyright &copy; 2023-present toryz
        </p>
      </footer>
    </div>
  </div>
</template>

<style scoped lang="css">
.link {
  @apply text-#9CA3AF no-underline op60 hover:op100 transition-opacity duration-300 ease-in-out cursor-pointer;
}

.link b {
  color: #374151;
}
</style>
