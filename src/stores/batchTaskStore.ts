import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useLocalStorage } from "@vueuse/core";

export const useBatchTaskStore = defineStore("batchTask", () => {
  // 任务执行状态
  const isRunning = ref(false);
  const shouldStop = ref(false);
  const currentRunningTokenId = ref<string | null>(null);
  const currentProgress = ref(0);
  
  // 任务日志
  const logs = ref<{
    time: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
  }[]>([]);
  
  // 日志配置
  const autoScrollLog = ref(true);
  const filterErrorsOnly = ref(false);
  
  // 任务队列
  const taskQueue = ref<{
    id?: number;
    name?: string;
    taskName?: string;
    selectedTokens?: string[];
    tokenIds?: string[];
    selectedTasks?: string[];
    taskNames?: string[];
    runType?: string;
    params?: any;
  }[]>([]);
  
  // 批量设置
  const batchSettings = useLocalStorage("batchSettings", {
    maxConcurrent: 5,
    maxLogEntries: 1000,
    refreshInterval: 5,
    autoRefresh: true,
    // 暂停时间配置
    grabFuStartTime: "23:55",
    grabFuEndTime: "00:10",
    saturdaySaltStartTime: "23:55",
    saturdaySaltEndTime: "00:10",
    sundaySaltStartTime: "23:55",
    sundaySaltEndTime: "00:10",
    gameUpdateStartTime: "23:55",
    gameUpdateEndTime: "00:10",
    // 自定义暂停时间
    customPauseTime1Name: "自定义暂停1",
    customPauseTime1DayOfWeek: 0,
    customPauseTime1StartTime: "00:00",
    customPauseTime1EndTime: "00:00",
    customPauseTime2Name: "自定义暂停2",
    customPauseTime2DayOfWeek: 0,
    customPauseTime2StartTime: "00:00",
    customPauseTime2EndTime: "00:00",
    customPauseTime3Name: "自定义暂停3",
    customPauseTime3DayOfWeek: 0,
    customPauseTime3StartTime: "00:00",
    customPauseTime3EndTime: "00:00",
    customPauseTime4Name: "自定义暂停4",
    customPauseTime4DayOfWeek: 0,
    customPauseTime4StartTime: "00:00",
    customPauseTime4EndTime: "00:00",
  });
  
  // 计算属性
  const errorCount = computed(() => {
    return logs.value.filter((log) => log.type === "error").length;
  });
  
  const filteredLogs = computed(() => {
    if (filterErrorsOnly.value) {
      return logs.value.filter((log) => log.type === "error");
    }
    return logs.value;
  });
  
  // 方法
  function addLog(log: {
    time: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
  }, skipCheck = false) {
    logs.value.push(log);
    
    const maxLogEntries = batchSettings.value.maxLogEntries || 1000;
    const keepCount = Math.floor(maxLogEntries / 2);
    
    if (!skipCheck && logs.value.length >= maxLogEntries) {
      // 清理旧日志，保留一半
      logs.value = logs.value.slice(-keepCount);
      
      // 添加清理提示
      const warningLog = {
        time: new Date().toLocaleTimeString(),
        message: `日志已清理，仅保留最近 ${keepCount} 条记录`,
        type: "warning" as const,
      };
      logs.value.push(warningLog);
    }
  }
  
  function clearLogs() {
    logs.value = [];
  }
  
  function addToTaskQueue(task: {
    id?: number;
    name?: string;
    taskName?: string;
    selectedTokens?: string[];
    tokenIds?: string[];
    selectedTasks?: string[];
    taskNames?: string[];
    runType?: string;
    params?: any;
  }) {
    // 确保taskQueue.value存在
    if (!taskQueue.value) {
      taskQueue.value = [];
    }
    
    // 检查任务是否已在队列中，避免重复加入
    // 同时检查任务名称、运行类型、账号列表和任务类型
    const isTaskExists = taskQueue.value.some(existingTask => {
      // 检查任务名称和类型
      if (existingTask.name === task.name && existingTask.runType === task.runType) {
        // 检查选中的账号是否相同（使用排序后的数组比较）
        const existingTokens = existingTask.selectedTokens || existingTask.tokenIds || [];
        const newTokens = task.selectedTokens || task.tokenIds || [];
        const sameTokens = JSON.stringify(existingTokens.sort()) === JSON.stringify(newTokens.sort());
        
        // 检查选中的任务类型是否相同（使用排序后的数组比较）
        const existingTasks = existingTask.selectedTasks || existingTask.taskNames || [];
        const newTasks = task.selectedTasks || task.taskNames || [];
        const sameTasks = JSON.stringify(existingTasks.sort()) === JSON.stringify(newTasks.sort());
        
        // 只有名称、类型、账号和任务类型都相同才认为是重复任务
        return sameTokens && sameTasks;
      }
      return false;
    });
    
    if (!isTaskExists) {
      taskQueue.value.push(task);
      console.log('[BatchTask] 任务已加入队列:', task.name);
    } else {
      console.log('[BatchTask] 任务已在队列中，跳过重复添加:', task.name);
    }
  }
  
  function clearTaskQueue() {
    taskQueue.value = [];
  }
  
  function startTask() {
    isRunning.value = true;
    shouldStop.value = false;
  }
  
  function stopTask() {
    isRunning.value = false;
    shouldStop.value = true;
    currentRunningTokenId.value = null;
    currentProgress.value = 0;
  }
  
  function resetTaskState() {
    isRunning.value = false;
    shouldStop.value = false;
    currentRunningTokenId.value = null;
    currentProgress.value = 0;
  }

  function resetShouldStop() {
    shouldStop.value = false;
  }

  function setCurrentToken(tokenId: string | null) {
    currentRunningTokenId.value = tokenId;
  }
  
  function setProgress(progress: number) {
    currentProgress.value = progress;
  }

  // ========== 任务状态持久化（刷新后继续任务）==========
  
  const TASK_STATE_KEY = 'batch_task_state';
  
  interface TaskState {
    isRunning: boolean;
    currentProgress: number;
    currentRunningTokenId: string | null;
    taskQueue: any[];
    selectedTasks: string[];
    selectedTokens: string[];
    currentBatchIndex: number;
    totalBatches: number;
    taskName: string;
    timestamp: number;
  }
  
  /**
   * 保存任务状态到 localStorage
   */
  function saveTaskState(state: Partial<TaskState>) {
    const existingState = getTaskState();
    const newState = {
      ...existingState,
      ...state,
      timestamp: Date.now(),
    };
    localStorage.setItem(TASK_STATE_KEY, JSON.stringify(newState));
  }
  
  /**
   * 从 localStorage 获取任务状态
   */
  function getTaskState(): TaskState | null {
    try {
      const saved = localStorage.getItem(TASK_STATE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('获取任务状态失败:', e);
    }
    return null;
  }
  
  /**
   * 清除任务状态
   */
  function clearTaskState() {
    localStorage.removeItem(TASK_STATE_KEY);
  }
  
  /**
   * 检查是否有未完成的任务
   */
  function hasUnfinishedTask(): boolean {
    const state = getTaskState();
    if (!state) return false;
    
    // 检查任务是否过期（超过24小时视为过期）
    const now = Date.now();
    const taskAge = now - (state.timestamp || 0);
    if (taskAge > 24 * 60 * 60 * 1000) {
      clearTaskState();
      return false;
    }
    
    // 检查是否有正在运行的任务且有选中的账号
    return state.isRunning === true && 
           state.selectedTokens && 
           state.selectedTokens.length > 0;
  }
  
  return {
    // 状态
    isRunning,
    shouldStop,
    currentRunningTokenId,
    currentProgress,
    logs,
    autoScrollLog,
    filterErrorsOnly,
    taskQueue,
    batchSettings,
    
    // 计算属性
    errorCount,
    filteredLogs,
    
    // 方法
    addLog,
    clearLogs,
    addToTaskQueue,
    clearTaskQueue,
    startTask,
    stopTask,
    resetTaskState,
    resetShouldStop,
    setCurrentToken,
    setProgress,
    
    // 任务状态持久化方法
    saveTaskState,
    getTaskState,
    clearTaskState,
    hasUnfinishedTask,
  };
});
