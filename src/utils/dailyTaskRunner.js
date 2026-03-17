import { useTokenStore } from "@/stores/tokenStore";

// 辅助函数
const pickArenaTargetId = (targets) => {
  if (!targets) return null;

  // Handle if targets is an array directly
  if (Array.isArray(targets)) {
    const candidate = targets[0];
    return candidate?.roleId || candidate?.id || candidate?.targetId;
  }

  const candidate =
    targets?.rankList?.[0] ||
    targets?.roleList?.[0] ||
    targets?.targets?.[0] ||
    targets?.targetList?.[0] ||
    targets?.list?.[0];

  if (candidate) {
    if (candidate.roleId) return candidate.roleId;
    if (candidate.id) return candidate.id;
    if (candidate.targetId) return candidate.targetId;
  }

  return targets?.roleId || targets?.id || targets?.targetId;
};

const isTodayAvailable = (statisticsTime) => {
  if (!statisticsTime) return true;

  // 如果有时间戳，检查是否为今天
  const today = new Date().toDateString();
  //系统返回得时间戳是秒，要转换成毫秒
  const recordDate = new Date(statisticsTime * 1000).toDateString();

  return today !== recordDate;
};

const getTodayBossId = () => {
  const DAY_BOSS_MAP = [9904, 9905, 9901, 9902, 9903, 9904, 9905]; // 周日~周六
  const dayOfWeek = new Date().getDay();
  return DAY_BOSS_MAP[dayOfWeek];
};

export class DailyTaskRunner {
  constructor(tokenStore, delaySettings = null, pauseChecker = null, globalSettings = null) {
    this.tokenStore = tokenStore;
    this.delaySettings = delaySettings || {
      commandDelay: 500,
      taskDelay: 500
    };
    this.pauseChecker = pauseChecker;
    this.globalSettings = globalSettings;
    this.paused = false;
  }

  checkPause() {
    if (this.pauseChecker && this.pauseChecker()) {
      this.paused = true;
      return true;
    }
    return false;
  }

  throwPauseError() {
    const error = new Error("任务已暂停");
    error.isPause = true;
    throw error;
  }

  log(message, type = "info") {
    if (this.callbacks?.onLog) {
      this.callbacks.onLog({
        time: new Date().toLocaleTimeString(),
        message,
        type,
      });
    }
  }

  async executeGameCommand(
    tokenId,
    cmd,
    params = {},
    description = "",
    timeout = 8000,
  ) {
    try {
      if (this.checkPause()) {
        this.log(`检测到暂停时间，${description} - 中断`, "warning");
        this.throwPauseError();
      }
      
      if (description) this.log(`执行: ${description}`);
      const result = await this.tokenStore.sendMessageWithPromise(
        tokenId,
        cmd,
        params,
        timeout,
      );
      await new Promise((resolve) => setTimeout(resolve, this.delaySettings.commandDelay));
      if (description) this.log(`${description} - 成功`, "success");
      return result;
    } catch (error) {
      if (error.isPause) throw error;
      if (description) {
        const token = this.tokenStore.gameTokens.find((t) => t.id === tokenId);
        const tokenName = token?.name || tokenId;
        this.log(`[${tokenName}] ${description} - 失败: ${error.message}`, "error");
      }
      throw error;
    }
  }

