<template>
  <MyCard class="lineup-saver" :statusClass="{ active: state.isRunning }">
    <template #icon>
      <img
        src="/icons/Ob7pyorzmHiJcbab2c25af264d0758b527bc1b61cc3b.png"
        alt="阵容图标"
      />
    </template>
    <template #title>
      <h3>阵容助手</h3>
      <p>保存阵容、快速切换</p>
    </template>
    <template #badge>
      <span>{{ state.isRunning ? "运行中" : "已停止" }}</span>
    </template>
    <template #default>
      <div class="lineup-container">
        <div class="toolbar">
          <n-button
            type="primary"
            size="small"
            @click="refreshTeamInfo"
            :loading="loading"
          >
            刷新数据
          </n-button>
          <n-button
            size="small"
            @click="saveCurrentLineup"
            :disabled="editingHeroes.length === 0"
          >
            保存阵容
          </n-button>
          <n-button
            type="success"
            size="small"
            @click="openAddHeroModal"
            :disabled="editingHeroes.length >= 5"
          >
            上阵英雄
          </n-button>
          <n-button
            type="info"
            size="small"
            @click="savedLineupsModalVisible = true"
          >
            已保存阵容 ({{ savedLineups.length }})
          </n-button>
        </div>

        <div class="quick-switch-section">
          <h4>阵容槽位</h4>
          <div class="team-selector">
            <n-button
              v-for="teamId in availableTeams"
              :key="teamId"
              :type="currentTeamId === teamId ? 'primary' : 'default'"
              size="small"
              @click="switchTeam(teamId)"
              :loading="switchingTeamId === teamId"
            >
              阵容{{ teamId }}
            </n-button>
          </div>
        </div>

        <div class="current-team-section" v-if="currentTeamInfo">
          <h4>
            编辑阵容 (阵容槽位{{ currentTeamId }})
            <span class="drag-tip">拖拽调整站位</span>
          </h4>
          <div class="heroes-grid">
            <div
              v-for="(hero, index) in editingHeroes"
              :key="hero.heroId + '-' + hero.position"
              class="hero-item"
              :class="{
                dragging: draggedHeroId === hero.heroId,
                'drag-over': dragOverPosition === hero.position,
              }"
              draggable="true"
              @dragstart="onDragStart($event, hero)"
              @dragend="onDragEnd"
              @dragover.prevent="onDragOver($event, hero)"
              @dragleave="onDragLeave"
              @drop="onDrop($event, hero)"
            >
              <div class="hero-position">{{ hero.position + 1 }}</div>
              <div class="hero-avatar" @click="showHeroRefineModal(hero)">
                <img
                  v-if="getHeroAvatar(hero.heroId)"
                  :src="getHeroAvatar(hero.heroId)"
                  :alt="getHeroName(hero.heroId)"
                />
                <div v-else class="hero-placeholder">
                  {{ getHeroName(hero.heroId)?.substring(0, 2) || "?" }}
                </div>
              </div>
              <div class="hero-info" @click="showHeroRefineModal(hero)">
                <div class="hero-name">
                  {{ getHeroName(hero.heroId) || `武将${hero.heroId}` }}
                </div>
                <div v-if="hero.attachmentUid && hero.attachmentUid !== -1" class="hero-fish">
                  {{ getFishNameByArtifactId(hero.attachmentUid) }}
                </div>
              </div>
              <n-button
                class="exchange-btn"
                size="tiny"
                type="warning"
                @click.stop="openExchangeModal(hero)"
              >
                更换
              </n-button>
              <n-button
                class="remove-btn"
                size="tiny"
                type="error"
                @click.stop="removeHero(hero)"
              >
                下阵
              </n-button>
            </div>
          </div>
        </div>
      </div>

      <n-modal
        v-model:show="savedLineupsModalVisible"
        preset="card"
        title="已保存的阵容"
        style="width: 800px; max-width: 90vw"
        :bordered="false"
      >
        <div v-if="savedLineups.length === 0" class="empty-tip">
          暂无保存的阵容，点击"保存阵容"开始使用
        </div>
        <div v-else class="saved-lineups-modal-content">
          <div class="team-tabs">
            <div
              v-for="teamId in availableTeams"
              :key="teamId"
              class="team-tab"
              :class="{ active: selectedTeamTab === teamId }"
              @click="selectedTeamTab = teamId"
            >
              槽位{{ teamId }}
              <span class="tab-count"
                >({{ getLineupsByTeamId(teamId).length }})</span
              >
            </div>
          </div>
          <div class="lineups-list">
            <div
              v-for="(lineup, index) in getLineupsByTeamId(selectedTeamTab)"
              :key="index"
              class="lineup-card"
            >
              <div class="lineup-title-bar" @click="toggleLineupExpand(lineup)">
                <div class="lineup-title-left">
                  <span class="expand-icon">{{
                    expandedLineup === lineup ? "▼" : "▶"
                  }}</span>
                  <span class="lineup-name">{{ lineup.name }}</span>
                  <span class="lineup-time">{{
                    formatTime(lineup.savedAt)
                  }}</span>
                </div>
                <div class="lineup-quick-actions">
                  <n-button
                    type="primary"
                    size="tiny"
                    @click.stop="
                      applyLineup(lineup);
                      savedLineupsModalVisible = false;
                    "
                    :loading="lineup.applying"
                    :disabled="false"
                  >
                    应用
                  </n-button>
                </div>
              </div>
              <div v-if="expandedLineup === lineup" class="lineup-detail">
                <div class="lineup-heroes-detail">
                  <div
                    v-for="(hero, hIdx) in lineup.heroes"
                    :key="hIdx"
                    class="lineup-hero-item"
                  >
                    <span class="hero-pos">{{ hero.position + 1 }}.</span>
                    <span class="hero-name">{{
                      getHeroName(hero.heroId) || `武将${hero.heroId}`
                    }}</span>
                    <span
                      class="hero-fish"
                      v-if="hero.attachmentUid && hero.attachmentUid !== -1"
                    >
                      ({{ getFishNameByArtifactId(hero.attachmentUid) }})
                    </span>
                  </div>
                </div>
                <div class="lineup-actions">
                  <n-button size="small" @click="renameLineup(index)">
                    重命名
                  </n-button>
                  <n-button
                    type="error"
                    size="small"
                    @click="deleteLineup(index)"
                  >
                    删除
                  </n-button>
                </div>
              </div>
            </div>
            <div
              v-if="getLineupsByTeamId(selectedTeamTab).length === 0"
              class="no-lineup-tip"
            >
              暂无保存的阵容
            </div>
          </div>
        </div>
      </n-modal>

      <n-modal
        v-model:show="refineModalVisible"
        preset="card"
        :title="refineModalTitle"
        style="width: 600px; max-width: 90vw"
        :bordered="false"
      >
        <n-spin :show="refineModalLoading">
          <div v-if="selectedHeroEquipment" class="refine-modal-content">
            <div
              v-for="partId in [1, 2, 3, 4]"
              :key="partId"
              class="equip-refine-section"
            >
              <div class="equip-header">
                <span class="equip-name">{{ partMap[partId] }}</span>
                <span class="equip-level">
                  Lv.{{ selectedHeroEquipment[partId]?.level || 0 }}
                </span>
                <span class="equip-bonus" v-if="selectedHeroEquipment[partId]">
                  +{{ getEquipBonus(partId) }}
                  {{ partId === 1 ? "攻击" : partId === 3 ? "防御" : "血量" }}
                </span>
              </div>
              <div class="slots-container">
                <div
                  v-for="slot in getEquipSlots(partId)"
                  :key="slot.id"
                  class="slot-item"
                  :class="{
                    locked: slot.isLocked,
                    [`color-${slot.colorId}`]: slot.colorId > 0,
                  }"
                >
                  <span class="slot-label">孔{{ slot.id }}</span>
                  <div v-if="slot.attrId" class="slot-attr">
                    <span class="attr-name">{{
                      getAttrName(slot.attrId)
                    }}</span>
                    <span class="attr-value">+{{ slot.attrNum }}%</span>
                  </div>
                  <div v-else class="slot-empty">未淬炼</div>
                  <n-tag v-if="slot.isLocked" size="small" type="warning"
                    >锁定</n-tag
                  >
                </div>
              </div>
            </div>
          </div>
          <div v-else class="no-equipment">暂无装备数据</div>
        </n-spin>
      </n-modal>

      <n-modal
        v-model:show="exchangeModalVisible"
        preset="card"
        :title="exchangeMode === 'add' ? '上阵英雄' : '更换武将'"
        style="width: 700px; max-width: 90vw"
        :bordered="false"
      >
        <div class="exchange-modal-content">
          <div v-if="exchangeMode === 'exchange'" class="current-hero-info">
            <span>当前武将：</span>
            <n-tag type="primary" size="large">
              {{
                getHeroName(exchangeHero?.heroId) ||
                `武将${exchangeHero?.heroId}`
              }}
            </n-tag>
          </div>
          <div v-else class="current-hero-info">
            <span>上阵位置：</span>
            <n-tag type="success" size="large">
              位置 {{ getFirstEmptySlot() + 1 }}
            </n-tag>
          </div>
          <n-input
            v-model:value="heroSearchKeyword"
            placeholder="搜索武将名称..."
            clearable
            style="margin-bottom: 12px"
          />
          <div class="hero-filter-section">
            <div class="filter-label">品质：</div>
            <div class="filter-tags">
              <n-tag
                v-for="q in heroQualities"
                :key="q"
                :type="selectedQuality === q ? 'primary' : 'default'"
                :bordered="false"
                style="cursor: pointer; margin-right: 8px"
                @click="selectedQuality = selectedQuality === q ? '全部' : q"
              >
                {{ q }}
              </n-tag>
            </div>
          </div>
          <div class="hero-filter-section">
            <div class="filter-label">国家：</div>
            <div class="filter-tags">
              <n-tag
                v-for="t in heroCountries"
                :key="t"
                :type="selectedCountry === t ? 'primary' : 'default'"
                :bordered="false"
                style="cursor: pointer; margin-right: 8px"
                @click="selectedCountry = selectedCountry === t ? '全部' : t"
              >
                {{ t }}
              </n-tag>
            </div>
          </div>
          <n-spin :show="exchangeLoading">
            <div class="hero-select-grid">
              <div
                v-for="hero in filteredHeroList"
                :key="hero.id"
                class="hero-select-item"
                :class="{
                  selected: exchangeTargetHeroId === hero.id,
                  'quality-red': hero.quality === '红将',
                  'quality-orange': hero.quality === '橙将',
                  'quality-purple': hero.quality === '紫将',
                }"
                @click="selectExchangeHero(hero)"
              >
                <div class="hero-select-avatar">
                  <img v-if="hero.avatar" :src="hero.avatar" :alt="hero.name" />
                  <div v-else class="hero-placeholder">
                    {{ hero.name?.substring(0, 2) || "?" }}
                  </div>
                </div>
                <div class="hero-select-name">{{ hero.name }}</div>
                <div class="hero-select-tags">
                  <n-tag
                    size="small"
                    :bordered="false"
                    :type="
                      hero.quality === '红将'
                        ? 'error'
                        : hero.quality === '橙将'
                          ? 'warning'
                          : hero.quality === '紫将'
                            ? 'info'
                            : 'default'
                    "
                  >
                    {{ hero.quality }}
                  </n-tag>
                  <n-tag size="small" :bordered="false" type="default">
                    {{ hero.type }}
                  </n-tag>
                </div>
              </div>
            </div>
          </n-spin>
        </div>
        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 8px">
            <n-button @click="exchangeModalVisible = false">取消</n-button>
            <n-button
              type="primary"
              @click="confirmHeroAction"
              :loading="exchangeLoading"
              :disabled="!exchangeTargetHeroId"
            >
              {{ exchangeMode === "add" ? "确认上阵" : "确认更换" }}
            </n-button>
          </div>
        </template>
      </n-modal>
    </template>
  </MyCard>
