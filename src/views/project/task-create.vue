<template>
  <div class="app-container">
    <el-result v-if="!canCreateTask" icon="warning" title="暂无项目任务创建权限">
      <template #extra>
        <el-button type="primary" @click="backToProject">返回项目详情</el-button>
      </template>
    </el-result>
    <el-result v-else-if="notFound" icon="warning" title="项目不存在或无权访问">
      <template #extra>
        <el-button type="primary" @click="backToProject">返回项目详情</el-button>
      </template>
    </el-result>
    <el-result v-else-if="loadError" icon="error" title="创建任务页面加载失败">
      <template #extra>
        <el-button @click="loadOptions">重试</el-button>
        <el-button type="primary" @click="backToProject">返回项目详情</el-button>
      </template>
    </el-result>
    <el-skeleton v-else-if="loading" :rows="10" animated />
    <template v-else>
      <div class="page-heading">
        <el-button link icon="ArrowLeft" @click="backToTasks">项目任务</el-button>
        <h2>创建任务</h2>
      </div>
      <el-alert
        v-if="!requirements.length"
        title="当前没有可关联的需求，请先创建未删除的需求。"
        type="warning"
        show-icon
        :closable="false"
        class="mb8"
      />
      <el-alert
        v-if="!statuses.length || !categories.length"
        title="当前没有完整的任务状态或分类选项，请先维护全局字典。"
        type="warning"
        show-icon
        :closable="false"
        class="mb8"
      />
      <el-alert v-if="submitError" :title="submitError" type="error" show-icon :closable="false" class="mb8" />
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" class="task-form">
        <el-form-item label="所属需求" prop="requirementId">
          <el-select v-model="form.requirementId" filterable placeholder="请选择所属需求" style="width: min(100%, 640px)">
            <el-option
              v-for="requirement in requirements"
              :key="requirement.requirementId"
              :label="requirementLabel(requirement)"
              :value="requirement.requirementId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="任务标题" prop="title">
          <el-input v-model="form.title" maxlength="255" show-word-limit placeholder="请输入任务标题" />
        </el-form-item>
        <el-form-item label="任务状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择任务状态" clearable style="width: 320px">
            <el-option v-for="item in statuses" :key="item.dictValue" :label="item.dictLabel" :value="item.dictValue" />
          </el-select>
        </el-form-item>
        <el-form-item label="任务分类" prop="categoryValues">
          <el-select
            v-model="form.categoryValues"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            placeholder="请选择至少一个任务分类"
            style="width: min(100%, 560px)"
          >
            <el-option v-for="item in categories" :key="item.dictValue" :label="item.dictLabel" :value="item.dictValue" />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人" prop="ownerIds">
          <el-select
            v-model="form.ownerIds"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            placeholder="请选择至少一名负责人"
            style="width: min(100%, 560px)"
          >
            <el-option
              v-for="member in members"
              :key="member.userId"
              :label="memberDisplayName(member)"
              :value="member.userId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="任务说明" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="8"
            maxlength="5000"
            show-word-limit
            placeholder="请输入任务说明"
          />
        </el-form-item>
      </el-form>
      <div class="form-actions">
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="!requirements.length || !statuses.length || !categories.length"
          @click="submit"
        >保存</el-button>
        <el-button :disabled="submitting" @click="backToTasks">取消</el-button>
      </div>
    </template>
  </div>
</template>

<script setup name="ProjectTaskCreate">
import { createProjectTask, listProjectMembers, listProjectTaskOptions } from '@/api/project'
import useUserStore from '@/store/modules/user'

const route = useRoute()
const router = useRouter()
const { proxy } = getCurrentInstance()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)
const submitting = ref(false)
const notFound = ref(false)
const loadError = ref(false)
const submitError = ref('')
const statuses = ref([])
const categories = ref([])
const requirements = ref([])
const members = ref([])
const form = reactive({
  requirementId: null,
  title: '',
  description: '',
  status: '',
  categoryValues: [],
  ownerIds: []
})
const rules = {
  requirementId: [{ required: true, message: '请选择所属需求', trigger: 'change' }],
  title: [{ required: true, validator: validateTitle, trigger: 'blur' }],
  description: [{ required: true, validator: validateDescription, trigger: 'blur' }],
  status: [{ required: true, message: '请选择任务状态', trigger: 'change' }],
  categoryValues: [{ required: true, type: 'array', min: 1, message: '请至少选择一个任务分类', trigger: 'change' }],
  ownerIds: [{ required: true, type: 'array', min: 1, message: '请至少选择一名负责人', trigger: 'change' }]
}
const canCreateTask = computed(() => userStore.permissions?.includes('*:*:*')
  || userStore.permissions?.includes('project:task:add')
  || userStore.permissions?.includes('project:agent:split'))
const canViewTasks = computed(() => userStore.permissions?.includes('*:*:*')
  || userStore.permissions?.includes('project:task:list'))

function validateTitle(_rule, value, callback) {
  if (typeof value !== 'string' || !value.trim()) {
    callback(new Error('任务标题不能为空'))
    return
  }
  callback()
}

function validateDescription(_rule, value, callback) {
  if (typeof value !== 'string' || !value.trim()) {
    callback(new Error('任务说明不能为空'))
    return
  }
  callback()
}

function requirementLabel(requirement) {
  const version = requirement.currentVersionNo ? ` / v${requirement.currentVersionNo}` : ''
  return `#${requirement.requirementId} ${requirement.title || ''}${version}`
}

function memberDisplayName(member) {
  const name = member.nickName || member.userName || member.userId
  return member.email ? `${name}（${member.email}）` : String(name)
}

function backToProject() {
  router.push(`/project/detail/${route.params.projectId}`)
}

function backToTasks() {
  if (canViewTasks.value) {
    router.push(`/project/tasks/${route.params.projectId}`)
  } else {
    backToProject()
  }
}

async function loadOptions() {
  loading.value = true
  notFound.value = false
  loadError.value = false
  try {
    const [optionResponse, memberResponse] = await Promise.all([
      listProjectTaskOptions(route.params.projectId),
      listProjectMembers(route.params.projectId)
    ])
    statuses.value = optionResponse.data?.statuses || []
    categories.value = optionResponse.data?.categories || []
    requirements.value = optionResponse.data?.requirements || []
    members.value = memberResponse.data || []
  } catch (error) {
    statuses.value = []
    categories.value = []
    requirements.value = []
    members.value = []
    if (error.response?.status === 404) {
      notFound.value = true
    } else {
      loadError.value = true
    }
  } finally {
    loading.value = false
  }
}

function submit() {
  formRef.value?.validate(async valid => {
    if (!valid || submitting.value) return
    submitting.value = true
    submitError.value = ''
    try {
      await createProjectTask(route.params.projectId, {
        requirementId: form.requirementId,
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        categoryValues: form.categoryValues,
        ownerIds: form.ownerIds
      })
      proxy.$modal.msgSuccess('任务创建成功')
      backToTasks()
    } catch (error) {
      submitError.value = error?.response?.data?.msg || error?.message || '任务创建失败，请检查填写内容和项目权限。'
    } finally {
      submitting.value = false
    }
  })
}

watch(() => route.params.projectId, () => {
  formRef.value?.resetFields()
  loadOptions()
})
onMounted(loadOptions)
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

.task-form {
  max-width: 960px;
}

.form-actions {
  margin-left: 90px;
}
</style>
