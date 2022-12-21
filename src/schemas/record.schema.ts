import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as MongooseTimestamp from 'mongoose-timestamp';
import { RecordField } from './record-field.schema';
import { User } from './user.schema';

@Schema()
export class RecordFieldContent extends Document {
  @Prop({ required: false })
  textContent: string;

  @Prop({ required: false })
  numberContent: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'RecordField' })
  field: string | RecordField;
}

export const RecordFieldContentSchema = SchemaFactory.createForClass(RecordFieldContent);

@Schema()
class Record extends Document {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'RecordSpace' })
  recordSpace: string | User;

  @Prop({ required: true, type: [RecordFieldContentSchema] })
  fieldsContent: RecordFieldContent[];

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user: string | User;
}

const RecordSchema = SchemaFactory.createForClass(Record);

RecordSchema.plugin(MongooseTimestamp);

export { RecordSchema, Record };
