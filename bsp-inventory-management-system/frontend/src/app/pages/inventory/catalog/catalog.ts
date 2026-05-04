import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './catalog.html',
  styleUrls: ['./catalog.css']
})
export class Catalog implements OnInit {
  items: any[] = [];
  filteredItems: any[] = [];
  paginatedItems: any[] = [];
  searchTerm: string = '';
  isLoading: boolean = true;

  // Pagination state
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  // Filter Dropdown state
  showFilterDropdown: boolean = false;

  // Available options derived from data
  categories: string[] = [];
  suppliers: string[] = [];

  // Selected filters
  selectedCategory: string = '';
  selectedSupplier: string = '';

  // Item Details Modal State
  showItemDetailsModal: boolean = false;
  selectedItemDetails: any = null;

  // Add/Edit Item Modal State
  showAddItemModal: boolean = false;
  isEditing: boolean = false;
  addItemForm: FormGroup;
  isSubmitting = false;
  batchItems: any[] = [];
  filteredSuggestions: any[] = [];
  showSuggestions = false;
  isSkuExisting = false;
  baseNextSkuId: number = 0;

  // Delete Item Modal State
// ... Wait, need to properly match and replace ...
  showDeleteModal: boolean = false;
  deletePassword = '';
  isDeleting = false;
  deleteError = '';

  // Item Transactions State
  showTransactionHistoryModal: boolean = false;
  itemTransactionHistory: any[] = [];
  isLoadingHistory: boolean = false;

  // Item Allocation State
  showAllocationModal: boolean = false;
  itemAllocation: any[] = [];
  isLoadingAllocation: boolean = false;
  totalAllocatedQuantity: number = 0;

  // Log Transaction State
  showLogTransactionModal: boolean = false;
  logTransactionForm: FormGroup;
  offices: any[] = [];
  generatedRisNo: string = '';

  // Transaction Summary
  totalIn: number = 0;
  totalOut: number = 0;

  // Intake Summary Modal State (Success Modal)
  showIntakeModal: boolean = false;
  intakeSummaryData: any = null;
  intakeGrandTotal: number = 0;

  // Pending action from query params
  pendingAction: string | null = null;
  pendingSku: string | null = null;

