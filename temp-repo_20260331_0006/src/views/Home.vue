<template>
  <div class="home-page">
    <!-- 导航栏 -->
    <nav class="navbar glass">
      <div class="container">
        <div class="nav-content">
          <div class="nav-brand">
            <img src="/icons/xiaoyugan.png" alt="XYZW" class="brand-logo" />
            <span class="brand-text">XYZW 游戏管理系统</span>
          </div>

          <div class="mobile-menu-button">
            <n-button text @click="isMobileMenuOpen = true">
              <n-icon>
                <Menu />
              </n-icon>
            </n-button>
          </div>

          <div class="nav-actions">
            <template v-if="!authStore.isAuthenticated">
              <n-button
                text
                type="primary"
                size="large"
                @click="router.push('/login')"
              >
                登录
              </n-button>
              <n-button
                type="primary"
                size="large"
                @click="router.push('/register')"
              >
                注册
              </n-button>
            </template>
            <template v-else>
              <n-button
                type="primary"
                size="large"
                @click="router.push('/admin/dashboard')"
              >
                进入控制台
              </n-button>
            </template>
          </div>
        </div>
      </div>
    </nav>

    <n-drawer
      v-model:show="isMobileMenuOpen"
      placement="left"
      style="width: 260px"
    >
      <div class="drawer-menu">
        <router-link
          to="/"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Ribbon />
          </n-icon>
          <span>首页</span>
        </router-link>
        <router-link
          to="/admin/dashboard"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Settings />
          </n-icon>
          <span>控制台</span>
        </router-link>
        <router-link
          to="/admin/game-features"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Cube />
          </n-icon>
          <span>游戏功能</span>
        </router-link>
        <router-link
          to="/tokens"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <PersonCircle />
          </n-icon>
          <span>Token管理</span>
        </router-link>
        <router-link
          to="/changelog"
          class="drawer-item"
          @click="isMobileMenuOpen = false"
        >
          <n-icon>
            <Ribbon />
          </n-icon>
          <span>更新日志</span>
        </router-link>
        <div class="drawer-actions">
          <n-button
            type="primary"
            block
            @click="
              router.push('/login');
              isMobileMenuOpen = false;
            "
            >登录</n-button
          >
          <n-button
            type="primary"
            block
            @click="
              router.push('/register');
              isMobileMenuOpen = false;
            "
            >注册</n-button
          >
        </div>
      </div>
    </n-drawer>

    <!-- 主要内容 -->
    <main class="main-content">
      <!-- 英雄区域 -->
      <section class="hero-section">
        <div class="container">
          <div class="hero-content">
            <div class="hero-text">
              <h1 class="hero-title">专业的游戏管理平台</h1>
              <p class="hero-subtitle">让游戏变得更简单，让管理变得更高效</p>
              <div class="hero-actions">
                <n-button
                  type="primary"
                  size="large"
                  class="hero-button"
                  @click="
                    router.push(
                      authStore.isAuthenticated
                        ? '/admin/dashboard'
                        : '/register',
                    )
                  "
                >
                  {{ authStore.isAuthenticated ? "进入控制台" : "立即开始" }}
                </n-button>
                <n-upload
                  :show-file-list="false"
                  accept=".json"
                  :custom-request="importConfig"
                >
                  <n-button
                    type="warning"
                    size="large"
                    class="hero-button"
                  >
                    导入配置
                  </n-button>
                </n-upload>
                <n-button
                  text
                  type="primary"
                  size="large"
                  class="hero-button"
                  @click="scrollToFeatures"
                >
                  了解更多
                </n-button>
              </div>
            </div>

            <div class="hero-visual">
              <div class="feature-cards">
                <div
                  v-for="card in featureCards"
                  :key="card.id"
                  class="feature-card"
                >
                  <div class="card-icon">
                    <component :is="card.icon" />
                  </div>
                  <div class="card-content">
                    <h3>{{ card.title }}</h3>
                    <p>{{ card.description }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 功能特性 -->
      <section ref="featuresSection" class="features-section">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">核心功能</h2>
            <p class="section-subtitle">为您提供全方位的游戏管理解决方案</p>
          </div>

          <div class="features-grid">
            <div
              v-for="feature in features"
              :key="feature.id"
              class="feature-item"
            >
              <div class="feature-icon">
                <component :is="feature.icon" />
              </div>
              <h3 class="feature-title">
                {{ feature.title }}
              </h3>
              <p class="feature-description">
                {{ feature.description }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 统计数据 -->
      <section class="stats-section">
        <div class="container">
          <div class="stats-grid">
            <div v-for="stat in stats" :key="stat.id" class="stat-item">
              <div class="stat-number">
                {{ stat.number }}
              </div>
              <div class="stat-label">
                {{ stat.label }}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-brand">
            <img src="/icons/xiaoyugan.png" alt="XYZW" class="footer-logo" />
            <span class="footer-text">XYZW 游戏管理系统</span>
          </div>
          <div class="footer-links">
            <router-link to="/changelog" class="footer-link">
              更新日志
            </router-link>
            <a href="#" class="footer-link">关于我们</a>
            <a href="#" class="footer-link">隐私政策</a>
            <a href="#" class="footer-link">服务条款</a>
            <a href="#" class="footer-link">联系我们</a>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2024 XYZW. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, markRaw } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { gameTokens } from "@/stores/tokenStore";
import { PersonCircle, Cube, Ribbon, Settings, Menu } from "@vicons/ionicons5";
import { useMessage } from "naive-ui";
import useIndexedDB from "@/hooks/useIndexedDB";

const router = useRouter();
const authStore = useAuthStore();
const message = useMessage();
const featuresSection = ref(null);
const isMobileMenuOpen = ref(false);
const { getArrayBuffer, storeArrayBuffer, waitForReady } = useIndexedDB();

// 解码Base64编码的配置
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

// 导入配置函数
const importConfig = async ({ file }) => {
  try {
    const loadingMsg = message.loading('正在读取配置文件...', { duration: 0 });
    const reader = new FileReader();
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
          tasksCount: importData.scheduledTasks?.length,
          binCount: Object.keys(importData.binFiles || {}).length,
        };
        message.info(`配置版本: v${info.version}, ${info.tokensCount}账号, ${info.tasksCount}任务, ${info.binCount}BIN`);

        if (!importData.version || !importData.tokens) {
          message.error("无效的配置文件格式");
          return;
        }

        let importedTokens = 0;
        let restoredBinFiles = 0;

        // 导入账号
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

        // 导入定时任务
        if (Array.isArray(importData.scheduledTasks)) {
          message.info(`找到 ${importData.scheduledTasks.length} 个定时任务`);
          try {
            localStorage.setItem("scheduledTasks", JSON.stringify(importData.scheduledTasks));
            message.success(`定时任务导入完成: ${importData.scheduledTasks.length} 个`);
          } catch (e) {
            console.error('导入定时任务失败:', e);
          }
        }

        // 导入批量设置
        if (importData.batchSettings) {
          try {
            localStorage.setItem("batchSettings", JSON.stringify(importData.batchSettings));
            message.success('批量设置导入完成');
          } catch (e) {
            console.error('导入批量设置失败:', e);
          }
        }

        // 导入账号设置
        if (Array.isArray(importData.tokenSettings)) {
          message.info(`找到 ${importData.tokenSettings.length} 个账号设置`);
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

        // 导入BIN文件
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

        // 导入任务模板
        if (importData.taskTemplates && Array.isArray(importData.taskTemplates)) {
          try {
            localStorage.setItem("task-templates", JSON.stringify(importData.taskTemplates));
            message.info(`任务模板导入完成: ${importData.taskTemplates.length} 个`);
          } catch (e) {
            console.error('导入任务模板失败:', e);
          }
        }

        // 导入账号排序配置
        if (importData.tokenSortConfig) {
          try {
            localStorage.setItem("tokenSortConfig", JSON.stringify(importData.tokenSortConfig));
            message.info('账号排序配置已导入');
          } catch (e) {
            console.error('导入排序配置失败:', e);
          }
        }

        // 导入分组信息
        if (importData.tokenGroups && Array.isArray(importData.tokenGroups)) {
          try {
            localStorage.setItem("tokenGroups", JSON.stringify(importData.tokenGroups));
            message.info(`分组信息导入完成: ${importData.tokenGroups.length} 个`);
          } catch (e) {
            console.error('导入分组信息失败:', e);
          }
        }

        let successMessage = `导入成功: ${importedTokens} 个账号`;
        if (restoredBinFiles > 0) {
          successMessage += `, ${restoredBinFiles} 个BIN文件`;
        }
        message.success(successMessage);
        
        // 等待IndexedDB完全写入
        await new Promise((resolve) => setTimeout(resolve, 500));
        location.reload();
      } catch (parseError) {
        console.error("Parse error:", parseError);
        message.error("解析配置文件失败: " + parseError.message);
      } finally {
        loadingMsg.destroy();
      }
    };
    reader.readAsText(file.file);
  } catch (error) {
    console.error("Import failed:", error);
    message.error("导入失败: " + error.message);
  }
};

