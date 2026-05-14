import { EpiService } from '../services/epi.service.js';

export class EpiController {
  constructor(service = new EpiService()) {
    this.service = service;
  }
}
