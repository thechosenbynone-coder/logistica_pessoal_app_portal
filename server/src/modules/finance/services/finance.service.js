import { FinanceRepository } from '../repositories/finance.repository.js';

export class FinanceService {
  constructor(repository = new FinanceRepository()) {
    this.repository = repository;
  }
}
