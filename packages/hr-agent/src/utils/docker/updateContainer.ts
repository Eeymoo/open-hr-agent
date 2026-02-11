import Docker from 'dockerode';

const docker = new Docker();

/**
 * 重启 Docker 容器
 * @param name - 容器名称
 */
export async function restartContainer(name: string): Promise<void> {
  const container = docker.getContainer(name);
  await container.restart();
}

/**
 * 更新 Docker 容器配置
 * @param name - 容器名称
 * @param config - 容器配置
 */
export async function updateContainer(
  name: string,
  config: Record<string, unknown>
): Promise<void> {
  const container = docker.getContainer(name);
  await container.update(config);
}
