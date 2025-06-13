import { neon } from "@neondatabase/serverless"

// 创建数据库连接
function createDbConnection() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL 环境变量未设置")
  }
  return neon(connectionString)
}

/**
 * 专门用于添加 base64_data 列的迁移脚本
 * 这个脚本可以安全地运行多次，不会重复添加列
 */
export async function addBase64DataColumn() {
  console.log("开始添加 base64_data 列到 files 表...")

  try {
    const sql = createDbConnection()

    // 检查列是否已存在
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'files' 
      AND column_name = 'base64_data'
    `

    if (columnExists.length > 0) {
      console.log("base64_data 列已存在，跳过添加")
      return {
        success: true,
        message: "base64_data 列已存在",
        alreadyExists: true
      }
    }

    // 添加 base64_data 列
    await sql`
      ALTER TABLE files 
      ADD COLUMN base64_data TEXT
    `

    console.log("base64_data 列添加成功")

    // 验证列是否添加成功
    const verifyColumn = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'files' 
      AND column_name = 'base64_data'
    `

    if (verifyColumn.length === 0) {
      throw new Error("列添加失败：验证时未找到 base64_data 列")
    }

    const columnInfo = verifyColumn[0]
    console.log("列信息验证:", {
      name: columnInfo.column_name,
      type: columnInfo.data_type,
      nullable: columnInfo.is_nullable
    })

    return {
      success: true,
      message: "base64_data 列添加成功",
      columnInfo: columnInfo
    }

  } catch (error) {
    console.error("添加 base64_data 列失败:", error)
    return {
      success: false,
      message: `添加列失败: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.stack : String(error)
    }
  }
}

/**
 * 回滚函数：删除 base64_data 列
 * 注意：这会永久删除列中的所有数据！
 */
export async function removeBase64DataColumn() {
  console.log("开始删除 base64_data 列...")

  try {
    const sql = createDbConnection()

    // 检查列是否存在
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'files' 
      AND column_name = 'base64_data'
    `

    if (columnExists.length === 0) {
      console.log("base64_data 列不存在，无需删除")
      return {
        success: true,
        message: "base64_data 列不存在",
        alreadyRemoved: true
      }
    }

    // 删除列
    await sql`
      ALTER TABLE files 
      DROP COLUMN base64_data
    `

    console.log("base64_data 列删除成功")

    return {
      success: true,
      message: "base64_data 列删除成功"
    }

  } catch (error) {
    console.error("删除 base64_data 列失败:", error)
    return {
      success: false,
      message: `删除列失败: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.stack : String(error)
    }
  }
}

/**
 * 测试函数：验证 base64_data 列的功能
 */
export async function testBase64DataColumn() {
  console.log("开始测试 base64_data 列功能...")

  try {
    const sql = createDbConnection()

    // 创建测试用的 Base64 数据（一个小的文本文件）
    const testContent = "Hello, Base64 World!"
    const testBase64 = Buffer.from(testContent).toString('base64')
    const testUserId = "test_user_" + Date.now()

    // 插入测试记录
    const testUrl = `data:text/plain;base64,${testBase64}`
    const insertResult = await sql`
      INSERT INTO files (user_id, name, type, url, size, base64_data)
      VALUES (${testUserId}, ${'test.txt'}, ${'text/plain'}, ${testUrl}, ${testContent.length}, ${testBase64})
      RETURNING id, base64_data
    `

    if (insertResult.length === 0) {
      throw new Error("插入测试记录失败")
    }

    const insertedRecord = insertResult[0]
    console.log("测试记录插入成功，ID:", insertedRecord.id)

    // 验证数据是否正确存储
    const retrievedData = Buffer.from(insertedRecord.base64_data, 'base64').toString()
    if (retrievedData !== testContent) {
      throw new Error(`数据验证失败：期望 "${testContent}"，实际 "${retrievedData}"`)
    }

    // 清理测试数据
    await sql`DELETE FROM files WHERE user_id = ${testUserId}`
    console.log("测试数据清理完成")

    return {
      success: true,
      message: "base64_data 列功能测试通过",
      testData: {
        originalContent: testContent,
        base64Content: testBase64,
        retrievedContent: retrievedData
      }
    }

  } catch (error) {
    console.error("测试 base64_data 列失败:", error)
    return {
      success: false,
      message: `测试失败: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.stack : String(error)
    }
  }
}
