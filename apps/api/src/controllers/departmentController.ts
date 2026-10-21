import { Request, Response, NextFunction } from 'express';
import { departmentService } from '../services/departmentService.js';

export class DepartmentController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dept = await departmentService.createDepartment(req.body);
      res.status(201).json({ success: true, data: dept });
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const institutionId = req.query.institutionId as string;
      if (!institutionId) {
        res.status(400).json({ success: false, message: 'institutionId query param required' });
        return;
      }
      const search = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 50;

      const result = await departmentService.getDepartments(institutionId, { search, page, pageSize });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dept = await departmentService.updateDepartment(req.params.id as string, req.body);
      res.json({ success: true, data: dept });
    } catch (err) {
      next(err);
    }
  }

  async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await departmentService.deleteDepartment(req.params.id as string);
      res.json({ success: true, message: 'Department deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const departmentController = new DepartmentController();
