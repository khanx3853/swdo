export type TabType =
  | 'home'
  | 'donations'
  | 'beneficiaries'
  | 'members'
  | 'users'
  | 'settings'
  | 'statement';

export interface Donation {
  id: string;
  Date: string;
  'Donor Name': string;
  'NIC No': string;
  'Contact No': string;
  'Permanent Address': string;
  Profession: string;
  Amount: number;
  'Transaction ID': string;
  Remarks: string;
  EnteredBy: string;
  Category?: string;
  ProofImage?: string;
  Status?: 'Approved' | 'Pending' | 'Rejected';
  SubmittedAt?: string;
  ApprovedBy?: string;
  ApprovedAt?: string;
  RejectionReason?: string;
  DonorEmail?: string;
}

export interface Beneficiary {
  id: string;
  Date: string;
  'Beneficiary Name': string;
  'Father Name': string;
  'NIC No': string;
  'Contact No': string;
  'Permanent Address': string;
  Profession: string;
  Purpose: string;
  Amount: number;
  'Transaction ID': string;
  Remarks: string;
  VerifiedBy?: string;
  Status?: 'Allotted' | 'Pending' | 'Verified';
}

export interface Member {
  id: string;
  Name: string;
  'Father Name': string;
  Designation: string;
  'N.I.C No': string;
  Address: string;
  'Contact No': string;
  'Joining Date': string;
  'Expiry Date': string;
  Remarks: string;
  NICImage?: string;
  NICImageBack?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  Rights: 'Admin' | 'Checker' | 'Operator' | 'Viewer';
  Access: string[]; // e.g. ['Home', 'Donations', 'Beneficiaries', 'Members', 'Users', 'Settings', 'Statement', 'SwdoMembers']
  Theme: 'Dark' | 'Light';
}

export interface PortalSettings {
  'Foundation Name': string;
  SubTitle: string;
  Address: string;
  Chairperson: string;
  Secretary: string;
  Treasurer: string;
  'Easypaisa No': string;
  'Easypaisa Title': string;
  'Bank No': string;
  'Bank Title': string;
  'Bank Account No'?: string;
  'Account Title'?: string;
  Currency: string;
  TreasurerSignature?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
