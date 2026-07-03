import type { NextRequest } from "next/server";

import { noContent, ok } from "@/lib/api-response";
import { withAuthedRoute } from "@/middlewares/compose";
import { documentIdParamSchema, updateDocumentSchema } from "@/schemas/document.schema";
import { documentService } from "@/services/document.service";
import { parseWithSchema, readJsonBody } from "@/validators/validate-request";

export const GET = withAuthedRoute<{ id: string }>(async (_request, { user, params }) => {
  const { id } = parseWithSchema(documentIdParamSchema, params);
  const document = await documentService.get(user.id, id);
  return ok({ document });
});

export const PATCH = withAuthedRoute<{ id: string }>(
  async (request: NextRequest, { user, params }) => {
    const { id } = parseWithSchema(documentIdParamSchema, params);
    const body = await readJsonBody(request);
    const input = parseWithSchema(updateDocumentSchema, body);
    const document = await documentService.update(user.id, id, input);
    return ok({ document });
  },
);

export const DELETE = withAuthedRoute<{ id: string }>(
  async (_request, { user, params }) => {
    const { id } = parseWithSchema(documentIdParamSchema, params);
    await documentService.remove(user.id, id);
    return noContent();
  },
);