</template>

<script setup>
import { ref, computed, onMounted, watch, h } from "vue";
import { useMessage, useDialog, NInput } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import MyCard from "../Common/MyCard.vue";
import { HERO_DICT, FishMap } from "@/utils/HeroList.js";

const tokenStore = useTokenStore();
const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const switchingTeamId = ref(null);
const currentTeamId = ref(1);
const availableTeams = ref([1, 2, 3, 4, 5, 6]);
const currentTeamInfo = ref(null);
const presetTeamData = ref(null);
const savedLineups = ref([]);
const allHeroesData = ref({});
const roleHeroesData = ref({});
const editingTeamHeroes = ref({});
const artifactBooks = ref({});
const pearlMap = ref({});
let lastRefreshTime = 0;
const REFRESH_DEBOUNCE = 3000;

const state = ref({
  isRunning: false,
});

// 确保状态正确重置的函数
const resetLineupState = (lineup = null) => {
  if (lineup) {
    lineup.applying = false;
  }
  state.value.isRunning = false;
};

const refineModalVisible = ref(false);
const refineModalLoading = ref(false);
const refineModalTitle = ref("");
const selectedHeroEquipment = ref(null);

const exchangeModalVisible = ref(false);
const exchangeLoading = ref(false);
const exchangeMode = ref("exchange");
const exchangeHero = ref(null);
const exchangeTargetHeroId = ref(null);
const heroSearchKeyword = ref("");
const selectedQuality = ref("全部");
const selectedCountry = ref("全部");
const savedLineupsModalVisible = ref(false);
const selectedTeamTab = ref(1);
const expandedLineup = ref(null);

