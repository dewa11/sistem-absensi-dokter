// Input validation utilities

export const validateId = (id) => {
  const errors = [];
  
  if (!id || id.trim().length === 0) {
    errors.push('ID is required');
  } else if (id.trim().length < 3) {
    errors.push('ID must be at least 3 characters long');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateName = (name) => {
  const errors = [];
  
  if (!name || name.trim().length === 0) {
    errors.push('Name is required');
  } else if (name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  } else if (name.trim().length > 100) {
    errors.push('Name must be less than 100 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePasswordMatch = (password, confirmPassword) => {
  const errors = [];
  
  if (password !== confirmPassword) {
    errors.push('Passwords do not match');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateCoordinates = (latitude, longitude) => {
  const errors = [];
  
  if (!latitude || !longitude) {
    errors.push('Location coordinates are required');
    return { isValid: false, errors };
  }
  
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  
  if (isNaN(lat) || isNaN(lng)) {
    errors.push('Invalid coordinates format');
  } else {
    if (lat < -90 || lat > 90) {
      errors.push('Latitude must be between -90 and 90');
    }
    if (lng < -180 || lng > 180) {
      errors.push('Longitude must be between -180 and 180');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateFile = (file, options = {}) => {
  const errors = [];
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'],
    required = true
  } = options;
  
  if (!file) {
    if (required) {
      errors.push('File is required');
    }
    return { isValid: !required, errors };
  }
  
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    errors.push(`File size too large. Maximum size: ${maxSizeMB}MB`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateSearchQuery = (query) => {
  const errors = [];
  
  if (query && query.length > 100) {
    errors.push('Search query too long');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateDateRange = (startDate, endDate) => {
  const errors = [];
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      errors.push('Start date must be before end date');
    }
    
    const now = new Date();
    if (start > now) {
      errors.push('Start date cannot be in the future');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Utility functions
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

export const formatErrorMessages = (errors) => {
  if (!Array.isArray(errors)) return '';
  return errors.join('. ');
};

export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Form validation helper
export const validateForm = (formData, validationRules) => {
  const errors = {};
  let isValid = true;
  
  Object.keys(validationRules).forEach(field => {
    const rules = validationRules[field];
    const value = formData[field];
    const fieldErrors = [];
    
    rules.forEach(rule => {
      const result = rule(value);
      if (!result.isValid) {
        fieldErrors.push(...result.errors);
      }
    });
    
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
      isValid = false;
    }
  });
  
  return {
    isValid,
    errors
  };
};
