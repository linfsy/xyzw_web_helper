/**
 * 黑市周购买任务
 * 包含: batchBlackMarketWeek
 */

/**
 * 创建黑市周购买任务执行器
 * @param {Object} deps - 依赖项
 * @returns {Object} 任务函数集合
 */
export function createTasksBlackMarket(deps) {
  const {
    selectedTokens,
    tokens,
    tokenStatus,
    isRunning,
    shouldStop,
    ensureConnection,
    releaseConnectionSlot,
    connectionQueue,
    batchSettings,
    tokenStore,
    addLog,
    message,
    currentRunningTokenId,
    delayConfig,
    startTask,
    stopTask,
  } = deps;

  // 黑市周商品列表
  const goodsList = [
    { name: '金砖回馈(200金砖)', activityId: 5, goodsIndex: 0, buyNum: 1, price: 0, limit: 1 },
    { name: '黑市福利(500金砖)', activityId: 9, goodsIndex: 0, buyNum: 1, price: 0, limit: 1 },
    { name: '黑市见面礼', activityId: 9, goodsIndex: 1, buyNum: 1, price: 600, limit: 1 },
    { name: '黑市惊喜礼', activityId: 9, goodsIndex: 2, buyNum: 1, price: 1200, limit: 1 },
    { name: '初级黑市包', activityId: 9, goodsIndex: 3, buyNum: 1, price: 2500, limit: 1 },
    { name: '中级黑市包', activityId: 9, goodsIndex: 4, buyNum: 1, price: 5000, limit: 1 },
    { name: '高级黑市包', activityId: 9, goodsIndex: 5, buyNum: 1, price: 8000, limit: 1 },
    { name: '顶级鱼竿包', activityId: 9, goodsIndex: 6, buyNum: 1, price: 12000, limit: 1 },
    { name: '白玉黑市包', activityId: 9, goodsIndex: 7, buyNum: 1, price: 2000, limit: 1 },
    { name: '特级贝壳包', activityId: 9, goodsIndex: 8, buyNum: 1, price: 25000, limit: 1 },
    { name: '养成补给包', activityId: 9, goodsIndex: 9, buyNum: 1, price: 8000, limit: 4 }
  ];

  /**
   * 处理单个账号的购买
   */
  const processTokenPurchase = async (token, selectedGoods) => {
    const tokenPurchaseResults = [];
    let tokenSuccess = true;
    
    // 检查连接状态，如果未连接则自动连接
    const status = tokenStore.getWebSocketStatus(token.id);
    if (status !== "connected") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `正在连接... (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
        type: "info"
      });
      
      try {
        await ensureConnection(token.id, tokens.value);
        
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `账号 ${token.name} 连接成功`,
          type: "success"
        });
      } catch (error) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `账号 ${token.name} 连接失败: ${error.message}`,
          type: "error"
        });
        return {
          token,
          success: false,
          results: selectedGoods.map(g => ({
            name: g.name,
            success: false,
            error: `连接失败: ${error.message}`
          }))
        };
      }
    }
    
    // 逐个购买商品
    for (const goods of selectedGoods) {
      if (shouldStop.value) break;
      
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
            10000
          );
          
          success = true;
          errorMsg = null;
          break;
        } catch (error) {
          errorMsg = error.message || "购买失败";
          if (attempt < 2) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `账号 ${token.name} 购买 ${goods.name} 失败，正在重试... (${attempt}/2)`,
              type: "warning"
            });
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
      
      // 添加日志
      if (success) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `账号 ${token.name} - ${goods.name} 购买成功`,
          type: "success"
        });
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `账号 ${token.name} - ${goods.name} 购买失败: ${errorMsg}`,
          type: "error"
        });
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

  /**
   * 一键黑市周购买
   * 默认购买所有免费商品（金砖回馈和黑市福利）
   */
  const batchBlackMarketWeek = async () => {
    if (selectedTokens.value.length === 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: "请先选择账号",
        type: "warning"
      });
      return;
    }

    if (startTask) startTask();

    // 默认购买免费商品
    const selectedGoods = goodsList.filter(g => g.price === 0);
    
    if (selectedGoods.length === 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: "没有选择任何商品",
        type: "warning"
      });
      return;
    }

    const tokensToUse = selectedTokens.value.map(id => 
      tokens.value.find(t => t.id === id)
    ).filter(t => t !== undefined);

    // 获取分批执行设置
    const enableBatchExecution = batchSettings?.enableBatchExecution ?? true;
    const batchSize = batchSettings?.batchSize || 5;
    const batchDelay = (batchSettings?.batchDelay || 5) * 1000;
    
    // 添加开始日志
    if (enableBatchExecution && tokensToUse.length > batchSize) {
      const totalBatches = Math.ceil(tokensToUse.length / batchSize);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 黑市周购买开始 (${tokensToUse.length}个账号, ${selectedGoods.length}个商品, 分${totalBatches}批, 每批${batchSize}个) ===`,
        type: "success"
      });
    } else {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 黑市周购买开始 (${tokensToUse.length}个账号, ${selectedGoods.length}个商品) ===`,
        type: "success"
      });
    }

    const allResults = [];

    try {
      // 判断是否使用分批执行
      if (enableBatchExecution && tokensToUse.length > batchSize) {
        // 分批执行
        const totalBatches = Math.ceil(tokensToUse.length / batchSize);
        
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
          if (shouldStop.value) break;
          
          const startIndex = batchIndex * batchSize;
          const endIndex = Math.min(startIndex + batchSize, tokensToUse.length);
          const batchTokens = tokensToUse.slice(startIndex, endIndex);
          
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始执行第 ${batchIndex + 1}/${totalBatches} 批，共 ${batchTokens.length} 个账号 ===`,
            type: "info"
          });
          
          // 处理当前批次的所有账号
          for (const token of batchTokens) {
            if (shouldStop.value) break;
            const result = await processTokenPurchase(token, selectedGoods);
            allResults.push(result);
          }
          
          // 批次之间增加延迟（除了最后一批）
          if (batchIndex < totalBatches - 1 && !shouldStop.value) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== 第 ${batchIndex + 1} 批执行完成，等待 ${batchDelay / 1000} 秒后执行下一批 ===`,
              type: "info"
            });
            
            // 倒计时等待
            let remainingSeconds = batchDelay / 1000;
            while (remainingSeconds > 0 && !shouldStop.value) {
              // 每10秒或最后5秒显示倒计时
              if (remainingSeconds % 10 === 0 || remainingSeconds <= 5) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `倒计时: ${remainingSeconds} 秒`,
                  type: "info"
                });
              }
              await new Promise(resolve => setTimeout(resolve, 1000));
              remainingSeconds--;
            }
          }
        }
      } else {
        // 不分批，按顺序执行
        for (const token of tokensToUse) {
          if (shouldStop.value) break;
          const result = await processTokenPurchase(token, selectedGoods);
          allResults.push(result);
          
          // 账号之间增加延迟（2秒）
          if (token !== tokensToUse[tokensToUse.length - 1] && !shouldStop.value) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      // 统计购买结果
      const totalTokens = tokensToUse.length;
      const successTokens = allResults.filter(r => r.success).length;
      const totalGoods = selectedGoods.length * totalTokens;
      const successGoods = allResults.reduce((sum, r) => 
        sum + r.results.filter(res => res.success).length, 0
      );
      
      // 添加总结日志
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 黑市周购买执行完成 ===`,
        type: "success"
      });
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `账号统计: 成功 ${successTokens}/${totalTokens} 个`,
        type: "success"
      });
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `商品统计: 成功 ${successGoods}/${totalGoods} 个`,
        type: "success"
      });
      
      if (successTokens === totalTokens) {
        message.success(`所有 ${totalTokens} 个账号的 ${totalGoods} 个商品购买成功！`);
      } else {
        message.warning(`${successTokens}/${totalTokens} 个账号购买成功，${successGoods}/${totalGoods} 个商品购买成功`);
      }
      
    } catch (error) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `购买过程中出现错误: ${error.message}`,
        type: "error"
      });
      message.error("购买过程中出现错误: " + error.message);
    } finally {
      if (stopTask) stopTask();
    }
  };

  return {
    batchBlackMarketWeek
  };
}
