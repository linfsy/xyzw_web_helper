# 项目规则

## APK 构建流程

当用户说 **"构建APK"** 时，按以下顺序执行：

1. **更新版本号**
   ```
   node update-version.js
   ```

2. **构建Web项目**
   ```
   pnpm build
   ```

3. **同步Capacitor项目**（重要！不要手动复制dist）
   ```
   pnpm cap sync android
   ```

4. **构建debug版APK**
   ```
   cd android
   .\gradlew.bat assembleDebug
   ```

5. **打开APK所在文件夹**
   ```
   explorer "项目根目录\android\app\build\outputs\apk\debug"
   ```
   注意：必须使用绝对路径，避免因工作目录变化导致打开错误文件夹

## 重要提醒

- 第3步必须用 `pnpm cap sync android`，不能手动复制 dist 目录
- 这样才能正确同步 @capacitor/filesystem 等插件到 Android 项目

---

## 创建备份

**重要原则**：每次创建备份必须根据**当次修改的功能**来命名，确保备份名称能准确反映该备份包含的修改内容，方便以后查找和恢复。

当用户说 **"创建备份"** 时：

1. **返回项目根目录**（重要！避免因工作目录变化导致备份错误）
2. **查看修改日志**（`.trae/修改日志.md`），获取最近一次修改的标题
3. **使用修改标题作为备份描述**，自动创建备份
4. **执行以下命令**：

```powershell
# 返回项目根目录（重要！）
cd "f:\XYZW_WEB\xyzw_web_helper-main"

# 创建新备份（时间戳到分钟，自动使用修改日志标题作为描述）
$timestamp = Get-Date -Format "yyyyMMdd_HHmm"

# 从修改日志获取最近一次修改的标题
$logContent = Get-Content ".trae/修改日志.md" -Encoding UTF8 -Raw
if ($logContent -match "##\s*\[\d{4}-\d{2}-\d{2}\]\s*-\s*(.+)") {
    $suffix = $matches[1].Trim()
    # 限制长度，避免备份名过长
    if ($suffix.Length -gt 30) {
        $suffix = $suffix.Substring(0, 30)
    }
} else {
    $suffix = "自动备份"
}

# 使用更稳定的变量拼接方式
$backupName = "backup_${timestamp}_${suffix}"
robocopy "." $backupName /MIR /XD node_modules .git dist "android\app\build" "android\.gradle" backup_* /XF *.log /NFL /NDL /NJH
Write-Host "备份完成: $backupName"
```

排除的目录：node_modules, .git, dist, android\app\build, android\.gradle, backup_*

**命名格式**：`backup_YYYYMMDD_HHmm_描述性后缀`
- 例如：`backup_20260307_1840_分析任务冲突问题`
- 例如：`backup_20260307_2116_修复任务队列和定时任务优化`

**描述性后缀规范**：
1. **必须准确描述当次修改的主要功能**
2. **使用简洁明了的关键词**，如：
   - 修复XXX问题
   - 优化XXX功能
   - 新增XXX功能
   - 重构XXX模块
3. **避免使用模糊描述**，如："修改代码"、"更新文件"等
4. **参考修改日志**：查看 `.trae/修改日志.md` 中的修改记录来确定描述

**查找备份的方法**：
- 按时间查找：`backup_20260307_*` （查找3月7日的所有备份）
- 按功能查找：`backup_*_修复任务队列*` （查找包含任务队列修复的备份）
- 按关键词查找：`backup_*_优化*` （查找所有优化相关的备份）

---

## 恢复备份

当用户说 **"恢复备份"** 时，执行以下步骤：

1. 先询问用户要恢复哪个备份（列出所有 backup_* 目录）
2. 确认后执行：

```powershell
# 备份当前项目（以防万一）
Rename-Item "xyzw_web_helper-main" "xyzw_web_helper-main_old"

# 复制备份到当前位置
Copy-Item "backup_20260218_2237" "xyzw_web_helper-main" -Recurse

# 进入项目安装依赖
cd xyzw_web_helper-main
pnpm install
```

---

## 代码修改日志规则

### 每次修改代码后必须做的事

每次帮用户修改完代码后，**立即**更新 `.trae/修改日志.md` 文件，记录：

1. **日期** - 修改日期
2. **修改原因** - 为什么要修改
3. **修改的文件** - 文件名及路径
4. **具体修改内容** - 详细记录代码变更
   - 如果是新增函数，记录函数名和位置
   - 如果是修改现有代码，记录修改前后的关键代码
   - 如果是新增UI组件，记录位置和属性

