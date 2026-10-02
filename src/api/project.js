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

export function getProject(projectId) {
  return request({
    url: '/project/' + projectId,
    method: 'get',
    silentErrorStatus: [404]
  })
}
