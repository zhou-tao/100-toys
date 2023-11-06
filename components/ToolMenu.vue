<script setup lang="ts">
  const collapsed = ref(false)
</script>

<template>
  <nav class="tool" absolute top="16 <sm:15" right="16 <sm:8" rounded-full>
    <div :class="`hamburger ${collapsed ? 'collapsed' : ''}`" relative h7 w7 flex justify-center items-center cursor-pointer @click="collapsed = !collapsed">
      <div class="line" />
    </div>
    <!-- <ul>
      <li class="menu-item">
        <div i-ri-github-line />
      </li>
      <li class="menu-item">
        <div i-ri-information-line />
      </li>
      <li class="menu-item">
        <div i-ri-refresh-line />
      </li>
    </ul> -->
  </nav>
</template>

<style scoped>
.hamburger {
  @apply op60 transition-all ease-in-out duration-150 hover:op100;
}
.line {
  @apply relative w5.5 h0.75 bg-#9CA3AF;
}

.line::before,
.line::after {
  content: '';
  transform-origin: 90%;
  @apply absolute inline-block w5.5 h0.75 bg-#9CA3AF rotate-x-0 transition-transform ease-in-out duration-300;
}

.line::before {
  @apply bottom-8px;
}

.line::after {
  @apply top-8px;
}

.collapsed .line {
  @apply bg-transparent;
}

.collapsed .line::before {
  @apply rotate--45deg bottom-6.5px;
}

.collapsed .line::after {
  @apply rotate-45deg top-6.5px;
}
</style>
