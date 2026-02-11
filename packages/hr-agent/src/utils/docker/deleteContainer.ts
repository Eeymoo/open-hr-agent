import Docker from 'dockerode';

const docker = new Docker();

/**
 * 删除 Docker 容器
 * @param id - 容器 ID 或容器名称
 * @param force - 是否强制删除，默认为 false
 * @throws 删除失败时抛出错误
 */
export async function deleteContainer(id: string, force: boolean = false): Promise<void> {
  const container = docker.getContainer(id);

  try {
    await container.remove({ force, v: true });
  } catch (error) {
    throw new Error(`Failed to delete container: ${(error as Error).message}`);
  }
}
