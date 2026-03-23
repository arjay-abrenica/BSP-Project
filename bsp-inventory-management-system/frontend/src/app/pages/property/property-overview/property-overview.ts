import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-property-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './property-overview.html',
  styleUrl: './property-overview.scss'
})
export class PropertyOverview {
    mockProperties = [
        { id: 'PR-1001', name: 'Executive Desk', category: 'Furniture', assignedTo: 'Alyssa Mendoza', status: 'Active' },
        { id: 'PR-1002', name: 'Conference Table', category: 'Furniture', assignedTo: 'Shared', status: 'Active' },
        { id: 'PR-1003', name: 'Projector', category: 'Electronics', assignedTo: 'Meeting Rm A', status: 'Maintenance' },
        { id: 'PR-1004', name: 'Filing Cabinet', category: 'Storage', assignedTo: 'HR Dept', status: 'Active' },
    ];
}
