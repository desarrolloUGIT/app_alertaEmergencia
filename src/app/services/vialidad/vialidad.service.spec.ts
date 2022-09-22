import { TestBed } from '@angular/core/testing';

import { VialidadService } from './vialidad.service';

describe('VialidadService', () => {
  let service: VialidadService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VialidadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
