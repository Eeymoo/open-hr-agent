import type { Request, Response } from 'express';

export default function issuesWebhook(req: Request, res: Response): void {
  const webhookData = req.body;
  const event = req.headers['x-github-event'] as string;

  console.log('=== GitHub Issues Webhook Received ===');
  console.log(`Event Type: ${event}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('Full Payload:', JSON.stringify(webhookData, null, 2));

  if (event === 'issues' || event === 'issue_comment') {
    const { action } = webhookData;
    const { issue } = webhookData;
    const { repository } = webhookData;

    console.log(`=== Issue ${action} ===`);
    console.log(`Repository: ${repository.full_name}`);
    console.log(`Issue #${issue.number}: ${issue.title}`);
    console.log(`Author: ${issue.user.login}`);
    console.log(`URL: ${issue.html_url}`);
    console.log(`State: ${issue.state}`);
    console.log(
      `Labels: ${issue.labels.map((label: { name: string }) => label.name).join(', ') || 'None'}`
    );
  }

  res.json({ received: true, event });
}
