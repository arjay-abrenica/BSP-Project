import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

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

  // Item Transactions State
  showTransactionHistoryModal: boolean = false;
  itemTransactionHistory: any[] = [];
  isLoadingHistory: boolean = false;

  // Intake Summary Modal State (Success Modal)
  showIntakeModal: boolean = false;
  intakeSummaryData: any = null;
  intakeGrandTotal: number = 0;

  Math = Math; // Make Math available to template

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.addItemForm = this.fb.group({
      item_id: [null], // Hidden field for editing
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

  onLogTransaction(): void {
    this.router.navigate(['/inventory/outflow']);
  }

  onViewTransactions(): void {
    if (!this.selectedItemDetails) return;
    
    this.isLoadingHistory = true;
    this.showTransactionHistoryModal = true;
    
    this.http.get<any[]>(`http://localhost:5000/api/items/${this.selectedItemDetails.item_id}/history`).subscribe({
      next: (data) => {
        this.itemTransactionHistory = data;
        this.isLoadingHistory = false;
      },
      error: (err) => {
        console.error('Failed to fetch item history', err);
        this.isLoadingHistory = false;
      }
    });
  }

  onViewAllocation(): void {
    // Navigate to reports or a specific allocation view
    this.router.navigate(['/reports/analysis']);
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
  }

  fetchItems(): void {
    this.http.get<any[]>('http://localhost:5000/api/items').subscribe({
      next: (data) => {
        this.items = data;
        this.filteredItems = data;
        this.extractFilterOptions(data);
        this.updatePagination();
      },
      error: (err) => console.error('Failed to fetch items', err)
    });
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
    
    this.http.post<any[]>('http://localhost:5000/api/items', this.batchItems).subscribe({
      next: (res) => {
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
              this.fetchItems(); // Refresh catalog
            },
            error: (err) => {
              console.error('Failed to fetch intake summary', err);
              alert(`${res.length} item(s) added successfully!`);
              this.batchItems = [];
              this.showAddItemModal = false;
              this.fetchItems(); // Refresh catalog
            }
          });
        } else {
          alert('Item(s) added successfully!');
          this.batchItems = [];
          this.showAddItemModal = false;
          this.fetchItems(); // Refresh catalog
        }
      },
      error: (err) => {
        console.error('Error adding items', err);
        this.isSubmitting = false;
        alert('Failed to add items. Please try again.');
      }
    });
  }

  updateSingleItem(): void {
    if (this.addItemForm.invalid) {
      this.addItemForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const itemId = this.addItemForm.value.item_id;
    const payload = this.addItemForm.value;

    this.http.put(`http://localhost:5000/api/items/${itemId}`, payload).subscribe({
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
    this.addItemForm.reset({
      unit_price: 0,
      quantity: 0,
      reorder_level: 10
    });
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
