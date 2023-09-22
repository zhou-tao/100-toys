<script setup lang="ts">
  const route = useRoute()
  const title = computed(() => route.meta.title)
  const name = computed(() => route.meta.name)
  useHead({
    title: `100 toys${title.value ? ` - ${title.value}.${name.value}` : ''}`,
    meta: [{ property: 'description', content: `${name.value}` }]
  })
</script>

<template>
  <div>
    <h1>LAYOUT</h1>
    <slot />
  </div>
</template>
