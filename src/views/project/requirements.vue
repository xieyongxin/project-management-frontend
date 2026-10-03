<template>
  <div class="app-container">
    <el-result v-if="notFound" icon="warning" title="项目不存在或无权访问">
      <template #extra>
        <el-button type="primary" @click="backToProject">返回项目详情</el-button>
      </template>
    </el-result>
    <el-skeleton v-else-if="loading" :rows="5" animated />
    <el-result v-else-if="loadError" icon="error" title="需求列表加载失败">
      <template #extra>
        <el-button @click="loadRequirements">重试</el-button>
        <el-button type="primary" @click="backToProject">返回项目详情</el-button>
      </template>
    </el-result>
    <template v-else>
      <div class="page-heading">
        <el-button link icon="ArrowLeft" @click="backToProject">项目详情</el-button>
        <div class="page-heading-row">
          <h2>项目需求</h2>
          <el-button v-if="canCreateRequirement" type="primary" @click="openCreate">新建需求</el-button>
        </div>
      </div>
      <el-alert
        v-if="!requirements.length && total === 0"
        title="当前项目暂无需求"
        type="info"
        show-icon
        :closable="false"
        class="mb8"
      />
      <el-table v-loading="loading" :data="requirements">
        <el-table-column label="需求编号" prop="requirementId" width="110" />
        <el-table-column label="标题" prop="title" min-width="240" show-overflow-tooltip>
          <template #default="scope">
            <el-link type="primary" @click="openDetail(scope.row)">{{ scope.row.title }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="120">
          <template #default="scope">
            {{ scope.row.statusLabel || scope.row.status || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="当前版本" prop="currentVersionNo" width="110">
          <template #default="scope">v{{ scope.row.currentVersionNo || '—' }}</template>
        </el-table-column>
        <el-table-column label="负责人" min-width="220" show-overflow-tooltip>
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
        @pagination="loadRequirements"
      />
    </template>
  </div>
</template>

<script setup name="ProjectRequirements">
import { listProjectRequirements } from '@/api/project'
import useUserStore from '@/store/modules/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const notFound = ref(false)
const loadError = ref(false)
const requirements = ref([])
const total = ref(0)
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10
})
const canCreateRequirement = computed(() => userStore.permissions?.includes('*:*:*')
  || userStore.permissions?.includes('project:requirement:add'))

function backToProject() {
  router.push(`/project/detail/${route.params.projectId}`)
}

function openCreate() {
  router.push(`/project/requirements/${route.params.projectId}/create`)
}

function openDetail(requirement) {
  router.push(`/project/requirements/${route.params.projectId}/${requirement.requirementId}`)
}

function ownerNames(requirement) {
  return (requirement.owners || [])
    .map(owner => owner.nickName || owner.userName || owner.userId)
    .join('、')
}

async function loadRequirements() {
  loading.value = true
  notFound.value = false
  loadError.value = false
  try {
    const response = await listProjectRequirements(route.params.projectId, queryParams)
    requirements.value = response.rows || []
    total.value = response.total || 0
  } catch (error) {
    requirements.value = []
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
  loadRequirements()
})
onMounted(loadRequirements)
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

.page-heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
