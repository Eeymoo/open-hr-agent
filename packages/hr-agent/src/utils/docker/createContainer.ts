import Docker from 'dockerode';
import { DOCKER_CONFIG } from '../../config/docker.js';

const docker = new Docker();

export async function createContainer(name: string): Promise<string> {
  const port = DOCKER_CONFIG.BASE_PORT + Math.floor(Math.random() * (65535 - DOCKER_CONFIG.BASE_PORT));

  const container = await docker.createContainer({
    name: `ca-${name}`,
    Image: DOCKER_CONFIG.IMAGE,
    Env: [`PORT=${DOCKER_CONFIG.PORT}`],
    HostConfig: {
      PortBindings: {
        [`${DOCKER_CONFIG.PORT}/tcp`]: [{ HostPort: port.toString() }]
      },
      NetworkMode: DOCKER_CONFIG.NETWORK
    }
  });

  await container.start();
  return container.id;
}
