import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './inventory.html',
  styleUrls: ['./inventory.css']
})
export class Inventory { }