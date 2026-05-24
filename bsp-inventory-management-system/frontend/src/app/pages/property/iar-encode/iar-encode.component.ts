import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-iar-encode',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './iar-encode.component.html',
  styleUrls: ['./iar-encode.component.scss']
})
export class IarEncodeComponent {
  iarNo: string = 'BSP-IAR-2026-0090';
  supplierName: string = '';
  invoiceNo: string = '';
  invoiceDate: string = '';
  receivedDate: string = '';
  inspectionDate: string = '';
  inspectedBy: string = 'Jerry Property';
  acceptedBy: string = 'Sir Jerry';

  // Item rows to encode
  items: any[] = [
    { name: '', description: '', quantity: 1, unit: 'Unit', unit_cost: 0, serial_no: '', or_number: '' }
  ];

  constructor() { }

  addItemRow() {
    this.items.push({ name: '', description: '', quantity: 1, unit: 'Unit', unit_cost: 0, serial_no: '', or_number: '' });
  }

  removeItemRow(index: number) {
    if (this.items.length > 1) {
      this.items.splice(index, 1);
    }
  }

  onSubmit() {
    alert('Mock implementation: Form Submitted Successfully!');
  }
}
