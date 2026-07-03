import type { NextRequest } from "next/server";

import { noContent, ok } from "@/lib/api-response";
import { withAuthedRoute } from "@/middlewares/compose";
import { updateCollaboratorSchema } from "@/schemas/document.schema";
import { collaboratorService } from "@/services/collaborator.service";
import { parseWithSchema, readJsonBody } from "@/validators/validate-request";
import { z } from "zod";

const paramsSchema = z.object({ id: z.string().min(1), userId: z.string().min(1) });

export const PATCH = withAuthedRoute<{ id: string; userId: string }>(
  async (request: NextRequest, { user, params }) => {
    const { id, userId } = parseWithSchema(paramsSchema, params);
    const body = await readJsonBody(request);
    const input = parseWithSchema(updateCollaboratorSchema, body);
    const collaborator = await collaboratorService.update(user.id, id, userId, input);
    return ok({ collaborator });
  },
);

export const DELETE = withAuthedRoute<{ id: string; userId: string }>(
  async (_request, { user, params }) => {
    const { id, userId } = parseWithSchema(paramsSchema, params);
    await collaboratorService.remove(user.id, id, userId);
    return noContent();
  },
);
