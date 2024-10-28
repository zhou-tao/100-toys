enum ActionType {
  SELECT = 'select',
  SWAP = 'swap'
}

interface Action {
  type: ActionType
  targets: Number[]
}

// 冒泡排序
export function bubbleSort(nums: Number[]): Action[] {
  const actions = []
  const copyNums = [...nums]
  const len = copyNums.length
  for (let i = 0; i < len - 1; ++i) {
    for (let j = 0; j < len - 1 - i; ++j) {
      actions.push({ type: ActionType.SELECT, targets: [copyNums[j], copyNums[j + 1]] })
      if (copyNums[j] > copyNums[j + 1]) {
        [copyNums[j], copyNums[j + 1]] = [copyNums[j + 1], copyNums[j]]
        actions.push({ type: ActionType.SWAP, targets: [copyNums[j], copyNums[j + 1]] })
      }
    }
  }
  return actions
}

// 快速排序
export function quickSort(nums: Number[]) {

}

// 选择排序
export function selectionSort(nums: Number[]) {

}

// 插入排序
export function insertSort(nums: Number[]) {

}

// 归并排序
export function mergeSort(nums: Number[]) {

}

// 堆排序
export function heapSort(nums: Number[]) {

}
