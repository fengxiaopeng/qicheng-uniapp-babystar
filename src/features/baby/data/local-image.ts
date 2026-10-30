import { MAX_SCRATCH_IMAGE_LENGTH } from '../domain/rules'

/** Convert temporary platform files into a durable local data URI. Never persist blob/temp paths. */
export async function chooseRewardImage(): Promise<string | null> {
  let result: UniApp.ChooseImageSuccessCallbackResult
  try {
    result = await uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    })
  }
  catch (error) {
    if (String((error as { errMsg?: string })?.errMsg).includes('cancel'))
      return null
    throw new Error('无法读取图片，请检查相册权限后重试')
  }
  const path = result.tempFilePaths[0]
  let data = ''
  // #ifdef H5
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image()
    element.onload = () => resolve(element)
    element.onerror = () =>
      reject(new Error('图片无法打开，请选择 JPG、PNG 或 WebP 图片'))
    element.src = path
  })
  const ratio = Math.min(
    1,
    1000 / Math.max(image.naturalWidth, image.naturalHeight),
  )
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
  const context = canvas.getContext('2d')
  if (!context)
    throw new Error('当前设备无法处理图片')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  data = canvas.toDataURL('image/jpeg', 0.78)
  // #endif
  // #ifndef H5
  const compressed = await uni.compressImage({ src: path, quality: 65 })
  const base64 = await new Promise<string>((resolve, reject) => {
    uni.getFileSystemManager().readFile({
      filePath: compressed.tempFilePath,
      encoding: 'base64',
      success: file =>
        typeof file.data === 'string'
          ? resolve(file.data)
          : reject(new Error('图片格式不支持')),
      fail: () => reject(new Error('无法保存图片，请重新选择')),
    })
  })
  const mime = base64.startsWith('iVBOR')
    ? 'png'
    : base64.startsWith('UklGR')
      ? 'webp'
      : 'jpeg'
  data = `data:image/${mime};base64,${base64}`
  // #endif
  if (data.length > MAX_SCRATCH_IMAGE_LENGTH)
    throw new Error('这张图片太大，请选择更小的图片后重试')
  return data
}
