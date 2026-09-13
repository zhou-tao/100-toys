<script setup lang="ts">
  import { DEFAULT_FINISH, FINISHES } from '@/utils/iphone-duo/spec'
  import type { DuoViewer } from '@/utils/iphone-duo/viewer'

  definePageMeta({
    name: 'iPhone Duo',
    title: '007',
    time: '2026/09/11'
  })

  const stage = ref<HTMLElement | null>(null)
  const canvasEl = ref<HTMLCanvasElement | null>(null)

  const viewer = shallowRef<DuoViewer | null>(null)
  const fold = ref(180)
  const ready = ref(false)
  const failure = ref('')
  const finish = ref(DEFAULT_FINISH)

  onMounted(async () => {
    if (!canvasEl.value || !stage.value) return
    try {
      const { createDuoViewer } = await import('@/utils/iphone-duo/viewer')
      viewer.value = createDuoViewer({
        canvas: canvasEl.value,
        container: stage.value,
        onFold: (v) => {
          fold.value = v
        },
        onHover: (v) => {
          hovering.value = v
        }
      })
      // 让配色状态与 viewer 的初始配色保持一致（否则默认高亮的色块与机身不符）
      viewer.value.setFinish(finish.value)
      // 等首帧真正画出来再收起加载动效
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
      ready.value = true
    }
    catch (e) {
      // WebGL 不可用或初始化失败时给出提示，避免只留一块空白舞台
      failure.value = e instanceof Error ? e.message : String(e)
      console.error('[iphone-duo]', e)
    }
  })

  onUnmounted(() => {
    viewer.value?.dispose()
    viewer.value = null
  })

  function onSlider(e: Event) {
    viewer.value?.setFold(Number((e.target as HTMLInputElement).value))
  }

  function toggleFold() {
    viewer.value?.toggleFold()
  }

  function pickFinish(key: string) {
    finish.value = key
    viewer.value?.setFinish(key)
  }
</script>

<template>
  <div class="duo">
    <div ref="stage" class="stage">
      <canvas ref="canvasEl" class="stage-canvas" />
      <div class="colors">
        <button
          v-for="f in FINISHES"
          :key="f.key"
          class="swatch"
          :class="{ on: finish === f.key }"
          :style="{ background: f.frame }"
          :title="f.name"
          @click="pickFinish(f.key)"
        />
      </div>
      <div v-if="!ready && !failure" class="loading">
        <div class="spinner">
          <i style="transform: rotate(0deg); animation-delay: 0.000s" />
          <i style="transform: rotate(45deg); animation-delay: -0.125s" />
          <i style="transform: rotate(90deg); animation-delay: -0.250s" />
          <i style="transform: rotate(135deg); animation-delay: -0.375s" />
          <i style="transform: rotate(180deg); animation-delay: -0.500s" />
          <i style="transform: rotate(225deg); animation-delay: -0.625s" />
          <i style="transform: rotate(270deg); animation-delay: -0.750s" />
          <i style="transform: rotate(315deg); animation-delay: -0.875s" />
        </div>
        <span>正在加载模型…</span>
      </div>
      <div v-if="failure" class="failure">
        3D 初始化失败：{{ failure }}
      </div>
    </div>

    <div class="panel">
      <button class="btn primary" @click="toggleFold">
        {{ fold > 90 ? '折叠' : '展开' }}
      </button>
      <input
        class="slider"
        type="range"
        min="0"
        max="180"
        step="1"
        :value="Math.round(fold)"
        @input="onSlider"
      >
      <span class="readout">{{ Math.round(fold) }}°</span>
    </div>
  </div>
</template>

<style scoped>
.duo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 92px;
}

/* iOS 风格加载动效：8 根渐隐辐条 */
.loading {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: linear-gradient(180deg, #fbfbfd, #f2f2f6);
  transition: opacity 0.5s ease;
}

.loading span {
  font-size: 13px;
  color: #86868b;
}

.spinner {
  position: relative;
  width: 34px;
  height: 34px;
}

.spinner i {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 3px;
  height: 9px;
  margin: -17px 0 0 -1.5px;
  border-radius: 1.5px;
  background: #86868b;
  transform-origin: 50% 17px;
  animation: ios-spin 1s linear infinite;
}

@keyframes ios-spin {
  0% { opacity: 1; }
  100% { opacity: 0.12; }
}

.stage {
  position: relative;
  width: 100%;
  height: clamp(340px, 54vh, 560px);
  border-radius: 18px;
  overflow: hidden;
  background: linear-gradient(180deg, #fbfbfd, #f2f2f6);
}

.stage-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}

/* 颜色选择：竖排覆盖在舞台右缘（手机右侧） */
.colors {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 14px;
  z-index: 3;
}

.swatch {
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: transform 200ms ease, box-shadow 200ms ease;
}

.swatch:hover {
  transform: scale(1.12);
}

.swatch.on {
  box-shadow: 0 0 0 2px #fff, 0 0 0 3.5px #0071e3;
}

.failure {
  position: absolute;
  inset: auto 16px 16px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.5;
  color: #fca5a5;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(248, 113, 113, 0.35);
  word-break: break-all;
}

.panel {
  margin-bottom: 22px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 18px;
  border-radius: 14px;
  background: #f5f5f7;
}

.btn {
  font: inherit;
  font-size: 13px;
  color: #1d1d1f;
  background: #fff;
  border: 1px solid #d2d2d7;
  border-radius: 980px;
  padding: 7px 16px;
  cursor: pointer;
  transition: all 200ms ease;
  white-space: nowrap;
}

.btn:hover {
  background: #1d1d1f;
  color: #fff;
  border-color: #1d1d1f;
}

.btn.primary {
  font-weight: 600;
}

.slider {
  flex: 1;
  height: 4px;
  appearance: none;
  background: #d2d2d7;
  border-radius: 999px;
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #1d1d1f;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  cursor: grab;
}

.slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #1d1d1f;
  border: 2px solid #fff;
  cursor: grab;
}

.readout {
  min-width: 44px;
  text-align: right;
  font-size: 12px;
  color: #6e6e73;
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
  .btn,
  .swatch {
    transition: none !important;
  }
}
</style>
