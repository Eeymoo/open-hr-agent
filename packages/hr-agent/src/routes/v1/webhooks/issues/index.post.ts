import type { Request, Response } from 'express';
import { receiveWebhook } from '../../../../utils/webhookHandler.js';

const HTTP = {
  BAD_REQUEST: 400,
  OK: 200,
  INTERNAL_SERVER_ERROR: 500
};

/**
 * POST /v1/webhooks/issues - 处理 GitHub Issues Webhook 路由
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 */
export default async function issuesWebhook(req: Request, res: Response): Promise<void> {
  console.log('=== Issues Webhook Received ===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Event:', req.headers['x-github-event']);

  try {
    const result = await receiveWebhook(req.headers as Record<string, string>, req.body);

    if (!result.success) {
      console.error('Webhook processing failed:', result.error);
      res.status(HTTP.BAD_REQUEST).json({ error: result.error });
      return;
    }

    res.status(HTTP.OK).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Issues webhook error:', error);
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
