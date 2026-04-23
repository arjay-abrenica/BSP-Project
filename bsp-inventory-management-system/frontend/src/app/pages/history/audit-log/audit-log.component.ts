import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

interface AuditLog {
  log_id: number;
  user_id: number;
  username: string;
  action: string;
  entity: string;
  entity_id: string;
  details: string;
  timestamp: string;
}

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-log.component.html',
  styleUrls: ['./audit-log.component.scss']
})
export class AuditLogComponent implements OnInit {
  isFilterOpen = false;
  auditData: AuditLog[] = [];
  
  filteredData: AuditLog[] = [];
  paginatedData: AuditLog[] = [];

  // Filters
  searchQuery: string = '';
  filters = {
    startDate: '',
    endDate: '',
    action: '',
    username: ''
  };

  // Pagination state
  currentPage: number = 1;
  itemsPerPage: number = 25;
  totalPages: number = 1;
  Math = Math;

  constructor(private http: HttpClient, private authService: AuthService) {}

  get isSuperadmin(): boolean {
    return this.authService.hasRole(['SUPERADMIN']);
  }

  ngOnInit(): void {
    if (this.isSuperadmin) {
      this.fetchAuditLog();
    }
  }

  fetchAuditLog(): void {
    this.http.get<AuditLog[]>('http://localhost:5000/api/history/audit-logs').subscribe({
      next: (data) => {
        this.auditData = data.map(item => ({
          ...item,
          action: item.action === 'EDIT' ? 'UPDATE' : item.action
        }));
        this.applyFilters();
      },
      error: (err) => console.error('Failed to fetch audit log', err)
    });
  }

  get uniqueActions(): string[] {
    return [...new Set(this.auditData.map(item => item.action))].filter(Boolean);
  }

  get uniqueUsers(): string[] {
    return [...new Set(this.auditData.map(item => item.username || 'SYSTEM'))].filter(Boolean);
  }

  applyFilters(): void {
    let temp = this.auditData;

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      temp = temp.filter(item => 
        item.log_id?.toString().includes(q) ||
        item.action?.toLowerCase().includes(q) ||
        item.entity?.toLowerCase().includes(q) ||
        item.details?.toLowerCase().includes(q) ||
        (item.username || 'system').toLowerCase().includes(q)
      );
    }

    if (this.filters.action) {
      temp = temp.filter(item => item.action === this.filters.action);
    }

    if (this.filters.username) {
      temp = temp.filter(item => (item.username || 'SYSTEM') === this.filters.username);
    }

    if (this.filters.startDate && this.filters.endDate) {
      const start = new Date(this.filters.startDate);
      const end = new Date(this.filters.endDate);
      end.setHours(23, 59, 59, 999);
      
      temp = temp.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= start && itemDate <= end;
      });
    }

    this.filteredData = temp;
    this.currentPage = 1;
    this.updatePagination();
  }

  clearFilters(): void {
    this.filters = { startDate: '', endDate: '', action: '', username: '' };
    this.searchQuery = '';
    this.applyFilters();
    this.isFilterOpen = false;
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage) || 1;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedData = this.filteredData.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }
}
