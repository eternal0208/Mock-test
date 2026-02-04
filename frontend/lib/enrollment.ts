import { API_BASE_URL } from '@/lib/config';

/**
 * Enroll user in a FREE test series
 * @param {string} testId - Test series ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Enrollment result
 */
export async function enrollFreeTest(testId: string, userId: string) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/purchases/enroll-free`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ testId, userId }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to enroll in free test');
        }

        return {
            success: true,
            enrollment: data.enrollment,
            message: data.message
        };
    } catch (error: any) {
        console.error('Free Enrollment Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Create Razorpay order for PAID test series
 * @param {string} testId - Test series ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Order details
 */
export async function createRazorpayOrder(testId: string, userId: string) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/purchases/create-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ testId, userId }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to create order');
        }

        return {
            success: true,
            order: data.order
        };
    } catch (error: any) {
        console.error('Create Order Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Verify Razorpay payment and enroll user
 * @param {Object} paymentData - Payment verification data
 * @returns {Promise<Object>} Verification result
 */
export async function verifyAndEnroll(paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    testId: string;
    userId: string;
}) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/purchases/verify-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentData),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Payment verification failed');
        }

        return {
            success: true,
            enrollment: data.enrollment,
            message: data.message
        };
    } catch (error: any) {
        console.error('Payment Verification Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Check if user has access to a test series
 * @param {string} testId - Test series ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Access status
 */
export async function checkUserAccess(testId: string, userId: string) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/purchases/check-access/${testId}?userId=${userId}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to check access');
        }

        return {
            hasAccess: data.hasAccess,
            isFree: data.isFree,
            enrollment: data.enrollment
        };
    } catch (error: any) {
        console.error('Check Access Error:', error);
        return {
            hasAccess: false,
            error: error.message
        };
    }
}

/**
 * Open Razorpay checkout for paid test
 * @param {Object} order - Razorpay order details
 * @param {Object} user - User details
 * @param {string} testId - Test ID
 * @param {Function} onSuccess - Success callback
 * @param {Function} onFailure - Failure callback
 */
export function openRazorpayCheckout(
    order: any,
    user: any,
    testId: string,
    onSuccess: (response: any) => void,
    onFailure: (error: any) => void
) {
    const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_1234567890',
        amount: order.amount,
        currency: order.currency,
        name: 'Apex Mock',
        description: `Purchase ${order.testTitle}`,
        order_id: order.id,
        handler: async function (response: any) {
            // Verify payment on backend
            const result = await verifyAndEnroll({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                testId: testId,
                userId: user.uid
            });

            if (result.success) {
                onSuccess(result);
            } else {
                onFailure(new Error(result.error || 'Payment verification failed'));
            }
        },
        prefill: {
            name: user.name || user.displayName || '',
            email: user.email || '',
            contact: user.phoneNumber || ''
        },
        theme: {
            color: '#4F46E5'
        },
        modal: {
            ondismiss: function () {
                onFailure(new Error('Payment cancelled by user'));
            }
        }
    };

    // @ts-ignore
    const razorpay = new window.Razorpay(options);
    razorpay.open();
}
