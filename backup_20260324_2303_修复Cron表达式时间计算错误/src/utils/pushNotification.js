/**
 * 推送通知工具函数
 * 支持 PushPlus、Bark、ServerChan 等多种推送渠道
 */

// 安全的 localStorage 操作封装
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

// 推送配置存储键
const PUSH_CONFIG_KEY = 'push_notification_config'

/**
 * 获取推送配置
 * @returns {Object} 推送配置对象
 */
export const getPushConfig = () => {
  const config = safeLocalStorage.getItem(PUSH_CONFIG_KEY)
  if (config) {
    try {
      return JSON.parse(config)
    } catch (e) {
      console.error('[PushNotification] 解析推送配置失败:', e)
    }
  }
  return {
    enabled: false,
    provider: 'pushplus',
    token: ''
  }
}

/**
 * 保存推送配置
 * @param {Object} config 推送配置对象
 */
export const savePushConfig = (config) => {
  safeLocalStorage.setItem(PUSH_CONFIG_KEY, JSON.stringify(config))
}

/**
 * 发送 PushPlus 推送
 * @param {string} token PushPlus Token
 * @param {string} title 标题
 * @param {string} content 内容
 * @returns {Promise<boolean>} 是否发送成功
 */
export const sendPushPlus = async (token, title, content) => {
  try {
    const response = await fetch('https://www.pushplus.plus/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        title: title,
        content: content,
        template: 'txt'
      })
    })
    
    const data = await response.json()
    if (data.code === 200) {
      console.log('[PushNotification] PushPlus 发送成功')
      return true
    } else {
      console.error('[PushNotification] PushPlus 发送失败:', data.msg)
      return false
    }
  } catch (error) {
    console.error('[PushNotification] PushPlus 请求失败:', error)
    return false
  }
}

/**
 * 发送 Bark 推送
 * @param {string} key Bark Key
 * @param {string} title 标题
 * @param {string} content 内容
 * @returns {Promise<boolean>} 是否发送成功
 */
export const sendBark = async (key, title, content) => {
  try {
    const response = await fetch(`https://api.day.app/${key}/${encodeURIComponent(title)}/${encodeURIComponent(content)}`)
    
    if (response.ok) {
      console.log('[PushNotification] Bark 发送成功')
      return true
    } else {
      console.error('[PushNotification] Bark 发送失败:', response.status)
      return false
    }
  } catch (error) {
    console.error('[PushNotification] Bark 请求失败:', error)
    return false
  }
}

/**
 * 发送 ServerChan 推送
 * @param {string} sendKey ServerChan SendKey
 * @param {string} title 标题
 * @param {string} content 内容
 * @returns {Promise<boolean>} 是否发送成功
 */
export const sendServerChan = async (sendKey, title, content) => {
  try {
    const response = await fetch(`https://sctapi.ftqq.com/${sendKey}.send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        title: title,
        desp: content
      })
    })
    
    const data = await response.json()
    if (data.code === 0) {
      console.log('[PushNotification] ServerChan 发送成功')
      return true
    } else {
      console.error('[PushNotification] ServerChan 发送失败:', data.message)
      return false
    }
  } catch (error) {
    console.error('[PushNotification] ServerChan 请求失败:', error)
    return false
  }
}

/**
 * 发送推送通知
 * @param {string} title 标题
 * @param {string} content 内容
 * @returns {Promise<boolean>} 是否发送成功
 */
export const sendPushNotification = async (title, content) => {
  const config = getPushConfig()
  
  // 检查是否启用推送
  if (!config.enabled) {
    console.log('[PushNotification] 推送未启用')
    return false
  }
  
  // 检查是否有 Token
  if (!config.token) {
    console.warn('[PushNotification] 未配置推送 Token')
    return false
  }
  
  // 根据提供商发送推送
  switch (config.provider) {
    case 'pushplus':
      return await sendPushPlus(config.token, title, content)
    case 'bark':
      return await sendBark(config.token, title, content)
    case 'serverchan':
      return await sendServerChan(config.token, title, content)
    default:
      console.error('[PushNotification] 未知的推送提供商:', config.provider)
      return false
  }
}

/**
 * 测试推送配置
 * @returns {Promise<boolean>} 测试是否成功
 */
export const testPushNotification = async () => {
  return await sendPushNotification(
    '测试推送',
    '这是一条测试推送消息，如果您收到说明配置正确！'
  )
}

/**
 * 发送任务完成推送
 * @param {string} taskName 任务名称
 * @param {Object} result 任务结果
 * @returns {Promise<boolean>} 是否发送成功
 */
export const sendTaskCompleteNotification = async (taskName, result = {}) => {
  const { success = 0, failed = 0, total = 0 } = result
  const content = `任务名称：${taskName}
执行结果：成功 ${success} 个，失败 ${failed} 个，总计 ${total} 个
完成时间：${new Date().toLocaleString()}`
  
  return await sendPushNotification('任务执行完成', content)
}

export default {
  getPushConfig,
  savePushConfig,
  sendPushNotification,
  testPushNotification,
  sendTaskCompleteNotification,
  sendPushPlus,
  sendBark,
  sendServerChan
}
