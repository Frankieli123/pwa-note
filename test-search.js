// 简单的搜索API测试脚本
async function testSearch() {
  const userId = 'user_17edd6'
  const queries = ['香港', 'net', '服务器', 'test']
  
  console.log('🔍 开始测试搜索功能...')
  
  for (const query of queries) {
    try {
      const response = await fetch(`http://localhost:3002/api/search?userId=${userId}&q=${encodeURIComponent(query)}&limit=5`)
      const result = await response.json()
      
      console.log(`\n查询: "${query}"`)
      console.log('结果:', {
        success: result.success,
        total: result.total,
        notes: result.data?.notes?.length || 0,
        files: result.data?.files?.length || 0,
        links: result.data?.links?.length || 0
      })
      
      if (result.data?.notes?.length > 0) {
        console.log('便签示例:', result.data.notes[0].content.substring(0, 50) + '...')
      }
      
    } catch (error) {
      console.error(`查询 "${query}" 失败:`, error.message)
    }
  }
}

// 在浏览器控制台中运行
if (typeof window !== 'undefined') {
  window.testSearch = testSearch
  console.log('在控制台运行: testSearch()')
}
