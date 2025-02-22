import { type Request, type Response, type NextFunction } from "express";
import { type ZodSchema } from "zod";
import { fromZodError } from "zod-validation-error";

export function validateRequest(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({
          message: fromZodError(error).message
        });
      }
      return res.status(400).json({ message: "Invalid request body" });
    }
  };
}
