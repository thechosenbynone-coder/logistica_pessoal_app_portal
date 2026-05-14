import { EpiRepository } from '../repositories/epi.repository.js';

export class EpiService {
  constructor(repository = new EpiRepository()) {
    this.repository = repository;
  }
}
