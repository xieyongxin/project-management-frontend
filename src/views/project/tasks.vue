<template>
  <div class="app-container">
    <el-result v-if="!canViewProjectTasks" icon="warning" title="暂无项目任务查看权限">
      <template #extra>
        <el-button type="primary" @click="backToProject">返回项目详情</el-button>
      </template>
    </el-result>
    <el-result v-else-if="notFound" icon="warning" title="项目不存在或无权访问">
      <template #extra>
        <el-button type="primary" @click="backToProject">返回项目详情</el-button>
      </template>
    </el-result>
    <el-skeleton v-else-if="loading" :rows="5" animated />
    <el-result v-else-if="loadError" icon="error" title="任务列表加载失败">
      <template #extra>
        <el-button @click="loadTasks">重试</el-button>
        <el-button type="primary" @click="backToProject">返回项目详情</el-button>
      </template>
    </el-result>
    <template v-else>
      <div class="page-heading">
        <el-button link icon="ArrowLeft" @click="backToProject">项目详情</el-button>
        <h2>项目任务</h2>
      </div>
      <el-alert
        v-if="!tasks.length && total === 0"
        title="当前项目暂无任务"
        type="info"
        show-icon
        :closable="false"
        class="mb8"
      />
      <el-table v-loading="loading" :data="tasks">
        <el-table-column label="任务编号" prop="taskId" width="110" />
        <el-table-column label="任务标题" prop="title" min-width="240" show-overflow-tooltip />
        <el-table-column label="状态" min-width="120">
          <template #default="scope">
            {{ scope.row.statusLabel || scope.row.status || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="当前版本" prop="currentVersionNo" width="110">
          <template #default="scope">v{{ scope.row.currentVersionNo || '—' }}</template>
        </el-table-column>
        <el-table-column label="依据需求" min-width="150">
          <template #default="scope">
            {{ requirementReference(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column label="分类" min-width="150" show-overflow-tooltip>
          <template #default="scope">
            {{ categoryNames(scope.row) || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="负责人" min-width="200" show-overflow-tooltip>
          <template #default="scope">
            {{ ownerNames(scope.row) || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" prop="updateTime" min-width="180">
          <template #default="scope">{{ parseTime(scope.row.updateTime) }}</template>
        </el-table-column>
      </el-table>
      <pagination
        v-show="total > 0"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        :total="total"
        @pagination="loadTasks"
      />
    </template>
  </div>
</template>

<script setup name="ProjectTasks">
import { listProjectTasks } from '@/api/project'
import useUserStore from '@/store/modules/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const notFound = ref(false)
const loadError = ref(false)
const tasks = ref([])
const total = ref(0)
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10
})
const canViewProjectTasks = computed(() => userStore.permissions?.includes('*:*:*')
  || userStore.permissions?.includes('project:task:list'))

function backToProject() {
  router.push(`/project/detail/${route.params.projectId}`)
}

function requirementReference(task) {
  if (!task.requirementId) return '—'
  const version = task.requirementVersionNo ? ` / v${task.requirementVersionNo}` : ''
  return `#${task.requirementId}${version}`
}

function categoryNames(task) {
  return (task.categories || [])
    .map(category => category.categoryLabel || category.categoryValue)
    .join('、')
}

function ownerNames(task) {
  return (task.owners || [])
    .map(owner => owner.nickName || owner.userName || owner.userId)
    .join('、')
}

async function loadTasks() {
  if (!canViewProjectTasks.value) return
  loading.value = true
  notFound.value = false
  loadError.value = false
  try {
    const response = await listProjectTasks(route.params.projectId, queryParams)
    tasks.value = response.rows || []
    total.value = response.total || 0
  } catch (error) {
    tasks.value = []
    total.value = 0
    if (error.response?.status === 404) {
      notFound.value = true
    } else {
      loadError.value = true
    }
  } finally {
    loading.value = false
  }
}

watch(() => route.params.projectId, () => {
  queryParams.pageNum = 1
  loadTasks()
})
onMounted(loadTasks)
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
</style>
