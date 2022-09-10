import { Global, Module } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import * as AutoIncrementFactory from 'mongoose-sequence';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { User, UserSchema } from '../schemas/user.schema';
import { FileModule } from '../file/file.module';
import { MailModule } from '../mail/mail.module';
import { Connection } from 'mongoose';
import { UserResolver } from './user.resolver';

@Global()
@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        useFactory: async (connection: Connection) => {
          const SALT_WORK_FACTOR = 10;
          const schema = UserSchema;
          const AutoIncrement = AutoIncrementFactory(connection);
          schema.plugin(AutoIncrement, { inc_field: 'id' });

          // Hash Password before it is saved
          UserSchema.pre('save', function (next) {
            const user = this as any;
            if (!user?.isModified('password')) {
              return next();
            }
            bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
              if (err) return next(err);
              bcrypt.hash(user.password, salt, function (err, hash) {
                if (err) return next(err);
                user.password = hash;
                next();
              });
            });
          });


          // Hash Password before it is updated
          UserSchema.pre('findOneAndUpdate', function (next) {
            const user = this as any;
            if (!user._update.password) {
              return next();
            }

            bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
              if (err) return next(err);
              bcrypt.hash(user._update.password, salt, function (err, hash) {
                if (err) return next(err);
                user._update.password = hash;
                next();
              });
            });
          });

          return schema;
        },
        inject: [getConnectionToken()],
      },
    ]),
    FileModule,
    MailModule
  ],
  providers: [
    UserService,
    UserResolver],
  exports: [UserService],
})
export class UserModule { }
