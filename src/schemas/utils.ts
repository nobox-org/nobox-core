import * as bcrypt from 'bcrypt';
import { MUser } from './user.schema';

export type ScreenedUserType = Omit<MUser, "passwords" | "tokens" | "__v">;

export async function comparePassword(candidatePassword: string) {
  try {
    const comparePassword = await bcrypt.compare(candidatePassword, this.password);
    return comparePassword;
  } catch (error) {
    throw error;
  }
}

// To Stop Password Field from being returned
export function toJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.tokens;
  delete obj.__v;
  return obj;
}