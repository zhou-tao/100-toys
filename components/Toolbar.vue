<script setup lang="ts">
  const route = useRoute()
  const router = useRouter()

  const currentPageNo = computed(() => parseInt(route.meta.title as string))

  const pageCount = computed(() => router.getRoutes().filter(v => v.path !== '/').length)

  function goPage(step: number) {
    const targetNo = currentPageNo.value + step
    if (targetNo <= 0 || targetNo > pageCount.value) return
    const targetPath = targetNo.toString().padStart(3, '0')
    router.push(`/${targetPath}`)
  }
</script>

<template>
  <ul class="toolbar" border="1 base solid">
    <li class="menu-item" :class="{ disabled: currentPageNo === 1 }" @click="goPage(-1)">
      <div i-ri-arrow-left-double-fill />
    </li>
    <li class="menu-item info" b-l="1 base solid" b-r="1 base solid" :title="$route.meta.name">
      {{ $route.meta.title }}
    </li>
    <li class="menu-item" :class="{ disabled: currentPageNo >= pageCount }" @click="goPage(1)">
      <div i-ri-arrow-right-double-fill />
    </li>
  </ul>
</template>

<style scoped>
.toolbar {
  @apply absolute left-1/2 translate-x--1/2 bottom-2 list-none pl0 flex items-center rounded-full;
}

.menu-item {
  @apply h-28px leading-relaxed px2 py1 text-base;
}

.menu-item:not(.disabled) {
  @apply hover:text-heavy cursor-pointer transition-all duration-300 ease-in-out;
}

.menu-item.info {
  @apply px3 text-16px leading-loose;
}

.menu-item.disabled {
  @apply cursor-not-allowed text-light;
}
</style>
