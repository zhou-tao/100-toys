<script setup lang="ts">
  import { bubbleSort } from '@/utils/sort'

  definePageMeta({
    name: 'Sort',
    title: '004',
    time: '2024/01/19'
  })

  const nums = ref([4, 1, 7, 3, 2, 6])
  const step = ref(-1)
  const actives = ref()

  const actions = bubbleSort(nums.value)

  const randomColors = ['#ff9ff3', '#feca57', '#ff6b6b', '#48dbfb', '#1dd1a1', '#54a0ff']

  const bars = ref(
    nums.value.map((v, i) => ({ id: i, value: v, left: `${5 * i}rem`, height: getHeight(v), background: randomColors[i % randomColors.length] }))
  )

  function getHeight(value: number) {
    if (!Array.isArray(nums.value) || !nums.value.length) return 0
    const max = Math.max(...nums.value)
    return `${(value / max) * 500 * 0.8}px`
  }

  function handleRun() {
    nums.value = [4, 1, 7, 3, 2, 6]
    let timer: NodeJS.Timeout | null = null
    timer = setInterval(() => {
      if (step.value === actions.length - 1) {
        clearInterval(timer!)
        actives.value = null
        return
      }
      step.value++
    }, 1500)
  }

  function execute(step: number) {
    const action = actions[step]
    if (action.type === 'select') {
      actives.value = action.targets
    }
    else {
      const [a, b] = action.targets
      const aIndex = bars.value.findIndex(bar => bar.value === a)
      const bIndex = bars.value.findIndex(bar => bar.value === b)
      const temp = bars.value[aIndex].left
      bars.value[aIndex].left = bars.value[bIndex].left
      bars.value[bIndex].left = temp
      bars.value = [...bars.value]
    }
  }

  watch(step, (v) => {
    execute(v)
  })
</script>

<template>
  <div w-full h-500px relative border="solid 1 gray">
    <div v-for="({ id, value, ...style }) in bars" :key="id" class="num-bar" :style="style" :class="{ active: actives && actives.includes(value) }">
      {{ value }}
    </div>
  </div>

  <div class="toolbar">
    <button mt2 py2 px4 @click="handleRun">
      start
    </button>
  </div>
</template>

<style scoped>
  .num-bar {
    @apply absolute w10 bottom-0 text-center pt1 text-2xl font-bold transition-all-300 transition-ease-linear;

    &.active {
      @apply b-solid b-4 b-black;
    }
  }

  .toolbar {
    @apply flex justify-center;
  }
</style>
