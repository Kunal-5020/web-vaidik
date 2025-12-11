// src/lib/paymentService.ts
import walletService from './walletService';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const PAYMENT_CONFIG = {
  razorpay: {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_pgNwN5gpPzbjfq',
    merchantName: 'Vaidik Talk',
    merchantLogo: 'https://vaidiktalk.store/cdn/shop/files/logo.png?v=1747895829&width=300',
    themeColor: '#f8d900',
  },
  gst: {
    rate: 18,
    enabled: true,
  },
  currency: 'INR',
};

// Load Razorpay script
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const paymentService = {
  // Step 1: Initiate recharge
  async initiateRecharge(baseAmount: number) {
    try {
      console.log('💰 Initiating recharge for BASE amount:', baseAmount);

      const rechargeData = await walletService.rechargeWallet({
        amount: baseAmount,
        currency: PAYMENT_CONFIG.currency,
      });

      console.log('✅ Recharge initiated:', rechargeData);

      if (!rechargeData.success || !rechargeData.data) {
        throw new Error(rechargeData.message || 'Failed to initiate recharge');
      }

      if (!rechargeData.data.razorpay?.orderId) {
        throw new Error('Razorpay order ID not found in response');
      }

      return rechargeData;
    } catch (error: any) {
      console.error('❌ Initiate recharge error:', error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to initiate payment'
      );
    }
  },

  // Step 2: Process Razorpay payment
  async processRazorpayPayment(
    rechargeData: any,
    userDetails: { email?: string; phone?: string; name?: string }
  ): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        // Load Razorpay script
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          reject({ success: false, message: 'Failed to load Razorpay SDK' });
          return;
        }

        const razorpayData = rechargeData.data.razorpay;
        const totalAmount = razorpayData.amount;

        if (!razorpayData.orderId || !razorpayData.key) {
          reject(new Error('Invalid Razorpay configuration'));
          return;
        }

        const options = {
          key: razorpayData.key,
          amount: totalAmount,
          currency: razorpayData.currency || PAYMENT_CONFIG.currency,
          name: PAYMENT_CONFIG.razorpay.merchantName,
          description: 'Wallet recharge',
          image: PAYMENT_CONFIG.razorpay.merchantLogo,
          order_id: razorpayData.orderId,
          handler: function (response: any) {
            console.log('✅ Razorpay success:', response);
            resolve({
              success: true,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            });
          },
          prefill: {
            name: userDetails.name || '',
            email: userDetails.email || '',
            contact: userDetails.phone || '',
          },
          notes: {
            transactionId: rechargeData.data.transactionId,
          },
          theme: {
            color: PAYMENT_CONFIG.razorpay.themeColor,
          },
          modal: {
            ondismiss: function () {
              console.log('❌ Payment cancelled by user');
              reject({ success: false, message: 'Payment cancelled by user' });
            },
          },
        };

        console.log('🔐 Opening Razorpay:', {
          orderId: options.order_id,
          amount: options.amount,
        });

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (error) {
        reject({ success: false, message: 'Failed to initialize payment', error });
      }
    });
  },

  // Step 3: Verify payment
  async verifyPayment(
    transactionId: string,
    paymentId: string,
    status: string = 'completed',
    bonusPercentage: number = 0
  ) {
    try {
      console.log('🔍 Verifying payment:', { transactionId, paymentId });

      const verificationResult = await walletService.verifyPayment({
        transactionId,
        paymentId,
        status,
        bonusPercentage,
      });

      if (!verificationResult.success) {
        throw new Error(verificationResult.message || 'Payment verification failed');
      }

      return verificationResult;
    } catch (error: any) {
      console.error('❌ Verify error:', error);
      throw new Error(
        error.response?.data?.message || error.message || 'Failed to verify payment'
      );
    }
  },

  // Complete flow
  async completeRazorpayFlow(
    baseAmount: number,
    userDetails: { email?: string; phone?: string; name?: string; bonusPercentage?: number },
    onSuccess?: (newBalance: number) => void,
    onFailure?: (message: string) => void
  ) {
    let rechargeData = null;
    let transactionId = null;

    try {
      // Step 1: Initiate
      rechargeData = await this.initiateRecharge(baseAmount);
      transactionId = rechargeData.data.transactionId;

      // Step 2: Pay
      const paymentResult = await this.processRazorpayPayment(rechargeData, userDetails);

      if (!paymentResult.success) {
        throw new Error(paymentResult.message || 'Payment was not successful');
      }

      // Step 3: Verify
      const verificationResult = await this.verifyPayment(
        transactionId,
        paymentResult.paymentId,
        'completed',
        userDetails.bonusPercentage || 0
      );

      if (verificationResult.success) {
        if (onSuccess) onSuccess(verificationResult.data.newBalance);
        return { success: true };
      } else {
        throw new Error('Verification failed');
      }
    } catch (error: any) {
      console.error('❌ Flow error:', error);

      // Cancel transaction if created
      if (transactionId) {
        try {
          await this.verifyPayment(transactionId, 'FAILED', 'failed');
        } catch (e) {}
      }

      const msg = error.message || 'Payment failed';
      if (onFailure) onFailure(msg);
      return { success: false, error: msg };
    }
  },
};

export default paymentService;
