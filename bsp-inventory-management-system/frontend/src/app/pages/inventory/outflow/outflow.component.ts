import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

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

  // Mock data for requests (Pending tab)
  requests = [
    {
      id: 1, acronym: 'CO', deptCode: 'CPSMO', deptName: 'Corporate Planning and Strategy Management Office',
      itemsCount: 5, date: 'September 20, 2025', reqNumber: 'Req # 2025-05542a', purpose: 'Regular office use',
      items: []
    },
    {
      id: 2, acronym: 'IA', deptCode: 'IAO', deptName: 'Internal Audit Office',
      itemsCount: 8, date: 'September 23, 2025', reqNumber: 'Req # 2025-05562c', purpose: 'Audit fieldwork supplies',
      items: []
    },
    {
      id: 3, acronym: 'SS', deptCode: 'NSS', deptName: 'National Scout Shop',
      itemsCount: 3, date: 'September 29, 2025', reqNumber: 'Req # 2025-45142a', purpose: 'Restocking retail supplies',
      items: []
    },
    {
      id: 4, acronym: 'SG', deptCode: 'OSG', officeName: 'Office of the Secretary General',
      itemsCount: 4, date: 'September 29, 2025', reqNumber: '2025-02956s', reqDisplay: 'Req # 2025-02956s',
      purpose: 'For daily office operations and documentation requirements.',
      department_id: 3,
      items: [
        { item_id: 1, reqQty: 4, unit: 'pcs', description: 'Compatible ink cartridge for HP LaserJet', inStock: 8, issueQty: null },
        { item_id: 2, reqQty: 10, unit: 'reams', description: 'Multipurpose 80gsm white bond paper A4', inStock: 25, issueQty: null },
        { item_id: 3, reqQty: 5, unit: 'pcs', description: 'Heavy-duty metal stapler (desktop)', inStock: 10, issueQty: null },
        { item_id: 4, reqQty: 30, unit: 'box', description: 'Medium tip 0.7mm smooth writing', inStock: 150, issueQty: null }
      ]
    },
    {
      id: 5, acronym: 'PD', deptCode: 'PMDD', deptName: 'Program Management and Development Division',
      itemsCount: 7, date: 'September 30, 2025', reqNumber: 'Req # 2025-08812a', purpose: 'Project management supplies',
      items: []
    }
  ];

  selectedRequest: any = null;

  // Direct Allocation state
  currentDate = 'September 29, 2025';
  generatedIssuanceNumber = '2025-04512p';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.issueForm = this.fb.group({
      ris_no: ['', Validators.required],
      department_id: ['', Validators.required],
      remarks: [''],
      issued_by: ['']
    });
  }

  ngOnInit() {
    this.fetchInventory();
    this.selectRequest(4);
    // Setup initial values for direct allocation
    this.issueForm.patchValue({
      ris_no: this.generatedIssuanceNumber
    });
  }

  setTab(tab: 'pending' | 'approved' | 'direct') {
    this.activeTab = tab;
  }

  selectRequest(id: number) {
    this.selectedRequest = this.requests.find(r => r.id === id);
    if (this.activeTab === 'pending') {
       this.issueForm.patchValue({
         ris_no: '',
         remarks: '',
         issued_by: ''
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

    this.submitIssuance(itemsToIssue, this.selectedRequest.department_id || 1, this.selectedRequest.purpose);
  }

  proceedDirectAllocation(): void {
    // Used for Direct Allocation tab
    if (this.issueForm.get('department_id')?.invalid) {
      this.issueForm.get('department_id')?.markAsTouched();
      alert('Please select a Recipient Office.');
      return;
    }

    const itemsToIssue = Object.keys(this.issueQuantities).map(key => ({
      item_id: parseInt(key, 10),
      quantity: this.issueQuantities[parseInt(key, 10)]
    }));

    if (itemsToIssue.length === 0) {
      alert('Please specify a quantity to issue for at least one item.');
      return;
    }

    this.submitIssuance(itemsToIssue, this.issueForm.value.department_id, this.issueForm.value.remarks);
  }

  submitIssuance(itemsToIssue: any[], departmentId: number, fallbackRemarks: string) {
    if (itemsToIssue.length === 0) return;

    const payload = {
      ris_no: this.issueForm.value.ris_no || this.generatedIssuanceNumber,
      department_id: departmentId,
      transaction_date: new Date().toISOString().split('T')[0],
      remarks: this.issueForm.value.remarks || fallbackRemarks,
      items: itemsToIssue
    };

    this.isSubmitting = true;
    this.http.post('http://localhost:5000/api/transactions/issue', payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        alert('Issuance recorded successfully!');
        this.router.navigate(['/inventory/catalog']);
      },
      error: (err) => {
        this.isSubmitting = false;
        const errorMsg = err.error?.error || 'Failed to process issuance.';
        alert(errorMsg);
      }
    });
  }
}