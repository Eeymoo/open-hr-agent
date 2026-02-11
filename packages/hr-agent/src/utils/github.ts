import { Octokit } from 'octokit';
import { getGitHubToken, getGitHubOwner, getGitHubRepo } from './secretManager.js';

/**
 * GitHub API 客户端
 */
export class GitHubClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor() {
    const token = getGitHubToken();
    this.octokit = new Octokit({ auth: token });
    this.owner = getGitHubOwner();
    this.repo = getGitHubRepo();
  }

  /**
   * 创建 Pull Request
   * @param title - PR 标题
   * @param body - PR 内容
   * @param head - 分支名称
   * @param base - 目标分支
   * @param issueNumber - 关联的 Issue 编号
   * @returns PR 信息
   */
  async createPullRequest(
    title: string,
    body: string,
    head: string,
    base: string,
    issueNumber: number
  ): Promise<{ number: number; htmlUrl: string }> {
    try {
      const response = await this.octokit.rest.pulls.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body,
        head,
        base,
        issue: issueNumber
      });

      return {
        number: response.data.number,
        htmlUrl: response.data.html_url
      };
    } catch (error) {
      throw new Error(
        `Failed to create PR: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 在 Issue 上创建评论
   * @param issueNumber - Issue 编号
   * @param body - 评论内容
   * @returns 评论信息
   */
  async createIssueComment(issueNumber: number, body: string): Promise<{ id: number }> {
    try {
      const response = await this.octokit.rest.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body
      });

      return {
        id: response.data.id
      };
    } catch (error) {
      throw new Error(
        `Failed to create comment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 在 PR 上创建评论
   * @param prNumber - PR 编号
   * @param body - 评论内容
   * @returns 评论信息
   */
  async createPRComment(prNumber: number, body: string): Promise<{ id: number }> {
    try {
      const response = await this.octokit.rest.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
        body
      });

      return {
        id: response.data.id
      };
    } catch (error) {
      throw new Error(
        `Failed to create PR comment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 获取 Pull Request 信息
   * @param prNumber - PR 编号
   * @returns PR 信息
   */
  async getPullRequest(prNumber: number): Promise<{
    number: number;
    state: string;
    merged: boolean;
    htmlUrl: string;
  }> {
    try {
      const response = await this.octokit.rest.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber
      });

      return {
        number: response.data.number,
        state: response.data.state,
        merged: response.data.merged ?? false,
        htmlUrl: response.data.html_url
      };
    } catch (error) {
      throw new Error(
        `Failed to get PR: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 获取 Issue 信息
   * @param issueNumber - Issue 编号
   * @returns Issue 信息
   */
  async getIssue(issueNumber: number): Promise<{
    number: number;
    title: string;
    body: string | null;
    state: string;
    htmlUrl: string;
  }> {
    try {
      const response = await this.octokit.rest.issues.get({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber
      });

      return {
        number: response.data.number,
        title: response.data.title,
        body: response.data.body ?? null,
        state: response.data.state,
        htmlUrl: response.data.html_url
      };
    } catch (error) {
      throw new Error(
        `Failed to get issue: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * 创建 GitHub 客户端实例
 * @returns GitHub 客户端实例
 */
export function createGitHubClient(): GitHubClient {
  return new GitHubClient();
}
