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
              <div
                v-if="isPauseTime.paused"
                style="font-size: 14px; font-weight: 500; color: #f56c6c"
              >
                {{ isPauseTime.reason }} - 暂停中
              </div>
              <div
                v-if="isPauseTime.paused && pauseCountdown"
                style="font-size: 14px; color: #6c757d"
              >
                {{ pauseCountdown }}
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
              :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
              size="medium"
            >
              {{ batchTaskStore.isRunning ? "执行中..." : "开始执行" }}
            </n-button>
            <n-button
              @click="stopBatch"
              :disabled="!batchTaskStore.isRunning"
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
            <n-button @click="showPushSettingsModal = true" type="default" size="medium">
              <template #icon>
                <n-icon>
                  <NotificationsOutline />
                </n-icon>
              </template>
              推送设置
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
                    <n-button size="small" @click="wrappedBatchDreamBuy" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">梦境购买</n-button>
                    <n-button size="small" @click="wrappedSkinChallenge" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键换皮闯关</n-button>
                    <n-button size="small" @click="batchClaimPeachTasks" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键领取蟠桃园任务</n-button>
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
                    <n-button size="small" @click="openHelperModal('box')" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">批量开箱</n-button>
                    <n-button size="small" @click="wrappedBatchClaimBoxPointReward" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">领取宝箱积分</n-button>
                    <n-button size="small" @click="openHelperModal('fish')" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">批量钓鱼</n-button>
                    <n-button size="small" @click="openHelperModal('recruit')" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">批量招募</n-button>
                    <n-button size="small" @click="wrappedLegion_storebuygoods" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键购买四圣碎片</n-button>
                    <n-button size="small" @click="wrappedLegionStoreBuySkinCoins" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键购买俱乐部5皮肤币</n-button>
                    <n-tooltip trigger="hover" v-if="!isBlackMarketWeek">
                      <template #trigger>
                        <n-button size="small" :disabled="true">黑市周购买助手({{ blackMarketCountdown }})</n-button>
                      </template>
                      <span>黑市周{{ blackMarketCountdown }}</span>
                    </n-tooltip>
                    <n-button v-else size="small" @click="showBlackMarketBuyerModal = true" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0 || !isBlackMarketWeek || !isBlackMarketUpdated">黑市周购买助手({{ blackMarketCountdown }})</n-button>
                    <n-button size="small" @click="wrappedBatchHeroUpgrade" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键英雄升星</n-button>
                    <n-button size="small" @click="wrappedBatchBookUpgrade" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键图鉴升星</n-button>
                    <n-button size="small" @click="wrappedBatchClaimStarRewards" :disabled="batchTaskStore.isRunning || selectedTokens.length === 0">一键领取图鉴奖励</n-button>
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
                  @click="claimHangUpRewards"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  领取挂机
                </n-button>
                <n-button
                  size="small"
                  @click="batchAddHangUpTime"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键加钟
                </n-button>
                <n-button
                  size="small"
                  @click="resetBottles"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  重置罐子
                </n-button>
                <n-button
                  size="small"
                  @click="batchlingguanzi"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键领取罐子
                </n-button>
                <n-button
                  size="small"
                  @click="batchclubsign"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键俱乐部签到
                </n-button>
                <n-button
                  size="small"
                  @click="batchStudy"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键答题
                </n-button>
                <n-button
                  size="small"
                  @click="batcharenafight"
                  :disabled="
                    batchTaskStore.isRunning || selectedTokens.length === 0 || !isarenaActivityOpen
                  "
                >
                  一键竞技场战斗3次
                </n-button>
                <n-button
                  size="small"
                  @click="batchSmartSendCar"
                  :disabled="
                    batchTaskStore.isRunning || selectedTokens.length === 0 || !isCarActivityOpen
                  "
                >
                  智能发车
                </n-button>
                <n-button
                  size="small"
                  @click="batchClaimCars"
                  :disabled="
                    batchTaskStore.isRunning || selectedTokens.length === 0 || !isCarActivityOpen
                  "
                >
                  一键收车
                </n-button>
                <n-button
                  size="small"
                  @click="store_purchase"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键黑市采购
                </n-button>
                <n-button
                  size="small"
                  @click="collection_claimfreereward"
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
                  @click="climbTower"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键爬塔
                </n-button>
                <n-button
                  size="small"
                  @click="batchmengjing"
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
                  @click="skinChallenge"
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
                  @click="batchDreamBuy"
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
                  @click="batchbaoku13"
                  :disabled="
                    batchTaskStore.isRunning || selectedTokens.length === 0 || !isbaokuActivityOpen
                  "
                >
                  一键宝库前3层
                </n-button>
                <n-button
                  size="small"
                  @click="batchbaoku45"
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
                  @click="climbWeirdTower"
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
                  @click="batchUseItems"
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
                  @click="batchMergeItems"
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
                  @click="batchClaimFreeEnergy"
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
                  @click="batchClaimBoxPointReward"
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
                  @click="legion_storebuygoods"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键购买四圣碎片
                </n-button>
                <n-button
                  size="small"
                  @click="legionStoreBuySkinCoins"
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
                  @click="batchHeroUpgrade"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键英雄升星
                </n-button>
                <n-button
                  size="small"
                  @click="batchBookUpgrade"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键图鉴升星
                </n-button>
                <n-button
                  size="small"
                  @click="batchClaimStarRewards"
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
                  @click="batchLegacyClaim"
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
                  @click="batchTopUpFish"
                  :disabled="batchTaskStore.isRunning || selectedTokens.length === 0"
                >
                  一键钓鱼补齐
                </n-button>
                <n-button
                  size="small"
                  @click="batchTopUpArena"
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
                  {{ batchTaskStore.logs.length }}/{{ batchSettings.maxLogEntries || 1000 }}
                </span>
              </div>
            </div>
          </template>
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
          <n-progress
            type="line"
            :percentage="batchTaskStore.currentProgress"
            :indicator-placement="'inside'"
            color="#18a058"
            processing
            style="margin-top: 12px"
          />
          <!-- 底部按钮区域 -->
          <div class="log-footer-controls" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <n-checkbox v-model:checked="batchTaskStore.autoScrollLog" size="small">
              自动滚动
            </n-checkbox>
            <n-checkbox v-model:checked="batchTaskStore.filterErrorsOnly" size="small">
              只显示错误
            </n-checkbox>
            <n-tag v-if="errorCount > 0" type="error" size="small">
              {{ errorCount }} 个错误
            </n-tag>
            <n-button size="small" @click="clearLogs"> 清空日志 </n-button>
            <n-button size="small" @click="copyLogs"> 复制日志 </n-button>
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
            <div style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
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
                    color: group.color
                  }"
                  ghost
                >
                  {{ group.name }}
                </n-button>
                <div v-if="tokenGroups.length === 0" style="font-size: 12px; color: #ccc;">
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
              <n-input
                v-model:value="recipientIdInput"
                placeholder="请输入接收者ID"
                type="number"
                @input="clearRecipientError"
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

    <!-- Helper Modal (开箱/钓鱼/招募) -->
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
          <div class="setting-item">
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
            <span>{{ (task.selectedTokens || []).length }} 个</span>
          </div>
          <div style="margin-bottom: 8px">
            <span style="color: #6b7280">选中任务：</span>
            <span>{{ (task.selectedTasks || []).length }} 个</span>
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
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-size: 12px; color: #86909c">
                  快速选择分组：
                </div>
                <n-button type="primary" size="tiny" text @click="showGroupManageModal = true">
                  管理分组
                </n-button>
              </div>
              <div v-if="tokenGroups.length === 0" style="font-size: 12px; color: #ccc;">
                暂无分组
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap">
                <n-button
                  v-for="group in tokenGroups"
                  :key="group.id"
                  size="small"
                  :type="taskScheduleSelectedGroupIds.includes(group.id) ? 'primary' : 'default'"
                  @click="
                    () => {
                      const index = taskScheduleSelectedGroupIds.indexOf(group.id);
                      const groupTokenIds = getValidGroupTokenIds(group.id);
                      
                      if (index > -1) {
                        // 取消选择该分组
                        taskScheduleSelectedGroupIds.splice(index, 1);
                        taskForm.selectedTokens = taskForm.selectedTokens.filter(
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
              <n-tabs type="line" animated size="small" pane-style="padding-top: 12px;" default-value="daily">
                <n-tab-pane 
                  v-for="group in taskGroupDefinitions" 
                  :key="group.name" 
                  :name="group.name" 
                  :tab="group.label"
                >
                  <n-grid :cols="2" :x-gap="12" :y-gap="8">
                    <n-grid-item v-for="task in groupedAvailableTasks[group.name]" :key="task.value">
                      <n-checkbox :value="task.value">{{ task.label }}</n-checkbox>
                    </n-grid-item>
                  </n-grid>
                </n-tab-pane>
                
                <n-tab-pane 
                  v-if="groupedAvailableTasks['other'] && groupedAvailableTasks['other'].length > 0" 
                  name="other" 
                  tab="其他"
                >
                  <n-grid :cols="2" :x-gap="12" :y-gap="8">
                    <n-grid-item v-for="task in groupedAvailableTasks['other']" :key="task.value">
                      <n-checkbox :value="task.value">{{ task.label }}</n-checkbox>
                    </n-grid-item>
                  </n-grid>
                </n-tab-pane>
              </n-tabs>
            </n-checkbox-group>
          </div>
          <n-divider title-placement="left" style="margin: 1px 0">分批执行设置</n-divider>
          <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
            <label class="setting-label">启用分批执行</label>
            <n-switch v-model:value="taskForm.enableBatchExecution" />
          </div>
          <div class="setting-item" v-if="taskForm.enableBatchExecution" style="flex-direction: row; justify-content: space-between; align-items: center;">
            <label class="setting-label">每批账号数量</label>
            <n-input-number v-model:value="taskForm.batchSize" :min="1" :max="100" :step="1" size="small" style="width: 140px" />
          </div>
          <div class="setting-item" v-if="taskForm.enableBatchExecution" style="flex-direction: row; justify-content: space-between; align-items: center;">
            <label class="setting-label">批次间延迟(秒)</label>
            <n-input-number v-model:value="taskForm.batchDelay" :min="1" :max="3600" :step="10" size="small" style="width: 140px" />
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
        <n-grid :cols="{ xs: 1, sm: 1, md: 2, lg: 2 }" :x-gap="24">
          <!-- 左列：批量操作设置 -->
          <n-grid-item>
            <n-divider title-placement="left" style="margin: 1px 0 8px 0"
              >批量操作设置</n-divider
            >
            <div class="settings-grid">
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">开箱数量(10倍)</label>
                <n-input-number v-model:value="batchSettingsForm.boxCount" :min="10" :max="10000" :step="10" size="small" style="width: 120px" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">钓鱼数量(10倍)</label>
                <n-input-number v-model:value="batchSettingsForm.fishCount" :min="10" :max="10000" :step="10" size="small" style="width: 120px" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">招募数量(10倍)</label>
                <n-input-number v-model:value="batchSettingsForm.recruitCount" :min="10" :max="10000" :step="10" size="small" style="width: 120px" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">默认宝箱类型</label>
                <n-select v-model:value="batchSettingsForm.defaultBoxType" :options="boxTypeOptions" size="small" style="width: 120px" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">默认鱼竿类型</label>
                <n-select v-model:value="batchSettingsForm.defaultFishType" :options="fishTypeOptions" size="small" style="width: 120px" />
              </div>
            <n-divider title-placement="left" style="margin: 12px 0 8px 0"
              >智能发车条件设置</n-divider
            >
            <div class="settings-grid">
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">保底车辆颜色</label>
                <n-select
                  v-model:value="batchSettingsForm.carMinColor"
                  :options="[
                    { label: '绿·普通', value: 1 },
                    { label: '蓝·稀有', value: 2 },
                    { label: '紫·史诗', value: 3 },
                    { label: '橙·传说', value: 4 },
                    { label: '红·神话', value: 5 },
                    { label: '金·传奇', value: 6 },
                  ]"
                  size="small"
                  style="width: 120px"
                />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">车辆强制刷新保底 (优先级最高)</label>
                <n-switch v-model:value="batchSettingsForm.useGoldRefreshFallback"/>
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">启用最大刷新次数限制</label>
                <n-switch v-model:value="batchSettingsForm.enableMaxCarRefresh"/>
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">最大刷新次数(0=无限制刷新)</label>
                <n-input-number v-model:value="batchSettingsForm.maxCarRefreshCount" :min="0" :max="15" :step="1" size="small" style="width: 100px" :disabled="!batchSettingsForm.enableMaxCarRefresh" />
              </div>
              <n-collapse>
                <n-collapse-item title="刷新规则说明">
                  <div class="refresh-rules">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px;">
                      <thead>
                        <tr style="background-color: #f5f5f5;">
                          <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">设置值</th>
                          <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">行为</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style="border: 1px solid #ddd; padding: 6px;">0</td>
                          <td style="border: 1px solid #ddd; padding: 6px;">无限制刷新，直到满足条件或无刷新条件</td>
                        </tr>
                        <tr>
                          <td style="border: 1px solid #ddd; padding: 6px;">1</td>
                          <td style="border: 1px solid #ddd; padding: 6px;">只允许免费刷新1次，用完就停止</td>
                        </tr>
                        <tr>
                          <td style="border: 1px solid #ddd; padding: 6px;">2-15</td>
                          <td style="border: 1px solid #ddd; padding: 6px;">允许用刷新券或金砖，最多刷新指定次数</td>
                        </tr>
                      </tbody>
                    </table>
                    <div style="margin-top: 10px; font-size: 12px; color: #666; line-height: 1.4;">
                      <p><strong>特别说明：</strong></p>
                      <p>1. 最大刷新次数的限制优先级高于保底颜色的要求</p>
                      <p>2. 例如：选择橙传说车作为保底颜色，同时设置最大刷新次数=1</p>
                      <p>   - 系统只会使用1次免费刷新</p>
                      <p>   - 不管刷新后是不是橙色传说，都会直接发车</p>
                      <p>   - 不会为了追求橙色传说而继续刷新</p>
                      <p>3. 这样设计的目的是保护资源，防止过度消耗刷新券和金砖</p>
                    </div>
                  </div>
                </n-collapse-item>
              </n-collapse>
            </div>
            <div class="settings-grid">
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">满足任一条件即可发车</label>
                <n-switch v-model:value="batchSettingsForm.smartDepartureMatchAll"/>
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">金砖 >=</label>
                <n-input-number v-model:value="batchSettingsForm.smartDepartureGoldThreshold" :min="0" :step="100" size="small" style="width: 100px" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">招募令 >=</label>
                <n-input-number v-model:value="batchSettingsForm.smartDepartureRecruitThreshold" :min="0" :step="10" size="small" style="width: 100px" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">白玉 >=</label>
                <n-input-number v-model:value="batchSettingsForm.smartDepartureJadeThreshold" :min="0" :step="100" size="small" style="width: 100px" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">刷新卷 >=</label>
                <n-input-number v-model:value="batchSettingsForm.smartDepartureTicketThreshold" :min="0" :step="1" size="small" style="width: 100px" />
              </div>
            </div>
            </div>
            <n-divider title-placement="left" style="margin: 12px 0 8px 0"
              >功法赠送设置</n-divider
            >
            <div class="settings-grid">
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">接收者ID</label>
                <n-input v-model:value="batchSettingsForm.receiverId" placeholder="ID" size="small" style="width: 120px" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">密码</label>
                <n-input v-model:value="batchSettingsForm.password" type="password" placeholder="密码" size="small" style="width: 120px" />
              </div>
            </div>
            <n-divider title-placement="left" style="margin: 12px 0 8px 0"
              >界面设置</n-divider
            >
            <div class="settings-grid">
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">隐藏定时任务模块</label>
                <n-switch v-model:value="batchSettingsForm.hideScheduledTasksModule" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">列表每行数量</label>
                <n-input-number v-model:value="batchSettingsForm.tokenListColumns" :min="1" :max="10" :step="1" size="small" style="width: 120px" />
              </div>
            </div>
            <n-divider title-placement="left" style="margin: 12px 0 8px 0"
              >暂停时间设置</n-divider
            >
            <div class="settings-grid">
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">启用活动暂停功能</label>
                <n-switch v-model:value="batchSettingsForm.enablePauseTime" />
              </div>
            </div>
            <n-collapse style="margin-top: 10px;">
              <n-collapse-item name="pauseTimeSettings" title="暂停时间设置">
                <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                  <label class="setting-label">启用抢符时间暂停</label>
                  <n-switch v-model:value="batchSettingsForm.enableRobFuTime" />
                </div>
                <div class="setting-subgroup" style="margin-left: 20px; margin-bottom: 10px;">
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">活动名称</label>
                    <n-input v-model:value="batchSettingsForm.robFuTimeName" size="small" style="width: 150px" placeholder="活动名称" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">开始时间</label>
                    <n-input v-model:value="batchSettingsForm.robFuStartTime" size="small" style="width: 100px" placeholder="HH:MM" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">结束时间</label>
                    <n-input v-model:value="batchSettingsForm.robFuEndTime" size="small" style="width: 100px" placeholder="HH:MM" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">执行频率</label>
                    <n-select v-model:value="batchSettingsForm.robFuTimeFrequency" size="small" style="width: 100px" :options="[{ label: '每天', value: 'daily' }, { label: '特定星期', value: 'weekly' }]" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;" v-if="batchSettingsForm.robFuTimeFrequency === 'weekly'">
                    <label class="setting-label" style="font-size: 13px;">星期几</label>
                    <n-select v-model:value="batchSettingsForm.robFuTimeDayOfWeek" size="small" style="width: 100px" :options="[{ label: '周一', value: 1 }, { label: '周二', value: 2 }, { label: '周三', value: 3 }, { label: '周四', value: 4 }, { label: '周五', value: 5 }, { label: '周六', value: 6 }, { label: '周日', value: 0 }]" />
                  </div>
                </div>
                <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                  <label class="setting-label">启用周六盐场时间暂停</label>
                  <n-switch v-model:value="batchSettingsForm.enableSaltFieldTime" />
                </div>
                <div class="setting-subgroup" style="margin-left: 20px; margin-bottom: 10px;">
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">活动名称</label>
                    <n-input v-model:value="batchSettingsForm.saltFieldName" size="small" style="width: 150px" placeholder="活动名称" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">开始时间</label>
                    <n-input v-model:value="batchSettingsForm.saltFieldStartTime" size="small" style="width: 100px" placeholder="HH:MM" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">结束时间</label>
                    <n-input v-model:value="batchSettingsForm.saltFieldEndTime" size="small" style="width: 100px" placeholder="HH:MM" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">执行频率</label>
                    <n-select v-model:value="batchSettingsForm.saltFieldFrequency" size="small" style="width: 100px" :options="[{ label: '每天', value: 'daily' }, { label: '特定星期', value: 'weekly' }]" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;" v-if="batchSettingsForm.saltFieldFrequency === 'weekly'">
                    <label class="setting-label" style="font-size: 13px;">星期几</label>
                    <n-select v-model:value="batchSettingsForm.saltFieldDayOfWeek" size="small" style="width: 100px" :options="[{ label: '周一', value: 1 }, { label: '周二', value: 2 }, { label: '周三', value: 3 }, { label: '周四', value: 4 }, { label: '周五', value: 5 }, { label: '周六', value: 6 }, { label: '周日', value: 0 }]" />
                  </div>
                </div>
                <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                  <label class="setting-label">启用周日盐场时间暂停</label>
                  <n-switch v-model:value="batchSettingsForm.enableSundaySaltFieldTime" />
                </div>
                <div class="setting-subgroup" style="margin-left: 20px; margin-bottom: 10px;">
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">活动名称</label>
                    <n-input v-model:value="batchSettingsForm.sundaySaltFieldName" size="small" style="width: 150px" placeholder="活动名称" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">开始时间</label>
                    <n-input v-model:value="batchSettingsForm.sundaySaltFieldStartTime" size="small" style="width: 100px" placeholder="HH:MM" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">结束时间</label>
                    <n-input v-model:value="batchSettingsForm.sundaySaltFieldEndTime" size="small" style="width: 100px" placeholder="HH:MM" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">执行频率</label>
                    <n-select v-model:value="batchSettingsForm.sundaySaltFieldFrequency" size="small" style="width: 100px" :options="[{ label: '每天', value: 'daily' }, { label: '特定星期', value: 'weekly' }]" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;" v-if="batchSettingsForm.sundaySaltFieldFrequency === 'weekly'">
                    <label class="setting-label" style="font-size: 13px;">星期几</label>
                    <n-select v-model:value="batchSettingsForm.sundaySaltFieldDayOfWeek" size="small" style="width: 100px" :options="[{ label: '周一', value: 1 }, { label: '周二', value: 2 }, { label: '周三', value: 3 }, { label: '周四', value: 4 }, { label: '周五', value: 5 }, { label: '周六', value: 6 }, { label: '周日', value: 0 }]" />
                  </div>
                </div>
                <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                  <label class="setting-label">启用游戏更新时间暂停</label>
                  <n-switch v-model:value="batchSettingsForm.enableGameUpdateTime" />
                </div>
                <div class="setting-subgroup" style="margin-left: 20px; margin-bottom: 10px;">
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">活动名称</label>
                    <n-input v-model:value="batchSettingsForm.gameUpdateName" size="small" style="width: 150px" placeholder="活动名称" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">开始时间</label>
                    <n-input v-model:value="batchSettingsForm.gameUpdateStartTime" size="small" style="width: 100px" placeholder="HH:MM" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">结束时间</label>
                    <n-input v-model:value="batchSettingsForm.gameUpdateEndTime" size="small" style="width: 100px" placeholder="HH:MM" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">执行频率</label>
                    <n-select v-model:value="batchSettingsForm.gameUpdateFrequency" size="small" style="width: 100px" :options="[{ label: '每天', value: 'daily' }, { label: '特定星期', value: 'weekly' }]" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;" v-if="batchSettingsForm.gameUpdateFrequency === 'weekly'">
                    <label class="setting-label" style="font-size: 13px;">星期几</label>
                    <n-select v-model:value="batchSettingsForm.gameUpdateDayOfWeek" size="small" style="width: 100px" :options="[{ label: '周一', value: 1 }, { label: '周二', value: 2 }, { label: '周三', value: 3 }, { label: '周四', value: 4 }, { label: '周五', value: 5 }, { label: '周六', value: 6 }, { label: '周日', value: 0 }]" />
                  </div>
                </div>
                <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                  <label class="setting-label">启用自定义暂停时间1</label>
                  <n-switch v-model:value="batchSettingsForm.enableCustomPauseTime1" />
                </div>
                <div class="setting-subgroup" style="margin-left: 20px; margin-bottom: 10px;">
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">活动名称</label>
                    <n-input v-model:value="batchSettingsForm.customPauseTime1Name" size="small" style="width: 150px" placeholder="活动名称" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">开始时间</label>
                    <n-input v-model:value="batchSettingsForm.customPauseTime1Start" size="small" style="width: 100px" placeholder="HH:MM" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">结束时间</label>
                    <n-input v-model:value="batchSettingsForm.customPauseTime1End" size="small" style="width: 100px" placeholder="HH:MM" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">执行频率</label>
                    <n-select v-model:value="batchSettingsForm.customPauseTime1Frequency" size="small" style="width: 100px" :options="[{ label: '每天', value: 'daily' }, { label: '特定星期', value: 'weekly' }]" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;" v-if="batchSettingsForm.customPauseTime1Frequency === 'weekly'">
                    <label class="setting-label" style="font-size: 13px;">星期几</label>
                    <n-select v-model:value="batchSettingsForm.customPauseTime1DayOfWeek" size="small" style="width: 100px" :options="[{ label: '周一', value: 1 }, { label: '周二', value: 2 }, { label: '周三', value: 3 }, { label: '周四', value: 4 }, { label: '周五', value: 5 }, { label: '周六', value: 6 }, { label: '周日', value: 0 }]" />
                  </div>
                </div>
                <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                  <label class="setting-label">启用自定义暂停时间2</label>
                  <n-switch v-model:value="batchSettingsForm.enableCustomPauseTime2" />
                </div>
                <div class="setting-subgroup" style="margin-left: 20px; margin-bottom: 10px;">
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">活动名称</label>
                    <n-input v-model:value="batchSettingsForm.customPauseTime2Name" size="small" style="width: 150px" placeholder="活动名称" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">开始时间</label>
                    <n-input v-model:value="batchSettingsForm.customPauseTime2Start" size="small" style="width: 100px" placeholder="HH:MM" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">结束时间</label>
                    <n-input v-model:value="batchSettingsForm.customPauseTime2End" size="small" style="width: 100px" placeholder="HH:MM" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">执行频率</label>
                    <n-select v-model:value="batchSettingsForm.customPauseTime2Frequency" size="small" style="width: 100px" :options="[{ label: '每天', value: 'daily' }, { label: '特定星期', value: 'weekly' }]" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;" v-if="batchSettingsForm.customPauseTime2Frequency === 'weekly'">
                    <label class="setting-label" style="font-size: 13px;">星期几</label>
                    <n-select v-model:value="batchSettingsForm.customPauseTime2DayOfWeek" size="small" style="width: 100px" :options="[{ label: '周一', value: 1 }, { label: '周二', value: 2 }, { label: '周三', value: 3 }, { label: '周四', value: 4 }, { label: '周五', value: 5 }, { label: '周六', value: 6 }, { label: '周日', value: 0 }]" />
                  </div>
                </div>
                <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                  <label class="setting-label">启用自定义暂停时间3</label>
                  <n-switch v-model:value="batchSettingsForm.enableCustomPauseTime3" />
                </div>
                <div class="setting-subgroup" style="margin-left: 20px; margin-bottom: 10px;">
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">活动名称</label>
                    <n-input v-model:value="batchSettingsForm.customPauseTime3Name" size="small" style="width: 150px" placeholder="活动名称" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">开始时间</label>
                    <n-input v-model:value="batchSettingsForm.customPauseTime3Start" size="small" style="width: 100px" placeholder="HH:MM" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">结束时间</label>
                    <n-input v-model:value="batchSettingsForm.customPauseTime3End" size="small" style="width: 100px" placeholder="HH:MM" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">执行频率</label>
                    <n-select v-model:value="batchSettingsForm.customPauseTime3Frequency" size="small" style="width: 100px" :options="[{ label: '每天', value: 'daily' }, { label: '特定星期', value: 'weekly' }]" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;" v-if="batchSettingsForm.customPauseTime3Frequency === 'weekly'">
                    <label class="setting-label" style="font-size: 13px;">星期几</label>
                    <n-select v-model:value="batchSettingsForm.customPauseTime3DayOfWeek" size="small" style="width: 100px" :options="[{ label: '周一', value: 1 }, { label: '周二', value: 2 }, { label: '周三', value: 3 }, { label: '周四', value: 4 }, { label: '周五', value: 5 }, { label: '周六', value: 6 }, { label: '周日', value: 0 }]" />
                  </div>
                </div>
                <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                  <label class="setting-label">启用自定义暂停时间4</label>
                  <n-switch v-model:value="batchSettingsForm.enableCustomPauseTime4" />
                </div>
                <div class="setting-subgroup" style="margin-left: 20px; margin-bottom: 10px;">
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">活动名称</label>
                    <n-input v-model:value="batchSettingsForm.customPauseTime4Name" size="small" style="width: 150px" placeholder="活动名称" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">开始时间</label>
                    <n-input v-model:value="batchSettingsForm.customPauseTime4Start" size="small" style="width: 100px" placeholder="HH:MM" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">结束时间</label>
                    <n-input v-model:value="batchSettingsForm.customPauseTime4End" size="small" style="width: 100px" placeholder="HH:MM" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                    <label class="setting-label" style="font-size: 13px;">执行频率</label>
                    <n-select v-model:value="batchSettingsForm.customPauseTime4Frequency" size="small" style="width: 100px" :options="[{ label: '每天', value: 'daily' }, { label: '特定星期', value: 'weekly' }]" />
                  </div>
                  <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;" v-if="batchSettingsForm.customPauseTime4Frequency === 'weekly'">
                    <label class="setting-label" style="font-size: 13px;">星期几</label>
                    <n-select v-model:value="batchSettingsForm.customPauseTime4DayOfWeek" size="small" style="width: 100px" :options="[{ label: '周一', value: 1 }, { label: '周二', value: 2 }, { label: '周三', value: 3 }, { label: '周四', value: 4 }, { label: '周五', value: 5 }, { label: '周六', value: 6 }, { label: '周日', value: 0 }]" />
                  </div>
                </div>
              </n-collapse-item>
            </n-collapse>
          </n-grid-item>
          <!-- 右列：延迟与连接设置 -->
          <n-grid-item>
            <n-divider title-placement="left" style="margin: 1px 0 8px 0"
              >延迟设置(ms)</n-divider
            >
            <div class="settings-grid">
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">命令延迟</label>
                <n-input-number v-model:value="batchSettingsForm.commandDelay" :min="100" :max="2000" :step="100" size="small" style="width: 120px" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">任务间延迟</label>
                <n-input-number v-model:value="batchSettingsForm.taskDelay" :min="100" :max="2000" :step="100" size="small" style="width: 120px" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">操作延迟</label>
                <n-input-number v-model:value="batchSettingsForm.actionDelay" :min="100" :max="2000" :step="100" size="small" style="width: 120px" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">战斗延迟</label>
                <n-input-number v-model:value="batchSettingsForm.battleDelay" :min="100" :max="2000" :step="100" size="small" style="width: 120px" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">刷新延迟</label>
                <n-input-number v-model:value="batchSettingsForm.refreshDelay" :min="500" :max="3000" :step="100" size="small" style="width: 120px" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">长延迟</label>
                <n-input-number v-model:value="batchSettingsForm.longDelay" :min="1000" :max="10000" :step="500" size="small" style="width: 120px" />
              </div>
            </div>
            <n-divider title-placement="left" style="margin: 12px 0 8px 0"
              >连接设置</n-divider
            >
            <div class="settings-grid">
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">最大并发数</label>
                <n-input-number v-model:value="batchSettingsForm.maxActive" :min="1" :max="20" :step="1" size="small" style="width: 120px" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">连接超时(ms)</label>
                <n-input-number v-model:value="batchSettingsForm.connectionTimeout" :min="1000" :max="30000" :step="1000" size="small" style="width: 120px" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">重连等待(ms)</label>
                <n-input-number v-model:value="batchSettingsForm.reconnectDelay" :min="100" :max="5000" :step="100" size="small" style="width: 120px" />
              </div>
            </div>
            <n-divider title-placement="left" style="margin: 12px 0 8px 0"
              >日志设置</n-divider
            >
            <div class="settings-grid">
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">最大日志条目</label>
                <n-input-number v-model:value="batchSettingsForm.maxLogEntries" :min="100" :max="5000" :step="100" size="small" style="width: 120px" />
              </div>
            </div>
            <n-divider title-placement="left" style="margin: 12px 0 8px 0"
              >分批执行设置</n-divider
            >
            <div class="settings-grid">
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">启用分批执行</label>
                <n-switch v-model:value="batchSettingsForm.enableBatchExecution" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">每批账号数量</label>
                <n-input-number v-model:value="batchSettingsForm.batchSize" :min="1" :max="50" :step="1" :disabled="!batchSettings.enableBatchExecution" size="small" style="width: 120px" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">批次间延迟(秒)</label>
                <n-input-number v-model:value="batchSettingsForm.batchDelay" :min="5" :max="300" :step="5" :disabled="!batchSettings.enableBatchExecution" size="small" style="width: 120px" />
              </div>
            </div>
            <n-divider title-placement="left" style="margin: 12px 0 8px 0"
              >系统维护设置</n-divider
            >
            <div class="settings-grid">
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;">
                <label class="setting-label">定时刷新页面</label>
                <n-switch v-model:value="batchSettingsForm.enableRefresh" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;" v-if="batchSettingsForm.enableRefresh">
                <label class="setting-label">刷新间隔(分钟)</label>
                <n-input-number v-model:value="batchSettingsForm.refreshInterval" :min="1" :max="1440" :step="1" size="small" style="width: 100px" />
              </div>
              <div class="setting-item" style="flex-direction: row; justify-content: space-between; align-items: center;" v-if="batchSettingsForm.enableRefresh">
                <label class="setting-label">任务完成后刷新延迟(秒)</label>
                <n-input-number v-model:value="batchSettingsForm.refreshNoticeDelay" :min="5" :max="300" :step="5" size="small" style="width: 100px" />
              </div>
            </div>
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
        <div class="settings-grid" style="display: block;">
          <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 16px">拍手器:</span>
             <n-input-number v-model:value="warGuessCoin" placeholder="拍手器" :min="1" :max="20" style="width: 120px" >
             </n-input-number>
             <n-button type="primary" @click="handleWarGuessCheer" :disabled="!selectedWarGuessLegionId || batchTaskStore.isRunning">
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
            :row-key="row => row.id"
            :checked-row-keys="selectedWarGuessLegionId ? [selectedWarGuessLegionId] : []"
            @update:checked-row-keys="(keys) => selectedWarGuessLegionId = keys[0]"
            :row-props="warGuessRowProps"
            style="height: 400px; flex: 1;"
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
          <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px; flex-wrap: wrap;">
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
                    border: newGroupColor === color ? '3px solid #000' : '2px solid #ddd',
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
          <div style="background: #f9f9f9; padding: 12px; border-radius: 8px; border: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 13px; font-weight: bold;">包含账号 ({{ newGroupSelectedTokens.length }})</span>
              <n-space size="small">
                <n-button size="tiny" @click="selectAllNewGroup">全选</n-button>
                <n-button size="tiny" @click="deselectAllNewGroup">全不选</n-button>
              </n-space>
            </div>
            <div style="max-height: 150px; overflow-y: auto;">
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
                        border: editingGroupColor === color ? '3px solid #000' : '2px solid #ddd',
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

    <!-- 恢复任务对话框 -->
    <n-modal
      v-model:show="showResumeTaskDialog"
      preset="dialog"
      title="检测到未完成的任务"
      :show-icon="true"
      :mask-closable="false"
      :close-on-esc="false"
      style="width: 450px"
    >
      <div style="padding: 10px 0;">
        <p style="margin-bottom: 15px; font-size: 15px;">
          <n-icon style="vertical-align: middle; margin-right: 8px; color: #f0a020;">
            <AlertCircleOutline />
          </n-icon>
          上次任务执行中断，是否继续？
        </p>
        <div v-if="resumeTaskState" style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
          <p style="margin: 5px 0; font-size: 14px;">
            <strong>任务名称：</strong>{{ resumeTaskState.taskName || '批量任务' }}
          </p>
          <p style="margin: 5px 0; font-size: 14px;">
            <strong>当前进度：</strong>第 {{ resumeTaskState.currentBatchIndex + 1 }} / {{ resumeTaskState.totalBatches }} 批
          </p>
          <p style="margin: 5px 0; font-size: 14px;">
            <strong>账号数量：</strong>{{ resumeTaskState.selectedTokens?.length || 0 }} 个
          </p>
          <p style="margin: 5px 0; font-size: 14px;">
            <strong>中断时间：</strong>{{ new Date(resumeTaskState.timestamp).toLocaleString() }}
          </p>
        </div>
        <p style="color: #888; font-size: 13px; margin-top: 10px;">
          提示：选择"继续任务"将从上次中断的批次继续执行
        </p>
      </div>
      <template #action>
        <n-button @click="cancelResumeTask" style="margin-right: 10px;">
          放弃任务
        </n-button>
        <n-button type="primary" @click="resumeTaskExecution">
          继续任务
        </n-button>
      </template>
    </n-modal>

    <!-- 黑市周购买助手模态框 -->
    <n-modal
      v-model:show="showBlackMarketBuyerModal"
      title="黑市周购买助手"
      width="80%"
      max-width="800px"
    >
      <BlackMarketBuyer
        ref="blackMarketBuyerRef"
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

    <!-- 推送设置模态框 -->
    <n-modal
      v-model:show="showPushSettingsModal"
      title="推送设置"
      width="400px"
    >
      <PushNotificationSettings />
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
  toRef,
} from "vue";
import { useTokenStore, gameTokens, tokenGroups } from "@/stores/tokenStore";
import { useBatchTaskStore } from "@/stores/batchTaskStore";
import { useScheduledTaskStore } from "@/stores/scheduledTaskStore";
import BlackMarketBuyer from "@/components/cards/BlackMarketBuyer.vue";
import { DailyTaskRunner } from "@/utils/dailyTaskRunner";
import { preloadQuestions } from "@/utils/studyQuestionsFromJSON.js";
import { useMessage } from "naive-ui";
import { Settings, AlertCircleOutline, TimerOutline, NotificationsOutline } from "@vicons/ionicons5";
import PushNotificationSettings from "@/components/PushNotificationSettings.vue";
import useIndexedDB from "@/hooks/useIndexedDB";
import { Filesystem, Directory } from '@capacitor/filesystem';
import { sendTaskCompleteNotification } from '@/utils/pushNotification';

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

// Initialize stores and services
const tokenStore = useTokenStore();
const batchTaskStore = useBatchTaskStore();
const scheduledTaskStore = useScheduledTaskStore();
const message = useMessage();

const indexedDB = useIndexedDB();
const { storeArrayBuffer, getArrayBuffer, getAllKeys, waitForReady } = indexedDB;

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
  const timestamp = new Date().toLocaleString();
  const logEntry = {
    timestamp,
    ...log
  };
  
  // 添加到日志数组
  batchTaskStore.logs.push(logEntry);
  
  // 输出到控制台
  console.log(`[${timestamp}] ${log.message}`);
  
  // 保存关键日志到 localStorage
  try {
    const existingLogs = JSON.parse(safeLocalStorage.getItem('task_logs') || '[]');
    existingLogs.push(logEntry);
    // 只保留最近100条日志
    if (existingLogs.length > 100) {
      existingLogs.splice(0, existingLogs.length - 100);
    }
    safeLocalStorage.setItem('task_logs', JSON.stringify(existingLogs));
  } catch (error) {
    console.warn('Failed to save logs:', error);
  }
};

