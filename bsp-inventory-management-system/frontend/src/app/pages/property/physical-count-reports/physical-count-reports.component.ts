import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-physical-count-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './physical-count-reports.component.html',
  styleUrls: ['./physical-count-reports.component.scss']
})
export class PhysicalCountReportsComponent implements OnInit {
  reportType: 'rpcppe' | 'rpcsp' = 'rpcppe';
  selectedEmployee: string = 'ALL';
  selectedOffice: string = 'ALL';

  employees = ['ALL', 'Sir Jerry', 'Alyssa Mendoza', 'Marnelle Garcia', 'Dave Almarinez'];
  offices = ['ALL', 'OSG', 'OBS', 'ODSG', 'ONP', 'LSO', 'FOD', 'CPSMO', 'ADMIN', 'FINANCE', 'NSS', 'IAO', 'PMDD'];

  // Mock compiled list (Note: Supplier name is STRICTLY omitted here for count reports!)
  countRecords = [
    { property_no: 'BSP-PROP-0001', name: 'HP EliteBook 840 G10', description: 'Intel i7, 16GB RAM, 512GB SSD', cost: 65000.00, serial: 'SN-HP840-001', officer: 'Sir Jerry', office: 'PMDD', date: '2026-05-18', condition: 'GOOD', remarks: 'Active utilization' },
    { property_no: 'BSP-PROP-0002', name: 'MacBook Pro M3 14"', description: 'M3 Chip, 16GB, 512GB SSD', cost: 110000.00, serial: 'SN-APL-M3-99', officer: 'Alyssa Mendoza', office: 'OSG', date: '2026-05-15', condition: 'GOOD', remarks: 'Assigned to OSG Exec' },
    { property_no: 'BSP-PROP-0003', name: 'Ergonomic Office Chair', description: 'Mesh high-back, lumbar support', cost: 8500.00, serial: 'SN-CHAIR-102', officer: 'Marnelle Garcia', office: 'FOD', date: '2026-05-10', condition: 'GOOD', remarks: 'Staff desk' },
    { property_no: 'BSP-PROP-0004', name: 'Steel Filing Cabinet', description: '4-drawer vertical cabinet', cost: 12500.00, serial: 'SN-CAB-4D', officer: 'Dave Almarinez', office: 'ADMIN', date: '2026-05-08', condition: 'GOOD', remarks: 'HR filing use' },
    { property_no: 'BSP-PROP-0005', name: 'Epson EB-X51 Projector', description: '3800 Lumens, HDMI', cost: 28000.00, serial: 'SN-EPS-PRJ-01', officer: 'Sir Jerry', office: 'OBS', date: '2026-05-02', condition: 'UNDER_MAINTENANCE', remarks: 'Lamp replacement' },
    { property_no: 'BSP-PROP-0006', name: 'Canon Heavy Duty Copier', description: 'Multi-function network laser', cost: 125000.00, serial: 'SN-CAN-COP-55', officer: 'Sir Jerry', office: 'ADMIN', date: '2026-04-28', condition: 'GOOD', remarks: 'Main copying hub' }
  ];

  filteredRecords: any[] = [];

  constructor() { }

  ngOnInit() {
    this.filterReport();
  }

  setReportType(type: 'rpcppe' | 'rpcsp') {
    this.reportType = type;
    this.filterReport();
  }

  filterReport() {
    this.filteredRecords = this.countRecords.filter(rec => {
      // cost threshold filter
      const matchesThreshold = 
        this.reportType === 'rpcppe' ? rec.cost >= 50000 : rec.cost < 50000;

      const matchesEmployee = 
        this.selectedEmployee === 'ALL' || rec.officer === this.selectedEmployee;

      const matchesOffice = 
        this.selectedOffice === 'ALL' || rec.office === this.selectedOffice;

      return matchesThreshold && matchesEmployee && matchesOffice;
    });
  }

  exportPDF() {
    alert('Mock implementation: Exporting compiled count sheet to PDF!');
  }

  exportExcel() {
    alert('Mock implementation: Exporting compiled count sheet to Excel!');
  }
}
