import { TWILIO_SENDGRID_KEY } from '@/config/resources/process-map';
import * as SendGrid from '@sendgrid/mail';

SendGrid.setApiKey(TWILIO_SENDGRID_KEY);

export const mailSender = SendGrid;
