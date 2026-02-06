# 选择 Node.js 最新 LTS (22.x) 基础镜像
FROM node:22

# 维护者信息
LABEL maintainer="opencode-agent"

# 安装依赖：Git 和构建工具（某些 npm 包可能需要）
RUN apt-get update && apt-get install -y git python3 make g++ && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /home/workspace

# 全局安装 opencode-ai
RUN npm install -g opencode-ai

# 创建 .config 目录和目标目录，建立软链接
RUN mkdir -p ~/.config /opencode && rm -rf ~/.config/opencode && ln -s /opencode ~/.config/opencode

# 定义运行时环境变量（仓库地址）
ENV GITHUB_REPO_URL=

# 暴露端口
EXPOSE 4096

# 设置环境变量
ENV PORT=4096
ENV NODE_ENV=production

# 启动命令
CMD ["/bin/sh", "-c", "if [ -d /home/workspace/repo ]; then \
        cd /home/workspace/repo && opencode web --port ${PORT}; \
    elif [ -n \"${GITHUB_REPO_URL}\" ]; then \
        git clone ${GITHUB_REPO_URL} repo && cd /home/workspace/repo && opencode web --port ${PORT}; \
    else \
        opencode web --port ${PORT}; \
    fi"]
