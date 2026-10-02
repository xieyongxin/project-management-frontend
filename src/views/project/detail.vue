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
        <h2>{{ project.projectName }}</h2>
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
      <el-table v-loading="membersLoading" :data="members">
        <el-table-column label="用户名" prop="userName" min-width="140" />
        <el-table-column label="昵称" prop="nickName" min-width="140" />
        <el-table-column label="邮箱" prop="email" min-width="190" />
        <el-table-column label="全局角色" prop="roleName" min-width="140">
          <template #default="scope">{{ scope.row.roleName || '未设置' }}</template>
        </el-table-column>
        <el-table-column label="项目管理员" width="120">
          <template #default="scope">
            <el-tag v-if="scope.row.isProjectAdmin === 1" type="success">是</el-tag>
            <span v-else>否</span>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

<script setup name="ProjectDetail">
import { getProject, listProjectMembers } from '@/api/project'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const notFound = ref(false)
const loadError = ref(false)
const project = ref(null)
const members = ref([])
const membersLoading = ref(false)
const membersError = ref(false)

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
