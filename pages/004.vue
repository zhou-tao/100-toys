<script setup lang="ts">
  import { bubbleSort } from '@/utils/sort'

  definePageMeta({
    name: 'Sort',
    title: '004',
    time: '2024/01/19'
  })

  const BAR_WIDTH = 60
  const GAP_WIDTH = 60

  const nums = ref([4, 1, 7, 3, 2, 6])
  const step = ref(0)
  const actives = ref()
  const running = ref(false)
  const randomColors = ['#ff9ff3', '#feca57', '#ff6b6b', '#48dbfb', '#1dd1a1', '#54a0ff']

  const bars = ref([] as any[])

  let timer: NodeJS.Timeout | null = null

  const actions = computed(() => bubbleSort(nums.value))

  watch(nums, (v) => {
    step.value = 0
    actives.value = []
    bars.value = v.map((v, i) => ({
      id: i,
      value: v,
      left: `${(BAR_WIDTH + GAP_WIDTH) * i}px`,
      width: `${BAR_WIDTH}px`,
      height: getHeight(v),
      background: randomColors[i % randomColors.length]
    }))
  }, {
    immediate: true,
    deep: true
  })

  watch(step, (v) => {
    v && executeSort(v)
  })

  function getHeight(value: number) {
    if (!Array.isArray(nums.value) || !nums.value.length) return 0
    const max = Math.max(...nums.value)
    return `${(value / max) * 500 * 0.8}px`
  }

  function togglePlay() {
    running.value = !running.value
    if (!running.value && timer) {
      clearInterval(timer!)
      timer = null
      return
    }
    timer = setInterval(() => {
      if (step.value === actions.value.length) {
        clearInterval(timer!)
        timer = null
        actives.value = null
        running.value = false
        return
      }
      step.value++
    }, 1500)
  }

  function executeSort(step: number) {
    const action = actions.value[step - 1]
    if (action.type === 'select') {
      actives.value = action.targets
    }
    else {
      const [a, b] = action.targets
      const aIndex = bars.value.findIndex(bar => bar.value === a)
      const bIndex = bars.value.findIndex(bar => bar.value === b)
      // 交换位置
      const temp = bars.value[aIndex].left
      bars.value[aIndex].left = bars.value[bIndex].left
      bars.value[bIndex].left = temp
      bars.value = [...bars.value]
    }
  }
</script>

<template>
  <div w-full h-500px relative border="solid 1 gray" overflow-hidden>
    <div v-for="({ id, value, ...style }) in bars" :key="id" class="num-bar" :style="style" :class="{ active: actives && actives.includes(value) }">
      {{ value }}
    </div>
    <div class="toolbar">
      <input
        v-for="(num, index) in nums"
        :key="index"
        v-model.number="nums[index]"
        :disabled="running" type="number"
        :style="{ backgroundColor: randomColors[index] }"
      >
      <div>
        <button :disabled="running || step <= 0" @click="step--">
          <div i-ri-arrow-left-s-line />
        </button>
        <button @click="togglePlay">
          <div v-if="running" i-ri-pause-circle-line />
          <div v-else i-ri-play-circle-line />
        </button>
        <button :disabled="running || step >= actions.length" @click="step++">
          <div i-ri-arrow-right-s-line />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .num-bar {
    @apply absolute bottom-0 text-center pt1 text-2xl font-bold transition-all-300 transition-ease-linear;

    &.active {
      filter: drop-shadow(4px 8px 10px #999) contrast(200%);
    }
  }

  .toolbar {
    @apply absolute right-0 top-0 z2 b b-light b-solid;

    input {
      @apply w12 h5 text-center text-sm outline-none border-none p0;
    }

    input[disabled] {
      @apply cursor-not-allowed;
    }

    button {
      @apply text-center w24 py1 cursor-pointer border-none;
    }

    button[disabled] {
      @apply cursor-not-allowed bg-zinc-2;
    }
  }

  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
      -moz-appearance:textfield;
  }
</style>
