import type { Request, Response } from 'express';
import { receiveWebhook } from '../../../utils/webhookHandler.js';

export default async function pullRequestsWebhook(req: Request, res: Response): Promise<void> {
  console.log('=== Pull Requests Webhook Received ===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Event:', req.headers['x-github-event']);

  try {
    const result = await receiveWebhook(req.headers as Record<string, string>, req.body);

    if (!result.success) {
      console.error('Webhook processing failed:', result.error);
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Pull requests webhook error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
