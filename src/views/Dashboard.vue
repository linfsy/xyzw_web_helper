<template>
  <div class="dashboard-page">
    <!-- 主要内容 -->
    <main class="dashboard-main">
      <div class="main-container">
        <!-- 欢迎区域 -->
        <section class="welcome-section">
          <div class="welcome-content">
            <div class="welcome-text">
              <h1>
                欢迎回来，{{ tokenStore.selectedToken?.name || "游戏玩家" }}！
              </h1>
              <p>今天是 {{ currentDate }}，继续您的游戏管理之旅吧</p>
            </div>
            <div class="action-columns">
              <div class="welcome-actions">
                <n-button
                  type="primary"
                  size="large"
                  style="width: 160px;"
                  @click="router.push('/admin/game-features')"
                >
                  进入游戏功能
                </n-button>
                <n-button
                  type="info"
                  size="large"
                  style="width: 160px;"
                  @click="handleManageTokens"
                >
                  管理Token
                </n-button>
              </div>
              <div class="config-actions">
                <n-button
                  type="warning"
                  size="large"
                  style="width: 160px;"
                  @click="handleExportConfig"
                >
                  <template #icon>
                    <component :is="CloudDownloadOutline" />
                  </template>
                  导出配置
                </n-button>
                <n-upload
                  :show-file-list="false"
                  :custom-request="handleImportConfig"
                  accept=".json"
                >
                  <n-button
                    type="warning"
                    size="large"
                    style="width: 160px;"
                  >
                    <template #icon>
                      <component :is="CloudUploadOutline" />
                    </template>
                    导入配置
                  </n-button>
                </n-upload>
              </div>
            </div>
          </div>
        </section>

        <!-- 快速操作 -->
        <section class="quick-actions-section">
          <h2 class="section-title">快速操作</h2>
          <div class="actions-grid">
            <div
              v-for="action in quickActions"
              :key="action.id"
              class="action-card"
              @click="handleQuickAction(action)"
            >
              <div class="action-icon">
                <component :is="action.icon" />
              </div>
              <div class="action-content">
                <h3>{{ action.title }}</h3>
                <p>{{ action.description }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useMessage } from "naive-ui";
import { useTokenStore, gameTokens } from "@/stores/tokenStore";
import useIndexedDB from "@/hooks/useIndexedDB";
import { Filesystem, Directory } from '@capacitor/filesystem';
import {
  PersonCircle,
  Cube,
  Settings,
  CheckmarkCircle,
  Time,
  TrendingUp,
  Add,
  Cloud,
  CloudUploadOutline,
  CloudDownloadOutline,
} from "@vicons/ionicons5";

const router = useRouter();
const message = useMessage();
const tokenStore = useTokenStore();
const indexedDB = useIndexedDB();

const decodeBase64 = (str) => {
  try {
    str = str.replace(/[\s\n\r]/g, '');
    try {
      return decodeURIComponent(escape(atob(str)));
    } catch (e) {
      const binary = atob(str);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    }
  } catch (e) {
    throw new Error('Base64解码失败: ' + e.message);
  }
};

