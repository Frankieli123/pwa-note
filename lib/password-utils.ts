import bcrypt from 'bcryptjs';

export interface PasswordStrengthResult {
  strength: 'weak' | 'medium' | 'strong';
  score: number;
  suggestions: string[];
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Check password strength
 */
export function checkPasswordStrength(password: string): PasswordStrengthResult {
  const result: PasswordStrengthResult = {
    strength: 'weak',
    score: 0,
    suggestions: []
  };

  if (!password || password.length === 0) {
    result.suggestions.push('密码不能为空');
    return result;
  }

  // Check length
  if (password.length < 8) {
    result.suggestions.push('密码至少需要8个字符');
  } else if (password.length >= 8 && password.length < 12) {
    result.score += 1;
  } else {
    result.score += 2;
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    result.suggestions.push('添加大写字母');
  } else {
    result.score += 1;
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    result.suggestions.push('添加小写字母');
  } else {
    result.score += 1;
  }

  // Check for numbers
  if (!/\d/.test(password)) {
    result.suggestions.push('添加数字');
  } else {
    result.score += 1;
  }

  // Check for special characters
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    result.suggestions.push('添加特殊字符');
  } else {
    result.score += 1;
  }

  // Check for common patterns
  const commonPatterns = [
    /^123/,
    /^abc/i,
    /^password/i,
    /^qwerty/i,
    /^admin/i,
    /^letmein/i,
    /^welcome/i,
    /^monkey/i,
    /^dragon/i
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password.toLowerCase())) {
      result.suggestions.push('避免使用常见密码模式');
      result.score = Math.max(0, result.score - 2);
      break;
    }
  }

  // Determine strength based on score
  if (result.score <= 2) {
    result.strength = 'weak';
  } else if (result.score <= 4) {
    result.strength = 'medium';
  } else {
    result.strength = 'strong';
  }

  return result;
}
