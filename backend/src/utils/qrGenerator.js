const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate QR code for user check-in
 * @param {Object} userData - User data to encode
 * @returns {Promise<Object>} QR code URL and data
 */
exports.generateUserQRCode = async (userData) => {
    try {
        const qrData = JSON.stringify({
            userId: userData.userId,
            membershipId: userData.membershipId,
            name: userData.name,
            type: 'user_checkin',
            timestamp: Date.now()
        });

        const qrCodeUrl = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        return {
            url: qrCodeUrl,
            data: qrData
        };
    } catch (error) {
        console.error('Error generating user QR code:', error);
        throw new Error('Failed to generate QR code');
    }
};

/**
 * Generate QR code for service check-in
 * @param {Object} serviceData - Service data
 * @returns {Promise<Object>} QR code URL and data
 */
exports.generateServiceQRCode = async (serviceData) => {
    try {
        const qrData = JSON.stringify({
            serviceId: serviceData.serviceId,
            serviceName: serviceData.serviceName,
            date: serviceData.date,
            type: 'service_checkin',
            checkInUrl: `${process.env.CLIENT_URL}/check-in?serviceId=${serviceData.serviceId}`
        });

        const qrCodeUrl = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            width: 400,
            margin: 3
        });

        return {
            url: qrCodeUrl,
            data: qrData,
            checkInUrl: `${process.env.CLIENT_URL}/check-in?serviceId=${serviceData.serviceId}`
        };
    } catch (error) {
        console.error('Error generating service QR code:', error);
        throw new Error('Failed to generate service QR code');
    }
};

/**
 * Generate temporary check-in token for kiosk mode
 * @param {String} serviceId - Service ID
 * @returns {Promise<Object>} Token and QR code
 */
exports.generateKioskQRCode = async (serviceId) => {
    try {
        const token = uuidv4();
        const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour

        const qrData = JSON.stringify({
            token,
            serviceId,
            type: 'kiosk_checkin',
            expiresAt
        });

        const qrCodeUrl = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'H',
            width: 300
        });

        return {
            token,
            url: qrCodeUrl,
            data: qrData,
            expiresAt
        };
    } catch (error) {
        console.error('Error generating kiosk QR code:', error);
        throw new Error('Failed to generate kiosk QR code');
    }
};

/**
 * Verify QR code data
 * @param {String} qrData - QR code data string
 * @returns {Object|null} Parsed and validated data
 */
exports.verifyQRCode = (qrData) => {
    try {
        const parsed = JSON.parse(qrData);

        // Validate required fields based on type
        if (parsed.type === 'user_checkin') {
            if (!parsed.userId || !parsed.membershipId) {
                return null;
            }
        } else if (parsed.type === 'service_checkin') {
            if (!parsed.serviceId) {
                return null;
            }
        } else if (parsed.type === 'kiosk_checkin') {
            if (!parsed.token || !parsed.expiresAt) {
                return null;
            }
            // Check if expired
            if (Date.now() > parsed.expiresAt) {
                return { error: 'QR code expired' };
            }
        }

        return parsed;
    } catch (error) {
        console.error('Error verifying QR code:', error);
        return null;
    }
};

/**
 * Generate QR code as SVG (for printing)
 * @param {String} data - Data to encode
 * @returns {Promise<String>} SVG string
 */
exports.generateQRCodeSVG = async (data) => {
    try {
        const svg = await QRCode.toString(data, {
            type: 'svg',
            errorCorrectionLevel: 'H',
            width: 300
        });
        return svg;
    } catch (error) {
        console.error('Error generating SVG QR code:', error);
        throw new Error('Failed to generate SVG QR code');
    }
};

/**
 * Generate batch QR codes for multiple users
 * @param {Array} users - Array of user objects
 * @returns {Promise<Array>} Array of QR codes
 */
exports.generateBatchQRCodes = async (users) => {
    try {
        const qrCodes = await Promise.all(
            users.map(async (user) => {
                const qr = await exports.generateUserQRCode({
                    userId: user._id,
                    membershipId: user.membershipId,
                    name: user.fullName
                });
                return {
                    userId: user._id,
                    membershipId: user.membershipId,
                    name: user.fullName,
                    qrCode: qr
                };
            })
        );
        return qrCodes;
    } catch (error) {
        console.error('Error generating batch QR codes:', error);
        throw new Error('Failed to generate batch QR codes');
    }
};