const handleExportConfig = async () => {
  try {
    const loadingMsg = message.loading('正在导出配置，读取BIN文件中...', { duration: 0 });
    
    const { waitForReady, getAllKeys, getArrayBuffer } = indexedDB;
    const ready = await waitForReady(3000);
    if (!ready) {
      console.warn('IndexedDB 未准备好，跳过BIN文件导出');
    }

    const tokens = gameTokens.value;
    const validTokenIds = new Set(tokens.map((t) => t.id));

    const tokenSettings = [];
    tokens.forEach((token) => {
      const settings = localStorage.getItem(`daily-settings:${token.id}`);
      if (settings) {
        try {
          tokenSettings.push({
            tokenId: token.id,
            settings: JSON.parse(settings),
          });
        } catch (e) {
          console.warn(`Failed to parse settings for token ${token.id}`, e);
        }
      }
    });

    let scheduledTasks = [];
    try {
      const saved = localStorage.getItem("scheduledTasks");
      if (saved) {
        const parsed = JSON.parse(saved);
        scheduledTasks = Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.warn('获取定时任务失败', e);
    }

    let batchSettings = {};
    try {
      const saved = localStorage.getItem("batchSettings");
      if (saved) {
        batchSettings = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('获取批量设置失败', e);
    }

    let taskTemplates = [];
    try {
      const saved = localStorage.getItem("task-templates");
      if (saved) {
        const parsed = JSON.parse(saved);
        taskTemplates = Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.warn('获取任务模板失败', e);
    }

    let tokenSortConfig = null;
    try {
      const saved = localStorage.getItem("tokenSortConfig");
      if (saved) {
        tokenSortConfig = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('获取账号排序配置失败', e);
    }

    let tokenGroups = [];
    try {
      const saved = localStorage.getItem("tokenGroups");
      if (saved) {
        tokenGroups = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('获取分组配置失败', e);
    }

    const binFiles = {};
    if (ready) {
      try {
        const keys = await getAllKeys();
        const existingKeys = new Set(keys);
        
        for (const token of tokens) {
          let arrayBuffer = null;
          
          if (existingKeys.has(token.id)) {
            arrayBuffer = await getArrayBuffer(token.id);
          } else if (existingKeys.has(token.name)) {
            arrayBuffer = await getArrayBuffer(token.name);
          }
          
          if (arrayBuffer) {
            binFiles[token.id] = Array.from(new Uint8Array(arrayBuffer));
          }
        }
      } catch (binError) {
        console.error('获取BIN文件失败:', binError);
      }
    }

    const exportData = {
      version: "1.2",
      exportTime: new Date().toISOString(),
      tokens: tokens.map((t) => ({
        id: t.id,
        name: t.name,
        token: t.token,
        server: t.server,
        wsUrl: t.wsUrl,
        remark: t.remark,
        importMethod: t.importMethod,
        sourceUrl: t.sourceUrl,
        upgradedToPermanent: true,
        upgradedAt: t.upgradedAt,
        updatedAt: t.updatedAt,
      })),
      scheduledTasks: scheduledTasks,
      batchSettings: batchSettings,
      taskTemplates: taskTemplates,
      tokenSortConfig: tokenSortConfig,
      tokenSettings: tokenSettings,
      tokenGroups: tokenGroups,
      binFiles: binFiles,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const getBeijingDateTime = () => {
      const now = new Date();
      now.setHours(now.getHours() + 8);
      return now.toISOString().slice(0, 16).replace('T', '_').replace(':', '');
    };
    const fileName = `xyzw_config_${getBeijingDateTime()}.json`;

    const isAndroidApp = typeof window !== 'undefined' && 
                      window.Capacitor && 
                      (window.Capacitor.isNativePlatform() || /android/i.test(navigator.userAgent));

    if (isAndroidApp) {
      try {
        loadingMsg.content = '正在保存文件...';
        const permStatus = await Filesystem.checkPermissions();
        if (permStatus.publicStorage !== 'granted') {
          const reqResult = await Filesystem.requestPermissions();
          if (reqResult.publicStorage !== 'granted') {
            loadingMsg.destroy();
            message.error('存储权限被拒绝，请在设置中允许存储权限后重试');
            return;
          }
        }

        const encodedData = btoa(unescape(encodeURIComponent(jsonString)));
        await Filesystem.writeFile({
          path: fileName,
          data: encodedData,
          directory: Directory.Documents,
          encoding: 'utf8'
        });
        
        await new Promise((resolve) => setTimeout(resolve, 500));
        loadingMsg.destroy();
        message.success(`设置导出成功！文件已保存到：/storage/emulated/0/Documents/${fileName}`);
      } catch (fsError) {
        loadingMsg.destroy();
        console.error('文件系统保存失败:', fsError);
        message.warning('存储权限可能不足，尝试使用浏览器下载方式');
        saveFileByDownload(jsonString, fileName);
      }
    } else {
      loadingMsg.destroy();
      saveFileByDownload(jsonString, fileName);
    }
  } catch (error) {
    loadingMsg.destroy();
    console.error("导出失败:", error);
    message.error("导出失败: " + error.message);
  }
};

const saveFileByDownload = (jsonString, fileName) => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const exportData = JSON.parse(jsonString);
    message.success(`导出成功: ${exportData.tokens.length} 个账号, ${exportData.scheduledTasks?.length || 0} 个定时任务, ${Object.keys(exportData.binFiles || {}).length} 个BIN文件`);
};

const handleImportConfig = async ({ file }) => {
  try {
    const reader = new FileReader();
    const { waitForReady, storeArrayBuffer } = indexedDB;

    reader.onload = async (e) => {
      try {
        let importData;
        let content = e.target.result;

        try {
          importData = JSON.parse(content);
          message.info('JSON格式，直接解析成功');
        } catch (jsonError) {
          try {
            const decodedContent = decodeBase64(content);
            message.info(`Base64解码成功，长度: ${decodedContent.length}`);
            importData = JSON.parse(decodedContent);
            message.info('JSON解析成功');
          } catch (base64Error) {
            console.error('Base64解码失败:', base64Error);
            throw new Error('文件格式错误：既不是有效的JSON文件，也不是Base64编码的JSON文件');
          }
        }

        const info = {
          version: importData.version,
          tokensCount: importData.tokens?.length,
          binCount: Object.keys(importData.binFiles || {}).length,
        };
        message.info(`配置版本: v${info.version}, ${info.tokensCount}账号, ${info.binCount}BIN`);

        if (!importData.version || !importData.tokens) {
          message.error("无效的配置文件格式");
          return;
        }

        let importedTokens = 0;
        let restoredBinFiles = 0;

        message.info('开始导入账号...');
        if (Array.isArray(importData.tokens)) {
          message.info(`找到 ${importData.tokens.length} 个账号`);
          importData.tokens.forEach((token, idx) => {
            try {
              const existingToken = gameTokens.value.find(
                (t) => t.token === token.token || t.id === token.id || t.name === token.name
              );
              if (existingToken) {
                Object.assign(existingToken, token, {
                  upgradedToPermanent: true,
                  lastUsed: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
                importedTokens++;
              } else if (token.token) {
                gameTokens.value.push({
                  ...token,
                  importMethod: token.importMethod || "import",
                  upgradedToPermanent: true,
                  createdAt: new Date().toISOString(),
                  lastUsed: new Date().toISOString(),
                });
                importedTokens++;
              }
            } catch (tokenErr) {
              message.warning(`导入账号失败 ${idx + 1}: ${token.name}`);
              console.error(tokenErr);
            }
          });
          message.success(`账号导入完成: ${importedTokens} 个`);
        }

        message.info('开始导入账号设置...');
        if (Array.isArray(importData.tokenSettings)) {
          importData.tokenSettings.forEach((item, idx) => {
            try {
              if (item.tokenId && item.settings) {
                localStorage.setItem(
                  `daily-settings:${item.tokenId}`,
                  JSON.stringify(item.settings)
                );
              }
            } catch (settingsErr) {
              message.warning(`导入账号设置失败 ${idx + 1}`);
              console.error(settingsErr);
            }
          });
        }

        if (importData.binFiles) {
          message.info('开始导入BIN文件...');
          const ready = await waitForReady(3000);
          if (!ready) {
            message.error('IndexedDB 未准备好，无法导入BIN文件');
          }
          const binFiles = importData.binFiles;
          message.info(`找到 ${Object.keys(binFiles).length} 个BIN文件`);

          for (const [tokenId, uint8Array] of Object.entries(binFiles)) {
            try {
              const arrayBuffer = new Uint8Array(uint8Array).buffer;
              await storeArrayBuffer(tokenId, arrayBuffer);
              restoredBinFiles++;
            } catch (error) {
              message.warning(`BIN导入失败: ${tokenId}`);
              console.error(error);
            }
          }
          message.success(`BIN文件导入完成: ${restoredBinFiles} 个`);
        }

        if (importData.taskTemplates && Array.isArray(importData.taskTemplates)) {
          try {
            localStorage.setItem("task-templates", JSON.stringify(importData.taskTemplates));
            message.info(`任务模板导入完成: ${importData.taskTemplates.length} 个`);
          } catch (e) {
            console.error('导入任务模板失败:', e);
          }
        }

        if (importData.tokenSortConfig) {
          try {
            localStorage.setItem("tokenSortConfig", JSON.stringify(importData.tokenSortConfig));
            message.info('账号排序配置已导入');
          } catch (e) {
            console.error('导入排序配置失败:', e);
          }
        }

        if (importData.batchSettings) {
          try {
            localStorage.setItem("batchSettings", JSON.stringify(importData.batchSettings));
            message.info('批量任务设置已导入');
          } catch (e) {
            console.error('导入批量任务设置失败:', e);
          }
        }

        if (importData.scheduledTasks && Array.isArray(importData.scheduledTasks)) {
          try {
            localStorage.setItem("scheduledTasks", JSON.stringify(importData.scheduledTasks));
            message.info(`定时任务导入完成: ${importData.scheduledTasks.length} 个`);
          } catch (e) {
            console.error('导入定时任务失败:', e);
          }
        }

        if (importData.tokenGroups) {
          try {
            localStorage.setItem("tokenGroups", JSON.stringify(importData.tokenGroups));
            message.info('分组配置已导入');
          } catch (e) {
            console.error('导入分组配置失败:', e);
          }
        }

        let successMessage = `导入成功: ${importedTokens} 个账号`;
        if (restoredBinFiles > 0) {
          successMessage += `, ${restoredBinFiles} 个BIN文件`;
        }
        message.success(successMessage);
        
        // 刷新页面以显示导入的分组信息
        setTimeout(() => {
          location.reload();
        }, 500);
      } catch (parseError) {
        console.error("Parse error:", parseError);
        message.error("解析配置文件失败: " + parseError.message);
      }
    };
    reader.readAsText(file.file);
  } catch (error) {
    console.error("Import failed:", error);
    message.error("导入失败: " + error.message);
  }
};

// 响应式数据
// const recentActivities = ref([]);

// 计算属性
const currentDate = computed(() => {
  return new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
});

const quickActions = ref([
  {
    id: 1,
    icon: Cube,
    title: "游戏功能",
    description: "访问所有游戏功能模块",
    action: "game-features",
  },
  {
    id: 2,
    icon: Add,
    title: "添加Token",
    description: "快速添加新的游戏Token",
    action: "add-token",
  },
  {
    id: 3,
    icon: CheckmarkCircle,
    title: "批量任务",
    description: "批量执行任务",
    action: "batch-daily-tasks",
  },
  {
    id: 4,
    icon: Cloud,
    title: "WebSocket测试",
    description: "测试WebSocket连接和游戏命令",
    action: "websocket-test",
  },
]);

const handleManageTokens = () => {
  // 降噪
  /* 当前Token状态:
    hasTokens: tokenStore.hasTokens,
    selectedToken: tokenStore.selectedToken?.name,
    tokenCount: tokenStore.gameTokens.length
  */

  try {
    router.push("/tokens");
    // 降噪
  } catch (error) {
    console.error("❌ 导航失败:", error);
    message.error("导航到Token管理页面失败");
  }
};

const handleQuickAction = (action) => {
  switch (action.action) {
    case "game-features":
      router.push("/admin/game-features");
      break;
    case "add-token":
      handleManageTokens();
      break;
    case "execute-tasks":
      router.push("/admin/game-features");
      break;
    case "websocket-test":
      router.push("/websocket-test");
      break;
    case "open-settings":
      router.push("/admin/profile");
      break;
    case "batch-daily-tasks":
      router.push("/admin/batch-daily-tasks");
      break;
  }
};

/*
const getActivityIcon = (type) => {
  switch (type) {
    case "success":
      return CheckmarkCircle;
    case "warning":
      return Time;
    case "info":
    default:
      return Cube;
  }
};

const formatTime = (timestamp) => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  } else {
    return "刚刚";
  }
};
*/

// 生命周期
onMounted(async () => {
  // 确保有Token
  if (!tokenStore.hasTokens) {
    router.push("/tokens");
    return;
  }

  // 初始化Token数据
  tokenStore.initTokenStore();
});
</script>

<style scoped lang="scss">
.dashboard-page {
  min-height: 100vh;
  background: var(--bg-secondary);
}

// 主要内容
.dashboard-main {
  padding: var(--spacing-xl);
}

.main-container {
  max-width: 1400px;
  margin: 0 auto;
}

// 欢迎区域
.welcome-section {
  background: linear-gradient(
    135deg,
    var(--primary-color) 0%,
    var(--secondary-color) 100%
  );
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-2xl);
  margin-bottom: var(--spacing-xl);
  color: white;
}

.welcome-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-lg);
}

.welcome-text {
  h1 {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--spacing-sm);
  }

  p {
    font-size: var(--font-size-lg);
    opacity: 0.9;
    margin: 0;
  }
}

.action-columns {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.welcome-actions {
  display: flex;
  gap: var(--spacing-md);
}

.config-actions {
  display: flex;
  gap: var(--spacing-md);
  opacity: 0.9;
}

// 统计区域
.stats-section {
  margin-bottom: var(--spacing-xl);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.stat-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-large);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-light);
  transition: all var(--transition-normal);

  &:hover {
    box-shadow: var(--shadow-medium);
    transform: translateY(-2px);
  }
}

.stat-icon {
  width: 48px;
  height: 48px;
  margin-bottom: var(--spacing-md);

  :deep(svg) {
    width: 100%;
    height: 100%;
  }
}

.stat-number {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.stat-label {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-xs);
}

.stat-change {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);

  &.positive {
    color: var(--success-color);
  }

  &.negative {
    color: var(--error-color);
  }
}

// 快速操作区域
.quick-actions-section {
  margin-bottom: var(--spacing-xl);
}

.section-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-lg);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.action-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-large);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-light);
  cursor: pointer;
  transition: all var(--transition-normal);

  &:hover {
    box-shadow: var(--shadow-medium);
    transform: translateY(-2px);
  }
}

