import { nextTick, ref, watch } from 'vue'
import { Storage, Theme } from '../enums'
import { getStorage, setStorage } from './useStorage'

export const isDark = ref(getStorage(Storage.THEME) === Theme.DARK)

export function toggleDark(e: MouseEvent) {
  // @ts-expect-error experimental API
  const isAppearanceTransition = document.startViewTransition
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const setDarkValue = () => {
    isDark.value = !isDark.value
    setStorage(Storage.THEME, isDark.value ? Theme.DARK : Theme.LIGHT)
  }
  if (!isAppearanceTransition) {
    setDarkValue()
    return
  }
  const x = e.clientX
  const y = e.clientY
  const endRadius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y)
  )
  // @ts-expect-error: Transition API
  const transition = document.startViewTransition(async () => {
    setDarkValue()
    await nextTick()
  })
  transition.ready
    .then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`
      ]
      document.documentElement.animate(
        {
          clipPath: isDark.value
            ? [...clipPath].reverse()
            : clipPath
        },
        {
          duration: 400,
          easing: 'ease-out',
          pseudoElement: isDark.value
            ? '::view-transition-old(root)'
            : '::view-transition-new(root)'
        }
      )
    })
}

watch(isDark, (v) => {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('class', v ? Theme.DARK : '')
}, {
  immediate: true
})

// SSG 输出的 HTML 里 html 没有 dark class（SSR 时 localStorage/document 不可用）。
// 客户端启动后从 localStorage 读取真实主题并同步到 html，确保深色模式正确应用。
if (typeof window !== 'undefined') {
  const stored = getStorage(Storage.THEME)
  isDark.value = stored === Theme.DARK
}
