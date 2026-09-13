/**
 * iPhone Duo（书本式折叠 iPhone）1:1 规格，参照 apple.com.cn/iphone-duo。
 * 单位：毫米，Three.js 场景中 1 unit = 1mm。
 *
 * 坐标约定（展开态）：
 *   +X 向右、+Y 向上、+Z 朝向内屏前方；折叠轴 = 过原点的 Y 轴，
 *   且折叠轴正好位于内屏表面所在的平面上（合上时两块机身分列轴两侧，内屏绕轴卷成小圆角）。
 *   左半机 x ∈ [-OUTER_X, -INNER_EDGE]，右半机 x ∈ [INNER_EDGE, OUTER_X]，
 *   厚度方向 z ∈ [-HALF_T, 0]（内屏面 z=0，背面 z=-HALF_T）。
 */

/** 单侧宽度（折叠后即整机宽度；官网半机比普通 iPhone 更宽） */
export const HALF_W = 74.6
/** 整机高度 */
export const HALF_H = 133
/** 单侧厚度（折叠后整机 2×HALF_T + 折痕间隙） */
export const HALF_T = 5
/** 展开时两半内边缘到折叠轴的距离（留出内屏折痕的卷绕空间） */
export const INNER_EDGE = 1.9
/** 机身平面（正视图）圆角半径（仅外缘两角） */
export const BODY_R = 11.6
/** 折叠缘两角的圆角（近乎直角，仅留微小倒角） */
export const INNER_CORNER_R = 0.25
/** 中框前后倒角宽度 */
export const FRAME_BEVEL = 0.6
/** 前盖玻璃相对机身轮廓内缩量 */
export const GLASS_INSET = 0.7
/** 前盖玻璃厚度 */
export const GLASS_T = 0.5
/** 折叠轴到单侧外缘的距离 */
export const OUTER_X = HALF_W + INNER_EDGE

/* ---------------- 内屏（7.6 英寸级连续可折叠屏） ---------------- */
/** 内屏显示区四边内缩：外侧 / 上下 */
export const INNER_INSET_SIDE = 3
export const INNER_INSET_V = 3.6
/** 内屏显示区尺寸与对角线（英寸） */
export const INNER_W = OUTER_X * 2 - INNER_INSET_SIDE * 2
export const INNER_H = HALF_H - INNER_INSET_V * 2
export const INNER_INCH = Math.hypot(INNER_W, INNER_H) / 25.4
/** 内屏显示区圆角 */
export const INNER_R = 8.5
/** 内屏玻璃轮廓：相对机身轮廓内缩量与圆角 */
export const PANEL_INSET = 1.1
export const PANEL_R = BODY_R - PANEL_INSET
/** 内屏折痕：卷绕半径与弯曲过渡带半宽 */
export const FOLD_RADIUS = 1.2
export const FOLD_WIDTH = 2.6

/* ---------------- 外屏（5.4 英寸，位于右半机背面） ---------------- */
export const COVER_W = 64.4
export const COVER_H = 121.5
export const COVER_INCH = Math.hypot(COVER_W, COVER_H) / 25.4
/** 外屏相对右半机背面的位置 */
export const COVER_CX = 0
export const COVER_CY = 0
export const COVER_R = 8.6
/** 外屏打孔摄像头半径与位置（距显示区右缘/顶部） */
export const COVER_HOLE_R = 1.35
export const COVER_HOLE_X = 5.2
export const COVER_HOLE_Y = 3.4

/** 半机几何中心到折叠轴的距离（右半机取正、左半机取负） */
export const BODY_CX = (OUTER_X + INNER_EDGE) / 2

export interface Finish {
  key: string
  name: string
  /** 中框（钛金属）颜色 */
  frame: string
  frameRoughness: number
  /** 背板玻璃颜色 */
  back: string
  backRoughness: number
  /** 配套壁纸（官网每种配色对应专属壁纸） */
  wallpaper: string
}

/** 机身配色：参照官网的夜空色 / 星光白色，另附两种钛金属色 */
export const FINISHES: Finish[] = [
  { key: 'starlight', name: '星光白色', frame: '#e3dfd7', frameRoughness: 0.16, back: '#eae7e0', backRoughness: 0.42, wallpaper: 'dune' },
  { key: 'midnight', name: '夜空色', frame: '#2c2f36', frameRoughness: 0.2, back: '#121419', backRoughness: 0.44, wallpaper: 'midnight' }
]

export const DEFAULT_FINISH = 'starlight'
