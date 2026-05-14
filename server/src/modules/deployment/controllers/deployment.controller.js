import { DeploymentService } from '../services/deployment.service.js';

export class DeploymentController {
  constructor(service = new DeploymentService()) {
    this.service = service;
  }
}
