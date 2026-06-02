import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationService, Notification } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notifications-history',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.scss']
})
export class Notifications implements OnInit {
  notifications: Notification[] = [];
  filteredData: Notification[] = [];
  paginatedData: Notification[] = [];

  // Filters
  searchQuery = '';
  filterType = '';
  filterCategory = '';
  isFilterOpen = false;

  // Pagination state
  currentPage = 1;
  itemsPerPage = 15;
  totalPages = 1;
  Math = Math;

  isLoading = true;

  constructor(
    private notifService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchHistory();
  }

  fetchHistory(): void {
    this.isLoading = true;
    this.notifService.fetchNotificationHistory().subscribe({
      next: (data: Notification[]) => {
        this.notifications = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error fetching notification history', err);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    let temp = [...this.notifications];
    
    if (this.filterType) {
      temp = temp.filter(n => n.type === this.filterType);
    }
    
    if (this.filterCategory) {
      temp = temp.filter(n => {
        const msg = n.message.toLowerCase();
        const isLowStock = msg.includes('low stock');
        const isRequest = msg.includes('request') || msg.includes('ris');
        
        if (this.filterCategory === 'low_stock') return isLowStock;
        if (this.filterCategory === 'request') return isRequest;
        if (this.filterCategory === 'other') return !isLowStock && !isRequest;
        return true;
      });
    }
    
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      temp = temp.filter(n => 
        n.message.toLowerCase().includes(q) || 
        (n.action_label && n.action_label.toLowerCase().includes(q))
      );
    }
    
    this.filteredData = temp;
    this.currentPage = 1;
    this.updatePagination();
  }

  clearFilters(): void {
    this.filterType = '';
    this.filterCategory = '';
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

  toggleFilter(): void {
    this.isFilterOpen = !this.isFilterOpen;
  }

  handleAction(n: Notification): void {
    if (n.action_link) {
      this.router.navigateByUrl(n.action_link);
    }
  }
}
