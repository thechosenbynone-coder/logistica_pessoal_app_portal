import { EmployeeService } from '../services/employee.service.js';

export class EmployeeController {
  constructor(service = new EmployeeService()) {
    this.service = service;
  }
}
