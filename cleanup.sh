#!/bin/bash

# Cleanup Script for Sistem Absensi Dokter RSUTI
# This script removes old attendance photos to free up disk space
# Schedule this script to run daily via cron

# Configuration
UPLOAD_DIR="./server/uploads/attendance"
LOG_FILE="./cleanup.log"
DAYS_TO_KEEP=30  # Keep files for 30 days

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Function to cleanup old files
cleanup_files() {
    log_message "Starting cleanup process..."
    
    # Check if upload directory exists
    if [ ! -d "$UPLOAD_DIR" ]; then
        log_message "ERROR: Upload directory $UPLOAD_DIR does not exist"
        exit 1
    fi
    
    # Count files before cleanup
    BEFORE_COUNT=$(find "$UPLOAD_DIR" -type f -name "*.jpg" | wc -l)
    log_message "Files before cleanup: $BEFORE_COUNT"
    
    # Remove files older than specified days
    DELETED_COUNT=$(find "$UPLOAD_DIR" -type f -name "*.jpg" -mtime +$DAYS_TO_KEEP -delete -print | wc -l)
    
    # Count files after cleanup
    AFTER_COUNT=$(find "$UPLOAD_DIR" -type f -name "*.jpg" | wc -l)
    
    log_message "Files deleted: $DELETED_COUNT"
    log_message "Files remaining: $AFTER_COUNT"
    log_message "Cleanup process completed"
    
    # Optional: Remove empty directories
    find "$UPLOAD_DIR" -type d -empty -delete 2>/dev/null
    
    # Rotate log file if it gets too large (>10MB)
    if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt 10485760 ]; then
        mv "$LOG_FILE" "${LOG_FILE}.old"
        log_message "Log file rotated"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -d, --days DAYS    Number of days to keep files (default: 30)"
    echo "  -h, --help         Show this help message"
    echo "  --dry-run          Show what would be deleted without actually deleting"
}

# Function for dry run
dry_run() {
    log_message "DRY RUN: Starting cleanup simulation..."
    
    if [ ! -d "$UPLOAD_DIR" ]; then
        log_message "ERROR: Upload directory $UPLOAD_DIR does not exist"
        exit 1
    fi
    
    BEFORE_COUNT=$(find "$UPLOAD_DIR" -type f -name "*.jpg" | wc -l)
    WOULD_DELETE=$(find "$UPLOAD_DIR" -type f -name "*.jpg" -mtime +$DAYS_TO_KEEP | wc -l)
    
    log_message "DRY RUN: Files that would be deleted: $WOULD_DELETE"
    log_message "DRY RUN: Files that would remain: $((BEFORE_COUNT - WOULD_DELETE))"
    
    echo "DRY RUN RESULTS:"
    echo "Files that would be deleted: $WOULD_DELETE"
    echo "Files that would remain: $((BEFORE_COUNT - WOULD_DELETE))"
    
    if [ $WOULD_DELETE -gt 0 ]; then
        echo "Files to be deleted:"
        find "$UPLOAD_DIR" -type f -name "*.jpg" -mtime +$DAYS_TO_KEEP
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--days)
            DAYS_TO_KEEP="$2"
            shift 2
            ;;
        --dry-run)
            dry_run
            exit 0
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate days parameter
if ! [[ "$DAYS_TO_KEEP" =~ ^[0-9]+$ ]] || [ "$DAYS_TO_KEEP" -lt 1 ]; then
    echo "ERROR: Days must be a positive integer"
    exit 1
fi

# Run cleanup
cleanup_files

# Example cron job entries (add to crontab):
# Daily cleanup at 2 AM:
# 0 2 * * * /path/to/cleanup.sh
#
# Weekly cleanup on Sunday at 3 AM:
# 0 3 * * 0 /path/to/cleanup.sh
#
# Monthly cleanup on the 1st at 4 AM:
# 0 4 1 * * /path/to/cleanup.sh
