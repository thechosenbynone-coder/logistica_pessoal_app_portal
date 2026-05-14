import { DeploymentRepository } from '../repositories/deployment.repository.js';

export class DeploymentService {
  constructor(repository = new DeploymentRepository()) {
    this.repository = repository;
  }
}
