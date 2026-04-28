import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

// @ts-ignore
import html2pdf from 'html2pdf.js';

@Component({
  selector: 'app-outflow',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './outflow.component.html',
  styleUrls: ['./outflow.component.scss']
})
export class OutflowComponent implements OnInit {
  activeTab: string = 'direct';
  issueForm: FormGroup;
  isSubmitting = false;
  
  // Inventory state
  inventoryItems: any[] = [];
  filteredItems: any[] = [];
  issueQuantities: { [key: number]: number } = {};
  showQuantityInput: { [key: number]: boolean } = {};
  offices: any[] = [];

  // Requests state
  requests: any[] = [];
  approvedRequests: any[] = [];
  approvedOffices: any[] = [];
  selectedApprovedOfficeId: number = -1;
  officeTransactions: any[] = [];
  paginatedTransactions: any[] = [];
  selectedRequest: any = null;
  searchQuery: string = '';

  // Pagination for Approved History
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 0;

  // Pagination for Direct Allocation
  directCurrentPage: number = 1;
  directPageSize: number = 10;
  directTotalPages: number = 0;
  paginatedDirectItems: any[] = [];
  
  // Filtering
  categories: string[] = [];
  selectedCategory: string = 'All';
  
  // Print state
  printData: any = null;
  showPrintPreview: boolean = false;
  Math = Math;

  // Cart/Staging state for Direct Allocation
  stagedIssuances: any[] = [];
  selectedStagedIndex: number = -1;

  // Direct Allocation state
  currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  generatedIssuanceNumber = 'Loading...';

  // Toast State
  toastMessage: string = '';
  showToast: boolean = false;
  toastType: 'success' | 'error' = 'success';

  displayToast(message: string, type: 'success' | 'error' = 'success') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.issueForm = this.fb.group({
      ris_no: ['', Validators.required],
      department_id: ['', Validators.required],
      remarks: [''],
      issued_by: ['Servillano J. Bajora']
    });

