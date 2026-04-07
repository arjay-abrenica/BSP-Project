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
  
  // Preview Modal Logic
  isPreviewModalOpen: boolean = false;
  selectedItems: any[] = [];
  
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
      },
      error: (err) => console.error('Failed to load inventory', err)
    });
  }

  get filteredItems() {
    if (!this.searchQuery) return this.items;
    const q = this.searchQuery.toLowerCase();
    return this.items.filter(item => 
      item.item_name?.toLowerCase().includes(q) ||
      item.category_name?.toLowerCase().includes(q) ||
      item.item_code?.toLowerCase().includes(q)
    );
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
    const office_id = user?.office_id || 1; 

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
