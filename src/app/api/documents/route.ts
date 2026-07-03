import type { NextRequest } from "next/server";

import { created, ok } from "@/lib/api-response";
import { withAuthedRoute } from "@/middlewares/compose";
import { createDocumentSchema } from "@/schemas/document.schema";
import { documentService } from "@/services/document.service";
import { parseWithSchema, readJsonBody } from "@/validators/validate-request";

export const GET = withAuthedRoute(async (_request, { user }) => {
  const documents = await documentService.list(user.id);
  return ok({ documents });
});

export const POST = withAuthedRoute(async (request: NextRequest, { user }) => {
  const body = await readJsonBody(request);
  const input = parseWithSchema(createDocumentSchema, body);
  const document = await documentService.create(user.id, input);
  return created({ document });
});
