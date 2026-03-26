<template>
  <div class="black-market-card" :class="{ 'disabled': !blackMarketStatus.isOpen }">
    <div class="card-header">
      <img src="/icons/xiaoyugan.png" alt="黑市周" class="status-icon" />
      <div class="status-info">
        <h3>黑市周</h3>
        <p>批量购买助手</p>
        <p v-if="blackMarketStatus.isOpen" class="countdown open">{{ countdownText }}</p>
        <p v-else class="countdown closed">{{ countdownText }}</p>
      </div>
      <div class="selected-count">
        <span class="badge">{{ selectedCount }}项已选</span>
        <span v-if="selectedCount > 0" class="badge price-badge">{{ totalPrice }}金砖</span>
      </div>
    </div>
    
    <div class="card-content">
      <div class="goods-grid">
        <div 
          v-for="item in goodsList" 
          :key="`${item.activityId}-${item.goodsIndex}`"
          class="goods-item"
        >
          <n-checkbox 
            v-model:checked="item.checked"
            @update:checked="updateSelectedCount"
          />
          <div class="goods-info">
            <span class="goods-name">{{ item.name }}</span>
            <div class="goods-meta">
              <span v-if="item.price > 0" class="goods-price">{{ item.price }}金砖</span>
              <span v-else class="goods-price free">免费</span>
              <span class="goods-limit">限购: 0/{{ item.limit }}</span>
            </div>
          </div>
          <template v-if="item.limit > 1">
            <n-input-number 
              v-model:value="item.buyNum" 
              :min="1" 
              :max="item.limit" 
              size="small"
              style="width: 70px;"
            />
          </template>
        </div>
      </div>
      
      <div class="action-buttons">
        <n-button 
          type="primary" 
          @click="selectAll"
          :disabled="isPurchasing || !blackMarketStatus.isOpen"
        >
          全选
        </n-button>
        <n-button 
          type="warning" 
          @click="selectNone"
          :disabled="isPurchasing || !blackMarketStatus.isOpen"
        >
          全不选
        </n-button>
        <n-button 
          type="success" 
          @click="purchaseSelected"
          :disabled="selectedCount === 0 || isPurchasing || !blackMarketStatus.isOpen"
        >
          <template v-if="!blackMarketStatus.isOpen">
            黑市周未开启
          </template>
          <template v-else-if="isPurchasing">
            <n-loading :show="isPurchasing" />
            购买中...
          </template>
          <template v-else>
            购买
          </template>
        </n-button>
      </div>
      
      <div v-if="purchaseResults.length > 0" class="results-section">
        <h4>购买结果</h4>
        <div class="results-list">
          <div 
          v-for="(result, index) in purchaseResults" 
          :key="index" 
          class="result-item"
          :class="result.success ? 'success' : 'error'"
        >
          <span v-if="result.tokenName" class="result-token">{{ result.tokenName }} - </span>
          <span class="result-name">{{ result.name }}</span>
          <span class="result-status">{{ result.success ? '成功' : '失败' }}</span>
          <span v-if="!result.success" class="result-error">{{ result.error }}</span>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useTokenStore } from "@/stores/tokenStore";

// 安全的 localStorage 操作
const safeLocalStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('localStorage getItem error:', error);
      return null;
    }
  },
  
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('localStorage setItem error:', error);
      // 尝试清理存储空间
      try {
        // 清理旧的任务执行标记
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('lastTaskExecution_') || k.startsWith('task_executing_')) {
            localStorage.removeItem(k);
          }
        });
        // 再次尝试设置
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        console.error('localStorage cleanup failed:', e);
        return false;
      }
    }
  },
  
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('localStorage removeItem error:', error);
      return false;
    }
  }
};

// 黑市周时间配置
// 黑市周：周五12:00开启，下周五00:00关闭（6天12小时）
const BLACK_MARKET_CONFIG = {
  // 首次黑市周开启时间：2026年3月6日 12:00（周五）
  firstOpenTime: new Date('2026-03-06T12:00:00').getTime(),
  // 周期：3周（毫秒），每3周一次黑市周
  cycleDuration: 3 * 7 * 24 * 60 * 60 * 1000,
  // 黑市周开启时长：6天12小时（周五12:00到下周五00:00）
  openDuration: 6 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000
};