  async switchToFormationIfNeeded(tokenId, targetFormation, formationName) {
    try {
      // 尝试从本地缓存获取当前阵容信息
      // 注意：这里直接读取 store 中的 gameData 可能不是最新的，如果是批量跑，建议每次都获取最新的
      // 或者我们假设 tokenStore.gameData 会随着 sendMessage 更新（如果 store 有处理逻辑）
      // 安全起见，这里先从服务器获取

      this.log(`检查${formationName}配置...`);
      const teamInfo = await this.executeGameCommand(
        tokenId,
        "presetteam_getinfo",
        {},
        "获取阵容信息",
      );

      if (!teamInfo || !teamInfo.presetTeamInfo) {
        this.log(`阵容信息异常: ${JSON.stringify(teamInfo)}`, "warning");
      }

      const currentFormation = teamInfo?.presetTeamInfo?.useTeamId;
      this.log(`当前阵容: ${currentFormation}`);

      if (currentFormation === targetFormation) {
        this.log(
          `当前已是${formationName}${targetFormation}，无需切换`,
          "success",
        );
        return false;
      }

      this.log(
        `当前阵容: ${currentFormation}, 目标阵容: ${targetFormation}，开始切换...`,
      );
      await this.executeGameCommand(
        tokenId,
        "presetteam_saveteam",
        { teamId: targetFormation },
        `切换到${formationName}${targetFormation}`,
      );

      this.log(`成功切换到${formationName}${targetFormation}`, "success");
      return true;
    } catch (error) {
      this.log(`阵容检查失败，尝试强制切换: ${error.message}`, "warning");
      try {
        await this.executeGameCommand(
          tokenId,
          "presetteam_saveteam",
          { teamId: targetFormation },
          `强制切换到${formationName}${targetFormation}`,
        );
        return true;
      } catch (fallbackError) {
        this.log(`强制切换也失败: ${fallbackError.message}`, "error");
        throw fallbackError;
      }
    }
  }

  loadSettings(roleId) {
    try {
      const raw = localStorage.getItem(`daily-settings:${roleId}`);
      const defaultSettings = {
        arenaFormation: 1,
        towerFormation: 1,
        bossFormation: 1,
        taskCompleteFormation: 1,
        bossTimes: 2,
        claimBottle: true,
        payRecruit: true,
        openBox: true,
        arenaEnable: true,
        claimHangUp: true,
        claimEmail: true,
        blackMarketPurchase: true,
      };
      return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
    } catch (error) {
      console.error("Failed to load settings:", error);
      return null;
    }
  }

