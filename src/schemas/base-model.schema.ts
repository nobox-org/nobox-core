import { ObjectId } from "mongodb";

export interface MBase {
  _id?: ObjectId;

  createdAt?: Date;

  updatedAt?: Date;
}
