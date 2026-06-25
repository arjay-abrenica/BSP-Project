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
  reportType: string = 'ALL';
  allEmployees: Employee[] = [];

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
        this.allEmployees = data;
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

  parseAttributes(attributes: any): any[] {
    if (!attributes) return [];
    if (typeof attributes === 'string') {
      try {
        return JSON.parse(attributes);
      } catch (e) {
        return [];
      }
    }
    return Array.isArray(attributes) ? attributes : [];
  }

  getPreparedBy(): { name: string, designation: string } {
    if (this.selectedEmployee && this.selectedEmployee !== 'ALL') {
      const emp = this.allEmployees.find(e => e.full_name.toUpperCase() === this.selectedEmployee.toUpperCase());
      return {
        name: this.selectedEmployee.toUpperCase(),
        designation: emp?.designation || 'Signature over Printed Name'
      };
    } else {
      const cust = this.allEmployees.find(e => e.full_name.toLowerCase().includes('rubrico') || e.designation.toLowerCase().includes('custodian'));
      return {
        name: cust?.full_name.toUpperCase() || 'JERRY B. RUBRICO',
        designation: cust?.designation || 'Acting Property Custodian'
      };
    }
  }

  getCertifiedCorrect(): { name: string, designation: string } {
    const cust = this.allEmployees.find(e => e.full_name.toLowerCase().includes('rubrico') || e.designation.toLowerCase().includes('custodian'));
    const prepared = this.getPreparedBy();
    
    if (prepared.name === (cust?.full_name.toUpperCase() || 'JERRY B. RUBRICO')) {
      const cert = this.allEmployees.find(e => e.full_name.toLowerCase().includes('vinuya') || e.full_name.toLowerCase().includes('arvina'));
      return {
        name: cert?.full_name.toUpperCase() || 'ARVINA S. VINUYA',
        designation: cert?.designation || 'Administrative Officer III'
      };
    } else {
      return {
        name: cust?.full_name.toUpperCase() || 'JERRY B. RUBRICO',
        designation: cust?.designation || 'Acting Property Custodian'
      };
    }
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
        const filename = this.reportType === 'ALL' ? 'Physical_Count_Report' : `${this.reportType}_Report`;
        a.download = `${filename}_${this.selectedEmployee}.xlsx`;
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
