const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { existsSync } = require('fs');
const mimeTypes = require('mime-types');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS 配置
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 速率限制
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 50, // 每个 IP 最多 50 次上传
  message: { error: 'Too many uploads, please try again later.' }
});

app.use('/api/upload', uploadLimiter);

// JSON 解析
app.use(express.json());

// 文件类型配置
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv'
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20MB

// Multer 配置
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const userId = req.body.userId;
    if (!userId) {
      return cb(new Error('User ID is required'));
    }
    
    const uploadDir = path.join(__dirname, 'uploads', userId);
    
    try {
      if (!existsSync(uploadDir)) {
        await fs.mkdir(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}-${randomString}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
  const isDocument = ALLOWED_DOCUMENT_TYPES.includes(file.mimetype);
  
  if (isImage || isDocument) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE // 使用最大限制，在路由中进一步检查
  }
});

// 生成缩略图
async function generateThumbnail(filePath, outputPath) {
  try {
    await sharp(filePath)
      .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    return true;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    return false;
  }
}

// 文件上传 API
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded',
        message: '没有上传文件' 
      });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID required',
        message: '缺少用户ID' 
      });
    }

    const file = req.file;
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
    
    // 检查文件大小
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;
    if (file.size > maxSize) {
      // 删除已上传的文件
      await fs.unlink(file.path);
      const maxSizeMB = maxSize / (1024 * 1024);
      return res.status(400).json({ 
        error: 'File too large',
        message: `文件大小超过限制 (${maxSizeMB}MB)` 
      });
    }

    const fileUrl = `/uploads/${userId}/${file.filename}`;
    let thumbnailUrl = null;

    // 为图片生成缩略图
    if (isImage) {
      const thumbnailFilename = `thumb_${file.filename}`;
      const thumbnailPath = path.join(file.destination, thumbnailFilename);
      
      const thumbnailGenerated = await generateThumbnail(file.path, thumbnailPath);
      if (thumbnailGenerated) {
        thumbnailUrl = `/uploads/${userId}/${thumbnailFilename}`;
      }
    }

    console.log(`文件上传成功: ${file.originalname} -> ${fileUrl}`);

    res.json({
      success: true,
      url: fileUrl,
      thumbnailUrl,
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      type: file.mimetype
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      message: error.message || '文件上传失败，请稍后重试' 
    });
  }
});

// 文件删除 API
app.delete('/api/delete/:userId/:filename', async (req, res) => {
  try {
    const { userId, filename } = req.params;
    
    if (!userId || !filename) {
      return res.status(400).json({ 
        error: 'Missing parameters',
        message: '缺少必要参数' 
      });
    }

    const filePath = path.join(__dirname, 'uploads', userId, filename);
    const thumbnailPath = path.join(__dirname, 'uploads', userId, `thumb_${filename}`);

    // 删除主文件
    if (existsSync(filePath)) {
      await fs.unlink(filePath);
    }

    // 删除缩略图（如果存在）
    if (existsSync(thumbnailPath)) {
      await fs.unlink(thumbnailPath);
    }

    console.log(`文件删除成功: ${filePath}`);

    res.json({
      success: true,
      message: '文件删除成功'
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      error: 'Delete failed',
      message: '文件删除失败，请稍后重试' 
    });
  }
});

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 错误处理
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 文件服务器运行在 http://0.0.0.0:${PORT}`);
  console.log(`📁 上传目录: ${path.join(__dirname, 'uploads')}`);
  console.log(`🔒 允许的来源: ${process.env.ALLOWED_ORIGINS || '*'}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务器...');
  process.exit(0);
});
