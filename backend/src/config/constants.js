module.exports = {
    // User Roles
    ROLES: {
        SUPER_ADMIN: 'super_admin',
        ADMIN: 'admin',
        PASTOR: 'pastor',
        DEPARTMENT_HEAD: 'department_head',
        MINISTER: 'minister',
        WORKER: 'worker',
        MEMBER: 'member',
        VISITOR: 'visitor'
    },

    // Service Types
    SERVICE_TYPES: {
        SUNDAY_FIRST: 'sunday_first_service',
        SUNDAY_SECOND: 'sunday_second_service',
        MIDWEEK: 'midweek_service',
        PRAYER_MEETING: 'prayer_meeting',
        BIBLE_STUDY: 'bible_study',
        CHOIR_REHEARSAL: 'choir_rehearsal',
        WORKERS_MEETING: 'workers_meeting',
        SPECIAL_EVENT: 'special_event',
        CUSTOM: 'custom'
    },

    // Attendance Status
    ATTENDANCE_STATUS: {
        PRESENT: 'present',
        ABSENT: 'absent',
        LATE: 'late',
        EXCUSED: 'excused'
    },

    // Check-in Methods
    CHECKIN_METHODS: {
        QR_CODE: 'qr_code',
        MANUAL: 'manual',
        NFC: 'nfc',
        GPS: 'gps',
        FACIAL_RECOGNITION: 'facial_recognition',
        AUTO: 'auto'
    },

    // Days of Week
    DAYS_OF_WEEK: {
        SUNDAY: 0,
        MONDAY: 1,
        TUESDAY: 2,
        WEDNESDAY: 3,
        THURSDAY: 4,
        FRIDAY: 5,
        SATURDAY: 6
    },

    // Marital Status
    MARITAL_STATUS: {
        SINGLE: 'single',
        MARRIED: 'married',
        DIVORCED: 'divorced',
        WIDOWED: 'widowed'
    },

    // Gender
    GENDER: {
        MALE: 'male',
        FEMALE: 'female'
    },

    // Languages
    LANGUAGES: {
        ENGLISH: 'english',
        YORUBA: 'yoruba',
        IGBO: 'igbo',
        HAUSA: 'hausa',
        FRENCH: 'french',
        SPANISH: 'spanish'
    },

    // Follow-up Status
    FOLLOWUP_STATUS: {
        PENDING: 'pending',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    },

    // Follow-up Priority
    FOLLOWUP_PRIORITY: {
        LOW: 'low',
        MEDIUM: 'medium',
        HIGH: 'high',
        URGENT: 'urgent'
    },

    // Report Types
    REPORT_TYPES: {
        DAILY: 'daily',
        WEEKLY: 'weekly',
        MONTHLY: 'monthly',
        QUARTERLY: 'quarterly',
        YEARLY: 'yearly',
        CUSTOM: 'custom'
    },

    // Notification Types
    NOTIFICATION_TYPES: {
        ATTENDANCE_REMINDER: 'attendance_reminder',
        MISSED_SERVICE: 'missed_service',
        UPCOMING_SERVICE: 'upcoming_service',
        BIRTHDAY: 'birthday',
        ANNOUNCEMENT: 'announcement',
        FOLLOWUP: 'followup',
        REPORT_READY: 'report_ready'
    },

    // Export Formats
    EXPORT_FORMATS: {
        CSV: 'csv',
        EXCEL: 'excel',
        PDF: 'pdf',
        JSON: 'json'
    },

    // Sunday School Classes
    SUNDAY_SCHOOL_CLASSES: {
        INFANTS: 'infants',
        BEGINNERS: 'beginners',
        PRIMARY: 'primary',
        JUNIOR: 'junior',
        INTERMEDIATE: 'intermediate',
        SENIOR: 'senior',
        YOUTH: 'youth',
        ADULT: 'adult',
        NOT_APPLICABLE: 'not_applicable'
    },

    // Permission Levels
    PERMISSIONS: {
        VIEW_ALL_ATTENDANCE: 'view_all_attendance',
        EDIT_ATTENDANCE: 'edit_attendance',
        DELETE_ATTENDANCE: 'delete_attendance',
        MANAGE_USERS: 'manage_users',
        MANAGE_SERVICES: 'manage_services',
        MANAGE_DEPARTMENTS: 'manage_departments',
        VIEW_REPORTS: 'view_reports',
        EXPORT_DATA: 'export_data',
        MANAGE_SETTINGS: 'manage_settings',
        SEND_NOTIFICATIONS: 'send_notifications',
        MANAGE_FOLLOWUPS: 'manage_followups'
    },

    // Engagement Scoring
    ENGAGEMENT_LEVELS: {
        VERY_HIGH: 'very_high',    // 90-100%
        HIGH: 'high',              // 70-89%
        MEDIUM: 'medium',          // 50-69%
        LOW: 'low',                // 30-49%
        VERY_LOW: 'very_low'       // 0-29%
    }
};