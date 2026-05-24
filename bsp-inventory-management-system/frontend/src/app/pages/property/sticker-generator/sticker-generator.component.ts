import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sticker-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './sticker-generator.component.html',
  styleUrls: ['./sticker-generator.component.scss']
})
export class StickerGeneratorComponent {
  // Input fields matching layout (same layout as standard BSP property tag)
  propertyNo: string = 'BSP-PROP-2026-0001';
  itemName: string = 'HP EliteBook 840 G10 Laptop';
  serialNo: string = 'SN-HP840-001';
  dateAcquired: string = '2026-05-18';
  accountableOfficer: string = 'Sir Jerry';

  // Customized print layouts
  printMode: 'single' | 'grid' = 'single';
  gridCopies: number = 9;

  showLogo: boolean = true;
  showOfficer: boolean = true;
  fontSize: 'small' | 'medium' | 'large' = 'medium';

  constructor() { }

  printStickers() {
    window.print();
  }
}
