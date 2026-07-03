import type { NextRequest } from "next/server";

import { created, ok } from "@/lib/api-response";
import { withAuthedRoute } from "@/middlewares/compose";
import { createVersionSchema, documentIdParamSchema } from "@/schemas/document.schema";
import { versionService } from "@/services/version.service";
import { parseWithSchema, readJsonBody } from "@/validators/validate-request";

export const GET = withAuthedRoute<{ id: string }>(async (_request, { user, params }) => {
  const { id } = parseWithSchema(documentIdParamSchema, params);
  const versions = await versionService.list(user.id, id);
  return ok({ versions });
});

export const POST = withAuthedRoute<{ id: string }>(
  async (request: NextRequest, { user, params }) => {
    const { id } = parseWithSchema(documentIdParamSchema, params);
    const body = await readJsonBody(request);
    const input = parseWithSchema(createVersionSchema, body);
    const version = await versionService.createSnapshot(user.id, id, input, false);
    return created({ version });
  },
);