.action-icon {
  width: 40px;
  height: 40px;
  color: var(--primary-color);
  margin-bottom: var(--spacing-md);

  :deep(svg) {
    width: 100%;
    height: 100%;
  }
}

.action-content {
  h3 {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin-bottom: var(--spacing-xs);
  }

  p {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin: 0;
  }
}

// 最近活动区域
.recent-activity-section {
  background: var(--bg-primary);
  border-radius: var(--border-radius-large);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-light);
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.activity-item {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-medium);
  transition: background var(--transition-fast);

  &:hover {
    background: var(--bg-tertiary);
  }
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.success {
    background: rgba(24, 160, 88, 0.1);
    color: var(--success-color);
  }

  &.warning {
    background: rgba(240, 160, 32, 0.1);
    color: var(--warning-color);
  }

  &.info {
    background: rgba(32, 128, 240, 0.1);
    color: var(--info-color);
  }

  :deep(svg) {
    width: 16px;
    height: 16px;
  }
}

.activity-content {
  flex: 1;
}

.activity-text {
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-xs);
}

.activity-time {
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
}

.empty-activity {
  text-align: center;
  padding: var(--spacing-xl) 0;
}

// 响应式设计
@media (max-width: 1024px) {
  .welcome-content {
    flex-direction: column;
    text-align: center;
  }

  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }
}

@media (max-width: 768px) {
  .dashboard-main {
    padding: var(--spacing-md);
  }

  .nav-menu {
    display: none;
  }

  .welcome-section {
    padding: var(--spacing-xl);
  }

  .welcome-text h1 {
    font-size: var(--font-size-2xl);
  }

  .welcome-actions {
    flex-direction: column;
    width: 100%;
  }

  .welcome-actions .n-button,
  .config-actions .n-button {
    width: 100% !important;
  }

  .config-actions {
    flex-direction: column;
    width: 100%;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
