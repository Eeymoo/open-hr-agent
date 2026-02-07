import type { Request, Response } from 'express';

export default function pullRequestsWebhook(req: Request, res: Response): void {
  console.log('=== Pull Requests Webhook Received ===');
  console.log('Event:', req.headers['x-github-event']);

  res.status(200).json({ message: 'Pull requests webhook received' });
}
