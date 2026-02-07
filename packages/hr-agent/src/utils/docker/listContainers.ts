import Docker from 'dockerode';

const docker = new Docker();

export interface ContainerInfo {
  id: string;
  names: string[];
  status: string;
  state: string;
}

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
