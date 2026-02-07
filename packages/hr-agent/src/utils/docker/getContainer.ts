import Docker from 'dockerode';

const docker = new Docker();

export async function getContainerByName(name: string) {
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