// 计算当前是否处于黑市周开启期间
const isBlackMarketOpen = () => {
  const now = Date.now();
  const { firstOpenTime, cycleDuration, openDuration } = BLACK_MARKET_CONFIG;
  
  // 计算当前周期
  const cyclesSinceFirst = Math.floor((now - firstOpenTime) / cycleDuration);
  
  // 计算当前周期的开启时间和关闭时间
  const currentOpenTime = firstOpenTime + cyclesSinceFirst * cycleDuration;
  const currentCloseTime = currentOpenTime + openDuration;
  
  return {
    isOpen: now >= currentOpenTime && now < currentCloseTime,
    openTime: currentOpenTime,
    closeTime: currentCloseTime,
    nextOpenTime: currentOpenTime + cycleDuration
  };
};

// 格式化倒计时
const formatCountdown = (targetTime) => {
  const now = Date.now();
  const diff = targetTime - now;
  
  if (diff <= 0) return '已开启';
  
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  
  if (days > 0) {
    return `${days}天${hours}小时${minutes}分钟`;
  } else if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  } else {
    return `${minutes}分钟`;
  }
};

// Props
const props = defineProps({
  selectedTokens: {
    type: Array,
    default: () => []
  },
  addLog: {
    type: Function,
    default: null
  },
  batchSettings: {
    type: Object,
    default: () => ({
      enableBatchExecution: true,
      batchSize: 5,
      batchDelay: 5
    })
  },
  isPauseTime: {
    type: Object,
    default: () => ({ paused: false, reason: '', resumeTime: null })
  },
  shouldStop: {
    type: Object,
    default: () => ({ value: false })
  },
  batchTaskStore: {
    type: Object,
    default: null
  }
});

// Emits
const emit = defineEmits(['close', 'purchase-complete']);

const tokenStore = useTokenStore();

// 黑市周状态
const blackMarketStatus = ref(isBlackMarketOpen());
const countdownText = ref('');
let countdownTimer = null;

// 更新倒计时
const updateCountdown = () => {
  const status = isBlackMarketOpen();
  blackMarketStatus.value = status;
  
  if (status.isOpen) {
    countdownText.value = `剩余时间: ${formatCountdown(status.closeTime)}`;
  } else {
    countdownText.value = `距离开启: ${formatCountdown(status.openTime)}`;
  }
};

// 启动倒计时定时器
const startCountdown = () => {
  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 60000); // 每分钟更新一次
};

// 停止倒计时定时器
const stopCountdown = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
};

// 商品列表数据（默认勾选免费项）
const goodsList = ref([
  { name: '金砖回馈(200金砖)', activityId: 5, goodsIndex: 0, buyNum: 1, checked: true, price: 0, limit: 1 },
  { name: '黑市福利(500金砖)', activityId: 9, goodsIndex: 0, buyNum: 1, checked: true, price: 0, limit: 1 },
  { name: '黑市见面礼', activityId: 9, goodsIndex: 1, buyNum: 1, checked: false, price: 600, limit: 1 },
  { name: '黑市惊喜礼', activityId: 9, goodsIndex: 2, buyNum: 1, checked: false, price: 1200, limit: 1 },
  { name: '初级黑市包', activityId: 9, goodsIndex: 3, buyNum: 1, checked: false, price: 2500, limit: 1 },
  { name: '中级黑市包', activityId: 9, goodsIndex: 4, buyNum: 1, checked: false, price: 5000, limit: 1 },
  { name: '高级黑市包', activityId: 9, goodsIndex: 5, buyNum: 1, checked: false, price: 8000, limit: 1 },
  { name: '顶级鱼竿包', activityId: 9, goodsIndex: 6, buyNum: 1, checked: false, price: 12000, limit: 1 },
  { name: '白玉黑市包', activityId: 9, goodsIndex: 7, buyNum: 1, checked: false, price: 2000, limit: 1 },
  { name: '特级贝壳包', activityId: 9, goodsIndex: 8, buyNum: 1, checked: false, price: 25000, limit: 1 },
  { name: '养成补给包', activityId: 9, goodsIndex: 9, buyNum: 1, checked: false, price: 8000, limit: 4 }
]);

