<template>
  <div class="app-container">
    <el-result v-if="notFound" icon="warning" title="需求不存在或无权访问">
      <template #extra>
        <el-button type="primary" @click="backToRequirements">返回需求列表</el-button>
      </template>
    </el-result>
    <el-result v-else-if="loadError" icon="error" title="需求详情加载失败">
      <template #extra>
        <el-button @click="loadDetail">重试</el-button>
        <el-button type="primary" @click="backToRequirements">返回需求列表</el-button>
      </template>
    </el-result>
    <el-skeleton v-else-if="loading" :rows="9" animated />
    <template v-else-if="requirement">
      <div class="page-heading">
        <el-button link icon="ArrowLeft" @click="backToRequirements">项目需求</el-button>
        <div class="page-heading-row">
          <div class="title-with-status">
            <h2>需求 #{{ requirement.requirementId }}</h2>
            <el-tag v-if="isDeleted" type="info">已删除</el-tag>
          </div>
          <el-button
            v-if="canEditRequirement && !editing && !isDeleted"
            type="primary"
            @click="startEditing"
          >编辑内容</el-button>
          <el-button
            v-if="canDeleteRequirement && !editing && !isDeleted"
            type="danger"
            plain
            @click="deleteRequirement"
          >删除需求</el-button>
        </div>
      </div>

      <el-alert v-if="submitError" :title="submitError" type="error" show-icon :closable="false" class="mb8" />
      <el-alert
        v-if="compareError"
        :title="compareError"
        type="error"
        show-icon
        :closable="false"
        class="mb8"
      />
      <el-alert
        v-if="isDeleted"
        title="该需求已删除，历史内容和版本仍可查看。"
        type="info"
        show-icon
        :closable="false"
        class="mb8"
      />

      <el-card shadow="never" class="mb16">
        <template #header>
          <div class="section-title">当前内容</div>
        </template>
        <el-form v-if="editing" ref="formRef" :model="form" label-width="90px" class="requirement-form">
          <el-form-item label="需求标题" prop="title">
            <el-input v-model="form.title" maxlength="255" show-word-limit />
          </el-form-item>
          <el-form-item label="需求正文" prop="content">
            <Editor v-model="form.content" :min-height="280" type="base64" />
          </el-form-item>
          <div class="form-actions">
            <el-button type="primary" :loading="submitting" @click="saveContent">保存</el-button>
            <el-button :disabled="submitting" @click="cancelEditing">取消</el-button>
          </div>
        </el-form>
        <template v-else>
          <el-descriptions :column="2" border class="mb16">
            <el-descriptions-item label="标题">{{ requirement.title }}</el-descriptions-item>
            <el-descriptions-item label="当前版本">v{{ requirement.currentVersionNo }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ requirement.statusLabel || requirement.status || '—' }}</el-descriptions-item>
            <el-descriptions-item label="负责人">{{ ownerNames || '—' }}</el-descriptions-item>
          </el-descriptions>
          <div class="content-label">需求正文</div>
          <Editor v-model="readOnlyContent" :min-height="220" type="base64" read-only />
        </template>
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

    <el-dialog v-model="versionDialogVisible" :title="`需求版本 v${selectedVersion?.versionNo || ''}`" width="760px">
      <template v-if="selectedVersion">
        <el-descriptions :column="1" border class="mb16">
          <el-descriptions-item label="标题">{{ selectedVersion.title }}</el-descriptions-item>
          <el-descriptions-item v-if="Number(selectedVersion.isDeleted) === 1" label="状态">
            <el-tag type="info">已删除</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ parseTime(selectedVersion.createTime) }}</el-descriptions-item>
        </el-descriptions>
        <div class="content-label">正文</div>
        <Editor v-model="versionContent" :min-height="260" type="base64" read-only />
      </template>
    </el-dialog>

    <el-dialog v-model="compareDialogVisible" title="需求版本对比" width="1100px">
      <el-row v-if="comparedVersions.length === 2" :gutter="16">
        <el-col v-for="version in comparedVersions" :key="version.versionId" :span="12">
          <el-card shadow="never" class="compare-card">
            <template #header>
              <div class="compare-title">
                <span>需求版本 v{{ version.versionNo }}</span>
                <el-tag v-if="Number(version.isDeleted) === 1" type="info" size="small">已删除</el-tag>
              </div>
            </template>
            <el-descriptions :column="1" border class="mb16">
              <el-descriptions-item label="标题">{{ version.title }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ parseTime(version.createTime) }}</el-descriptions-item>
            </el-descriptions>
            <div class="content-label">正文</div>
            <Editor :model-value="version.content || '<p></p>'" :min-height="220" type="base64" read-only />
            <div class="content-label attachment-label">附件快照</div>
            <pre class="attachment-snapshot">{{ version.attachmentSnapshot || '—' }}</pre>
          </el-card>
        </el-col>
      </el-row>
    </el-dialog>
  </div>
</template>

<script setup name="ProjectRequirementDetail">
import {
  compareProjectRequirementVersions,
  deleteProjectRequirement,
  getProjectRequirement,
  listProjectRequirementVersions,
  updateProjectRequirementContent
} from '@/api/project'
import useUserStore from '@/store/modules/user'

