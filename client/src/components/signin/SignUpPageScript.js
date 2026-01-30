// import React from 'react'
// import "./SignUpPage";

// document.addEventListener('DOMContentLoaded', function() {
//             const form = document.getElementById('signupForm');
//             const submitBtn = document.getElementById('submitBtn');
//             const loadingSpinner = document.getElementById('loadingSpinner');
//             const btnText = document.querySelector('.btn-text');
//             const successMessage = document.getElementById('successMessage');
//             const togglePassword = document.getElementById('togglePassword');
//             const passwordInput = document.getElementById('password');

//             // Form inputs
//             const fullNameInput = document.getElementById('fullName');
//             const emailInput = document.getElementById('email');

//             // Error message elements
//             const nameError = document.getElementById('nameError');
//             const emailError = document.getElementById('emailError');
//             const passwordError = document.getElementById('passwordError');

//             // Password toggle functionality
//             togglePassword.addEventListener('click', function() {
//                 const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
//                 passwordInput.setAttribute('type', type);
//                 togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
//             });

//             // Real-time validation
//             fullNameInput.addEventListener('input', validateName);
//             emailInput.addEventListener('input', validateEmail);
//             passwordInput.addEventListener('input', validatePassword);

//             // Focus effects
//             const inputs = document.querySelectorAll('.form-input');
//             inputs.forEach(input => {
//                 input.addEventListener('focus', function() {
//                     this.parentElement.classList.add('focused');
//                 });
                
//                 input.addEventListener('blur', function() {
//                     this.parentElement.classList.remove('focused');
//                 });
//             });

//             function validateName() {
//                 const name = fullNameInput.value.trim();
//                 if (name.length < 2) {
//                     showError(fullNameInput, nameError, 'Name must be at least 2 characters long');
//                     return false;
//                 } else if (!/^[a-zA-Z\s]+$/.test(name)) {
//                     showError(fullNameInput, nameError, 'Name should only contain letters and spaces');
//                     return false;
//                 } else {
//                     showSuccess(fullNameInput, nameError);
//                     return true;
//                 }
//             }

//             function validateEmail() {
//                 const email = emailInput.value.trim();
//                 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                
//                 if (!email) {
//                     showError(emailInput, emailError, 'Email is required');
//                     return false;
//                 } else if (!emailRegex.test(email)) {
//                     showError(emailInput, emailError, 'Please enter a valid email address');
//                     return false;
//                 } else {
//                     showSuccess(emailInput, emailError);
//                     return true;
//                 }
//             }

//             function validatePassword() {
//                 const password = passwordInput.value;
                
//                 if (password.length < 8) {
//                     showError(passwordInput, passwordError, 'Password must be at least 8 characters long');
//                     return false;
//                 } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
//                     showError(passwordInput, passwordError, 'Password must contain uppercase, lowercase, and number');
//                     return false;
//                 } else {
//                     showSuccess(passwordInput, passwordError);
//                     return true;
//                 }
//             }

//             function showError(input, errorElement, message) {
//                 input.classList.remove('success');
//                 input.classList.add('error');
//                 errorElement.textContent = message;
//                 errorElement.classList.add('show');
//             }

//             function showSuccess(input, errorElement) {
//                 input.classList.remove('error');
//                 input.classList.add('success');
//                 errorElement.classList.remove('show');
//             }

//             // Form submission
//             form.addEventListener('submit', function(e) {
//                 e.preventDefault();
                
//                 const isNameValid = validateName();
//                 const isEmailValid = validateEmail();
//                 const isPasswordValid = validatePassword();
                
//                 if (isNameValid && isEmailValid && isPasswordValid) {
//                     // Show loading state
//                     submitBtn.disabled = true;
//                     btnText.style.opacity = '0';
//                     loadingSpinner.style.display = 'block';
                    
//                     // Simulate API call
//                     setTimeout(() => {
//                         // Hide loading state
//                         submitBtn.disabled = false;
//                         btnText.style.opacity = '1';
//                         loadingSpinner.style.display = 'none';
                        
//                         // Show success message
//                         successMessage.style.display = 'block';
                        
//                         // Reset form after success
//                         setTimeout(() => {
//                             form.reset();
//                             inputs.forEach(input => {
//                                 input.classList.remove('success', 'error');
//                             });
//                             successMessage.style.display = 'none';
//                         }, 3000);
                        
//                     }, 2000);
//                 } else {
//                     // Add shake animation to form for invalid submission
//                     form.style.animation = 'shake 0.5s ease-in-out';
//                     setTimeout(() => {
//                         form.style.animation = '';
//                     }, 500);
//                 }
//             });
//         });

//         // Add shake animation for invalid form submission
//         const style = document.createElement('style');
//         style.textContent = `
//             @keyframes shake {
//                 0%, 100% { transform: translateX(0); }
//                 25% { transform: translateX(-5px); }
//                 75% { transform: translateX(5px); }
//             }
//         `;
//         document.head.appendChild(style);