### 日志格式

```markdown
## [YYYY-MM-DD] - 修改标题

### 文件：`路径/文件名.vue`

#### 修改类型（新增/修改/删除）

详细描述修改内容...

**关键代码：**
```javascript
// 代码片段
```
```

### 恢复修改

当用户说 **"查看修改日志，恢复修改"** 时：
1. 读取 `.trae/修改日志.md` 文件
2. 对比当前文件与日志记录的差异
3. 按日志记录恢复所有代码修改

### 日志文件位置

日志文件保存在：`.trae/修改日志.md`

这个位置不会被 Git 覆盖，是安全的。

---

## 最重要的核心功能（更新仓库后必须检查）

以下功能是用户最关心的，更新仓库后**必须**第一时间检查是否丢失：

### 1. Token管理页面 - 导出配置按钮

**文件**：`src/views/TokenImport/index.vue`

**检查项**：
- 页面顶部有黄色的"导出配置"按钮
- 按钮有 Download 图标
- 位置：在"批量功能+添加Token"下面一行

**导出的完整内容（必须包含）**：
1. 所有账号（gameTokens）- 含id, name, token, server, wsUrl, remark等
2. BIN文件（从IndexedDB导出）- 每个账号的.bin文件
3. 定时任务（scheduledTasks）
4. 批量任务设置（batchSettings）
5. 任务模板（taskTemplates）
6. 账号排序配置（tokenSortConfig）
7. **每个账号的阵容设置**（daily-settings:{tokenId}）
8. 版本号（version: "1.2"）和导出时间

**APK特殊处理**：
- 保存到 `/storage/emulated/0/Documents/` 目录
- 先检查存储权限，不足则请求
- 失败时回退到浏览器下载方式

**文件名格式**：`xyzw_config_YYYYMMDD_HHMM.json`

---

### 2. Token管理页面 - 导入配置按钮

**文件**：`src/views/TokenImport/index.vue`

**检查项**：
- 页面顶部有黄色的"导入配置"按钮
- 按钮有 CloudUpload 图标
- 使用 `<n-upload>` 组件包裹
- 位置：在"导出配置"按钮右边

**导入的完整流程（必须包含）**：
1. 读取JSON文件（支持直接JSON或Base64编码）
2. 恢复账号到gameTokens（匹配方式：token或id或name）
3. 恢复BIN文件到IndexedDB
4. 恢复定时任务到localStorage
5. 恢复批量任务设置
6. 恢复任务模板
7. 恢复账号排序配置
8. **恢复每个账号的阵容设置到localStorage**
9. 最后刷新页面 `location.reload()`

**关键函数**：
- `decodeBase64(str)` - 解码Base64编码的配置
- `importConfig({ file })` - 完整导入流程

**参考备份**：`backup_20260222_0046`

---

### 3. Token管理页面 - 三行垂直布局

**文件**：`src/views/TokenImport/index.vue`

**检查项**：
```
第一行：批量功能 + 添加Token
第二行：导出配置 + 导入配置
第三行：批量操作（下拉菜单）
```

**HTML结构**：
```html
<div class="header-actions">
  <div class="main-actions">批量功能 + 添加Token</div>
  <div class="config-actions">导出配置 + 导入配置</div>
  <n-dropdown>批量操作</n-dropdown>
</div>
```

**CSS样式**：
```css
.header-actions { flex-direction: column; }
.main-actions { flex-wrap: nowrap; }
.config-actions { flex-wrap: nowrap; }
```

---

### 4. 批量任务分批执行

**文件**：`src/views/BatchDailyTasks.vue`

**检查项**：
- 有 `selectedTasks = ref([])` 声明
- `ensureConnection` 函数有 `taskNames` 参数
- 有 `taskFunctionMap` 和 `getTaskFunction`
- 暂停时正确保存任务名称到任务队列

### 3. 阵容切换统一命令

**文件**：所有任务相关文件

**检查项**：
- 阵容切换命令统一使用 `presetteam_saveteam`
- 不是 `team_setdefaultteam`

### 4. 怪异塔单独阵容设置

**文件**：`src/views/BatchDailyTasks.vue` + `src/utils/batch/tasksTower.js`

