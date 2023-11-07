<script setup lang="ts">
  definePageMeta({
    name: 'Transition',
    title: '001',
    time: '2023/09/22'
  })

  const isSupported = ref(true)

  const isDark = ref(false)

  const extraClass = ref('')

  const transitionTypes = ['circle', 'sector', 'dots', 'shutters']
  const icons = [
    ['i-ri-album-line', 'i-ri-album-fill'],
    ['i-ri-signal-wifi-line', 'i-ri-signal-wifi-fill'],
    ['i-ri-bubble-chart-line', 'i-ri-bubble-chart-fill'],
    ['i-ri-map-2-line', 'i-ri-map-2-fill']
  ]

  onMounted(() => {
    isDark.value = document.documentElement.classList.contains('dark')
  })

  watch(isDark, (v) => {
    document.documentElement.setAttribute('class', `${v ? 'dark' : ''} ${extraClass.value}`)
  })

  const clipPaths: any = {
    circle: [
      'circle(0px)',
      'circle(80%)'
    ],
    sector: [
      'polygon(50% 50%, 50% 0%, 0% 0%,  0% 0%, 100% 0%, 100% 0%, 50% 0%)',
      'polygon(50% 50%, 0% 0%, 0% 0%, 0% 0%, 100% 0%, 100% 0%, 100% 0%)',
      'polygon(50% 50%, 0% 100%, 0% 100%, 0% 0%, 100% 0%, 100% 100%, 100% 100%)',
      'polygon(50% 50%, 50% 100%, 0% 100%, 0% 0%, 100% 0%, 100% 100%, 50% 100%)'
    ],
    seed: Array(100).fill(0).map((_, i) => ({ '--seed': i }))
  }

  function triggerDark(type: string) {
    // @ts-expect-error experimental API
    const isAppearanceTransition = document.startViewTransition
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches // startViewTransition api不支持 或 系统开启动画减弱
    const setDarkValue = () => {
      isDark.value = !isDark.value
    }
    if (!isAppearanceTransition) {
      setDarkValue()
      isSupported.value = false
      return
    }
    extraClass.value = clipPaths[type] ? '' : type
    // @ts-expect-error experimental API
    const transition = document.startViewTransition(async () => {
      setDarkValue()
      await nextTick()
    })
    transition.ready
      .then(() => {
        const clipPath = clipPaths[type] || clipPaths.seed
        document.documentElement.animate(
          clipPaths[type]
            ? {
              clipPath: isDark.value
                ? [...clipPath].reverse()
                : clipPath
            }
            : clipPath,
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
  <div class="mt-30% main">
    <div v-for="type, index in transitionTypes" :key="type" class="flex flex-col items-center  justify-center cursor-pointer b-(1px solid #a1a1aa) rounded" @click="triggerDark(type)">
      <div :class="icons[index][isDark ? 1 : 0]" text-2xl cursor-pointer />
      <span mt2>{{ type }}</span>
    </div>
  </div>
  <Alert v-if="!isSupported" title="当前浏览器不支持！" type="error" />
</template>

<style scoped>
.main {
  display: grid;
  justify-content: center;
  grid-template-columns: repeat(4, 5.5rem);
  grid-template-rows: repeat(1, 5.5rem);
  grid-gap: 2rem;
}

@media (max-width: 639.9px) {
  .main {
    grid-template-columns: repeat(2, 5.5rem);
    grid-template-rows: repeat(2, 5.5rem);
  }
}
</style>

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

/* dots mask */
.dots::view-transition-new(root) {
  -webkit-mask: radial-gradient(#fff calc(1% * var(--seed)), transparent calc(1% * var(--seed)));
  mask: radial-gradient(#fff calc(1% * var(--seed)), transparent calc(1% * var(--seed)));
  -webkit-mask-size: 80px 80px;
  mask-size: 80px 80px;
}

.dots.dark::view-transition-old(root) {
   -webkit-mask: radial-gradient(transparent calc(1% * var(--seed)), #000 calc(1% * var(--seed)));
   mask: radial-gradient(transparent calc(1% * var(--seed)), #000 calc(1% * var(--seed)));
   -webkit-mask-size: 80px 80px;
   mask-size: 80px 80px;
}

/* shutters mask */
.shutters::view-transition-new(root) {
  -webkit-mask: linear-gradient(to right, #fff calc(1% * var(--seed)), transparent calc(1% * var(--seed)));
  mask: linear-gradient(to right, #fff calc(1% * var(--seed)), transparent calc(1% * var(--seed)));
  -webkit-mask-size: 80px;
  mask-size: 80px;
}

.shutters.dark::view-transition-old(root) {
  -webkit-mask: linear-gradient(to right, transparent calc(1% * var(--seed)), #000 calc(1% * var(--seed)));
  mask: linear-gradient(to right, transparent calc(1% * var(--seed)), #000 calc(1% * var(--seed)));
  -webkit-mask-size: 80px;
  mask-size: 80px;
}
</style>
