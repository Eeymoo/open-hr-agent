import type { Request, Response } from 'express';

export default function pullRequestsWebhook(req: Request, res: Response): void {
  const webhookData = req.body;
  const event = req.headers['x-github-event'] as string;

  console.log('=== GitHub Pull Requests Webhook Received ===');
  console.log(`Event Type: ${event}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('Full Payload:', JSON.stringify(webhookData, null, 2));

  if (event === 'pull_request' || event === 'pull_request_review') {
    const { action } = webhookData;
    const pr = webhookData.pull_request;
    const { repository } = webhookData;

    console.log(`=== Pull Request ${action} ===`);
    console.log(`Repository: ${repository.full_name}`);
    console.log(`PR #${pr.number}: ${pr.title}`);
    console.log(`Author: ${pr.user.login}`);
    console.log(`URL: ${pr.html_url}`);
    console.log(`State: ${pr.state}`);
    console.log(`Merged: ${pr.merged ? 'Yes' : 'No'}`);
    console.log(
      `Labels: ${pr.labels.map((label: { name: string }) => label.name).join(', ') || 'None'}`
    );
  }

  res.json({ received: true, event });
}
