import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  console.error('[Error]', err);

  const statusCode = err.statusCode || (err.message?.includes('not found') ? 404 : 400);

  // Check for duplicate key conflict in MongoDB
  if (err.code === 11000) {
    res.status(409).json({
      success: false,
      message: 'Duplicate key conflict: A record or assignment with these unique constraints already exists.'
    });
    return;
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error'
  });
}
