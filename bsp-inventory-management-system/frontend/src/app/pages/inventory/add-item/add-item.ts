import { Component, OnInit } from '@angular/core';
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
export class AddItem implements OnInit {
  addItemForm: FormGroup;
  isSubmitting = false;
  batchItems: any[] = [];
  existingItems: any[] = [];
  existingSuppliers: any[] = [];
  filteredSuggestions: any[] = [];
  filteredSuppliers: any[] = [];
  showSuggestions = false;
  showSupplierSuggestions = false;
  baseNextSkuId: number = 0;

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
      item_code: [''],
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
    this.fetchSuppliers();
  }

  ngOnInit(): void {
    this.fetchNextSku();
  }

  fetchNextSku(): void {
    this.http.get<{nextSku: string}>('http://localhost:5000/api/items/next-sku').subscribe({
      next: (res) => {
        const idPart = parseInt(res.nextSku.replace('ITM-', ''), 10);
        this.baseNextSkuId = idPart;
        this.updateSkuDisplay();
      },
      error: (err) => console.error('Failed to fetch next SKU', err)
    });
  }

  updateSkuDisplay(): void {
    if (this.baseNextSkuId > 0) {
      const nextId = this.baseNextSkuId + this.batchItems.length;
      const skuStr = 'ITM-' + String(nextId).padStart(6, '0');
      this.addItemForm.patchValue({ item_code: skuStr });
    }
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

  fetchSuppliers(): void {
    this.http.get<any[]>('http://localhost:5000/api/suppliers').subscribe({
      next: (data) => {
        // Ensure data is mapped to simple strings for the datalist
        this.existingSuppliers = data.map(s => s.supplier_name);
      },
      error: (err) => {
        console.error('Failed to fetch suppliers', err);
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

  onSupplierInput(event: any): void {
    const query = event.target.value.toLowerCase();
    this.filterSuppliers(query);
  }

  onSupplierFocus(event: any): void {
    const query = event.target.value.toLowerCase();
    this.filterSuppliers(query);
  }

  private filterSuppliers(query: string): void {
    if (query.length > 0) {
      this.filteredSuppliers = this.existingSuppliers.filter(sup => 
        sup.toLowerCase().includes(query)
      ).slice(0, 5);
    } else {
      // Show all (or top 5) when empty
      this.filteredSuppliers = this.existingSuppliers.slice(0, 5);
    }
    this.showSupplierSuggestions = this.filteredSuppliers.length > 0;
  }

  selectSupplier(supplier: string): void {
    this.addItemForm.patchValue({
      supplier_name: supplier
    });
    this.showSupplierSuggestions = false;
  }

  hideSuggestions(): void {
    // Delay hiding to allow click event on suggestion to fire
    setTimeout(() => {
      this.showSuggestions = false;
      this.showSupplierSuggestions = false;
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
    this.updateSkuDisplay();
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
    
    // Instead of sending as JSON array which drops images, we send each item sequentially
    let completedCount = 0;
    let hasErrors = false;
    const allResponses: any[] = [];
    
    const submitNext = (index: number) => {
      if (index >= this.batchItems.length) {
        this.isSubmitting = false;
        if (!hasErrors) {
          this.handleSuccess(allResponses);
        } else {
          alert('Some items failed to save. Please check the list.');
        }
        return;
      }
      
      const item = this.batchItems[index];
      const formData = new FormData();
      Object.keys(item).forEach(key => {
        if (key === 'image' && item[key]) {
          formData.append('image', item[key]);
        } else if (item[key] !== null && item[key] !== undefined) {
          formData.append(key, item[key]);
        }
      });
      
      this.http.post<any>('http://localhost:5000/api/items', formData).subscribe({
        next: (res) => {
          // res is an array containing the single created item, or a single object. Normalize to array.
          const createdItems = Array.isArray(res) ? res : [res];
          allResponses.push(...createdItems);
          completedCount++;
          submitNext(index + 1);
        },
        error: (err) => {
          console.error('Error saving item:', err);
          hasErrors = true;
          submitNext(index + 1);
        }
      });
    };
    
    submitNext(0);
  }

  private handleSuccess(res: any[]): void {
    this.isSubmitting = false;
    // Refresh lists
    this.fetchExistingItems();
    this.fetchSuppliers();
    
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
    this.updateSkuDisplay();
  }
}
