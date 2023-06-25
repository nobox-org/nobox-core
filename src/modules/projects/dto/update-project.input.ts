
export class Postmark {
  apiKey: string

  senderEmail: string
}

export class Firebase {
  privateKey: string

  projectId: string

  clientEmail: string
}


export class Keys {
  postmark?: Postmark

  firebase?: Firebase
}


export class BusinessDetails {
  address?: string;

  name?: string;
}

export class UpdateProjectInput {
  description?: string;

  name?: string;

  id?: string;

  slug?: string;

  siteUrl?: string;

  keys?: Keys

  businessDetails?: BusinessDetails;
}
