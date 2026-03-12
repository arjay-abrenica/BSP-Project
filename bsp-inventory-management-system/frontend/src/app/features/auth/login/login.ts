import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  // The FormGroup will hold the structure and state of the form
  loginForm!: FormGroup; 
  errorMessage: string = '';
  
  imagePathLoginImg: string = './assets/img/loginImage.png';
  imagePathBSPLogo: string = './assets/img/bspLogo.png';

  // Inject FormBuilder to easily create form controls, and Router for navigation
  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    // Initialize the form with controls and validation rules
    this.loginForm = this.fb.group({
      // 'username' is required
      username: ['', Validators.required],
      // 'password' is required
      password: ['', Validators.required]
    });
  }

  // Method called when the user clicks the Log In button
  onSubmit() {
    // Temporarily bypass form validation and login logic since there is no backend yet
    console.log('Bypassing login and redirecting directly to admin dashboard');
    this.router.navigate(['/admin/dashboard']);
  }
}
