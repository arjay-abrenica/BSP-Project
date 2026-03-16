import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './catalog.html',
  styleUrls: ['./catalog.css']
})
export class Catalog implements OnInit {
  items: any[] = [];
  filteredItems: any[] = [];
  searchTerm: string = '';

  // Filter Dropdown state
  showFilterDropdown: boolean = false;

  // Available options derived from data
  categories: string[] = [];
  suppliers: string[] = [];

  // Selected filters
  selectedCategory: string = '';
  selectedSupplier: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchItems();
  }

  fetchItems(): void {
    this.http.get<any[]>('http://localhost:5000/api/items').subscribe({
      next: (data) => {
        this.items = data;
        this.filteredItems = data;
        this.extractFilterOptions(data);
      },
      error: (err) => console.error('Failed to fetch items', err)
    });
  }

  extractFilterOptions(data: any[]): void {
    const catSet = new Set<string>();
    const supSet = new Set<string>();

    data.forEach(item => {
      if (item.category_name) catSet.add(item.category_name);
      if (item.supplier_name) supSet.add(item.supplier_name);
    });

    this.categories = Array.from(catSet).sort();
    this.suppliers = Array.from(supSet).sort();
  }

  toggleFilterDropdown(): void {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  onSearch(event?: any): void {
    if (event) {
      this.searchTerm = event.target.value.toLowerCase();
    }
    this.applyFilters();
  }

  applyFilters(): void {
    let result = this.items;

    // Apply Search
    if (this.searchTerm) {
      result = result.filter(item => 
        (item.item_code && item.item_code.toLowerCase().includes(this.searchTerm)) ||
        (item.item_name && item.item_name.toLowerCase().includes(this.searchTerm)) ||
        (item.category_name && item.category_name.toLowerCase().includes(this.searchTerm))
      );
    }

    // Apply Category Filter
    if (this.selectedCategory) {
      result = result.filter(item => item.category_name === this.selectedCategory);
    }

    // Apply Supplier Filter
    if (this.selectedSupplier) {
      result = result.filter(item => item.supplier_name === this.selectedSupplier);
    }

    this.filteredItems = result;
    this.showFilterDropdown = false; // Close dropdown after applying
  }

  clearFilters(): void {
    this.selectedCategory = '';
    this.selectedSupplier = '';
    this.applyFilters();
  }

  getStockStatus(item: any): string {
    const stock = item.current_stock || 0;
    const threshold = item.reorder_level || 10; // Default threshold if null
    
    if (stock === 0) return 'Out of Stock';
    if (stock <= threshold) return 'Low Stock';
    return 'In Stock';
  }

  getStockStatusClass(item: any): string {
    const status = this.getStockStatus(item);
    if (status === 'Out of Stock') return 'status-out';
    if (status === 'Low Stock') return 'status-low';
    return 'status-in';
  }
}
