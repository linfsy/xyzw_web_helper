<template>
  <div class="batch-daily-tasks">
    <div class="main-layout">
      <!-- Left Column -->
      <div class="left-column">
        <!-- Header -->
        <div
          class="page-header"
          style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
          "
        >
          <div style="display: flex; align-items: center; gap: 16px">
            <h2>批量日常任务</h2>
            <div
              style="
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 12px;
                background-color: #f8f9fa;
                border-radius: 8px;
                border: 1px solid #e9ecef;
              "
            >
              <div style="font-size: 14px; color: #495057">
                共 {{ scheduledTasks.length }} 个定时任务
              </div>
              <div
                v-if="shortestCountdownTask"
                style="font-size: 14px; font-weight: 500; color: #1677ff"
              >
                即将执行：{{ shortestCountdownTask.task.name }} ({{
                  shortestCountdownTask.countdown.formatted
                }})
              </div>
              <div v-else style="font-size: 14px; color: #6c757d">
                暂无定时任务
              </div>
              <div class="top-task-buttons">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <n-button type="primary" size="small" style="width: 100px;" @click="openTaskModal">
                    新增定时任务
                  </n-button>
                  <n-button size="small" style="width: 100px;" @click="showTasksModal = true">
                    查看定时任务
                  </n-button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <n-button size="small" style="width: 100px;" @click="exportConfig">
                    导出配置
                  </n-button>
                  <n-upload
                  :show-file-list="false"
                  accept=".json"
                  :custom-request="importConfig"
                  >
                  <n-button size="small" style="width: 100px;">导入配置</n-button>
                  </n-upload>
                </div>
              </div>
            </div>
          </div>
          <div
            style="
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 8px 12px;
              background-color: #f8f9fa;
              border-radius: 8px;
              border: 1px solid #e9ecef;
            "
          >
            <n-button
              type="primary"
              @click="startBatch"
              :disabled="isRunning || selectedTokens.length === 0"
              size="medium"
            >
              {{ isRunning ? "执行中..." : "开始执行" }}
            </n-button>
            <n-button
              @click="stopBatch"
              :disabled="!isRunning"
              type="error"
              size="medium"
            >
              停止
            </n-button>
            <n-button
              @click="openTemplateManagerModal"
              type="info"
              size="medium"
            >
              任务模板
            </n-button>
            <n-button @click="openBatchSettings" type="default" size="medium">
              <template #icon>
                <n-icon>
                  <Settings />
                </n-icon>
              </template>
              设置
            </n-button>
          </div>
        </div>

        <!-- Token Selection -->
        <n-card title="账号列表" class="token-list-card">
          <div style="margin-bottom: 16px">
            <!-- 分组管理和选择 -->
            <n-space vertical style="width: 100%">
              <!-- 分组选择部分 -->
              <div
                v-if="tokenGroups.length > 0"
                class="group-selection-section"
              >
                <div
                  style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                  "
                >
                  <label style="font-weight: 500; color: #333">分组选择</label>
                  <n-button
                    size="small"
                    type="error"
                    text
                    @click="clearAllGroupSelection"
                  >
                    一键清除所有分组选择
                  </n-button>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap">
                  <div
                    v-for="group in tokenGroups"
                    :key="group.id"
                    @click="toggleGroupSelection(group.id)"
                    :style="{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: isGroupSelected(group.id)
                        ? group.color
                        : 'transparent',
                      border: `2px solid ${group.color}`,
                      color: isGroupSelected(group.id) ? 'white' : group.color,
                      fontWeight: isGroupSelected(group.id) ? '600' : '400',
                      transition: 'all 0.3s ease',
                      userSelect: 'none',
                    }"
                  >
                    {{ group.name }} ({{
                      getValidGroupTokenIds(group.id).length
                    }})
                  </div>
                </div>
              </div>

              <!-- 分组管理按钮 -->
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <n-button
                  type="info"
                  size="small"
                  @click="showGroupManageModal = true"
                >
                  管理分组
                </n-button>
                <span
                  v-if="selectedGroups.length > 0"
                  style="font-size: 12px; color: #86909c"
                >
                  已选择 {{ selectedGroups.length }} 个分组，包含
                  {{ selectedTokens.length }} 个账号
                </span>
              </div>
            </n-space>
          </div>

          <!-- 折叠控制按钮 -->
          <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <n-button
              size="small"
              secondary
              @click="toggleButtons"
            >
              {{ isButtonsExpanded ? '收起功能按钮' : '展开功能按钮' }}
            </n-button>
          </div>

          <transition name="slide-fade" mode="out-in">
            <div v-if="isButtonsExpanded">
              <n-tabs type="line" animated size="small" pane-style="padding-top: 12px;" default-value="daily">
                <n-tab-pane name="daily" tab="日常">
                  <n-space style="margin-bottom: 8px;">
                    <n-button size="small" @click="wrappedClaimHangUpRewards" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">领取挂机</n-button>
                    <n-button size="small" @click="wrappedBatchAddHangUpTime" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键加钟</n-button>
                    <n-button size="small" @click="wrappedResetBottles" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">重置罐子</n-button>
                    <n-button size="small" @click="wrappedBatchlingguanzi" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键领取罐子</n-button>
                    <n-button size="small" @click="wrappedBatchStudy" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键答题</n-button>
                    <n-button size="small" @click="wrappedBatchclubsign" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键俱乐部签到</n-button>
                    <n-button size="small" @click="wrappedBatcharenafight" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0 || !isarenaActivityOpen">一键竞技场战斗3次</n-button>
                    <n-button size="small" @click="wrappedBatchSmartSendCar" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0 || !isCarActivityOpen">智能发车</n-button>
                    <n-button size="small" @click="wrappedBatchClaimCars" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0 || !isCarActivityOpen">一键收车</n-button>
                    <n-button size="small" @click="wrappedStore_purchase" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键黑市采购</n-button>
                    <n-button size="small" @click="wrappedCollection_claimfreereward" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">免费领取珍宝阁</n-button>
                    <n-button size="small" @click="batchGenieSweep" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键灯神扫荡</n-button>
                  </n-space>
                </n-tab-pane>
                <n-tab-pane name="dungeon" tab="副本">
                  <n-space style="margin-bottom: 8px;">
                    <n-button size="small" @click="wrappedClimbTower" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键爬塔</n-button>
                    <n-button size="small" @click="wrappedBatchmengjing" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0 || !ismengjingActivityOpen">一键梦境</n-button>
                    <n-button size="small" @click="wrappedSkinChallenge" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键换皮闯关</n-button>
                    <n-button size="small" @click="batchClaimPeachTasks" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键领取蟠桃园任务</n-button>
                    <n-button size="small" @click="wrappedBatchDreamBuy" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0 || !ismengjingActivityOpen">梦境购买</n-button>
                  </n-space>
                </n-tab-pane>
                <n-tab-pane name="baoku" tab="宝库">
                  <n-space style="margin-bottom: 8px;">
                    <n-button size="small" @click="wrappedBatchbaoku13" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0 || !isbaokuActivityOpen">一键宝库前3层</n-button>
                    <n-button size="small" @click="wrappedBatchbaoku45" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0 || !isbaokuActivityOpen">一键宝库4,5层</n-button>
                  </n-space>
                </n-tab-pane>
                <n-tab-pane name="weirdTower" tab="怪异塔">
                  <n-space style="margin-bottom: 8px;">
                    <n-button size="small" @click="wrappedClimbWeirdTower" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0 || !isWeirdTowerActivityOpen">一键爬怪异塔</n-button>
                    <n-button size="small" @click="wrappedBatchUseItems" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0 || !isWeirdTowerActivityOpen">一键使用怪异塔道具</n-button>
                    <n-button size="small" @click="wrappedBatchMergeItems" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0 || !isWeirdTowerActivityOpen">一键合成怪异塔道具</n-button>
                    <n-button size="small" @click="wrappedBatchClaimFreeEnergy" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0 || !isWeirdTowerActivityOpen">一键领取怪异塔免费道具</n-button>
                  </n-space>
                </n-tab-pane>
                <n-tab-pane name="resource" tab="资源">
                  <n-space style="margin-bottom: 8px;">
                    <n-button size="small" @click="wrappedBatchOpenBox" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">批量开箱</n-button>
                    <n-button size="small" @click="openHelperModal('pointsBox')" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">按积分开箱</n-button>
                    <n-button size="small" @click="wrappedBatchClaimBoxPointReward" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">领取宝箱积分</n-button>
                    <n-button size="small" @click="wrappedBatchFish" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">批量钓鱼</n-button>
                    <n-button size="small" @click="wrappedBatchRecruit" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">批量招募</n-button>
                    <n-button size="small" @click="wrappedBatchHeroUpgrade" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键英雄升星</n-button>
                    <n-button size="small" @click="wrappedBatchBookUpgrade" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键图鉴升星</n-button>
                    <n-button size="small" @click="wrappedBatchClaimStarRewards" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键领取图鉴奖励</n-button>
                    <n-button size="small" @click="wrappedLegion_storebuygoods" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键购买四圣碎片</n-button>
                    <n-button size="small" @click="wrappedLegionStoreBuySkinCoins" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键购买俱乐部5皮肤币</n-button>
                    <n-tooltip trigger="hover" v-if="!isBlackMarketWeek">
                      <template #trigger>
                        <n-button size="small" :disabled="true">黑市周购买助手({{ blackMarketCountdown }})</n-button>
                      </template>
                      <span>黑市周{{ blackMarketCountdown }}</span>
                    </n-tooltip>
                    <n-button v-else size="small" @click="showBlackMarketBuyerModal = true" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0 || !isBlackMarketWeek || !isBlackMarketUpdated">黑市周购买助手({{ blackMarketCountdown }})</n-button>
                  </n-space>
                </n-tab-pane>
                <n-tab-pane name="legacy" tab="功法">
                  <n-space style="margin-bottom: 8px;">
                    <n-button size="small" @click="wrappedBatchLegacyClaim" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">批量功法残卷领取</n-button>
                    <n-button size="small" @click="showLegacyGiftModal = true" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">批量功法残卷赠送</n-button>
                  </n-space>
                </n-tab-pane>
                <n-tab-pane name="monthly" tab="月度">
                  <n-space style="margin-bottom: 8px;">
                    <n-button size="small" @click="wrappedBatchTopUpFish" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键钓鱼补齐</n-button>
                    <n-button size="small" @click="wrappedBatchTopUpArena" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0 || !isarenaActivityOpen">一键竞技场补齐</n-button>
                    <n-button size="small" @click="openWarGuessModal" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0 || !isWarGuessActivityOpen" :title="isWarGuessActivityOpen ? '' : warGuessActivityTip">月赛助威</n-button>
                  </n-space>
                </n-tab-pane>
              </n-tabs>
            </div>
          </transition>

          <!-- 排序按钮组 -->
          <div class="sort-buttons" style="margin-bottom: 12px">
            <n-space align="center">
              <n-button-group size="small">
                <n-button
                  @click="toggleSort('name')"
                  :type="sortConfig.field === 'name' ? 'primary' : 'default'"
                >
                  名称 {{ getSortIcon("name") }}
                </n-button>
                <n-button
                  @click="toggleSort('server')"
                  :type="sortConfig.field === 'server' ? 'primary' : 'default'"
                >
                  服务器 {{ getSortIcon("server") }}
                </n-button>
                <n-button
                  @click="toggleSort('createdAt')"
                  :type="
                    sortConfig.field === 'createdAt' ? 'primary' : 'default'
                  "
                >
                  创建时间 {{ getSortIcon("createdAt") }}
                </n-button>
                <n-button
                  @click="toggleSort('lastUsed')"
                  :type="
                    sortConfig.field === 'lastUsed' ? 'primary' : 'default'
                  "
                >
                  最后使用 {{ getSortIcon("lastUsed") }}
                </n-button>
              </n-button-group>
            </n-space>
          </div>
          
          <!-- 账号列表折叠控制 -->
          <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <n-button
              size="small"
              secondary
              @click="toggleTokens"
            >
              {{ isTokensExpanded ? '收起账号列表' : '展开账号列表' }}
            </n-button>
            <div v-if="isTokensExpanded" style="font-size: 14px; color: #6c757d;">
              共 {{ sortedTokens.length }} 个账号
            </div>
          </div>
          
          <transition name="slide-fade" mode="out-in">
            <div v-if="isTokensExpanded">
              <n-space vertical>
            <n-checkbox
              :checked="isAllSelected"
              :indeterminate="isIndeterminate"
              @update:checked="handleSelectAll"
            >
              全选
            </n-checkbox>
            <n-checkbox-group v-model:value="selectedTokens">
              <n-grid
                :x-gap="12"
                :y-gap="8"
                :cols="batchSettings.tokenListColumns"
              >
                <n-grid-item v-for="token in sortedTokens" :key="token.id">
                  <div class="token-row">
                    <n-checkbox
                      :value="token.id"
                      :label="token.name"
                      style="flex: 1"
                    >
                      <div class="token-item">
                        <span>{{ token.name }}</span>
                        <n-tag
                          size="small"
                          :type="getStatusType(token.id)"
                          style="margin-left: 8px"
                        >
                          {{ getStatusText(token.id) }}
                        </n-tag>
                        <!-- 显示token所属的分组 -->
                        <div
                          v-if="tokenStore.getTokenGroups(token.id).length > 0"
                          style="
                            margin-left: 8px;
                            display: inline-flex;
                            gap: 4px;
                            flex-wrap: wrap;
                          "
                        >
                          <n-tag
                            v-for="group in tokenStore.getTokenGroups(token.id)"
                            :key="group.id"
                            size="small"
                            :color="{ color: group.color, textColor: 'white' }"
                            style="font-size: 11px"
                          >
                            {{ group.name }}
                          </n-tag>
                        </div>
                      </div>
                    </n-checkbox>
                    <n-button
                      size="tiny"
                      circle
                      @click.stop="openSettings(token)"
                    >
                      <template #icon>
                        <n-icon>
                          <Settings />
                        </n-icon>
                      </template>
                    </n-button>
                  </div>
                </n-grid-item>
              </n-grid>
            </n-checkbox-group>
              </n-space>
            </div>
          </transition>
        </n-card>

        <!-- 批量功能列表 -->
        <n-card title="批量功能列表" style="margin-top: 16px">
          <n-tabs type="line" animated>
            <n-tab-pane name="daily" tab="日常">
              <n-space>
                <n-button
                  size="small"
                  @click="wrappedClaimHangUpRewards"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  领取挂机
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedBatchAddHangUpTime"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键加钟
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedResetBottles"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  重置罐子
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedBatchlingguanzi"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键领取罐子
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedBatchclubsign"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键俱乐部签到
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedBatchStudy"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键答题
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedBatcharenafight"
                  :disabled="
                    batchTaskStore.isRunning || selectedTokens.length === 0 || !isarenaActivityOpen
                  "
                >
                  一键竞技场战斗3次
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedBatchSmartSendCar"
                  :disabled="
                    batchTaskStore.isRunning || selectedTokens.length === 0 || !isCarActivityOpen
                  "
                >
                  智能发车
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedBatchClaimCars"
                  :disabled="
                    batchTaskStore.isRunning || selectedTokens.length === 0 || !isCarActivityOpen
                  "
                >
                  一键收车
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedStore_purchase"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键黑市采购
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedCollection_claimfreereward"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键领取珍宝阁
                </n-button>
                <n-button
                  size="small"
                  @click="batchGenieSweep"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键灯神扫荡
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="dungeon" tab="副本">
              <n-space>
                <n-button
                  size="small"
                  @click="wrappedClimbTower"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键爬塔
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedBatchmengjing"
                  :disabled="
                    batchTaskStore.isRunning ||
                    selectedTokens.length === 0 ||
                    !ismengjingActivityOpen
                  "
                >
                  一键梦境
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedSkinChallenge"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键换皮闯关
                </n-button>
                <n-button
                  size="small"
                  @click="batchClaimPeachTasks"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键领取蟠桃园任务
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedBatchDreamBuy"
                  :disabled="
                    batchTaskStore.isRunning ||
                    selectedTokens.length === 0 ||
                    !ismengjingActivityOpen
                  "
                >
                  梦境购买
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="baoku" tab="宝库">
              <n-space>
                <n-button
                  size="small"
                  @click="wrappedBatchbaoku13"
                  :disabled="
                    batchTaskStore.isRunning || selectedTokens.length === 0 || !isbaokuActivityOpen
                  "
                >
                  一键宝库前3层
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedBatchbaoku45"
                  :disabled="
                    batchTaskStore.isRunning || selectedTokens.length === 0 || !isbaokuActivityOpen
                  "
                >
                  一键宝库4,5层
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="weirdTower" tab="怪异塔">
              <n-space>
                <n-button
                  size="small"
                  @click="wrappedClimbWeirdTower"
                  :disabled="
                    batchTaskStore.isRunning ||
                    selectedTokens.length === 0 ||
                    !isWeirdTowerActivityOpen
                  "
                >
                  一键爬怪异塔
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedBatchUseItems"
                  :disabled="
                    batchTaskStore.isRunning ||
                    selectedTokens.length === 0 ||
                    !isWeirdTowerActivityOpen
                  "
                >
                  一键使用怪异塔道具
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedBatchMergeItems"
                  :disabled="
                    batchTaskStore.isRunning ||
                    selectedTokens.length === 0 ||
                    !isWeirdTowerActivityOpen
                  "
                >
                  一键怪异塔合成
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedBatchClaimFreeEnergy"
                  :disabled="
                    batchTaskStore.isRunning ||
                    selectedTokens.length === 0 ||
                    !isWeirdTowerActivityOpen
                  "
                >
                  一键领取怪异塔免费道具
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="resource" tab="资源">
              <n-space>
                <n-button
                  size="small"
                  @click="openHelperModal('box')"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  批量开箱
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedBatchClaimBoxPointReward"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  领取宝箱积分
                </n-button>
                <n-button
                  size="small"
                  @click="openHelperModal('fish')"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  批量钓鱼
                </n-button>
                <n-button
                  size="small"
                  @click="openHelperModal('recruit')"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  批量招募
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedLegion_storebuygoods"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键购买四圣碎片
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedLegionStoreBuySkinCoins"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键购买俱乐部5皮肤币
                </n-button>
                <n-tooltip trigger="hover" v-if="!isBlackMarketWeek">
                  <template #trigger>
                    <n-button size="small" :disabled="true">黑市周购买助手({{ blackMarketCountdown }})</n-button>
                  </template>
                  <span>黑市周{{ blackMarketCountdown }}</span>
                </n-tooltip>
                <n-button
                  v-else
                  size="small"
                  @click="showBlackMarketBuyerModal = true"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0 || !isBlackMarketWeek || !isBlackMarketUpdated"
                >
                  黑市周购买助手({{ blackMarketCountdown }})
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedBatchHeroUpgrade"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键英雄升星
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedBatchBookUpgrade"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键图鉴升星
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedBatchClaimStarRewards"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键领取图鉴奖励
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="legacy" tab="功法">
              <n-space>
                <n-button
                  size="small"
                  @click="wrappedBatchLegacyClaim"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  批量功法残卷领取
                </n-button>
                <n-button
                  size="small"
                  @click="showLegacyGiftModal = true"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  批量功法残卷赠送
                </n-button>
              </n-space>
            </n-tab-pane>
            <n-tab-pane name="monthly" tab="月度">
              <n-space>
                <n-button
                  size="small"
                  @click="wrappedBatchTopUpFish"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键钓鱼补齐
                </n-button>
                <n-button
                  size="small"
                  @click="wrappedBatchTopUpArena"
                  :disabled="
                    batchTaskStore.isRunning || selectedTokens.length === 0 || !isarenaActivityOpen
                  "
                >
                  一键竞技场补齐
                </n-button>
                <n-button
                  size="small"
                  @click="openWarGuessModal"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0 || !isarenaActivityOpen"
                  :title="isWarGuessActivityOpen ? '' : warGuessActivityTip"
                >
                  月赛助威
                </n-button>
              </n-space>
            </n-tab-pane>
          </n-tabs>
        </n-card>

        <!-- 定时任务 -->
        <n-card
          v-if="!batchSettings.hideScheduledTasksModule"
          title="定时任务"
          class="scheduled-tasks-card"
          style="margin-top: 16px"
        >
          <n-space style="margin-bottom: 12px">
            <n-button type="primary" size="small" @click="openTaskModal">
              新增定时任务
            </n-button>
            <n-button size="small" @click="showTasksModal = true">
              查看定时任务
            </n-button>
            <n-button size="small" @click="exportConfig">
              导出配置
            </n-button>
            <n-upload
              :show-file-list="false"
              accept=".json"
              :custom-request="importConfig"
            >
              <n-button size="small">导入配置</n-button>
            </n-upload>
          </n-space>

          <!-- 任务预告区域 -->
          <div
            class="task-preview"
            style="
              margin: 16px 0;
              padding: 16px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              background-color: #fafafa;
            "
          >
            <!-- 状态提示框 -->
            <div
              v-if="isPauseTime.paused"
              style="
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 12px;
                background-color: #fff3cd;
                border-radius: 6px;
                border: 1px solid #ffc107;
                margin-bottom: 12px;
              "
            >
              <span style="font-size: 14px; color: #856404; font-weight: 500">
                {{ isPauseTime.reason }} - 暂停中
              </span>
              <span style="font-size: 14px; color: #dc3545; font-weight: bold">
                {{ pauseCountdown }}后恢复
              </span>
            </div>
            <div
              v-else
              style="
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 12px;
                background-color: #d4edda;
                border-radius: 6px;
                border: 1px solid #28a745;
                margin-bottom: 12px;
              "
            >
              <span style="font-size: 14px; color: #155724; font-weight: 500">
                当前为正常时间，任务可正常执行
              </span>
            </div>
            
            <h4 style="margin: 0 0 12px 0; color: #333">即将执行的任务</h4>
            
            <!-- 积攒的任务队列（有积攒任务时显示） -->
            <div
              v-if="(batchTaskStore.taskQueue || []).length > 0"
              style="
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 12px;
                background-color: #e3f2fd;
                border-radius: 6px;
                border: 1px solid #2196f3;
                margin-bottom: 12px;
              "
            >
              <div style="font-weight: bold; color: #1976d2; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span>积攒任务队列 ({{ (batchTaskStore.taskQueue || []).length }} 个任务)</span>
                <n-button
                  size="tiny"
                  type="error"
                  @click="clearTaskQueue"
                >
                  清空队列
                </n-button>
              </div>
              <div
                v-for="(task, index) in batchTaskStore.taskQueue" 
                :key="index"
                style="
                  padding: 8px;
                  background-color: white;
                  border-radius: 4px;
                  border-left: 4px solid #1976f2;
                "
              >
                <div style="font-weight: 500">{{ task.name || task.taskName }}</div>
                <div style="font-size: 12px; color: #666">
                  账号数量: {{ (task.selectedTokens || task.tokenIds || []).length }}
                </div>
              </div>
            </div>
            
            <!-- 显示最短倒计时任务（无论是否暂停时间都显示） -->
            <div
              v-if="shortestCountdownTask"
              style="
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 12px;
                background-color: white;
                border-radius: 6px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
              "
            >
              <div
                style="font-size: 16px; font-weight: bold; margin-bottom: 8px"
              >
                {{ shortestCountdownTask.task.name }}
              </div>
              <div
                style="font-size: 24px; font-weight: bold; color: #1677ff"
                :style="{
                  color: shortestCountdownTask.countdown.isNearExecution
                    ? '#ff4d4f'
                    : '#1677ff',
                }"
              >
                {{ shortestCountdownTask.countdown.formatted }}
              </div>
            </div>
            
            <!-- 无任务时显示 -->
            <div
              v-if="!shortestCountdownTask && (!isPauseTime.paused || (batchTaskStore.taskQueue || []).length === 0)"
              style="
                text-align: center;
                padding: 24px;
                color: #6b7280;
                font-style: italic;
              "
            >
              暂无定时任务
            </div>
          </div>

          <!-- 简单的任务统计 -->
          <div class="tasks-count" v-if="scheduledTasks.length > 0">
            <p>已保存 {{ scheduledTasks.length }} 个定时任务</p>
          </div>
          <div class="tasks-count" v-else>
            <p>暂无定时任务</p>
          </div>
        </n-card>

      </div>

      <!-- Right Column - Execution Log -->
      <div class="right-column">
        <n-card class="log-card">
          <template #header>
            <div class="custom-card-header">
              <div class="card-title">
                {{
                  currentRunningTokenName
                    ? `正在执行: ${currentRunningTokenName}`
                    : "执行日志"
                }}
                <span
                  style="margin-left: 12px; font-size: 12px; color: #86909c"
                >
                  {{ logs.length }}/{{ batchSettings.maxLogEntries || 1000 }}
                </span>
              </div>
              <div class="log-header-controls">
                <n-checkbox v-model:checked="autoScrollLog" size="small">
                  自动滚动
                </n-checkbox>
                <n-checkbox v-model:checked="filterErrorsOnly" size="small">
                  只看错误
                </n-checkbox>
                <n-tag v-if="errorCount > 0" type="error" size="small">
                  {{ errorCount }} 个错误
                </n-tag>
                <n-button size="small" @click="clearLogs"> 清空日志 </n-button>
                <n-button size="small" @click="copyLogs"> 复制日志 </n-button>
              </div>
            </div>
          </template>
          <n-progress
            type="line"
            :percentage="currentProgress"
            :indicator-placement="'inside'"
            processing
          />
          <div class="log-container" ref="logContainer">
            <div
              v-for="(log, index) in filteredLogs"
              :key="index"
              class="log-item"
              :class="log.type"
            >
              <span class="time">{{ log.time }}</span>
              <span class="message">{{ log.message }}</span>
            </div>
          </div>
        </n-card>
      </div>
    </div>

    <!-- Settings Modal -->
    <n-modal
      v-model:show="showSettingsModal"
      preset="card"
      :title="`任务设置 - ${currentSettingsTokenName}`"
      style="width: 90%; max-width: 400px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">竞技场阵容</label>
            <n-select
              v-model:value="currentSettings.arenaFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">爬塔阵容</label>
            <n-select
              v-model:value="currentSettings.towerFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">怪异塔阵容</label>
            <n-select
              v-model:value="currentSettings.weirdTowerFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">BOSS阵容</label>
            <n-select
              v-model:value="currentSettings.bossFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">任务完成后阵容</label>
            <n-select
              v-model:value="currentSettings.taskCompleteFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">BOSS次数</label>
            <n-select
              v-model:value="currentSettings.bossTimes"
              :options="bossTimesOptions"
              size="small"
            />
          </div>
          <div class="setting-switches">
            <div class="switch-row">
              <span class="switch-label">领罐子</span
              ><n-switch v-model:value="currentSettings.claimBottle" />
            </div>
            <div class="switch-row">
              <span class="switch-label">领挂机</span
              ><n-switch v-model:value="currentSettings.claimHangUp" />
            </div>
            <div class="switch-row">
              <span class="switch-label">竞技场</span
              ><n-switch v-model:value="currentSettings.arenaEnable" />
            </div>
            <div class="switch-row">
              <span class="switch-label">开宝箱</span
              ><n-switch v-model:value="currentSettings.openBox" />
            </div>
            <div class="switch-row">
              <span class="switch-label">领取邮件奖励</span
              ><n-switch v-model:value="currentSettings.claimEmail" />
            </div>
            <div class="switch-row">
              <span class="switch-label">黑市购买物品</span
              ><n-switch v-model:value="currentSettings.blackMarketPurchase" />
            </div>
            <div class="switch-row">
              <span class="switch-label">付费招募</span
              ><n-switch v-model:value="currentSettings.payRecruit" />
            </div>
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button type="primary" @click="saveSettings">保存设置</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Task Template Modal -->
    <n-modal
      v-model:show="showTaskTemplateModal"
      preset="card"
      :title="currentTemplateId ? '编辑任务模板' : '任务模板设置'"
      style="width: 90%; max-width: 400px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">模板名称</label>
            <n-input
              v-model:value="currentTemplateName"
              placeholder="请输入模板名称"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">竞技场阵容</label>
            <n-select
              v-model:value="currentTemplate.arenaFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">爬塔阵容</label>
            <n-select
              v-model:value="currentTemplate.towerFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">怪异塔阵容</label>
            <n-select
              v-model:value="currentTemplate.weirdTowerFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">BOSS阵容</label>
            <n-select
              v-model:value="currentTemplate.bossFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">任务完成后阵容</label>
            <n-select
              v-model:value="currentTemplate.taskCompleteFormation"
              :options="formationOptions"
              size="small"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">BOSS次数</label>
            <n-select
              v-model:value="currentTemplate.bossTimes"
              :options="bossTimesOptions"
              size="small"
            />
          </div>
          <div class="setting-switches">
            <div class="switch-row">
              <span class="switch-label">领罐子</span
              ><n-switch v-model:value="currentTemplate.claimBottle" />
            </div>
            <div class="switch-row">
              <span class="switch-label">领挂机</span
              ><n-switch v-model:value="currentTemplate.claimHangUp" />
            </div>
            <div class="switch-row">
              <span class="switch-label">竞技场</span
              ><n-switch v-model:value="currentTemplate.arenaEnable" />
            </div>
            <div class="switch-row">
              <span class="switch-label">开宝箱</span
              ><n-switch v-model:value="currentTemplate.openBox" />
            </div>
            <div class="switch-row">
              <span class="switch-label">领取邮件奖励</span
              ><n-switch v-model:value="currentTemplate.claimEmail" />
            </div>
            <div class="switch-row">
              <span class="switch-label">黑市购买物品</span
              ><n-switch v-model:value="currentTemplate.blackMarketPurchase" />
            </div>
            <div class="switch-row">
              <span class="switch-label">付费招募</span
              ><n-switch v-model:value="currentTemplate.payRecruit" />
            </div>
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button
            @click="showTaskTemplateModal = false"
            style="margin-right: 12px"
            >取消</n-button
          >
          <n-button @click="saveTaskTemplate" type="primary">保存模板</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Apply Template Modal -->
    <n-modal
      v-model:show="showApplyTemplateModal"
      preset="card"
      title="应用任务模板"
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">选择模板</label>
            <n-select
              v-model:value="selectedTemplateId"
              :options="taskTemplates"
              label-field="name"
              value-field="id"
              placeholder="请选择要应用的模板"
              size="small"
              style="width: 100%"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">选择账号</label>

            <!-- 分组快速选择 -->
            <div
              style="
                margin-bottom: 12px;
                border-bottom: 1px solid #eee;
                padding-bottom: 8px;
              "
            >
              <div style="font-size: 12px; color: #86909c; margin-bottom: 8px">
                快速选择分组：
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap">
                <n-button
                  v-for="group in tokenGroups"
                  :key="group.id"
                  size="small"
                  @click="
                    () => {
                      const groupTokenIds = getValidGroupTokenIds(group.id);
                      groupTokenIds.forEach((id) => {
                        if (!selectedTokensForApply.includes(id)) {
                          selectedTokensForApply.push(id);
                        }
                      });
                    }
                  "
                  :style="{
                    borderColor: group.color,
                    color: group.color,
                  }"
                  ghost
                >
                  {{ group.name }}
                </n-button>
                <div
                  v-if="tokenGroups.length === 0"
                  style="font-size: 12px; color: #ccc"
                >
                  暂无分组
                </div>
              </div>
            </div>

            <n-checkbox
              :checked="isAllSelectedForApply"
              :indeterminate="isIndeterminateForApply"
              @update:checked="handleSelectAllForApply"
            >
              全选
            </n-checkbox>
            <n-checkbox-group
              v-model:value="selectedTokensForApply"
              style="margin-top: 8px"
            >
              <n-grid :cols="2" :x-gap="12" :y-gap="8">
                <n-grid-item v-for="token in sortedTokens" :key="token.id">
                  <n-checkbox :value="token.id">{{ token.name }}</n-checkbox>
                </n-grid-item>
              </n-grid>
            </n-checkbox-group>
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showApplyTemplateModal = false">取消</n-button>
          <n-button
            @click="applyTemplate"
            type="success"
            :disabled="
              !selectedTemplateId || selectedTokensForApply.length === 0
            "
            >应用模板</n-button
          >
        </div>
      </div>
    </n-modal>

    <!-- Template Manager Modal -->
    <n-modal
      v-model:show="showTemplateManagerModal"
      preset="card"
      title="任务模板管理"
      style="width: 90%; max-width: 800px"
    >
      <div class="settings-content">
        <div
          class="modal-header-actions"
          style="
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          "
        >
          <div>
            <n-button type="primary" @click="openNewTemplateModal"
              >新增模板</n-button
            >
            <n-button
              @click="openApplyTemplateModal"
              type="success"
              style="margin-left: 8px"
              >应用模板</n-button
            >
            <n-button
              @click="openAccountTemplateModal"
              type="info"
              style="margin-left: 8px"
              >查看账号模板引用</n-button
            >
          </div>
          <n-input placeholder="搜索模板" size="small" style="width: 200px" />
        </div>

        <!-- Template List -->
        <div
          class="template-list"
          style="max-height: 400px; overflow-y: auto; margin-bottom: 16px"
        >
          <n-card
            v-for="template in filteredTaskTemplates"
            :key="template.id"
            size="small"
            style="margin-bottom: 12px"
          >
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: center;
              "
            >
              <div>
                <h4 style="margin: 0; margin-bottom: 8px">
                  {{ template.name }}
                </h4>
                <div style="font-size: 12px; color: #86909c">
                  创建时间: {{ new Date(template.createdAt).toLocaleString() }}
                  <span v-if="template.updatedAt"
                    >, 更新时间:
                    {{ new Date(template.updatedAt).toLocaleString() }}</span
                  >
                </div>
              </div>
              <div style="display: flex; gap: 8px">
                <n-button size="small" @click="openEditTemplateModal(template)"
                  >编辑</n-button
                >
                <n-button
                  size="small"
                  type="error"
                  @click="deleteTaskTemplate(template.id)"
                  >删除</n-button
                >
              </div>
            </div>
          </n-card>
          <div
            v-if="filteredTaskTemplates.length === 0"
            style="text-align: center; padding: 24px; color: #86909c"
          >
            暂无模板
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showTemplateManagerModal = false">关闭</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Account Template References Modal -->
    <n-modal
      v-model:show="showAccountTemplateModal"
      preset="card"
      title="账号模板引用查看"
      style="width: 90%; max-width: 800px"
    >
      <div class="settings-content">
        <div
          class="modal-header-actions"
          style="
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          "
        >
          <div>
            <span>共 {{ filteredAccountTemplates.length }} 个账号</span>
          </div>
          <div style="display: flex; gap: 8px; align-items: center">
            <label style="font-size: 12px; color: #86909c">按模板筛选:</label>
            <n-select
              v-model:value="selectedTemplateForFilter"
              :options="taskTemplates"
              label-field="name"
              value-field="id"
              placeholder="全部模板"
              size="small"
              @update:value="filterAccountTemplates"
              style="width: 180px"
            />
          </div>
        </div>

        <!-- Account Template List -->
        <div
          class="account-template-list"
          style="max-height: 400px; overflow-y: auto; margin-bottom: 16px"
        >
          <n-card
            v-for="item in filteredAccountTemplates"
            :key="item.tokenId"
            size="small"
            style="margin-bottom: 12px"
          >
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: center;
              "
            >
              <div>
                <h4 style="margin: 0; margin-bottom: 4px">
                  {{ item.tokenName }}
                </h4>
              </div>
              <div>
                <n-tag
                  :type="item.templateId ? 'success' : 'default'"
                  size="small"
                >
                  {{ item.templateName }}
                </n-tag>
              </div>
            </div>
          </n-card>
          <div
            v-if="filteredAccountTemplates.length === 0"
            style="text-align: center; padding: 24px; color: #86909c"
          >
            暂无账号数据
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showAccountTemplateModal = false">关闭</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Legacy Gift Modal -->
    <n-modal
      v-model:show="showLegacyGiftModal"
      preset="card"
      title="批量功法残卷赠送"
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <!-- 接收者ID输入 -->
          <div class="setting-item">
            <label class="setting-label">接收者ID</label>
            <n-space>
              <n-input-number
                v-model:value="recipientIdInput"
                placeholder="ID"
                :show-button="false"
                @update:value="clearRecipientError"
                style="width: 180px"
              />
              <n-input
                v-model:value="securityPassword"
                placeholder="请输入安全密码"
                type="password"
                @input="clearRecipientError"
                style="width: 180px"
              />
              <n-button
                type="primary"
                @click="queryRecipientInfo"
                :disabled="
                  !recipientIdInput || isQueryingRecipient || !securityPassword
                "
              >
                查询
              </n-button>
            </n-space>
            <n-text
              v-if="recipientIdError"
              type="error"
              style="margin-top: 5px; display: block"
            >
              {{ recipientIdError }}
            </n-text>
          </div>

          <!-- 接收者信息展示 -->
          <div class="setting-item" v-if="recipientInfo">
            <label class="setting-label">接收者信息</label>
            <div
              class="recipient-info"
              style="
                background: #f7f8fa;
                padding: 16px;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
                display: flex;
                align-items: flex-start;
                gap: 16px;
                transition: all 0.3s ease;
              "
            >
              <!-- 头像部分 -->
              <div
                class="avatar-container"
                style="
                  position: relative;
                  width: 80px;
                  height: 80px;
                  border-radius: 50%;
                  overflow: hidden;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  transition: all 0.3s ease;
                "
              >
                <img
                  v-if="recipientInfo.avatarUrl && !avatarLoadError"
                  :src="recipientInfo.avatarUrl"
                  alt="角色头像"
                  style="
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: all 0.3s ease;
                  "
                  @error="handleAvatarError"
                  @load="handleAvatarLoad"
                />
                <!-- 头像加载失败或未设置时的 fallback -->
                <div
                  v-else
                  class="avatar-fallback"
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    color: white;
                    font-size: 24px;
                    font-weight: bold;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                  "
                >
                  {{ (recipientInfo.name || "未知角色")[0] || "?" }}
                </div>
                <!-- 加载指示器 -->
                <div
                  v-if="isAvatarLoading"
                  class="avatar-loading"
                  style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                  "
                >
                  <div
                    class="loading-spinner"
                    style="
                      width: 30px;
                      height: 30px;
                      border: 3px solid rgba(255, 255, 255, 0.3);
                      border-top: 3px solid white;
                      border-radius: 50%;
                      animation: spin 1s linear infinite;
                    "
                  ></div>
                </div>
              </div>

              <!-- 角色信息部分 -->
              <div class="role-info" style="flex: 1; min-width: 0">
                <div
                  style="
                    margin-bottom: 12px;
                    font-size: 18px;
                    font-weight: bold;
                    color: #1d2129;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                  "
                >
                  {{ recipientInfo.name || "未知角色" }}
                </div>
                <div
                  class="role-info-grid"
                  style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                  "
                >
                  <div class="info-item">
                    <div
                      class="info-label"
                      style="
                        font-size: 12px;
                        color: #86909c;
                        margin-bottom: 2px;
                      "
                    >
                      角色ID
                    </div>
                    <div
                      class="info-value"
                      style="font-size: 14px; font-weight: 500; color: #1d2129"
                    >
                      {{ recipientInfo.roleId }}
                    </div>
                  </div>
                  <div class="info-item">
                    <div
                      class="info-label"
                      style="
                        font-size: 12px;
                        color: #86909c;
                        margin-bottom: 2px;
                      "
                    >
                      服务器
                    </div>
                    <div
                      class="info-value"
                      style="font-size: 14px; font-weight: 500; color: #1d2129"
                    >
                      {{ recipientInfo.serverName }}
                    </div>
                  </div>
                  <div class="info-item">
                    <div
                      class="info-label"
                      style="
                        font-size: 12px;
                        color: #86909c;
                        margin-bottom: 2px;
                      "
                    >
                      战力
                    </div>
                    <div
                      class="info-value"
                      style="font-size: 16px; font-weight: 600; color: #667eea"
                    >
                      {{ recipientInfo.power }} {{ recipientInfo.powerUnit }}
                    </div>
                  </div>
                  <div class="info-item">
                    <div
                      class="info-label"
                      style="
                        font-size: 12px;
                        color: #86909c;
                        margin-bottom: 2px;
                      "
                    >
                      军团
                    </div>
                    <div
                      class="info-value"
                      style="font-size: 14px; font-weight: 500; color: #1d2129"
                    >
                      {{ recipientInfo.legionName || "无" }}
                    </div>
                  </div>
                  <div class="info-item" style="grid-column: 1 / -1">
                    <div
                      class="info-label"
                      style="
                        font-size: 12px;
                        color: #86909c;
                        margin-bottom: 2px;
                      "
                    >
                      军团ID
                    </div>
                    <div
                      class="info-value"
                      style="font-size: 14px; font-weight: 500; color: #1d2129"
                    >
                      {{ recipientInfo.legionId || "无" }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 赠送数量 -->
          <div class="setting-item">
            <label class="setting-label">赠送数量</label>
            <n-input-number
              v-model:value="giftQuantity"
              :min="1"
              :max="1000"
              :step="1"
              placeholder="请输入赠送数量"
            />
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button
            @click="showLegacyGiftModal = false"
            style="margin-right: 12px"
            >取消</n-button
          >
          <n-button
            type="primary"
            @click="confirmLegacyGift"
            :disabled="!recipientIdInput || !recipientInfo"
          >
            开始赠送
          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- Helper Modal (开箱/钓鱼/招募/按积分开箱) -->
    <n-modal
      v-model:show="showHelperModal"
      preset="card"
      :title="helperModalTitle"
      style="width: 90%; max-width: 400px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <div class="setting-item" v-if="helperType === 'box'">
            <label class="setting-label">宝箱类型</label>
            <n-select
              v-model:value="helperSettings.boxType"
              :options="boxTypeOptions"
              size="small"
            />
          </div>
          <div class="setting-item" v-if="helperType === 'fish'">
            <label class="setting-label">鱼竿类型</label>
            <n-select
              v-model:value="helperSettings.fishType"
              :options="fishTypeOptions"
              size="small"
            />
          </div>
          <div class="setting-item" v-if="helperType === 'pointsBox'">
            <label class="setting-label">目标积分</label>
            <n-input-number
              v-model:value="helperSettings.targetPoints"
              :min="1"
              :max="1000000"
              :step="100"
              size="small"
              style="width: 100%"
            />
          </div>
          <n-alert
            v-if="helperType === 'pointsBox'"
            type="info"
            style="margin-bottom: 12px"
          >
            开箱优先级: 木质宝箱(保留200个) → 青铜宝箱 → 黄金宝箱 → 铂金宝箱<br />
            积分: 木质=1分, 青铜=10分, 黄金=20分, 铂金=50分
          </n-alert>
          <div class="setting-item" v-if="helperType !== 'pointsBox'">
            <label class="setting-label">消耗数量（10的倍数）</label>
            <n-input-number
              v-model:value="helperSettings.count"
              :min="10"
              :max="10000"
              :step="10"
              size="small"
            />
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showHelperModal = false" style="margin-right: 12px"
            >取消</n-button
          >
          <n-button type="primary" @click="executeHelper">开始执行</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Dream Buy Modal -->
    <n-modal
      v-model:show="showDreamBuyModal"
      preset="card"
      title="梦境商品购买配置"
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <n-alert type="info" show-icon style="margin-bottom: 12px">
            请勾选需要购买的商品。只会购买列表中存在的商品。
          </n-alert>

          <div style="display: flex; gap: 12px; margin-bottom: 12px">
            <n-button size="small" type="warning" @click="selectGoldItems">
              一键勾选金币商品
            </n-button>
            <n-button size="small" @click="selectAllItems"> 全选所有 </n-button>
            <n-button size="small" @click="clearAllItems"> 清空选择 </n-button>
          </div>

          <div
            v-for="(merchant, id) in merchantConfig"
            :key="id"
            style="margin-bottom: 16px"
          >
            <div style="font-weight: bold; margin-bottom: 8px">
              {{ merchant.name }}
            </div>
            <n-grid :cols="3" :x-gap="12" :y-gap="8">
              <n-grid-item v-for="(item, index) in merchant.items" :key="index">
                <n-checkbox
                  :value="`${id}-${index}`"
                  :checked="dreamBuyList.includes(`${id}-${index}`)"
                  @update:checked="
                    (checked) => toggleDreamItem(`${id}-${index}`, checked)
                  "
                >
                  {{ item }}
                </n-checkbox>
              </n-grid-item>
            </n-grid>
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button
            @click="showDreamBuyModal = false"
            style="margin-right: 12px"
            >取消</n-button
          >
          <n-button type="primary" @click="saveDreamBuyConfig"
            >保存配置</n-button
          >
        </div>
      </div>
    </n-modal>

    <!-- Tasks List Modal -->
    <n-modal
      v-model:show="showTasksModal"
      preset="card"
      title="定时任务列表"
      style="width: 90%; max-width: 800px"
    >
      <div class="tasks-list" style="max-height: 600px; overflow-y: auto">
        <div
          v-for="task in scheduledTasks"
          :key="task.id"
          class="task-item"
          style="
            margin-bottom: 16px;
            padding: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
          "
        >
          <div
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
            "
          >
            <div style="font-weight: bold">{{ task.name }}</div>
            <n-switch
              v-model:value="task.enabled"
              @update:value="toggleTaskEnabled(task.id, $event)"
            >
            </n-switch>
          </div>
          <div style="margin-bottom: 4px">
            <span style="color: #6b7280">运行类型：</span>
            <span>{{
              task.runType === "daily" ? "每天固定时间" : "Cron表达式"
            }}</span>
          </div>
          <div style="margin-bottom: 4px">
            <span style="color: #6b7280">运行时间：</span>
            <span>{{
              task.runType === "daily" ? task.runTime : task.cronExpression
            }}</span>
          </div>
          <div style="margin-bottom: 4px">
            <span style="color: #6b7280">下次执行：</span>
            <span
              :style="{
                fontWeight: 'bold',
                color: taskCountdowns[task.id]?.isNearExecution
                  ? '#ff4d4f'
                  : '#1677ff',
              }"
            >
              {{
                task.enabled
                  ? taskCountdowns[task.id]?.formatted || "计算中..."
                  : "已禁用"
              }}
            </span>
          </div>
          <div style="margin-bottom: 4px">
            <span style="color: #6b7280">选中账号：</span>
            <span>{{ task.selectedTokens.length }} 个</span>
          </div>
          <div style="margin-bottom: 8px">
            <span style="color: #6b7280">选中任务：</span>
            <span>{{ task.selectedTasks.length }} 个</span>
          </div>
          <div style="display: flex; gap: 8px">
            <n-button size="tiny" @click="editTask(task)"> 编辑 </n-button>
            <n-button size="tiny" type="error" @click="deleteTask(task.id)">
              删除
            </n-button>
            <n-button
              size="tiny"
              type="info"
              secondary
              :loading="executingTaskIds.includes(task.id)"
              @click="manualExecuteTask(task)"
            >
              立即执行
            </n-button>
          </div>
        </div>
        <div
          v-if="scheduledTasks.length === 0"
          style="text-align: center; padding: 24px; color: #6b7280"
        >
          暂无定时任务
        </div>
      </div>
    </n-modal>

    <!-- Task Modal -->
    <n-modal
      v-model:show="showTaskModal"
      preset="card"
      :title="editingTask ? '编辑定时任务' : '新增定时任务'"
      style="width: 90%; max-width: 600px"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">任务名称</label>
            <n-input
              v-model:value="taskForm.name"
              placeholder="请输入任务名称"
            />
          </div>
          <div class="setting-item">
            <label class="setting-label">运行类型</label>
            <n-radio-group
              v-model:value="taskForm.runType"
              @update:value="resetRunType"
            >
              <n-radio value="daily">每天固定时间</n-radio>
              <n-radio value="cron">Cron表达式</n-radio>
            </n-radio-group>
          </div>
          <div class="setting-item" v-if="taskForm.runType === 'daily'">
            <label class="setting-label">运行时间</label>
            <n-time-picker v-model:value="taskForm.runTime" format="HH:mm" />
          </div>
          <div class="setting-item" v-if="taskForm.runType === 'cron'">
            <label class="setting-label">Cron表达式</label>
            <n-input
              v-model:value="taskForm.cronExpression"
              placeholder="请输入Cron表达式"
              @input="parseCronExpression"
            />

            <!-- Cron表达式解析结果 -->
            <div class="cron-parser" v-if="taskForm.cronExpression">
              <div v-if="cronValidation.valid" class="cron-validation success">
                <n-text type="success">✓ {{ cronValidation.message }}</n-text>
              </div>
              <div v-else class="cron-validation error">
                <n-text type="error">✗ {{ cronValidation.message }}</n-text>
              </div>

              <!-- 未来执行时间 -->
              <div
                v-if="cronValidation.valid && cronNextRuns.length > 0"
                class="cron-next-runs"
              >
                <h4>未来5次执行时间：</h4>
                <ul>
                  <li v-for="(run, index) in cronNextRuns" :key="index">
                    {{ run }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div class="setting-item">
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
              "
            >
              <label class="setting-label">选择账号</label>
              <n-space size="small">
                <n-button size="small" @click="selectAllTokens">
                  全选
                </n-button>
                <n-button size="small" @click="deselectAllTokens">
                  全不选
                </n-button>
              </n-space>
            </div>

            <!-- 分组快速选择 (仅在定时任务中显示) -->
            <div style="margin-bottom: 12px">
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 8px;
                "
              >
                <div style="font-size: 12px; color: #86909c">
                  快速选择分组：
                </div>
                <n-button
                  type="primary"
                  size="tiny"
                  text
                  @click="showGroupManageModal = true"
                >
                  管理分组
                </n-button>
              </div>
              <div
                v-if="tokenGroups.length === 0"
                style="font-size: 12px; color: #ccc"
              >
                暂无分组
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap">
                <n-button
                  v-for="group in tokenGroups"
                  :key="group.id"
                  size="small"
                  :type="
                    taskScheduleSelectedGroupIds.includes(group.id)
                      ? 'primary'
                      : 'default'
                  "
                  @click="
                    () => {
                      const index = taskScheduleSelectedGroupIds.indexOf(
                        group.id,
                      );
                      const groupTokenIds = getValidGroupTokenIds(group.id);

                      if (index > -1) {
                        // 取消选择该分组
                        taskScheduleSelectedGroupIds.splice(index, 1);
                        taskForm.selectedTokens =
                          taskForm.selectedTokens.filter(
                            (id) => !groupTokenIds.includes(id),
                          );
                      } else {
                        // 选择该分组
                        taskScheduleSelectedGroupIds.push(group.id);
                        groupTokenIds.forEach((id) => {
                          if (!taskForm.selectedTokens.includes(id)) {
                            taskForm.selectedTokens.push(id);
                          }
                        });
                      }
                    }
                  "
                  :style="{
                    borderColor: group.color,
                  }"
                >
                  {{ group.name }}
                </n-button>
              </div>
            </div>

            <n-checkbox-group v-model:value="taskForm.selectedTokens">
              <n-grid :cols="2" :x-gap="12" :y-gap="8">
                <n-grid-item v-for="token in sortedTokens" :key="token.id">
                  <n-checkbox :value="token.id">{{ token.name }}</n-checkbox>
                </n-grid-item>
              </n-grid>
            </n-checkbox-group>
          </div>
          <div class="setting-item">
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
              "
            >
              <label class="setting-label">选择任务</label>
              <n-space size="small">
                <n-button size="small" @click="selectAllTasks"> 全选 </n-button>
                <n-button size="small" @click="deselectAllTasks">
                  全不选
                </n-button>
              </n-space>
            </div>

            <n-checkbox-group v-model:value="taskForm.selectedTasks">
              <n-tabs
                type="line"
                animated
                size="small"
                pane-style="padding-top: 12px;"
                default-value="daily"
              >
                <n-tab-pane
                  v-for="group in taskGroupDefinitions"
                  :key="group.name"
                  :name="group.name"
                  :tab="group.label"
                >
                  <n-grid :cols="2" :x-gap="12" :y-gap="8">
                    <n-grid-item
                      v-for="task in groupedAvailableTasks[group.name]"
                      :key="task.value"
                    >
                      <n-checkbox :value="task.value">{{
                        task.label
                      }}</n-checkbox>
                    </n-grid-item>
                  </n-grid>
                </n-tab-pane>

                <n-tab-pane
                  v-if="
                    groupedAvailableTasks['other'] &&
                    groupedAvailableTasks['other'].length > 0
                  "
                  name="other"
                  tab="其他"
                >
                  <n-grid :cols="2" :x-gap="12" :y-gap="8">
                    <n-grid-item
                      v-for="task in groupedAvailableTasks['other']"
                      :key="task.value"
                    >
                      <n-checkbox :value="task.value">{{
                        task.label
                      }}</n-checkbox>
                    </n-grid-item>
                  </n-grid>
                </n-tab-pane>
              </n-tabs>
            </n-checkbox-group>
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showTaskModal = false" style="margin-right: 12px"
            >取消</n-button
          >
          <n-button type="primary" @click="saveTask">保存</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Batch Settings Modal -->
    <n-modal
      v-model:show="showBatchSettingsModal"
      preset="card"
      title="任务设置"
      style="width: 90%; max-width: 700px"
    >
      <div class="settings-content">
        <n-grid :cols="1" :x-gap="24">
          <!-- 单列布局：批量操作设置 -->
          <n-grid-item>
            <n-divider title-placement="left" style="margin: 1px 0 8px 0"
              >批量操作设置</n-divider
            >
            <div class="settings-grid">
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">开箱数量(10倍)</label>
                <n-input-number
                  v-model:value="batchSettings.boxCount"
                  :min="10"
                  :max="10000"
                  :step="10"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">钓鱼数量(10倍)</label>
                <n-input-number
                  v-model:value="batchSettings.fishCount"
                  :min="10"
                  :max="10000"
                  :step="10"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">招募数量(10倍)</label>
                <n-input-number
                  v-model:value="batchSettings.recruitCount"
                  :min="10"
                  :max="10000"
                  :step="10"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">默认宝箱类型</label>
                <n-select
                  v-model:value="batchSettings.defaultBoxType"
                  :options="boxTypeOptions"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">默认鱼竿类型</label>
                <n-select
                  v-model:value="batchSettings.defaultFishType"
                  :options="fishTypeOptions"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">按积分开箱目标</label>
                <n-input-number
                  v-model:value="batchSettings.targetBoxPoints"
                  :min="1"
                  :max="1000000"
                  :step="100"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">梦境商品购买配置</label>
                <n-button size="small" @click="openDreamBuyModal"
                  >点击配置</n-button
                >
              </div>
            </div>
            <n-divider title-placement="left" style="margin: 12px 0 8px 0"
              >智能发车条件设置(0为不限制)</n-divider
            >
            <div class="settings-grid">
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">保底车辆颜色</label>
                <n-select
                  v-model:value="batchSettings.carMinColor"
                  :options="[
                    { label: '绿·普通', value: 1 },
                    { label: '蓝·稀有', value: 2 },
                    { label: '紫·史诗', value: 3 },
                    { label: '橙·传说', value: 4 },
                    { label: '红·神话', value: 5 },
                    { label: '金·传奇', value: 6 },
                  ]"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">车辆强制刷新保底</label>
                <n-switch
                  v-model:value="batchSettings.useGoldRefreshFallback"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">启用最大刷新次数限制</label>
                <n-switch
                  v-model:value="batchSettings.enableMaxCarRefresh"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">最大刷新次数(0=无限制刷新)</label>
                <n-input-number
                  v-model:value="batchSettings.maxCarRefreshCount"
                  :min="0"
                  :max="15"
                  :step="1"
                  :disabled="!batchSettings.enableMaxCarRefresh"
                  size="small"
                  style="width: 100px"
                />
              </div>
            </div>
            <div
              class="settings-grid"
              v-if="batchSettings.useGoldRefreshFallback"
              style="margin-top: 12px"
            >
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">需同时满足所有条件</label>
                <n-switch
                  v-model:value="batchSettings.smartDepartureMatchAll"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">金砖 >=</label>
                <n-input-number
                  v-model:value="batchSettings.smartDepartureGoldThreshold"
                  :min="0"
                  :step="100"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">招募令 >=</label>
                <n-input-number
                  v-model:value="batchSettings.smartDepartureRecruitThreshold"
                  :min="0"
                  :step="10"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">白玉 >=</label>
                <n-input-number
                  v-model:value="batchSettings.smartDepartureJadeThreshold"
                  :min="0"
                  :step="100"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">刷新卷 >=</label>
                <n-input-number
                  v-model:value="batchSettings.smartDepartureTicketThreshold"
                  :min="0"
                  :step="1"
                  size="small"
                  style="width: 100px"
                />
              </div>
            </div>
            <n-divider title-placement="left" style="margin: 12px 0 8px 0"
              >功法赠送设置</n-divider
            >
            <div class="settings-grid">
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">接收者ID</label>
                <n-input-number
                  v-model:value="batchSettings.receiverId"
                  placeholder="ID"
                  size="small"
                  style="width: 100px"
                  :show-button="false"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">密码</label>
                <n-input
                  v-model:value="batchSettings.password"
                  type="password"
                  placeholder="密码"
                  size="small"
                  style="width: 100px"
                />
              </div>
            </div>
            <n-divider title-placement="left" style="margin: 12px 0 8px 0"
              >界面设置</n-divider
            >
            <div class="settings-grid">
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">隐藏定时任务模块</label>
                <n-switch v-model:value="batchSettings.hideScheduledTasksModule" />
              </div>
            </div>
          </n-grid-item>
          <!-- 右列：延迟与连接设置 -->
          <n-grid-item>
            <n-divider title-placement="left" style="margin: 1px 0 8px 0"
              >延迟设置(ms)</n-divider
            >
            <div class="settings-grid">
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">命令延迟</label>
                <n-input-number
                  v-model:value="batchSettings.commandDelay"
                  :min="100"
                  :max="2000"
                  :step="100"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">任务间延迟</label>
                <n-input-number
                  v-model:value="batchSettings.taskDelay"
                  :min="100"
                  :max="2000"
                  :step="100"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">操作延迟</label>
                <n-input-number
                  v-model:value="batchSettings.actionDelay"
                  :min="100"
                  :max="2000"
                  :step="100"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">战斗延迟</label>
                <n-input-number
                  v-model:value="batchSettings.battleDelay"
                  :min="100"
                  :max="2000"
                  :step="100"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">刷新延迟</label>
                <n-input-number
                  v-model:value="batchSettings.refreshDelay"
                  :min="500"
                  :max="3000"
                  :step="100"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">长延迟</label>
                <n-input-number
                  v-model:value="batchSettings.longDelay"
                  :min="1000"
                  :max="10000"
                  :step="500"
                  size="small"
                  style="width: 100px"
                />
              </div>
            </div>
            <n-divider title-placement="left" style="margin: 12px 0 8px 0"
              >连接设置</n-divider
            >
            <div class="settings-grid">
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">最大并发数</label>
                <n-input-number
                  v-model:value="batchSettings.maxActive"
                  :min="1"
                  :max="20"
                  :step="1"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">连接超时(ms)</label>
                <n-input-number
                  v-model:value="batchSettings.connectionTimeout"
                  :min="1000"
                  :max="30000"
                  :step="1000"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">重连等待(ms)</label>
                <n-input-number
                  v-model:value="batchSettings.reconnectDelay"
                  :min="100"
                  :max="5000"
                  :step="100"
                  size="small"
                  style="width: 100px"
                />
              </div>
            </div>
            <n-divider title-placement="left" style="margin: 12px 0 8px 0"
              >系统设置</n-divider
            >
            <div class="settings-grid">
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">列表每行数量</label>
                <n-input-number
                  v-model:value="batchSettings.tokenListColumns"
                  :min="1"
                  :max="10"
                  :step="1"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">最大日志条目</label>
                <n-input-number
                  v-model:value="batchSettings.maxLogEntries"
                  :min="100"
                  :max="5000"
                  :step="100"
                  size="small"
                  style="width: 100px"
                />
              </div>
            </div>
            <n-divider title-placement="left" style="margin: 12px 0 8px 0"
              >暂停时间设置</n-divider
            >
            <div class="settings-grid">
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">启用活动暂停功能</label>
                <n-switch v-model:value="batchSettings.enablePauseTime" />
              </div>
            </div>
            <n-collapse style="margin-top: 10px">
              <n-collapse-item name="pauseTimeSettings" title="暂停时间设置">
                <div class="settings-grid">
                  <div
                    class="setting-item"
                    style="
                      flex-direction: row;
                      justify-content: space-between;
                      align-items: center;
                    "
                  >
                    <label class="setting-label">启用抢符时间暂停</label>
                    <n-switch v-model:value="batchSettings.enableRobFuTime" />
                  </div>
                  <div
                    class="setting-subgroup"
                    style="margin-left: 20px; margin-bottom: 10px"
                  >
                    <div
                      class="setting-item"
                      style="
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                      "
                    >
                      <label class="setting-label" style="font-size: 13px">活动名称</label>
                      <n-input
                        v-model:value="batchSettings.robFuTimeName"
                        size="small"
                        style="width: 150px"
                        placeholder="活动名称"
                      />
                    </div>
                    <div
                      class="setting-item"
                      style="
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                      "
                    >
                      <label class="setting-label" style="font-size: 13px">开始时间</label>
                      <n-input
                        v-model:value="batchSettings.robFuStartTime"
                        size="small"
                        style="width: 100px"
                        placeholder="HH:MM"
                      />
                    </div>
                    <div
                      class="setting-item"
                      style="
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                      "
                    >
                      <label class="setting-label" style="font-size: 13px">结束时间</label>
                      <n-input
                        v-model:value="batchSettings.robFuEndTime"
                        size="small"
                        style="width: 100px"
                        placeholder="HH:MM"
                      />
                    </div>
                    <div
                      class="setting-item"
                      style="
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                      "
                    >
                      <label class="setting-label" style="font-size: 13px">执行频率</label>
                      <n-select
                        v-model:value="batchSettings.robFuTimeFrequency"
                        size="small"
                        style="width: 100px"
                        :options="[
                          { label: '每天', value: 'daily' },
                          { label: '特定星期', value: 'weekly' },
                        ]"
                      />
                    </div>
                    <div
                      class="setting-item"
                      style="
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                      "
                      v-if="batchSettings.robFuTimeFrequency === 'weekly'"
                    >
                      <label class="setting-label" style="font-size: 13px">星期几</label>
                      <n-select
                        v-model:value="batchSettings.robFuTimeDayOfWeek"
                        size="small"
                        style="width: 100px"
                        :options="[
                          { label: '周一', value: 1 },
                          { label: '周二', value: 2 },
                          { label: '周三', value: 3 },
                          { label: '周四', value: 4 },
                          { label: '周五', value: 5 },
                          { label: '周六', value: 6 },
                          { label: '周日', value: 0 },
                        ]"
                      />
                    </div>
                  </div>
                  <div
                    class="setting-item"
                    style="
                      flex-direction: row;
                      justify-content: space-between;
                      align-items: center;
                    "
                  >
                    <label class="setting-label">启用周六盐场时间暂停</label>
                    <n-switch v-model:value="batchSettings.enableSaltFieldTime" />
                  </div>
                  <div
                    class="setting-subgroup"
                    style="margin-left: 20px; margin-bottom: 10px"
                  >
                    <div
                      class="setting-item"
                      style="
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                      "
                    >
                      <label class="setting-label" style="font-size: 13px">活动名称</label>
                      <n-input
                        v-model:value="batchSettings.saltFieldName"
                        size="small"
                        style="width: 150px"
                        placeholder="活动名称"
                      />
                    </div>
                    <div
                      class="setting-item"
                      style="
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                      "
                    >
                      <label class="setting-label" style="font-size: 13px">开始时间</label>
                      <n-input
                        v-model:value="batchSettings.saltFieldStartTime"
                        size="small"
                        style="width: 100px"
                        placeholder="HH:MM"
                      />
                    </div>
                    <div
                      class="setting-item"
                      style="
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                      "
                    >
                      <label class="setting-label" style="font-size: 13px">结束时间</label>
                      <n-input
                        v-model:value="batchSettings.saltFieldEndTime"
                        size="small"
                        style="width: 100px"
                        placeholder="HH:MM"
                      />
                    </div>
                    <div
                      class="setting-item"
                      style="
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                      "
                    >
                      <label class="setting-label" style="font-size: 13px">执行频率</label>
                      <n-select
                        v-model:value="batchSettings.saltFieldFrequency"
                        size="small"
                        style="width: 100px"
                        :options="[
                          { label: '每天', value: 'daily' },
                          { label: '特定星期', value: 'weekly' },
                        ]"
                      />
                    </div>
                    <div
                      class="setting-item"
                      style="
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                      "
                      v-if="batchSettings.saltFieldFrequency === 'weekly'"
                    >
                      <label class="setting-label" style="font-size: 13px">星期几</label>
                      <n-select
                        v-model:value="batchSettings.saltFieldDayOfWeek"
                        size="small"
                        style="width: 100px"
                        :options="[
                          { label: '周一', value: 1 },
                          { label: '周二', value: 2 },
                          { label: '周三', value: 3 },
                          { label: '周四', value: 4 },
                          { label: '周五', value: 5 },
                          { label: '周六', value: 6 },
                          { label: '周日', value: 0 },
                        ]"
                      />
                    </div>
                  </div>
                </div>
              </n-collapse-item>
            </n-collapse>
            <n-divider title-placement="left" style="margin: 12px 0 8px 0"
              >分批执行设置</n-divider
            >
            <div class="settings-grid">
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">启用分批执行</label>
                <n-switch v-model:value="batchSettings.enableBatchExecution" />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">每批账号数量</label>
                <n-input-number
                  v-model:value="batchSettings.batchSize"
                  :min="1"
                  :max="50"
                  :step="1"
                  :disabled="!batchSettings.enableBatchExecution"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">批次间延迟(秒)</label>
                <n-input-number
                  v-model:value="batchSettings.batchDelay"
                  :min="5"
                  :max="300"
                  :step="5"
                  :disabled="!batchSettings.enableBatchExecution"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">冲突时加入积攒队列</label>
                <n-switch v-model:value="batchSettings.enableQueueOnConflict" />
              </div>
            </div>
            <n-divider title-placement="left" style="margin: 12px 0 8px 0"
              >系统维护设置</n-divider
            >
            <div class="settings-grid">
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">定时刷新页面</label>
                <n-switch v-model:value="batchSettings.enableRefresh" />
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
                v-if="batchSettings.enableRefresh"
              >
                <label class="setting-label">刷新间隔(分钟)</label>
                <n-input-number
                  v-model:value="batchSettings.refreshInterval"
                  :min="1"
                  :max="1440"
                  :step="1"
                  size="small"
                  style="width: 100px"
                />
              </div>
            </div>
            <n-collapse style="margin-top: 10px">
              <n-collapse-item title="推送通知设置">
                <div class="settings-grid">
                  <div
                    class="setting-item"
                    style="
                      flex-direction: row;
                      justify-content: space-between;
                      align-items: center;
                    "
                  >
                    <label class="setting-label">启用推送</label>
                    <n-switch v-model:value="batchSettings.pushNotificationEnabled" />
                  </div>
                  <div
                    class="setting-item"
                    style="
                      flex-direction: column;
                      align-items: flex-start;
                      gap: 8px;
                    "
                  >
                    <label class="setting-label">推送方式</label>
                    <n-select
                      v-model:value="batchSettings.pushProvider"
                      :options="pushProviderOptions"
                      size="small"
                      style="width: 100%"
                    />
                  </div>
                  <div
                    class="setting-item"
                    style="
                      flex-direction: column;
                      align-items: flex-start;
                      gap: 8px;
                    "
                  >
                    <label class="setting-label">推送 Token</label>
                    <n-input
                      v-model:value="batchSettings.pushToken"
                      type="password"
                      show-password-on="click"
                      :placeholder="getPushTokenPlaceholder()"
                      size="small"
                      style="width: 100%"
                    />
                    <div style="font-size: 12px; color: #999;">{{ getPushTokenHelp() }}</div>
                  </div>
                  <div
                    class="setting-item"
                    style="
                      flex-direction: row;
                      justify-content: flex-end;
                      align-items: center;
                    "
                  >
                    <n-button type="primary" size="small" :loading="testingPush" :disabled="!batchSettings.pushToken" @click="testPushNotification">
                      测试推送
                    </n-button>
                  </div>
                </div>
              </n-collapse-item>
            </n-collapse>
          </n-grid-item>
        </n-grid>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button
            @click="showBatchSettingsModal = false"
            style="margin-right: 12px"
            >取消</n-button
          >
          <n-button type="primary" @click="saveBatchSettings"
            >保存设置</n-button
          >
        </div>
      </div>
    </n-modal>

    <!-- War Guess Modal -->
    <n-modal
      v-model:show="showWarGuessModal"
      preset="card"
      title="月赛助威"
      style="width: 90%; max-width: 800px"
    >
      <div class="settings-content">
        <div class="settings-grid" style="display: block">
          <div
            style="
              margin-bottom: 16px;
              display: flex;
              align-items: center;
              gap: 12px;
            "
          >
            <span style="font-size: 16px">拍手器:</span>
            <n-input-number
              v-model:value="warGuessCoin"
              placeholder="拍手器"
              :min="1"
              :max="20"
              style="width: 120px"
            >
            </n-input-number>
            <n-button
              type="primary"
              @click="handleWarGuessCheer"
              :disabled="!selectedWarGuessLegionId || isRunning"
            >
              助威
            </n-button>
            <n-button @click="fetchWarGuessRank" :loading="warGuessLoading">
              刷新数据
            </n-button>
          </div>

          <n-data-table
            :columns="warGuessColumns"
            :data="warGuessList"
            :loading="warGuessLoading"
            :row-key="(row) => row.id"
            :checked-row-keys="
              selectedWarGuessLegionId ? [selectedWarGuessLegionId] : []
            "
            @update:checked-row-keys="
              (keys) => (selectedWarGuessLegionId = keys[0])
            "
            :row-props="warGuessRowProps"
            style="height: 400px; flex: 1"
            flex-height
          />
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showWarGuessModal = false">关闭</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Token Group Management Modal -->
    <n-modal
      v-model:show="showGroupManageModal"
      preset="card"
      title="分组管理"
      style="width: 90%; max-width: 800px"
    >
      <div class="settings-content">
        <!-- 创建新分组 -->
        <n-divider title-placement="left" style="margin: 0 0 16px 0">
          创建新分组
        </n-divider>
        <div style="margin-bottom: 24px">
          <div
            style="
              display: flex;
              gap: 12px;
              align-items: center;
              margin-bottom: 12px;
              flex-wrap: wrap;
            "
          >
            <n-input
              v-model:value="newGroupName"
              placeholder="输入分组名称"
              style="width: 200px"
              size="small"
            />
            <div style="display: flex; gap: 8px; align-items: center">
              <span style="font-size: 12px">选择颜色:</span>
              <div style="display: flex; gap: 6px">
                <div
                  v-for="color in groupColors"
                  :key="color"
                  :style="{
                    width: '24px',
                    height: '24px',
                    backgroundColor: color,
                    borderRadius: '4px',
                    border:
                      newGroupColor === color
                        ? '3px solid #000'
                        : '2px solid #ddd',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }"
                  @click="newGroupColor = color"
                  @mouseover="$event.target.style.transform = 'scale(1.1)'"
                  @mouseleave="$event.target.style.transform = 'scale(1)'"
                />
              </div>
            </div>
            <n-button type="primary" size="small" @click="createNewGroup">
              创建分组
            </n-button>
          </div>

          <!-- 选择包含的账号 -->
          <div
            style="
              background: #f9f9f9;
              padding: 12px;
              border-radius: 8px;
              border: 1px solid #eee;
            "
          >
            <div
              style="
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
              "
            >
              <span style="font-size: 13px; font-weight: bold"
                >包含账号 ({{ newGroupSelectedTokens.length }})</span
              >
              <n-space size="small">
                <n-button size="tiny" @click="selectAllNewGroup">全选</n-button>
                <n-button size="tiny" @click="deselectAllNewGroup"
                  >全不选</n-button
                >
              </n-space>
            </div>
            <div style="max-height: 150px; overflow-y: auto">
              <n-checkbox-group v-model:value="newGroupSelectedTokens">
                <n-grid :cols="3" :x-gap="12" :y-gap="8">
                  <n-grid-item v-for="token in sortedTokens" :key="token.id">
                    <n-checkbox :value="token.id">{{ token.name }}</n-checkbox>
                  </n-grid-item>
                </n-grid>
              </n-checkbox-group>
            </div>
          </div>
        </div>

        <!-- 分组列表 -->
        <n-divider title-placement="left" style="margin: 0 0 16px 0">
          分组列表
        </n-divider>
        <div
          style="
            max-height: 500px;
            overflow-y: auto;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px;
          "
        >
          <div
            v-for="group in tokenGroups"
            :key="group.id"
            style="
              padding: 12px;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              margin-bottom: 12px;
              background: #fafafa;
            "
          >
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 12px;
              "
            >
              <div style="flex: 1">
                <!-- 编辑模式 -->
                <div
                  v-if="editingGroupId === group.id"
                  style="display: flex; gap: 8px"
                >
                  <n-input
                    v-model:value="editingGroupName"
                    placeholder="分组名称"
                    size="small"
                    style="width: 150px"
                  />
                  <div style="display: flex; gap: 6px; align-items: center">
                    <div
                      v-for="color in groupColors"
                      :key="color"
                      :style="{
                        width: '20px',
                        height: '20px',
                        backgroundColor: color,
                        borderRadius: '4px',
                        border:
                          editingGroupColor === color
                            ? '3px solid #000'
                            : '2px solid #ddd',
                        cursor: 'pointer',
                      }"
                      @click="editingGroupColor = color"
                    />
                  </div>
                  <n-button
                    size="small"
                    type="primary"
                    @click="saveEditGroup"
                    style="width: 60px"
                  >
                    保存
                  </n-button>
                  <n-button
                    size="small"
                    @click="cancelEditGroup"
                    style="width: 60px"
                  >
                    取消
                  </n-button>
                </div>
                <!-- 显示模式 -->
                <div v-else>
                  <div
                    style="
                      display: flex;
                      align-items: center;
                      gap: 8px;
                      margin-bottom: 8px;
                    "
                  >
                    <div
                      :style="{
                        width: '16px',
                        height: '16px',
                        backgroundColor: group.color,
                        borderRadius: '3px',
                      }"
                    />
                    <span style="font-weight: 500; font-size: 14px">
                      {{ group.name }}
                    </span>
                    <n-tag size="small" type="info">
                      {{ getValidGroupTokenIds(group.id).length }} 个账号
                    </n-tag>
                  </div>
                  <div
                    style="
                      display: flex;
                      gap: 4px;
                      flex-wrap: wrap;
                      margin-bottom: 8px;
                    "
                  >
                    <div
                      v-for="tokenId in getValidGroupTokenIds(group.id)"
                      :key="tokenId"
                      style="
                        padding: 2px 8px;
                        background: white;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                      "
                    >
                      {{ tokens.find((t) => t.id === tokenId)?.name }}
                      <n-button
                        size="tiny"
                        type="error"
                        text
                        @click="removeTokenFromSelectedGroup(group.id, tokenId)"
                      >
                        ×
                      </n-button>
                    </div>
                  </div>
                  <!-- 添加token到分组 -->
                  <div style="margin-bottom: 8px">
                    <n-select
                      placeholder="添加账号到分组"
                      size="small"
                      filterable
                      :options="
                        tokens
                          .filter(
                            (t) =>
                              !getValidGroupTokenIds(group.id).includes(t.id),
                          )
                          .map((t) => ({ label: t.name, value: t.id }))
                      "
                      @update:value="
                        (tokenId) => {
                          if (tokenId) {
                            addTokenToSelectedGroup(group.id, tokenId);
                          }
                        }
                      "
                    />
                  </div>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div
                style="display: flex; gap: 8px"
                v-if="editingGroupId !== group.id"
              >
                <n-button size="small" @click="startEditGroup(group.id)">
                  编辑
                </n-button>
                <n-button
                  size="small"
                  type="error"
                  @click="deleteGroup(group.id)"
                >
                  删除
                </n-button>
              </div>
            </div>
          </div>

          <div
            v-if="tokenGroups.length === 0"
            style="text-align: center; padding: 24px; color: #86909c"
          >
            暂无分组，请创建一个新分组
          </div>
        </div>

        <!-- 关闭按钮 -->
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showGroupManageModal = false">关闭</n-button>
        </div>
      </div>
    </n-modal>

    <!-- 黑市周购买助手模态框 -->
    <n-modal
      v-model:show="showBlackMarketBuyerModal"
      preset="card"
      title="黑市周购买助手"
      style="width: 90%; max-width: 1200px"
      :mask-closable="false"
    >
      <BlackMarketBuyer
        :selected-tokens="selectedTokenObjects"
        :add-log="addLog"
        :batch-settings="batchSettings"
        :is-pause-time="isPauseTime"
        :should-stop="batchTaskStore.shouldStop"
        :batch-task-store="batchTaskStore"
        @close="showBlackMarketBuyerModal = false"
        @purchase-complete="handleBlackMarketPurchaseComplete"
      />
    </n-modal>
  </div>
