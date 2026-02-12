# AGENTS.md - Coding Agent Package Guidelines

## Package Overview

Coding Agent (ca) - Docker container wrapper for opencode-ai CLI. Provides isolated environment for AI-powered code editing and repository management.

## Environment

- Container Runtime: Docker
- Base Image: node:22 (LTS)
- CLI Tool: opencode-ai (global)
- Additional Tools: Git, GitHub CLI (gh), Python 3
- SSH Support: Ed25519 keys for GitHub auth
- Port: 4096 (web server)

## Primary Commands

### Docker Operations
```bash
docker build -t coding-agent .              # Build image
docker run -p 4096:4096 coding-agent        # Run container
docker run -it coding-agent /bin/sh         # Interactive shell
docker logs <container>                     # View logs
```

### With Environment Variables
```bash
docker run -d \
  -p 4096:4096 \
  -e GITHUB_REPO_URL=git@github.com:owner/repo.git \
  -e SSH_PRIVATE_KEY="$(cat ~/.ssh/id_ed25519)" \
  -e SSH_PUBLIC_KEY="$(cat ~/.ssh/id_ed25519.pub)" \
  -e OPENCODE_SERVER_PASSWORD=yourpassword \
  coding-agent
```

## Container Architecture

### Entrypoint Script
- Location: `scripts/entrypoint.sh`
- Configures git: user.name "HR-Agent", user.email "hra@xmail.fun"
- Sets up SSH keys if provided
- Authenticates GitHub CLI with SSH key

### Startup Priority
1. Mounted volume at `/home/workspace/repo`
2. Clone from `GITHUB_REPO_URL` if set
3. Empty workspace (runs opencode web without repo)

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_REPO_URL` | Git repository to clone | - |
| `SSH_PRIVATE_KEY` | Ed25519 private key | - |
| `SSH_PUBLIC_KEY` | Ed25519 public key | - |
| `OPENCODE_SERVER_PASSWORD` | Web UI password | - |
| `PORT` | Server port | 4096 |
| `NODE_ENV` | Environment | production |
| `HOSTNAME` | Binding address | 0.0.0.0 |

## File Structure

```
packages/coding-agent/
├── Dockerfile           # Container image
├── package.json         # Package metadata
├── .dockerignore        # Build exclusions
└── scripts/
    └── entrypoint.sh    # Startup script
```

## Git Configuration

- Pre-configured as "HR-Agent <hra@xmail.fun>"
- SSH keys should be Ed25519 format
- SSH protocol preferred for private repos

## OpenCode Server

- Runs with `--hostname 0.0.0.0`
- Password-protected via `OPENCODE_SERVER_PASSWORD`
- Web interface on port 4096

## SSH Key Management

- Private key: `~/.ssh/id_ed25519` (mode 600)
- Public key: `~/.ssh/id_ed25519.pub` (mode 644)
- Used for git operations and gh auth

## Integration with HR Agent

HR Agent (hra) orchestrates coding-agent containers:
- Spawns containers dynamically for tasks
- Provides repo URL and SSH credentials
- Mounts task-specific volumes
- Monitors container lifecycle
- Terminates containers after completion

## Best Practices

- Inject secrets via environment variables only
- Use SSH protocol for GitHub operations
- Mount repo volume for persistent development
- Set appropriate resource limits
- Log container output for debugging
- Rotate SSH keys and passwords regularly

## Security

- Never commit SSH keys to repository
- Pass credentials via environment only
- Use read-only mounts when possible
- Limit container capabilities in production
- Use HTTPS/TLS for web interface in production

## Troubleshooting

### Container won't start
- Check Docker daemon is running
- Verify port 4096 is not in use
- Review logs: `docker logs <container>`

### GitHub auth fails
- Verify SSH keys are valid Ed25519 format
- Check SSH_PRIVATE_KEY includes trailing newline
- Ensure SSH key has repo permissions on GitHub

### Cannot clone repository
- Verify `GITHUB_REPO_URL` format: `git@github.com:owner/repo.git`
- Check SSH key has access to repository
