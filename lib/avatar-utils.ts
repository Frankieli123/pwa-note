/**
 * 头像生成工具函数
 * 为用户生成一致的、随机的头像
 */

// 支持的头像风格 - 只使用两种风格
export const AVATAR_STYLES = [
  'lorelei',
  'notionists'
] as const
export type AvatarStyle = typeof AVATAR_STYLES[number]

// 头像配置类型
export interface AvatarConfig {
  style: AvatarStyle
  seed: string
}

/**
 * 为新用户生成随机头像配置
 * 每次调用都会生成不同的配置
 */
export function generateRandomAvatarConfig(): AvatarConfig {
  // 随机选择风格
  const randomStyle = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)]
  
  // 生成唯一的随机种子
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const seed = `${timestamp}_${randomStr}`
  
  return {
    style: randomStyle,
    seed: seed
  }
}

/**
 * 基于用户ID生成确定性头像配置（向后兼容）
 * 同一个用户ID总是生成相同的头像
 */
export function generateDeterministicAvatarConfig(userId: string): AvatarConfig {
  // 基于用户ID的哈希来选择风格
  const hash = simpleHash(userId)
  const styleIndex = hash % AVATAR_STYLES.length
  
  return {
    style: AVATAR_STYLES[styleIndex],
    seed: userId
  }
}

/**
 * 根据头像配置生成头像URL
 * 使用SVG格式和更高分辨率以获得更清晰的图片
 */
export function getAvatarUrl(config: AvatarConfig, size: number = 128): string {
  // 使用2倍分辨率以获得更清晰的图片，并使用SVG格式
  const highResSize = Math.max(size * 2, 256)
  // 添加时间戳防止缓存问题（仅在seed包含时间戳时）
  const cacheBuster = config.seed.includes('_') ? `&t=${Date.now()}` : ''
  return `https://api.dicebear.com/9.x/${config.style}/svg?seed=${config.seed}&size=${highResSize}${cacheBuster}`
}

/**
 * 统一的头像获取函数
 * 支持新的配置格式和向后兼容，优先使用缓存
 */
export function getUserAvatarUrl(user: any, size: number = 128): string {
  if (!user) {
    console.log('getUserAvatarUrl: 用户为空')
    return '/placeholder-avatar.svg'
  }

  let config: AvatarConfig | null = null

  // 如果用户有新的头像配置（临时预览或从数据库加载）
  if (user.avatarConfig?.seed && user.avatarConfig?.style) {
    config = user.avatarConfig
  }
  // 如果用户对象中有从数据库加载的头像配置
  else if (user.dbAvatarConfig?.seed && user.dbAvatarConfig?.style) {
    config = user.dbAvatarConfig
  }
  // 向后兼容：如果有旧的avatar字段
  else if (user.avatar && typeof user.avatar === 'string' && user.avatar.startsWith('http')) {
    return user.avatar
  }
  // 向后兼容：基于用户ID生成确定性头像
  else {
    config = generateDeterministicAvatarConfig(user.id || user.username || 'default')
  }

  if (config) {
    // 优先使用缓存
    const cachedUrl = getCachedAvatarUrl(config, size)
    if (cachedUrl) {
      return cachedUrl
    }

    // 缓存未命中，返回原URL并异步缓存
    const originalUrl = getAvatarUrl(config, size)

    // 异步缓存图片，不阻塞当前渲染
    cacheAvatarImage(config, size).catch(error => {
      console.warn('异步缓存头像失败:', error)
    })

    return originalUrl
  }

  return '/placeholder-avatar.svg'
}

/**
 * 获取头像URL（带缓存支持的版本）
 * 优先返回缓存，如果没有缓存则异步缓存
 */
export async function getUserAvatarUrlWithCache(user: any, size: number = 128): Promise<string> {
  if (!user) {
    return '/placeholder-avatar.svg'
  }

  let config: AvatarConfig | null = null

  // 获取头像配置
  if (user.avatarConfig?.seed && user.avatarConfig?.style) {
    config = user.avatarConfig
  } else if (user.dbAvatarConfig?.seed && user.dbAvatarConfig?.style) {
    config = user.dbAvatarConfig
  } else if (user.avatar && typeof user.avatar === 'string' && user.avatar.startsWith('http')) {
    return user.avatar
  } else {
    config = generateDeterministicAvatarConfig(user.id || user.username || 'default')
  }

  if (config) {
    // 尝试获取缓存，如果没有则下载并缓存
    return await cacheAvatarImage(config, size)
  }

  return '/placeholder-avatar.svg'
}

