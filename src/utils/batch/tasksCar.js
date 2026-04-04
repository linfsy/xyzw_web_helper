/**
 * 车辆类任务
 * 包含: batchSmartSendCar, batchClaimCars
 */

import { CarresearchItem } from "./constants.js";

/**
 * 检查奖励是否满足自定义条件
 * @param {Object} car - 车辆信息
 * @param {Object} conditions - 自定义条件
 * @returns {boolean} 是否满足条件
 */
export function checkRewardConditions(car, conditions) {
  if (!conditions || typeof conditions !== 'object') {
    return true;
  }

  const { gold, recruit, jade, refresh, logicMode = 'OR' } = conditions;
  const rewards = car.rewards || [];

  // 检查各项奖励是否满足阈值
  const checks = [];

  // 检查金锭
  if (gold > 0) {
    const goldReward = rewards.find(r => r.type === 'gold') || { quantity: 0 };
    checks.push(Number(goldReward.quantity) >= gold);
  }

  // 检查招募令
  if (recruit > 0) {
    const recruitReward = rewards.find(r => r.type === 'recruit') || { quantity: 0 };
    checks.push(Number(recruitReward.quantity) >= recruit);
  }

  // 检查白玉
  if (jade > 0) {
    const jadeReward = rewards.find(r => r.type === 'jade') || { quantity: 0 };
    checks.push(Number(jadeReward.quantity) >= jade);
  }

  // 检查刷新符
  if (refresh > 0) {
    const refreshReward = rewards.find(r => r.type === 'refresh') || { quantity: 0 };
    checks.push(Number(refreshReward.quantity) >= refresh);
  }

  // 根据逻辑模式判断
  if (logicMode === 'AND') {
    // 所有条件都必须满足
    return checks.every(check => check);
  } else {
    // 至少满足一个条件
    return checks.length === 0 || checks.some(check => check);
  }
}

/**
 * 检查是否应该发车
 * @param {Object} car - 车辆信息
 * @param {number} refreshTickets - 剩余刷新次数
 * @param {Object} customConditions - 自定义条件
 * @returns {boolean} 是否应该发车
 */
export function shouldSendCar(car, refreshTickets, customConditions = null) {
  // 首先检查默认条件
  const color = Number(car.color || 0);
  if (color >= 4) return true;
  if (color === 3 && refreshTickets < 6) return true;
  
  // 如果有自定义条件，检查是否满足
  if (customConditions) {
    return checkRewardConditions(car, customConditions);
  }
  
  return false;
}

/**
 * 创建车辆类任务执行器
 * @param {Object} deps - 依赖项
 * @returns {Object} 任务函数集合
 */
