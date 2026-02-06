# 选择 Node.js 最新 LTS (22.x) Alpine 基础镜像
FROM node:22-alpine

# 维护者信息
LABEL maintainer="opencode-agent"

# 安装依赖：Git 和构建工具（某些 npm 包可能需要）
RUN apk add --no-cache git python3 make g++

# 设置工作目录
WORKDIR /home/workspace

# 全局安装 opencode-ai
RUN npm install -g opencode-ai

# 创建 .config 目录并建立软链接
RUN mkdir -p ~/.config && ln -s /opencode ~/.config/opencode

# 定义构建参数（构建时传入仓库地址）
ARG GITHUB_REPO_URL
# 克隆仓库到 repo 目录
RUN if [ -n "$GITHUB_REPO_URL" ]; then \
        git clone $GITHUB_REPO_URL repo; \
    else \
        echo "提示：未传入 GITHUB_REPO_URL，运行时需要挂载代码目录"; \
    fi

# 暴露端口
EXPOSE 4096

# 设置环境变量
ENV PORT=4096
ENV NODE_ENV=production

# 启动命令
CMD ["/bin/sh", "-c", "if [ -d /home/workspace/repo ]; then \
        cd /home/workspace/repo && opencode web --port ${PORT}; \
    else \
        echo '错误：repo 目录不存在，请挂载代码目录或传入 GITHUB_REPO_URL 构建'; \
        exit 1; \
    fi"]
