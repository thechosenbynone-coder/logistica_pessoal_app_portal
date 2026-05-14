import { FinanceService } from '../services/finance.service.js';

export class FinanceController {
  constructor(service = new FinanceService()) {
    this.service = service;
  }
}
