import Docker from 'dockerode';

const docker = new Docker();

export async function deleteContainer(name: string, force: boolean = false): Promise<void> {
  const container = docker.getContainer(`ca-${name}`);

  try {
    await container.remove({ force, v: true });
  } catch (error) {
    throw new Error(`Failed to delete container: ${(error as Error).message}`);
  }
}
