import type { Request, Response } from 'express';
import { z } from 'zod';
import { answer } from '../services/knowledge.service.js';
import { recommend } from '../services/assistant.service.js';
import { approvedActions } from '../services/actions.service.js';
export function actions(req: Request, res: Response) {
  res.json(approvedActions(req.actor));
}
export async function ask(req: Request, res: Response) {
  const input = z
    .object({
      question: z.string().trim().min(3).max(1000),
      category: z.string().max(40).optional(),
      documentType: z.enum(['POLICY', 'MANUAL', 'PROCEDURE']).optional(),
      history: z
        .array(
          z
            .object({
              role: z.enum(['user', 'assistant']),
              content: z.string().trim().min(1).max(4000),
            })
            .strict(),
        )
        .max(8)
        .default([]),
    })
    .strict()
    .parse(req.body);
  res.json(
    await answer(req.actor, input.question, input.category, input.documentType, input.history),
  );
}
export async function recommendations(req: Request, res: Response) {
  res.json(await recommend(req.actor, req.body));
}
