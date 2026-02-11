import Docker from 'dockerode';

const docker = new Docker();

/**
 * 容器列表信息接口
 */
export interface ContainerInfo {
  /** 容器 ID */
  id: string;
  /** 容器名称列表 */
  names: string[];
  /** 容器状态 */
  status: string;
  /** 容器状态值 */
  state: string;
}

/**
 * 列出所有 CA (Coding Agent) 容器
 * @returns CA 容器信息列表
 */
export async function listContainers(): Promise<ContainerInfo[]> {
  const containers = await docker.listContainers({ all: true });

  return containers
    .filter((container) => container.Names.some((name) => name.startsWith('/ca-')))
    .map((container) => ({
      id: container.Id,
      names: container.Names,
      status: container.Status,
      state: container.State
    }));
}
