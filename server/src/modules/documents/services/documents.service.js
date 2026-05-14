import { DocumentsRepository } from '../repositories/documents.repository.js';

export class DocumentsService {
  constructor(repository = new DocumentsRepository()) {
    this.repository = repository;
  }
}
