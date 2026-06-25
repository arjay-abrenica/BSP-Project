import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PropertyService } from '../../../core/services/property.service';
import { EmployeeService, Employee } from '../../../core/services/employee.service';

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
  allEmployees: Employee[] = [];
  isLoading: boolean = false;
  today: Date = new Date();

  constructor(private propertyService: PropertyService, private employeeService: EmployeeService) { }

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
    this.employeeService.getAllEmployees().subscribe(data => {
      this.allEmployees = data;
      this.employees = data.map(e => e.full_name).sort();
    });
  }

  onFilterChange() {
    this.loadReport();
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

  printReport() {
    window.print();
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
