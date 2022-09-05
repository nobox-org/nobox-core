import { RecordStructure } from '@/record-spaces/entities/record-structure.entity';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as MongooseTimestamp from 'mongoose-timestamp';
import { Project } from './project.schema';
import { User } from './user.schema';

@Schema()
class RecordSpace extends Document {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId , ref: 'User' })
  user: string | User;

  @Prop({ required: true, type: MongooseSchema.Types.Array , ref: 'User' })
  admins: (string | User)[];

  @Prop()
  description?: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true, default: false})
  developerMode: boolean;

  @Prop({ required: true, type: RecordStructure })
  recordStructure: RecordStructure[];

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId , ref: 'Project'})
  project: string | Project;
}

const RecordSpaceSchema = SchemaFactory.createForClass(RecordSpace);
RecordSpaceSchema.plugin(MongooseTimestamp);
export { RecordSpaceSchema, RecordSpace };
