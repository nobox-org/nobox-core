export interface MRecordFieldContent {
  textContent: string;

  numberContent: string;

  field: string;
}


export interface MRecordIDData {
  recordSpaceSlug: string;
  projectSlug: string;
  userId: string;
  projectId: string;
}

export interface MRecord {
  recordSpace: string;
  fieldsContent: MRecordFieldContent[];
  user: string;
  idData: MRecordIDData;
}

