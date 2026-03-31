#!/usr/bin/env pwsh 
  
  # XYZW Web Helper 开发服务器启动脚本 
  # 功能：在后台启动开发服务器并打开浏览器 
  
  Write-Host "=======================================" -ForegroundColor Cyan 
  Write-Host "XYZW Web Helper 开发服务器启动脚本" -ForegroundColor Cyan 
  Write-Host "=======================================" -ForegroundColor Cyan 
  
  # 获取脚本所在目录的绝对路径，确保在正确的项目目录中执行 
  $scriptPath = $MyInvocation.MyCommand.Path 
  $scriptDir = Split-Path -Parent $scriptPath 
  Set-Location $scriptDir 
  Write-Host "当前工作目录: $scriptDir" -ForegroundColor Green 
  
  # 检查Node.js是否安装 
  if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) { 
      Write-Host "错误: 未找到Node.js，请先安装Node.js" -ForegroundColor Red 
      Write-Host "按任意键退出..." 
      $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null 
      exit 1 
  } 
  
  # 检查pnpm是否安装 
  if (-not (Get-Command "pnpm" -ErrorAction SilentlyContinue)) { 
      Write-Host "错误: 未找到pnpm，请先安装pnpm" -ForegroundColor Red 
      Write-Host "按任意键退出..." 
      $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null 
      exit 1 
  } 
  
  # 检查项目依赖是否已安装 
  if (-not (Test-Path "./node_modules")) { 
      Write-Host "警告: 未找到node_modules目录，正在安装依赖..." -ForegroundColor Yellow 
      try { 
          Write-Host "正在执行: pnpm install" -ForegroundColor Green 
          & pnpm install 
          if ($LASTEXITCODE -ne 0) { 
              throw "依赖安装失败" 
          } 
          Write-Host "依赖安装成功!" -ForegroundColor Green 
      } catch { 
          Write-Host "错误: 依赖安装失败: $($_.Exception.Message)" -ForegroundColor Red 
          Write-Host "按任意键退出..." 
          $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null 
          exit 1 
      } 
  } 
  
  # 定义服务器URL 
  $serverUrl = "http://localhost:3000" 
  
  # 启动开发服务器（使用隐藏窗口） 
  Write-Host "正在启动开发服务器..." -ForegroundColor Green 
  try { 
      # 使用WScript.Shell来启动隐藏窗口，并明确指定工作目录 
      $shell = New-Object -ComObject WScript.Shell 
      # 明确指定在当前项目目录执行命令 
      $command = "cd /d `"$scriptDir`" && pnpm run dev" 
      Write-Host "执行命令: $command" -ForegroundColor Green 
      $shell.Run("cmd /c $command", 0, $false)  # 0 = 隐藏窗口 
      Write-Host "开发服务器已在后台启动" -ForegroundColor Green 
  } catch { 
      Write-Host "错误: 启动服务器失败: $($_.Exception.Message)" -ForegroundColor Red 
      Write-Host "按任意键退出..." 
      $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null 
      exit 1 
  } 
  
  # 等待服务器启动 
  Write-Host "等待服务器启动..." -ForegroundColor Yellow 
  $maxWait = 30  # 最大等待时间（秒） 
  $waitCount = 0 
  $serverStarted = $false 
  
  while ($waitCount -lt $maxWait -and -not $serverStarted) { 
      Start-Sleep -Seconds 1 
      $waitCount++ 
      
      # 尝试连接服务器 
      try { 
          $response = Invoke-WebRequest -Uri $serverUrl -TimeoutSec 2 -ErrorAction SilentlyContinue 
          if ($response.StatusCode -eq 200) { 
              $serverStarted = $true 
              Write-Host "服务器启动成功!" -ForegroundColor Green 
              break 
          } 
      } catch { 
          # 服务器尚未就绪，继续等待 
      } 
      
      # 显示等待进度 
      if ($waitCount % 5 -eq 0) { 
          Write-Host "正在等待服务器启动... ($waitCount/$maxWait秒)" -ForegroundColor Yellow 
      } 
  } 
  
  if (-not $serverStarted) { 
      Write-Host "警告: 服务器可能尚未完全启动，正在尝试打开浏览器..." -ForegroundColor Yellow 
  } 
  
  # 打开浏览器（Vite 会自动打开，无需手动打开） 
  Write-Host "Vite 服务器将自动打开浏览器..." -ForegroundColor Green 
  Write-Host "如果浏览器未自动打开，请手动访问: $serverUrl" -ForegroundColor Yellow 
  
  # 完成 
  Write-Host "=======================================" -ForegroundColor Cyan 
  Write-Host "启动完成!" -ForegroundColor Green 
  Write-Host "开发服务器正在后台运行" -ForegroundColor Green 
  Write-Host "访问地址: $serverUrl" -ForegroundColor Green 
  Write-Host "" -ForegroundColor Green 
  Write-Host "提示: 要停止服务器，请在任务管理器中结束Node.js进程" -ForegroundColor Yellow 
  Write-Host "=======================================" -ForegroundColor Cyan 
  
  # 延迟退出，让用户看到输出 
  Start-Sleep -Seconds 2