// 购买状态和结果
const isPurchasing = ref(false);
const purchaseResults = ref([]);

// 计算属性
const selectedCount = computed(() => {
  return goodsList.value.filter(item => item.checked).length;
});

const totalPrice = computed(() => {
  return goodsList.value
    .filter(item => item.checked)
    .reduce((total, item) => total + (item.price * item.buyNum), 0);
});

const isConnected = computed(() => {
  // 如果没有选中账号，使用默认的selectedToken
  if (props.selectedTokens.length === 0) {
    if (!tokenStore.selectedToken) return false;
    const status = tokenStore.getWebSocketStatus(tokenStore.selectedToken.id);
    return status === "connected";
  }
  
  // 检查是否有至少一个账号已连接（不需要所有账号都连接）
  return props.selectedTokens.some(token => {
    const status = tokenStore.getWebSocketStatus(token.id);
    return status === "connected";
  });
});

// 方法
const updateSelectedCount = () => {
  // 自动更新选中数量
};

const selectAll = () => {
  goodsList.value.forEach(item => {
    item.checked = true;
  });
};

const selectNone = () => {
  goodsList.value.forEach(item => {
    item.checked = false;
  });
};

// 处理单个账号的购买
const processTokenPurchase = async (token, selectedGoods) => {
  const tokenPurchaseResults = [];
  let tokenSuccess = true;
  
  // 检查连接状态，如果未连接则自动连接
  const status = tokenStore.getWebSocketStatus(token.id);
  if (status !== "connected") {
    // 使用addLog显示在执行日志中
    if (props.addLog) {
      props.addLog({
        time: new Date().toLocaleTimeString(),
        message: `账号 ${token.name} 未连接，正在连接...`,
        type: "info"
      });
    }
    tokenStore.createWebSocketConnection(token.id, token.token, token.wsUrl);
    await new Promise(r => setTimeout(r, 2000)); // 等待连接
    
    // 连接成功后显示日志
    if (props.addLog) {
      props.addLog({
        time: new Date().toLocaleTimeString(),
        message: `账号 ${token.name} 连接成功`,
        type: "success"
      });
    }
  }
  
  // 逐个购买商品
  for (const goods of selectedGoods) {
    // 检查是否被停止
    if (props.shouldStop?.value) {
      break;
    }
    
    // 检查是否进入暂停时间
    if (props.isPauseTime?.paused) {
      break;
    }
    
    let success = false;
    let errorMsg = null;
    
    // 检查购买数量是否超过限购
    if (goods.buyNum > goods.limit) {
      errorMsg = `购买数量超过限购次数（最多${goods.limit}次）`;
      tokenPurchaseResults.push({
        name: goods.name,
        success: false,
        error: errorMsg
      });
      tokenSuccess = false;
      continue;
    }
    
    // 最多重试2次
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        // 发送购买命令，增加超时时间到10秒
        const result = await tokenStore.sendMessageWithPromise(
          token.id,
          "activity_buystoregoods",
          {
            activityId: goods.activityId,
            buyNum: goods.buyNum,
            goodsIndex: goods.goodsIndex
          },
          10000 // 增加超时时间到10秒
        );
        
        success = true;
        errorMsg = null;
        break; // 成功后跳出重试循环
      } catch (error) {
        errorMsg = error.message || "购买失败";
        if (attempt < 2) {
          // 重试前增加延迟
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // 记录购买结果
    tokenPurchaseResults.push({
      name: goods.name,
      success: success,
      error: errorMsg
    });
    
    // 添加日志到执行日志
    if (props.addLog) {
      if (success) {
        props.addLog({
          time: new Date().toLocaleTimeString(),
          message: `账号 ${token.name} - ${goods.name} 购买成功`,
          type: "success"
        });
      } else {
        props.addLog({
          time: new Date().toLocaleTimeString(),
          message: `账号 ${token.name} - ${goods.name} 购买失败: ${errorMsg}`,
          type: "error"
        });
      }
    }
    
    if (!success) {
      tokenSuccess = false;
    }
    
    // 增加请求间隔，避免服务器过载（1秒）
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return {
    token,
    success: tokenSuccess,
    results: tokenPurchaseResults
  };
};

const purchaseSelected = async () => {
  // 确定要使用的账号列表
  const tokensToUse = props.selectedTokens.length > 0 ? props.selectedTokens : (tokenStore.selectedToken ? [tokenStore.selectedToken] : []);
  
  if (tokensToUse.length === 0) {
    if (props.addLog) {
      props.addLog({
        time: new Date().toLocaleTimeString(),
        message: "请先选择Token",
        type: "warning"
      });
    }
    return;
  }

  const selectedGoods = goodsList.value.filter(item => item.checked);
  if (selectedGoods.length === 0) {
    if (props.addLog) {
      props.addLog({
        time: new Date().toLocaleTimeString(),
        message: "请至少选择一个商品",
        type: "warning"
      });
    }
    return;
  }
  
  isPurchasing.value = true;
  purchaseResults.value = [];
  const allResults = [];
  
  // 获取分批执行设置
  const enableBatchExecution = props.batchSettings?.enableBatchExecution ?? true;
  const batchSize = props.batchSettings?.batchSize || 5;
  const batchDelay = (props.batchSettings?.batchDelay || 5) * 1000; // 转换为毫秒
  
  // 添加开始日志
  if (props.addLog) {
    if (enableBatchExecution && tokensToUse.length > batchSize) {
      const totalBatches = Math.ceil(tokensToUse.length / batchSize);
      props.addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 黑市周购买助手开始执行 (${tokensToUse.length}个账号, ${selectedGoods.length}个商品, 分${totalBatches}批, 每批${batchSize}个) ===`,
        type: "success"
      });
    } else {
      props.addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 黑市周购买助手开始执行 (${tokensToUse.length}个账号, ${selectedGoods.length}个商品) ===`,
        type: "success"
      });
    }
  }
  
  // 保存运行中的任务（简化版任务持久化）
  safeLocalStorage.setItem('black_market_buyer_running', JSON.stringify({
    name: '黑市周购买助手',
    selectedTokens: tokensToUse.map(t => t.id),
    selectedGoods: selectedGoods.map(g => ({ activityId: g.activityId, goodsIndex: g.goodsIndex, buyNum: g.buyNum, name: g.name })),
    timestamp: Date.now()
  }));
  
  // 立即关闭模态框，让用户在执行日志中查看进度
  emit('close');
  
  try {
    // 判断是否使用分批执行
    if (enableBatchExecution && tokensToUse.length > batchSize) {
      // 分批执行
      const totalBatches = Math.ceil(tokensToUse.length / batchSize);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        // 每批执行前检查是否被停止
        if (props.shouldStop?.value) {
          if (props.addLog) {
            props.addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== 黑市周购买助手被用户停止 ===`,
              type: "warning"
            });
          }
          safeLocalStorage.removeItem('black_market_buyer_running');
          emit('purchase-complete', allResults);
          return;
        }
        
        // 每批执行前检查是否进入暂停时间
        if (props.isPauseTime?.paused) {
          const remainingTokens = tokensToUse.slice(batchIndex * batchSize);
          if (remainingTokens.length > 0 && props.batchTaskStore) {
            if (props.addLog) {
              props.addLog({
                time: new Date().toLocaleTimeString(),
                message: `=== 黑市周购买助手被暂停: 当前处于${props.isPauseTime.reason}，已加入积攒队列（剩余 ${remainingTokens.length} 个账号） ===`,
                type: "info"
              });
            }
            props.batchTaskStore.addToTaskQueue({
              id: Date.now() + Math.random(),
              name: '黑市周购买助手',
              runType: 'manual',
              selectedTokens: remainingTokens.map(t => t.id),
              selectedTasks: ['黑市周购买助手'],
              selectedGoods: selectedGoods.map(g => ({ activityId: g.activityId, goodsIndex: g.goodsIndex, buyNum: g.buyNum, name: g.name })),
            });
          }
          safeLocalStorage.removeItem('black_market_buyer_running');
          emit('purchase-complete', allResults);
          return;
        }
        
        const startIndex = batchIndex * batchSize;
        const endIndex = Math.min(startIndex + batchSize, tokensToUse.length);
        const batchTokens = tokensToUse.slice(startIndex, endIndex);
        
        if (props.addLog) {
          props.addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始执行第 ${batchIndex + 1}/${totalBatches} 批，共 ${batchTokens.length} 个账号 ===`,
            type: "info"
          });
        }
        
        // 处理当前批次的所有账号（并发执行）
        const batchPromises = batchTokens.map(token => processTokenPurchase(token, selectedGoods));
        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach((result, index) => {
          allResults.push(result);
          purchaseResults.value.push(...result.results.map(r => ({
            ...r,
            tokenName: batchTokens[index].name
          })));
        });
        
        // 批次之间增加延迟（除了最后一批）
        if (batchIndex < totalBatches - 1) {
          if (props.addLog) {
            props.addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== 第 ${batchIndex + 1} 批执行完成，等待 ${batchDelay / 1000} 秒后执行下一批 ===`,
              type: "info"
            });
          }
          
          // 倒计时等待（添加暂停时间和停止检测）
          let remainingSeconds = batchDelay / 1000;
          while (remainingSeconds > 0) {
            // 检查是否被停止
            if (props.shouldStop?.value) {
              if (props.addLog) {
                props.addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `=== 黑市周购买助手被用户停止 ===`,
                  type: "warning"
                });
              }
              safeLocalStorage.removeItem('black_market_buyer_running');
              emit('purchase-complete', allResults);
              return;
            }
            
            // 检查是否进入暂停时间
            if (props.isPauseTime?.paused) {
              // 计算剩余未执行的账号（从下一批开始）
              const remainingTokens = tokensToUse.slice((batchIndex + 1) * batchSize);
              
              if (remainingTokens.length > 0 && props.batchTaskStore) {
                if (props.addLog) {
                  props.addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `=== 黑市周购买助手在倒计时期间被暂停: 当前处于${props.isPauseTime.reason}，已加入积攒队列（剩余 ${remainingTokens.length} 个账号） ===`,
                    type: "info"
                  });
                }
                // 将剩余未执行的账号加入积攒队列
                props.batchTaskStore.addToTaskQueue({
                  id: Date.now() + Math.random(),
                  name: '黑市周购买助手',
                  runType: 'manual',
                  selectedTokens: remainingTokens.map(t => t.id),
                  selectedTasks: ['黑市周购买助手'],
                  selectedGoods: selectedGoods.map(g => ({ activityId: g.activityId, goodsIndex: g.goodsIndex, buyNum: g.buyNum, name: g.name })),
                });
              }
              safeLocalStorage.removeItem('black_market_buyer_running');
              emit('purchase-complete', allResults);
              return;
            }
            
            // 每10秒或最后5秒显示倒计时
            if (remainingSeconds % 10 === 0 || remainingSeconds <= 5) {
              if (props.addLog) {
                props.addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `倒计时: ${remainingSeconds} 秒`,
                  type: "info"
                });
              }
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            remainingSeconds--;
          }
        }
      }
    } else {
      // 不分批，并发执行所有账号
      const allPromises = tokensToUse.map(token => processTokenPurchase(token, selectedGoods));
      const allBatchResults = await Promise.all(allPromises);
      
      allBatchResults.forEach((result, index) => {
        allResults.push(result);
        purchaseResults.value.push(...result.results.map(r => ({
          ...r,
          tokenName: tokensToUse[index].name
        })));
      });
    }
    
    // 统计购买结果
    const totalTokens = tokensToUse.length;
    const successTokens = allResults.filter(r => r.success).length;
    const totalGoods = selectedGoods.length * totalTokens;
    const successGoods = purchaseResults.value.filter(r => r.success).length;
    
    // 添加总结日志
    if (props.addLog) {
      props.addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 黑市周购买助手执行完成 ===`,
        type: "success"
      });
      props.addLog({
        time: new Date().toLocaleTimeString(),
        message: `账号统计: 成功 ${successTokens}/${totalTokens} 个`,
        type: "success"
      });
      props.addLog({
        time: new Date().toLocaleTimeString(),
        message: `商品统计: 成功 ${successGoods}/${totalGoods} 个`,
        type: "success"
      });
    }
    
    // 发送购买完成事件
    emit('purchase-complete', allResults);
    
  } catch (error) {
    if (props.addLog) {
      props.addLog({
        time: new Date().toLocaleTimeString(),
        message: `购买过程中出现错误: ${error.message}`,
        type: "error"
      });
    }
  } finally {
    isPurchasing.value = false;
    // 清除运行中的任务标记
    localStorage.removeItem('black_market_buyer_running');
  }
};

