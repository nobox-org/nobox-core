import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as MongooseTimestamp from 'mongoose-timestamp';
import { comparePassword, screenFields, toJSON } from './utils';

class Tokens {
  @Prop()
  resetPassword?: string;

  @Prop()
  forgotPassword?: string;
}


@Schema()
class User extends Document {
  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: false })
  profileImage: string;

  @Prop({ required: false })
  gender: 'male' | 'female';

  @Prop({ type: Tokens })
  tokens?: Tokens;

}

const UserSchema = SchemaFactory.createForClass(User);

UserSchema.plugin(MongooseTimestamp);

UserSchema.methods.comparePassword = comparePassword;

// This Overides Password Field from being returned
UserSchema.methods.toJSON = toJSON;

// to return only allowed fields to client
UserSchema.methods.screenFields = screenFields;

export interface UserWithMethods extends User {
  comparePassword: typeof screenFields;
  screenFields: typeof screenFields;
}

export { UserSchema, User };
