import Docker from 'dockerode';

const docker = new Docker();

interface ContainerInfo {
  id: string;
  name: string;
  status: string;
  state: boolean;
  created: string;
}

export async function getContainerByName(name: string): Promise<ContainerInfo> {
  const container = docker.getContainer(`ca-${name}`);
  const info = await container.inspect();
  return {
    id: info.Id,
    name: info.Name.replace('/', ''),
    status: info.State.Status,
    state: info.State.Running,
    created: info.Created
  };
}