// 功能卡片数据
const featureCards = ref([
  {
    id: 1,
    icon: markRaw(PersonCircle),
    title: "角色管理",
    description: "统一管理游戏角色",
  },
  {
    id: 2,
    icon: markRaw(Cube),
    title: "任务系统",
    description: "自动化日常任务",
  },
  {
    id: 3,
    icon: markRaw(Ribbon),
    title: "数据统计",
    description: "全面的数据分析",
  },
]);

// 功能特性数据
const features = ref([
  {
    id: 1,
    icon: markRaw(PersonCircle),
    title: "角色管理",
    description: "轻松管理多个游戏角色，统一查看角色信息、等级进度和装备状态",
  },
  {
    id: 2,
    icon: markRaw(Cube),
    title: "任务自动化",
    description: "智能日常任务系统，自动完成重复性任务，节省您的宝贵时间",
  },
  {
    id: 3,
    icon: markRaw(Ribbon),
    title: "数据分析",
    description: "详细的数据统计和分析报告，帮助您更好地了解游戏进度",
  },
  {
    id: 4,
    icon: markRaw(Settings),
    title: "个性化设置",
    description: "灵活的配置选项，根据您的需求定制最适合的管理方案",
  },
]);

// 统计数据
const stats = ref([
  { id: 1, number: "1000+", label: "活跃用户" },
  { id: 2, number: "50K+", label: "管理角色" },
  { id: 3, number: "100K+", label: "完成任务" },
  { id: 4, number: "99.9%", label: "系统稳定性" },
]);

