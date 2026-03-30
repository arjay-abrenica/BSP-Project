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
  offices: any[] = [];

  // Requests state
  requests: any[] = [];
  approvedRequests: any[] = [];
  approvedOffices: any[] = [];
  selectedApprovedOfficeId: number = -1;
  officeTransactions: any[] = [];
  selectedRequest: any = null;
  searchQuery: string = '';
  
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
      },
      error: (err) => console.error('Failed to fetch inventory', err)
    });
  }

  onSearch(event: any) {
    const query = event.target.value.toLowerCase();
    this.filteredItems = this.inventoryItems.filter(item => 
      (item.item_name && item.item_name.toLowerCase().includes(query)) ||
      (item.item_code && item.item_code.toLowerCase().includes(query)) ||
      (item.category_name && item.category_name.toLowerCase().includes(query))
    );
  }

  onQuantityChange(item: any, event: any) {
    const qty = parseInt(event.target.value, 10);
    if (qty > 0) {
      if (qty > item.current_stock) {
        alert(`Cannot issue more than current stock (${item.current_stock}) for ${item.item_name}`);
        event.target.value = item.current_stock;
        this.issueQuantities[item.item_id] = item.current_stock;
      } else {
        this.issueQuantities[item.item_id] = qty;
      }
    } else {
      delete this.issueQuantities[item.item_id];
      event.target.value = '';
    }
  }

  getQty(itemId: number): number | string {
    return this.issueQuantities[itemId] || '';
  }

  clearRemarks() {
    this.issueForm.get('remarks')?.setValue('');
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
      alert('Please fill out the required RIS Number before approving.');
      return;
    }

    const itemsToIssue = this.selectedRequest.items
      .filter((item: any) => item.issueQty && item.issueQty > 0)
      .map((item: any) => ({
        item_id: item.item_id,
        quantity: item.issueQty
      }));

    if (itemsToIssue.length === 0) {
      alert('Please specify a quantity to issue for at least one item.');
      return;
    }

    this.submitIssuance(itemsToIssue, this.selectedRequest.department_id || 1, this.selectedRequest.purpose, this.selectedRequest.id);
  }

  rejectRequest(): void {
    if (!this.selectedRequest) return;
    
    if (confirm(`Are you sure you want to REJECT request ${this.selectedRequest.reqNumber}?`)) {
      this.isSubmitting = true;
      this.http.put(`http://localhost:5000/api/requests/${this.selectedRequest.id}/reject`, {}).subscribe({
        next: () => {
          this.isSubmitting = false;
          alert('Request rejected.');
          this.fetchRequests();
          this.selectedRequest = null;
        },
        error: (err) => {
          this.isSubmitting = false;
          alert('Failed to reject request: ' + (err.error?.error || 'Unknown error'));
        }
      });
    }
  }

  proceedDirectAllocation(): void {
    if (this.stagedIssuances.length === 0) {
      alert('Your cart is empty. Please add at least one issuance first.');
      return;
    }

    if (confirm(`Are you sure you want to proceed with ${this.stagedIssuances.length} issuance(s)?`)) {
      this.isSubmitting = true;
      this.saveStagedSequentially(0);
    }
  }

  saveStagedSequentially(index: number) {
    if (index >= this.stagedIssuances.length) {
      this.isSubmitting = false;
      alert('All issuances recorded successfully!');
      this.stagedIssuances = [];
      this.activeTab = 'approved';
      this.fetchApprovedRequests();
      this.fetchInventory();
      return;
    }

    const staged = this.stagedIssuances[index];
    const payload = {
      ris_no: staged.ris_no,
      office_id: staged.office_id,
      transaction_date: new Date().toISOString().split('T')[0],
      remarks: staged.remarks,
      items: staged.items
    };

    this.http.post('http://localhost:5000/api/transactions/issue', payload).subscribe({
      next: () => this.saveStagedSequentially(index + 1),
      error: (err) => {
        this.isSubmitting = false;
        alert(`Failed at issuance #${index + 1}: ${err.error?.error || 'Unknown error'}`);
      }
    });
  }

  addToCart(): void {
    if (this.issueForm.get('department_id')?.invalid) {
      this.issueForm.get('department_id')?.markAsTouched();
      alert('Please select a Recipient Office.');
      return;
    }

    const officeId = Number(this.issueForm.value.department_id);
    const itemsToIssue = Object.keys(this.issueQuantities).map(key => {
      const itemId = parseInt(key, 10);
      const item = this.inventoryItems.find(i => i.item_id === itemId);
      return {
        item_id: itemId,
        item_name: item ? item.item_name : 'Unknown Item',
        quantity: this.issueQuantities[itemId]
      };
    });

    if (itemsToIssue.length === 0) {
      alert('Please specify a quantity for at least one item.');
      return;
    }

    const office = this.offices.find(o => o.office_id == officeId);
    console.log('Adding to cart for office:', office);

    const newStaged = {
      ris_no: this.generatedIssuanceNumber,
      office_id: officeId,
      office_name: office ? office.office_name : 'Unknown Office',
      acronym: office ? office.acronym : '??',
      remarks: this.issueForm.value.remarks,
      items: itemsToIssue,
      itemsCount: itemsToIssue.length,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };

    this.stagedIssuances.push(newStaged);
    this.startNewIssuance(); // Clear form for next issuance
  }

  removeFromCart(index: number, event: Event) {
    event.stopPropagation();
    this.stagedIssuances.splice(index, 1);
    if (this.selectedStagedIndex === index) {
      this.selectedStagedIndex = -1;
    }
  }

  selectStaged(index: number) {
    this.selectedStagedIndex = index;
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
        alert('Issuance recorded successfully!');
        
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
        alert(errorMsg);
      }
    });
  }
}