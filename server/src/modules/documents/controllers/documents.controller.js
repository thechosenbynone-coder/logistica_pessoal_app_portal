import { DocumentsService } from '../services/documents.service.js';

export class DocumentsController {
  constructor(service = new DocumentsService()) {
    this.service = service;
  }
}
