<template>
  <div class="app-container">
    <el-result v-if="notFound" icon="warning" title="项目不存在或无权访问">
      <template #extra>
        <el-button type="primary" @click="backToProject">返回项目详情</el-button>
      </template>
    </el-result>
    <el-result v-else-if="loadError" icon="error" title="创建需求页面加载失败">
      <template #extra>
        <el-button @click="loadOptions">重试</el-button>
        <el-button type="primary" @click="backToProject">返回项目详情</el-button>
      </template>
    </el-result>
    <el-skeleton v-else-if="loading" :rows="8" animated />
    <template v-else>
      <div class="page-heading">
        <el-button link icon="ArrowLeft" @click="backToRequirements">项目需求</el-button>
        <h2>创建需求</h2>
      </div>
      <el-alert
        v-if="!statuses.length"
        title="当前没有可用的需求状态，请先维护需求状态字典。"
        type="warning"
        show-icon
        :closable="false"
        class="mb8"
      />
      <el-alert v-if="submitError" :title="submitError" type="error" show-icon :closable="false" class="mb8" />
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" class="requirement-form">
        <el-form-item label="需求标题" prop="title">
          <el-input
            v-model="form.title"
            maxlength="255"
            show-word-limit
            placeholder="请输入需求标题"
          />
        </el-form-item>
        <el-form-item label="需求状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择需求状态" clearable style="width: 320px">
            <el-option v-for="item in statuses" :key="item.dictValue" :label="item.dictLabel" :value="item.dictValue" />
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
        <el-form-item label="需求正文" prop="content">
          <Editor v-model="form.content" :min-height="280" type="base64" />
        </el-form-item>
      </el-form>
      <div class="form-actions">
        <el-button type="primary" :loading="submitting" :disabled="!statuses.length" @click="submit">保存</el-button>
        <el-button :disabled="submitting" @click="backToRequirements">取消</el-button>
      </div>
    </template>
  </div>
</template>

<script setup name="ProjectRequirementCreate">
import { createProjectRequirement, listProjectMembers, listProjectRequirementStatuses } from '@/api/project'
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
const members = ref([])
const statuses = ref([])
const form = reactive({
  title: '',
  content: '',
  status: '',
  ownerIds: []
})
const rules = {
  title: [{ required: true, validator: validateTitle, trigger: 'blur' }],
  status: [{ required: true, message: '请选择需求状态', trigger: 'change' }],
  ownerIds: [{ required: true, type: 'array', min: 1, message: '请至少选择一名负责人', trigger: 'change' }],
  content: [{ required: true, validator: validateContent, trigger: 'change' }]
}
const canViewRequirements = computed(() => userStore.permissions?.includes('*:*:*')
  || userStore.permissions?.includes('project:requirement:list'))

function validateTitle(_rule, value, callback) {
  if (typeof value !== 'string' || !value.trim()) {
    callback(new Error('需求标题不能为空'))
    return
  }
  callback()
}

function validateContent(_rule, value, callback) {
  const text = String(value || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim()
  if (!text) {
    callback(new Error('需求正文不能为空'))
    return
  }
  callback()
}

function memberDisplayName(member) {
  const name = member.nickName || member.userName || member.userId
  return member.email ? `${name}（${member.email}）` : String(name)
}

function backToProject() {
  router.push(`/project/detail/${route.params.projectId}`)
}

function backToRequirements() {
  if (canViewRequirements.value) {
    router.push(`/project/requirements/${route.params.projectId}`)
  } else {
    backToProject()
  }
}

async function loadOptions() {
  loading.value = true
  notFound.value = false
  loadError.value = false
  try {
    const [memberResponse, statusResponse] = await Promise.all([
      listProjectMembers(route.params.projectId),
      listProjectRequirementStatuses(route.params.projectId)
    ])
    members.value = memberResponse.data || []
    statuses.value = statusResponse.data || []
  } catch (error) {
    members.value = []
    statuses.value = []
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
      await createProjectRequirement(route.params.projectId, {
        title: form.title.trim(),
        content: form.content,
        status: form.status,
        ownerIds: form.ownerIds
      })
      proxy.$modal.msgSuccess('需求创建成功')
      backToRequirements()
    } catch (error) {
      submitError.value = error?.message || error?.response?.data?.msg || '需求创建失败，请检查填写内容和项目权限。'
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

.requirement-form {
  max-width: 960px;
}

.form-actions {
  margin-left: 90px;
}
</style>