  Math = Math; // Make Math available to template

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.addItemForm = this.fb.group({
      item_id: [null], // Hidden field for editing
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

    this.logTransactionForm = this.fb.group({
      transaction_type: ['OUT', Validators.required], // Currently only supporting OUT here
      office_id: ['', Validators.required],
      ris_no: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      remarks: [''],
      transaction_date: [new Date().toISOString().split('T')[0], Validators.required]
    });

    // Listen to office changes to update RIS number
    this.logTransactionForm.get('office_id')?.valueChanges.subscribe(officeId => {
      if (officeId) {
        this.updateGeneratedRisNo(officeId);
      }
    });
  }

  get canDelete(): boolean {
    return this.authService.hasRole(['SUPERADMIN', 'ADMIN', 'SUPPLY_OFFICER']);
  }

  onDeleteItem(): void {
    if (!this.selectedItemDetails) return;
    if (!confirm(`Are you sure you want to delete ${this.selectedItemDetails.item_name}? This action cannot be undone.`)) {
      return;
    }
    this.showDeleteModal = true;
    this.showItemDetailsModal = false;
    this.showAddItemModal = false;
    this.deletePassword = '';
    this.deleteError = '';
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deletePassword = '';
    this.deleteError = '';
  }

  confirmDelete(): void {
    if (!this.deletePassword) {
      this.deleteError = 'Password is required.';
      return;
    }

    this.isDeleting = true;
    this.deleteError = '';
    const currentUser = this.authService.currentUserValue;

    const payload = {
      user_id: currentUser?.id,
      password: this.deletePassword
    };

    this.http.delete(`http://localhost:5000/api/items/${this.selectedItemDetails.item_id}`, { body: payload }).subscribe({
      next: (res) => {
        this.isDeleting = false;
        alert('Item deleted successfully!');
        this.closeDeleteModal();
        this.fetchItems();
      },
      error: (err) => {
        this.isDeleting = false;
        console.error('Error deleting item', err);
        this.deleteError = err.error?.error || 'Failed to delete item. Please check your password.';
      }
    });
  }

  fetchOffices(): void {
    this.http.get<any[]>('http://localhost:5000/api/offices').subscribe({
      next: (res) => this.offices = res,
      error: (err) => console.error('Failed to fetch offices', err)
    });
  }

  updateGeneratedRisNo(officeId: number): void {
    this.http.get<{nextRis: string}>(`http://localhost:5000/api/transactions/next-ris/${officeId}`).subscribe({
      next: (res) => {
        this.generatedRisNo = res.nextRis;
        this.logTransactionForm.patchValue({ ris_no: res.nextRis });
      },
      error: (err) => console.error('Failed to fetch next RIS number', err)
    });
  }

  onEditItem(): void {
    if (!this.selectedItemDetails) return;
    
    this.isEditing = true;
    this.showAddItemModal = true;
    this.showItemDetailsModal = false;
    
    this.addItemForm.patchValue({
      item_id: this.selectedItemDetails.item_id,
      item_code: this.selectedItemDetails.item_code,
      item_name: this.selectedItemDetails.item_name,
      category_id: this.selectedItemDetails.category_id?.toString() || '',
      unit_of_measure: this.selectedItemDetails.unit_of_measure?.toLowerCase() || 'pcs',
      description: this.selectedItemDetails.description,
      supplier_name: this.selectedItemDetails.supplier_name,
      unit_price: this.selectedItemDetails.unit_price || 0,
      quantity: 0, // Not used for direct item update
      reorder_level: this.selectedItemDetails.reorder_level || 10
    });
  }

  onReplenishItem(): void {
    if (!this.selectedItemDetails) return;
    
    this.openAddItemModal();
    
    // Auto-populate item details for replenishment
    this.addItemForm.patchValue({
      item_code: this.selectedItemDetails.item_code,
      item_name: this.selectedItemDetails.item_name,
      category_id: this.selectedItemDetails.category_id?.toString() || '',
      unit_of_measure: this.selectedItemDetails.unit_of_measure?.toLowerCase() || 'pcs',
      description: this.selectedItemDetails.description,
      supplier_name: this.selectedItemDetails.supplier_name,
      unit_price: this.selectedItemDetails.unit_price || 0,
      reorder_level: this.selectedItemDetails.reorder_level || 10
    });
    this.isSkuExisting = true;
  }

  onLogTransaction(): void {
    if (!this.selectedItemDetails) return;
    
    this.fetchOffices();
    this.showLogTransactionModal = true;
    this.showItemDetailsModal = false;
    
    this.logTransactionForm.reset({
      transaction_type: 'OUT',
      office_id: '',
      ris_no: '',
      quantity: 1,
      remarks: '',
      transaction_date: new Date().toISOString().split('T')[0]
    });
  }

  closeLogTransaction(): void {
    this.showLogTransactionModal = false;
    this.generatedRisNo = '';
  }

  submitLogTransaction(): void {
    if (this.logTransactionForm.invalid) {
      this.logTransactionForm.markAllAsTouched();
      return;
    }

    const formVal = this.logTransactionForm.value;
    
    // Validate stock
    if (formVal.transaction_type === 'OUT' && formVal.quantity > this.selectedItemDetails.current_stock) {
      alert(`Cannot issue more than available stock (${this.selectedItemDetails.current_stock}).`);
      return;
    }

    this.isSubmitting = true;

    const payload = {
      ris_no: formVal.ris_no,
      office_id: formVal.office_id,
      transaction_date: formVal.transaction_date,
      remarks: formVal.remarks,
      items: [
        {
          item_id: this.selectedItemDetails.item_id,
          quantity: formVal.quantity
        }
      ]
    };

    this.http.post('http://localhost:5000/api/transactions/issue', payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        alert('Transaction logged successfully!');
        this.closeLogTransaction();
        this.fetchItems(); // Refresh catalog
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Failed to log transaction', err);
        alert('Failed to log transaction: ' + (err.error?.error || 'Unknown error'));
      }
    });
  }

  onViewTransactions(): void {
    if (!this.selectedItemDetails) return;
    
    this.isLoadingHistory = true;
    this.showTransactionHistoryModal = true;
    
    this.http.get<any[]>(`http://localhost:5000/api/items/${this.selectedItemDetails.item_id}/history`).subscribe({
      next: (data) => {
        this.itemTransactionHistory = data;
        
        // Calculate Summary
        this.totalIn = data
          .filter(t => t.transaction_type === 'IN')
          .reduce((sum, t) => sum + Number(t.quantity), 0);
          
        this.totalOut = data
          .filter(t => t.transaction_type === 'OUT')
          .reduce((sum, t) => sum + Number(t.quantity), 0);
          
        this.isLoadingHistory = false;
      },
      error: (err) => {
        console.error('Failed to fetch item history', err);
        this.isLoadingHistory = false;
      }
    });
  }

  onViewAllocation(): void {
    if (!this.selectedItemDetails) return;
    
    this.isLoadingAllocation = true;
    this.showAllocationModal = true;
    
    this.http.get<any[]>(`http://localhost:5000/api/items/${this.selectedItemDetails.item_id}/allocation`).subscribe({
      next: (data) => {
        console.log('Allocation Data received:', data);
        this.itemAllocation = data;
        this.totalAllocatedQuantity = data.reduce((sum, a) => sum + Number(a.total_allocated), 0);
        this.isLoadingAllocation = false;
      },
      error: (err) => {
        console.error('Failed to fetch item allocation', err);
        this.isLoadingAllocation = false;
      }
    });
  }

  closeAllocation(): void {
    this.showAllocationModal = false;
    this.itemAllocation = [];
  }

  closeTransactionHistory(): void {
    this.showTransactionHistoryModal = false;
    this.itemTransactionHistory = [];
  }

  onItemNameInput(event: any): void {
    const query = event.target.value.toLowerCase();
    if (query.length > 0) {
      this.filteredSuggestions = this.items.filter(item => 
        item.item_name.toLowerCase().includes(query)
      ).slice(0, 5);
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
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  ngOnInit(): void {
    this.fetchItems();
    this.route.queryParams.subscribe(params => {
      this.pendingAction = params['action'];
      this.pendingSku = params['sku'];
      this.processPendingAction();
    });
  }

  processPendingAction(): void {
    if (this.pendingAction && this.pendingSku && this.items.length > 0) {
      const item = this.items.find(i => i.item_code === this.pendingSku);
      if (item) {
        this.selectedItemDetails = item;
        // Small delay to ensure Angular change detection runs
        setTimeout(() => {
          switch (this.pendingAction) {
            case 'edit': this.onEditItem(); break;
            case 'log': this.onLogTransaction(); break;
            case 'history': this.onViewTransactions(); break;
            case 'allocation': this.onViewAllocation(); break;
            case 'replenish': this.onReplenishItem(); break;
          }
          this.pendingAction = null;
          this.pendingSku = null;
          this.router.navigate([], { queryParams: {} });
        });
      }
    }
  }

  fetchItems(): void {
    this.isLoading = true;
    this.http.get<any[]>('http://localhost:5000/api/items').subscribe({
      next: (data) => {
        this.items = data;
        this.filteredItems = data;
        this.extractFilterOptions(data);
        this.updatePagination();
        this.processPendingAction();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch items', err);
        this.isLoading = false;
      }
    });
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
    if (!this.isEditing && this.baseNextSkuId > 0) {
      const nextId = this.baseNextSkuId + this.batchItems.length;
      const skuStr = 'ITM-' + String(nextId).padStart(6, '0');
      this.addItemForm.patchValue({ item_code: skuStr });
    }
  }

  openItemDetails(item: any): void {
    this.selectedItemDetails = item;
    this.showItemDetailsModal = true;
  }

  closeItemDetails(): void {
    this.showItemDetailsModal = false;
    this.selectedItemDetails = null;
  }

  openAddItemModal(): void {
    this.isEditing = false;
    this.showAddItemModal = true;
    this.batchItems = [];
    this.onClear();
  }

  closeAddItemModal(): void {
    this.showAddItemModal = false;
    this.isEditing = false;
  }

  addToBatch(): void {
    if (this.isEditing) return; // Cannot add to batch while editing existing item
    
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
    if (this.isEditing) {
      this.updateSingleItem();
      return;
    }

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
    if (res && res.length > 0) {
      const firstItemId = res[0].item_id;
      this.http.get<any>(`http://localhost:5000/api/items/${firstItemId}/latest-intake`).subscribe({
        next: (data) => {
          this.intakeSummaryData = data;
          this.intakeGrandTotal = data.items.reduce((sum: number, i: any) => sum + Number(i.totalCost), 0);
          this.showIntakeModal = true;
          this.showAddItemModal = false;
          this.batchItems = []; 
          this.fetchItems(); 
        },
        error: (err) => {
          console.error('Failed to fetch intake summary', err);
          alert(`${res.length} item(s) added successfully!`);
          this.batchItems = [];
          this.showAddItemModal = false;
          this.fetchItems();
        }
      });
    } else {
      alert('Item(s) added successfully!');
      this.batchItems = [];
      this.showAddItemModal = false;
      this.fetchItems();
    }
  }

  private handleError(err: any): void {
    console.error('Error adding items', err);
    this.isSubmitting = false;
    alert('Failed to add items. Please try again.');
  }

  updateSingleItem(): void {
    if (this.addItemForm.invalid) {
      this.addItemForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const itemId = this.addItemForm.value.item_id;
    const formVal = this.addItemForm.value;

    const formData = new FormData();
    Object.keys(formVal).forEach(key => {
      if (key === 'image' && formVal[key]) {
        formData.append('image', formVal[key]);
      } else if (formVal[key] !== null && formVal[key] !== undefined) {
        formData.append(key, formVal[key]);
      }
    });

    this.http.put(`http://localhost:5000/api/items/${itemId}`, formData).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        alert('Item updated successfully!');
        this.showAddItemModal = false;
        this.isEditing = false;
        this.fetchItems();
      },
      error: (err) => {
        console.error('Error updating item', err);
        this.isSubmitting = false;
        alert('Failed to update item.');
      }
    });
  }

  closeIntakeModal(): void {
    this.showIntakeModal = false;
    this.intakeSummaryData = null;
    this.intakeGrandTotal = 0;
  }

  onClear(): void {
    this.isSkuExisting = false;
    this.addItemForm.reset({
      unit_price: 0,
      quantity: 0,
      reorder_level: 10
    });
    this.updateSkuDisplay();
  }

  onSkuInput(event: any): void {
    const sku = event.target.value.trim().toUpperCase();
    if (!sku) {
      this.isSkuExisting = false;
      return;
    }

    // Check if SKU exists in our local items list
    const existingItem = this.items.find(i => i.item_code === sku);
    
    if (existingItem) {
      this.isSkuExisting = true;
      // Auto-populate item details
      this.addItemForm.patchValue({
        item_name: existingItem.item_name,
        category_id: existingItem.category_id,
        unit_of_measure: existingItem.unit_of_measure,
        description: existingItem.description,
        unit_price: existingItem.unit_price,
        reorder_level: existingItem.reorder_level
      });
    } else {
      this.isSkuExisting = false;
      // If SKU was previously existing but now it's different, clear the auto-populated name
      // but keep what the user might have typed if they are creating a new one
    }
  }

  extractFilterOptions(data: any[]): void {
    const catSet = new Set<string>();
    const supSet = new Set<string>();

    data.forEach(item => {
      if (item.category_name) catSet.add(item.category_name);
      if (item.supplier_name) supSet.add(item.supplier_name);
    });

    this.categories = Array.from(catSet).sort();
    this.suppliers = Array.from(supSet).sort();
  }

  toggleFilterDropdown(): void {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  onSearch(event?: any): void {
    if (event) {
      this.searchTerm = event.target.value.toLowerCase();
    }
    this.applyFilters();
  }

  applyFilters(): void {
    let result = this.items;

    // Apply Search
    if (this.searchTerm) {
      result = result.filter(item => 
        (item.item_code && item.item_code.toLowerCase().includes(this.searchTerm)) ||
        (item.item_name && item.item_name.toLowerCase().includes(this.searchTerm)) ||
        (item.category_name && item.category_name.toLowerCase().includes(this.searchTerm))
      );
    }

    // Apply Category Filter
    if (this.selectedCategory) {
      result = result.filter(item => item.category_name === this.selectedCategory);
    }

    // Apply Supplier Filter
    if (this.selectedSupplier) {
      result = result.filter(item => item.supplier_name === this.selectedSupplier);
    }

    this.filteredItems = result;
    this.showFilterDropdown = false; // Close dropdown after applying
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage) || 1;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedItems = this.filteredItems.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  clearFilters(): void {
    this.selectedCategory = '';
    this.selectedSupplier = '';
    this.applyFilters();
  }

  getStockStatus(item: any): string {
    const stock = item.current_stock || 0;
    const threshold = item.reorder_level || 10; // Default threshold if null
    
    if (stock === 0) return 'Out of Stock';
    if (stock <= threshold) return 'Low Stock';
    return 'In Stock';
  }

  getStockStatusClass(item: any): string {
    const status = this.getStockStatus(item);
    if (status === 'Out of Stock') return 'status-out';
    if (status === 'Low Stock') return 'status-low';
    return 'status-in';
  }
}
