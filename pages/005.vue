<script setup lang="ts">
  import CodeRain from '~/utils/code-rain'

  definePageMeta({
    name: 'Code Rain',
    title: '005',
    time: '2024/12/14'
  })

  const container = ref(null)
  const instance = ref<CodeRain>()

  onMounted(() => {
    instance.value = new CodeRain(container.value!)
  })

  onUnmounted(() => {
    instance.value?.destroy()
  })
</script>

<template>
  <div ref="container" w-full h-500px border="solid 1 gray" />
</template>
