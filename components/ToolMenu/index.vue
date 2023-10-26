<script setup lang="ts">
  const collapsed = ref(false)
</script>

<template>
  <div class="tool" fixed z-999 bottom-24 right-24 w-12 h-12 rounded-full>
    <div :class="`hamburger ${collapsed ? 'collapsed' : ''}`" relative h-full flex justify-center items-center cursor-pointer @click="collapsed = !collapsed">
      <div class="line" />
    </div>
  </div>
</template>

<style scoped>
.hamburger {
  @apply op60 transition-all ease-in-out duration-150 hover:op100;
}
.line {
  @apply relative w8 h1 rounded bg-gray transition-all ease-in-out duration-150;
}

.line::before,
.line::after {
  content: '';
  transform: rotateX(0);
  transform-origin: center right;
  @apply absolute inline-block w8 h1 rounded bg-gray transition-all ease-in-out duration-300;
}

.line::before {
  bottom: 11px;
}

.line::after {
  top: 11px;
}

.collapsed .line {
  @apply bg-transparent;
}

.collapsed .line::before {
  transform: rotate(-44deg);
}

.collapsed .line::after {
  transform: rotate(44deg);
}
</style>