const route = useRoute()
const router = useRouter()
const { proxy } = getCurrentInstance()
const userStore = useUserStore()
const loading = ref(false)
const submitting = ref(false)
const notFound = ref(false)
const loadError = ref(false)
const submitError = ref('')
const requirement = ref(null)
const versions = ref([])
const editing = ref(false)
const form = reactive({ title: '', content: '' })
const formRef = ref()
const selectedVersion = ref(null)
const versionDialogVisible = ref(false)
const versionContent = ref('')
const compareVersionIds = ref([])
const comparedVersions = ref([])
const compareDialogVisible = ref(false)
const comparing = ref(false)
const compareError = ref('')

const canEditRequirement = computed(() => userStore.permissions?.includes('*:*:*')
  || userStore.permissions?.includes('project:requirement:edit'))
const canDeleteRequirement = computed(() => userStore.permissions?.includes('*:*:*')
  || userStore.permissions?.includes('project:requirement:delete'))
const isDeleted = computed(() => Number(requirement.value?.isDeleted) === 1)
const ownerNames = computed(() => (requirement.value?.owners || [])
  .map(owner => owner.nickName || owner.userName || owner.userId)
  .join('、'))
const readOnlyContent = computed(() => requirement.value?.content || '<p></p>')

function backToRequirements() {
  router.push(`/project/requirements/${route.params.projectId}`)
}

function startEditing() {
  form.title = requirement.value?.title || ''
  form.content = requirement.value?.content || ''
  submitError.value = ''
  editing.value = true
}

function cancelEditing() {
  editing.value = false
  submitError.value = ''
}

function contentText(value) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim()
}

async function saveContent() {
  if (!form.title.trim()) {
    submitError.value = '需求标题不能为空'
    return
  }
  if (!contentText(form.content)) {
    submitError.value = '需求正文不能为空'
    return
  }
  if (submitting.value) return
  submitting.value = true
  submitError.value = ''
  try {
    const response = await updateProjectRequirementContent(route.params.projectId, route.params.requirementId, {
      title: form.title.trim(),
      content: form.content
    })
    requirement.value = response.data
    editing.value = false
    await loadVersions()
  } catch (error) {
    submitError.value = error?.response?.data?.msg || error?.message || '需求内容保存失败，请检查项目权限。'
  } finally {
    submitting.value = false
  }
}

async function deleteRequirement() {
  if (submitting.value || isDeleted.value) return
  try {
    await proxy?.$modal?.confirm?.('确认逻辑删除该需求吗？删除后将不能恢复，但项目成员仍可查看历史内容和版本。')
  } catch (_error) {
    return
  }
  submitting.value = true
  submitError.value = ''
  try {
    await deleteProjectRequirement(route.params.projectId, route.params.requirementId)
    proxy?.$modal?.msgSuccess?.('需求已删除')
    backToRequirements()
  } catch (error) {
    submitError.value = error?.response?.data?.msg || error?.message || '需求删除失败，请检查项目权限和任务关联。'
  } finally {
    submitting.value = false
  }
}

async function loadVersions() {
  const response = await listProjectRequirementVersions(route.params.projectId, route.params.requirementId)
  versions.value = response.data || []
}

function viewVersion(version) {
  selectedVersion.value = version
  versionContent.value = version.content || '<p></p>'
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
    const response = await compareProjectRequirementVersions(
      route.params.projectId,
      route.params.requirementId,
      compareVersionIds.value[0],
      compareVersionIds.value[1]
    )
    const left = response.data?.left
    const right = response.data?.right
    if (!left || !right) {
      throw new Error('需求版本对比结果不完整')
    }
    comparedVersions.value = [left, right]
    compareDialogVisible.value = true
  } catch (error) {
    comparedVersions.value = []
    compareError.value = error?.response?.data?.msg || error?.message || '需求版本对比失败，请检查项目权限。'
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
      getProjectRequirement(route.params.projectId, route.params.requirementId),
      listProjectRequirementVersions(route.params.projectId, route.params.requirementId)
    ])
    requirement.value = detailResponse.data
    versions.value = versionResponse.data || []
    compareVersionIds.value = []
    comparedVersions.value = []
    compareDialogVisible.value = false
    compareError.value = ''
  } catch (error) {
    requirement.value = null
    versions.value = []
    compareVersionIds.value = []
    comparedVersions.value = []
    compareDialogVisible.value = false
    if (error.response?.status === 404) {
      notFound.value = true
    } else {
      loadError.value = true
    }
  } finally {
    loading.value = false
  }
}

watch(() => [route.params.projectId, route.params.requirementId], () => {
  editing.value = false
  loadDetail()
})
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

.deleted-tag {
  margin-left: 6px;
}

.requirement-form {
  max-width: 960px;
}

.form-actions {
  margin-left: 90px;
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

.attachment-label {
  margin-top: 16px;
}

.attachment-snapshot {
  min-height: 42px;
  margin: 0;
  padding: 10px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f5f7fa;
  border-radius: 4px;
}
</style>
