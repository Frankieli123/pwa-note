# MinIO上传403错误解决方案

## 问题描述

用户在使用大文件上传功能时遇到以下问题：
- 预签名URL生成成功（200状态码）
- 上传进度卡在20%
- MinIO上传失败，返回403错误

## 问题原因分析

403错误通常由以下原因引起：

### 1. AWS4签名算法错误 ✅ 已修复
- **问题**: 预签名URL的签名算法实现不正确
- **症状**: 预签名URL生成成功，但使用时返回403
- **解决**: 重新实现了正确的AWS4-HMAC-SHA256签名算法

### 2. CORS配置问题 ⚠️ 需要检查
- **问题**: MinIO服务器未正确配置CORS
- **症状**: 浏览器阻止跨域请求或MinIO拒绝请求
- **解决**: 需要配置MinIO的CORS设置

### 3. 时间戳同步问题
- **问题**: 客户端与服务器时间不同步
- **症状**: 签名验证失败
- **解决**: 确保服务器时间准确

### 4. MinIO访问权限问题
- **问题**: MinIO用户权限不足
- **症状**: 无法上传到指定bucket
- **解决**: 检查MinIO用户权限配置

## 已实施的修复

### 1. 修复预签名URL签名算法

**修改文件**: `app/api/files/presigned-url/route.ts`

**主要改进**:
- 重新实现`createPresignedUrlSignature`函数
- 正确处理查询参数排序和编码
- 使用正确的payload hash (`UNSIGNED-PAYLOAD`)
- 确保时间戳一致性

**关键代码**:
```javascript
// 对查询参数进行排序和编码
const sortedParams = Array.from(queryParams.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  .join('&')

// 使用正确的payload hash
const payloadHash = 'UNSIGNED-PAYLOAD'
```

### 2. 改进错误处理和重试机制

**修改文件**: `components/sync-provider.tsx`

**主要改进**:
- 网络错误自动重试（最多3次）
- 服务器错误重试机制
- 递增延迟策略

## 需要执行的配置步骤

### 1. 配置MinIO CORS设置

**使用提供的脚本**:
```javascript
// 在浏览器控制台运行
await window.minioSetup.setupMinio()
```

**或手动配置**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>DELETE</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <ExposeHeader>x-amz-request-id</ExposeHeader>
  </CORSRule>
</CORSConfiguration>
```

### 2. 验证环境变量配置

确保以下环境变量正确设置：
```env
MINIO_ENDPOINT=http://your-minio-server:9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET_NAME=pwa-note-files
MINIO_REGION=us-east-1
```

### 3. 检查MinIO服务器状态

**验证连接**:
```bash
curl -I http://your-minio-server:9000/minio/health/live
```

**检查bucket**:
```bash
mc ls minio/pwa-note-files
```

## 测试和验证

### 1. 使用测试脚本验证

**加载测试脚本**:
```html
<script src="/scripts/test-presigned-url.js"></script>
```

**运行测试**:
```javascript
// 完整测试
await window.testPresignedUrl.runPresignedUrlTest()

// 调试预签名URL
const presignedData = await window.testPresignedUrl.testPresignedUrlGeneration()
window.testPresignedUrl.debugPresignedUrl(presignedData.uploadUrl)
```

### 2. 检查浏览器网络面板

**关键检查点**:
- 预签名URL请求是否成功（200状态码）
- PUT请求到MinIO是否成功
- 是否有CORS错误
- 响应头是否包含预期信息

### 3. 检查MinIO服务器日志

**常见错误模式**:
```
SignatureDoesNotMatch: 签名不匹配
AccessDenied: 访问被拒绝
InvalidRequest: 请求无效
```

## 故障排除步骤

### 步骤1: 验证预签名URL生成
```javascript
const presignedData = await window.testPresignedUrl.testPresignedUrlGeneration()
console.log('预签名URL:', presignedData.uploadUrl)
```

### 步骤2: 检查CORS配置
```javascript
await window.minioSetup.checkCorsConfiguration()
```

### 步骤3: 测试简单上传
```javascript
await window.testPresignedUrl.testPresignedUrlUpload(presignedData)
```

### 步骤4: 验证文件存在
```javascript
await window.testPresignedUrl.testFileVerification(presignedData)
```

## 常见问题和解决方案

### Q: 仍然收到403错误
**A**: 
1. 检查MinIO CORS配置
2. 验证时间同步
3. 检查MinIO用户权限
4. 确认bucket存在

### Q: 预签名URL格式看起来不正确
**A**:
1. 使用调试函数检查URL参数
2. 验证所有必需的X-Amz-*参数都存在
3. 检查签名是否为64字符的十六进制字符串

### Q: 网络错误或超时
**A**:
1. 检查MinIO服务器是否可访问
2. 验证防火墙设置
3. 检查网络连接稳定性

### Q: 权限错误
**A**:
1. 检查MinIO用户是否有bucket写权限
2. 验证访问密钥是否正确
3. 确认bucket策略配置

## 监控和日志

### 启用详细日志
在开发环境中，可以临时启用详细日志：

```javascript
// 在预签名URL生成函数中添加
console.log('Canonical Request:', canonicalRequest)
console.log('String to Sign:', stringToSign)
console.log('Generated URL:', presignedUrl)
```

### 监控关键指标
- 预签名URL生成成功率
- 上传成功率
- 平均上传时间
- 错误类型分布

## 成功验证标准

✅ 预签名URL生成成功（200状态码）
✅ MinIO上传成功（200状态码）
✅ 文件验证成功
✅ 进度显示正常工作
✅ 错误重试机制有效

## 后续优化建议

1. **监控告警**: 设置上传失败率告警
2. **性能优化**: 监控上传速度和成功率
3. **安全加固**: 定期轮换访问密钥
4. **容错改进**: 增加更多错误场景的处理

## 联系支持

如果问题仍然存在，请提供：
1. 完整的错误日志
2. 网络面板截图
3. MinIO服务器配置
4. 环境变量配置（隐藏敏感信息）