const draggedHeroId = ref(null);
const dragOverPosition = ref(null);

const STORAGE_KEY = "saved_lineups";

const partMap = {
  1: "武器",
  2: "铠甲",
  3: "头冠",
  4: "坐骑",
};

const attrMap = {
  1: "攻击",
  2: "血量",
  3: "防御",
  4: "速度",
  5: "破甲",
  6: "破甲抵抗",
  7: "精准",
  8: "格挡",
  9: "减伤",
  10: "暴击",
  11: "暴击抵抗",
  12: "爆伤",
  13: "爆伤抵抗",
  14: "技能伤害",
  15: "免控",
  16: "眩晕免疫",
  17: "冰冻免疫",
  18: "沉默免疫",
  19: "流血免疫",
  20: "中毒免疫",
  21: "灼烧免疫",
};

const heroQualities = computed(() => {
  return ["全部", "红将", "橙将", "紫将"];
});

const heroCountries = computed(() => {
  const countries = new Set(["全部"]);
  Object.values(HERO_DICT).forEach((hero) => {
    if (hero.type) countries.add(hero.type);
  });
  return Array.from(countries);
});

const getHeroQuality = (heroId) => {
  const prefix = Math.floor(heroId / 100);
  if (prefix === 1) return "红将";
  if (prefix === 2) return "橙将";
  if (prefix === 3) return "紫将";
  return "其他";
};

const getFishInfo = (artifactId) => {
  if (!artifactId || artifactId === -1) return null;

  for (const [fishId, book] of Object.entries(artifactBooks.value)) {
    if (book.artifactId === artifactId) {
      const fishData = FishMap[fishId];
      if (fishData) {
        return {
          fishId: Number(fishId),
          name: fishData.name,
          artifactId: book.artifactId,
          star: book.claimedStar || 0,
        };
      }
    }
  }
  return null;
};

const getFishNameByArtifactId = (artifactId) => {
  const fishInfo = getFishInfo(artifactId);
  return fishInfo ? fishInfo.name : null;
};

const allHeroList = computed(() => {
  const heroes = Object.entries(roleHeroesData.value).map(([id, hero]) => {
    const heroInfo = HERO_DICT[hero.heroId] || {};
    return {
      id: Number(hero.heroId),
      name: heroInfo.name || `武将${hero.heroId}`,
      type: heroInfo.type || "未知",
      avatar: heroInfo.avatar || null,
      quality: getHeroQuality(Number(hero.heroId)),
      artifactId: hero.artifactId || null,
      attachmentUid: hero.attachmentUid || null,
      heroData: hero,
    };
  });

  const countryOrder = { 魏国: 1, 蜀国: 2, 吴国: 3, 群雄: 4 };
  const qualityOrder = { 红将: 1, 橙将: 2, 紫将: 3, 其他: 4 };

  return heroes.sort((a, b) => {
    const countryA = countryOrder[a.type] || 99;
    const countryB = countryOrder[b.type] || 99;
    if (countryA !== countryB) return countryA - countryB;

    const qualityA = qualityOrder[a.quality] || 99;
    const qualityB = qualityOrder[b.quality] || 99;
    if (qualityA !== qualityB) return qualityA - qualityB;

    return a.id - b.id;
  });
});

const filteredHeroList = computed(() => {
  let list = allHeroList.value;

  if (selectedQuality.value !== "全部") {
    list = list.filter((hero) => hero.quality === selectedQuality.value);
  }

  if (selectedCountry.value !== "全部") {
    list = list.filter((hero) => hero.type === selectedCountry.value);
  }

  if (heroSearchKeyword.value) {
    const keyword = heroSearchKeyword.value.toLowerCase();
    list = list.filter((hero) => hero.name.toLowerCase().includes(keyword));
  }

  return list;
});

const currentTeamHeroes = computed(() => {
  if (!currentTeamInfo.value) return [];
  const teamInfo = currentTeamInfo.value;
  return Object.entries(teamInfo)
    .map(([key, hero]) => ({
      position: hero?.battleTeamSlot ?? Number(key),
      heroId: hero?.heroId || hero?.id,
      artifactId: hero?.artifactId || null,
      attachmentUid: hero?.attachmentUid || null,
    }))
    .filter((h) => h.heroId)
    .sort((a, b) => a.position - b.position);
});

const editingHeroes = computed(() => {
  if (Object.keys(editingTeamHeroes.value).length > 0) {
    return Object.entries(editingTeamHeroes.value)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([pos, hero]) => ({
        position: Number(pos),
        heroId: hero?.heroId,
        artifactId: hero?.artifactId || null,
        attachmentUid: hero?.attachmentUid || null,
      }))
      .filter((h) => h.heroId);
  }
  return currentTeamHeroes.value;
});

const getFirstEmptySlot = () => {
  for (let i = 0; i < 5; i++) {
    const hero = editingHeroes.value.find((h) => h.position === i);
    if (!hero) return i;
  }
  return 0;
};

const getLineupsByTeamId = (teamId) => {
  return savedLineups.value.filter((lineup) => lineup.teamId === teamId);
};

const toggleLineupExpand = (lineup) => {
  if (expandedLineup.value === lineup) {
    expandedLineup.value = null;
  } else {
    expandedLineup.value = lineup;
  }
};

const hasEditingChanges = computed(() => {
  if (Object.keys(editingTeamHeroes.value).length === 0) return false;
  const current = JSON.stringify(
    currentTeamHeroes.value
      .map((h) => `${h.position}:${h.heroId}`)
      .sort()
      .join(","),
  );
  const editing = JSON.stringify(
    editingHeroes.value
      .map((h) => `${h.position}:${h.heroId}`)
      .sort()
      .join(","),
  );
  return current !== editing;
});

const getHeroName = (heroId) => {
  if (!heroId) return null;
  return HERO_DICT[heroId]?.name || null;
};

const getHeroAvatar = (heroId) => {
  if (!heroId) return null;
  return HERO_DICT[heroId]?.avatar || null;
};

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const getAttrName = (attrId) => {
  return attrMap[attrId] || `属性${attrId}`;
};

