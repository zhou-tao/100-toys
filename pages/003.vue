<script setup lang="ts">
  import VisualAudio from '@/utils/audio'

  definePageMeta({
    name: 'Sound',
    title: '003',
    time: '2023/11/10'
  })

  const playing = ref(false)
  const audio = ref<HTMLAudioElement>()
  const canvas = ref<HTMLCanvasElement>()
  const isMedia = ref(false)

  const playerSize = computed(() => isMedia.value ? 300 : 400)

  onMounted(() => {
    isMedia.value = document.documentElement.clientWidth <= 600
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
  <div class="container" :style="{ width: `${playerSize}px`, height: `${playerSize}px` }" relative bg-white dark:bg-black>
    <canvas ref="canvas" :width="playerSize" :height="playerSize" />
    <div class="player animate-spin" :style="{ 'animation-play-state': playing ? 'running' : 'paused' }" w120px h120px bg-zinc1 absolute z2 rounded-full cursor-pointer border="6 solid zinc3" @click="toggleAudio">
      <img src="~/assets/images/poster.png" title="The Climb" alt="The Climb" height="80" rounded-full>
    </div>
    <div class="icon" :style="{ opacity: playing ? 0 : 0.7 }" i-ri-play-circle-line absolute z3 w60px h60px text="zinc" pointer-events-none transition-all ease-in-out duration-300 />
  </div>
</template>

<style scoped>
.container {
  margin: 0 auto;
}

.player {
  top: calc(50% - 60px);
  left: calc(50% - 60px);
  animation-duration: 8s;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

img {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.icon {
  top: calc(50% - 30px);
  left: calc(50% - 30px);
}
</style>