</template>

<script setup>
// Import required dependencies
import {
  ref,
  computed,
  nextTick,
  reactive,
  watch,
  onMounted,
  onBeforeUnmount,
  h,
} from "vue";
import { useTokenStore, gameTokens, tokenGroups } from "@/stores/tokenStore";
import { useBatchTaskStore } from "@/stores/batchTaskStore";
import { useScheduledTaskStore } from "@/stores/scheduledTaskStore";
import { $emit } from "@/stores/events/index.ts";
import { DailyTaskRunner } from "@/utils/dailyTaskRunner";
import { preloadQuestions } from "@/utils/studyQuestionsFromJSON.js";
import { useMessage } from "naive-ui";
import { Settings } from "@vicons/ionicons5";
import { sendTaskCompleteNotification, getPushConfig, savePushConfig, testPushNotification as testPushNotificationUtil } from '@/utils/pushNotification';

// Import batch task modules
import {
  // Constants
  boxTypeOptions,
  fishTypeOptions,
  formationOptions,
  bossTimesOptions,
  availableTasks,
  CarresearchItem,
  FISH_TARGET,
  ARENA_TARGET,
  taskColumns,
  defaultSettings,
  defaultBatchSettings,
  defaultTemplate,
  defaultTaskForm,
  defaultHelperSettings,
  // Cron utilities
  validateCronField,
  validateCronExpression,
  parseCronField,
  calculateNextRuns,
  calculateNextExecutionTime,
  formatTimeDifference,
  matchesCronExpression,
  // Connection manager
  createConnectionManager,
  getActivityStatus,
  getTodayStartSec,
  isTodayAvailable,
  calculateMonthProgress,
  pickArenaTargetId,
  // Log utilities
  createLogManager,
  addTaskSaveLog,
  // Car utilities
  normalizeCars,
  gradeLabel,
  isBigPrize,
  countRacingRefreshTickets,
  shouldSendCar,
  canClaim,
  // Task factories
  createTasksHangUp,
  createTasksBottle,
  createTasksTower,
  createTasksCar,
  createTasksItem,
  createTasksDungeon,
  createTasksArena,
  createTasksStore,
  createTasksLegacy,
} from "@/utils/batch";