const getEquipBonus = (partId) => {
  if (!selectedHeroEquipment.value || !selectedHeroEquipment.value[partId]) {
    return 0;
  }
  const equip = selectedHeroEquipment.value[partId];
  const bonusType =
    partId === 1
      ? "quenchAttackExt"
      : partId === 3
        ? "quenchDefenseExt"
        : "quenchHpExt";
  return equip[bonusType] || 0;
};

const getEquipSlots = (partId) => {
  if (!selectedHeroEquipment.value || !selectedHeroEquipment.value[partId]) {
    return [];
  }
  const quenches = selectedHeroEquipment.value[partId].quenches || {};
  const slotList = [];
  const slotKeys = Object.keys(quenches).sort((a, b) => Number(a) - Number(b));

  for (const key of slotKeys) {
    const slotId = Number(key);
    const slot = quenches[key];
    slotList.push({
      id: slotId,
      attrId: slot.attrId || null,
      attrNum: slot.attrNum || 0,
      isLocked: slot.isLocked || slot.locked || false,
      colorId: slot.colorId || 0,
    });
  }

  return slotList;
};

const showHeroRefineModal = async (hero) => {
  refineModalTitle.value = `${getHeroName(hero.heroId) || `武将${hero.heroId}`} - 装备洗练`;
  refineModalVisible.value = true;
  refineModalLoading.value = true;
  selectedHeroEquipment.value = null;

  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    refineModalLoading.value = false;
    return;
  }

  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接，无法获取装备信息");
    refineModalLoading.value = false;
    return;
  }

  try {
    const heroData = allHeroesData.value[String(hero.heroId)];
    if (heroData?.equipment) {
      selectedHeroEquipment.value = heroData.equipment;
    } else {
      const roleInfo = await tokenStore.sendMessageWithPromise(
        tokenId,
        "role_getroleinfo",
        {},
      );
      const role = roleInfo?.role || roleInfo;
      const heroes = role?.heroes || {};
      allHeroesData.value = heroes;

      const currentHero = heroes[String(hero.heroId)];
      selectedHeroEquipment.value = currentHero?.equipment || null;
    }

    if (!selectedHeroEquipment.value) {
      message.warning("未找到该武将的装备数据");
    }
  } catch (error) {
    message.error(`获取装备信息失败: ${error.message}`);
  } finally {
    refineModalLoading.value = false;
  }
};

const openExchangeModal = (hero) => {
  exchangeMode.value = "exchange";
  exchangeHero.value = hero;
  exchangeTargetHeroId.value = null;
  heroSearchKeyword.value = "";
  selectedQuality.value = "全部";
  selectedCountry.value = "全部";
  exchangeModalVisible.value = true;
};

const openAddHeroModal = () => {
  if (editingHeroes.value.length >= 5) {
    message.warning("阵容已满，无法上阵更多英雄");
    return;
  }
  exchangeMode.value = "add";
  exchangeHero.value = null;
  exchangeTargetHeroId.value = null;
  heroSearchKeyword.value = "";
  selectedQuality.value = "全部";
  selectedCountry.value = "全部";
  exchangeModalVisible.value = true;
};

const selectExchangeHero = (hero) => {
  exchangeTargetHeroId.value = hero.id;
};

const confirmHeroAction = () => {
  if (!exchangeTargetHeroId.value) {
    message.warning("请选择武将");
    return;
  }

  if (Object.keys(editingTeamHeroes.value).length === 0) {
    currentTeamHeroes.value.forEach((h) => {
      editingTeamHeroes.value[h.position] = {
        heroId: h.heroId,
        artifactId: h.artifactId || null,
        attachmentUid: h.attachmentUid || null,
      };
    });
  }

  if (exchangeMode.value === "add") {
    const slot = getFirstEmptySlot();
    const targetHeroData =
      roleHeroesData.value[String(exchangeTargetHeroId.value)];
    editingTeamHeroes.value[slot] = {
      heroId: exchangeTargetHeroId.value,
      artifactId: targetHeroData?.artifactId || null,
      attachmentUid: targetHeroData?.attachmentUid || null,
    };
    message.success(
      `${getHeroName(exchangeTargetHeroId.value)} 已上阵到位置 ${slot + 1}`,
    );
  } else {
    if (!exchangeHero.value) {
      message.warning("请选择要更换的武将");
      return;
    }
    const originalArtifactId = exchangeHero.value.artifactId;
    const originalAttachmentUid = exchangeHero.value.attachmentUid;
    editingTeamHeroes.value[exchangeHero.value.position] = {
      heroId: exchangeTargetHeroId.value,
      artifactId: originalArtifactId,
      attachmentUid: originalAttachmentUid,
    };
    message.success(
      `已将 ${getHeroName(exchangeHero.value.heroId)} 更换为 ${getHeroName(exchangeTargetHeroId.value)}`,
    );
  }

  exchangeModalVisible.value = false;
};

const removeHero = (hero) => {
  if (Object.keys(editingTeamHeroes.value).length === 0) {
    currentTeamHeroes.value.forEach((h) => {
      editingTeamHeroes.value[h.position] = {
        heroId: h.heroId,
        artifactId: h.artifactId || null,
        attachmentUid: h.attachmentUid || null,
      };
    });
  }

  delete editingTeamHeroes.value[hero.position];
  message.success(`${getHeroName(hero.heroId)} 已下阵`);
};

const onDragStart = (event, hero) => {
  draggedHeroId.value = hero.heroId;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", JSON.stringify(hero));
};

const onDragEnd = () => {
  draggedHeroId.value = null;
  dragOverPosition.value = null;
};

const onDragOver = (event, hero) => {
  if (draggedHeroId.value !== hero.heroId) {
    dragOverPosition.value = hero.position;
  }
};

const onDragLeave = () => {
  dragOverPosition.value = null;
};

const onDrop = (event, targetHero) => {
  event.preventDefault();
  dragOverPosition.value = null;

  if (!draggedHeroId.value || draggedHeroId.value === targetHero.heroId) {
    return;
  }

  const draggedHero = editingHeroes.value.find(
    (h) => h.heroId === draggedHeroId.value,
  );
  if (!draggedHero) return;

  if (Object.keys(editingTeamHeroes.value).length === 0) {
    currentTeamHeroes.value.forEach((h) => {
      editingTeamHeroes.value[h.position] = {
        heroId: h.heroId,
        artifactId: h.artifactId || null,
        attachmentUid: h.attachmentUid || null,
      };
    });
  }

  const draggedPos = draggedHero.position;
  const targetPos = targetHero.position;

  const draggedHeroData = editingTeamHeroes.value[draggedPos];
  const targetHeroData = editingTeamHeroes.value[targetPos];

  editingTeamHeroes.value[draggedPos] = targetHeroData;
  editingTeamHeroes.value[targetPos] = draggedHeroData;

  message.success(
    `已将 ${getHeroName(draggedHero.heroId)} 与 ${getHeroName(targetHero.heroId)} 交换位置`,
  );

  draggedHeroId.value = null;
};

