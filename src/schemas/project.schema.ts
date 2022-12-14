import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

@Schema({ timestamps: true })
class Project extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user: string | User;
}

const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.set("autoIndex", true);

ProjectSchema.index({ slug: 1, user: 1 });

export { ProjectSchema, Project };