    // Listen to office changes to update RIS number
    this.issueForm.get('department_id')?.valueChanges.subscribe(officeId => {
      if (officeId) {
        this.updateRisNo(officeId);
      }
    });
  }

  ngOnInit() {
    this.fetchInventory();
    this.fetchOffices();
    this.fetchRequests();
    this.fetchApprovedRequests();
  }

  fetchRequests(): void {
    this.http.get<any[]>('http://localhost:5000/api/requests/pending').subscribe({
      next: (res) => {
        this.requests = res;
        if (this.activeTab === 'pending' && this.requests.length > 0 && !this.selectedRequest) {
          this.selectRequest(this.requests[0].id);
        }
      },
      error: (err) => console.error('Failed to fetch requests', err)
    });
  }

  fetchApprovedRequests(selectLatestId?: number): void {
    this.http.get<any[]>('http://localhost:5000/api/requests/approved').subscribe({
      next: (res) => {
        this.approvedRequests = res;
        
        // Group by office to show unique offices on the left
        const officeMap = new Map();
        res.forEach(item => {
          if (!officeMap.has(item.office_id)) {
            officeMap.set(item.office_id, {
              id: item.office_id,
              deptName: item.deptName,
              deptCode: item.deptCode,
              acronym: item.acronym,
              lastDate: item.date,
              lastTime: item.time,
              transactionCount: 0
            });
          }
          officeMap.get(item.office_id).transactionCount++;
        });
        
        this.approvedOffices = Array.from(officeMap.values());

        if (this.activeTab === 'approved' && this.approvedOffices.length > 0) {
          if (selectLatestId) {
            // Find the office of this transaction and select it
            const trans = res.find(r => r.id === selectLatestId);
            if (trans) {
              this.selectApprovedOffice(trans.office_id);
            }
          } else if (this.selectedApprovedOfficeId === -1) {
            this.selectApprovedOffice(this.approvedOffices[0].id);
          }
        }
      },
      error: (err) => console.error('Failed to fetch approved requests', err)
    });
  }

  selectApprovedOffice(officeId: number) {
    this.selectedApprovedOfficeId = officeId;
    // Filter transactions for this office
    this.officeTransactions = this.approvedRequests
      .filter(t => t.office_id === officeId)
      .map(t => ({ ...t, items: [], loadingItems: false }));
    
    // For each transaction, fetch its items
    this.officeTransactions.forEach(trans => {
      trans.loadingItems = true;
      this.http.get<any>(`http://localhost:5000/api/scan/ris/${trans.risNo}`).subscribe({
        next: (data) => {
          trans.items = data.details.map((d: any) => ({
            description: d.item_name,
            unit: d.unit_of_measure || 'PCS',
            issueQty: d.quantity
          }));
          trans.loadingItems = false;
        },
        error: (err) => {
          console.error('Failed to fetch items for RIS', trans.risNo, err);
          trans.loadingItems = false;
        }
      });
    });
    
    // Reset to first page when selecting a new office
    this.currentPage = 1;
    this.updatePaginatedTransactions();
  }

  updatePaginatedTransactions() {
    this.totalPages = Math.ceil(this.officeTransactions.length / this.pageSize) || 1;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedTransactions = this.officeTransactions.slice(startIndex, endIndex);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedTransactions();
    }
  }

  getPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  fetchOffices(): void {
    this.http.get<any[]>('http://localhost:5000/api/offices').subscribe({
      next: (res) => {
        this.offices = res;
      },
      error: (err) => console.error('Failed to fetch offices', err)
    });
  }

  updateRisNo(officeId: number): void {
    this.http.get<{nextRis: string}>(`http://localhost:5000/api/transactions/next-ris/${officeId}`).subscribe({
      next: (res) => {
        this.generatedIssuanceNumber = res.nextRis;
        this.issueForm.patchValue({
          ris_no: res.nextRis
        }, { emitEvent: false }); // Don't trigger valueChanges recursively
      },
      error: (err) => console.error('Failed to fetch next RIS number', err)
    });
  }

  setTab(tab: 'pending' | 'approved' | 'direct') {
    this.activeTab = tab;
    this.selectedRequest = null;
    this.selectedStagedIndex = -1; // Also reset cart selection
    
    if (tab === 'pending') {
      this.fetchRequests();
    } else if (tab === 'approved') {
      this.fetchApprovedRequests();
    }
  }

  selectRequest(id: number) {
    const list = this.activeTab === 'pending' ? this.requests : this.approvedRequests;
    const request = list.find(r => r.id === id);
    if (!request) return;

    this.selectedRequest = request;
    
    // For approved requests, we want to show the ACTUAL issued quantities from Transactions
    if (this.activeTab === 'approved') {
      this.http.get<any>(`http://localhost:5000/api/scan/ris/${this.selectedRequest.risNo}`).subscribe({
        next: (transaction) => {
          this.selectedRequest.items = transaction.details.map((d: any) => ({
            description: d.item_name,
            unit: d.unit_of_measure || 'PCS',
            reqQty: d.quantity, // In approved view, reqQty and issueQty are usually displayed as the same issued qty
            issueQty: d.quantity,
            inStock: 'Released'
          }));
        },
        error: (err) => console.error('Failed to fetch transaction details', err)
      });
    } else {
      // Fetch details for the selected pending request
      this.http.get<any[]>(`http://localhost:5000/api/requests/${id}/details`).subscribe({
        next: (details) => {
          this.selectedRequest.items = details.map(item => ({
            ...item,
            issueQty: item.reqQty // Default to full requested quantity
          }));
          this.issueForm.patchValue({
            ris_no: '',
            remarks: ''
          }, { emitEvent: false });
          
          if (this.selectedRequest && this.selectedRequest.department_id) {
            this.updateRisNo(this.selectedRequest.department_id);
          }
        },
        error: (err) => console.error('Failed to fetch request details', err)
      });
    }
  }

  fetchInventory(): void {
    this.http.get<any[]>('http://localhost:5000/api/items').subscribe({
      next: (res) => {
        this.inventoryItems = res;
        this.filteredItems = res;
        this.categories = [...new Set(res.map(item => item.category_name).filter(c => c))].sort();
      },
      error: (err) => console.error('Failed to fetch inventory', err)
    });
  }

  onSearch(event?: any) {
    const query = this.searchQuery.toLowerCase();
    this.filteredItems = this.inventoryItems.filter(item => {
      const matchesSearch = 
        (item.item_name && item.item_name.toLowerCase().includes(query)) ||
        (item.item_code && item.item_code.toLowerCase().includes(query)) ||
        (item.category_name && item.category_name.toLowerCase().includes(query));
      
      const matchesCategory = this.selectedCategory === 'All' || item.category_name === this.selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
    this.directCurrentPage = 1;
    this.updatePaginatedDirectItems();
  }

  onCategoryChange(event: any) {
    this.onSearch();
  }

  updatePaginatedDirectItems() {
    this.directTotalPages = Math.ceil(this.filteredItems.length / this.directPageSize) || 1;
    const startIndex = (this.directCurrentPage - 1) * this.directPageSize;
    const endIndex = startIndex + this.directPageSize;
    this.paginatedDirectItems = this.filteredItems.slice(startIndex, endIndex);
  }

  goToDirectPage(page: number) {
    if (page >= 1 && page <= this.directTotalPages) {
      this.directCurrentPage = page;
      this.updatePaginatedDirectItems();
    }
  }

  getDirectPages(): number[] {
    return Array.from({ length: this.directTotalPages }, (_, i) => i + 1);
  }

  // Quantity Modal state
  showQuantityModal = false;
  selectedItemForQty: any = null;
  quantityInput: number | string = '';

  openQuantityModal(item: any) {
    this.selectedItemForQty = item;
    const currentQty = this.issueQuantities[item.item_id] || '';
    this.quantityInput = currentQty;
    this.showQuantityModal = true;
  }

  closeQuantityModal() {
    this.showQuantityModal = false;
    this.selectedItemForQty = null;
    this.quantityInput = '';
  }

  confirmQuantity() {
    if (!this.selectedItemForQty) return;

    if (this.quantityInput === null || String(this.quantityInput).trim() === '' || Number(this.quantityInput) === 0) {
      delete this.issueQuantities[this.selectedItemForQty.item_id];
      this.closeQuantityModal();
      return;
    }

    const qty = Number(this.quantityInput);
    if (!isNaN(qty) && qty > 0) {
      if (qty > this.selectedItemForQty.current_stock) {
        this.displayToast(`Cannot issue more than current stock (${this.selectedItemForQty.current_stock}) for ${this.selectedItemForQty.item_name}`, 'error');
        this.issueQuantities[this.selectedItemForQty.item_id] = this.selectedItemForQty.current_stock;
      } else {
        this.issueQuantities[this.selectedItemForQty.item_id] = qty;
      }
      this.closeQuantityModal();
    } else {
      this.displayToast("Invalid quantity entered.", 'error');
    }
  }

  getStockStatus(item: any): string {
    const stock = item.current_stock || 0;
    const threshold = item.reorder_level || 10;
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

  getQty(itemId: number): number | string {
    return this.issueQuantities[itemId] || '';
  }

  clearRemarks() {
    this.issueForm.get('remarks')?.setValue('');
  }

  onImageError(event: any) {
    event.target.src = 'assets/img/placeholder.svg';
  }

  startNewIssuance() {
    this.selectedRequest = null;
    this.issueQuantities = {};
    this.issueForm.reset({
      issued_by: 'Servillano J. Bajora'
    });
    this.generatedIssuanceNumber = 'Select an office...';
    this.searchQuery = '';
    // Clear search and reset filtered items
    this.filteredItems = [...this.inventoryItems];
  }

  approveRequest(): void {
    // Used for Pending tab
    if (this.issueForm.get('ris_no')?.invalid) {
      this.issueForm.get('ris_no')?.markAsTouched();
      this.displayToast('Please fill out the required RIS Number before approving.', 'error');
      return;
    }

    let isPartial = false;
    const itemsToIssue = this.selectedRequest.items
      .filter((item: any) => item.issueQty && item.issueQty > 0)
      .map((item: any) => {
        if (item.issueQty < item.reqQty) {
          isPartial = true;
        }
        return {
          item_id: item.item_id,
          quantity: item.issueQty,
          approved_quantity: item.issueQty
        };
      });

    if (itemsToIssue.length === 0) {
      this.displayToast('Please specify a quantity to issue for at least one item.', 'error');
      return;
    }

    const status = isPartial ? 'PARTIAL' : 'APPROVED';

    // 1. Update Request Status first
    this.http.put(`http://localhost:5000/api/requests/${this.selectedRequest.id}/status`, {
      status: status,
      items: itemsToIssue
    }).subscribe({
      next: () => {
        // 2. Then proceed to record the actual issuance (Stock OUT)
        this.submitIssuance(itemsToIssue, this.selectedRequest.department_id || 1, this.selectedRequest.purpose, this.selectedRequest.id);
      },
      error: (err) => {
        console.error('Failed to update request status', err);
        this.displayToast('Failed to update request status. Issuance cancelled.', 'error');
      }
    });
  }

  rejectRequest(): void {
    if (!this.selectedRequest) return;
    
    if (confirm(`Are you sure you want to REJECT request ${this.selectedRequest.reqNumber}?`)) {
      this.isSubmitting = true;
      this.http.put(`http://localhost:5000/api/requests/${this.selectedRequest.id}/reject`, {}).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.displayToast('Request rejected.', 'success');
          this.fetchRequests();
          this.selectedRequest = null;
        },
        error: (err) => {
          this.isSubmitting = false;
          this.displayToast('Failed to reject request: ' + (err.error?.error || 'Unknown error'), 'error');
        }
      });
    }
  }

  getCartItems() {
    return Object.keys(this.issueQuantities).map(key => {
      const id = parseInt(key, 10);
      const item = this.inventoryItems.find(i => i.item_id === id);
      return {
        item_id: id,
        item_name: item ? item.item_name : 'Unknown Item',
        quantity: this.issueQuantities[id],
        unit: item ? item.unit_of_measure : ''
      };
    });
  }

  removeItemFromCart(itemId: number) {
    delete this.issueQuantities[itemId];
    this.showQuantityInput[itemId] = false;
  }

  // Confirm Issuance Modal state
  showConfirmModal = false;
  itemsToIssue: any[] = [];
  confirmOfficeName: string = '';
  confirmRemarks: string = '';

  openConfirmModal() {
    this.itemsToIssue = this.getCartItems();

    if (this.itemsToIssue.length === 0) {
      this.displayToast('Your cart is empty. Please add items before confirming.', 'error');
      return;
    }

    if (this.issueForm.get('department_id')?.invalid) {
      this.issueForm.get('department_id')?.markAsTouched();
      this.displayToast('Please select a Recipient Office.', 'error');
      return;
    }

    const officeId = Number(this.issueForm.value.department_id);
    const office = this.offices.find(o => o.office_id === officeId);
    this.confirmOfficeName = office ? office.office_name : 'Unknown Office';
    this.confirmRemarks = this.issueForm.value.remarks || '(No remarks)';

    this.showConfirmModal = true;
  }

  closeConfirmModal() {
    this.showConfirmModal = false;
    this.itemsToIssue = [];
  }

  proceedWithIssuance() {
    this.showConfirmModal = false;
    const finalItems = this.itemsToIssue.map(ci => ({
      item_id: ci.item_id,
      quantity: ci.quantity
    }));
    this.submitIssuance(
      finalItems, 
      Number(this.issueForm.value.department_id), 
      this.issueForm.value.remarks
    );
  }

  confirmDirectIssuance(): void {
    this.openConfirmModal();
  }

  printRis(data: any) {
    this.printData = data;
    this.showPrintPreview = true;
  }

  closePrintPreview() {
    this.showPrintPreview = false;
    this.printData = null;
  }

  downloadPDF() {
    const element = document.querySelector('.ris-form-container') as HTMLElement;
    if (!element) return;

    const opt = {
      margin: 0,
      filename: `RIS_${this.printData.risNo || 'Document'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false, 
        letterRendering: true,
        width: element.offsetWidth,
        windowWidth: element.offsetWidth,
        height: element.offsetHeight,
        windowHeight: element.offsetHeight
      },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf().from(element).set(opt).save();
  }

  submitIssuance(itemsToIssue: any[], departmentId: number, fallbackRemarks: string, requestId?: number) {
    if (itemsToIssue.length === 0) return;

    const payload = {
      ris_no: this.issueForm.value.ris_no || this.generatedIssuanceNumber,
      office_id: departmentId,
      transaction_date: new Date().toISOString().split('T')[0],
      remarks: this.issueForm.value.remarks || fallbackRemarks,
      items: itemsToIssue,
      request_id: requestId
    };

    this.isSubmitting = true;
    this.http.post('http://localhost:5000/api/transactions/issue', payload).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.displayToast('Issuance recorded successfully!', 'success');
        
        const newTransactionId = res.transaction_id;

        // Refresh data
        this.fetchRequests();
        this.fetchInventory();
        this.issueQuantities = {};
        this.issueForm.reset({
          issued_by: 'Servillano J. Bajora'
        });

        // Switch to Approved tab and select the new record
        this.activeTab = 'approved';
        this.fetchApprovedRequests(newTransactionId);
      },
      error: (err) => {
        this.isSubmitting = false;
        const errorMsg = err.error?.error || 'Failed to process issuance.';
        this.displayToast(errorMsg, 'error');
      }
    });
  }
}