// 定期执行清理任务
setInterval(cleanupLocalStorageTasks, 10 * 60 * 1000); // 每10分钟清理一次

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

const tokens = computed(() => tokenStore.gameTokens);

// 将selectedTokens（ID数组）转换为token对象数组
const selectedTokenObjects = computed(() => {
  if (!tokens.value || !Array.isArray(tokens.value)) return [];
  return selectedTokens.value
    .map(id => tokens.value.find(t => t.id === id))
    .filter(t => t !== undefined);
});

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
// 黑市周时间配置（黑市周：周五12:00开启，下周五00:00关闭）
const BLACK_MARKET_CONFIG = {
  // 首次黑市周开启时间：2026年3月6日 12:00（周五）
  firstOpenTime: new Date('2026-03-06T12:00:00').getTime(),
  // 黑市周开启时长：6天12小时（周五12:00到下周五00:00）
  openDuration: 6 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000,
  // 周期：3周（毫秒），每3周一次黑市周
  cycleDuration: 3 * 7 * 24 * 60 * 60 * 1000
};

// 计算当前是否处于黑市周开启期间
const isBlackMarketOpen = () => {
  const now = Date.now();
  const { firstOpenTime, cycleDuration, openDuration } = BLACK_MARKET_CONFIG;
  
  // 计算当前周期
  const cyclesSinceFirst = Math.floor((now - firstOpenTime) / cycleDuration);
  
  // 计算当前周期的开启时间和关闭时间
  const currentOpenTime = firstOpenTime + cyclesSinceFirst * cycleDuration;
  const currentCloseTime = currentOpenTime + openDuration;
  
  return {
    isOpen: now >= currentOpenTime && now < currentCloseTime,
    openTime: currentOpenTime,
    closeTime: currentCloseTime,
    nextOpenTime: currentOpenTime + cycleDuration
  };
};

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

