import Docker from 'dockerode';

const docker = new Docker();

/**
 * 容器信息接口
 */
export interface ContainerInfo {
  /** 容器 ID */
  id: string;
  /** 容器名称 */
  name: string;
  /** 容器状态 */
  status: string;
  /** 是否运行中 */
  state: boolean;
  /** 创建时间 */
  created: string;
}

/**
 * 根据名称获取容器信息
 * @param name - 容器名称
 * @returns 容器信息，不存在则返回 null
 */
export async function getContainerByName(name: string): Promise<ContainerInfo | null> {
  try {
    const container = docker.getContainer(name);
    const info = await container.inspect();
    return {
      id: info.Id,
      name: info.Name.replace('/', ''),
      status: info.State.Status,
      state: info.State.Running,
      created: info.Created
    };
  } catch {
    return null;
  }
}
