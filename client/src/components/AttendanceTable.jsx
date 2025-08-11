import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { validateSearchQuery, validateDateRange } from '../utils/validation';

const AttendanceTable = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [recordsPerPage] = useState(10);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadAttendanceHistory();
  }, [currentPage, filters]);

  const loadAttendanceHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: currentPage,
        limit: recordsPerPage,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') {
          delete params[key];
        }
      });

      const response = await apiService.getAttendanceHistory(params);
      
      if (response.success) {
        setAttendanceData(response.data.records);
        setTotalPages(response.data.pagination.totalPages);
        setTotalRecords(response.data.pagination.total);
      } else {
        setError(response.message || 'Failed to load attendance history');
      }
    } catch (error) {
      setError('Failed to load attendance history: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleDeleteAttendance = async (attendanceId, doctorName, type, timestamp) => {
    const formattedDate = new Date(timestamp).toLocaleDateString();
    const confirmMessage = `Are you sure you want to delete the ${type} record for Dr. ${doctorName} on ${formattedDate}? This will allow the doctor to retake the photo.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.deleteAttendance(attendanceId);
      
      if (response.success) {
        setSuccess('Attendance record deleted successfully');
        loadAttendanceHistory(); // Reload the data
      } else {
        setError(response.message || 'Failed to delete attendance record');
      }
    } catch (error) {
      setError('Failed to delete attendance record: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const printContent = generatePrintContent();
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const generatePrintContent = () => {
    const currentDate = new Date().toLocaleDateString();
    const filterInfo = [];
    
    if (filters.search) filterInfo.push(`Search: ${filters.search}`);
    if (filters.startDate) filterInfo.push(`From: ${filters.startDate}`);
    if (filters.endDate) filterInfo.push(`To: ${filters.endDate}`);
    
    const filterText = filterInfo.length > 0 ? `Filters: ${filterInfo.join(', ')}` : 'No filters applied';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attendance History Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #4169E1; margin: 0; }
            .header h2 { margin: 5px 0; }
            .info { margin-bottom: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .type-checkin { background-color: #dcfce7; color: #166534; }
            .type-checkout { background-color: #dbeafe; color: #1e40af; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>RSUTI</h1>
            <h2>Doctor Attendance History Report</h2>
          </div>
          
          <div class="info">
            <p><strong>Generated on:</strong> ${currentDate}</p>
            <p><strong>Total Records:</strong> ${totalRecords}</p>
            <p><strong>${filterText}</strong></p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Doctor Name</th>
                <th>Doctor ID</th>
                <th>Type</th>
                <th>Date & Time</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              ${attendanceData.map(record => `
                <tr>
                  <td>${record.doctor_name}</td>
                  <td>${record.user_id}</td>
                  <td class="type-${record.type}">
                    ${record.type === 'checkin' ? 'Check In' : 'Check Out'}
                  </td>
                  <td>${formatDateTime(record.timestamp)}</td>
                  <td>
                    ${record.location_lat && record.location_lng 
                      ? `${record.location_lat.toFixed(6)}, ${record.location_lng.toFixed(6)}`
                      : 'N/A'
                    }
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Made by RVL - Sistem Absensi Dokter RSUTI</p>
          </div>
        </body>
      </html>
    `;
  };

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Attendance History</h2>
          <button
            onClick={handlePrint}
            disabled={loading || attendanceData.length === 0}
            className="bg-royal-blue hover:bg-royal-blue-dark text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Print Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search (Name/ID)
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search doctor name or ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal-blue text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal-blue text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal-blue text-sm"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-royal-blue mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading attendance history...</p>
          </div>
        ) : attendanceData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No attendance records found
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Photo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendanceData.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {record.doctor_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {record.user_id}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      record.type === 'checkin' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {record.type === 'checkin' ? 'Check In' : 'Check Out'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(record.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTime(record.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {record.photo_path && (
                      <img
                        src={apiService.getPhotoUrl(record.photo_path)}
                        alt="Attendance"
                        className="h-12 w-12 rounded-lg object-cover cursor-pointer hover:opacity-75"
                        onClick={() => {
                          const img = new Image();
                          img.src = apiService.getPhotoUrl(record.photo_path);
                          const newWindow = window.open('');
                          newWindow.document.write(`
                            <html>
                              <head><title>Attendance Photo</title></head>
                              <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;">
                                <img src="${img.src}" style="max-width:100%;max-height:100%;object-fit:contain;" />
                              </body>
                            </html>
                          `);
                        }}
                      />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.location_lat && record.location_lng ? (
                      <div className="text-xs">
                        <div>{record.location_lat.toFixed(6)}</div>
                        <div>{record.location_lng.toFixed(6)}</div>
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDeleteAttendance(
                        record.id, 
                        record.doctor_name, 
                        record.type, 
                        record.timestamp
                      )}
                      disabled={loading}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, totalRecords)} of {totalRecords} results
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || loading}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={loading}
                      className={`px-3 py-1 border rounded-lg text-sm font-medium disabled:cursor-not-allowed ${
                        currentPage === pageNum
                          ? 'border-royal-blue bg-royal-blue text-white'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || loading}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTable;