// 黑市周状态
const isBlackMarketWeek = computed(() => {
  const blackMarketStatus = isBlackMarketOpen();
  return blackMarketStatus.isOpen;
});

const isBlackMarketUpdated = computed(() => {
  // 使用新的黑市周判断逻辑
  const blackMarketStatus = isBlackMarketOpen();
  return blackMarketStatus.isOpen;
});

// 黑市周倒计时
const blackMarketCountdown = ref('');
let blackMarketCountdownTimer = null;

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
const updateBlackMarketCountdown = () => {
  const status = isBlackMarketOpen();
  if (status.isOpen) {
    blackMarketCountdown.value = `剩余: ${formatBlackMarketCountdown(status.closeTime)}`;
  } else {
    blackMarketCountdown.value = `开启: ${formatBlackMarketCountdown(status.openTime)}`;
  }
};

// 启动黑市周倒计时
const startBlackMarketCountdown = () => {
  updateBlackMarketCountdown();
  blackMarketCountdownTimer = setInterval(updateBlackMarketCountdown, 60000); // 每分钟更新
};

// 在组件挂载时启动倒计时
onMounted(() => {
  startBlackMarketCountdown();
});

// 在组件卸载时清除定时器
onUnmounted(() => {
  if (blackMarketCountdownTimer) {
    clearInterval(blackMarketCountdownTimer);
  }
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
  let firstSundayDate = 1 + (7 - dayOfWeek) % 7;

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
  if (now.getFullYear() === 2026 && now.getMonth() === 2 && now.getDate() === 1) {
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
const selectedTasks = ref([]);
const tokenStatus = ref({}); // { tokenId: 'waiting' | 'running' | 'completed' | 'failed' }


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

// 功能按钮折叠状态管理
const isButtonsExpanded = ref(true);
const toggleButtons = () => {
  isButtonsExpanded.value = !isButtonsExpanded.value;
};

// 账号列表折叠状态管理
const isTokensExpanded = ref(true);
const toggleTokens = () => {
  isTokensExpanded.value = !isTokensExpanded.value;
};

// 活动暂停功能相关
const currentTime = ref(new Date());
const resumeCheckInterval = ref(null); // 恢复时间检查定时器

// 从localStorage加载任务队列
const loadTaskQueueFromStorage = () => {
  // 如果队列已经有数据，先清空（避免热更新时重复添加）
  if (batchTaskStore.taskQueue.length > 0) {
    batchTaskStore.clearTaskQueue();
  }
  
  // 优先从新的键名加载
  const savedQueue = safeLocalStorage.getItem('batch_task_queue');
  if (savedQueue && typeof savedQueue === 'string' && savedQueue !== 'undefined') {
    try {
      const parsedQueue = JSON.parse(savedQueue);
      if (Array.isArray(parsedQueue)) {
        parsedQueue.forEach(task => {
          batchTaskStore.addToTaskQueue(task);
        });
        if (batchTaskStore.taskQueue.length > 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 从本地存储加载了 ${batchTaskStore.taskQueue.length} 个积攒任务 ===`,
            type: "info",
          });
        }
      }
    } catch (error) {
      console.error('加载任务队列失败:', error);
      batchTaskStore.clearTaskQueue();
      safeLocalStorage.removeItem('batch_task_queue');
    }
  }
  
  // 清理旧的键名
  safeLocalStorage.removeItem('taskQueue');
};

// 保存任务队列到localStorage
const saveTaskQueueToStorage = () => {
  safeLocalStorage.setItem('batch_task_queue', JSON.stringify(batchTaskStore.taskQueue));
};

// 清空任务队列
const clearTaskQueue = () => {
  batchTaskStore.clearTaskQueue();
  safeLocalStorage.removeItem('taskQueue');
};

// 监听任务队列变化，自动保存
watch(() => batchTaskStore.taskQueue, () => {
  saveTaskQueueToStorage();
}, { deep: true });

// 解析时间字符串为小时和分钟
const parseTime = (timeStr) => {
  // 处理用点分隔的时间格式，转换为冒号分隔
  if (timeStr.includes('.')) {
    timeStr = timeStr.replace('.', ':');
  }
  const parts = timeStr.split(':');
  return {
    hour: parseInt(parts[0]) || 0,
    minute: parseInt(parts[1]) || 0
  };
};

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
        // 需要区分当前是"开始日期"还是"结束日期"
        // 如果在开始日期（dayOfWeek === customPauseTime1DayOfWeek），则检查 nowTotalSeconds >= startTotalSeconds
        // 如果在结束日期（dayOfWeek === (customPauseTime1DayOfWeek + 1) % 7），则检查 nowTotalSeconds < endTotalSeconds
        const isStartDay = dayOfWeek === batchSettings.customPauseTime1DayOfWeek;
        const isEndDay = dayOfWeek === (batchSettings.customPauseTime1DayOfWeek + 1) % 7;
        
        if ((isStartDay && nowTotalSeconds >= startTotalSeconds) || 
            (isEndDay && nowTotalSeconds < endTotalSeconds)) {
          const resumeDate = new Date(now);
          if (isStartDay) {
            // 在开始日期，恢复时间是第二天的 endTime
            resumeDate.setDate(resumeDate.getDate() + 1);
          }
          // 在结束日期，恢复时间就是当天的 endTime
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

const warGuessColumns = [
  {
    type: 'selection',
    multiple: false,
  },
  { title: 'ID', key: 'id', width: 100 },
  { title: '头像', key: 'logo', render(row) {
      return h('img', { src: row.logo, style: { width: '30px', height: '30px', borderRadius: '50%' } });
  }, width: 60 },
  { title: '区服', key: 'serverId', width: 80 },
  { title: '俱乐部', key: 'name', width: 120 },
  { title: '战力', key: 'power', render(row) {
    return formatPower(row.power);
  }, width: 100 },
  { title: '红淬', key: 'quenchNum' },
  { title: '已助威', key: 'guessNum' },
  { title: '总热度', key: 'totalNum',render(row) {
    return formatPower(row.totalNum || 0);
  }, width: 100 },
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
  const token = tokens.value.find(t => t.id === tokenId);
  
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
        await new Promise(r => setTimeout(r, 2000)); // Wait for connection
    }
    
    // Fetch rank
    const res = await tokenStore.sendMessageWithPromise(tokenId, "warguess_getrank", { bfId: '' }, 5000);
    
    if (res && res.list) {
      let list = [];
      if (Array.isArray(res.list)) {
        list = res.list;
      } else {
        list = Object.values(res.list);
      }
      
      // Sort by totalNum desc
      warGuessList.value = list.sort((a, b) => (b.totalNum || 0) - (a.totalNum || 0)).slice(0, 20);
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
});

const helperModalTitle = computed(() => {
  const titles = { box: "批量开宝箱", fish: "批量钓鱼", recruit: "批量招募" };
  return titles[helperType.value] || "批量助手";
});

// Batch Settings State
const showBatchSettingsModal = ref(false);

// 临时表单数据（用于编辑，保存后才应用到batchSettings）
const batchSettingsForm = reactive({});

// 实际使用的设置
const batchSettings = reactive({
  boxCount: 100,
  fishCount: 100,
  recruitCount: 100,
  defaultBoxType: 2001,
  defaultFishType: 1,
  receiverId: "",
  password: "",
  hideScheduledTasksModule: false,
  tokenListColumns: 2,
  useGoldRefreshFallback: false,
  enableMaxCarRefresh: true, // 启用最大刷新次数限制
  maxCarRefreshCount: 1,   // 每辆车最大刷新次数
  // 延迟配置（毫秒）
  commandDelay: 500,        // 命令间延迟
  taskDelay: 500,           // 任务间延迟
  actionDelay: 300,         // 一般操作延迟（开箱、钓鱼、招募等）
  battleDelay: 500,         // 战斗延迟（宝库、竞技场等）
  refreshDelay: 1000,       // 刷新延迟（发车刷新等）
  longDelay: 3000,          // 长延迟（功法赠送等）
  // 其他配置
  maxActive: 5,
  carMinColor: 4,
  connectionTimeout: 10000,
  reconnectDelay: 1000,
  maxLogEntries: 1000,
  // 页面刷新配置
  enableRefresh: false,
  refreshInterval: 360, // 分钟
  refreshNoticeDelay: 30, // 任务完成后刷新延迟(秒)
  // 智能发车阈值配置
  smartDepartureGoldThreshold: 100,
  smartDepartureRecruitThreshold: 3,
  smartDepartureJadeThreshold: 100,
  smartDepartureTicketThreshold: 5,
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
  gameUpdateEndTime: "02:00",
  gameUpdateFrequency: "daily",
  gameUpdateDayOfWeek: 1,
  enableCustomPauseTime1: false,
  customPauseTime1Name: "自定义时间1",
  customPauseTime1Start: "00:00",
  customPauseTime1End: "06:00",
  customPauseTime1Frequency: "daily",
  customPauseTime1DayOfWeek: 1,
  enableCustomPauseTime2: false,
  customPauseTime2Name: "自定义时间2",
  customPauseTime2Start: "06:00",
  customPauseTime2End: "12:00",
  customPauseTime2Frequency: "daily",
  customPauseTime2DayOfWeek: 1,
  enableCustomPauseTime3: false,
  customPauseTime3Name: "自定义时间3",
  customPauseTime3Start: "12:00",
  customPauseTime3End: "18:00",
  customPauseTime3Frequency: "daily",
  customPauseTime3DayOfWeek: 1,
  enableCustomPauseTime4: false,
  customPauseTime4Name: "自定义时间4",
  customPauseTime4Start: "18:00",
  customPauseTime4End: "24:00",
  customPauseTime4Frequency: "daily",
  customPauseTime4DayOfWeek: 1,
  enableBatchExecution: true,
  batchSize: 5,
  batchDelay: 5,
});

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
    // 将临时表单数据复制到实际设置
    Object.assign(batchSettings, JSON.parse(JSON.stringify(batchSettingsForm)));
    localStorage.setItem("batchSettings", JSON.stringify(batchSettings));
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
  // 将当前设置复制到临时表单
  Object.assign(batchSettingsForm, JSON.parse(JSON.stringify(batchSettings)));
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
// 从 Store 获取定时任务列表
const scheduledTasks = computed(() => scheduledTaskStore.scheduledTasks);
const showTaskModal = ref(false); // Control the visibility of the add/edit task modal
const showTasksModal = ref(false); // Control the visibility of the tasks list modal
const showBlackMarketBuyerModal = ref(false); // Control the visibility of the black market buyer modal
const showPushSettingsModal = ref(false); // 推送设置模态框
const blackMarketBuyerRef = ref(null); // Reference to the BlackMarketBuyer component
const showResumeTaskDialog = ref(false); // 显示恢复任务对话框
const resumeTaskState = ref(null); // 保存的任务状态
const editingTask = ref(null); // Currently editing task
const taskForm = reactive({
  name: "", // Task name
  runType: "daily", // 'daily' or 'cron'
  runTime: null, // Daily run time (HH:mm format)
  cronExpression: "", // Cron expression for complex scheduling
  selectedTokens: [], // Selected token IDs
  selectedTasks: [], // Selected task function names
  enabled: true, // Whether the task is enabled
  enableBatchExecution: false,
  batchSize: 10,
  batchDelay: 60,
});

// 任务分组定义
const taskGroupDefinitions = [
  { name: 'daily', label: '日常', tasks: ['startBatch', 'claimHangUpRewards', 'batchAddHangUpTime', 'resetBottles', 'batchlingguanzi', 'batchclubsign', 'batchStudy', 'batcharenafight', 'batchSmartSendCar', 'batchClaimCars', 'store_purchase', 'collection_claimfreereward', 'batchGenieSweep'] },
  { name: 'dungeon', label: '副本', tasks: ['climbTower', 'batchmengjing', 'skinChallenge', 'batchClaimPeachTasks', 'batchDreamBuy'] },
  { name: 'baoku', label: '宝库', tasks: ['batchbaoku13', 'batchbaoku45'] },
  { name: 'weirdTower', label: '怪异塔', tasks: ['climbWeirdTower', 'batchUseItems', 'batchMergeItems', 'batchClaimFreeEnergy'] },
  { name: 'resource', label: '资源', tasks: ['batchOpenBox', 'batchClaimBoxPointReward', 'batchFish', 'batchRecruit', 'legion_storebuygoods'] },
  { name: 'legacy', label: '功法', tasks: ['batchLegacyClaim', 'batchLegacyGiftSendEnhanced'] },
  { name: 'monthly', label: '月度', tasks: ['batchTopUpFish', 'batchTopUpArena'] }
];

// 计算属性，根据 taskGroupDefinitions 将 availableTasks 分组
const groupedAvailableTasks = computed(() => {
  const groups = {};
  taskGroupDefinitions.forEach(group => {
    groups[group.name] = availableTasks.filter(task => group.tasks.includes(task.value));
  });
  
  // 处理未分组的任务
  const groupedTaskValues = taskGroupDefinitions.flatMap(g => g.tasks);
  const otherTasks = availableTasks.filter(task => !groupedTaskValues.includes(task.value));
  if (otherTasks.length > 0) {
    groups['other'] = otherTasks;
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

  // 检查是否有任务正在运行
  if (batchTaskStore.isRunning) {
    message.warning('当前有任务正在运行，已加入积攒队列');
    batchTaskStore.addToTaskQueue({
      id: Date.now() + Math.random(),
      name: task.name,
      runType: 'manual',
      selectedTokens: [...(task.selectedTokens || task.tokenIds || [])],
      selectedTasks: [...(task.selectedTasks || task.taskNames || ['batchDaily'])],
    });
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 任务 ${task.name} 检测到任务冲突（有任务运行中），已加入积攒队列 ===`,
      type: "warning",
    });
    return;
  }

  if (isPauseTime.value && isPauseTime.value.paused) {
    message.warning(`当前处于${isPauseTime.value.reason}，已加入积攒队列`);
    batchTaskStore.addToTaskQueue({
      id: Date.now() + Math.random(),
      name: task.name,
      runType: 'manual',
      selectedTokens: [...(task.selectedTokens || task.tokenIds || [])],
      selectedTasks: [...(task.selectedTasks || task.taskNames || ['batchDaily'])],
    });
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 任务 ${task.name} 已加入积攒队列，当前队列长度: ${batchTaskStore.taskQueue.length} ===`,
      type: "info",
    });
    return;
  }

  // Reset stop flag if not running, to allow manual execution
  if (!batchTaskStore.isRunning.value && batchTaskStore.shouldStop.value) {
    batchTaskStore.resetTaskState();
  }

  // 简化版任务持久化：保存正在执行的任务
  saveRunningTask(task);

  executingTaskIds.value.push(task.id);
  try {
    message.info(`开始执行任务: ${task.name}`);
    await executeScheduledTask(task);
    message.success(`任务 ${task.name} 执行完成`);
  } catch (e) {
    console.error(`执行任务 ${task.name} 失败:`, e);
    message.error(`任务 ${task.name} 执行失败`);
  } finally {
    executingTaskIds.value = executingTaskIds.value.filter(id => id !== task.id);
    // 任务完成，清除保存的任务信息
    clearRunningTask();
  }
};

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

    localStorage.setItem("scheduledTasks", dataToSave);
    // Verify save was successful
    const saved = localStorage.getItem("scheduledTasks");
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
    enableBatchExecution: taskForm.enableBatchExecution,
    batchSize: taskForm.batchSize,
    batchDelay: taskForm.batchDelay,
  };

  let isNew = !editingTask.value;

  if (editingTask.value) {
    // Update existing task
    scheduledTaskStore.updateTask(editingTask.value.id, taskData);
  } else {
    // Add new task
    scheduledTaskStore.addTask({
      name: taskData.name,
      taskName: taskData.name, // 暂时使用name作为taskName
      runType: taskData.runType,
      runTime: taskData.runTime,
      cronExpression: taskData.cronExpression,
      selectedTokens: taskData.selectedTokens,
      selectedTasks: taskData.selectedTasks,
    });
  }

  // 不再需要手动保存，Store会自动处理

  // Add log entry for task save
  addTaskSaveLog(taskData, isNew, addLog);

  showTaskModal.value = false;
  message.success("定时任务已保存");
};

// Delete task
const deleteTask = (taskId) => {
  const task = scheduledTasks.value.find((t) => t.id === taskId);
  if (task) {
    scheduledTaskStore.removeTask(taskId);
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
    // 直接更新任务状态，不再调用toggleTask（避免状态被切换两次）
    scheduledTaskStore.updateTask(taskId, { enabled });
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

const exportConfig = async () => {
  try {
    const loadingMsg = message.loading('正在导出配置，读取BIN文件中...', { duration: 0 });
    
    const ready = await waitForReady(3000);
    if (!ready) {
      console.error('IndexedDB 未准备好，无法导出BIN文件');
    }
    
    const validTokenIds = new Set(tokens.value.map((t) => t.id));

    const filteredScheduledTasks = scheduledTasks.value.map((task) => ({
      ...task,
      selectedTokens: task.selectedTokens?.filter((tokenId) => validTokenIds.has(tokenId)) || [],
    })).filter((task) => task.selectedTokens.length > 0);

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

    const binFiles = {};
    try {
      const keys = await getAllKeys();
      const existingKeys = new Set(keys);
      
      for (const token of tokens.value) {
        let arrayBuffer = null;
        
        if (existingKeys.has(token.id)) {
          arrayBuffer = await getArrayBuffer(token.id);
        } else if (existingKeys.has(token.name)) {
          arrayBuffer = await getArrayBuffer(token.name);
        }
        
        if (arrayBuffer) {
          binFiles[token.id] = Array.from(new Uint8Array(arrayBuffer));
        }
      }
    } catch (binError) {
      console.error('Failed to get BIN files:', binError);
      // 继续执行，即使BIN文件获取失败
    }

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

    let tokenSortConfig = null;
    try {
      const saved = localStorage.getItem("tokenSortConfig");
      if (saved) {
        tokenSortConfig = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('获取账号排序配置失败', e);
    }

    let tokenGroups = [];
    try {
      const saved = localStorage.getItem("tokenGroups");
      if (saved) {
        tokenGroups = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('获取分组配置失败', e);
    }

    const exportData = {
      version: "1.2",
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
      batchSettings: { ...batchSettings },
      taskTemplates: taskTemplates,
      tokenSortConfig: tokenSortConfig,
      tokenSettings: tokenSettings,
      tokenGroups: tokenGroups,
      binFiles: binFiles,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const getBeijingDateTime = () => {
      const now = new Date();
      now.setHours(now.getHours() + 8);
      return now.toISOString().slice(0, 16).replace('T', '_').replace(':', '');
    };
    const fileName = `xyzw_config_${getBeijingDateTime()}.json`;

    const isAndroidApp = typeof window !== 'undefined' && 
                      window.Capacitor && 
                      (window.Capacitor.isNativePlatform() || /android/i.test(navigator.userAgent));

    if (isAndroidApp) {
      try {
        loadingMsg.content = '正在保存文件...';
        const permStatus = await Filesystem.checkPermissions();
        if (permStatus.publicStorage !== 'granted') {
          const reqResult = await Filesystem.requestPermissions();
          if (reqResult.publicStorage !== 'granted') {
            loadingMsg.destroy();
            message.error('存储权限被拒绝，请在设置中允许存储权限后重试');
            return;
          }
        }

        const encodedData = btoa(unescape(encodeURIComponent(jsonString)));
        await Filesystem.writeFile({
          path: fileName,
          data: encodedData,
          directory: Directory.Documents,
          encoding: 'utf8'
        });
        
        await new Promise((resolve) => setTimeout(resolve, 500));
        loadingMsg.destroy();
        message.success(`设置导出成功！文件已保存到：/storage/emulated/0/Documents/${fileName}`);
      } catch (fsError) {
        loadingMsg.destroy();
        console.error('文件系统保存失败:', fsError);
        message.warning('存储权限可能不足，尝试使用浏览器下载方式');
        saveFileByDownload(jsonString, fileName);
      }
    } else {
      loadingMsg.destroy();
      saveFileByDownload(jsonString, fileName);
    }
  } catch (error) {
    loadingMsg.destroy();
    console.error("Export failed:", error);
    message.error("导出失败: " + error.message);
  }
};

// 辅助函数：使用下载方式保存文件
const saveFileByDownload = (jsonString, fileName) => {
  try {
    const blob = new Blob([jsonString], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const exportData = JSON.parse(jsonString);
    message.success(
      `导出成功: ${exportData.tokens.length} 个账号, ${exportData.scheduledTasks.length} 个定时任务, ${Object.keys(exportData.binFiles || {}).length} 个BIN文件`
    );
  } catch (error) {
    console.error('下载保存失败:', error);
    message.error('导出失败，请重试');
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
    reader.onload = async (e) => {
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

        if (!importData.version || !importData.tokens || !importData.scheduledTasks) {
          message.error("无效的配置文件格式");
          return;
        }

        let importedTokens = 0;
        let importedTasks = 0;
        let restoredBinFiles = 0;

        message.info('开始导入账号...');
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

        message.info('开始导入定时任务...');
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
              message.warning(`导入任务失败 ${idx + 1}: ${importedTask.name}`);
              console.error(taskErr);
            }
          });
          saveScheduledTasks();
          message.success(`定时任务导入完成: ${importedTasks} 个`);
        }

        message.info('开始导入批量设置...');
        if (importData.batchSettings) {
          Object.assign(batchSettings, importData.batchSettings);
          saveBatchSettings();
          message.success('批量设置导入完成');
        }

        message.info('开始导入账号设置...');
        if (Array.isArray(importData.tokenSettings)) {
          message.info(`找到 ${importData.tokenSettings.length} 个账号设置`);
          importData.tokenSettings.forEach((item, idx) => {
            try {
              if (item.tokenId && item.settings) {
                localStorage.setItem(
                  `daily-settings:${item.tokenId}`,
                  JSON.stringify(item.settings)
                );
              }
            } catch (settingsErr) {
              message.warning(`导入账号设置失败 ${idx + 1}`);
              console.error(settingsErr);
            }
          });
        }

        if (importData.binFiles) {
          message.info('开始导入BIN文件...');
          const ready = await waitForReady(3000);
          if (!ready) {
            message.error('IndexedDB 未准备好，无法导入BIN文件');
          }
          const binFiles = importData.binFiles;
          message.info(`找到 ${Object.keys(binFiles).length} 个BIN文件`);
          
          for (const [tokenId, uint8Array] of Object.entries(binFiles)) {
            try {
              const arrayBuffer = new Uint8Array(uint8Array).buffer;
              await storeArrayBuffer(tokenId, arrayBuffer);
              restoredBinFiles++;
            } catch (error) {
              message.warning(`BIN导入失败: ${tokenId}`);
              console.error(error);
            }
          }
          message.success(`BIN文件导入完成: ${restoredBinFiles} 个`);
        }

        if (importData.taskTemplates && Array.isArray(importData.taskTemplates)) {
          try {
            localStorage.setItem("task-templates", JSON.stringify(importData.taskTemplates));
            message.info(`任务模板导入完成: ${importData.taskTemplates.length} 个`);
          } catch (e) {
            console.error('导入任务模板失败:', e);
          }
        }

        if (importData.tokenSortConfig) {
          try {
            localStorage.setItem("tokenSortConfig", JSON.stringify(importData.tokenSortConfig));
            message.info('账号排序配置已导入');
          } catch (e) {
            console.error('导入排序配置失败:', e);
          }
        }

        if (importData.tokenGroups) {
          try {
            localStorage.setItem("tokenGroups", JSON.stringify(importData.tokenGroups));
            message.info('分组配置已导入');
          } catch (e) {
            console.error('导入分组配置失败:', e);
          }
        }

        let successMessage = `导入成功: ${importedTokens} 个账号, ${importedTasks} 个定时任务`;
        if (restoredBinFiles > 0) {
          successMessage += `, ${restoredBinFiles} 个BIN文件`;
        }
        message.success(successMessage);
        
        // 刷新页面以显示导入的分组信息
        setTimeout(() => {
          location.reload();
        }, 500);
      } catch (parseError) {
        console.error("Parse error:", parseError);
        message.error("解析配置文件失败: " + parseError.message);
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
// 从 Store 获取下次执行时间
const nextExecutionTimes = computed(() => scheduledTaskStore.nextExecutionTimes);

// Update countdowns for all tasks
const updateCountdowns = () => {
  const now = Date.now();

  scheduledTasks.value.forEach((task) => {
    if (!task.enabled) {
      // Clear countdown for disabled tasks
      delete taskCountdowns.value[task.id];
      return;
    }

    // 重要：即使有任务在执行，也要计算倒计时
    // 这样可以确保定时任务调度器不被阻塞
    if (
      !nextExecutionTimes.value[task.id] ||
      nextExecutionTimes.value[task.id] <= now
    ) {
      // Calculate next execution time if not set or passed
      const nextTime = calculateNextExecutionTime(task);
      nextExecutionTimes.value[task.id] = nextTime;
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

// 恢复倒计时定时器，确保 UI 倒计时实时更新
let countdownInterval = null;

const startCountdown = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  // 立即更新一次倒计时
  updateCountdowns();
  
  // 每秒更新一次
  countdownInterval = setInterval(updateCountdowns, 1000);
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
  const queue = batchTaskStore.taskQueue || [];
  
  if (queue.length === 0) {
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
  
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始执行积攒队列中的 ${queue.length} 个任务 ===`,
    type: "info",
  });
  
  const queuedTasks = [...queue];
  // 重要修复：不要在执行前就清空队列！等执行成功后再清空
  // 如果执行失败，任务应该保留在队列中
  
  // 只处理主要任务（有多个账号的任务），跳过单个账号的任务
  const mainTasks = queuedTasks.filter(t => (t.selectedTokens?.length || 0) > 1);
  const singleTasks = queuedTasks.filter(t => (t.selectedTokens?.length || 0) === 1);
  
  if (singleTasks.length > 0) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 跳过 ${singleTasks.length} 个单个账号任务（已包含在主要任务中） ===`,
      type: "info",
    });
  }
  
  if (mainTasks.length === 0) {
    // 没有主要任务，只清空单个账号任务
    batchTaskStore.clearTaskQueue();
    isExecutingQueuedTasks.value = false;
    return;
  }
  
  const prevSelectedTokens = [...selectedTokens.value];
  const prevSelectedTasks = [...selectedTasks.value];
  
  let allTasksCompleted = true;
  const failedTasks = [];
  
  try {
    // 按任务名称分组执行，每个任务使用自己的账号列表
    for (const task of mainTasks) {
      const taskName = task.name;
      const taskSelectedTasks = task.selectedTasks || [];
      const taskTokenIds = task.selectedTokens || [];
      
      if (taskTokenIds.length === 0) continue;
      
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
          const taskIndex = batchTaskStore.taskQueue.findIndex(t => t.id === task.id);
          if (taskIndex > -1) {
            batchTaskStore.taskQueue.splice(taskIndex, 1);
            // 保存更新后的队列到本地存储
            safeLocalStorage.setItem('batch_task_queue', JSON.stringify(batchTaskStore.taskQueue));
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== 积攒任务 ${taskName} 执行完成，已从队列中移除 ===`,
              type: "success",
            });
          }
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
      }
    }
    
    // 只有所有任务都成功完成才清空队列
    if (allTasksCompleted) {
      batchTaskStore.clearTaskQueue();
      // 保存更新后的队列到本地存储
      safeLocalStorage.setItem('batch_task_queue', JSON.stringify([]));
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 积攒队列任务执行完成 ===`,
        type: "success",
      });
    } else {
      // 有任务失败，只保留失败的任务在队列中
      batchTaskStore.clearTaskQueue();
      failedTasks.forEach(task => {
        batchTaskStore.addToTaskQueue(task);
      });
      // 保存更新后的队列到本地存储，确保序列化安全
      try {
        safeLocalStorage.setItem('batch_task_queue', JSON.stringify(failedTasks));
      } catch (serializationError) {
        console.error('序列化失败任务队列时出错:', serializationError);
        // 序列化失败时，清空队列以避免存储错误
        safeLocalStorage.setItem('batch_task_queue', JSON.stringify([]));
      }
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 积攒队列部分任务失败，已保留 ${failedTasks.length} 个失败任务在队列中 ===`,
        type: "warning",
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

// 定时任务从 Store 自动加载，不需要手动加载

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
let lastRefreshTime = Date.now(); // 记录上次刷新时间
let taskJustCompleted = false; // 标记任务是否刚刚完成，用于任务完成后的立即倒计时刷新

// Health check for the scheduler
const healthCheck = async () => {
  // If interval is not running, restart it
  if (!intervalId.value) {
    console.error(
      `[${new Date().toISOString()}] Task scheduler interval is not running, restarting...`,
    );
    startScheduler();
  }

  // Add a safety mechanism to prevent isRunning from being stuck
  if (batchTaskStore.isRunning.value) {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000; // 10 minutes ago
    if (lastTaskExecution && lastTaskExecution < tenMinutesAgo) {
      console.error(
        `[${new Date().toISOString()}] isRunning has been true for more than 10 minutes, resetting to false`,
      );
      batchTaskStore.stopTask();
      addLog({
        time: new Date().toLocaleTimeString(),
        message: "=== 检测到任务执行超时，已重置isRunning状态 ===",
        type: "warning",
      });
      
      // Check for incomplete tasks after resetting isRunning
      try {
        const savedState = safeLocalStorage.getItem('executingState');
        if (savedState) {
          const state = JSON.parse(savedState);
          if (state.selectedTokens && state.selectedTokens.length > 0) {
            // Check if the state is recent (within 30 minutes) to avoid recovering old tasks
            const stateTimestamp = state.timestamp || 0;
            const now = Date.now();
            const thirtyMinutesAgo = now - 30 * 60 * 1000;
            
            if (stateTimestamp >= thirtyMinutesAgo) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `=== 检测到未完成的任务，开始恢复执行 ===`,
                type: "info",
              });

              const hasDailyTask = (state.selectedTasks || []).some(t => t === 'startBatch' || t === 'batchDaily');
              const otherTasks = (state.selectedTasks || []).filter(t => t !== 'startBatch' && t !== 'batchDaily');

              selectedTokens.value = [...state.selectedTokens];

              // 设置lastTaskExecution为当前时间，避免恢复执行后再次被超时检测重置
              lastTaskExecution = Date.now();

              if (hasDailyTask) {
                await startBatch(true); // 传入true表示从恢复状态执行
              } else if (otherTasks.length > 0) {
                for (const taskName of otherTasks) {
                  const taskFunction = getTaskFunction(taskName);
                  if (typeof taskFunction === 'function') {
                    await taskFunction();
                  }
                }
              }
              
              // 只有任务成功恢复后才清除状态
              safeLocalStorage.removeItem('executingState');
            } else {
              // 状态太旧（超过30分钟），清除它
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `=== 任务状态已过期（超过30分钟），清除恢复状态 ===`,
                type: "warning",
              });
              safeLocalStorage.removeItem('executingState');
            }
          } else {
            // 没有有效的selectedTokens，清除状态
            safeLocalStorage.removeItem('executingState');
          }
        }
      } catch (e) {
        console.error('恢复执行状态失败:', e);
        // 出错时不清除状态，让下次检查重试
      }
    }
  }

  // Check for page refresh
  if (batchSettings.enableRefresh && batchSettings.refreshInterval > 0) {
    const now = Date.now();
    const noticeDelaySeconds = batchSettings.refreshNoticeDelay || 30;
    
    // 任务完成后的立即倒计时刷新模式
    if (taskJustCompleted) {
      const elapsedSinceCompletion = (now - lastRefreshTime) / 1000; // 从任务完成开始计算的秒数
      const remainingSeconds = Math.max(0, noticeDelaySeconds - elapsedSinceCompletion);
      const remainingSecondsInt = Math.ceil(remainingSeconds);
      
      // 只在特定时间点显示倒计时日志：每10秒，或最后5秒每秒显示
      const shouldShowLog = remainingSecondsInt <= 5 || remainingSecondsInt % 10 === 0;
      
      if (shouldShowLog && remainingSecondsInt > 0) {
        // 检查是否已经显示过这个秒数的日志
        const lastLog = batchTaskStore.logs[batchTaskStore.logs.length - 1];
        const logMessage = `倒计时: ${remainingSecondsInt} 秒`;
        
        if (!lastLog || lastLog.message !== logMessage) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: logMessage,
            type: "warning"
          });
        }
        
        // 更新页面倒计时显示
        refreshCountdownDisplay.value = {
          show: true,
          seconds: remainingSecondsInt
        };
      }
      
      // 倒计时结束，执行刷新
      if (elapsedSinceCompletion >= noticeDelaySeconds) {
        if (!batchTaskStore.isRunning.value) {
          console.log('🔄 任务完成后刷新页面');
          taskJustCompleted = false; // 重置标记
          refreshCountdownDisplay.value.show = false; // 隐藏倒计时
          window.location.reload();
        }
      }
    } else {
      // 非任务完成模式，隐藏倒计时
      // 正常的定时刷新逻辑
      const elapsedMinutes = (now - lastRefreshTime) / 1000 / 60;
      const noticeDelayMinutes = noticeDelaySeconds / 60;
      
      // 计算距离下次刷新的剩余秒数
      const totalIntervalSeconds = batchSettings.refreshInterval * 60;
      const elapsedSeconds = (now - lastRefreshTime) / 1000;
      const remainingSecondsTotal = Math.max(0, totalIntervalSeconds - elapsedSeconds);
      const remainingSecondsInt = Math.ceil(remainingSecondsTotal);
      
      // 当距离刷新时间小于等于提示延迟时，显示倒计时
      if (remainingSecondsTotal <= noticeDelaySeconds && remainingSecondsTotal > 0) {
        // 只在特定时间点显示倒计时日志：每10秒，或最后5秒每秒显示
        const shouldShowLog = remainingSecondsInt <= 5 || remainingSecondsInt % 10 === 0;
        
        if (shouldShowLog) {
          // 检查是否已经显示过这个秒数的日志
          const lastLog = batchTaskStore.logs[batchTaskStore.logs.length - 1];
          const logMessage = `倒计时: ${remainingSecondsInt} 秒`;
          
          if (!lastLog || lastLog.message !== logMessage) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: logMessage,
              type: "warning"
            });
          }
        }
        
        // 更新页面倒计时显示
        refreshCountdownDisplay.value = {
          show: true,
          seconds: remainingSecondsInt
        };
      } else {
        // 不在倒计时范围内，隐藏显示
        refreshCountdownDisplay.value.show = false;
      }
      
      // 刷新前提示（消息通知）
      if (elapsedMinutes >= batchSettings.refreshInterval - noticeDelayMinutes && elapsedMinutes < batchSettings.refreshInterval) {
        const remainingSeconds = Math.floor((batchSettings.refreshInterval - elapsedMinutes) * 60);
        const progress = batchTaskStore.currentProgress.value || 0;
        console.log(`⏰ 页面将在 ${remainingSeconds} 秒后刷新，当前任务进度：${progress}%`);
        
        // 显示通知（每10秒显示一次，避免频繁）
        if (remainingSeconds % 10 === 0) {
          message.info(`页面将在 ${remainingSeconds} 秒后刷新，当前任务进度：${progress}%`, { duration: 5000 });
        }
      }
      
      if (elapsedMinutes >= batchSettings.refreshInterval) {
        if (!batchTaskStore.isRunning.value) {
          console.log('🔄 执行页面刷新');
          lastRefreshTime = now; // 更新上次刷新时间
          refreshCountdownDisplay.value.show = false; // 隐藏倒计时
          window.location.reload();
        } else {
          console.log('⏸️ 任务正在运行，跳过刷新，任务完成后将立即倒计时刷新');
        }
      }
    }
  }
};