import { merchantConfig, goldItemsConfig } from "@/utils/dreamConstants";
import BlackMarketBuyer from "@/components/cards/BlackMarketBuyer.vue";

// Initialize token store, message service, and task runner
const tokenStore = useTokenStore();
const batchTaskStore = useBatchTaskStore();
const scheduledTaskStore = useScheduledTaskStore();
const message = useMessage();

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

// 当前时间，用于暂停时间检查
const currentTime = ref(new Date());
const resumeCheckInterval = ref(null); // 恢复时间检查定时器

// 时间解析辅助函数
const parseTime = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') {
    return { hour: 0, minute: 0 };
  }
  const parts = timeStr.split(':');
  return {
    hour: parseInt(parts[0]) || 0,
    minute: parseInt(parts[1]) || 0
  };
};

// 检查是否处于暂停时间
const isPauseTime = computed(() => {
  if (!batchSettings.enablePauseTime) {
    return { paused: false, reason: '', resumeTime: null };
  }

  const now = currentTime.value;
  const dayOfWeek = now.getDay(); // 0-6, 0是周日
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const nowTotalSeconds = hour * 3600 + minute * 60 + second;
  
  // 每天抢符时间
  if (batchSettings.enableRobFuTime) {
    let shouldCheck = true;
    if (batchSettings.robFuTimeFrequency === "weekly") {
      const { hour: robFuStartHour } = parseTime(batchSettings.robFuStartTime);
      const { hour: robFuEndHour } = parseTime(batchSettings.robFuEndTime);
      
      if (robFuStartHour <= robFuEndHour) {
        shouldCheck = dayOfWeek === batchSettings.robFuTimeDayOfWeek;
      } else {
        shouldCheck = dayOfWeek === batchSettings.robFuTimeDayOfWeek || 
                     dayOfWeek === (batchSettings.robFuTimeDayOfWeek + 1) % 7;
      }
    }
    
    if (shouldCheck) {
      const { hour: startHour, minute: startMinute } = parseTime(batchSettings.robFuStartTime);
      const { hour: endHour, minute: endMinute } = parseTime(batchSettings.robFuEndTime);
      const startTotalSeconds = startHour * 3600 + startMinute * 60;
      const endTotalSeconds = endHour * 3600 + endMinute * 60;
      
      if (startTotalSeconds > endTotalSeconds) {
        // 跨天情况
        const isStartDay = dayOfWeek === batchSettings.robFuTimeDayOfWeek;
        const isEndDay = dayOfWeek === (batchSettings.robFuTimeDayOfWeek + 1) % 7;
        
        if ((isStartDay && nowTotalSeconds >= startTotalSeconds) || 
            (isEndDay && nowTotalSeconds < endTotalSeconds)) {
          const resumeDate = new Date(now);
          if (isStartDay) {
            resumeDate.setDate(resumeDate.getDate() + 1);
          }
          resumeDate.setHours(endHour, endMinute, 0, 0);
          return { paused: true, reason: batchSettings.robFuTimeName, resumeTime: resumeDate };
        }
      } else {
        // 同一天情况
        if (nowTotalSeconds >= startTotalSeconds && nowTotalSeconds < endTotalSeconds) {
          const resumeDate = new Date(now);
          resumeDate.setHours(endHour, endMinute, 0, 0);
          return { paused: true, reason: batchSettings.robFuTimeName, resumeTime: resumeDate };
        }
      }
    }
  }
  
  // 周六盐场时间
  if (batchSettings.enableSaltFieldTime) {
    let shouldCheck = true;
    if (batchSettings.saltFieldFrequency === "weekly") {
      const { hour: saltFieldStartHour } = parseTime(batchSettings.saltFieldStartTime);
      const { hour: saltFieldEndHour } = parseTime(batchSettings.saltFieldEndTime);
      
      if (saltFieldStartHour <= saltFieldEndHour) {
        shouldCheck = dayOfWeek === batchSettings.saltFieldDayOfWeek;
      } else {
        shouldCheck = dayOfWeek === batchSettings.saltFieldDayOfWeek || 
                     dayOfWeek === (batchSettings.saltFieldDayOfWeek + 1) % 7;
      }
    }
    
    if (shouldCheck) {
      const { hour: startHour, minute: startMinute } = parseTime(batchSettings.saltFieldStartTime);
      const { hour: endHour, minute: endMinute } = parseTime(batchSettings.saltFieldEndTime);
      const startTotalSeconds = startHour * 3600 + startMinute * 60;
      const endTotalSeconds = endHour * 3600 + endMinute * 60;
      
      if (startTotalSeconds > endTotalSeconds) {
        // 跨天情况
        const isStartDay = dayOfWeek === batchSettings.saltFieldDayOfWeek;
        const isEndDay = dayOfWeek === (batchSettings.saltFieldDayOfWeek + 1) % 7;
        
        if ((isStartDay && nowTotalSeconds >= startTotalSeconds) || 
            (isEndDay && nowTotalSeconds < endTotalSeconds)) {
          const resumeDate = new Date(now);
          if (isStartDay) {
            resumeDate.setDate(resumeDate.getDate() + 1);
          }
          resumeDate.setHours(endHour, endMinute, 0, 0);
          return { paused: true, reason: batchSettings.saltFieldName, resumeTime: resumeDate };
        }
      } else {
        // 同一天情况
        if (nowTotalSeconds >= startTotalSeconds && nowTotalSeconds < endTotalSeconds) {
          const resumeDate = new Date(now);
          resumeDate.setHours(endHour, endMinute, 0, 0);
          return { paused: true, reason: batchSettings.saltFieldName, resumeTime: resumeDate };
        }
      }
    }
  }
  
  // 周日盐场时间
  if (batchSettings.enableSundaySaltFieldTime) {
    let shouldCheck = true;
    if (batchSettings.sundaySaltFieldFrequency === "weekly") {
      const { hour: sundaySaltFieldStartHour } = parseTime(batchSettings.sundaySaltFieldStartTime);
      const { hour: sundaySaltFieldEndHour } = parseTime(batchSettings.sundaySaltFieldEndTime);
      
      if (sundaySaltFieldStartHour <= sundaySaltFieldEndHour) {
        shouldCheck = dayOfWeek === batchSettings.sundaySaltFieldDayOfWeek;
      } else {
        shouldCheck = dayOfWeek === batchSettings.sundaySaltFieldDayOfWeek || 
                     dayOfWeek === (batchSettings.sundaySaltFieldDayOfWeek + 1) % 7;
      }
    }
    
    if (shouldCheck) {
      const { hour: startHour, minute: startMinute } = parseTime(batchSettings.sundaySaltFieldStartTime);
      const { hour: endHour, minute: endMinute } = parseTime(batchSettings.sundaySaltFieldEndTime);
      const startTotalSeconds = startHour * 3600 + startMinute * 60;
      const endTotalSeconds = endHour * 3600 + endMinute * 60;
      
      if (startTotalSeconds > endTotalSeconds) {
        // 跨天情况
        const isStartDay = dayOfWeek === batchSettings.sundaySaltFieldDayOfWeek;
        const isEndDay = dayOfWeek === (batchSettings.sundaySaltFieldDayOfWeek + 1) % 7;
        
        if ((isStartDay && nowTotalSeconds >= startTotalSeconds) || 
            (isEndDay && nowTotalSeconds < endTotalSeconds)) {
          const resumeDate = new Date(now);
          if (isStartDay) {
            resumeDate.setDate(resumeDate.getDate() + 1);
          }
          resumeDate.setHours(endHour, endMinute, 0, 0);
          return { paused: true, reason: batchSettings.sundaySaltFieldName, resumeTime: resumeDate };
        }
      } else {
        // 同一天情况
        if (nowTotalSeconds >= startTotalSeconds && nowTotalSeconds < endTotalSeconds) {
          const resumeDate = new Date(now);
          resumeDate.setHours(endHour, endMinute, 0, 0);
          return { paused: true, reason: batchSettings.sundaySaltFieldName, resumeTime: resumeDate };
        }
      }
    }
  }
  
  // 游戏更新时间
  if (batchSettings.enableGameUpdateTime) {
    let shouldCheck = true;
    if (batchSettings.gameUpdateFrequency === "weekly") {
      const { hour: gameUpdateStartHour } = parseTime(batchSettings.gameUpdateStartTime);
      const { hour: gameUpdateEndHour } = parseTime(batchSettings.gameUpdateEndTime);
      
      if (gameUpdateStartHour <= gameUpdateEndHour) {
        shouldCheck = dayOfWeek === batchSettings.gameUpdateDayOfWeek;
      } else {
        shouldCheck = dayOfWeek === batchSettings.gameUpdateDayOfWeek || 
                     dayOfWeek === (batchSettings.gameUpdateDayOfWeek + 1) % 7;
      }
    }
    
    if (shouldCheck) {
      const { hour: startHour, minute: startMinute } = parseTime(batchSettings.gameUpdateStartTime);
      const { hour: endHour, minute: endMinute } = parseTime(batchSettings.gameUpdateEndTime);
      const startTotalSeconds = startHour * 3600 + startMinute * 60;
      const endTotalSeconds = endHour * 3600 + endMinute * 60;
      
      if (startTotalSeconds > endTotalSeconds) {
        // 跨天情况
        const isStartDay = dayOfWeek === batchSettings.gameUpdateDayOfWeek;
        const isEndDay = dayOfWeek === (batchSettings.gameUpdateDayOfWeek + 1) % 7;
        
        if ((isStartDay && nowTotalSeconds >= startTotalSeconds) || 
            (isEndDay && nowTotalSeconds < endTotalSeconds)) {
          const resumeDate = new Date(now);
          if (isStartDay) {
            resumeDate.setDate(resumeDate.getDate() + 1);
          }
          resumeDate.setHours(endHour, endMinute, 0, 0);
          return { paused: true, reason: batchSettings.gameUpdateName, resumeTime: resumeDate };
        }
      } else {
        // 同一天情况
        if (nowTotalSeconds >= startTotalSeconds && nowTotalSeconds < endTotalSeconds) {
          const resumeDate = new Date(now);
          resumeDate.setHours(endHour, endMinute, 0, 0);
          return { paused: true, reason: batchSettings.gameUpdateName, resumeTime: resumeDate };
        }
      }
    }
  }
  
  // 自定义暂停时间1
  if (batchSettings.enableCustomPauseTime1) {
    let shouldCheck = true;
    if (batchSettings.customPauseTime1Frequency === "weekly") {
      const { hour: customPauseTime1StartHour } = parseTime(batchSettings.customPauseTime1Start);
      const { hour: customPauseTime1EndHour } = parseTime(batchSettings.customPauseTime1End);
      
      if (customPauseTime1StartHour <= customPauseTime1EndHour) {
        shouldCheck = dayOfWeek === batchSettings.customPauseTime1DayOfWeek;
      } else {
        shouldCheck = dayOfWeek === batchSettings.customPauseTime1DayOfWeek || 
                     dayOfWeek === (batchSettings.customPauseTime1DayOfWeek + 1) % 7;
      }
    }
    
    if (shouldCheck) {
      const { hour: startHour, minute: startMinute } = parseTime(batchSettings.customPauseTime1Start);
      const { hour: endHour, minute: endMinute } = parseTime(batchSettings.customPauseTime1End);
      const startTotalSeconds = startHour * 3600 + startMinute * 60;
      const endTotalSeconds = endHour * 3600 + endMinute * 60;
      
      if (startTotalSeconds > endTotalSeconds) {
        // 跨天情况
        const isStartDay = dayOfWeek === batchSettings.customPauseTime1DayOfWeek;
        const isEndDay = dayOfWeek === (batchSettings.customPauseTime1DayOfWeek + 1) % 7;
        
        if ((isStartDay && nowTotalSeconds >= startTotalSeconds) || 
            (isEndDay && nowTotalSeconds < endTotalSeconds)) {
          const resumeDate = new Date(now);
          if (isStartDay) {
            resumeDate.setDate(resumeDate.getDate() + 1);
          }
          resumeDate.setHours(endHour, endMinute, 0, 0);
          return { paused: true, reason: batchSettings.customPauseTime1Name, resumeTime: resumeDate };
        }
      } else {
        // 同一天情况
        if (nowTotalSeconds >= startTotalSeconds && nowTotalSeconds < endTotalSeconds) {
          const resumeDate = new Date(now);
          resumeDate.setHours(endHour, endMinute, 0, 0);
          return { paused: true, reason: batchSettings.customPauseTime1Name, resumeTime: resumeDate };
        }
      }
    }
  }
  
  // 自定义暂停时间2
  if (batchSettings.enableCustomPauseTime2) {
    let shouldCheck = true;
    if (batchSettings.customPauseTime2Frequency === "weekly") {
      const { hour: customPauseTime2StartHour } = parseTime(batchSettings.customPauseTime2Start);
      const { hour: customPauseTime2EndHour } = parseTime(batchSettings.customPauseTime2End);
      
      if (customPauseTime2StartHour <= customPauseTime2EndHour) {
        shouldCheck = dayOfWeek === batchSettings.customPauseTime2DayOfWeek;
      } else {
        shouldCheck = dayOfWeek === batchSettings.customPauseTime2DayOfWeek || 
                     dayOfWeek === (batchSettings.customPauseTime2DayOfWeek + 1) % 7;
      }
    }
    
    if (shouldCheck) {
      const { hour: startHour, minute: startMinute } = parseTime(batchSettings.customPauseTime2Start);
      const { hour: endHour, minute: endMinute } = parseTime(batchSettings.customPauseTime2End);
      const startTotalSeconds = startHour * 3600 + startMinute * 60;
      const endTotalSeconds = endHour * 3600 + endMinute * 60;
      
      if (startTotalSeconds > endTotalSeconds) {
        // 跨天情况
        const isStartDay = dayOfWeek === batchSettings.customPauseTime2DayOfWeek;
        const isEndDay = dayOfWeek === (batchSettings.customPauseTime2DayOfWeek + 1) % 7;
        
        if ((isStartDay && nowTotalSeconds >= startTotalSeconds) || 
            (isEndDay && nowTotalSeconds < endTotalSeconds)) {
          const resumeDate = new Date(now);
          if (isStartDay) {
            resumeDate.setDate(resumeDate.getDate() + 1);
          }
          resumeDate.setHours(endHour, endMinute, 0, 0);
          return { paused: true, reason: batchSettings.customPauseTime2Name, resumeTime: resumeDate };
        }
      } else {
        // 同一天情况
        if (nowTotalSeconds >= startTotalSeconds && nowTotalSeconds < endTotalSeconds) {
          const resumeDate = new Date(now);
          resumeDate.setHours(endHour, endMinute, 0, 0);
          return { paused: true, reason: batchSettings.customPauseTime2Name, resumeTime: resumeDate };
        }
      }
    }
  }
  
  // 自定义暂停时间3
  if (batchSettings.enableCustomPauseTime3) {
    let shouldCheck = true;
    if (batchSettings.customPauseTime3Frequency === "weekly") {
      const { hour: customPauseTime3StartHour } = parseTime(batchSettings.customPauseTime3Start);
      const { hour: customPauseTime3EndHour } = parseTime(batchSettings.customPauseTime3End);
      
      if (customPauseTime3StartHour <= customPauseTime3EndHour) {
        shouldCheck = dayOfWeek === batchSettings.customPauseTime3DayOfWeek;
      } else {
        shouldCheck = dayOfWeek === batchSettings.customPauseTime3DayOfWeek || 
                     dayOfWeek === (batchSettings.customPauseTime3DayOfWeek + 1) % 7;
      }
    }
    
    if (shouldCheck) {
      const { hour: startHour, minute: startMinute } = parseTime(batchSettings.customPauseTime3Start);
      const { hour: endHour, minute: endMinute } = parseTime(batchSettings.customPauseTime3End);
      const startTotalSeconds = startHour * 3600 + startMinute * 60;
      const endTotalSeconds = endHour * 3600 + endMinute * 60;
      
      if (startTotalSeconds > endTotalSeconds) {
        // 跨天情况
        const isStartDay = dayOfWeek === batchSettings.customPauseTime3DayOfWeek;
        const isEndDay = dayOfWeek === (batchSettings.customPauseTime3DayOfWeek + 1) % 7;
        
        if ((isStartDay && nowTotalSeconds >= startTotalSeconds) || 
            (isEndDay && nowTotalSeconds < endTotalSeconds)) {
          const resumeDate = new Date(now);
          if (isStartDay) {
            resumeDate.setDate(resumeDate.getDate() + 1);
          }
          resumeDate.setHours(endHour, endMinute, 0, 0);
          return { paused: true, reason: batchSettings.customPauseTime3Name, resumeTime: resumeDate };
        }
      } else {
        // 同一天情况
        if (nowTotalSeconds >= startTotalSeconds && nowTotalSeconds < endTotalSeconds) {
          const resumeDate = new Date(now);
          resumeDate.setHours(endHour, endMinute, 0, 0);
          return { paused: true, reason: batchSettings.customPauseTime3Name, resumeTime: resumeDate };
        }
      }
    }
  }
  
  // 自定义暂停时间4
  if (batchSettings.enableCustomPauseTime4) {
    let shouldCheck = true;
    if (batchSettings.customPauseTime4Frequency === "weekly") {
      const { hour: customPauseTime4StartHour } = parseTime(batchSettings.customPauseTime4Start);
      const { hour: customPauseTime4EndHour } = parseTime(batchSettings.customPauseTime4End);
      
      if (customPauseTime4StartHour <= customPauseTime4EndHour) {
        shouldCheck = dayOfWeek === batchSettings.customPauseTime4DayOfWeek;
      } else {
        shouldCheck = dayOfWeek === batchSettings.customPauseTime4DayOfWeek || 
                     dayOfWeek === (batchSettings.customPauseTime4DayOfWeek + 1) % 7;
      }
    }
    
    if (shouldCheck) {
      const { hour: startHour, minute: startMinute } = parseTime(batchSettings.customPauseTime4Start);
      const { hour: endHour, minute: endMinute } = parseTime(batchSettings.customPauseTime4End);
      const startTotalSeconds = startHour * 3600 + startMinute * 60;
      const endTotalSeconds = endHour * 3600 + endMinute * 60;
      
      if (startTotalSeconds > endTotalSeconds) {
        // 跨天情况
        const isStartDay = dayOfWeek === batchSettings.customPauseTime4DayOfWeek;
        const isEndDay = dayOfWeek === (batchSettings.customPauseTime4DayOfWeek + 1) % 7;
        
        if ((isStartDay && nowTotalSeconds >= startTotalSeconds) || 
            (isEndDay && nowTotalSeconds < endTotalSeconds)) {
          const resumeDate = new Date(now);
          if (isStartDay) {
            resumeDate.setDate(resumeDate.getDate() + 1);
          }
          resumeDate.setHours(endHour, endMinute, 0, 0);
          return { paused: true, reason: batchSettings.customPauseTime4Name, resumeTime: resumeDate };
        }
      } else {
        // 同一天情况
        if (nowTotalSeconds >= startTotalSeconds && nowTotalSeconds < endTotalSeconds) {
          const resumeDate = new Date(now);
          resumeDate.setHours(endHour, endMinute, 0, 0);
          return { paused: true, reason: batchSettings.customPauseTime4Name, resumeTime: resumeDate };
        }
      }
    }
  }
  
  return { paused: false, reason: '', resumeTime: null };
});

