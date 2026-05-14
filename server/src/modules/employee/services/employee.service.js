import { EmployeeRepository } from '../repositories/employee.repository.js';

export class EmployeeService {
  constructor(repository = new EmployeeRepository()) {
    this.repository = repository;
  }
}
