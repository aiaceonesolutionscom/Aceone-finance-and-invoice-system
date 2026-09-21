export type CompanySnapshot = {
  companyName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  companyTaxNumber: string | null;
  bankDetails: string | null;
  logo: string | null;
};

export type CustomerSnapshot = {
  customerName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export type InvoiceTextSnapshot = {
  title: string;
  content: string;
};
