import type { Storage } from '../enums'

export const setStorage = (key: Storage, value: any) => {
  if (typeof localStorage === 'undefined') return
  localStorage[key] = value
}

export const getStorage = (key: Storage) => {
  if (typeof localStorage === 'undefined') return undefined
  return localStorage[key]
}
