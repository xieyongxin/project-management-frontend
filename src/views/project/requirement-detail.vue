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
          <el-button
            v-if="canUseAgent && !editing && !isDeleted"
            type="success"
            plain
            @click="openAgent"
          >Agent 拆分任务</el-button>
          <el-button
            v-if="canViewAgentLogs && !editing"
            type="info"
            plain
            @click="openAgentCalls"
          >Agent 调用记录</el-button>
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

      <el-card shadow="never" class="mb16">
        <template #header>
          <div class="section-title">
            <span>当前版本附件</span>
            <el-upload
              v-if="canEditRequirement && !isDeleted"
              :show-file-list="false"
              :auto-upload="false"
              :on-change="handleAttachmentChange"
              :before-upload="validateAttachment"
              multiple
            >
              <el-button type="primary" plain :loading="attachmentSubmitting">上传附件</el-button>
            </el-upload>
          </div>
        </template>
        <el-empty v-if="!currentAttachments.length" description="当前版本暂无附件" />
        <el-table v-else :data="currentAttachments" row-key="attachmentId">
          <el-table-column label="文件名" prop="originalName" min-width="260" show-overflow-tooltip />
          <el-table-column label="大小" width="120">
            <template #default="scope">{{ formatFileSize(scope.row.fileSize) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="scope">
              <el-button link type="primary" @click="openAttachment(scope.row)">{{ scope.row.previewable ? '预览/下载' : '下载' }}</el-button>
            </template>
          </el-table-column>
        </el-table>
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
        <div v-if="selectedVersion.attachments?.length" class="content-label attachment-label">附件</div>
        <div v-if="selectedVersion.attachments?.length" class="attachment-list">
          <el-link
            v-for="attachment in selectedVersion.attachments"
            :key="attachment.attachmentId"
            type="primary"
            :href="getAttachmentUrl(attachment, selectedVersion.versionId)"
            target="_blank"
          >{{ attachment.originalName }}</el-link>
        </div>
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

    <el-dialog v-model="agentVisible" title="确认发送给 Agent" width="760px">
      <el-alert title="确认后将锁定当前需求版本并生成可编辑草稿，不会自动创建正式任务。" type="info" show-icon :closable="false" class="mb16" />
      <el-descriptions v-if="agentRequirement" :column="1" border class="mb16">
        <el-descriptions-item label="需求版本">v{{ agentRequirement.currentVersionNo }}</el-descriptions-item>
        <el-descriptions-item label="标题">{{ agentRequirement.title }}</el-descriptions-item>
        <el-descriptions-item label="正文">{{ stripHtml(agentRequirement.content) }}</el-descriptions-item>
      </el-descriptions>
      <el-checkbox-group v-model="agentAttachmentIds">
        <el-checkbox v-for="attachment in agentRequirement?.attachments || []" :key="attachment.attachmentId" :label="attachment.attachmentId">
          {{ attachment.originalName }}
        </el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="agentVisible = false">取消</el-button>
        <el-button type="primary" :loading="agentSubmitting" @click="confirmAgent">确认发送</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="agentResultVisible" title="Agent 任务草稿" width="820px">
      <el-alert
        title="草稿不会自动创建正式任务。请补充状态、分类和负责人后批量保存。"
        type="info"
        show-icon
        :closable="false"
        class="mb16"
      />
      <el-empty v-if="!agentDrafts.length" description="Agent 未生成任务草稿" />
      <el-card v-for="(draft, index) in agentDrafts" :key="draft._draftId" shadow="never" class="agent-draft-card">
        <template #header>
          <div class="agent-draft-header">
            <span>草稿 {{ index + 1 }}</span>
            <el-button link type="danger" @click="removeAgentDraft(index)">删除草稿</el-button>
          </div>
        </template>
        <el-form label-width="80px" class="agent-draft-form">
          <el-form-item label="标题">
            <el-input v-model="draft.title" maxlength="255" show-word-limit />
          </el-form-item>
          <el-form-item label="说明">
            <el-input v-model="draft.description" type="textarea" :rows="4" maxlength="5000" show-word-limit />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="draft.status" placeholder="请选择任务状态" style="width: 100%">
              <el-option v-for="item in agentTaskOptions.statuses" :key="item.dictValue" :label="item.dictLabel" :value="item.dictValue" />
            </el-select>
          </el-form-item>
          <el-form-item label="分类">
            <el-select v-model="draft.categoryValues" multiple filterable collapse-tags style="width: 100%">
              <el-option v-for="item in agentTaskOptions.categories" :key="item.dictValue" :label="item.dictLabel" :value="item.dictValue" />
            </el-select>
          </el-form-item>
          <el-form-item label="负责人">
            <el-select v-model="draft.ownerIds" multiple filterable collapse-tags style="width: 100%">
              <el-option v-for="member in agentMembers" :key="member.userId" :label="member.nickName || member.userName || member.userId" :value="member.userId" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-card>
      <template #footer>
        <el-button @click="agentResultVisible = false">关闭</el-button>
        <el-button type="primary" :loading="agentSaving" :disabled="!agentDrafts.length" @click="saveAgentDrafts">批量保存正式任务</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="agentCallsVisible" title="Agent 调用记录" width="1120px" @open="loadAgentCalls">
      <el-alert
        v-if="agentCallsError"
        title="Agent 调用记录加载失败"
        type="error"
        show-icon
        :closable="false"
        class="mb8"
      >
        <template #default>
          <span>{{ agentCallsError }}</span>
          <el-button link type="primary" @click="loadAgentCalls">重试</el-button>
        </template>
      </el-alert>
      <el-skeleton v-if="agentCallsLoading" :rows="5" animated />
      <el-empty v-else-if="!agentCalls.length" description="暂无 Agent 调用记录" />
      <el-table v-else :data="agentCalls" row-key="callId" border>
        <el-table-column type="expand">
          <template #default="scope">
            <el-descriptions :column="2" border class="agent-call-details">
              <el-descriptions-item label="调用编号">{{ scope.row.callId }}</el-descriptions-item>
              <el-descriptions-item label="锁定需求版本">{{ scope.row.requirementVersionId || '—' }}</el-descriptions-item>
              <el-descriptions-item label="服务商">{{ scope.row.provider || '—' }}</el-descriptions-item>
              <el-descriptions-item label="模型">{{ scope.row.model || '—' }}</el-descriptions-item>
              <el-descriptions-item label="允许外发">{{ Number(scope.row.externalEnabled) === 1 ? '是' : '否' }}</el-descriptions-item>
              <el-descriptions-item label="幂等键">{{ scope.row.idempotencyKey || '—' }}</el-descriptions-item>
              <el-descriptions-item label="所选附件" :span="2">
                <pre class="agent-call-content">{{ formatJson(scope.row.selectedAttachmentSnapshot) }}</pre>
              </el-descriptions-item>
              <el-descriptions-item label="需求正文" :span="2">
                <pre class="agent-call-content">{{ scope.row.inputContent || '—' }}</pre>
              </el-descriptions-item>
              <el-descriptions-item label="附件解析结果" :span="2">
                <pre class="agent-call-content">{{ formatJson(scope.row.parsedAttachmentContent) }}</pre>
              </el-descriptions-item>
              <el-descriptions-item label="任务草稿" :span="2">
                <pre class="agent-call-content">{{ formatJson(scope.row.draftTasks) }}</pre>
              </el-descriptions-item>
              <el-descriptions-item v-if="scope.row.errorMessage" label="失败原因" :span="2">
                <pre class="agent-call-content">{{ scope.row.errorMessage }}</pre>
              </el-descriptions-item>
            </el-descriptions>
          </template>
        </el-table-column>
        <el-table-column label="调用编号" prop="callId" width="110" />
        <el-table-column label="需求版本" width="120">
          <template #default="scope">{{ scope.row.requirementVersionId || '—' }}</template>
        </el-table-column>
        <el-table-column label="服务商/模型" min-width="200" show-overflow-tooltip>
          <template #default="scope">{{ scope.row.provider || '—' }} / {{ scope.row.model || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="scope">
            <el-tag :type="agentCallStatusType(scope.row.status)">{{ scope.row.status || '—' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="允许外发" width="110">
          <template #default="scope">{{ Number(scope.row.externalEnabled) === 1 ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column label="调用时间" min-width="180">
          <template #default="scope">{{ parseTime(scope.row.createTime) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup name="ProjectRequirementDetail">
import {
  compareProjectRequirementVersions,
  deleteProjectRequirement,
  getProjectRequirement,
  listProjectRequirementVersions,
  updateProjectRequirementContent,
  uploadProjectRequirementAttachments,
  getProjectRequirementAttachmentUrl,
  previewProjectRequirementAgent,
  callProjectRequirementAgent,
  listProjectRequirementAgentCalls,
  createProjectTask,
  listProjectMembers,
  listProjectTaskOptions
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
const attachmentSubmitting = ref(false)
const currentAttachments = computed(() => requirement.value?.attachments || [])
const agentVisible = ref(false)
const agentResultVisible = ref(false)
const agentRequirement = ref(null)
const agentAttachmentIds = ref([])
const agentCall = ref(null)
const agentSubmitting = ref(false)
const agentSaving = ref(false)
const agentDrafts = ref([])
const agentTaskOptions = reactive({ statuses: [], categories: [] })
const agentMembers = ref([])
const agentCallsVisible = ref(false)
const agentCallsLoading = ref(false)
const agentCallsError = ref('')
const agentCalls = ref([])

const canEditRequirement = computed(() => userStore.permissions?.includes('*:*:*')
  || userStore.permissions?.includes('project:requirement:edit'))
const canDeleteRequirement = computed(() => userStore.permissions?.includes('*:*:*')
  || userStore.permissions?.includes('project:requirement:delete'))
const canUseAgent = computed(() => userStore.permissions?.includes('*:*:*')
  || userStore.permissions?.includes('project:agent:split'))
const canViewAgentLogs = computed(() => userStore.permissions?.includes('*:*:*')
  || userStore.permissions?.includes('project:agent:log'))
const isDeleted = computed(() => Number(requirement.value?.isDeleted) === 1)
const ownerNames = computed(() => (requirement.value?.owners || [])
  .map(owner => owner.nickName || owner.userName || owner.userId)
  .join('、'))
const readOnlyContent = computed(() => requirement.value?.content || '<p></p>')

function backToRequirements() {
  router.push(`/project/requirements/${route.params.projectId}`)
}

function openAgentCalls() {
  agentCallsError.value = ''
  agentCallsVisible.value = true
}

async function loadAgentCalls() {
  if (!canViewAgentLogs.value || !requirement.value) return
  agentCallsLoading.value = true
  agentCallsError.value = ''
  try {
    const response = await listProjectRequirementAgentCalls(route.params.projectId, route.params.requirementId)
    agentCalls.value = response.data || []
  } catch (error) {
    agentCalls.value = []
    agentCallsError.value = error?.response?.status === 403
      ? '当前账号没有 Agent 调用记录查看权限。'
      : error?.response?.data?.msg || error?.message || '请检查项目权限或网络后重试。'
  } finally {
    agentCallsLoading.value = false
  }
}

function formatJson(value) {
  if (!value) return '—'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch (_error) {
    return value
  }
}

function agentCallStatusType(status) {
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED' || status === 'TIMEOUT' || status === 'CANCELLED') return 'danger'
  return 'info'
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

async function openAgent() {
  try {
    const response = await previewProjectRequirementAgent(route.params.projectId, route.params.requirementId)
    agentRequirement.value = response.data
    agentAttachmentIds.value = (response.data?.attachments || []).map(item => item.attachmentId)
    agentVisible.value = true
  } catch (error) {
    submitError.value = error?.response?.data?.msg || error?.message || 'Agent预览加载失败'
  }
}

async function confirmAgent() {
  if (!agentRequirement.value || agentSubmitting.value) return
  agentSubmitting.value = true
  try {
    const response = await callProjectRequirementAgent(route.params.projectId, route.params.requirementId, {
      attachmentIds: agentAttachmentIds.value,
      confirmed: true,
      idempotencyKey: `web-${Date.now()}-${Math.random().toString(16).slice(2)}`
    })
    agentCall.value = response.data
    agentDrafts.value = parseDrafts(response.data?.draftTasks)
    await loadAgentTaskOptions()
    agentVisible.value = false
    agentResultVisible.value = true
  } catch (error) {
    submitError.value = error?.response?.data?.msg || error?.message || 'Agent调用失败'
  } finally {
    agentSubmitting.value = false
  }
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseDrafts(value) {
  let drafts = []
  try { drafts = JSON.parse(value || '[]') } catch (_) { drafts = [] }
  return (Array.isArray(drafts) ? drafts : []).map((draft, index) => ({
    _draftId: `${Date.now()}-${index}`,
    title: draft?.title || '',
    description: draft?.description || '',
    status: draft?.status || '',
    categoryValues: Array.isArray(draft?.categoryValues) ? [...draft.categoryValues] : [],
    ownerIds: Array.isArray(draft?.ownerIds) ? [...draft.ownerIds] : []
  }))
}

async function loadAgentTaskOptions() {
  try {
    const [options, members] = await Promise.all([
      listProjectTaskOptions(route.params.projectId),
      listProjectMembers(route.params.projectId)
    ])
    agentTaskOptions.statuses = options.data?.statuses || []
    agentTaskOptions.categories = options.data?.categories || []
    agentMembers.value = members.data || []
  } catch (error) {
    agentTaskOptions.statuses = []
    agentTaskOptions.categories = []
    agentMembers.value = []
    submitError.value = error?.response?.data?.msg || error?.message || '任务草稿选项加载失败'
  }
}

function removeAgentDraft(index) {
  agentDrafts.value.splice(index, 1)
}

async function saveAgentDrafts() {
  if (agentSaving.value || !agentDrafts.value.length) return
  const invalid = agentDrafts.value.findIndex(draft => !draft.title.trim() || !draft.description.trim()
    || !draft.status || !draft.categoryValues.length || !draft.ownerIds.length)
  if (invalid >= 0) {
    submitError.value = `请完整填写草稿 ${invalid + 1} 的标题、说明、状态、分类和负责人`
    return
  }
  agentSaving.value = true
  submitError.value = ''
  const failures = []
  try {
    for (const [index, draft] of agentDrafts.value.entries()) {
      try {
        await createProjectTask(route.params.projectId, {
          requirementId: Number(route.params.requirementId),
          title: draft.title.trim(),
          description: draft.description.trim(),
          status: draft.status,
          categoryValues: draft.categoryValues,
          ownerIds: draft.ownerIds
        })
      } catch (error) {
        failures.push(`草稿 ${index + 1}：${error?.response?.data?.msg || error?.message || '保存失败'}`)
      }
    }
    if (failures.length) {
      submitError.value = failures.join('；')
      return
    }
    proxy?.$modal?.msgSuccess?.('正式任务已批量保存')
    agentResultVisible.value = false
  } finally {
    agentSaving.value = false
  }
}

function validateAttachment(file) {
  const allowed = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg']
  const extension = String(file.name || '').split('.').pop().toLowerCase()
  if (!allowed.includes(extension)) {
    proxy?.$modal?.msgError?.('仅支持 PDF、DOC、DOCX、XLS、XLSX、PNG、JPG、JPEG')
    return false
  }
  if (file.size > 20 * 1024 * 1024) {
    proxy?.$modal?.msgError?.('单个附件不能超过20MB')
    return false
  }
  return true
}

async function handleAttachmentChange(uploadFile) {
  const files = uploadFile?.raw ? [uploadFile.raw] : []
  if (!files.length || attachmentSubmitting.value) return
  if (files.length > 10 || files.reduce((sum, file) => sum + file.size, 0) > 100 * 1024 * 1024) {
    proxy?.$modal?.msgError?.('当前上传附件数量或总大小超出限制')
    return
  }
  attachmentSubmitting.value = true
  try {
    const response = await uploadProjectRequirementAttachments(route.params.projectId, route.params.requirementId, files)
    requirement.value = response.data
    await loadVersions()
    proxy?.$modal?.msgSuccess?.('附件已保存并生成新版本')
  } catch (error) {
    proxy?.$modal?.msgError?.(error?.response?.data?.msg || error?.message || '附件上传失败')
  } finally {
    attachmentSubmitting.value = false
  }
}

function formatFileSize(size) {
  const value = Number(size || 0)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function openAttachment(attachment) {
  const url = getAttachmentUrl(attachment, attachment.versionId)
  window.open(url, '_blank', 'noopener')
}

function getAttachmentUrl(attachment, versionId) {
  return getProjectRequirementAttachmentUrl(route.params.projectId, route.params.requirementId,
    attachment.attachmentId, versionId)
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

.attachment-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
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

.agent-draft-card {
  margin-bottom: 12px;
}

.agent-draft-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.agent-draft-form {
  margin-bottom: -18px;
}

.agent-call-details {
  margin: 4px 0;
}

.agent-call-content {
  max-height: 220px;
  margin: 0;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f5f7fa;
  border-radius: 4px;
}
</style>
