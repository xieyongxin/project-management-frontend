import request from '@/utils/request'

export function listProjects(query) {
  return request({
    url: '/project/list',
    method: 'get',
    params: query
  })
}

export function createProject(data) {
  return request({
    url: '/project',
    method: 'post',
    data
  })
}

export function updateProjectName(projectId, data) {
  return request({
    url: '/project/' + projectId,
    method: 'put',
    data,
    silentErrorStatus: [400, 403, 404, 409]
  })
}

export function updateProjectStatus(projectId, data) {
  return request({
    url: '/project/' + projectId + '/status',
    method: 'put',
    data,
    silentErrorStatus: [400, 403, 404]
  })
}

export function getProject(projectId) {
  return request({
    url: '/project/' + projectId,
    method: 'get',
    silentErrorStatus: [404]
  })
}

export function listProjectMembers(projectId) {
  return request({
    url: '/project/' + projectId + '/members',
    method: 'get',
    silentErrorStatus: [404]
  })
}

export function listProjectMemberRoles(projectId) {
  return request({
    url: '/project/' + projectId + '/members/roles',
    method: 'get',
    silentErrorStatus: [403, 404]
  })
}

export function updateProjectMemberRole(projectId, userId, data) {
  return request({
    url: '/project/' + projectId + '/members/' + userId + '/role',
    method: 'put',
    data,
    silentErrorStatus: [403, 404]
  })
}

export function updateProjectMemberAdmin(projectId, userId, data) {
  return request({
    url: '/project/' + projectId + '/members/' + userId + '/admin',
    method: 'put',
    data,
    silentErrorStatus: [400, 403, 404]
  })
}

export function removeProjectMember(projectId, userId) {
  return request({
    url: '/project/' + projectId + '/members/' + userId,
    method: 'delete',
    silentErrorStatus: [400, 403, 404]
  })
}

export function listProjectOperationLogs(projectId, query) {
  return request({
    url: '/project/' + projectId + '/logs',
    method: 'get',
    params: query,
    silentErrorStatus: [403, 404]
  })
}

export function listProjectRequirements(projectId, query) {
  return request({
    url: '/project/' + projectId + '/requirements',
    method: 'get',
    params: query,
    silentErrorStatus: [403, 404]
  })
}

export function listProjectRequirementStatuses(projectId) {
  return request({
    url: '/project/' + projectId + '/requirements/statuses',
    method: 'get',
    silentErrorStatus: [403, 404]
  })
}

export function createProjectRequirement(projectId, data) {
  return request({
    url: '/project/' + projectId + '/requirements',
    method: 'post',
    data,
    silentErrorStatus: [400, 403, 404]
  })
}

export function getProjectRequirement(projectId, requirementId) {
  return request({
    url: '/project/' + projectId + '/requirements/' + requirementId,
    method: 'get',
    silentErrorStatus: [404]
  })
}

export function listProjectRequirementVersions(projectId, requirementId) {
  return request({
    url: '/project/' + projectId + '/requirements/' + requirementId + '/versions',
    method: 'get',
    silentErrorStatus: [404]
  })
}

export function compareProjectRequirementVersions(projectId, requirementId, leftVersionId, rightVersionId) {
  return request({
    url: '/project/' + projectId + '/requirements/' + requirementId + '/versions/compare',
    method: 'get',
    params: { leftVersionId, rightVersionId },
    silentErrorStatus: [400, 404]
  })
}

export function updateProjectRequirementStatus(projectId, requirementId, data) {
  return request({
    url: '/project/' + projectId + '/requirements/' + requirementId + '/status',
    method: 'put',
    data,
    silentErrorStatus: [400, 403, 404]
  })
}

export function updateProjectRequirementContent(projectId, requirementId, data) {
  return request({
    url: '/project/' + projectId + '/requirements/' + requirementId + '/content',
    method: 'put',
    data,
    silentErrorStatus: [400, 403, 404]
  })
}

export function deleteProjectRequirement(projectId, requirementId) {
  return request({
    url: '/project/' + projectId + '/requirements/' + requirementId,
    method: 'delete',
    silentErrorStatus: [400, 403, 404]
  })
}

export function uploadProjectRequirementAttachments(projectId, requirementId, files) {
  const data = new FormData()
  files.forEach(file => data.append('files', file))
  return request({
    url: '/project/' + projectId + '/requirements/' + requirementId + '/attachments',
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' },
    silentErrorStatus: [400, 403, 404]
  })
}

export function getProjectRequirementAttachmentUrl(projectId, requirementId, attachmentId, versionId) {
  const query = versionId ? `?versionId=${encodeURIComponent(versionId)}` : ''
  return `${import.meta.env.VITE_APP_BASE_API}/project/${projectId}/requirements/${requirementId}/attachments/${attachmentId}${query}`
}

export function listProjectTaskOptions(projectId) {
  return request({
    url: '/project/' + projectId + '/tasks/options',
    method: 'get',
    silentErrorStatus: [403, 404]
  })
}

export function createProjectTask(projectId, data) {
  return request({
    url: '/project/' + projectId + '/tasks',
    method: 'post',
    data,
    silentErrorStatus: [400, 403, 404]
  })
}

export function listProjectTasks(projectId, query) {
  return request({
    url: '/project/' + projectId + '/tasks',
    method: 'get',
    params: query,
    silentErrorStatus: [403, 404]
  })
}

export function getProjectTask(projectId, taskId) {
  return request({
    url: '/project/' + projectId + '/tasks/' + taskId,
    method: 'get',
    silentErrorStatus: [404]
  })
}

export function listProjectTaskVersions(projectId, taskId) {
  return request({
    url: '/project/' + projectId + '/tasks/' + taskId + '/versions',
    method: 'get',
    silentErrorStatus: [404]
  })
}

export function compareProjectTaskVersions(projectId, taskId, leftVersionId, rightVersionId) {
  return request({
    url: '/project/' + projectId + '/tasks/' + taskId + '/versions/compare',
    method: 'get',
    params: { leftVersionId, rightVersionId },
    silentErrorStatus: [400, 404]
  })
}

export function updateProjectTaskStatus(projectId, taskId, data) {
  return request({
    url: '/project/' + projectId + '/tasks/' + taskId + '/status',
    method: 'put',
    data,
    silentErrorStatus: [400, 403, 404]
  })
}

export function updateProjectTaskLatestVersion(projectId, taskId, data) {
  return request({
    url: '/project/' + projectId + '/tasks/' + taskId + '/latest-version',
    method: 'put',
    data,
    silentErrorStatus: [400, 403, 404]
  })
}

export function deleteProjectTask(projectId, taskId) {
  return request({
    url: '/project/' + projectId + '/tasks/' + taskId,
    method: 'delete',
    silentErrorStatus: [400, 403, 404]
  })
}
