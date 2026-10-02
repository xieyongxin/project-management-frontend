<template>
  <div class="app-container">
    <el-form ref="queryRef" :model="queryParams" :inline="true" @submit.prevent>
      <el-form-item label="项目名称" prop="projectName">
        <el-input
          v-model="queryParams.projectName"
          placeholder="请输入项目名称"
          clearable
          style="width: 240px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" v-hasPermi="['project:create']" @click="openCreate">
          新建项目
        </el-button>
      </el-col>
    </el-row>

    <el-table v-loading="loading" :data="projectList">
      <el-table-column label="项目名称" min-width="220" prop="projectName">
        <template #default="scope">
          <el-link type="primary" :underline="false" @click="openProject(scope.row.projectId)">
            {{ scope.row.projectName }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column label="项目编号" prop="projectId" width="130" />
      <el-table-column label="创建时间" prop="createTime" width="190">
        <template #default="scope">
          {{ parseTime(scope.row.createTime) }}
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total > 0"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      :total="total"
      @pagination="getList"
    />

    <el-dialog v-model="createOpen" title="新建项目" width="460px" append-to-body>
      <el-form ref="createRef" :model="createForm" :rules="rules" label-width="90px">
        <el-form-item label="项目名称" prop="projectName">
          <el-input
            v-model="createForm.projectName"
            placeholder="请输入项目名称"
            maxlength="255"
            show-word-limit
            @keyup.enter="submitCreate"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" :loading="creating" @click="submitCreate">确 定</el-button>
        <el-button @click="createOpen = false">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="ProjectList">
import { createProject, listProjects } from '@/api/project'

const { proxy } = getCurrentInstance()
const router = useRouter()

const loading = ref(false)
const creating = ref(false)
const createOpen = ref(false)
const projectList = ref([])
const total = ref(0)
const queryRef = ref()
const createRef = ref()
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  projectName: undefined
})
const createForm = reactive({ projectName: '' })
const rules = {
  projectName: [{ required: true, validator: validateProjectName, trigger: 'blur' }]
}

function validateProjectName(_rule, value, callback) {
  if (typeof value !== 'string' || !value.trim()) {
    callback(new Error('项目名称不能为空'))
    return
  }
  callback()
}

function getList() {
  loading.value = true
  listProjects(queryParams)
    .then(response => {
      projectList.value = response.rows || []
      total.value = response.total || 0
    })
    .catch(() => {})
    .finally(() => {
      loading.value = false
    })
}

function handleQuery() {
  queryParams.pageNum = 1
  getList()
}

function resetQuery() {
  queryRef.value?.resetFields()
  queryParams.pageNum = 1
  getList()
}

function openCreate() {
  createForm.projectName = ''
  createOpen.value = true
  nextTick(() => createRef.value?.clearValidate())
}

function submitCreate() {
  createRef.value?.validate(async valid => {
    if (!valid || creating.value) return
    creating.value = true
    try {
      await createProject({ projectName: createForm.projectName.trim() })
      proxy.$modal.msgSuccess('创建成功')
      createOpen.value = false
      handleQuery()
    } catch {
    } finally {
      creating.value = false
    }
  })
}

function openProject(projectId) {
  router.push(`/project/detail/${projectId}`)
}

getList()
</script>