/**
 * 简单的字符串哈希函数
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为32位整数
  }
  return Math.abs(hash)
}

/**
 * 检查头像URL是否有效
 */
export function isValidAvatarUrl(url: string): boolean {
  return url.startsWith('https://api.dicebear.com/') ||
         url.startsWith('/') ||
         url.startsWith('http') ||
         url.startsWith('data:') // 支持base64缓存的图片
}

/**
 * 将Blob转换为Base64字符串
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * 生成缓存键
 */
function getCacheKey(config: AvatarConfig, size: number): string {
  return `avatar_cache_${config.style}_${config.seed}_${size}`
}

/**
 * 检查缓存是否过期（7天过期）
 */
function isCacheExpired(cacheTime: number): boolean {
  const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7天
  return Date.now() - cacheTime > CACHE_DURATION
}

/**
 * 从缓存获取头像图片
 */
export function getCachedAvatarUrl(config: AvatarConfig, size: number): string | null {
  if (typeof window === 'undefined') return null

  try {
    const cacheKey = getCacheKey(config, size)
    const cached = localStorage.getItem(cacheKey)

    if (cached) {
      const { data, timestamp } = JSON.parse(cached)

      // 检查缓存是否过期
      if (!isCacheExpired(timestamp)) {
        console.log(`使用缓存头像: ${cacheKey}`)
        return data
      } else {
        // 清除过期缓存
        localStorage.removeItem(cacheKey)
        console.log(`清除过期缓存: ${cacheKey}`)
      }
    }
  } catch (error) {
    console.warn('获取缓存头像失败:', error)
  }

  return null
}

/**
 * 缓存头像图片到本地存储
 */
export async function cacheAvatarImage(config: AvatarConfig, size: number): Promise<string> {
  if (typeof window === 'undefined') {
    return getAvatarUrl(config, size)
  }

  // 先检查缓存
  const cachedUrl = getCachedAvatarUrl(config, size)
  if (cachedUrl) {
    return cachedUrl
  }

  const originalUrl = getAvatarUrl(config, size)

  try {
    console.log(`开始缓存头像: ${originalUrl}`)

    // 下载图片
    const response = await fetch(originalUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const blob = await response.blob()

    // 检查文件大小（限制为500KB）
    if (blob.size > 500 * 1024) {
      console.warn('头像文件过大，不缓存:', blob.size)
      return originalUrl
    }

    // 转换为base64
    const base64 = await blobToBase64(blob)

    // 保存到缓存
    const cacheKey = getCacheKey(config, size)
    const cacheData = {
      data: base64,
      timestamp: Date.now()
    }

    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    console.log(`头像已缓存: ${cacheKey}`)

    return base64
  } catch (error) {
    console.warn('缓存头像失败:', error)
    return originalUrl // 失败时返回原URL
  }
}

/**
 * 清理过期的头像缓存
 */
export function cleanExpiredAvatarCache(): void {
  if (typeof window === 'undefined') return

  try {
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('avatar_cache_')) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const { timestamp } = JSON.parse(cached)
            if (isCacheExpired(timestamp)) {
              keysToRemove.push(key)
            }
          }
        } catch (error) {
          // 解析失败的缓存也删除
          keysToRemove.push(key)
        }
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      console.log(`清除过期缓存: ${key}`)
    })

    if (keysToRemove.length > 0) {
      console.log(`清理了 ${keysToRemove.length} 个过期头像缓存`)
    }
  } catch (error) {
    console.warn('清理头像缓存失败:', error)
  }
}

/**
 * 获取缓存统计信息
 */
export function getAvatarCacheStats(): { count: number; size: number } {
  if (typeof window === 'undefined') return { count: 0, size: 0 }

  let count = 0
  let size = 0

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('avatar_cache_')) {
        const value = localStorage.getItem(key)
        if (value) {
          count++
          size += value.length
        }
      }
    }
  } catch (error) {
    console.warn('获取缓存统计失败:', error)
  }

  return { count, size }
}

/**
 * 获取头像预览（用于用户选择不同风格）
 */
export function getAvatarPreviews(seed: string, size: number = 128) {
  return AVATAR_STYLES.map(style => ({
    style,
    url: getAvatarUrl({ style, seed }, size),
    name: getStyleDisplayName(style)
  }))
}

/**
 * 获取风格的显示名称
 */
function getStyleDisplayName(style: AvatarStyle): string {
  const names: Record<AvatarStyle, string> = {
    lorelei: '女性角色',
    notionists: '概念风'
  }
  return names[style] || style
}

/**
 * 从数据库获取用户头像配置
 */