// 暂停倒计时
const pauseCountdown = computed(() => {
  if (!isPauseTime.value.paused || !isPauseTime.value.resumeTime) {
    return '';
  }
  
  const now = currentTime.value;
  const resumeTime = isPauseTime.value.resumeTime;
  const diff = resumeTime - now;
  
  if (diff <= 0) {
    return '即将恢复';
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return `${hours}小时${minutes}分${seconds}秒后恢复`;
});

// 排序配置（从localStorage读取，与TokenImport共享）
const savedSortConfig = localStorage.getItem("tokenSortConfig");
const sortConfig = ref(
  savedSortConfig
    ? JSON.parse(savedSortConfig)
    : {
        field: "createdAt", // 排序字段：name, server, createdAt, lastUsed
        direction: "asc", // 排序方向：asc, desc
      },
);

// 计算属性 - 从gameData中获取塔相关信息
const evoTowerInfo = computed(() => {
  const data = tokenStore.gameData?.evoTowerInfo || null;
  return data;
});

const weirdTowerData = computed(() => {
  return evoTowerInfo.value?.evoTower || null;
});

const currentTowerId = computed(() => {
  return weirdTowerData.value?.towerId || 0;
});

const towerEnergy = computed(() => {
  return weirdTowerData.value?.energy || 0;
});

// 排序后的游戏角色Token列表
const sortedTokens = computed(() => {
  const tokens = tokenStore.gameTokens || [];
  return [...tokens].sort((tokenA, tokenB) => {
    let valueA, valueB;

    // 根据排序字段获取比较值
    switch (sortConfig.value.field) {
      case "name":
        valueA = tokenA.name?.toLowerCase() || "";
        valueB = tokenB.name?.toLowerCase() || "";
        break;
      case "server":
        valueA = tokenA.server?.toLowerCase() || "";
        valueB = tokenB.server?.toLowerCase() || "";
        break;
      case "createdAt":
        valueA = new Date(tokenA.createdAt || 0).getTime();
        valueB = new Date(tokenB.createdAt || 0).getTime();
        break;
      case "lastUsed":
        valueA = new Date(tokenA.lastUsed || 0).getTime();
        valueB = new Date(tokenB.lastUsed || 0).getTime();
        break;
      default:
        valueA = tokenA.name?.toLowerCase() || "";
        valueB = tokenB.name?.toLowerCase() || "";
    }

    // 根据排序方向比较值
    if (valueA < valueB) {
      return sortConfig.value.direction === "asc" ? -1 : 1;
    }
    if (valueA > valueB) {
      return sortConfig.value.direction === "asc" ? 1 : -1;
    }
    return 0;
  });
});

// 切换排序
const toggleSort = (field) => {
  if (sortConfig.value.field === field) {
    // 如果点击的是当前排序字段，则切换排序方向
    sortConfig.value.direction =
      sortConfig.value.direction === "asc" ? "desc" : "asc";
  } else {
    // 如果点击的是新的排序字段，则默认升序
    sortConfig.value.field = field;
    sortConfig.value.direction = "asc";
  }

  // 保存排序设置到localStorage
  localStorage.setItem("tokenSortConfig", JSON.stringify(sortConfig.value));
};

// 获取排序图标
const getSortIcon = (field) => {
  if (sortConfig.value.field !== field) return null;
  return sortConfig.value.direction === "asc" ? "↑" : "↓";
};

// 账号列表展开状态
const isTokensExpanded = ref(true);

// 切换账号列表展开/收起
const toggleTokens = () => {
  isTokensExpanded.value = !isTokensExpanded.value;
};

// 功能按钮展开状态
const isButtonsExpanded = ref(true);

// 切换功能按钮展开/收起
const toggleButtons = () => {
  isButtonsExpanded.value = !isButtonsExpanded.value;
};

const tokens = computed(() => tokenStore.gameTokens || []);
const isCarActivityOpen = computed(() => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  // 1=Mon, 2=Tue, 3=Wed; 6点之后
  return day >= 1 && day <= 3 && hour >= 6;
});
const ismengjingActivityOpen = computed(() => {
  const day = new Date().getDay();
  return day === 0 || day === 1 || day === 3 || day === 4;
});
const isbaokuActivityOpen = computed(() => {
  const day = new Date().getDay();
  return day != 1 && day != 2;
});
const isarenaActivityOpen = computed(() => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 22;
});

const getCurrentActivityWeek = computed(() => {
  const blackMarketStatus = isBlackMarketOpen();
  if (blackMarketStatus.isOpen) {
    return "黑市周";
  }
  
  // 如果不是黑市周，根据时间计算是招募周还是宝箱周
  const now = new Date();
  const { firstOpenTime, cycleDuration, openDuration } = BLACK_MARKET_CONFIG;
  const cyclesSinceFirst = Math.floor((now - firstOpenTime) / cycleDuration);
  const currentOpenTime = firstOpenTime + cyclesSinceFirst * cycleDuration;
  const currentCloseTime = currentOpenTime + openDuration;
  
  // 计算距离上次黑市周关闭过去了多久
  const timeSinceClose = now - currentCloseTime;
  
  // 黑市周关闭后的第一周是招募周，第二周是宝箱周
  const weekDuration = 7 * 24 * 60 * 60 * 1000;
  if (timeSinceClose < weekDuration) {
    return "招募周";
  } else if (timeSinceClose < 2 * weekDuration) {
    return "宝箱周";
  } else {
    return "黑市周"; // 即将开启
  }
});

const isWeirdTowerActivityOpen = computed(() => {
  if (getCurrentActivityWeek.value !== "黑市周") return false;

  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  // 如果是周五，必须在12点之后
  if (day === 5) {
    return hour >= 12;
  }
  return true;
});

// 获取本月第四个周日的日期
const getFourthSundayOfMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // 当月第一天
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay(); // 0-6

  // 计算第一个周日的日期 (1号是周日则为1，否则为 1 + 7 - dayOfWeek)
  let firstSundayDate = 1 + ((7 - dayOfWeek) % 7);

  // 仅针对2026年3月进行特殊处理
  if (year === 2026 && month === 2 && dayOfWeek === 0) {
    firstSundayDate = 8;
  }

  // 第四个周日 = 第一个周日 + 21天
  return new Date(year, month, firstSundayDate + 21);
};

const isWarGuessActivityOpen = computed(() => {
  const now = new Date();

  // 手动修正：2026年3月1日开放
  if (
    now.getFullYear() === 2026 &&
    now.getMonth() === 2 &&
    now.getDate() === 1
  ) {
    const hour = now.getHours();
    const minute = now.getMinutes();
    if (hour < 19 || (hour === 19 && minute <= 55)) return true;
  }

  const fourthSunday = getFourthSundayOfMonth();

  // 检查是否是今天
  if (now.getDate() !== fourthSunday.getDate()) return false;

  // 检查时间 00:00 - 19:55
  const hour = now.getHours();
  const minute = now.getMinutes();
  if (hour > 19 || (hour === 19 && minute > 55)) return false;

  return true;
});

const warGuessActivityTip = computed(() => {
  if (isWarGuessActivityOpen.value) return "";

  const fourthSunday = getFourthSundayOfMonth();
  const month = fourthSunday.getMonth() + 1;
  const date = fourthSunday.getDate();
  return `月赛助威仅在每月第四个周日 (${month}月${date}日) 00:00-19:55 开放`;
});

const selectedTokens = ref([]);
const selectedTokenObjects = computed(() => {
  if (!sortedTokens.value || !Array.isArray(sortedTokens.value)) return [];
  return selectedTokens.value
    .map(id => sortedTokens.value.find(t => t.id === id))
    .filter(t => t !== undefined);
});
const tokenStatus = ref({}); // { tokenId: 'waiting' | 'running' | 'completed' | 'failed' }
const isRunning = ref(false);
const shouldStop = ref(false);

// =====================
// Token分组管理状态
// =====================
const showGroupManageModal = ref(false);
const showGroupSelectModal = ref(false);
const selectedGroups = ref([]); // 选中的分组ID列表
const newGroupName = ref("");
const newGroupColor = ref("#1677ff");
const newGroupSelectedTokens = ref([]); // 新建分组时选中的Token ID列表
const editingGroupId = ref(null);
const editingGroupName = ref("");
const editingGroupColor = ref("");
const taskScheduleSelectedGroupIds = ref([]); // 定时任务中通过分组按钮选中的分组ID列表
const groupColors = [
  "#1677ff", // 蓝色
  "#52c41a", // 绿色
  "#faad14", // 橙色
  "#f5222d", // 红色
  "#722ed1", // 紫色
  "#13c2c2", // 青色
  "#eb2f96", // 粉色
  "#fa8c16", // 赤红色
];

// ======================
// War Guess Feature
// ======================
const showWarGuessModal = ref(false);
const warGuessList = ref([]);
const warGuessLoading = ref(false);
const warGuessCoin = ref(20);
const selectedWarGuessLegionId = ref(null);
const currentGuessCount = ref(0);

const formatPower = (power) => {
  if (!power) return "0";
  if (power >= 100000000) {
    return (power / 100000000).toFixed(2) + "亿";
  }
  if (power >= 10000) {
    return (power / 10000).toFixed(2) + "万";
  }
  return power.toString();
};

// =====================
// 黑市周功能
// =====================
const BLACK_MARKET_CONFIG = {
  // 首次黑市周开启时间：2026年3月6日 12:00（周五）
  firstOpenTime: new Date('2026-03-06T12:00:00').getTime(),
  // 黑市周开启时长：6天12小时（周五12:00到下周五00:00）
  openDuration: 6 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000,
  // 周期：3周（毫秒），每3周一次黑市周
  cycleDuration: 3 * 7 * 24 * 60 * 60 * 1000
};

const blackMarketCountdown = ref("");

// 黑市周状态
const isBlackMarketWeek = computed(() => {
  const blackMarketStatus = isBlackMarketOpen();
  return blackMarketStatus.isOpen;
});

const isBlackMarketUpdated = computed(() => {
  const blackMarketStatus = isBlackMarketOpen();
  return blackMarketStatus.isOpen;
});

const isBlackMarketOpen = () => {
  const now = Date.now();
  const { firstOpenTime, cycleDuration, openDuration } = BLACK_MARKET_CONFIG;
  const cyclesSinceFirst = Math.floor((now - firstOpenTime) / cycleDuration);
  const currentOpenTime = firstOpenTime + cyclesSinceFirst * cycleDuration;
  const currentCloseTime = currentOpenTime + openDuration;
  return {
    isOpen: now >= currentOpenTime && now < currentCloseTime,
    openTime: currentOpenTime,
    closeTime: currentCloseTime,
    nextOpenTime: currentOpenTime + cycleDuration,
  };
};

// 格式化倒计时
const formatBlackMarketCountdown = (targetTime) => {
  const now = Date.now();
  const diff = targetTime - now;
  
  if (diff <= 0) return '已开启';
  
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  
  if (days > 0) {
    return `${days}天${hours}小时`;
  } else if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  } else {
    return `${minutes}分钟`;
  }
};

// 更新黑市周倒计时
const updateBlackMarketStatus = () => {
  const status = isBlackMarketOpen();
  if (status.isOpen) {
    blackMarketCountdown.value = `剩余: ${formatBlackMarketCountdown(status.closeTime)}`;
  } else {
    blackMarketCountdown.value = `开启: ${formatBlackMarketCountdown(status.openTime)}`;
  }
};

const warGuessColumns = [
  {
    type: "selection",
    multiple: false,
  },
  { title: "ID", key: "id", width: 100 },
  {
    title: "头像",
    key: "logo",
    render(row) {
      return h("img", {
        src: row.logo,
        style: { width: "30px", height: "30px", borderRadius: "50%" },
      });
    },
    width: 60,
  },
  { title: "区服", key: "serverId", width: 80 },
  { title: "俱乐部", key: "name", width: 120 },
  {
    title: "战力",
    key: "power",
    render(row) {
      return formatPower(row.power);
    },
    width: 100,
  },
  { title: "红淬", key: "quenchNum" },
  { title: "已助威", key: "guessNum" },
  {
    title: "总热度",
    key: "totalNum",
    render(row) {
      return formatPower(row.totalNum || 0);
    },
    width: 100,
  },
];

const warGuessRowProps = (row) => {
  return {
    style: "cursor: pointer",
    onClick: () => {
      selectedWarGuessLegionId.value = row.id;
    },
  };
};

const openWarGuessModal = () => {
  showWarGuessModal.value = true;
  // Reset selection
  selectedWarGuessLegionId.value = null;
  warGuessList.value = [];

  // Auto fetch if tokens selected
  if (selectedTokens.value.length > 0) {
    fetchWarGuessRank();
  }
};

