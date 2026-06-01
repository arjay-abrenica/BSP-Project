import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { PropertyService } from '../../../core/services/property.service';

@Component({
  selector: 'app-iar-encode',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './iar-encode.component.html',
  styleUrls: ['./iar-encode.component.scss']
})
export class IarEncodeComponent implements OnInit {
  // 1. General Information (Header Section)
  entityName: string = 'Boy Scouts of the Philippines';
  fundCluster: string = '';
  supplierName: string = '';
  iarNo: string = '';
  iarDate: string = new Date().toISOString().split('T')[0];
  poPrNo: string = '';
  poPrDate: string = '';
  requisitioningOffice: string = 'PMDD';
  invoiceDrNo: string = '';
  invoiceDate: string = '';
  responsibilityCenterCode: string = '';

  // 3. Inspection & Acceptance (Footer Section)
  inspectionDate: string = '';
  inspectionStatus: string = 'Inspected, verified and found in order';
  inspectedBy: string = 'JERRY B. RUBRICO';
  inspectedByDesignation: string = 'Administrative Officer II';

  receivedDate: string = '';
  acceptanceType: 'Complete' | 'Partial' = 'Complete';
  receivedBy: string = 'ARVINA S. VINUYA';
  receivedByDesignation: string = 'Administrative Officer III';

  // Dropdown Options
  offices = ['OSG', 'OBS', 'ODSG', 'ONP', 'LSO', 'FOD', 'CPSMO', 'ADMIN', 'FINANCE', 'NSS', 'IAO', 'PMDD'];
  units = ['unit', 'pc', 'set', 'lot', 'box', 'roll'];

  // 2. Property & Equipment Details (Line Items)
  items: any[] = [];

  isSubmitting: boolean = false;
  isPreviewModalOpen: boolean = false;

  constructor(private propertyService: PropertyService, private router: Router) { }

  ngOnInit() {
    this.fetchNextIarNo();
    this.addItemRow(); // Start with one empty row
  }

  fetchNextIarNo() {
    this.propertyService.getNextIarNo().subscribe({
      next: (res) => { this.iarNo = res.nextIarNo; },
      error: (err) => console.error('Error fetching IAR No:', err)
    });
  }

  addItemRow() {
    this.items.push({
      property_no: '',
      name: '', // used for description in template
      description: '', // brand/model
      unit: 'unit',
      quantity: 1,
      unit_cost: 0,
      delivery_date: '',
      srp: 0,
      discount: 0,
      total_amount: 0, // Calculated
      net_amount: 0,   // Calculated
      serial_no: '',
      or_number: '',
      rco: 'National Office',
      accountable_officer: ''
    });
  }

  removeItemRow(index: number) {
    if (this.items.length > 1) {
      this.items.splice(index, 1);
    }
  }

  // Auto-Calculations (Frontend Design Recommendation)
  calculateAmounts(item: any) {
    item.total_amount = (item.quantity || 0) * (item.unit_cost || 0);
    item.net_amount = item.total_amount - (item.discount || 0);
  }

  onSubmit() {
    if (!this.supplierName || this.items.some(i => !i.name)) {
      alert('Please fill in all required fields (Supplier and Item Names).');
      return;
    }

    this.isSubmitting = true;
    const payload = {
      fundCluster: this.fundCluster,
      supplierName: this.supplierName,
      poPrNo: this.poPrNo,
      poPrDate: this.poPrDate,
      requisitioningOffice: this.requisitioningOffice,
      responsibilityCenterCode: this.responsibilityCenterCode,
      iarNo: this.iarNo,
      iarDate: this.iarDate,
      invoiceDrNo: this.invoiceDrNo,
      invoiceDate: this.invoiceDate,
      
      inspectionDate: this.inspectionDate,
      inspectedBy: this.inspectedBy,
      inspectedByDesignation: this.inspectedByDesignation,
      inspectionStatus: this.inspectionStatus,
      
      receivedDate: this.receivedDate,
      acceptedBy: this.receivedBy,
      acceptedByDesignation: this.receivedByDesignation,
      acceptanceStatus: this.acceptanceType,
      
      items: this.items
    };

    this.propertyService.createIar(payload).subscribe({
      next: () => {
        alert('IAR encoded and items classified successfully!');
        this.router.navigate(['/property/registry']);
      },
      error: (err) => {
        console.error('Submission error:', err);
        alert('Failed to encode IAR.');
        this.isSubmitting = false;
      }
    });
  }

  printPreview() {
    window.print();
  }

  exportIarToExcel() {
    const payload = {
      entityName: this.entityName,
      fundCluster: this.fundCluster,
      supplierName: this.supplierName,
      iarNo: this.iarNo,
      poPrNo: this.poPrNo,
      poPrDate: this.poPrDate,
      iarDate: this.iarDate,
      requisitioningOffice: this.requisitioningOffice,
      invoiceDrNo: this.invoiceDrNo,
      responsibilityCenterCode: this.responsibilityCenterCode,
      invoiceDate: this.invoiceDate,
      inspectionDate: this.inspectionDate,
      receivedDate: this.receivedDate,
      acceptance_status: this.acceptanceType,
      items: this.items
    };

    this.propertyService.previewIarExcel(payload).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `IAR_Report_${this.iarNo || 'export'}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Excel Export error:', err);
        alert('Failed to export Excel.');
      }
    });
  }
}
