import type { NextRequest } from "next/server";

import { created, ok } from "@/lib/api-response";
import { withAuthedRoute } from "@/middlewares/compose";
import { addCollaboratorSchema, documentIdParamSchema } from "@/schemas/document.schema";
import { collaboratorService } from "@/services/collaborator.service";
import { parseWithSchema, readJsonBody } from "@/validators/validate-request";

export const GET = withAuthedRoute<{ id: string }>(async (_request, { user, params }) => {
  const { id } = parseWithSchema(documentIdParamSchema, params);
  const collaborators = await collaboratorService.list(user.id, id);
  return ok({ collaborators });
});

export const POST = withAuthedRoute<{ id: string }>(
  async (request: NextRequest, { user, params }) => {
    const { id } = parseWithSchema(documentIdParamSchema, params);
    const body = await readJsonBody(request);
    const input = parseWithSchema(addCollaboratorSchema, body);
    const collaborator = await collaboratorService.add(user.id, id, input);
    return created({ collaborator });
  },
);
