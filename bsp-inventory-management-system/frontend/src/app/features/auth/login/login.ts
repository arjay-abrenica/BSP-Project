import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

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
  constructor(
    private fb: FormBuilder, 
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Initialize the form with controls and validation rules
    this.loginForm = this.fb.group({
      // 'username' is required
      username: ['', Validators.required],
      // 'password' is required
      password: ['', Validators.required]
    });
    
    // Redirect to dashboard if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  // Method called when the user clicks the Log In button
  onSubmit() {
    if (this.loginForm.invalid) {
      this.errorMessage = 'Please fill out all fields.';
      return;
    }

    const { username, password } = this.loginForm.value;

    this.authService.login(username, password).subscribe({
      next: () => {
        // Login successful, redirect to dashboard
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        // Handle login error (e.g., wrong password)
        console.error('Login failed', err);
        this.errorMessage = err.error?.message || 'Login failed. Please check your credentials.';
      }
    });
  }
}