**检查项**：
- 有 `weirdTowerFormation` 设置项
- 爬塔任务会根据塔类型使用不同阵容

### 5. 暂停时间检测功能

**文件**：`src/views/BatchDailyTasks.vue` + 所有任务模块

**检查项**：
- `BatchDailyTasks.vue` 中有 `isPauseTime` 响应式变量
- 有暂停时间配置界面（抢符时间、周六盐场、周日盐场、游戏更新等）
- `ensureConnection` 函数开头有暂停检测
- 暂停时将任务加入积攒队列 `taskQueue.value.push(...)`

### 6. 积攒任务恢复功能

**文件**：`src/views/BatchDailyTasks.vue`

**检查项**：
- 有 `taskQueue` 变量存储积攒任务
- 有 `startResumeCheck` 函数或类似的恢复逻辑
- 恢复任务时正确恢复 `selectedTokens` 和 `selectedTasks`
- 不会错误地执行日常任务

### 7. 账号列表折叠功能

**文件**：`src/views/BatchDailyTasks.vue`

**检查项**：
- 有折叠/展开按钮控制账号列表显示
- 点击可折叠/展开所有账号卡片
- 节省页面空间

### 8. 任务功能按键折叠功能

**文件**：`src/views/BatchDailyTasks.vue`

**检查项**：
- 底部任务按钮区域可以折叠
- 有"收起任务面板"/"展开任务面板"按钮
- 折叠后只显示关键按钮（开始/暂停/继续等）

---

### 9. 任务持久化功能

**文件**：`src/views/BatchDailyTasks.vue`

**检查项**：
- 有 `saveTaskState` 和 `getTaskState` 函数
- 有 `saveRunningTask` 函数保存任务配置
- 任务完成后会调用 `clearTaskState` 清除状态
- 页面刷新后任务状态可恢复
- 使用 `safeLocalStorage` 确保存储操作的安全性

---

### 10. 黑市周购买功能

**文件**：`src/components/cards/BlackMarketBuyer.vue` + `src/utils/batch/tasksBlackMarket.js`

**检查项**：
- 有黑市周购买助手卡片
- 支持选择商品和购买数量
- 支持批量购买多个账号
- 有暂停时间检测和任务队列管理
- 使用 `safeLocalStorage` 确保存储操作的安全性

---

### 11. 智能发车功能

**文件**：`src/components/CarTaskCard.vue` + `src/utils/batch/tasksCar.js`

**检查项**：
- 有俱乐部赛车卡片
- 支持智能发车和一键收车
- 支持根据车辆品质和奖励自动判断发车策略
- 有WebSocket连接状态检查
- 智能发车条件设置界面，包含：
  - 保底车辆颜色设置
  - 车辆强制刷新保底
  - 最大刷新次数限制（0=无限制刷新）
  - 刷新规则说明
  - 满足任一条件即可发车的逻辑
  - 奖励阈值设置（金砖、招募令、白玉、刷新券）

---

## 关键词触发规则

### 常用操作关键词

| 关键词 | 操作内容 | 执行命令 |
|--------|----------|----------|
| **构建APK** | 构建debug版APK | 按照APK构建流程执行 |
| **创建备份** | 创建带描述性后缀的备份 | 按照创建备份流程执行 |
| **推送代码** | 推送到GitHub仓库 | 按照GitHub推送流程执行 |
| **恢复备份** | 恢复指定备份 | 按照恢复备份流程执行 |
| **运行服务器** | 启动开发服务器 | `pnpm dev` |
| **构建项目** | 构建Web项目 | `pnpm build` |
| **同步Capacitor** | 同步Capacitor项目 | `pnpm cap sync android` |

---

## 推送代码流程

当用户说 **"推送代码"** 时，按以下顺序执行：

1. **返回项目根目录**
   ```powershell
   cd "f:\XYZW_WEB\xyzw_web_helper-main"
   ```

