# 测试文件上传到服务器
$uri = "http://124.243.146.198:3001/api/upload"
$filePath = "test-upload.txt"
$userId = "test_user"

# 读取文件内容
$fileContent = [System.IO.File]::ReadAllBytes($filePath)
$fileName = [System.IO.Path]::GetFileName($filePath)

# 创建边界
$boundary = [System.Guid]::NewGuid().ToString()

# 创建表单数据
$LF = "`r`n"
$bodyLines = @(
    "--$boundary",
    "Content-Disposition: form-data; name=`"userId`"$LF",
    $userId,
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"",
    "Content-Type: text/plain$LF",
    [System.Text.Encoding]::UTF8.GetString($fileContent),
    "--$boundary--$LF"
)

$body = $bodyLines -join $LF

try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType "multipart/form-data; boundary=$boundary"
    Write-Host "Upload successful:"
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Upload failed:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody"
    }
}
