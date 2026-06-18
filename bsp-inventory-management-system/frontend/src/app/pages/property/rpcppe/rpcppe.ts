import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PropertyService } from '../../../core/services/property.service';
import { EmployeeService, Employee } from '../../../core/services/employee.service';

@Component({
  selector: 'app-rpcppe',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rpcppe.html',
  styleUrls: ['./rpcppe.scss']
})
export class Rpcppe implements OnInit {
  isLoading = false;
  reportData: any[] = [];
  employees: string[] = [];
  selectedEmployee: string = 'ALL';
  asOfDate: string = new Date().toISOString().split('T')[0];
  today = new Date();
  reportType: string = 'RPCPPE';

  constructor(
    private propertyService: PropertyService,
    private employeeService: EmployeeService
  ) {}

  ngOnInit() {
    this.loadEmployees();
    this.loadReport();
  }

  loadEmployees() {
    this.employeeService.getAllEmployees().subscribe({
      next: (data: Employee[]) => {
        this.employees = data.map(e => e.full_name).sort();
      },
      error: (err: any) => console.error('Failed to load employees', err)
    });
  }

  loadReport() {
    this.isLoading = true;
    this.propertyService.getPhysicalCountReports(this.reportType, this.selectedEmployee, this.asOfDate).subscribe({
      next: (data: any[]) => {
        this.isLoading = false;
        this.reportData = data;
        // Also update 'today' just to reflect the selected date in the PDF header
        this.today = new Date(this.asOfDate);
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('Failed to load RPCPPE report', err);
      }
    });
  }

  onFilterChange() {
    this.loadReport();
  }

  getFilteredData() {
    return this.reportData;
  }

  exportToExcel() {
    if (!this.reportData || this.reportData.length === 0) {
      alert('No data to export.');
      return;
    }
    
    this.propertyService.downloadPhysicalCountExcel(this.reportType, this.selectedEmployee, this.asOfDate).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.reportType}_Report_${this.selectedEmployee}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        console.error('Excel export failed', err);
        alert('Failed to download Excel report.');
      }
    });
  }

  printReport() {
    window.print();
  }
}
