<template>
  <div class="app-container">
    <el-result v-if="notFound" icon="warning" title="任务不存在或无权访问">
      <template #extra>
        <el-button type="primary" @click="backToTasks">返回任务列表</el-button>
      </template>
    </el-result>
    <el-result v-else-if="loadError" icon="error" title="任务详情加载失败">
      <template #extra>
        <el-button @click="loadDetail">重试</el-button>
        <el-button type="primary" @click="backToTasks">返回任务列表</el-button>
      </template>
    </el-result>
    <el-skeleton v-else-if="loading" :rows="9" animated />
    <template v-else-if="task">
      <div class="page-heading">
        <el-button link icon="ArrowLeft" @click="backToTasks">项目任务</el-button>
        <div class="page-heading-row">
          <div class="title-with-status">
            <h2>任务 #{{ task.taskId }}</h2>
            <el-tag v-if="isDeleted" type="info">已删除</el-tag>
          </div>
        </div>
      </div>

      <el-alert
        v-if="isDeleted"
        title="该任务已删除，历史内容和版本仍可查看。"
        type="info"
        show-icon
        :closable="false"
        class="mb8"
      />
      <el-alert
        v-if="compareError"
        :title="compareError"
        type="error"
        show-icon
        :closable="false"
        class="mb8"
      />

      <el-card shadow="never" class="mb16">
        <template #header>
          <div class="section-title">当前内容</div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="标题">{{ task.title }}</el-descriptions-item>
          <el-descriptions-item label="当前版本">v{{ task.currentVersionNo || '—' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ task.statusLabel || task.status || '—' }}</el-descriptions-item>
          <el-descriptions-item label="依据需求">
            {{ task.requirementId ? `#${task.requirementId} / v${task.requirementVersionNo || '—'}` : '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="分类">{{ categoryNames || '—' }}</el-descriptions-item>
          <el-descriptions-item label="负责人">{{ ownerNames || '—' }}</el-descriptions-item>
          <el-descriptions-item label="说明" :span="2">
            <div class="task-description">{{ task.description || '—' }}</div>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="section-title">
            <span>版本历史</span>
            <div class="version-actions">
              <el-tag v-if="compareVersionIds.length" type="info">已选 {{ compareVersionIds.length }}/2</el-tag>
              <el-button
                type="primary"
                plain
                :loading="comparing"
                :disabled="compareVersionIds.length !== 2"
                @click="compareSelectedVersions"
              >对比选中版本</el-button>
            </div>
          </div>
        </template>
        <el-empty v-if="!versions.length" description="暂无版本历史" />
        <el-table v-else :data="versions" row-key="versionId">
          <el-table-column label="版本" width="100">
            <template #default="scope">
              <span>v{{ scope.row.versionNo }}</span>
              <el-tag v-if="Number(scope.row.isDeleted) === 1" type="info" size="small" class="deleted-tag">已删除</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="标题" prop="title" min-width="260" show-overflow-tooltip />
          <el-table-column label="依据需求版本" width="140">
            <template #default="scope">v{{ scope.row.requirementVersionNo || '—' }}</template>
          </el-table-column>
          <el-table-column label="创建时间" prop="createTime" min-width="180">
            <template #default="scope">{{ parseTime(scope.row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="选择对比" width="120">
            <template #default="scope">
              <el-checkbox
                :model-value="isVersionSelected(scope.row.versionId)"
                :disabled="!isVersionSelected(scope.row.versionId) && compareVersionIds.length >= 2"
                @change="toggleVersion(scope.row)"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="scope">
              <el-button link type="primary" @click="viewVersion(scope.row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <el-dialog v-model="versionDialogVisible" :title="`任务版本 v${selectedVersion?.versionNo || ''}`" width="760px">
      <template v-if="selectedVersion">
        <el-descriptions :column="1" border class="mb16">
          <el-descriptions-item label="标题">{{ selectedVersion.title }}</el-descriptions-item>
          <el-descriptions-item label="依据需求版本">v{{ selectedVersion.requirementVersionNo || '—' }}</el-descriptions-item>
          <el-descriptions-item v-if="Number(selectedVersion.isDeleted) === 1" label="状态">
            <el-tag type="info">已删除</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ parseTime(selectedVersion.createTime) }}</el-descriptions-item>
        </el-descriptions>
        <div class="content-label">任务说明</div>
        <div class="task-description">{{ selectedVersion.description || '—' }}</div>
      </template>
    </el-dialog>

    <el-dialog v-model="compareDialogVisible" title="任务版本对比" width="1000px">
      <el-row v-if="comparedVersions.length === 2" :gutter="16">
        <el-col v-for="version in comparedVersions" :key="version.versionId" :span="12">
          <el-card shadow="never" class="compare-card">
            <template #header>
              <div class="compare-title">
                <span>任务版本 v{{ version.versionNo }}</span>
                <el-tag v-if="Number(version.isDeleted) === 1" type="info" size="small">已删除</el-tag>
              </div>
            </template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="标题">{{ version.title }}</el-descriptions-item>
              <el-descriptions-item label="依据需求版本">
                v{{ version.requirementVersionNo || '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ parseTime(version.createTime) }}</el-descriptions-item>
            </el-descriptions>
            <div class="content-label">任务说明</div>
            <div class="task-description compare-description">{{ version.description || '—' }}</div>
          </el-card>
        </el-col>
      </el-row>
    </el-dialog>
  </div>
</template>

<script setup name="ProjectTaskDetail">
import { compareProjectTaskVersions, getProjectTask, listProjectTaskVersions } from '@/api/project'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const notFound = ref(false)
const loadError = ref(false)
const task = ref(null)
const versions = ref([])
const selectedVersion = ref(null)
const versionDialogVisible = ref(false)
const compareVersionIds = ref([])
const comparedVersions = ref([])
const compareDialogVisible = ref(false)
const comparing = ref(false)
const compareError = ref('')

const isDeleted = computed(() => Number(task.value?.isDeleted) === 1)
const categoryNames = computed(() => (task.value?.categories || [])
  .map(category => category.categoryLabel || category.categoryValue)
  .join('、'))
const ownerNames = computed(() => (task.value?.owners || [])
  .map(owner => owner.nickName || owner.userName || owner.userId)
  .join('、'))

function backToTasks() {
  router.push(`/project/tasks/${route.params.projectId}`)
}

function viewVersion(version) {
  selectedVersion.value = version
  versionDialogVisible.value = true
}

function isVersionSelected(versionId) {
  return compareVersionIds.value.some(selectedId => String(selectedId) === String(versionId))
}

function toggleVersion(version) {
  const versionId = version.versionId
  const index = compareVersionIds.value.findIndex(selectedId => String(selectedId) === String(versionId))
  if (index >= 0) {
    compareVersionIds.value.splice(index, 1)
    return
  }
  if (compareVersionIds.value.length < 2) {
    compareVersionIds.value.push(versionId)
  }
}

async function compareSelectedVersions() {
  if (compareVersionIds.value.length !== 2 || comparing.value) return
  comparing.value = true
  compareError.value = ''
  try {
    const response = await compareProjectTaskVersions(
      route.params.projectId,
      route.params.taskId,
      compareVersionIds.value[0],
      compareVersionIds.value[1]
    )
    comparedVersions.value = response.data || []
    compareDialogVisible.value = true
  } catch (error) {
    comparedVersions.value = []
    compareError.value = error?.response?.data?.msg || error?.message || '任务版本对比失败，请检查项目权限。'
  } finally {
    comparing.value = false
  }
}

async function loadDetail() {
  loading.value = true
  notFound.value = false
  loadError.value = false
  try {
    const [detailResponse, versionResponse] = await Promise.all([
      getProjectTask(route.params.projectId, route.params.taskId),
      listProjectTaskVersions(route.params.projectId, route.params.taskId)
    ])
    task.value = detailResponse.data
    versions.value = versionResponse.data || []
    compareVersionIds.value = []
    comparedVersions.value = []
    compareError.value = ''
  } catch (error) {
    task.value = null
    versions.value = []
    compareVersionIds.value = []
    comparedVersions.value = []
    if (error.response?.status === 404) {
      notFound.value = true
    } else {
      loadError.value = true
    }
  } finally {
    loading.value = false
  }
}

watch(() => [route.params.projectId, route.params.taskId], loadDetail)
onMounted(loadDetail)
</script>

<style scoped>
.page-heading {
  margin-bottom: 18px;
}

.page-heading h2 {
  margin: 14px 0 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
}

.page-heading-row,
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.version-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-with-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.task-description {
  white-space: pre-wrap;
  word-break: break-word;
}

.deleted-tag {
  margin-left: 6px;
}

.content-label {
  color: #606266;
  font-size: 14px;
  margin-bottom: 8px;
}

.compare-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.compare-description {
  min-height: 120px;
  margin-top: 10px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}
</style>
