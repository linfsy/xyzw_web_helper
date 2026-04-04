import { isInCurrentWeek, sleep } from "@/utils/base";
import { gameLogger } from "@/utils/logger";
import { findAnswer } from "@/utils/studyQuestionsFromJSON";
import type { EVM, XyzwSession } from ".";

export const StudyPlugin = ({
  onSome,
  $emit
}: EVM) => {
  onSome(['study', 'studyresp', 'study_startgame', 'study_startgameresp'], async (data: XyzwSession) => {
    gameLogger.verbose(`收到学习答题事件: ${data.tokenId}`, data);
    const { body, gameData, client } = data;
    if (!body) {
      return;
    }

    gameLogger.info('开始处理学习答题响应')
    // 获取题目列表和学习ID
    const questionList = body.questionList
    const studyId = body.role?.study?.id

    if (!questionList || !Array.isArray(questionList)) {
      gameLogger.error('未找到题目列表')
      return
    }

    if (!studyId) {
      gameLogger.error('未找到学习ID')
      return
    }
    gameLogger.info(`找到 ${questionList.length} 道题目，学习ID: ${studyId}`)
    // 更新答题状态
    gameData.value.studyStatus = {
      isAnswering: true,
      questionCount: questionList.length,
      answeredCount: 0,
      status: 'answering',
      timestamp: Date.now()
    }
    try {
      // 遍历题目并回答
      for (let i = 0; i < questionList.length; i++) {
        const question = questionList[i]
        const questionText = question.question
        const questionId = question.id

        gameLogger.debug(`题目 ${i + 1}: ${questionText.substring(0, 20)}...`)

        // 查找答案（异步）
        let answer = await findAnswer(questionText)

        if (answer === null) {
          // 智能默认答案：根据题目长度和类型选择
          if (questionText.includes('不是') || questionText.includes('错误') || questionText.includes('不正确')) {
            answer = 2; // 否定题通常答案是2
          } else {
            answer = 1; // 肯定题通常答案是1
          }
          gameLogger.verbose(`未找到匹配答案，使用智能默认答案: ${answer}`)
        } else {
          gameLogger.debug(`找到答案: ${answer}`)
        }

        // 发送答案，增加重试机制
        let submitAttempts = 0;
        const maxSubmitAttempts = 3;
        let submitSuccess = false;
        
        while (submitAttempts < maxSubmitAttempts && !submitSuccess) {
          try {
            client?.send('study_answer', {
              id: studyId,
              option: [answer],
              questionId: [questionId]
            })
            gameLogger.verbose(`已提交题目 ${i + 1} 的答案: ${answer} (尝试 ${submitAttempts + 1}/${maxSubmitAttempts})`)
            submitSuccess = true;
          } catch (error) {
            submitAttempts++;
            gameLogger.error(`提交答案失败 (题目 ${i + 1}, 尝试 ${submitAttempts}/${maxSubmitAttempts}):`, error)
            if (submitAttempts < maxSubmitAttempts) {
              await sleep(500); // 重试前延迟
            }
          }
        }

        // 更新已回答题目数量
        gameData.value.studyStatus.answeredCount = i + 1

        // 根据题目复杂度动态调整延迟
        const delay = Math.max(300, questionText.length * 10); // 题目越长，延迟越长
        if (i < questionList.length - 1) {
          gameLogger.verbose(`等待 ${delay}ms 后回答下一题`)
          await sleep(delay)
        }
      }
      // 延迟2000ms后领取奖励，确保所有答案都已处理
      gameLogger.verbose('等待2000ms后领取奖励')
      await sleep(2000)
      $emit.emit('I-study-week-forward', data)
    } catch (error) {
      gameLogger.error('处理学习答题响应失败:', error)
      // 即使出错也要尝试领取奖励
      try {
        await sleep(1000)
        $emit.emit('I-study-week-forward', data)
      } catch (e) {
        gameLogger.error('尝试领取奖励失败:', e)
      }
    }
  });
  //
  onSome(['I-study'], (data: XyzwSession) => {
    const { body, gameData } = data;
    const maxCorrectNum = body.role.study.maxCorrectNum
    const beginTime = body.role.study.beginTime
    const isStudyCompleted = maxCorrectNum >= 10 && isInCurrentWeek(beginTime * 1000)

    // 更新答题完成状态
    if (!gameData.value.studyStatus) {
      gameData.value.studyStatus = {}
    }
    gameData.value.studyStatus.thisWeek = isStudyCompleted
    gameData.value.studyStatus.isCompleted = isStudyCompleted
    gameData.value.studyStatus.maxCorrectNum = maxCorrectNum

    gameLogger.info(`答题状态更新: maxCorrectNum=${maxCorrectNum}, 完成状态=${isStudyCompleted}`)
  });
  // 
  onSome(['I-study-week-forward'], async (data: XyzwSession) => {
    gameLogger.info('开始领取答题奖励')
    const { gameData, client } = data;
    // 更新状态为正在领取奖励
    gameData.value.studyStatus.status = 'claiming_rewards'
    // 领取所有等级的奖励 (1-10)
    for (let rewardId = 1; rewardId <= 10; rewardId++) {
      try {
        client?.send('study_claimreward', {
          rewardId: rewardId
        })
        await new Promise(resolve => setTimeout(resolve, 200))
        gameLogger.verbose(`已发送奖励领取请求: rewardId=${rewardId}`)
      } catch (error) {
        gameLogger.error(`发送奖励领取请求失败 (rewardId=${rewardId}):`, error)
      }
    }

    gameLogger.info('一键答题完成！已尝试领取所有奖励')

    // 更新状态为完成
    gameData.value.studyStatus.status = 'completed'

    // 3秒后重置状态
    await new Promise(resolve => setTimeout(resolve, 1000))
    gameData.value.studyStatus = {
      isAnswering: false,
      questionCount: 0,
      answeredCount: 0,
      status: '',
      timestamp: null
    }

    // 1秒后更新游戏数据
    try {
      // client?.send('role_getroleinfo', {})
      client?.debounceSend('role_getroleinfo', {})
      gameLogger.debug('已请求更新角色信息')
    } catch (error) {
      gameLogger.error('请求角色信息更新失败:', error)
    }
  });
}