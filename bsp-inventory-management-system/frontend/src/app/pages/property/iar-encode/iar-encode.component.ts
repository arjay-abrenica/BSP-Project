import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { PropertyService } from '../../../core/services/property.service';
import { EmployeeService, Employee } from '../../../core/services/employee.service';

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
  receivedBy: string = '';
  receivedByDesignation: string = '';
  receivedByDivision: string = '';

  // Dropdown Options
  offices = ['OSG', 'OBS', 'ODSG', 'ONP', 'LSO', 'FOD', 'CPSMO', 'ADMIN', 'FINANCE', 'NSS', 'IAO', 'PMDD'];
  units = ['unit', 'pc', 'set', 'lot', 'box', 'roll'];
  employees: Employee[] = [];
  filteredOffices: string[][] = [];
  filteredUnits: string[][] = [];
  filteredEmployees: Employee[][] = [];
  activeDropdownType: 'unit' | 'office' | 'employee' | null = null;
  activeDropdownIndex: number | null = null;
  dropdownPosition = { top: '0px', left: '0px', width: '0px' };

  // 2. Property & Equipment Details (Line Items)
  items: any[] = [];

  isSubmitting: boolean = false;
  isPreviewModalOpen: boolean = false;

  // Formula Bar & Spreadsheet Interaction State
  activeCell: string = 'B2';
  activeCellName: string = 'Entity Name';
  activeCellValue: string = 'Boy Scouts of the Philippines';
  activeModelKey: string = 'entityName';
  activeItemIndex: number | null = null;
  activeItemKey: string = '';

  constructor(private propertyService: PropertyService, private router: Router, private employeeService: EmployeeService) { }

  onCellFocus(cellId: string, name: string, modelKey: string, itemIndex: number | null = null, itemKey: string = '') {
    this.activeCell = cellId;
    this.activeCellName = name;
    this.activeModelKey = modelKey;
    this.activeItemIndex = itemIndex;
    this.activeItemKey = itemKey;
    this.activeCellValue = this.getFormulaBarValue();
  }

  getFormulaBarValue(): string {
    if (this.activeModelKey) {
      if (this.activeItemIndex !== null && this.activeItemKey) {
        return this.items[this.activeItemIndex][this.activeItemKey] || '';
      }
      return (this as any)[this.activeModelKey] || '';
    }
    return '';
  }

  setFormulaBarValue(val: any) {
    if (this.activeModelKey) {
      if (this.activeItemIndex !== null && this.activeItemKey) {
        this.items[this.activeItemIndex][this.activeItemKey] = val;
        if (['quantity', 'unit_cost', 'discount'].includes(this.activeItemKey)) {
          this.calculateAmounts(this.items[this.activeItemIndex]);
        }
      } else {
        (this as any)[this.activeModelKey] = val;
      }
    }
  }

  onGridInputChange(item?: any, key?: string) {
    this.activeCellValue = this.getFormulaBarValue();
    if (item && key && ['quantity', 'unit_cost', 'discount'].includes(key)) {
      this.calculateAmounts(item);
    }
  }

  resetForm() {
    if (confirm('Are you sure you want to reset the form? All unsaved data will be lost.')) {
      this.entityName = 'Boy Scouts of the Philippines';
      this.fundCluster = '';
      this.supplierName = '';
      this.fetchNextIarNo();
      this.iarDate = new Date().toISOString().split('T')[0];
      this.poPrNo = '';
      this.poPrDate = '';
      this.requisitioningOffice = 'PMDD';
      this.invoiceDrNo = '';
      this.invoiceDate = '';
      this.responsibilityCenterCode = '';
      this.inspectionDate = '';
      this.inspectionStatus = 'Inspected, verified and found in order';
      this.inspectedBy = 'JERRY B. RUBRICO';
      this.inspectedByDesignation = 'Administrative Officer II';
      this.receivedDate = '';
      this.acceptanceType = 'Complete';
      this.receivedBy = '';
      this.receivedByDesignation = '';
      this.receivedByDivision = '';
      this.items = [];
      this.addItemRow();
      this.onCellFocus('B2', 'Entity Name', 'entityName');
    }
  }

  scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update visual active tab state by class manipulation
      document.querySelectorAll('.sheet-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent?.toLowerCase().includes(id.replace('sheet-', ''))) {
          tab.classList.add('active');
        } else if (id === 'sheet-general' && tab.textContent?.toLowerCase().includes('general')) {
          tab.classList.add('active');
        } else if (id === 'sheet-items' && tab.textContent?.toLowerCase().includes('property')) {
          tab.classList.add('active');
        } else if (id === 'sheet-signatures' && tab.textContent?.toLowerCase().includes('inspection')) {
          tab.classList.add('active');
        }
      });
    }
  }

  ngOnInit() {
    this.fetchNextIarNo();
    this.loadEmployees();
    this.addItemRow(); // Start with one empty row
  }

  loadEmployees() {
    this.employeeService.getAllEmployees().subscribe({
      next: (data) => this.employees = data,
      error: (err) => console.error('Error loading employees:', err)
    });
  }

  onInspectorChange() {
    const emp = this.employees.find(e => e.full_name === this.inspectedBy);
    if (emp) {
      this.inspectedByDesignation = emp.designation || '';
    }
  }

  onReceiverChange() {
    const emp = this.employees.find(e => e.full_name === this.receivedBy);
    if (emp) {
      this.receivedByDesignation = emp.designation || '';
      // Assume office mapping if needed, or leave it blank/default
    }
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
      unit: '',
      quantity: null,
      unit_cost: null,
      delivery_date: '',
      srp: null,
      discount: null,
      total_amount: 0, // Calculated
      net_amount: 0,   // Calculated
      serial_no: '',
      or_number: '',
      rco: '',
      accountable_officer: '',
      estimated_useful_life: '',
      receiver_designation: '',
      issuer_name: 'JERRY B. RUBRICO',
      issuer_designation: 'Administrative Officer II',
      issuer_office: 'Administration Division',
      attributes: []
    });
  }

  addAttribute(itemIndex: number) {
    if (!this.items[itemIndex].attributes) {
      this.items[itemIndex].attributes = [];
    }
    this.items[itemIndex].attributes.push({ label: '', value: '' });
  }

  removeAttribute(itemIndex: number, attrIndex: number) {
    this.items[itemIndex].attributes.splice(attrIndex, 1);
  }

  trackByItem(index: number, item: any) {
    return index;
  }

  trackByAttr(index: number, attr: any) {
    return `attr_${index}`;
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
      acceptedByDivision: this.receivedByDivision,
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
      acceptedByDivision: this.receivedByDivision,
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

  openDropdown(event: FocusEvent, type: 'unit' | 'office' | 'employee', idx: number) {
    const inputEl = event.target as HTMLElement;
    if (inputEl) {
      const rect = inputEl.getBoundingClientRect();
      this.dropdownPosition = {
        top: `${rect.bottom}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`
      };
      this.activeDropdownType = type;
      this.activeDropdownIndex = idx;
      
      // Filter recommendations initially
      if (type === 'unit') this.filterUnits(this.items[idx].unit, idx);
      if (type === 'office') this.filterOffices(this.items[idx].rco, idx);
      if (type === 'employee') this.filterEmployees(this.items[idx].accountable_officer, idx);
    }
  }

  closeDropdown() {
    setTimeout(() => {
      this.activeDropdownType = null;
      this.activeDropdownIndex = null;
    }, 200);
  }

  onDropdownInput(val: string) {
    if (this.activeDropdownType === 'unit' && this.activeDropdownIndex !== null) {
      this.filterUnits(val, this.activeDropdownIndex);
    }
    if (this.activeDropdownType === 'office' && this.activeDropdownIndex !== null) {
      this.filterOffices(val, this.activeDropdownIndex);
    }
    if (this.activeDropdownType === 'employee' && this.activeDropdownIndex !== null) {
      this.filterEmployees(val, this.activeDropdownIndex);
    }
  }

  selectUnit(idx: number, unit: string) {
    if (this.items[idx]) {
      this.items[idx].unit = unit;
      this.onGridInputChange();
    }
  }

  filterUnits(query: string, idx: number) {
    if (!query) {
      this.filteredUnits[idx] = this.units;
    } else {
      const q = query.toLowerCase();
      this.filteredUnits[idx] = this.units.filter(u => u.toLowerCase().includes(q));
    }
  }

  selectOffice(idx: number, office: string) {
    if (this.items[idx]) {
      this.items[idx].rco = office;
      this.onGridInputChange();
    }
  }

  filterOffices(query: string, idx: number) {
    if (!query) {
      this.filteredOffices[idx] = this.offices;
    } else {
      const q = query.toLowerCase();
      this.filteredOffices[idx] = this.offices.filter(off => off.toLowerCase().includes(q));
    }
  }

  selectEmployee(idx: number, empName: string, empDesignation: string) {
    if (this.items[idx]) {
      this.items[idx].accountable_officer = empName;
      if (empDesignation) {
        this.items[idx].receiver_designation = empDesignation;
      }
      this.onGridInputChange();
    }
  }

  filterEmployees(query: string, idx: number) {
    if (!query) {
      this.filteredEmployees[idx] = this.employees;
    } else {
      const q = query.toLowerCase();
      this.filteredEmployees[idx] = this.employees.filter(emp =>
        (emp.full_name || '').toLowerCase().includes(q) ||
        (emp.designation || '').toLowerCase().includes(q)
      );
    }
  }
}
