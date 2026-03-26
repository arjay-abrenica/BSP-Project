import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-request-supplies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './request-supplies.html',
  styleUrls: ['./request-supplies.scss']
})
export class RequestSupplies implements OnInit {
  items: any[] = [];
  searchQuery: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchInventory();
  }

  fetchInventory() {
    this.http.get<any[]>('http://localhost:5000/api/items').subscribe({
      next: (data) => {
        // Initialize requestQuantity field for each item
        this.items = data.map(item => ({ ...item, requestQuantity: null }));
      },
      error: (err) => console.error('Failed to load inventory', err)
    });
  }

  get filteredItems() {
    if (!this.searchQuery) return this.items;
    return this.items.filter(item => 
      item.item_name?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      item.category_name?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      item.item_code?.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  submitRequest(item: any) {
    if (!item.requestQuantity || item.requestQuantity <= 0) {
      alert('Please enter a valid request quantity greater than 0.');
      return;
    }
    
    if (item.requestQuantity > item.current_stock) {
      const confirmExceed = confirm(`Caution: You are requesting more (${item.requestQuantity}) than the available current stock (${item.current_stock}). Proceed anyway?`);
      if (!confirmExceed) return;
    }

    // Template Action: Just mock a success alert
    alert(`Successfully requested ${item.requestQuantity} unit(s) of [${item.item_code}] ${item.item_name}.`);
    
    // Clear input
    item.requestQuantity = null;
  }
}