// 独立的页面刷新检查函数（用于定时器调用）
const checkForPageRefresh = () => {
  if (!batchSettings.enableRefresh || batchSettings.refreshInterval <= 0) {
    return;
  }

  const now = Date.now();
  const noticeDelaySeconds = batchSettings.refreshNoticeDelay || 30;

  // 任务完成后的立即倒计时刷新模式
  if (taskJustCompleted) {
    const elapsedSinceCompletion = (now - lastRefreshTime) / 1000;
    const remainingSeconds = Math.max(0, noticeDelaySeconds - elapsedSinceCompletion);
    const remainingSecondsInt = Math.ceil(remainingSeconds);

    const shouldShowLog = remainingSecondsInt <= 5 || remainingSecondsInt % 10 === 0;

    if (shouldShowLog && remainingSecondsInt > 0) {
      const lastLog = batchTaskStore.logs[batchTaskStore.logs.length - 1];
      const logMessage = `倒计时: ${remainingSecondsInt} 秒`;

      if (!lastLog || lastLog.message !== logMessage) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: logMessage,
          type: "warning"
        });
      }

      refreshCountdownDisplay.value = {
        show: true,
        seconds: remainingSecondsInt
      };
    }

    if (elapsedSinceCompletion >= noticeDelaySeconds) {
      if (!batchTaskStore.isRunning.value) {
        console.log('🔄 任务完成后刷新页面');
        taskJustCompleted = false;
        refreshCountdownDisplay.value.show = false;
        window.location.reload();
      }
    }
  } else {
    // 正常的定时刷新逻辑
    const elapsedMinutes = (now - lastRefreshTime) / 1000 / 60;
    const noticeDelayMinutes = noticeDelaySeconds / 60;

    const totalIntervalSeconds = batchSettings.refreshInterval * 60;
    const elapsedSeconds = (now - lastRefreshTime) / 1000;
    const remainingSecondsTotal = Math.max(0, totalIntervalSeconds - elapsedSeconds);
    const remainingSecondsInt = Math.ceil(remainingSecondsTotal);

    if (remainingSecondsTotal <= noticeDelaySeconds && remainingSecondsTotal > 0) {
      const shouldShowLog = remainingSecondsInt <= 5 || remainingSecondsInt % 10 === 0;

      if (shouldShowLog) {
        const lastLog = batchTaskStore.logs[batchTaskStore.logs.length - 1];
        const logMessage = `倒计时: ${remainingSecondsInt} 秒`;

        if (!lastLog || lastLog.message !== logMessage) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: logMessage,
            type: "warning"
          });
        }
      }

      refreshCountdownDisplay.value = {
        show: true,
        seconds: remainingSecondsInt
      };
    } else {
      refreshCountdownDisplay.value.show = false;
    }

    if (elapsedMinutes >= batchSettings.refreshInterval) {
      if (!batchTaskStore.isRunning.value) {
        console.log('🔄 执行页面刷新');
        lastRefreshTime = now;
        refreshCountdownDisplay.value.show = false;
        window.location.reload();
      } else {
        console.log('⏸️ 任务正在运行，跳过刷新，任务完成后将立即倒计时刷新');
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

  // 用于跟踪任务的处理状态，1分钟内最多处理2次
  const processedTasks = new Map();

  // Check every 5 seconds to reduce duplicate checks
  intervalId.value = setInterval(async () => {
    try {
      const now = new Date();
      const currentTime = now.toLocaleTimeString("zh-CN", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      // 生成当前分钟的唯一标识
      const currentMinuteKey = `${now.getDate()}_${now.getHours()}_${now.getMinutes()}`;

      // 先执行刷新检查（无论有没有定时任务都要检查刷新）
      checkForPageRefresh();

      // Don't skip all tasks if isRunning is true, just skip individual task execution if already running
      const tasksToRun = scheduledTasks.value.filter((task) => task.enabled);

      if (tasksToRun.length === 0) {
        return;
      }

      // 依次执行定时任务（不是并行）
      for (const task of tasksToRun) {
        let shouldRun = false;

        if (task.runType === "daily") {
          // Check if current time matches the scheduled time
          const taskTime = task.runTime;
          const nowTime = now.toLocaleTimeString("zh-CN", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          });
          shouldRun = nowTime === taskTime;
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
            continue;
          }
        }

        if (shouldRun) {
          const taskKey = `${task.id}_${currentMinuteKey}`;
          const currentCount = processedTasks.get(taskKey) || 0;
          
          // 检查任务是否已经在本分钟内处理过2次
          if (currentCount >= 2) {
            continue;
          }
          
          // 增加处理次数
          processedTasks.set(taskKey, currentCount + 1);
          
          // 检查任务是否正在执行中（通过 executeScheduledTask 设置的标记）
          const isTaskExecuting = safeLocalStorage.getItem(`task_executing_${task.id}`);
          if (isTaskExecuting) {
            // 任务正在执行中，跳过本次调度
            if (batchSettings.enableDebugLogs) {
              addLog({
                time: currentTime,
                message: `=== 定时任务 ${task.name} 正在执行中，跳过本次调度 ===`,
                type: "info",
              });
            }
            continue;
          }
          
          // 检查任务是否已经在队列中
          const existingTaskIndex = batchTaskStore.taskQueue.findIndex(t => 
            t.name === task.name && 
            JSON.stringify(t.selectedTasks) === JSON.stringify(task.selectedTasks)
          );
          
          if (isPauseTime.value && isPauseTime.value.paused) {
            // 处于暂停时间，加入积攒队列
            if (existingTaskIndex === -1) {
              enhancedAddLog({
                time: currentTime,
                message: `=== 定时任务 ${task.name} 到点但处于${isPauseTime.value.reason}，加入积攒队列，下次执行时间不变 ===`,
                type: "info",
              });
              
              batchTaskStore.addToTaskQueue({
                id: Date.now() + Math.random(),
                name: task.name,
                runType: 'scheduled',
                selectedTokens: [...task.selectedTokens],
                selectedTasks: [...task.selectedTasks],
              });
            }
          } else if (batchTaskStore.isRunning) {
            // 有任务正在运行，加入积攒队列
            if (existingTaskIndex === -1) {
              enhancedAddLog({
                time: currentTime,
                message: `=== 定时任务 ${task.name} 到点但检测到任务冲突（有任务运行中），加入积攒队列依次执行 ===`,
                type: "warning",
              });
              
              batchTaskStore.addToTaskQueue({
                id: Date.now() + Math.random(),
                name: task.name,
                runType: 'scheduled',
                selectedTokens: [...task.selectedTokens],
                selectedTasks: [...task.selectedTasks],
              });
            }
          } else {
            // 无冲突，直接执行任务
            lastTaskExecution = Date.now();
            // 简化版任务持久化：保存正在执行的任务
            saveRunningTask(task);
            let taskExecuted = false;
            try {
              taskExecuted = await executeScheduledTask(task);
            } finally {
              // 任务完成，清除保存的任务信息
              clearRunningTask();
              // 重要：只有任务真正执行完成（不是加入积攒队列）后才检查积攒队列
              // 如果 taskExecuted 为 false，表示任务加入了积攒队列，不应该立即触发 checkAndExecuteQueuedTasks
              if (taskExecuted !== false) {
                checkAndExecuteQueuedTasks();
              }
            }
          }
        }
      }
      
      // 清理过期的处理记录（超过1分钟的记录）
      const expiredKeys = [];
      for (const [key, value] of processedTasks.entries()) {
        const [taskId, date, hour, minute] = key.split('_');
        const taskMinuteKey = `${date}_${hour}_${minute}`;
        if (taskMinuteKey !== currentMinuteKey) {
          expiredKeys.push(key);
        }
      }
      
      for (const key of expiredKeys) {
        processedTasks.delete(key);
      }
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
  }, 5000); // Check every 5 seconds to reduce duplicate checks
};

// 简化版任务持久化：保存正在执行的任务，刷新后重新执行
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

// Debug: Log initial state when component mounts
onMounted(async () => {
  // 立即启动倒计时定时器，确保在任何任务执行前开始更新倒计时
  startCountdown();
  
  // 清理过期的localStorage标记
  try {
    const now = new Date();
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('lastTaskExecution_') || 
          key.startsWith('task_executing_') || 
          key === 'running_task_info' || 
          key === 'executingState') {
        if (key === 'running_task_info') {
          // 运行中任务信息，检查是否过期
          const taskInfo = safeLocalStorage.getItem(key);
          if (taskInfo) {
            try {
              const task = JSON.parse(taskInfo);
              if (Date.now() - (task.timestamp || 0) > 5 * 60 * 1000) {
                safeLocalStorage.removeItem(key);
              }
            } catch (e) {
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
        enhancedAddLog({
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
        enhancedAddLog({
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
        enhancedAddLog({
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

  // 清理旧的任务状态
  batchTaskStore.clearTaskState();
  safeLocalStorage.removeItem('executingState');

  // 检查并执行积攒队列中的任务
  await checkAndExecuteQueuedTasks();

  // Start the task scheduler after all functions are initialized
  scheduleTaskExecution();
  loadTaskTemplates();
  // Start time update timer for pause time checking
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
  // Start resume check timer
  startResumeCheck();
});

// Cleanup task scheduler intervals
onBeforeUnmount(() => {
  // 清理倒计时定时器
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  
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

  const taskTasks = task.selectedTasks || task.taskNames || [];
  const taskTokens = task.selectedTokens || task.tokenIds || [];

  // Verify task functions exist
  for (const taskName of taskTasks) {
    const taskFunction = getTaskFunction(taskName);
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
  const storeTokens = tokenStore.gameTokens?.value || tokenStore.gameTokens || [];
  const connectedTokens = taskTokens.map((tokenId) => {
    const tokenName =
      storeTokens.find((t) => t.id === tokenId)?.name || tokenId;
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
const executeScheduledTask = async (task) => {
  const originalSelectedTokens = [...selectedTokens.value];
  const availableTokenList = tokens.value || tokenStore.gameTokens?.value || [];
  const taskTokenIds = task.tokenIds || task.selectedTokens || task.connectedTokens || [];
  const taskTaskNames = task.taskNames || task.selectedTasks || ['batchDaily'];
  
  // 标记任务正在执行，防止被重复加入积攒队列
  safeLocalStorage.setItem(`task_executing_${task.id}`, Date.now().toString());
  
  // 检测任务冲突：有任务正在运行
  if (batchTaskStore.isRunning) {
    // 检测到任务冲突，加入积攒队列依次执行
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务 ${task.name} 检测到任务冲突（有任务运行中），加入积攒队列依次执行 ===`,
      type: "warning",
    });
    batchTaskStore.addToTaskQueue({
      id: Date.now() + Math.random(),
      name: task.name,
      runType: 'scheduled',
      selectedTokens: [...taskTokenIds],
      selectedTasks: [...taskTaskNames],
    });
    // 清除任务正在执行的标记
    safeLocalStorage.removeItem(`task_executing_${task.id}`);
    // 重要：返回 false 表示任务没有真正执行，只是加入了积攒队列
    // 这样调用者就不会立即触发 checkAndExecuteQueuedTasks
    return false;
  }
  
  // 重要：只有在任务真正开始执行时才设置 lastTaskExecution
  const now = new Date();
  const taskExecutionKey = `${task.id}_${now.getDate()}_${now.getHours()}_${now.getMinutes()}`;
  safeLocalStorage.setItem(`lastTaskExecution_${task.id}`, taskExecutionKey);
  
  safeLocalStorage.setItem('executingState', JSON.stringify({
    selectedTokens: taskTokenIds,
    selectedTasks: taskTaskNames,
    timestamp: Date.now()
  }));

  if (task.runType === 'manual') {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 开始执行积攒队列中的手动任务: ${task.name} ===`,
      type: "info",
    });

    try {
      selectedTokens.value = [...taskTokenIds];
      selectedTasks.value = [...taskTaskNames];
      lastTaskExecution = Date.now();
      batchTaskStore.startTask();
      batchTaskStore.setProgress(0);

      taskTokenIds.forEach((id) => {
        tokenStatus.value[id] = "waiting";
      });

      const totalTokens = taskTokenIds.length;
      let completedCount = 0;

      const taskPromises = taskTokenIds.map(async (tokenId) => {
        if (batchTaskStore.shouldStop.value) return;

        tokenStatus.value[tokenId] = "running";

        let retryCount = 0;
        const MAX_RETRIES = 1;
        let success = false;

        while (retryCount <= MAX_RETRIES && !success) {
          if (batchTaskStore.shouldStop.value) break;

          const token = availableTokenList.find((t) => t.id === tokenId) || { id: tokenId, name: tokenId };

          try {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== 开始执行: ${token.name} ===`,
              type: "info",
            });

            await ensureConnection(tokenId, 2, taskTaskNames, task.name);

            // 依次执行每个任务（不是并行）
            for (const taskName of taskTaskNames) {
              if (batchTaskStore.shouldStop.value) break;

              if (isPauseTime.value.paused) {
                // 检查任务是否已经在积攒队列中
                const existingTaskIndex = batchTaskStore.taskQueue.findIndex(t => t.name === task.name);
                
                if (existingTaskIndex === -1) {
                  // 任务不在队列中，添加新任务（包含当前账号）
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `=== ${token.name} 任务被暂停: 当前处于${isPauseTime.value.reason}，已加入积攒队列 ===`,
                    type: "info",
                  });
                  batchTaskStore.addToTaskQueue({
                    id: Date.now() + Math.random(),
                    name: task.name, // 使用任务的显示名称，而不是函数名
                    runType: 'manual',
                    selectedTokens: [tokenId],
                    selectedTasks: [taskName],
                  });
                } else {
                  // 任务已在队列中，将当前账号添加到已有任务
                  const existingTask = batchTaskStore.taskQueue[existingTaskIndex];
                  if (!existingTask.selectedTokens.includes(tokenId)) {
                    existingTask.selectedTokens.push(tokenId);
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `=== ${token.name} 已添加到积攒队列中的任务 ===`,
                      type: "info",
                    });
                  } else {
                    addLog({
                      time: new Date().toLocaleTimeString(),
                      message: `=== ${token.name} 已在积攒队列中，跳过 ===`,
                      type: "info",
                    });
                  }
                }
                return;
              }

              // 使用原始任务函数，不检测冲突，直接执行
              const taskFunction = getOriginalTaskFunction(taskName);
              if (typeof taskFunction === "function") {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 执行任务: ${taskName}`,
                  type: "info",
                });
                await taskFunction();
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `${token.name} 任务函数 ${taskName} 不存在`,
                  type: "error",
                });
              }
            }

            success = true;
            tokenStatus.value[tokenId] = "completed";
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== ${token.name} 执行完成 ===`,
              type: "success",
            });
          } catch (error) {
            console.error(error);
            if (error.isPause) {
              // 检查任务是否已经在积攒队列中
              const existingTaskIndex = batchTaskStore.taskQueue.findIndex(t => t.name === task.name);
              
              if (existingTaskIndex === -1) {
                // 任务不在队列中，添加新任务
                batchTaskStore.addToTaskQueue({
                  id: Date.now() + Math.random(),
                  name: task.name,
                  runType: 'manual',
                  selectedTokens: [tokenId],
                  selectedTasks: selectedTasks.value,
                });
              } else {
                // 任务已在队列中，将当前账号添加到已有任务
                const existingTask = batchTaskStore.taskQueue[existingTaskIndex];
                if (!existingTask.selectedTokens.includes(tokenId)) {
                  existingTask.selectedTokens.push(tokenId);
                }
              }
              success = true;
              tokenStatus.value[tokenId] = "completed";
              break;
            }
            if (retryCount < MAX_RETRIES && !batchTaskStore.shouldStop.value) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 执行出错: ${error.message}，等待3秒后重试...`,
                type: "warning",
              });
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
          }
        }
        completedCount++;
        batchTaskStore.setProgress(Math.round((completedCount / totalTokens) * 100));
      });

      await Promise.all(taskPromises);

      batchTaskStore.stopTask();
      
      // 从积攒队列中移除已执行的任务
      const taskIndex = batchTaskStore.taskQueue.findIndex(t => t.id === task.id);
      if (taskIndex !== -1) {
        batchTaskStore.taskQueue.splice(taskIndex, 1);
        // 保存到本地存储
        localStorage.setItem('taskQueue', JSON.stringify(batchTaskStore.taskQueue));
      }
      
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 积攒队列中的手动任务 ${task.name} 执行完成，已从队列移除 ===`,
        type: "success",
      });
    } catch (error) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 执行积攒队列任务失败: ${error.message} ===`,
        type: "error",
      });
    } finally {
      safeLocalStorage.removeItem('executingState');
    }
    return;
  }

  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始执行定时任务: ${task.name} ===`,
    type: "info",
  });

  try {
    const dependenciesValid = await verifyTaskDependencies(task);
    if (!dependenciesValid) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 依赖验证失败，取消执行 ===`,
        type: "error",
      });
      return;
    }

    if (isPauseTime.value.paused) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 被暂停: 当前处于${isPauseTime.value.reason}，已加入积攒队列 ===`,
        type: "info",
      });
      batchTaskStore.addToTaskQueue(task);
      return;
    }

    const availableTokenList = tokens.value || tokenStore.gameTokens?.value || [];

    const availableTokens = (
      task.connectedTokens || task.selectedTokens
    ).filter((tokenId) => {
      return availableTokenList.some((t) => t.id === tokenId);
    });

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务可用账号: ${availableTokens.length} 个，task.connectedTokens=${task.connectedTokens?.length || 0}, task.selectedTokens=${task.selectedTokens?.length || 0} ===`,
      type: "info",
    });

    const missingTokens = (task.connectedTokens || task.selectedTokens).filter(
      (tokenId) => {
        return !availableTokenList.some((t) => t.id === tokenId);
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

    selectedTokens.value = [...availableTokens];
    lastTaskExecution = Date.now();
    batchTaskStore.startTask();
    batchTaskStore.setProgress(0);

    let taskTasksList = task.selectedTasks || task.taskNames || [];

    // 如果包含 startBatch（日常任务），则过滤掉 store_purchase（黑市采购）
    // 因为 startBatch 内部已经通过 DailyTaskRunner 执行了黑市购买
    const hasStartBatch = taskTasksList.includes('startBatch');
    if (hasStartBatch) {
      const originalLength = taskTasksList.length;
      taskTasksList = taskTasksList.filter(t => t !== 'store_purchase');
      if (taskTasksList.length < originalLength) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 检测到 startBatch 任务，已自动过滤 store_purchase 任务（避免重复执行黑市购买）===`,
          type: "info",
        });
      }
    }

    const batchSupportedTasks = ['claimHangUpRewards', 'batchAddHangUpTime', 'resetBottles', 'climbTower', 'batchStudy', 'batchSmartSendCar', 'batchClaimCars', 'batchlingguanzi', 'climbWeirdTower', 'batchbaoku13', 'batchbaoku45', 'batchmengjing', 'batchDreamBuy', 'batchclubsign', 'batcharenafight', 'batchTopUpFish', 'batchTopUpArena', 'batchClaimFreeEnergy', 'legion_storebuygoods', 'store_purchase', 'batchLegacyClaim', 'batchLegacyGiftSendEnhanced', 'batchOpenBox', 'batchFish', 'batchRecruit', 'batchClaimBoxPointReward', 'collection_claimfreereward', 'skinChallenge', 'batchMergeItems', 'batchHeroUpgrade', 'batchBookUpgrade', 'batchClaimStarRewards', 'legionStoreBuySkinCoins'];
    // 只有当定时任务明确启用了分批执行时，才使用分批执行
    if (!hasStartBatch && task.enableBatchExecution && taskTasksList.some(taskName => batchSupportedTasks.includes(taskName))) {
      // 优先使用定时任务的批处理大小，如果没有设置则使用默认值
      const batchSize = task.batchSize ?? 5;
      // 优先使用定时任务的批处理延迟，如果没有设置则使用默认值
      const batchDelay = (task.batchDelay ?? 5) * 1000;
      const totalTokens = availableTokens.length;
      const totalBatches = Math.ceil(totalTokens / batchSize);

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 批量任务开始，共 ${totalTokens} 个账号，分 ${totalBatches} 批执行，每批 ${batchSize} 个账号 ===`,
        type: "info",
      });

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        if (batchTaskStore.shouldStop.value) break;

        const startIndex = batchIndex * batchSize;
        const endIndex = Math.min(startIndex + batchSize, totalTokens);
        const batchTokens = availableTokens.slice(startIndex, endIndex);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始执行第 ${batchIndex + 1}/${totalBatches} 批，共 ${batchTokens.length} 个账号 ===`,
          type: "info",
        });

        selectedTokens.value = batchTokens;

        for (const taskName of taskTasksList) {
          if (batchTaskStore.shouldStop.value) break;

          if (isPauseTime.value.paused) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== 定时任务 ${task.name} 被暂停: 当前处于${isPauseTime.value.reason}，已加入积攒队列 ===`,
              type: "info",
            });
            batchTaskStore.addToTaskQueue(task);
            selectedTokens.value = [...originalSelectedTokens];
            return;
          }

          addLog({
            time: new Date().toLocaleTimeString(),
            message: `执行任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName}`,
            type: "info",
          });

          // 使用原始任务函数，避免嵌套调用 executeInBatches
          const taskFunction = getOriginalTaskFunction(taskName);
          if (typeof taskFunction === "function") {
            if (
              [
                "batchOpenBox",
                "batchFish",
                "batchRecruit",
                "batchLegacyGiftSendEnhanced",
              ].includes(taskName)
            ) {
              await taskFunction(true);
            } else {
              await taskFunction();
            }
            // 重要：任务函数执行后可能会调用 stopTask() 将 shouldStop 设为 true
            // 必须立即重置 shouldStop，否则下一批会跳过
            batchTaskStore.resetShouldStop();
          } else {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `任务函数不存在: ${taskName}`,
              type: "error",
            });
          }
        }

        batchTaskStore.setProgress(Math.round(((batchIndex + 1) / totalBatches) * 100));

        if (batchIndex < totalBatches - 1 && !batchTaskStore.shouldStop.value) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 第 ${batchIndex + 1} 批执行完成，等待 ${batchDelay / 1000} 秒后执行下一批 (当前暂停状态: ${isPauseTime.value.paused ? '是' : '否'}) ===`,
            type: "info",
          });

          // 重要：在等待期间保持进度显示，避免长时间显示0%
          // 进度已经在上面设置，这里不需要重复设置，但确保进入等待循环前进度是正确的

          let remainingSeconds = batchDelay / 1000;
          
          while (remainingSeconds > 0 && !batchTaskStore.shouldStop.value) {
            // 重要：确保在等待期间 isRunning 保持为 true，防止按钮被启用
            if (!batchTaskStore.isRunning) {
              batchTaskStore.startTask();
            }
            
            // 强制更新 currentTime 以确保 isPauseTime 重新计算
            currentTime.value = new Date();
            
            // 检查是否进入暂停时间
            const pauseStatus = isPauseTime.value;
            
            if (pauseStatus.paused) {
              
              // 计算已完成的账号数量
              const completedCount = batchIndex + 1;
              const totalCount = task.selectedTokens?.length || task.tokenIds?.length || 0;
              
              // 获取未执行的账号（从当前批次之后）
              const allTokens = task.selectedTokens || task.tokenIds || [];
              const remainingTokens = allTokens.slice(completedCount * batchSize);
              
              if (remainingTokens.length === 0) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `=== 定时任务 ${task.name} 所有批次已完成，无需加入积攒队列 ===`,
                  type: "info",
                });
                selectedTokens.value = [...originalSelectedTokens];
                return;
              }
              
              // 检查任务是否已经在积攒队列中（避免重复添加）
              const existingTask = batchTaskStore.taskQueue.find(t => t.name === task.name);
              if (existingTask) {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `=== 定时任务 ${task.name} 已在积攒队列中，跳过 ===`,
                  type: "info",
                });
              } else {
                addLog({
                  time: new Date().toLocaleTimeString(),
                  message: `=== 定时任务 ${task.name} 在倒计时期间被暂停: 当前处于${pauseStatus.reason}，已加入积攒队列（剩余 ${remainingTokens.length} 个账号） ===`,
                  type: "info",
                });
                // 只加入未执行的账号
                batchTaskStore.addToTaskQueue({
                  ...task,
                  selectedTokens: remainingTokens,
                  tokenIds: remainingTokens,
                });
              }
              
              selectedTokens.value = [...originalSelectedTokens];
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

          if (batchTaskStore.shouldStop.value) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== 批量任务已停止 ===`,
              type: "warning",
            });
            break;
          }
        }
      }

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 所有批次执行完成 ===`,
        type: "success",
      });
    } else {
      // 依次执行每个任务（不是并行）
      for (const taskName of taskTasksList) {
        if (batchTaskStore.shouldStop.value) break;

        if (isPauseTime.value.paused) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 定时任务 ${task.name} 被暂停: 当前处于${isPauseTime.value.reason}，已加入积攒队列 ===`,
            type: "info",
          });
          batchTaskStore.addToTaskQueue(task);
          break;
        }

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `执行任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName}`,
          type: "info",
        });

        // 使用原始任务函数，避免包装函数的额外检查和队列逻辑
        const taskFunction = getOriginalTaskFunction(taskName);
        if (typeof taskFunction === "function") {
          if (
            [
              "batchOpenBox",
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
      }
    }

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务执行完成: ${task.name} ===`,
      type: "success",
    });

    // 发送任务完成推送通知
    await sendTaskCompleteNotification(task.name, {
      success: selectedTokens.value.length,
      failed: 0,
      total: selectedTokens.value.length
    });

    selectedTokens.value = [...originalSelectedTokens];

    const now = new Date();
    const taskExecutionKey = `${task.id}_${now.getDate()}_${now.getHours()}_${now.getMinutes()}`;
    localStorage.setItem(`lastTaskExecution_${task.id}`, taskExecutionKey);
    
    // 重要：返回 true 表示任务真正执行完成
    return true;
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
    selectedTokens.value = [...originalSelectedTokens];
    // 重要：只清除状态，不重置 isRunning，因为 isRunning 由调用者管理
    safeLocalStorage.removeItem('executingState');
    // 清除任务正在执行的标记
    safeLocalStorage.removeItem(`task_executing_${task.id}`);
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

// 注册全局方法，供 Store 调用
if (typeof window !== 'undefined') {
  window['executeScheduledTask'] = async (task) => {
    return await executeScheduledTask(task);
  };
}

// 清理全局方法
onUnmounted(() => {
  if (typeof window !== 'undefined') {
    delete window['executeScheduledTask'];
  }
});

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
    await ensureConnection(firstTokenId, 2, null, '查询接收者信息');

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
  // 验证数量是10的倍数
  if (helperSettings.count % 10 !== 0 || helperSettings.count < 10) {
    message.warning("消耗数量必须是10的整数倍，最小为10");
    return;
  }
  showHelperModal.value = false;
  if (helperType.value === "box") {
    batchOpenBox();
  } else if (helperType.value === "fish") {
    batchFish();
  } else if (helperType.value === "recruit") {
    batchRecruit();
  }
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
  loadTaskTemplates();
  Object.assign(currentTemplate, {
    arenaFormation: 1,
    towerFormation: 1,
    weirdTowerFormation: 1,
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

const logContainer = ref(null);
const errorCount = computed(() => batchTaskStore.errorCount);
const filteredLogs = computed(() => batchTaskStore.filteredLogs);

// 刷新倒计时显示（用于页面显示）
const refreshCountdownDisplay = ref({
  show: false,
  seconds: 0
});

const currentRunningTokenName = computed(() => {
  const t = tokens.value.find((x) => x.id === batchTaskStore.currentRunningTokenId);
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

  const newGroup = tokenStore.createTokenGroup(newGroupName.value.trim(), newGroupColor.value);
  
  // 添加选中的Token到新分组
  if (newGroupSelectedTokens.value.length > 0) {
    newGroupSelectedTokens.value.forEach(tokenId => {
      tokenStore.addTokenToGroup(newGroup.id, tokenId);
    });
  }

  message.success("分组创建成功");
  newGroupName.value = "";
  newGroupColor.value = "#1677ff";
  newGroupSelectedTokens.value = [];
};

const selectAllNewGroup = () => {
  newGroupSelectedTokens.value = sortedTokens.value.map(t => t.id);
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

const addLog = (log, skipCheck = false) => {
  batchTaskStore.addLog(log, skipCheck);

  try {
    if (logContainer.value && batchTaskStore.autoScrollLog) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  } catch (error) {
    // 忽略DOM操作错误，确保日志数据仍然被记录
    console.warn("Failed to scroll log container:", error);
  }

  // 同时使用nextTick作为后备，确保在页面回到前台时能正确滚动
  nextTick(() => {
    try {
      if (logContainer.value && batchTaskStore.autoScrollLog) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight;
      }
    } catch (error) {
      // 忽略错误
    }
  });
};

watch(() => batchTaskStore.autoScrollLog, (newValue) => {
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
  if (batchTaskStore.logs.length === 0) {
    message.warning("没有可复制的日志");
    return;
  }
  const logText = batchTaskStore.logs
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
  batchTaskStore.clearLogs();
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

const ensureConnection = async (tokenId, maxRetries = 2, taskNames = null, taskName = null) => {
  const latestToken = tokens.value.find((t) => t.id === tokenId);
  if (!latestToken) {
    throw new Error(`Token not found: ${tokenId}`);
  }

  if (isPauseTime.value.paused) {
    const tasksToSave = taskNames || (selectedTasks.value.length > 0 ? selectedTasks.value : ['batchDaily']);
    // 优先使用传入的任务名称，否则从 selectedTasks 中获取，最后使用默认名称
    let queueTaskName = taskName;
    if (!queueTaskName && selectedTasks.value.length > 0) {
      // 从 selectedTasks 中获取任务名称
      const taskFunctionName = selectedTasks.value[0];
      // 尝试从任务函数映射中获取友好的任务名称
      const taskMap = {
        'claimHangUpRewards': '批量领取挂机',
        'batchAddHangUpTime': '批量加钟',
        'resetBottles': '重置罐子',
        'batchlingguanzi': '一键领取罐子',
        'climbTower': '一键爬塔',
        'climbWeirdTower': '一键爬怪异塔',
        'batchUseItems': '一键使用怪异塔道具',
        'batchMergeItems': '一键合成怪异塔道具',
        'batchStudy': '一键答题',
        'batchSmartSendCar': '智能发车',
        'batchClaimCars': '一键收车',
        'batchClaimBoxPointReward': '领取宝箱积分',
        'batchHeroUpgrade': '一键英雄升星',
        'batchBookUpgrade': '一键图鉴升星',
        'batchClaimStarRewards': '一键领取图鉴奖励',
        'batchbaoku13': '一键宝库前3层',
        'batchbaoku45': '一键宝库4,5层',
        'batchmengjing': '一键梦境',
        'batchDreamBuy': '梦境购买',
        'batchclubsign': '一键俱乐部签到',
        'batcharenafight': '一键竞技场战斗',
        'batchTopUpFish': '一键钓鱼补齐',
        'batchTopUpArena': '一键竞技场补齐',
        'batchClaimFreeEnergy': '一键领取怪异塔免费道具',
        'skinChallenge': '一键换皮闯关',
        'legion_storebuygoods': '一键购买四圣碎片',
        'legionStoreBuySkinCoins': '一键购买俱乐部5皮肤币',
        'store_purchase': '一键黑市采购',
        'collection_claimfreereward': '免费领取珍宝阁',
        'batchLegacyClaim': '批量功法残卷领取',
        'batchOpenBox': '批量开箱',
        'batchFish': '批量钓鱼',
        'batchRecruit': '批量招募',
        'batchLegacyGiftSendEnhanced': '批量赠送功法残卷',
        'startBatch': '批量日常任务'
      };
      queueTaskName = taskMap[taskFunctionName] || taskFunctionName;
    }
    if (!queueTaskName) {
      queueTaskName = `任务-${latestToken.name}`;
    }
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== ${latestToken.name} 任务被暂停: 当前处于${isPauseTime.value.reason}，已加入积攒队列 (任务: ${tasksToSave.join(', ')}) ===`,
      type: "info",
    });
    batchTaskStore.addToTaskQueue({
      id: Date.now() + Math.random(),
      name: queueTaskName,
      runType: 'manual',
      selectedTokens: [tokenId],
      selectedTasks: tasksToSave,
    });
    tokenStatus.value[tokenId] = "paused";
    throw new Error("任务已暂停");
  }

  let status = tokenStore.getWebSocketStatus(tokenId);
  let connected = status === "connected";
  let attempts = 0;

  if (!connected) {
    // 等待连接槽位，限制并发连接数
    await waitForConnectionSlot();

    while (!connected && attempts <= maxRetries) {
      if (attempts > 0) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `连接超时，尝试重连... (${attempts}/${maxRetries})`,
          type: "warning",
        });

        tokenStore.closeWebSocketConnection(tokenId);
        await new Promise((r) => setTimeout(r, batchSettings.reconnectDelay));
      }

      addLog({
        time: new Date().toLocaleTimeString(),
        message: attempts > 0 ? `正在重连... (${attempts}/${maxRetries})` : `正在连接... (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
        type: "info",
      });

      const currentToken = tokens.value.find((t) => t.id === tokenId);
      if (!currentToken) {
        // 连接失败，释放槽位
        releaseConnectionSlot();
        throw new Error(`Token not found: ${tokenId}`);
      }

      tokenStore.createWebSocketConnection(
        tokenId,
        currentToken.token,
        currentToken.wsUrl,
      );
      connected = await waitForConnection(tokenId);
      attempts++;
    }

    if (!connected) {
      // 连接失败，释放槽位
      releaseConnectionSlot();
      throw new Error(`连接失败 (已重试 ${maxRetries} 次)`);
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
  isRunning: toRef(batchTaskStore, 'isRunning'),
  shouldStop: toRef(batchTaskStore, 'shouldStop'),
  ensureConnection,
  releaseConnectionSlot,
  connectionQueue,
  batchSettings,
  tokenStore,
  addLog,
  message,
  currentRunningTokenId: toRef(batchTaskStore, 'currentRunningTokenId'),
  isPauseTime,
  taskQueue: batchTaskStore.taskQueue || [],
  selectedTasks,
  // Store 方法
  startTask: batchTaskStore.startTask,
  stopTask: batchTaskStore.stopTask,
  setCurrentToken: batchTaskStore.setCurrentToken,
  setProgress: batchTaskStore.setProgress,
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
  logs: batchTaskStore.logs,
  logContainer,
  autoScrollLog: batchTaskStore.autoScrollLog,
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
const { claimHangUpRewards, batchAddHangUpTime, batchStudy, batchclubsign, batchWarGuessCheer } = tasksHangUp;

const tasksBottle = createTasksBottle(createTaskDeps());
const { resetBottles, batchlingguanzi } = tasksBottle;

const tasksTower = createTasksTower(createTaskDeps());
const { climbTower, climbWeirdTower, batchClaimFreeEnergy, skinChallenge, batchUseItems, batchMergeItems } = tasksTower;

const tasksCar = createTasksCar(createTaskDeps());
const { batchSmartSendCar, batchClaimCars } = tasksCar;

const tasksItem = createTasksItem(createTaskDeps());
const {
  batchOpenBox,
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
const { batchbaoku13, batchbaoku45, batchmengjing, batchDreamBuy } = tasksDungeon;

const tasksArena = createTasksArena(createTaskDeps());
const { batcharenafight, batchTopUpFish, batchTopUpArena } = tasksArena;

const tasksStore = createTasksStore(createTaskDeps());
const { legion_storebuygoods, legionStoreBuySkinCoins, store_purchase, collection_claimfreereward } = tasksStore;

// 批量黑市周采购
const batchBlackMarketPurchase = async () => {
  if (batchTaskStore.isRunning.value) return;
  if (selectedTokens.value.length === 0) {
    ElMessage.warning('请先选择账号');
    return;
  }
  if (!isBlackMarketWeek.value || !isBlackMarketUpdated.value) {
    ElMessage.warning('当前非黑市周或黑市周尚未更新');
    return;
  }

  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始执行批量黑市周采购 (${selectedTokens.value.length}个账号) ===`,
    type: "info",
  });

  try {
    batchTaskStore.startTask();
    
    // 批量执行黑市采购
    await executeInBatches(
      store_purchase,
      '黑市周采购',
      'store_purchase'
    );
    
    addLog({
      time: new Date().toLocaleTimeString(),
      message: '=== 批量黑市周采购完成 ===',
      type: "success",
    });
  } catch (error) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `批量黑市周采购失败: ${error.message}`,
      type: "error",
    });
  } finally {
    batchTaskStore.stopTask();
  }
};

