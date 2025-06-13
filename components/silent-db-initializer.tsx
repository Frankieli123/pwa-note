"use client"



export function SilentDbInitializer() {
  // 禁用自动数据库初始化以提升性能
  // 数据库表应该在部署时已经创建好

  // 如果需要手动初始化，可以访问 /api/init-db
  console.log("数据库初始化已禁用，如需初始化请访问 /api/init-db")

  // 不渲染任何UI，也不执行任何初始化
  return null
}