import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PropertyService } from '../../../core/services/property.service';

@Component({
  selector: 'app-property-registry',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './property-registry.component.html',
  styleUrls: ['./property-registry.component.scss']
})
export class PropertyRegistryComponent implements OnInit {
  activeTab: 'all' | 'par' | 'ics' = 'all';
  searchQuery: string = '';
  selectedOffice: string = 'ALL';
  showFilterDropdown: boolean = false;

  offices = ['ALL', 'OSG', 'OBS', 'ODSG', 'ONP', 'LSO', 'FOD', 'CPSMO', 'ADMIN', 'FINANCE', 'NSS', 'IAO', 'PMDD'];

  allProperties: any[] = [];
  filteredProperties: any[] = [];
  paginatedProperties: any[] = [];

  // Pagination state
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  Math = Math; // Make Math available to template

  // Form View Modal for printing layouts
  selectedPropForForm: any = null;
  isFormModalOpen: boolean = false;

  isTransferModalOpen: boolean = false;
  propToTransfer: any = null;
  transferData = { toOfficer: '', reason: '' };
  isSubmittingTransfer: boolean = false;

  isEditModalOpen: boolean = false;
  selectedPropForEdit: any = null;
  editData: any = {};
  isSubmittingEdit: boolean = false;
  activeEditCell: string = '';

  constructor(private propertyService: PropertyService) { }

  ngOnInit() {
    this.loadProperties();
  }

  loadProperties() {
    this.propertyService.getAllProperties().subscribe({
      next: (data) => {
        this.allProperties = data;
        this.applyFilters();
      },
      error: (err) => console.error('Error loading properties:', err)
    });
  }

  setTab(tab: 'all' | 'par' | 'ics') {
    this.activeTab = tab;
    this.applyFilters();
  }

  applyFilters() {
    this.filteredProperties = this.allProperties.filter(prop => {
      const matchesTab = 
        this.activeTab === 'all' || 
        (this.activeTab === 'par' && prop.type === 'PAR') || 
        (this.activeTab === 'ics' && prop.type === 'ICS');

      const matchesOffice = 
        this.selectedOffice === 'ALL' || prop.rco === this.selectedOffice;

      const matchesSearch = 
        !this.searchQuery || 
        prop.item_name?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        prop.property_no?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        prop.serial_no?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        prop.accountable_officer?.toLowerCase().includes(this.searchQuery.toLowerCase());

      return matchesTab && matchesOffice && matchesSearch;
    });
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredProperties.length / this.itemsPerPage) || 1;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedProperties = this.filteredProperties.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  viewForm(prop: any) {
    this.propertyService.getPropertyDetails(prop.property_id).subscribe(data => {
        this.selectedPropForForm = data.property;
        this.isFormModalOpen = true;
    });
  }

  closeFormModal() {
    this.selectedPropForForm = null;
    this.isFormModalOpen = false;
  }

