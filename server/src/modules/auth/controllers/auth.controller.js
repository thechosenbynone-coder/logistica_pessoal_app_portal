import { AuthService } from '../services/auth.service.js';

export class AuthController {
  constructor(service = new AuthService()) {
    this.service = service;
  }
}
