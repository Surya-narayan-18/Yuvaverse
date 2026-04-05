import Razorpay from 'razorpay';

// Razorpay SDK is initialised once and exported as a singleton.
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

export default razorpay;
