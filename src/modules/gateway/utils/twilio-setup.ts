import { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } from '@/config/resources/process-map';
import * as Twilio from 'twilio';

// Find your Account SID and Auth Token at twilio.com/console
// and set the environment variables. See http://twil.io/secure
const twilioClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export default twilioClient;
