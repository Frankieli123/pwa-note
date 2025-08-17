import bcrypt from 'bcryptjs'

/**
 * 密码工具函数
 * 提供密码加密、验证和强度检查功能
 */

// 密码加密的盐轮数（推荐10-12，平衡安全性和性能）
const SALT_ROUNDS = 10

/**
 * 加密密码
 * @param password 明文密码
 * @returns 加密后的密码哈希
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.trim().length === 0) {
    throw new Error('密码不能为空')
  }
  
  try {
    const hash = await bcrypt.hash(password.trim(), SALT_ROUNDS)
    return hash
  } catch (error) {
    console.error('密码加密失败:', error)
    throw new Error('密码加密失败')
  }
}

/**
 * 验证密码
 * @param password 明文密码
 * @param hash 存储的密码哈希
 * @returns 密码是否正确
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false
  }
  
  try {
    const isValid = await bcrypt.compare(password.trim(), hash)
    return isValid
  } catch (error) {
    console.error('密码验证失败:', error)
    return false
  }
}

/**
 * 密码强度等级
 */
export type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very-strong'

/**
 * 密码强度检查结果
 */
export interface PasswordStrengthResult {
  strength: PasswordStrength
  score: number // 0-100
  feedback: string[]
  isValid: boolean // 是否满足最低要求
}

/**
 * 检查密码强度
 * @param password 密码
 * @returns 密码强度检查结果
 */
export function checkPasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = []
  let score = 0
  
  if (!password) {
    return {
      strength: 'weak',
      score: 0,
      feedback: ['请输入密码'],
      isValid: false
    }
  }
  
  // 长度检查
  if (password.length < 6) {
    feedback.push('密码至少需要6个字符')
  } else if (password.length >= 6) {
    score += 20
  }
  
  if (password.length >= 8) {
    score += 10
  }
  
  if (password.length >= 12) {
    score += 10
  }
  
  // 字符类型检查
  const hasLowerCase = /[a-z]/.test(password)
  const hasUpperCase = /[A-Z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  const hasChinese = /[\u4e00-\u9fa5]/.test(password)
  
  let charTypeCount = 0
  if (hasLowerCase) {
    charTypeCount++
    score += 10
  }
  if (hasUpperCase) {
    charTypeCount++
    score += 10
  }
  if (hasNumbers) {
    charTypeCount++
    score += 10
  }
  if (hasSpecialChars) {
    charTypeCount++
    score += 15
  }
  if (hasChinese) {
    charTypeCount++
    score += 10
  }
  
  // 字符类型多样性奖励
  if (charTypeCount >= 3) {
    score += 15
  }
  
  // 常见密码检查
  const commonPasswords = [
    '123456', 'password', '123456789', '12345678', '12345',
    '1234567', '1234567890', 'qwerty', 'abc123', 'password123'
  ]
  
  if (commonPasswords.includes(password.toLowerCase())) {
    score = Math.max(0, score - 30)
    feedback.push('避免使用常见密码')
  }
  
  // 重复字符检查
  const hasRepeatedChars = /(.)\1{2,}/.test(password)
  if (hasRepeatedChars) {
    score = Math.max(0, score - 10)
    feedback.push('避免连续重复字符')
  }
  
  // 确定强度等级
  let strength: PasswordStrength
  if (score >= 80) {
    strength = 'very-strong'
  } else if (score >= 60) {
    strength = 'strong'
  } else if (score >= 40) {
    strength = 'medium'
  } else {
    strength = 'weak'
  }
  
  // 生成建议
  if (feedback.length === 0) {
    if (strength === 'very-strong') {
      feedback.push('密码强度很高！')
    } else if (strength === 'strong') {
      feedback.push('密码强度良好')
    } else if (strength === 'medium') {
      feedback.push('密码强度一般，建议增加特殊字符')
    }
  }
  
  // 最低要求：至少6个字符
  const isValid = password.length >= 6
  
  return {
    strength,
    score: Math.min(100, score),
    feedback,
    isValid
  }
}

/**
 * 生成随机密码
 * @param length 密码长度（默认12）
 * @param includeSpecialChars 是否包含特殊字符（默认true）
 * @returns 随机密码
 */
export function generateRandomPassword(length: number = 12, includeSpecialChars: boolean = true): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const specialChars = '!@#$%^&*(),.?":{}|<>'
  
  let charset = lowercase + uppercase + numbers
  if (includeSpecialChars) {
    charset += specialChars
  }
  
  let password = ''
  
  // 确保至少包含一个小写字母、大写字母和数字
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  
  if (includeSpecialChars) {
    password += specialChars[Math.floor(Math.random() * specialChars.length)]
  }
  
  // 填充剩余长度
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)]
  }
  
  // 打乱字符顺序
  return password.split('').sort(() => Math.random() - 0.5).join('')
}