  downloadExcelForm() {
    if(!this.selectedPropForForm) return;
    const isPAR = this.selectedPropForForm.type === 'PAR';
    const id = this.selectedPropForForm.property_id;
    const propNo = this.selectedPropForForm.property_no;

    const request = isPAR 
      ? this.propertyService.downloadParExcel(id) 
      : this.propertyService.downloadIcsExcel(id);
      
    request.subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${isPAR ? 'PAR' : 'ICS'}_${propNo}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Excel download failed', err);
        alert(`Failed to download ${isPAR ? 'PAR' : 'ICS'} document.`);
      }
    });
  }

  printForm() {
    window.print();
  }

  openTransferModal(prop: any) {
    this.propToTransfer = prop;
    this.transferData = { toOfficer: '', reason: '' };
    this.isTransferModalOpen = true;
  }

  submitTransfer() {
    if(!this.transferData.toOfficer) {
       alert("Please enter the new Accountable Officer.");
       return;
    }
    this.isSubmittingTransfer = true;
    const payload = {
       propertyId: this.propToTransfer.property_id,
       ptrNo: `PTR-${new Date().getFullYear()}-${Math.floor(Math.random()*10000)}`,
       transferDate: new Date().toISOString().split('T')[0],
       transferType: 'Reassignment',
       fromOfficer: this.propToTransfer.accountable_officer,
       toOfficer: this.transferData.toOfficer,
       reason: this.transferData.reason
    };

    this.propertyService.createPropertyTransfer(payload).subscribe({
      next: (res) => {
        alert('Transfer completed successfully! Downloading PTR...');
        this.downloadPtrExcel(res.transferId, this.propToTransfer.property_no);
        this.isSubmittingTransfer = false;
        this.isTransferModalOpen = false;
        this.loadProperties();
      },
      error: (err) => {
        console.error('Property transfer failed:', err);
        alert('Failed to submit property transfer.');
        this.isSubmittingTransfer = false;
      }
    });
  }

  downloadPtrExcel(id: number, propNo: string) {
     // I will append this to the property.service.ts
     this.propertyService.downloadPtrExcel(id).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `PTR_${propNo}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
           console.error(err);
           alert("PTR download failed.");
        }
     });
  }

  openEditModal(prop: any) {
    this.selectedPropForEdit = prop;
    this.activeEditCell = '';
    let formattedDate = '';
    if (prop.delivery_date) {
      try {
        formattedDate = new Date(prop.delivery_date).toISOString().split('T')[0];
      } catch (e) {
        formattedDate = prop.delivery_date;
      }
    }
    
    this.editData = {
      property_no: prop.property_no,
      item_name: prop.item_name,
      description: prop.description,
      serial_no: prop.serial_no,
      unit_cost: prop.unit_cost,
      accountable_officer: prop.accountable_officer,
      receiver_designation: prop.receiver_designation,
      rco: prop.rco || 'National Office',
      delivery_date: formattedDate,
      estimated_useful_life: prop.estimated_useful_life,
      condition: prop.condition || 'GOOD',
      status: prop.status || 'ACTIVE',
      issuer_name: prop.issuer_name || 'JERRY B. RUBRICO',
      issuer_designation: prop.issuer_designation,
      issuer_office: prop.issuer_office
    };
    
    this.isFormModalOpen = false;
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.selectedPropForEdit = null;
    this.editData = {};
    this.activeEditCell = '';
    this.isEditModalOpen = false;
  }

  submitEdit() {
    if (!this.editData.property_no || !this.editData.item_name || !this.editData.accountable_officer) {
      alert("Please fill in all required fields (Property No, Asset Name, Accountable Officer).");
      return;
    }
    this.isSubmittingEdit = true;
    
    this.propertyService.updateProperty(this.selectedPropForEdit.property_id, this.editData).subscribe({
      next: (res) => {
        alert("Equipment details updated successfully!");
        this.isSubmittingEdit = false;
        this.closeEditModal();
        this.loadProperties();
      },
      error: (err) => {
        console.error("Failed to update equipment details:", err);
        alert("Failed to update equipment details.");
        this.isSubmittingEdit = false;
      }
    });
  }

  getFormulaBarValue(): string {
    if (!this.activeEditCell) return '';
    switch (this.activeEditCell) {
      case 'B2': return this.editData.property_no ? `[Property No] = ${this.editData.property_no}` : '';
      case 'F2': return this.editData.item_name ? `[Asset Name] = ${this.editData.item_name}` : '';
      case 'B3': return this.editData.serial_no ? `[Serial No] = ${this.editData.serial_no}` : 'N/A';
      case 'F3': return this.editData.unit_cost !== undefined ? `[Unit Cost] = ₱${this.editData.unit_cost}` : '';
      case 'B4': return this.editData.description ? `[Description] = ${this.editData.description}` : '';
      case 'B5': return this.editData.condition ? `[Condition] = ${this.editData.condition}` : '';
      case 'F5': return this.editData.status ? `[Status] = ${this.editData.status}` : '';
      case 'B6': return this.editData.delivery_date ? `[Delivery Date] = ${this.editData.delivery_date}` : '';
      case 'F6': return this.editData.estimated_useful_life ? `[Useful Life] = ${this.editData.estimated_useful_life}` : '';
      case 'B8': return this.editData.accountable_officer ? `[Accountable Officer] = ${this.editData.accountable_officer}` : '';
      case 'F8': return this.editData.rco ? `[Custodian Office] = ${this.editData.rco}` : '';
      case 'B9': return this.editData.receiver_designation ? `[Receiver Designation] = ${this.editData.receiver_designation}` : '';
      case 'B11': return this.editData.issuer_name ? `[Issuer Name] = ${this.editData.issuer_name}` : '';
      case 'F11': return this.editData.issuer_designation ? `[Issuer Designation] = ${this.editData.issuer_designation}` : '';
      case 'B12': return this.editData.issuer_office ? `[Issuer Office] = ${this.editData.issuer_office}` : '';
      default: return '';
    }
  }

  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  clearFilters() {
    this.selectedOffice = 'ALL';
    this.applyFilters();
  }

  getCountByType(type: 'PAR' | 'ICS'): number {
    return this.allProperties.filter(p => p.type === type).length;
  }
}
