<script setup lang="ts">
  const route = useRoute()
  const router = useRouter()
  useHead({
    title: `100 toys${route.meta.title ? ` - ${route.meta.title}.${route.meta.name}` : ''}`,
    meta: [{ property: 'description', content: `100 toys of the ${route.meta.name}` }]
  })
</script>

<template>
  <div relative h-screen px8 py15 box-border>
    <div i-ri-arrow-left-s-line w6 h6 class="link" @click="router.go(-1)" />
    <div class="toy">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="css">
.toy {
  @apply w-full max-w-760px my-8 mx-auto;
}
</style>
