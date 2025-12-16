# Garage 替换 MinIO 迁移计划

## 1. Garage 安装配置

### Docker 部署
```yaml
version: '3.8'
services:
  garage:
    image: dxflrs/garage:v0.9.0
    ports:
      - "3900:3900"  # RPC端口
      - "3901:3901"  # Admin API
      - "3902:3902"  # S3 API
    volumes:
      - ./garage-data:/var/lib/garage/data
      - ./garage-meta:/var/lib/garage/meta
      - ./garage.toml:/etc/garage.toml
    environment:
      - GARAGE_RPC_SECRET=your-secret-key
```

### 配置文件 (garage.toml)
```toml
metadata_dir = "/var/lib/garage/meta"
data_dir = "/var/lib/garage/data"

db_engine = "sqlite"

replication_mode = "none"

rpc_bind_addr = "[::]:3900"
rpc_public_addr = "127.0.0.1:3900"
rpc_secret = "your-secret-key"

[s3_api]
s3_region = "garage"
api_bind_addr = "[::]:3902"
root_domain = ".s3.garage.localhost"

[s3_web]
bind_addr = "[::]:3903"
root_domain = ".web.garage.localhost"

[admin]
api_bind_addr = "[::]:3901"
```

## 2. 代码修改点

### 环境变量更新
```env
# .env.local
GARAGE_ENDPOINT=http://localhost:3902
GARAGE_ACCESS_KEY=your-access-key
GARAGE_SECRET_KEY=your-secret-key
GARAGE_BUCKET_NAME=pwa-note-files
GARAGE_REGION=garage
```

### API路由修改
- 更新 `/api/files/presigned-url/route.ts`
- 修改S3客户端配置
- 调整CORS策略

### 客户端配置
- 更新上传端点
- 修改预签名URL生成逻辑
- 测试真实进度监控

## 3. 优势分析

### CORS 灵活性
- 完全自定义CORS策略
- 支持真实进度监控
- 无商业版限制

### 部署简单
- 单二进制文件
- 配置文件简单
- 资源占用较低

### 开源透明
- 完全开源
- 社区活跃
- 可自定义修改

## 4. 潜在问题

### S3兼容性
- 某些高级S3功能可能不支持
- 多部分上传实现可能有差异
- 预签名URL格式可能略有不同

### 生态成熟度
- 相比MinIO生态较小
- 文档和示例较少
- 企业级功能可能不完整

## 5. 迁移步骤

1. **本地测试环境搭建**
2. **修改配置和代码**
3. **功能测试验证**
4. **性能对比测试**
5. **生产环境迁移**

## 6. 回退方案

保留MinIO配置，通过环境变量切换：
```typescript
const storageConfig = process.env.USE_GARAGE === 'true' ? garageConfig : minioConfig
```
