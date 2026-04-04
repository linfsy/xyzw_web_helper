/**
 * 宝库、梦境类任务
 * 包含: batchbaoku13, batchbaoku45, batchmengjing
 */

/**
 * 创建宝库、梦境类任务执行器
 * @param {Object} deps - 依赖项
 * @returns {Object} 任务函数集合
 */
export function createTasksDungeon(deps) {
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
    startTask,
    stopTask,
  } = deps;

  /**
   * 一键宝库前3层
   */
  const batchbaoku13 = async () => {
    if (selectedTokens.value.length === 0) return;
    if (startTask) startTask();
    else { startTask(); }

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const taskPromises = selectedTokens.value.map(async (tokenId) => {
      if (shouldStop.value) return;
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始一键宝库: ${token.name} ===`,
          type: "info",
        });
        await ensureConnection(tokenId);
        const bosstowerinfo = await tokenStore.sendMessageWithPromise(
          tokenId,
          "bosstower_getinfo",
          {},
        );
        const towerId = bosstowerinfo.bossTower.towerId;
        if (towerId >= 1 && towerId <= 3) {
          for (let i = 0; i < 2; i++) {
            if (shouldStop.value) break;
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "bosstower_startboss",
              {},
            );
            await new Promise((r) => setTimeout(r, 500));
          }
          for (let i = 0; i < 9; i++) {
            if (shouldStop.value) break;
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "bosstower_startbox",
              {},
            );
            await new Promise((r) => setTimeout(r, 500));
          }
        }
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 宝库战斗已完成，请上线手动领取奖励 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 宝库战斗失败: ${error.message || "未知错误"}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    await Promise.all(taskPromises);
    if (stopTask) stopTask();
    else { stopTask(); }
    message.success("批量宝库结束");
  };

  /**
   * 一键宝库4,5层
   */
  const batchbaoku45 = async () => {
    if (selectedTokens.value.length === 0) return;
    if (startTask) startTask();
    else { startTask(); }

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const taskPromises = selectedTokens.value.map(async (tokenId) => {
      if (shouldStop.value) return;
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始一键宝库: ${token.name} ===`,
          type: "info",
        });
        await ensureConnection(tokenId);
        const bosstowerinfo = await tokenStore.sendMessageWithPromise(
          tokenId,
          "bosstower_getinfo",
          {},
        );
        const towerId = bosstowerinfo.bossTower.towerId;
        if (towerId >= 4 && towerId <= 5) {
          for (let i = 0; i < 2; i++) {
            if (shouldStop.value) break;
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "bosstower_startboss",
              {},
            );
            await new Promise((r) => setTimeout(r, 500));
          }
        }
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 宝库战斗已完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 宝库战斗失败: ${error.message || "未知错误"}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    await Promise.all(taskPromises);
    if (stopTask) stopTask();
    else { stopTask(); }
    message.success("批量宝库结束");
  };

  /**
   * 一键梦境
   */
  const batchmengjing = async () => {
    if (selectedTokens.value.length === 0) return;
    if (startTask) startTask();
    else { startTask(); }

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const taskPromises = selectedTokens.value.map(async (tokenId) => {
      if (shouldStop.value) return;
      tokenStatus.value[tokenId] = "running";
      const token = tokens.value.find((t) => t.id === tokenId);
      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始咸王梦境: ${token.name} ===`,
          type: "info",
        });
        await ensureConnection(tokenId);
        if (shouldStop.value) return;
        const mjbattleTeam = { 0: 107 };
        const dayOfWeek = new Date().getDay();
        if (
          dayOfWeek === 0 ||
          dayOfWeek === 1 ||
          dayOfWeek === 3 ||
          dayOfWeek === 4
        ) {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "dungeon_selecthero",
            { battleTeam: mjbattleTeam },
            5000,
          );
          await new Promise((r) => setTimeout(r, 500));
          tokenStatus.value[tokenId] = "completed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${token.name} 咸王梦境已完成 ===`,
            type: "success",
          });
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${token.name} 当前未在开放时间 ===`,
            type: "error",
          });
        }
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 咸王梦境失败: ${error.message || "未知错误"}`,
          type: "error",
        });
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    await Promise.all(taskPromises);
    if (stopTask) stopTask();
    else { stopTask(); }
    message.success("批量梦境结束");
  };

  const merchantConfig = {
    1: {
      name: "初级商人",
      items: [
        "进阶石",
        "精铁",
        "木质宝箱",
        "青铜宝箱",
        "普通鱼竿",
        "挑战票",
        "咸神火把",
      ],
    },
    2: {
      name: "中级商人",
      items: [
        "梦魇晶石",
        "进阶石",
        "精铁",
        "黄金宝箱",
        "黄金鱼竿",
        "招募令",
        "橙将碎片",
        "紫将碎片",
      ],
    },
    3: {
      name: "高级商人",
      items: [
        "梦魇晶石",
        "铂金宝箱",
        "黄金鱼竿",
        "招募令",
        "红将碎片",
        "橙将碎片",
        "红将碎片",
        "普通鱼竿",
      ],
    },
  };

  const goldItemsConfig = {
    1: [5, 6], 
    2: [6, 7], 
    3: [5, 6, 7], 
  };

  const dreamMerchantData = {};
  const dreamLevelIds = {};

  function isDungeonOpen() {
    const now = new Date();
    const day = now.getDay();
    return day === 0 || day === 1 || day === 3 || day === 4;
  }

  function getItemName(merchantId, index) {
    const merchant = merchantConfig[merchantId];
    if (merchant && merchant.items[index] !== undefined) {
      return merchant.items[index];
    }
    return `未知商品(${index})`;
  }

  function isGoldItem(merchantId, index) {
    return goldItemsConfig[merchantId] && goldItemsConfig[merchantId].includes(index);
  }

  async function getRoleInfo(tokenId) {
    try {
      const token = tokens.value.find((t) => t.id === tokenId);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${token?.name || tokenId} 正在获取角色信息和商品列表...`,
        type: "info",
      });
      
      const response = await tokenStore.sendMessageWithPromise(
        tokenId,
        "role_getroleinfo",
        {},
        15000,
      );

      if (response && response.role) {
        if (response.role.dungeon && response.role.dungeon.merchant) {
          dreamMerchantData[tokenId] = response.role.dungeon.merchant;
        } else {
          dreamMerchantData[tokenId] = { 1: [], 2: [], 3: [] };
        }

        if (response.role.levelId) {
          dreamLevelIds[tokenId] = response.role.levelId;
        } else {
          dreamLevelIds[tokenId] = 0;
        }

        return {
          levelId: dreamLevelIds[tokenId],
          merchantData: dreamMerchantData[tokenId]
        };
      }
      return null;
    } catch (error) {
      console.error(`获取角色信息失败 (${tokenId}):`, error);
      throw error;
    }
  }

  async function buyItem(tokenId, merchantId, index, pos) {
    try {
      const response = await tokenStore.sendMessageWithPromise(
        tokenId,
        "dungeon_buymerchant",
        {
          id: merchantId,
          index: index,
          pos: pos,
        },
        15000,
      );

      if (response) {
        console.log(`购买商品成功 (${tokenId}):`, response);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`购买商品失败 (${tokenId}):`, error);
      return false;
    }
  }

  async function refreshMerchantListForToken(tokenId) {
    try {
      const token = tokens.value.find((t) => t.id === tokenId);
      
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `${token?.name || tokenId} 跳过选择阵容步骤，直接获取商品列表...`,
        type: "info",
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));

      const roleInfo = await getRoleInfo(tokenId);
      return roleInfo;
    } catch (error) {
      if (error.message.includes('400880')) {
        console.error(`获取商品列表失败 (${tokenId}): 服务器错误 400880 - 可能是账号不满足条件或服务器限流`, error);
        throw new Error(`服务器错误: 400880 - 可能是账号不满足条件或服务器限流`);
      }
      console.error(`获取商品列表失败 (${tokenId}):`, error);
      throw error;
    }
  }

  async function buyAllGoldItemsForToken(tokenId, merchantData) {
    let successCount = 0;
    let failCount = 0;

    for (const merchantId in merchantData) {
      const items = merchantData[merchantId];
      const numId = parseInt(merchantId);

      for (let pos = items.length - 1; pos >= 0; pos--) {
        const index = items[pos];

        if (isGoldItem(numId, index)) {
          try {
            const success = await buyItem(tokenId, numId, index, pos);
            if (success) {
              successCount++;
            } else {
              failCount++;
            }
          } catch (error) {
            failCount++;
          }

          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    }

    return { successCount, failCount };
  }

  async function buyAllGoldFishItemsForToken(tokenId, merchantData) {
    let successCount = 0;
    let failCount = 0;

    const items = merchantData[3] || [];
    for (let pos = items.length - 1; pos >= 0; pos--) {
      const index = items[pos];

      if (index === 2) {
        try {
          const success = await buyItem(tokenId, 3, index, pos);
          if (success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    return { successCount, failCount };
  }

  const batchDreamBuy = async () => {
    if (selectedTokens.value.length === 0) {
      message.warning("请先选择账号");
      return;
    }

    if (!isDungeonOpen()) {
      message.warning("当前不是梦境开放时间（周三/周四/周日/周一）");
      return;
    }

    if (startTask) startTask();
    else { startTask(); }

    selectedTokens.value.forEach((id) => {
      tokenStatus.value[id] = "waiting";
    });

    const errorStats = {
      total: selectedTokens.value.length,
      success: 0,
      failed: 0,
      error400880: 0,
      otherErrors: 0
    };

    const taskPromises = selectedTokens.value.map(async (tokenId) => {
      if (shouldStop.value) return;

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始梦境助手购买: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 正在获取商品列表...`,
          type: "info",
        });
        const roleInfo = await refreshMerchantListForToken(tokenId);

        if (!roleInfo) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 获取商品列表失败`,
            type: "error",
          });
          tokenStatus.value[tokenId] = "failed";
          errorStats.failed++;
          errorStats.otherErrors++;
          return;
        }

        const levelId = roleInfo.levelId;
        const merchantData = roleInfo.merchantData;

        if (levelId < 4000) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 关卡数小于4000，无法购买金币商品`,
            type: "info",
          });
          tokenStatus.value[tokenId] = "completed";
          errorStats.success++;
          return;
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 商品列表获取成功`,
          type: "info",
        });

        for (const merchantId in merchantData) {
          const merchantName = merchantConfig[merchantId].name;
          const items = merchantData[merchantId];
          const itemNames = items.map((index, pos) => {
            const itemName = getItemName(parseInt(merchantId), index);
            const isGold = isGoldItem(parseInt(merchantId), index);
            return isGold ? `${itemName} (金币)` : itemName;
          }).join(", ");
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} ${merchantName}: ${itemNames}`,
            type: "info",
          });
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 正在购买金币商品...`,
          type: "info",
        });
        const goldPurchaseResult = await buyAllGoldItemsForToken(tokenId, merchantData);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 正在购买高级商人鱼竿...`,
          type: "info",
        });
        const fishPurchaseResult = await buyAllGoldFishItemsForToken(tokenId, merchantData);

        const totalSuccess = goldPurchaseResult.successCount + fishPurchaseResult.successCount;
        const totalFail = goldPurchaseResult.failCount + fishPurchaseResult.failCount;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 购买完成: 成功 ${totalSuccess} 件, 失败 ${totalFail} 件`,
          type: "success",
        });

        tokenStatus.value[tokenId] = "completed";
        errorStats.success++;
      } catch (error) {
        if (error.message.includes('400880')) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 购买过程出错: 服务器错误 400880 - 可能是账号不满足条件或服务器限流`,
            type: "error",
          });
          errorStats.failed++;
          errorStats.error400880++;
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 购买过程出错: ${error.message}`,
            type: "error",
          });
          errorStats.failed++;
          errorStats.otherErrors++;
        }
        tokenStatus.value[tokenId] = "failed";
      } finally {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    });

    await Promise.all(taskPromises);

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 梦境助手购买完成 ===`,
      type: "info",
    });
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `总账号数: ${errorStats.total}, 成功: ${errorStats.success}, 失败: ${errorStats.failed}`,
      type: "info",
    });
    if (errorStats.error400880 > 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `服务器错误 400880: ${errorStats.error400880} 个账号`,
        type: "error",
      });
    }
    message.success(`梦境助手购买完成: 成功 ${errorStats.success} 个账号, 失败 ${errorStats.failed} 个账号`);
  };

  return {
    batchbaoku13,
    batchbaoku45,
    batchmengjing,
    batchDreamBuy,
  };
}
