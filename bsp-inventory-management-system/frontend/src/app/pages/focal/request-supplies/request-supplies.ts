import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-request-supplies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './request-supplies.html',
  styleUrls: ['./request-supplies.scss']
})
export class RequestSupplies implements OnInit {
  items: any[] = [];
  searchQuery: string = '';
  isLoading: boolean = true;
  
  // Category Filtering
  availableCategories: string[] = ['All'];
  selectedCategory: string = 'All';
  
  // Preview Modal Logic
  isPreviewModalOpen: boolean = false;
  selectedItems: any[] = [];
  
  // Quantity Modal Logic
  isQuantityModalOpen: boolean = false;
  selectedItemForQty: any = null;
  quantityInput: number | null = null;

  openQuantityModal(item: any) {
    if (!this.isBorrowable(item)) return;
    this.selectedItemForQty = item;
    this.quantityInput = item.requestQuantity || null;
    this.isQuantityModalOpen = true;
  }

  closeQuantityModal() {
    this.isQuantityModalOpen = false;
    this.selectedItemForQty = null;
    this.quantityInput = null;
  }

  confirmQuantity() {
    if (this.selectedItemForQty) {
      if (this.quantityInput !== null && this.quantityInput > this.selectedItemForQty.current_stock) {
        alert(`Cannot request more than available stock (${this.selectedItemForQty.current_stock}).`);
        this.selectedItemForQty.requestQuantity = this.selectedItemForQty.current_stock;
      } else if (this.quantityInput !== null && this.quantityInput >= 0) {
        this.selectedItemForQty.requestQuantity = this.quantityInput === 0 ? null : this.quantityInput;
      }
    }
    this.closeQuantityModal();
  }

  // Request Header Info
  requestPurpose: string = '';
  requestPriority: string = 'NORMAL';
  requestJustification: string = '';
  requestedByName: string = '';
  
  isSubmitting: boolean = false;
  isSuccessModalOpen: boolean = false;
  lastRequestNumber: string = '';

  constructor(private http: HttpClient, public authService: AuthService) {}

  ngOnInit() {
    this.fetchInventory();
  }

  fetchInventory() {
    this.http.get<any[]>('http://localhost:5000/api/items').subscribe({
      next: (data) => {
        this.items = data.map(item => ({ ...item, requestQuantity: null }));
        
        // Extract unique categories
        const categories = this.items.map(item => item.category_name).filter(Boolean);
        this.availableCategories = ['All', ...Array.from(new Set(categories))];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load inventory', err);
        this.isLoading = false;
      }
    });
  }

  get filteredItems() {
    let filtered = this.items;
    
    if (this.selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category_name === this.selectedCategory);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.item_name?.toLowerCase().includes(q) ||
        item.category_name?.toLowerCase().includes(q) ||
        item.item_code?.toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }

  get selectedItemsCount() {
    return this.items.filter(item => item.requestQuantity && item.requestQuantity > 0).length;
  }

  isBorrowable(item: any): boolean {
    if (!item.reorder_level || item.reorder_level === 0) return true;
    const stockPercentage = (item.current_stock / item.reorder_level) * 100;
    return stockPercentage > 30;
  }

  // Toast Notification System
  toasts: { message: string }[] = [];

  showToast(message: string) {
    this.toasts.push({ message });
    setTimeout(() => {
      this.toasts.shift();
    }, 5000);
  }

  removeToast(index: number) {
    this.toasts.splice(index, 1);
  }

  validateQuantity(item: any, value: number) {
    if (value > item.current_stock) {
      this.showToast(`Warning: Cannot request more than available stock (${item.current_stock}).`);
      item.requestQuantity = item.current_stock;
    } else if (value < 0) {
      item.requestQuantity = 0;
    } else {
      item.requestQuantity = value;
    }
  }

  onImageError(event: any) {
    event.target.src = 'assets/img/placeholder.svg';
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
  }

  openPreview() {
    this.selectedItems = this.items.filter(item => item.requestQuantity && item.requestQuantity > 0);
    
    if (this.selectedItems.length === 0) {
      alert('Please enter a quantity for at least one item.');
      return;
    }
    
    this.isPreviewModalOpen = true;
  }

  closePreview() {
    this.isPreviewModalOpen = false;
  }

  get officeName() {
    return this.authService.currentUserValue?.office_name || 'N/A';
  }

  submitFullRequest() {
    if (!this.requestPurpose) {
      alert('Please provide a purpose for this request.');
      return;
    }

    if (this.requestPriority !== 'NORMAL' && !this.requestJustification) {
      alert('Justification is required for Urgent or Emergency requests.');
      return;
    }

    this.isSubmitting = true;

    const user = this.authService.currentUserValue;
    const office_id = user?.office_id; 

    if (!office_id) {
      alert('Error: Your session is missing office information. Please log out and log back in.');
      return;
    }

    const payload = {
      office_id: office_id,
      purpose: this.requestPurpose,
      priority: this.requestPriority,
      justification: this.requestJustification,
      requested_by: this.requestedByName,
      items: this.selectedItems.map(i => ({
        item_id: i.item_id,
        quantity: i.requestQuantity
      }))
    };

    this.http.post('http://localhost:5000/api/requests', payload).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.lastRequestNumber = res.request_number;
        this.isPreviewModalOpen = false;
        this.isSuccessModalOpen = true;
        
        // Reset form and items
        this.requestPurpose = '';
        this.requestPriority = 'NORMAL';
        this.requestJustification = '';
        this.requestedByName = '';
        this.fetchInventory(); // Refresh list to clear quantities
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Failed to submit request', err);
        alert('Failed to submit request. Please try again.');
      }
    });
  }

  closeSuccessModal() {
    this.isSuccessModalOpen = false;
  }
}
