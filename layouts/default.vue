<script setup lang="ts">
  const route = useRoute()
  useHead({
    title: `100 tools${route.meta.title ? ` - ${route.meta.title}` : ''}`,
    meta: [{ property: 'description', content: `100 tools for ${route.meta.title}` }]
  })
</script>

<template>
  <div>
    <h1>LAYOUT</h1>
    <slot />
  </div>
</template>
