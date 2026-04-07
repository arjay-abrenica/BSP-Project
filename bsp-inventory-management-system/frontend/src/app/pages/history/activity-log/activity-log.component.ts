import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

interface ActivityLog {
  activityLogId: string;
  timestamp: string;
  office: string;
  role: string;
  activity: string;
  details: string;
}

@Component({
  selector: 'app-activity-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-log.component.html',
  styleUrls: ['./activity-log.component.scss']
})
export class ActivityLogComponent implements OnInit {
  isFilterOpen = false;
  activityData: ActivityLog[] = [];
  
  filteredData: ActivityLog[] = [];
  paginatedData: ActivityLog[] = [];

  // Filters
  searchQuery: string = '';
  filters = {
    startDate: '',
    endDate: '',
    office: '',
    role: ''
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
    this.fetchActivityLog();
  }

  fetchActivityLog(): void {
    this.http.get<ActivityLog[]>('http://localhost:5000/api/history/activity').subscribe({
      next: (data) => {
        this.activityData = data;
        this.applyFilters();
      },
      error: (err) => console.error('Failed to fetch activity log', err)
    });
  }

  get uniqueOffices(): string[] {
    return [...new Set(this.activityData.map(item => item.office))].filter(Boolean);
  }

  get uniqueRoles(): string[] {
    return [...new Set(this.activityData.map(item => item.role))].filter(Boolean);
  }

  applyFilters(): void {
    let temp = this.activityData;

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      temp = temp.filter(item => 
        item.activityLogId?.toLowerCase().includes(q) ||
        item.activity?.toLowerCase().includes(q) ||
        item.details?.toLowerCase().includes(q) ||
        item.office?.toLowerCase().includes(q)
      );
    }

    if (this.filters.office) {
      temp = temp.filter(item => item.office === this.filters.office);
    }

    if (this.filters.role) {
      temp = temp.filter(item => item.role === this.filters.role);
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
    this.filters = { startDate: '', endDate: '', office: '', role: '' };
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
