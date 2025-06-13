/**
 * 应用版本管理和缓存清理系统
 * 解决部署后的缓存不匹配问题
 */

// 应用版本号 - 每次重大更新时需要手动递增
export const APP_VERSION = '1.2.0'
export const CACHE_VERSION = 'v1.2.0'

// 版本相关的 localStorage 键名
const VERSION_KEY = 'app_version'
const LAST_CACHE_CLEAR_KEY = 'last_cache_clear'

/**
 * 检查应用版本是否发生变化
 */
export function checkVersionChange(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY)
    return storedVersion !== APP_VERSION
  } catch (error) {
    console.warn('检查版本失败:', error)
    return true // 如果检查失败，假设需要清理
  }
}

/**
 * 更新存储的版本号
 */
export function updateStoredVersion(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(VERSION_KEY, APP_VERSION)
    localStorage.setItem(LAST_CACHE_CLEAR_KEY, Date.now().toString())
    console.log(`✅ 版本已更新到: ${APP_VERSION}`)
  } catch (error) {
    console.warn('更新版本失败:', error)
  }
}

/**
 * 清理所有应用相关的缓存数据
 */
export async function clearAppCache(): Promise<void> {
  if (typeof window === 'undefined') return
  
  console.log('🧹 开始清理应用缓存...')
  
  try {
    // 1. 清理 localStorage 中的应用数据（保留用户设置）
    const keysToKeep = [
      'userSettings', // 保留用户设置
      'auth_user',    // 保留用户认证信息
      VERSION_KEY,    // 保留版本信息
      LAST_CACHE_CLEAR_KEY
    ]
    
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && !keysToKeep.includes(key)) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      console.log(`🗑️ 清理 localStorage: ${key}`)
    })
    
    // 2. 清理 sessionStorage
    sessionStorage.clear()
    console.log('🗑️ 清理 sessionStorage')
    
    // 3. 清理 Service Worker 缓存
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(async (cacheName) => {
          await caches.delete(cacheName)
          console.log(`🗑️ 清理缓存: ${cacheName}`)
        })
      )
    }
    
    // 4. 清理过期的头像缓存
    clearExpiredAvatarCache()
    
    console.log('✅ 缓存清理完成')
  } catch (error) {
    console.error('❌ 缓存清理失败:', error)
  }
}

/**
 * 清理过期的头像缓存（从 avatar-utils.ts 导入）
 */
function clearExpiredAvatarCache(): void {
  try {
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('avatar_cache_')) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      console.log(`🗑️ 清理头像缓存: ${key}`)
    })
    
    if (keysToRemove.length > 0) {
      console.log(`✅ 清理了 ${keysToRemove.length} 个头像缓存`)
    }
  } catch (error) {
    console.warn('清理头像缓存失败:', error)
  }
}

/**
 * 强制刷新 Service Worker
 */
export async function updateServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      console.log('🔄 更新 Service Worker...')
      await registration.update()
      
      // 如果有等待中的 Service Worker，激活它
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    }
  } catch (error) {
    console.warn('更新 Service Worker 失败:', error)
  }
}

/**
 * 检查并处理版本更新
 * 这是主要的入口函数
 */
export async function handleVersionUpdate(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  const hasVersionChanged = checkVersionChange()
  
  if (hasVersionChanged) {
    console.log('🔄 检测到应用版本更新，开始清理缓存...')
    
    // 清理缓存
    await clearAppCache()
    
    // 更新 Service Worker
    await updateServiceWorker()
    
    // 更新版本号
    updateStoredVersion()
    
    console.log('✅ 版本更新处理完成')
    return true
  }
  
  return false
}

/**
 * 获取当前应用版本信息
 */
export function getVersionInfo() {
  return {
    current: APP_VERSION,
    cache: CACHE_VERSION,
    stored: typeof window !== 'undefined' ? localStorage.getItem(VERSION_KEY) : null,
    lastCacheClear: typeof window !== 'undefined' ? localStorage.getItem(LAST_CACHE_CLEAR_KEY) : null
  }
}
