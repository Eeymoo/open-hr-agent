# 选择 Node.js 最新 LTS (22.x) 基础镜像
FROM node:22

# 维护者信息
LABEL maintainer="opencode-agent"

# 安装依赖：Git、GitHub CLI 和构建工具（某些 npm 包可能需要）
RUN apt-get update && \
    apt-get install -y git curl python3 make g++ && \
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && \
    apt-get install -y gh && \
    rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /home/workspace

# 全局安装 opencode-ai
RUN npm install -g opencode-ai

# 创建 .config 目录和目标目录，建立软链接
RUN mkdir -p ~/.config /opencode && rm -rf ~/.config/opencode && ln -s /opencode ~/.config/opencode

# 定义运行时环境变量（仓库地址）
ENV GITHUB_REPO_URL=
ENV SSH_PRIVATE_KEY=
ENV SSH_PUBLIC_KEY=

# 暴露端口
EXPOSE 4096

# 设置环境变量
ENV PORT=4096
ENV NODE_ENV=production
ENV OPENCODE_SERVER_PASSWORD=

# 启动命令
CMD ["/bin/sh", "-c", "git config --global user.name 'HR-Agent' && \
         git config --global user.email 'hra@xmail.fun' && \
         if [ -n \"$SSH_PRIVATE_KEY\" ] && [ -n \"$SSH_PUBLIC_KEY\" ]; then \
             mkdir -p ~/.ssh && chmod 700 ~/.ssh && \
             echo \"$SSH_PRIVATE_KEY\" > ~/.ssh/id_ed25519 && \
             echo \"$SSH_PUBLIC_KEY\" > ~/.ssh/id_ed25519.pub && \
             chmod 600 ~/.ssh/id_ed25519 && \
             chmod 644 ~/.ssh/id_ed25519.pub && \
             gh auth login --hostname github.com --git-protocol ssh --no-browser --ssh-key ~/.ssh/id_ed25519 || true; \
         fi && \
         if [ -d /home/workspace/repo ]; then \
             cd /home/workspace/repo && opencode web --hostname 0.0.0.0 --port ${PORT} --password ${OPENCODE_SERVER_PASSWORD}; \
         elif [ -n \"${GITHUB_REPO_URL}\" ]; then \
             git clone ${GITHUB_REPO_URL} repo && cd /home/workspace/repo && opencode web --hostname 0.0.0.0 --port ${PORT} --password ${OPENCODE_SERVER_PASSWORD}; \
         else \
             opencode web --hostname 0.0.0.0 --port ${PORT} --password ${OPENCODE_SERVER_PASSWORD}; \
         fi"]
