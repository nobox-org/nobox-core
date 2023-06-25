
export class PostmarkOutput {
  apiKey: string

  senderEmail: string
}

export class FirebaseOutput {
  privateKey: string

  projectId: string

  clientEmail: string
}

export class ProjectKeysOutput {
  postmark?: PostmarkOutput;

  firebase?: FirebaseOutput;
}

export class BusinessDetailsOutput {
  address?: string;

  name?: string;
}

export class Project {
  id: string;

  description?: string;

  name: string;

  user: string;

  slug: string;

  siteUrl?: string;

  keys?: ProjectKeysOutput;

  businessDetails?: BusinessDetailsOutput;
}