// 生命周期
onMounted(() => {
  // 启动倒计时
  startCountdown();
});

onUnmounted(() => {
  // 停止倒计时
  stopCountdown();
});

// 暴露方法给父组件
defineExpose({
  purchaseSelected
});
</script>

<style scoped lang="scss">
.black-market-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-xl);
  padding: var(--spacing-lg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #6366f1;
  
  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
  
  &.disabled {
    opacity: 0.7;
    border-left-color: #9ca3af;
    
    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: none;
    }
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.status-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius-medium);
  background: var(--primary-color-light);
  padding: 8px;
  flex-shrink: 0;
}

.status-info {
  flex: 1;
  
  h3 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin: 0 0 var(--spacing-xs) 0;
  }
  
  p {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin: 0;
    
    &.countdown {
      font-weight: var(--font-weight-medium);
      margin-top: var(--spacing-xs);
      
      &.open {
        color: #10b981;
      }
      
      &.closed {
        color: #ef4444;
      }
    }
  }
}

.selected-count {
  flex-shrink: 0;
  display: flex;
  gap: var(--spacing-xs);
  align-items: center;
  
  .badge {
    display: inline-block;
    padding: var(--spacing-xs) var(--spacing-sm);
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
    border-radius: var(--border-radius-small);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    
    &.price-badge {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
      font-weight: var(--font-weight-semibold);
    }
  }
}