const loadSavedLineups = () => {
  try {
    const token = tokenStore.selectedToken;
    if (!token) return;
    const key = `${STORAGE_KEY}_${token.id}`;
    const data = localStorage.getItem(key);
    if (data) {
      savedLineups.value = JSON.parse(data);
    } else {
      savedLineups.value = [];
    }
  } catch (e) {
    console.error("加载保存的阵容失败:", e);
    savedLineups.value = [];
  }
};

const saveLineupsToStorage = () => {
  try {
    const token = tokenStore.selectedToken;
    if (!token) return;
    const key = `${STORAGE_KEY}_${token.id}`;
    localStorage.setItem(key, JSON.stringify(savedLineups.value));
  } catch (e) {
    console.error("保存阵容到缓存失败:", e);
    message.error("保存阵容失败");
  }
};

const refreshTeamInfo = async (retryCount = 0) => {
  const now = Date.now();
  if (now - lastRefreshTime < REFRESH_DEBOUNCE) {
    return;
  }
  lastRefreshTime = now;

  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    return;
  }

  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接，无法获取数据");
    return;
  }

  loading.value = true;
  try {
    // 发送消息的包装函数，带重试机制
    const sendMessageWithRetry = async (action, data, maxRetries = 2) => {
      let retries = 0;
      while (retries <= maxRetries) {
        try {
          return await tokenStore.sendMessageWithPromise(tokenId, action, data);
        } catch (error) {
          if (retries === maxRetries) {
            throw error;
          }
          retries++;
          await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
        }
      }
    };

    // 分别获取角色信息和阵容信息，即使其中一个失败也不影响另一个
    let roleInfo = null;
    let presetTeamResult = null;

    // 尝试获取角色信息
    try {
      roleInfo = await sendMessageWithRetry("role_getroleinfo", {});
      const role = roleInfo?.role || roleInfo;
      roleHeroesData.value = role?.heroes || {};
      allHeroesData.value = role?.heroes || {};
      artifactBooks.value = role?.artifactBooks || {};
      pearlMap.value = role?.pearlMap || {};
    } catch (error) {
      console.warn("获取角色信息失败，继续获取阵容信息:", error.message);
    }

    // 尝试获取阵容信息
    try {
      presetTeamResult = await sendMessageWithRetry("presetteam_getinfo", {});
      presetTeamData.value = presetTeamResult?.presetTeamInfo;

      if (presetTeamResult) {
        tokenStore.$patch((state) => {
          state.gameData = {
            ...(state.gameData ?? {}),
            presetTeam: presetTeamResult,
          };
        });
      }

      if (presetTeamData.value) {
        currentTeamId.value = presetTeamData.value.useTeamId || 1;

        const teams2 = presetTeamData.value.presetTeamInfo || {};
        const teamIds2 = Object.keys(teams2)
          .filter((k) => /^\d+$/.test(k))
          .map(Number)
          .sort((a, b) => a - b);
        availableTeams.value = teamIds2.length ? teamIds2 : [1, 2, 3, 4, 5, 6];

        const currentTeam =
          teams2[currentTeamId.value] || teams2[String(currentTeamId.value)];
        currentTeamInfo.value = currentTeam?.teamInfo || {};
        editingTeamHeroes.value = {};
      }
    } catch (error) {
      console.warn("获取阵容信息失败:", error.message);
      // 如果获取阵容信息失败，尝试使用tokenStore中的缓存数据
      if (tokenStore.gameData?.presetTeam) {
        console.log("使用缓存的阵容数据");
        presetTeamData.value = tokenStore.gameData.presetTeam.presetTeamInfo;
        if (presetTeamData.value) {
          currentTeamId.value = presetTeamData.value.useTeamId || 1;
          const teams2 = presetTeamData.value.presetTeamInfo || {};
          const teamIds2 = Object.keys(teams2)
            .filter((k) => /^\d+$/.test(k))
            .map(Number)
            .sort((a, b) => a - b);
          availableTeams.value = teamIds2.length ? teamIds2 : [1, 2, 3, 4, 5, 6];
          const currentTeam =
            teams2[currentTeamId.value] || teams2[String(currentTeamId.value)];
          currentTeamInfo.value = currentTeam?.teamInfo || {};
          editingTeamHeroes.value = {};
        }
      }
      throw error; // 重新抛出错误以触发重试
    }

    message.success("数据已刷新");
  } catch (error) {
    // 错误处理和自动重试
    if (retryCount < 2) {
      message.warning(`获取数据失败，正在重试(${retryCount + 1}/2)...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return refreshTeamInfo(retryCount + 1);
    }
    // 特殊处理服务器错误200020
    if (error.message.includes("200020")) {
      message.error(`获取数据失败: 服务器错误200020 - 可能是服务器暂时不可用，请稍后再试`);
    } else {
      message.error(`获取数据失败: ${error.message}`);
    }
  } finally {
    loading.value = false;
  }
};

const saveCurrentLineup = () => {
  if (editingHeroes.value.length === 0) {
    message.warning("当前阵容为空，无法保存");
    return;
  }

  const lineupName = `阵容${currentTeamId.value} - ${new Date().toLocaleTimeString()}`;

  const heroesData = editingHeroes.value.map((hero) => {
    return {
      position: hero.position,
      heroId: hero.heroId,
      attachmentUid: hero.attachmentUid || null,
    };
  });

  savedLineups.value.unshift({
    name: lineupName,
    heroes: heroesData,
    teamId: currentTeamId.value,
    savedAt: Date.now(),
    applying: false,
  });

  saveLineupsToStorage();
  message.success(`阵容已保存: ${lineupName}`);
};

// 防抖函数
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// 应用阵容（带防抖）
const applyLineup = debounce(async (lineup) => {
  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    return;
  }

  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接，无法应用阵容");
    return;
  }

  // 移除槽位限制，允许将阵容应用到任何槽位
  // if (lineup.teamId !== currentTeamId.value) {
  //   message.warning(
  //     `此阵容仅适用于阵容槽位 ${lineup.teamId}，当前槽位为 ${currentTeamId.value}`,
  //   );
  //   return;
  // }

  lineup.applying = true;
  state.value.isRunning = true;
  const errors = [];

  const getTeamHeroes = (teamInfo) => {
    if (!teamInfo) return [];
    return Object.entries(teamInfo)
      .map(([key, hero]) => ({
        position: hero?.battleTeamSlot ?? Number(key),
        heroId: hero?.heroId || hero?.id,
        artifactId: hero?.artifactId || null,
        attachmentUid: hero?.attachmentUid || null,
      }))
      .filter((h) => h.heroId)
      .sort((a, b) => a.position - b.position);
  };

  const fetchLatestData = async (teamId = null) => {
    const roleInfo = await tokenStore.sendMessageWithPromise(
      tokenId,
      "role_getroleinfo",
      {},
    );
    await delay(COMMAND_DELAY);
    const presetTeam = await tokenStore.sendMessageWithPromise(
      tokenId,
      "presetteam_getinfo",
      {},
    );
    const heroes = roleInfo?.role?.heroes || roleInfo?.heroes || {};
    const pearlMapData = roleInfo?.role?.pearlMap || roleInfo?.pearlMap || {};
    const artifactBooksData =
      roleInfo?.role?.artifactBooks || roleInfo?.artifactBooks || {};
    roleHeroesData.value = heroes;
    const targetTeamId = teamId || currentTeamId.value;
    const team =
      presetTeam?.presetTeamInfo?.presetTeamInfo?.[targetTeamId] ||
      presetTeam?.presetTeamInfo?.presetTeamInfo?.[String(targetTeamId)];
    return {
      heroes,
      teamInfo: team?.teamInfo || {},
      pearlMap: pearlMapData,
      artifactBooks: artifactBooksData,
    };
  };

  const isIgnorableError = (err) => {
    const msg = err.message || "";
    return msg.includes("200020");
  };

  const isRateLimitError = (err) => {
    const msg = err.message || "";
    return msg.includes("200400") || msg.includes("操作太快");
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const COMMAND_DELAY = 800; // 增加延迟时间，避免触发服务器限流
  const RATE_LIMIT_RETRY_DELAY = 2000; // 遇到限流时的重试延迟

  try {
    const targetHeroes = [...lineup.heroes];

    let { heroes, teamInfo } = await fetchLatestData();
    let currentHeroes = getTeamHeroes(teamInfo);

    const attachmentToHero = {};
    for (const [id, hero] of Object.entries(heroes)) {
      if (hero.attachmentUid && hero.attachmentUid !== -1) {
        attachmentToHero[hero.attachmentUid] = Number(id);
      }
    }

    const currentHeroIds = new Set(currentHeroes.map((h) => h.heroId));
    const targetHeroIds = new Set(targetHeroes.map((h) => h.heroId));

    for (const targetHero of targetHeroes) {
      if (!targetHero.attachmentUid || targetHero.attachmentUid === -1)
        continue;

      const currentHolderId = attachmentToHero[targetHero.attachmentUid];

      if (currentHolderId && currentHolderId !== targetHero.heroId) {
        const holderInTeam = currentHeroIds.has(currentHolderId);
        const targetInTeam = currentHeroIds.has(targetHero.heroId);

        if (!holderInTeam && !targetInTeam) {
          const emptySlot = currentHeroes.length < 5 ? currentHeroes.length : 0;
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "hero_gointobattle",
              {
                heroId: currentHolderId,
                slot: emptySlot,
              },
            );
            await delay(COMMAND_DELAY);
          } catch (err) {
            if (isRateLimitError(err)) {
              // 遇到限流，等待后重试
              message.info("操作过于频繁，正在重试...");
              await delay(RATE_LIMIT_RETRY_DELAY);
              try {
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "hero_gointobattle",
                  {
                    heroId: currentHolderId,
                    slot: emptySlot,
                  },
                );
                await delay(COMMAND_DELAY);
              } catch (retryErr) {
                errors.push(`上阵装备持有者失败: ${retryErr.message}`);
              }
            } else if (!isIgnorableError(err)) {
              errors.push(`上阵装备持有者失败: ${err.message}`);
            }
            continue;
          }

          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "hero_gointobattle",
              {
                heroId: targetHero.heroId,
                slot: emptySlot + 1,
              },
            );
            await delay(COMMAND_DELAY);
          } catch (err) {
            if (isRateLimitError(err)) {
              // 遇到限流，等待后重试
              message.info("操作过于频繁，正在重试...");
              await delay(RATE_LIMIT_RETRY_DELAY);
              try {
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "hero_gointobattle",
                  {
                    heroId: targetHero.heroId,
                    slot: emptySlot + 1,
                  },
                );
                await delay(COMMAND_DELAY);
              } catch (retryErr) {
                errors.push(`上阵目标英雄失败: ${retryErr.message}`);
              }
            } else if (!isIgnorableError(err)) {
              errors.push(`上阵目标英雄失败: ${err.message}`);
            }
          }
        }

        try {
          await tokenStore.sendMessageWithPromise(tokenId, "hero_exchange", {
            heroId: currentHolderId,
            targetHeroId: targetHero.heroId,
          });
          await delay(COMMAND_DELAY);
        } catch (err) {
          if (isRateLimitError(err)) {
            // 遇到限流，等待后重试
            message.info("操作过于频繁，正在重试...");
            await delay(RATE_LIMIT_RETRY_DELAY);
            try {
              await tokenStore.sendMessageWithPromise(tokenId, "hero_exchange", {
                heroId: currentHolderId,
                targetHeroId: targetHero.heroId,
              });
              await delay(COMMAND_DELAY);
            } catch (retryErr) {
              errors.push(
                `装备更换到${getHeroName(targetHero.heroId)}失败: ${retryErr.message}`,
              );
            }
          } else if (!isIgnorableError(err)) {
            errors.push(
              `装备更换到${getHeroName(targetHero.heroId)}失败: ${err.message}`,
            );
          }
        }
      }
    }

    await delay(COMMAND_DELAY);
    const data1 = await fetchLatestData();
    heroes = data1.heroes;
    for (const [id, hero] of Object.entries(heroes)) {
      if (hero.attachmentUid && hero.attachmentUid !== -1) {
        attachmentToHero[hero.attachmentUid] = Number(id);
      }
    }
    currentHeroes = getTeamHeroes(data1.teamInfo);
    currentHeroIds.clear();
    currentHeroes.forEach((h) => currentHeroIds.add(h.heroId));

    for (const hero of currentHeroes) {
      if (!targetHeroIds.has(hero.heroId)) {
        if (currentHeroes.length <= 1) break;
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "hero_gobackbattle",
            {
              slot: hero.position,
            },
          );
          await delay(COMMAND_DELAY);
          currentHeroes = currentHeroes.filter((h) => h.heroId !== hero.heroId);
        } catch (err) {
          if (isRateLimitError(err)) {
            // 遇到限流，等待后重试
            message.info("操作过于频繁，正在重试...");
            await delay(RATE_LIMIT_RETRY_DELAY);
            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "hero_gobackbattle",
                {
                  slot: hero.position,
                },
              );
              await delay(COMMAND_DELAY);
              currentHeroes = currentHeroes.filter((h) => h.heroId !== hero.heroId);
            } catch (retryErr) {
              errors.push(`${getHeroName(hero.heroId)}下阵失败: ${retryErr.message}`);
            }
          } else if (!isIgnorableError(err)) {
            errors.push(`${getHeroName(hero.heroId)}下阵失败: ${err.message}`);
          }
        }
      }
    }

    await delay(COMMAND_DELAY);
    const data2 = await fetchLatestData();
    await delay(COMMAND_DELAY);
    currentHeroes = getTeamHeroes(data2.teamInfo);

    const needPositionFix = targetHeroes.some((targetHero) => {
      const currentHero = currentHeroes.find(
        (h) => h.heroId === targetHero.heroId,
      );
      return !currentHero || currentHero.position !== targetHero.position;
    });

    if (needPositionFix) {
      const correctHeroes = currentHeroes.filter((h) => {
        const target = targetHeroes.find((t) => t.heroId === h.heroId);
        return target && target.position === h.position;
      });

      const heroesToRemove = currentHeroes.filter((h) => {
        const target = targetHeroes.find((t) => t.heroId === h.heroId);
        return !target || target.position !== h.position;
      });

      const keepHero =
        correctHeroes.length > 0
          ? correctHeroes[0]
          : heroesToRemove.length > 0
            ? heroesToRemove.pop()
            : null;

      for (const hero of heroesToRemove) {
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "hero_gobackbattle",
            {
              slot: hero.position,
            },
          );
          await delay(COMMAND_DELAY);
        } catch (err) {
          if (isRateLimitError(err)) {
            // 遇到限流，等待后重试
            message.info("操作过于频繁，正在重试...");
            await delay(RATE_LIMIT_RETRY_DELAY);
            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "hero_gobackbattle",
                {
                  slot: hero.position,
                },
              );
              await delay(COMMAND_DELAY);
            } catch (retryErr) {
              errors.push(`${getHeroName(hero.heroId)}下阵失败: ${retryErr.message}`);
            }
          } else if (!isIgnorableError(err)) {
            errors.push(`${getHeroName(hero.heroId)}下阵失败: ${err.message}`);
          }
        }
      }

      const heroesToDeploy = targetHeroes.filter((t) => {
        if (
          keepHero &&
          t.heroId === keepHero.heroId &&
          t.position === keepHero.position
        ) {
          return false;
        }
        const current = currentHeroes.find((h) => h.heroId === t.heroId);
        return !current || current.position !== t.position;
      });

      for (const targetHero of heroesToDeploy) {
        try {
          await tokenStore.sendMessageWithPromise(
            tokenId,
            "hero_gointobattle",
            {
              heroId: targetHero.heroId,
              slot: targetHero.position,
            },
          );
          await delay(COMMAND_DELAY);
        } catch (err) {
          if (isRateLimitError(err)) {
            // 遇到限流，等待后重试
            message.info("操作过于频繁，正在重试...");
            await delay(RATE_LIMIT_RETRY_DELAY);
            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "hero_gointobattle",
                {
                  heroId: targetHero.heroId,
                  slot: targetHero.position,
                },
              );
              await delay(COMMAND_DELAY);
            } catch (retryErr) {
              errors.push(
                `${getHeroName(targetHero.heroId)}上阵失败: ${retryErr.message}`,
              );
            }
          } else if (!isIgnorableError(err)) {
            errors.push(
              `${getHeroName(targetHero.heroId)}上阵失败: ${err.message}`,
            );
          }
        }
      }
    }

    if (errors.length > 0) {
      message.warning(`阵容已应用，但有部分错误:\n${errors.join("\n")}`);
    } else {
      message.success(`阵容 "${lineup.name}" 已应用`);
    }

    lastRefreshTime = 0;
    await refreshTeamInfo();
  } catch (error) {
    if (isRateLimitError(error)) {
      message.error(`应用阵容失败: 服务器繁忙，请稍后再试`);
    } else {
      message.error(`应用阵容失败: ${error.message}`);
    }
  } finally {
    resetLineupState(lineup);
  }
}, 1000); // 1秒防抖，避免短时间内重复点击

const renameLineup = (index) => {
  const currentName = savedLineups.value[index].name;
  let newName = currentName;
  dialog.create({
    title: "重命名阵容",
    content: () =>
      h(NInput, {
        defaultValue: currentName,
        onInput: (val) => {
          newName = val;
        },
        placeholder: "请输入阵容名称",
      }),
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: () => {
      if (newName && newName.trim()) {
        savedLineups.value[index].name = newName.trim();
        saveLineupsToStorage();
        message.success("阵容名称已更新");
      }
    },
  });
};

const deleteLineup = (index) => {
  dialog.warning({
    title: "删除阵容",
    content: `确定要删除阵容 "${savedLineups.value[index].name}" 吗？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => {
      savedLineups.value.splice(index, 1);
      saveLineupsToStorage();
      message.success("阵容已删除");
    },
  });
};

