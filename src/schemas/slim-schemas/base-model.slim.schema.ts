import { ObjectIdOrString } from "@/types";

export interface MBase {
  _id?: ObjectIdOrString;

  createdAt?: Date;

  updatedAt?: Date;
}
