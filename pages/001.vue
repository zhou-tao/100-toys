<script setup lang="ts">
  definePageMeta({
    name: 'ViewTransition',
    title: '001',
    time: '2023/09/22'
  })

  function triggerDark(e: MouseEvent) {
    // @ts-expect-error experimental API
    const isAppearanceTransition = document.startViewTransition
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches // startViewTransition api不支持 或 系统开启动画减弱
    if (!isAppearanceTransition) return
    const x = e.clientX
    const y = e.clientY
    console.log(x, y)
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )
    console.log(endRadius)
  }
</script>

<template>
  <div flex justify-around>
    <div>
      <div i-ri-sun-line cursor-pointer @click="triggerDark" />
    </div>
  </div>
</template>

<style scoped>

</style>
