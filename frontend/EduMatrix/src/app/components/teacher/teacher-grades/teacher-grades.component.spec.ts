import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeacherGradesComponent } from './teacher-grades.component';

describe('TeacherGradesComponent', () => {
  let component: TeacherGradesComponent;
  let fixture: ComponentFixture<TeacherGradesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherGradesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeacherGradesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
