<script setup lang="ts">
  const router = useRouter()

  const pages = computed(() => router.getRoutes().filter(v => v.path !== '/'))

  definePageMeta({
    layout: false
  })
</script>

<template>
  <div class="home" h-screen flex="~ col" justify-center>
    <div w-full max-w-760px m-auto>
      <h1 font-mono mb-2 text-xl font-bold mb-4>
        100 Tools
      </h1>
      <nav grid gap-x-4 gap-y-1 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3>
        <NuxtLink v-for="pg in pages" :key="pg.name" :to="pg.path" class="link">
          <span font-mono text-lg tracking-wide op50>{{ pg.meta.title }}</span>&nbsp;<b font-400>{{ pg.name }}</b>
        </NuxtLink>
      </nav>
      <footer mt-24 class="link">
        @toryz
      </footer>
    </div>
  </div>
</template>

<style scoped lang="css">
.link {
  @apply text-#9CA3AF no-underline op70 hover:op100 transition-opacity duration-150 ease-in-out cursor-pointer;
}
</style>
