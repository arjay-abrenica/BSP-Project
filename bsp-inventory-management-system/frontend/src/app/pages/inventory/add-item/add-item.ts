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
  existingItems: any[] = [];
  filteredSuggestions: any[] = [];
  showSuggestions = false;

  // Modal State
  showModal: boolean = false;
  intakeSummaryData: any = null;
  intakeGrandTotal: number = 0;

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
      delivery_number: [''],
      image: [null]
    });

    this.fetchExistingItems();
  }

  fetchExistingItems(): void {
    this.http.get<any[]>('http://localhost:5000/api/items').subscribe({
      next: (data) => {
        this.existingItems = data;
      },
      error: (err) => {
        console.error('Failed to fetch existing items', err);
      }
    });
  }

  onItemNameInput(event: any): void {
    const query = event.target.value.toLowerCase();
    if (query.length > 0) {
      this.filteredSuggestions = this.existingItems.filter(item => 
        item.item_name.toLowerCase().includes(query)
      ).slice(0, 5); // Limit to 5 suggestions
      this.showSuggestions = this.filteredSuggestions.length > 0;
    } else {
      this.showSuggestions = false;
    }
  }

  selectSuggestion(item: any): void {
    this.addItemForm.patchValue({
      item_code: item.item_code,
      item_name: item.item_name,
      category_id: item.category_id,
      unit_of_measure: item.unit_of_measure,
      description: item.description,
      reorder_level: item.reorder_level
    });
    this.showSuggestions = false;
  }

  hideSuggestions(): void {
    // Delay hiding to allow click event on suggestion to fire
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
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

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.addItemForm.patchValue({ image: file });
    }
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
    
    // Support single item with image via FormData, or batch via JSON
    if (this.batchItems.length === 1) {
      const item = this.batchItems[0];
      const formData = new FormData();
      Object.keys(item).forEach(key => {
        if (key === 'image' && item[key]) {
          formData.append('image', item[key]);
        } else if (item[key] !== null && item[key] !== undefined) {
          formData.append(key, item[key]);
        }
      });

      this.http.post<any>('http://localhost:5000/api/items', formData).subscribe({
        next: (res) => this.handleSuccess([res]),
        error: (err) => this.handleError(err)
      });
    } else {
      this.http.post<any[]>('http://localhost:5000/api/items', this.batchItems).subscribe({
        next: (res) => this.handleSuccess(res),
        error: (err) => this.handleError(err)
      });
    }
  }

  private handleSuccess(res: any[]): void {
    this.isSubmitting = false;
    if (res && res.length > 0) {
      const firstItemId = res[0].item_id;
      this.http.get<any>(`http://localhost:5000/api/items/${firstItemId}/latest-intake`).subscribe({
        next: (data) => {
          this.intakeSummaryData = data;
          this.intakeGrandTotal = data.items.reduce((sum: number, i: any) => sum + Number(i.totalCost), 0);
          this.showModal = true;
          this.batchItems = [];
        },
        error: (err) => {
          console.error('Failed to fetch intake summary', err);
          alert(`${res.length} item(s) added successfully!`);
          this.batchItems = [];
          this.router.navigate(['/inventory/catalog']);
        }
      });
    } else {
      alert('Item(s) added successfully!');
      this.batchItems = [];
      this.router.navigate(['/inventory/catalog']);
    }
  }

  private handleError(err: any): void {
    console.error('Error adding items', err);
    this.isSubmitting = false;
    alert('Failed to add items. Please try again.');
  }

  closeModal(): void {
    this.showModal = false;
    this.intakeSummaryData = null;
    this.intakeGrandTotal = 0;
    this.router.navigate(['/inventory/catalog']);
  }

  onClear(): void {
    this.addItemForm.reset({
      unit_price: 0,
      quantity: 0,
      reorder_level: 10
    });
  }
}