2. **检查并移除账号配置文件**（重要！避免上传敏感信息）
   ```powershell
   # 删除本地账号配置文件
   Remove-Item "xyzw_config_*.json" -ErrorAction SilentlyContinue
   Remove-Item "*.bin" -ErrorAction SilentlyContinue  # 排除BIN文件
   Remove-Item ".env*" -ErrorAction SilentlyContinue  # 排除环境变量文件
   Remove-Item "*.log" -ErrorAction SilentlyContinue  # 排除日志文件
   Remove-Item "*.tmp" -ErrorAction SilentlyContinue  # 排除临时文件
   Remove-Item "dist" -Recurse -ErrorAction SilentlyContinue  # 排除构建产物
   Remove-Item ".vscode" -Recurse -ErrorAction SilentlyContinue  # 排除VSCode配置
   Remove-Item ".idea" -Recurse -ErrorAction SilentlyContinue  # 排除IntelliJ配置
   Remove-Item "backup_*" -Recurse -ErrorAction SilentlyContinue  # 排除备份目录
   
   # 从Git暂存区移除账号配置文件
   git rm --cached "xyzw_config_*.json" -f 2>$null
   git rm --cached "*.bin" -f 2>$null  # 从暂存区移除BIN文件
   git rm --cached ".env*" -f 2>$null  # 从暂存区移除环境变量文件
   git rm --cached "*.log" -f 2>$null  # 从暂存区移除日志文件
   git rm --cached "*.tmp" -f 2>$null  # 从暂存区移除临时文件
   git rm --cached "dist" -r -f 2>$null  # 从暂存区移除构建产物
   git rm --cached ".vscode" -r -f 2>$null  # 从暂存区移除VSCode配置
   git rm --cached ".idea" -r -f 2>$null  # 从暂存区移除IntelliJ配置
   git rm --cached "backup_*" -r -f 2>$null  # 从暂存区移除备份目录
   ```

3. **添加所有修改**
   ```powershell
   git add .
   ```

4. **查看状态**（确保没有敏感文件）
   ```powershell
   git status
   ```

5. **提交修改**（使用描述性的提交信息）
   ```powershell
   git commit -m "提交描述"
   ```

6. **推送到指定仓库**（重要！只能推送到这个仓库）
   ```powershell
   git push origin main
   ```
   
   **目标仓库**：`https://github.com/linfsy/xyzw_web_helper.git`
   
   **注意**：只能推送到 `origin`，不能推送到 `upstream`（上游仓库）

### 如何使用

1. **构建APK**：发送"构建APK"，我会执行完整的APK构建流程
2. **创建备份**：发送"创建备份"，我会创建带描述性后缀的备份
3. **推送代码**：发送"推送代码"，我会将修改推送到GitHub仓库
4. **恢复备份**：发送"恢复备份"，我会列出所有备份供你选择
5. **运行服务器**：发送"运行服务器"，我会启动开发服务器

### 示例

- 发送：`构建APK` → 执行APK构建流程
- 发送：`创建备份` → 执行创建备份流程
- 发送：`推送代码` → 执行GitHub推送流程
- 发送：`恢复备份` → 执行恢复备份流程
- 发送：`运行服务器` → 启动开发服务器

---

## 仓库覆盖更新后的快速检查清单

1. 打开Token管理页面，检查"导出配置"和"导入配置"按钮是否存在
2. 检查批量任务页面能否正常执行
3. 查看修改日志 `.trae/修改日志.md`
4. 按日志恢复所有缺失的修改

---

## 任务系统修改规则（重要！）

当需要修改任务系统相关代码时（包括定时任务、积攒队列、分批执行等），**必须先执行以下分析流程，只分析不修改**：

### 分析命令关键词

当用户要求修改任务系统时，先发送：**"任务系统分析"** 或 **"分析任务冲突"**

### 必须分析的三种执行场景

#### 1. 定时任务执行流程
```
startScheduler (定时任务调度器)
  ├─→ 检查 isPauseTime.value.paused
  │     ├─→ true: 加入积攒队列 + continue
  │     └─→ false: 继续
  ├─→ 检查 batchTaskStore.isRunning.value
  │     ├─→ true: 加入积攒队列 + continue
  │     └─→ false: 继续
  ├─→ 再次检查 batchTaskStore.isRunning.value（防止竞态条件）
  │     ├─→ true: 加入积攒队列 + continue
  │     └─→ false: 继续
  ├─→ 设置 task_executing_${task.id} 标记
  ├─→ batchTaskStore.startTask() // isRunning = true
  ├─→ 执行 executeScheduledTask(task, true)
  └─→ finally:
        ├─→ 清除 task_executing_${task.id} 标记
        ├─→ batchTaskStore.stopTask() // isRunning = false
        ├─→ 更新 lastTaskExecution
        └─→ checkAndExecuteQueuedTasks()
```

