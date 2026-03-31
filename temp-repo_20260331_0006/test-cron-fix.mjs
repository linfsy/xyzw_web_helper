import { calculateNextExecutionTime } from './src/utils/batch/cronUtils.js';

// 测试用例
const testCases = [
  {
    name: '大号日常任务',
    task: {
      runType: 'cron',
      cronExpression: '15 0 * * *' // 每天00:15执行
    }
  },
  {
    name: '小号日常任务',
    task: {
      runType: 'cron',
      cronExpression: '0 2 * * *' // 每天02:00执行
    }
  },
  {
    name: '每小时执行',
    task: {
      runType: 'cron',
      cronExpression: '0 * * * *' // 每小时0分执行
    }
  },
  {
    name: '每天中午12点执行',
    task: {
      runType: 'cron',
      cronExpression: '0 12 * * *' // 每天12:00执行
    }
  }
];

// 执行测试
console.log('=== Cron表达式时间计算测试 ===\n');
const now = new Date();
console.log(`当前时间: ${now.toLocaleString()}\n`);

testCases.forEach(testCase => {
  try {
    const nextRun = calculateNextExecutionTime(testCase.task);
    if (nextRun) {
      const timeDiff = nextRun - now;
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      
      console.log(`${testCase.name}:`);
      console.log(`  Cron表达式: ${testCase.task.cronExpression}`);
      console.log(`  下次执行时间: ${nextRun.toLocaleString()}`);
      console.log(`  距离执行时间: ${hours}小时${minutes}分${seconds}秒`);
      console.log('');
    } else {
      console.log(`${testCase.name}: 无法计算下次执行时间`);
      console.log('');
    }
  } catch (error) {
    console.log(`${testCase.name}: 计算错误 - ${error.message}`);
    console.log('');
  }
});

console.log('=== 测试完成 ===');