// 处理黑市周购买完成
const handleBlackMarketPurchaseComplete = (results) => {
  // 检查results是否为空
  if (!results || results.length === 0) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `黑市周购买助手: 没有执行任何购买操作`,
      type: "warning",
    });
    // 即使没有执行操作，也要检查积攒队列
    checkAndExecuteQueuedTasks();
    return;
  }
  
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 黑市周购买助手开始执行 (${results.length}个账号) ===`,
    type: "success",
  });
  
  // 统计成功和失败的数量
  let successCount = 0;
  let failCount = 0;
  let totalGoodsSuccess = 0;
  let totalGoodsFail = 0;
  
  results.forEach((result) => {
    // 记录每个商品的购买结果
    if (result.results && result.results.length > 0) {
      result.results.forEach((goodsResult) => {
        if (goodsResult.success) {
          totalGoodsSuccess++;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `账号 ${result.token.name} - ${goodsResult.name} 购买成功`,
            type: "success",
          });
        } else {
          totalGoodsFail++;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `账号 ${result.token.name} - ${goodsResult.name} 购买失败: ${goodsResult.error}`,
            type: "error",
          });
        }
      });
    }
    
    // 统计账号级别的成功/失败
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
  });
  
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 黑市周购买助手执行完成 ===`,
    type: "success",
  });
  
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `账号统计: 成功 ${successCount} 个, 失败 ${failCount} 个`,
    type: "success",
  });
  
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `商品统计: 成功 ${totalGoodsSuccess} 个, 失败 ${totalGoodsFail} 个`,
    type: "success",
  });
  
  // 重要：黑市周购买完成后，检查并执行积攒队列中的任务
  batchTaskStore.stopTask();
  checkAndExecuteQueuedTasks();
};