const switchTeam = async (teamId) => {
  if (teamId === currentTeamId.value) return;

  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    return;
  }

  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接，无法切换阵容");
    return;
  }

  switchingTeamId.value = teamId;
  state.value.isRunning = true;

  try {
    await tokenStore.sendMessageWithPromise(tokenId, "presetteam_saveteam", {
      teamId,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    currentTeamId.value = teamId;
    message.success(`已切换到阵容 ${teamId}`);

    await refreshTeamInfo();
  } catch (error) {
    message.error(`切换阵容失败: ${error.message}`);
  } finally {
    switchingTeamId.value = null;
    state.value.isRunning = false;
  }
};

watch(
  () => tokenStore.selectedToken,
  (newToken, oldToken) => {
    if (newToken && newToken.id !== oldToken?.id) {
      loadSavedLineups();
      currentTeamInfo.value = null;
      presetTeamData.value = null;
      allHeroesData.value = {};
      currentTeamId.value = 1;

      const checkConnectionAndRefresh = () => {
        const status = tokenStore.getWebSocketStatus(newToken.id);
        if (status === "connected") {
          refreshTeamInfo();
          return true;
        }
        return false;
      };

      // 立即检查一次
      if (!checkConnectionAndRefresh()) {
        // 如果未连接，设置轮询检查
        const interval = setInterval(() => {
          if (checkConnectionAndRefresh()) {
            clearInterval(interval);
          }
        }, 1000);

        // 最多轮询30秒
        setTimeout(() => {
          clearInterval(interval);
        }, 30000);
      }
    }
  },
);

watch(
  () =>
    tokenStore.selectedToken
      ? tokenStore.getWebSocketStatus(tokenStore.selectedToken.id)
      : null,
  (newStatus, oldStatus) => {
    if (
      newStatus === "connected" &&
      oldStatus !== "connected" &&
      tokenStore.selectedToken
    ) {
      setTimeout(() => {
        refreshTeamInfo();
      }, 500);
    }
  },
);

onMounted(() => {
  loadSavedLineups();

  const checkConnectionAndRefresh = () => {
    const token = tokenStore.selectedToken;
    if (token) {
      const status = tokenStore.getWebSocketStatus(token.id);
      if (status === "connected") {
        refreshTeamInfo();
        return true;
      }
    }
    return false;
  };

  // 立即检查一次
  if (!checkConnectionAndRefresh()) {
    // 如果未连接，设置轮询检查
    const interval = setInterval(() => {
      if (checkConnectionAndRefresh()) {
        clearInterval(interval);
      }
    }, 1000);

    // 最多轮询30秒
    setTimeout(() => {
      clearInterval(interval);
    }, 30000);
  }
});
</script>

<style scoped lang="scss">
.lineup-saver {
  min-height: 300px;
}

.lineup-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.toolbar {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.current-team-section {
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
  padding: var(--spacing-md);

  h4 {
    margin: 0 0 var(--spacing-sm) 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .drag-tip {
    font-size: var(--font-size-xs);
    color: var(--text-tertiary);
    font-weight: normal;
  }
}

.heroes-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.hero-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  background: var(--bg-primary);
  border-radius: var(--border-radius-small);
  padding: var(--spacing-xs) var(--spacing-sm);
  min-width: 100px;
  transition: all 0.2s;
  cursor: grab;
  border: 2px solid transparent;

  &:hover {
    background: var(--primary-color-light);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  &.dragging {
    opacity: 0.5;
    cursor: grabbing;
  }

  &.drag-over {
    border-color: var(--primary-color);
    background: var(--primary-color-light);
  }
}

.hero-position {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary-color);
  color: white;
  font-size: 10px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hero-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.hero-placeholder {
  font-size: 12px;
  color: var(--text-secondary);
}

.hero-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
  flex: 1;
}

.hero-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.hero-fish {
  font-size: var(--font-size-xs);
  color: var(--primary-color);
  background: rgba(var(--primary-color-rgb), 0.1);
  padding: 1px 4px;
  border-radius: var(--border-radius-small);
  display: inline-block;
  align-self: flex-start;
}

.hero-artifact {
  font-size: var(--font-size-xs);
}

.exchange-btn {
  flex-shrink: 0;
}

.remove-btn {
  flex-shrink: 0;
}

.saved-lineups-section {
  h4 {
    margin: 0 0 var(--spacing-sm) 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }
}

.empty-tip {
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
  text-align: center;
  padding: var(--spacing-lg);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
}

.saved-lineups-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.saved-lineup-item {
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
  padding: var(--spacing-sm);
}

.lineup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xs);
}

