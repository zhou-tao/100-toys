<script setup lang="ts">
  definePageMeta({
    name: 'ViewTransition',
    title: '001',
    time: '2023/09/22'
  })

  const isDark = ref(false)

  onMounted(() => {
    isDark.value = document.documentElement.classList.contains('dark')
  })

  watch(isDark, (v) => {
    document.documentElement.setAttribute('class', v ? 'dark' : '')
  })

  function triggerDark(e: MouseEvent) {
    // @ts-expect-error experimental API
    const isAppearanceTransition = document.startViewTransition
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches // startViewTransition api不支持 或 系统开启动画减弱
    const setDarkValue = () => {
      isDark.value = !isDark.value
    }
    if (!isAppearanceTransition) {
      setDarkValue()
      return
    }
    const x = e.clientX
    const y = e.clientY
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    )
    // @ts-expect-error experimental API
    const transition = document.startViewTransition(async () => {
      setDarkValue()
      await nextTick()
    })
    transition.ready
      .then(() => {
        const clipPath = [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`
        ]
        document.documentElement.animate(
          {
            clipPath: isDark.value
              ? [...clipPath].reverse()
              : clipPath
          },
          {
            duration: 400,
            easing: 'ease-out',
            pseudoElement: isDark.value
              ? '::view-transition-old(root)'
              : '::view-transition-new(root)'
          }
        )
      })
  }
</script>

<template>
  <h1>001</h1>
  <div flex="~ col" items-center>
    <div :class="isDark ? 'i-ri-moon-line' : 'i-ri-sun-line'" text-2xl cursor-pointer @click="triggerDark" />
    <span mt4>{{ isDark ? 'dark' : 'light' }}</span>
  </div>
</template>

<style>
html {
  @apply bg-white relative;
}

html.dark {
  @apply bg-black text-white;
}

/* theme toggle transition */
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
::view-transition-old(root) {
  z-index: 1;
}
::view-transition-new(root) {
  z-index: 9999;
}
.dark::view-transition-old(root) {
  z-index: 9999;
}
.dark::view-transition-new(root) {
  z-index: 1;
}
</style>
