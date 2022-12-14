import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Project } from './project.schema';
import { RecordField } from './record-field.schema';
import { User } from './user.schema';

@Schema({ timestamps: true })
class RecordSpace extends Document {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user: string | User;

  @Prop({ required: true, type: MongooseSchema.Types.Array, ref: 'User' })
  admins: (string | User)[];

  @Prop({ required: true, type: MongooseSchema.Types.Array, ref: 'RecordField' })
  recordFields: (string | RecordField)[];

  @Prop()
  description?: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ required: true, default: false })
  developerMode: boolean;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Project' })
  project: string | Project;

  @Prop()
  recordStructureHash?: string;
}

const RecordSpaceSchema = SchemaFactory.createForClass(RecordSpace);
RecordSpaceSchema.set("autoIndex", true);
RecordSpaceSchema.index({ slug: 1, project: 1 });
export { RecordSpaceSchema, RecordSpace };
