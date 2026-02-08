import Docker from 'dockerode';
import { DOCKER_CONFIG } from '../../config/docker.js';

const docker = new Docker();
const MAX_PORT = 65535;

export async function createContainer(name: string, repoUrl?: string): Promise<string> {
  console.log('=== Creating CA Docker Container ===');
  console.log(`Container Name: ${name}`);
  console.log(`Image: ${DOCKER_CONFIG.IMAGE}`);
  console.log(`Port Mapping: ${DOCKER_CONFIG.PORT} -> host port (dynamically allocated)`);
  console.log(`Network: ${DOCKER_CONFIG.NETWORK}`);
  if (repoUrl) {
    console.log(`Repository URL: ${repoUrl}`);
  }
  if (repoUrl) {
    console.log(`Repository URL: ${repoUrl}`);
  }

  const port =
    DOCKER_CONFIG.BASE_PORT + Math.floor(Math.random() * (MAX_PORT - DOCKER_CONFIG.BASE_PORT));

  console.log(`Allocated Host Port: ${port}`);

  try {
    console.log('Creating Docker container...');
    const envVars = [
      `PORT=${DOCKER_CONFIG.PORT}`,
      `OPENCODE_SERVER_PASSWORD=${DOCKER_CONFIG.SECRET}`
    ];
    if (repoUrl) {
      envVars.push(`REPO_URL=${repoUrl}`);
    }

    const container = await docker.createContainer({
      name,
      Image: DOCKER_CONFIG.IMAGE,
      Env: envVars,
      HostConfig: {
        PortBindings: {
          [`${DOCKER_CONFIG.PORT}/tcp`]: [{ HostPort: port.toString() }]
        },
        NetworkMode: DOCKER_CONFIG.NETWORK
      }
    });

    console.log(`Container created successfully with ID: ${container.id}`);
    console.log('Starting container...');

    await container.start();

    console.log('=== CA Docker Container Created Successfully ===');
    console.log(`Container ID: ${container.id}`);
    console.log(`Container Name: ${name}`);
    console.log(`Host Port: ${port}`);
    console.log(`Container Port: ${DOCKER_CONFIG.PORT}`);
    console.log(`Network: ${DOCKER_CONFIG.NETWORK}`);

    return container.id;
  } catch (error) {
    console.error('=== Failed to Create CA Docker Container ===');
    console.error('Error:', error);
    throw error;
  }
}
