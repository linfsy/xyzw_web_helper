import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { calculateNextExecutionTime as calculateCronNextExecutionTime } from '@/utils/batch/cronUtils'

export interface ScheduledTask {
  id: number
  name: string
  taskName: string
  runType: 'daily' | 'cron'
  runTime?: string
  cronExpression?: string
  selectedTokens: string[]
  selectedTasks: string[]
  enabled: boolean
  createdAt: string
  enableBatchExecution?: boolean
  batchSize?: number
  batchDelay?: number
}

export const useScheduledTaskStore = defineStore('scheduledTask', () => {
  // 定时任务列表（使用 localStorage 持久化）
  const scheduledTasks = useLocalStorage<ScheduledTask[]>('scheduledTasks_v2', [])
  
  // 下次执行时间（用于显示倒计时）
  const nextExecutionTimes = ref<Record<number, number>>({})
  
  // 调度器运行状态
  const isSchedulerRunning = ref(false)
  
  // 定时器引用（用于清理）
  let countdownInterval: NodeJS.Timeout | null = null      // 倒计时定时器（每秒更新）
  let taskCheckInterval: NodeJS.Timeout | null = null      // 任务检查定时器（每5秒检查一次）
  
  // 计算属性
  const enabledTasks = computed(() => {
    return (scheduledTasks.value || []).filter(task => task.enabled)
  })
  
  const upcomingTasks = computed(() => {
    return enabledTasks.value.sort((a, b) => {
      const timeA = nextExecutionTimes.value[a.id] || Infinity
      const timeB = nextExecutionTimes.value[b.id] || Infinity
      return timeA - timeB
    })
  })
  
  // 方法
  const startScheduler = () => {
    if (isSchedulerRunning.value) {
      console.log('[ScheduledTask] 调度器已在运行')
      return
    }
    
    console.log('[ScheduledTask] 启动定时任务调度器')
    
    // 立即更新一次倒计时
    updateCountdowns()
    
    // 启动倒计时定时器（每秒更新显示）
    countdownInterval = setInterval(() => {
      updateCountdowns()
    }, 1000)
    
    // 启动任务检查定时器（每5秒检查是否有任务到时间）
    taskCheckInterval = setInterval(() => {
      checkAndExecuteTasks()
    }, 5000)
    
    // 标记为运行中
    isSchedulerRunning.value = true
    
    console.log('[ScheduledTask] 调度器启动成功')
  }
  
  const stopScheduler = () => {
    console.log('[ScheduledTask] 停止定时任务调度器')
    
    // 清理倒计时定时器
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
    
    // 清理任务检查定时器
    if (taskCheckInterval) {
      clearInterval(taskCheckInterval)
      taskCheckInterval = null
    }
    
    // 标记为停止
    isSchedulerRunning.value = false
    
    console.log('[ScheduledTask] 调度器已停止')
  }
  
  const updateCountdowns = () => {
    const now = new Date()
    const newTimes: Record<number, number> = {}
    
    enabledTasks.value.forEach(task => {
      const nextTime = calculateNextExecutionTime(task, now)
      newTimes[task.id] = nextTime
    })
    
    nextExecutionTimes.value = newTimes
  }
  
  const checkAndExecuteTasks = () => {
    const now = new Date()
    
    enabledTasks.value.forEach(task => {
      if (shouldExecuteTask(task, now)) {
        console.log(`[ScheduledTask] 任务到时间，准备执行: ${task.name}`)
        executeTask(task)
      }
    })
  }
  
  // 任务执行标记，防止重复执行
  const executingTasks = ref<Set<number>>(new Set())

  const executeTask = async (task: ScheduledTask) => {
    // 防止重复执行
    if (executingTasks.value.has(task.id)) {
      console.log(`[ScheduledTask] 任务 ${task.name} 正在执行中，跳过`)
      return
    }

    try {
      console.log(`[ScheduledTask] 执行任务: ${task.name}`)
      
      // 标记任务正在执行
      executingTasks.value.add(task.id)
      
      // 使用全局方法执行任务（BatchDailyTasks.vue 中注册）
      if (window['executeScheduledTask']) {
        const result = await window['executeScheduledTask'](task)
        // 无论任务是否真正执行，都更新下次执行时间
        // 这样可以避免任务被重复触发
        updateCountdowns()
        if (result !== false) {
          console.log(`[ScheduledTask] 任务 ${task.name} 执行完成`)
        } else {
          console.log(`[ScheduledTask] 任务 ${task.name} 已加入积攒队列，等待执行`)
        }
      } else {
        console.warn('[ScheduledTask] executeScheduledTask 方法未注册，将任务保存到localStorage等待执行')
        // 如果executeScheduledTask未注册，将任务保存到localStorage
        const pendingTasks = JSON.parse(localStorage.getItem('pending_scheduled_tasks') || '[]')
        pendingTasks.push({
          id: Date.now() + Math.random(),
          name: task.name,
          runType: 'scheduled',
          selectedTokens: task.selectedTokens,
          selectedTasks: task.selectedTasks,
          timestamp: Date.now()
        })
        localStorage.setItem('pending_scheduled_tasks', JSON.stringify(pendingTasks))
        console.log('[ScheduledTask] 任务已保存到localStorage，等待BatchDailyTasks组件加载后执行')
        // 重要：即使任务被保存到localStorage，也需要更新下次执行时间
        // 这样可以避免任务被重复触发
        updateCountdowns()
      }
    } catch (error) {
      console.error(`[ScheduledTask] 任务执行失败: ${task.name}`, error)
      // 即使执行失败，也将任务保存到localStorage
      try {
        const pendingTasks = JSON.parse(localStorage.getItem('pending_scheduled_tasks') || '[]')
        pendingTasks.push({
          id: Date.now() + Math.random(),
          name: task.name,
          runType: 'scheduled',
          selectedTokens: task.selectedTokens,
          selectedTasks: task.selectedTasks,
          timestamp: Date.now()
        })
        localStorage.setItem('pending_scheduled_tasks', JSON.stringify(pendingTasks))
        console.log('[ScheduledTask] 任务执行失败，已保存到localStorage等待重试')
      } catch (e) {
        console.error('[ScheduledTask] 保存任务到localStorage失败:', e)
      }
    } finally {
      // 清除执行标记
      executingTasks.value.delete(task.id)
    }
  }

  const calculateNextExecutionTime = (task: ScheduledTask, now: Date): number => {
    if (task.runType === 'daily' && task.runTime) {
      const [hours, minutes] = task.runTime.split(':')
      const nextTime = new Date(now)
      nextTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      
      if (nextTime < now) {
        nextTime.setDate(nextTime.getDate() + 1)
      }
      
      return nextTime.getTime()
    }
    
    // 处理 cron 表达式
    if (task.runType === 'cron' && task.cronExpression) {
      try {
        const nextRun = calculateCronNextExecutionTime(task)
        return nextRun ? nextRun.getTime() : Infinity
      } catch (error) {
        console.error('[ScheduledTask] 解析cron表达式失败:', error)
        return Infinity
      }
    }
    
    return Infinity
  }
  
  const shouldExecuteTask = (task: ScheduledTask, now: Date): boolean => {
    const nextTime = nextExecutionTimes.value[task.id]
    if (!nextTime) return false
    
    const diff = now.getTime() - nextTime
    return diff >= 0 && diff < 5000
  }
  
  // 任务管理方法
  const addTask = (task: Omit<ScheduledTask, 'id' | 'enabled' | 'createdAt'>) => {
    const newTask: ScheduledTask = {
      ...task,
      id: Date.now(),
      enabled: true,
      createdAt: new Date().toISOString(),
    }
    scheduledTasks.value.push(newTask)
    console.log('[ScheduledTask] 添加任务:', newTask.name)
    return newTask
  }
  
  const removeTask = (taskId: number) => {
    if (!scheduledTasks.value) return
    const index = scheduledTasks.value.findIndex(t => t.id === taskId)
    if (index > -1) {
      const taskName = scheduledTasks.value[index].name
      scheduledTasks.value.splice(index, 1)
      console.log('[ScheduledTask] 删除任务:', taskName)
    }
  }
  
  const updateTask = (taskId: number, updates: Partial<ScheduledTask>) => {
    if (!scheduledTasks.value) return
    const index = scheduledTasks.value.findIndex(t => t.id === taskId)
    if (index > -1) {
      const updatedTask = {
        ...scheduledTasks.value[index],
        ...updates
      }
      scheduledTasks.value.splice(index, 1, updatedTask)
      console.log('[ScheduledTask] 更新任务:', updatedTask.name)
    }
  }
  
  const toggleTask = (taskId: number) => {
    if (!scheduledTasks.value) return
    const index = scheduledTasks.value.findIndex(t => t.id === taskId)
    if (index > -1) {
      const updatedTask = {
        ...scheduledTasks.value[index],
        enabled: !scheduledTasks.value[index].enabled
      }
      scheduledTasks.value.splice(index, 1, updatedTask)
      console.log('[ScheduledTask] 切换任务状态:', updatedTask.name, updatedTask.enabled)
    }
  }
  
  return {
    // 状态
    scheduledTasks,
    nextExecutionTimes,
    isSchedulerRunning,
    
    // 计算属性
    enabledTasks,
    upcomingTasks,
    
    // 方法
    startScheduler,
    stopScheduler,
    addTask,
    removeTask,
    updateTask,
    toggleTask,
  }
})
