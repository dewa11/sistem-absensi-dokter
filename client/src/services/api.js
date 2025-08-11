const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:5000/api';

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for authentication
      ...options,
    };

    // Handle FormData (for file uploads)
    if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    try {
      const response = await fetch(url, config);
      
      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication endpoints
  async login(id, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ id, password }),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async verifyToken() {
    return this.request('/auth/verify');
  }

  // Admin endpoints
  async getRecentActivity() {
    return this.request('/admin/activity');
  }

  async createDoctor(doctorData) {
    return this.request('/admin/create-doctor', {
      method: 'POST',
      body: JSON.stringify(doctorData),
    });
  }

  async updateDoctorPassword(doctorId, newPassword) {
    return this.request('/admin/update-password', {
      method: 'PUT',
      body: JSON.stringify({ doctorId, newPassword }),
    });
  }

  async deleteDoctor(doctorId) {
    return this.request(`/admin/delete-doctor/${doctorId}`, {
      method: 'DELETE',
    });
  }

  async getAttendanceHistory(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/attendance-history?${queryString}`);
  }

  async deleteAttendance(attendanceId) {
    return this.request(`/admin/delete-attendance/${attendanceId}`, {
      method: 'DELETE',
    });
  }

  async getDoctors() {
    return this.request('/admin/doctors');
  }

  // Doctor endpoints
  async getDoctorStatus() {
    return this.request('/doctor/status');
  }

  async checkin(latitude, longitude, photo) {
    const formData = new FormData();
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('photo', photo);

    return this.request('/doctor/checkin', {
      method: 'POST',
      body: formData,
    });
  }

  async checkout(latitude, longitude, photo) {
    const formData = new FormData();
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('photo', photo);

    return this.request('/doctor/checkout', {
      method: 'POST',
      body: formData,
    });
  }

  async getDoctorHistory(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/doctor/history?${queryString}`);
  }

  // Utility methods
  getPhotoUrl(photoPath) {
    if (!photoPath) return null;
    
    // Remove leading slash if present
    const cleanPath = photoPath.startsWith('/') ? photoPath.slice(1) : photoPath;
    
    return process.env.NODE_ENV === 'production'
      ? `/${cleanPath}`
      : `http://localhost:5000/${cleanPath}`;
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

export const apiService = new ApiService();