const fetchWarGuessRank = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择一个账号用于获取月赛助威数据");
    return;
  }

  const tokenId = selectedTokens.value[0];
  const token = tokens.value.find((t) => t.id === tokenId);

  warGuessLoading.value = true;
  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在使用 ${token.name} 获取月赛助威数据...`,
      type: "info",
    });

    // Ensure connection
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status !== "connected") {
      tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
      await new Promise((r) => setTimeout(r, 2000)); // Wait for connection
    }

    // Fetch rank
    const res = await tokenStore.sendMessageWithPromise(
      tokenId,
      "warguess_getrank",
      { bfId: "" },
      5000,
    );

    if (res && res.list) {
      let list = [];
      if (Array.isArray(res.list)) {
        list = res.list;
      } else {
        list = Object.values(res.list);
      }

      // Sort by totalNum desc
      warGuessList.value = list
        .sort((a, b) => (b.totalNum || 0) - (a.totalNum || 0))
        .slice(0, 20);
    } else {
      message.warning("获取月赛助威数据为空");
    }
  } catch (error) {
    console.error("Fetch rank error:", error);
    message.error("获取月赛助威数据失败: " + error.message);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `获取月赛助威数据失败: ${error.message}`,
      type: "error",
    });
  } finally {
    warGuessLoading.value = false;
  }
};

const handleWarGuessCheer = async () => {
  if (!selectedWarGuessLegionId.value) {
    message.warning("请先选择一个俱乐部");
    return;
  }
  // Close modal
  showWarGuessModal.value = false;
  // Call the batch function
  await batchWarGuessCheer(selectedWarGuessLegionId.value, warGuessCoin.value);
};

// Settings Modal State
const showSettingsModal = ref(false);
const currentSettingsTokenId = ref(null);
const currentSettingsTokenName = ref("");
const currentSettings = reactive({
  arenaFormation: 1,
  towerFormation: 1,
  weirdTowerFormation: 1,
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
});

// Task Template State
const showTaskTemplateModal = ref(false);
const showApplyTemplateModal = ref(false);
const showTemplateManagerModal = ref(false);
const showAccountTemplateModal = ref(false);
const taskTemplates = ref([]);
const selectedTemplateId = ref(null);
const selectedTokensForApply = ref([]);
const currentTemplateName = ref("");
const currentTemplateId = ref(null); // 用于编辑现有模板
const currentTemplate = reactive({
  arenaFormation: 1,
  towerFormation: 1,
  weirdTowerFormation: 1,
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
});

// Account Template References
const accountTemplateReferences = ref([]);
const filteredAccountTemplates = ref([]);
const selectedTemplateForFilter = ref(null);

// Computed for Apply Template
const isAllSelectedForApply = computed(() => {
  return (
    selectedTokensForApply.value.length === sortedTokens.value.length &&
    sortedTokens.value.length > 0
  );
});

const isIndeterminateForApply = computed(() => {
  return (
    selectedTokensForApply.value.length > 0 &&
    selectedTokensForApply.value.length < sortedTokens.value.length
  );
});

// Computed for Template Manager
const filteredTaskTemplates = computed(() => {
  return taskTemplates.value;
});

// Helper Modal State
const showHelperModal = ref(false);
const helperType = ref("box"); // 'box' | 'fish' | 'recruit'
const helperSettings = reactive({
  boxType: 2001,
  fishType: 1,
  count: 100,
  targetPoints: 1000,
});

const helperModalTitle = computed(() => {
  const titles = {
    box: "批量开宝箱",
    fish: "批量钓鱼",
    recruit: "批量招募",
    pointsBox: "按积分开箱",
  };
  return titles[helperType.value] || "批量助手";
});

// Batch Settings State
const showBatchSettingsModal = ref(false);

const defaultDreamPurchaseList = [];
for (const merchantId in goldItemsConfig) {
  goldItemsConfig[merchantId].forEach((index) => {
    defaultDreamPurchaseList.push(`${merchantId}-${index}`);
  });
}

const batchSettings = reactive({
  dreamPurchaseList: defaultDreamPurchaseList,
  boxCount: 100,
  fishCount: 100,
  recruitCount: 100,
  defaultBoxType: 2001,
  defaultFishType: 1,
  targetBoxPoints: 1000,
  receiverId: "",
  password: "",
  tokenListColumns: 2,
  useGoldRefreshFallback: false,
  // 延迟配置（毫秒）
  commandDelay: 500, // 命令间延迟
  taskDelay: 500, // 任务间延迟
  actionDelay: 300, // 一般操作延迟（开箱、钓鱼、招募等）
  battleDelay: 500, // 战斗延迟（宝库、竞技场等）
  refreshDelay: 1000, // 刷新延迟（发车刷新等）
  longDelay: 3000, // 长延迟（功法赠送等）
  // 其他配置
  maxActive: 2,
  carMinColor: 4,
  connectionTimeout: 10000,
  reconnectDelay: 1000,
  maxLogEntries: 1000,
  // 页面刷新配置
  enableRefresh: false,
  refreshInterval: 360, // 分钟
  smartDepartureGoldThreshold: 0,
  smartDepartureRecruitThreshold: 0,
  smartDepartureJadeThreshold: 0,
  smartDepartureTicketThreshold: 0,
  smartDepartureMatchAll: false,
  // 活动暂停功能配置
  enablePauseTime: false,
  enableRobFuTime: false,
  robFuTimeName: "抢符",
  robFuStartTime: "20:00",
  robFuEndTime: "22:00",
  robFuTimeFrequency: "daily",
  robFuTimeDayOfWeek: 1,
  enableSaltFieldTime: false,
  saltFieldName: "周六盐场",
  saltFieldStartTime: "20:00",
  saltFieldEndTime: "22:00",
  saltFieldFrequency: "weekly",
  saltFieldDayOfWeek: 6,
  enableSundaySaltFieldTime: false,
  sundaySaltFieldName: "周日盐场",
  sundaySaltFieldStartTime: "20:00",
  sundaySaltFieldEndTime: "22:00",
  sundaySaltFieldFrequency: "weekly",
  sundaySaltFieldDayOfWeek: 0,
  enableGameUpdateTime: false,
  gameUpdateName: "游戏更新",
  gameUpdateStartTime: "00:00",
  gameUpdateEndTime: "04:00",
  gameUpdateFrequency: "daily",
  gameUpdateDayOfWeek: 1,
  // 自定义暂停时间配置
  enableCustomPauseTime1: false,
  customPauseTime1Name: "自定义暂停1",
  customPauseTime1Start: "00:00",
  customPauseTime1End: "00:00",
  customPauseTime1Frequency: "daily",
  customPauseTime1DayOfWeek: 1,
  enableCustomPauseTime2: false,
  customPauseTime2Name: "自定义暂停2",
  customPauseTime2Start: "00:00",
  customPauseTime2End: "00:00",
  customPauseTime2Frequency: "daily",
  customPauseTime2DayOfWeek: 1,
  enableCustomPauseTime3: false,
  customPauseTime3Name: "自定义暂停3",
  customPauseTime3Start: "00:00",
  customPauseTime3End: "00:00",
  customPauseTime3Frequency: "daily",
  customPauseTime3DayOfWeek: 1,
  enableCustomPauseTime4: false,
  customPauseTime4Name: "自定义暂停4",
  customPauseTime4Start: "00:00",
  customPauseTime4End: "00:00",
  customPauseTime4Frequency: "daily",
  customPauseTime4DayOfWeek: 1,
  // 界面设置
  hideScheduledTasksModule: false,
  // 智能发车条件设置
  enableMaxCarRefresh: true, // 启用最大刷新次数限制
  maxCarRefreshCount: 1,   // 每辆车最大刷新次数
  // 分批执行设置
  enableBatchExecution: true,
  batchSize: 5,
  batchDelay: 5,
  enableQueueOnConflict: true,
  // 推送通知设置
  pushNotificationEnabled: false,
  pushProvider: "serverchan",
  pushToken: "",
});

// 推送提供商选项
const pushProviderOptions = [
  { label: 'PushPlus（推送加）', value: 'pushplus' },
  { label: 'Bark', value: 'bark' },
  { label: 'ServerChan（Server酱）', value: 'serverchan' }
];

// 测试推送状态
const testingPush = ref(false);

// 测试推送
const testPushNotification = async () => {
  testingPush.value = true;
  try {
    const result = await testPushNotificationUtil();
    if (result) {
      message.success('测试推送发送成功');
    } else {
      message.error('测试推送发送失败，请检查配置');
    }
  } catch (error) {
    message.error('测试推送失败: ' + error.message);
  } finally {
    testingPush.value = false;
  }
};

// 获取Token占位符
const getPushTokenPlaceholder = () => {
  switch (batchSettings.pushProvider) {
    case 'pushplus':
      return '请输入 PushPlus Token';
    case 'bark':
      return '请输入 Bark Key';
    case 'serverchan':
      return '请输入 ServerChan SendKey';
    default:
      return '请输入 Token';
  }
};

// 获取Token帮助文本
const getPushTokenHelp = () => {
  switch (batchSettings.pushProvider) {
    case 'pushplus':
      return 'PushPlus: 填 token，获取地址 pushplus.plus';
    case 'bark':
      return 'Bark: 填 key 或完整 URL，获取地址 day.app';
    case 'serverchan':
      return 'ServerChan: 填 SendKey，获取地址 sct.ftqq.com';
    default:
      return '';
  }
};

// Load batch settings from localStorage
const loadBatchSettings = () => {
  try {
    const saved = localStorage.getItem("batchSettings");
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(batchSettings, parsed);
    }
  } catch (error) {
    console.error("Failed to load batch settings:", error);
  }
};

// Save batch settings to localStorage
const saveBatchSettings = () => {
  try {
    localStorage.setItem("batchSettings", JSON.stringify(batchSettings));
    
    // 保存推送配置
    savePushConfig({
      enabled: batchSettings.pushNotificationEnabled,
      provider: batchSettings.pushProvider,
      token: batchSettings.pushToken
    });
    
    message.success("定时批量任务设置已保存");
    showBatchSettingsModal.value = false;
  } catch (error) {
    console.error("Failed to save batch settings:", error);
    message.error("保存设置失败");
  }
};

// Open batch settings modal
const openBatchSettings = () => {
  loadBatchSettings();
  // 加载推送配置
  const pushConfig = getPushConfig();
  batchSettings.pushNotificationEnabled = pushConfig.enabled;
  batchSettings.pushProvider = pushConfig.provider;
  batchSettings.pushToken = pushConfig.token;
  showBatchSettingsModal.value = true;
};

// Load settings on component mount
loadBatchSettings();

// ======================
// Legacy Gift Feature
// ======================

// Legacy Gift Modal State
const showLegacyGiftModal = ref(false);
const recipientIdInput = ref("");
const recipientIdError = ref("");
const recipientInfo = ref(null);
const isQueryingRecipient = ref(false);
const giftQuantity = ref(10);
const securityPassword = ref(""); // 安全密码
// 头像加载状态
const isAvatarLoading = ref(false);
const avatarLoadError = ref(false);

// ======================
// Scheduled Tasks Feature
// ======================

// Scheduled Tasks State Management
const scheduledTasks = ref([]); // List of all scheduled tasks
const showTaskModal = ref(false); // Control the visibility of the add/edit task modal
const showTasksModal = ref(false); // Control the visibility of the tasks list modal
const showBlackMarketBuyerModal = ref(false); // Control the visibility of the black market buyer modal
const editingTask = ref(null); // Currently editing task
const taskForm = reactive({
  name: "", // Task name
  runType: "daily", // 'daily' or 'cron'
  runTime: null, // Daily run time (HH:mm format)
  cronExpression: "", // Cron expression for complex scheduling
  selectedTokens: [], // Selected token IDs
  selectedTasks: [], // Selected task function names
  enabled: true, // Whether the task is enabled
});

// 任务分组定义
const taskGroupDefinitions = [
  {
    name: "daily",
    label: "日常",
    tasks: [
      "startBatch",
      "claimHangUpRewards",
      "batchAddHangUpTime",
      "resetBottles",
      "batchlingguanzi",
      "batchclubsign",
      "batchStudy",
      "batcharenafight",
      "batchSmartSendCar",
      "batchClaimCars",
      "store_purchase",
      "collection_claimfreereward",
      "batchGenieSweep",
    ],
  },
  {
    name: "dungeon",
    label: "副本",
    tasks: [
      "climbTower",
      "batchmengjing",
      "skinChallenge",
      "batchClaimPeachTasks",
      "batchBuyDreamItems",
    ],
  },
  { name: "baoku", label: "宝库", tasks: ["batchbaoku13", "batchbaoku45"] },
  {
    name: "weirdTower",
    label: "怪异塔",
    tasks: [
      "climbWeirdTower",
      "batchUseItems",
      "batchMergeItems",
      "batchClaimFreeEnergy",
    ],
  },
  {
    name: "resource",
    label: "资源",
    tasks: [
      "batchOpenBox",
      "batchOpenBoxByPoints",
      "batchClaimBoxPointReward",
      "batchFish",
      "batchRecruit",
      "legion_storebuygoods",
    ],
  },
  {
    name: "legacy",
    label: "功法",
    tasks: ["batchLegacyClaim", "batchLegacyGiftSendEnhanced"],
  },
  {
    name: "monthly",
    label: "月度",
    tasks: ["batchTopUpFish", "batchTopUpArena"],
  },
];

// 计算属性，根据 taskGroupDefinitions 将 availableTasks 分组
const groupedAvailableTasks = computed(() => {
  const groups = {};
  taskGroupDefinitions.forEach((group) => {
    groups[group.name] = availableTasks.filter((task) =>
      group.tasks.includes(task.value),
    );
  });

  // 处理未分组的任务
  const groupedTaskValues = taskGroupDefinitions.flatMap((g) => g.tasks);
  const otherTasks = availableTasks.filter(
    (task) => !groupedTaskValues.includes(task.value),
  );
  if (otherTasks.length > 0) {
    groups["other"] = otherTasks;
  }

  return groups;
});

// Cron表达式解析相关变量
const cronValidation = ref({ valid: true, message: "" });
const cronNextRuns = ref([]);

// 注: availableTasks, CarresearchItem, taskColumns 已从 @/utils/batch 导入

// ======================
// Scheduled Tasks Storage
// ======================

// Track executing tasks for UI loading state
const executingTaskIds = ref([]);

// Manual execute task
const manualExecuteTask = async (task) => {
  if (executingTaskIds.value.includes(task.id)) return;

  // Reset stop flag if not running, to allow manual execution
  if (!isRunning.value && shouldStop.value) {
    shouldStop.value = false;
  }

  executingTaskIds.value.push(task.id);
  try {
    message.info(`开始执行任务: ${task.name}`);
    await executeScheduledTask(task);
    message.success(`任务 ${task.name} 执行完成`);
  } catch (e) {
    console.error(`执行任务 ${task.name} 失败:`, e);
    message.error(`任务 ${task.name} 执行失败`);
  } finally {
    executingTaskIds.value = executingTaskIds.value.filter(
      (id) => id !== task.id,
    );
  }
};

// 从localStorage加载任务队列
const loadTaskQueueFromStorage = () => {
  // 优先从新的键名加载
  const savedQueue = safeLocalStorage.getItem('batch_task_queue');
  if (savedQueue && typeof savedQueue === 'string' && savedQueue !== 'undefined') {
    try {
      const parsedQueue = JSON.parse(savedQueue);
      if (Array.isArray(parsedQueue)) {
        // 清空现有队列
        batchTaskStore.clearTaskQueue();
        // 添加从本地存储加载的任务
        parsedQueue.forEach(task => {
          batchTaskStore.addToTaskQueue(task);
        });
        if (batchTaskStore.taskQueue && batchTaskStore.taskQueue.length > 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 从本地存储加载了 ${batchTaskStore.taskQueue.length} 个积攒任务 ===`,
            type: "info",
          });
        }
      }
    } catch (error) {
      console.error('加载任务队列失败:', error);
      // 重要修复：加载失败时不清空队列，保留现有队列数据
      // 避免数据丢失，只在明确需要清空时才清空
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 加载积攒队列失败: ${error.message}，保留现有队列 ===`,
        type: "warning",
      });
    }
  }

  // 清理旧的键名
  safeLocalStorage.removeItem('taskQueue');
};

// 保存任务队列到localStorage
const saveTaskQueueToStorage = () => {
  try {
    // 验证任务队列数据结构，确保可以安全序列化
    const queue = batchTaskStore.taskQueue || [];
    if (!Array.isArray(queue)) {
      console.error('任务队列不是数组:', queue);
      return;
    }

    // 限制队列长度，避免存储过大的数据
    const limitedQueue = queue.slice(0, 50); // 最多保存50个任务

    // 序列化前进行数据清理，移除可能导致循环引用的属性
    const sanitizedQueue = limitedQueue.map(task => {
      const sanitizedTask = { ...task };
      // 移除可能导致序列化问题的属性
      if (sanitizedTask.params) {
        // 只保留必要的参数
        sanitizedTask.params = { ...sanitizedTask.params };
        // 移除可能包含循环引用的复杂对象
        Object.keys(sanitizedTask.params).forEach(key => {
          const value = sanitizedTask.params[key];
          if (typeof value === 'object' && value !== null) {
            // 简化复杂对象
            try {
              JSON.stringify(value); // 测试是否可以序列化
            } catch {
              // 如果不能序列化，移除该属性
              delete sanitizedTask.params[key];
            }
          }
        });
      }
      return sanitizedTask;
    });

    const serialized = JSON.stringify(sanitizedQueue);
    safeLocalStorage.setItem('batch_task_queue', serialized);
  } catch (error) {
    console.error('保存任务队列失败:', error);
    // 重要修复：保存失败时不清空存储，避免数据丢失
    // 只在明确需要清空时才清空
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 保存积攒队列失败: ${error.message}，保留现有数据 ===`,
      type: "warning",
    });
  }
};

// 清空任务队列
const clearTaskQueue = () => {
  try {
    batchTaskStore.clearTaskQueue();
    safeLocalStorage.removeItem('taskQueue');
    safeLocalStorage.removeItem('batch_task_queue');
    addLog({
      time: new Date().toLocaleTimeString(),
      message: '=== 任务队列已清空 ===',
      type: "info",
    });
  } catch (error) {
    console.error('清空任务队列失败:', error);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 清空任务队列失败: ${error.message} ===`,
      type: "error",
    });
  }
};

// 监听任务队列变化，自动保存
watch(() => batchTaskStore.taskQueue, () => {
  saveTaskQueueToStorage();
}, { deep: true });

// Load scheduled tasks from localStorage
const loadScheduledTasks = () => {
  try {
    const saved = localStorage.getItem("scheduledTasks");

    if (saved) {
      const parsed = JSON.parse(saved);

      // Ensure we have an array
      scheduledTasks.value = Array.isArray(parsed) ? parsed : [];
    } else {
      scheduledTasks.value = [];
    }
  } catch (error) {
    console.error("Failed to load scheduled tasks:", error);
    scheduledTasks.value = [];
  }
};

// Save scheduled tasks to localStorage
const saveScheduledTasks = () => {
  try {
    const dataToSave = JSON.stringify(scheduledTasks.value);

    localStorage.setItem("scheduledTasks_v2", dataToSave);
    // Verify save was successful
    const saved = localStorage.getItem("scheduledTasks_v2");
  } catch (error) {
    console.error("Failed to save scheduled tasks:", error);
  }
};

// Open task modal for adding new task
const openTaskModal = () => {
  editingTask.value = null;
  Object.assign(taskForm, {
    name: "",
    runType: "daily",
    runTime: undefined,
    cronExpression: "",
    selectedTokens: [],
    selectedTasks: [],
    enabled: true,
  });
  taskScheduleSelectedGroupIds.value = [];
  showTaskModal.value = true;
};

// Edit existing task
const editTask = (task) => {
  editingTask.value = task;
  const taskData = { ...task };
  if (
    task.runType === "daily" &&
    task.runTime &&
    typeof task.runTime === "string"
  ) {
    const [hours, minutes] = task.runTime.split(":").map(Number);
    const now = new Date();
    taskData.runTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
    );
  }
  Object.assign(taskForm, taskData);
  taskScheduleSelectedGroupIds.value = [];
  showTaskModal.value = true;
};

// 注: validateCronExpression 已从 @/utils/batch 导入

// Parse cron expression and calculate next execution times
const parseCronExpression = (expression) => {
  // Validate the expression first
  const validation = validateCronExpression(expression);
  cronValidation.value = validation;

  if (!validation.valid) {
    cronNextRuns.value = [];
    return;
  }

  // Parse the expression and calculate next runs
  const cronParts = expression.split(" ").filter(Boolean);
  const [minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField] =
    cronParts;

  // Calculate next 5 execution times
  const nextRuns = calculateNextRuns(
    minuteField,
    hourField,
    dayOfMonthField,
    monthField,
    dayOfWeekField,
    5,
  );
  cronNextRuns.value = nextRuns;
};

// 注: calculateNextRuns 已从 @/utils/batch 导入

// Save task (create or update)
const saveTask = () => {
  if (!taskForm.name) {
    message.warning("请输入任务名称");
    return;
  }

  if (taskForm.runType === "daily" && !taskForm.runTime) {
    message.warning("请选择运行时间");
    return;
  }

  if (taskForm.runType === "cron") {
    if (!taskForm.cronExpression) {
      message.warning("请输入Cron表达式");
      return;
    }

    // Validate cron expression
    const validation = validateCronExpression(taskForm.cronExpression);
    if (!validation.valid) {
      message.warning(validation.message);
      return;
    }
  }

  if (taskForm.selectedTokens.length === 0) {
    message.warning("请选择至少一个账号");
    return;
  }

  if (taskForm.selectedTasks.length === 0) {
    message.warning("请选择至少一个任务");
    return;
  }

  // Format runTime as string for storage
  let formattedRunTime = null;
  if (taskForm.runType === "daily" && taskForm.runTime) {
    const time = new Date(taskForm.runTime);
    formattedRunTime = time.toLocaleTimeString("zh-CN", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const taskData = {
    id: editingTask.value?.id || "task_" + Date.now(),
    name: taskForm.name,
    runType: taskForm.runType,
    runTime: formattedRunTime,
    cronExpression: taskForm.runType === "cron" ? taskForm.cronExpression : "",
    selectedTokens: [...taskForm.selectedTokens],
    selectedTasks: [...taskForm.selectedTasks],
    enabled: taskForm.enabled,
  };

  let isNew = !editingTask.value;

  if (editingTask.value) {
    // Update existing task
    const index = scheduledTasks.value.findIndex(
      (t) => t.id === editingTask.value.id,
    );
    if (index !== -1) {
      scheduledTasks.value[index] = taskData;
    }
  } else {
    // Add new task
    scheduledTasks.value.push(taskData);
  }

  saveScheduledTasks();

  // Add log entry for task save
  addTaskSaveLog(taskData, isNew, addLog);

  showTaskModal.value = false;
  message.success("定时任务已保存");
};

// Delete task
const deleteTask = (taskId) => {
  const task = scheduledTasks.value.find((t) => t.id === taskId);
  if (task) {
    scheduledTasks.value = scheduledTasks.value.filter((t) => t.id !== taskId);
    saveScheduledTasks();
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务 ${task.name} 已删除 ===`,
      type: "info",
    });
    message.success("定时任务已删除");
  }
};

// Toggle task enabled state
const toggleTaskEnabled = (taskId, enabled) => {
  const task = scheduledTasks.value.find((t) => t.id === taskId);
  if (task) {
    task.enabled = enabled;
    saveScheduledTasks();
    message.success(`定时任务已${enabled ? "启用" : "禁用"}`);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务 ${task.name} 已${enabled ? "启用" : "禁用"} ===`,
      type: "info",
    });
  }
};

// 注: addTaskSaveLog 已从 @/utils/batch 导入，调用时需传入 addLog

// Reset run type related fields
const resetRunType = () => {
  if (taskForm.runType === "daily") {
    taskForm.cronExpression = "";
  } else {
    taskForm.runTime = undefined;
  }
};

// Select all tokens
const selectAllTokens = () => {
  taskForm.selectedTokens = tokens.value.map((token) => token.id);
};

// Deselect all tokens
const deselectAllTokens = () => {
  taskForm.selectedTokens = [];
};

// Select all tasks
const selectAllTasks = () => {
  taskForm.selectedTasks = availableTasks.map((task) => task.value);
};

// Deselect all tasks
const deselectAllTasks = () => {
  taskForm.selectedTasks = [];
};

// ======================
// Import/Export Config
// ======================

// Export all tokens and scheduled tasks configuration
const exportConfig = () => {
  try {
    // Get all valid token IDs
    const validTokenIds = new Set(tokens.value.map((t) => t.id));

    // Filter scheduled tasks: remove invalid token IDs from selectedTokens
    const filteredScheduledTasks = scheduledTasks.value
      .map((task) => ({
        ...task,
        selectedTokens:
          task.selectedTokens?.filter((tokenId) =>
            validTokenIds.has(tokenId),
          ) || [],
      }))
      .filter((task) => task.selectedTokens.length > 0); // Remove tasks with no valid tokens

    // Gather token settings
    const tokenSettings = [];
    tokens.value.forEach((token) => {
      const settings = localStorage.getItem(`daily-settings:${token.id}`);
      if (settings) {
        try {
          tokenSettings.push({
            tokenId: token.id,
            settings: JSON.parse(settings),
          });
        } catch (e) {
          console.warn(`Failed to parse settings for token ${token.id}`, e);
        }
      }
    });

    // 导出阵容数据
    const savedLineups = {};
    tokens.value.forEach((token) => {
      const key = `saved_lineups_${token.id}`;
      const data = localStorage.getItem(key);
      if (data) {
        try {
          savedLineups[token.id] = JSON.parse(data);
        } catch (e) {
          console.warn(`解析阵容数据失败 (${token.id}):`, e);
        }
      }
    });

    // 导出任务模板
    let taskTemplates = [];
    try {
      const saved = localStorage.getItem("task-templates");
      if (saved) {
        const parsed = JSON.parse(saved);
        taskTemplates = Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.warn('获取任务模板失败', e);
    }

    // 导出账号排序配置
    let tokenSortConfig = null;
    try {
      const saved = localStorage.getItem("tokenSortConfig");
      if (saved) {
        tokenSortConfig = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('获取账号排序配置失败', e);
    }

    // 导出分组配置
    let tokenGroupsData = [];
    try {
      const saved = localStorage.getItem("tokenGroups");
      if (saved) {
        tokenGroupsData = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('获取分组配置失败', e);
    }

    const exportData = {
      version: "1.3",
      exportTime: new Date().toISOString(),
      tokens: tokens.value.map((t) => ({
        id: t.id,
        name: t.name,
        token: t.token,
        server: t.server,
        wsUrl: t.wsUrl,
        remark: t.remark,
        importMethod: t.importMethod,
        sourceUrl: t.sourceUrl,
        upgradedToPermanent: true,
        upgradedAt: t.upgradedAt,
        updatedAt: t.updatedAt,
      })),
      scheduledTasks: filteredScheduledTasks,
      batchSettings: {
        boxCount: batchSettings.boxCount,
        fishCount: batchSettings.fishCount,
        recruitCount: batchSettings.recruitCount,
        defaultBoxType: batchSettings.defaultBoxType,
        defaultFishType: batchSettings.defaultFishType,
        carMinColor: batchSettings.carMinColor,
        commandDelay: batchSettings.commandDelay,
        taskDelay: batchSettings.taskDelay,
        actionDelay: batchSettings.actionDelay,
        battleDelay: batchSettings.battleDelay,
        refreshDelay: batchSettings.refreshDelay,
        longDelay: batchSettings.longDelay,
        maxActive: batchSettings.maxActive,
        tokenListColumns: batchSettings.tokenListColumns,
        useGoldRefreshFallback: batchSettings.useGoldRefreshFallback,
        smartDepartureGoldThreshold: batchSettings.smartDepartureGoldThreshold,
        smartDepartureRecruitThreshold:
          batchSettings.smartDepartureRecruitThreshold,
        smartDepartureJadeThreshold: batchSettings.smartDepartureJadeThreshold,
        smartDepartureTicketThreshold:
          batchSettings.smartDepartureTicketThreshold,
        smartDepartureMatchAll: batchSettings.smartDepartureMatchAll,
      },
      tokenSettings: tokenSettings,
      taskTemplates: taskTemplates,
      tokenSortConfig: tokenSortConfig,
      tokenGroups: tokenGroupsData,
      savedLineups: savedLineups,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `xyzw_config_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const lineupsCount = Object.keys(exportData.savedLineups || {}).length;
    const templatesCount = exportData.taskTemplates?.length || 0;
    const groupsCount = exportData.tokenGroups?.length || 0;
    message.success(
      `导出成功: ${exportData.tokens.length} 个账号, ${exportData.scheduledTasks.length} 个定时任务${templatesCount > 0 ? `, ${templatesCount} 个任务模板` : ''}${groupsCount > 0 ? `, ${groupsCount} 个分组` : ''}${lineupsCount > 0 ? `, ${lineupsCount} 个账号的阵容` : ''}`,
    );
  } catch (error) {
    console.error("Export failed:", error);
    message.error("导出失败: " + error.message);
  }
};

// Import tokens and scheduled tasks configuration
const importConfig = async ({ file }) => {
  const decodeBase64 = (str) => {
    try {
      str = str.replace(/[\s\n\r]/g, '');
      try {
        return decodeURIComponent(escape(atob(str)));
      } catch (e) {
        const binary = atob(str);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
      }
    } catch (e) {
      throw new Error('Base64解码失败: ' + e.message);
    }
  };

  try {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let importData;
        let content = e.target.result;

        try {
          importData = JSON.parse(content);
          message.info('JSON格式，直接解析成功');
        } catch (jsonError) {
          try {
            const decodedContent = decodeBase64(content);
            message.info(`Base64解码成功，长度: ${decodedContent.length}`);
            importData = JSON.parse(decodedContent);
            message.info('JSON解析成功');
          } catch (base64Error) {
            console.error('Base64解码失败:', base64Error);
            throw new Error('文件格式错误：既不是有效的JSON文件，也不是Base64编码的JSON文件');
          }
        }

        const info = {
          version: importData.version,
          tokensCount: importData.tokens?.length,
          tasksCount: importData.scheduledTasks?.length,
          binCount: Object.keys(importData.binFiles || {}).length,
        };
        message.info(`配置版本: v${info.version}, ${info.tokensCount}账号, ${info.tasksCount}任务, ${info.binCount}BIN`);

        // Validate structure
        if (
          !importData.version ||
          !importData.tokens ||
          !importData.scheduledTasks
        ) {
          message.error("无效的配置文件格式");
          return;
        }

        let importedTokens = 0;
        let importedTasks = 0;

        // Import tokens
        if (Array.isArray(importData.tokens)) {
          message.info(`找到 ${importData.tokens.length} 个账号`);
          importData.tokens.forEach((token, idx) => {
            try {
              const existingToken = gameTokens.value.find(
                (t) => t.token === token.token || t.id === token.id || t.name === token.name
              );
              if (existingToken) {
                Object.assign(existingToken, token, {
                  upgradedToPermanent: true,
                  lastUsed: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
                importedTokens++;
              } else if (token.token) {
                gameTokens.value.push({
                  ...token,
                  importMethod: token.importMethod || "import",
                  upgradedToPermanent: true,
                  createdAt: new Date().toISOString(),
                  lastUsed: new Date().toISOString(),
                });
                importedTokens++;
              }
            } catch (tokenErr) {
              message.warning(`导入账号失败 ${idx + 1}: ${token.name}`);
              console.error(tokenErr);
            }
          });
          message.success(`账号导入完成: ${importedTokens} 个`);
        }

        // Import scheduled tasks
        if (Array.isArray(importData.scheduledTasks)) {
          message.info(`找到 ${importData.scheduledTasks.length} 个定时任务`);
          importData.scheduledTasks.forEach((importedTask, idx) => {
            try {
              const existingIndex = scheduledTasks.value.findIndex((t) => t.name === importedTask.name);
              if (existingIndex >= 0) {
                scheduledTasks.value[existingIndex] = importedTask;
              } else {
                scheduledTasks.value.push(importedTask);
              }
              importedTasks++;
            } catch (taskErr) {
              message.warning(`导入定时任务失败 ${idx + 1}: ${importedTask.name}`);
              console.error(taskErr);
            }
          });
          saveScheduledTasks();
          message.success(`定时任务导入完成: ${importedTasks} 个`);
        }

        // Import batch settings if provided
        if (importData.batchSettings) {
          Object.assign(batchSettings, importData.batchSettings);
          saveBatchSettings();
        }

        // Import token settings
        if (Array.isArray(importData.tokenSettings)) {
          importData.tokenSettings.forEach((item) => {
            if (item.tokenId && item.settings) {
              localStorage.setItem(
                `daily-settings:${item.tokenId}`,
                JSON.stringify(item.settings),
              );
            }
          });
        }

        // Import saved lineups
        if (importData.savedLineups && typeof importData.savedLineups === 'object') {
          let lineupsImportCount = 0;
          try {
            Object.entries(importData.savedLineups).forEach(([tokenId, lineups]) => {
              try {
                const key = `saved_lineups_${tokenId}`;
                localStorage.setItem(key, JSON.stringify(lineups));
                lineupsImportCount++;
              } catch (e) {
                console.warn(`导入阵容数据失败 (${tokenId}):`, e);
              }
            });
            if (lineupsImportCount > 0) {
              message.info(`阵容数据导入完成: ${lineupsImportCount} 个账号`);
            }
          } catch (e) {
            console.error('导入阵容数据失败:', e);
          }
        }

        // Import task templates
        if (importData.taskTemplates && Array.isArray(importData.taskTemplates)) {
          try {
            localStorage.setItem("task-templates", JSON.stringify(importData.taskTemplates));
            message.info(`任务模板导入完成: ${importData.taskTemplates.length} 个`);
          } catch (e) {
            console.error('导入任务模板失败:', e);
          }
        }

        // Import token sort config
        if (importData.tokenSortConfig) {
          try {
            localStorage.setItem("tokenSortConfig", JSON.stringify(importData.tokenSortConfig));
            message.info('账号排序配置已导入');
          } catch (e) {
            console.error('导入排序配置失败:', e);
          }
        }

        // Import token groups
        if (importData.tokenGroups && Array.isArray(importData.tokenGroups)) {
          try {
            localStorage.setItem("tokenGroups", JSON.stringify(importData.tokenGroups));
            message.info(`分组配置导入完成: ${importData.tokenGroups.length} 个`);
          } catch (e) {
            console.error('导入分组配置失败:', e);
          }
        }

        const lineupsCount = Object.keys(importData.savedLineups || {}).length;
        const templatesCount = importData.taskTemplates?.length || 0;
        const groupsCount = importData.tokenGroups?.length || 0;
        message.success(
          `导入成功: ${importedTokens} 个新账号, ${importedTasks} 个新定时任务${templatesCount > 0 ? `, ${templatesCount} 个任务模板` : ''}${groupsCount > 0 ? `, ${groupsCount} 个分组` : ''}${lineupsCount > 0 ? `, ${lineupsCount} 个账号的阵容` : ''}`,
        );
      } catch (parseError) {
        console.error("Parse error:", parseError);
        message.error("解析配置文件失败");
      }
    };
    reader.readAsText(file.file);
  } catch (error) {
    console.error("Import failed:", error);
    message.error("导入失败: " + error.message);
  }
};

