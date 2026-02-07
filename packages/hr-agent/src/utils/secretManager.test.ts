import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSecret, getDockerCASecret, getGitHubWebhookSecret } from './secretManager.js';

describe('getSecret', () => {
  beforeEach(() => {
    delete process.env.HRA_SECRET;
    delete process.env.DOCKER_CA_SECRET;
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  afterEach(() => {
    delete process.env.HRA_SECRET;
    delete process.env.DOCKER_CA_SECRET;
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  it('should return empty string when no secrets are set', () => {
    expect(getSecret('DOCKER_CA_SECRET')).toBe('hr-agent-secret');
    expect(getSecret('GITHUB_WEBHOOK_SECRET')).toBe('hr-agent-secret');
    expect(getSecret('HRA_SECRET')).toBe('hr-agent-secret');
  });

  it('should return global HRA_SECRET when specific secret is not set', () => {
    process.env.HRA_SECRET = 'global-secret';
    expect(getSecret('DOCKER_CA_SECRET')).toBe('global-secret');
    expect(getSecret('GITHUB_WEBHOOK_SECRET')).toBe('global-secret');
    expect(getSecret('CUSTOM_SECRET')).toBe('global-secret');
  });

  it('should return specific secret when it is set', () => {
    process.env.HRA_SECRET = 'global-secret';
    process.env.DOCKER_CA_SECRET = 'docker-secret';
    expect(getSecret('DOCKER_CA_SECRET')).toBe('docker-secret');
  });

  it('should prioritize specific secret over global secret', () => {
    process.env.HRA_SECRET = 'global-secret';
    process.env.DOCKER_CA_SECRET = 'docker-secret';
    process.env.GITHUB_WEBHOOK_SECRET = 'github-secret';
    expect(getSecret('DOCKER_CA_SECRET')).toBe('docker-secret');
    expect(getSecret('GITHUB_WEBHOOK_SECRET')).toBe('github-secret');
  });

  it('should return global secret when specific secret is empty string', () => {
    process.env.HRA_SECRET = 'global-secret';
    process.env.DOCKER_CA_SECRET = '';
    expect(getSecret('DOCKER_CA_SECRET')).toBe('global-secret');
  });

  it('should return HRA_SECRET when requested directly', () => {
    process.env.HRA_SECRET = 'global-secret';
    expect(getSecret('HRA_SECRET')).toBe('global-secret');
  });
});

describe('getDockerCASecret', () => {
  beforeEach(() => {
    delete process.env.HRA_SECRET;
    delete process.env.DOCKER_CA_SECRET;
  });

  afterEach(() => {
    delete process.env.HRA_SECRET;
    delete process.env.DOCKER_CA_SECRET;
  });

  it('should return empty string when no secrets are set', () => {
    expect(getDockerCASecret()).toBe('hr-agent-secret');
  });

  it('should return global HRA_SECRET when DOCKER_CA_SECRET is not set', () => {
    process.env.HRA_SECRET = 'global-secret';
    expect(getDockerCASecret()).toBe('global-secret');
  });

  it('should return DOCKER_CA_SECRET when it is set', () => {
    process.env.HRA_SECRET = 'global-secret';
    process.env.DOCKER_CA_SECRET = 'docker-secret';
    expect(getDockerCASecret()).toBe('docker-secret');
  });
});

describe('getGitHubWebhookSecret', () => {
  beforeEach(() => {
    delete process.env.HRA_SECRET;
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  afterEach(() => {
    delete process.env.HRA_SECRET;
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  it('should return empty string when no secrets are set', () => {
    expect(getGitHubWebhookSecret()).toBe('hr-agent-secret');
  });

  it('should return global HRA_SECRET when GITHUB_WEBHOOK_SECRET is not set', () => {
    process.env.HRA_SECRET = 'global-secret';
    expect(getGitHubWebhookSecret()).toBe('global-secret');
  });

  it('should return GITHUB_WEBHOOK_SECRET when it is set', () => {
    process.env.HRA_SECRET = 'global-secret';
    process.env.GITHUB_WEBHOOK_SECRET = 'github-secret';
    expect(getGitHubWebhookSecret()).toBe('github-secret');
  });
});
