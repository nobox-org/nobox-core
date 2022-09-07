import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as MongooseTimestamp from 'mongoose-timestamp';
import { User } from './user.schema';

@Schema()
class Project extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  description: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user: string | User;

}

const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.plugin(MongooseTimestamp);

export { ProjectSchema, Project };
