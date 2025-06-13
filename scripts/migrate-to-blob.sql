-- 数据库迁移脚本：添加 Vercel Blob 存储字段
-- 为 files 表添加 blob_url 和 thumbnail_url 字段
-- 保留现有字段用于向后兼容

-- 备份现有数据（可选，建议在生产环境执行）
-- CREATE TABLE files_backup AS SELECT * FROM files;

-- 添加新的 Blob URL 字段
ALTER TABLE files ADD COLUMN IF NOT EXISTS blob_url TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 修改现有字段为可空（向后兼容）
ALTER TABLE files ALTER COLUMN url DROP NOT NULL;

-- 添加注释说明字段用途
COMMENT ON COLUMN files.url IS '旧版本文件URL，向后兼容用，将逐步废弃';
COMMENT ON COLUMN files.thumbnail IS '旧版本缩略图，向后兼容用，将逐步废弃';
COMMENT ON COLUMN files.blob_url IS 'Vercel Blob 存储的文件URL';
COMMENT ON COLUMN files.thumbnail_url IS 'Vercel Blob 存储的缩略图URL';
COMMENT ON COLUMN files.base64_data IS 'Base64编码文件内容，迁移期间保留';

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_files_blob_url ON files(blob_url);
CREATE INDEX IF NOT EXISTS idx_files_user_id_uploaded_at ON files(user_id, uploaded_at);

-- 验证表结构
-- \d files

-- 预期的表结构应该包含：
-- id (integer, primary key)
-- user_id (varchar)
-- name (varchar)
-- type (varchar)
-- url (text, nullable) - 向后兼容
-- thumbnail (text, nullable) - 向后兼容
-- blob_url (text, nullable) - 新增
-- thumbnail_url (text, nullable) - 新增
-- size (integer)
-- status (varchar)
-- base64_data (text, nullable) - 迁移期间保留
-- uploaded_at (timestamp)