.lineup-name {
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.lineup-time {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.lineup-heroes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-sm);
}

.lineup-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.quick-switch-section {
  h4 {
    margin: 0 0 var(--spacing-sm) 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }
}

.team-selector {
  display: flex;
  gap: var(--spacing-xs);
}

.refine-modal-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.equip-refine-section {
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
  padding: var(--spacing-sm);
}

.equip-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  padding-bottom: var(--spacing-xs);
  border-bottom: 1px solid var(--border-light);
}

.equip-name {
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.equip-level {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.equip-bonus {
  font-size: var(--font-size-xs);
  color: var(--primary-color);
  margin-left: auto;
}

.slots-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.slot-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-primary);
  border-radius: var(--border-radius-small);
  border-left: 3px solid var(--border-light);

  &.locked {
    border-left-color: var(--primary-color);
    background: var(--primary-color-light);
  }

  &.color-1 {
    border-left-color: #ffffff;
    background: rgba(255, 255, 255, 0.1);
  }

  &.color-2 {
    border-left-color: #4caf50;
    background: rgba(76, 175, 80, 0.1);
  }

  &.color-3 {
    border-left-color: #2196f3;
    background: rgba(33, 150, 243, 0.1);
  }

  &.color-4 {
    border-left-color: #9c27b0;
    background: rgba(156, 39, 176, 0.1);
  }

  &.color-5 {
    border-left-color: #ff9800;
    background: rgba(255, 152, 0, 0.1);
  }

  &.color-6 {
    border-left-color: #f44336;
    background: rgba(244, 67, 54, 0.1);
  }
}

