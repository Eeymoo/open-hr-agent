import Docker from 'dockerode';

const docker = new Docker();

export async function restartContainer(name: string): Promise<void> {
  const container = docker.getContainer(`ca-${name}`);
  await container.restart();
}

export async function updateContainer(
  name: string,
  config: Record<string, unknown>
): Promise<void> {
  const container = docker.getContainer(`ca-${name}`);
  await container.update(config);
}
