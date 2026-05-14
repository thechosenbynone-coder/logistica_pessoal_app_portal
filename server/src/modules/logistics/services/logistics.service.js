import { LogisticsRepository } from '../repositories/logistics.repository.js';

export class LogisticsService {
  constructor(repository = new LogisticsRepository()) {
    this.repository = repository;
  }
}
