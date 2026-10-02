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
    </template>
  </div>
</template>

<script setup name="ProjectDetail">
import { getProject } from '@/api/project'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const notFound = ref(false)
const loadError = ref(false)
const project = ref(null)

function backToList() {
  router.push('/project/index')
}

async function loadProject() {
  loading.value = true
  notFound.value = false
  loadError.value = false
  project.value = null
  try {
    const response = await getProject(route.params.projectId)
    project.value = response.data
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
</style>
