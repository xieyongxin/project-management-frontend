<template>
  <div class="app-container">
    <el-result v-if="notFound" icon="warning" title="项目不存在或无权访问">
      <template #extra>
        <el-button type="primary" @click="backToList">返回项目列表</el-button>
      </template>
    </el-result>
    <el-skeleton v-else-if="loading" :rows="3" animated />
    <el-result v-else-if="loadError" icon="error" title="项目加载失败">
      <template #extra>
        <el-button @click="loadProject">重试</el-button>
        <el-button type="primary" @click="backToList">返回项目列表</el-button>
      </template>
    </el-result>
    <template v-else-if="project">
      <div class="project-heading">
        <el-button link icon="ArrowLeft" @click="backToList">项目列表</el-button>
        <div v-if="canEditMemberRoles && nameEditing" class="project-name-editor">
          <el-input v-model="projectNameDraft" maxlength="255" @keyup.enter="saveProjectName" />
          <el-button type="primary" :loading="nameSaving" @click="saveProjectName">保存</el-button>
          <el-button :disabled="nameSaving" @click="cancelProjectName">取消</el-button>
        </div>
        <div v-else class="project-name-display">
          <h2>{{ project.projectName }}</h2>
          <el-button v-if="canEditMemberRoles" link type="primary" @click="startProjectNameEdit">修改名称</el-button>
        </div>
      </div>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="项目编号">{{ project.projectId }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ parseTime(project.createTime) }}</el-descriptions-item>
      </el-descriptions>
      <div class="section-heading">
        <h3>项目成员</h3>
        <el-button link type="primary" @click="loadMembers">刷新</el-button>
      </div>
      <el-alert v-if="membersError" title="项目成员加载失败" type="error" show-icon :closable="false" class="mb8">
        <template #default>
          <span>请检查网络或登录状态后重试。</span>
          <el-button link type="primary" @click="loadMembers">重试</el-button>
        </template>
      </el-alert>
      <el-alert v-if="roleOptionsError" title="项目角色选项加载失败" type="error" show-icon :closable="false" class="mb8">
        <template #default>
          <span>项目成员仍可查看；请重试后再修改角色。</span>
          <el-button link type="primary" @click="loadRoleOptions">重试</el-button>
        </template>
      </el-alert>
      <el-table v-loading="membersLoading" :data="members">
        <el-table-column label="用户名" prop="userName" min-width="140" />
        <el-table-column label="昵称" prop="nickName" min-width="140" />
        <el-table-column label="邮箱" prop="email" min-width="190" />
        <el-table-column label="全局角色" prop="roleName" min-width="190">
          <template #default="scope">
            <el-select
              v-if="canEditMemberRoles"
              v-model="roleDrafts[scope.row.userId]"
              placeholder="请选择角色"
              :clearable="false"
              :loading="rolesLoading"
              :disabled="rolesLoading || roleSaving || roleOptionsError"
              style="width: 160px"
              @change="saveMemberRole(scope.row)"
            >
              <el-option v-for="role in roleOptions" :key="role.roleId" :label="role.roleName" :value="role.roleId" />
            </el-select>
            <span v-else>{{ scope.row.roleName || '未设置' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="项目管理员" width="120">
          <template #default="scope">
            <el-switch
              v-if="canEditMemberRoles"
              v-model="adminDrafts[scope.row.userId]"
              :active-value="true"
              :inactive-value="false"
              :loading="adminSaving"
              :disabled="adminSaving"
              @change="saveMemberAdmin(scope.row)"
            />
            <el-tag v-else-if="scope.row.isProjectAdmin === 1" type="success">是</el-tag>
            <span v-else>否</span>
          </template>
        </el-table-column>
      </el-table>
      <template v-if="canViewProjectLogs">
        <div class="section-heading">
          <h3>项目操作日志</h3>
          <el-button link type="primary" @click="loadLogs">刷新</el-button>
        </div>
        <el-alert v-if="logsError" title="项目日志加载失败" type="error" show-icon :closable="false" class="mb8">
          <template #default>
            <span>请检查权限或网络后重试。</span>
            <el-button link type="primary" @click="loadLogs">重试</el-button>
          </template>
        </el-alert>
        <el-table v-loading="logsLoading" :data="logs">
          <el-table-column label="操作时间" prop="createTime" min-width="170" />
          <el-table-column label="操作者" prop="operatorName" min-width="120" />
          <el-table-column label="目标成员" prop="targetUserName" min-width="120">
            <template #default="scope">{{ scope.row.targetUserName || '—' }}</template>
          </el-table-column>
          <el-table-column label="操作类型" prop="operationType" min-width="190" />
          <el-table-column label="说明" prop="detail" min-width="280" show-overflow-tooltip />
        </el-table>
        <pagination
          v-show="logsTotal > 0"
          v-model:page="logsPage"
          v-model:limit="logsPageSize"
          :total="logsTotal"
          @pagination="loadLogs"
        />
      </template>
    </template>
  </div>
</template>

<script setup name="ProjectDetail">
import { getProject, listProjectMemberRoles, listProjectMembers, listProjectOperationLogs, updateProjectMemberAdmin, updateProjectMemberRole, updateProjectName } from '@/api/project'
import useUserStore from '@/store/modules/user'

const route = useRoute()
const router = useRouter()
const { proxy } = getCurrentInstance()
const loading = ref(false)
const notFound = ref(false)
const loadError = ref(false)
const project = ref(null)
const members = ref([])
const membersLoading = ref(false)
const membersError = ref(false)
const roleOptions = ref([])
const roleDrafts = reactive({})
const canEditMemberRoles = ref(false)
const rolesLoading = ref(false)
const roleSaving = ref(false)
const roleOptionsError = ref(false)
const adminSaving = ref(false)
const adminDrafts = reactive({})
const nameEditing = ref(false)
const nameSaving = ref(false)
const projectNameDraft = ref('')
const logs = ref([])
const logsTotal = ref(0)
const logsPage = ref(1)
const logsPageSize = ref(10)
const logsLoading = ref(false)
const logsError = ref(false)
const userStore = useUserStore()
const canViewProjectLogs = computed(() => userStore.permissions?.includes('*:*:*')
  || userStore.permissions?.includes('project:log:list'))

function backToList() {
  router.push('/project/index')
}

async function loadProject() {
  loading.value = true
  notFound.value = false
  loadError.value = false
  project.value = null
  members.value = []
  membersError.value = false
  roleOptions.value = []
  roleOptionsError.value = false
  canEditMemberRoles.value = false
  Object.keys(roleDrafts).forEach(key => delete roleDrafts[key])
  Object.keys(adminDrafts).forEach(key => delete adminDrafts[key])
  nameEditing.value = false
  projectNameDraft.value = ''
  logs.value = []
  logsTotal.value = 0
  logsPage.value = 1
  logsError.value = false
  try {
    const response = await getProject(route.params.projectId)
    project.value = response.data
    await loadMembers()
  } catch (error) {
    if (error.response?.status === 404) {
      notFound.value = true
    } else {
      loadError.value = true
    }
  } finally {
    loading.value = false
  }
}

async function loadMembers() {
  membersLoading.value = true
  membersError.value = false
  try {
    const response = await listProjectMembers(route.params.projectId)
    members.value = response.data || []
    members.value.forEach(member => {
      roleDrafts[member.userId] = member.roleId
      adminDrafts[member.userId] = member.isProjectAdmin === 1
    })
    const currentMember = members.value.find(member => String(member.userId) === String(userStore.id))
    canEditMemberRoles.value = currentMember?.isProjectAdmin === 1
    if (!nameEditing.value) projectNameDraft.value = project.value?.projectName || ''
    if (canEditMemberRoles.value) {
      await loadRoleOptions()
    }
    if (canViewProjectLogs.value) {
      await loadLogs()
    }
  } catch (error) {
    if (error.response?.status === 404) {
      notFound.value = true
      project.value = null
    } else {
      members.value = []
      membersError.value = true
    }
  } finally {
    membersLoading.value = false
  }
}

async function loadRoleOptions() {
  rolesLoading.value = true
  roleOptionsError.value = false
  try {
    const response = await listProjectMemberRoles(route.params.projectId)
    roleOptions.value = response.data || []
  } catch (_error) {
    roleOptions.value = []
    roleOptionsError.value = true
  } finally {
    rolesLoading.value = false
  }
}

async function saveMemberRole(member) {
  if (roleSaving.value) return
  const roleId = roleDrafts[member.userId]
  if (!roleId) {
    roleDrafts[member.userId] = member.roleId
    proxy?.$modal?.msgError?.('项目角色不能为空')
    return
  }
  roleSaving.value = true
  try {
    const response = await updateProjectMemberRole(route.params.projectId, member.userId, { roleId })
    member.roleId = response.data.roleId
    member.roleName = response.data.roleName
    proxy?.$modal?.msgSuccess?.('项目角色已更新')
  } catch (_error) {
    roleDrafts[member.userId] = member.roleId
  } finally {
    roleSaving.value = false
  }
}

async function saveMemberAdmin(member) {
  if (adminSaving.value) return
  const projectAdmin = adminDrafts[member.userId]
  adminSaving.value = true
  try {
    const response = await updateProjectMemberAdmin(route.params.projectId, member.userId, { projectAdmin })
    member.isProjectAdmin = response.data.isProjectAdmin
    adminDrafts[member.userId] = member.isProjectAdmin === 1
    if (String(member.userId) === String(userStore.id)) {
      canEditMemberRoles.value = member.isProjectAdmin === 1
    }
    proxy?.$modal?.msgSuccess?.(projectAdmin ? '已授予项目管理员资格' : '已撤销项目管理员资格')
  } catch (_error) {
    adminDrafts[member.userId] = member.isProjectAdmin === 1
  } finally {
    adminSaving.value = false
  }
}

function startProjectNameEdit() {
  projectNameDraft.value = project.value?.projectName || ''
  nameEditing.value = true
}

function cancelProjectName() {
  projectNameDraft.value = project.value?.projectName || ''
  nameEditing.value = false
}

async function saveProjectName() {
  if (nameSaving.value) return
  nameSaving.value = true
  try {
    const response = await updateProjectName(route.params.projectId, { projectName: projectNameDraft.value })
    project.value = response.data
    projectNameDraft.value = response.data.projectName
    nameEditing.value = false
    proxy?.$modal?.msgSuccess?.('项目名称已更新')
  } catch (_error) {
    projectNameDraft.value = project.value?.projectName || ''
  } finally {
    nameSaving.value = false
  }
}

async function loadLogs() {
  if (!canViewProjectLogs.value) return
  logsLoading.value = true
  logsError.value = false
  try {
    const response = await listProjectOperationLogs(route.params.projectId, {
      pageNum: logsPage.value,
      pageSize: logsPageSize.value
    })
    logs.value = response.rows || []
    logsTotal.value = response.total || 0
  } catch (error) {
    logs.value = []
    logsTotal.value = 0
    logsError.value = error.response?.status !== 403 && error.response?.status !== 404
  } finally {
    logsLoading.value = false
  }
}

watch(() => route.params.projectId, loadProject)
onMounted(loadProject)
</script>

<style scoped>
.project-heading {
  margin-bottom: 18px;
}

.project-heading h2 {
  margin: 14px 0 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.project-name-display,
.project-name-editor {
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-name-editor {
  width: min(100%, 640px);
}

.project-name-editor .el-input {
  flex: 1;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 24px 0 12px;
}

.section-heading h3 {
  margin: 0;
  font-size: 16px;
}
</style>
