import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

// @ts-ignore
import html2pdf from 'html2pdf.js';

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
  
  isSubmitting: boolean = false;
  isSuccessModalOpen: boolean = false;
  lastRequestNumber: string = '';
  
  // Print Logic
  receiptData: any = null;
  currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

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
      },
      error: (err) => console.error('Failed to load inventory', err)
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
      items: this.selectedItems.map(i => ({
        item_id: i.item_id,
        quantity: i.requestQuantity
      }))
    };

    // Prepare receipt data before submitting
    this.receiptData = {
      reqNumber: 'PENDING...',
      office: user?.office_name || 'N/A',
      purpose: this.requestPurpose,
      date: new Date().toLocaleDateString(),
      items: [...this.selectedItems]
    };

    this.http.post('http://localhost:5000/api/requests', payload).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.lastRequestNumber = res.request_number;
        this.receiptData.reqNumber = res.request_number;
        this.isPreviewModalOpen = false;
        this.isSuccessModalOpen = true;
        
        // Reset form and items
        this.requestPurpose = '';
        this.requestPriority = 'NORMAL';
        this.requestJustification = '';
        this.fetchInventory(); // Refresh list to clear quantities
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Failed to submit request', err);
        alert('Failed to submit request. Please try again.');
      }
    });
  }

  printRis(): void {
    const printContent = document.getElementById('ris-receipt');
    if (!printContent) return;

    const windowUrl = '';
    const uniqueName = new Date();
    const windowName = 'Print' + uniqueName.getTime();
    const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>RIS Receipt - ${this.lastRequestNumber}</title>
            <style>
              body { font-family: 'Arial', sans-serif; padding: 20px; }
              .ris-header { text-align: center; margin-bottom: 20px; }
              .ris-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              .ris-table th, .ris-table td { border: 1px solid black; padding: 8px; text-align: left; }
              .ris-footer { margin-top: 40px; display: flex; justify-content: space-between; }
              .sign-box { border-top: 1px solid black; width: 200px; text-align: center; padding-top: 5px; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  }

  downloadPDF(): void {
    const element = document.getElementById('ris-receipt');
    if (!element) return;

    const opt = {
      margin: 0.5,
      filename: `RIS-${this.lastRequestNumber}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
    };
    html2pdf().from(element).set(opt).save();
  }

  closeSuccessModal() {
    this.isSuccessModalOpen = false;
  }
}