// ======================
// Scheduled Tasks Countdown
// ======================

// 注: parseCronField, calculateNextExecutionTime, formatTimeDifference 已从 @/utils/batch 导入

// Task countdowns ref
const taskCountdowns = ref({});
const nextExecutionTimes = ref({});

// Update countdowns for all tasks
const updateCountdowns = () => {
  const now = Date.now();

  scheduledTasks.value.forEach((task) => {
    if (!task.enabled) {
      // Clear countdown for disabled tasks
      delete taskCountdowns.value[task.id];
      return;
    }

    if (
      !nextExecutionTimes.value[task.id] ||
      nextExecutionTimes.value[task.id] <= now
    ) {
      // Calculate next execution time if not set or passed
      nextExecutionTimes.value[task.id] = calculateNextExecutionTime(task);
    }

    if (nextExecutionTimes.value[task.id]) {
      const timeDiff = nextExecutionTimes.value[task.id] - now;
      taskCountdowns.value[task.id] = {
        remainingTime: Math.max(0, timeDiff),
        formatted: formatTimeDifference(Math.max(0, timeDiff)),
        isNearExecution: timeDiff < 5 * 60 * 1000, // Less than 5 minutes
      };
    }
  });
};

// 计算最短倒计时任务
const shortestCountdownTask = computed(() => {
  if (scheduledTasks.value.length === 0) return null;

  let shortestTask = null;
  let shortestTime = Infinity;

  // 遍历所有任务，找到倒计时最短的任务
  scheduledTasks.value.forEach((task) => {
    if (!task.enabled) return;

    const countdown = taskCountdowns.value[task.id];
    if (countdown && countdown.remainingTime < shortestTime) {
      shortestTime = countdown.remainingTime;
      shortestTask = {
        task,
        countdown,
      };
    }
  });

  return shortestTask;
});

// Start countdown interval
let countdownInterval = null;

const startCountdown = () => {
  // Clear any existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Update countdowns immediately
  updateCountdowns();

  // Update countdowns every second
  countdownInterval = setInterval(updateCountdowns, 1000);
};

const RUNNING_TASK_KEY = 'running_task_info';

// 保存正在执行的任务信息（简化版，只保存任务配置，不保存进度）
const saveRunningTask = (task) => {
  try {
    safeLocalStorage.setItem(RUNNING_TASK_KEY, JSON.stringify({
      ...task,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('保存运行中任务失败:', e);
  }
};

// 清除运行中的任务信息
const clearRunningTask = () => {
  safeLocalStorage.removeItem(RUNNING_TASK_KEY);
};

// Flag to prevent concurrent execution of queued tasks
const isExecutingQueuedTasks = ref(false);

// Start resume check timer
// 重要：此定时器只负责检测暂停时间结束，不直接执行积攒队列
// 积攒队列的执行统一由 checkAndExecuteQueuedTasks 处理
const startResumeCheck = () => {
  if (resumeCheckInterval.value) {
    clearInterval(resumeCheckInterval.value);
  }

  let hasLoggedResume = false;
  let wasPaused = false;

  resumeCheckInterval.value = setInterval(() => {
    const queue = batchTaskStore.taskQueue || [];
    const isCurrentlyPaused = isPauseTime.value.paused;

    // 检测暂停时间结束（从暂停状态变为非暂停状态）
    if (wasPaused && !isCurrentlyPaused) {
      hasLoggedResume = false;
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 暂停时间结束，检测到积攒队列中有 ${queue.length} 个任务 ===`,
        type: "info",
      });
      // 暂停时间结束时，触发积攒队列执行（如果当前没有任务在执行）
      if (queue.length > 0 && !batchTaskStore.isRunning && !isExecutingQueuedTasks.value) {
        checkAndExecuteQueuedTasks();
      }
    }

    wasPaused = isCurrentlyPaused;
  }, 5000);
};

// 检查并执行积攒队列中的任务（用于任务完成后自动执行）
const checkAndExecuteQueuedTasks = async () => {
  // 确保任务队列存在
  if (!batchTaskStore.taskQueue) {
    batchTaskStore.taskQueue = [];
  }

  // 检查队列是否为空
  if (batchTaskStore.taskQueue.length === 0) {
    return;
  }

  if (isExecutingQueuedTasks.value) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 积攒队列正在执行中，跳过重复执行 ===`,
      type: "info",
    });
    return;
  }

  // 重要：移除对 isRunning 的检查，确保即使有任务在执行，也能检测到时间的任务
  // 这样可以避免定时任务调度器被阻塞
  // 设置标志防止重复执行
  isExecutingQueuedTasks.value = true;

  // 重要：在开始执行积攒队列任务时，设置 isRunning 为 true
  // 这样可以防止其他任务在积攒队列执行期间启动
  batchTaskStore.startTask();

  const prevSelectedTokens = [...selectedTokens.value];
  const prevSelectedTasks = [...selectedTasks.value];

  let allTasksCompleted = true;
  const failedTasks = [];

  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 开始执行积攒队列中的 ${batchTaskStore.taskQueue.length} 个任务 ===`,
      type: "info",
    });

    // 循环处理队列中的任务，直到队列为空
    while (batchTaskStore.taskQueue.length > 0) {
      // 每次循环都获取当前队列的第一个任务
      const task = batchTaskStore.taskQueue[0];
      if (!task) break;

      const taskName = task.name;
      const taskSelectedTasks = task.selectedTasks || [];
      const taskTokenIds = task.selectedTokens || [];

      if (taskTokenIds.length === 0) {
        // 移除无效任务
        batchTaskStore.taskQueue.shift();
        saveTaskQueueToStorage();
        continue;
      }

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 准备执行积攒任务: ${taskName}，共 ${taskTokenIds.length} 个账号 ===`,
        type: "info",
      });

      const hasDailyTask = taskSelectedTasks.some(t => t === 'startBatch' || t === 'batchDaily');
      const otherTasks = taskSelectedTasks.filter(t => t !== 'startBatch' && t !== 'batchDaily');

      // 捕获当前任务的账号列表，避免被后续循环修改
      const currentTaskTokens = [...taskTokenIds];

      try {
        // 执行手动任务
        // 设置任务正在执行的标记，防止被重复加入积攒队列
        if (task.id) {
          safeLocalStorage.setItem(`task_executing_${task.id}`, Date.now().toString());
        }

        try {
          if (hasDailyTask) {
            selectedTokens.value = currentTaskTokens;
            // 添加日志，确认分批执行设置
            const batchSize = batchSettings.batchSize || 5;
            const batchDelay = batchSettings.batchDelay || 5;
            const enableBatch = batchSettings.enableBatchExecution !== false;
            const totalBatches = Math.ceil(currentTaskTokens.length / batchSize);
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== 积攒任务执行批量日常: ${currentTaskTokens.length}个账号, 分批执行:${enableBatch ? '开启' : '关闭'}, 每批${batchSize}个, 延迟${batchDelay}秒, 共${totalBatches}批 ===`,
              type: "info",
            });
            await startBatch(true); // 传入true表示从积攒队列执行
          }

          for (const subTaskName of otherTasks) {
            const taskFunction = getOriginalTaskFunction(subTaskName);
            if (typeof taskFunction === 'function') {
              selectedTokens.value = currentTaskTokens;
              // 使用原始任务的名称，而不是函数名
              await executeInBatches(taskFunction, taskName, subTaskName, true);
            }
          }

          // 重要：任务执行成功后，立即从积攒队列中移除
          // 避免页面刷新后重复执行已完成的任务
          batchTaskStore.taskQueue.shift();
          // 保存更新后的队列到本地存储
          saveTaskQueueToStorage();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 积攒任务 ${taskName} 执行完成，已从队列中移除 ===`,
            type: "success",
          });
        } finally {
          // 清除任务正在执行的标记
          if (task.id) {
            safeLocalStorage.removeItem(`task_executing_${task.id}`);
          }
        }
      } catch (taskError) {
        // 单个任务执行失败，记录失败的任务
        allTasksCompleted = false;
        failedTasks.push(task);
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 积攒任务 ${taskName} 执行失败: ${taskError?.message || '未知错误'}，将保留在队列中 ===`,
          type: "error",
        });
        console.error(`积攒任务 ${taskName} 执行失败:`, taskError);

        // 失败的任务保留在队列中，继续执行下一个任务
        batchTaskStore.taskQueue.shift();
        saveTaskQueueToStorage();
      }
    }

    // 保存更新后的队列到本地存储，确保序列化安全
    saveTaskQueueToStorage();

    if (failedTasks.length > 0) {
      // 有任务失败，保留失败的任务在队列中
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 执行完成，${failedTasks.length} 个任务执行失败，已保留在队列中 ===`,
        type: "warning",
      });
    } else {
      // 所有任务都已处理完成
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 积攒队列任务执行完成 ===`,
        type: "success",
      });
    }
  } catch (error) {
    // 整体执行出错，保留所有任务在队列中
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 执行积攒队列任务失败: ${error.message}，任务已保留在队列中 ===`,
      type: "error",
    });
    console.error('执行积攒队列任务失败:', error);
    // 不清空队列，让下次检查时重试
  } finally {
    selectedTokens.value = prevSelectedTokens;
    selectedTasks.value = prevSelectedTasks;
    isExecutingQueuedTasks.value = false;
    // 重要：在积攒队列执行完成后，重置 isRunning 状态
    batchTaskStore.stopTask();
  }
};

// ======================
// Scheduled Tasks Scheduler
// ======================

// Initialize scheduled tasks from localStorage
loadScheduledTasks();

// Watch for changes to scheduledTasks for debugging
watch(
  scheduledTasks,
  (newVal) => {
    // Reset countdowns when tasks change
    nextExecutionTimes.value = {};
    taskCountdowns.value = {};
    updateCountdowns();
  },
  { deep: true },
);

// 修复TimePicker的"Invalid time value"错误：确保runTime的初始值不是null
watch(
  () => showTaskModal.value,
  (isVisible) => {
    if (isVisible && !taskForm.runTime) {
      // 当模态框显示且runTime为null时，将其设置为undefined
      taskForm.runTime = undefined;
    }
  },
);

// Task scheduler variables - moved to component level scope
const intervalId = ref(null);
let lastTaskExecution = null;
let healthCheckInterval = null;
const pageLoadTime = Date.now();

// Health check for the scheduler
const healthCheck = () => {
  // If interval is not running, restart it
  if (!intervalId.value) {
    console.error(
      `[${new Date().toISOString()}] Task scheduler interval is not running, restarting...`,
    );
    startScheduler();
  }

  // Add a safety mechanism to prevent isRunning from being stuck
  if (isRunning.value) {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000; // 10 minutes ago
    if (lastTaskExecution && lastTaskExecution < tenMinutesAgo) {
      console.error(
        `[${new Date().toISOString()}] isRunning has been true for more than 10 minutes, resetting to false`,
      );
      isRunning.value = false;
      addLog({
        time: new Date().toLocaleTimeString(),
        message: "=== 检测到任务执行超时，已重置isRunning状态 ===",
        type: "warning",
      });
    }
  }

  // Check for page refresh
  if (batchSettings.enableRefresh && batchSettings.refreshInterval > 0) {
    const elapsedMinutes = (Date.now() - pageLoadTime) / 1000 / 60;
    if (elapsedMinutes >= batchSettings.refreshInterval) {
      if (!isRunning.value) {
        console.log(
          `[${new Date().toISOString()}] Refreshing page as scheduled (Interval: ${batchSettings.refreshInterval}m, Elapsed: ${elapsedMinutes.toFixed(1)}m)`,
        );
        window.location.reload();
      } else {
        console.log(
          `[${new Date().toISOString()}] Scheduled refresh postponed due to running task`,
        );
      }
    }
  }
};

// Start the scheduler
const startScheduler = () => {
  // Clear any existing interval first
  if (intervalId.value) {
    clearInterval(intervalId.value);
  }

  // Check every 10 seconds instead of 60 seconds for more timely task execution
  intervalId.value = setInterval(() => {
    try {
      const now = new Date();
      const currentTime = now.toLocaleTimeString("zh-CN", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      // Don't skip all tasks if isRunning is true, just skip individual task execution if already running
      const tasksToRun = scheduledTasks.value.filter((task) => task.enabled);

      if (tasksToRun.length === 0) {
        return;
      }

      tasksToRun.forEach((task) => {
        let shouldRun = false;
        let reason = "";

        if (task.runType === "daily") {
          // Check if current time matches the scheduled time
          const taskTime = task.runTime;
          const nowTime = now.toLocaleTimeString("zh-CN", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          });
          shouldRun = nowTime === taskTime;
          reason = `currentTime=${nowTime}, taskTime=${taskTime}, match=${shouldRun}`;
        } else if (task.runType === "cron") {
          // Improved cron expression parsing using shared utility
          try {
            shouldRun = matchesCronExpression(task.cronExpression, now);
          } catch (error) {
            console.error(
              `[${new Date().toISOString()}] Error parsing cron expression ${task.cronExpression}:`,
              error,
            );
            addLog({
              time: currentTime,
              message: `=== 解析定时任务 ${task.name} 的Cron表达式失败: ${error.message} ===`,
              type: "error",
            });
            return;
          }
        }

        if (shouldRun) {
          // Check if the task was already executed in the last minute to avoid duplicate execution
          const taskExecutionKey = `${task.id}_${now.getDate()}_${now.getHours()}_${now.getMinutes()}`;
          const lastExecutionKey = localStorage.getItem(
            `lastTaskExecution_${task.id}`,
          );

          if (lastExecutionKey !== taskExecutionKey) {
            // Update last execution time
            localStorage.setItem(
              `lastTaskExecution_${task.id}`,
              taskExecutionKey,
            );

            // Execute the task
            lastTaskExecution = Date.now();
            executeScheduledTask(task);
          } else {
            // Only log once per minute to avoid spamming logs
            // But since we check every 10s, this might log multiple times if we don't track logged state
            // For now, we can skip logging "already executed" to keep logs clean
          }
        }
      });
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error in task scheduler:`,
        error,
      );
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务调度服务发生错误: ${error.message} ===`,
        type: "error",
      });
    }
  }, 10000); // Check every 10 seconds
};

// Token刷新等待处理函数
const handleTokenRefreshWaiting = (data) => {
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `Token刷新限流等待中，预计等待 ${data.waitSeconds} 秒（队列: ${data.queueSize}）`,
    type: "warning",
  });
};

// Debug: Log initial state when component mounts
let blackMarketInterval = null;

onMounted(async () => {
  // 先清理过期的 localStorage 标记
  try {
    const now = new Date();
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('task_') && !key.startsWith('task_logs') && !key.startsWith('batch_task_queue')) {
        try {
          if (key.startsWith('task_state_')) {
            // 检查是否超过5分钟
            const taskInfo = safeLocalStorage.getItem(key);
            if (taskInfo) {
              const task = JSON.parse(taskInfo);
              if (Date.now() - (task.timestamp || 0) > 5 * 60 * 1000) {
                safeLocalStorage.removeItem(key);
              }
            }
          } else if (key.startsWith('task_executing_')) {
            // 执行标记，检查是否过期（超过30分钟）
            const executionTime = parseInt(safeLocalStorage.getItem(key) || '0');
            if (now.getTime() - executionTime > 30 * 60 * 1000) {
              safeLocalStorage.removeItem(key);
            }
          } else if (key.startsWith('lastTaskExecution_')) {
            // 执行时间标记，检查是否过期（超过1小时）
            const lastExecution = safeLocalStorage.getItem(key);
            if (lastExecution) {
              const [id, date, hour, minute] = lastExecution.split('_');
              if (date && hour && minute) {
                const executionTime = new Date();
                executionTime.setDate(parseInt(date));
                executionTime.setHours(parseInt(hour));
                executionTime.setMinutes(parseInt(minute));
                if (now - executionTime > 60 * 60 * 1000) {
                  safeLocalStorage.removeItem(key);
                }
              }
            }
          } else if (key === 'executingState') {
            // 执行状态，直接清除
            safeLocalStorage.removeItem(key);
          }
        } catch (e) {
          safeLocalStorage.removeItem(key);
        }
      }
    });
  } catch (e) {
    console.error('清理localStorage标记失败:', e);
  }

  // 先加载本地存储的任务队列
  loadTaskQueueFromStorage();

  // 检测积攒任务队列
  const savedQueue = safeLocalStorage.getItem('batch_task_queue');
  if (savedQueue) {
    try {
      const queue = JSON.parse(savedQueue);
      if (queue.length > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 检测到 ${queue.length} 个积攒任务，已加载到任务队列 ===`,
          type: "info",
        });
      }
    } catch (e) {
      console.error('加载积攒任务队列失败:', e);
    }
  }
  
  // 简化版任务重做：检测是否有运行中被刷新的任务
  const savedRunningTask = safeLocalStorage.getItem(RUNNING_TASK_KEY);
  if (savedRunningTask) {
    try {
      const task = JSON.parse(savedRunningTask);
      // 检查是否在5分钟内（避免很久以前的任务被重新执行）
      if (Date.now() - task.timestamp < 5 * 60 * 1000) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 检测到运行中被刷新的任务：${task.name}，3秒后重新执行 ===`,
          type: "warning",
        });
        
        // 延迟3秒后重新执行
        await new Promise(r => setTimeout(r, 3000));
        
        // 重新执行整个任务（简化版，不做断点续传）
        await manualExecuteTask(task);
      }
      
      // 清除已处理的任务
      clearRunningTask();
    } catch (e) {
      console.error('恢复运行中任务失败:', e);
      clearRunningTask();
    }
  }
  
  // 检测黑市周购买助手运行中被刷新的任务
  const savedBlackMarketTask = safeLocalStorage.getItem('black_market_buyer_running');
  if (savedBlackMarketTask) {
    try {
      const task = JSON.parse(savedBlackMarketTask);
      // 检查是否在5分钟内（避免很久以前的任务被重新执行）
      if (Date.now() - task.timestamp < 5 * 60 * 1000) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 检测到运行中被刷新的任务：${task.name}，3秒后重新执行 ===`,
          type: "warning",
        });
        
        // 延迟3秒后重新执行
        await new Promise(r => setTimeout(r, 3000));
        
        // 恢复选中的账号
        selectedTokens.value = task.selectedTokens || [];
        
        // 打开黑市周购买助手模态框并自动执行
        showBlackMarketBuyerModal.value = true;
        
        // 等待模态框打开后自动点击购买
        setTimeout(() => {
          if (blackMarketBuyerRef.value) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: '正在自动执行黑市周购买...',
              type: "info",
            });
            blackMarketBuyerRef.value.purchaseSelected();
          } else {
            message.warning('无法自动执行，请手动点击购买按钮');
          }
        }, 800);
      } else {
            // 超过5分钟，清除任务
            safeLocalStorage.removeItem('black_market_buyer_running');
          }
        } catch (e) {
          console.error('恢复黑市周购买助手任务失败:', e);
          safeLocalStorage.removeItem('black_market_buyer_running');
        }
  }
  
  // 检测并执行pending_scheduled_tasks
  const pendingScheduledTasks = safeLocalStorage.getItem('pending_scheduled_tasks');
  if (pendingScheduledTasks) {
    try {
      const tasks = JSON.parse(pendingScheduledTasks);
      if (tasks.length > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 检测到 ${tasks.length} 个待执行的定时任务，准备执行 ===`,
          type: "info",
        });
        
        // 延迟3秒后执行，确保组件完全初始化
        await new Promise(r => setTimeout(r, 3000));
        
        for (const task of tasks) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 执行待处理的定时任务：${task.name} ===`,
            type: "info",
          });
          await executeScheduledTask(task);
        }
        
        // 执行完成后清除待处理任务
        safeLocalStorage.removeItem('pending_scheduled_tasks');
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 所有待执行的定时任务已处理完成 ===`,
          type: "success",
        });
      }
    } catch (e) {
      console.error('执行待处理定时任务失败:', e);
      safeLocalStorage.removeItem('pending_scheduled_tasks');
    }
  }

  // 清理旧的任务状态
  batchTaskStore.clearTaskState();
  safeLocalStorage.removeItem('executingState');

  // 检查并执行积攒队列中的任务
  await checkAndExecuteQueuedTasks();

  // Start the task scheduler after all functions are initialized
  scheduleTaskExecution();
  // 启动 Pinia 存储中的定时任务调度器
  scheduledTaskStore.startScheduler();
  // Start countdown timer
  startCountdown();
  // Start resume check timer for pause time detection
  startResumeCheck();
  loadTaskTemplates();
  // 监听Token刷新等待事件
  $emit.on("token:refresh:waiting", handleTokenRefreshWaiting);

  // 初始化黑市周状态
  updateBlackMarketStatus();
  // 每分钟更新一次黑市周状态
  blackMarketInterval = setInterval(updateBlackMarketStatus, 60000);

  // Start time update timer for pause time checking
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

// Cleanup countdown interval on unmount
onBeforeUnmount(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  // 移除Token刷新等待事件监听
  $emit.off("token:refresh:waiting", handleTokenRefreshWaiting);

  // Cleanup task scheduler intervals
  if (intervalId.value) {
    clearInterval(intervalId.value);
    intervalId.value = null;
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "=== 定时任务调度服务已停止 ===",
      type: "info",
    });
  }

  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }

  // 清理黑市周定时器
  if (blackMarketInterval) {
    clearInterval(blackMarketInterval);
    blackMarketInterval = null;
  }

  // Cleanup resume check interval
  if (resumeCheckInterval.value) {
    clearInterval(resumeCheckInterval.value);
    resumeCheckInterval.value = null;
  }
});

// Task scheduler - ensure it runs properly
const scheduleTaskExecution = () => {
  // Log the start of the scheduler
  addLog({
    time: new Date().toLocaleTimeString(),
    message: "=== 定时任务调度服务已启动 ===",
    type: "info",
  });

  // Start the scheduler
  startScheduler();

  // Health check every 5 minutes instead of 1 hour for more frequent safety checks
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  healthCheckInterval = setInterval(healthCheck, 5 * 60 * 1000);

  // Initial health check
  healthCheck();
};

// Verify task dependencies - 只验证基础依赖，WebSocket连接由具体任务函数处理
const verifyTaskDependencies = async (task) => {
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始验证定时任务 ${task.name} 的依赖 ===`,
    type: "info",
  });

  // Verify localStorage is available
  try {
    localStorage.setItem("test", "test");
    localStorage.removeItem("test");
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "✅ localStorage可用",
      type: "info",
    });
  } catch (error) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `❌ localStorage不可用: ${error.message}`,
      type: "error",
    });
    return false;
  }

  // Verify token store is available
  if (!tokenStore || !tokenStore.gameTokens) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "❌ Token存储不可用",
      type: "error",
    });
    return false;
  }

  // Verify task functions exist
  for (const taskName of task.selectedTasks) {
    const taskFunction = eval(taskName);
    if (typeof taskFunction !== "function") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `❌ 任务函数不存在: ${taskName}`,
        type: "error",
      });
      return false;
    }
  }

  // 直接使用所有选中的token，WebSocket连接由具体任务函数内部管理
  // ensureConnection函数会自动处理并行连接和连接池管理
  const connectedTokens = task.selectedTokens.map((tokenId) => {
    const tokenName =
      tokenStore.gameTokens.find((t) => t.id === tokenId)?.name || tokenId;
    return { id: tokenId, name: tokenName };
  });

  // Log connection status
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `✅ 将使用 ${connectedTokens.length} 个账号执行任务`,
    type: "info",
  });

  // Store connected tokens for execution
  task.connectedTokens = connectedTokens.map((t) => t.id);

  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 定时任务 ${task.name} 的依赖验证通过，将执行 ${connectedTokens.length} 个账号 ===`,
    type: "success",
  });
  return true;
};

