import { LogisticsService } from '../services/logistics.service.js';

export class LogisticsController {
  constructor(service = new LogisticsService()) {
    this.service = service;
  }
}
