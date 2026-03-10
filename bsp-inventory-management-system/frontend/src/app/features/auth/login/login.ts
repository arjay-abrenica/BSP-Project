import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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

  // Inject FormBuilder to easily create form controls and groups
  constructor(private fb: FormBuilder) {}

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
    // Check if the form is valid (e.g., all required fields are filled)
    if (this.loginForm.valid) {
      const username = this.loginForm.value.username;
      const password = this.loginForm.value.password;

      console.log('Attempting login with:', username, 'and', password);

      // --- LOGIN LOGIC GOES HERE ---
      // 1. Call your Authentication Service (e.g., an API call)
      // this.authService.login(username, password).subscribe({ ... });

      // 2. Example of a simple hardcoded check:
      if (username === 'test' && password === '123') {
        alert('Login Successful! Redirecting...');
        // In a real app, you would use the Router to navigate:
        // this.router.navigate(['/dashboard']); 
      } else {
        this.errorMessage = 'Invalid username or password. Please try again.';
      }

      // Optional: Reset the password field after a failed attempt
      this.loginForm.get('password')?.reset();

    } else {
      // If the form is not valid (e.g., button was somehow pressed when disabled)
      this.loginForm.markAllAsTouched(); // Show validation errors to the user
      this.errorMessage = 'Please fix the errors in the form.';
    }
  }
}
