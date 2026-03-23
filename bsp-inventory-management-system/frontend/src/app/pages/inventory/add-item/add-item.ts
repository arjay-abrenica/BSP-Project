import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-add-item',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-item.html',
  styleUrls: ['./add-item.css']
})
export class AddItem {
  addItemForm: FormGroup;
  isSubmitting = false;
  batchItems: any[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.addItemForm = this.fb.group({
      item_code: ['', Validators.required],
      item_name: ['', Validators.required],
      category_id: ['', Validators.required],
      unit_of_measure: ['', Validators.required],
      description: [''],
      supplier_name: [''],
      unit_price: [0, Validators.min(0)],
      quantity: [0, Validators.min(0)],
      reorder_level: [10, Validators.min(0)],
      delivery_receipt: [''],
      delivery_number: ['']
    });
  }

  addToBatch(): void {
    if (this.addItemForm.valid) {
      this.batchItems.push(this.addItemForm.value);
      this.onClear();
    } else {
      this.addItemForm.markAllAsTouched();
    }
  }

  removeFromBatch(index: number): void {
    this.batchItems.splice(index, 1);
  }

  submitBatch(): void {
    if (this.addItemForm.valid) {
      this.batchItems.push(this.addItemForm.value);
      this.onClear();
    }

    if (this.batchItems.length === 0) {
      alert('Please add at least one item to the list.');
      return;
    }

    this.isSubmitting = true;
    
    this.http.post('http://localhost:5000/api/items', this.batchItems).subscribe({
      next: (res) => {
        console.log('Items added successfully', res);
        this.isSubmitting = false;
        alert(`${this.batchItems.length} item(s) added successfully!`);
        this.batchItems = [];
        this.router.navigate(['/inventory/catalog']);
      },
      error: (err) => {
        console.error('Error adding items', err);
        this.isSubmitting = false;
        alert('Failed to add items. Please try again.');
      }
    });
  }

  onClear(): void {
    this.addItemForm.reset({
      unit_price: 0,
      quantity: 0,
      reorder_level: 10
    });
  }
}