.card-content {
  
  .goods-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 8px;
      margin-bottom: var(--spacing-lg);
      
      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
      
      @media (min-width: 769px) and (max-width: 1024px) {
        grid-template-columns: repeat(3, 1fr);
      }
      
      @media (min-width: 1025px) {
        grid-template-columns: repeat(3, 1fr);
      }
    }
  
  .goods-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--bg-secondary);
    border-radius: var(--border-radius-medium);
    
    .goods-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      
      .goods-name {
          font-size: 14px;
          color: var(--text-primary);
          font-weight: var(--font-weight-medium);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .goods-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          
          .goods-price {
            font-size: 12px;
            font-weight: var(--font-weight-medium);
            color: #f59e0b;
            background: rgba(245, 158, 11, 0.1);
            padding: 2px 6px;
            border-radius: 3px;
            
            &.free {
              color: #10b981;
              background: rgba(16, 185, 129, 0.1);
            }
          }
          
          .goods-limit {
            font-size: 12px;
            color: #6b7280;
            background: rgba(107, 114, 128, 0.1);
            padding: 2px 6px;
            border-radius: 3px;
          }
        }
    }
    

  }
  
  .action-buttons {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
    
    @media (max-width: 768px) {
      flex-direction: column;
    }
  }
  
  .results-section {
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--border-light);
    
    h4 {
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-semibold);
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md) 0;
    }
    
    .results-list {
      max-height: 300px;
      overflow-y: auto;
      margin-bottom: var(--spacing-md);
      
      .result-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--bg-secondary);
        border-radius: var(--border-radius-medium);
        padding: var(--spacing-sm);
        margin-bottom: var(--spacing-sm);
        
        &.success {
          border-left: 4px solid var(--success-color);
        }
        
        &.error {
          border-left: 4px solid var(--error-color);
        }
        
        .result-token {
          font-weight: var(--font-weight-medium);
          color: var(--primary-color);
          margin-right: var(--spacing-xs);
          font-size: var(--font-size-sm);
        }
        
        .result-name {
          flex: 1;
          font-size: var(--font-size-sm);
          color: var(--text-primary);
        }
        
        .result-status {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
        }
        
        &.success .result-status {
          color: var(--success-color);
        }
        
        &.error .result-status {
          color: var(--error-color);
        }
        
        .result-error {
          font-size: var(--font-size-xs);
          color: var(--error-color);
          margin-left: var(--spacing-sm);
          flex: 1;
          text-align: right;
        }
      }
    }
  }
}
</style>