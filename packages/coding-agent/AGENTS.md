# AGENTS.md - Coding Agent Package Guidelines

## Package Overview

Coding Agent (ca) - Docker container wrapper for opencode-ai CLI. Provides isolated environment for AI-powered code editing and repository management.

## Environment

- Container Runtime: Docker
- Base Image: node:22 (LTS)
- CLI Tool: opencode-ai (global)
- Additional Tools: Git, GitHub CLI (gh), Python 3, build tools
- SSH Support: Ed25519 keys for GitHub auth
- Port: 4096 (web server)

## Primary Commands

### Docker Operations
- Build image: `docker build -t coding-agent .` (from project root)
- Run container: `docker run -p 4096:4096 coding-agent`
- Interactive shell: `docker run -it coding-agent /bin/sh`

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

### Development Workflow
1. Modify Dockerfile or entrypoint.sh
2. Rebuild: `docker build -t coding-agent .`
3. Test container locally
4. Push to registry
5. Update orchestrator (hr-agent) to use new image

## Container Architecture

### Entrypoint Script
- Location: scripts/entrypoint.sh
- Configures git: user.name "HR-Agent", user.email "hra@xmail.fun"
- Sets up SSH keys if provided (SSH_PRIVATE_KEY, SSH_PUBLIC_KEY)
- Authenticates GitHub CLI with SSH key
- Falls back gracefully if auth fails

### Startup Behavior
Priority order for repository mounting:
1. Mounted volume at `/home/workspace/repo` (highest priority)
2. Clone from `GITHUB_REPO_URL` if set
3. Empty workspace (runs opencode web without repo)

### Environment Variables
- `GITHUB_REPO_URL` - Git repository to clone
- `SSH_PRIVATE_KEY` - Ed25519 private key for SSH auth
- `SSH_PUBLIC_KEY` - Ed25519 public key for SSH auth
- `OPENCODE_SERVER_PASSWORD` - Password for web UI
- `PORT` - Server port (default: 4096)
- `NODE_ENV` - Environment (default: production)
- `HOSTNAME` - Binding address (default: 0.0.0.0)

## File Structure

```
packages/coding-agent/
├── Dockerfile           # Container image definition
├── package.json         # Minimal package metadata
├── .dockerignore        # Files to exclude from build
├── scripts/
│   ├── entrypoint.sh    # Container startup script
│   └── README.md        # Script documentation
└── AGENTS.md           # This file
```

## Configuration Guidelines

### Git Configuration
- Git is pre-configured as "HR-Agent <hra@xmail.fun>"
- SSH keys should be Ed25519 format (recommended)
- Git protocol: SSH preferred for private repos

### OpenCode Server
- Runs with `--hostname 0.0.0.0` for external access
- Password-protected via `OPENCODE_SERVER_PASSWORD`
- Exposes opencode web interface on port 4096

### SSH Key Management
- Private key: `~/.ssh/id_ed25519` (mode 600)
- Public key: `~/.ssh/id_ed25519.pub` (mode 644)
- Used for both git operations and gh auth

## Best Practices

- Always inject secrets via environment variables
- Use SSH protocol for GitHub operations (more secure)
- Mount repo volume for persistent development
- Set appropriate resource limits in orchestrator
- Log container output for debugging
- Rotate SSH keys regularly
- Use unique passwords for each deployment

## Security Considerations

- Never commit SSH keys to repository
- Pass credentials via environment variables only
- Use read-only mounts when possible
- Limit container capabilities in production
- Rotate passwords periodically
- Use HTTPS/TLS for web interface in production

## Integration with HR Agent

The HR Agent (hra) orchestrates coding-agent containers:
- Spawns containers dynamically for coding tasks
- Provides repository URL and SSH credentials
- Mounts task-specific volumes
- Monitors container lifecycle
- Terminates containers after task completion

## Troubleshooting

### Container won't start
- Check Docker daemon is running
- Verify port 4096 is not in use
- Review container logs: `docker logs <container>`

### GitHub auth fails
- Verify SSH keys are valid Ed25519 format
- Check SSH_PRIVATE_KEY includes newline at end
- Ensure SSH key has repo permissions on GitHub

### Cannot clone repository
- Verify GITHUB_REPO_URL format: `git@github.com:owner/repo.git`
- Check SSH key has access to repository
- Test SSH connection manually inside container
