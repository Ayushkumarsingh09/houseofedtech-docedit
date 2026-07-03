import { ok } from "@/lib/api-response";
import { withAuthedRoute } from "@/middlewares/compose";
import { versionService } from "@/services/version.service";
import { parseWithSchema } from "@/validators/validate-request";
import { z } from "zod";

const paramsSchema = z.object({ id: z.string().min(1), versionId: z.string().min(1) });

export const POST = withAuthedRoute<{ id: string; versionId: string }>(
  async (_request, { user, params }) => {
    const { id, versionId } = parseWithSchema(paramsSchema, params);
    const version = await versionService.restore(user.id, id, versionId);
    return ok({ version });
  },
);
