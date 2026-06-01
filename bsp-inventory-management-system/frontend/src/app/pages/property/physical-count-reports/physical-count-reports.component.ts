import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PropertyService } from '../../../core/services/property.service';

@Component({
  selector: 'app-physical-count-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './physical-count-reports.component.html',
  styleUrls: ['./physical-count-reports.component.scss']
})
export class PhysicalCountReportsComponent implements OnInit {
  // Filters
  reportType: 'RPCPPE' | 'RPCSP' = 'RPCPPE';
  selectedEmployee: string = 'ALL';
  employees: string[] = [];

  // Data
  reportData: any[] = [];
  isLoading: boolean = false;
  today: Date = new Date();

  constructor(private propertyService: PropertyService) { }

  ngOnInit() {
    this.loadReport();
    this.loadEmployees();
  }

  loadReport() {
    this.isLoading = true;
    this.propertyService.getPhysicalCountReports(this.reportType, this.selectedEmployee).subscribe({
      next: (data) => {
        this.reportData = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading report:', err);
        this.isLoading = false;
      }
    });
  }

  loadEmployees() {
    // In a real app, this would fetch unique accountable_officer names
    this.propertyService.getAllProperties().subscribe(props => {
      const names = props.map(p => p.accountable_officer);
      this.employees = Array.from(new Set(names)).filter(n => !!n);
    });
  }

  onFilterChange() {
    this.loadReport();
  }

  printReport() {
    window.print();
  }

  exportToExcel() {
    if (!this.reportData || this.reportData.length === 0) {
      alert('No data to export.');
      return;
    }
    
    this.propertyService.downloadPhysicalCountExcel(this.reportType, this.selectedEmployee).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.reportType}_Report_${this.selectedEmployee}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Excel export failed', err);
        alert('Failed to download Excel report.');
      }
    });
  }
}
