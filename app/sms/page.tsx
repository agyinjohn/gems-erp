import { permanentRedirect } from 'next/navigation';

/**
 * Texts are one of two channels now, so this lives on Messaging. Kept as a
 * redirect because it has been linked to from inside the app and out of it.
 */
export default function SmsRedirect() {
  permanentRedirect('/messaging');
}