// Execute a scheduled task with dependency verification
const executeScheduledTask = async (task, skipConflictCheck = false) => {
  const originalSelectedTokens = [...selectedTokens.value];
  const availableTokenList = tokens.value || tokenStore.gameTokens?.value || [];
  const taskTokenIds = task.tokenIds || task.selectedTokens || task.connectedTokens || [];
  const taskTaskNames = task.taskNames || task.selectedTasks || ['batchDaily'];

  // 安全检查：如果 isRunning 为 true 但没有实际任务在执行（可能是之前任务异常退出），则重置状态
  if (batchTaskStore.isRunning.value) {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;
    // 检查是否有任何任务正在执行
    const anyTaskExecuting = Array.from(scheduledTasks.value || []).some(task => {
      const executingMarker = safeLocalStorage.getItem(`task_executing_${task.id}`);
      return executingMarker;
    });

    // 只有当没有任务正在执行且上次任务执行时间超过10分钟时，才认为状态异常，强制重置
    if (!anyTaskExecuting && (!lastTaskExecution || lastTaskExecution < tenMinutesAgo)) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 检测到任务状态异常（isRunning 卡在 true），强制重置状态 ===`,
        type: "warning",
      });
      batchTaskStore.stopTask();
    }
  }

  // 检测任务冲突：有任务正在运行
  if (!skipConflictCheck && batchTaskStore.isRunning) {
    // 检测到任务冲突，检查是否开启冲突加入积攒队列
    if (batchSettings.enableQueueOnConflict) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 检测到任务冲突（有任务运行中），加入积攒队列依次执行 ===`,
        type: "warning",
      });
      // 为每个任务生成唯一ID
      const uniqueTaskId = Date.now() + Math.random();
      batchTaskStore.addToTaskQueue({
        id: uniqueTaskId,
        name: task.name, // 使用原始任务名称
        runType: 'scheduled',
        selectedTokens: [...taskTokenIds],
        selectedTasks: [...taskTaskNames],
      });
      // 重要：返回 false 表示任务没有真正执行，只是加入了积攒队列
      // 这样调用者就不会立即触发 checkAndExecuteQueuedTasks
      return false;
    } else {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 检测到任务冲突（有任务运行中），已关闭"冲突加入积攒队列"功能，将并行执行 ===`,
        type: "warning",
      });
      // 不return false，继续执行，实现并行执行
    }
  }

  // 重要：只有在确认无冲突后才设置任务执行状态
  // 这样后续的任务就能正确检测到当前任务正在执行
  selectedTokens.value = [...taskTokenIds];
  selectedTasks.value = [...taskTaskNames];
  // 重要：在任务开始时更新lastTaskExecution，确保安全检查能正确判断任务执行状态
  lastTaskExecution = Date.now();
  batchTaskStore.startTask();
  batchTaskStore.setProgress(0);

  const now = new Date();
  const taskExecutionKey = `${task.id}_${now.getDate()}_${now.getHours()}_${now.getMinutes()}`;
  safeLocalStorage.setItem(`lastTaskExecution_${task.id}`, taskExecutionKey);

  safeLocalStorage.setItem('executingState', JSON.stringify({
    selectedTokens: taskTokenIds,
    selectedTasks: taskTaskNames,
    timestamp: Date.now()
  }));

  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始执行定时任务: ${task.name} ===`,
    type: "info",
  });

  try {
    // Verify dependencies before executing task
    const dependenciesValid = await verifyTaskDependencies(task);
    if (!dependenciesValid) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 依赖验证失败，取消执行 ===`,
        type: "error",
      });
      return;
    }

    // Filter out tokens that don't exist in current tokens.value
    const availableTokens = (
      task.connectedTokens || task.selectedTokens
    ).filter((tokenId) => {
      return tokens.value.some((t) => t.id === tokenId);
    });

    const missingTokens = (task.connectedTokens || task.selectedTokens).filter(
      (tokenId) => {
        return !tokens.value.some((t) => t.id === tokenId);
      },
    );

    if (missingTokens.length > 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `⚠️  跳过不存在的Token: ${missingTokens.join(", ")}`,
        type: "warning",
      });
    }

    if (availableTokens.length === 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 没有可用的Token，取消执行 ===`,
        type: "error",
      });
      return;
    }

    // Always use the latest selectedTokens from the task that exist in current tokens.value
    selectedTokens.value = [...availableTokens];

    // Execute selected tasks in parallel
    const taskPromises = task.selectedTasks.map(async (taskName) => {
      if (shouldStop.value) return;

      if (
        ["batchbaoku45", "batchbaoku13"].includes(taskName) &&
        !isbaokuActivityOpen.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在宝库开放时间)`,
          type: "warning",
        });
        return;
      }

      if (
        ["batchmengjing", "batchBuyDreamItems"].includes(taskName) &&
        !ismengjingActivityOpen.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在梦境开放时间)`,
          type: "warning",
        });
        return;
      }

      if (
        ["batchSmartSendCar", "batchClaimCars"].includes(taskName) &&
        !isCarActivityOpen.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在发车开放时间)`,
          type: "warning",
        });
        return;
      }

      if (
        ["batchTopUpArena", "batcharenafight"].includes(taskName) &&
        !isarenaActivityOpen.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在竞技场开放时间)`,
          type: "warning",
        });
        return;
      }

      if (
        [
          "climbWeirdTower",
          "batchUseItems",
          "batchMergeItems",
          "batchClaimFreeEnergy",
        ].includes(taskName) &&
        !isWeirdTowerActivityOpen.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在怪异塔开放时间)`,
          type: "warning",
        });
        return;
      }

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `执行任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName}`,
        type: "info",
      });

      // Call the task function dynamically
      const taskFunction = eval(taskName);
      if (typeof taskFunction === "function") {
        // For batch operations, pass isScheduledTask = true
        // 具体的batch任务函数内部会使用ensureConnection管理并行连接
        if (
          [
            "batchOpenBox",
            "batchOpenBoxByPoints",
            "batchFish",
            "batchRecruit",
            "batchLegacyGiftSendEnhanced",
          ].includes(taskName)
        ) {
          await taskFunction(true);
        } else {
          await taskFunction();
        }
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `任务函数不存在: ${taskName}`,
          type: "error",
        });
      }
    });

    // Wait for all tasks to complete
    await Promise.all(taskPromises);

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务执行完成: ${task.name} ===`,
      type: "success",
    });
  } catch (error) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务执行失败: ${error.message} ===`,
      type: "error",
    });
    console.error(
      `[${new Date().toISOString()}] Error executing scheduled task ${task.name}:`,
      error,
    );
  } finally {
    // 重要：恢复原始选中状态
    selectedTokens.value = originalSelectedTokens;
    // 重要：重置 isRunning 状态
    batchTaskStore.stopTask();
    // 重要：只有任务真正执行完成（不是加入积攒队列）后才检查积攒队列
    await checkAndExecuteQueuedTasks();
  }
};

// 注: boxTypeOptions, fishTypeOptions 已从 @/utils/batch 导入

const openHelperModal = (type) => {
  helperType.value = type;
  showHelperModal.value = true;
};

// 批量功法残卷赠送相关方法
const clearRecipientError = () => {
  recipientIdError.value = "";
};

const validateRecipientId = (value) => {
  if (!value || value === "") {
    return true; // 允许为空，由按钮禁用控制
  }
  if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
    recipientIdError.value = "请输入有效的数字ID";
    return false;
  }
  return true;
};

// 头像处理方法
const handleAvatarLoad = () => {
  isAvatarLoading.value = false;
  avatarLoadError.value = false;
};

const handleAvatarError = () => {
  isAvatarLoading.value = false;
  avatarLoadError.value = true;
};

const resetAvatarState = () => {
  isAvatarLoading.value = true;
  avatarLoadError.value = false;
};

const queryRecipientInfo = async () => {
  // 1. 输入验证
  if (!recipientIdInput.value || recipientIdInput.value === "") {
    recipientIdError.value = "请输入接收者ID";
    return;
  }

  const recipientId = Number(recipientIdInput.value);
  if (!Number.isInteger(recipientId) || recipientId <= 0) {
    recipientIdError.value = "请输入有效的数字ID";
    return;
  }

  // 2. 检查选中账号
  if (selectedTokens.value.length === 0) {
    recipientIdError.value = "请先选择要操作的角色";
    return;
  }

  // 3. 初始化状态
  isQueryingRecipient.value = true;
  recipientIdError.value = "";
  recipientInfo.value = null;
  // 重置头像状态
  resetAvatarState();

  const firstTokenId = selectedTokens.value[0];
  const token = tokens.value.find((t) => t.id === firstTokenId);

  // 记录开始查询
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始查询接收者信息: 使用账号 ${token.name} (ID: ${firstTokenId}) ===`,
    type: "info",
  });

  try {
    // 确保WebSocket连接
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在建立WebSocket连接...`,
      type: "info",
    });

    // 使用现有的ensureConnection函数，它已经包含了重连机制
    await ensureConnection(firstTokenId);

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `WebSocket连接成功`,
      type: "success",
    });

    // 发送查询命令
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在发送查询命令，接收者ID: ${recipientId}`,
      type: "info",
    });

    // 延长超时时间到10秒，确保有足够时间处理
    const resp = await tokenStore.sendMessageWithPromise(
      firstTokenId,
      "rank_getroleinfo",
      {
        bottleType: 0,
        includeBottleTeam: false,
        isSearch: false,
        roleId: recipientId,
      },
      10000,
    );

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `查询命令发送成功，正在处理响应...`,
      type: "info",
    });

    // 处理查询结果
    console.log("rank_getroleinfo 响应结果:", resp);

    // 兼容不同的响应结构
    const roleData = resp?.role || resp?.roleInfo;

    if (roleData) {
      // 构建完整的角色信息，移除等级和VIP字段
      recipientInfo.value = {
        roleId: roleData.roleId || roleData.role?.roleId,
        name: roleData.name || roleData.role?.name,
        // 添加头像URL
        avatarUrl:
          resp?.roleInfo?.headImg ||
          roleData?.headImg ||
          roleData?.role?.headImg ||
          "",
        // 战力转换为亿为单位
        power: (function (p) {
          const billion = 100000000;
          return (p / billion).toFixed(2);
        })(roleData.power || roleData.role?.power || 0),
        powerUnit: "亿",
        // 扩展更多角色信息
        serverName: roleData.serverName || roleData.role?.serverName || "",
        legionName: resp?.legionInfo?.name || "",
        legionId: resp?.legionInfo?.id || 0,
      };

      // 格式化角色名，处理特殊字符
      const displayName = recipientInfo.value.name || "未知角色";

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 查询成功: 找到角色 ${displayName} (ID: ${recipientInfo.value.roleId})，战力: ${recipientInfo.value.power}${recipientInfo.value.powerUnit} ===`,
        type: "success",
      });

      message.success("查询成功");
    } else {
      const errorMsg = "未找到该角色信息";
      recipientIdError.value = errorMsg;

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 查询失败: ${errorMsg} ===`,
        type: "error",
      });

      message.error(errorMsg);
    }
  } catch (error) {
    // 详细的错误处理
    console.error("查询接收者信息失败:", error);

    let errorMsg = "查询失败";
    let logType = "error";

    // 根据错误类型提供更友好的错误信息
    if (error.message.includes("连接失败")) {
      errorMsg = "WebSocket连接失败，请检查网络或账号状态";
    } else if (
      error.message.includes("timeout") ||
      error.message.includes("超时")
    ) {
      errorMsg = "查询超时，请稍后重试";
      logType = "warning";
    } else if (error.message.includes("200160")) {
      errorMsg = "功法系统未开启";
    } else {
      errorMsg = `查询失败: ${error.message}`;
    }

    recipientIdError.value = errorMsg;

    // 记录错误日志
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== ${errorMsg} ===`,
      type: logType,
    });

    // 显示用户友好的错误提示
    message.error(errorMsg);
  } finally {
    isQueryingRecipient.value = false;

    // 记录查询完成
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 查询操作完成 ===`,
      type: "info",
    });
  }
};

const confirmLegacyGift = async () => {
  if (!recipientIdInput.value || !recipientInfo.value) {
    message.error("请先查询并确认接收者信息");
    return;
  }

  if (!securityPassword.value) {
    message.error("请输入安全密码");
    return;
  }

  // 调用增强版批量赠送功能
  await batchLegacyGiftSendEnhanced();

  // 关闭模态框
  showLegacyGiftModal.value = false;
  // 清空安全密码
  securityPassword.value = "";
};

const executeHelper = () => {
  if (helperType.value !== "pointsBox") {
    if (helperSettings.count % 10 !== 0 || helperSettings.count < 10) {
      message.warning("消耗数量必须是10的整数倍，最小为10");
      return;
    }
  }
  showHelperModal.value = false;
  if (helperType.value === "box") {
    batchOpenBox();
  } else if (helperType.value === "fish") {
    batchFish();
  } else if (helperType.value === "recruit") {
    batchRecruit();
  } else if (helperType.value === "pointsBox") {
    batchOpenBoxByPoints();
  }
};

// Dream Buy Modal Logic
const showDreamBuyModal = ref(false);
const dreamBuyList = ref([]);

const openDreamBuyModal = () => {
  // Load saved settings
  dreamBuyList.value = batchSettings.dreamPurchaseList || [];
  showDreamBuyModal.value = true;
};

const toggleDreamItem = (itemKey, checked) => {
  if (checked) {
    if (!dreamBuyList.value.includes(itemKey)) {
      dreamBuyList.value.push(itemKey);
    }
  } else {
    dreamBuyList.value = dreamBuyList.value.filter((k) => k !== itemKey);
  }
};

const saveDreamBuyConfig = () => {
  // Save settings
  batchSettings.dreamPurchaseList = [...dreamBuyList.value];
  saveBatchSettings();

  showDreamBuyModal.value = false;
  message.success("梦境购买配置已保存");
};

const selectGoldItems = () => {
  const newSelection = new Set(dreamBuyList.value);

  for (const merchantId in goldItemsConfig) {
    const items = goldItemsConfig[merchantId];
    items.forEach((index) => {
      newSelection.add(`${merchantId}-${index}`);
    });
  }

  dreamBuyList.value = Array.from(newSelection);
};

const selectAllItems = () => {
  const newSelection = new Set(dreamBuyList.value);

  for (const merchantId in merchantConfig) {
    const items = merchantConfig[merchantId].items;
    items.forEach((_, index) => {
      newSelection.add(`${merchantId}-${index}`);
    });
  }

  dreamBuyList.value = Array.from(newSelection);
};

const clearAllItems = () => {
  dreamBuyList.value = [];
};

// 注: formationOptions, bossTimesOptions 已从 @/utils/batch 导入

const loadSettings = (tokenId) => {
  try {
    const raw = localStorage.getItem(`daily-settings:${tokenId}`);
    const defaultSettings = {
      arenaFormation: 1,
      towerFormation: 1,
      weirdTowerFormation: 1,
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
};

const openSettings = (token) => {
  currentSettingsTokenId.value = token.id;
  currentSettingsTokenName.value = token.name;
  const saved = loadSettings(token.id);
  Object.assign(currentSettings, saved);
  showSettingsModal.value = true;
};

const saveSettings = () => {
  if (currentSettingsTokenId.value) {
    localStorage.setItem(
      `daily-settings:${currentSettingsTokenId.value}`,
      JSON.stringify(currentSettings),
    );
    message.success(`已保存 ${currentSettingsTokenName.value} 的设置`);
    showSettingsModal.value = false;
  }
};

// Task Template Functions
const openTaskTemplateModal = () => {
  // 加载模板列表
  loadTaskTemplates();
  // 重置当前模板
  Object.assign(currentTemplate, {
    arenaFormation: 1,
    towerFormation: 1,
    bossFormation: 1,
    bossTimes: 2,
    claimBottle: true,
    payRecruit: true,
    openBox: true,
    arenaEnable: true,
    claimHangUp: true,
    claimEmail: true,
    blackMarketPurchase: true,
  });
  currentTemplateName.value = "";
  showTaskTemplateModal.value = true;
};

const loadTaskTemplates = () => {
  const templates = localStorage.getItem("task-templates");
  const parsed = templates ? JSON.parse(templates) : [];
  taskTemplates.value = parsed;
  return parsed;
};

const openApplyTemplateModal = () => {
  // 加载模板列表
  loadTaskTemplates();
  // 重置选择
  selectedTemplateId.value = null;
  selectedTokensForApply.value = [];
  showApplyTemplateModal.value = true;
};

const handleSelectAllForApply = (checked) => {
  if (checked) {
    selectedTokensForApply.value = sortedTokens.value.map((token) => token.id);
  } else {
    selectedTokensForApply.value = [];
  }
};

const applyTemplate = () => {
  if (!selectedTemplateId.value || selectedTokensForApply.value.length === 0) {
    message.error("请选择模板和要应用的账号");
    return;
  }

  // 找到选中的模板
  const templates = loadTaskTemplates();
  const template = templates.find((t) => t.id === selectedTemplateId.value);
  if (!template) {
    message.error("模板不存在");
    return;
  }

  // 应用模板到选中的账号
  let successCount = 0;
  selectedTokensForApply.value.forEach((tokenId) => {
    // 保存账号设置时同时保存模板ID
    const accountSettings = {
      ...template.settings,
      templateId: template.id, // 记录模板ID
    };
    localStorage.setItem(
      `daily-settings:${tokenId}`,
      JSON.stringify(accountSettings),
    );
    successCount++;
  });

  message.success(`已成功应用模板到 ${successCount} 个账号`);
  showApplyTemplateModal.value = false;
};

// Template Manager Functions
const openTemplateManagerModal = () => {
  // 加载模板列表
  loadTaskTemplates();
  showTemplateManagerModal.value = true;
};

const openEditTemplateModal = (template) => {
  // 加载模板数据到当前编辑模板
  currentTemplateId.value = template.id;
  currentTemplateName.value = template.name;
  Object.assign(currentTemplate, template.settings);
  showTaskTemplateModal.value = true;
};

const updateTaskTemplate = () => {
  if (!currentTemplateName.value.trim()) {
    message.error("请输入模板名称");
    return;
  }

  // 找到并更新模板
  const templates = loadTaskTemplates();
  const templateIndex = templates.findIndex(
    (t) => t.id === currentTemplateId.value,
  );
  if (templateIndex === -1) {
    message.error("模板不存在");
    return;
  }

  // 更新模板
  templates[templateIndex] = {
    ...templates[templateIndex],
    name: currentTemplateName.value.trim(),
    settings: {
      ...currentTemplate,
    },
    updatedAt: new Date().toISOString(),
  };

  // 保存模板到localStorage
  localStorage.setItem("task-templates", JSON.stringify(templates));

  // 更新模板列表
  taskTemplates.value = templates;

  message.success(`已更新模板 "${templates[templateIndex].name}"`);
  showTaskTemplateModal.value = false;

  // 重置编辑状态
  resetTemplateForm();
};

const deleteTaskTemplate = (templateId) => {
  // 确认删除
  if (confirm("确定要删除这个模板吗？")) {
    // 找到并删除模板
    const templates = loadTaskTemplates();
    const filteredTemplates = templates.filter((t) => t.id !== templateId);

    // 保存模板到localStorage
    localStorage.setItem("task-templates", JSON.stringify(filteredTemplates));

    // 更新模板列表
    taskTemplates.value = filteredTemplates;

    message.success("模板已删除");
  }
};

const resetTemplateForm = () => {
  currentTemplateId.value = null;
  currentTemplateName.value = "";
  Object.assign(currentTemplate, {
    arenaFormation: 1,
    towerFormation: 1,
    bossFormation: 1,
    bossTimes: 2,
    claimBottle: true,
    payRecruit: true,
    openBox: true,
    arenaEnable: true,
    claimHangUp: true,
    claimEmail: true,
    blackMarketPurchase: true,
  });
};

const openAccountTemplateModal = () => {
  // 加载账号模板引用关系
  loadAccountTemplateReferences();
  showAccountTemplateModal.value = true;
};

const loadAccountTemplateReferences = () => {
  const templates = loadTaskTemplates();
  const references = [];

  // 遍历所有账号，获取其模板引用
  sortedTokens.value.forEach((token) => {
    const settingsStr = localStorage.getItem(`daily-settings:${token.id}`);
    if (settingsStr) {
      try {
        const settings = JSON.parse(settingsStr);
        const templateId = settings.templateId;
        const template = templates.find((t) => t.id === templateId);

        references.push({
          tokenId: token.id,
          tokenName: token.name,
          templateId: templateId,
          templateName: template ? template.name : "未引用模板",
        });
      } catch (e) {
        console.error(`解析账号 ${token.name} 的设置失败:`, e);
      }
    } else {
      // 没有设置的账号
      references.push({
        tokenId: token.id,
        tokenName: token.name,
        templateId: null,
        templateName: "未引用模板",
      });
    }
  });

  accountTemplateReferences.value = references;
  filteredAccountTemplates.value = references;
};

const filterAccountTemplates = () => {
  if (!selectedTemplateForFilter.value) {
    filteredAccountTemplates.value = accountTemplateReferences.value;
  } else {
    filteredAccountTemplates.value = accountTemplateReferences.value.filter(
      (item) => item.templateId === selectedTemplateForFilter.value,
    );
  }
};

const openNewTemplateModal = () => {
  // 重置表单，准备创建新模板
  resetTemplateForm();
  showTaskTemplateModal.value = true;
};

// 修改saveTaskTemplate函数，支持新增和编辑
const saveTaskTemplate = () => {
  if (!currentTemplateName.value.trim()) {
    message.error("请输入模板名称");
    return;
  }

  const templates = loadTaskTemplates();

  if (currentTemplateId.value) {
    // 更新现有模板
    updateTaskTemplate();
  } else {
    // 创建新模板
    const template = {
      id: Date.now().toString(),
      name: currentTemplateName.value.trim(),
      settings: {
        ...currentTemplate,
      },
      createdAt: new Date().toISOString(),
    };

    // 添加新模板
    templates.push(template);
    localStorage.setItem("task-templates", JSON.stringify(templates));

    // 更新模板列表
    taskTemplates.value = templates;

    message.success(`已保存模板 "${template.name}"`);
    showTaskTemplateModal.value = false;

    // 重置表单
    resetTemplateForm();
  }
};

const currentRunningTokenId = ref(null);
const currentProgress = ref(0);
const logs = ref([]);
const logContainer = ref(null);
const autoScrollLog = ref(true);
const filterErrorsOnly = ref(false);
const errorCount = computed(() => {
  return logs.value.filter((log) => log.type === "error").length;
});

const filteredLogs = computed(() => {
  if (filterErrorsOnly.value) {
    return logs.value.filter((log) => log.type === "error");
  }
  return logs.value;
});

const currentRunningTokenName = computed(() => {
  const t = tokens.value.find((x) => x.id === currentRunningTokenId.value);
  return t ? t.name : "";
});

// Selection logic
const isAllSelected = computed(
  () =>
    selectedTokens.value.length === tokens.value.length &&
    tokens.value.length > 0,
);
const isIndeterminate = computed(
  () =>
    selectedTokens.value.length > 0 &&
    selectedTokens.value.length < tokens.value.length,
);

const handleSelectAll = (checked) => {
  if (checked) {
    selectedTokens.value = tokens.value.map((t) => t.id);
  } else {
    selectedTokens.value = [];
  }
};

const getStatusType = (tokenId) => {
  const status = tokenStatus.value[tokenId];
  if (status === "completed") return "success";
  if (status === "failed") return "error";
  if (status === "running") return "info";
  return "default";
};

const getStatusText = (tokenId) => {
  const status = tokenStatus.value[tokenId];
  if (status === "completed") return "已完成";
  if (status === "failed") return "失败";
  if (status === "running") return "执行中";
  return "等待中";
};

// =====================
// Token分组管理相关方法
// =====================

/**
 * 创建新分组
 */
const createNewGroup = () => {
  if (!newGroupName.value.trim()) {
    message.warning("请输入分组名称");
    return;
  }

  const newGroup = tokenStore.createTokenGroup(
    newGroupName.value.trim(),
    newGroupColor.value,
  );

  // 添加选中的Token到新分组
  if (newGroupSelectedTokens.value.length > 0) {
    newGroupSelectedTokens.value.forEach((tokenId) => {
      tokenStore.addTokenToGroup(newGroup.id, tokenId);
    });
  }

  message.success("分组创建成功");
  newGroupName.value = "";
  newGroupColor.value = "#1677ff";
  newGroupSelectedTokens.value = [];
};

const selectAllNewGroup = () => {
  newGroupSelectedTokens.value = sortedTokens.value.map((t) => t.id);
};

const deselectAllNewGroup = () => {
  newGroupSelectedTokens.value = [];
};

/**
 * 删除分组
 */
const deleteGroup = (groupId) => {
  if (confirm("确定要删除这个分组吗？分组中的token不会被删除。")) {
    tokenStore.deleteTokenGroup(groupId);
    message.success("分组已删除");
  }
};

/**
 * 保存编辑的分组
 */
const saveEditGroup = () => {
  if (!editingGroupId.value) return;

  if (!editingGroupName.value.trim()) {
    message.warning("请输入分组名称");
    return;
  }

  tokenStore.updateTokenGroup(editingGroupId.value, {
    name: editingGroupName.value.trim(),
    color: editingGroupColor.value,
  });

  message.success("分组已更新");
  editingGroupId.value = null;
  editingGroupName.value = "";
  editingGroupColor.value = "";
};

/**
 * 开始编辑分组
 */
const startEditGroup = (groupId) => {
  const group = tokenGroups.value.find((g) => g.id === groupId);
  if (group) {
    editingGroupId.value = groupId;
    editingGroupName.value = group.name;
    editingGroupColor.value = group.color;
  }
};

/**
 * 取消编辑分组
 */
const cancelEditGroup = () => {
  editingGroupId.value = null;
  editingGroupName.value = "";
  editingGroupColor.value = "";
};

/**
 * 切换分组选择状态
 */
const toggleGroupSelection = (groupId) => {
  const index = selectedGroups.value.indexOf(groupId);
  if (index > -1) {
    selectedGroups.value.splice(index, 1);
  } else {
    selectedGroups.value.push(groupId);
  }

  // 更新selectedTokens
  updateSelectedTokensFromGroups();
};

/**
 * 判断分组是否被选中
 */
const isGroupSelected = (groupId) => {
  return selectedGroups.value.includes(groupId);
};

/**
 * 根据选中的分组更新selectedTokens
 */
const updateSelectedTokensFromGroups = () => {
  const tokenIds = new Set();

  selectedGroups.value.forEach((groupId) => {
    const validTokenIds = tokenStore.getValidGroupTokenIds(groupId);
    validTokenIds.forEach((id) => tokenIds.add(id));
  });

  selectedTokens.value = Array.from(tokenIds);
};

/**
 * 一键清除所有分组选择
 */
const clearAllGroupSelection = () => {
  selectedGroups.value = [];
  selectedTokens.value = [];
};

/**
 * 添加token到分组
 */
const addTokenToSelectedGroup = (groupId, tokenId) => {
  tokenStore.addTokenToGroup(groupId, tokenId);
  message.success("已将token添加到分组");
};

/**
 * 从分组移除token
 */
const removeTokenFromSelectedGroup = (groupId, tokenId) => {
  tokenStore.removeTokenFromGroup(groupId, tokenId);
  message.success("已将token从分组移除");
};

/**
 * 获取分组中有效的token ID列表（用于模板中展示）
 */
const getValidGroupTokenIds = (groupId) => {
  return tokenStore.getValidGroupTokenIds(groupId);
};

/**
 * 获取分组中的token列表
 */
const getGroupTokenList = (groupId) => {
  const tokenIds = tokenStore.getValidGroupTokenIds(groupId);
  return tokens.value.filter((t) => tokenIds.includes(t.id));
};

// 注: pickArenaTargetId, FISH_TARGET, ARENA_TARGET, getTodayStartSec, isTodayAvailable, calculateMonthProgress 已从 @/utils/batch 导入

// 定期清理 localStorage 任务标记
const cleanupLocalStorageTasks = () => {
  try {
    const now = new Date();
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('lastTaskExecution_')) {
        // 检查标记是否过期（超过1小时）
        const taskId = key.replace('lastTaskExecution_', '');
        const lastExecution = safeLocalStorage.getItem(key);
        if (lastExecution) {
          const [id, date, hour, minute] = lastExecution.split('_');
          const executionTime = new Date();
          executionTime.setDate(parseInt(date));
          executionTime.setHours(parseInt(hour));
          executionTime.setMinutes(parseInt(minute));
          
          // 如果标记超过1小时，清理
          if (now - executionTime > 60 * 60 * 1000) {
            safeLocalStorage.removeItem(key);
            safeLocalStorage.removeItem(`task_executing_${taskId}`);
          }
        }
      } else if (key.startsWith('task_executing_')) {
        // 检查执行标记是否过期（超过30分钟）
        const executionTime = parseInt(safeLocalStorage.getItem(key) || '0');
        if (now.getTime() - executionTime > 30 * 60 * 1000) {
          safeLocalStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.warn('localStorage cleanup error:', error);
  }
};

// 增强的日志记录函数
const enhancedAddLog = (log) => {
  addLog(log);
};

// 定期执行清理任务
setInterval(cleanupLocalStorageTasks, 10 * 60 * 1000);

const addLog = (log) => {
  // 添加日志数据到数组
  logs.value.push(log);

  // 限制logs数组大小，防止内存占用过大
  const maxLogEntries = batchSettings.maxLogEntries || 1000;
  if (logs.value.length > maxLogEntries) {
    logs.value = logs.value.slice(-maxLogEntries);
  }

  // 尝试DOM操作，但不依赖nextTick确保日志显示
  // 在后台运行时，浏览器可能会限制DOM操作
  try {
    if (logContainer.value && autoScrollLog.value) {
      // 直接尝试滚动，不使用nextTick
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  } catch (error) {
    // 忽略DOM操作错误，确保日志数据仍然被记录
    console.warn("Failed to scroll log container:", error);
  }

  // 同时使用nextTick作为后备，确保在页面回到前台时能正确滚动
  nextTick(() => {
    try {
      if (logContainer.value && autoScrollLog.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight;
      }
    } catch (error) {
      // 忽略错误
    }
  });
};

watch(autoScrollLog, (newValue) => {
  if (newValue && logContainer.value) {
    nextTick(() => {
      try {
        logContainer.value.scrollTop = logContainer.value.scrollHeight;
      } catch (error) {
        // 忽略DOM操作错误
        console.warn("Failed to scroll log container:", error);
      }
    });
  }
});

const copyLogs = () => {
  if (logs.value.length === 0) {
    message.warning("没有可复制的日志");
    return;
  }
  const logText = logs.value
    .map((log) => `${log.time} ${log.message}`)
    .join("\n");
  navigator.clipboard
    .writeText(logText)
    .then(() => {
      message.success("日志已复制到剪贴板");
    })
    .catch((err) => {
      message.error("复制日志失败: " + err.message);
    });
};

const clearLogs = () => {
  logs.value = [];
  message.success("日志已清空");
};

const waitForConnection = async (
  tokenId,
  timeout = batchSettings.connectionTimeout,
) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status === "connected") return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

// 全局连接队列控制 - 限制并发连接数
const connectionQueue = { active: 0 };

const waitForConnectionSlot = async () => {
  while (connectionQueue.active >= batchSettings.maxActive) {
    await new Promise((r) => setTimeout(r, 1000));
  }
  connectionQueue.active++;
};

const releaseConnectionSlot = () => {
  if (connectionQueue.active > 0) {
    connectionQueue.active--;
  }
};

const ensureConnection = async (tokenId, maxRetries = 2) => {
  const latestToken = tokens.value.find((t) => t.id === tokenId);
  if (!latestToken) {
    throw new Error(`Token not found: ${tokenId}`);
  }

  let status = tokenStore.getWebSocketStatus(tokenId);
  let connected = status === "connected";

  if (!connected) {
    // 等待连接槽位，限制并发连接数
    await waitForConnectionSlot();

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在连接... (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
      type: "info",
    });

    tokenStore.createWebSocketConnection(
      tokenId,
      latestToken.token,
      latestToken.wsUrl,
    );
    connected = await waitForConnection(tokenId);

    if (!connected && maxRetries > 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `连接超时，尝试重连...`,
        type: "warning",
      });

      tokenStore.closeWebSocketConnection(tokenId);
      await new Promise((r) => setTimeout(r, batchSettings.reconnectDelay));

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `正在重连...`,
        type: "info",
      });

      const refreshedToken = tokens.value.find((t) => t.id === tokenId);
      tokenStore.createWebSocketConnection(
        tokenId,
        refreshedToken.token,
        refreshedToken.wsUrl,
      );

      connected = await waitForConnection(tokenId);
    }

    if (!connected) {
      // 连接失败，释放槽位
      releaseConnectionSlot();
      throw new Error("连接失败 (重试后仍超时)");
    }
  }

  // 连接成功，槽位保持占用，直到任务完成后手动释放

  // Initialize Game Data (Critical for Battle Version and Session)
  try {
    // Fetch Role Info first (Standard flow)
    await tokenStore.sendMessageWithPromise(
      tokenId,
      "role_getroleinfo",
      {},
      5000,
    );

    // Fetch Battle Version
    const res = await tokenStore.sendMessageWithPromise(
      tokenId,
      "fight_startlevel",
      {},
      5000,
    );
    if (res?.battleData?.version) {
      tokenStore.setBattleVersion(res.battleData.version);
    }
  } catch (e) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `初始化数据失败: ${e.message}`,
      type: "warning",
    });
  }

  return true;
};

