<script setup lang="ts">
  withDefaults(defineProps<{
    title: string
    type?: 'success' | 'info' | 'warning' | 'error'
  }>(), {
    type: 'success'
  })

  function handleClose(e: Event) {
    const alertEl = (e.currentTarget as HTMLElement).parentNode as HTMLDivElement
    alertEl.style.display = 'none'
  }
</script>

<template>
  <div :class="`alert alert--${type}`">
    <span>{{ title }}</span>
    <div i-ri-close-fill cursor-pointer flex-shrink-0 @click="handleClose" />
  </div>
</template>

<style scoped>
.alert {
  @apply fixed bottom-15 left-1/2 translate-x--1/2 flex items-center justify-between px4 py2 rounded-full border-solid border-1 border-zinc7;
}

@media (max-width: 639.9px) {
  .alert {
    width: 240px;
  }
}

.alert--success {
  background-color: rgba(21, 128, 61, 0.1);
  @apply border-green7 text-green7;
}
.alert--warning {
  background-color: rgba(194, 65, 12, 0.1);
  @apply border-orange7 text-orange7;
}
.alert--error {
  background-color: rgba(190, 18, 60, 0.1);
  @apply border-rose7 text-rose7;
}
</style>
