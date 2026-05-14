import { AuthRepository } from '../repositories/auth.repository.js';

export class AuthService {
  constructor(repository = new AuthRepository()) {
    this.repository = repository;
  }
}