const tasksLegacy = createTasksLegacy(createTaskDeps());
const { batchLegacyClaim, batchLegacyGiftSendEnhanced } = tasksLegacy;

// ========== 刷新后继续任务功能 ==========

/**
 * 继续执行之前保存的任务
 */
const resumeTaskExecution = async () => {
  if (!resumeTaskState.value) return;

  const state = resumeTaskState.value;
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 正在恢复任务：${state.taskName || '批量任务'}，从第 ${state.currentBatchIndex + 1} 批开始 ===`,
    type: "info",
  });

  // 恢复选中的任务和账号
  selectedTasks.value = state.selectedTasks || [];
  selectedTokens.value = state.selectedTokens || [];

  // 设置执行状态
  batchTaskStore.startTask();

  // 根据任务名称选择对应的原始函数（不是包装函数，避免嵌套调用executeInBatches）
  const taskName = state.taskName || '';
  let taskFunction = null;

  if (taskName.includes('答题')) {
    taskFunction = batchStudy;
  } else if (taskName.includes('挂机')) {
    taskFunction = claimHangUpRewards;
  } else if (taskName.includes('加钟')) {
    taskFunction = batchAddHangUpTime;
  } else if (taskName.includes('罐子')) {
    taskFunction = batchlingguanzi;
  } else if (taskName.includes('爬塔')) {
    taskFunction = climbTower;
  } else if (taskName.includes('日常')) {
    taskFunction = startBatch;
  } else if (taskName.includes('功法残卷领取')) {
    taskFunction = batchLegacyClaim;
  } else if (taskName.includes('功法残卷赠送')) {
    taskFunction = batchLegacyGiftSendEnhanced;
  } else if (taskName.includes('收车')) {
    taskFunction = batchClaimCars;
  } else if (taskName.includes('发车')) {
    taskFunction = batchSmartSendCar;
  } else if (taskName.includes('宝库')) {
    taskFunction = batchbaoku13;
  } else if (taskName.includes('梦境')) {
    taskFunction = batchmengjing;
  } else if (taskName.includes('开箱')) {
    taskFunction = batchOpenBox;
  } else if (taskName.includes('钓鱼')) {
    taskFunction = batchFish;
  } else if (taskName.includes('招募')) {
    taskFunction = batchRecruit;
  } else {
    // 尝试从 selectedTasks 获取原始任务函数
    const taskFunctionName = state.selectedTasks?.[0];
    if (taskFunctionName) {
      taskFunction = getOriginalTaskFunction(taskFunctionName);
    }
  }

  if (!taskFunction) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `恢复任务失败：未找到任务函数 (${taskName})`,
      type: "error",
    });
    return;
  }

  // 从保存的批次继续执行
  await executeInBatchesFromState(taskFunction, state.taskName || '批量任务', null, state);

  // 清除任务状态
  batchTaskStore.clearTaskState();
  resumeTaskState.value = null;
  showResumeTaskDialog.value = false;
};

/**
 * 放弃恢复任务
 */
const cancelResumeTask = () => {
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 已放弃恢复任务，清除任务状态 ===`,
    type: "warning",
  });
  batchTaskStore.clearTaskState();
  resumeTaskState.value = null;
  showResumeTaskDialog.value = false;
};

