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
  <div class="container" w="600px <sm:320px" h="600px <sm:320px" relative bg-black border="solid 1 gray">
    <canvas ref="canvas" />
    <div class="player animate-spin" :style="{ 'animation-play-state': playing ? 'running' : 'paused' }" w120px h120px absolute z2 rounded-full border="24 #27272A solid" op60 cursor-pointer @click="toggleAudio">
      <img src="~/assets/images/mp3_poster.png" alt="The Climb" width="120" rounded-full>
    </div>
    <div class="icon" :style="{ opacity: playing ? 0 : 0.7 }" i-ri-play-circle-line absolute z3 w60px h60px text="#71717A" pointer-events-none transition-all ease-in-out duration-300 />
  </div>
</template>

<style scoped>
canvas {
  width: 100%;
  height: 100%;
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
