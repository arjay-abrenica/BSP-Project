import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-track-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './track-item.html',
  styleUrls: ['./track-item.css']
})
export class TrackItem {
  trackingCode: string = '';
  itemDetails: any = null;
  errorMsg: string = '';

  constructor(private http: HttpClient) {}

  onSearch(): void {
    if (!this.trackingCode) return;

    this.http.get<any>(`http://localhost:5000/api/scan/item/${this.trackingCode}`).subscribe({
      next: (data) => {
        this.itemDetails = data;
        this.errorMsg = '';
      },
      error: (err) => {
        this.itemDetails = null;
        this.errorMsg = 'Item not found. Please check the tracking number.';
        console.error(err);
      }
    });
  }
}
