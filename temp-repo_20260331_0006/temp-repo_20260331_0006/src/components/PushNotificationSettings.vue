<template>
  <n-card title="任务完成推送" size="small">
    <n-space vertical>
      <!-- 启用开关 -->
      <n-space align="center" justify="space-between" style="width: 100%">
        <span>启用推送</span>
        <n-switch v-model:value="config.enabled" @update:value="handleEnabledChange" />
      </n-space>

      <!-- 推送配置（仅在启用时显示） -->
      <template v-if="config.enabled">
        <n-divider style="margin: 8px 0" />
        
        <!-- 推送方式 -->
        <n-space vertical>
          <span>推送方式</span>
          <n-select
            v-model:value="config.provider"
            :options="providerOptions"
            @update:value="handleProviderChange"
          />
        </n-space>

        <!-- Token 输入 -->
        <n-space vertical>
          <span>推送 Token</span>
          <n-input
            v-model:value="config.token"
            type="password"
            show-password-on="click"
            :placeholder="getTokenPlaceholder()"
            @blur="saveConfig"
          />
          <n-text depth="3" style="font-size: 12px">
            {{ getTokenHelp() }}
          </n-text>
        </n-space>

        <!-- 测试按钮 -->
        <n-button 
          type="primary" 
          :loading="testing"
          :disabled="!config.token"
          @click="handleTest"
          block
        >
          测试推送
        </n-button>
      </template>
    </n-space>
  </n-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import {
  getPushConfig,
  savePushConfig,
  testPushNotification
} from '@/utils/pushNotification'

const message = useMessage()

// 推送提供商选项
const providerOptions = [
  { label: 'PushPlus（推送加）', value: 'pushplus' },
  { label: 'Bark', value: 'bark' },
  { label: 'ServerChan（Server酱）', value: 'serverchan' }
]

// 配置状态
const config = reactive({
  enabled: false,
  provider: 'pushplus',
  token: ''
})

// 测试状态
const testing = ref(false)

// 获取 Token 占位符
const getTokenPlaceholder = () => {
  switch (config.provider) {
    case 'pushplus':
      return '请输入 PushPlus Token'
    case 'bark':
      return '请输入 Bark Key'
    case 'serverchan':
      return '请输入 ServerChan SendKey'
    default:
      return '请输入 Token'
  }
}

// 获取 Token 帮助文本
const getTokenHelp = () => {
  switch (config.provider) {
    case 'pushplus':
      return 'PushPlus: 填 token，获取地址 pushplus.plus'
    case 'bark':
      return 'Bark: 填 key，获取地址 day.app'
    case 'serverchan':
      return 'ServerChan: 填 SendKey，获取地址 sct.ftqq.com'
    default:
      return ''
  }
}

// 加载配置
const loadConfig = () => {
  const savedConfig = getPushConfig()
  Object.assign(config, savedConfig)
}

// 保存配置
const saveConfig = () => {
  savePushConfig({
    enabled: config.enabled,
    provider: config.provider,
    token: config.token
  })
}

// 处理启用状态变化
const handleEnabledChange = (value) => {
  config.enabled = value
  saveConfig()
  if (value) {
    message.info('已启用任务完成推送')
  } else {
    message.info('已禁用任务完成推送')
  }
}

// 处理提供商变化
const handleProviderChange = () => {
  saveConfig()
}

// 处理测试
const handleTest = async () => {
  if (!config.token) {
    message.warning('请先配置推送 Token')
    return
  }

  testing.value = true
  try {
    const success = await testPushNotification()
    if (success) {
      message.success('测试推送发送成功，请检查您的设备')
    } else {
      message.error('测试推送发送失败，请检查 Token 是否正确')
    }
  } catch (error) {
    message.error('测试推送失败: ' + error.message)
  } finally {
    testing.value = false
  }
}

// 组件挂载时加载配置
onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.n-space {
  width: 100%;
}
</style>
