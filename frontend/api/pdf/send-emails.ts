import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendEmailsHandler } from "./generate.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return sendEmailsHandler(req, res);
}
