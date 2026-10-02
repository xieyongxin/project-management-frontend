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