#### 2. 积攒队列执行流程
```
checkAndExecuteQueuedTasks()
  ├─→ 检查 isExecutingQueuedTasks.value
  │     ├─→ true: return
  │     └─→ false: 设置 isExecutingQueuedTasks.value = true
  ├─→ batchTaskStore.startTask() // isRunning = true
  ├─→ 遍历积攒队列中的任务
  │     └─→ 对于每个任务，调用 startBatch(true) 或 executeInBatches(..., true)
  └─→ finally:
        ├─→ isExecutingQueuedTasks.value = false
        └─→ batchTaskStore.stopTask() // isRunning = false
```

#### 3. 分批任务执行流程 (executeInBatches)
```
executeInBatches(taskFunction, taskName, taskFunctionName, isFromQueue = false)
  ├─→ 检查 !isFromQueue && batchTaskStore.isRunning.value
  │     ├─→ true: 加入积攒队列 + return
  │     └─→ false: 继续
  ├─→ batchTaskStore.startTask() // isRunning = true
  ├─→ for 循环遍历批次:
  │     ├─→ 保存 wasRunningBeforeTask = batchTaskStore.isRunning.value
  │     ├─→ 执行 taskFunction()
  │     ├─→ finally: 如果 wasRunningBeforeTask && !isRunning.value，则恢复 isRunning
  │     ├─→ 如果还有下一批:
  │     │     └─→ while 循环等待:
  │     │           ├─→ 每秒检查: 如果 !isRunning.value，则 startTask()
  │     │           └─→ 检查暂停时间
  │     └─→ resetShouldStop()
  └─→ 循环结束后:
        ├─→ batchTaskStore.stopTask() // isRunning = false
        └─→ await checkAndExecuteQueuedTasks()
```

### 关键检查点

修改前必须检查以下关键点：

1. **isRunning 状态访问**：
   - ✅ 正确：`batchTaskStore.isRunning.value`
   - ❌ 错误：`batchTaskStore.isRunning`（返回的是 ref 对象，不是布尔值）

2. **任务冲突检测位置**：
   - `executeInBatches` 函数开头
   - `startBatch` 函数开头
   - `startScheduler` 函数中（定时任务调度器）
   - `manualExecuteTask` 函数中

3. **continue/return 语句**：
   - 加入积攒队列后必须有 `continue` 或 `return`，防止代码继续执行

4. **状态恢复逻辑**：
   - 任务完成后必须重置 isRunning
   - 分批等待期间必须保持 isRunning 为 true
   - 异常情况下也要正确恢复状态

5. **竞态条件防护**：
   - 执行任务前再次检查 isRunning
   - 使用 task_executing_${task.id} 标记防止重复执行

### 分析输出格式

执行分析后，必须输出以下信息：

```markdown
## 任务系统冲突分析

### 修改影响范围
- [ ] 定时任务执行流程
- [ ] 积攒队列执行流程
- [ ] 分批任务执行流程

### 关键检查点验证
- [ ] isRunning 状态访问使用 .value
- [ ] 任务冲突检测逻辑正确
- [ ] continue/return 语句存在
- [ ] 状态恢复逻辑正确
- [ ] 竞态条件防护措施存在

### 潜在冲突分析
1. **场景1**：定时任务到时间时有分批任务正在等待
   - 预期行为：定时任务加入积攒队列
   - 风险点：等待期间 isRunning 状态可能被错误设置

2. **场景2**：积攒队列执行期间新定时任务到时间
   - 预期行为：新定时任务加入积攒队列
   - 风险点：isExecutingQueuedTasks 和 isRunning 双重检查

3. **场景3**：分批任务执行期间定时任务到时间
   - 预期行为：定时任务加入积攒队列
   - 风险点：批次间的等待期间状态管理

### 修改建议
（在这里提出具体的修改方案，等待用户确认后再执行）
```

### 示例对话

**用户**：修复积攒队列不执行的问题

**助手**：在修改前，我需要先进行任务系统冲突分析。

**分析过程**：
1. 搜索所有 isRunning 使用位置
2. 画出三种执行流程的调用关系
3. 检查关键检查点
4. 分析潜在冲突

**分析结果**：输出上述格式的分析报告

**等待用户确认**：
"根据分析，问题可能出现在 XXX，建议修改 YYY。请确认这个方案是否正确？"

**用户确认后**：执行修改

---

**重要提醒**：违反此规则可能导致任务系统出现严重冲突，务必严格执行！