// 滚动到功能区域
const scrollToFeatures = () => {
  if (featuresSection.value) {
    featuresSection.value.scrollIntoView({
      behavior: "smooth",
    });
  }
};

onMounted(() => {
  // 初始化认证状态
  authStore.initAuth();
});
</script>

<style scoped lang="scss">
.home-page {
  min-height: 100dvh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow-x: hidden;
  padding-bottom: calc(var(--spacing-md) + env(safe-area-inset-bottom));
}

.drawer-menu {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
}

.drawer-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-medium);
  color: var(--text-secondary);
  text-decoration: none;
}

.drawer-item.router-link-active {
  background: var(--primary-color-light);
  color: var(--primary-color);
}

.drawer-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

// 导航栏
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-fixed);
  padding: var(--spacing-md) 0;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mobile-menu-button {
  display: none;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.brand-logo {
  width: 32px;
  height: 32px;
  border-radius: var(--border-radius-small);
}

.brand-text {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: white;
}

.nav-actions {
  display: flex;
  gap: var(--spacing-sm);
}

// 主要内容
.main-content {
  padding-top: 80px;
}

// 英雄区域
.hero-section {
  padding: var(--spacing-2xl) 0;
  min-height: 80vh;
  display: flex;
  align-items: center;
}

.hero-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-2xl);
  align-items: center;
}

.hero-text {
  color: white;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  margin-bottom: var(--spacing-md);
  background: linear-gradient(
    45deg,
    var(--bg-primary),
    var(--primary-color-light)
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: var(--font-size-xl);
  opacity: 0.9;
  margin-bottom: var(--spacing-xl);
  line-height: var(--line-height-relaxed);
}

.hero-actions {
  display: flex;
  gap: var(--spacing-md);
}

.hero-button {
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: var(--font-size-lg);
}

// 功能卡片
.feature-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-md);
}

.feature-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--border-radius-large);
  padding: var(--spacing-lg);
  transition: all var(--transition-normal);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  }
}

.card-icon {
  width: 48px;
  height: 48px;
  color: #fff;
  margin-bottom: var(--spacing-md);

  :deep(svg) {
    width: 100%;
    height: 100%;
  }
}

.card-content h3 {
  color: white;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-sm);
}

.card-content p {
  color: rgba(255, 255, 255, 0.8);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed);
}

// 功能特性区域
.features-section {
  padding: var(--spacing-2xl) 0;
  background: var(--bg-primary);
}

.section-header {
  text-align: center;
  margin-bottom: var(--spacing-2xl);
}

.section-title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
}

.section-subtitle {
  font-size: var(--font-size-lg);
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto;
  line-height: var(--line-height-relaxed);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-xl);
}

.feature-item {
  text-align: center;
  padding: var(--spacing-xl);
  border-radius: var(--border-radius-large);
  transition: all var(--transition-normal);

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-heavy);
  }
}

.feature-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--spacing-lg);
  color: var(--primary-color);

  :deep(svg) {
    width: 100%;
    height: 100%;
  }
}

.feature-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
}

.feature-description {
  color: var(--text-secondary);
  line-height: var(--line-height-relaxed);
}

// 统计区域
.stats-section {
  padding: var(--spacing-2xl) 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 深色主题下统计区背景 */
[data-theme="dark"] .stats-section {
  background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-xl);
}

.stat-item {
  text-align: center;
  color: white;
}

.stat-number {
  font-size: 3rem;
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-sm);
}

.stat-label {
  font-size: var(--font-size-lg);
  opacity: 0.9;
}

// 页脚
.footer {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: var(--spacing-xl) 0;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.footer-logo {
  width: 24px;
  height: 24px;
}

.footer-text {
  font-weight: var(--font-weight-medium);
}

.footer-links {
  display: flex;
  gap: var(--spacing-lg);
}

.footer-link {
  color: rgba(255, 255, 255, 0.8);
  transition: color var(--transition-fast);

  &:hover {
    color: white;
  }
}

.footer-bottom {
  text-align: center;
  padding-top: var(--spacing-lg);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
}

// 响应式设计
@media (max-width: 768px) {
  .hero-content {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .mobile-menu-button {
    display: inline-flex;
    margin-left: auto;
  }

  .nav-actions {
    display: none;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-actions {
    justify-content: center;
  }

  .footer-content {
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .nav-actions {
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .footer-links {
    flex-direction: column;
    gap: var(--spacing-md);
  }
}
</style>
