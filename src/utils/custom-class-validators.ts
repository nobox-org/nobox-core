import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { ObjectId } from 'mongodb';
import { validatePassword } from './validatePassword';

export function IsValidAsAMongoObjectId(
  property?: string,
  validationOptions: ValidationOptions = {},
) {
  const isValid = ObjectId.isValid;
  if (!validationOptions?.message) {
    validationOptions.message = 'Id must be  a valid mongo Id';
  }
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      name: 'IsValidAsAMongoObjectId',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return isValid(value); // you can return a Promise<boolean> here as well, if you want to make async validation
        },
      },
    });
  };
}

export function isPasswordValid(property?: string, validationOptions?: ValidationOptions) {

  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      name: 'isPasswordValid',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any) {
          const { valid, errors } = validatePassword(value);
          this.defaultMessage = () => "Your Password must " + errors.join(", ");
          return typeof value === 'string' && valid;
        },
      },
    });
  };
}