/**
 * 从指定状态继续分批执行
 */
const executeInBatchesFromState = async (taskFunction, taskName, taskFunctionName, state) => {
  const batchSize = batchSettings.batchSize;
  const sortedTokens = [...state.selectedTokens].sort((a, b) => {
    const tokenA = tokens.value.find((t) => t.id === a);
    const tokenB = tokens.value.find((t) => t.id === b);
    return (tokenA?.sortOrder || 0) - (tokenB?.sortOrder || 0);
  });
  const totalTokens = sortedTokens.length;
  const totalBatches = Math.ceil(totalTokens / batchSize);
  
  // 从保存的批次开始执行
  const startBatchIndex = state.currentBatchIndex || 0;
  
  // 重要：跟踪批次完成状态，避免同一批次无限重复执行
  let batchCompleted = false;
  
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 从第 ${startBatchIndex + 1}/${totalBatches} 批继续执行，共 ${totalTokens} 个账号 ===`,
    type: "info",
  });
  
  for (let batchIndex = startBatchIndex; batchIndex < totalBatches; batchIndex++) {
    if (batchTaskStore.shouldStop.value) break;
    
    // 重要：检查上一批次是否完成，避免同一批次无限重复执行
    if (batchIndex > startBatchIndex && !batchCompleted) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 第 ${batchIndex} 批未完成，跳过 ===`,
        type: "warning",
      });
      continue;
    }
    
    // 重置批次完成状态
    batchCompleted = false;
    
    // 简化版任务持久化：只保存任务队列，不保存执行进度
    // 这样可以避免复杂的状态管理问题，同时保留积攒任务功能
    // batchTaskStore.saveTaskState({
    //   isRunning: true,
    //   currentBatchIndex: batchIndex,
    //   totalBatches,
    //   taskName,
    //   selectedTasks: state.selectedTasks,
    //   selectedTokens: state.selectedTokens,
    // });

    const startIdx = batchIndex * batchSize;
    const endIdx = Math.min(startIdx + batchSize, totalTokens);
    const batchTokens = sortedTokens.slice(startIdx, endIdx);

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 开始执行第 ${batchIndex + 1}/${totalBatches} 批，共 ${batchTokens.length} 个账号 ===`,
      type: "info",
    });

    selectedTokens.value = batchTokens;
    
    // 重置 shouldStop，确保任务可以正常执行
    batchTaskStore.resetShouldStop();
    
    try {
      await taskFunction();
      // 重要：标记批次为已完成
      batchCompleted = true;
    } catch (error) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `执行批次时出错: ${error.message}`,
        type: "error",
      });
      console.error('taskFunction error:', error);
      // 重要：即使出错，也要标记批次为已完成，避免无限重试
      batchCompleted = true;
    }

    // 重要：taskFunction 执行后可能会调用 stopTask() 将 shouldStop 设为 true
    // 必须立即重置 shouldStop，否则下一批会跳过
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
        if (!batchTaskStore.isRunning) {
          batchTaskStore.startTask();
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
    } else {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 第 ${batchIndex + 1} 批完成，这是最后一批 ===`,
        type: "info",
      });
    }
    
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 批次循环结束: batchIndex=${batchIndex}, totalBatches=${totalBatches}, 下一批=${batchIndex + 1 < totalBatches} ===`,
      type: "info",
    });
  }

  selectedTasks.value = state.selectedTasks || [];
  selectedTokens.value = state.selectedTokens || [];

  if (!batchTaskStore.shouldStop.value) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== ${taskName}完成 ===`,
      type: "success",
    });
  }
  
  // 重置任务状态
  batchTaskStore.stopTask();
  
  // 任务完成后检查并执行积攒队列
  checkAndExecuteQueuedTasks();
};

