import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

export class Postmark extends Document {
  @Prop()
  apiKey: string;

  @Prop()
  senderEmail: string;
}

export class Keys extends Document {
  @Prop({ required: false, type: Postmark })
  postmark: Postmark
}

export class BusinessDetails extends Document {
  @Prop({ required: false })
  address?: string;

  @Prop({ required: false })
  name?: string;
};

@Schema({ timestamps: true })
class Project extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ required: false })
  siteUrl?: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user: string | User;

  @Prop({ required: false, type: Keys })
  keys: Keys;

  @Prop({ required: false })
  businessDetails?: BusinessDetails;
}

const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.set("autoIndex", true);

ProjectSchema.index({ slug: 1, user: 1 });

export { ProjectSchema, Project };