  async run(tokenId, callbacks = {}, customSettings = null) {
    this.callbacks = callbacks;
    const settings = customSettings || this.loadSettings(tokenId); // 优先使用传入的设置
    
    // 如果有全局设置，使用全局的 genieSweep 设置
    if (this.globalSettings && this.globalSettings.genieSweep !== undefined) {
      settings.genieSweep = this.globalSettings.genieSweep;
    }

    // 获取角色信息以确认 roleId 和 任务状态
    this.log("正在获取角色信息...");
    let roleInfoResp;
    try {
      roleInfoResp = await this.tokenStore.sendGetRoleInfo(tokenId);
      this.log("角色信息获取成功", "success");
    } catch (error) {
      this.log(`获取角色信息失败: ${error.message}`, "error");
      throw error;
    }

    const roleData = roleInfoResp?.role;
    if (!roleData) {
      throw new Error("角色数据不存在");
    }

    // 重新加载设置，使用正确的 roleId (虽然通常 tokenId 就是 roleId 或者一一对应，但为了保险)
    // 在这个项目中，tokenId 似乎就是 roleId 或者用于标识
    // DailyTaskStatus.vue 中: const role = getCurrentRole() -> roleId: tokenStore.selectedToken.id
    // 所以 tokenId 就是 key

    this.log("开始执行每日任务补差");

    const completedTasks = roleData.dailyTask?.complete ?? {};
    const isTaskCompleted = (taskId) => completedTasks[taskId] === -1;
    const statistics = roleData.statistics ?? {};
    const statisticsTime = roleData.statisticsTime ?? {};

    const taskList = [];

    // 1. 基础任务
    if (!isTaskCompleted(2)) {
      taskList.push({
        name: "分享一次游戏",
        execute: () =>
          this.executeGameCommand(
            tokenId,
            "system_mysharecallback",
            { isSkipShareCard: true, type: 2 },
            "分享游戏",
          ),
      });
    }

    if (!isTaskCompleted(3)) {
      taskList.push({
        name: "赠送好友金币",
        execute: () =>
          this.executeGameCommand(tokenId, "friend_batch", {}, "赠送好友金币"),
      });
    }

    if (!isTaskCompleted(4)) {
      taskList.push({
        name: "免费招募",
        execute: async () => {
          // 再次检查任务状态，避免重复执行
          if (isTaskCompleted(4)) {
            this.log("招募任务已完成，跳过免费招募", "info");
            return;
          }
          await this.executeGameCommand(
            tokenId,
            "hero_recruit",
            { recruitType: 3, recruitNumber: 1 },
            "免费招募",
          );
        },
      });

      if (settings.payRecruit) {
        taskList.push({
          name: "付费招募",
          execute: async () => {
            // 再次检查任务状态，避免重复执行
            if (isTaskCompleted(4)) {
              this.log("招募任务已完成，跳过付费招募", "info");
              return;
            }
            await this.executeGameCommand(
              tokenId,
              "hero_recruit",
              { recruitType: 1, recruitNumber: 1 },
              "付费招募",
            );
          },
        });
      }
    }

    if (!isTaskCompleted(6) && isTodayAvailable(statisticsTime["buy:gold"])) {
      for (let i = 0; i < 3; i++) {
        taskList.push({
          name: `免费点金 ${i + 1}/3`,
          execute: () =>
            this.executeGameCommand(
              tokenId,
              "system_buygold",
              { buyNum: 1 },
              `免费点金 ${i + 1}`,
            ),
        });
      }
    }

    if (!isTaskCompleted(5) && settings.claimHangUp) {
      taskList.push({
        name: "领取挂机奖励",
        execute: () =>
          this.executeGameCommand(
            tokenId,
            "system_claimhangupreward",
            {},
            "领取挂机奖励",
          ),
      });
      for (let i = 0; i < 4; i++) {
        taskList.push({
          name: `挂机加钟 ${i + 1}/4`,
          execute: () =>
            this.executeGameCommand(
              tokenId,
              "system_mysharecallback",
              { isSkipShareCard: true, type: 2 },
              `挂机加钟 ${i + 1}`,
            ),
        });
      }
    }

    if (!isTaskCompleted(7) && settings.openBox) {
      taskList.push({
        name: "开启木质宝箱",
        execute: async () => {
          // 再次检查任务状态，避免重复执行
          if (isTaskCompleted(7)) {
            this.log("开启宝箱任务已完成，跳过", "info");
            return;
          }
          await this.executeGameCommand(
            tokenId,
            "item_openbox",
            { itemId: 2001, number: 10 },
            "开启木质宝箱10个",
          );
        },
      });
    }

    taskList.push({
      name: "停止盐罐计时",
      execute: () =>
        this.executeGameCommand(
          tokenId,
          "bottlehelper_stop",
          {},
          "停止盐罐计时",
        ),
    });
    taskList.push({
      name: "开始盐罐计时",
      execute: () =>
        this.executeGameCommand(
          tokenId,
          "bottlehelper_start",
          {},
          "开始盐罐计时",
        ),
    });

    if (!isTaskCompleted(14) && settings.claimBottle) {
      taskList.push({
        name: "领取盐罐奖励",
        execute: () =>
          this.executeGameCommand(
            tokenId,
            "bottlehelper_claim",
            {},
            "领取盐罐奖励",
          ),
      });
    }

    // 2. 竞技场
    if (!isTaskCompleted(13) && settings.arenaEnable) {
      // 使用本地变量跟踪已执行的竞技场次数，防止重复执行
      let localArenaCount = 0;
      
      taskList.push({
        name: "竞技场战斗",
        execute: async () => {
          this.log("开始竞技场战斗流程");
          const hour = new Date().getHours();
          if (hour < 6) {
            this.log("当前时间未到6点，跳过竞技场战斗", "warning");
            return;
          }
          if (hour > 22) {
            this.log("当前时间已过22点，跳过竞技场战斗", "warning");
            return;
          }

          await this.switchToFormationIfNeeded(
            tokenId,
            settings.arenaFormation,
            "竞技场阵容",
          );
          await this.executeGameCommand(
            tokenId,
            "arena_startarea",
            {},
            "开始竞技场",
          );

          for (let i = 1; i <= 3; i++) {
            // 再次检查本地计数，避免重复执行
            if (localArenaCount >= 3) {
              this.log("竞技场战斗次数已用完，跳过", "info");
              break;
            }
            
            this.log(`竞技场战斗 ${i}/3`);
            let targets;
            try {
              targets = await this.executeGameCommand(
                tokenId,
                "arena_getareatarget",
                {},
                `获取竞技场目标${i}`,
              );
            } catch (err) {
              this.log(
                `竞技场战斗${i} - 获取对手失败: ${err.message}`,
                "error",
              );
              break;
            }

            const targetId = pickArenaTargetId(targets);
            if (targetId) {
              await this.executeGameCommand(
                tokenId,
                "fight_startareaarena",
                { targetId },
                `竞技场战斗${i}`,
                10000,
              );
              // 更新本地计数
              localArenaCount++;
              this.log(`竞技场战斗已执行次数更新为: ${localArenaCount}次`, "info");
            } else {
              this.log(
                `竞技场战斗${i} - 未找到目标: ${JSON.stringify(targets)}`,
                "warning",
              );
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        },
      });
    }

    // 3. BOSS
    if (settings.bossTimes > 0) {
      let alreadyLegionBoss = statistics["legion:boss"] ?? 0;
      this.log(`军团BOSS统计: 已打${alreadyLegionBoss}次, 设置${settings.bossTimes}次`);
      if (isTodayAvailable(statisticsTime["legion:boss"])) {
        this.log(`军团BOSS统计时间已过期，重置为0`);
        alreadyLegionBoss = 0;
      }
      const remainingLegionBoss = Math.max(
        settings.bossTimes - alreadyLegionBoss,
        0,
      );
      this.log(`军团BOSS剩余次数: ${remainingLegionBoss}次`);

      if (remainingLegionBoss > 0) {
        taskList.push({
          name: "军团BOSS阵容检查",
          execute: () =>
            this.switchToFormationIfNeeded(
              tokenId,
              settings.bossFormation,
              "BOSS阵容",
            ),
        });
        // 使用本地变量跟踪已执行的军团BOSS次数
        let localLegionBossCount = alreadyLegionBoss;
        
        for (let i = 0; i < remainingLegionBoss; i++) {
          taskList.push({
            name: `军团BOSS ${i + 1}/${remainingLegionBoss}`,
            execute: async () => {
              // 再次检查剩余次数，使用本地变量避免重复执行
              const currentRemaining = Math.max(
                settings.bossTimes - localLegionBossCount,
                0,
              );
              if (currentRemaining <= 0) {
                this.log("军团BOSS次数已用完，跳过", "info");
                return;
              }
              await this.executeGameCommand(
                tokenId,
                "fight_startlegionboss",
                {},
                `军团BOSS ${i + 1}`,
                12000,
              );
              // 更新本地计数
              localLegionBossCount++;
              this.log(`军团BOSS已执行次数更新为: ${localLegionBossCount}次`, "info");
            },
          });
        }
      }
    }

    // 每日BOSS - 固定3次，不受bossTimes设置控制
    const todayBossId = getTodayBossId();
    taskList.push({
      name: "每日BOSS阵容检查",
      execute: () =>
        this.switchToFormationIfNeeded(
          tokenId,
          settings.bossFormation,
          "BOSS阵容",
        ),
    });
    for (let i = 0; i < 3; i++) {
      taskList.push({
        name: `每日BOSS ${i + 1}/3`,
        execute: () =>
          this.executeGameCommand(
            tokenId,
            "fight_startboss",
            { bossId: todayBossId },
            `每日BOSS ${i + 1}`,
            12000,
          ),
      });
    }

    // 4. 固定奖励 - 执行前实时检查是否可领取
    // 福利签到
    if (isTodayAvailable(statisticsTime["system:signinreward"])) {
      taskList.push({
        name: "福利签到",
        execute: async () => {
          // 执行前实时检查
          try {
            const roleRes = await this.tokenStore.sendMessageWithPromise(
              tokenId,
              "role_getroleinfo",
              {},
              5000,
            );
            const currentStatisticsTime = roleRes?.role?.statisticsTime || {};
            if (!isTodayAvailable(currentStatisticsTime["system:signinreward"])) {
              this.log("福利签到今天已完成，跳过", "info");
              return;
            }
          } catch (e) {
            this.log(`检查福利签到状态失败: ${e.message}，尝试直接执行`, "warning");
          }
          await this.executeGameCommand(tokenId, "system_signinreward", {}, "福利签到");
        },
      });
    }

    // 俱乐部签到
    if (isTodayAvailable(statisticsTime["legion:signin"])) {
      taskList.push({
        name: "俱乐部签到",
        execute: async () => {
          try {
            const roleRes = await this.tokenStore.sendMessageWithPromise(
              tokenId,
              "role_getroleinfo",
              {},
              5000,
            );
            const currentStatisticsTime = roleRes?.role?.statisticsTime || {};
            if (!isTodayAvailable(currentStatisticsTime["legion:signin"])) {
              this.log("俱乐部签到今天已完成，跳过", "info");
              return;
            }
          } catch (e) {
            this.log(`检查俱乐部签到状态失败: ${e.message}，尝试直接执行`, "warning");
          }
          await this.executeGameCommand(tokenId, "legion_signin", {}, "俱乐部签到");
        },
      });
    }

    // 领取每日礼包
    if (isTodayAvailable(statisticsTime["discount:claimreward:1"])) {
      taskList.push({
        name: "领取每日礼包",
        execute: async () => {
          try {
            const roleRes = await this.tokenStore.sendMessageWithPromise(
              tokenId,
              "role_getroleinfo",
              {},
              5000,
            );
            const currentStatisticsTime = roleRes?.role?.statisticsTime || {};
            if (!isTodayAvailable(currentStatisticsTime["discount:claimreward:1"])) {
              this.log("每日礼包今天已领取，跳过", "info");
              return;
            }
          } catch (e) {
            this.log(`检查每日礼包状态失败: ${e.message}，尝试直接执行`, "warning");
          }
          await this.executeGameCommand(tokenId, "discount_claimreward", { discountId: 1 }, "领取每日礼包");
        },
      });
    }

    // 领取每日免费奖励（珍宝阁）
    if (isTodayAvailable(statisticsTime["collection:claimfreereward"])) {
      taskList.push({
        name: "领取每日免费奖励",
        execute: async () => {
          try {
            const roleRes = await this.tokenStore.sendMessageWithPromise(
              tokenId,
              "role_getroleinfo",
              {},
              5000,
            );
            const currentStatisticsTime = roleRes?.role?.statisticsTime || {};
            if (!isTodayAvailable(currentStatisticsTime["collection:claimfreereward"])) {
              this.log("每日免费奖励今天已领取，跳过", "info");
              return;
            }
          } catch (e) {
            this.log(`检查每日免费奖励状态失败: ${e.message}，尝试直接执行`, "warning");
          }
          await this.executeGameCommand(tokenId, "collection_claimfreereward", {}, "领取每日免费奖励");
        },
      });
    }

    // 领取免费礼包（普通卡）- 直接执行，不检查
    if (isTodayAvailable(statisticsTime["card:claimreward:1"])) {
      taskList.push({
        name: "领取免费礼包",
        execute: () =>
          this.executeGameCommand(tokenId, "card_claimreward", { cardId: 1 }, "领取免费礼包"),
      });
    }

    // 领取周卡礼包（cardId: 4001）- 直接执行，让服务器端判断是否可领取
    taskList.push({
      name: "领取周卡礼包",
      execute: () =>
        this.executeGameCommand(tokenId, "card_claimreward", { cardId: 4001 }, "领取周卡礼包"),
    });

    // 领取月卡礼包（cardId: 4002）- 直接执行，让服务器端判断是否可领取
    taskList.push({
      name: "领取月卡礼包",
      execute: () =>
        this.executeGameCommand(tokenId, "card_claimreward", { cardId: 4002 }, "领取月卡礼包"),
    });

    // 领取永久卡礼包（cardId: 4003）- 直接执行，让服务器端判断是否可领取
    taskList.push({
      name: "领取永久卡礼包",
      execute: () =>
        this.executeGameCommand(tokenId, "card_claimreward", { cardId: 4003 }, "领取永久卡礼包"),
    });

    // 领取邮件奖励 - 直接执行，不检查是否有附件
    if (settings.claimEmail) {
      taskList.push({
        name: "领取邮件奖励",
        execute: () =>
          this.executeGameCommand(tokenId, "mail_claimallattachment", { category: 0 }, "领取邮件奖励"),
      });
    }

    // 领取珍宝阁免费礼包（额外的珍宝阁领取）
    taskList.push({
      name: "开始领取珍宝阁礼包",
      execute: () =>
        this.executeGameCommand(
          tokenId,
          "collection_goodslist",
          {},
          "开始领取珍宝阁礼包",
        ),
    });
    taskList.push({
      name: "领取珍宝阁免费礼包",
      execute: async () => {
        try {
          const roleRes = await this.tokenStore.sendMessageWithPromise(
            tokenId,
            "role_getroleinfo",
            {},
            5000,
          );
          const currentStatisticsTime = roleRes?.role?.statisticsTime || {};
          if (!isTodayAvailable(currentStatisticsTime["collection:claimfreereward"])) {
            this.log("珍宝阁免费礼包今天已领取，跳过", "info");
            return;
          }
        } catch (e) {
          this.log(`检查珍宝阁礼包状态失败: ${e.message}，尝试直接执行`, "warning");
        }
        await this.executeGameCommand(
          tokenId,
          "collection_claimfreereward",
          {},
          "领取珍宝阁免费礼包",
        );
      },
    });

    // 5. 免费活动
    if (isTodayAvailable(statistics["artifact:normal:lottery:time"])) {
      // 使用本地变量跟踪已执行的免费钓鱼次数，防止重复执行
      let localFishCount = 0;
      
      for (let i = 0; i < 3; i++) {
        taskList.push({
          name: `免费钓鱼 ${i + 1}/3`,
          execute: async () => {
            // 再次检查本地计数，避免重复执行
            if (localFishCount >= 3) {
              this.log("免费钓鱼次数已用完，跳过", "info");
              return;
            }
            await this.executeGameCommand(
              tokenId,
              "artifact_lottery",
              { lotteryNumber: 1, newFree: true, type: 1 },
              `免费钓鱼 ${i + 1}`,
            );
            // 更新本地计数
            localFishCount++;
            this.log(`免费钓鱼已执行次数更新为: ${localFishCount}次`, "info");
          },
        });
      }
    }

    // 灯神扫荡 - 每天一次免费扫荡
    const kingdoms = ["魏国", "蜀国", "吴国", "群雄"];
    // 使用本地Set跟踪已扫荡的国家，避免重复执行
    const sweptKingdoms = new Set();

    for (let gid = 1; gid <= 4; gid++) {
      if (isTodayAvailable(statisticsTime[`genie:daily:free:${gid}`])) {
        taskList.push({
          name: `${kingdoms[gid - 1]}灯神免费扫荡`,
          execute: async () => {
            // 再次检查本地状态，避免重复执行
            if (sweptKingdoms.has(gid)) {
              this.log(`${kingdoms[gid - 1]}灯神今天已扫荡，跳过`, "info");
              return;
            }

            // 执行前实时检查是否还有免费次数（防止手动扫荡后重复执行）
            try {
              const roleRes = await this.tokenStore.sendMessageWithPromise(
                tokenId,
                "role_getroleinfo",
                {},
                5000,
              );
              const currentStatisticsTime = roleRes?.role?.statisticsTime || {};

              // 如果今天已经扫荡过（没有免费次数了），则跳过
              if (!isTodayAvailable(currentStatisticsTime[`genie:daily:free:${gid}`])) {
                this.log(`${kingdoms[gid - 1]}灯神今天已扫荡过（无免费次数），跳过`, "info");
                sweptKingdoms.add(gid);
                return;
              }
            } catch (e) {
              this.log(`检查${kingdoms[gid - 1]}灯神免费次数失败: ${e.message}，尝试直接执行`, "warning");
            }

            await this.executeGameCommand(
              tokenId,
              "genie_sweep",
              { genieId: gid },
              `${kingdoms[gid - 1]}灯神免费扫荡`,
            );
            // 标记已扫荡
            sweptKingdoms.add(gid);
            this.log(`${kingdoms[gid - 1]}灯神扫荡完成，标记为已执行`, "info");
          },
        });
      }
    }

    // 使用本地变量跟踪已领取的免费扫荡卷次数，防止重复执行
    let localSweepTicketCount = 0;
    
    for (let i = 0; i < 3; i++) {
      taskList.push({
        name: `领取免费扫荡卷 ${i + 1}/3`,
        execute: async () => {
          // 再次检查本地计数，避免重复执行
          if (localSweepTicketCount >= 3) {
            this.log("免费扫荡卷领取次数已用完，跳过", "info");
            return;
          }
          await this.executeGameCommand(
            tokenId,
            "genie_buysweep",
            {},
            `领取免费扫荡卷 ${i + 1}`,
          );
          // 更新本地计数
          localSweepTicketCount++;
          this.log(`免费扫荡卷已领取次数更新为: ${localSweepTicketCount}次`, "info");
        },
      });
    }

    // 6. 黑市
    if (!isTaskCompleted(12) && settings.blackMarketPurchase) {
      taskList.push({
        name: "黑市购买1次物品",
        execute: async () => {
          // 再次检查任务状态，避免重复执行
          if (isTaskCompleted(12)) {
            this.log("黑市任务已完成，跳过", "info");
            return;
          }
          await this.executeGameCommand(
            tokenId,
            "store_purchase",
            { goodsId: 1 },
            "黑市购买1次物品",
          );
        },
      });
    }

    // 咸王梦境
    const mengyandayOfWeek = new Date().getDay();
    if (
      (mengyandayOfWeek === 0) |
      (mengyandayOfWeek === 1) |
      (mengyandayOfWeek === 3) |
      (mengyandayOfWeek === 4)
    ) {
      const mjbattleTeam = { 0: 107 };
      taskList.push({
        name: "咸王梦境",
        execute: () =>
          this.executeGameCommand(
            tokenId,
            "dungeon_selecthero",
            { battleTeam: mjbattleTeam },
            "咸王梦境",
          ),
      });
    }

    // 深海灯神 - 不受 genieSweep 开关控制，周六周日都执行，但会检查免费次数
    // 周六(6)和周日(0)都尝试执行，如果已经手动扫荡过则跳过
    if (
      (mengyandayOfWeek === 0 || mengyandayOfWeek === 6) &&
      isTodayAvailable(statisticsTime[`genie:daily:free:5`])
    ) {
      taskList.push({
        name: "深海灯神",
        execute: async () => {
          // 再次检查是否还有免费次数（防止手动扫荡后重复执行）
          try {
            const roleRes = await this.tokenStore.sendMessageWithPromise(
              tokenId,
              "role_getroleinfo",
              {},
              5000,
            );
            const statisticsTime = roleRes?.role?.statisticsTime || {};
            
            // 如果今天已经扫荡过（没有免费次数了），则跳过
            if (!isTodayAvailable(statisticsTime[`genie:daily:free:5`])) {
              this.log("深海灯神今天已扫荡过（无免费次数），跳过", "info");
              return;
            }
            
            await this.executeGameCommand(
              tokenId,
              "genie_sweep",
              { genieId: 5, sweepCnt: 1 },
              "深海灯神",
            );
          } catch (e) {
            // 如果检查失败，尝试直接执行
            this.log(`检查深海灯神免费次数失败: ${e.message}，尝试直接执行`, "warning");
            await this.executeGameCommand(
              tokenId,
              "genie_sweep",
              { genieId: 5, sweepCnt: 1 },
              "深海灯神",
            );
          }
        },
      });
    }

    // 阵容还原（使用任务完成后阵容配置）
    if (settings.taskCompleteFormation) {
      taskList.push({
        name: "阵容还原",
        execute: () =>
          this.switchToFormationIfNeeded(
            tokenId,
            settings.taskCompleteFormation,
            "任务完成后阵容",
          ),
      });
    }

    // 7. 任务奖励 - 改进版，确保正确领取活跃奖励
    
    // 先领取具体的每日任务奖励（每个任务的完成奖励）
    for (let taskId = 1; taskId <= 10; taskId++) {
      taskList.push({
        name: `领取任务奖励${taskId}`,
        execute: async () => {
          try {
            await this.executeGameCommand(
              tokenId,
              "task_claimdailypoint",
              { taskId },
              `领取任务奖励${taskId}`,
              5000,
            );
          } catch (e) {
            this.log(`领取任务奖励${taskId}失败: ${e.message}`, "warning");
            // 即使失败也继续执行其他任务
          }
        },
      });
    }

    // 再领取日常任务奖励（活跃点数）
    taskList.push({
      name: "领取日常任务奖励",
      execute: async () => {
        try {
          // 尝试多次领取，确保所有可领取的奖励都能领取
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await this.executeGameCommand(
                tokenId,
                "task_claimdailyreward",
                {},
                `领取日常任务奖励 (尝试 ${attempt}/3)`,
              );
              // 每次领取后等待一下，确保服务器数据更新
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (e) {
              this.log(`领取日常任务奖励失败 (尝试 ${attempt}/3): ${e.message}`, "warning");
              // 继续尝试，直到达到最大尝试次数
              if (attempt === 3) {
                throw e;
              }
            }
          }
        } catch (e) {
          this.log(`领取日常任务奖励最终失败: ${e.message}`, "error");
          // 即使失败也继续执行其他任务
        }
      },
    });

    // 再领取周常任务奖励
    taskList.push({
      name: "领取周常任务奖励",
      execute: async () => {
        try {
          // 尝试多次领取，确保所有可领取的奖励都能领取
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await this.executeGameCommand(
                tokenId,
                "task_claimweekreward",
                {},
                `领取周常任务奖励 (尝试 ${attempt}/3)`,
              );
              // 每次领取后等待一下，确保服务器数据更新
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (e) {
              this.log(`领取周常任务奖励失败 (尝试 ${attempt}/3): ${e.message}`, "warning");
              // 继续尝试，直到达到最大尝试次数
              if (attempt === 3) {
                throw e;
              }
            }
          }
        } catch (e) {
          this.log(`领取周常任务奖励最终失败: ${e.message}`, "error");
          // 即使失败也继续执行其他任务
        }
      },
    });

    // 领取通行证奖励
    taskList.push({
      name: "领取通行证奖励",
      execute: () =>
        this.executeGameCommand(
          tokenId,
          "activity_recyclewarorderrewardclaim",
          { actId: 1 },
          "领取通行证奖励",
        ),
    });

    // 执行
    const totalTasks = taskList.length;
    this.log(`共有 ${totalTasks} 个任务待执行`);
    const startTime = Date.now();

    for (let i = 0; i < taskList.length; i++) {
      const task = taskList[i];
      const taskStartTime = Date.now();
      try {
        if (this.checkPause()) {
          this.log(`检测到暂停时间，当前任务中断，剩余任务将在暂停结束后继续`, "warning");
          this.throwPauseError();
        }
        this.log(`开始执行: ${task.name}`);
        await task.execute();
        const taskEndTime = Date.now();
        const taskDuration = ((taskEndTime - taskStartTime) / 1000).toFixed(2);
        this.log(`任务完成: ${task.name} (耗时: ${taskDuration}秒)`, "success");
        const progress = Math.floor(((i + 1) / totalTasks) * 100);
        if (this.callbacks?.onProgress) this.callbacks.onProgress(progress);
        await new Promise((resolve) => setTimeout(resolve, this.delaySettings.taskDelay));
      } catch (error) {
        if (error.isPause) throw error;
        const taskEndTime = Date.now();
        const taskDuration = ((taskEndTime - taskStartTime) / 1000).toFixed(2);
        this.log(`任务执行失败: ${task.name} - ${error.message} (耗时: ${taskDuration}秒)`, "error");
      }
    }

    const endTime = Date.now();
    const totalDuration = ((endTime - startTime) / 1000).toFixed(2);
    if (this.callbacks?.onProgress) this.callbacks.onProgress(100);
    this.log(`所有任务执行完成，总耗时: ${totalDuration}秒`, "success");
  }
}