.slot-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  min-width: 30px;
}

.slot-attr {
  flex: 1;
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
}

.attr-name {
  color: var(--text-primary);
}

.attr-value {
  color: var(--primary-color);
  font-weight: var(--font-weight-medium);
}

.slot-empty {
  flex: 1;
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
}

.no-equipment {
  text-align: center;
  color: var(--text-secondary);
  padding: var(--spacing-lg);
}

.exchange-modal-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.current-hero-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
}

.hero-filter-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);

  .filter-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .filter-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }
}

.hero-select-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: var(--spacing-sm);
  max-height: 400px;
  overflow-y: auto;
  padding: var(--spacing-xs);
}

.hero-select-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;

  &:hover {
    background: var(--bg-secondary);
    transform: translateY(-2px);
  }

  &.selected {
    border-color: var(--primary-color);
    background: var(--primary-color-light);
  }

  &.quality-red {
    border-color: rgba(245, 34, 45, 0.3);

    &:hover {
      border-color: rgba(245, 34, 45, 0.6);
    }
  }

  &.quality-orange {
    border-color: rgba(255, 159, 64, 0.3);

    &:hover {
      border-color: rgba(255, 159, 64, 0.6);
    }
  }

  &.quality-purple {
    border-color: rgba(153, 102, 255, 0.3);

    &:hover {
      border-color: rgba(153, 102, 255, 0.6);
    }
  }
}

.hero-select-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: var(--spacing-xs);
  background: var(--bg-tertiary);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .hero-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--text-secondary);
  }
}

.hero-select-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
  text-align: center;
}

.hero-select-tags {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xs);
}

.empty-tip {
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
  padding: var(--spacing-lg);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
}

.no-lineup-tip {
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
  padding: var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
  margin-top: var(--spacing-sm);
}

.drag-tip {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-left: var(--spacing-sm);
  font-style: italic;
}
</style>

