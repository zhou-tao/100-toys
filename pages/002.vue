<script setup lang="ts">
  import Particle from '@/utils/particle'

  definePageMeta({
    name: 'Particle',
    title: '002',
    time: '2023/11/07'
  })

  const container = ref(null)
  const instance = ref<Particle>()

  onMounted(() => {
    const isDarkTheme = document.documentElement.classList.contains('dark')
    const color = isDarkTheme ? '255,255,255' : '0,0,0'
    instance.value = new Particle(container.value!, {
      color,
      pointColor: color
    })
  })

  onUnmounted(() => {
    instance.value?.destroy()
  })
</script>

<template>
  <div ref="container" w-full h-500px border="solid 1 gray" />
</template>
