export type ProjectCategory =
  | 'Award-Winning Website'
  | '3D Interactive Website'
  | 'Product Animation'
  | 'Motion Design'
  | 'Brand Identity'
  | 'Other';

export type Project = {
  id: string;
  title: string;
  category: ProjectCategory;
  year: number;
  description: string;
  imageUrl: string;
};

export type ContactFormData = {
  name: string;
  email: string;
  company: string;
  projectType: string;
  budget: string;
  timeline: string;
  details: string;
};
