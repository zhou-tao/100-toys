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
    <div i-ri-arrow-left-s-line w10 h10 ml="8 <sm:-2" mt="<sm:-1" text="#9CA3AF" class="link" @click="router.go(-1)" />
    <div class="toy" w-full max-w-760px my-8 mx-auto relative>
      <slot />
    </div>
    <ToolMenu />
  </div>
</template>