const executeInBatches = async (taskFunction, taskName, taskFunctionName, isFromQueue = false, isScheduled = false) => {
  if (selectedTokens.value.length === 0) return;

  // 只有在任务不是从队列中执行时才检查冲突
  if (!isFromQueue) {
    // 检测任务冲突：有任务正在运行
    if (batchTaskStore.isRunning) {
      // 检测到任务冲突，加入积攒队列依次执行，避免IP限制
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
      return;
    }

    // 确保任务状态正确
    batchTaskStore.startTask();
  }

  const originalSelectedTasks = [...selectedTasks.value];
  const originalSelectedTokens = [...selectedTokens.value];
  if (taskFunctionName) {
    selectedTasks.value = [taskFunctionName];
  }

  // 调试日志
  if (!batchSettings.enableBatchExecution) {
    await taskFunction();
    selectedTasks.value = originalSelectedTasks;
    selectedTokens.value = originalSelectedTokens;
    // 任务完成后检查并执行积攒队列
    if (!batchTaskStore.isRunning) {
      checkAndExecuteQueuedTasks();
    }
    return;
  }

  const sortedTokens = [...selectedTokens.value].sort((a, b) => {
    const tokenA = tokens.value.find((t) => t.id === a);
    const tokenB = tokens.value.find((t) => t.id === b);
    return (tokenA?.sortOrder || 0) - (tokenB?.sortOrder || 0);
  });

  const batchSize = batchSettings.batchSize || 10;
  const batchDelay = batchSettings.batchDelay * 1000;
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
    
    // 简化版任务持久化：只保存任务队列，不保存执行进度
    // batchTaskStore.saveTaskState({
    //   isRunning: true,
    //   currentBatchIndex: batchIndex,
    //   totalBatches,
    //   taskName,
    //   selectedTasks: originalSelectedTasks,
    //   selectedTokens: originalSelectedTokens,
    // });

    const startIdx = batchIndex * batchSize;
    const endIdx = Math.min(startIdx + batchSize, totalTokens);
    const batchTokens = sortedTokens.slice(startIdx, endIdx);

    selectedTokens.value = batchTokens;
    
    // 重置 shouldStop，确保任务可以正常执行
    batchTaskStore.resetShouldStop();

    // 重要：保存当前的 isRunning 状态
    // 任务函数内部可能会调用 stopTask() 改变 isRunning 状态
    const wasRunningBeforeTask = batchTaskStore.isRunning;

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
      if (wasRunningBeforeTask && !batchTaskStore.isRunning) {
        batchTaskStore.startTask();
      }
    }

    // 重要：taskFunction 执行后可能会调用 stopTask() 将 shouldStop 设为 true
    // 必须立即重置 shouldStop，否则下一批会跳过
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
        if (!batchTaskStore.isRunning) {
          batchTaskStore.startTask();
        }
        
        // 检查是否进入暂停时间
        if (isPauseTime.value.paused) {
          // 计算剩余未执行的账号（从下一批开始）
          // 当前批次已经完成，所以从下一批开始
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
          const existingTask = batchTaskStore.taskQueue.find(t => t.name === taskName);
          if (!existingTask) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== 批量任务在倒计时期间被暂停: 当前处于${isPauseTime.value.reason}，已加入积攒队列（剩余 ${remainingTokens.length} 个账号，从第${batchIndex + 1}批开始） ===`,
              type: "info",
            });
            // 将剩余未执行的账号（包括当前批次）加入积攒队列
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
  
  // 重要：只有非队列执行的任务才重置 isRunning 状态
  // 队列执行的任务由 checkAndExecuteQueuedTasks 统一管理
  if (!isFromQueue) {
    batchTaskStore.stopTask();
    // 任务完成后检查并执行积攒队列
    checkAndExecuteQueuedTasks();
  }
};

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
const wrappedBatchDreamBuy = () => executeInBatches(batchDreamBuy, '梦境购买', 'batchDreamBuy');
const wrappedBatchclubsign = () => executeInBatches(batchclubsign, '一键俱乐部签到', 'batchclubsign');
const wrappedBatcharenafight = () => executeInBatches(batcharenafight, '一键竞技场战斗', 'batcharenafight');
const wrappedBatchTopUpFish = () => executeInBatches(batchTopUpFish, '一键钓鱼补齐', 'batchTopUpFish');
const wrappedBatchTopUpArena = () => executeInBatches(batchTopUpArena, '一键竞技场补齐', 'batchTopUpArena');
const wrappedBatchClaimFreeEnergy = () => executeInBatches(batchClaimFreeEnergy, '一键领取怪异塔免费道具', 'batchClaimFreeEnergy');
const wrappedSkinChallenge = () => executeInBatches(skinChallenge, '一键换皮闯关', 'skinChallenge');
const wrappedLegion_storebuygoods = () => executeInBatches(legion_storebuygoods, '一键购买四圣碎片', 'legion_storebuygoods');
const wrappedLegionStoreBuySkinCoins = () => executeInBatches(legionStoreBuySkinCoins, '一键购买俱乐部5皮肤币', 'legionStoreBuySkinCoins');
const wrappedBatchBlackMarketPurchase = async () => {
  if (batchTaskStore.isRunning.value) return;
  if (selectedTokens.value.length === 0) {
    ElMessage.warning('请先选择账号');
    return;
  }
  if (!isBlackMarketWeek.value || !isBlackMarketUpdated.value) {
    ElMessage.warning('当前非黑市周或黑市周尚未更新');
    return;
  }
  await executeInBatches(store_purchase, '一键黑市周采购', 'store_purchase');
};
const wrappedStore_purchase = () => executeInBatches(store_purchase, '一键黑市采购', 'store_purchase');
const wrappedCollection_claimfreereward = () => executeInBatches(collection_claimfreereward, '免费领取珍宝阁', 'collection_claimfreereward');
const wrappedBatchLegacyClaim = () => executeInBatches(batchLegacyClaim, '批量功法残卷领取', 'batchLegacyClaim');
const wrappedBatchOpenBox = () => executeInBatches(batchOpenBox, '批量开箱', 'batchOpenBox');
const wrappedBatchFish = () => executeInBatches(batchFish, '批量钓鱼', 'batchFish');
const wrappedBatchRecruit = () => executeInBatches(batchRecruit, '批量招募', 'batchRecruit');
const wrappedBatchLegacyGiftSendEnhanced = () => executeInBatches(batchLegacyGiftSendEnhanced, '批量赠送功法残卷', 'batchLegacyGiftSendEnhanced');

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
  batchDreamBuy,
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

const getOriginalTaskFunction = (taskName) => {
  return originalTaskFunctionMap[taskName] || null;
};

async function startBatch(isFromQueue = false) {
  if (selectedTokens.value.length === 0) return;

  // 检测任务冲突：有任务正在运行（只有不是从积攒队列执行时才检测）
  if (!isFromQueue && batchTaskStore.isRunning) {
    // 检测到任务冲突，加入积攒队列依次执行，避免IP限制
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
    return;
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

  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  const sortedSelectedTokens = selectedTokens.value.sort((a, b) => {
    const tokenA = tokens.value.find((t) => t.id === a);
    const tokenB = tokens.value.find((t) => t.id === b);
    return (tokenA?.sortOrder || 0) - (tokenB?.sortOrder || 0);
  });

  const totalTokens = sortedSelectedTokens.length;
  let completedCount = 0;

  const runTokenTasks = async (tokenId) => {
    return new Promise(async (resolve) => {
      if (batchTaskStore.shouldStop.value) {
        resolve();
        return;
      }

      tokenStatus.value[tokenId] = "running";

      let retryCount = 0;
      const MAX_RETRIES = 1;
      let success = false;

      while (retryCount <= MAX_RETRIES && !success) {
        if (batchTaskStore.shouldStop.value) break;

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

          await ensureConnection(tokenId, 2, ['startBatch'], '批量日常任务');

          const runner = new DailyTaskRunner(tokenStore, {
            commandDelay: batchSettings.commandDelay,
            taskDelay: batchSettings.taskDelay,
          }, () => isPauseTime.value.paused, {
            genieSweep: batchSettings.genieSweep
          });

          await runner.run(tokenId, {
            onLog: (log) => addLog(log),
            onProgress: (p) => {},
          });

          success = true;
          tokenStatus.value[tokenId] = "completed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== ${token.name} 执行完成 ===`,
            type: "success",
          });

          try {
            const settings = loadSettings(tokenId);
            if (settings && settings.taskCompleteFormation && settings.taskCompleteFormation > 0) {
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 正在切换到阵容 ${settings.taskCompleteFormation}`,
                type: "info",
              });
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "presetteam_saveteam",
                { teamId: settings.taskCompleteFormation },
                5000
              );
              addLog({
                time: new Date().toLocaleTimeString(),
                message: `${token.name} 阵容切换成功`,
                type: "success",
              });
            }
          } catch (error) {
            console.error(`切换阵容失败: ${error.message}`);
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 阵容切换失败: ${error.message}`,
              type: "warning",
            });
          }
        } catch (error) {
          console.error(error);
          if (error.isPause) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== ${token.name} 任务被暂停: 当前处于${isPauseTime.value.reason}，已加入积攒队列 ===`,
              type: "info",
            });
            batchTaskStore.addToTaskQueue({
              id: Date.now() + Math.random(),
              name: `批量任务-${token.name}`,
              runType: 'manual',
              selectedTokens: [tokenId],
              selectedTasks: selectedTasks.value,
            });
            success = true;
            tokenStatus.value[tokenId] = "completed";
            break;
          }
          
          // 重要：检查错误类型，如果是"已领取"或"已完成"类型的错误，标记为成功
          // 这样可以避免无限重试已完成的任务
          const isCompletedError = error.message && (
            error.message.includes('已领取') ||
            error.message.includes('已完成') ||
            error.message.includes('没有可领取') ||
            error.message.includes('奖励已领取')
          );
          
          if (isCompletedError) {
            // 任务实际上已完成，标记为成功
            success = true;
            tokenStatus.value[tokenId] = "completed";
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== ${token.name} 任务已完成（${error.message}） ===`,
              type: "success",
            });
            break;
          }
          
          if (retryCount < MAX_RETRIES && !batchTaskStore.shouldStop.value) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `${token.name} 执行出错: ${error.message}，等待3秒后重试...`,
              type: "warning",
            });
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
          tokenStore.closeWebSocketConnection(tokenId);
          releaseConnectionSlot();
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
            type: "info",
          });
        }
      }
      completedCount++;
      batchTaskStore.setProgress(Math.round((completedCount / totalTokens) * 100));
      resolve();
    });
  };

  try {
    if (batchSettings.enableBatchExecution) {
      const batchSize = batchSettings.batchSize;
      const batchDelay = batchSettings.batchDelay * 1000;
      const totalBatches = Math.ceil(totalTokens / batchSize);

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 批量任务开始，共 ${totalTokens} 个账号，分 ${totalBatches} 批执行，每批 ${batchSize} 个账号 ===`,
        type: "info",
      });

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        if (batchTaskStore.shouldStop.value) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 批量任务已停止 ===`,
            type: "warning",
          });
          break;
        }

        const startIdx = batchIndex * batchSize;
        const endIdx = Math.min(startIdx + batchSize, totalTokens);
        const batchTokens = sortedSelectedTokens.slice(startIdx, endIdx);

        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 开始执行第 ${batchIndex + 1}/${totalBatches} 批，共 ${batchTokens.length} 个账号 ===`,
          type: "info",
        });

        const batchPromises = batchTokens.map(tokenId => runTokenTasks(tokenId));
        await Promise.all(batchPromises);

        if (batchIndex < totalBatches - 1 && !batchTaskStore.shouldStop.value) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 第 ${batchIndex + 1} 批完成，等待 ${batchSettings.batchDelay} 秒后执行下一批 ===`,
            type: "info",
          });

          // 重要：在等待期间保持进度显示，避免长时间显示0%
          // 设置进度为当前批次的进度（已完成的账号数 / 总数）
          const currentProgress = Math.round((completedCount / totalTokens) * 100);
          batchTaskStore.setProgress(currentProgress);

          let remainingSeconds = batchSettings.batchDelay;
          while (remainingSeconds > 0 && !batchTaskStore.shouldStop.value) {
            // 重要：确保在等待期间 isRunning 保持为 true，防止按钮被启用
            if (!batchTaskStore.isRunning) {
              batchTaskStore.startTask();
            }
            
            // 检查是否进入暂停时间
            if (isPauseTime.value.paused) {
              // 将剩余任务加入积攒队列
              const remainingTokens = sortedSelectedTokens.slice((batchIndex + 1) * batchSize);
              if (remainingTokens.length > 0) {
                // 检查是否已经有相同的剩余任务在队列中
                const existingTask = batchTaskStore.taskQueue.find(t => t.name === '批量任务-剩余账号');
                if (!existingTask) {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `=== 批量任务在倒计时期间被暂停: 当前处于${isPauseTime.value.reason}，已加入积攒队列 ===`,
                    type: "info",
                  });
                  batchTaskStore.addToTaskQueue({
                    id: Date.now() + Math.random(),
                    name: '批量任务-剩余账号',
                    runType: 'manual',
                    selectedTokens: remainingTokens,
                    selectedTasks: ['startBatch'],
                  });
                } else {
                  addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `=== 批量任务-剩余账号已在积攒队列中，跳过 ===`,
                    type: "info",
                  });
                }
              }
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

          if (batchTaskStore.shouldStop.value) {
            addLog({
              time: new Date().toLocaleTimeString(),
              message: `=== 批量任务已停止 ===`,
              type: "warning",
            });
            break;
          }
        }
      }

      if (!batchTaskStore.shouldStop.value && !isPauseTime.value.paused) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 批量任务全部完成 ===`,
          type: "success",
        });
      }
    } else {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 批量任务开始，共 ${totalTokens} 个账号 ===`,
        type: "info",
      });

      const taskPromises = sortedSelectedTokens.map(tokenId => runTokenTasks(tokenId));
      await Promise.all(taskPromises);

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 批量任务执行完成 ===`,
        type: "success",
      });

      // 发送批量任务完成推送通知
      await sendTaskCompleteNotification('批量日常任务', {
        success: totalTokens,
        failed: 0,
        total: totalTokens
      });
    }
  } catch (error) {
    console.error("批量任务执行出错:", error);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 批量任务执行出错: ${error.message} ===`,
      type: "error",
    });
  } finally {
    await new Promise((r) => setTimeout(r, 1000));

    safeLocalStorage.removeItem('executingState');
    
    batchTaskStore.stopTask();
    selectedTasks.value = prevSelectedTasks;
    
    // 任务完成后检查并执行积攒队列
    checkAndExecuteQueuedTasks();
    
    // 任务完成后启动立即倒计时刷新模式
    if (batchSettings.enableRefresh && batchSettings.refreshInterval > 0) {
      taskJustCompleted = true;
      lastRefreshTime = Date.now(); // 记录任务完成时间，作为倒计时起点
      const noticeDelaySeconds = batchSettings.refreshNoticeDelay || 30;
      console.log(`✅ 批量任务完成，${noticeDelaySeconds}秒后将刷新页面`);
      message.info(`任务完成，${noticeDelaySeconds}秒后将刷新页面`, { duration: 5000 });
      
      // 添加总提示日志
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 任务完成，等待 ${noticeDelaySeconds} 秒后刷新页面 ===`,
        type: "warning"
      });
    }
    
    message.success("批量任务执行结束");
  }
};

const stopBatch = () => {
  batchTaskStore.stopTask();
  addLog({
    time: new Date().toLocaleTimeString(),
    message: "正在停止...",
    type: "warning",
  });
};
</script>

<style scoped>
/* 脉冲动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

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

page-header {
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

/* 刷新倒计时日志项样式 */
.refresh-countdown-log {
  background: linear-gradient(90deg, #fff7ed 0%, #ffedd5 100%) !important;
  border-left: 3px solid #f97316 !important;
  animation: pulse-log 1.5s ease-in-out infinite;
}

.refresh-countdown-log .message {
  color: #c2410c !important;
  font-weight: 500;
}

@keyframes pulse-log {
  0%, 100% {
    background: linear-gradient(90deg, #fff7ed 0%, #ffedd5 100%) !important;
  }
  50% {
    background: linear-gradient(90deg, #ffedd5 0%, #fed7aa 100%) !important;
  }
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

/* 加载动画 */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
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
    padding: 8px;
    height: auto;
    min-height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .main-layout {
    height: auto;
    overflow: visible;
    flex-direction: column;
    gap: 12px;
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
    margin-top: 12px;
  }

  .page-header {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
    margin-bottom: 12px;
  }

  .page-header > div {
    width: 100%;
  }

  .page-header .actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .token-list-card {
    margin-top: 12px;
  }

  .scheduled-tasks-card {
    margin-top: 12px;
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
    height: 250px;
    min-height: 250px;
    max-height: 250px;
    flex: none !important;
  }

  .log-header-controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  /* 优化功能按钮在小屏幕上的显示 */
  .n-space {
    flex-wrap: wrap;
    gap: 6px;
  }

  .n-space > .n-button {
    flex: 1 0 45%;
    min-width: 80px;
    margin-bottom: 6px;
    font-size: 13px;
  }

  /* 优化账号列表在小屏幕上的显示 */
  .token-row {
    padding-right: 2px;
  }

  .token-item {
    font-size: 13px;
  }

  /* 优化模态框在小屏幕上的显示 */
  .n-modal {
    max-width: 95% !important;
    width: 95% !important;
  }

  /* 优化字体大小和间距 */
  h2 {
    font-size: 18px;
    margin-bottom: 12px;
  }

  .card-title {
    font-size: 14px;
  }

  .log-item {
    font-size: 11px;
  }

  /* 优化卡片在小屏幕上的显示 */
  .n-card {
    margin-bottom: 8px;
  }

  .n-card :deep(.n-card__header) {
    padding: 10px;
  }

  .n-card :deep(.n-card__content) {
    padding: 10px;
  }

  /* 优化表格在小屏幕上的显示 */
  .n-data-table {
    font-size: 12px;
  }

  .n-data-table :deep(.n-data-table-th) {
    padding: 8px 4px;
  }

  .n-data-table :deep(.n-data-table-td) {
    padding: 8px 4px;
  }

  /* 优化输入框在小屏幕上的显示 */
  .n-input,
  .n-select {
    font-size: 13px;
  }

  /* 优化开关在小屏幕上的显示 */
  .n-switch {
    transform: scale(0.9);
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
}

/* 小屏幕设备优化 */
@media (max-width: 600px) {
  .batch-daily-tasks {
    padding: 6px;
    min-height: 100vh;
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

  .main-layout {
    gap: 8px;
  }

  .recipient-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .page-header {
    gap: 6px;
    margin-bottom: 8px;
  }

  .page-header .actions {
    gap: 4px;
  }

  .n-space > .n-button {
    flex: 1 0 48%;
    min-width: 70px;
    margin-bottom: 4px;
    font-size: 12px;
  }

  .log-container {
    height: 200px;
    min-height: 200px;
    max-height: 200px;
  }

  .token-item {
    font-size: 12px;
  }

  .card-title {
    font-size: 13px;
  }

  .log-item {
    font-size: 10px;
  }

  .recipient-info {
    flex-direction: column;
    align-items: center;
  }
  
  /* 优化账号列表列数 */
  .n-grid {
    --grid-cols: 1 !important;
  }
  
  /* 进一步优化字体大小 */
  h2 {
    font-size: 16px;
  }
}

/* 超小屏幕设备优化 */
@media (max-width: 400px) {
  .batch-daily-tasks {
    padding: 4px;
  }

  .main-layout {
    gap: 6px;
  }

  .n-space > .n-button {
    flex: 1 0 100%;
    min-width: 100%;
    margin-bottom: 4px;
    font-size: 12px;
  }

  .page-header .actions {
    gap: 4px;
  }

  .log-container {
    height: 180px;
    min-height: 180px;
    max-height: 180px;
  }

  .token-item {
    font-size: 11px;
  }

  .card-title {
    font-size: 12px;
  }

  /* 优化模态框在超小屏幕上的显示 */
  .n-modal {
    max-width: 98% !important;
    width: 98% !important;
  }

  .n-modal :deep(.n-card__content) {
    padding: 8px;
  }

  /* 优化按钮在超小屏幕上的显示 */
  .n-button {
    font-size: 11px;
    padding: 4px 8px;
  }

  /* 优化输入框在超小屏幕上的显示 */
  .n-input,
  .n-select {
    font-size: 12px;
  }
}

/* 折叠动画 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
  max-height: 0;
}

.slide-fade-enter-to,
.slide-fade-leave-from {
  max-height: 800px;
  opacity: 1;
  transform: translateY(0);
}
</style>