export async function getUserAvatarConfigFromDB(userId: string): Promise<AvatarConfig | null> {
  try {
    const { getUserSettings, saveUserSettings } = await import("@/app/actions/setting-actions")
    const settings = await getUserSettings(userId)

    if (settings && settings.avatar_style) {
      // 如果有avatar_style但没有avatar_seed，生成一个确定性的seed
      let seed = settings.avatar_seed
      if (!seed) {
        // 基于用户ID生成确定性的seed，确保同一用户总是得到相同的头像
        seed = `user_${userId}_${settings.avatar_style}`
        console.log(`为用户 ${userId} 生成确定性头像seed: ${seed}`)

        // 保存生成的seed到数据库
        try {
          await saveUserSettings(userId, {
            font_family: settings.font_family,
            font_size: settings.font_size,
            sync_interval: settings.sync_interval,
            avatar_style: settings.avatar_style,
            avatar_seed: seed
          })
          console.log(`已保存用户 ${userId} 的头像seed到数据库`)
        } catch (saveError) {
          console.warn(`保存用户 ${userId} 头像seed失败:`, saveError)
        }
      }

      return {
        style: settings.avatar_style as AvatarStyle,
        seed: seed
      }
    }

    return null
  } catch (error) {
    console.warn('从数据库获取用户头像配置失败:', error)
    return null
  }
}

/**
 * 从本地存储获取用户头像配置（备用方案）
 */
export function getUserAvatarConfig(userId: string): AvatarConfig | null {
  if (typeof window === 'undefined') return null

  try {
    const configs = localStorage.getItem('userAvatarConfigs')
    if (!configs) return null

    const parsedConfigs = JSON.parse(configs)
    return parsedConfigs[userId] || null
  } catch (error) {
    console.warn('获取用户头像配置失败:', error)
    return null
  }
}

/**
 * 保存用户头像配置到本地存储和数据库
 */
export async function saveUserAvatarConfig(userId: string, config: AvatarConfig): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    // 保存到本地存储
    const configs = localStorage.getItem('userAvatarConfigs')
    const parsedConfigs = configs ? JSON.parse(configs) : {}

    parsedConfigs[userId] = config
    localStorage.setItem('userAvatarConfigs', JSON.stringify(parsedConfigs))

    // 同时保存到数据库
    try {
      const { saveUserSettings, getUserSettings } = await import("@/app/actions/setting-actions")

      // 获取现有设置
      const existingSettings = await getUserSettings(userId)

      // 保存头像配置到数据库
      await saveUserSettings(userId, {
        font_family: existingSettings?.font_family || 'system',
        font_size: existingSettings?.font_size || 'medium',
        sync_interval: existingSettings?.sync_interval || 30,
        avatar_style: config.style,
        avatar_seed: config.seed
      })

      console.log(`用户 ${userId} 的头像配置已保存到数据库:`, config)
    } catch (dbError) {
      console.warn(`保存用户 ${userId} 头像配置到数据库失败:`, dbError)
      // 数据库保存失败不影响本地存储
    }
  } catch (error) {
    console.warn('保存用户头像配置失败:', error)
  }
}

/**
 * 为用户获取或生成头像配置
 * 如果用户已有配置则返回现有配置，否则生成基于用户ID的确定性配置
 */
export function getOrCreateUserAvatarConfig(userId: string): AvatarConfig {
  // 先尝试获取现有配置
  const existingConfig = getUserAvatarConfig(userId)
  if (existingConfig) {
    console.log(`用户 ${userId} 使用现有头像配置:`, existingConfig)
    return existingConfig
  }

  // 没有现有配置，生成基于用户ID的确定性配置（确保同一用户ID始终得到相同头像）
  const newConfig = generateDeterministicAvatarConfig(userId)
  console.log(`用户 ${userId} 生成确定性头像配置:`, newConfig)

  // 异步保存新配置到本地存储和数据库
  saveUserAvatarConfig(userId, newConfig).catch(error => {
    console.warn(`保存用户 ${userId} 头像配置失败:`, error)
  })

  return newConfig
}

/**
 * 为用户生成新的随机头像配置并保存
 */
export function regenerateUserAvatar(userId: string): AvatarConfig {
  const newConfig = generateRandomAvatarConfig()
  console.log(`用户 ${userId} 重新生成头像配置:`, newConfig)

  // 异步保存新配置到本地存储和数据库
  saveUserAvatarConfig(userId, newConfig).catch(error => {
    console.warn(`保存用户 ${userId} 头像配置失败:`, error)
  })

  return newConfig
}
