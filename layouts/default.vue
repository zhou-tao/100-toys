<template>
  <div relative h-screen px8 py="15 <sm:8" box-border>
    <div i-ri-arrow-left-s-line w10 h10 ml="8 <sm:-2" mt="<sm:-1" text-base class="link" @click="$router.replace('/')" />
    <div class="toy" w-full max-w-760px my-8 mx-auto relative>
      <slot />
    </div>
    <Toolbar />
  </div>
</template>
