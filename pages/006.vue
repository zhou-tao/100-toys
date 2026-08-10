<script setup lang="ts">
  definePageMeta({
    name: 'Virtual List',
    title: '006',
    time: '2026/07/26'
  })

  interface Item {
    id: number
    name: string
    role: string
    motto: string
    hue: number
    initial: string
  }

  const FIRST_NAMES = ['Aria', 'Kai', 'Leo', 'Mia', 'Nova', 'Ray', 'Sky', 'Zoe', 'Finn', 'Ivy', 'Owen', 'Luna', 'Max', 'Ada', 'Jules', 'Iris', 'Felix', 'Nora', 'Theo', 'Wren']
  const LAST_NAMES = ['Chen', 'Park', 'Reed', 'Vale', 'Khan', 'Lopez', 'Okafor', 'Singh', 'Mori', 'Costa', 'Hale', 'Ito', 'Diaz', 'Roux', 'Berg', 'Nair', 'Cohen', 'Voss']
  const ROLES = ['Frontend Engineer', 'Backend Engineer', 'Product Designer', 'Product Manager', 'DevOps Engineer', 'Data Scientist', 'QA Engineer', 'Tech Lead', 'Mobile Engineer', 'Solutions Architect', 'Growth Engineer', 'Security Engineer']
  const MOTTOS = ['Stay curious.', 'Build for the user.', 'Less, but better.', 'Move fast, think slow.', 'Code is craft.', 'Default to action.', 'Make it simple.', 'Ship small, ship often.', 'Earn it every day.', 'Keep learning.', 'Simplicity wins.', 'Begin with why.', 'Do hard things.', 'Leave it better.']

  // 5000 行数据，仅渲染可视窗口内的少量节点（虚拟滚动）
  const TOTAL = 5000
  const ITEM_HEIGHT = 84
  const VIEW_HEIGHT = 500
  // BUFFER=1：仅预渲染极少视口外卡片。配合 CSS animation（挂载即播），
  // 让入场动画大致在卡片进入视口时播放，而非在视口外提前播完。
  // 大 BUFFER 会让动画在视口外预播，慢滚时进入视口已是静止终态（看不到动效）。
  const BUFFER = 1

  const items: Item[] = Array.from({ length: TOTAL }, (_, i) => {
    const name = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 7) % LAST_NAMES.length]}`
    return {
      id: i,
      name,
      role: ROLES[(i * 3) % ROLES.length],
      motto: MOTTOS[(i * 13) % MOTTOS.length],
      hue: (i * 47) % 360,
      initial: name.charAt(0)
    }
  })

  const viewport = ref<HTMLElement | null>(null)
  const visibleStart = ref(0)
  const visibleEnd = ref(Math.ceil(VIEW_HEIGHT / ITEM_HEIGHT) + BUFFER)

  // 入场动画：新增卡片（滚动时进入）从 opacity:0 + scale:0 transition 到 opacity:1 + scale:1。
  // 首屏卡片不播动画（直接可见），避免 SSR 水合时序问题。
  // enteringMap 记录正在播入场动画的索引，enterVer 是版本号强制 :style 重求值
  // （reactive 对象新增 key 在 :class/:style 绑定里不触发更新，需 ref bump 强制）。
  const enteringMap = reactive<Record<number, boolean>>({})
  const enterVer = ref(0)
  let prevIndices = new Set<number>()

  // 返回卡片入场样式：正在 enter 时 opacity:0+scale:0，否则不设（用 CSS 默认 opacity:1）
  function enterStyle(i: number) {
    // 读取 enterVer 建立响应式依赖，确保 bump 后 :style 重求值
    return enterVer.value >= 0 && enteringMap[i] === true
      ? { opacity: '0', transform: 'scale(0)' }
      : {}
  }

  const totalHeight = computed(() => TOTAL * ITEM_HEIGHT)
  const visibleIndices = computed(() => {
    const arr: number[] = []
    for (let i = visibleStart.value; i < visibleEnd.value; i++) arr.push(i)
    return arr
  })
  const rangeText = computed(() => `${visibleStart.value}–${visibleEnd.value} / ${TOTAL}`)

  watch(visibleIndices, (indices) => {
    const fresh: number[] = []
    for (const i of indices) {
      if (!prevIndices.has(i)) fresh.push(i)
    }
    prevIndices = new Set(indices)
    if (!fresh.length) return
    // 新增卡片设初始态（opacity:0+scale:0），bump 版本号强制 :style 重求值，
    // 下一帧移除触发 transition 到自然状态（CSS 默认 opacity:1+scale:1）
    for (const i of fresh) enteringMap[i] = true
    enterVer.value++
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        for (const i of fresh) enteringMap[i] = false
        enterVer.value++
      })
    })
  }, { flush: 'post' })

  // 用 rAF 合并一帧内的多次 scroll 事件：滚轮/触控板一格可能触发多次 scroll，
  // 合并到下一帧统一更新可见区间，避免频繁的 reactive 状态写入。
  let rafId = 0
  let pending: { start: number; end: number } | null = null

  function onScroll() {
    const el = viewport.value
    if (!el) return
    const st = el.scrollTop

    const start = Math.max(0, Math.floor(st / ITEM_HEIGHT) - BUFFER)
    const end = Math.min(TOTAL, Math.ceil((st + VIEW_HEIGHT) / ITEM_HEIGHT) + BUFFER)

    if (start !== visibleStart.value || end !== visibleEnd.value) {
      pending = { start, end }
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0
          if (!pending) return
          visibleStart.value = pending.start
          visibleEnd.value = pending.end
          pending = null
        })
      }
    }
  }

  onUnmounted(() => {
    if (rafId) cancelAnimationFrame(rafId)
  })
</script>

<template>
  <div>
    <div ref="viewport" class="viewport" @scroll.passive="onScroll">
      <div class="scenery" />
      <div class="content" :style="{ height: `${totalHeight}px` }">
        <div
          v-for="i in visibleIndices"
          :key="i"
          class="item"
          :style="[{ top: `${i * ITEM_HEIGHT}px` }, enterStyle(i)]"
        >
          <div
            class="avatar"
            :style="{ background: `linear-gradient(135deg, hsl(${items[i].hue} 70% 58%), hsl(${(items[i].hue + 40) % 360} 68% 45%))` }"
          >
            {{ items[i].initial }}
          </div>
          <div class="meta">
            <div class="row">
              <span class="name">{{ items[i].name }}</span>
              <span class="role">{{ items[i].role }}</span>
            </div>
            <div class="motto">
              "{{ items[i].motto }}"
            </div>
          </div>
          <div class="index">
            #{{ String(items[i].id).padStart(4, '0') }}
          </div>
        </div>
      </div>
      <div class="range-chip">
        {{ rangeText }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewport {
  /* 浅色（默认）：跟随应用主题，html.dark 下由下方覆盖 */
  --vp-bg: #eef0f5;
  --vp-border: rgba(15, 23, 42, 0.12);
  --scn-1: rgba(99, 102, 241, 0.22);
  --scn-2: rgba(236, 72, 153, 0.18);
  --scn-3: rgba(34, 211, 238, 0.16);
  --scn-from: #e8ebf2;
  --scn-to: #dde1ea;
  --item-border: rgba(15, 23, 42, 0.1);
  --item-bg: rgba(255, 255, 255, 0.62);
  --item-shadow: 0 4px 18px rgba(15, 23, 42, 0.08);
  --c-name: #1f2937;
  --c-role: #4b5563;
  --c-motto: #6b7280;
  --c-index: #9ca3af;
  --chip-bg: rgba(255, 255, 255, 0.6);
  --chip-border: rgba(15, 23, 42, 0.1);
  --chip-text: #374151;
  --sb-thumb: rgba(15, 23, 42, 0.18);
  --sb-thumb-hover: rgba(15, 23, 42, 0.28);

  position: relative;
  width: 100%;
  height: 500px;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid var(--vp-border);
  border-radius: 12px;
  background: var(--vp-bg);
}

/* 深色主题：html.dark 下覆盖变量，精确跟随应用主题（非 prefers-color-scheme） */
:global(html.dark) .viewport {
  --vp-bg: #0c0e14;
  --vp-border: rgba(156, 163, 175, 0.3);
  --scn-1: rgba(99, 102, 241, 0.55);
  --scn-2: rgba(236, 72, 153, 0.45);
  --scn-3: rgba(34, 211, 238, 0.4);
  --scn-from: #1a1c25;
  --scn-to: #0a0c12;
  --item-border: rgba(255, 255, 255, 0.12);
  --item-bg: rgba(255, 255, 255, 0.08);
  --item-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
  --c-name: #f4f4f5;
  --c-role: #a1a1aa;
  --c-motto: #8b8b96;
  --c-index: #52525b;
  --chip-bg: rgba(0, 0, 0, 0.35);
  --chip-border: rgba(255, 255, 255, 0.1);
  --chip-text: #d4d4d8;
  --sb-thumb: rgba(255, 255, 255, 0.15);
  --sb-thumb-hover: rgba(255, 255, 255, 0.25);
}

/* 彩色背景：为毛玻璃 backdrop-filter 提供可模糊的内容。
 * 用 sticky + height:0 + overflow:visible：sticky 粘在视口顶部随滚动固定，
 * height:0 不占文档流空间（避免把 .content 挤出视口），子背景用绝对定位撑满可见区。 */
.scenery {
  position: sticky;
  top: 0;
  height: 0;
  z-index: 0;
  pointer-events: none;
}

.scenery::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 500px;
  background:
    radial-gradient(40% 50% at 18% 18%, var(--scn-1), transparent 70%),
    radial-gradient(45% 55% at 82% 32%, var(--scn-2), transparent 70%),
    radial-gradient(50% 60% at 50% 88%, var(--scn-3), transparent 70%),
    linear-gradient(180deg, var(--scn-from), var(--scn-to));
}

.content {
  position: relative;
  z-index: 1;
}

.item {
  position: absolute;
  left: 12px;
  right: 12px;
  height: 72px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid var(--item-border);
  background: var(--item-bg);
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
  box-shadow: var(--item-shadow);
  backface-visibility: hidden;
  will-change: transform, opacity;

  /*
   * 入场动画：从卡片中心点向外缓慢扩散放大 -- 像从中心「生长」出来。
   * .item 默认 opacity:1（SSR 友好，首屏可见）。新增卡片由 watch + enterStyle() 内联设
   * opacity:0+scale:0，下一帧移除触发 transition 到自然状态。首屏卡片不播动画，规避 SSR 问题。
   */
  transform-origin: center center;
  transition:
    transform 480ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 320ms ease-out;
}

.avatar {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
  font-size: 18px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.meta {
  flex: 1 1 auto;
  min-width: 0;
}

.row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.name {
  font-weight: 600;
  font-size: 15px;
  color: var(--c-name);
}

.role {
  font-size: 12px;
  color: var(--c-role);
}

.motto {
  margin-top: 2px;
  font-size: 12px;
  color: var(--c-motto);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.index {
  flex: 0 0 auto;
  font-size: 11px;
  color: var(--c-index);
  font-variant-numeric: tabular-nums;
}

.range-chip {
  position: absolute;
  top: 8px;
  right: 10px;
  z-index: 2;
  padding: 2px 8px;
  font-size: 11px;
  color: var(--chip-text);
  background: var(--chip-bg);
  border: 1px solid var(--chip-border);
  border-radius: 999px;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  pointer-events: none;
  font-variant-numeric: tabular-nums;
}

.viewport::-webkit-scrollbar {
  width: 8px;
}

.viewport::-webkit-scrollbar-thumb {
  background: var(--sb-thumb);
  border-radius: 4px;
}

.viewport::-webkit-scrollbar-thumb:hover {
  background: var(--sb-thumb-hover);
}

.viewport::-webkit-scrollbar-track {
  background: transparent;
}

@media (prefers-reduced-motion: reduce) {
  .item {
    transition: none !important;
  }
}
</style>
