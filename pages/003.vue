<script setup lang="ts">
  import VisualAudio from '@/utils/visualAudio'

  definePageMeta({
    name: 'Sound',
    title: '003',
    time: '2023/11/10'
  })

  const playing = ref(false)
  const audio = ref<HTMLAudioElement>()
  const canvas = ref<HTMLCanvasElement>()

  onMounted(() => {
    const audioVisualization = new VisualAudio(audio.value!, canvas.value!)
    audio.value!.addEventListener('play', () => {
      audioVisualization.play()
    })

    audio.value!.addEventListener('pause', () => {
      audioVisualization.stop()
    })

    audio.value!.addEventListener('ended', () => {
      audioVisualization.stop()
    })
  })

  function toggleAudio() {
    if (!audio.value) return
    if (audio.value.paused) {
      audio.value.play()
      playing.value = true
    }
    else {
      playing.value = false
      audio.value.pause()
    }
  }
</script>

<template>
  <audio ref="audio" loop src="/mp3/The Climb - Miley Cyrus.mp3" />
  <div class="container" w="600px" relative bg-white dark:bg-black>
    <canvas ref="canvas" width="600" height="600" />
    <div class="player animate-spin" :style="{ 'animation-play-state': playing ? 'running' : 'paused' }" w120px h120px absolute z2 rounded-full border="24 #27272A solid" op60 cursor-pointer @click="toggleAudio">
      <img src="~/assets/images/poster.png" alt="The Climb" height="120" rounded-full ml-35px>
    </div>
    <div class="icon" :style="{ opacity: playing ? 0 : 0.7 }" i-ri-play-circle-line absolute z3 w60px h60px text="#71717A60" pointer-events-none transition-all ease-in-out duration-300 />
  </div>
</template>

<style scoped>
.container {
  margin: 0 auto;
}

.player {
  top: calc(50% - 84px);
  left: calc(50% - 84px);
  animation-duration: 8s;
}

.icon {
  top: calc(50% - 30px);
  left: calc(50% - 30px);
}
</style>
