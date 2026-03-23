import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PropertyOverview } from './property-overview';

describe('PropertyOverview', () => {
  let component: PropertyOverview;
  let fixture: ComponentFixture<PropertyOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PropertyOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PropertyOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
