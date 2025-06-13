-- 数据库迁移脚本：优化files表存储结构
-- 移除冗余的url和thumbnail字段，只保留base64_data
-- 这些字段将在应用层动态生成

-- 备份现有数据（可选）
-- CREATE TABLE files_backup AS SELECT * FROM files;

-- 删除冗余字段
ALTER TABLE files DROP COLUMN IF EXISTS url;
ALTER TABLE files DROP COLUMN IF EXISTS thumbnail;

-- 验证表结构
-- \d files

-- 预期的表结构应该是：
-- id (integer, primary key)
-- user_id (text)
-- name (text)
-- type (text)
-- size (integer)
-- base64_data (text)
-- uploaded_at (timestamp)

-- 如果需要回滚，可以重新添加字段：
-- ALTER TABLE files ADD COLUMN url TEXT;
-- ALTER TABLE files ADD COLUMN thumbnail TEXT;