const createTaskDeps = () => ({
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
  // 延迟配置
  delayConfig: {
    command: batchSettings.commandDelay,
    task: batchSettings.taskDelay,
    action: batchSettings.actionDelay,
    battle: batchSettings.battleDelay,
    refresh: batchSettings.refreshDelay,
    long: batchSettings.longDelay,
  },
  // 其他特定依赖
  logs,
  logContainer,
  autoScrollLog,
  nextTick,
  shouldSendCar,
  canClaim,
  normalizeCars,
  gradeLabel,
  // 设置相关
  currentSettings,
  helperSettings,
  // 功法赠送相关
  recipientIdInput,
  recipientInfo,
  securityPassword,
  giftQuantity,
  // 竞技场相关辅助函数
  pickArenaTargetId,
  getTodayStartSec,
  isTodayAvailable,
  calculateMonthProgress,
  // 配置加载函数
  loadSettings,
});

// 初始化任务模块
const tasksHangUp = createTasksHangUp(createTaskDeps());
const {
  claimHangUpRewards,
  batchAddHangUpTime,
  batchStudy,
  batchclubsign,
  batchWarGuessCheer,
} = tasksHangUp;

const tasksBottle = createTasksBottle(createTaskDeps());
const { resetBottles, batchlingguanzi } = tasksBottle;

const tasksTower = createTasksTower(createTaskDeps());
const {
  climbTower,
  climbWeirdTower,
  batchClaimFreeEnergy,
  skinChallenge,
  batchUseItems,
  batchMergeItems,
} = tasksTower;

const tasksCar = createTasksCar(createTaskDeps());
const { batchSmartSendCar, batchClaimCars } = tasksCar;

const tasksItem = createTasksItem(createTaskDeps());
const {
  batchOpenBox,
  batchOpenBoxByPoints,
  batchClaimBoxPointReward,
  batchFish,
  batchRecruit,
  batchHeroUpgrade,
  batchBookUpgrade,
  batchClaimStarRewards,
  batchClaimPeachTasks,
  batchGenieSweep,
} = tasksItem;

const tasksDungeon = createTasksDungeon(createTaskDeps());
const { batchbaoku13, batchbaoku45, batchmengjing, batchBuyDreamItems } =
  tasksDungeon;

const tasksArena = createTasksArena(createTaskDeps());
const { batcharenafight, batchTopUpFish, batchTopUpArena } = tasksArena;

const tasksStore = createTasksStore(createTaskDeps());
const {
  legion_storebuygoods,
  legionStoreBuySkinCoins,
  store_purchase,
  collection_claimfreereward,
} = tasksStore;

const tasksLegacy = createTasksLegacy(createTaskDeps());
const { batchLegacyClaim, batchLegacyGiftSendEnhanced } = tasksLegacy;

const startBatch = async (isFromQueue = false) => {
  if (selectedTokens.value.length === 0) return;

  // 安全检查：如果 isRunning 为 true 但没有实际任务在执行（可能是之前任务异常退出），则重置状态
  if (batchTaskStore.isRunning.value) {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;
    // 检查是否有任何任务正在执行
    const anyTaskExecuting = Array.from(scheduledTasks.value || []).some(task => {
      const executingMarker = safeLocalStorage.getItem(`task_executing_${task.id}`);
      return executingMarker;
    });

    // 只有当没有任务正在执行且上次任务执行时间超过10分钟时，才认为状态异常，强制重置
    if (!anyTaskExecuting && (!lastTaskExecution || lastTaskExecution < tenMinutesAgo)) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 检测到任务状态异常（isRunning 卡在 true），强制重置状态 ===`,
        type: "warning",
      });
      batchTaskStore.stopTask();
    }
  }

  // 检测任务冲突：有任务正在运行（只有不是从积攒队列执行时才检测）
  if (!isFromQueue && batchTaskStore.isRunning) {
    // 检测到任务冲突，检查是否开启冲突加入积攒队列
    if (batchSettings.enableQueueOnConflict) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 批量日常任务 检测到任务冲突（有任务运行中），加入积攒队列依次执行 ===`,
        type: "warning",
      });
      batchTaskStore.addToTaskQueue({
        id: Date.now() + Math.random(),
        name: '批量日常任务',
        runType: 'manual',
        selectedTokens: [...selectedTokens.value],
        selectedTasks: ['startBatch'],
      });
    } else {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 批量日常任务 检测到任务冲突（有任务运行中），已关闭"冲突加入积攒队列"功能，将并行执行 ===`,
        type: "warning",
      });
      // 不return，继续执行，实现并行执行
    }
    if (batchSettings.enableQueueOnConflict) {
      return;
    }
  }

  const prevSelectedTasks = [...selectedTasks.value];
  selectedTasks.value = ['startBatch'];

  lastTaskExecution = Date.now();
  batchTaskStore.startTask();
  batchTaskStore.setProgress(0);

  // 保存执行状态，使用 ['startBatch'] 确保恢复时能正确识别任务类型
  safeLocalStorage.setItem('executingState', JSON.stringify({
    selectedTokens: selectedTokens.value,
    selectedTasks: ['startBatch'],
    timestamp: Date.now()
  }));

  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];

  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  // 并行执行任务，但通过connectionQueue限制并发连接数
  const taskPromises = selectedTokens.value.map(async (tokenId) => {
    if (shouldStop.value) return;

    tokenStatus.value[tokenId] = "running";

    let retryCount = 0;
    const MAX_RETRIES = 1;
    let success = false;

    while (retryCount <= MAX_RETRIES && !success) {
      if (shouldStop.value) break;

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        if (retryCount === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始执行: ${token.name} ===`,
            type: "info",
          });
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 尝试重试: ${token.name} (第${retryCount}次) ===`,
            type: "info",
          });
        }

        await ensureConnection(tokenId);

        // Create runner with delay settings
        const runner = new DailyTaskRunner(tokenStore, {
          commandDelay: batchSettings.commandDelay,
          taskDelay: batchSettings.taskDelay,
        });

        // Run tasks
        await runner.run(tokenId, {
          onLog: (log) => addLog(log),
          onProgress: (p) => {
            // 每个token维护自己的进度
          },
        });

        success = true;
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 执行完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        if (retryCount < MAX_RETRIES && !shouldStop.value) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 执行出错: ${error.message}，等待3秒后重试...`,
            type: "warning",
          });
          // Wait for potential token refresh in store
          await new Promise((r) => setTimeout(r, 3000));
          retryCount++;
        } else {
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 执行失败: ${error.message}`,
            type: "error",
          });
        }
      } finally {
        // 完成后关闭连接并释放槽位
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    }
  });

  // 等待所有任务完成
  await Promise.all(taskPromises);

  // 等待所有任务完成后再继续
  await new Promise((r) => setTimeout(r, 1000));

  isRunning.value = false;
  currentRunningTokenId.value = null;

  // 重要：先恢复 selectedTasks，然后停止任务
  selectedTasks.value = prevSelectedTasks;
  batchTaskStore.stopTask();

  // 重要：只有任务真正执行完成（不是加入积攒队列）后才检查积攒队列
  // 使用 await 确保积攒队列执行完成
  await checkAndExecuteQueuedTasks();

  message.success("批量任务执行结束");
};

const stopBatch = () => {
  shouldStop.value = true;
  addLog({
    time: new Date().toLocaleTimeString(),
    message: "正在停止...",
    type: "warning",
  });
};

const handleBlackMarketPurchaseComplete = (results) => {
  // 处理黑市周购买完成后的逻辑
  // 这里可以添加一些额外的处理，比如更新UI状态等
  addLog({
    time: new Date().toLocaleTimeString(),
    message: "黑市周购买助手执行完成",
    type: "success",
  });
};

// ======================
// 包装函数 - 用于分批执行任务
// ======================

// 简化的分批执行函数
const executeInBatches = async (taskFunction, taskName, taskFunctionName, isFromQueue = false, isScheduled = false) => {
  if (selectedTokens.value.length === 0) return;

  // 只有在任务不是从队列中执行时才检查冲突
  if (!isFromQueue) {
    // 检测任务冲突：有任务正在运行
    if (batchTaskStore.isRunning) {
      // 检测到任务冲突，检查是否开启冲突加入积攒队列
      if (batchSettings.enableQueueOnConflict) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${taskName} 检测到任务冲突（有任务运行中），加入积攒队列依次执行 ===`,
          type: "warning",
        });
        batchTaskStore.addToTaskQueue({
          id: Date.now() + Math.random(),
          name: taskName,
          runType: isScheduled ? 'scheduled' : 'manual',
          selectedTokens: [...selectedTokens.value],
          selectedTasks: [taskFunctionName || taskName],
        });
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${taskName} 检测到任务冲突（有任务运行中），将并行执行 ===`,
          type: "warning",
        });
      }
      if (batchSettings.enableQueueOnConflict) {
        return;
      }
    }

    // 确保任务状态正确
    batchTaskStore.startTask();
  } else {
    // 从队列中执行任务时，也需要设置 isRunning 为 true
    batchTaskStore.startTask();
  }

  const originalSelectedTasks = [...selectedTasks.value];
  const originalSelectedTokens = [...selectedTokens.value];
  if (taskFunctionName) {
    selectedTasks.value = [taskFunctionName];
  }

  // 分批执行判断逻辑
  let enableBatchExecution = false;
  if (isFromQueue) {
    // 从队列执行：使用全局分批执行设置
    enableBatchExecution = batchSettings.enableBatchExecution === true;
  } else if (isScheduled) {
    // 定时任务：默认禁用分批
    enableBatchExecution = false;
  } else {
    // 手动任务：受全局设置控制
    enableBatchExecution = batchSettings.enableBatchExecution === true;
  }

  // 如果不使用分批执行，直接执行任务
  if (!enableBatchExecution) {
    // 根据开关决定执行方式
    if (batchSettings.enableQueueOnConflict) {
      // 顺序执行：使用 await 等待完成
      try {
        await taskFunction();
      } catch (error) {
        console.error('执行任务失败:', error);
      }
    } else {
      // 并行执行：不使用 await，让任务在后台运行
      taskFunction().then(() => {
        // 任务完成后检查并执行积攒队列
        if (!batchTaskStore.isRunning.value) {
          checkAndExecuteQueuedTasks();
        }
      }).catch((error) => {
        console.error('并行执行任务失败:', error);
      });
    }
    selectedTasks.value = originalSelectedTasks;
    selectedTokens.value = originalSelectedTokens;
    // 顺序执行时，任务完成后检查并执行积攒队列
    if (batchSettings.enableQueueOnConflict && !batchTaskStore.isRunning.value) {
      checkAndExecuteQueuedTasks();
    }
    return;
  }

  // 分批执行逻辑
  const sortedTokens = [...selectedTokens.value].sort((a, b) => {
    const tokenA = sortedTokens.value.find((t) => t.id === a);
    const tokenB = sortedTokens.value.find((t) => t.id === b);
    return (tokenA?.sortOrder || 0) - (tokenB?.sortOrder || 0);
  });

  const batchSize = batchSettings.batchSize || 10;
  const batchDelay = (batchSettings.batchDelay || 5) * 1000;
  const totalTokens = sortedTokens.length;
  const totalBatches = Math.ceil(totalTokens / batchSize);

  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== ${taskName}开始，共 ${totalTokens} 个账号，分 ${totalBatches} 批执行，每批 ${batchSize} 个账号 ===`,
    type: "info",
  });

  // 保存运行中的任务（简化版，只保存任务配置，不保存进度）
  saveRunningTask({
    name: taskName,
    selectedTokens: [...originalSelectedTokens],
    selectedTasks: [taskFunctionName || taskName],
  });

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    if (batchTaskStore.shouldStop.value) {
      break;
    }
    
    // 检查是否进入暂停时间
    if (isPauseTime.value.paused) {
      const remainingTokens = sortedTokens.slice(batchIndex * batchSize);

      if (remainingTokens.length === 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 批量任务所有批次已完成，无需加入积攒队列 ===`,
          type: "info",
        });
        selectedTokens.value = [...originalSelectedTokens];
        selectedTasks.value = [...originalSelectedTasks];
        return;
      }

      // 检查任务是否已经在积攒队列中（避免重复添加）
      const existingTask = batchTaskStore.taskQueue.find(t => {
        const sameName = t.name === taskName;
        const sameTasks = JSON.stringify(t.selectedTasks?.sort()) === JSON.stringify([taskFunctionName || taskName].sort());
        const sameTokens = JSON.stringify(t.selectedTokens?.sort()) === JSON.stringify(remainingTokens.sort());
        return sameName && sameTasks && sameTokens;
      });
      if (!existingTask) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 批量任务被暂停: 当前处于${isPauseTime.value.reason}，已加入积攒队列（剩余 ${remainingTokens.length} 个账号） ===`,
          type: "info",
        });
        batchTaskStore.addToTaskQueue({
          id: Date.now() + Math.random(),
          name: taskName,
          runType: isScheduled ? 'scheduled' : 'manual',
          selectedTokens: remainingTokens,
          selectedTasks: [taskFunctionName || taskName],
        });
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 批量任务已在积攒队列中，跳过 ===`,
          type: "info",
        });
      }
      
      selectedTokens.value = [...originalSelectedTokens];
      selectedTasks.value = [...originalSelectedTasks];
      return;
    }
    
    const startIdx = batchIndex * batchSize;
    const endIdx = Math.min(startIdx + batchSize, totalTokens);
    const batchTokens = sortedTokens.slice(startIdx, endIdx);

    selectedTokens.value = batchTokens;
    
    // 重置 shouldStop，确保任务可以正常执行
    batchTaskStore.resetShouldStop();

    // 重要：保存当前的 isRunning 状态
    // 任务函数内部可能会调用 stopTask() 改变 isRunning 状态
    const wasRunningBeforeTask = batchTaskStore.isRunning.value;

    try {
      await taskFunction();
    } catch (error) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `执行批次时出错: ${error.message}`,
        type: "error",
      });
      console.error('taskFunction error:', error);
    } finally {
      // 重要：恢复 isRunning 状态
      // 如果任务执行前 isRunning 为 true，但任务函数内部调用了 stopTask() 将其设为 false
      // 则需要恢复为 true，以确保分批执行和积攒队列的正常工作
      if (wasRunningBeforeTask && !batchTaskStore.isRunning.value) {
        batchTaskStore.startTask();
      }
    }

    // 重置 shouldStop
    batchTaskStore.resetShouldStop();

    if (batchIndex < totalBatches - 1) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 第 ${batchIndex + 1} 批完成，等待 ${batchSettings.batchDelay} 秒后执行下一批 ===`,
        type: "info",
      });

      let remainingSeconds = batchSettings.batchDelay;
      while (remainingSeconds > 0 && !batchTaskStore.shouldStop.value) {
        // 重要：确保在等待期间 isRunning 保持为 true，防止按钮被启用
        if (!batchTaskStore.isRunning.value) {
          batchTaskStore.startTask();
        }
        
        // 检查是否进入暂停时间
        if (isPauseTime.value.paused) {
          const remainingTokens = sortedTokens.slice((batchIndex + 1) * batchSize);

          if (remainingTokens.length === 0) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== 批量任务所有批次已完成，无需加入积攒队列 ===`,
              type: "info",
            });
            selectedTokens.value = [...originalSelectedTokens];
            selectedTasks.value = [...originalSelectedTasks];
            return;
          }

          // 检查任务是否已经在积攒队列中（避免重复添加）
          const existingTask = batchTaskStore.taskQueue.find(t => {
            const sameName = t.name === taskName;
            const sameTasks = JSON.stringify(t.selectedTasks?.sort()) === JSON.stringify([taskFunctionName || taskName].sort());
            const sameTokens = JSON.stringify(t.selectedTokens?.sort()) === JSON.stringify(remainingTokens.sort());
            return sameName && sameTasks && sameTokens;
          });
          if (!existingTask) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== 批量任务在倒计时期间被暂停: 当前处于${isPauseTime.value.reason}，已加入积攒队列（剩余 ${remainingTokens.length} 个账号） ===`,
              type: "info",
            });
            batchTaskStore.addToTaskQueue({
              id: Date.now() + Math.random(),
              name: taskName,
              runType: 'manual',
              selectedTokens: remainingTokens,
              selectedTasks: [taskFunctionName || taskName],
            });
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== 批量任务已在积攒队列中，跳过 ===`,
              type: "info",
            });
          }
          
          selectedTokens.value = [...originalSelectedTokens];
          selectedTasks.value = [...originalSelectedTasks];
          return;
        }

        if (remainingSeconds % 10 === 0 || remainingSeconds <= 5) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `倒计时: ${remainingSeconds} 秒`,
            type: "info",
          });
        }
        await new Promise((r) => setTimeout(r, 1000));
        remainingSeconds--;
      }
    }
  }

  selectedTokens.value = originalSelectedTokens;
  selectedTasks.value = originalSelectedTasks;

  if (!batchTaskStore.shouldStop.value) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== ${taskName}完成 ===`,
      type: "success",
    });
    
    // 任务完成，清除保存的状态
    batchTaskStore.clearTaskState();
    clearRunningTask();
  }

  // 重要：只有非队列执行的任务才重置 isRunning 状态并检查积攒队列
  // 队列执行的任务由 checkAndExecuteQueuedTasks 统一管理
  if (!isFromQueue) {
    // 重要：先重置 isRunning 为 false，然后执行积攒队列
    batchTaskStore.stopTask();
    // 重要：任务完成后检查并执行积攒队列
    await checkAndExecuteQueuedTasks();
  }
};

// 包装函数定义
const wrappedClaimHangUpRewards = () => executeInBatches(claimHangUpRewards, '批量领取挂机', 'claimHangUpRewards');
const wrappedBatchAddHangUpTime = () => executeInBatches(batchAddHangUpTime, '批量加钟', 'batchAddHangUpTime');
const wrappedResetBottles = () => executeInBatches(resetBottles, '重置罐子', 'resetBottles');
const wrappedBatchlingguanzi = () => executeInBatches(batchlingguanzi, '一键领取罐子', 'batchlingguanzi');
const wrappedClimbTower = () => executeInBatches(climbTower, '一键爬塔', 'climbTower');
const wrappedClimbWeirdTower = () => executeInBatches(climbWeirdTower, '一键爬怪异塔', 'climbWeirdTower');
const wrappedBatchUseItems = () => executeInBatches(batchUseItems, '一键使用怪异塔道具', 'batchUseItems');
const wrappedBatchMergeItems = () => executeInBatches(batchMergeItems, '一键合成怪异塔道具', 'batchMergeItems');
const wrappedBatchStudy = () => executeInBatches(batchStudy, '一键答题', 'batchStudy');
const wrappedBatchSmartSendCar = () => executeInBatches(batchSmartSendCar, '智能发车', 'batchSmartSendCar');
const wrappedBatchClaimCars = () => executeInBatches(batchClaimCars, '一键收车', 'batchClaimCars');
const wrappedBatchClaimBoxPointReward = () => executeInBatches(batchClaimBoxPointReward, '领取宝箱积分', 'batchClaimBoxPointReward');
const wrappedBatchHeroUpgrade = () => executeInBatches(batchHeroUpgrade, '一键英雄升星', 'batchHeroUpgrade');
const wrappedBatchBookUpgrade = () => executeInBatches(batchBookUpgrade, '一键图鉴升星', 'batchBookUpgrade');
const wrappedBatchClaimStarRewards = () => executeInBatches(batchClaimStarRewards, '一键领取图鉴奖励', 'batchClaimStarRewards');
const wrappedBatchbaoku13 = () => executeInBatches(batchbaoku13, '一键宝库前3层', 'batchbaoku13');
const wrappedBatchbaoku45 = () => executeInBatches(batchbaoku45, '一键宝库4,5层', 'batchbaoku45');
const wrappedBatchmengjing = () => executeInBatches(batchmengjing, '一键梦境', 'batchmengjing');
const wrappedBatchDreamBuy = () => executeInBatches(batchBuyDreamItems, '梦境购买', 'batchBuyDreamItems');
const wrappedBatchclubsign = () => executeInBatches(batchclubsign, '一键俱乐部签到', 'batchclubsign');
const wrappedBatcharenafight = () => executeInBatches(batcharenafight, '一键竞技场战斗', 'batcharenafight');
const wrappedBatchTopUpFish = () => executeInBatches(batchTopUpFish, '一键钓鱼补齐', 'batchTopUpFish');
const wrappedBatchTopUpArena = () => executeInBatches(batchTopUpArena, '一键竞技场补齐', 'batchTopUpArena');
const wrappedBatchClaimFreeEnergy = () => executeInBatches(batchClaimFreeEnergy, '一键领取怪异塔免费道具', 'batchClaimFreeEnergy');
const wrappedSkinChallenge = () => executeInBatches(skinChallenge, '一键换皮闯关', 'skinChallenge');
const wrappedLegion_storebuygoods = () => executeInBatches(legion_storebuygoods, '一键购买四圣碎片', 'legion_storebuygoods');
const wrappedLegionStoreBuySkinCoins = () => executeInBatches(legionStoreBuySkinCoins, '一键购买俱乐部5皮肤币', 'legionStoreBuySkinCoins');
const wrappedStore_purchase = () => executeInBatches(store_purchase, '一键黑市采购', 'store_purchase');
const wrappedCollection_claimfreereward = () => executeInBatches(collection_claimfreereward, '免费领取珍宝阁', 'collection_claimfreereward');
const wrappedBatchLegacyClaim = () => executeInBatches(batchLegacyClaim, '批量功法残卷领取', 'batchLegacyClaim');
const wrappedBatchLegacyGiftSendEnhanced = () => executeInBatches(batchLegacyGiftSendEnhanced, '批量功法残卷赠送', 'batchLegacyGiftSendEnhanced');
const wrappedBatchOpenBox = () => executeInBatches(() => openHelperModal('box'), '批量开箱', 'batchOpenBox');
const wrappedBatchFish = () => executeInBatches(() => openHelperModal('fish'), '批量钓鱼', 'batchFish');
const wrappedBatchRecruit = () => executeInBatches(() => openHelperModal('recruit'), '批量招募', 'batchRecruit');

// 原始任务函数映射（用于批量执行，避免嵌套调用）
const originalTaskFunctionMap = {
  claimHangUpRewards,
  batchAddHangUpTime,
  resetBottles,
  climbTower,
  batchStudy,
  batchSmartSendCar,
  batchClaimCars,
  batchlingguanzi,
  climbWeirdTower,
  batchbaoku13,
  batchbaoku45,
  batchmengjing,
  batchBuyDreamItems,
  batchclubsign,
  batcharenafight,
  batchTopUpFish,
  batchTopUpArena,
  batchClaimFreeEnergy,
  legion_storebuygoods,
  store_purchase,
  batchLegacyClaim,
  batchLegacyGiftSendEnhanced,
  batchOpenBox,
  batchFish,
  batchRecruit,
  batchClaimBoxPointReward,
  collection_claimfreereward,
  skinChallenge,
  batchMergeItems,
  batchUseItems,
  batchHeroUpgrade,
  batchBookUpgrade,
  batchClaimStarRewards,
  legionStoreBuySkinCoins,
  startBatch,
};

const getOriginalTaskFunction = (taskName) => {
  return originalTaskFunctionMap[taskName] || null;
};

// 包装任务函数映射（用于UI按钮点击）
const taskFunctionMap = {
  claimHangUpRewards: wrappedClaimHangUpRewards,
  batchAddHangUpTime: wrappedBatchAddHangUpTime,
  resetBottles: wrappedResetBottles,
  climbTower: wrappedClimbTower,
  batchStudy: wrappedBatchStudy,
  batchSmartSendCar: wrappedBatchSmartSendCar,
  batchClaimCars: wrappedBatchClaimCars,
  batchlingguanzi: wrappedBatchlingguanzi,
  climbWeirdTower: wrappedClimbWeirdTower,
  batchbaoku13: wrappedBatchbaoku13,
  batchbaoku45: wrappedBatchbaoku45,
  batchmengjing: wrappedBatchmengjing,
  batchDreamBuy: wrappedBatchDreamBuy,
  batchclubsign: wrappedBatchclubsign,
  batcharenafight: wrappedBatcharenafight,
  batchTopUpFish: wrappedBatchTopUpFish,
  batchTopUpArena: wrappedBatchTopUpArena,
  batchClaimFreeEnergy: wrappedBatchClaimFreeEnergy,
  legion_storebuygoods: wrappedLegion_storebuygoods,
  store_purchase: wrappedStore_purchase,
  batchLegacyClaim: wrappedBatchLegacyClaim,
  batchLegacyGiftSendEnhanced: wrappedBatchLegacyGiftSendEnhanced,
  batchOpenBox: wrappedBatchOpenBox,
  batchFish: wrappedBatchFish,
  batchRecruit: wrappedBatchRecruit,
  batchClaimBoxPointReward: wrappedBatchClaimBoxPointReward,
  collection_claimfreereward: wrappedCollection_claimfreereward,
  skinChallenge: wrappedSkinChallenge,
  batchMergeItems: wrappedBatchMergeItems,
  batchUseItems: wrappedBatchUseItems,
  batchHeroUpgrade: wrappedBatchHeroUpgrade,
  batchBookUpgrade: wrappedBatchBookUpgrade,
  batchClaimStarRewards: wrappedBatchClaimStarRewards,
  legionStoreBuySkinCoins: wrappedLegionStoreBuySkinCoins,
  startBatch,
};

const getTaskFunction = (taskName) => {
  return taskFunctionMap[taskName] || null;
};
</script>

<style scoped>
.batch-daily-tasks {
  padding: 20px;
  height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
}

.main-layout {
  display: flex;
  gap: 20px;
  height: 100%;
  overflow: hidden;
}

.left-column {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
  padding-right: 8px;
}

.right-column {
  width: 400px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 700px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.token-item {
  display: flex;
  align-items: center;
}

.log-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.custom-card-header {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
  flex-wrap: nowrap;
}

/* Cron Parser Styles */
.cron-parser {
  margin-top: 12px;
  padding: 12px;
  background-color: var(--bg-tertiary);
  border-radius: 8px;
}

.cron-validation {
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 4px;
}

.cron-validation.success {
  background-color: rgba(24, 160, 88, 0.12);
}

.cron-validation.error {
  background-color: rgba(235, 87, 87, 0.12);
}

.cron-next-runs h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.cron-next-runs ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.cron-next-runs li {
  padding: 6px 0;
  font-size: 13px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.cron-next-runs li:last-child {
  border-bottom: none;
}

.log-card :deep(.n-card__content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.log-header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-container {
  flex: 1;
  overflow-y: auto;
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
  font-family: monospace;
  min-height: 200px;
}

.log-item {
  margin-bottom: 4px;
  font-size: 12px;
}

.log-item.error {
  color: #d03050;
}

.log-item.success {
  color: #18a058;
}

.log-item.warning {
  color: #f0a020;
}

.log-item.info {
  color: #333;
}

.time {
  color: #999;
  margin-right: 8px;
}

.token-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 8px;
}

/* Settings Modal Styles */
.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  font-size: 14px;
  color: #666;
}

.setting-switches {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.switch-row:last-child {
  border-bottom: none;
}

.switch-label {
  font-size: 14px;
  color: #666;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .right-column {
    width: 380px;
  }
}

@media (max-width: 992px) {
  .batch-daily-tasks {
    height: auto;
    overflow: visible;
  }

  .main-layout {
    flex-direction: column;
    height: auto;
    overflow: visible;
  }

  .left-column {
    overflow-y: visible;
    padding-right: 0;
  }

  .right-column {
    width: 100%;
    height: auto;
    flex-shrink: 0;
  }

  .log-container {
    height: 300px;
    min-height: 300px;
  }
}

@media (max-width: 768px) {
  .batch-daily-tasks {
    padding: 12px;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .main-layout {
    height: auto;
    overflow: visible;
    flex-direction: column;
  }

  .left-column {
    overflow: visible;
    padding-right: 0;
    flex: none;
    height: auto;
  }

  .right-column {
    height: auto;
    width: 100%;
    flex: none;
  }

  .page-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .page-header .actions {
    display: flex;
    gap: 8px;
  }

  .log-card {
    height: auto !important;
  }

  .log-card :deep(.n-card__content) {
    flex: none !important;
    overflow: visible !important;
    display: block !important;
  }

  .log-container {
    height: 300px;
    min-height: 300px;
    flex: none !important;
  }

  .log-header-controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  /* 批量功法残卷赠送样式 */
  .recipient-info:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  }

  /* 头像悬停效果 */
  .avatar-container:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
  }

  /* 加载动画 */
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }

    100% {
      transform: rotate(360deg);
    }
  }

  /* Token分组管理样式 */
  .group-selection-section {
    padding: 12px;
    background-color: #f5f7fa;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .group-tag {
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
    user-select: none;
    text-align: center;
    font-weight: 500;
  }

  .group-tag:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .group-tag-selected {
    color: white;
    font-weight: 600;
  }

  /* 响应式设计 */
  @media (max-width: 600px) {
    .recipient-info {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .avatar-container {
      margin-bottom: 12px;
    }
  }
}
</style>
