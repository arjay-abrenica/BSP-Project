import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PropertyService } from '../../../core/services/property.service';

@Component({
  selector: 'app-sticker-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sticker-generator.component.html',
  styleUrls: ['./sticker-generator.component.scss']
})
export class StickerGeneratorComponent implements OnInit {
  searchQuery: string = '';
  properties: any[] = [];
  selectedProperties: any[] = [];
  
  constructor(private propertyService: PropertyService) { }

  ngOnInit() {
    this.loadProperties();
  }

  loadProperties() {
    this.propertyService.getAllProperties().subscribe(data => {
      this.properties = data;
    });
  }

  get filteredProperties() {
    if (!this.searchQuery) return this.properties;
    const query = this.searchQuery.toLowerCase();
    return this.properties.filter(p => 
      p.property_no?.toLowerCase().includes(query) || 
      p.item_name?.toLowerCase().includes(query)
    );
  }

  toggleSelection(prop: any) {
    const idx = this.selectedProperties.findIndex(p => p.property_id === prop.property_id);
    if (idx > -1) {
      this.selectedProperties.splice(idx, 1);
    } else {
      this.selectedProperties.push(prop);
    }
  }

  isSelected(prop: any): boolean {
    return this.selectedProperties.some(p => p.property_id === prop.property_id);
  }

  printStickers() {
    window.print();
  }

  clearSelection() {
    this.selectedProperties = [];
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

  getModelNo(item: any): string {
    const attrs = this.parseAttributes(item.attributes);
    const modelAttr = attrs.find(a => a.label && /model/i.test(a.label));
    if (modelAttr && modelAttr.value) {
      return modelAttr.value;
    }
    const textToSearch = `${item.item_name || ''} ${item.description || ''}`;
    const match = textToSearch.match(/model(?:\s+no\.?|\s*:)?\s*([a-zA-Z0-9_-]+(?:\s+[a-zA-Z0-9_-]+)*)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return 'N/A';
  }

  getDivision(item: any): string {
    if (item.office_name && item.office_acronym) {
      return `${item.office_name} - ${item.office_acronym}`.toUpperCase();
    }
    return (item.office_name || item.rco || 'National Office').toUpperCase();
  }

  getDescription(item: any): string {
    const name = (item.item_name || '').trim();
    const desc = (item.description || '').trim();
    if (!name) return desc || 'N/A';
    if (!desc) return name;
    
    const nameLower = name.toLowerCase();
    const descLower = desc.toLowerCase();
    
    if (nameLower.includes(descLower)) {
      return name;
    }
    if (descLower.includes(nameLower)) {
      return desc;
    }
    return `${name}, ${desc}`;
  }

  formatAcquisitionDate(dateStr: any): string {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }

  formatBottomDate(dateStr: any): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${month} ${year}`;
  }

  formatCost(cost: any): string {
    const val = parseFloat(cost);
    if (isNaN(val) || val <= 0) return 'Set with CPU';
    return '₱' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