export function createTasksCar(deps) {
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
    normalizeCars,
    gradeLabel,
    shouldSendCar,
    canClaim,
    isBigPrize,
    countRacingRefreshTickets,
    delayConfig,
    startTask,
    stopTask,
  } = deps;

  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

  /**
   * 智能发车
   */
  const batchSmartSendCar = async () => {
    if (selectedTokens.value.length === 0) return;

    if (startTask) startTask();

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
          message: `=== 开始智能发车: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        // 1. Fetch Car Info
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 获取车辆信息...`,
          type: "info",
        });
        const res = await tokenStore.sendMessageWithPromise(
          tokenId,
          "car_getrolecar",
          {},
          10000,
        );
        let carList = normalizeCars(res?.body ?? res);

        // 2. Fetch Tickets & Role Info
        let refreshTickets = 0;
        let currentRoleId = null;
        try {
          const roleRes = await tokenStore.sendMessageWithPromise(
            tokenId,
            "role_getroleinfo",
            {},
            10000,
          );
          const qty = roleRes?.role?.items?.[35002]?.quantity;
          refreshTickets = Number(qty || 0);
          currentRoleId = roleRes?.role?.roleId ? String(roleRes.role.roleId) : null;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 剩余刷新次数: ${refreshTickets}`,
            type: "info",
          });
        } catch (_) {}

        // 2.5 Fetch Helper Data (Club Members & Usage)
        let helperUsageMap = {};
        let sortedHelpers = [];

        // 封装获取护卫使用情况的方法
        const updateHelperUsage = async () => {
          try {
            const usageRes = await tokenStore.sendMessageWithPromise(
              tokenId,
              "car_getmemberhelpingcnt",
              {},
              5000
            );
            helperUsageMap =
              usageRes?.body?.memberHelpingCntMap ||
              usageRes?.memberHelpingCntMap ||
              {};
          } catch (e) {
            // 忽略更新失败，使用旧数据或空数据
          }
        };

        try {
          // Initial fetch of usage
          await updateHelperUsage();

          // Fetch club members
          const legionRes = await tokenStore.sendMessageWithPromise(
            tokenId,
            "legion_getinfo",
            {},
            5000
          );
          const membersMap =
            legionRes?.body?.info?.members || legionRes?.info?.members || {};
          
          // Sort members by Red Quench (desc)
          sortedHelpers = Object.values(membersMap)
            .filter(
              (m) =>
                !currentRoleId || String(m.roleId) !== currentRoleId
            )
            .map((m) => ({
              id: String(m.roleId),
              name: m.name || m.nickname || String(m.roleId),
              redQuench: m.custom?.red_quench_cnt || 0,
            }))
            .sort((a, b) => b.redQuench - a.redQuench);
            
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 获取到 ${sortedHelpers.length} 位潜在护卫`,
            type: "info",
          });
        } catch (e) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 获取护卫数据失败: ${e.message}，将不带护卫发车`,
            type: "warning",
            code: e.code // Log code if available
          });
        }

        // Helper function to assign guard
        const assignHelperIfNeeded = async (car) => {
          const color = Number(car.color || 0);
          // Only Red(5) and above need guards
          if (color < 5) return;
          // Skip if already has helper
          if (car.helperId) return;

          // 每次分配前刷新护卫状态，避免并发导致的使用次数超标
          await updateHelperUsage();

          if (!sortedHelpers.length) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 车辆[${gradeLabel(car.color)}]需要护卫，但未获取到可用护卫列表`,
              type: "warning",
            });
            return;
          }

          // Find best available helper
          const bestHelper = sortedHelpers.find((h) => {
            const used = Number(helperUsageMap[h.id] || 0);
            return used < 4;
          });

          if (bestHelper) {
            car.helperId = bestHelper.id;
            // Update local usage count (optimistic update)
            helperUsageMap[bestHelper.id] = Number(helperUsageMap[bestHelper.id] || 0) + 1;
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 车辆[${gradeLabel(car.color)}]自动分配护卫: ${bestHelper.name} (已助战: ${helperUsageMap[bestHelper.id]}/4)`,
              type: "success",
            });
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 车辆[${gradeLabel(car.color)}]需要护卫，但所有护卫次数已满`,
              type: "warning",
            });
          }
        };

        // 3. Process Cars
        for (const car of carList) {
          if (shouldStop.value) break;

          if (Number(car.sendAt || 0) !== 0) continue;

          try {
            // 当启用金砖保底时，强制使用高票数的判断逻辑（严格模式），避免因票数不足而提前发车
            const effectiveTickets = batchSettings.useGoldRefreshFallback ? 999 : refreshTickets;
            
            const customConditions = {
              gold: batchSettings.smartDepartureGoldThreshold,
              recruit: batchSettings.smartDepartureRecruitThreshold,
              jade: batchSettings.smartDepartureJadeThreshold,
              ticket: batchSettings.smartDepartureTicketThreshold,
            };

            if (shouldSendCar(car, effectiveTickets, customConditions)) {
              await assignHelperIfNeeded(car);
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 车辆[${gradeLabel(car.color)}]满足条件，直接发车`,
                type: "info",
              });
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "car_send",
                {
                  carId: String(car.id),
                  helperId: car.helperId ? String(car.helperId) : 0,
                  text: "",
                  isUpgrade: false,
                },
                10000,
              );
              await new Promise((r) => setTimeout(r, delayConfig.action));
              continue;
            }

            let shouldRefresh = false;
            let refreshCount = 0;
            // 最大刷新次数：0=不刷新，1=免费刷新，2+=券/金砖
            const maxRefreshCount = batchSettings.maxCarRefreshCount || 0;
            const enableMaxCarRefresh = batchSettings.enableMaxCarRefresh ?? true;
            const free = Number(car.refreshCount ?? 0) === 0;
            
            // 启用最大刷新次数限制
            if (enableMaxCarRefresh) {
              // 优先处理免费刷新
              if (free) {
                shouldRefresh = true;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 车辆[${gradeLabel(car.color)}]有免费刷新次数，优先使用免费刷新`,
                  type: "info",
                });
              }
              // 1=只允许免费刷新1次（已处理）
              // 2+=允许用刷新券或金砖
              else if (maxRefreshCount >= 2) {
                const useGoldFallback = batchSettings.useGoldRefreshFallback && !free && refreshTickets < 6;
                if (refreshTickets >= 6) shouldRefresh = true;
                else if (useGoldFallback) {
                  shouldRefresh = true;
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 车辆[${gradeLabel(car.color)}]将使用金砖刷新（已启用保底，最多${maxRefreshCount}次）`,
                    type: "warning",
                  });
                }
              }
              
              // 不满足刷新条件，直接发车
              if (!shouldRefresh) {
                await assignHelperIfNeeded(car);
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 车辆[${gradeLabel(car.color)}]不满足条件且无刷新次数，直接发车`,
                  type: "warning",
                });
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "car_send",
                  {
                    carId: String(car.id),
                    helperId: car.helperId ? String(car.helperId) : 0,
                    text: "",
                    isUpgrade: false,
                  },
                  10000,
                );
                await new Promise((r) => setTimeout(r, delayConfig.action));
                continue;
              }

              // 循环刷新
              while (shouldRefresh && !shouldStop.value) {
                // 检查是否达到最大刷新次数（0表示无限制）
                if (maxRefreshCount > 0 && refreshCount >= maxRefreshCount) {
                  break;
                }
                
                const countText = maxRefreshCount > 0 ? ` (${refreshCount + 1}/${maxRefreshCount})` : '';
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 车辆[${gradeLabel(car.color)}]尝试刷新...${countText}`,
                  type: "info",
                });
                refreshCount++;
                const resp = await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "car_refresh",
                  { carId: String(car.id) },
                  10000,
                );

                // 增加额外延迟，确保服务器数据已更新
                await new Promise((r) => setTimeout(r, 500));

                // 重新查询车辆列表获取最新数据
                try {
                  const carRes = await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "car_getrolecar",
                    {},
                    10000,
                  );
                  const carList = normalizeCars(carRes?.body ?? carRes);
                  const updatedCar = carList.find((c) => String(c.id) === String(car.id));
                  if (updatedCar) {
                    car.color = Number(updatedCar.color || 0);
                    car.refreshCount = Number(updatedCar.refreshCount || 0);
                    car.rewards = updatedCar.rewards || [];
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 刷新后车辆数据已更新: [${gradeLabel(car.color)}]`,
                      type: "info",
                    });
                  }
                } catch (e) {
                  // 如果重新查询失败，使用刷新接口返回的数据
                  const data = resp?.car || resp?.body?.car || resp;
                  if (data && typeof data === "object") {
                    if (data.color != null) car.color = Number(data.color);
                    if (data.refreshCount != null)
                      car.refreshCount = Number(data.refreshCount);
                    if (data.rewards != null) car.rewards = data.rewards;
                  }
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 使用刷新接口返回数据: [${gradeLabel(car.color)}]`,
                    type: "warning",
                  });
                }

                try {
                  const roleRes = await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "role_getroleinfo",
                    {},
                    5000,
                  );
                  refreshTickets = Number(
                    roleRes?.role?.items?.[35002]?.quantity || 0,
                  );
                } catch (_) {}

                // 当启用金砖保底时，强制使用高票数的判断逻辑（严格模式）
                const effectiveTickets = batchSettings.useGoldRefreshFallback ? 999 : refreshTickets;
                
                if (shouldSendCar(car, effectiveTickets, customConditions)) {
                  await assignHelperIfNeeded(car);
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 刷新后车辆[${gradeLabel(car.color)}]满足条件，发车`,
                    type: "success",
                  });
                  await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "car_send",
                    {
                      carId: String(car.id),
                      helperId: car.helperId ? String(car.helperId) : 0,
                      text: "",
                      isUpgrade: false,
                    },
                    10000,
                  );
                  await new Promise((r) => setTimeout(r, delayConfig.action));
                  break;
                }

                const freeNow = Number(car.refreshCount ?? 0) === 0;
                const useGoldFallback = batchSettings.useGoldRefreshFallback && !freeNow && refreshTickets < 6;

                // 检查是否还有刷新条件
                if (maxRefreshCount === 1) {
                  // 设置为1时，只允许免费刷新1次
                  shouldRefresh = false;
                }
                else if (maxRefreshCount === 0) {
                  // 设置为0时，无限制刷新
                  if (refreshTickets >= 6) shouldRefresh = true;
                  else if (freeNow) shouldRefresh = true;
                  else if (useGoldFallback) {
                    shouldRefresh = true;
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 刷新后车辆[${gradeLabel(car.color)}]仍不满足条件且无刷新次数，将启用金砖刷新`,
                      type: "warning",
                    });
                  }
                  else {
                    shouldRefresh = false;
                  }
                }
                else if (maxRefreshCount >= 2) {
                  if (refreshTickets >= 6) shouldRefresh = true;
                  else if (freeNow) shouldRefresh = true;
                  else if (useGoldFallback) {
                    shouldRefresh = true;
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 刷新后车辆[${gradeLabel(car.color)}]仍不满足条件且无刷新次数，将启用金砖刷新`,
                      type: "warning",
                    });
                  }
                  else {
                    shouldRefresh = false;
                  }
                }

                await new Promise((r) => setTimeout(r, delayConfig.refresh));
              }
              
              // 如果达到最大刷新次数仍未满足条件，强制发车
              const effectiveTickets = batchSettings.useGoldRefreshFallback ? 999 : refreshTickets;
              if (maxRefreshCount > 0 && refreshCount >= maxRefreshCount && !shouldSendCar(car, effectiveTickets, customConditions)) {
                await assignHelperIfNeeded(car);
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 车辆[${gradeLabel(car.color)}]已达到最大刷新次数(${maxRefreshCount}次)，强制发车`,
                  type: "warning",
                });
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "car_send",
                  {
                    carId: String(car.id),
                    helperId: car.helperId ? String(car.helperId) : 0,
                    text: "",
                    isUpgrade: false,
                  },
                  10000,
                );
                await new Promise((r) => setTimeout(r, delayConfig.action));
              }
              // 如果无限制刷新但无刷新条件，强制发车
              else if (maxRefreshCount === 0 && !shouldRefresh && !shouldSendCar(car, effectiveTickets, customConditions)) {
                await assignHelperIfNeeded(car);
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 车辆[${gradeLabel(car.color)}]无刷新条件，强制发车`,
                  type: "warning",
                });
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "car_send",
                  {
                    carId: String(car.id),
                    helperId: car.helperId ? String(car.helperId) : 0,
                    text: "",
                    isUpgrade: false,
                  },
                  10000,
                );
                await new Promise((r) => setTimeout(r, delayConfig.action));
              }
            } else {
              // 未启用最大刷新次数限制（使用旧版逻辑）
              const useGoldFallback = batchSettings.useGoldRefreshFallback && !free && refreshTickets < 6;
              
              if (refreshTickets >= 6) shouldRefresh = true;
              else if (free) shouldRefresh = true;
              else if (useGoldFallback) {
                shouldRefresh = true;
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 车辆[${gradeLabel(car.color)}]仍不满足条件且无刷新次数，将启用金砖刷新`,
                  type: "warning",
                });
              }
              else {
                await assignHelperIfNeeded(car);
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 车辆[${gradeLabel(car.color)}]不满足条件且无刷新次数，直接发车`,
                  type: "warning",
                });
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "car_send",
                  {
                    carId: String(car.id),
                    helperId: car.helperId ? String(car.helperId) : 0,
                    text: "",
                    isUpgrade: false,
                  },
                  10000,
                );
                await new Promise((r) => setTimeout(r, delayConfig.action));
                continue;
              }

              // 循环刷新（无次数限制）
              while (shouldRefresh && !shouldStop.value) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 车辆[${gradeLabel(car.color)}]尝试刷新...`,
                  type: "info",
                });
                const resp = await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "car_refresh",
                  { carId: String(car.id) },
                  10000,
                );

                // 增加额外延迟，确保服务器数据已更新
                await new Promise((r) => setTimeout(r, 500));

                // 重新查询车辆列表获取最新数据
                try {
                  const carRes = await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "car_getrolecar",
                    {},
                    10000,
                  );
                  const carList = normalizeCars(carRes?.body ?? carRes);
                  const updatedCar = carList.find((c) => String(c.id) === String(car.id));
                  if (updatedCar) {
                    car.color = Number(updatedCar.color || 0);
                    car.refreshCount = Number(updatedCar.refreshCount || 0);
                    car.rewards = updatedCar.rewards || [];
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `${token.name} 刷新后车辆数据已更新: [${gradeLabel(car.color)}]`,
                      type: "info",
                    });
                  }
                } catch (e) {
                  // 如果重新查询失败，使用刷新接口返回的数据
                  const data = resp?.car || resp?.body?.car || resp;
                  if (data && typeof data === "object") {
                    if (data.color != null) car.color = Number(data.color);
                    if (data.refreshCount != null)
                      car.refreshCount = Number(data.refreshCount);
                    if (data.rewards != null) car.rewards = data.rewards;
                  }
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 使用刷新接口返回数据: [${gradeLabel(car.color)}]`,
                    type: "warning",
                  });
                }

                try {
                  const roleRes = await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "role_getroleinfo",
                    {},
                    5000,
                  );
                  refreshTickets = Number(
                    roleRes?.role?.items?.[35002]?.quantity || 0,
                  );
                } catch (_) {}

                // 当启用金砖保底时，强制使用高票数的判断逻辑（严格模式）
                const effectiveTickets = batchSettings.useGoldRefreshFallback ? 999 : refreshTickets;
                
                if (shouldSendCar(car, effectiveTickets, customConditions)) {
                  await assignHelperIfNeeded(car);
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 刷新后车辆[${gradeLabel(car.color)}]满足条件，发车`,
                    type: "success",
                  });
                  await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "car_send",
                    {
                      carId: String(car.id),
                      helperId: car.helperId ? String(car.helperId) : 0,
                      text: "",
                      isUpgrade: false,
                    },
                    10000,
                  );
                  await new Promise((r) => setTimeout(r, delayConfig.action));
                  break;
                }

                const freeNow = Number(car.refreshCount ?? 0) === 0;
                const useGoldFallback = batchSettings.useGoldRefreshFallback && !freeNow && refreshTickets < 6;

                if (refreshTickets >= 6) shouldRefresh = true;
                else if (freeNow) shouldRefresh = true;
                else if (useGoldFallback) {
                  shouldRefresh = true;
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 刷新后车辆[${gradeLabel(car.color)}]仍不满足条件且无刷新次数，将启用金砖刷新`,
                    type: "warning",
                  });
                }
                else {
                  assignHelperIfNeeded(car);
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 刷新后车辆[${gradeLabel(car.color)}]仍不满足条件且无刷新次数，发车`,
                    type: "warning",
                  });
                  await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "car_send",
                    {
                      carId: String(car.id),
                      helperId: car.helperId ? String(car.helperId) : 0,
                      text: "",
                      isUpgrade: false,
                    },
                    10000,
                  );
                  await new Promise((r) => setTimeout(r, delayConfig.action));
                  break;
                }

                await new Promise((r) => setTimeout(r, delayConfig.refresh));
              }
            }
          } catch (carError) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 车辆[${gradeLabel(car.color)}]处理失败: ${carError.message}，跳过该车辆`,
              type: "error",
            });
            continue;
          }
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 智能发车完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `智能发车失败: ${error.message}`,
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
    message.success("批量智能发车结束");
  };

  /**
   * 一键收车
   */
  const batchClaimCars = async () => {
    if (selectedTokens.value.length === 0) return;

    if (startTask) startTask();

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
          message: `=== 开始一键收车: ${token.name} ===`,
          type: "info",
        });

        await ensureConnection(tokenId);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 获取车辆信息...`,
          type: "info",
        });
        const res = await tokenStore.sendMessageWithPromise(
          tokenId,
          "car_getrolecar",
          {},
          10000,
        );
        let carList = normalizeCars(res?.body ?? res);
        let refreshlevel = res?.roleCar?.research?.[1] || 0;

        let claimedCount = 0;
        for (const car of carList) {
          if (shouldStop.value) break;
          if (canClaim(car)) {
            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "car_claim",
                { carId: String(car.id) },
                10000,
              );
              claimedCount++;
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 收车成功: ${gradeLabel(car.color)}`,
                type: "success",
              });
              const roleRes = await tokenStore.sendMessageWithPromise(
                tokenId,
                "role_getroleinfo",
                {},
                5000,
              );
              let refreshpieces = Number(
                roleRes?.role?.items?.[35009]?.quantity || 0,
              );
              while (
                refreshlevel < CarresearchItem.length &&
                refreshpieces >= CarresearchItem[refreshlevel] &&
                !shouldStop.value
              ) {
                try {
                  await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "car_research",
                    { researchId: 1 },
                    5000,
                  );
                  refreshlevel++;

                  const updatedRoleRes = await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "role_getroleinfo",
                    {},
                    5000,
                  );
                  refreshpieces = Number(
                    updatedRoleRes?.role?.items?.[35009]?.quantity || 0,
                  );

                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 执行车辆改装升级，当前等级: ${refreshlevel}`,
                    type: "success",
                  });

                  await new Promise((r) => setTimeout(r, delayConfig.action));
                } catch (e) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `${token.name} 车辆改装升级失败: ${e.message}`,
                    type: "error",
                  });
                  break;
                }
              }
            } catch (e) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 收车失败: ${e.message}`,
                type: "warning",
              });
            }
            await new Promise((r) => setTimeout(r, delayConfig.action));
          }
        }

        if (claimedCount === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 没有可收取的车辆`,
            type: "info",
          });
        }

        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 收车完成，共收取 ${claimedCount} 辆 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        tokenStatus.value[tokenId] = "failed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 收车失败: ${error.message}`,
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
    message.success("批量一键收车结束");
  };

  return {
    batchSmartSendCar,
    batchClaimCars,
  };
}
