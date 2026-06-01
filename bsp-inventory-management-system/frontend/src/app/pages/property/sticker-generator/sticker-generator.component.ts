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
}
