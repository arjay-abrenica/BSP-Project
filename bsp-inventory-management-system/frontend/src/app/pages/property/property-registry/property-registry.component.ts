import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

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

  allProperties = [
    { id: 'BSP-PROP-0001', name: 'HP EliteBook 840 G10', description: 'Intel i7, 16GB RAM, 512GB SSD', cost: 65000.00, serial: 'SN-HP840-001', officer: 'Sir Jerry', office: 'PMDD', type: 'PAR', or_no: 'OR-55421', supplier: 'HP Philippines', date: '2026-05-18' },
    { id: 'BSP-PROP-0002', name: 'MacBook Pro M3 14"', description: 'M3 Chip, 16GB, 512GB SSD', cost: 110000.00, serial: 'SN-APL-M3-99', officer: 'Alyssa Mendoza', office: 'OSG', type: 'PAR', or_no: 'OR-88712', supplier: 'Apple PH Authorized', date: '2026-05-15' },
    { id: 'BSP-PROP-0003', name: 'Ergonomic Office Chair', description: 'Mesh high-back, lumbar support', cost: 8500.00, serial: 'SN-CHAIR-102', officer: 'Marnelle Garcia', office: 'FOD', type: 'ICS', or_no: '', supplier: '', date: '2026-05-10' },
    { id: 'BSP-PROP-0004', name: 'Steel Filing Cabinet', description: '4-drawer vertical cabinet', cost: 12500.00, serial: 'SN-CAB-4D', officer: 'Dave Almarinez', office: 'ADMIN', type: 'ICS', or_no: '', supplier: '', date: '2026-05-08' },
    { id: 'BSP-PROP-0005', name: 'Epson EB-X51 Projector', description: '3800 Lumens, HDMI', cost: 28000.00, serial: 'SN-EPS-PRJ-01', officer: 'Shared Meeting Room', office: 'OBS', type: 'ICS', or_no: '', supplier: '', date: '2026-05-02' },
    { id: 'BSP-PROP-0006', name: 'Canon Heavy Duty Copier', description: 'Multi-function network laser', cost: 125000.00, serial: 'SN-CAN-COP-55', officer: 'Admin Copy Room', office: 'ADMIN', type: 'PAR', or_no: 'OR-99120', supplier: 'Canon Marketing', date: '2026-04-28' }
  ];

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

  constructor() { }

  ngOnInit() {
    this.applyFilters();
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
        this.selectedOffice === 'ALL' || prop.office === this.selectedOffice;

      const matchesSearch = 
        !this.searchQuery || 
        prop.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        prop.id.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        prop.serial.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        prop.officer.toLowerCase().includes(this.searchQuery.toLowerCase());

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
    this.selectedPropForForm = prop;
    this.isFormModalOpen = true;
  }

  closeFormModal() {
    this.selectedPropForForm = null;
    this.isFormModalOpen = false;
  }

  printForm() {
    window.print();
  }

  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  clearFilters() {
    this.selectedOffice = 'ALL';
    this.applyFilters();
  }
}
