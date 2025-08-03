import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NaoEncontradosComponent } from './nao-encontrados.component';

describe('NaoEncontradosComponent', () => {
  let component: NaoEncontradosComponent;
  let fixture: ComponentFixture<NaoEncontradosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NaoEncontradosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NaoEncontradosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
